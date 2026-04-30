// unified-portals.js - Agent and Admin Logic merged

// --- AGENT PORTAL ---
let agentAuthToken = localStorage.getItem('authToken');
if (agentAuthToken) verifyAgentToken();

async function handleAgentLogin(e) {
    e.preventDefault();
    const email = document.getElementById('agentLoginEmail').value;
    const password = document.getElementById('agentLoginPassword').value;
    const btnText = document.getElementById('agentLoginBtnText');
    const err = document.getElementById('agentLoginError');
    
    btnText.textContent = 'Logging in...';
    err.style.display = 'none';
    
    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (data.success) {
            agentAuthToken = data.token;
            localStorage.setItem('authToken', agentAuthToken);
            document.getElementById('agentName').textContent = data.agent.fullName;
            showAgentDashboard();
            loadRecentPickups();
        } else {
            err.textContent = data.error || 'Login failed';
            err.style.display = 'block';
        }
    } catch {
        err.textContent = 'Network error.';
        err.style.display = 'block';
    } finally {
        btnText.textContent = 'Login';
    }
}

async function handleNewPickup(e) {
    e.preventDefault();
    const userEmail = document.getElementById('userEmail').value;
    const itemDescription = document.getElementById('itemDescription').value;
    const estimatedWeight = parseFloat(document.getElementById('estimatedWeight').value);
    const submitBtn = document.getElementById('submitBtnText');
    const msg = document.getElementById('pickupMessage');
    
    submitBtn.textContent = 'Processing...';
    msg.innerHTML = '';
    
    try {
        const res = await fetch(`${API_URL}/pickup/confirm`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${agentAuthToken}` },
            body: JSON.stringify({ userEmail, itemDescription, estimatedWeight, latitude: null, longitude: null })
        });
        const data = await res.json();
        if (data.success) {
            msg.innerHTML = `<div class="success-message">✅ Pickup Confirmed!<br>ID: <code>${data.trackingId}</code></div>`;
            document.getElementById('pickupForm').reset();
            loadRecentPickups();
        } else {
            msg.innerHTML = `<div class="error-message">${data.error}</div>`;
        }
    } catch {
        msg.innerHTML = '<div class="error-message">Network error</div>';
    } finally {
        submitBtn.textContent = 'Confirm Pickup & Send QR';
    }
}

async function loadRecentPickups() {
    const container = document.getElementById('recentPickups');
    try {
        const res = await fetch(`${API_URL}/pickup/agent/pickups`, {
            headers: { 'Authorization': `Bearer ${agentAuthToken}` }
        });
        const data = await res.json();
        if (data.success && data.pickups.length > 0) {
            container.innerHTML = data.pickups.slice(0, 10).map(p => `
                <div class="pickup-item">
                    <div class="pickup-header">
                        <span class="pickup-id">${p.id.slice(0, 8)}...</span>
                        <span class="status-badge status-${p.status.toLowerCase()}">${p.status}</span>
                    </div>
                    <div class="pickup-details">
                        <div>📧 ${p.user_email}</div>
                        <div>📦 ${p.item_description}</div>
                        <div>⚖️ ${p.estimated_weight_kg} kg</div>
                    </div>
                </div>
            `).join('');
        } else {
            container.innerHTML = '<p class="empty-state">No pickups recorded yet</p>';
        }
    } catch {}
}

async function verifyAgentToken() {
    try {
        const res = await fetch(`${API_URL}/auth/verify`, { headers: { 'Authorization': `Bearer ${agentAuthToken}` } });
        const data = await res.json();
        if (data.valid) { showAgentDashboard(); loadRecentPickups(); }
        else { handleAgentLogout(); }
    } catch { handleAgentLogout(); }
}

function showAgentDashboard() {
    document.getElementById('agentLoginScreen').classList.remove('active');
    document.getElementById('agentDashboardScreen').classList.add('active');
}
function handleAgentLogout() {
    localStorage.removeItem('authToken');
    agentAuthToken = null;
    document.getElementById('agentDashboardScreen').classList.remove('active');
    document.getElementById('agentLoginScreen').classList.add('active');
}

// --- BLOCKCHAIN TEST SETUP ---
async function generateTestPickup() {
    const btn = document.getElementById('demoPickupBtn');
    const msg = document.getElementById('demoPickupMsg');
    btn.textContent = 'Generating...';
    msg.style.color = '#333';
    
    try {
        // 1. Create a fake user email to register
        const testEmail = `test_${Date.now()}@ewaste.com`;
        msg.innerHTML = `Registering ${testEmail}...`;
        
        // Register user (this triggers blockchain registration)
        const regRes = await fetch(`${API_URL}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: 'Blockchain Test User', email: testEmail, password: 'password123', role: 'household' })
        });
        const regData = await regRes.json();
        
        if (!regData.success) throw new Error(regData.message || 'Registration failed');
        
        const userToken = regData.data.accessToken;
        msg.innerHTML = `User registered! Creating pickup...`;
        
        // 2. Schedule a pickup for that user
        const pickupRes = await fetch(`${API_URL}/pickups`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${userToken}` },
            body: JSON.stringify({
                items: [{ wasteType: '1', quantity: 1, condition: 'good', actualWeight: 5 }],
                scheduledDate: new Date().toISOString(),
                pickupAddress: { street: '123 Main', city: 'Test City', state: 'TS', zipCode: '12345', coordinates: [0, 0] }
            })
        });
        const pickupData = await pickupRes.json();
        
        if (!pickupData.success) throw new Error(pickupData.message || 'Pickup creation failed');
        
        const trackingId = pickupData.data._id || pickupData.data.id || pickupData.data.pickupId;
        
        msg.innerHTML = `<span style="color:green;font-weight:bold;">Success!</span><br>Copy this ID: <code style="user-select:all;background:#eee;padding:2px 4px;">${trackingId}</code>`;
        
        // Auto-fill the form
        document.getElementById('updateTrackingId').value = trackingId;
        document.getElementById('newStatus').value = 'processed';
        
    } catch (e) {
        msg.innerHTML = `<span style="color:red">Error: ${e.message}</span>`;
    } finally {
        btn.textContent = 'Generate Test Pickup ID';
    }
}


// --- ADMIN PORTAL ---
let adminToken = localStorage.getItem('adminToken');
if (adminToken) verifyAdminToken();

async function handleAdminLogin(e) {
    e.preventDefault();
    const email = document.getElementById('adminLoginEmail').value;
    const password = document.getElementById('adminLoginPassword').value;
    const btnText = document.getElementById('adminLoginBtnText');
    const err = document.getElementById('adminLoginError');
    
    btnText.textContent = 'Logging in...';
    err.style.display = 'none';
    
    try {
        const res = await fetch(`${API_URL}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (data.success && data.data && data.data.accessToken) {
            adminToken = data.data.accessToken;
            localStorage.setItem('adminToken', adminToken);
            document.getElementById('adminPanelName').textContent = data.data.user.name;
            showAdminDashboard();
            loadAdminDashboardData();
        } else {
            err.textContent = data.error || 'Login failed';
            err.style.display = 'block';
        }
    } catch {
        err.textContent = 'Network error.';
        err.style.display = 'block';
    } finally {
        btnText.textContent = 'Login';
    }
}

