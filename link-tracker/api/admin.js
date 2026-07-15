const { getLinks, getClicks, decodeStatelessId } = require('./_storage');

module.exports = async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) return res.status(400).json({ error: 'id required' });

    const links = await getLinks();
    let link = links[id];

    // If not in storage, recover metadata from ID
    if (!link) {
      const target = decodeStatelessId(id);
      if (target) {
        link = { target, createdAt: 'Recovered from Link', isRecovered: true };
      }
    }

    if (!link) return res.status(404).json({ error: 'not found' });

    const clicks = await getClicks();
    res.json({ id, link, clicks: clicks[id] || [] });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
