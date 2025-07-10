/**
 * ===== DEMO CONFIGURATIONS =====
 * configurations for different diagram types
 */

// Hospital Architecture Diagram
const hospitalData = {
    userInterface: {
        platform: { x: -6, z: 6, width: 8, depth: 4, height: 0.5 },
        components: [
            { name: "Input Tables", x: -8, z: 7, info: "Data input interface" },
            { name: "Pie Chart", x: -6, z: 7, info: "Circular data visualization" },
            { name: "Year Selector", x: -4, z: 7, info: "Temporal data filter" },
            { name: "Bar Chart", x: -8, z: 5, info: "Comparative bar visualization" },
            { name: "Donut Chart", x: -6, z: 5, info: "Circular chart with center void" }
        ]
    },
    businessLogic: {
        platform: { x: -6, z: 1, width: 6, depth: 3, height: 0.5 },
        components: [
            { name: "Excel Calculator", x: -7.5, z: 1, info: "Spreadsheet calculation engine" },
            { name: "Web Calculator", x: -4.5, z: 1, info: "Browser-based calculation service" }
        ]
    },
    output: {
        platform: null, // Central standalone cube
        components: [
            { name: "Output Tables", x: 4, z: 1, info: "Central processing hub" }
        ]
    },
    database: {
        platform: { x: 4, z: -4, width: 6, depth: 3, height: 0.5 },
        components: [
            { name: "AirTable", x: 2, z: -4, info: "Cloud database with API integration" },
            { name: "Excel", x: 6, z: -4, info: "Traditional spreadsheet storage" }
        ]
    }
};

const hospitalConnections = [
    {
        from: { type: 'platform', layer: 'userInterface' },
        to: { type: 'platform', layer: 'businessLogic' },
        options: { 
            color: 0x10b981, 
            opacity: 0.8, 
            curveType: 'architectural',
            verticalOffset: 0.6,     
            useTubeGeometry: true,
            tubeRadius: 0.1,
            showArrows: false
        }
    },
    {
        from: { type: 'platform', layer: 'businessLogic' },
        to: { type: 'component', name: 'Output Tables' },
        options: { 
            color: 0xf59e0b, 
            opacity: 0.8, 
            curveType: 'architectural',
            verticalOffset: 0.8,
            useTubeGeometry: true,
            tubeRadius: 0.09,
            showArrows: false
        }
    },
    {
        from: { type: 'component', name: 'Output Tables' },
        to: { type: 'platform', layer: 'database' },
        options: { 
            color: 0x8b5cf6, 
            opacity: 0.8, 
            curveType: 'architectural',
            verticalOffset: 0.7,
            useTubeGeometry: true,
            tubeRadius: 0.11,
            showArrows: false
        }
    }
];

// Simple Network Diagram - IMPROVED positioning and descriptions
const networkData = {
    frontend: {
        platform: { x: -8, z: 0, width: 4, depth: 4, height: 0.5 },
        components: [
            { name: "React App", x: -8, z: 1, info: "Frontend React application" },
            { name: "Vue App", x: -8, z: -1, info: "Frontend Vue.js admin panel" }
        ]
    },
    backend: {
        platform: null, // Central processing node
        components: [
            { name: "API Gateway", x: 0, z: 0, info: "Central API routing service" }
        ]
    },
    services: {
        platform: { x: 8, z: 0, width: 8, depth: 8, height: 0.5 },
        components: [
            { name: "Auth Service", x: 6, z: 2, info: "Authentication service" },
            { name: "Data Service", x: 10, z: 2, info: "Data processing service" },
            { name: "Cache", x: 6, z: -2, info: "Redis caching layer" },
            { name: "Database Storage", x: 10, z: -2, info: "Primary database storage" }
        ]
    }
};

const networkConnections = [
    {
        from: { type: 'platform', layer: 'frontend' },
        to: { type: 'component', name: 'API Gateway' },
        options: { 
            color: 0x3b82f6, 
            opacity: 0.85,
            curveType: 'architectural',
            verticalOffset: 0.5,
            useTubeGeometry: true,
            tubeRadius: 0.08,
            showArrows: false
        }
    },
    {
        from: { type: 'component', name: 'API Gateway' },
        to: { type: 'platform', layer: 'services' },
        options: { 
            color: 0x10b981, 
            opacity: 0.85,
            curveType: 'architectural',
            verticalOffset: 0.6,
            useTubeGeometry: true,
            tubeRadius: 0.09,
            showArrows: false
        }
    }
];

// Initialize all diagrams when the page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log('Initializing enhanced 3D diagrams...');
    
    // Hospital Architecture Diagram - Enhanced configuration
    const diagram1 = new Diagram3D({
        container: '#diagram1',
        data: hospitalData,
        connections: hospitalConnections,
        options: {
            showControls: false,           // Clean UI
            showLegend: false,             // Clean UI
            showConnectionInfo: false,     // Clean UI
            enableInteraction: true,       // Enable enhanced interactions
            animationEnabled: true,        // Animated flow particles
            enableShadows: true,           // Enhanced shadows with ground plane
            enhancedGlassmorphism: true,   // Premium glassmorphism info cards
            databaseShapes: true,          // Cylinder shapes for database components
            beveledEdges: true,            // Beveled edges for all components
            useTubeGeometry: true,         // 3D tube connections
            tubeRadius: 0.08,              // Connection thickness
            lineWidth: 4,                  // Fallback line width
            showArrows: false,             // Disable arrows globally
            precisePositioning: true,      // Enhanced element positioning
            platformFloating: true         // Platform floating animations
        }
    });
    
    // Simple Network Diagram - Enhanced configuration
    const diagram2 = new Diagram3D({
        container: '#diagram2',
        data: networkData,
        connections: networkConnections,
        options: {
            showControls: false,           // Clean UI
            showLegend: false,             // Clean UI
            showConnectionInfo: false,     // Clean UI
            enableInteraction: true,       // Enable enhanced interactions
            animationEnabled: true,        // Animated flow particles
            enableShadows: true,           // Enhanced shadows with ground plane
            enhancedGlassmorphism: true,   // Premium glassmorphism info cards
            databaseShapes: true,          // Cylinder shapes for database components
            beveledEdges: true,            // Beveled edges for all components
            useTubeGeometry: true,         // 3D tube connections
            tubeRadius: 0.07,              // Thinner connections
            showArrows: false,             // Disable arrows globally
            precisePositioning: true,      // Enhanced element positioning
            platformFloating: true         // Platform floating animations
        }
    });
    
    console.log('All  diagrams initialized successfully');
});