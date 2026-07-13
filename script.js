const ipInput = document.getElementById("ipInput");
const trackBtn = document.getElementById("trackBtn");
const locateBtn = document.getElementById("locateBtn");
const statusEl = document.getElementById("status");
const resultEl = document.getElementById("result");

const ipValueEl = document.getElementById("ipValue");
const countryValueEl = document.getElementById("countryValue");
const cityValueEl = document.getElementById("cityValue");
const regionValueEl = document.getElementById("regionValue");
const countryNameValueEl = document.getElementById("countryNameValue");
const timezoneValueEl = document.getElementById("timezoneValue");
const orgValueEl = document.getElementById("orgValue");
const coordsValueEl = document.getElementById("coordsValue");
const accuracyValueEl = document.getElementById("accuracyValue");
const mapEl = document.getElementById("map");

let map;
let marker;

async function fetchPublicIp() {
  try {
    const res = await fetch("https://api.ipify.org?format=json");
    if (!res.ok) throw new Error("Unable to fetch your public IP.");
    const data = await res.json();
    return data.ip;
  } catch (error) {
    return null;
  }
}

async function fetchIpDetails(ip) {
  const res = await fetch(`https://ipwho.is/${ip}`);
  if (!res.ok) {
    if (res.status === 429) {
      throw new Error("The lookup service is temporarily rate-limited. Please try again in a moment.");
    }
    throw new Error("Unable to look up that IP address.");
  }

  const data = await res.json();
  if (!data.success) {
    throw new Error(data.message || "Unable to look up that IP address.");
  }
  return data;
}

function updateStatus(message) {
  statusEl.textContent = message;
}

function initMap(lat = 0, lon = 0) {
  if (!mapEl) return;

  if (map) {
    map.setView([lat, lon], 13);
    if (marker) {
      marker.setLatLng([lat, lon]);
    } else {
      marker = L.marker([lat, lon]).addTo(map);
    }
    return;
  }

  map = L.map("map").setView([lat, lon], 13);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap contributors",
  }).addTo(map);
  marker = L.marker([lat, lon]).addTo(map);
}

function renderDetails(data) {
  ipValueEl.textContent = data.ip || "-";
  countryValueEl.textContent = data.country_name || "-";
  cityValueEl.textContent = data.city || "-";
  regionValueEl.textContent = data.region || "-";
  countryNameValueEl.textContent = data.country_name || "-";
  timezoneValueEl.textContent = data.timezone || "-";
  orgValueEl.textContent = data.connection?.org || data.org || "-";

  const lat = data.latitude;
  const lon = data.longitude;
  coordsValueEl.textContent = lat != null && lon != null ? `${lat}, ${lon}` : "-";
  accuracyValueEl.textContent = "-";

  if (lat != null && lon != null) {
    initMap(lat, lon);
  }

  resultEl.classList.remove("hidden");
}

function isPrivateIp(ip) {
  if (!ip) return false;
  // IPv6 checks (simple)
  if (ip.includes(":")) {
    const lo = ip.toLowerCase();
    if (lo === "::1") return true; // loopback
    if (lo.startsWith("fe80")) return true; // link-local
    if (lo.startsWith("fc") || lo.startsWith("fd")) return true; // unique local
    return false;
  }

  // IPv4 checks
  const parts = ip.split('.');
  if (parts.length !== 4) return false;
  const a = Number(parts[0]);
  const b = Number(parts[1]);
  if (Number.isNaN(a) || Number.isNaN(b)) return false;

  if (a === 10) return true; // 10.0.0.0/8
  if (a === 127) return true; // loopback
  if (a === 169 && b === 254) return true; // link-local
  if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
  if (a === 192 && b === 168) return true; // 192.168.0.0/16
  return false;
}

