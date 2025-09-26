// Can physics and interaction variables
let can;
let isCarryingCan = false;
const canOriginalPosition = new THREE.Vector3();
const canHoldingOffset = new THREE.Vector3(0, 0.05, -0.25);

// Distance constraints
const canPickupDistance = 2.0;
const canDropTolerance = 1.5;
const playerDropDistanceMax = 2.0;

// Can physics constants - ADJUSTED FOR LIGHTER EMPTY CAN
const CAN_FRICTION = 0.85; // Less friction for easier sliding
const CAN_RESTITUTION = 0.5; // More bouncy since it's light
const CAN_AIR_RESISTANCE = 0.95; // More affected by air

// Player collision radius
const playerRadius = 0.30;
const canCollisionRadius = 0.20;

// Function to create a custom canvas texture for a worn tomato can
function createTomatoCanTexture() {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 256; // Taller for cylinder mapping
    const context = canvas.getContext('2d');
    
    // 1. Base colors: Faded red and cream/white for a label look
    context.fillStyle = '#C25D5D'; // Faded tomato red
    context.fillRect(0, 0, 128, 256);
    
    context.fillStyle = '#F0EAD6'; // Cream/faded white center band
    context.fillRect(20, 50, 88, 156);

    // 2. Add "TOMATOES" text (faded black/dark red)
    context.fillStyle = '#333333';
    context.font = 'bold 30px Arial';
    context.textAlign = 'center';
    context.fillText('TOMATOES', 64, 110);
    
    // 3. Add rust and grime patches
    for (let i = 0; i < 150; i++) {
        const x = Math.random() * 128;
        const y = Math.random() * 256;
        const size = Math.random() * 5 + 1;
        const rustColor = Math.random() < 0.5 ? '#8B4513' : '#6E4A35'; // Brown/darker brown
        context.fillStyle = rustColor;
        context.globalAlpha = Math.random() * 0.5 + 0.3; // Make it semi-transparent
        context.fillRect(x, y, size, size);
    }
    
    // 4. Add deep scratches (dark lines)
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
    const canRadius = 0.15;
    const canHeight = 0.4;
    
    const canGroup = new THREE.Group();
    canGroup.name = "InteractableCan";
    
    // Add physics properties to the can group - LIGHTER WEIGHT FOR EMPTY CAN
    canGroup.userData = {
        velocity: new THREE.Vector3(),
        angularVelocity: new THREE.Vector3(),
        onGround: true,
        mass: 0.3, // Much lighter since it's empty (was 1.0)
        radius: canRadius,
        height: canHeight,
        isTipped: false
    };
    
    // 1. Main body with custom worn tomato label texture
    const bodyGeometry = new THREE.CylinderGeometry(canRadius, canRadius, canHeight, 32);
    const tomatoTexture = createTomatoCanTexture();
    const bodyMaterial = new THREE.MeshLambertMaterial({ 
        map: tomatoTexture,
        color: 0xffffff // Use white so the texture color shows fully
    }); 
    const canBody = new THREE.Mesh(bodyGeometry, bodyMaterial);
    canBody.name = "CanMesh";
    canGroup.add(canBody);
    
    // 2. Top and bottom caps (worn, empty metal look)
    const metalColor = 0xAAAAAA; // Gray/silver
    const capGeometry = new THREE.CylinderGeometry(canRadius, canRadius, 0.02, 32);
    const capMaterial = new THREE.MeshLambertMaterial({ 
        color: metalColor, 
        flatShading: true // Gives it a slightly cheaper, stamped metal look
    }); 
    
    // Opened/Empty Rim
    const rimGeometry = new THREE.TorusGeometry(canRadius * 0.9, 0.005, 8, 32);
    const rimMaterial = new THREE.MeshLambertMaterial({ color: 0x555555 });
    const rim = new THREE.Mesh(rimGeometry, rimMaterial);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = canHeight / 2 + 0.01;
    canGroup.add(rim);

    const bottomCap = new THREE.Mesh(capGeometry, capMaterial);
    bottomCap.position.y = -canHeight / 2;
    canGroup.add(bottomCap);

    // More dramatic initial tilt to show it's unstable
    canGroup.rotation.z = Math.random() * 0.2 - 0.1; // Increased random tilt
    canGroup.rotation.x = Math.random() * 0.2 - 0.1; // Increased random tilt

    // Position the entire can group on the ground
    canGroup.position.set(x, canHeight / 2, z);
    scene.add(canGroup);
    
    return canGroup;
}

function applyForceToCan(force) {
    // Apply force to can's velocity - multiplied by inverse mass for lighter object
    const forceMultiplier = 1 / can.userData.mass; // Lighter = more responsive to force
    can.userData.velocity.add(force.multiplyScalar(forceMultiplier));
    
    // More dramatic angular velocity for lightweight can
    can.userData.angularVelocity.set(
        (Math.random() - 0.5) * 1.0, // Increased spinning
        (Math.random() - 0.5) * 1.0, // Increased spinning  
        (Math.random() - 0.5) * 1.0  // Increased spinning
    );
}

