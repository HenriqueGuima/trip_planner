let markers = []; // nearby place markers
let tripMarkers = []; // saved trip markers

const placeCategories = {
  "bar": { type: "bar", keyword: null, icon: "🍸", color: "#ff6b6b" },
  "sauna": { type: null, keyword: "sauna", icon: "♨️", color: "#ffb86b" },
  "museum": { type: "museum", keyword: null, icon: "🏛️", color: "#6b8bff" },
  "vegan restaurant": { type: null, keyword: "vegan restaurant", icon: "🥗", color: "#6bff8b" }
};

// Dark / night map style (preserve markers and route colors)
const darkMapStyle = [
    {
        "elementType": "geometry",
        "stylers": [
            { "color": "#242f3e" }
        ]
    },
    {
        "elementType": "labels.text.fill",
        "stylers": [
            { "color": "#746855" }
        ]
    },
    {
        "elementType": "labels.text.stroke",
        "stylers": [
            { "color": "#242f3e" }
        ]
    },
    {
        "featureType": "administrative.locality",
        "elementType": "labels.text.fill",
        "stylers": [
            { "color": "#d59563" }
        ]
    },
    {
        "featureType": "poi",
        "elementType": "labels.text.fill",
        "stylers": [
            { "color": "#d59563" }
        ]
    },
    {
        "featureType": "poi.park",
        "elementType": "geometry",
        "stylers": [
            { "color": "#263c3f" }
        ]
    },
    {
        "featureType": "poi.park",
        "elementType": "labels.text.fill",
        "stylers": [
            { "color": "#6b9a76" }
        ]
    },
    {
        "featureType": "road",
        "elementType": "geometry",
        "stylers": [
            { "color": "#38414e" }
        ]
    },
    {
        "featureType": "road",
        "elementType": "geometry.stroke",
        "stylers": [
            { "color": "#212a37" }
        ]
    },
    {
        "featureType": "road",
        "elementType": "labels.text.fill",
        "stylers": [
            { "color": "#9ca5b3" }
        ]
    },
    {
        "featureType": "road.highway",
        "elementType": "geometry",
        "stylers": [
            { "color": "#746855" }
        ]
    },
    {
        "featureType": "road.highway",
        "elementType": "geometry.stroke",
        "stylers": [
            { "color": "#1f2835" }
        ]
    },
    {
        "featureType": "road.highway",
        "elementType": "labels.text.fill",
        "stylers": [
            { "color": "#f3d19c" }
        ]
    },
    {
        "featureType": "transit",
        "elementType": "geometry",
        "stylers": [
            { "color": "#2f3948" }
        ]
    },
    {
        "featureType": "transit.station",
        "elementType": "labels.text.fill",
        "stylers": [
            { "color": "#d59563" }
        ]
    },
    {
        "featureType": "water",
        "elementType": "geometry",
        "stylers": [
            { "color": "#17263c" }
        ]
    },
    {
        "featureType": "water",
        "elementType": "labels.text.fill",
        "stylers": [
            { "color": "#515c6d" }
        ]
    },
    {
        "featureType": "water",
        "elementType": "labels.text.stroke",
        "stylers": [
            { "color": "#17263c" }
        ]
    }
];

function initMap() {
    const defaultLocation = { lat: 60.1708, lng: 24.9410 };

    map = new google.maps.Map(document.getElementById("map"), {
        zoom: 12,
        center: defaultLocation,
        styles: darkMapStyle
    });

    // create InfoWindow after the API is loaded
    infoWindow = new google.maps.InfoWindow();
    showNearbyPlaces(defaultLocation);
    directionsService = new google.maps.DirectionsService();

    // Add Google Places Autocomplete to home and destination inputs
    autocompleteHome = new google.maps.places.Autocomplete(
        document.getElementById('home'),
        { types: ['geocode'] }
    );
    autocompleteDestination = new google.maps.places.Autocomplete(
        document.getElementById('destination'),
        { types: ['geocode'] }
    );

    document.querySelectorAll('.place-filter').forEach(checkbox => {
        checkbox.addEventListener('change', updateMarkers);
    });

    // initialize flatpickr range picker
    if (typeof flatpickr !== 'undefined') {
        flatpickr('#dateRange', {
            mode: 'range',
            dateFormat: 'Y-m-d',
            onClose: function(selectedDates, dateStr, instance) {

                if (selectedDates.length === 2) {
                    const start = selectedDates[0].toISOString().slice(0,10);
                    const end = selectedDates[1].toISOString().slice(0,10);
                    
                    fetchTrips().then(() => {
                        applyDateRangeFilter(start, end);
                    });

                } else if (selectedDates.length === 1) {
                    const start = selectedDates[0].toISOString().slice(0,10);
                    fetchTrips().then(() => applyDateRangeFilter(start, start));
                }
            }
        });

        document.getElementById('clearRange').addEventListener('click', () => {
            const fp = document.querySelector('#dateRange')._flatpickr;
            if (fp) fp.clear();
            // reload full list
            fetchTrips().then(() => renderTrips(currentTrips));
        });

        // initialize flatpickr for trip creation & edit in 24h format
        flatpickr('#datetime', {
            enableTime: true,
            time_24hr: true,
            dateFormat: 'Y-m-d H:i',
            allowInput: false
        });
        flatpickr('#editDatetime', {
            enableTime: true,
            time_24hr: true,
            dateFormat: 'Y-m-d H:i',
            allowInput: false
        });
     }

     fetchTrips();
}

