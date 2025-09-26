// Global variables for scene setup
let scene, camera, renderer, player;
let gridWidth = 15, gridDepth = 20;
let targetDropPosition;
let ground; // Make ground accessible for raycasting

function initScene() {
    // Scene setup
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    
    // Set a light blue background color for a daytime sky
    scene.background = new THREE.Color(0x87CEEB);

    // Add a directional light for shadows and highlights (like the sun)
    const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 1.0);
    directionalLight.position.set(5, 10, 5);
    scene.add(directionalLight);

    const ambientLight = new THREE.AmbientLight(0xAAAAAA);
    scene.add(ambientLight);

    createGround();
    createWalls();
    createBuildings();
    createPlayer();
    createCharacterModel();
}

function createGround() {
    // Custom grid with 15 rows and 20 columns - make it look like overgrown ground
    const gridGeometry = new THREE.BufferGeometry();
    const gridVertices = [];
    const gridDivisionsX = 15;
    const gridDivisionsZ = 20;
    const gridColor = 0x6B8E23; // Olive drab for overgrown ground

    // Create horizontal lines
    for (let i = 0; i <= gridDivisionsZ; i++) {
        const z = -gridDepth / 2 + (i / gridDivisionsZ) * gridDepth;
        gridVertices.push(-gridWidth / 2, 0, z);
        gridVertices.push(gridWidth / 2, 0, z);
    }
    // Create vertical lines
    for (let i = 0; i <= gridDivisionsX; i++) {
        const x = -gridWidth / 2 + (i / gridDivisionsX) * gridWidth;
        gridVertices.push(x, 0, -gridDepth / 2);
        gridVertices.push(x, 0, gridDepth / 2);
    }

    gridGeometry.setAttribute('position', new THREE.Float32BufferAttribute(gridVertices, 3));
    const gridMaterial = new THREE.LineBasicMaterial({ color: gridColor });
    const grid = new THREE.LineSegments(gridGeometry, gridMaterial);
    scene.add(grid);

    // Add a ground plane for more realistic ground
    const groundGeometry = new THREE.PlaneGeometry(gridWidth, gridDepth);
    const groundMaterial = new THREE.MeshLambertMaterial({ 
        color: 0x556B2F, // Dark olive green
        side: THREE.DoubleSide
    });
    ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = Math.PI / 2;
    ground.name = "Ground";
    scene.add(ground);

    // Create a large ground plane outside the main play area
    const outsideGroundGeometry = new THREE.PlaneGeometry(gridWidth * 2, gridDepth * 2);
    const outsideGroundMaterial = new THREE.MeshBasicMaterial({ color: 0x444444, side: THREE.DoubleSide });
    const outsideGround = new THREE.Mesh(outsideGroundGeometry, outsideGroundMaterial);
    outsideGround.position.set(0, -0.01, -gridDepth / 2 - (gridDepth));
    outsideGround.rotation.x = Math.PI / 2;
    scene.add(outsideGround);
    
    createBoundaryLine();
    createTargetCircle();
}

function createBoundaryLine() {
    // Line added from (0,4) to (14,4) grid cells
    const lineGeometry = new THREE.BufferGeometry();
    const linePoints = [];
    
    // Convert grid coordinates to world coordinates
    const startX = 0 - gridWidth / 2 + 0.5;
    const startZ = 4 - gridDepth / 2 + 0.5;
    const endX = 14 - gridWidth / 2 + 0.5;
    const endZ = 4 - gridDepth / 2 + 0.5;

    linePoints.push(new THREE.Vector3(startX, 0, startZ));
    linePoints.push(new THREE.Vector3(endX, 0, endZ));

    lineGeometry.setFromPoints(linePoints);
    const lineMaterial = new THREE.LineBasicMaterial({ color: 0x555555, linewidth: 2 });
    const line = new THREE.Line(lineGeometry, lineMaterial);
    scene.add(line);
}

