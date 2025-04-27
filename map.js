// Initialize map
const map = L.map('map').setView([51.505, -0.09], 13);

// Add tile layers
const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors'
});

const satelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
    maxZoom: 19,
    attribution: '© Esri'
});

osmLayer.addTo(map);
let currentLayer = 'osm';

// Toggle map type
document.getElementById('toggleMapType').addEventListener('click', () => {
    if (currentLayer === 'osm') {
        map.removeLayer(osmLayer);
        map.addLayer(satelliteLayer);
        currentLayer = 'satellite';
    } else {
        map.removeLayer(satelliteLayer);
        map.addLayer(osmLayer);
        currentLayer = 'osm';
    }
});

// Drawing variables
let drawingPolygon = false;
let polygonPoints = [];
let polygon = null;
let homePoint = null;
let homePointMarker = null;
let waypointMarkers = [];
let flightPaths = []; // Array to store all polylines
let polygonMarkers = [];
let footprintPolygons = []; // Array to store photo footprint polygons
let showingFootprints = false; // Track if footprints are currently shown

// Custom marker icon for home point
const homeIcon = L.icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    iconSize: [25, 41],
    iconAnchor: [12, 41],
    popupAnchor: [1, -34]
});

// Set home point
document.getElementById('setHomePoint').addEventListener('click', () => {
    if (homePointMarker) {
        map.removeLayer(homePointMarker);
    }
    
    const center = map.getCenter();
    homePoint = center;
    homePointMarker = L.marker(center, { icon: homeIcon, draggable: true })
        .addTo(map)
        .bindPopup('Home Point');
        
    homePointMarker.on('dragend', (e) => {
        homePoint = e.target.getLatLng();
        updateFlightPath();
    });
});

// Function to update polygon with markers for editing
function updatePolygonWithMarkers() {
    // Clear existing polygon and markers
    if (polygon) {
        map.removeLayer(polygon);
    }
    polygonMarkers.forEach(marker => map.removeLayer(marker));
    polygonMarkers = [];

    // Create new polygon
    if (polygonPoints.length > 0) {
        polygon = L.polygon(polygonPoints, { color: 'blue' }).addTo(map);
        
        // Add draggable markers at each point
        polygonPoints.forEach((point, index) => {
            const marker = L.marker(point, {
                draggable: true,
                icon: L.divIcon({
                    className: 'vertex-marker',
                    html: '',
                    iconSize: [12, 12]
                })
            }).addTo(map);

            marker.on('drag', (e) => {
                // Update polygon point position while dragging
                polygonPoints[index] = e.target.getLatLng();
                polygon.setLatLngs(polygonPoints);
                updateFlightPath();
            });

            marker.on('dragend', () => {
                // Final update after drag ends
                updateFlightPath();
            });

            polygonMarkers.push(marker);
        });
    }
}

// Start/finish polygon drawing
const missionAreaButton = document.getElementById('startPolygon');
missionAreaButton.addEventListener('click', () => {
    if (!drawingPolygon && polygonPoints.length === 0) {
        // Start new polygon drawing
        drawingPolygon = true;
        missionAreaButton.textContent = 'Finish Drawing Mission Area';
        missionAreaButton.classList.add('active');
        map.getContainer().style.cursor = 'crosshair';
    } else if (drawingPolygon) {
        // Finish drawing
        drawingPolygon = false;
        missionAreaButton.textContent = 'Edit Mission Area';
        missionAreaButton.classList.remove('active');
        map.getContainer().style.cursor = '';
        if (polygonPoints.length >= 3) {
            updatePolygonWithMarkers();
            updateFlightPath();
        }
    } else {
        // Toggle edit mode
        const isEditing = missionAreaButton.classList.contains('active');
        if (isEditing) {
            // Finish editing
            missionAreaButton.textContent = 'Edit Mission Area';
            missionAreaButton.classList.remove('active');
            polygonMarkers.forEach(marker => marker.dragging.disable());
        } else {
            // Start editing
            missionAreaButton.textContent = 'Finish Editing';
            missionAreaButton.classList.add('active');
            polygonMarkers.forEach(marker => marker.dragging.enable());
        }
    }
});

// Clear polygon
document.getElementById('clearPolygon').addEventListener('click', () => {
    if (polygon) {
        map.removeLayer(polygon);
    }
    polygonMarkers.forEach(marker => map.removeLayer(marker));
    polygonMarkers = [];
    polygonPoints = [];
    drawingPolygon = false;
    map.getContainer().style.cursor = '';
    missionAreaButton.textContent = 'Draw Mission Area';
    missionAreaButton.classList.remove('active');
    updateFlightPath();
});

// Handle map clicks for polygon drawing
map.on('click', (e) => {
    if (!drawingPolygon) return;

    const clickedPoint = e.latlng;
    polygonPoints.push(clickedPoint);
    
    // Update the polygon preview
    if (polygon) {
        map.removeLayer(polygon);
    }
    polygon = L.polygon(polygonPoints, { color: 'blue' }).addTo(map);
});

// Search functionality
const searchBox = document.getElementById('searchBox');
const searchResults = document.getElementById('searchResults');

let searchTimeout = null;