function formatDateTimeString(dt) {
    if (!dt) return '';
    const parsed = new Date(dt.replace(' ', 'T'));
    if (isNaN(parsed)) return dt;
    return parsed.toLocaleString();
}

function clearMarkers() {
    markers.forEach(m => m.setMap(null));
    markers = [];
}


function clearTripMarkers() {
    tripMarkers.forEach(m => m.setMap(null));
    tripMarkers = [];
}
// Returns an adapter with Promise-based methods { searchNearby(opts): Promise, fetchFields(opts): Promise }
async function getPlacesAdapter(mapInstance) {
    // Prefer the new Place class via dynamic importLibrary if available
    if (window.google && typeof google.maps.importLibrary === 'function') {
        try {
            const lib = await google.maps.importLibrary('places');
            const Place = lib.Place || lib.PlaceClient || lib.default?.Place;
            if (typeof Place === 'function') {
                const client = new Place();
                // The new Place API uses Promises and methods like searchNearby and fetchFields
                return {
                    searchNearby: (opts) => client.searchNearby(opts),
                    fetchFields: (opts) => client.fetchFields(opts)
                };
            }
        } catch (e) {
            // fall through to legacy fallback
        }
    }

    // Legacy fallback: adapt PlacesService (callback-based) to Promises
    if (window.google && google.maps && google.maps.places && typeof google.maps.places.PlacesService === 'function') {
        const svc = new google.maps.places.PlacesService(mapInstance);
        return {
            searchNearby: (opts) => new Promise((resolve, reject) => {
                svc.nearbySearch(opts, (results, status) => {
                    if (status === google.maps.places.PlacesServiceStatus.OK) resolve(results);
                    else reject(status);
                });
            }),
            fetchFields: (opts) => new Promise((resolve, reject) => {
                svc.getDetails(opts, (place, status) => {
                    if (status === google.maps.places.PlacesServiceStatus.OK) resolve(place);
                    else reject(status);
                });
            })
        };
    }

    // Minimal shim if neither API is available
    return {
        searchNearby: async () => [],
        fetchFields: async () => null
    };
}

