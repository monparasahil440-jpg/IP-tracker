const { getLinks, getClicks } = require('./_storage');

module.exports = async (req, res) => {
  try {
    if (req.method !== 'GET') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    const { id } = req.query;
    const links = getLinks();
    const link = links[id];
    if (!link) {
      return res.status(404).json({ error: 'not found' });
    }

    const clicks = getClicks();
    res.json({ id, link, clicks: clicks[id] || [] });
  } catch (error) {
    console.error('API Admin Error:', error);
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
};
