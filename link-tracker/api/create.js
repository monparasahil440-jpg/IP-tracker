const { getLinks, saveLinks, getBaseUrl, encodeStatelessId } = require('./_storage');

module.exports = async (req, res) => {
  try {
    if (req.method !== 'POST') {
      res.status(405).send('Method Not Allowed');
      return;
    }

    const target = req.body?.target;
    if (!target) {
      res.status(400).json({ error: 'target URL required' });
      return;
    }

    // On Vercel, we use stateless IDs so the link never breaks
    const id = encodeStatelessId(target);
    
    // We still try to save it for the session dashboard, but the link itself 
    // will work even if this file is deleted later.
    const links = getLinks();
    links[id] = { target, note: req.body?.note || null, createdAt: new Date().toISOString() };
    saveLinks(links);

    let base = null;
    try {
      const suggested = req.body?.base ? String(req.body.base).replace(/\/$/, '') : null;
      if (suggested) {
        const su = new URL(suggested);
        const origin = req.headers.origin || req.headers.referer;
        if (origin) {
          const ru = new URL(origin);
          if (ru.protocol === su.protocol && ru.host === su.host) base = `${su.protocol}//${su.host}`;
        }
      }
    } catch (e) { base = null; }

    if (!base) base = getBaseUrl(req);
    res.json({ id, url: `${base}/r/${id}` });
  } catch (error) {
    res.status(500).json({ error: 'Internal Server Error', details: error.message });
  }
};
