/**
 * ===== DEMO CONFIGURATIONS =====
 * configurations for different diagram types
 */

// Hospital Architecture Diagram
const hospitalData = {
    userInterface: {
        platform: { x: -6, z: 6, width: 8, depth: 4 },
        components: [
            { name: "Input Tables", x: -8, z: 7, info: "Data input interface for user data entry and manipulation" },
            { name: "Pie Chart", x: -6, z: 7, info: "Visual representation of data in circular chart format" },
            { name: "Year Selector", x: -4, z: 7, info: "Time-based filtering component for temporal data" },
            { name: "Bar Chart", x: -8, z: 5, info: "Comparative data visualization using rectangular bars" },
            { name: "Donut Chart", x: -6, z: 5, info: "Circular chart with center void for additional information" }
        ]
    },
    businessLogic: {
        platform: { x: -6, z: 1, width: 6, depth: 3 },
        components: [
            { name: "Excel Calculator", x: -7.5, z: 1, info: "Spreadsheet-based calculation engine for complex formulas" },
            { name: "Web Calculator", x: -4.5, z: 1, info: "Browser-based calculation service for real-time processing" }
        ]
    },
    output: {
        platform: null, // no platform - independent central cube
        components: [
            { name: "Output Tables", x: 4, z: 1, info: "Central processing hub - acts as independent cube without platform" }
        ]
    },
    database: {
        platform: { x: 4, z: -4, width: 6, depth: 3 },
        components: [
            { name: "AirTable", x: 2, z: -4, info: "Cloud-based database with API integration capabilities" },
            { name: "Excel", x: 6, z: -4, info: "Traditional spreadsheet storage and processing system" }
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
            tubeRadius: 0.1          
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
            tubeRadius: 0.09
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
            tubeRadius: 0.11
        }
    }
];

// Simple Network Diagram
const networkData = {
    frontend: {
        platform: { x: -8, z: 0, width: 4, depth: 4 },
        components: [
            { name: "React App", x: -8, z: 1, info: "Frontend React application for user interface" },
            { name: "Vue App", x: -8, z: -1, info: "Frontend Vue.js application for admin panel" }
        ]
    },
    backend: {
        platform: null, // central processing node
        components: [
            { name: "API Gateway", x: 0, z: 0, info: "Central API management and routing service" }
        ]
    },
    services: {
        platform: { x: 8, z: 0, width: 8, depth: 8 },
        components: [
            { name: "Auth Service", x: 6, z: 1, info: "Authentication and authorization service" },
            { name: "Data Service", x: 10, z: 1, info: "Data processing and management service" },
            { name: "Cache", x: 8, z: -1, info: "Redis caching layer for performance" }
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
            tubeRadius: 0.08
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
            tubeRadius: 0.09
        }
    }
];


// Initialize all diagrams when the page loads
document.addEventListener('DOMContentLoaded', function() {
    // Hospital Architecture Diagram
    const diagram1 = new Diagram3D({
        container: '#diagram1',
        data: hospitalData,
        connections: hospitalConnections,
        options: {
            showControls: true,
            showLegend: true,
            showConnectionInfo: true,
            enableInteraction: true,
            useTubeGeometry: true,      // Activar tubos 3D por defecto
            tubeRadius: 0.08,           // Radio por defecto
            lineWidth: 4,               // Grosor de línea por defecto
            legendItems: [
                { color: '#10b981', label: 'User Interface Layer' },
                { color: '#f59e0b', label: 'Business Logic Layer' },
                { color: '#8b5cf6', label: 'Output Layer (Central Cube)' },
                { color: '#06b6d4', label: 'Database Layer' }
            ]
        }
    });
    
    // Simple Network Diagram
    const diagram2 = new Diagram3D({
        container: '#diagram2',
        data: networkData,
        connections: networkConnections,
        options: {
            showControls: false,
            showLegend: true,
            showConnectionInfo: false,
            enableInteraction: true,
            useTubeGeometry: true,
            tubeRadius: 0.07,
            legendItems: [
                { color: '#3b82f6', label: 'Frontend Applications' },
                { color: '#10b981', label: 'API Gateway' },
                { color: '#8b5cf6', label: 'Backend Services' }
            ]
        }
    });
    
    console.log('All diagrams initialized successfully');
});