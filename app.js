// Flight Radar Finland Logic

// Constants
const FINLAND_BOUNDS = {
    lamin: 59.5,
    lomin: 19.5,
    lamax: 70.1,
    lomax: 31.5
};

const OPENSKY_URL = `https://opensky-network.org/api/states/all`;

const REFRESH_INTERVAL = 30; // seconds

// State
let map;
let markers = {}; // Store markers by icao24
let selectedFlight = null;
let timerValue = REFRESH_INTERVAL;

// Initialize Map
function initMap() {
    map = L.map('map', {
        zoomControl: false,
        attributionControl: false
    }).setView([64.0, 26.0], 5); // Center of Finland

    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19
    }).addTo(map);

    L.control.zoom({ position: 'bottomright' }).addTo(map);
}

// Fetch Data
async function fetchFlights() {
    const statusEl = document.getElementById('status');
    statusEl.textContent = 'Updating flights...';

    try {
        const response = await fetch(OPENSKY_URL);
        if (!response.ok) throw new Error('API Rate limit or error');

        const data = await response.json();
        processFlights(data.states || []);
        statusEl.textContent = `Live: ${data.states ? data.states.length : 0} flights over Finland`;
    } catch (error) {
        console.error('Fetch error:', error);
        statusEl.textContent = 'Offline (Rate limited?)';
    }
}

// Process and Update Markers
function processFlights(states) {
    const currentIcaos = new Set();

    states.forEach(state => {
        const [icao24, callsign, origin, timePosition, lastContact, lon, lat, baroAltitude, onGround, velocity, trueTrack] = state;

        if (lat && lon) {
            currentIcaos.add(icao24);
            updateMarker(icao24, lat, lon, callsign, trueTrack, { origin, altitude: baroAltitude, velocity });
        }
    });

    // Remove markers for planes no longer in the area
    Object.keys(markers).forEach(icao => {
        if (!currentIcaos.has(icao)) {
            map.removeLayer(markers[icao]);
            delete markers[icao];
        }
    });
}

// Update or Create Marker
function updateMarker(icao, lat, lon, callsign, track, details) {
    const planeSvg = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" style="transform: rotate(${track || 0}deg)">
            <path d="M21 16L21 14L13 9L13 3.5C13 2.67 12.33 2 11.5 2C10.67 2 10 2.67 10 3.5L10 9L2 14L2 16L10 13.5L10 19L8 20.5L8 22L11.5 21L15 22L15 20.5L13 19L13 13.5L21 16Z" fill="#4cc9f0"/>
        </svg>
    `;

    const icon = L.divIcon({
        className: 'plane-marker',
        html: `<div class="plane-icon">${planeSvg}</div>`,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
    });

    if (markers[icao]) {
        markers[icao].setLatLng([lat, lon]);
        markers[icao].setIcon(icon);
    } else {
        const marker = L.marker([lat, lon], { icon }).addTo(map);
        marker.on('click', () => showDetails(callsign, details));
        markers[icao] = marker;
    }
}

// Show Flight Details
function showDetails(callsign, details) {
    selectedFlight = callsign;
    const panel = document.getElementById('flight-details');
    document.getElementById('callsign').textContent = callsign?.trim() || 'N/A';
    document.getElementById('altitude').textContent = details.altitude ? `${Math.round(details.altitude)} m` : 'N/A';
    document.getElementById('speed').textContent = details.velocity ? `${Math.round(details.velocity * 3.6)} km/h` : 'N/A';
    document.getElementById('origin').textContent = details.origin || 'Unknown';

    panel.classList.remove('hidden');
}

// Timer Logic
function startTimer() {
    setInterval(() => {
        timerValue--;
        if (timerValue <= 0) {
            fetchFlights();
            timerValue = REFRESH_INTERVAL;
        }
        document.getElementById('timer').textContent = timerValue;
    }, 1000);
}

// Event Listeners
document.querySelector('.close-btn').addEventListener('click', () => {
    document.getElementById('flight-details').classList.add('hidden');
});

document.getElementById('refresh-btn').addEventListener('click', () => {
    timerValue = REFRESH_INTERVAL;
    fetchFlights();
});

// App Entry Point
window.onload = () => {
    initMap();
    fetchFlights();
    startTimer();
};

// CSS Injection for plane icons (dynamic rotation)
const style = document.createElement('style');
style.innerHTML = `
    .plane-icon {
        font-size: 20px;
        text-shadow: 0 0 5px rgba(0,0,0,0.5);
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.5s linear;
    }
`;
document.head.appendChild(style);
