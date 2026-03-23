// ==================== DATA ====================
const USERS = {
    manager: { pass: '1234', role: 'manager', displayName: 'ผู้จัดการ สุรนารี' },
    driver1: { pass: '1234', role: 'driver', displayName: 'สมชาย ใจดี' },
    driver2: { pass: '1234', role: 'driver', displayName: 'สมหญิง มีสุข' },
};

const CARS = [
    { id: 0, name: 'รถตู้ กข-001', plate: 'กข-001 นครราชสีมา', icon: '🚐', available: true, color: '#00c9a7' },
    { id: 1, name: 'รถตู้ กข-002', plate: 'กข-002 นครราชสีมา', icon: '🚐', available: true, color: '#ffd740' },
    { id: 2, name: 'รถเก๋ง กข-003', plate: 'กข-003 นครราชสีมา', icon: '🚙', available: false, color: '#ff6b35' },
    { id: 3, name: 'รถเก๋ง กข-004', plate: 'กข-004 นครราชสีมา', icon: '🚙', available: true, color: '#7c4dff' },
];

// SUT Waypoints (lat/lng within SUT area)
const WAYPOINTS = [
    { name: 'เรียนรวม 1', lat: 14.8791, lng: 102.0152, icon: '📚' },
    { name: 'อาคารสุรพัฒน์ 2', lat: 14.8823, lng: 102.0204, icon: '🏢' },
    { name: 'โรงพยาบาล มทส', lat: 14.8760, lng: 102.0238, icon: '🏥' },
];

// Simulated vehicle positions for manager view
const VEHICLE_DATA = [
    {
        id: 0, icon: '🚐', name: 'รถตู้ กข-001', plate: 'กข-001 นครราชสีมา',
        driver: 'สมชาย ใจดี', status: 'moving', color: '#00c9a7',
        lat: 14.8800, lng: 102.0165, heading: 45, dest: 'อาคารสุรพัฒน์ 2',
        totalTime: '1 ชม. 23 นาที',
        stops: [
            { name: 'เรียนรวม 1', time: '12 นาที' },
            { name: 'อาคารสุรพัฒน์ 2', time: '8 นาที (กำลังจะถึง)' },
            { name: 'โรงพยาบาล มทส', time: '—' },
        ]
    },
    {
        id: 1, icon: '🚐', name: 'รถตู้ กข-002', plate: 'กข-002 นครราชสีมา',
        driver: 'สมหญิง มีสุข', status: 'stopped', color: '#ffd740',
        lat: 14.8760, lng: 102.0190, heading: 90, dest: 'โรงพยาบาล มทส',
        totalTime: '45 นาที',
        stops: [
            { name: 'เรียนรวม 1', time: '10 นาที' },
            { name: 'อาคารสุรพัฒน์ 2', time: '15 นาที' },
            { name: 'โรงพยาบาล มทส', time: 'จอดอยู่' },
        ]
    },
    {
        id: 2, icon: '🚙', name: 'รถเก๋ง กข-003', plate: 'กข-003 นครราชสีมา',
        driver: 'วิชัย รักดี', status: 'moving', color: '#ff6b35',
        lat: 14.8810, lng: 102.0230, heading: 180, dest: 'เรียนรวม 1',
        totalTime: '32 นาที',
        stops: [
            { name: 'เรียนรวม 1', time: 'กำลังมุ่งหน้า' },
            { name: 'อาคารสุรพัฒน์ 2', time: '—' },
            { name: 'โรงพยาบาล มทส', time: '—' },
        ]
    },
    {
        id: 3, icon: '🚙', name: 'รถเก๋ง กข-004', plate: 'กข-004 นครราชสีมา',
        driver: '—', status: 'idle', color: '#7c4dff',
        lat: 14.8780, lng: 102.0145, heading: 0, dest: '—',
        totalTime: '—',
        stops: [
            { name: 'เรียนรวม 1', time: '—' },
            { name: 'อาคารสุรพัฒน์ 2', time: '—' },
            { name: 'โรงพยาบาล มทส', time: '—' },
        ]
    },
];

// ==================== STATE ====================
let currentRole = 'manager';
let selectedCar = null;
let navMap = null, managerMap = null;
let driverMarker = null;
let driverLatLng = null;
let navInterval = null;
let currentWpIndex = 0;
let managerMarkers = [];
let startTime = null;
let elapsedInterval = null;

// ==================== LOGIN ====================
function selectRole(r) {
    currentRole = r;
    document.getElementById('roleManager').classList.toggle('active', r === 'manager');
    document.getElementById('roleDriver').classList.toggle('active', r === 'driver');
}