async function handleStatusUpdate(e) {
    e.preventDefault();
    const trackingId = document.getElementById('updateTrackingId').value;
    const status = document.getElementById('newStatus').value;
    const location = document.getElementById('updateLocation').value;
    const notes = document.getElementById('updateNotes').value;
    const msg = document.getElementById('updateMessage');
    
    msg.innerHTML = 'Updating...';
    try {
        const res = await fetch(`${API_URL}/pickups/${trackingId}/status`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${adminToken}` },
            body: JSON.stringify({ status, location, notes })
        });
        const data = await res.json();
        if (data.success) {
            msg.innerHTML = '<span class="success-message">✅ Status updated!</span>';
            document.getElementById('statusUpdateForm').reset();
            loadAdminDashboardData();
        } else {
            msg.innerHTML = `<span class="error-message">${escapeHtml(data.error)}</span>`;
        }
    } catch {
        msg.innerHTML = '<span class="error-message">Network error!</span>';
    }
}

async function adminSearch() {
    const query = document.getElementById('searchInput').value.trim();
    if (!query) return;
    const resDiv = document.getElementById('searchResults');
    resDiv.innerHTML = 'Searching...';
    try {
        const res = await fetch(`${API_URL}/pickup/search?q=${encodeURIComponent(query)}`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });
        const data = await res.json();
        if (data.success && data.pickups.length > 0) {
            resDiv.innerHTML = data.pickups.map(p => `
                <div style="border-bottom:1px solid #ddd; margin-bottom:8px; padding-bottom:8px;">
                    <strong>ID:</strong> ${escapeHtml(p.id)}<br>
                    <strong>Email:</strong> ${escapeHtml(p.user_email)}<br>
                    <strong>Status:</strong> ${escapeHtml(p.status)}
                </div>
            `).join('');
        } else {
            resDiv.innerHTML = 'No results found.';
        }
    } catch {
        resDiv.innerHTML = '<span class="error-message">Search failed</span>';
    }
}

async function loadAdminDashboardData() {
    try {
        const res = await fetch(`${API_URL}/pickup/admin/stats`, { headers: { 'Authorization': `Bearer ${adminToken}` } });
        const data = await res.json();
        if (data.success) {
            document.getElementById('totalPickups').textContent = data.stats.totalPickups;
            document.getElementById('totalWeight').textContent = data.stats.totalWeight.toFixed(1);
            document.getElementById('recycledCount').textContent = data.stats.recycledCount;
            document.getElementById('totalCredits').textContent = data.stats.totalCredits.toFixed(1);
            
            document.getElementById('pickupsTableBody').innerHTML = data.recentPickups.map(p => `
                <tr>
                    <td style="padding:10px"><code>${escapeHtml(p.id.slice(0, 8))}...</code></td>
                    <td style="padding:10px">${escapeHtml(p.user_email)}</td>
                    <td style="padding:10px">${escapeHtml(p.item_description)}</td>
                    <td style="padding:10px">${p.estimated_weight_kg} kg</td>
                    <td style="padding:10px"><span class="status-badge status-${p.status.toLowerCase()}">${p.status}</span></td>
                    <td style="padding:10px">${new Date(p.created_at).toLocaleDateString()}</td>
                </tr>
            `).join('');
        }
    } catch {}
}

async function verifyAdminToken() {
    try {
        const res = await fetch(`${API_URL}/auth/admin/verify`, { headers: { 'Authorization': `Bearer ${adminToken}` } });
        const data = await res.json();
        if (data.valid) { showAdminDashboard(); loadAdminDashboardData(); }
        else { handleAdminLogout(); }
    } catch { handleAdminLogout(); }
}

function showAdminDashboard() {
    document.getElementById('adminLoginScreen').classList.remove('active');
    document.getElementById('adminDashboardScreen').classList.add('active');
}
function handleAdminLogout() {
    localStorage.removeItem('adminToken');
    adminToken = null;
    document.getElementById('adminDashboardScreen').classList.remove('active');
    document.getElementById('adminLoginScreen').classList.add('active');
}

// MAP LOGIC
let map, mapMarker;
function confirmMapLocation() {
    if(!mapMarker) return;
    const pos = mapMarker.getPosition();
    alert(`Location saved: ${pos.lat()}, ${pos.lng()}`);
    // Simulate redirection or processing
    document.getElementById('nav-track').click();
}

window.initMap = function() {
    const mapDiv = document.getElementById('map');
    if (!mapDiv) return;
    const defaultLocation = { lat: 19.0760, lng: 72.8777 }; // Mumbai
    map = new google.maps.Map(mapDiv, { center: defaultLocation, zoom: 13 });
    mapMarker = new google.maps.Marker({
        position: defaultLocation, map: map, draggable: true, title: 'Pickup Location'
    });
    const geocoder = new google.maps.Geocoder();
    function updateAddr(pos) {
        geocoder.geocode({ location: pos }).then((response) => {
            if (response.results[0]) document.getElementById('address-display').innerText = \`Selected: \${response.results[0].formatted_address}\`;
        }).catch(e => console.log('Geocoder failed:', e));
    }
    mapMarker.addListener('dragend', () => updateAddr(mapMarker.getPosition()));
    map.addListener('click', (event) => {
        mapMarker.setPosition(event.latLng);
        updateAddr(event.latLng);
    });
    updateAddr(mapMarker.getPosition());
}
