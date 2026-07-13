const { getClicks, saveClicks } = require('./_storage');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.status(405).send('Method Not Allowed');
    return;
  }

  const { id, at, client } = req.body || {};
  if (!id) {
    res.status(400).json({ error: 'missing id' });
    return;
  }

  const clicks = getClicks();
  if (!clicks[id]) clicks[id] = [];
  clicks[id].push({ at: at || new Date().toISOString(), client });
  saveClicks(clicks);
  res.json({ ok: true });
};
