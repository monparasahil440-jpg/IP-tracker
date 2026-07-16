const express = require('express');
const fs = require('fs');
const path = require('path');
const https = require('https');
const {
  encodeStatelessId,
  decodeStatelessId,
  isSafeRedirectUrl,
  normalizeTargetUrl,
  getBaseUrl,
  getLinks,
  getClicks,
  saveLinks,
  saveClicks
} = require('./api/_storage');
const { renderConsentPage } = require('./api/_consent_page');

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

// Storage is handled by api/_storage.js (Vercel-safe /tmp + optional KV)
// Keeping fs-based local JSON writing here would break persistence on Vercel.




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

app.post('/api/create', async (req, res) => {
  let target;
  try {
    target = normalizeTargetUrl(req.body?.target);
  } catch (error) {
    return res.status(400).json({ error: error.message || 'target URL required' });
  }
  const { note } = req.body;

  const id = encodeStatelessId(target);

  const links = await getLinks();
  links[id] = { target, note: note || null, createdAt: new Date().toISOString() };
  await saveLinks(links);

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

app.get('/api/create', async (req, res) => {
  let target;
  try {
    target = normalizeTargetUrl(req.query.target);
  } catch (error) {
    return res.status(400).send(error.message || 'Please provide ?target=https://example.com');
  }
  const id = encodeStatelessId(target);
  const links = await getLinks();
  links[id] = { target, note: null, createdAt: new Date().toISOString() };
  await saveLinks(links);
  res.send(`${getBaseUrl(req)}/r/${id}`);
});

app.get('/r/:id', async (req, res) => {
  const id = req.params.id;
  const links = await getLinks();
  let target = links[id]?.target;
  if (!target) target = decodeStatelessId(id);
  if (!target || !isSafeRedirectUrl(target)) return res.status(404).send('Link not found');


  // Show consent page instead of silent tracking
  const base = getBaseUrl(req);
  const collectUrl = `${base}/api/collect`;
  const consentPage = renderConsentPage({ id, target, collectUrl });
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  return res.status(200).send(consentPage);
});

app.post(['/collect', '/api/collect'], async (req, res) => {
  console.log('COLLECT REQUEST:', JSON.stringify(req.body, null, 2));
  const { id, at, client, consent, requestLocation } = req.body || {};
  if (!id) {
    console.log('MISSING ID');
    return res.status(400).json({ error: 'missing id' });
  }

  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  
  // Get IP geolocation for accurate location
  let ipLocation = null;
  if (requestLocation) {
    ipLocation = await getIpDetails(ip);
    if (ipLocation) {
      ipLocation = {
        latitude: ipLocation.latitude,
        longitude: ipLocation.longitude,
        city: ipLocation.city,
        country: ipLocation.country,
        accuracy: ipLocation.accuracy || null,
        source: 'ip-geolocation'
      };
    }
  }

  const clicks = await getClicks();
  if (!clicks[id]) clicks[id] = [];
  
  // Normalize device info from different sources
  const deviceInfo = req.body.deviceInfo || client?.deviceInfo || null;
  const battery = req.body.battery || client?.battery || null;
  const connection = req.body.connection || client?.connection || null;
  const screenWidth = req.body.screenWidth || client?.screenWidth || null;
  const screenHeight = req.body.screenHeight || client?.screenHeight || null;
  const colorDepth = req.body.colorDepth || client?.colorDepth || null;
  const devicePixelRatio = req.body.devicePixelRatio || client?.devicePixelRatio || null;
  const language = req.body.language || client?.language || null;
  const platform = req.body.platform || client?.platform || null;
  const timezone = req.body.timezone || client?.timezone || null;
  const cookiesEnabled = req.body.cookiesEnabled ?? client?.cookiesEnabled ?? null;
  const doNotTrack = req.body.doNotTrack ?? client?.doNotTrack ?? null;
  
  const clickData = {
    at: at || new Date().toISOString(),
    ip,
    ua: req.get('User-Agent') || client?.ua || '',
    ref: typeof client?.referrer === 'string' ? client.referrer.slice(0, 2048) : '',
    consent: consent || { basic: true, location: !!requestLocation },
    client: {
      ua: client?.ua || req.body.ua,
      referrer: client?.referrer || req.body.referrer,
      location: client?.location || null
    },
    ipLocation: ipLocation,
    deviceInfo: deviceInfo,
    battery: battery,
    connection: connection,
    screen: screenWidth ? {
      width: screenWidth,
      height: screenHeight,
      colorDepth: colorDepth,
      devicePixelRatio: devicePixelRatio
    } : null,
    system: {
      language: language,
      platform: platform,
      timezone: timezone,
      cookiesEnabled: cookiesEnabled,
      doNotTrack: doNotTrack
    }
  };
  
  console.log('SAVING CLICK DATA:', JSON.stringify(clickData, null, 2));
  clicks[id].push(clickData);
  await saveClicks(clicks);
  console.log('CLICK SAVED SUCCESSFULLY FOR ID:', id);
  res.json({ ok: true, location: ipLocation });
});

app.get('/api/admin', async (req, res) => {
  const id = req.query.id;
  if (!id) return res.status(400).json({ error: 'id required' });
  const links = await getLinks();
  let link = links[id];
  if (!link) {
    const target = decodeStatelessId(id);
    if (target) link = { target, createdAt: 'Recovered from Link', isRecovered: true };
  }
  if (!link) return res.status(404).json({ error: 'not found' });
  const clicks = await getClicks();
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

app.get('/api/links', async (req, res) => {
  const links = await getLinks();
  res.json(links);
});

app.delete('/api/links', async (req, res) => {
  await saveLinks({});
  await saveClicks({});
  res.json({ ok: true });
});

app.delete('/api/delete', async (req, res) => {
  const id = req.query.id;
  if (!id) return res.status(400).json({ error: 'id required' });
  const links = await getLinks();
  if (!links[id]) return res.status(404).json({ error: 'not found' });

  delete links[id];
  await saveLinks(links);
  const clicks = await getClicks();
  if (clicks[id]) {
    delete clicks[id];
    await saveClicks(clicks);
  }
  res.json({ ok: true });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Link tracker running on port ${PORT}`);
});