function createTargetCircle() {
    // Create a circle at grid cell (7, 14) with a radius of 1.5 units
    const circleCenterGridX = 7;
    const circleCenterGridZ = 14;
    const circleRadius = 1.5;
    const segments = 64; // For a smooth circle

    const circleWorldX = 0 - gridWidth / 2 + circleCenterGridX + 0.5;
    const circleWorldZ = 0 - gridDepth / 2 + circleCenterGridZ + 0.5;
    
    // Define the exact target position for placing the can
    targetDropPosition = new THREE.Vector3(circleWorldX, 0.2, circleWorldZ);
    
    const circleGeometry = new THREE.BufferGeometry();
    const circlePoints = [];

    for (let i = 0; i <= segments; i++) {
        const angle = (i / segments) * Math.PI * 2;
        const x = circleWorldX + circleRadius * Math.cos(angle);
        const z = circleWorldZ + circleRadius * Math.sin(angle);
        circlePoints.push(x, 0, z);
    }

    circleGeometry.setAttribute('position', new THREE.Float32BufferAttribute(circlePoints, 3));
    const circleMaterial = new THREE.LineBasicMaterial({ color: 0x555555 });
    const circle = new THREE.Line(circleGeometry, circleMaterial);
    scene.add(circle);
}

function createWalls() {
    const wallHeight = 2;
    const wallThickness = 0.2;
    const weatheredMaterial = createWeatheredWallMaterial();
    const gateMaterial = new THREE.MeshLambertMaterial({ color: 0x6B4226 }); // Rusty metal color

    // Gate dimensions and position
    const gateWidth = 1.5;
    const gateHeight = 1.5;
    const gateOffsetX = -4; // Shift the gate 4 units to the left of the center

    // Left Front Wall
    const frontWallLeftWidth = (gridWidth/2 + gateOffsetX) - (gateWidth / 2);
    const frontWallLeft = new THREE.Mesh(new THREE.BoxGeometry(frontWallLeftWidth, wallHeight, wallThickness), weatheredMaterial);
    frontWallLeft.position.set(-gridWidth/2 + frontWallLeftWidth/2, wallHeight / 2, -gridDepth / 2);
    scene.add(frontWallLeft);

    // Right Front Wall
    const frontWallRightWidth = (gridWidth/2 - gateOffsetX) - (gateWidth / 2);
    const frontWallRight = new THREE.Mesh(new THREE.BoxGeometry(frontWallRightWidth, wallHeight, wallThickness), weatheredMaterial);
    frontWallRight.position.set(gateOffsetX + (gateWidth / 2) + frontWallRightWidth/2, wallHeight / 2, -gridDepth / 2);
    scene.add(frontWallRight);

    // Closed Gate
    const gate = createFenceGatePanel(gateWidth, gateHeight, gateMaterial);
    gate.position.set(gateOffsetX, gateHeight / 2, -gridDepth / 2);
    scene.add(gate);

    // Back Wall
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(gridWidth + wallThickness, wallHeight, wallThickness), weatheredMaterial);
    backWall.position.set(0, wallHeight/2, gridDepth/2);
    scene.add(backWall);

    // Left Wall
    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, wallHeight, gridDepth + wallThickness), weatheredMaterial);
    leftWall.position.set(-gridWidth/2, wallHeight/2, 0);
    scene.add(leftWall);

    // Right Wall
    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(wallThickness, wallHeight, gridDepth + wallThickness), weatheredMaterial);
    rightWall.position.set(gridWidth/2, wallHeight/2, 0);
    scene.add(rightWall);
}

function createFenceGatePanel(width, height, material) {
    const group = new THREE.Group();
    const barThickness = 0.05;
    const numVerticalBars = Math.floor(width / 0.2); // Adjust bar count based on width

    // Horizontal top bar
    const topBar = new THREE.Mesh(new THREE.BoxGeometry(width, barThickness, barThickness), material);
    topBar.position.y = height / 2;
    group.add(topBar);

    // Horizontal bottom bar
    const bottomBar = new THREE.Mesh(new THREE.BoxGeometry(width, barThickness, barThickness), material);
    bottomBar.position.y = -height / 2 + barThickness;
    group.add(bottomBar);

    // Vertical bars
    const spacing = width / numVerticalBars;
    for (let i = 0; i < numVerticalBars; i++) {
        const x = (i * spacing) - (width / 2) + (spacing / 2);
        const verticalBar = new THREE.Mesh(new THREE.BoxGeometry(barThickness, height, barThickness), material);
        verticalBar.position.x = x;
        group.add(verticalBar);
    }

    return group;
}