async function showNearbyPlaces(location) {
    // get a Promise-based adapter (Place or wrapped PlacesService)
    const adapter = await getPlacesAdapter(map);
    // Clear previous nearby markers
    clearMarkers();

    Object.keys(placeCategories).forEach(category => {
        const cat = placeCategories[category];

        adapter.searchNearby({
            location: location,
            radius: 2000,
            type: cat.type,
            keyword: cat.keyword
        }).then(results => {
            if (Array.isArray(results)) {
                results.forEach(result => {
                    // Build an SVG pin with the category color and emoji inside
                    const svg = `<?xml version="1.0" encoding="UTF-8"?><svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'>` +
                        `<path d='M32 2C20 2 10 12 10 24c0 12 22 36 22 36s22-24 22-36C54 12 44 2 32 2z' fill='${cat.color}'/>` +
                        `<circle cx='32' cy='24' r='9' fill='%23ffffff'/>` +
                        `<text x='32' y='29' font-size='18' text-anchor='middle' alignment-baseline='middle'>${cat.icon}</text>` +
                        `</svg>`;

                    const url = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);

                    const marker = new google.maps.Marker({
                        position: result.geometry.location,
                        map: map,
                        title: result.name,
                        icon: {
                            url: url,
                            scaledSize: new google.maps.Size(36, 36),
                            anchor: new google.maps.Point(18, 36)
                        },
                        optimized: false
                    });

                    // store category and placeId for filtering and details
                    marker.category = category;
                    marker.placeId = result.place_id || result.placeId;

                    // When clicked, fetch place details and show in infoWindow
                    marker.addListener('click', async () => {
                        try {
                            const place = await adapter.fetchFields({ placeId: marker.placeId, fields: ['name','formatted_address','rating','website','formatted_phone_number','photos','formatted_phone_number'] });
                            if (place) {
                                // build photo URL if available
                                let photoUrl = '';
                                if (place.photos && place.photos.length) {
                                    try {
                                        // For legacy photos API, keep getUrl; for new API ensure method exists
                                        photoUrl = typeof place.photos[0].getUrl === 'function' ? place.photos[0].getUrl({ maxWidth: 300 }) : (place.photos[0].url || '');
                                    } catch (e) {
                                        photoUrl = '';
                                    }
                                }

                                // find scheduled trips that match this place (loose, case-insensitive match)
                                const matches = (currentTrips || []).filter(t => {
                                    const dest = (t.destination || '').toLowerCase();
                                    const name = ((place.name || place.name) || '').toLowerCase();
                                    const addr = ((place.formatted_address || place.formattedAddress) || '').toLowerCase();
                                    return (name && dest.includes(name)) || (dest && name.includes(dest)) || (addr && dest.includes(addr)) || (dest && addr.includes(dest));
                                });

                                const scheduledHtml = matches.length ? `<div style="margin-top:8px"><strong>Scheduled:</strong><ul style="margin:4px 0 0 16px;padding:0">${matches.map(m => `<li>${formatDateTimeString(m.datetime)} — ${m.destination}</li>`).join('')}</ul></div>` : `<div style="margin-top:8px;color:#6c757d"><em>No scheduled trips</em></div>`;

                                const content = `\n<div style="min-width:200px">\n  ${photoUrl ? `<div style="text-align:center;margin-bottom:8px"><img src="${photoUrl}" alt="${place.name || ''}" style="max-width:100%;height:auto;border-radius:6px"></div>` : ''}\n  <h5>${place.name || ''}</h5>\n  <div>${place.formatted_address || ''}</div>\n  <div>Rating: ${place.rating || 'N/A'}</div>\n  ${place.website ? `<div><a href="${place.website}" target="_blank">Website</a></div>` : ''}\n  ${place.formatted_phone_number ? `<div>Phone: ${place.formatted_phone_number}</div>` : ''}\n  ${scheduledHtml}\n</div>\n`;
                                infoWindow.setContent(content);
                                infoWindow.open(map, marker);
                            } else {
                                infoWindow.setContent('Details not available');
                                infoWindow.open(map, marker);
                            }
                        } catch (err) {
                            infoWindow.setContent('Details not available');
                            infoWindow.open(map, marker);
                        }
                    });

                    markers.push(marker);
                });
            }
        });
    });
}

function renderTripMarkers(trips) {
    if (!map || !Array.isArray(trips)) return;
    clearTripMarkers();
    const geocoder = new google.maps.Geocoder();

    trips.forEach(t => {
        // Geocode the trip destination (use destination string)
        geocoder.geocode({ address: t.destination }, (results, status) => {
            if (status === 'OK' && results[0]) {
                const loc = results[0].geometry.location;
                // simple blue pin svg
                const svg = `<?xml version="1.0" encoding="UTF-8"?><svg xmlns='http://www.w3.org/2000/svg' width='48' height='48' viewBox='0 0 24 24'>` +
                    `<path d='M12 2C8 2 5 5 5 9c0 6 7 11 7 11s7-5 7-11c0-4-3-7-7-7z' fill='#2b8cff'/>` +
                    `<circle cx='12' cy='9' r='3' fill='%23ffffff'/>` +
                    `</svg>`;
                const url = 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);

                const m = new google.maps.Marker({
                    position: loc,
                    map: map,
                    title: t.destination,
                    icon: { url: url, scaledSize: new google.maps.Size(28, 28), anchor: new google.maps.Point(14, 28) },
                    optimized: false
                });
                m.tripId = t.id;
                m.tripDatetime = t.datetime;
                m.tripDestination = t.destination;
                m.tripHome = t.home;

                m.addListener('click', () => {
                    const content = `
                        <div style="min-width:220px">
                          <h5>${t.destination}</h5>
                          <div>From: ${t.home}</div>
                          <div><strong>Scheduled:</strong> ${formatDateTimeString(t.datetime)}</div>
                          <div style="margin-top:6px"><button class="btn btn-sm btn-outline-primary" onclick="window.scrollTo(0,0)">Open Trip List</button></div>
                        </div>
                    `;
                    infoWindow.setContent(content);
                    infoWindow.open(map, m);
                });

                tripMarkers.push(m);
            }
        });
    });
}

