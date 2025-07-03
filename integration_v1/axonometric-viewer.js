/**
 * AxonometricViewer - Interactive 3D Architecture Diagram Component
 * 
 * Three.js-based component for displaying software architecture diagrams
 * in true axonometric projection with interactive hover and selection effects.
 * 
 * @version 1.0.0
 * @author jdael
 */

class AxonometricViewer {
    /**
     * Create an AxonometricViewer instance
     * @param {string} containerId - ID of DOM element to render into
     * @param {Object} config - Configuration options
     */
    constructor(containerId, config = {}) {
        this.containerId = containerId;
        this.container = document.getElementById(containerId);
        
        if (!this.container) {
            throw new Error(`Container with ID '${containerId}' not found`);
        }
        
        // Configuration with defaults
        this.config = {
            backgroundColor: config.backgroundColor || 0xf1f5f9,
            frustumSize: config.frustumSize || 16,
            architecture: config.architecture || this.getDefaultArchitecture(),
            enableControls: config.enableControls !== false,
            enableInfoCards: config.enableInfoCards !== false,
            enableInteraction: config.enableInteraction !== false,
            ...config
        };
        
        // Three.js core objects
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        
        // Architecture objects
        this.components = [];
        this.platforms = {};
        this.connectionLines = null;
        
        // Interaction state
        this.hoveredComponent = null;
        this.selectedComponent = null;
        this.raycaster = null;
        this.mouse = null;
        
        // Animation data
        this.originalMaterials = new Map();
        this.targetScales = new Map();
        this.targetPositions = new Map();
        
        // UI elements
        this.infoCard = null;
        this.controls = null;
        
        // Initialize the viewer
        this.init();
    }
    
    /**
     * Initialize the viewer
     */
    init() {
        try {
            this.createScene();
            this.createCamera();
            this.createRenderer();
            this.createLighting();
            this.createMaterials();
            this.loadArchitecture();
            this.createConnections();
            
            if (this.config.enableInteraction) {
                this.setupInteraction();
            }
            
            if (this.config.enableControls) {
                this.createUI();
            }
            
            this.animate();
            this.handleResize();
            
            console.log('AxonometricViewer initialized successfully');
        } catch (error) {
            console.error('Failed to initialize AxonometricViewer:', error);
        }
    }
    
    /**
     * Create the Three.js scene
     */
    createScene() {
        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(this.config.backgroundColor);
    }
    
    /**
     * Create the orthographic camera for axonometric projection
     */
    createCamera() {
        const aspect = this.container.clientWidth / this.container.clientHeight;
        const frustumSize = this.config.frustumSize;
        
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
    
    /**
     * Create the WebGL renderer
     */
    createRenderer() {
        this.renderer = new THREE.WebGLRenderer({ 
            antialias: true, 
            alpha: true 
        });
        
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        this.renderer.outputEncoding = THREE.sRGBEncoding;
        
        this.container.appendChild(this.renderer.domElement);
    }
    
    /**
     * Create lighting setup
     */
    createLighting() {
        // Ambient light for general illumination
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambientLight);
        
        // Directional light for shadows and depth
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(20, 20, 10);
        directionalLight.castShadow = true;
        directionalLight.shadow.mapSize.width = 2048;
        directionalLight.shadow.mapSize.height = 2048;
        directionalLight.shadow.camera.near = 0.1;
        directionalLight.shadow.camera.far = 100;
        directionalLight.shadow.camera.left = -30;
        directionalLight.shadow.camera.right = 30;
        directionalLight.shadow.camera.top = 30;
        directionalLight.shadow.camera.bottom = -30;
        this.scene.add(directionalLight);
    }
    