function createWeatheredWallMaterial() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    
    // Base wall color - aged concrete
    context.fillStyle = '#8C8C8C';
    context.fillRect(0, 0, 256, 256);
    
    // Add some texture variation
    for (let i = 0; i < 500; i++) {
        const x = Math.random() * 256;
        const y = Math.random() * 256;
        const size = Math.random() * 3 + 1;
        const brightness = Math.random() * 40 + 180;
        context.fillStyle = `rgb(${brightness}, ${brightness}, ${brightness})`;
        context.fillRect(x, y, size, size);
    }
    
    // Add cracks
    context.strokeStyle = '#5A5A5A';
    context.lineWidth = 2;
    for (let i = 0; i < 8; i++) {
        context.beginPath();
        const startX = Math.random() * 256;
        const startY = Math.random() * 256;
        context.moveTo(startX, startY);
        
        for (let j = 0; j < 5; j++) {
            const nextX = startX + (Math.random() * 60 - 30);
            const nextY = startY + (Math.random() * 60 - 30);
            context.lineTo(nextX, nextY);
        }
        context.stroke();
    }
    
    // Add moss patches (green areas)
    context.fillStyle = 'rgba(80, 120, 60, 0.3)';
    for (let i = 0; i < 15; i++) {
        const x = Math.random() * 256;
        const y = Math.random() * 256;
        const width = Math.random() * 40 + 20;
        const height = Math.random() * 30 + 15;
        context.fillRect(x, y, width, height);
    }
    
    const texture = new THREE.CanvasTexture(canvas);
    return new THREE.MeshLambertMaterial({ map: texture });
}

function createBuildings() {
    const buildingColors = [0x5C6B73, 0x8A8C8A, 0x6E5F5F, 0x937F69]; // Various gray/brown tones
    const wallOffset = 0.2 / 2; // wallThickness / 2

    // Front buildings (facing the gate)
    createBuildingWithDetails(-15, -gridDepth / 2 - 3, 6, 7, 5, buildingColors[2]);
    createBuildingWithDetails(-10, -gridDepth / 2 - 3, 5, 8, 5, buildingColors[0]);
    createBuildingWithDetails(1, -gridDepth / 2 - 3, 4, 6, 5, buildingColors[3]);
    createBuildingWithDetails(5, -gridDepth / 2 - 3, 5, 6, 5, buildingColors[1]);

    // Back buildings
    createBuildingWithDetails(0, gridDepth / 2 + 3, 10, 7, 5, buildingColors[2]);
    createBuildingWithDetails(gridWidth / 2, gridDepth / 2 + 3, 5, 9, 5, buildingColors[3]);

    // Left side buildings
    createBuildingWithDetails(-gridWidth / 2 - 3, 0, 5, 7, 5, buildingColors[1]);
    createBuildingWithDetails(-gridWidth / 2 - 3, 10, 5, 5, 5, buildingColors[0]);
    createBuildingWithDetails(-gridWidth / 2 - 3, -10, 5, 9, 5, buildingColors[2]);
    
    // Right side buildings
    createBuildingWithDetails(gridWidth / 2 + 3, 0, 5, 8, 5, buildingColors[3]);
    createBuildingWithDetails(gridWidth / 2 + 3, 10, 5, 6, 5, buildingColors[1]);
    createBuildingWithDetails(gridWidth / 2 + 3, -10, 5, 7, 5, buildingColors[0]);
}

