// UI Elements and Display Management
const coordinatesDisplay = document.getElementById('coordinates');
const statusDisplay = document.getElementById('status');
const canStatusDisplay = document.getElementById('can-status');
let canStatusTimeout;

// UI Update Functions
function updateUI() {
    updateCoordinatesDisplay();
    updateSafetyStatusDisplay();
    updateCanStatusDisplay();
}

function updateCoordinatesDisplay() {
    const gridPos = getPlayerGridPosition();
    coordinatesDisplay.innerHTML = `
        <strong>Grid Cell:</strong> (${gridPos.x}, ${gridPos.z})
        <br><strong>Position:</strong> (${player.position.x.toFixed(2)}, ${player.position.z.toFixed(2)})
        <br><strong>Velocity:</strong> ${intendedMovement.length().toFixed(2)} m/s
    `;
}

function updateSafetyStatusDisplay() {
    const isSafe = isPlayerInSafeZone();
    const movementState = getMovementState();
    
    if (isSafe) {
        statusDisplay.innerHTML = `
            <strong><span class="safe-text">SAFE ZONE</span></strong>
            <br>${movementState.isRunning ? 'RUNNING' : movementState.isMoving ? 'WALKING' : 'IDLE'}
        `;
        statusDisplay.style.background = 'rgba(0, 100, 0, 0.7)';
    } else {
        statusDisplay.innerHTML = `
            <strong><span class="danger-text">DANGER ZONE</span></strong>
            <br>${movementState.isRunning ? 'RUNNING' : movementState.isMoving ? 'WALKING' : 'IDLE'}
        `;
        statusDisplay.style.background = 'rgba(100, 0, 0, 0.7)';
    }
}

function updateCanStatusDisplay() {
    if (canStatusTimeout) return; // Don't update if error message is showing
    
    let statusHTML = '<strong>Can Status:</strong> ';
    
    if (isCarryingCan) {
        const placementStatus = getCanPlacementStatus();
        if (placementStatus) {
            switch (placementStatus.status) {
                case 'readyToDrop':
                    statusHTML += `<span class="ready-text">${placementStatus.message}</span> (Click)`;
                    canStatusDisplay.style.background = 'rgba(0, 100, 0, 0.7)';
                    break;
                case 'tooFar':
                    statusHTML += `<span class="error-text">${placementStatus.message}</span>`;
                    canStatusDisplay.style.background = 'rgba(100, 100, 0, 0.7)';
                    break;
                case 'aimAtTarget':
                case 'aimAtGround':
                    statusHTML += placementStatus.message;
                    canStatusDisplay.style.background = 'rgba(50, 50, 50, 0.7)';
                    break;
            }
        }
    } else {
        const pickupStatus = getCanPickupStatus();
        const physicsStatus = getCanPhysicsStatus();
        
        // Combine pickup and physics status for comprehensive display
        switch (pickupStatus.status) {
            case 'readyToPickup':
                statusHTML += `<span class="ready-text">${pickupStatus.message}</span> (Click)`;
                canStatusDisplay.style.background = 'rgba(0, 100, 0, 0.7)';
                break;
            case 'tooFar':
                statusHTML += `<span class="error-text">${pickupStatus.message}</span>`;
                canStatusDisplay.style.background = 'rgba(100, 100, 0, 0.7)';
                break;
            case 'aimAtCan':
                statusHTML += `<span class="interact-text">${pickupStatus.message}</span>`;
                canStatusDisplay.style.background = 'rgba(0, 50, 100, 0.7)';
                break;
            case 'onGround':
                // Show physics status when not interacting
                switch (physicsStatus.status) {
                    case 'tipped':
                        statusHTML += `<span class="error-text">${physicsStatus.message}</span>`;
                        canStatusDisplay.style.background = 'rgba(100, 50, 0, 0.7)';
                        break;
                    case 'rollingFast':
                        statusHTML += `<span class="danger-text">${physicsStatus.message}</span>`;
                        canStatusDisplay.style.background = 'rgba(100, 0, 0, 0.7)';
                        break;
                    case 'rolling':
                        statusHTML += `<span class="interact-text">${physicsStatus.message}</span>`;
                        canStatusDisplay.style.background = 'rgba(0, 50, 100, 0.7)';
                        break;
                    case 'inAir':
                        statusHTML += `<span class="error-text">${physicsStatus.message}</span>`;
                        canStatusDisplay.style.background = 'rgba(100, 50, 0, 0.7)';
                        break;
                    case 'sliding':
                        statusHTML += `<span class="interact-text">${physicsStatus.message}</span>`;
                        canStatusDisplay.style.background = 'rgba(0, 50, 100, 0.7)';
                        break;
                    default:
                        statusHTML += physicsStatus.message;
                        canStatusDisplay.style.background = 'rgba(50, 50, 50, 0.7)';
                }
                break;
        }
    }
    
    canStatusDisplay.innerHTML = statusHTML;
}

