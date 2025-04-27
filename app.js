// Initialize drone model dropdown
const droneSelect = document.getElementById('droneModel');

// Function to calculate minimum altitude based on minimum GSD
function calculateMinimumAltitude(drone) {
    if (!isDataLoaded || !droneModels[drone]) return 30; // Default minimum altitude
    const minGSD = 0.5; // minimum GSD in cm/px
    return calculateAltitude(minGSD, drone);
}

// Function to update altitude limits
function updateAltitudeLimits() {
    const drone = document.getElementById('droneModel').value;
    if (!isDataLoaded || !droneModels[drone]) return;
    
    const minAltitude = Math.ceil(calculateMinimumAltitude(drone));
    
    altitudeSlider.min = minAltitude;
    altitudeInput.min = minAltitude;
    
    // If current altitude is below new minimum, update it
    if (parseFloat(altitudeSlider.value) < minAltitude) {
        altitudeSlider.value = minAltitude;
        altitudeInput.value = minAltitude;
        updateGSDFromAltitude();
        updateFlightPath();
    }
}

// Initialize sliders and their value displays
const sliders = ['gsd', 'frontOverlap', 'sideOverlap', 'heading', 'cameraTilt', 'transitSpeed', 'waypointSpeed'];
sliders.forEach(id => {
    const slider = document.getElementById(id);
    const valueInput = document.getElementById(`${id}Value`);
    
    // Initialize the value input with the slider's current value
    valueInput.value = slider.value;
    
    // Update input when slider changes
    slider.addEventListener('input', () => {
        valueInput.value = slider.value;
        if (id === 'gsd') {
            updateAltitudeFromGSD();
        }
        updateFlightPath();
    });

    // Update slider when input changes
    valueInput.addEventListener('input', () => {
        const value = parseFloat(valueInput.value);
        if (!isNaN(value) && value >= slider.min && value <= slider.max) {
            slider.value = value;
            if (id === 'gsd') {
                updateAltitudeFromGSD();
            }
            updateFlightPath();
        }
    });
});

// Add altitude slider event listener
const altitudeSlider = document.getElementById('altitude');
const altitudeInput = document.getElementById('altitudeValue');
let isUpdatingGSD = false; // Flag to prevent recursive updates

// Initialize altitude input with slider value and limits
altitudeInput.value = altitudeSlider.value;
updateAltitudeLimits();

// Update input when slider changes
altitudeSlider.addEventListener('input', () => {
    altitudeInput.value = altitudeSlider.value;
    if (!isUpdatingGSD) {
        updateGSDFromAltitude();
    }
    updateFlightPath();
});

// Update slider when input changes
altitudeInput.addEventListener('input', () => {
    const value = parseFloat(altitudeInput.value);
    if (!isNaN(value) && value >= altitudeSlider.min && value <= altitudeSlider.max) {
        altitudeSlider.value = value;
        if (!isUpdatingGSD) {
            updateGSDFromAltitude();
        }
        updateFlightPath();
    }
});

// Update altitude based on GSD
function updateAltitudeFromGSD() {
    const gsd = parseFloat(document.getElementById('gsd').value);
    const drone = document.getElementById('droneModel').value;
    
    if (gsd && drone && isDataLoaded && droneModels[drone]) {
        const altitude = calculateAltitude(gsd, drone);
        isUpdatingGSD = true; // Prevent recursive updates
        altitudeSlider.value = Math.round(altitude);
        altitudeInput.value = Math.round(altitude);
        isUpdatingGSD = false;
    }
}

// Update GSD based on altitude
function updateGSDFromAltitude() {
    const altitude = parseFloat(altitudeSlider.value);
    const drone = document.getElementById('droneModel').value;
    
    if (altitude && drone && isDataLoaded && droneModels[drone]) {
        const gsd = calculateGSD(altitude, drone);
        const gsdSlider = document.getElementById('gsd');
        const gsdInput = document.getElementById('gsdValue');
        
        // Round GSD to 2 decimal places
        const roundedGSD = Math.round(gsd * 40) / 40;
        
        // Only update if within slider range
        if (roundedGSD >= gsdSlider.min && roundedGSD <= gsdSlider.max) {
            gsdSlider.value = roundedGSD;
            gsdInput.value = roundedGSD;
        }
    }
}

// Add event listener for drone model changes
droneSelect.addEventListener('change', () => {
    updateAltitudeLimits();
    updateAltitudeFromGSD();
    updateFlightPath();
});

// Add event listener for export
document.getElementById('exportMission').addEventListener('click', exportMission); 