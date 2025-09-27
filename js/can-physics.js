// Realistic can physics variables
let can;
let isCarryingCan = false;
const canOriginalPosition = new THREE.Vector3();
const canHoldingOffset = new THREE.Vector3(0, 0.05, -0.25);

// Distance constraints
const canPickupDistance = 2.0;
const canDropTolerance = 1.5;
const playerDropDistanceMax = 2.0;

// REALISTIC CAN PHYSICS CONSTANTS FOR EMPTY CAN
const CAN_MASS = 0.05; // ~50 grams for empty can (much lighter)
const CAN_FRICTION = 0.3; // Less friction on hard surfaces
const CAN_ROLLING_FRICTION = 0.05; // Special friction for rolling
const CAN_RESTITUTION = 0.4; // Less bouncy than before (more realistic)
const CAN_AIR_RESISTANCE = 0.995; // Air affects light objects more
const CAN_ANGULAR_DAMPING = 0.98; // Rotation slows down naturally

// Realistic physical properties
const CAN_RADIUS = 0.15;
const CAN_HEIGHT = 0.4;
const CAN_INERTIA = 0.5 * CAN_MASS * CAN_RADIUS * CAN_RADIUS; // Moment of inertia for cylinder

// Player collision radius
const playerRadius = 0.30;
const canCollisionRadius = 0.20;

// Advanced physics state
let canContactPoints = [];
let canSurfaceVelocity = new THREE.Vector3();
let canPreviousPosition = new THREE.Vector3();
let canPreviousRotation = new THREE.Vector3();

function createTomatoCanTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    
    context.fillStyle = '#C25D5D';
    context.fillRect(0, 0, 128, 256);
    
    context.fillStyle = '#F0EAD6';
    context.fillRect(20, 50, 88, 156);

    context.fillStyle = '#333333';
    context.font = 'bold 30px Arial';
    context.textAlign = 'center';
    context.fillText('TOMATOES', 64, 110);
    
    for (let i = 0; i < 150; i++) {
        const x = Math.random() * 128;
        const y = Math.random() * 256;
        const size = Math.random() * 5 + 1;
        const rustColor = Math.random() < 0.5 ? '#8B4513' : '#6E4A35';
        context.fillStyle = rustColor;
        context.globalAlpha = Math.random() * 0.5 + 0.3;
        context.fillRect(x, y, size, size);
    }
    
    context.globalAlpha = 1.0;
    context.strokeStyle = '#444444';
    context.lineWidth = 1;
    for (let i = 0; i < 10; i++) {
        context.beginPath();
        context.moveTo(Math.random() * 128, Math.random() * 256);
        context.lineTo(Math.random() * 128, Math.random() * 256);
        context.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.repeat.x = 1; 
    return texture;
}

