// =============================================
// ECOTRACK — COMBINED SPA APPLICATION JS
// Depends on utils.js being loaded first
// =============================================

const API_URL = 'http://localhost:5000/api';

// ---- Local state (user portal) ----
let requests      = [];
let totalCarbon   = 0;
let totalPoints   = 0;
let totalWeight   = 0;
const ngoCarbon   = { EcoReco: 0, Saahas: 0, 'E-Parisaraa': 0 };

// ---- Tracking state ----
let html5QrCode = null;

// =============================================
// PAGE NAVIGATION
// =============================================
function showPage(id, btn) {
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
    document.getElementById(id).classList.add('active');
    if (btn) btn.classList.add('active');

    // Lazy-init tracking when page shown
    if (id === 'track') initTrackPage();
}

// =============================================
// ---- SUBMIT REQUEST ----
// =============================================
function submitRequest() {
    const device   = document.getElementById('f-device').value.trim();
    const category = document.getElementById('f-category').value || 'Other';
    const weight   = parseFloat(document.getElementById('f-weight').value) || 2;
    const ngo      = document.getElementById('f-ngo').value;
    const date     = document.getElementById('f-date').value;
    const slot     = document.getElementById('f-slot').value;

    if (!device) { showToast('Please enter a device name.', 'warn'); return; }
    if (!date)   { showToast('Please select a pickup date.',  'warn'); return; }

    const carbon = Math.round(weight * (Math.random() * 4 + 5));
    const points = carbon * 10;

    totalCarbon += carbon;
    totalPoints += points;
    totalWeight += weight;
    ngoCarbon[ngo] = (ngoCarbon[ngo] || 0) + carbon;

    requests.unshift({ device, category, ngo, date, slot, weight, carbon, points, status: 'Processing' });

    updateDashboard();
    renderRequests();
    updateImpact();
    clearForm();
    showToast('Request submitted successfully!');
}

function clearForm() {
    ['f-device','f-weight','f-date'].forEach(id => { document.getElementById(id).value = ''; });
    document.getElementById('f-category').value = '';
    document.getElementById('upload-label').textContent = 'Click to upload a photo of your device';
}

// =============================================
// ---- DASHBOARD ----
// =============================================
function updateDashboard() {
    document.getElementById('d-req').textContent = requests.length;
    document.getElementById('d-carbon').innerHTML =
        totalCarbon + '<span class="stat-unit">kg CO₂</span>';
    document.getElementById('d-pts').textContent = totalPoints;

    const rHint = document.getElementById('d-req-hint');
    rHint.classList.remove('muted');
    rHint.textContent = requests.length === 1
        ? 'Great start!'
        : `${requests.length} pickups scheduled`;

    const cHint = document.getElementById('d-carbon-hint');
    cHint.classList.remove('muted');
    cHint.textContent = `≈ ${Math.round(totalCarbon / 22)} trees equivalent`;

    const pHint = document.getElementById('d-pts-hint');
    pHint.classList.remove('muted');
    const next = Math.ceil(totalPoints / 500) * 500 || 500;
    pHint.textContent = `${next - totalPoints} pts to next reward`;
}

