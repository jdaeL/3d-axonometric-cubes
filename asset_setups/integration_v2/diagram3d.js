/**
 * ===== DIAGRAM3D JAVASCRIPT MODULE =====
 * Modular 3D architectural diagram system using Three.js
 * 
 * @author jdael
 * @version 1.0.0
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
            directionalLight.shadow.mapSize.width = 2048;
            directionalLight.shadow.mapSize.height = 2048;
            directionalLight.shadow.camera.near = 0.1;
            directionalLight.shadow.camera.far = 100;
            directionalLight.shadow.camera.left = -30;
            directionalLight.shadow.camera.right = 30;
            directionalLight.shadow.camera.top = 30;
            directionalLight.shadow.camera.bottom = -30;
        }
        
        this.scene.add(directionalLight);
        
        // Optional: Add fill light for better illumination
        const fillLight = new THREE.DirectionalLight(0xffffff, 0.3);
        fillLight.position.set(-10, 10, -10);
        this.scene.add(fillLight);
    }
    
    /**
     * Set camera to isometric view - ideal for architecture diagrams
     */
    setIsometricView() {
        const distance = this.options.cameraDistance;
        this.camera.position.set(
            distance * 0.7,
            distance * 0.7,
            distance * 0.7
        );
        this.camera.lookAt(-1, 0, 1);
    }
    
    /**
     * Set camera to top-down view
     */
    setTopView() {
        this.camera.position.set(-1, 25, 1);
        this.camera.lookAt(-1, 0, 1);
    }
    
    /**
     * Set camera to side view
     */
    setSideView() {
        this.camera.position.set(25, 5, 0);
        this.camera.lookAt(0, 0, 0);
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
    /**
     * Get connection point for an element
     * @param {THREE.Object3D} element - The 3D element
     * @param {string} direction - Connection direction ('input', 'output', 'center')
     * @returns {THREE.Vector3} Connection point in 3D space
     */
    static getConnectionPoint(element, direction = 'center') {
        const userData = element.userData;
        const basePoint = userData.connectionPoint;
        
        switch (userData.type) {
            case 'platform':
                return this.getPlatformConnectionPoint(basePoint, direction);
            case 'component':
                return this.getComponentConnectionPoint(basePoint, direction, userData);
            case 'node':
                return this.getNodeConnectionPoint(basePoint, direction);
            default:
                return new THREE.Vector3(basePoint.x, basePoint.y, basePoint.z);
        }
    }
    
    static getPlatformConnectionPoint(basePoint, direction) {
        const offset = 0.26; // Just above platform surface
        return new THREE.Vector3(
            basePoint.x,
            basePoint.y + offset,
            basePoint.z
        );
    }
    
    static getComponentConnectionPoint(basePoint, direction, userData) {
        let yOffset = 0;
        
        // Add offset based on component state or type
        if (userData.elevated) {
            yOffset = 0.5;
        }
        
        return new THREE.Vector3(
            basePoint.x,
            basePoint.y + yOffset,
            basePoint.z
        );
    }
    
    static getNodeConnectionPoint(basePoint, direction) {
        // Simple nodes connect at their center
        return new THREE.Vector3(
            basePoint.x,
            basePoint.y,
            basePoint.z
        );
    }
}

/**
 * Bézier Curve Generator - Creates smooth curves between connection points
 */
class BezierCurveGenerator {
    /**
     * Create a Bézier curve between two points
     * @param {THREE.Vector3} startPoint - Start position
     * @param {THREE.Vector3} endPoint - End position
     * @param {Object} options - Curve options
     * @returns {THREE.CubicBezierCurve3} Generated curve
     */
    static createCurve(startPoint, endPoint, options = {}) {
        const {
            curvature = 2.0,           // How curved the line is (lower = more curved)
            verticalOffset = 1.5,      // How high the curve peaks
            horizontalOffset = 0.3,    // Lateral curve offset
            curveType = 'smooth'       // 'smooth', 'sharp', 'architectural'
        } = options;
        
        switch (curveType) {
            case 'architectural':
                return this.createArchitecturalCurve(startPoint, endPoint, options);
            case 'sharp':
                return this.createSharpCurve(startPoint, endPoint, options);
            default:
                return this.createSmoothCurve(startPoint, endPoint, options);
        }
    }
    
