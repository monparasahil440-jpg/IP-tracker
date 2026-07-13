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