function login() {
    const u = document.getElementById('username').value.trim();
    const p = document.getElementById('password').value;
    const err = document.getElementById('errorMsg');
    const user = USERS[u];
    if (!user || user.pass !== p) {
        err.style.display = 'block';
        return;
    }
    if (user.role !== currentRole && !(user.role === 'driver' && currentRole === 'driver') && !(user.role === 'manager' && currentRole === 'manager')) {
        err.style.display = 'block';
        return;
    }
    err.style.display = 'none';
    document.getElementById('loginPage').style.display = 'none';
    if (currentRole === 'driver') {
        document.getElementById('driverPage').style.display = 'flex';
        document.getElementById('driverName').textContent = user.displayName;
        initDriverPage();
    } else {
        document.getElementById('managerPage').style.display = 'flex';
        document.getElementById('managerName').textContent = user.displayName;
        setTimeout(initManagerMap, 100);
    }
}

function logout() {
    location.reload();
}

// ==================== DRIVER ====================
function initDriverPage() {
    const grid = document.getElementById('carGrid');
    grid.innerHTML = '';
    CARS.forEach(car => {
        const div = document.createElement('div');
        div.className = 'car-card' + (car.available ? '' : ' unavailable');
        div.id = 'car_' + car.id;
        div.innerHTML = `
      <div class="car-icon">${car.icon}</div>
      <div class="car-name">${car.name}</div>
      <div class="car-plate">${car.plate}</div>
      <div class="car-status ${car.available ? 'status-available' : 'status-busy'}">${car.available ? '✅ ว่าง' : '🔴 ใช้งาน'}</div>
    `;
        if (car.available) div.onclick = () => selectCar(car.id);
        grid.appendChild(div);
    });
}

function selectCar(id) {
    document.querySelectorAll('.car-card').forEach(c => c.classList.remove('selected'));
    document.getElementById('car_' + id).classList.add('selected');
    selectedCar = id;
    document.getElementById('startBtn').disabled = false;
}

function startNavigation() {
    if (selectedCar === null) return;
    document.getElementById('carSelectSection').style.display = 'none';
    document.getElementById('startBtn').style.display = 'none';

    const navStatusBar = document.getElementById('navStatusBar');
    navStatusBar.style.display = 'flex';

    const mapDiv = document.getElementById('navMap');
    mapDiv.style.display = 'block';

    currentWpIndex = 0;
    startTime = Date.now();

    if (!navMap) {
        navMap = L.map('navMap', { zoomControl: true }).setView([WAYPOINTS[0].lat, WAYPOINTS[0].lng], 16);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
        }).addTo(navMap);

        // Add waypoint markers
        WAYPOINTS.forEach((wp, i) => {
            const colors = ['#00e676', '#ffd740', '#ff5252'];
            const icon = L.divIcon({
                html: `<div style="background:${colors[i]};width:16px;height:16px;border-radius:50%;border:3px solid white;box-shadow:0 0 8px ${colors[i]};"></div>`,
                className: '', iconAnchor: [8, 8]
            });
            L.marker([wp.lat, wp.lng], { icon }).addTo(navMap)
                .bindPopup(`<b>${wp.icon} ${wp.name}</b>`);
        });

        // Draw route line
        const latlngs = WAYPOINTS.map(w => [w.lat, w.lng]);
        L.polyline(latlngs, { color: '#00c9a7', weight: 4, dashArray: '8,4', opacity: 0.8 }).addTo(navMap);
    }

    // Driver car marker
    driverLatLng = { lat: WAYPOINTS[0].lat, lng: WAYPOINTS[0].lng };
    const carIcon = L.divIcon({
        html: `<div style="font-size:28px;filter:drop-shadow(0 2px 6px rgba(0,0,0,0.5))">🚗</div>`,
        className: '', iconAnchor: [14, 14]
    });
    driverMarker = L.marker([driverLatLng.lat, driverLatLng.lng], { icon: carIcon }).addTo(navMap);

    updateNavStatus();
    navInterval = setInterval(animateDriver, 1500);
}

let animStep = 0;
function animateDriver() {
    if (currentWpIndex >= WAYPOINTS.length - 1) {
        clearInterval(navInterval);
        document.getElementById('currentDestName').textContent = '🎉 ถึงจุดหมายแล้ว!';
        return;
    }
    const from = WAYPOINTS[currentWpIndex];
    const to = WAYPOINTS[currentWpIndex + 1];
    animStep++;
    const steps = 20;
    if (animStep >= steps) {
        currentWpIndex++;
        animStep = 0;
        driverLatLng = { lat: to.lat, lng: to.lng };
        updateNavStatus();
    } else {
        const t = animStep / steps;
        driverLatLng = {
            lat: from.lat + (to.lat - from.lat) * t,
            lng: from.lng + (to.lng - from.lng) * t
        };
    }
    if (driverMarker) {
        driverMarker.setLatLng([driverLatLng.lat, driverLatLng.lng]);
        navMap.panTo([driverLatLng.lat, driverLatLng.lng], { animate: true, duration: 1 });
    }
    // Simulate speed
    const speed = Math.floor(25 + Math.random() * 20);
    document.getElementById('speedVal').textContent = speed;
    const dist = (animStep * 0.1).toFixed(1);
    document.getElementById('distVal').textContent = dist;
}