function createBuildingWithDetails(x, z, width, height, depth, bodyColor) {
    const buildingGroup = new THREE.Group();

    // Building body
    const bodyGeometry = new THREE.BoxGeometry(width, height, depth);
    const bodyMaterial = new THREE.MeshLambertMaterial({ color: bodyColor });
    const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
    buildingGroup.add(body);

    // Roof
    const roofHeight = width * 0.4;
    const roofGeometry = new THREE.ConeGeometry(width * 0.7, roofHeight, 4);
    const roofMaterial = new THREE.MeshLambertMaterial({ color: 0x614C3E }); // Brown roof
    const roof = new THREE.Mesh(roofGeometry, roofMaterial);
    roof.rotation.y = Math.PI / 4;
    roof.position.y = height / 2 + roofHeight / 2;
    buildingGroup.add(roof);

    // Chimney
    const chimneyHeight = height * 0.3;
    const chimneyWidth = width * 0.1;
    const chimneyDepth = depth * 0.1;
    const chimneyGeometry = new THREE.BoxGeometry(chimneyWidth, chimneyHeight, chimneyDepth);
    const chimneyMaterial = new THREE.MeshLambertMaterial({ color: 0x8B4513 }); // Brick-like brown
    const chimney = new THREE.Mesh(chimneyGeometry, chimneyMaterial);
    chimney.position.set(width * 0.2, height / 2 + chimneyHeight / 2, depth * 0.2);
    buildingGroup.add(chimney);

    // Window Materials
    const windowMaterial = new THREE.MeshLambertMaterial({ color: 0x87CEEB }); // Light blue to reflect the sky
    
    // Window with depth
    const windowWidth = width * 0.2;
    const windowHeight = height * 0.2;
    const windowDepth = 0.1;
    
    // Front windows
    const numFrontWindows = 3;
    const frontWindowSpacing = width / (numFrontWindows + 1);
    for (let i = 0; i < numFrontWindows; i++) {
        const windowY = height * 0.2;
        const window = new THREE.Mesh(new THREE.BoxGeometry(windowWidth, windowHeight, windowDepth), windowMaterial);
        window.position.set(-width / 2 + frontWindowSpacing * (i + 1), windowY, depth / 2 - windowDepth / 2);
        buildingGroup.add(window);
    }
    
    // Add a second row of windows for taller buildings
    if (height > 7) {
        const secondRowY = height * 0.6;
        for (let i = 0; i < numFrontWindows; i++) {
            const window = new THREE.Mesh(new THREE.BoxGeometry(windowWidth, windowHeight, windowDepth), windowMaterial);
            window.position.set(-width / 2 + frontWindowSpacing * (i + 1), secondRowY, depth / 2 - windowDepth / 2);
            buildingGroup.add(window);
        }
    }

    // Side windows
    const numSideWindows = 2;
    const sideWindowSpacing = depth / (numSideWindows + 1);
    for (let i = 0; i < numSideWindows; i++) {
        const window = new THREE.Mesh(new THREE.BoxGeometry(windowDepth, windowHeight, windowWidth), windowMaterial);
        window.position.set(width / 2 - windowDepth / 2, height * 0.2, -depth / 2 + sideWindowSpacing * (i + 1));
        buildingGroup.add(window);
    }

    // Door
    const doorWidth = width * 0.25;
    const doorHeight = height * 0.4;
    const doorGeometry = new THREE.BoxGeometry(doorWidth, doorHeight, 0.05);
    const doorMaterial = new THREE.MeshLambertMaterial({ color: 0x3D2B1F }); // Dark brown for door
    const door = new THREE.Mesh(doorGeometry, doorMaterial);
    door.position.set(0, doorHeight/2 - height/2, depth/2 + 0.02);
    buildingGroup.add(door);

    buildingGroup.position.set(x, height / 2, z);
    scene.add(buildingGroup);
}

function createPlayer() {
    player = new THREE.Object3D();
    scene.add(player);
    player.add(camera);
    // Player starts at a height of 0.96 (0.8 * 1.20)
    player.position.set(0.5 - gridWidth / 2 + 7, 0.96, 0.5 - gridDepth / 2 + 2);
    camera.position.set(0, 0, 0); // head height relative to player
}

// Function to create benches
function createBench(gridX, gridZ, rotationY) {
    const benchGroup = new THREE.Group();
    const benchColor = new THREE.Color(0x5E4C3D); // Dark wood color
    const benchMaterial = new THREE.MeshLambertMaterial({ color: benchColor });

    // Bench seat
    const seatGeometry = new THREE.BoxGeometry(1.5, 0.2, 0.5);
    const seat = new THREE.Mesh(seatGeometry, benchMaterial);
    seat.position.y = 0.25;
    benchGroup.add(seat);

    // Bench legs
    const legGeometry = new THREE.BoxGeometry(0.15, 0.25, 0.15);
    const leg1 = new THREE.Mesh(legGeometry, benchMaterial);
    leg1.position.set(0.6, 0.125, 0.15);
    benchGroup.add(leg1);

    const leg2 = new THREE.Mesh(legGeometry, benchMaterial);
    leg2.position.set(-0.6, 0.125, 0.15);
    benchGroup.add(leg2);
    
    const leg3 = new THREE.Mesh(legGeometry, benchMaterial);
    leg3.position.set(0.6, 0.125, -0.15);
    benchGroup.add(leg3);
    
    const leg4 = new THREE.Mesh(legGeometry, benchMaterial);
    leg4.position.set(-0.6, 0.125, -0.15);
    benchGroup.add(leg4);

    // Convert grid coordinates to world coordinates
    const worldX = 0 - gridWidth / 2 + gridX + 0.5;
    const worldZ = 0 - gridDepth / 2 + gridZ + 0.5;

    benchGroup.position.set(worldX, 0, worldZ);
    benchGroup.rotation.y = rotationY;
    scene.add(benchGroup);
}