function showDeviceLocation(position) {
  const { latitude, longitude, accuracy } = position.coords;
  coordsValueEl.textContent = `${latitude}, ${longitude}`;
  accuracyValueEl.textContent = accuracy != null ? `${Math.round(accuracy)} m` : "-";
  initMap(latitude, longitude);
  ipValueEl.textContent = "Device location";
  countryValueEl.textContent = "Live";
  cityValueEl.textContent = "-";
  regionValueEl.textContent = "-";
  countryNameValueEl.textContent = "-";
  timezoneValueEl.textContent = "-";
  orgValueEl.textContent = "-";
  resultEl.classList.remove("hidden");
  updateStatus("Location received from your device.");
}

function handleLocationError(error) {
  let message = "Location permission was denied.";

  if (error.code === 1) {
    message = "Location access was denied. Please allow it in your browser.";
  } else if (error.code === 2) {
    message = "Location could not be determined right now.";
  } else if (error.code === 3) {
    message = "Location request timed out.";
  }

  updateStatus(message);
}

async function trackIp(inputValue = "") {
  const ip = inputValue.trim();

  if (!ip) {
    resultEl.classList.remove("hidden");
    ipValueEl.textContent = "-";
    countryValueEl.textContent = "Unavailable";
    cityValueEl.textContent = "-";
    regionValueEl.textContent = "-";
    countryNameValueEl.textContent = "-";
    timezoneValueEl.textContent = "-";
    orgValueEl.textContent = "-";
    coordsValueEl.textContent = "-";
    accuracyValueEl.textContent = "-";
    updateStatus("Enter an IP address to look it up. You can also use your device location.");
    return;
  }

  if (isPrivateIp(ip)) {
    resultEl.classList.remove("hidden");
    ipValueEl.textContent = ip;
    countryValueEl.textContent = "Private IP";
    cityValueEl.textContent = "-";
    regionValueEl.textContent = "-";
    countryNameValueEl.textContent = "-";
    timezoneValueEl.textContent = "-";
    orgValueEl.textContent = "-";
    coordsValueEl.textContent = "-";
    accuracyValueEl.textContent = "-";
    updateStatus("Private/local IP addresses cannot be geolocated via public IP services. Use 'Use my location' for device-based location.");
    return;
  }

  updateStatus(`Looking up ${ip}...`);

  try {
    const details = await fetchIpDetails(ip);
    renderDetails(details);
    updateStatus(`Tracked IP: ${ip}`);
    ipInput.value = ip;
  } catch (error) {
    resultEl.classList.remove("hidden");
    ipValueEl.textContent = ip;
    countryValueEl.textContent = "Unavailable";
    cityValueEl.textContent = "-";
    regionValueEl.textContent = "-";
    countryNameValueEl.textContent = "-";
    timezoneValueEl.textContent = "-";
    orgValueEl.textContent = "-";
    coordsValueEl.textContent = "-";
    accuracyValueEl.textContent = "-";
    updateStatus(error.message || "Something went wrong.");
  }
}

trackBtn.addEventListener("click", () => trackIp(ipInput.value));
locateBtn.addEventListener("click", () => {
  if (!navigator.geolocation) {
    updateStatus("Geolocation is not supported in this browser.");
    return;
  }

  updateStatus("Requesting your device location...");
  navigator.geolocation.getCurrentPosition(showDeviceLocation, handleLocationError, {
    enableHighAccuracy: true,
    timeout: 10000,
    maximumAge: 0,
  });
});
ipInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    trackIp(ipInput.value);
  }
});

window.addEventListener("DOMContentLoaded", () => {
  updateStatus("Enter an IP address to look it up, or use your device location.");
});

/* ---------- radar scanner panel ---------- */
const radarCanvas = document.getElementById('radar');
const radarCtx = radarCanvas.getContext('2d');
const pixelGrid = document.getElementById('pixelGrid');
const eqLeft = document.getElementById('eqLeft');
const eqRight = document.getElementById('eqRight');
const spectrum = document.getElementById('spectrum');
let radarTargets = [];

