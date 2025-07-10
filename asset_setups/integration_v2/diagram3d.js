/**
 * ===== DIAGRAM3D JAVASCRIPT MODULE =====
 * Modular 3D architectural diagram system using Three.js
 * 
 * @author jdael
 * @version 2.1
 */

/**
 * Scene Manager - Handles Three.js scene initialization and core rendering
 */
class SceneManager {
    constructor(container, options = {}) {
        this.container = container;
        this.options = {
            background: 0xf1f5f9,
            frustumSize: 16,
            cameraDistance: 22,
            enableShadows: true,
            antialias: true,
            ...options
        };
        
        this.init();
    }
    
    init() {
        this.initScene();
        this.initCamera();
        this.initRenderer();
        this.initLights();
        this.bindEvents();
    }
    
    initScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(this.options.background);
    }
    
    initCamera() {
        const aspect = this.container.clientWidth / this.container.clientHeight;
        const frustumSize = this.options.frustumSize;
        
        this.camera = new THREE.OrthographicCamera(
            -frustumSize * aspect / 2,
            frustumSize * aspect / 2,
            frustumSize / 2,
            -frustumSize / 2,
            0.1,
            1000
        );
        
        this.setIsometricView();
    }
    
    initRenderer() {
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: this.options.antialias, 
            alpha: true 
        });
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        
        if (this.options.enableShadows) {
            this.renderer.shadowMap.enabled = true;
            this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        }
        
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        this.container.appendChild(this.renderer.domElement);
    }
    
    initLights() {
        // Ambient light for overall illumination
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        // Directional light for shadows and depth
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(20, 20, 10);
        
        if (this.options.enableShadows) {
            directionalLight.castShadow = true;
            directionalLight.shadow.mapSize.width = 4096;
            directionalLight.shadow.mapSize.height = 4096;
            directionalLight.shadow.camera.near = 0.1;
            directionalLight.shadow.camera.far = 100;
            directionalLight.shadow.camera.left = -50;
            directionalLight.shadow.camera.right = 50;
            directionalLight.shadow.camera.top = 50;
            directionalLight.shadow.camera.bottom = -50;
            directionalLight.shadow.bias = -0.0001;
            directionalLight.shadow.normalBias = 0.02;
        }
        
        this.scene.add(directionalLight);
        
        // Optional: Add fill light for better illumination
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
        fillLight.position.set(-10, 10, -10);
        this.scene.add(fillLight);
        
        this.initGroundPlane();
    }
    
    setIsometricView() {
        const distance = this.options.cameraDistance;
        this.camera.position.set(
            distance * 0.7,
            distance * 0.7,
            distance * 0.7
        );
        this.camera.lookAt(-1, 0, 1);
    }
    
    setTopView() {
        this.camera.position.set(-1, 25, 1);
        this.camera.lookAt(-1, 0, 1);
    }
    
    setSideView() {
        this.camera.position.set(25, 5, 0);
        this.camera.lookAt(0, 0, 0);
    }
    
    initGroundPlane() {
        if (!this.options.enableShadows) return;
        
        const groundSize = 200;
        const groundGeometry = new THREE.PlaneGeometry(groundSize, groundSize);
        
        const groundMaterial = new THREE.ShadowMaterial({
            opacity: 0.15,
            transparent: true,
            color: 0x000000
        });
        
        this.groundPlane = new THREE.Mesh(groundGeometry, groundMaterial);
        
        this.groundPlane.rotation.x = -Math.PI / 2;
        this.groundPlane.position.y = -1.5;
        
        this.groundPlane.receiveShadow = true;
        this.groundPlane.castShadow = false;
        
        this.scene.add(this.groundPlane);
    }
    
    bindEvents() {
        this.resizeHandler = () => this.onWindowResize();
        window.addEventListener('resize', this.resizeHandler);
    }
    
    onWindowResize() {
        const aspect = this.container.clientWidth / this.container.clientHeight;
        const frustumSize = this.options.frustumSize;
        
        this.camera.left = -frustumSize * aspect / 2;
        this.camera.right = frustumSize * aspect / 2;
        this.camera.top = frustumSize / 2;
        this.camera.bottom = -frustumSize / 2;
        this.camera.updateProjectionMatrix();
        
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
    }
    
    render() {
        this.renderer.render(this.scene, this.camera);
    }
    
    dispose() {
        window.removeEventListener('resize', this.resizeHandler);
        
        if (this.groundPlane) {
            this.scene.remove(this.groundPlane);
            this.groundPlane.geometry.dispose();
            this.groundPlane.material.dispose();
        }
        
        this.renderer.dispose();
        if (this.container.contains(this.renderer.domElement)) {
            this.container.removeChild(this.renderer.domElement);
        }
    }
}

/**
 * Connection Point Calculator - Determines optimal connection points for different element types
 */
class ConnectionPointCalculator {
    static getConnectionPoint(element, targetElement, direction = 'center') {
        const userData = element.userData;
        
        switch (userData.type) {
            case 'platform':
                return this.getPlatformConnectionPoint(element, targetElement, direction);
            case 'component':
                return this.getComponentConnectionPoint(element, targetElement, direction);
            case 'node':
                return this.getNodeConnectionPoint(element, targetElement, direction);
            default:
                return this.getDefaultConnectionPoint(element, targetElement);
        }
    }
    
    static getPlatformConnectionPoint(platform, targetElement, direction) {
        const platformPos = platform.position;
        const targetPos = targetElement.position;
        
        const geometry = platform.geometry;
        const width = geometry.parameters.width;
        const depth = geometry.parameters.depth;
        const height = geometry.parameters.height;
        
        const dx = targetPos.x - platformPos.x;
        const dz = targetPos.z - platformPos.z;
        
        let connectionX, connectionZ;
        
        const absX = Math.abs(dx);
        const absZ = Math.abs(dz);
        
        if (absX > absZ) {
            connectionX = platformPos.x + (dx > 0 ? width/2 : -width/2);
            connectionZ = platformPos.z + Math.max(-depth/2, Math.min(depth/2, dz));
        } else {
            connectionX = platformPos.x + Math.max(-width/2, Math.min(width/2, dx));
            connectionZ = platformPos.z + (dz > 0 ? depth/2 : -depth/2);
        }
        
        const connectionY = platformPos.y + height/2 + 0.1;
        
        return new THREE.Vector3(connectionX, connectionY, connectionZ);
    }
    