// =============================================
// ---- REQUESTS LIST ----
// =============================================
function renderRequests() {
    const filter   = document.getElementById('filter-status').value;
    const list     = document.getElementById('req-list');
    const filtered = filter ? requests.filter(r => r.status === filter) : requests;

    document.getElementById('req-count-label').textContent =
        `${filtered.length} request${filtered.length !== 1 ? 's' : ''}`;

    if (filtered.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <div class="empty-ico">♻️</div>
                <h3>No requests yet</h3>
                <p>Submit your first e-waste pickup request.</p>
                <button class="btn btn-primary" onclick="showPage('submit', document.getElementById('nav-submit'))">Submit Request</button>
            </div>`;
        return;
    }

    const statusColor = { Processing: '#fff8e1', Scheduled: '#e3f2fd', Completed: '#e8f5e9' };
    const statusText  = { Processing: '#e65100', Scheduled: '#0d47a1', Completed: '#1b5e20' };

    list.innerHTML = filtered.map(r => `
        <div class="req-item">
            <div class="req-info">
                <div class="req-device">${escapeHtml(r.device)}</div>
                <div class="req-meta">${r.category} · ${r.ngo} · ${r.date} · ${r.slot}</div>
            </div>
            <span class="req-badge" style="background:${statusColor[r.status]||'#f5f5f5'};color:${statusText[r.status]||'#555'}">${r.status}</span>
            <div class="req-stats">
                <div class="req-carbon">${r.carbon} kg CO₂</div>
                <div class="req-pts">${r.points} pts</div>
            </div>
        </div>`).join('');
}

// =============================================
// ---- IMPACT ----
// =============================================
function updateImpact() {
    document.getElementById('i-carbon').textContent = totalCarbon;
    document.getElementById('i-pts').textContent    = totalPoints;
    document.getElementById('i-count').textContent  = requests.length;
    document.getElementById('i-kg').textContent     = `${totalWeight.toFixed(1)} kg total weight`;
    document.getElementById('i-trees').textContent  = `≈ ${Math.round(totalCarbon / 22)} trees equivalent`;
    const next = Math.ceil(totalPoints / 500) * 500 || 500;
    document.getElementById('i-next').textContent   = `${next - totalPoints} pts to next reward`;

    const maxC = Math.max(...Object.values(ngoCarbon), 1);
    ['eco','saa','epa'].forEach((key, i) => {
        const ngoKey = ['EcoReco','Saahas','E-Parisaraa'][i];
        const val = ngoCarbon[ngoKey] || 0;
        document.getElementById(`bar-${key}`).style.width = `${(val / maxC) * 100}%`;
        document.getElementById(`bv-${key}`).textContent  = `${val} kg`;
    });
}

// =============================================
// ---- TRACKING PAGE (inline SPA) ----
// =============================================
function initTrackPage() {
    // Bind buttons once
    const trackBtn    = document.getElementById('trackBtn');
    const scanBtn     = document.getElementById('scanQRBtn');
    const stopScanBtn = document.getElementById('stopScanBtnInline');
    const input       = document.getElementById('trackingIdInput');

    if (trackBtn._bound) return;
    trackBtn._bound = true;

    input.addEventListener('keypress', e => { if (e.key === 'Enter') doTrack(); });

    scanBtn.addEventListener('click', () => {
        const qrDiv = document.getElementById('track-qr-reader');
        qrDiv.style.display = 'block';
        document.getElementById('track-error').style.display = 'none';

        html5QrCode = new Html5Qrcode('qrVideoInline');
        html5QrCode.start(
            { facingMode: 'environment' },
            { fps: 10, qrbox: { width: 220, height: 220 } },
            (decoded) => {
                try {
                    const url = new URL(decoded);
                    const id  = url.searchParams.get('id');
                    stopQRInline();
                    if (id) doLoadTracking(id);
                    else if (isValidUUID(decoded)) doLoadTracking(decoded);
                    else showTrackErr('Invalid QR code.');
                } catch {
                    if (isValidUUID(decoded)) { stopQRInline(); doLoadTracking(decoded); }
                }
            },
            () => {}
        ).catch(() => {
            showTrackErr('Camera access denied. Please enter tracking ID manually.');
            qrDiv.style.display = 'none';
        });
    });

    stopScanBtn.addEventListener('click', stopQRInline);
}

function stopQRInline() {
    if (html5QrCode) {
        html5QrCode.stop().catch(() => {}).then(() => {
            html5QrCode = null;
            document.getElementById('track-qr-reader').style.display = 'none';
        });
    } else {
        document.getElementById('track-qr-reader').style.display = 'none';
    }
}

function doTrack() {
    const id = document.getElementById('trackingIdInput').value.trim();
    document.getElementById('track-error').style.display = 'none';

    if (!id) { showTrackErr('Please enter a tracking ID.'); return; }
    if (!isValidUUID(id)) { showTrackErr('Invalid tracking ID format (must be a UUID).'); return; }

    doLoadTracking(id);
}

function showTrackErr(msg) {
    const el = document.getElementById('track-error');
    el.textContent = msg;
    el.style.display = 'block';
}

function resetTracker() {
    document.getElementById('track-search-panel').style.display = 'block';
    document.getElementById('track-results-panel').style.display = 'none';
    document.getElementById('track-content').innerHTML = '';
    document.getElementById('trackingIdInput').value = '';
    document.getElementById('track-error').style.display = 'none';
    stopQRInline();
}

async function doLoadTracking(trackingId) {
    document.getElementById('track-search-panel').style.display = 'none';
    const resultsPanel = document.getElementById('track-results-panel');
    const content      = document.getElementById('track-content');
    resultsPanel.style.display = 'block';
    content.innerHTML = `<div class="loading-state"><div class="loading-spinner"></div><p>Loading tracking information…</p></div>`;

    try {
        const res  = await fetch(`${API_URL}/pickup/track/${trackingId}`);
        const data = await res.json();

        if (data.success) {
            renderTrackingResult(data, content);
        } else {
            content.innerHTML = buildTrackError(data.error || 'Tracking ID not found');
        }
    } catch {
        content.innerHTML = buildTrackError('Network error. Is the backend running? You can still use other features offline.');
    }
}

function renderTrackingResult(data, container) {
    const { pickup, timeline, carbonCredits } = data;
    const statusConfig = {
        COLLECTED:      { color: '#f39c12', icon: '📦', label: 'Collected' },
        AT_FACILITY:    { color: '#3498db', icon: '🏭', label: 'At Facility' },
        PROCESSING:     { color: '#9b59b6', icon: '⚙️', label: 'Processing' },
        RECYCLED:       { color: '#27ae60', icon: '♻️', label: 'Recycled' },
        CREDITS_ISSUED: { color: '#1a5e2a', icon: '🌱', label: 'Credits Issued' }
    };
    const cur = statusConfig[pickup.status] || { color: '#95a5a6', icon: '📍', label: pickup.status };

    const timelineHtml = timeline.map((ev, i) => {
        const evSt  = statusConfig[ev.status] || { icon: '📍', label: ev.status };
        const isLast = i === timeline.length - 1;
        return `
            <div class="timeline-item ${isLast ? 'timeline-item-last' : ''}">
                <div class="t-icon">${evSt.icon}</div>
                <div class="t-body">
                    <div class="t-header">
                        <span class="t-status">${evSt.label}</span>
                        <span class="t-time">${formatDate(ev.created_at)}</span>
                    </div>
                    ${ev.location ? `<p class="t-loc">📍 ${escapeHtml(ev.location)}</p>` : ''}
                    ${ev.notes    ? `<p class="t-loc">📝 ${escapeHtml(ev.notes)}</p>`    : ''}
                </div>
            </div>`;
    }).join('');

    container.innerHTML = `
        <div class="track-result-card">
            <div class="trk-status-bar" style="background:${cur.color}">
                <span style="font-size:32px">${cur.icon}</span>
                <div>
                    <div style="font-size:18px;font-weight:700">${cur.label}</div>
                    <div style="font-size:12px;opacity:.85">ID: ${escapeHtml(pickup.id)}
                        <button class="copy-btn-sm" onclick="navigator.clipboard.writeText('${escapeHtml(pickup.id)}')">📋</button>
                    </div>
                </div>
            </div>
            <div class="trk-body">
                <div class="trk-details">
                    <div class="trk-row"><span>Item</span><strong>${escapeHtml(pickup.itemDescription)}</strong></div>
                    <div class="trk-row"><span>Weight</span><strong>${pickup.estimatedWeight} kg</strong></div>
                    <div class="trk-row"><span>Collected</span><strong>${formatDate(pickup.createdAt)}</strong></div>
                    <div class="trk-row"><span>Last Update</span><strong>${formatDate(pickup.updatedAt)}</strong></div>
                </div>
                <div class="trk-credits">
                    <div style="font-size:13px;font-weight:600;color:#555;margin-bottom:8px">🌍 Carbon Credits</div>
                    <div style="display:flex;align-items:baseline;gap:6px">
                        <span style="font-size:36px;font-weight:800;color:#1a5e2a">${carbonCredits.estimated}</span>
                        <span style="color:#888">${carbonCredits.unit}</span>
                    </div>
                    ${pickup.status === 'CREDITS_ISSUED'
                        ? '<span class="badge-green">✅ Credits Issued</span>'
                        : '<span class="badge-amber">⏳ Pending</span>'}
                    <p style="font-size:12px;color:#aaa;margin-top:8px">1 kg e-waste ≈ 1.8 kg CO₂e saved</p>
                </div>
            </div>
            <div class="trk-timeline">
                <div style="font-size:13px;font-weight:700;color:#333;margin-bottom:14px">📋 Journey Timeline</div>
                ${timelineHtml || '<p style="color:#aaa;font-size:13px">No updates yet.</p>'}
            </div>
        </div>`;
}

function buildTrackError(msg) {
    return `<div class="track-error-box">
        <div style="font-size:40px;margin-bottom:12px">❌</div>
        <h3>Unable to Load Tracking Info</h3>
        <p>${escapeHtml(msg)}</p>
        <button class="btn btn-primary" onclick="resetTracker()">← Try Another ID</button>
    </div>`;
}

// =============================================
// ---- TOAST ----
// =============================================
function showToast(msg, type = 'success') {
    const t = document.getElementById('toast');
    document.getElementById('toast-msg').textContent = msg;
    t.className = `toast toast-${type}`;
    t.classList.add('show');
    setTimeout(() => t.classList.remove('show'), 3000);
}

// =============================================
// ---- INIT ----
// =============================================
renderRequests();
updateDashboard();
updateImpact();

console.log('✅ App.js loaded successfully');
