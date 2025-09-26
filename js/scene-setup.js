// Global variables
let scene, camera, renderer, player;
let gridWidth = 15, gridDepth = 20;
let targetDropPosition;

function initScene() {
    // Scene setup
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
    renderer = new THREE.WebGLRenderer({antialias:true});
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);
    
    // Set a light blue background color for a daytime sky
    scene.background = new THREE.Color(0x87CEEB);

    // Lighting
    const directionalLight = new THREE.DirectionalLight(0xFFFFFF, 1.0);
    directionalLight.position.set(5, 10, 5);
    scene.add(directionalLight);

    const ambientLight = new THREE.AmbientLight(0xAAAAAA);
    scene.add(ambientLight);

    createGround();
    createWalls();
    createBuildings();
    createPlayer();
}

function createGround() {
    // Grid
    const gridGeometry = new THREE.BufferGeometry();
    const gridVertices = [];
    const gridDivisionsX = 15;
    const gridDivisionsZ = 20;
    const gridColor = 0x6B8E23;

    for (let i = 0; i <= gridDivisionsZ; i++) {
        const z = -gridDepth / 2 + (i / gridDivisionsZ) * gridDepth;
        gridVertices.push(-gridWidth / 2, 0, z);
        gridVertices.push(gridWidth / 2, 0, z);
    }
    for (let i = 0; i <= gridDivisionsX; i++) {
        const x = -gridWidth / 2 + (i / gridDivisionsX) * gridWidth;
        gridVertices.push(x, 0, -gridDepth / 2);
        gridVertices.push(x, 0, gridDepth / 2);
    }

    gridGeometry.setAttribute('position', new THREE.Float32BufferAttribute(gridVertices, 3));
    const gridMaterial = new THREE.LineBasicMaterial({ color: gridColor });
    const grid = new THREE.LineSegments(gridGeometry, gridMaterial);
    scene.add(grid);

    // Ground plane
    const groundGeometry = new THREE.PlaneGeometry(gridWidth, gridDepth);
    const groundMaterial = new THREE.MeshLambertMaterial({ 
        color: 0x556B2F,
        side: THREE.DoubleSide
    });
    const ground = new THREE.Mesh(groundGeometry, groundMaterial);
    ground.rotation.x = Math.PI / 2;
    ground.name = "Ground";
    scene.add(ground);

    createBoundaryLine();
    createTargetCircle();
}

function createBoundaryLine() {
    const lineGeometry = new THREE.BufferGeometry();
    const linePoints = [];
    
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
    const circleCenterGridX = 7;
    const circleCenterGridZ = 14;
    const circleRadius = 1.5;
    const segments = 64;

    const circleWorldX = 0 - gridWidth / 2 + circleCenterGridX + 0.5;
    const circleWorldZ = 0 - gridDepth / 2 + circleCenterGridZ + 0.5;
    
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

    // Wall creation code (similar to original)
    // ... (include wall creation logic from original)
}

function createWeatheredWallMaterial() {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const context = canvas.getContext('2d');
    
    context.fillStyle = '#8C8C8C';
    context.fillRect(0, 0, 256, 256);
    
    for (let i = 0; i < 500; i++) {
        const x = Math.random() * 256;
        const y = Math.random() * 256;
        const size = Math.random() * 3 + 1;
        const brightness = Math.random() * 40 + 180;
        context.fillStyle = `rgb(${brightness}, ${brightness}, ${brightness})`;
        context.fillRect(x, y, size, size);
    }
    
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
    // Building creation code (similar to original)
    // ... (include building creation logic from original)
}

function createPlayer() {
    player = new THREE.Object3D();
    scene.add(player);
    player.add(camera);
    player.position.set(0.5 - gridWidth / 2 + 7, 0.96, 0.5 - gridDepth / 2 + 2);
    camera.position.set(0, 0, 0);
}