    static getComponentConnectionPoint(component, targetElement, direction) {
        const componentPos = component.position;
        const targetPos = targetElement.position;
        const userData = component.userData;
        
        // Handle database cylinder components
        if (userData.isDatabaseComponent) {
            return this.getCylinderConnectionPoint(component, targetElement);
        }
        
        // FIXED: Better connection points for standalone cubes (no platform)
        if (!userData.hasPlataform) {
            // For standalone cubes, always connect to the geometric center faces
            return this.getStandaloneCubeConnectionPoint(component, targetElement);
        }
        
        // Regular components with platform
        const size = 1.5;
        const halfSize = size / 2;
        
        const dx = targetPos.x - componentPos.x;
        const dy = targetPos.y - componentPos.y;
        const dz = targetPos.z - componentPos.z;
        
        const absX = Math.abs(dx);
        const absY = Math.abs(dy);
        const absZ = Math.abs(dz);
        
        let connectionPoint = componentPos.clone();
        
        if (absX >= absY && absX >= absZ) {
            connectionPoint.x += dx > 0 ? halfSize : -halfSize;
        } else if (absY >= absX && absY >= absZ) {
            connectionPoint.y += dy > 0 ? halfSize : -halfSize;
        } else {
            connectionPoint.z += dz > 0 ? halfSize : -halfSize;
        }
        
        return connectionPoint;
    }
    
    /**
     * Connection points for standalone cubes (no platform)
     * Ensures connections go to the exact geometric center of faces
     */
    static getStandaloneCubeConnectionPoint(cube, targetElement) {
        const cubePos = cube.position;
        const targetPos = targetElement.position;
        
        // Use geometry bounding box for precise dimensions
        cube.geometry.computeBoundingBox();
        const boundingBox = cube.geometry.boundingBox;
        
        // Get actual dimensions from the geometry (accounts for beveled edges)
        const actualWidth = boundingBox.max.x - boundingBox.min.x;
        const actualHeight = boundingBox.max.y - boundingBox.min.y;
        const actualDepth = boundingBox.max.z - boundingBox.min.z;
        
        const halfWidth = actualWidth / 2;
        const halfHeight = actualHeight / 2;
        const halfDepth = actualDepth / 2;
        
        // Calculate direction to target
        const dx = targetPos.x - cubePos.x;
        const dy = targetPos.y - cubePos.y;
        const dz = targetPos.z - cubePos.z;
        
        // Find the face that's closest to the target
        const absX = Math.abs(dx);
        const absY = Math.abs(dy);
        const absZ = Math.abs(dz);
        
        let connectionPoint = cubePos.clone();
        
        // Use actual geometry dimensions for precise face connections
        if (absX >= absY && absX >= absZ) {
            // Connect to X face (left or right side) - exact center
            connectionPoint.x += dx > 0 ? halfWidth : -halfWidth;
            connectionPoint.y = cubePos.y; // Exact center Y
            connectionPoint.z = cubePos.z; // Exact center Z
        } else if (absY >= absX && absY >= absZ) {
            // Connect to Y face (top or bottom) - exact center
            connectionPoint.y += dy > 0 ? halfHeight : -halfHeight;
            connectionPoint.x = cubePos.x; // Exact center X
            connectionPoint.z = cubePos.z; // Exact center Z
        } else {
            // Connect to Z face (front or back) - exact center
            connectionPoint.z += dz > 0 ? halfDepth : -halfDepth;
            connectionPoint.x = cubePos.x; // Exact center X
            connectionPoint.y = cubePos.y; // Exact center Y
        }
        
        return connectionPoint;
    }
    
    static getCylinderConnectionPoint(cylinder, targetElement) {
        const cylinderPos = cylinder.position;
        const targetPos = targetElement.position;
        
        const radius = 0.9;
        const height = 1.8;
        
        const dx = targetPos.x - cylinderPos.x;
        const dz = targetPos.z - cylinderPos.z;
        const dy = targetPos.y - cylinderPos.y;
        
        const horizontalDistance = Math.sqrt(dx * dx + dz * dz);
        
        let connectionPoint = cylinderPos.clone();
        
        if (Math.abs(dy) > horizontalDistance) {
            connectionPoint.y += dy > 0 ? height/2 : -height/2;
        } else {
            if (horizontalDistance > 0) {
                const normalizedX = dx / horizontalDistance;
                const normalizedZ = dz / horizontalDistance;
                
                connectionPoint.x += normalizedX * radius;
                connectionPoint.z += normalizedZ * radius;
            }
        }
        
        return connectionPoint;
    }
    
    static getNodeConnectionPoint(node, targetElement, direction) {
        return node.position.clone();
    }
    
    static getDefaultConnectionPoint(element, targetElement) {
        return element.position.clone();
    }
}

/**
 * Bézier Curve Generator - Creates smooth curves between connection points
 */
class BezierCurveGenerator {
    static createCurve(startPoint, endPoint, options = {}) {
        const {
            curvature = 1.2,
            verticalOffset = 0.5,
            horizontalOffset = 0.2,
            curveType = 'architectural'
        } = options;
        
        switch (curveType) {
            case 'smooth':
                return this.createSmoothCurve(startPoint, endPoint, options);
            case 'sharp':
                return this.createSharpCurve(startPoint, endPoint, options);
            default: // 'architectural'
                return this.createArchitecturalCurve(startPoint, endPoint, options);
        }
    }
    
