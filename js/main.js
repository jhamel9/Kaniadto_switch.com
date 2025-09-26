// Main application entry point
let gameInitialized = false;
let animationId;

// Main initialization function
function init() {
    try {
        // Initialize the scene first
        initScene();
        
        // Initialize controls
        initControls();
        
        // Initialize the can at target position
        initCan();
        
        // Initialize UI
        initializeUI();
        
        // Set up window resize handler
        window.addEventListener("resize", onWindowResize);
        
        // Set up error handling
        window.addEventListener('error', handleGlobalError);
        
        // Start the animation loop
        startAnimationLoop();
        
        gameInitialized = true;
        
        console.log('Game initialized successfully');
        
    } catch (error) {
        console.error('Failed to initialize game:', error);
        showTemporaryMessage('Failed to initialize game. Please refresh the page.', 5000, 'error');
    }
}

// Main animation loop
function animate() {
    if (!gameInitialized) return;
    
    try {
        // Update performance monitoring
        updatePerformanceMonitor();
        
        // Update player movement and controls
        updateMovement();
        
        // Update character animations
        updateAnimation();
        
        // Handle can physics and interactions
        handleCanCollision();
        handleContinuousCanInteraction();
        
        // Update all UI elements
        updateUI();
        updateCrosshair();
        
        // Update debug info if enabled
        if (debugMode) {
            updateDebugInfo();
        }
        
        // Render the scene
        renderer.render(scene, camera);
        
        // Continue the animation loop
        animationId = requestAnimationFrame(animate);
        
    } catch (error) {
        console.error('Error in animation loop:', error);
        handleAnimationError(error);
    }
}

function startAnimationLoop() {
    // Cancel any existing animation frame
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    
    // Start new animation loop
    animationId = requestAnimationFrame(animate);
}

function stopAnimationLoop() {
    if (animationId) {
        cancelAnimationFrame(animationId);
        animationId = null;
    }
}

// Window resize handler
function onWindowResize() {
    if (!gameInitialized) return;
    
    try {
        // Update camera aspect ratio and projection matrix
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        
        // Update renderer size
        renderer.setSize(window.innerWidth, window.innerHeight);
        
        console.log('Window resized to:', window.innerWidth, 'x', window.innerHeight);
        
    } catch (error) {
        console.error('Error during window resize:', error);
    }
}

// Error handling functions
function handleGlobalError(event) {
    console.error('Global error:', event.error);
    showTemporaryMessage('A game error occurred. Please check the console.', 3000, 'error');
}

function handleAnimationError(error) {
    console.error('Animation loop error:', error);
    
    // Try to recover by restarting the animation loop after a delay
    setTimeout(() => {
        if (gameInitialized) {
            console.log('Attempting to recover animation loop...');
            startAnimationLoop();
        }
    }, 1000);
}

// Game state management
function getGameState() {
    return {
        initialized: gameInitialized,
        playerPosition: player.position.clone(),
        playerGridPosition: getPlayerGridPosition(),
        carryingCan: isCarryingCan,
        canPosition: can.position.clone(),
        canPhysicsState: getCanPhysicsStatus(),
        inSafeZone: isPlayerInSafeZone(),
        controlState: getControlState()
    };
}

function resetGame() {
    if (!gameInitialized) return;
    
    try {
        // Reset player position and orientation
        resetPlayerPosition();
        
        // Reset can position and physics
        if (isCarryingCan) {
            // If carrying can, drop it first
            rightArmPivot.remove(can);
            scene.add(can);
            isCarryingCan = false;
        }
        
        // Reset can to original position
        can.position.copy(targetDropPosition);
        can.rotation.set(0, 0, 0);
        can.userData.velocity.set(0, 0, 0);
        can.userData.angularVelocity.set(0, 0, 0);
        can.userData.onGround = true;
        can.userData.isTipped = false;
        
        showTemporaryMessage('Game reset to starting position', 2000, 'info');
        
        console.log('Game reset successfully');
        
    } catch (error) {
        console.error('Error resetting game:', error);
        showTemporaryMessage('Error resetting game', 2000, 'error');
    }
}

// Game completion check
function checkGameCompletion() {
    if (isCarryingCan) return false;
    
    const canPosition = new THREE.Vector3();
    can.getWorldPosition(canPosition);
    
    // Check if can is within the target circle
    const targetPosXZ = new THREE.Vector2(targetDropPosition.x, targetDropPosition.z);
    const canPosXZ = new THREE.Vector2(canPosition.x, canPosition.z);
    const distanceToTarget = canPosXZ.distanceTo(targetPosXZ);
    
    // Also check if can is upright (not tipped over)
    const isUpright = !checkIfCanIsTipped();
    
    return distanceToTarget <= 1.5 && isUpright; // Within circle radius and upright
}

// Victory condition handler
function handleVictory() {
    if (checkGameCompletion()) {
        showTemporaryMessage('MISSION COMPLETED! You delivered the can!', 5000, 'success');
        
        // Add celebration effects
        triggerVictoryEffects();
        
        console.log('Victory condition achieved!');
    }
}

function triggerVictoryEffects() {
    // Change ambient light to celebratory color
    scene.background = new THREE.Color(0x87CEEB); // Keep sky blue
    
    // Add particle effects or other celebrations here
    // This can be expanded with more visual feedback
}

// Pause/Resume functionality
let gamePaused = false;

function togglePause() {
    if (gamePaused) {
        resumeGame();
    } else {
        pauseGame();
    }
}

