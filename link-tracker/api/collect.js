const { getClicks, saveClicks } = require('./_storage');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  const { id, at, client, consent } = req.body || {};
  if (!id) {
    res.status(400).json({ error: 'missing id' });
    return;
  }
  if (!consent?.basic) {
    res.status(400).json({ error: 'basic sharing consent is required' });
    return;
  }

  const location = client?.location;
  const validLocation = consent.location === true && Number.isFinite(location?.latitude) && Number.isFinite(location?.longitude)
    && location.latitude >= -90 && location.latitude <= 90 && location.longitude >= -180 && location.longitude <= 180;
  const ip = (req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').split(',')[0].trim();

  const clicks = getClicks();
  if (!clicks[id]) clicks[id] = [];
  clicks[id].push({
    at: at || new Date().toISOString(),
    ip,
    ua: req.headers['user-agent'] || client?.ua || '',
    ref: typeof client?.referrer === 'string' ? client.referrer.slice(0, 2048) : '',
    consent: { basic: true, location: validLocation },
    client: validLocation ? { location: { latitude: location.latitude, longitude: location.longitude, accuracy: Number.isFinite(location.accuracy) ? location.accuracy : null } } : undefined,
  });
  saveClicks(clicks);
  res.json({ ok: true });
};