function updateNavStatus() {
    const dest = currentWpIndex < WAYPOINTS.length - 1 ? WAYPOINTS[currentWpIndex + 1] : WAYPOINTS[WAYPOINTS.length - 1];
    document.getElementById('currentDestName').textContent = dest.icon + ' ' + dest.name;
}

// ==================== MANAGER ====================
function initManagerMap() {
    managerMap = L.map('managerMap').setView([14.8791, 102.0190], 15);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap'
    }).addTo(managerMap);

    // Waypoint markers
    WAYPOINTS.forEach((wp, i) => {
        const colors = ['#00e676', '#ffd740', '#ff5252'];
        L.circleMarker([wp.lat, wp.lng], {
            radius: 10, color: colors[i], fillColor: colors[i], fillOpacity: 0.3, weight: 3
        }).addTo(managerMap).bindPopup(`<b>${wp.icon} ${wp.name}</b>`);
    });

    // Route line
    L.polyline(WAYPOINTS.map(w => [w.lat, w.lng]), {
        color: 'rgba(0,201,167,0.4)', weight: 3, dashArray: '6,4'
    }).addTo(managerMap);

    // Vehicle markers
    VEHICLE_DATA.forEach(v => {
        const icon = L.divIcon({
            html: `<div style="position:relative">
        <div style="font-size:26px">${v.icon}</div>
        <div style="position:absolute;top:-4px;right:-4px;width:10px;height:10px;border-radius:50%;background:${v.status === 'moving' ? '#00e676' : v.status === 'stopped' ? '#ffd740' : '#7c4dff'};border:2px solid white;${v.status === 'moving' ? 'animation:pulse2 1.5s infinite' : ''}"></div>
      </div>`,
            className: '', iconAnchor: [13, 13]
        });
        const marker = L.marker([v.lat, v.lng], { icon }).addTo(managerMap);
        marker.bindPopup(`
      <div style="font-family:Sarabun,sans-serif;min-width:160px">
        <b>${v.icon} ${v.name}</b><br>
        <span style="color:#666">คนขับ: ${v.driver}</span><br>
        <span style="color:#666">กำลังไป: ${v.dest}</span><br>
        <span style="color:${v.status === 'moving' ? 'green' : v.status === 'stopped' ? 'orange' : 'gray'}">
          ${v.status === 'moving' ? '🟢 กำลังเคลื่อนที่' : v.status === 'stopped' ? '🟡 จอดอยู่' : '⚪ ว่าง'}
        </span>
      </div>
    `);
        managerMarkers.push(marker);
    });

    // Animate vehicles
    const movingCount = VEHICLE_DATA.filter(v => v.status === 'moving').length;
    document.getElementById('activeCount').textContent = movingCount;
    document.getElementById('movingCount').textContent = movingCount;
    document.getElementById('stoppedCount').textContent = VEHICLE_DATA.length - movingCount;

    simulateManagerVehicles();
}

function simulateManagerVehicles() {
    setInterval(() => {
        VEHICLE_DATA.forEach((v, i) => {
            if (v.status === 'moving') {
                v.lat += (Math.random() - 0.5) * 0.0002;
                v.lng += (Math.random() - 0.5) * 0.0002;
                if (managerMarkers[i]) managerMarkers[i].setLatLng([v.lat, v.lng]);
            }
        });
    }, 2000);
}

function showVehicleDetail() {
    const sel = document.getElementById('vehicleDropdown').value;
    const card = document.getElementById('vehicleDetailCard');
    if (sel === '') { card.style.display = 'none'; return; }
    const v = VEHICLE_DATA[parseInt(sel)];
    card.style.display = 'block';
    document.getElementById('detailIcon').textContent = v.icon;
    document.getElementById('detailName').textContent = v.name;
    document.getElementById('detailPlate').textContent = v.plate;
    document.getElementById('detailDriver').textContent = v.driver;
    const statusMap = { moving: '<span class="val status-moving">🟢 กำลังเคลื่อนที่</span>', stopped: '<span class="val" style="color:var(--warning)">🟡 จอดอยู่</span>', idle: '<span class="val" style="color:var(--muted)">⚪ ว่าง</span>' };
    document.getElementById('detailStatus').innerHTML = statusMap[v.status];
    document.getElementById('detailTotalTime').textContent = v.totalTime;
    const tl = document.getElementById('stopTimeline');
    tl.innerHTML = v.stops.map((s, i) => `
    <div class="stop-item">
      <div class="stop-num">${i + 1}</div>
      <div>
        <div class="stop-name">${WAYPOINTS[i].icon} ${s.name}</div>
        <div class="stop-time">⏱ ${s.time}</div>
      </div>
    </div>
  `).join('');

    // Pan map to vehicle
    if (managerMap) managerMap.panTo([v.lat, v.lng], { animate: true });
}

// Pulse animation for CSS
const style = document.createElement('style');
style.textContent = '@keyframes pulse2{0%{transform:scale(1);opacity:1}100%{transform:scale(2.5);opacity:0}}';
document.head.appendChild(style);