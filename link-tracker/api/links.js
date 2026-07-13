const { getLinks, getClicks, saveLinks, saveClicks } = require('./_storage');

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    return res.status(200).json(getLinks());
  }

  if (req.method === 'DELETE') {
    saveLinks({});
    saveClicks({});
    return res.json({ ok: true });
  }

  res.status(405).json({ error: 'Method Not Allowed' });
};
