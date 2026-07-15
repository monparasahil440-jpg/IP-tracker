const { getLinks } = require('./_storage');

module.exports = (req, res) => {
  try {
    if (req.method === 'GET') {
      const links = getLinks();
      res.status(200).json(links || {});
    } else {
      res.status(405).send('Method Not Allowed');
    }
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error' });
  }
};
