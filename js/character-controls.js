// Character control variables
let keyMoveX = 0, keyMoveZ = 0;
let keys = {};
let yaw = Math.PI, pitch = 0; // Start facing opposite direction
let isLocked = false;
let intendedMovement = new THREE.Vector3();

// Physics variables for jump/gravity
const velocity = new THREE.Vector3();
const GRAVITY = -9.8; // Gravity value
let canJump = true;
let walkCycle = 0; // Variable for the walking animation

// Movement speed constants
const WALK_SPEED = 0.05049;
const RUN_SPEED = 0.08049;

// Helper function to get the current raycaster from the center of the screen
function createAimRaycaster() {
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    return raycaster;
}

function initControls() {
    // Keyboard controls
    document.addEventListener("keydown", e => {
        keys[e.key.toLowerCase()] = true;
        if (e.key.toLowerCase() === ' ' && canJump) {
            velocity.y = 5.5;
            canJump = false;
        }
    });

    document.addEventListener("keyup", e => {
        keys[e.key.toLowerCase()] = false;
    });

    // Mouse click event for picking up and placing the can
    document.addEventListener("mousedown", e => {
        if (e.button === 0) { // Left click
            handleCanInteraction();
        }
    });

    // Look controls
    renderer.domElement.addEventListener("click", () => {
        try {
            renderer.domElement.requestPointerLock();
        } catch (e) {
            console.warn("Pointer lock request failed.");
        }
    });

    document.addEventListener('pointerlockchange', () => {
        isLocked = (document.pointerLockElement === renderer.domElement);
    });

    document.addEventListener("mousemove", e => {
        if (!isLocked) return;
        
        const dx = e.movementX * 0.002 * 1;
        const dy = e.movementY * 0.002 * 1;

        yaw -= dx;
        pitch -= dy;
        pitch = Math.max(-Math.PI/2, Math.min(Math.PI/2, pitch));
    });
}

function handleCanInteraction() {
    const raycaster = createAimRaycaster();
    const playerPosition = player.position.clone();

    if (!isCarryingCan) {
        // --- Try to pick up the can ---
        if (!pickUpCan()) {
            const canPosition = new THREE.Vector3();
            can.getWorldPosition(canPosition);
            const playerToCanDistance = playerPosition.distanceTo(canPosition);
            
            if (playerToCanDistance > canPickupDistance) {
                showCanError(`Too far! (${playerToCanDistance.toFixed(1)}m)`);
            } else {
                showCanError('Aim at the can!');
            }
        }
    } else {
        // --- Try to place the can ---
        if (!placeCan()) {
            const playerPosXZ = new THREE.Vector2(playerPosition.x, playerPosition.z);
            const targetPosXZ = new THREE.Vector2(targetDropPosition.x, targetDropPosition.z);
            const playerDistanceToTarget = playerPosXZ.distanceTo(targetPosXZ);
            
            const groundIntersects = raycaster.intersectObject(ground, false);
            
            if (!groundIntersects.length > 0) {
                showCanError('Must aim at the ground to drop the can!');
            } else if (playerDistanceToTarget > playerDropDistanceMax) {
                showCanError(`Must be closer than ${playerDropDistanceMax.toFixed(1)}m to drop!`);
            } else {
                showCanError('Must aim within the drop circle!');
            }
        }
    }
}

function updateMovement() {
    // Reset movement
    keyMoveX = 0;
    keyMoveZ = 0;
    
    // Check movement keys
    if (keys['w'] || keys['arrowup']) { keyMoveZ = -1; }
    if (keys['s'] || keys['arrowdown']) { keyMoveZ = 1; }
    if (keys['a'] || keys['arrowleft']) { keyMoveX = -1; }
    if (keys['d'] || keys['arrowright']) { keyMoveX = 1; }

    // Calculate speed factor (running when shift is pressed)
    let speedFactor = 1;
    if (keys['shift']) {
        speedFactor = 1.6; // Running speed
    }
    
    // Apply movement smoothing when changing directions
    const currentSpeed = WALK_SPEED * speedFactor;

    // Update player rotation based on mouse look
    player.rotation.y = yaw;
    camera.rotation.x = pitch;

    // Calculate movement vectors based on current look direction
    const forward = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
    const right = new THREE.Vector3(forward.z, 0, -forward.x);
    
    // Calculate intended movement
    intendedMovement.set(0, 0, 0);
    intendedMovement.addScaledVector(forward, keyMoveZ * currentSpeed);
    intendedMovement.addScaledVector(right, keyMoveX * currentSpeed);
    
    // Apply movement to player position
    player.position.add(intendedMovement);
    
    // Handle gravity and jumping
    updateGravity();
    
    // Handle wall collisions
    handleWallCollisions();
}