function createCan(x, z) {
    const canGroup = new THREE.Group();
    canGroup.name = "InteractableCan";
    
    // REALISTIC PHYSICS PROPERTIES
    canGroup.userData = {
        velocity: new THREE.Vector3(),
        angularVelocity: new THREE.Vector3(),
        onGround: true,
        mass: CAN_MASS,
        radius: CAN_RADIUS,
        height: CAN_HEIGHT,
        inertia: CAN_INERTIA,
        isTipped: false,
        isRolling: false,
        contactNormal: new THREE.Vector3(0, 1, 0),
        surfaceMaterial: 'grass', // Can have different friction per surface
        lastImpactTime: 0,
        impactForce: new THREE.Vector3()
    };
    
    // Main body
    const bodyGeometry = new THREE.CylinderGeometry(CAN_RADIUS, CAN_RADIUS, CAN_HEIGHT, 32);
    const tomatoTexture = createTomatoCanTexture();
    const bodyMaterial = new THREE.MeshLambertMaterial({ 
        map: tomatoTexture,
        color: 0xffffff
    }); 
    const canBody = new THREE.Mesh(bodyGeometry, bodyMaterial);
    canBody.name = "CanMesh";
    canGroup.add(canBody);
    
    // Top and bottom caps
    const metalColor = 0xAAAAAA;
    const capGeometry = new THREE.CylinderGeometry(CAN_RADIUS, CAN_RADIUS, 0.02, 32);
    const capMaterial = new THREE.MeshLambertMaterial({ 
        color: metalColor, 
        flatShading: true
    }); 
    
    // Opened/Empty Rim
    const rimGeometry = new THREE.TorusGeometry(CAN_RADIUS * 0.9, 0.005, 8, 32);
    const rimMaterial = new THREE.MeshLambertMaterial({ color: 0x555555 });
    const rim = new THREE.Mesh(rimGeometry, rimMaterial);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = CAN_HEIGHT / 2 + 0.01;
    canGroup.add(rim);

    const bottomCap = new THREE.Mesh(capGeometry, capMaterial);
    bottomCap.position.y = -CAN_HEIGHT / 2;
    canGroup.add(bottomCap);

    // Realistic initial tilt - empty cans are unstable
    canGroup.rotation.z = (Math.random() - 0.5) * 0.3;
    canGroup.rotation.x = (Math.random() - 0.5) * 0.3;

    canGroup.position.set(x, CAN_HEIGHT / 2, z);
    scene.add(canGroup);
    
    // Initialize previous position for velocity calculation
    canPreviousPosition.copy(canGroup.position);
    canPreviousRotation.copy(canGroup.rotation);
    
    return canGroup;
}

function applyForceToCan(force, applicationPoint = null) {
    // Apply linear force
    const forceMultiplier = 1 / can.userData.mass;
    can.userData.velocity.add(force.multiplyScalar(forceMultiplier * 0.02)); // Scale for frame rate
    
    // Apply torque if force is applied at a point
    if (applicationPoint) {
        const leverArm = new THREE.Vector3().subVectors(applicationPoint, can.position);
        const torque = new THREE.Vector3().crossVectors(leverArm, force);
        const angularAcceleration = torque.multiplyScalar(1 / can.userData.inertia);
        can.userData.angularVelocity.add(angularAcceleration.multiplyScalar(0.02));
    }
}

function applyTorque(torque) {
    const angularAcceleration = torque.multiplyScalar(1 / can.userData.inertia);
    can.userData.angularVelocity.add(angularAcceleration.multiplyScalar(0.02));
}

function checkIfCanIsTipped() {
    const tipThreshold = Math.PI / 4; // 45 degrees
    const currentTilt = Math.max(
        Math.abs(can.rotation.x),
        Math.abs(can.rotation.z)
    );
    
    const wasTipped = can.userData.isTipped;
    can.userData.isTipped = currentTilt > tipThreshold;
    
    // If just tipped over, add some random rotation
    if (can.userData.isTipped && !wasTipped) {
        can.userData.angularVelocity.x += (Math.random() - 0.5) * 2;
        can.userData.angularVelocity.z += (Math.random() - 0.5) * 2;
    }
    
    return can.userData.isTipped;
}

function checkIfCanIsRolling() {
    if (!can.userData.onGround || can.userData.isTipped) {
        can.userData.isRolling = false;
        return false;
    }
    
    // Can is rolling if it has significant angular velocity and is upright
    const angularSpeed = can.userData.angularVelocity.length();
    const linearSpeed = can.userData.velocity.length();
    can.userData.isRolling = angularSpeed > 0.5 && linearSpeed > 0.1 && !can.userData.isTipped;
    
    return can.userData.isRolling;
}

function calculateSurfaceVelocity() {
    // Calculate velocity at the contact point due to rotation
    const angularVelocity = can.userData.angularVelocity;
    const radiusVector = new THREE.Vector3(0, -CAN_RADIUS, 0);
    canSurfaceVelocity.crossVectors(angularVelocity, radiusVector);
}