function checkIfCanIsTipped() {
    // Check if the can is tipped over (angle greater than 45 degrees)
    const tipThreshold = Math.PI / 4; // 45 degrees
    const currentTilt = Math.max(
        Math.abs(can.rotation.x),
        Math.abs(can.rotation.z)
    );
    
    can.userData.isTipped = currentTilt > tipThreshold;
    return can.userData.isTipped;
}

function updateCanPhysics() {
    if (isCarryingCan) return;
    
    // Apply gravity - less effect on lightweight can
    can.userData.velocity.y += GRAVITY * 0.02 * 0.5; // Reduced gravity effect
    
    // Update position
    can.position.add(can.userData.velocity.clone().multiplyScalar(0.02));
    
    // Update rotation - faster rotation for lightweight can
    can.rotation.x += can.userData.angularVelocity.x * 0.03;
    can.rotation.y += can.userData.angularVelocity.y * 0.03;
    can.rotation.z += can.userData.angularVelocity.z * 0.03;
    
    // Check if can is tipped over
    const isTipped = checkIfCanIsTipped();
    
    // Ground collision
    if (can.position.y <= canOriginalPosition.y) {
        can.position.y = canOriginalPosition.y;
        
        // Bounce effect when hitting ground - more bouncy for lightweight can
        if (can.userData.velocity.y < 0) {
            can.userData.velocity.y = -can.userData.velocity.y * CAN_RESTITUTION;
            
            // Add random tilt when hitting ground (empty cans tip easily)
            if (Math.abs(can.userData.velocity.y) > 0.5) {
                can.rotation.x += (Math.random() - 0.5) * 0.3;
                can.rotation.z += (Math.random() - 0.5) * 0.3;
            }
        }
        
        // Less friction when on ground for easier sliding
        can.userData.velocity.x *= CAN_FRICTION;
        can.userData.velocity.z *= CAN_FRICTION;
        
        // Slower rotation damping when tipped (harder to stop rolling)
        if (isTipped) {
            can.userData.angularVelocity.multiplyScalar(0.98);
        } else {
            can.userData.angularVelocity.multiplyScalar(CAN_FRICTION);
        }
        
        can.userData.onGround = true;
    } else {
        // More air resistance when in air (light objects are affected more by air)
        can.userData.velocity.multiplyScalar(CAN_AIR_RESISTANCE);
        can.userData.angularVelocity.multiplyScalar(CAN_AIR_RESISTANCE);
    }
    
    // Wall collisions - more bounce for lightweight can
    const halfWidth = gridWidth / 2 - canCollisionRadius;
    const halfDepth = gridDepth / 2 - canCollisionRadius;
    
    if (can.position.x > halfWidth) {
        can.position.x = halfWidth;
        can.userData.velocity.x = -can.userData.velocity.x * CAN_RESTITUTION;
        // Add spin when hitting walls
        can.userData.angularVelocity.z += can.userData.velocity.x * 0.5;
    } else if (can.position.x < -halfWidth) {
        can.position.x = -halfWidth;
        can.userData.velocity.x = -can.userData.velocity.x * CAN_RESTITUTION;
        can.userData.angularVelocity.z += can.userData.velocity.x * 0.5;
    }
    
    if (can.position.z > halfDepth) {
        can.position.z = halfDepth;
        can.userData.velocity.z = -can.userData.velocity.z * CAN_RESTITUTION;
        can.userData.angularVelocity.x += can.userData.velocity.z * 0.5;
    } else if (can.position.z < -halfDepth) {
        can.position.z = -halfDepth;
        can.userData.velocity.z = -can.userData.velocity.z * CAN_RESTITUTION;
        can.userData.angularVelocity.x += can.userData.velocity.z * 0.5;
    }
    
    // Gradually reduce velocities - less damping for lightweight object
    can.userData.velocity.multiplyScalar(0.96);
    can.userData.angularVelocity.multiplyScalar(0.97);
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
            // Calculate collision normal and overlap
            const overlap = collisionDistance - currentDistance;
            const collisionNormal = playerXZ.clone().sub(canXZ).normalize();
            
            // Move player away from can (less resistance since can is light)
            player.position.x += collisionNormal.x * overlap * 0.5;
            player.position.z += collisionNormal.y * overlap * 0.5;
            
            // Apply force to the can based on player movement - MORE force since can is lighter
            if (intendedMovement.length() > 0) {
                // Calculate force based on player's movement direction and speed
                const playerSpeed = intendedMovement.length();
                const forceMagnitude = playerSpeed * 15; // Increased force for lighter can
                
                // Apply force in the opposite direction of collision normal
                const force = new THREE.Vector3(
                    -collisionNormal.x * forceMagnitude,
                    0,
                    -collisionNormal.y * forceMagnitude
                );
                
                applyForceToCan(force);
                
                // More upward force when walking into can (light cans jump more)
                if (playerSpeed > 0.01) {
                    can.userData.velocity.y += 0.8 * playerSpeed;
                    can.userData.onGround = false;
                    
                    // Add more dramatic tipping
                    can.rotation.x += (Math.random() - 0.5) * 0.4;
                    can.rotation.z += (Math.random() - 0.5) * 0.4;
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
        const pushThreshold = playerRadius + canCollisionRadius + 0.15; // Increased range
        
        // If player is very close to can and moving, apply continuous force
        if (playerToCanDistance < pushThreshold && intendedMovement.length() > 0) {
            // Stronger continuous force for lighter can
            const pushForce = intendedMovement.clone().multiplyScalar(0.8);
            applyForceToCan(pushForce);
        }
    }
}

function pickUpCan() {
    if (isCarryingCan) return false;
    
    const raycaster = createAimRaycaster();
    const playerPosition = player.position.clone();

    // Get the can's world position
    const canPosition = new THREE.Vector3();
    can.getWorldPosition(canPosition);
    
    // Check 1: Is player close enough to the can?
    const playerToCanDistance = playerPosition.distanceTo(canPosition);
    const isPlayerCloseEnough = playerToCanDistance <= canPickupDistance;
    
    // Check 2: Is crosshair pointing at the can?
    const canIntersects = raycaster.intersectObject(can, true);

    if (canIntersects.length > 0 && isPlayerCloseEnough) {
        // Pick up the can successfully
        isCarryingCan = true;
        
        // Remove the can from the scene
        scene.remove(can);

        // Parent the can to the right arm pivot
        rightArmPivot.add(can);

        // Position the can on the hand
        can.position.copy(canHoldingOffset);
        
        // Reset can physics when picked up
        can.userData.velocity.set(0, 0, 0);
        can.userData.angularVelocity.set(0, 0, 0);
        can.userData.isTipped = false;
        
        // Align the can with the hand rotation
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
        
        // Check 1: Is player close enough to target area?
        const playerPosXZ = new THREE.Vector2(playerPosition.x, playerPosition.z);
        const targetPosXZ = new THREE.Vector2(targetDropPosition.x, targetDropPosition.z);
        const playerDistanceToTarget = playerPosXZ.distanceTo(targetPosXZ);
        const isPlayerCloseEnough = playerDistanceToTarget <= playerDropDistanceMax;

        // Check 2: Is crosshair aiming at target area?
        const dropPosXZ = new THREE.Vector2(intersectionPoint.x, intersectionPoint.z);
        const aimDistance = dropPosXZ.distanceTo(targetPosXZ);
        const isAimingAtTarget = aimDistance <= canDropTolerance;

        if (isAimingAtTarget && isPlayerCloseEnough) {
            // Place the can successfully
            isCarryingCan = false;
            
            rightArmPivot.remove(can);
            scene.add(can);
            
            can.position.copy(intersectionPoint);
            can.position.y = canOriginalPosition.y;
            
            // More dramatic random rotation when placing (empty cans tip easily)
            can.rotation.set(
                Math.random() * 0.3 - 0.15, // Increased rotation range
                Math.random() * Math.PI * 2, 
                Math.random() * 0.3 - 0.15  // Increased rotation range
            );
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
    
    if (isTipped) {
        return {
            status: 'tipped',
            message: 'TIPPED OVER!',
            speed: canSpeed,
            tipped: true
        };
    } else if (canSpeed > 0.15) {
        return {
            status: 'rollingFast',
            message: `Rolling Fast! (${canSpeed.toFixed(1)} m/s)`,
            speed: canSpeed,
            tipped: false
        };
    } else if (canSpeed > 0.05) {
        return {
            status: 'rolling',
            message: `Rolling... (${canSpeed.toFixed(1)} m/s)`,
            speed: canSpeed,
            tipped: false
        };
    } else if (!can.userData.onGround) {
        return {
            status: 'inAir',
            message: 'In Air',
            speed: canSpeed,
            tipped: false
        };
    } else if (canSpeed > 0.01) {
        return {
            status: 'sliding',
            message: 'Sliding...',
            speed: canSpeed,
            tipped: false
        };
    } else {
        return {
            status: 'stationary',
            message: 'On Ground',
            speed: canSpeed,
            tipped: false
        };
    }
}

// Initialize can at target position
function initCan() {
    canOriginalPosition.copy(targetDropPosition);
    can = createCan(targetDropPosition.x, targetDropPosition.z);
}
