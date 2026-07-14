const https = require('https');
const { getLinks, getClicks, saveClicks, decodeStatelessId } = require('./_storage');

async function getIpDetails(ip) {
  return new Promise((resolve) => {
    if (!ip || ip === '::1' || ip === '127.0.0.1' || ip.startsWith('192.168.') || ip.startsWith('10.')) {
      resolve({ success: true, country: 'Local Network', city: 'Testing Environment', latitude: 0, longitude: 0, isLocal: true });
      return;
    }
    https.get(`https://ipwho.is/${ip}`, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve(json.success ? json : null);
        } catch (e) { resolve(null); }
      });
    }).on('error', () => resolve(null));
  });
}

module.exports = async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) return res.status(400).send('Missing ID');

    // 1. Try to find the link in storage
    const links = getLinks();
    let target = links[id]?.target;

    // 2. Fallback: If not in storage, decode it from the ID itself (Stateless)
    if (!target) {
      target = decodeStatelessId(id);
    }

    if (!target) {
      return res.status(404).send('Link not found and cannot be recovered.');
    }

    // 3. Tracking logic (Best effort - might not persist on Vercel without DB)
    const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
    const ua = req.headers['user-agent'] || '';
    const ipDetails = await getIpDetails(ip);
    
    const clicks = getClicks();
    if (!clicks[id]) clicks[id] = [];
    
    const clickRecord = { at: new Date().toISOString(), ip, ua, silent: true };
    if (ipDetails) {
      clickRecord.ipDetails = {
        country: ipDetails.country, city: ipDetails.city,
        latitude: ipDetails.latitude, longitude: ipDetails.longitude,
        org: ipDetails.connection?.org || ipDetails.org,
        isLocal: !!ipDetails.isLocal
      };
    }

    clicks[id].push(clickRecord);
    saveClicks(clicks);

    // 4. Always redirect, even if tracking fails to save
    res.redirect(target);
  } catch (error) {
    res.status(500).send('Internal Server Error');
  }
};