function pauseGame() {
    if (!gameInitialized || gamePaused) return;
    
    gamePaused = true;
    stopAnimationLoop();
    
    // Show pause menu or overlay
    showPauseMenu();
    
    console.log('Game paused');
}

function resumeGame() {
    if (!gameInitialized || !gamePaused) return;
    
    gamePaused = false;
    hidePauseMenu();
    startAnimationLoop();
    
    console.log('Game resumed');
}

function showPauseMenu() {
    const pauseHTML = `
        <div id="pause-overlay" style="
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
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
                text-align: center;
                border: 2px solid #555;
            ">
                <h2 style="color: cyan; margin-top: 0;">GAME PAUSED</h2>
                <p>Press ESC to resume</p>
                
                <div style="margin: 20px 0;">
                    <button onclick="resumeGame()" style="
                        background: #4CAF50;
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 5px;
                        cursor: pointer;
                        margin: 5px;
                        width: 150px;
                    ">Resume</button>
                    <br>
                    <button onclick="resetGame()" style="
                        background: #ff9800;
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 5px;
                        cursor: pointer;
                        margin: 5px;
                        width: 150px;
                    ">Reset Game</button>
                    <br>
                    <button onclick="showHelp()" style="
                        background: #2196F3;
                        color: white;
                        border: none;
                        padding: 10px 20px;
                        border-radius: 5px;
                        cursor: pointer;
                        margin: 5px;
                        width: 150px;
                    ">Help</button>
                </div>
            </div>
        </div>
    `;
    
    // Remove existing pause overlay if any
    hidePauseMenu();
    
    document.body.insertAdjacentHTML('beforeend', pauseHTML);
}

function hidePauseMenu() {
    const pauseOverlay = document.getElementById('pause-overlay');
    if (pauseOverlay) {
        pauseOverlay.remove();
    }
}

// Export game control functions to global scope for HTML access
window.resetGame = resetGame;
window.togglePause = togglePause;
window.resumeGame = resumeGame;
window.showHelp = showHelp;
window.hideHelp = hideHelp;

// Enhanced keyboard controls
document.addEventListener('keydown', (e) => {
    if (!gameInitialized) return;
    
    switch (e.key) {
        case 'Escape':
            togglePause();
            e.preventDefault();
            break;
        case 'r':
        case 'R':
            if (e.ctrlKey) {
                resetGame();
                e.preventDefault();
            }
            break;
        case 'p':
        case 'P':
            togglePause();
            e.preventDefault();
            break;
        case 'h':
        case 'H':
            if (!gamePaused) {
                showHelp();
                e.preventDefault();
            }
            break;
    }
});

// Enhanced animation loop with victory checking
function enhancedAnimate() {
    if (!gameInitialized || gamePaused) return;
    
    try {
        // Update performance monitoring
        updatePerformanceMonitor();
        
        // Update player movement and controls
        updateMovement();
        
        // Update character animations
        updateAnimation();
        
        // Handle can physics and interactions
        handleCanCollision();
        handleContinuousCanInteraction();
        
        // Check for victory condition
        handleVictory();
        
        // Update all UI elements
        updateUI();
        updateCrosshair();
        
        // Update debug info if enabled
        if (debugMode) {
            updateDebugInfo();
        }
        
        // Render the scene
        renderer.render(scene, camera);
        
        // Continue the animation loop
        animationId = requestAnimationFrame(enhancedAnimate);
        
    } catch (error) {
        console.error('Error in enhanced animation loop:', error);
        handleAnimationError(error);
    }
}

// Replace original animate function with enhanced version
function startEnhancedAnimationLoop() {
    if (animationId) {
        cancelAnimationFrame(animationId);
    }
    animationId = requestAnimationFrame(enhancedAnimate);
}

// Page visibility handling (pause when tab is not active)
document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
        // Page is hidden, pause the game
        if (gameInitialized && !gamePaused) {
            pauseGame();
        }
    } else {
        // Page is visible, offer to resume
        if (gameInitialized && gamePaused) {
            // Could auto-resume or show a "click to resume" message
        }
    }
});

// Preload assets function (can be expanded for textures, etc.)
function preloadAssets() {
    // This function can be expanded to preload textures, models, etc.
    console.log('Preloading assets...');
    
    // For now, just return a resolved promise
    return Promise.resolve();
}

// Enhanced initialization with asset preloading
async function enhancedInit() {
    try {
        showTemporaryMessage('Loading game...', 2000, 'info');
        
        // Preload assets
        await preloadAssets();
        
        // Initialize the game
        init();
        
        // Use enhanced animation loop
        startEnhancedAnimationLoop();
        
        showTemporaryMessage('Game loaded successfully!', 2000, 'success');
        
    } catch (error) {
        console.error('Enhanced initialization failed:', error);
        showTemporaryMessage('Game loading failed. Please refresh.', 5000, 'error');
    }
}

// Start the game when the page loads
window.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, starting game initialization...');
    enhancedInit();
});

// Cleanup function for when the page is unloaded
window.addEventListener('beforeunload', () => {
    console.log('Cleaning up game resources...');
    stopAnimationLoop();
    
    // Additional cleanup can be added here
    if (renderer) {
        renderer.dispose();
    }
});

// Export main functions for external access
window.getGameState = getGameState;
window.toggleDebugMode = toggleDebugMode;

// Development helper: log game state to console
window.logGameState = () => {
    console.log('Current Game State:', getGameState());
};

console.log('Main.js module loaded successfully');
