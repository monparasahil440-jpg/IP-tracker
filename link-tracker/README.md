Link Tracker (demo)

This small demo creates short tracking links that redirect to a target URL and log basic click metadata (timestamp, IP, user-agent, referer).

Important legal & ethical notice
- Only use this tool for legitimate, consensual purposes (e.g., internal tests, marketing emails where recipients consent, analytics for your own links).
- Do NOT use this to track people without their knowledge or to deanonymize users.
- Respect privacy laws (GDPR, CCPA) and obtain consent where required.

Quick start

1. Install dependencies

```bash
cd "d:\IP tracker\link-tracker"
npm install
```

2. Run the server

```bash
npm start
```

3. Create a tracking link

- Via the homepage form at `http://localhost:3000/`
- Or with curl:

```bash
curl -X POST -H "Content-Type: application/json" -d '{"target":"https://example.com"}' http://localhost:3000/create
```

You will receive a short URL like `http://localhost:3000/r/abc123`.

4. Inspect clicks

Visit `http://localhost:3000/admin/abc123` to see logged clicks.

Advanced: request device permissions

The server now serves an interstitial page when a tracking link is opened. That page will:
- Log the initial request (IP, UA, referer) immediately.
- Ask the browser for optional permissions (geolocation). If the user allows, the page will send location and battery data back to the server before redirecting to the final target.

Important: Geolocation requires user consent and usually HTTPS (localhost is allowed). The Battery API may be unavailable in some browsers.

Legal & ethical reminder: Always obtain consent from the person whose device you are requesting device data from. Do not use this feature to track people without permission.

Notes & limitations
- This demo stores data in JSON files under `data/`.
- For production use, add authentication for the admin view, use a proper database, rate-limiting, input validation, and hosting behind HTTPS.
- Always disclose tracking and obtain consent when required.

ngrok http 3000

$env:BASE_URL='https://yourdomain.example'
node server.js
