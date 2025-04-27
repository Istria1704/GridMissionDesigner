let droneModels = {};

// Load drone models from JSON file
fetch('droneModels.json')
    .then(response => response.json())
    .then(data => {
        droneModels = data;
        // Populate drone model dropdown after loading the data
        const droneModelSelect = document.getElementById('droneModel');
        Object.keys(droneModels).forEach(model => {
            const option = document.createElement('option');
            option.value = model;
            option.textContent = model;
            droneModelSelect.appendChild(option);
        });
    })
    .catch(error => console.error('Error loading drone models:', error));

// Calculate GSD (Ground Sampling Distance) in cm/pixel
function calculateGSD(altitude, drone) {
    const camera = droneModels[drone].camera;
    // GSD = (pixel size * height) / focal length
    const pixelSize = (camera.sensorWidth / camera.imageWidth) * 1000; // in micrometers
    return (pixelSize * altitude) / (camera.focalLength * 10);
}

// Calculate altitude from desired GSD
function calculateAltitude(gsd, drone) {
    const camera = droneModels[drone].camera;
    const pixelSize = (camera.sensorWidth / camera.imageWidth) * 1000; // in micrometers
    return (gsd * camera.focalLength * 10) / pixelSize;
}

// Calculate image footprint at given altitude
function calculateFootprint(altitude, drone) {
    const camera = droneModels[drone].camera;
    const groundWidth = (altitude * camera.sensorWidth) / camera.focalLength;
    const groundHeight = (altitude * camera.sensorHeight) / camera.focalLength;
    return { width: groundWidth, height: groundHeight };
} 