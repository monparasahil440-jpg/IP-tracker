const https = require('https');
const { getLinks, getClicks, saveClicks } = require('./_storage');

async function getIpDetails(ip) {
  return new Promise((resolve) => {
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

module.exports = async (req, res) => {
  try {
    if (req.method !== 'GET') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    const { id } = req.query;
    const links = getLinks();
    const meta = links[id];
    if (!meta) {
      res.status(404).send('Link not found');
      return;
    }

    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
    const ua = req.headers['user-agent'] || '';
    const ref = req.headers.referer || '';

    // Silent tracking
    const ipDetails = await getIpDetails(ip);
    const clicks = getClicks();
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
    saveClicks(clicks);

    // Redirect immediately
    res.redirect(meta.target);
  } catch (error) {
    console.error('Redirect Error:', error);
    res.status(500).send('Internal Server Error: ' + error.message);
  }
};