// Error and Message Display Functions
function showCanError(message = 'On Ground') {
    if (canStatusTimeout) {
        clearTimeout(canStatusTimeout);
    }

    canStatusDisplay.innerHTML = `<strong>Can Status:</strong> <span class="error-text">${message}</span>`;
    canStatusDisplay.style.background = 'rgba(100, 100, 0, 0.7)';
    canStatusDisplay.style.animation = 'pulse 0.5s ease-in-out';
    
    canStatusTimeout = setTimeout(() => {
        canStatusDisplay.style.animation = '';
        canStatusTimeout = null;
    }, 3000);
}

function showTemporaryMessage(message, duration = 2000, type = 'info') {
    // Create temporary message element
    const messageElement = document.createElement('div');
    messageElement.style.position = 'absolute';
    messageElement.style.top = '50%';
    messageElement.style.left = '50%';
    messageElement.style.transform = 'translate(-50%, -50%)';
    messageElement.style.background = 'rgba(0, 0, 0, 0.8)';
    messageElement.style.color = 'white';
    messageElement.style.padding = '15px 25px';
    messageElement.style.borderRadius = '5px';
    messageElement.style.fontFamily = 'monospace';
    messageElement.style.fontSize = '16px';
    messageElement.style.zIndex = '1000';
    messageElement.style.textAlign = 'center';
    messageElement.style.pointerEvents = 'none';
    
    // Style based on message type
    switch (type) {
        case 'success':
            messageElement.style.border = '2px solid limegreen';
            messageElement.style.color = 'limegreen';
            break;
        case 'warning':
            messageElement.style.border = '2px solid yellow';
            messageElement.style.color = 'yellow';
            break;
        case 'error':
            messageElement.style.border = '2px solid red';
            messageElement.style.color = 'red';
            break;
        default:
            messageElement.style.border = '2px solid cyan';
            messageElement.style.color = 'cyan';
    }
    
    messageElement.textContent = message;
    document.body.appendChild(messageElement);
    
    // Animate in
    messageElement.style.opacity = '0';
    messageElement.style.transition = 'opacity 0.3s ease-in-out';
    
    setTimeout(() => {
        messageElement.style.opacity = '1';
    }, 10);
    
    // Remove after duration
    setTimeout(() => {
        messageElement.style.opacity = '0';
        setTimeout(() => {
            if (messageElement.parentNode) {
                messageElement.parentNode.removeChild(messageElement);
            }
        }, 300);
    }, duration);
}

// Crosshair Management
function updateCrosshair() {
    const crosshair = document.getElementById('crosshair');
    
    if (isCarryingCan) {
        // Change crosshair when carrying can
        crosshair.style.width = '25px';
        crosshair.style.height = '25px';
        crosshair.style.border = '2px solid cyan';
        crosshair.style.borderRadius = '50%';
    } else {
        // Default crosshair
        crosshair.style.width = '20px';
        crosshair.style.height = '20px';
        crosshair.style.border = 'none';
        crosshair.style.borderRadius = '0';
    }
    
    // Pulse effect when can is ready for interaction
    const pickupStatus = getCanPickupStatus();
    const placementStatus = getCanPlacementStatus();
    
    if ((!isCarryingCan && pickupStatus.status === 'readyToPickup') || 
        (isCarryingCan && placementStatus && placementStatus.status === 'readyToDrop')) {
        crosshair.style.animation = 'pulse 1s infinite';
    } else {
        crosshair.style.animation = 'none';
    }
}