function resizeRadar() {
  const rect = radarCanvas.parentElement.getBoundingClientRect();
  const size = Math.floor(Math.min(rect.width, rect.height));
  radarCanvas.width = size;
  radarCanvas.height = size;
}
window.addEventListener('resize', resizeRadar);
resizeRadar();

function initRadarTargets() {
  radarTargets = [];
  for (let i = 0; i < 10; i++) {
    radarTargets.push({
      angle: Math.random() * 360,
      radius: 0.22 + Math.random() * 0.7,
      speed: (Math.random() * 0.12 - 0.02),
      heading: Math.random() * 360,
      intensity: 0.35 + Math.random() * 0.1,
    });
  }
}
initRadarTargets();

let sweepAngle = 0;
const SWEEP_SPEED = 0.7;

function drawRadar() {
  const w = radarCanvas.width;
  const h = radarCanvas.height;
  const cx = w / 2;
  const cy = h / 2;
  const R = Math.min(w, h) / 2 - 6;
  const beamWidth = 34;

  radarCtx.clearRect(0, 0, w, h);
  radarCtx.save();
  radarCtx.translate(cx, cy);
  radarCtx.beginPath();
  radarCtx.arc(0, 0, R, 0, Math.PI * 2);
  radarCtx.clip();

  radarCtx.fillStyle = 'rgba(1, 15, 9, 0.18)';
  radarCtx.fillRect(-R, -R, R * 2, R * 2);

  for (let r = 1; r <= 8; r++) {
    radarCtx.strokeStyle = r % 2 === 0 ? 'rgba(53,255,158,0.28)' : 'rgba(53,255,158,0.14)';
    radarCtx.lineWidth = r % 2 === 0 ? 1.2 : 0.8;
    radarCtx.beginPath();
    radarCtx.arc(0, 0, R * r / 8, 0, Math.PI * 2);
    radarCtx.stroke();
  }

  for (let a = 0; a < 360; a += 30) {
    const rad = a * Math.PI / 180;
    radarCtx.strokeStyle = 'rgba(53,255,158,0.18)';
    radarCtx.lineWidth = 1;
    radarCtx.beginPath();
    radarCtx.moveTo(0, 0);
    radarCtx.lineTo(R * Math.sin(rad), -R * Math.cos(rad));
    radarCtx.stroke();
  }

  const sweepRad = sweepAngle * Math.PI / 180;
  radarCtx.save();
  radarCtx.beginPath();
  radarCtx.moveTo(0, 0);
  const a0 = sweepRad - beamWidth * Math.PI / 180;
  const a1 = sweepRad;
  radarCtx.arc(0, 0, R, a0 - Math.PI / 2, a1 - Math.PI / 2, false);
  radarCtx.closePath();
  const wedgeGrad = radarCtx.createLinearGradient(
    R * Math.sin(a0), -R * Math.cos(a0),
    R * Math.sin(a1), -R * Math.cos(a1)
  );
  wedgeGrad.addColorStop(0, 'rgba(125,255,240,0)');
  wedgeGrad.addColorStop(1, 'rgba(125,255,240,0.55)');
  radarCtx.fillStyle = wedgeGrad;
  radarCtx.fill();
  radarCtx.restore();

  radarCtx.save();
  radarCtx.strokeStyle = 'rgba(220,255,250,0.95)';
  radarCtx.lineWidth = 2;
  radarCtx.shadowColor = '#9dfff0';
  radarCtx.shadowBlur = 10;
  radarCtx.beginPath();
  radarCtx.moveTo(0, 0);
  radarCtx.lineTo(R * Math.sin(sweepRad), -R * Math.cos(sweepRad));
  radarCtx.stroke();
  radarCtx.restore();

  radarTargets.forEach((target) => {
    target.radius += target.speed * 0.0015;
    if (target.radius > 0.95) target.radius = 0.95;
    if (target.radius < 0.15) target.radius = 0.15;
    target.angle = (target.angle + 0.02) % 360;

    const d = Math.abs(((target.angle - sweepAngle + 540) % 360) - 180);
    const active = d < beamWidth;
    target.intensity = active ? 1 : Math.max(0.35, target.intensity * 0.985);

    const rad = target.angle * Math.PI / 180;
    const px = R * target.radius * Math.sin(rad);
    const py = -R * target.radius * Math.cos(rad);

    radarCtx.save();
    radarCtx.translate(px, py);
    radarCtx.rotate(rad + target.heading * Math.PI / 180 * 0.15);
    radarCtx.fillStyle = `rgba(230,255,240,${target.intensity})`;
    radarCtx.shadowColor = 'rgba(125,255,200,0.9)';
    radarCtx.shadowBlur = 8 * target.intensity;
    radarCtx.beginPath();
    radarCtx.moveTo(0, -6);
    radarCtx.lineTo(4, 5);
    radarCtx.lineTo(0, 2);
    radarCtx.lineTo(-4, 5);
    radarCtx.closePath();
    radarCtx.fill();
    radarCtx.restore();
  });

  radarCtx.fillStyle = 'rgba(53,255,158,0.9)';
  radarCtx.beginPath();
  radarCtx.arc(0, 0, 3, 0, Math.PI * 2);
  radarCtx.fill();

  radarCtx.restore();

  radarCtx.strokeStyle = 'rgba(53,255,158,0.85)';
  radarCtx.lineWidth = 2.5;
  radarCtx.shadowColor = 'rgba(53,255,158,0.6)';
  radarCtx.shadowBlur = 6;
  radarCtx.beginPath();
  radarCtx.arc(cx, cy, R, 0, Math.PI * 2);
  radarCtx.stroke();
  radarCtx.shadowBlur = 0;

  radarCtx.fillStyle = 'rgba(200,255,225,0.85)';
  radarCtx.font = '9px Courier New';
  radarCtx.textAlign = 'center';
  radarCtx.textBaseline = 'middle';
  for (let a = 0; a < 360; a += 30) {
    const rad = a * Math.PI / 180;
    const lx = cx + (R + 13) * Math.sin(rad);
    const ly = cy - (R + 13) * Math.cos(rad);
    radarCtx.fillText(String(a).padStart(3, '0'), lx, ly);
  }

  sweepAngle = (sweepAngle + SWEEP_SPEED) % 360;
  document.getElementById('sweepBrg').textContent = String(Math.round(sweepAngle)).padStart(3, '0');
  document.getElementById('trackCount').textContent = radarTargets.length;
  requestAnimationFrame(drawRadar);
}

