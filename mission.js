// Calculate grid waypoints
function calculateGridWaypoints(polygon, heading, frontOverlap, sideOverlap, altitude, drone) {
    if (!polygon || polygonPoints.length < 3) return [];
    
    // Calculate image footprint
    const footprint = calculateFootprint(altitude, drone);
    
    // Calculate distance between lines based on side overlap
    const lineSpacing = footprint.width * (1 - sideOverlap / 100);
    
    // Calculate distance between photos based on front overlap
    const photoSpacing = footprint.height * (1 - frontOverlap / 100);
    
    // Convert heading to radians (negative for clockwise rotation)
    const headingRad = (-heading + 90) * Math.PI / 180;
    
    // Get bounds of the polygon
    const bounds = L.latLngBounds(polygonPoints);
    const center = bounds.getCenter();
    
    // Create a grid of points
    const rows = [];
    let currentLine = -bounds.getNorthWest().distanceTo(bounds.getSouthEast()) / 2;
    
    while (currentLine <= bounds.getNorthWest().distanceTo(bounds.getSouthEast()) / 2) {
        const linePoints = [];
        let currentPoint = -bounds.getNorthEast().distanceTo(bounds.getSouthWest()) / 2;
        
        while (currentPoint <= bounds.getNorthEast().distanceTo(bounds.getSouthWest()) / 2) {
            // Calculate point position
            const x = currentPoint * Math.cos(headingRad) - currentLine * Math.sin(headingRad);
            const y = currentPoint * Math.sin(headingRad) + currentLine * Math.cos(headingRad);
            
            const point = L.latLng(
                center.lat + (y / 111111),
                center.lng + (x / (111111 * Math.cos(center.lat * Math.PI / 180)))
            );
            
            // Check if point is inside polygon
            if (polygon.getBounds().contains(point) && isPointInPolygon(point, polygonPoints)) {
                linePoints.push(point);
            }
            
            currentPoint += photoSpacing;
        }
        
        // Only add rows that have points
        if (linePoints.length > 0) {
            // Alternate direction for each row (lawn mower pattern)
            if (rows.length % 2 === 1) {
                linePoints.reverse();
            }
            rows.push(linePoints);
        }
        
        currentLine += lineSpacing;
    }
    
    return rows;
}

// Check if point is inside polygon
function isPointInPolygon(point, polygon) {
    let inside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const xi = polygon[i].lat, yi = polygon[i].lng;
        const xj = polygon[j].lat, yj = polygon[j].lng;
        
        const intersect = ((yi > point.lng) !== (yj > point.lng))
            && (point.lat < (xj - xi) * (point.lng - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    
    return inside;
}

// Export mission to Litchi CSV format
function exportMission() {
    if (!homePoint || !polygon) {
        alert('Please set home point and draw mission area first');
        return;
    }
    
    const drone = document.getElementById('droneModel').value;
    const altitude = parseFloat(document.getElementById('altitude').value);
    const heading = parseFloat(document.getElementById('heading').value);
    const frontOverlap = parseFloat(document.getElementById('frontOverlap').value);
    const sideOverlap = parseFloat(document.getElementById('sideOverlap').value);
    const cameraTilt = parseFloat(document.getElementById('cameraTilt').value);
    const hoverTime = parseFloat(document.getElementById('hoverTime').value);
    
    // Get speed values in km/h and convert to m/s
    const transitSpeed = parseFloat(document.getElementById('transitSpeed').value) * (1000/3600); // km/h to m/s
    const waypointSpeed = parseFloat(document.getElementById('waypointSpeed').value) * (1000/3600); // km/h to m/s
    
    const waypoints = calculateGridWaypoints(polygon, heading, frontOverlap, sideOverlap, altitude, drone);
    
    if (waypoints.length === 0) {
        alert('No waypoints generated. Please check mission parameters.');
        return;
    }
    
    // Litchi CSV header
    const csvContent = [
        'latitude;longitude;altitude(m);heading(deg);curvesize(m);rotationdir;gimbalmode;gimbalpitchangle;actiontype1;actionparam1;actiontype2;actionparam2;actiontype3;actionparam3;actiontype4;actionparam4;actiontype5;actionparam5;actiontype6;actionparam6;actiontype7;actionparam7;actiontype8;actionparam8;actiontype9;actionparam9;actiontype10;actionparam10;actiontype11;actionparam11;actiontype12;actionparam12;actiontype13;actionparam13;actiontype14;actionparam14;actiontype15;actionparam15;altitudemode;speed(m/s);poi_latitude;poi_longitude;poi_altitude(m);poi_altitudemode;photo_timeinterval;photo_distinterval'
    ];
    
    // Add home point as first waypoint with tilt camera action
    csvContent.push(`${homePoint.lat};${homePoint.lng};${altitude};${heading};0.2;0;0;${cameraTilt};5;${cameraTilt};-1;0;-1;0;-1;0;-1;0;-1;0;-1;0;-1;0;-1;0;-1;0;-1;0;-1;0;-1;0;-1;0;-1;0;1;${transitSpeed.toFixed(1)};0;0;0;0;-1;-1`);
    
    // Add mission waypoints with hover and photo actions
    waypoints.forEach(row => {
        row.forEach(point => {
            csvContent.push(`${point.lat};${point.lng};${altitude};${heading};0.2;0;0;${cameraTilt};0;${hoverTime*1000};1;0;-1;0;-1;0;-1;0;-1;0;-1;0;-1;0;-1;0;-1;0;-1;0;-1;0;-1;0;-1;0;-1;0;1;${waypointSpeed.toFixed(1)};0;0;0;0;-1;-1`);
        });
    });
    
    // Add return to home as last waypoint with tilt camera action
    csvContent.push(`${homePoint.lat};${homePoint.lng};${altitude};${heading};0.2;0;0;${cameraTilt};5;${cameraTilt};-1;0;-1;0;-1;0;-1;0;-1;0;-1;0;-1;0;-1;0;-1;0;-1;0;-1;0;-1;0;-1;0;-1;0;1;${transitSpeed.toFixed(1)};0;0;0;0;-1;-1`);
    
    // Create and trigger download
    const blob = new Blob([csvContent.join('\n')], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('hidden', '');
    a.setAttribute('href', url);
    a.setAttribute('download', 'mission.csv');
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    window.URL.revokeObjectURL(url);
} 