async function drawRoute(trips) {
    clearDirections();
    if (!trips || trips.length === 0) return;

    // sort trips by datetime then group by date (YYYY-MM-DD)
    const sorted = trips.slice().sort((a, b) => new Date((a.datetime || '').replace(' ', 'T')) - new Date((b.datetime || '').replace(' ', 'T')));
    const groups = {};
    sorted.forEach(t => {
        const dateKey = (t.datetime || '').split(' ')[0] || 'undated';
        if (!groups[dateKey]) groups[dateKey] = [];
        groups[dateKey].push(t);
    });

    // color palette for days
    const colors = ['#2b8cff', '#ff6b6b', '#6b8bff', '#6bff8b', '#ffa94d', '#845ef7', '#ff6fbf'];
    let idx = 0;

    // helper to request directions as a Promise
    const requestRoute = (opts) => new Promise((resolve) => {
        directionsService.route(opts, (res, status) => resolve({ res, status }));
    });

    const hasFerry = (res) => {
        if (!res || !res.routes) return false;
        for (const route of res.routes) {
            for (const leg of route.legs || []) {
                for (const step of leg.steps || []) {
                    if (step.travel_mode === 'TRANSIT' && step.transit && step.transit.line && step.transit.line.vehicle && String(step.transit.line.vehicle.type).toUpperCase() === 'FERRY') return true;
                    // Some implementations may use vehicle.type 'FERRY' or 'Boat' (be permissive)
                    if (step.travel_mode === 'TRANSIT' && step.transit && step.transit.line && step.transit.line.vehicle && /ferry|boat/i.test(step.transit.line.vehicle.type)) return true;
                }
            }
        }
        return false;
    };

    for (const dateKey of Object.keys(groups)) {
        const dayTrips = groups[dateKey];
        if (!dayTrips || dayTrips.length === 0) continue;

        const origin = dayTrips[0].home || dayTrips[0].destination;
        const destination = dayTrips[dayTrips.length - 1].destination || origin;
        const waypoints = dayTrips.slice(0, -1).map(t => ({ location: t.destination, stopover: true }));

        const color = colors[idx % colors.length];
        idx += 1;

        const renderer = new google.maps.DirectionsRenderer({
            map: map,
            suppressMarkers: false,
            preserveViewport: true,
            polylineOptions: { strokeColor: color, strokeOpacity: 0.9, strokeWeight: 5 }
        });

        // Request both driving and transit (transit may include ferries). Prefer transit with ferry if available.
        try {
            const drivingPromise = requestRoute({ origin, destination, waypoints, travelMode: google.maps.TravelMode.DRIVING });
            const transitPromise = requestRoute({ origin, destination, waypoints, travelMode: google.maps.TravelMode.TRANSIT });

            const [driveResp, transitResp] = await Promise.all([drivingPromise, transitPromise]);

            const driveOk = driveResp.status === 'OK';
            const transitOk = transitResp.status === 'OK';

            // If transit has a ferry segment, prefer it
            if (transitOk && hasFerry(transitResp.res)) {
                renderer.setDirections(transitResp.res);
            } else if (driveOk) {
                renderer.setDirections(driveResp.res);
            } else if (transitOk) {
                renderer.setDirections(transitResp.res);
            } else {
                console.warn('Route failed for', dateKey, driveResp.status, transitResp.status);
                try { renderer.setMap(null); } catch (e) {}
            }
        } catch (e) {
            console.warn('Routing error for', dateKey, e);
            try { renderer.setMap(null); } catch (e) {}
        }

        directionsRenderers.push(renderer);
    }
}

function updateMarkers() {
    const checked = Array.from(document.querySelectorAll('.place-filter:checked'))
        .map(cb => cb.value);

    markers.forEach(marker => {
        if (checked.includes(marker.category)) {
            marker.setMap(map);
        } else {
            marker.setMap(null);
        }
    });
}
