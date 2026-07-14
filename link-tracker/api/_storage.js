const fs = require('fs');
const path = require('path');

// On Vercel, the only writable directory is /tmp
const isVercel = process.env.VERCEL || process.env.NOW_REGION;
const DATA_DIR = isVercel ? '/tmp/data' : path.join(process.cwd(), 'data');
const LINKS_FILE = path.join(DATA_DIR, 'links.json');
const CLICKS_FILE = path.join(DATA_DIR, 'clicks.json');

// In-memory fallback for Vercel since /tmp is cleared between invocations
let linksCache = {};
let clicksCache = {};

function ensureData() {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(LINKS_FILE)) {
      fs.writeFileSync(LINKS_FILE, JSON.stringify(linksCache), 'utf8');
    }
    if (!fs.existsSync(CLICKS_FILE)) {
      fs.writeFileSync(CLICKS_FILE, JSON.stringify(clicksCache), 'utf8');
    }
  } catch (e) {
    console.error('Storage initialization failed:', e);
  }
}

function readJson(file) {
  try {
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    }
  } catch (e) {
    console.error(`Failed to read ${file}:`, e);
  }
  return null;
}

function writeJson(file, obj) {
  try {
    ensureData();
    fs.writeFileSync(file, JSON.stringify(obj, null, 2), 'utf8');
    return true;
  } catch (e) {
    console.error(`Failed to write ${file}:`, e);
    return false;
  }
}

function getLinks() {
  const data = readJson(LINKS_FILE);
  if (data) linksCache = data;
  return linksCache;
}

function getClicks() {
  const data = readJson(CLICKS_FILE);
  if (data) clicksCache = data;
  return clicksCache;
}

function saveLinks(data) {
  linksCache = data;
  writeJson(LINKS_FILE, data);
}

function saveClicks(data) {
  clicksCache = data;
  writeJson(CLICKS_FILE, data);
}

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function getBaseUrl(req) {
  const origin = req.headers.origin || req.headers.referer || '';
  if (origin) {
    try {
      const u = new URL(origin);
      return `${u.protocol}//${u.host}`;
    } catch (e) {}
  }

  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:3000';
  const proto = (req.headers['x-forwarded-proto'] || 'https').split(',')[0];
  return `${proto}://${host}`;
}

module.exports = {
  getLinks,
  getClicks,
  saveLinks,
  saveClicks,
  makeId,
  getBaseUrl,
};
