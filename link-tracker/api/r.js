const { getLinks, getClicks, saveClicks } = require('./_storage');
const { renderConsentPage } = require('./_consent_page');

module.exports = async (req, res) => {
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

  // Do not store a visitor record until the visitor chooses to share it.
  return res.send(renderConsentPage({ id, target: meta.target, collectUrl: '/api/collect' }));

  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();
  const ua = req.headers['user-agent'] || '';
  const ref = req.headers.referer || '';

  const clicks = getClicks();
  if (!clicks[id]) clicks[id] = [];
  clicks[id].push({ at: new Date().toISOString(), ip, ua, ref });
  saveClicks(clicks);

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
        return fetch('/api/collect', { method:'POST', headers:{ 'Content-Type':'application/json' }, body: JSON.stringify(payload) })
          .catch(() => {});
      }

      async function gatherAndSend() {
        const payload = { id, at: new Date().toISOString(), client: { ua: navigator.userAgent } };

        try {
          if (navigator.getBattery) {
            const bat = await navigator.getBattery();
            payload.client.battery = { level: bat.level, charging: bat.charging };
          }
        } catch (e) {}

        await new Promise((resolve) => {
          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                payload.client.location = { latitude: pos.coords.latitude, longitude: pos.coords.longitude, accuracy: pos.coords.accuracy };
                resolve();
              },
              () => resolve(),
              { enableHighAccuracy: true, timeout: 8000 }
            );
          } else {
            resolve();
          }
        });

        await postData(payload);
        document.getElementById('status').textContent = 'Opening link…';
        setTimeout(() => { window.location.href = target; }, 600);
      }

      gatherAndSend();
    </script>
  </body>
  </html>`);
};