function updateGravity() {
    // Apply gravity
    velocity.y += GRAVITY * 0.02;
    player.position.y += velocity.y * 0.02;

    // Ground collision
    if (player.position.y < 0.96) {
        player.position.y = 0.96;
        velocity.y = 0;
        canJump = true;
    }
}

function handleWallCollisions() {
    const halfWidth = gridWidth / 2 - playerRadius;
    const halfDepth = gridDepth / 2 - playerRadius;
    
    // Wall collision checks
    if (player.position.x > halfWidth) {
        player.position.x = halfWidth;
    } else if (player.position.x < -halfWidth) {
        player.position.x = -halfWidth;
    }

    if (player.position.z > halfDepth) {
        player.position.z = halfDepth;
    } else if (player.position.z < -halfDepth) {
        player.position.z = -halfDepth;
    }
}

function updateAnimation() {
    // Handle hand visibility based on pitch (looking down)
    if (pitch > Math.PI / 4) {
        handsGroup.visible = false;
    } else {
        handsGroup.visible = true;
    }

    // Walking animation
    if (keyMoveX !== 0 || keyMoveZ !== 0) {
        walkCycle += 0.2;
        const walkY = Math.sin(walkCycle) * 0.03;
        
        // Bob the hands up and down
        handsGroup.position.y = -0.24 + walkY;
        
        // Animate arms (opposite phases for natural walk)
        leftArmPivot.rotation.x = Math.sin(walkCycle) * 0.42;
        rightArmPivot.rotation.x = Math.sin(walkCycle + Math.PI) * 0.42;

        // Animate legs (opposite phases for natural walk)
        leftLegPivot.rotation.x = Math.sin(walkCycle + Math.PI) * 0.3;
        rightLegPivot.rotation.x = Math.sin(walkCycle) * 0.3;
        
        // Slight head bob when running
        if (keys['shift']) {
            camera.position.y = Math.sin(walkCycle * 1.5) * 0.02;
        }
    } else {
        // Reset to idle position
        handsGroup.position.y = -0.24;
        leftArmPivot.rotation.x = 0.06;
        rightArmPivot.rotation.x = 0.06;
        leftLegPivot.rotation.x = 0;
        rightLegPivot.rotation.x = 0;
        camera.position.y = 0; // Reset head bob
    }

    // Handle can positioning when carrying
    if (isCarryingCan) {
        // Add slight sway to the can when moving
        if (keyMoveX !== 0 || keyMoveZ !== 0) {
            const swayX = Math.sin(walkCycle * 1.5) * 0.02;
            const swayY = Math.cos(walkCycle * 0.8) * 0.01;
            can.position.x = canHoldingOffset.x + swayX;
            can.position.y = canHoldingOffset.y + swayY;
            can.position.z = canHoldingOffset.z;
        } else {
            // Reset to normal position when idle
            can.position.copy(canHoldingOffset);
        }
    }
}

function getPlayerGridPosition() {
    const gridX = Math.floor(player.position.x + gridWidth / 2);
    const gridZ = Math.floor(player.position.z + gridDepth / 2);
    return { x: gridX, z: gridZ };
}

function getPlayerLookDirection() {
    return {
        yaw: yaw,
        pitch: pitch,
        forward: new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw)),
        right: new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw))
    };
}

function isPlayerInSafeZone() {
    const gridPos = getPlayerGridPosition();
    return gridPos.z < 4;
}

function getMovementState() {
    return {
        isMoving: keyMoveX !== 0 || keyMoveZ !== 0,
        isRunning: keys['shift'] && (keyMoveX !== 0 || keyMoveZ !== 0),
        moveX: keyMoveX,
        moveZ: keyMoveZ,
        speed: intendedMovement.length()
    };
}

function resetPlayerPosition() {
    player.position.set(0.5 - gridWidth / 2 + 7, 0.96, 0.5 - gridDepth / 2 + 2);
    player.rotation.y = Math.PI;
    camera.rotation.x = 0;
    yaw = Math.PI;
    pitch = 0;
    velocity.set(0, 0, 0);
}

function togglePointerLock() {
    if (isLocked) {
        document.exitPointerLock();
    } else {
        renderer.domElement.requestPointerLock();
    }
}

// Debug functions (can be removed in production)
function enableNoclip() {
    // This would require modifying the collision detection
    console.log("Noclip not implemented - would require collision system changes");
}

function setPlayerSpeed(newSpeed) {
    WALK_SPEED = newSpeed;
    console.log(`Player speed set to: ${newSpeed}`);
}

// Export control state for other modules
function getControlState() {
    return {
        isLocked: isLocked,
        yaw: yaw,
        pitch: pitch,
        keys: {...keys},
        intendedMovement: intendedMovement.clone()
    };
}
