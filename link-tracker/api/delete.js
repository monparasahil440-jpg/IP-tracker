const { getLinks, getClicks, saveLinks, saveClicks } = require('./_storage');

module.exports = async (req, res) => {
  try {
    const id = req.query.id;
    if (req.method !== 'DELETE') return res.status(405).json({ error: 'Method Not Allowed' });
    if (!id) return res.status(400).json({ error: 'id required' });

    const links = getLinks();
    if (links[id]) {
      delete links[id];
      saveLinks(links);
    }

    const clicks = getClicks();
    if (clicks[id]) {
      delete clicks[id];
      saveClicks(clicks);
    }

    return res.json({ ok: true });
  } catch (e) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