function updateCanPhysics() {
    if (isCarryingCan) return;
    
    const deltaTime = 0.016; // Approximate 60fps
    
    // Store previous state for calculations
    canPreviousPosition.copy(can.position);
    canPreviousRotation.copy(can.rotation);
    
    // Apply gravity (scaled by mass)
    can.userData.velocity.y += GRAVITY * deltaTime * (CAN_MASS / 0.05);
    
    // Apply air resistance (more effect on light objects)
    can.userData.velocity.multiplyScalar(CAN_AIR_RESISTANCE);
    
    // Update position
    can.position.add(can.userData.velocity.clone().multiplyScalar(deltaTime));
    
    // Calculate surface velocity for rolling physics
    calculateSurfaceVelocity();
    
    // Update rotation with proper angular damping
    can.rotation.x += can.userData.angularVelocity.x * deltaTime;
    can.rotation.y += can.userData.angularVelocity.y * deltaTime;
    can.rotation.z += can.userData.angularVelocity.z * deltaTime;
    
    // Apply angular damping
    can.userData.angularVelocity.multiplyScalar(CAN_ANGULAR_DAMPING);
    
    // Check physical states
    const isTipped = checkIfCanIsTipped();
    const isRolling = checkIfCanIsRolling();
    
    // GROUND COLLISION with realistic response
    if (can.position.y <= canOriginalPosition.y) {
        can.position.y = canOriginalPosition.y;
        
        // Realistic ground impact
        if (can.userData.velocity.y < 0) {
            const impactStrength = Math.abs(can.userData.velocity.y);
            
            // Bounce with energy loss
            can.userData.velocity.y = -can.userData.velocity.y * CAN_RESTITUTION;
            
            // Sound-like effect through visual feedback
            if (impactStrength > 0.5) {
                // Add random rotation on impact
                can.userData.angularVelocity.x += (Math.random() - 0.5) * impactStrength * 2;
                can.userData.angularVelocity.z += (Math.random() - 0.5) * impactStrength * 2;
                
                // Small bounce for light object
                can.userData.velocity.y += impactStrength * 0.3;
            }
            
            can.userData.lastImpactTime = Date.now();
            can.userData.impactForce.set(0, impactStrength, 0);
        }
        
        // GROUND FRICTION - different behavior based on state
        if (isRolling) {
            // Rolling friction is much lower
            can.userData.velocity.x *= (1 - CAN_ROLLING_FRICTION);
            can.userData.velocity.z *= (1 - CAN_ROLLING_FRICTION);
            
            // Sync angular velocity with linear velocity for realistic rolling
            const groundSpeed = Math.sqrt(can.userData.velocity.x * can.userData.velocity.x + 
                                        can.userData.velocity.z * can.userData.velocity.z);
            const targetAngularSpeed = groundSpeed / CAN_RADIUS;
            
            // Smoothly approach the correct rolling angular velocity
            const currentAngularSpeed = can.userData.angularVelocity.length();
            if (groundSpeed > 0.1) {
                const adjustment = targetAngularSpeed - currentAngularSpeed;
                can.userData.angularVelocity.y += adjustment * 0.1;
            }
        } else {
            // Sliding friction
            can.userData.velocity.x *= (1 - CAN_FRICTION);
            can.userData.velocity.z *= (1 - CAN_FRICTION);
        }
        
        can.userData.onGround = true;
    } else {
        can.userData.onGround = false;
    }
    
    // WALL COLLISIONS with realistic response
    const halfWidth = gridWidth / 2 - canCollisionRadius;
    const halfDepth = gridDepth / 2 - canCollisionRadius;
    
    if (can.position.x > halfWidth) {
        can.position.x = halfWidth;
        can.userData.velocity.x = -can.userData.velocity.x * CAN_RESTITUTION * 0.8;
        // Add spin when hitting walls
        can.userData.angularVelocity.z += can.userData.velocity.x * 0.8;
    } else if (can.position.x < -halfWidth) {
        can.position.x = -halfWidth;
        can.userData.velocity.x = -can.userData.velocity.x * CAN_RESTITUTION * 0.8;
        can.userData.angularVelocity.z += can.userData.velocity.x * 0.8;
    }
    
    if (can.position.z > halfDepth) {
        can.position.z = halfDepth;
        can.userData.velocity.z = -can.userData.velocity.z * CAN_RESTITUTION * 0.8;
        can.userData.angularVelocity.x += can.userData.velocity.z * 0.8;
    } else if (can.position.z < -halfDepth) {
        can.position.z = -halfDepth;
        can.userData.velocity.z = -can.userData.velocity.z * CAN_RESTITUTION * 0.8;
        can.userData.angularVelocity.x += can.userData.velocity.z * 0.8;
    }
    
    // STABILITY - empty cans tend to fall over
    if (!isTipped && can.userData.onGround) {
        // Add slight instability - empty cans wobble
        const wobbleStrength = 0.02;
        can.userData.angularVelocity.x += (Math.random() - 0.5) * wobbleStrength;
        can.userData.angularVelocity.z += (Math.random() - 0.5) * wobbleStrength;
    }
    
    // ENERGY DISSIPATION
    can.userData.velocity.multiplyScalar(0.998);
    can.userData.angularVelocity.multiplyScalar(0.995);
}

