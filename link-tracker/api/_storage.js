const fs = require('fs');
const path = require('path');
const https = require('https');

// On Vercel, the only writable directory is /tmp
const isVercel = process.env.VERCEL || process.env.NOW_REGION;
const DATA_DIR = isVercel ? '/tmp/data' : path.join(process.cwd(), 'data');
const LINKS_FILE = path.join(DATA_DIR, 'links.json');
const CLICKS_FILE = path.join(DATA_DIR, 'clicks.json');

// REDIS PERSISTENCE (Optional but recommended for Vercel)
// If you add KV_URL to your Vercel Environment Variables, it will use permanent storage.
const REDIS_URL = process.env.KV_REST_API_URL;
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN;

async function redisSet(key, value) {
  if (!REDIS_URL || !REDIS_TOKEN) return false;
  return new Promise((resolve) => {
    const url = `${REDIS_URL}/set/${key}`;
    const req = https.request(url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${REDIS_TOKEN}` }
    }, (res) => resolve(true));
    req.on('error', () => resolve(false));
    req.write(JSON.stringify(value));
    req.end();
  });
}

async function redisGet(key) {
  if (!REDIS_URL || !REDIS_TOKEN) return null;
  return new Promise((resolve) => {
    const url = `${REDIS_URL}/get/${key}`;
    https.get(url, {
      headers: { Authorization: `Bearer ${REDIS_TOKEN}` }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.result ? JSON.parse(json.result) : null);
        } catch (e) { resolve(null); }
      });
    }).on('error', () => resolve(null));
  });
}

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

function encodeStatelessId(targetUrl) {
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

async function getLinks() {
  const redisData = await redisGet('links');
  if (redisData) return redisData;
  const data = readJson(LINKS_FILE);
  if (data) linksCache = data;
  return linksCache;
}

async function getClicks() {
  const redisData = await redisGet('clicks');
  if (redisData) return redisData;
  const data = readJson(CLICKS_FILE);
  if (data) clicksCache = data;
  return clicksCache;
}

async function saveLinks(data) {
  linksCache = data;
  writeJson(LINKS_FILE, data);
  await redisSet('links', data);
}

async function saveClicks(data) {
  clicksCache = data;
  writeJson(CLICKS_FILE, data);
  await redisSet('clicks', data);
}

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function isSafeRedirectUrl(url) {
  if (!url) return false;
  try {
    const u = new URL(url);
    // Allow only http and https
    if (u.protocol !== 'http:' && u.protocol !== 'https:') return false;
    // Block common internal/hostile schemes
    const hostname = u.hostname.toLowerCase();
    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0' || hostname === '[::1]') return false;
    if (hostname.endsWith('.local') || hostname.endsWith('.internal')) return false;
    // Block private IP ranges
    if (/^(10\.|172\.(1[6-9]|2\d|3[01])\.|192\.168\.)/.test(hostname)) return false;
    return true;
  } catch (e) {
    return false;
  }
}

function normalizeTargetUrl(url) {
  if (!url || typeof url !== 'string') throw new Error('target URL required');
  let u = url.trim();
  if (!u.startsWith('http://') && !u.startsWith('https://')) {
    u = 'https://' + u;
  }
  const parsed = new URL(u);
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') throw new Error('Only http / https URLs are allowed');
  return parsed.href;
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
  decodeStatelessId,
  isSafeRedirectUrl,
  normalizeTargetUrl
};