    /**
     * Create materials for different states and layers
     */
    createMaterials() {
        // Platform materials for different architectural layers
        this.platformMaterials = {
            userInterface: new THREE.MeshLambertMaterial({ 
                color: 0x10b981, 
                opacity: 0.8, 
                transparent: true 
            }),
            businessLogic: new THREE.MeshLambertMaterial({ 
                color: 0xf59e0b, 
                opacity: 0.8, 
                transparent: true 
            }),
            output: new THREE.MeshLambertMaterial({ 
                color: 0x8b5cf6, 
                opacity: 0.8, 
                transparent: true 
            }),
            database: new THREE.MeshLambertMaterial({ 
                color: 0x06b6d4, 
                opacity: 0.8, 
                transparent: true 
            })
        };
        
        // Component materials for different interaction states
        this.componentMaterial = new THREE.MeshLambertMaterial({ 
            color: 0x64748b,
            opacity: 0.9,
            transparent: true
        });
        
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
    
    /**
     * Get default architecture data
     * @returns {Object} Default architecture configuration
     */
    getDefaultArchitecture() {
        return {
            userInterface: {
                platform: { x: -6, z: 4, width: 8, depth: 4 },
                components: [
                    { name: "Input Tables", x: -8, z: 5, info: "Data input interface for user data entry and manipulation" },
                    { name: "Pie Chart", x: -6, z: 5, info: "Visual representation of data in circular chart format" },
                    { name: "Year Selector", x: -4, z: 5, info: "Time-based filtering component for temporal data" },
                    { name: "Bar Chart", x: -8, z: 3, info: "Comparative data visualization using rectangular bars" },
                    { name: "Donut Chart", x: -6, z: 3, info: "Circular chart with center void for additional information" }
                ]
            },
            businessLogic: {
                platform: { x: -6, z: -1, width: 6, depth: 3 },
                components: [
                    { name: "Excel Calculator", x: -7.5, z: -1, info: "Spreadsheet-based calculation engine for complex formulas" },
                    { name: "Web Calculator", x: -4.5, z: -1, info: "Browser-based calculation service for real-time processing" }
                ]
            },
            output: {
                platform: { x: 4, z: -1, width: 4, depth: 3 },
                components: [
                    { name: "Output Tables", x: 4, z: -1, info: "Processed data display in structured table format" }
                ]
            },
            database: {
                platform: { x: 4, z: -6, width: 6, depth: 3 },
                components: [
                    { name: "AirTable", x: 2, z: -6, info: "Cloud-based database with API integration capabilities" },
                    { name: "Excel", x: 6, z: -6, info: "Traditional spreadsheet storage and processing system" }
                ]
            }
        };
    }
    
    /**
     * Load architecture data and create 3D objects
     */
    loadArchitecture() {
        const architectureData = this.config.architecture;
        
        Object.entries(architectureData).forEach(([layerName, layerData]) => {
            // Create platform for each layer
            this.createPlatform(layerName, layerData.platform);
            
            // Create components for each layer
            layerData.components.forEach(comp => {
                this.createComponent(comp, layerName);
            });
        });
        
        console.log(`Loaded architecture with ${this.components.length} components`);
    }
    
    /**
     * Create a platform for an architectural layer
     * @param {string} layerName - Name of the architectural layer
     * @param {Object} platformData - Platform configuration data
     */
    createPlatform(layerName, platformData) {
        const platformGeometry = new THREE.BoxGeometry(
            platformData.width, 
            0.5, 
            platformData.depth
        );
        
        const platform = new THREE.Mesh(
            platformGeometry, 
            this.platformMaterials[layerName]
        );
        
        platform.position.set(platformData.x, -0.25, platformData.z);
        platform.receiveShadow = true;
        platform.userData = { type: 'platform', layer: layerName };
        
        this.scene.add(platform);
        this.platforms[layerName] = platform;
    }
    
    /**
     * Create a component cube
     * @param {Object} componentData - Component configuration data
     * @param {string} layerName - Name of the parent layer
     */
    createComponent(componentData, layerName) {
        const componentGeometry = new THREE.BoxGeometry(1.5, 1.5, 1.5);
        const component = new THREE.Mesh(componentGeometry, this.componentMaterial.clone());
        
        component.position.set(componentData.x, 0.75, componentData.z);
        component.castShadow = true;
        component.receiveShadow = true;
        
        // Store metadata
        component.userData = {
            type: 'component',
            name: componentData.name,
            layer: layerName,
            info: componentData.info,
            originalY: 0.75,
            originalPosition: { 
                x: componentData.x, 
                y: 0.75, 
                z: componentData.z 
            }
        };
        
        // Initialize animation data
        this.originalMaterials.set(component, component.material);
        this.targetScales.set(component, new THREE.Vector3(1, 1, 1));
        this.targetPositions.set(component, new THREE.Vector3(
            componentData.x, 
            0.75, 
            componentData.z
        ));
        
        this.components.push(component);
        this.scene.add(component);
    }
    
    /**
     * Create connection lines between components
     */
    createConnections() {
        this.connectionLines = new THREE.Group();
        this.scene.add(this.connectionLines);
        
        const lineMaterial = new THREE.LineBasicMaterial({ 
            color: 0x94a3b8, 
            opacity: 0.6, 
            transparent: true 
        });
        
        // Define architectural connections
        const connections = [
            // UI to Business Logic
            { from: [-8, 0.75, 5], to: [-7.5, 0.75, -1] },
            { from: [-6, 0.75, 5], to: [-7.5, 0.75, -1] },
            { from: [-4, 0.75, 5], to: [-4.5, 0.75, -1] },
            { from: [-8, 0.75, 3], to: [-7.5, 0.75, -1] },
            { from: [-6, 0.75, 3], to: [-4.5, 0.75, -1] },
            
            // Business Logic to Output
            { from: [-7.5, 0.75, -1], to: [4, 0.75, -1] },
            { from: [-4.5, 0.75, -1], to: [4, 0.75, -1] },
            
            // Output to Database
            { from: [4, 0.75, -1], to: [2, 0.75, -6] },
            { from: [4, 0.75, -1], to: [6, 0.75, -6] }
        ];
        
        connections.forEach(conn => {
            const geometry = new THREE.BufferGeometry().setFromPoints([
                new THREE.Vector3(...conn.from),
                new THREE.Vector3(...conn.to)
            ]);
            const line = new THREE.Line(geometry, lineMaterial);
            this.connectionLines.add(line);
        });
    }
    
    /**
     * Setup mouse interaction
     */
    setupInteraction() {
        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
        
        // Mouse move handler
        this.renderer.domElement.addEventListener('mousemove', (event) => {
            this.handleMouseMove(event);
        });
        
        // Click handler
        this.renderer.domElement.addEventListener('click', (event) => {
            this.handleMouseClick(event);
        });
    }
    
    /**
     * Handle mouse move events
     * @param {MouseEvent} event - Mouse event
     */
    handleMouseMove(event) {
        const rect = this.renderer.domElement.getBoundingClientRect();
        this.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        this.raycaster.setFromCamera(this.mouse, this.camera);
        const intersects = this.raycaster.intersectObjects(this.components);
        
        if (intersects.length > 0) {
            const component = intersects[0].object;
            if (this.hoveredComponent !== component && component !== this.selectedComponent) {
                this.setHoverState(component);
            }
        } else {
            this.clearHoverState();
        }
    }
    
    /**
     * Handle mouse click events
     * @param {MouseEvent} event - Mouse event
     */
    handleMouseClick(event) {
        if (this.hoveredComponent) {
            this.setSelectedState(this.hoveredComponent);
        } else {
            // Click on empty space - deselect
            if (this.selectedComponent) {
                this.resetComponentState(this.selectedComponent);
                this.selectedComponent = null;
                this.hideInfoCard();
            }
        }
    }
    
    /**
     * Set hover state for a component
     * @param {THREE.Mesh} component - Component to hover
     */
    setHoverState(component) {
        this.clearHoverState();
        this.hoveredComponent = component;
        component.material = this.hoverMaterial.clone();
        
        this.targetScales.set(component, new THREE.Vector3(1.15, 1.15, 1.15));
        this.targetPositions.set(component, new THREE.Vector3(
            component.userData.originalPosition.x,
            component.userData.originalY + 0.3,
            component.userData.originalPosition.z
        ));
        
        if (this.config.enableInfoCards) {
            this.showInfoCard(component);
        }
    }
    
    /**
     * Clear hover state
     */
    clearHoverState() {
        if (this.hoveredComponent && this.hoveredComponent !== this.selectedComponent) {
            this.resetComponentState(this.hoveredComponent);
            this.hideInfoCard();
        }
        this.hoveredComponent = null;
    }
    
    /**
     * Set selected state for a component
     * @param {THREE.Mesh} component - Component to select
     */
    setSelectedState(component) {
        if (this.selectedComponent) {
            this.resetComponentState(this.selectedComponent);
        }
        
        this.selectedComponent = component;
        component.material = this.selectedMaterial.clone();
        component.material.emissiveIntensity = 0.7;
        
        this.targetScales.set(component, new THREE.Vector3(1.3, 1.8, 1.3));
        this.targetPositions.set(component, new THREE.Vector3(
            component.userData.originalPosition.x,
            component.userData.originalY + 1.0,
            component.userData.originalPosition.z
        ));
        
        if (this.config.enableInfoCards) {
            this.showInfoCard(component);
        }
    }
    
    /**
     * Reset component to original state
     * @param {THREE.Mesh} component - Component to reset
     */
    resetComponentState(component) {
        component.material = this.originalMaterials.get(component);
        this.targetScales.set(component, new THREE.Vector3(1, 1, 1));
        this.targetPositions.set(component, new THREE.Vector3(
            component.userData.originalPosition.x,
            component.userData.originalY,
            component.userData.originalPosition.z
        ));
    }
    
    /**
     * Show information card for a component
     * @param {THREE.Mesh} component - Component to show info for
     */
    showInfoCard(component) {
        if (!this.infoCard) {
            this.createInfoCard();
        }
        
        this.infoCard.querySelector('.card-layer').textContent = 
            component.userData.layer.replace(/([A-Z])/g, ' $1').trim();
        this.infoCard.querySelector('.card-title').textContent = 
            component.userData.name;
        this.infoCard.querySelector('.card-description').textContent = 
            component.userData.info;
        
        this.infoCard.style.display = 'block';
        this.infoCard.classList.add('visible');
    }
    
    /**
     * Hide information card
     */
    hideInfoCard() {
        if (this.infoCard) {
            this.infoCard.classList.remove('visible');
            setTimeout(() => {
                if (this.infoCard) {
                    this.infoCard.style.display = 'none';
                }
            }, 300);
        }
    }
    
    /**
     * Create information card UI element
     */
    createInfoCard() {
        this.infoCard = document.createElement('div');
        this.infoCard.className = 'axon-info-card';
        this.infoCard.innerHTML = `
            <div class="card-layer"></div>
            <div class="card-title"></div>
            <div class="card-description"></div>
        `;
        
        this.container.style.position = 'relative';
        this.container.appendChild(this.infoCard);
    }
    
    /**
     * Create control UI elements
     */
    createUI() {
        this.controls = document.createElement('div');
        this.controls.className = 'axon-controls';
        this.controls.innerHTML = `
            <button onclick="window.viewer.setIsometricView()">Isometric</button>
            <button onclick="window.viewer.setTopView()">Top View</button>
        `;
        
        this.container.appendChild(this.controls);
    }
    
    /**
     * Set camera to isometric view
     */
    setIsometricView() {
        const distance = 22;
        this.camera.position.set(distance * 0.7, distance * 0.7, distance * 0.7);
        this.camera.lookAt(-1, 0, -1);
    }
    
    /**
     * Set camera to top view
     */
    setTopView() {
        this.camera.position.set(-1, 25, -1);
        this.camera.lookAt(-1, 0, -1);
    }
    
    /**
     * Handle window resize
     */
    handleResize() {
        const resizeHandler = () => {
            const width = this.container.clientWidth;
            const height = this.container.clientHeight;
            const aspect = width / height;
            
            this.camera.left = -this.config.frustumSize * aspect / 2;
            this.camera.right = this.config.frustumSize * aspect / 2;
            this.camera.top = this.config.frustumSize / 2;
            this.camera.bottom = -this.config.frustumSize / 2;
            this.camera.updateProjectionMatrix();
            
            this.renderer.setSize(width, height);
        };
        
        window.addEventListener('resize', resizeHandler);
    }
    
    /**
     * Animation loop
     */
    animate() {
        requestAnimationFrame(() => this.animate());
        
        const lerpFactor = 0.12;
        
        this.components.forEach(component => {
            const targetScale = this.targetScales.get(component);
            const targetPosition = this.targetPositions.get(component);
            
            if (targetScale && targetPosition) {
                component.scale.lerp(targetScale, lerpFactor);
                component.position.lerp(targetPosition, lerpFactor);
                
                // Add floating animation for selected components
                if (component === this.selectedComponent) {
                    const time = Date.now() * 0.002;
                    component.position.y = targetPosition.y + Math.sin(time) * 0.1;
                    
                    if (component.material.emissiveIntensity !== undefined) {
                        component.material.emissiveIntensity = 0.7 + Math.sin(time * 2) * 0.2;
                    }
                }
            }
        });
        
        this.renderer.render(this.scene, this.camera);
    }
    
    /**
     * Clean up resources
     */
    destroy() {
        // Remove event listeners
        window.removeEventListener('resize', this.handleResize);
        
        // Dispose Three.js resources
        this.components.forEach(component => {
            component.geometry.dispose();
            component.material.dispose();
        });
        
        Object.values(this.platforms).forEach(platform => {
            platform.geometry.dispose();
            platform.material.dispose();
        });
        
        this.renderer.dispose();
        
        // Remove DOM elements
        if (this.renderer.domElement.parentNode) {
            this.renderer.domElement.parentNode.removeChild(this.renderer.domElement);
        }
        
        if (this.infoCard && this.infoCard.parentNode) {
            this.infoCard.parentNode.removeChild(this.infoCard);
        }
        
        if (this.controls && this.controls.parentNode) {
            this.controls.parentNode.removeChild(this.controls);
        }
        
        console.log('AxonometricViewer destroyed');
    }
}

// Initialize viewer when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    try {
        window.viewer = new AxonometricViewer('architectureViewer', {
            enableControls: true,
            enableInfoCards: true,
            enableInteraction: true
        });
        
        console.log('AxonometricViewer initialized and ready');
    } catch (error) {
        console.error('Failed to initialize AxonometricViewer:', error);
    }
});