    /**
     * Create smooth flowing curve - ideal for data flow
     */
    static createSmoothCurve(startPoint, endPoint, options) {
        const { curvature, verticalOffset, horizontalOffset } = options;
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
    
    /**
     * Create architectural curve - more structured, right-angled approach
     */
    static createArchitecturalCurve(startPoint, endPoint, options) {
        const { verticalOffset = 2.0 } = options;
        const midY = Math.max(startPoint.y, endPoint.y) + verticalOffset;
        
        // Create more structured control points
        const controlPoint1 = new THREE.Vector3(
            startPoint.x,
            midY,
            startPoint.z
        );
        
        const controlPoint2 = new THREE.Vector3(
            endPoint.x,
            midY,
            endPoint.z
        );
        
        return new THREE.CubicBezierCurve3(
            startPoint,
            controlPoint1,
            controlPoint2,
            endPoint
        );
    }
    
    /**
     * Create sharp curve - more angular, direct connection
     */
    static createSharpCurve(startPoint, endPoint, options) {
        const { verticalOffset = 1.0 } = options;
        const distance = startPoint.distanceTo(endPoint);
        
        const controlPoint1 = new THREE.Vector3(
            startPoint.x + (endPoint.x - startPoint.x) * 0.2,
            startPoint.y + verticalOffset,
            startPoint.z + (endPoint.z - startPoint.z) * 0.2
        );
        
        const controlPoint2 = new THREE.Vector3(
            startPoint.x + (endPoint.x - startPoint.x) * 0.8,
            endPoint.y + verticalOffset,
            startPoint.z + (endPoint.z - startPoint.z) * 0.8
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
            defaultOpacity: 0.7,
            arrowColor: 0x3b82f6,
            animationEnabled: false,
            showArrows: true,
            lineWidth: 2,
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
    
    /**
     * Add a connection between two elements
     * @param {THREE.Object3D} fromElement - Source element
     * @param {THREE.Object3D} toElement - Target element
     * @param {Object} options - Connection options
     */
    addConnection(fromElement, toElement, options = {}) {
        const fromPoint = ConnectionPointCalculator.getConnectionPoint(fromElement, 'output');
        const toPoint = ConnectionPointCalculator.getConnectionPoint(toElement, 'input');
        
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
        
        if (curveOptions.showArrows !== false) {
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
            segments = 50,
            dashed = false,
            dashSize = 0.5,
            gapSize = 0.2
        } = options;
        
        const points = curve.getPoints(segments);
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        
        const materialOptions = {
            color: color,
            opacity: opacity,
            transparent: true,
            linewidth: this.options.lineWidth
        };
        
        if (dashed) {
            materialOptions.dashSize = dashSize;
            materialOptions.gapSize = gapSize;
        }
        
        const material = dashed 
            ? new THREE.LineDashedMaterial(materialOptions)
            : new THREE.LineBasicMaterial(materialOptions);
        
        const line = new THREE.Line(geometry, material);
        
        if (dashed) {
            line.computeLineDistances();
        }
        
        line.userData = { connectionId, type: 'curve' };
        this.connectionGroup.add(line);
    }
    
    createArrow(curve, options = {}, connectionId) {
        const {
            arrowColor = this.options.arrowColor,
            arrowSize = 0.3,
            arrowPosition = 0.9
        } = options;
        
        const arrowPoint = curve.getPointAt(arrowPosition);
        const endPoint = curve.getPointAt(Math.min(arrowPosition + 0.1, 1.0));
        
        const arrowGeometry = new THREE.ConeGeometry(
            arrowSize * 0.5, 
            arrowSize, 
            8
        );
        const arrowMaterial = new THREE.MeshLambertMaterial({ 
            color: arrowColor,
            transparent: true,
            opacity: 0.8
        });
        
        const arrow = new THREE.Mesh(arrowGeometry, arrowMaterial);
        arrow.position.copy(arrowPoint);
        arrow.lookAt(endPoint);
        arrow.rotateX(Math.PI / 2);
        
        arrow.userData = { connectionId, type: 'arrow' };
        this.connectionGroup.add(arrow);
    }
    
    createAnimationParticle(curve, connectionId) {
        const particleGeometry = new THREE.SphereGeometry(0.1, 8, 8);
        const particleMaterial = new THREE.MeshLambertMaterial({
            color: 0x10b981,
            emissive: 0x059669,
            emissiveIntensity: 0.3
        });
        
        const particle = new THREE.Mesh(particleGeometry, particleMaterial);
        particle.userData = {
            connectionId,
            curve: curve,
            progress: Math.random(), // Random start position
            speed: 0.01 + Math.random() * 0.02,
            type: 'particle'
        };
        
        this.animationParticles.push(particle);
        this.animationGroup.add(particle);
    }
    
    /**
     * Remove a connection by ID
     * @param {string} connectionId - Connection ID to remove
     */
    removeConnection(connectionId) {
        // Remove visual elements
        const elementsToRemove = [];
        this.connectionGroup.traverse((child) => {
            if (child.userData.connectionId === connectionId) {
                elementsToRemove.push(child);
            }
        });
        elementsToRemove.forEach(element => this.connectionGroup.remove(element));
        
        // Remove animation particles
        const particlesToRemove = this.animationParticles.filter(
            particle => particle.userData.connectionId === connectionId
        );
        particlesToRemove.forEach(particle => {
            this.animationGroup.remove(particle);
            this.animationParticles.splice(this.animationParticles.indexOf(particle), 1);
        });
        
        // Remove from arrays
        this.connections = this.connections.filter(conn => conn.id !== connectionId);
        // Note: curves array cleanup could be added here if needed
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
            
            // Pulsing effect
            const pulse = Math.sin(particle.userData.progress * Math.PI * 4) * 0.3 + 0.7;
            particle.scale.setScalar(pulse);
        });
    }
    
    toggleAnimation() {
        this.options.animationEnabled = !this.options.animationEnabled;
        
        if (this.options.animationEnabled) {
            // Create animation particles for existing curves
            this.curves.forEach((curve, index) => {
                const connection = this.connections[index];
                if (connection) {
                    this.createAnimationParticle(curve, connection.id);
                }
            });
        } else {
            // Remove all animation particles
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

/**
 * UI Manager - Handles info cards, controls, and legends
 */
class UIManager {
    constructor(diagram) {
        this.diagram = diagram;
        this.infoCard = null;
        this.controls = null;
        this.legend = null;
        this.createUI();
    }
    
    createUI() {
        this.createInfoCard();
        if (this.diagram.options.showControls) {
            this.createControls();
        }
        if (this.diagram.options.showLegend) {
            this.createLegend();
        }
    }
    
    createInfoCard() {
        this.infoCard = document.createElement('div');
        this.infoCard.className = 'diagram-info-card';
        this.infoCard.innerHTML = `
            <div class="layer"></div>
            <div class="title"></div>
            <div class="description"></div>
        `;
        this.diagram.container.appendChild(this.infoCard);
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
        
        // Add connection info if enabled
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
    
    updateInfoCard(component, mouseEvent) {
        const layer = this.infoCard.querySelector('.layer');
        const title = this.infoCard.querySelector('.title');
        const description = this.infoCard.querySelector('.description');
        
        layer.textContent = component.userData.layer ? 
            component.userData.layer.replace(/([A-Z])/g, ' $1').trim() : '';
        title.textContent = component.userData.name || component.userData.type || 'Component';
        description.textContent = component.userData.info || 'No description available';
        
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
    
    hideInfoCard() {
        this.infoCard.classList.remove('visible');
    }
    
    dispose() {
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
        const intersects = this.raycaster.intersectObjects(this.diagram.components);
        
        if (intersects.length > 0) {
            const component = intersects[0].object;
            
            if (this.hoveredComponent !== component && component !== this.selectedComponent) {
                // Reset previous hover
                if (this.hoveredComponent && this.hoveredComponent !== this.selectedComponent) {
                    this.resetComponentState(this.hoveredComponent);
                }
                
                // Set new hover
                this.hoveredComponent = component;
                component.material = this.hoverMaterial.clone();
                
                // Smooth hover animation
                this.targetScales.set(component, new THREE.Vector3(1.15, 1.15, 1.15));
                
                // Update info card
                this.diagram.uiManager.updateInfoCard(component, event);
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
        const intersects = this.raycaster.intersectObjects(this.diagram.components);
        
        // Reset previous selection
        if (this.selectedComponent) {
            this.resetComponentState(this.selectedComponent);
        }
        
        if (intersects.length > 0) {
            const component = intersects[0].object;
            this.selectedComponent = component;
            
            // Enhanced selected state
            component.material = this.selectedMaterial.clone();
            component.material.emissiveIntensity = 0.7;
            
            // More dramatic selection animation
            this.targetScales.set(component, new THREE.Vector3(1.3, 1.8, 1.3));
            
            this.diagram.uiManager.updateInfoCard(component, event);
        } else {
            this.selectedComponent = null;
            this.diagram.uiManager.hideInfoCard();
        }
    }
    
    resetComponentState(component) {
        component.material = this.originalMaterials.get(component);
        this.targetScales.set(component, new THREE.Vector3(1, 1, 1));
    }
    
    updateAnimations() {
        const lerpFactor = 0.12;
        
        this.diagram.components.forEach(component => {
            const targetScale = this.targetScales.get(component);
            if (targetScale) {
                component.scale.lerp(targetScale, lerpFactor);
                
                // Add floating animation for selected components
                if (component === this.selectedComponent) {
                    const time = Date.now() * 0.002;
                    const originalY = component.userData.originalY || component.userData.connectionPoint.y;
                    component.position.y = originalY + Math.sin(time) * 0.1;
                    
                    // Pulsing glow effect
                    if (component.material.emissiveIntensity !== undefined) {
                        component.material.emissiveIntensity = 0.7 + Math.sin(time * 2) * 0.2;
                    }
                }
            }
        });
    }
    
    registerComponent(component) {
        this.originalMaterials.set(component, component.material);
        this.targetScales.set(component, new THREE.Vector3(1, 1, 1));
    }
    
    dispose() {
        this.diagram.container.removeEventListener('mousemove', this.onMouseMove);
        this.diagram.container.removeEventListener('click', this.onMouseClick);
    }
}

/**
 * MAIN DIAGRAM3D CLASS
 * The main orchestrator that brings all components together
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
            showControls: true,
            showLegend: true,
            showConnectionInfo: true,
            enableInteraction: true,
            animationEnabled: false,
            enableShadows: true,
            ...config.options
        };
        
        this.data = config.data || {};
        this.connections = config.connections || [];
        this.id = this.generateId();
        
        // Core components
        this.components = [];
        this.platforms = {};
        
        this.init();
    }
    
    generateId() {
        return Math.random().toString(36).substr(2, 9);
    }
    
    init() {
        // Initialize core managers
        this.sceneManager = new SceneManager(this.container, this.options);
        this.connectionManager = new ConnectionManager(this.sceneManager.scene, this.options);
        this.uiManager = new UIManager(this);
        
        if (this.options.enableInteraction) {
            this.interactionManager = new InteractionManager(this);
        }
        
        // Build the diagram
        this.createElements();
        this.createConnections();
        this.startAnimationLoop();
        
        // Make globally accessible for controls
        window[`diagram_${this.id}`] = this;
    }
    
    createElements() {
        const materials = this.createMaterials();
        
        Object.entries(this.data).forEach(([layerName, layerData]) => {
            // Create platform if specified
            if (layerData.platform) {
                const platform = this.createPlatform(layerData.platform, materials[layerName] || materials.default, layerName);
                this.platforms[layerName] = platform;
            }
            
            // Create components
            if (layerData.components) {
                layerData.components.forEach(comp => {
                    const component = this.createComponent(comp, layerName, layerData.platform !== null);
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
        const geometry = new THREE.BoxGeometry(
            platformData.width || 4, 
            platformData.height || 0.5, 
            platformData.depth || 4
        );
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
        const geometry = new THREE.BoxGeometry(size, size, size);
        
        // Choose material based on whether component has platform
        let material;
        if (hasPlataform) {
            material = new THREE.MeshLambertMaterial({ 
                color: compData.color || 0x64748b, 
                opacity: 0.9, 
                transparent: true 
            });
        } else {
            // Central cubes get special treatment
            material = new THREE.MeshLambertMaterial({ 
                color: compData.color || 0x8b5cf6, 
                opacity: 0.9, 
                transparent: true,
                emissive: 0x3b1065,
                emissiveIntensity: 0.1
            });
        }
        
        const component = new THREE.Mesh(geometry, material);
        const yPos = compData.y || (hasPlataform ? 0.75 : 0.75);
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
            connectionPoint: { 
                x: compData.x || 0, 
                y: yPos, 
                z: compData.z || 0 
            }
        };
        
        this.sceneManager.scene.add(component);
        return component;
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
    
    // Public methods for external control
    toggleConnections() {
        const isVisible = this.connectionManager.connectionGroup.visible;
        this.connectionManager.setVisible(!isVisible);
    }
    
    resetView() {
        this.sceneManager.setIsometricView();
        if (this.interactionManager) {
            if (this.interactionManager.selectedComponent) {
                this.interactionManager.resetComponentState(this.interactionManager.selectedComponent);
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
            
            // Update all animations
            this.connectionManager.updateAnimations();
            if (this.interactionManager) {
                this.interactionManager.updateAnimations();
            }
            
            // Render the scene
            this.sceneManager.render();
        };
        animate();
    }
    
    dispose() {
        // Clean up all resources
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