searchBox.addEventListener('input', (e) => {
    const query = e.target.value.trim();
    
    if (searchTimeout) {
        clearTimeout(searchTimeout);
    }
    
    if (!query) {
        searchResults.innerHTML = '';
        searchResults.classList.remove('active');
        return;
    }
    
    // Check if input is coordinates
    const coordsMatch = query.match(/^(-?\d+\.?\d*),\s*(-?\d+\.?\d*)$/);
    if (coordsMatch) {
        const lat = parseFloat(coordsMatch[1]);
        const lng = parseFloat(coordsMatch[2]);
        if (lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180) {
            map.setView([lat, lng], 16);
            searchResults.innerHTML = '';
            searchResults.classList.remove('active');
            return;
        }
    }
    
    searchTimeout = setTimeout(() => {
        // Use Nominatim for geocoding
        fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}`)
            .then(response => response.json())
            .then(data => {
                searchResults.innerHTML = '';
                if (data.length > 0) {
                    searchResults.classList.add('active');
                    data.slice(0, 5).forEach(result => {
                        const div = document.createElement('div');
                        div.className = 'search-result-item';
                        div.textContent = result.display_name;
                        div.addEventListener('click', () => {
                            map.setView([result.lat, result.lon], 16);
                            searchResults.innerHTML = '';
                            searchResults.classList.remove('active');
                            searchBox.value = result.display_name;
                        });
                        searchResults.appendChild(div);
                    });
                } else {
                    searchResults.classList.remove('active');
                }
            })
            .catch(error => {
                console.error('Error searching:', error);
            });
    }, 300);
});

// Function to calculate the corners of a photo footprint
function calculatePhotoFootprint(center, heading, altitude, drone) {
    const footprint = calculateFootprint(altitude, drone);
    const width = footprint.width;
    const height = footprint.height;
    
    // Calculate the corners (in meters from center)
    const corners = [
        [-width/2, -height/2],
        [width/2, -height/2],
        [width/2, height/2],
        [-width/2, height/2]
    ];
    
    // Rotate corners based on heading
    const rad = (heading - 90) * Math.PI / 180;
    const rotatedCorners = corners.map(([x, y]) => [
        x * Math.cos(rad) - y * Math.sin(rad),
        x * Math.sin(rad) + y * Math.cos(rad)
    ]);
    
    // Convert to lat/lng
    return rotatedCorners.map(([x, y]) => {
        const latOffset = y / 111111;  // approx meters per degree of latitude
        const lngOffset = x / (111111 * Math.cos(center.lat * Math.PI / 180));
        return L.latLng(center.lat + latOffset, center.lng + lngOffset);
    });
}

// Add toggle footprints button handler
document.getElementById('toggleFootprints').addEventListener('click', (e) => {
    showingFootprints = !showingFootprints;
    e.target.textContent = showingFootprints ? 'Hide Photo Footprints' : 'Show Photo Footprints';
    updateFlightPath();
});

// Function to update waypoints and flight path visualization
function updateFlightPath() {
    // Clear existing waypoints, paths, and footprints
    waypointMarkers.forEach(marker => map.removeLayer(marker));
    waypointMarkers = [];
    flightPaths.forEach(path => map.removeLayer(path));
    flightPaths = [];
    footprintPolygons.forEach(footprint => map.removeLayer(footprint));
    footprintPolygons = [];

    // If we don't have a polygon or home point, return
    if (!polygon || !homePoint) return;

    // Get current mission parameters
    const drone = document.getElementById('droneModel').value;
    const altitude = parseFloat(document.getElementById('altitude').value);
    const heading = parseFloat(document.getElementById('heading').value);
    const frontOverlap = parseFloat(document.getElementById('frontOverlap').value);
    const sideOverlap = parseFloat(document.getElementById('sideOverlap').value);

    // Calculate waypoints - now returns array of rows
    const rows = calculateGridWaypoints(polygon, heading, frontOverlap, sideOverlap, altitude, drone);

    // Create waypoint markers and collect coordinates for the path
    const missionCoordinates = [];
    let waypointNumber = 1;

    // Process each row
    rows.forEach(row => {
        // Add all points in the row
        row.forEach(point => {
            // Create numbered circle marker
            const waypointIcon = L.divIcon({
                className: 'waypoint-icon',
                html: `<div class="waypoint-circle">${waypointNumber}</div>`,
                iconSize: [24, 24]
            });

            const marker = L.marker(point, { icon: waypointIcon }).addTo(map);
            waypointMarkers.push(marker);
            missionCoordinates.push(point);
            
            // Add photo footprint if enabled
            if (showingFootprints) {
                const footprintCorners = calculatePhotoFootprint(point, heading, altitude, drone);
                const footprint = L.polygon(footprintCorners, {
                    color: '#3498db',
                    weight: 1,
                    opacity: 0.5,
                    fillOpacity: 0.2
                }).addTo(map);
                footprintPolygons.push(footprint);
            }
            
            waypointNumber++;
        });
    });

    // Draw the paths
    if (missionCoordinates.length > 0) {
        // Path from home to first waypoint
        const startPath = L.polyline([homePoint, missionCoordinates[0]], {
            color: '#2ecc71', // Green color
            weight: 3,
            opacity: 1,
            dashArray: '8, 8'
        }).addTo(map);
        flightPaths.push(startPath);

        // Mission path
        const missionPath = L.polyline(missionCoordinates, {
            color: '#e74c3c', // Red color
            weight: 3,
            opacity: 1,
            dashArray: '8, 8'
        }).addTo(map);
        flightPaths.push(missionPath);

        // Path from last waypoint back to home
        const endPath = L.polyline([missionCoordinates[missionCoordinates.length - 1], homePoint], {
            color: '#2ecc71', // Green color
            weight: 3,
            opacity: 1,
            dashArray: '8, 8'
        }).addTo(map);
        flightPaths.push(endPath);
    }
}

// Add event listeners for parameter changes
const missionParams = ['droneModel', 'gsd', 'frontOverlap', 'sideOverlap', 'heading', 'cameraTilt', 'altitude'];
missionParams.forEach(param => {
    document.getElementById(param).addEventListener('input', updateFlightPath);
}); 