drawRadar();

function tickClock(){
  const now = new Date();
  document.getElementById('clock').textContent =
    [now.getUTCHours(),now.getUTCMinutes(),now.getUTCSeconds()]
      .map(v=>String(v).padStart(2,'0')).join(':');
}
setInterval(tickClock,1000);
tickClock();

function buildBars(container, count){
  const bars=[];
  for(let i=0;i<count;i++){ const d=document.createElement('div'); container.appendChild(d); bars.push(d);} return bars;
}
const pixelCells=[];
for(let i=0;i<30;i++){ const d=document.createElement('div'); pixelGrid.appendChild(d); pixelCells.push(d);} 
function flickerPixels(){ pixelCells.forEach(c=>{ const lit=Math.random()<0.35; c.style.background=lit ? 'rgba(53,255,158,0.8)' : 'rgba(53,255,158,0.10)'; c.style.boxShadow=lit ? '0 0 5px rgba(53,255,158,0.8)' : 'none';}); }
setInterval(flickerPixels,500); flickerPixels();

const eqLeftBars=buildBars(eqLeft,8);
const eqRightBars=buildBars(eqRight,8);
const specBars=buildBars(spectrum,64);
function animateBars(bars){ bars.forEach(b=>{ b.style.height=(10 + Math.random()*90) + '%'; }); }
setInterval(()=>{ animateBars(eqLeftBars); animateBars(eqRightBars); animateBars(specBars); },220);
animateBars(eqLeftBars); animateBars(eqRightBars); animateBars(specBars);