function handleCanCollision() {
    if (!isCarryingCan) {
        const canPosition = new THREE.Vector3();
        can.getWorldPosition(canPosition);
        
        const playerXZ = new THREE.Vector2(player.position.x, player.position.z);
        const canXZ = new THREE.Vector2(canPosition.x, canPosition.z);
        
        const collisionDistance = playerRadius + canCollisionRadius;
        const currentDistance = playerXZ.distanceTo(canXZ);

        if (currentDistance < collisionDistance) {
            // REALISTIC COLLISION RESPONSE
            const overlap = collisionDistance - currentDistance;
            const collisionNormal = playerXZ.clone().sub(canXZ).normalize();
            
            // Move player away from can
            player.position.x += collisionNormal.x * overlap * 0.7;
            player.position.z += collisionNormal.y * overlap * 0.7;
            
            // Apply force to can based on player movement
            if (intendedMovement.length() > 0) {
                const playerSpeed = intendedMovement.length();
                const forceMagnitude = playerSpeed * 25; // Realistic force scaling
                
                const force = new THREE.Vector3(
                    -collisionNormal.x * forceMagnitude,
                    0.5, // Small upward force
                    -collisionNormal.y * forceMagnitude
                );
                
                // Apply force at the collision point for realistic rotation
                const collisionPoint = new THREE.Vector3(
                    canPosition.x + collisionNormal.x * CAN_RADIUS,
                    canPosition.y,
                    canPosition.z + collisionNormal.y * CAN_RADIUS
                );
                
                applyForceToCan(force, collisionPoint);
                
                // Light objects get knocked around more
                if (playerSpeed > 0.01) {
                    can.userData.velocity.y += 1.2 * playerSpeed;
                    can.userData.onGround = false;
                }
            }
        }
        
        // Update can physics
        updateCanPhysics();
    }
}

function handleContinuousCanInteraction() {
    if (!isCarryingCan) {
        const canPosition = new THREE.Vector3();
        can.getWorldPosition(canPosition);
        
        const playerToCanDistance = player.position.distanceTo(canPosition);
        const pushThreshold = playerRadius + canCollisionRadius + 0.1;
        
        // Continuous gentle pushing when very close
        if (playerToCanDistance < pushThreshold && intendedMovement.length() > 0) {
            const pushDirection = new THREE.Vector3(
                canPosition.x - player.position.x,
                0,
                canPosition.z - player.position.z
            ).normalize();
            
            const pushForce = intendedMovement.clone().multiplyScalar(0.3);
            applyForceToCan(pushForce);
        }
    }
}

