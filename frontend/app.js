let map, directionsService;
let autocompleteHome, autocompleteDestination;
let currentTrips = [];
let infoWindow;
let directionsRenderers = [];

function getSelectedFilterDate() {
    const dr = document.getElementById('dateRange');
    if (!dr) return '';
    const fp = dr._flatpickr;
    if (!fp || !fp.selectedDates || fp.selectedDates.length === 0) return '';
    return fp.selectedDates[0].toISOString().slice(0,10);
}

function applyDateRangeFilter(startIso, endIso) {
    if (!startIso || !endIso) return;
    // include trips whose date (YYYY-MM-DD) falls between start and end inclusive
    const filtered = (currentTrips || []).filter(t => {
        const d = (t.datetime || '').split(' ')[0];
        return d >= startIso && d <= endIso;
    });
    renderTrips(filtered);
    renderTripMarkers(filtered);
    drawRoute(filtered);
}

function clearDirections() {
    // remove existing rendered routes from the map
    directionsRenderers.forEach(dr => {
        try { dr.setMap(null); } catch (e) {}
    });
    directionsRenderers = [];
}

async function fetchTrips(date) {
    const res = await fetch(`/api/trips${date ? `?date=${date}` : ''}`);
    const trips = await res.json();
    currentTrips = trips || [];
    renderTrips(trips);
    renderTripMarkers(trips);
    drawRoute(trips);
}

function renderTrips(trips) {
    const container = document.getElementById('tripList');
    if (!trips || trips.length === 0) {
        container.innerHTML = '<div class="no-trips">No trips scheduled</div>';
        return;
    }

    const escapeAttr = s => (s || '').toString().replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    const formatDateTime = dt => {
        if (!dt) return '';
        // dt expected 'YYYY-MM-DD HH:MM' — parse into ISO for Date
        const parsed = new Date(dt.replace(' ', 'T'));
        if (isNaN(parsed)) return dt;
        // Show date and time with 24-hour clock (hour12: false)
        return parsed.toLocaleString(undefined, {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false
        });
    };

    container.innerHTML = trips.map(t => `
        <div class="trip-card">
            <div class="trip-info">
                <div class="trip-destination">${escapeAttr(t.destination)}</div>
                <div class="trip-meta">
                    <div class="trip-home">From: ${escapeAttr(t.home)}</div>
                    <div class="trip-datetime">${escapeAttr(formatDateTime(t.datetime))}</div>
                </div>
            </div>
            <div class="trip-actions">
                <button type="button" class="btn btn-sm btn-outline-secondary edit-btn" data-id="${t.id}" data-home="${escapeAttr(t.home)}" data-destination="${escapeAttr(t.destination)}" data-datetime="${escapeAttr(t.datetime)}">Edit</button>
                <button type="button" class="btn btn-sm btn-outline-danger delete-btn" data-id="${t.id}">Delete</button>
            </div>
        </div>
    `).join('');

    container.querySelectorAll('.edit-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const b = e.currentTarget;
            openEditModal(b.dataset.id, b.dataset.home, b.dataset.destination, b.dataset.datetime);
        });
    });
    container.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const id = e.currentTarget.dataset.id;
            deleteTrip(id);
        });
    });
}

document.getElementById('addBtn').addEventListener('click', async () => {
    const home = document.getElementById('home').value;
    const destination = document.getElementById('destination').value;
    const datetime = document.getElementById('datetime').value; // flatpickr returns 'YYYY-MM-DD HH:MM'
    if (!home || !destination || !datetime) {
        alert('All fields required');
        return;
    }
    await fetch('/api/trips', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ home, destination, datetime })
    });
    fetchTrips(getSelectedFilterDate());
});

// Swap home and destination in the Add Trip form
const swapPlacesBtn = document.getElementById('swapPlacesBtn');
if (swapPlacesBtn) {
    swapPlacesBtn.addEventListener('click', () => {
        const homeEl = document.getElementById('home');
        const destEl = document.getElementById('destination');
        if (!homeEl || !destEl) return;
        const tmp = homeEl.value;
        homeEl.value = destEl.value;
        destEl.value = tmp;
        // If autocomplete instances exist, update their place text if needed
        try { if (autocompleteHome) google.maps.places.Autocomplete.prototype.setFields && autocompleteHome.setBounds; } catch(e) {}
    });
}