    static createArchitecturalCurve(startPoint, endPoint, options) {
        const { verticalOffset = 0.8, curvature = 1.2 } = options;
        const distance = startPoint.distanceTo(endPoint);
        
        const heightDiff = Math.abs(endPoint.y - startPoint.y);
        const curveHeight = Math.max(verticalOffset, heightDiff * 0.3);
        
        const midPoint = new THREE.Vector3(
            (startPoint.x + endPoint.x) / 2,
            Math.max(startPoint.y, endPoint.y) + curveHeight,
            (startPoint.z + endPoint.z) / 2
        );
        
        const controlPoint1 = new THREE.Vector3(
            startPoint.x + (midPoint.x - startPoint.x) * 0.6,
            startPoint.y + curveHeight * 0.7,
            startPoint.z + (midPoint.z - startPoint.z) * 0.6
        );
        
        const controlPoint2 = new THREE.Vector3(
            endPoint.x + (midPoint.x - endPoint.x) * 0.6,
            endPoint.y + curveHeight * 0.7,
            endPoint.z + (midPoint.z - endPoint.z) * 0.6
        );
        
        return new THREE.CubicBezierCurve3(
            startPoint,
            controlPoint1,
            controlPoint2,
            endPoint
        );
    }
    
    static createSmoothCurve(startPoint, endPoint, options) {
        const { curvature = 1.5, verticalOffset = 0.6, horizontalOffset = 0.3 } = options;
        const distance = startPoint.distanceTo(endPoint);
        
        const controlPoint1 = this.calculateControlPoint1(startPoint, endPoint, {
            verticalOffset, horizontalOffset, distance
        });
        
        const controlPoint2 = this.calculateControlPoint2(startPoint, endPoint, {
            verticalOffset, horizontalOffset, distance
        });
        
        return new THREE.CubicBezierCurve3(
            startPoint,
            controlPoint1,
            controlPoint2,
            endPoint
        );
    }
    
    static createSharpCurve(startPoint, endPoint, options) {
        const { verticalOffset = 0.4 } = options;
        
        const controlPoint1 = new THREE.Vector3(
            startPoint.x + (endPoint.x - startPoint.x) * 0.3,
            startPoint.y + verticalOffset,
            startPoint.z + (endPoint.z - startPoint.z) * 0.3
        );
        
        const controlPoint2 = new THREE.Vector3(
            startPoint.x + (endPoint.x - startPoint.x) * 0.7,
            endPoint.y + verticalOffset,
            startPoint.z + (endPoint.z - startPoint.z) * 0.7
        );
        
        return new THREE.CubicBezierCurve3(
            startPoint,
            controlPoint1,
            controlPoint2,
            endPoint
        );
    }
    
    static calculateControlPoint1(start, end, options) {
        const { verticalOffset, horizontalOffset, distance } = options;
        const direction = new THREE.Vector3().subVectors(end, start).normalize();
        const perpendicular = new THREE.Vector3(-direction.z, 0, direction.x);
        
        return new THREE.Vector3(
            start.x + direction.x * (distance * 0.3) + perpendicular.x * horizontalOffset,
            start.y + verticalOffset,
            start.z + direction.z * (distance * 0.3) + perpendicular.z * horizontalOffset
        );
    }
    
    static calculateControlPoint2(start, end, options) {
        const { verticalOffset, horizontalOffset, distance } = options;
        const direction = new THREE.Vector3().subVectors(start, end).normalize();
        const perpendicular = new THREE.Vector3(-direction.z, 0, direction.x);
        
        return new THREE.Vector3(
            end.x + direction.x * (distance * 0.3) + perpendicular.x * horizontalOffset,
            end.y + verticalOffset,
            end.z + direction.z * (distance * 0.3) + perpendicular.z * horizontalOffset
        );
    }
}

/**
 * Connection Manager - Handles all connection logic and rendering
 */
class ConnectionManager {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.options = {
            defaultColor: 0x94a3b8,
            defaultOpacity: 0.8,
            arrowColor: 0x3b82f6,
            animationEnabled: true,
            showArrows: false,
            lineWidth: 4,
            tubeRadius: 0.08,
            useTubeGeometry: true,
            ...options
        };
        
        this.connectionGroup = new THREE.Group();
        this.animationGroup = new THREE.Group();
        this.scene.add(this.connectionGroup);
        this.scene.add(this.animationGroup);
        