function pickUpCan() {
    if (isCarryingCan) return false;
    
    const raycaster = createAimRaycaster();
    const playerPosition = player.position.clone();

    const canPosition = new THREE.Vector3();
    can.getWorldPosition(canPosition);
    
    const playerToCanDistance = playerPosition.distanceTo(canPosition);
    const isPlayerCloseEnough = playerToCanDistance <= canPickupDistance;
    
    const canIntersects = raycaster.intersectObject(can, true);

    if (canIntersects.length > 0 && isPlayerCloseEnough) {
        isCarryingCan = true;
        
        scene.remove(can);
        rightArmPivot.add(can);

        can.position.copy(canHoldingOffset);
        
        // Reset physics when picked up
        can.userData.velocity.set(0, 0, 0);
        can.userData.angularVelocity.set(0, 0, 0);
        can.userData.isTipped = false;
        can.userData.isRolling = false;
        
        can.rotation.set(0, 0, 0);
        return true;
    }
    
    return false;
}

function placeCan() {
    if (!isCarryingCan) return false;
    
    const raycaster = createAimRaycaster();
    const playerPosition = player.position.clone();

    const groundIntersects = raycaster.intersectObject(ground, false);

    if (groundIntersects.length > 0) {
        const intersectionPoint = groundIntersects[0].point;
        
        const playerPosXZ = new THREE.Vector2(playerPosition.x, playerPosition.z);
        const targetPosXZ = new THREE.Vector2(targetDropPosition.x, targetDropPosition.z);
        const playerDistanceToTarget = playerPosXZ.distanceTo(targetPosXZ);
        const isPlayerCloseEnough = playerDistanceToTarget <= playerDropDistanceMax;

        const dropPosXZ = new THREE.Vector2(intersectionPoint.x, intersectionPoint.z);
        const aimDistance = dropPosXZ.distanceTo(targetPosXZ);
        const isAimingAtTarget = aimDistance <= canDropTolerance;

        if (isAimingAtTarget && isPlayerCloseEnough) {
            isCarryingCan = false;
            
            rightArmPivot.remove(can);
            scene.add(can);
            
            can.position.copy(intersectionPoint);
            can.position.y = canOriginalPosition.y;
            
            // Realistic placement - empty cans often tip when dropped
            const tipChance = 0.6; // 60% chance to tip when placed
            if (Math.random() < tipChance) {
                can.rotation.set(
                    (Math.random() - 0.5) * 0.5,
                    Math.random() * Math.PI * 2, 
                    (Math.random() - 0.5) * 0.5
                );
            } else {
                can.rotation.set(0, Math.random() * Math.PI * 2, 0);
            }
            return true;
        }
    }
    
    return false;
}

function getCanPickupStatus() {
    if (isCarryingCan) {
        return {
            status: 'carrying',
            message: 'Carrying'
        };
    }
    
    const canPosition = new THREE.Vector3();
    can.getWorldPosition(canPosition);
    const playerToCanDistance = player.position.distanceTo(canPosition);
    const isPlayerCloseEnough = playerToCanDistance <= canPickupDistance;
    
    const raycaster = createAimRaycaster();
    const canIntersects = raycaster.intersectObject(can, true);

    if (canIntersects.length > 0 && isPlayerCloseEnough) {
        return {
            status: 'readyToPickup',
            message: 'READY TO PICK UP!',
            distance: playerToCanDistance
        };
    } else if (canIntersects.length > 0 && !isPlayerCloseEnough) {
        return {
            status: 'tooFar',
            message: `Too far! (${playerToCanDistance.toFixed(1)}m)`,
            distance: playerToCanDistance
        };
    } else if (isPlayerCloseEnough) {
        return {
            status: 'aimAtCan',
            message: 'Aim at can to pick up',
            distance: playerToCanDistance
        };
    } else {
        return {
            status: 'onGround',
            message: 'On Ground',
            distance: playerToCanDistance
        };
    }
}

