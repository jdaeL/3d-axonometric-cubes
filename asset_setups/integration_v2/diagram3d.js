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
        
        // Device detection
        this.deviceInfo = this.detectDevice();
        this.responsiveSettings = this.calculateResponsiveSettings();
        
        this.options = {
            background: 0xf1f5f9,
            frustumSize: this.responsiveSettings.frustumSize,
            cameraDistance: this.responsiveSettings.cameraDistance,
            enableShadows: this.responsiveSettings.enableShadows,
            antialias: this.responsiveSettings.antialias,
            mouseResponsive: this.responsiveSettings.mouseResponsive,
            mouseInfluence: this.responsiveSettings.mouseInfluence,
            mouseDamping: 0.05,
            ...options
        };
        
        // Camera transition system
        this.cameraTransition = {
            isAnimating: false,
            duration: this.responsiveSettings.animationDuration,
            startTime: 0,
            startPosition: new THREE.Vector3(),
            targetPosition: new THREE.Vector3(),
            startTarget: new THREE.Vector3(),
            targetTarget: new THREE.Vector3()
        };
        
        // Mouse-responsive camera system
        this.mouseCamera = {
            mouse: new THREE.Vector2(),
            targetOffset: new THREE.Vector3(),
            currentOffset: new THREE.Vector3(),
            basePosition: new THREE.Vector3(),
            baseTarget: new THREE.Vector3(),
            isEnabled: this.options.mouseResponsive
        };
        
        // Resize system
        this.lastResize = 0;
        this.resizeDebounceTime = 150;
        
        this.init();
    }
    
    /**
     * Detect device type and capabilities
     */
    detectDevice() {
        const userAgent = navigator.userAgent;
        const isTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
        const pixelRatio = window.devicePixelRatio || 1;
        
        const device = {
            isMobile: /iPhone|iPad|iPod|Android|BlackBerry|IEMobile|Opera Mini/i.test(userAgent),
            isTablet: /iPad|Android(?!.*Mobile)/i.test(userAgent) && window.innerWidth >= 768,
            isDesktop: !(/iPhone|iPad|iPod|Android|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)),
            hasTouch: isTouch,
            pixelRatio: pixelRatio,
            screenWidth: window.innerWidth,
            screenHeight: window.innerHeight,
            orientation: window.innerHeight > window.innerWidth ? 'portrait' : 'landscape'
        };
        
        // detection
        if (device.screenWidth <= 480) {
            device.size = 'small-mobile';
        } else if (device.screenWidth <= 768) {
            device.size = 'mobile';
        } else if (device.screenWidth <= 1024) {
            device.size = 'tablet';
        } else if (device.screenWidth <= 1440) {
            device.size = 'desktop';
        } else {
            device.size = 'large-desktop';
        }
        
        return device;
    }
    
    /**
     * Calculate settings based on device
     */
    calculateResponsiveSettings() {
        const device = this.deviceInfo;
        const aspectRatio = device.screenWidth / device.screenHeight;
        
        let settings = {
            frustumSize: 16,
            cameraDistance: 22,
            enableShadows: true,
            antialias: true,
            mouseResponsive: true,
            mouseInfluence: 0.15,
            animationDuration: 1200,
            particleQuality: 'high'
        };
        
        // Device-specific optimizations
        switch (device.size) {
            case 'small-mobile':
                settings = {
                    ...settings,
                    frustumSize: device.orientation === 'portrait' ? 20 : 18,
                    cameraDistance: device.orientation === 'portrait' ? 26 : 24,
                    enableShadows: false, // Performance optimization
                    antialias: device.pixelRatio <= 2,
                    mouseResponsive: false, // Use touch instead
                    animationDuration: 800, // Faster animations
                    particleQuality: 'low'
                };
                break;
                
            case 'mobile':
                settings = {
                    ...settings,
                    frustumSize: device.orientation === 'portrait' ? 18 : 16,
                    cameraDistance: device.orientation === 'portrait' ? 24 : 22,
                    enableShadows: device.pixelRatio <= 2,
                    mouseResponsive: false, // Use touch instead
                    animationDuration: 1000,
                    particleQuality: 'medium'
                };
                break;
                
            case 'tablet':
                settings = {
                    ...settings,
                    frustumSize: 16,
                    cameraDistance: 22,
                    mouseInfluence: 0.12,
                    particleQuality: 'high'
                };
                break;
                
            case 'desktop':
                // Use default settings
                break;
                
            case 'large-desktop':
                settings = {
                    ...settings,
                    frustumSize: 18,
                    cameraDistance: 25,
                    mouseInfluence: 0.18,
                    particleQuality: 'ultra'
                };
                break;
        }
        
        // Adjust for extreme aspect ratios
        if (aspectRatio < 0.6) { // Very tall screens
            settings.frustumSize *= 1.3;
            settings.cameraDistance *= 1.2;
        } else if (aspectRatio > 2.5) { // Very wide screens
            settings.frustumSize *= 0.9;
            settings.cameraDistance *= 0.95;
        }
        
        return settings;
    }
    
    /**
     * Camera positioning based on device and orientation
     */
    getResponsiveCameraPosition(baseDistance, baseTarget) {
        const device = this.deviceInfo;
        let distance = baseDistance;
        let target = baseTarget.clone();
        
        // Adjust for mobile portrait mode
        if (device.size === 'small-mobile' && device.orientation === 'portrait') {
            distance *= 1.4; // Pull back further
            target.y -= 1; // Lower the view point
        } else if (device.isMobile && device.orientation === 'portrait') {
            distance *= 1.2;
            target.y -= 0.5;
        }
        
        // Adjust for tablet landscape
        if (device.isTablet && device.orientation === 'landscape') {
            distance *= 0.95;
        }
        
        return { distance, target };
    }
    
    init() {
        this.initScene();
        this.initCamera();
        this.initRenderer();
        this.initLights();
        this.bindEvents();
        
        // Initialize mouse-responsive camera base positions
        this.updateBaseCameraPositions();
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
        // Enhanced ambient light for better material visibility
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        this.scene.add(ambientLight);
        
        // Primary directional light for shadows and depth
        const directionalLight = new THREE.DirectionalLight(0xffffff, 1.0);
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
        
        // Enhanced fill light for better material highlighting
        const fillLight = new THREE.DirectionalLight(0x64b5f6, 0.4);
        fillLight.position.set(-10, 10, -10);
        this.scene.add(fillLight);
        
        // Add point light for enhanced specular highlights
        const pointLight = new THREE.PointLight(0xffffff, 0.6, 100);
        pointLight.position.set(0, 15, 0);
        this.scene.add(pointLight);
        
        // Add subtle rim light for depth
        const rimLight = new THREE.DirectionalLight(0x81c784, 0.3);
        rimLight.position.set(-5, 5, 15);
        this.scene.add(rimLight);
        
        this.initGroundPlane();
    }
    
    setIsometricView(animated = true) {
        const baseDistance = this.responsiveSettings.cameraDistance;
        const baseTarget = new THREE.Vector3(-1, 0, 1);
        const responsive = this.getResponsiveCameraPosition(baseDistance, baseTarget);
        
        const targetPos = new THREE.Vector3(
            responsive.distance * 0.7,
            responsive.distance * 0.7,
            responsive.distance * 0.7
        );
        
        if (animated) {
            this.animateCameraTo(targetPos, responsive.target);
        } else {
            this.camera.position.copy(targetPos);
            this.camera.lookAt(responsive.target);
            this.updateBaseCameraPositions();
        }
    }
    
    setTopView(animated = true) {
        const baseDistance = this.responsiveSettings.cameraDistance;
        const baseTarget = new THREE.Vector3(-1, 0, 1);
        const responsive = this.getResponsiveCameraPosition(baseDistance, baseTarget);
        
        const targetPos = new THREE.Vector3(-1, responsive.distance * 1.2, 1);
        
        if (animated) {
            this.animateCameraTo(targetPos, responsive.target);
        } else {
            this.camera.position.copy(targetPos);
            this.camera.lookAt(responsive.target);
            this.updateBaseCameraPositions();
        }
    }
    
    setSideView(animated = true) {
        const baseDistance = this.responsiveSettings.cameraDistance;
        const baseTarget = new THREE.Vector3(0, 0, 0);
        const responsive = this.getResponsiveCameraPosition(baseDistance, baseTarget);
        
        const targetPos = new THREE.Vector3(responsive.distance * 1.2, 5, 0);
        
        if (animated) {
            this.animateCameraTo(targetPos, responsive.target);
        } else {
            this.camera.position.copy(targetPos);
            this.camera.lookAt(responsive.target);
            this.updateBaseCameraPositions();
        }
    }
    
    /**
     * Enhanced smooth camera animation system with mouse-responsive integration
     */
    animateCameraTo(targetPosition, targetLookAt) {
        if (this.cameraTransition.isAnimating) return;
        
        this.cameraTransition.isAnimating = true;
        this.cameraTransition.startTime = performance.now();
        this.cameraTransition.startPosition.copy(this.camera.position);
        this.cameraTransition.targetPosition.copy(targetPosition);
        
        // Calculate current lookAt
        const currentLookAt = new THREE.Vector3();
        this.camera.getWorldDirection(currentLookAt);
        currentLookAt.multiplyScalar(10).add(this.camera.position);
        
        this.cameraTransition.startTarget.copy(currentLookAt);
        this.cameraTransition.targetTarget.copy(targetLookAt);
    }
    
    /**
     * Enhanced camera animation with mouse-responsive integration
     */
    updateCameraAnimation() {
        if (!this.cameraTransition.isAnimating) return;
        
        const elapsed = performance.now() - this.cameraTransition.startTime;
        const progress = Math.min(elapsed / this.cameraTransition.duration, 1);
        
        // Smooth easing function (easeInOutCubic)
        const eased = progress < 0.5 
            ? 4 * progress * progress * progress 
            : 1 - Math.pow(-2 * progress + 2, 3) / 2;
        
        // Interpolate position
        this.camera.position.lerpVectors(
            this.cameraTransition.startPosition,
            this.cameraTransition.targetPosition,
            eased
        );
        
        // Interpolate lookAt target
        const currentTarget = new THREE.Vector3().lerpVectors(
            this.cameraTransition.startTarget,
            this.cameraTransition.targetTarget,
            eased
        );
        
        this.camera.lookAt(currentTarget);
        
        // End animation and update base positions
        if (progress >= 1) {
            this.cameraTransition.isAnimating = false;
            this.updateBaseCameraPositions();
        }
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
        this.mouseMoveHandler = (event) => this.onMouseMove(event);
        this.mouseLeaveHandler = () => this.onMouseLeave();
        this.orientationHandler = () => this.onOrientationChange();
        
        window.addEventListener('resize', this.resizeHandler);
        window.addEventListener('orientationchange', this.orientationHandler);
        
        // Touch events for mobile devices
        if (this.deviceInfo.hasTouch) {
            this.touchStartHandler = (event) => this.onTouchStart(event);
            this.touchMoveHandler = (event) => this.onTouchMove(event);
            this.touchEndHandler = () => this.onTouchEnd();
            
            this.container.addEventListener('touchstart', this.touchStartHandler, { passive: false });
            this.container.addEventListener('touchmove', this.touchMoveHandler, { passive: false });
            this.container.addEventListener('touchend', this.touchEndHandler);
        }
        
        // Mouse-responsive camera events (desktop only)
        if (this.options.mouseResponsive && !this.deviceInfo.isMobile) {
            this.container.addEventListener('mousemove', this.mouseMoveHandler);
            this.container.addEventListener('mouseleave', this.mouseLeaveHandler);
        }
    }
    
    onWindowResize() {
        // Debounce resize events for performance
        const now = Date.now();
        if (now - this.lastResize < this.resizeDebounceTime) {
            clearTimeout(this.resizeTimeout);
        }
        
        this.resizeTimeout = setTimeout(() => {
            this.handleResize();
            this.lastResize = now;
        }, this.resizeDebounceTime);
    }
    
    handleResize() {
        // Update device info
        this.deviceInfo = this.detectDevice();
        this.responsiveSettings = this.calculateResponsiveSettings();
        
        // Update camera and renderer
        const aspect = this.container.clientWidth / this.container.clientHeight;
        const frustumSize = this.responsiveSettings.frustumSize;
        
        this.camera.left = -frustumSize * aspect / 2;
        this.camera.right = frustumSize * aspect / 2;
        this.camera.top = frustumSize / 2;
        this.camera.bottom = -frustumSize / 2;
        this.camera.updateProjectionMatrix();
        
        this.renderer.setSize(this.container.clientWidth, this.container.clientHeight);
        
        // Adjust camera position for new screen size
        this.adjustCameraForDevice();
    }
    
    onOrientationChange() {
        // Wait for orientation change to complete
        setTimeout(() => {
            this.handleResize();
        }, 500);
    }
    
    /**
     * Touch event handlers for mobile devices
     */
    onTouchStart(event) {
        event.preventDefault();
        if (event.touches.length === 1) {
            const touch = event.touches[0];
            this.lastTouchPosition = {
                x: touch.clientX,
                y: touch.clientY,
                time: Date.now()
            };
        }
    }
    
    onTouchMove(event) {
        event.preventDefault();
        if (event.touches.length === 1 && this.lastTouchPosition) {
            const touch = event.touches[0];
            const deltaX = touch.clientX - this.lastTouchPosition.x;
            const deltaY = touch.clientY - this.lastTouchPosition.y;
            const deltaTime = Date.now() - this.lastTouchPosition.time;
            
            // Implement gentle camera response to touch movement
            if (deltaTime > 50) { // Throttle for performance
                this.handleTouchCameraMove(deltaX, deltaY);
                this.lastTouchPosition = {
                    x: touch.clientX,
                    y: touch.clientY,
                    time: Date.now()
                };
            }
        }
    }
    
    onTouchEnd() {
        this.lastTouchPosition = null;
        // Reset camera to base position
        if (this.mouseCamera.isEnabled) {
            this.mouseCamera.targetOffset.set(0, 0, 0);
        }
    }
    
    handleTouchCameraMove(deltaX, deltaY) {
        if (!this.mouseCamera.isEnabled || this.cameraTransition.isAnimating) return;
        
        const sensitivity = 0.003; // Much more subtle than mouse
        const maxOffset = 2; // Smaller offset for touch
        
        this.mouseCamera.targetOffset.x = Math.max(-maxOffset, Math.min(maxOffset, -deltaX * sensitivity));
        this.mouseCamera.targetOffset.y = Math.max(-maxOffset, Math.min(maxOffset, deltaY * sensitivity * 0.5));
        this.mouseCamera.targetOffset.z = Math.max(-maxOffset, Math.min(maxOffset, -deltaX * sensitivity * 0.2));
    }
    
    /**
     * Adjust camera position based on current device
     */
    adjustCameraForDevice() {
        if (this.cameraTransition.isAnimating) return;
        
        const currentPos = this.camera.position.clone();
        const currentDirection = new THREE.Vector3();
        this.camera.getWorldDirection(currentDirection);
        const currentTarget = currentPos.clone().add(currentDirection.multiplyScalar(10));
        
        // Calculate responsive adjustments
        const responsive = this.getResponsiveCameraPosition(
            currentPos.length(),
            currentTarget
        );
        
        // Apply adjustments if significant
        const newDistance = responsive.distance;
        const distanceRatio = newDistance / currentPos.length();
        
        if (Math.abs(distanceRatio - 1) > 0.1) { // Only adjust if change is significant
            const newPosition = currentPos.clone().multiplyScalar(distanceRatio);
            this.camera.position.copy(newPosition);
            this.camera.lookAt(responsive.target);
            this.updateBaseCameraPositions();
        }
    }
    
    /**
     * Mouse-responsive camera control
     */
    onMouseMove(event) {
        if (!this.mouseCamera.isEnabled || this.cameraTransition.isAnimating) return;
        
        const rect = this.container.getBoundingClientRect();
        
        // Normalize mouse position (-1 to 1)
        this.mouseCamera.mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.mouseCamera.mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        
        // Calculate target offset with mild influence
        const influence = this.options.mouseInfluence;
        const maxOffset = 3; // Maximum camera offset distance
        
        this.mouseCamera.targetOffset.set(
            this.mouseCamera.mouse.x * maxOffset * influence,
            this.mouseCamera.mouse.y * maxOffset * influence * 0.5, // Less vertical movement
            this.mouseCamera.mouse.x * maxOffset * influence * 0.3  // Subtle depth variation
        );
    }
    
    /**
     * Reset camera when mouse leaves container
     */
    onMouseLeave() {
        if (!this.mouseCamera.isEnabled) return;
        
        this.mouseCamera.targetOffset.set(0, 0, 0);
    }
    
    /**
     * Update mouse-responsive camera position
     */
    updateMouseCamera() {
        if (!this.mouseCamera.isEnabled || this.cameraTransition.isAnimating) return;
        
        // Smooth interpolation towards target offset
        this.mouseCamera.currentOffset.lerp(this.mouseCamera.targetOffset, this.options.mouseDamping);
        
        // Apply offset to base position
        const newPosition = this.mouseCamera.basePosition.clone().add(this.mouseCamera.currentOffset);
        const newTarget = this.mouseCamera.baseTarget.clone();
        
        // Add subtle target offset for parallax effect
        newTarget.x += this.mouseCamera.currentOffset.x * 0.2;
        newTarget.z += this.mouseCamera.currentOffset.z * 0.2;
        
        this.camera.position.copy(newPosition);
        this.camera.lookAt(newTarget);
    }
    
    /**
     * Update base camera positions when view changes
     */
    updateBaseCameraPositions() {
        this.mouseCamera.basePosition.copy(this.camera.position);
        
        // Calculate current lookAt target
        const direction = new THREE.Vector3();
        this.camera.getWorldDirection(direction);
        this.mouseCamera.baseTarget.copy(this.camera.position).add(direction.multiplyScalar(10));
    }
    
    render() {
        this.updateCameraAnimation();
        this.updateMouseCamera();
        this.renderer.render(this.scene, this.camera);
    }
    
    /**
     * Toggle mouse-responsive camera control
     */
    toggleMouseResponsive() {
        this.mouseCamera.isEnabled = !this.mouseCamera.isEnabled;
        
        if (!this.mouseCamera.isEnabled) {
            // Reset to base position when disabled
            this.mouseCamera.targetOffset.set(0, 0, 0);
            this.mouseCamera.currentOffset.set(0, 0, 0);
        }
        
        return this.mouseCamera.isEnabled;
    }
    
    /**
     * Set mouse influence strength (0.0 - 1.0)
     */
    setMouseInfluence(influence) {
        this.options.mouseInfluence = Math.max(0, Math.min(1, influence));
    }
    
    /**
     * Get current mouse-responsive state
     */
    getMouseResponsiveState() {
        return {
            enabled: this.mouseCamera.isEnabled,
            influence: this.options.mouseInfluence,
            damping: this.options.mouseDamping
        };
    }
    
    dispose() {
        window.removeEventListener('resize', this.resizeHandler);
        
        // Clean up mouse-responsive camera events
        if (this.options.mouseResponsive) {
            this.container.removeEventListener('mousemove', this.mouseMoveHandler);
            this.container.removeEventListener('mouseleave', this.mouseLeaveHandler);
        }
        
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
     * FIXED: Connection points for standalone cubes (no platform)
     * Ensures connections go to the exact geometric center of faces
     */
    static getStandaloneCubeConnectionPoint(cube, targetElement) {
        const cubePos = cube.position;
        const targetPos = targetElement.position;
        
        // FIXED: Use the actual geometry bounding box for precise dimensions
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
        
        // FIXED: Use actual geometry dimensions for precise face connections
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
        this.sceneManager = options.sceneManager; // Pass scene manager for device info
        
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
        
        // Responsive quality settings
        this.qualitySettings = this.getResponsiveQualitySettings();
        
        this.connectionGroup = new THREE.Group();
        this.animationGroup = new THREE.Group();
        this.scene.add(this.connectionGroup);
        this.scene.add(this.animationGroup);
        
        this.curves = [];
        this.animationParticles = [];
        this.connections = [];
    }
    
    /**
     * Get responsive quality settings based on device capabilities
     */
    getResponsiveQualitySettings() {
        if (!this.sceneManager) {
            return {
                particleCount: 'high',
                particleSegments: 12,
                tubeSegments: 64,
                animationSmooth: true
            };
        }
        
        const deviceInfo = this.sceneManager.getDeviceInfo();
        const quality = this.sceneManager.getOptimalQuality();
        
        let settings = {
            particleCount: 'high',
            particleSegments: 12,
            tubeSegments: 64,
            animationSmooth: true,
            particleSize: 0.15
        };
        
        switch (quality.particles) {
            case 'low':
                settings = {
                    particleCount: 'low',
                    particleSegments: 6,
                    tubeSegments: 32,
                    animationSmooth: false,
                    particleSize: 0.12
                };
                break;
                
            case 'medium':
                settings = {
                    particleCount: 'medium',
                    particleSegments: 8,
                    tubeSegments: 48,
                    animationSmooth: true,
                    particleSize: 0.13
                };
                break;
                
            case 'high':
                // Use default settings
                break;
                
            case 'ultra':
                settings = {
                    particleCount: 'ultra',
                    particleSegments: 16,
                    tubeSegments: 96,
                    animationSmooth: true,
                    particleSize: 0.18
                };
                break;
        }
        
        return settings;
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
        // Enhanced particle with directional indicators
        const particleGeometry = new THREE.SphereGeometry(0.15, 12, 12); // Larger, smoother particles
        const particleMaterial = new THREE.MeshPhongMaterial({
            color: 0x10b981,
            emissive: 0x059669,
            emissiveIntensity: 0.5,
            shininess: 60,
            transparent: true,
            opacity: 0.9
        });
        
        const particle = new THREE.Mesh(particleGeometry, particleMaterial);
        
        // Add directional trail effect
        const trailGeometry = new THREE.CylinderGeometry(0.02, 0.05, 0.3, 8);
        const trailMaterial = new THREE.MeshPhongMaterial({
            color: 0x10b981,
            emissive: 0x059669,
            emissiveIntensity: 0.3,
            transparent: true,
            opacity: 0.6
        });
        const trail = new THREE.Mesh(trailGeometry, trailMaterial);
        particle.add(trail);
        
        particle.userData = {
            connectionId,
            curve: curve,
            progress: Math.random(),
            speed: 0.008 + Math.random() * 0.012, // Slightly slower for better visibility
            type: 'particle',
            trail: trail
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
        // Enhanced info card timing control
        this.infoCardTimeout = null;
        this.showDelay = 200; // Reduced delay for better responsiveness
        this.hideDelay = 100; // Quicker hide
        // Progressive disclosure system
        this.disclosureLevel = 0; // 0: basic, 1: detailed, 2: technical
        this.disclosureTimeout = null;
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
                <div class="card-header">
                    <div class="layer"></div>
                    <div class="disclosure-indicator">●</div>
                </div>
                <div class="title"></div>
                <div class="description basic-info"></div>
                <div class="description detailed-info" style="display: none;"></div>
                <div class="description technical-info" style="display: none;"></div>
                <div class="progress-dots">
                    <span class="dot active"></span>
                    <span class="dot"></span>
                    <span class="dot"></span>
                </div>
            </div>
        `;
        
        // Add click listener for progressive disclosure
        this.infoCard.addEventListener('click', (e) => {
            e.stopPropagation();
            this.cycleDisclosureLevel();
        });
        
        this.applyGlassmorphismStyles();
        this.diagram.container.appendChild(this.infoCard);
    }
    
    applyGlassmorphismStyles() {
        const styles = `
            .diagram-info-card {
                position: absolute;
                min-width: 280px;
                max-width: 380px;
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
                transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
                pointer-events: none;
                z-index: 100;
                cursor: pointer;
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
                pointer-events: auto;
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

            .diagram-info-card .card-header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 12px;
            }

            .diagram-info-card .disclosure-indicator {
                color: #3b82f6;
                font-size: 12px;
                opacity: 0.7;
                transition: all 0.3s ease;
            }

            .diagram-info-card:hover .disclosure-indicator {
                opacity: 1;
                transform: scale(1.2);
            }

            .diagram-info-card .title {
                font-weight: 700;
                font-size: 18px;
                margin-bottom: 12px;
                color: #0f172a;
                text-shadow: 0 2px 4px rgba(255, 255, 255, 0.8);
                letter-spacing: -0.02em;
                transition: all 0.3s ease;
            }

            .diagram-info-card .layer {
                font-size: 11px;
                color: #64748b;
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
                transition: all 0.3s ease;
                margin-bottom: 8px;
            }

            .diagram-info-card .detailed-info {
                font-size: 12px;
                color: #4b5563;
                border-left: 2px solid rgba(59, 130, 246, 0.3);
                padding-left: 12px;
                margin-top: 8px;
            }

            .diagram-info-card .technical-info {
                font-size: 11px;
                color: #6b7280;
                background: rgba(59, 130, 246, 0.1);
                padding: 8px;
                border-radius: 8px;
                margin-top: 8px;
                font-family: 'Monaco', 'Consolas', monospace;
            }

            .diagram-info-card .progress-dots {
                display: flex;
                justify-content: center;
                gap: 6px;
                margin-top: 12px;
                opacity: 0.6;
            }

            .diagram-info-card .progress-dots .dot {
                width: 6px;
                height: 6px;
                border-radius: 50%;
                background: #64748b;
                transition: all 0.3s ease;
            }

            .diagram-info-card .progress-dots .dot.active {
                background: #3b82f6;
                transform: scale(1.2);
            }

            .diagram-info-card:hover {
                background: rgba(255, 255, 255, 0.18);
                border-color: rgba(255, 255, 255, 0.35);
                transform: scale(1.02) translateY(-2px);
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
            <h3>Camera Controls</h3>
            <button onclick="window.diagram_${diagramId}.sceneManager.setIsometricView()">Isometric</button>
            <button onclick="window.diagram_${diagramId}.sceneManager.setTopView()">Top View</button>
            <button onclick="window.diagram_${diagramId}.sceneManager.setSideView()">Side View</button>
            <br>
            <button onclick="window.diagram_${diagramId}.toggleMouseResponsive()" class="accent" id="mouseToggle_${diagramId}">
                Mouse Response: ${this.diagram.sceneManager.mouseCamera.isEnabled ? 'ON' : 'OFF'}
            </button>
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
     * Enhanced info card with progressive disclosure
     */
    showInfoCard(object, mouseEvent) {
        // Clear any existing timeout
        if (this.infoCardTimeout) {
            clearTimeout(this.infoCardTimeout);
        }
        
        // Reset disclosure level for new object
        this.disclosureLevel = 0;
        this.updateDisclosureIndicator();
        
        // Show with enhanced timing
        this.infoCardTimeout = setTimeout(() => {
            this.updateInfoCard(object, mouseEvent);
            
            // Auto-advance to detailed info after a delay
            this.disclosureTimeout = setTimeout(() => {
                if (this.infoCard.classList.contains('visible')) {
                    this.cycleDisclosureLevel();
                }
            }, 2000); // Auto-advance after 2 seconds
        }, this.showDelay);
    }
    
    hideInfoCard() {
        // Clear all timeouts
        if (this.infoCardTimeout) {
            clearTimeout(this.infoCardTimeout);
        }
        if (this.disclosureTimeout) {
            clearTimeout(this.disclosureTimeout);
        }
        
        // Hide with delay
        this.infoCardTimeout = setTimeout(() => {
            this.infoCard.classList.remove('visible');
            this.disclosureLevel = 0;
        }, this.hideDelay);
    }
    
    /**
     * Cycle through disclosure levels (basic → detailed → technical)
     */
    cycleDisclosureLevel() {
        this.disclosureLevel = (this.disclosureLevel + 1) % 3;
        this.updateDisclosureIndicator();
        this.updateDisclosureContent();
        
        // Clear auto-advance timeout
        if (this.disclosureTimeout) {
            clearTimeout(this.disclosureTimeout);
        }
    }
    
    /**
     * Update disclosure indicator and progress dots
     */
    updateDisclosureIndicator() {
        const indicator = this.infoCard.querySelector('.disclosure-indicator');
        const dots = this.infoCard.querySelectorAll('.progress-dots .dot');
        
        const indicators = ['●', '◐', '○'];
        indicator.textContent = indicators[this.disclosureLevel];
        
        dots.forEach((dot, index) => {
            dot.classList.toggle('active', index <= this.disclosureLevel);
        });
    }
    
    /**
     * Update visible content based on disclosure level
     */
    updateDisclosureContent() {
        const basicInfo = this.infoCard.querySelector('.basic-info');
        const detailedInfo = this.infoCard.querySelector('.detailed-info');
        const technicalInfo = this.infoCard.querySelector('.technical-info');
        
        // Hide all
        basicInfo.style.display = 'none';
        detailedInfo.style.display = 'none';
        technicalInfo.style.display = 'none';
        
        // Show appropriate level
        switch(this.disclosureLevel) {
            case 0:
                basicInfo.style.display = 'block';
                break;
            case 1:
                basicInfo.style.display = 'block';
                detailedInfo.style.display = 'block';
                break;
            case 2:
                basicInfo.style.display = 'block';
                detailedInfo.style.display = 'block';
                technicalInfo.style.display = 'block';
                break;
        }
    }
    
    updateInfoCard(object, mouseEvent) {
        const layer = this.infoCard.querySelector('.layer');
        const title = this.infoCard.querySelector('.title');
        const basicInfo = this.infoCard.querySelector('.basic-info');
        const detailedInfo = this.infoCard.querySelector('.detailed-info');
        const technicalInfo = this.infoCard.querySelector('.technical-info');
        
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
        
        // Populate progressive disclosure content
        if (objectData.type === 'platform') {
            // Platform content
            basicInfo.textContent = `Foundation layer for ${objectData.layer} components`;
            detailedInfo.textContent = `Provides structural support and shared resources. Houses ${this.getComponentCount(objectData.layer)} components with coordinated lifecycle management.`;
            technicalInfo.textContent = `Platform Dimensions: ${this.getPlatformDimensions(object)}
Memory: Shared resource pool
Scaling: Horizontal with component orchestration
API: Internal service mesh`;
        } else {
            // Component content
            let conciseInfo = objectData.info || 'Component';
            conciseInfo = conciseInfo.split('•')[0].trim();
            
            basicInfo.textContent = conciseInfo;
            
            // Enhanced detailed info
            if (objectData.isDatabaseComponent) {
                detailedInfo.textContent = `Database component with persistent storage capabilities. Handles data operations, queries, and maintains ACID compliance with automatic backups.`;
                technicalInfo.textContent = `Type: ${objectData.isDatabaseComponent ? 'Cylinder Database' : 'Processing Unit'}
Connections: ${this.getConnectionCount(object)}
Status: Active
Performance: Optimized
Security: Encrypted at rest`;
            } else if (!objectData.hasPlataform) {
                detailedInfo.textContent = `Central processing hub serving as the main coordination point. Handles routing, orchestration, and cross-platform communication.`;
                technicalInfo.textContent = `Type: Central Hub (Standalone)
Connections: ${this.getConnectionCount(object)}
Throughput: High
Latency: <10ms
Redundancy: Active-Active cluster`;
            } else {
                detailedInfo.textContent = `Platform-based component with specialized functionality. Integrates with platform services and shared resources.`;
                technicalInfo.textContent = `Type: Platform Component
Platform: ${objectData.layer}
Connections: ${this.getConnectionCount(object)}
Resources: Shared pool access
Monitoring: Platform-integrated`;
            }
        }
        
        // Initialize disclosure state
        this.updateDisclosureContent();
        
        // Position card relative to container
        const rect = this.diagram.container.getBoundingClientRect();
        const x = mouseEvent.clientX - rect.left;
        const y = mouseEvent.clientY - rect.top;
        
        const cardWidth = 380;
        const cardHeight = 150;
        
        const finalX = Math.min(x + 20, this.diagram.container.clientWidth - cardWidth);
        const finalY = Math.max(y - cardHeight/2, 20);
        
        this.infoCard.style.left = finalX + 'px';
        this.infoCard.style.top = finalY + 'px';
        this.infoCard.classList.add('visible');
    }
    
    /**
     * Helper methods for enhanced info content
     */
    getComponentCount(layerName) {
        const layerData = this.diagram.data[layerName];
        return layerData && layerData.components ? layerData.components.length : 0;
    }
    
    getPlatformDimensions(platform) {
        const geo = platform.geometry;
        return `${geo.parameters.width}×${geo.parameters.depth}×${geo.parameters.height}`;
    }
    
    getConnectionCount(object) {
        // Count connections involving this object
        return this.diagram.connectionManager.connections.filter(conn => 
            conn.fromElement === object || conn.toElement === object
        ).length;
    }
    
    dispose() {
        if (this.infoCardTimeout) {
            clearTimeout(this.infoCardTimeout);
        }
        if (this.disclosureTimeout) {
            clearTimeout(this.disclosureTimeout);
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
        // Enhanced hover material with smooth transitions
        this.hoverMaterial = new THREE.MeshPhongMaterial({ 
            color: 0x3b82f6,
            emissive: 0x1e40af,
            emissiveIntensity: 0.4,
            opacity: 1,
            transparent: false,
            shininess: 60,
            specular: 0x888888
        });
        
        // Enhanced selected material
        this.selectedMaterial = new THREE.MeshPhongMaterial({
            color: 0x10b981,
            emissive: 0x059669,
            emissiveIntensity: 0.6,
            opacity: 1,
            transparent: false,
            shininess: 80,
            specular: 0xaaaaaa
        });
        
        // Material transition system
        this.materialTransitions = new Map();
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
                // Reset previous hover with smooth transition
                if (this.hoveredComponent && this.hoveredComponent !== this.selectedComponent) {
                    this.smoothResetComponentState(this.hoveredComponent);
                }
                
                // Set new hover with enhanced animation
                this.hoveredComponent = object;
                this.smoothHoverTransition(object);
                
                // Enhanced scale animation
                this.targetScales.set(object, new THREE.Vector3(1.15, 1.15, 1.15));
                
                // Enhanced info card with progressive disclosure
                this.diagram.uiManager.showInfoCard(object, event);
            }
        } else {
            if (this.hoveredComponent && this.hoveredComponent !== this.selectedComponent) {
                this.smoothResetComponentState(this.hoveredComponent);
                this.hoveredComponent = null;
                this.diagram.uiManager.hideInfoCard();
            }
        }
    }
    
    /**
     * Enhanced smooth hover transition with material animation
     */
    smoothHoverTransition(object) {
        const originalMaterial = this.originalMaterials.get(object);
        const targetMaterial = this.hoverMaterial.clone();
        
        // Start material transition
        this.materialTransitions.set(object, {
            startMaterial: originalMaterial.clone(),
            targetMaterial: targetMaterial,
            progress: 0,
            duration: 300, // ms
            startTime: performance.now(),
            type: 'hover'
        });
        
        // Add pulsing glow effect
        this.addPulsingGlow(object);
    }
    
    /**
     * Enhanced smooth reset transition
     */
    smoothResetComponentState(object) {
        const originalMaterial = this.originalMaterials.get(object);
        
        // Start reset transition
        this.materialTransitions.set(object, {
            startMaterial: object.material.clone(),
            targetMaterial: originalMaterial.clone(),
            progress: 0,
            duration: 200, // ms
            startTime: performance.now(),
            type: 'reset'
        });
        
        this.targetScales.set(object, new THREE.Vector3(1, 1, 1));
        this.removePulsingGlow(object);
    }
    
    /**
     * Add pulsing glow effect for enhanced hover
     */
    addPulsingGlow(object) {
        if (object.userData.glowEffect) return;
        
        const glowGeometry = object.geometry.clone();
        const glowMaterial = new THREE.MeshBasicMaterial({
            color: 0x3b82f6,
            opacity: 0.2,
            transparent: true,
            side: THREE.BackSide
        });
        
        const glow = new THREE.Mesh(glowGeometry, glowMaterial);
        glow.scale.setScalar(1.1);
        object.add(glow);
        object.userData.glowEffect = glow;
    }
    
    /**
     * Remove pulsing glow effect
     */
    removePulsingGlow(object) {
        if (object.userData.glowEffect) {
            object.remove(object.userData.glowEffect);
            object.userData.glowEffect.geometry.dispose();
            object.userData.glowEffect.material.dispose();
            delete object.userData.glowEffect;
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
        
        // Update material transitions
        this.updateMaterialTransitions();
        
        const allObjects = [...this.diagram.components];
        Object.values(this.diagram.platforms).forEach(platform => {
            if (platform) allObjects.push(platform);
        });
        
        allObjects.forEach(object => {
            const targetScale = this.targetScales.get(object);
            if (targetScale) {
                object.scale.lerp(targetScale, lerpFactor);
                
                // Enhanced floating animation for platform and its components
                if (object === this.selectedComponent || 
                    (this.selectedComponent && this.selectedComponent.userData.type === 'platform' && 
                     object.userData.layer === this.selectedComponent.userData.layer && 
                     object.userData.hasPlataform)) {
                    
                    const time = Date.now() * 0.002;
                    const originalPos = object.userData.originalPosition || object.position;
                    
                    const floatAmount = object.userData.type === 'platform' ? 0.08 : 0.12;
                    const floatSpeed = object.userData.type === 'platform' ? 1 : 1.2;
                    
                    object.position.y = originalPos.y + Math.sin(time * floatSpeed) * floatAmount;
                    
                    // Pulsing glow effect
                    if (object.material.emissiveIntensity !== undefined) {
                        object.material.emissiveIntensity = 0.7 + Math.sin(time * 2) * 0.2;
                    }
                }
                
                // Update hover glow effect
                if (object.userData.glowEffect) {
                    const time = Date.now() * 0.003;
                    object.userData.glowEffect.material.opacity = 0.1 + Math.sin(time) * 0.1;
                    object.userData.glowEffect.scale.setScalar(1.1 + Math.sin(time * 1.5) * 0.05);
                }
            }
        });
    }
    
    /**
     * Update smooth material transitions
     */
    updateMaterialTransitions() {
        this.materialTransitions.forEach((transition, object) => {
            const elapsed = performance.now() - transition.startTime;
            const progress = Math.min(elapsed / transition.duration, 1);
            
            // Smooth easing
            const eased = progress < 0.5 
                ? 2 * progress * progress 
                : 1 - Math.pow(-2 * progress + 2, 2) / 2;
            
            // Interpolate material properties
            const currentMaterial = object.material;
            const startMat = transition.startMaterial;
            const targetMat = transition.targetMaterial;
            
            // Interpolate emissive intensity
            if (startMat.emissiveIntensity !== undefined && targetMat.emissiveIntensity !== undefined) {
                currentMaterial.emissiveIntensity = THREE.MathUtils.lerp(
                    startMat.emissiveIntensity,
                    targetMat.emissiveIntensity,
                    eased
                );
            }
            
            // Interpolate shininess
            if (startMat.shininess !== undefined && targetMat.shininess !== undefined) {
                currentMaterial.shininess = THREE.MathUtils.lerp(
                    startMat.shininess,
                    targetMat.shininess,
                    eased
                );
            }
            
            // Complete transition
            if (progress >= 1) {
                object.material = transition.targetMaterial;
                this.materialTransitions.delete(object);
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
        
        // Clean up material transitions
        this.materialTransitions.clear();
        
        // Clean up glow effects
        [...this.diagram.components, ...Object.values(this.diagram.platforms)].forEach(object => {
            if (object && object.userData.glowEffect) {
                this.removePulsingGlow(object);
            }
        });
        
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
            userInterface: this.createEnhancedMaterial(0x10b981, 0x047857, 'Interface Layer'),
            businessLogic: this.createEnhancedMaterial(0xf59e0b, 0xd97706, 'Logic Layer'),
            output: this.createEnhancedMaterial(0x8b5cf6, 0x7c3aed, 'Output Layer'),
            database: this.createEnhancedMaterial(0x06b6d4, 0x0891b2, 'Database Layer'),
            frontend: this.createEnhancedMaterial(0x3b82f6, 0x2563eb, 'Frontend Layer'),
            backend: this.createEnhancedMaterial(0x10b981, 0x047857, 'Backend Layer'),
            services: this.createEnhancedMaterial(0x8b5cf6, 0x7c3aed, 'Services Layer'),
            default: this.createEnhancedMaterial(0x64748b, 0x475569, 'Default Layer')
        };
    }
    
    /**
     * Create materials with subtle gradients and depth effects
     */
    createEnhancedMaterial(primaryColor, accentColor, layerType) {
        const material = new THREE.MeshPhongMaterial({
            color: primaryColor,
            emissive: accentColor,
            emissiveIntensity: 0.05,
            opacity: 0.85,
            transparent: true,
            shininess: 30,
            specular: 0x444444,
            side: THREE.DoubleSide
        });
        
        // Add subtle texture variations based on layer type
        if (layerType.includes('Database')) {
            material.emissiveIntensity = 0.08;
            material.shininess = 50;
        } else if (layerType.includes('Interface') || layerType.includes('Frontend')) {
            material.emissiveIntensity = 0.06;
            material.shininess = 40;
        }
        
        return material;
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
            
            // FIXED: Center the extruded geometry to ensure proper connection points
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
    
    /**
     * Get device and responsive information
     */
    getDeviceInfo() {
        return this.sceneManager.getDeviceInfo();
    }
    
    /**
     * Check if the diagram is running on a mobile device
     */
    isMobile() {
        return this.sceneManager.isMobile();
    }
    
    /**
     * Check if the device is in portrait orientation
     */
    isPortrait() {
        return this.sceneManager.isPortrait();
    }
    
    /**
     * Get optimal quality settings for current device
     */
    getQualitySettings() {
        return this.sceneManager.getOptimalQuality();
    }
    
    /**
     * Manually trigger responsive resize
     */
    triggerResize() {
        this.sceneManager.handleResize();
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