        this.curves = [];
        this.animationParticles = [];
        this.connections = [];
    }
    
    addConnection(fromElement, toElement, options = {}) {
        const fromPoint = ConnectionPointCalculator.getConnectionPoint(fromElement, toElement, 'output');
        const toPoint = ConnectionPointCalculator.getConnectionPoint(toElement, fromElement, 'input');
        
        const curveOptions = { ...this.options, ...options };
        const curve = BezierCurveGenerator.createCurve(fromPoint, toPoint, curveOptions);
        
        const connection = {
            id: this.generateConnectionId(),
            fromElement,
            toElement,
            curve,
            options: curveOptions
        };
        
        this.curves.push(curve);
        this.connections.push(connection);
        
        this.createCurveVisual(curve, curveOptions, connection.id);
        
        if (curveOptions.showArrows === true) {
            this.createArrow(curve, curveOptions, connection.id);
        }
        
        if (this.options.animationEnabled) {
            this.createAnimationParticle(curve, connection.id);
        }
        
        return connection.id;
    }
    
    generateConnectionId() {
        return `connection_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    
    createCurveVisual(curve, options = {}, connectionId) {
        const {
            color = this.options.defaultColor,
            opacity = this.options.defaultOpacity,
            segments = 64,
            dashed = false,
            dashSize = 0.5,
            gapSize = 0.2,
            useTubeGeometry = this.options.useTubeGeometry,
            tubeRadius = this.options.tubeRadius
        } = options;
        
        let geometry, material, line;
        
        if (useTubeGeometry) {
            geometry = new THREE.TubeGeometry(curve, segments, tubeRadius, 8, false);
            material = new THREE.MeshLambertMaterial({
                color: color,
                opacity: opacity,
                transparent: opacity < 1,
                side: THREE.DoubleSide
            });
            line = new THREE.Mesh(geometry, material);
            line.castShadow = true;
            line.receiveShadow = true;
        } else {
            const points = curve.getPoints(segments);
            geometry = new THREE.BufferGeometry().setFromPoints(points);
            
            const materialOptions = {
                color: color,
                opacity: opacity,
                transparent: opacity < 1,
                linewidth: this.options.lineWidth
            };
            
            if (dashed) {
                materialOptions.dashSize = dashSize;
                materialOptions.gapSize = gapSize;
            }
            
            material = dashed 
                ? new THREE.LineDashedMaterial(materialOptions)
                : new THREE.LineBasicMaterial(materialOptions);
            
            line = new THREE.Line(geometry, material);
            
            if (dashed) {
                line.computeLineDistances();
            }
        }
        
        line.userData = { connectionId, type: 'curve' };
        this.connectionGroup.add(line);
    }
    
    createArrow(curve, options = {}, connectionId) {
        const {
            arrowColor = this.options.arrowColor,
            arrowSize = 0.4,
            arrowPosition = 0.95
        } = options;
        
        const arrowPoint = curve.getPointAt(arrowPosition);
        const previousPoint = curve.getPointAt(Math.max(arrowPosition - 0.05, 0));
        
        const arrowGeometry = new THREE.ConeGeometry(
            arrowSize * 0.6,
            arrowSize * 1.2,
            8
        );
        const arrowMaterial = new THREE.MeshLambertMaterial({ 
            color: arrowColor,
            transparent: true,
            opacity: 0.9
        });
        
        const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
        arrow.position.copy(arrowPoint);
        
        const direction = new THREE.Vector3().subVectors(arrowPoint, previousPoint).normalize();
        arrow.lookAt(arrowPoint.clone().add(direction));
        arrow.rotateX(Math.PI / 2);
        arrow.castShadow = true;
        
        arrow.userData = { connectionId, type: 'arrow' };
        this.connectionGroup.add(arrow);
    }
    
    createAnimationParticle(curve, connectionId) {
        const particleGeometry = new THREE.SphereGeometry(0.12, 8, 8);
        const particleMaterial = new THREE.MeshLambertMaterial({
            color: 0x10b981,
            emissive: 0x059669,
            emissiveIntensity: 0.4
        });
        
        const particle = new THREE.Mesh(particleGeometry, particleMaterial);
        particle.userData = {
            connectionId,
            curve: curve,
            progress: Math.random(),
            speed: 0.01 + Math.random() * 0.02,
            type: 'particle'
        };
        
        this.animationParticles.push(particle);
        this.animationGroup.add(particle);
    }
    
    removeConnection(connectionId) {
        const elementsToRemove = [];
        this.connectionGroup.traverse((child) => {
            if (child.userData.connectionId === connectionId) {
                elementsToRemove.push(child);
            }
        });
        elementsToRemove.forEach(element => this.connectionGroup.remove(element));
        
        const particlesToRemove = this.animationParticles.filter(
            particle => particle.userData.connectionId === connectionId
        );
        particlesToRemove.forEach(particle => {
            this.animationGroup.remove(particle);
            this.animationParticles.splice(this.animationParticles.indexOf(particle), 1);
        });
        
        this.connections = this.connections.filter(conn => conn.id !== connectionId);
    }
    
    updateAnimations() {
        if (!this.options.animationEnabled) return;
        
        this.animationParticles.forEach(particle => {
            particle.userData.progress += particle.userData.speed;
            
            if (particle.userData.progress >= 1) {
                particle.userData.progress = 0;
            }
            
            const point = particle.userData.curve.getPointAt(particle.userData.progress);
            particle.position.copy(point);
            
            const pulse = Math.sin(particle.userData.progress * Math.PI * 4) * 0.3 + 0.7;
            particle.scale.setScalar(pulse);
        });
    }
    
    toggleAnimation() {
        this.options.animationEnabled = !this.options.animationEnabled;
        
        if (this.options.animationEnabled) {
            this.curves.forEach((curve, index) => {
                const connection = this.connections[index];
                if (connection) {
                    this.createAnimationParticle(curve, connection.id);
                }
            });
        } else {
            this.animationParticles.forEach(particle => {
                this.animationGroup.remove(particle);
            });
            this.animationParticles = [];
        }
    }
    
    setVisible(visible) {
        this.connectionGroup.visible = visible;
        this.animationGroup.visible = visible;
    }
    
    clear() {
        this.connectionGroup.clear();
        this.animationGroup.clear();
        this.curves = [];
        this.animationParticles = [];
        this.connections = [];
    }
}

// Export para usar en otros archivos
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ConnectionPointCalculator, BezierCurveGenerator, ConnectionManager };
} else {
    window.ConnectionPointCalculator = ConnectionPointCalculator;
    window.BezierCurveGenerator = BezierCurveGenerator;
    window.ConnectionManager = ConnectionManager;
}

/**
 * UI Manager - Handles info cards, controls, and legends
 */
class UIManager {
    constructor(diagram) {
        this.diagram = diagram;
        this.infoCard = null;
        this.controls = null;
        this.legend = null;
        // IMPROVED: Info card timing control
        this.infoCardTimeout = null;
        this.showDelay = 300; // 300ms delay before showing
        this.hideDelay = 150; // 150ms delay before hiding
        this.createUI();
    }
    
    createUI() {
        this.createInfoCard();
        if (this.diagram.options.showControls === true) {
            this.createControls();
        }
        if (this.diagram.options.showLegend === true) {
            this.createLegend();
        }
    }
    
    createInfoCard() {
        this.infoCard = document.createElement('div');
        this.infoCard.className = 'diagram-info-card';
        this.infoCard.innerHTML = `
            <div class="glass-overlay"></div>
            <div class="card-content">
                <div class="layer"></div>
                <div class="title"></div>
                <div class="description"></div>
            </div>
        `;
        
        this.applyGlassmorphismStyles();
        this.diagram.container.appendChild(this.infoCard);
    }
    
    applyGlassmorphismStyles() {
        const styles = `
            .diagram-info-card {
                position: absolute;
                min-width: 260px;
                max-width: 340px;
                background: rgba(255, 255, 255, 0.12);
                backdrop-filter: blur(25px) saturate(200%);
                -webkit-backdrop-filter: blur(25px) saturate(200%);
                border-radius: 20px;
                border: 1.5px solid rgba(255, 255, 255, 0.25);
                padding: 0;
                overflow: hidden;
                color: #1e293b;
                font-size: 14px;
                opacity: 0;
                transform: scale(0.95) translateY(15px);
                transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                pointer-events: none;
                z-index: 100;
                box-shadow: 
                    0 25px 50px rgba(31, 38, 135, 0.2),
                    0 15px 35px rgba(31, 38, 135, 0.15),
                    0 5px 15px rgba(0, 0, 0, 0.1),
                    inset 0 1px 0 rgba(255, 255, 255, 0.2),
                    inset 0 -1px 0 rgba(255, 255, 255, 0.1);
            }

            .diagram-info-card.visible {
                opacity: 1;
                transform: scale(1) translateY(0);
            }

            .diagram-info-card .glass-overlay {
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 40%;
                background: linear-gradient(135deg, 
                    rgba(255, 255, 255, 0.3) 0%, 
                    rgba(255, 255, 255, 0.1) 50%,
                    rgba(255, 255, 255, 0.05) 100%);
                border-radius: 20px 20px 0 0;
                pointer-events: none;
            }

            .diagram-info-card .card-content {
                position: relative;
                z-index: 2;
                padding: 24px;
            }

            .diagram-info-card .title {
                font-weight: 700;
                font-size: 18px;
                margin-bottom: 10px;
                color: #0f172a;
                text-shadow: 0 2px 4px rgba(255, 255, 255, 0.8);
                letter-spacing: -0.02em;
            }

            .diagram-info-card .layer {
                font-size: 11px;
                color: #64748b;
                margin-bottom: 12px;
                text-transform: uppercase;
                letter-spacing: 1px;
                font-weight: 600;
                text-shadow: 0 1px 3px rgba(255, 255, 255, 0.6);
                opacity: 0.8;
            }

            .diagram-info-card .description {
                color: #374151;
                line-height: 1.5;
                font-size: 13px;
                text-shadow: 0 1px 2px rgba(255, 255, 255, 0.4);
                font-weight: 400;
            }
        `;
        
        let styleSheet = document.getElementById('glassmorphism-styles');
        if (!styleSheet) {
            styleSheet = document.createElement('style');
            styleSheet.id = 'glassmorphism-styles';
            styleSheet.textContent = styles;
            document.head.appendChild(styleSheet);
        }
    }
    
    createControls() {
        this.controls = document.createElement('div');
        this.controls.className = 'diagram-controls';
        
        const diagramId = this.diagram.id;
        this.controls.innerHTML = `
            <h3>Diagram Controls</h3>
            <button onclick="window.diagram_${diagramId}.sceneManager.setIsometricView()">Isometric</button>
            <button onclick="window.diagram_${diagramId}.sceneManager.setTopView()">Top View</button>
            <button onclick="window.diagram_${diagramId}.sceneManager.setSideView()">Side View</button>
            <br>
            <button onclick="window.diagram_${diagramId}.toggleConnections()" class="secondary">Toggle Connections</button>
            <br>
            <button onclick="window.diagram_${diagramId}.connectionManager.toggleAnimation()" class="accent">Animated Flow</button>
            <button onclick="window.diagram_${diagramId}.resetView()" class="danger">Reset View</button>
        `;
        this.diagram.container.appendChild(this.controls);
    }
    
    createLegend() {
        this.legend = document.createElement('div');
        this.legend.className = 'diagram-legend';
        
        const legendItems = this.diagram.options.legendItems || [];
        
        let legendHTML = '<h4>Legend</h4>';
        legendHTML += legendItems.map(item => 
            `<div class="legend-item">
                <div class="legend-color" style="background: ${item.color};"></div>
                <span class="legend-text">${item.label}</span>
            </div>`
        ).join('');
        
        if (this.diagram.options.showConnectionInfo) {
            legendHTML += `
                <div class="legend-separator">Connection Rules</div>
                <div style="font-size: 10px; color: #64748b; line-height: 1.3;">
                    • Platform → Platform<br>
                    • Platform → Central Cube<br>
                    • Central Cube → Platform
                </div>
            `;
        }
        
        this.legend.innerHTML = legendHTML;
        this.diagram.container.appendChild(this.legend);
    }
    
    /**
     * IMPROVED: Better info card timing and more concise content
     */
    showInfoCard(object, mouseEvent) {
        // Clear any existing timeout
        if (this.infoCardTimeout) {
            clearTimeout(this.infoCardTimeout);
        }
        
        // Show with delay
        this.infoCardTimeout = setTimeout(() => {
            this.updateInfoCard(object, mouseEvent);
        }, this.showDelay);
    }
    
    hideInfoCard() {
        // Clear any existing timeout
        if (this.infoCardTimeout) {
            clearTimeout(this.infoCardTimeout);
        }
        
        // Hide with delay
        this.infoCardTimeout = setTimeout(() => {
            this.infoCard.classList.remove('visible');
        }, this.hideDelay);
    }
    
    updateInfoCard(object, mouseEvent) {
        const layer = this.infoCard.querySelector('.layer');
        const title = this.infoCard.querySelector('.title');
        const description = this.infoCard.querySelector('.description');
        
        const objectData = object.userData;
        
        // Set layer text
        if (objectData.type === 'platform') {
            layer.textContent = `${objectData.layer.toUpperCase()} LAYER`;
        } else {
            layer.textContent = objectData.layer ? 
                objectData.layer.replace(/([A-Z])/g, ' $1').trim().toUpperCase() : '';
        }
        
        // Set title
        title.textContent = objectData.name || objectData.type || 'Component';
        
        // IMPROVED: More concise and precise descriptions
        if (objectData.type === 'platform') {
            description.textContent = `Foundation layer for ${objectData.layer} components`;
        } else {
            // More concise component descriptions
            let conciseInfo = objectData.info || 'Component';
            
            // Remove redundant technical details for cleaner display
            conciseInfo = conciseInfo.split('•')[0].trim(); // Take only the main description before bullet points
            
            // Add shape info more concisely
            if (objectData.isDatabaseComponent) {
                conciseInfo += ' • Database';
            } else if (!objectData.hasPlataform) {
                conciseInfo += ' • Central Hub';
            }
            
            description.textContent = conciseInfo;
        }
        
        // Position card relative to container
        const rect = this.diagram.container.getBoundingClientRect();
        const x = mouseEvent.clientX - rect.left;
        const y = mouseEvent.clientY - rect.top;
        
        const cardWidth = 320;
        const cardHeight = 120;
        
        const finalX = Math.min(x + 20, this.diagram.container.clientWidth - cardWidth);
        const finalY = Math.max(y - cardHeight/2, 20);
        
        this.infoCard.style.left = finalX + 'px';
        this.infoCard.style.top = finalY + 'px';
        this.infoCard.classList.add('visible');
    }
    
    dispose() {
        if (this.infoCardTimeout) {
            clearTimeout(this.infoCardTimeout);
        }
        if (this.infoCard) this.diagram.container.removeChild(this.infoCard);
        if (this.controls) this.diagram.container.removeChild(this.controls);
        if (this.legend) this.diagram.container.removeChild(this.legend);
    }
}

/**
 * Interaction Manager - Handles mouse events and component interactions
 */
class InteractionManager {
    constructor(diagram) {
        this.diagram = diagram;
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        this.hoveredComponent = null;
        this.selectedComponent = null;
        this.originalMaterials = new Map();
        this.targetScales = new Map();
        this.targetPositions = new Map();
        // IMPROVED: Better hover timing
        this.hoverTimeout = null;
        
        this.bindEvents();
        this.setupMaterials();
    }
    
    setupMaterials() {
        this.hoverMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x3b82f6,
            emissive: 0x1e40af,
            emissiveIntensity: 0.3,
            opacity: 1,
            transparent: false
        });
        
        this.selectedMaterial = new THREE.MeshLambertMaterial({
            color: 0x10b981,
            emissive: 0x059669,
            emissiveIntensity: 0.5,
            opacity: 1,
            transparent: false
        });
    }
    
    bindEvents() {
        this.onMouseMove = this.onMouseMove.bind(this);
        this.onMouseClick = this.onMouseClick.bind(this);
        
        this.diagram.container.addEventListener('mousemove', this.onMouseMove);
        this.diagram.container.addEventListener('click', this.onMouseClick);
    }
    
    onMouseMove(event) {
        const rect = this.diagram.container.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse, this.diagram.sceneManager.camera);
        
        const interactableObjects = [...this.diagram.components];
        Object.values(this.diagram.platforms).forEach(platform => {
            if (platform) interactableObjects.push(platform);
        });
        
        const intersects = this.raycaster.intersectObjects(interactableObjects);
        
        if (intersects.length > 0) {
            const object = intersects[0].object;
            
            if (this.hoveredComponent !== object && object !== this.selectedComponent) {
                // Reset previous hover
                if (this.hoveredComponent && this.hoveredComponent !== this.selectedComponent) {
                    this.resetComponentState(this.hoveredComponent);
                }
                
                // Set new hover
                this.hoveredComponent = object;
                object.material = this.hoverMaterial.clone();
                
                this.targetScales.set(object, new THREE.Vector3(1.15, 1.15, 1.15));
                
                // IMPROVED: Use delayed info card display
                this.diagram.uiManager.showInfoCard(object, event);
            }
        } else {
            if (this.hoveredComponent && this.hoveredComponent !== this.selectedComponent) {
                this.resetComponentState(this.hoveredComponent);
                this.hoveredComponent = null;
                this.diagram.uiManager.hideInfoCard();
            }
        }
    }
    
    onMouseClick(event) {
        const rect = this.diagram.container.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse, this.diagram.sceneManager.camera);
        
        const interactableObjects = [...this.diagram.components];
        Object.values(this.diagram.platforms).forEach(platform => {
            if (platform) interactableObjects.push(platform);
        });
        
        const intersects = this.raycaster.intersectObjects(interactableObjects);
        
        // Reset previous selection
        if (this.selectedComponent) {
            this.resetComponentState(this.selectedComponent);
            // IMPROVED: Reset platform components when deselecting platform
            if (this.selectedComponent.userData.type === 'platform') {
                this.resetPlatformComponents(this.selectedComponent);
            }
        }
        
        if (intersects.length > 0) {
            const object = intersects[0].object;
            this.selectedComponent = object;
            
            object.material = this.selectedMaterial.clone();
            object.material.emissiveIntensity = 0.7;
            
            // IMPROVED: Platform floating animation with components
            if (object.userData.type === 'platform') {
                this.animatePlatformWithComponents(object);
            } else {
                const scaleMultiplier = object.userData.type === 'platform' ? 1.1 : 1.3;
                const yMultiplier = object.userData.type === 'platform' ? 1.05 : 1.8;
                this.targetScales.set(object, new THREE.Vector3(scaleMultiplier, yMultiplier, scaleMultiplier));
            }
            
            this.diagram.uiManager.showInfoCard(object, event);
        } else {
            this.selectedComponent = null;
            this.diagram.uiManager.hideInfoCard();
        }
    }
    
    /**
     * IMPROVED: Animate platform with its components floating together
     */
    animatePlatformWithComponents(platform) {
        const platformLayer = platform.userData.layer;
        
        // Animate the platform itself
        this.targetScales.set(platform, new THREE.Vector3(1.1, 1.1, 1.1));
        
        // Find and animate all components on this platform
        const platformComponents = this.diagram.components.filter(component => 
            component.userData.layer === platformLayer && component.userData.hasPlataform
        );
        
        platformComponents.forEach(component => {
            // Give each component a subtle floating animation
            this.targetScales.set(component, new THREE.Vector3(1.1, 1.1, 1.1));
            
            // Store original position for floating
            if (!component.userData.originalPosition) {
                component.userData.originalPosition = component.position.clone();
            }
        });
        
        // Store platform original position for floating
        if (!platform.userData.originalPosition) {
            platform.userData.originalPosition = platform.position.clone();
        }
    }
    
    resetPlatformComponents(platform) {
        const platformLayer = platform.userData.layer;
        
        // Reset all components on this platform
        const platformComponents = this.diagram.components.filter(component => 
            component.userData.layer === platformLayer && component.userData.hasPlataform
        );
        
        platformComponents.forEach(component => {
            this.resetComponentState(component);
        });
    }
    
    updateAnimations() {
        const lerpFactor = 0.12;
        
        const allObjects = [...this.diagram.components];
        Object.values(this.diagram.platforms).forEach(platform => {
            if (platform) allObjects.push(platform);
        });
        
        allObjects.forEach(object => {
            const targetScale = this.targetScales.get(object);
            if (targetScale) {
                object.scale.lerp(targetScale, lerpFactor);
                
                // IMPROVED: Better floating animation for platform and its components
                if (object === this.selectedComponent || 
                    (this.selectedComponent && this.selectedComponent.userData.type === 'platform' && 
                     object.userData.layer === this.selectedComponent.userData.layer && 
                     object.userData.hasPlataform)) {
                    
                    const time = Date.now() * 0.002;
                    const originalPos = object.userData.originalPosition || object.position;
                    
                    // More pronounced floating for selected elements
                    const floatAmount = object.userData.type === 'platform' ? 0.08 : 0.12;
                    const floatSpeed = object.userData.type === 'platform' ? 1 : 1.2;
                    
                    object.position.y = originalPos.y + Math.sin(time * floatSpeed) * floatAmount;
                    
                    // Pulsing glow effect
                    if (object.material.emissiveIntensity !== undefined) {
                        object.material.emissiveIntensity = 0.7 + Math.sin(time * 2) * 0.2;
                    }
                }
            }
        });
    }
    
    resetComponentState(object) {
        const originalMaterial = this.originalMaterials.get(object);
        if (originalMaterial) {
            object.material = originalMaterial;
        }
        
        this.targetScales.set(object, new THREE.Vector3(1, 1, 1));
        
        // Reset position to original
        if (object.userData.originalPosition) {
            object.position.copy(object.userData.originalPosition);
        } else {
            // Fallback to stored original Y position
            const originalY = object.userData.originalY;
            if (originalY !== undefined) {
                object.position.y = originalY;
            }
        }
    }
    
    registerComponent(object) {
        this.originalMaterials.set(object, object.material);
        this.targetScales.set(object, new THREE.Vector3(1, 1, 1));
        
        // Store original position for floating animations
        object.userData.originalPosition = object.position.clone();
    }
    
    registerPlatform(platform) {
        this.registerComponent(platform);
    }
    
    dispose() {
        if (this.hoverTimeout) {
            clearTimeout(this.hoverTimeout);
        }
        this.diagram.container.removeEventListener('mousemove', this.onMouseMove);
        this.diagram.container.removeEventListener('click', this.onMouseClick);
    }
}

/**
 * MAIN DIAGRAM3D CLASS
 */
class Diagram3D {
    constructor(config) {
        this.container = typeof config.container === 'string' 
            ? document.querySelector(config.container) 
            : config.container;
            
        if (!this.container) {
            throw new Error('Container not found');
        }
        
        this.options = {
            showControls: false,
            showLegend: false,
            showConnectionInfo: false,
            enableInteraction: true,
            animationEnabled: true,
            enableShadows: true,
            showArrows: false,
            ...config.options
        };
        
        this.data = config.data || {};
        this.connections = config.connections || [];
        this.id = this.generateId();
        
        this.components = [];
        this.platforms = {};
        
        this.init();
    }
    
    generateId() {
        return Math.random().toString(36).substr(2, 9);
    }
    
    init() {
        this.sceneManager = new SceneManager(this.container, this.options);
        this.connectionManager = new ConnectionManager(this.sceneManager.scene, this.options);
        this.uiManager = new UIManager(this);
        
        if (this.options.enableInteraction) {
            this.interactionManager = new InteractionManager(this);
        }
        
        this.createElements();
        this.createConnections();
        this.startAnimationLoop();
        
        window[`diagram_${this.id}`] = this;
    }
    
    createElements() {
        const materials = this.createMaterials();
        
        Object.entries(this.data).forEach(([layerName, layerData]) => {
            if (layerData.platform !== null && layerData.platform !== undefined) {
                const platform = this.createPlatform(layerData.platform, materials[layerName] || materials.default, layerName);
                this.platforms[layerName] = platform;
                
                if (this.interactionManager) {
                    this.interactionManager.registerPlatform(platform);
                }
            }
            
            if (layerData.components) {
                layerData.components.forEach(comp => {
                    const hasPlataform = (layerData.platform !== null && layerData.platform !== undefined);
                    const component = this.createComponent(comp, layerName, hasPlataform);
                    this.components.push(component);
                    
                    if (this.interactionManager) {
                        this.interactionManager.registerComponent(component);
                    }
                });
            }
        });
    }
    
    createMaterials() {
        return {
            userInterface: new THREE.MeshLambertMaterial({ color: 0x10b981, opacity: 0.8, transparent: true }),
            businessLogic: new THREE.MeshLambertMaterial({ color: 0xf59e0b, opacity: 0.8, transparent: true }),
            output: new THREE.MeshLambertMaterial({ color: 0x8b5cf6, opacity: 0.8, transparent: true }),
            database: new THREE.MeshLambertMaterial({ color: 0x06b6d4, opacity: 0.8, transparent: true }),
            frontend: new THREE.MeshLambertMaterial({ color: 0x3b82f6, opacity: 0.8, transparent: true }),
            backend: new THREE.MeshLambertMaterial({ color: 0x10b981, opacity: 0.8, transparent: true }),
            services: new THREE.MeshLambertMaterial({ color: 0x8b5cf6, opacity: 0.8, transparent: true }),
            default: new THREE.MeshLambertMaterial({ color: 0x64748b, opacity: 0.8, transparent: true })
        };
    }
    
    createPlatform(platformData, material, layerName) {
        const width = platformData.width || 4;
        const height = platformData.height || 0.5;
        const depth = platformData.depth || 4;
        
        const geometry = new THREE.BoxGeometry(width, height, depth);
        const platform = new THREE.Mesh(geometry, material);
        
        platform.position.set(
            platformData.x || 0, 
            platformData.y || -0.25, 
            platformData.z || 0
        );
        platform.receiveShadow = true;
        platform.userData = {
            type: 'platform',
            layer: layerName,
            name: `${layerName.charAt(0).toUpperCase() + layerName.slice(1)} Platform`,
            info: `Foundation layer for ${layerName} components`,
            connectionPoint: { 
                x: platformData.x || 0, 
                y: platformData.y || 0, 
                z: platformData.z || 0 
            }
        };
        this.sceneManager.scene.add(platform);
        return platform;
    }
    
    createComponent(compData, layerName, hasPlataform) {
        const size = compData.size || 1.5;
        
        let geometry;
        const isDatabaseComponent = this.isDatabaseComponent(compData.name);
        
        if (isDatabaseComponent) {
            geometry = new THREE.CylinderGeometry(
                size * 0.6,        
                size * 0.6,        
                size * 1.2,        
                16,                
                1                  
            );
        } else {
            const shape = new THREE.Shape();
            const halfSize = size / 2;
            
            const radius = 0.1;
            shape.moveTo(-halfSize + radius, -halfSize);
            shape.lineTo(halfSize - radius, -halfSize);
            shape.quadraticCurveTo(halfSize, -halfSize, halfSize, -halfSize + radius);
            shape.lineTo(halfSize, halfSize - radius);
            shape.quadraticCurveTo(halfSize, halfSize, halfSize - radius, halfSize);
            shape.lineTo(-halfSize + radius, halfSize);
            shape.quadraticCurveTo(-halfSize, halfSize, -halfSize, halfSize - radius);
            shape.lineTo(-halfSize, -halfSize + radius);
            shape.quadraticCurveTo(-halfSize, -halfSize, -halfSize + radius, -halfSize);
            
            const extrudeSettings = {
                depth: size,
                bevelEnabled: true,
                bevelSegments: 8,
                steps: 1,
                bevelSize: 0.08,
                bevelThickness: 0.05
            };
            
            geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
            
            // Center the extruded geometry to ensure proper connection points
            geometry.center();
        }
        
        let material;
        if (hasPlataform) {
            material = new THREE.MeshLambertMaterial({ 
                color: compData.color || 0x64748b, 
                opacity: 0.9, 
                transparent: true 
            });
        } else {
            material = new THREE.MeshLambertMaterial({ 
                color: compData.color || 0x8b5cf6, 
                opacity: 0.9, 
                transparent: true,
                emissive: 0x3b1065,
                emissiveIntensity: 0.1
            });
        }
        
        const component = new THREE.Mesh(geometry, material);
        
        // IMPROVED: More precise positioning on platforms
        let yPos;
        if (hasPlataform) {
            // Position exactly on top of platform surface
            const platformData = this.data[layerName].platform;
            const platformHeight = platformData.height || 0.5;
            const platformY = platformData.y || -0.25;
            yPos = platformY + (platformHeight / 2) + (size / 2) + 0.05; // Small gap above platform
        } else {
            yPos = compData.y || 0.75; // Standalone cubes
        }
        
        component.position.set(compData.x || 0, yPos, compData.z || 0);
        component.castShadow = true;
        component.receiveShadow = true;
        
        component.userData = {
            type: 'component',
            name: compData.name || 'Unnamed Component',
            layer: layerName,
            info: compData.info || 'No information available',
            hasPlataform: hasPlataform,
            originalY: yPos,
            isDatabaseComponent: isDatabaseComponent,
            connectionPoint: { 
                x: compData.x || 0, 
                y: yPos, 
                z: compData.z || 0 
            }
        };
        
        this.sceneManager.scene.add(component);
        return component;
    }
    
    isDatabaseComponent(componentName) {
        const databaseKeywords = ['airtable', 'excel', 'database', 'db', 'storage', 'data'];
        const name = (componentName || '').toLowerCase();
        
        if (name.includes('airtable') || name.includes('excel')) {
            return true;
        }
        
        return databaseKeywords.some(keyword => name.includes(keyword));
    }
    
    createConnections() {
        this.connections.forEach(conn => {
            const fromElement = this.findElement(conn.from);
            const toElement = this.findElement(conn.to);
            
            if (fromElement && toElement) {
                this.connectionManager.addConnection(fromElement, toElement, conn.options || {});
            } else {
                console.warn('Connection element not found:', conn);
            }
        });
    }
    
    findElement(identifier) {
        if (identifier.type === 'platform') {
            return this.platforms[identifier.layer];
        } else if (identifier.type === 'component') {
            return this.components.find(c => 
                c.userData.name === identifier.name || 
                (identifier.layer && c.userData.layer === identifier.layer)
            );
        }
        return null;
    }
    
    toggleConnections() {
        const isVisible = this.connectionManager.connectionGroup.visible;
        this.connectionManager.setVisible(!isVisible);
    }
    
    resetView() {
        this.sceneManager.setIsometricView();
        if (this.interactionManager) {
            if (this.interactionManager.selectedComponent) {
                this.interactionManager.resetComponentState(this.interactionManager.selectedComponent);
                if (this.interactionManager.selectedComponent.userData.type === 'platform') {
                    this.interactionManager.resetPlatformComponents(this.interactionManager.selectedComponent);
                }
                this.interactionManager.selectedComponent = null;
            }
            this.uiManager.hideInfoCard();
        }
    }
    
    addNewConnection(fromId, toId, options = {}) {
        const fromElement = this.findElementById(fromId);
        const toElement = this.findElementById(toId);
        
        if (fromElement && toElement) {
            return this.connectionManager.addConnection(fromElement, toElement, options);
        }
        return null;
    }
    
    removeConnection(connectionId) {
        this.connectionManager.removeConnection(connectionId);
    }
    
    startAnimationLoop() {
        const animate = () => {
            requestAnimationFrame(animate);
            
            this.connectionManager.updateAnimations();
            if (this.interactionManager) {
                this.interactionManager.updateAnimations();
            }
            
            this.sceneManager.render();
        };
        animate();
    }
    
    dispose() {
        this.sceneManager.dispose();
        if (this.interactionManager) {
            this.interactionManager.dispose();
        }
        this.uiManager.dispose();
        delete window[`diagram_${this.id}`];
    }
}

// Export for use in other files
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { Diagram3D, SceneManager, ConnectionManager, BezierCurveGenerator };
} else {
    window.Diagram3D = Diagram3D;
}