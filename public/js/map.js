let villageMap = null;
let currentMarkers = [];
let selectedLatLng = null;

function initVillageMap(onMapClickCallback) {
  // Village Center (e.g., central Maharashtra location representing a village)
  const defaultCenter = [18.9168, 74.3023];
  
  if (villageMap) {
    villageMap.remove();
  }

  // Initialize the Leaflet map
  villageMap = L.map('village-map').setView(defaultCenter, 15);

  // Load OpenStreetMap tiles
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '© OpenStreetMap contributors'
  }).addTo(villageMap);

  // Listen for clicks on the map to allow adding custom pins
  villageMap.on('click', function(e) {
    selectedLatLng = e.latlng;
    if (onMapClickCallback) {
      onMapClickCallback(e.latlng.lat, e.latlng.lng);
    }
  });

  // Load existing landmarks from database
  loadMapLandmarks();
}

async function loadMapLandmarks() {
  try {
    const response = await fetch('/api/landmarks');
    if (!response.ok) throw new Error('Failed to fetch landmarks');
    const landmarks = await response.ok ? await response.json() : [];

    // Clear existing markers
    currentMarkers.forEach(marker => villageMap.removeLayer(marker));
    currentMarkers = [];

    // Icon definitions depending on landmark type
    const icons = {
      well: L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-blue.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      }),
      temple: L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-orange.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      }),
      farm: L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-green.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      }),
      historical: L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-violet.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      }),
      other: L.icon({
        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-grey.png',
        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
      })
    };

    // Plot each landmark on the map
    landmarks.forEach(landmark => {
      const typeLabel = window.getCurrentTranslation ? window.getCurrentTranslation(landmark.type) : landmark.type;
      const markerIcon = icons[landmark.type] || icons.other;
      
      const popupContent = `
        <div style="font-family: 'Outfit', sans-serif; min-width: 200px;">
          <h5 style="margin: 0 0 5px 0; color: #C05C3E;">${landmark.title}</h5>
          <span class="badge" style="background-color: #F7EAD5; color: #8c5b0d; margin-bottom: 8px;">${typeLabel}</span>
          <p style="margin: 0 0 10px 0; font-size: 0.9rem;">${landmark.description}</p>
          <div style="font-size: 0.8rem; color: #6B5E55;">
            <strong>Added by:</strong> ${landmark.contributor_name || 'Anonymous'}
          </div>
        </div>
      `;

      const marker = L.marker([landmark.latitude, landmark.longitude], { icon: markerIcon })
        .bindPopup(popupContent)
        .addTo(villageMap);
      
      currentMarkers.push(marker);
    });

  } catch (error) {
    console.error('Error loading map landmarks:', error);
  }
}

async function submitMapLandmark(title, description, type, contributorName) {
  if (!selectedLatLng) {
    alert('Please click on the map to select a location first.');
    return false;
  }

  try {
    const response = await fetch('/api/landmarks', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title,
        description,
        type,
        latitude: selectedLatLng.lat,
        longitude: selectedLatLng.lng,
        contributor_name: contributorName
      })
    });

    if (!response.ok) {
      const err = await response.json();
      throw new Error(err.error || 'Failed to submit landmark');
    }

    selectedLatLng = null;
    await loadMapLandmarks();
    return true;
  } catch (error) {
    console.error('Error submitting landmark:', error);
    alert(error.message);
    return false;
  }
}
