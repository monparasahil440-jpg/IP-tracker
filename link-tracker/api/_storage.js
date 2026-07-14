const fs = require('fs');
const path = require('path');

// On Vercel, the only writable directory is /tmp
const isVercel = process.env.VERCEL || process.env.NOW_REGION;
const DATA_DIR = isVercel ? '/tmp/data' : path.join(process.cwd(), 'data');
const LINKS_FILE = path.join(DATA_DIR, 'links.json');
const CLICKS_FILE = path.join(DATA_DIR, 'clicks.json');

let linksCache = {};
let clicksCache = {};

function ensureData() {
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    if (!fs.existsSync(LINKS_FILE)) fs.writeFileSync(LINKS_FILE, JSON.stringify({}), 'utf8');
    if (!fs.existsSync(CLICKS_FILE)) fs.writeFileSync(CLICKS_FILE, JSON.stringify({}), 'utf8');
  } catch (e) {}
}

function readJson(file) {
  try {
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {}
  return null;
}

function writeJson(file, obj) {
  try {
    ensureData();
    fs.writeFileSync(file, JSON.stringify(obj, null, 2), 'utf8');
    return true;
  } catch (e) { return false; }
}

// Stateless Link Helpers: Encode/Decode target URL into the ID
function encodeStatelessId(targetUrl) {
  // We use a prefix 's_' to identify stateless links
  const b64 = Buffer.from(targetUrl).toString('base64url');
  return `s_${b64}`;
}

function decodeStatelessId(id) {
  if (id && id.startsWith('s_')) {
    try {
      const b64 = id.substring(2);
      return Buffer.from(b64, 'base64url').toString('utf8');
    } catch (e) { return null; }
  }
  return null;
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
  encodeStatelessId,
  decodeStatelessId
};