// Help System
function showHelp() {
    const helpHTML = `
        <div id="help-overlay" style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.9);
            color: white;
            z-index: 10000;
            display: flex;
            justify-content: center;
            align-items: center;
            font-family: Arial, sans-serif;
        ">
            <div style="
                background: rgba(30, 30, 30, 0.95);
                padding: 30px;
                border-radius: 10px;
                max-width: 600px;
                max-height: 80vh;
                overflow-y: auto;
                border: 2px solid #555;
            ">
                <h2 style="color: cyan; margin-top: 0;">Abandoned Backyard - Controls</h2>
                
                <h3 style="color: limegreen;">Movement</h3>
                <ul>
                    <li><strong>W/A/S/D</strong> or <strong>Arrow Keys</strong> - Move around</li>
                    <li><strong>Shift</strong> - Run (while moving)</li>
                    <li><strong>Space</strong> - Jump</li>
                    <li><strong>Mouse</strong> - Look around</li>
                </ul>
                
                <h3 style="color: cyan;">Can Interaction</h3>
                <ul>
                    <li><strong>Left Click</strong> - Pick up/Drop can</li>
                    <li>Must be close to can and aim directly at it to pick up</li>
                    <li>Must aim within the target circle to drop can</li>
                    <li>Walk into can to push it around</li>
                </ul>
                
                <h3 style="color: yellow;">Objective</h3>
                <p>Carry the tomato can from the safe zone (green area) to the target circle in the danger zone (red area).</p>
                
                <h3 style="color: orange;">UI Information</h3>
                <ul>
                    <li><strong>Top Left</strong> - Grid coordinates and position</li>
                    <li><strong>Top Right</strong> - Safe/Danger zone status</li>
                    <li><strong>Bottom Center</strong> - Can status and interaction hints</li>
                </ul>
                
                <button onclick="hideHelp()" style="
                    background: #555;
                    color: white;
                    border: none;
                    padding: 10px 20px;
                    border-radius: 5px;
                    cursor: pointer;
                    margin-top: 20px;
                    width: 100%;
                ">Close Help</button>
            </div>
        </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', helpHTML);
}

function hideHelp() {
    const helpOverlay = document.getElementById('help-overlay');
    if (helpOverlay) {
        helpOverlay.remove();
    }
}

// Debug Information Display
let debugMode = false;

function toggleDebugMode() {
    debugMode = !debugMode;
    
    if (debugMode) {
        showTemporaryMessage('DEBUG MODE ENABLED', 1500, 'warning');
    } else {
        showTemporaryMessage('DEBUG MODE DISABLED', 1500, 'info');
    }
}

function updateDebugInfo() {
    if (!debugMode) return;
    
    const debugInfo = `
        <strong>DEBUG INFO</strong><br>
        Player Pos: (${player.position.x.toFixed(2)}, ${player.position.y.toFixed(2)}, ${player.position.z.toFixed(2)})<br>
        Can Pos: (${can.position.x.toFixed(2)}, ${can.position.y.toFixed(2)}, ${can.position.z.toFixed(2)})<br>
        Carrying Can: ${isCarryingCan}<br>
        Can Velocity: (${can.userData.velocity.x.toFixed(2)}, ${can.userData.velocity.y.toFixed(2)}, ${can.userData.velocity.z.toFixed(2)})<br>
        On Ground: ${can.userData.onGround}<br>
        Tipped: ${checkIfCanIsTipped()}
    `;
    
    // Create or update debug display
    let debugDisplay = document.getElementById('debug-display');
    if (!debugDisplay) {
        debugDisplay = document.createElement('div');
        debugDisplay.id = 'debug-display';
        debugDisplay.style.position = 'absolute';
        debugDisplay.style.bottom = '100px';
        debugDisplay.style.left = '20px';
        debugDisplay.style.background = 'rgba(0, 0, 0, 0.8)';
        debugDisplay.style.color = 'limegreen';
        debugDisplay.style.padding = '10px';
        debugDisplay.style.borderRadius = '5px';
        debugDisplay.style.fontFamily = 'monospace';
        debugDisplay.style.fontSize = '12px';
        debugDisplay.style.zIndex = '10';
        document.body.appendChild(debugDisplay);
    }
    
    debugDisplay.innerHTML = debugInfo;
}

// Performance Monitoring
let frameTimes = [];
let lastFrameTime = performance.now();

function updatePerformanceMonitor() {
    const currentTime = performance.now();
    const frameTime = currentTime - lastFrameTime;
    lastFrameTime = currentTime;
    
    frameTimes.push(frameTime);
    if (frameTimes.length > 60) {
        frameTimes.shift();
    }
    
    const avgFrameTime = frameTimes.reduce((a, b) => a + b) / frameTimes.length;
    const fps = 1000 / avgFrameTime;
    
    // Update FPS display if debug mode is on
    if (debugMode) {
        const fpsDisplay = document.getElementById('fps-display') || createFPSDisplay();
        fpsDisplay.textContent = `FPS: ${fps.toFixed(1)}`;
    }
}

function createFPSDisplay() {
    const fpsDisplay = document.createElement('div');
    fpsDisplay.id = 'fps-display';
    fpsDisplay.style.position = 'absolute';
    fpsDisplay.style.top = '20px';
    fpsDisplay.style.right = '150px';
    fpsDisplay.style.background = 'rgba(0, 0, 0, 0.8)';
    fpsDisplay.style.color = 'cyan';
    fpsDisplay.style.padding = '5px 10px';
    fpsDisplay.style.borderRadius = '5px';
    fpsDisplay.style.fontFamily = 'monospace';
    fpsDisplay.style.fontSize = '12px';
    fpsDisplay.style.zIndex = '10';
    document.body.appendChild(fpsDisplay);
    return fpsDisplay;
}

// CSS Animation for pulsing effect
const style = document.createElement('style');
style.textContent = `
    @keyframes pulse {
        0% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
        50% { transform: translate(-50%, -50%) scale(1.1); opacity: 0.8; }
        100% { transform: translate(-50%, -50%) scale(1); opacity: 1; }
    }
    
    #crosshair {
        transition: all 0.2s ease-in-out;
    }
    
    #can-status {
        transition: all 0.3s ease-in-out;
    }
`;
document.head.appendChild(style);

// Keyboard shortcuts for UI
document.addEventListener('keydown', (e) => {
    if (e.key === 'h' || e.key === 'H') {
        showHelp();
    }
    if (e.key === 'F3' || (e.ctrlKey && e.key === 'd')) {
        toggleDebugMode();
        e.preventDefault();
    }
});

// Export UI functions
function initializeUI() {
    updateUI();
    updateCrosshair();
    showTemporaryMessage('Welcome to Abandoned Backyard! Press H for help.', 3000, 'info');
}