// Add benches at the four corners of the safe zone (grid Z < 4)
function createBenches() {
    createBench(0, 0, Math.PI / 2); // Corner (0, 0)
    createBench(14, 0, -Math.PI / 2); // Corner (14, 0)
    createBench(0, 3, Math.PI / 2); // Corner (0, 3)
    createBench(14, 3, -Math.PI / 2); // Corner (14, 3)
}

// Character model creation
let handsGroup, leftArmPivot, rightArmPivot, leftLegPivot, rightLegPivot;

function createCharacterModel() {
    const scaleFactor = 1.2; // 20% increase from previous size
    
    // Main group for the entire character's body
    const bodyGroup = new THREE.Group();
    const skinMaterial = new THREE.MeshLambertMaterial({ color: 0xA96B42 });
    const clothesMaterial = new THREE.MeshLambertMaterial({ color: 0x2E4A6F }); // Blue-gray for clothing

    // Head - Invisible in first-person view
    const headSize = 0.175 * scaleFactor;
    const head = new THREE.Mesh(new THREE.BoxGeometry(headSize, headSize, headSize), skinMaterial); 
    head.position.y = 0.15 * scaleFactor; 
    head.visible = false;
    bodyGroup.add(head);

    // Torso - Invisible in first-person view
    const torsoBodyX = 0.25 * scaleFactor;
    const torsoBodyY = 0.4 * scaleFactor;
    const torsoBodyZ = 0.15 * scaleFactor;
    const body = new THREE.Mesh(new THREE.BoxGeometry(torsoBodyX, torsoBodyY, torsoBodyZ), clothesMaterial); 
    body.position.y = -0.2 * scaleFactor; 
    body.visible = false;
    bodyGroup.add(body);

    // Legs
    const legX = 0.1 * scaleFactor;
    const legY = 0.4 * scaleFactor;
    const legZ = 0.1 * scaleFactor;
    const legPivotY = -0.4 * scaleFactor;
    const legPivotX = 0.05 * scaleFactor;

    leftLegPivot = new THREE.Object3D();
    leftLegPivot.position.set(-legPivotX, legPivotY, 0); 
    const leftLeg = new THREE.Mesh(new THREE.BoxGeometry(legX, legY, legZ), clothesMaterial); 
    leftLeg.position.y = -0.2 * scaleFactor; 
    leftLegPivot.add(leftLeg);
    bodyGroup.add(leftLegPivot);

    rightLegPivot = new THREE.Object3D();
    rightLegPivot.position.set(legPivotX, legPivotY, 0); 
    const rightLeg = new THREE.Mesh(new THREE.BoxGeometry(legX, legY, legZ), clothesMaterial); 
    rightLeg.position.y = -0.2 * scaleFactor; 
    rightLegPivot.add(rightLeg);
    bodyGroup.add(rightLegPivot);
    
    // Hands
    handsGroup = new THREE.Group();
    
    const armX = 0.1 * scaleFactor;
    const armY = 0.1 * scaleFactor;
    const armZ = 0.2 * scaleFactor;
    const armPivotX = 0.2 * scaleFactor;
    const armPivotY = 0.05 * scaleFactor;
    const armMeshY = -0.15 * scaleFactor;
    const armMeshZ = -0.1 * scaleFactor;

    // Left arm
    leftArmPivot = new THREE.Object3D();
    leftArmPivot.position.set(-armPivotX, armPivotY, 0); 
    const leftArm = new THREE.Mesh(new THREE.BoxGeometry(armX, armY, armZ), skinMaterial); 
    leftArm.position.set(0, armMeshY, armMeshZ); 
    leftArmPivot.add(leftArm);
    handsGroup.add(leftArmPivot);
    
    // Right arm
    rightArmPivot = new THREE.Object3D();
    rightArmPivot.position.set(armPivotX, armPivotY, 0); 
    const rightArm = new THREE.Mesh(new THREE.BoxGeometry(armX, armY, armZ), skinMaterial); 
    rightArm.position.set(0, armMeshY, armMeshZ); 
    rightArmPivot.add(rightArm);
    handsGroup.add(rightArmPivot);

    // Position the hands relative to the body
    handsGroup.position.set(0, -0.2 * scaleFactor, -0.075 * scaleFactor);
    bodyGroup.add(handsGroup);
    
    // Add the entire body group to the player object
    player.add(bodyGroup);
}

// Create benches after scene is initialized
createBenches();
