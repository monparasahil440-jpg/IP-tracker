const https = require('https');
const { getLinks, getClicks, saveClicks, decodeStatelessId, isSafeRedirectUrl, getBaseUrl } = require('./_storage');
const { renderConsentPage } = require('./_consent_page');

module.exports = async (req, res) => {
  try {
    const { id } = req.query;
    if (!id) return res.status(400).send('Missing ID');

    // 1. Try to find the link in storage
    const links = await getLinks();
    let target = links[id]?.target;

    // 2. Fallback: If not in storage, decode it from the ID itself (Stateless)
    if (!target) {
      target = decodeStatelessId(id);
    }

    if (!target || !isSafeRedirectUrl(target)) {
      return res.status(404).send('Link not found and cannot be recovered.');
    }

    // 3. Show consent page instead of silently tracking
    const base = getBaseUrl(req);
    const collectUrl = `${base}/api/collect`;
    const consentPage = renderConsentPage({ id, target, collectUrl });
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.status(200).send(consentPage);
  } catch (error) {
    res.status(500).send('Internal Server Error');
  }
};