// Also provide swap functionality in the Edit modal (optional small helper button)
function ensureEditSwapButton() {
    const modalBody = document.querySelector('#editModal .modal-body');
    if (!modalBody) return;
    // Avoid adding twice
    if (document.getElementById('editSwapBtn')) return;
    const wrap = document.createElement('div');
    wrap.style.display = 'flex';
    wrap.style.justifyContent = 'flex-end';
    wrap.style.marginBottom = '8px';
    const btn = document.createElement('button');
    btn.id = 'editSwapBtn';
    btn.type = 'button';
    btn.className = 'btn btn-sm btn-outline-secondary';
    btn.textContent = 'Swap ⇄';
    btn.addEventListener('click', () => {
        const h = document.getElementById('editHome');
        const d = document.getElementById('editDestination');
        if (!h || !d) return;
        const t = h.value; h.value = d.value; d.value = t;
    });
    wrap.appendChild(btn);
    modalBody.insertBefore(wrap, modalBody.firstChild);
}

// Ensure the edit swap button exists when the modal is opened
const observeModal = new MutationObserver(() => ensureEditSwapButton());
const editModalEl = document.getElementById('editModal');
if (editModalEl) observeModal.observe(editModalEl, { childList: true, subtree: true });

// Filters UI: search and select all behavior
const filterSearch = document.getElementById('filterSearch');
const filtersSelectAll = document.getElementById('filtersSelectAll');
const filterPills = document.getElementById('filterPills');
if (filterSearch && filterPills) {
    filterSearch.addEventListener('input', (e) => {
        const q = (e.target.value || '').toLowerCase().trim();
        // Show/hide pills based on label text
        filterPills.querySelectorAll('label').forEach(lbl => {
            const txt = lbl.textContent.toLowerCase();
            lbl.style.display = txt.includes(q) ? '' : 'none';
            const cb = document.getElementById(lbl.getAttribute('for'));
            if (cb) cb.style.display = txt.includes(q) ? '' : 'none';
        });
    });
}
if (filtersSelectAll && filterPills) {
    filtersSelectAll.addEventListener('click', () => {
        const inputs = filterPills.querySelectorAll('input.place-filter');
        const anyUnchecked = Array.from(inputs).some(i => !i.checked);
        inputs.forEach(i => i.checked = anyUnchecked);
        // trigger any logic that depends on filters (if present)
        const ev = new Event('change');
        inputs.forEach(i => i.dispatchEvent(ev));
    });
}

// legacy single-date input may not exist (we now use dateRange). Guard the listener.
const filterDateEl = document.getElementById('filterDate');
if (filterDateEl) {
    filterDateEl.addEventListener('change', e => fetchTrips(e.target.value));
}

function openEditModal(id, home, destination, datetime) {
    document.getElementById('editId').value = id;
    document.getElementById('editHome').value = home;
    document.getElementById('editDestination').value = destination;
    document.getElementById('editDatetime').value = datetime;
    new bootstrap.Modal(document.getElementById('editModal')).show();

    new google.maps.places.Autocomplete(
        document.getElementById('editHome'),
        { types: ['geocode'] }
    );
    new google.maps.places.Autocomplete(
        document.getElementById('editDestination'),
        { types: ['geocode'] }
    );
}

document.getElementById('saveEditBtn').addEventListener('click', async () => {
    const id = document.getElementById('editId').value;
    const home = document.getElementById('editHome').value;
    const destination = document.getElementById('editDestination').value;
    const datetime = document.getElementById('editDatetime').value; // flatpickr format 'YYYY-MM-DD HH:MM'
    await fetch(`/api/trips/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ home, destination, datetime })
    });
    bootstrap.Modal.getInstance(document.getElementById('editModal')).hide();
    fetchTrips(getSelectedFilterDate());
});

async function deleteTrip(id) {
    if (!confirm('Delete this trip?')) return;
    await fetch(`/api/trips/${id}`, { method: 'DELETE' });
    fetchTrips(getSelectedFilterDate());
}
