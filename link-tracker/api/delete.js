const { getLinks, getClicks, saveLinks, saveClicks } = require('./_storage');

module.exports = async (req, res) => {
  const id = req.query.id;
  if (req.method === 'DELETE') {
    if (!id) {
      return res.status(400).json({ error: 'id required' });
    }

    const links = getLinks();
    if (!links[id]) {
      return res.status(404).json({ error: 'not found' });
    }
    delete links[id];
    saveLinks(links);

    const clicks = getClicks();
    if (clicks[id]) {
      delete clicks[id];
      saveClicks(clicks);
    }

    return res.json({ ok: true });
  }

  res.status(405).json({ error: 'Method Not Allowed' });
};
