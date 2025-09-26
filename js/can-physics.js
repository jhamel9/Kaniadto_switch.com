let can;
let isCarryingCan = false;
const canOriginalPosition = new THREE.Vector3();
const canHoldingOffset = new THREE.Vector3(0, 0.05, -0.25);

// Distance constraints
const canPickupDistance = 2.0;
const canDropTolerance = 1.5;
const playerDropDistanceMax = 2.0;

// Can physics constants
const CAN_FRICTION = 0.85;
const CAN_RESTITUTION = 0.5;
const CAN_AIR_RESISTANCE = 0.95;

function createTomatoCanTexture() {
    // ... (texture creation code from original)
}

function createCan(x, z) {
    // ... (can creation code from original)
}

function applyForceToCan(force) {
    // ... (physics code from original)
}

function checkIfCanIsTipped() {
    // ... (tipping detection code from original)
}

function updateCanPhysics() {
    // ... (physics update code from original)
}

function handleCanCollision() {
    // ... (collision handling code from original)
}

function handleContinuousCanInteraction() {
    // ... (continuous interaction code from original)
}
