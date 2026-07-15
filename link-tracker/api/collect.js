const { getClicks, saveClicks } = require('./_storage');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  const { id, at, client, consent } = req.body || {};
  if (!id) return res.status(400).json({ error: 'missing id' });

  const location = client?.location;
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();

  const clicks = await getClicks();
  if (!clicks[id]) clicks[id] = [];
  clicks[id].push({
    at: at || new Date().toISOString(),
    ip,
    ua: req.headers['user-agent'] || client?.ua || '',
    ref: typeof client?.referrer === 'string' ? client.referrer.slice(0, 2048) : '',
    consent: consent || { basic: true, location: !!location },
    client: client
  });
  await saveClicks(clicks);
  res.json({ ok: true });
};
