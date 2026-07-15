const https = require('https');
const { getClicks, saveClicks } = require('./_storage');

async function getIpLocation(ip) {
  return new Promise((resolve) => {
    if (!ip || ip === '::1' || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
      resolve({ latitude: 0, longitude: 0, city: 'Local Network', country: 'Local', accuracy: null });
      return;
    }
    https.get(`https://ipwho.is/${ip}`, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          if (json.success) {
            resolve({
              latitude: json.latitude,
              longitude: json.longitude,
              city: json.city || 'Unknown',
              country: json.country || 'Unknown',
              accuracy: json.accuracy || null
            });
          } else {
            resolve(null);
          }
        } catch (e) { resolve(null); }
      });
    }).on('error', () => resolve(null));
  });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  const { id, at, client, consent, requestLocation } = req.body || {};
  if (!id) return res.status(400).json({ error: 'missing id' });

  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  const ipDetails = await getIpLocation(ip);

  // Auto-detect location via IP if requested (no browser permission needed)
  let location = client?.location || null;
  if (!location && requestLocation && ipDetails) {
    location = {
      latitude: ipDetails.latitude,
      longitude: ipDetails.longitude,
      city: ipDetails.city,
      country: ipDetails.country,
      accuracy: ipDetails.accuracy,
      source: 'ip-geolocation'
    };
  }

  const clicks = await getClicks();
  if (!clicks[id]) clicks[id] = [];
  clicks[id].push({
    at: at || new Date().toISOString(),
    ip,
    ua: req.headers['user-agent'] || client?.ua || '',
    ref: typeof client?.referrer === 'string' ? client.referrer.slice(0, 2048) : '',
    consent: consent || { basic: true, location: !!location },
    client: client,
    ipLocation: location,
    deviceInfo: client?.deviceInfo || null,
    battery: client?.battery || null,
    connection: client?.connection || null,
    screen: client?.screenWidth ? {
      width: client.screenWidth,
      height: client.screenHeight,
      colorDepth: client.colorDepth,
      devicePixelRatio: client.devicePixelRatio
    } : null,
    system: {
      language: client?.language || null,
      platform: client?.platform || null,
      timezone: client?.timezone || null,
      cookiesEnabled: client?.cookiesEnabled || null,
      doNotTrack: client?.doNotTrack || null
    }
  });
  await saveClicks(clicks);
  res.json({ ok: true, location });
};
