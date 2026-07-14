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

Consent-based sharing flow

When a family link is opened, it shows a choice page before any visitor record is stored. The visitor can:

- Continue without sharing any visit data.
- Voluntarily share basic visit data: public IP, browser/device information, visit time, and referrer when available.
- Voluntarily share current location. The browser will show its normal location permission prompt; declining still allows the visitor to continue.

Geolocation requires user consent and usually HTTPS (localhost is allowed). The app does not collect battery data.

Legal & ethical reminder: Always obtain consent from the person whose device you are requesting device data from. Do not use this feature to track people without permission.

Notes & limitations
- This demo stores data in JSON files under `data/`.
- For production use, add authentication for the admin view, use a proper database, rate-limiting, input validation, and hosting behind HTTPS.
- Always disclose tracking and obtain consent when required.

ngrok http 3000

$env:BASE_URL='https://yourdomain.example'
node server.js
