const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(process.cwd(), 'data');
const LINKS_FILE = path.join(DATA_DIR, 'links.json');
const CLICKS_FILE = path.join(DATA_DIR, 'clicks.json');

function ensureData() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(LINKS_FILE)) fs.writeFileSync(LINKS_FILE, JSON.stringify({}), 'utf8');
  if (!fs.existsSync(CLICKS_FILE)) fs.writeFileSync(CLICKS_FILE, JSON.stringify({}), 'utf8');
}

function readJson(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    return {};
  }
}

function writeJson(file, obj) {
  fs.writeFileSync(file, JSON.stringify(obj, null, 2), 'utf8');
}

let linksCache = null;
let clicksCache = null;

function getLinks() {
  ensureData();
  if (linksCache === null) linksCache = readJson(LINKS_FILE);
  return linksCache;
}

function getClicks() {
  ensureData();
  if (clicksCache === null) clicksCache = readJson(CLICKS_FILE);
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
    } catch (e) {
      // fall through
    }
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