function getCanPlacementStatus() {
    if (!isCarryingCan) return null;
    
    const raycaster = createAimRaycaster();
    const playerPosition = player.position.clone();
    const groundIntersects = raycaster.intersectObject(ground, false);
    const playerPosXZ = new THREE.Vector2(playerPosition.x, playerPosition.z);
    const targetPosXZ = new THREE.Vector2(targetDropPosition.x, targetDropPosition.z);
    const playerDistanceToTarget = playerPosXZ.distanceTo(targetPosXZ);
    const isPlayerCloseEnough = playerDistanceToTarget <= playerDropDistanceMax;

    if (!isPlayerCloseEnough) {
        return {
            status: 'tooFar',
            message: `Too far! (${playerDistanceToTarget.toFixed(1)}m)`,
            distance: playerDistanceToTarget
        };
    } else if (groundIntersects.length > 0) {
        const intersectionPoint = groundIntersects[0].point;
        const dropPosXZ = new THREE.Vector2(intersectionPoint.x, intersectionPoint.z);
        const aimDistance = dropPosXZ.distanceTo(targetPosXZ);

        if (aimDistance <= canDropTolerance) {
            return {
                status: 'readyToDrop',
                message: 'READY TO DROP!',
                distance: aimDistance
            };
        } else {
            return {
                status: 'aimAtTarget',
                message: 'Carrying (Aim at Drop Zone)',
                distance: aimDistance
            };
        }
    } else {
        return {
            status: 'aimAtGround',
            message: 'Carrying (Aim at Ground)'
        };
    }
}

function getCanPhysicsStatus() {
    if (isCarryingCan) {
        return {
            status: 'carrying',
            message: 'Carrying'
        };
    }
    
    const canSpeed = can.userData.velocity.length();
    const isTipped = checkIfCanIsTipped();
    const isRolling = checkIfCanIsRolling();
    
    if (isTipped) {
        return {
            status: 'tipped',
            message: 'TIPPED OVER!',
            speed: canSpeed,
            tipped: true,
            rolling: false
        };
    } else if (isRolling) {
        return {
            status: 'rolling',
            message: `Rolling (${canSpeed.toFixed(1)} m/s)`,
            speed: canSpeed,
            tipped: false,
            rolling: true
        };
    } else if (canSpeed > 0.15) {
        return {
            status: 'slidingFast',
            message: `Sliding Fast! (${canSpeed.toFixed(1)} m/s)`,
            speed: canSpeed,
            tipped: false,
            rolling: false
        };
    } else if (canSpeed > 0.05) {
        return {
            status: 'sliding',
            message: `Sliding... (${canSpeed.toFixed(1)} m/s)`,
            speed: canSpeed,
            tipped: false,
            rolling: false
        };
    } else if (!can.userData.onGround) {
        return {
            status: 'inAir',
            message: 'In Air',
            speed: canSpeed,
            tipped: false,
            rolling: false
        };
    } else if (canSpeed > 0.01) {
        return {
            status: 'moving',
            message: 'Moving...',
            speed: canSpeed,
            tipped: false,
            rolling: false
        };
    } else {
        return {
            status: 'stationary',
            message: 'On Ground',
            speed: canSpeed,
            tipped: false,
            rolling: false
        };
    }
}

// Initialize can at target position
function initCan() {
    canOriginalPosition.copy(targetDropPosition);
    can = createCan(targetDropPosition.x, targetDropPosition.z);
}

// Export advanced physics functions
function getCanAdvancedState() {
    return {
        position: can.position.clone(),
        rotation: can.rotation.clone(),
        velocity: can.userData.velocity.clone(),
        angularVelocity: can.userData.angularVelocity.clone(),
        mass: can.userData.mass,
        inertia: can.userData.inertia,
        isTipped: can.userData.isTipped,
        isRolling: can.userData.isRolling,
        onGround: can.userData.onGround,
        surfaceMaterial: can.userData.surfaceMaterial,
        lastImpact: can.userData.lastImpactTime
    };
}
