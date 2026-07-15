const express = require('express');
const fs = require('fs');
const path = require('path');
const https = require('https');
const { encodeStatelessId, decodeStatelessId, isSafeRedirectUrl, normalizeTargetUrl } = require('./api/_storage');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.set('trust proxy', true);

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  if (req.method === 'OPTIONS') return res.sendStatus(204);
  next();
});

const DATA_DIR = path.resolve(__dirname, 'data');
const LINKS_FILE = path.join(DATA_DIR, 'links.json');
const CLICKS_FILE = path.join(DATA_DIR, 'clicks.json');

function ensureData() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  if (!fs.existsSync(LINKS_FILE)) fs.writeFileSync(LINKS_FILE, JSON.stringify({}), 'utf8');
  if (!fs.existsSync(CLICKS_FILE)) fs.writeFileSync(CLICKS_FILE, JSON.stringify({}), 'utf8');
}

ensureData();

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

function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function getBaseUrl(req) {
  if (process.env.BASE_URL) return process.env.BASE_URL.replace(/\/$/, '');
  const referer = req.get('Referer') || req.get('Origin');
  if (referer) {
    try {
      const u = new URL(referer);
      return `${u.protocol}//${u.host}`;
    } catch (e) {}
  }
  const proto = (req.get('x-forwarded-proto') || req.protocol).split(',')[0];
  const host = req.get('x-forwarded-host') || req.get('host');
  return `${proto}://${host}`;
}

async function getIpDetails(ip) {
  return new Promise((resolve) => {
    // Handle local IP addresses for testing
    if (!ip || ip === '::1' || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
      resolve({
        success: true,
        country: 'Local Network',
        city: 'Testing Environment',
        region: 'N/A',
        latitude: 0,
        longitude: 0,
        connection: { org: 'Internal / Localhost' },
        isLocal: true
      });
      return;
    }
    https.get(`https://ipwho.is/${ip}`, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.success ? json : null);
        } catch (e) {
          resolve(null);
        }
      });
    }).on('error', () => {
      resolve(null);
    });
  });
}

app.post('/api/create', (req, res) => {
  let target;
  try {
    target = normalizeTargetUrl(req.body?.target);
  } catch (error) {
    return res.status(400).json({ error: error.message || 'target URL required' });
  }
  const { note } = req.body;

  const id = encodeStatelessId(target);
  const links = readJson(LINKS_FILE);
  links[id] = { target, note: note || null, createdAt: new Date().toISOString() };
  writeJson(LINKS_FILE, links);

  let base = null;
  try {
    const suggested = req.body && req.body.base ? String(req.body.base).replace(/\/$/, '') : null;
    if (suggested) {
      const su = new URL(suggested);
      const referer = req.get('Referer') || req.get('Origin');
      if (referer) {
        try {
          const ru = new URL(referer);
          if (ru.protocol === su.protocol && ru.host === su.host) base = `${su.protocol}//${su.host}`;
        } catch (e) {}
      }
    }
  } catch (e) { base = null; }
  if (!base) base = getBaseUrl(req);
  const url = `${base}/r/${id}`;
  res.json({ id, url });
});

app.get('/api/create', (req, res) => {
  let target;
  try {
    target = normalizeTargetUrl(req.query.target);
  } catch (error) {
    return res.status(400).send(error.message || 'Please provide ?target=https://example.com');
  }
  const id = encodeStatelessId(target);
  const links = readJson(LINKS_FILE);
  links[id] = { target, note: null, createdAt: new Date().toISOString() };
  writeJson(LINKS_FILE, links);
  res.send(`${getBaseUrl(req)}/r/${id}`);
});

app.get('/r/:id', async (req, res) => {
  const id = req.params.id;
  const links = readJson(LINKS_FILE);
  let target = links[id]?.target;
  if (!target) target = decodeStatelessId(id);
  if (!target || !isSafeRedirectUrl(target)) return res.status(404).send('Link not found');

  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  const ua = req.get('User-Agent') || '';
  const ref = req.get('Referer') || '';

  // Silent tracking: get IP details and log immediately
  const ipDetails = await getIpDetails(ip);
  
  const clicks = readJson(CLICKS_FILE);
  if (!clicks[id]) clicks[id] = [];
  
  const clickRecord = {
    at: new Date().toISOString(),
    ip,
    ua,
    ref,
    silent: true
  };

  if (ipDetails) {
    clickRecord.ipDetails = {
      country: ipDetails.country,
      city: ipDetails.city,
      region: ipDetails.region,
      latitude: ipDetails.latitude,
      longitude: ipDetails.longitude,
      org: ipDetails.connection?.org || ipDetails.org,
      isLocal: !!ipDetails.isLocal
    };
  }

  clicks[id].push(clickRecord);
  writeJson(CLICKS_FILE, clicks);

  // Redirect immediately
  res.redirect(target);
});

app.post(['/collect', '/api/collect'], (req, res) => {
  const { id, at, client, consent } = req.body || {};
  if (!id) return res.status(400).json({ error: 'missing id' });

  const location = client?.location;
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();

  const clicks = readJson(CLICKS_FILE);
  if (!clicks[id]) clicks[id] = [];
  clicks[id].push({
    at: at || new Date().toISOString(),
    ip,
    ua: req.get('User-Agent') || client?.ua || '',
    ref: typeof client?.referrer === 'string' ? client.referrer.slice(0, 2048) : '',
    consent: consent || { basic: true, location: !!location },
    client: client
  });
  writeJson(CLICKS_FILE, clicks);
  res.json({ ok: true });
});

app.get('/api/admin', (req, res) => {
  const id = req.query.id;
  if (!id) return res.status(400).json({ error: 'id required' });
  const links = readJson(LINKS_FILE);
  let link = links[id];
  if (!link) {
    const target = decodeStatelessId(id);
    if (target) link = { target, createdAt: 'Recovered from Link', isRecovered: true };
  }
  if (!link) return res.status(404).json({ error: 'not found' });
  const clicks = readJson(CLICKS_FILE);
  res.json({ id, link, clicks: clicks[id] || [] });
});

app.use(express.static(path.join(__dirname, 'public')));

const ROOT_DIR = path.resolve(__dirname, '..');
app.get(['/ip-tracker', '/ip-tracker/'], (req, res) => {
  res.sendFile(path.join(ROOT_DIR, 'index.html'));
});
app.use('/ip-tracker', express.static(ROOT_DIR));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/api/links', (req, res) => {
  const links = readJson(LINKS_FILE);
  res.json(links);
});

app.delete('/api/links', (req, res) => {
  writeJson(LINKS_FILE, {});
  writeJson(CLICKS_FILE, {});
  res.json({ ok: true });
});

app.delete('/api/delete', (req, res) => {
  const id = req.query.id;
  if (!id) return res.status(400).json({ error: 'id required' });
  const links = readJson(LINKS_FILE);
  if (!links[id]) return res.status(404).json({ error: 'not found' });

  delete links[id];
  writeJson(LINKS_FILE, links);
  const clicks = readJson(CLICKS_FILE);
  if (clicks[id]) {
    delete clicks[id];
    writeJson(CLICKS_FILE, clicks);
  }
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Link tracker running on port ${PORT}`);
});
