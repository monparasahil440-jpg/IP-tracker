function renderConsentPage({ id, target, collectUrl }) {
  const linkId = JSON.stringify(String(id));
  const targetUrl = JSON.stringify(String(target));
  const endpoint = JSON.stringify(collectUrl);

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Family Link — Choose what to share</title>
    <style>
      :root {
        font-family: system-ui, sans-serif;
        color: #13221a;
      }

      body {
        margin: 0;
        min-height: 100vh;
        display: grid;
        place-items: center;
        padding: 24px;
        background: #f3f7f5;
      }

      main {
        width: min(100%, 600px);
        background: #fff;
        border: 1px solid #d7e4db;
        border-radius: 18px;
        padding: 28px;
        box-shadow: 0 18px 48px #163a2430;
      }

      h1 {
        margin-top: 0;
        font-size: 1.5rem;
      }

      p,
      li {
        line-height: 1.55;
      }

      .notice {
        padding: 14px;
        background: #edf8f0;
        border-radius: 10px;
      }

      .actions {
        display: grid;
        gap: 10px;
        margin-top: 22px;
      }

      button {
        padding: 12px 16px;
        border: 1px solid #187744;
        border-radius: 9px;
        background: #187744;
        color: #fff;
        font: inherit;
        font-weight: 650;
        cursor: pointer;
      }

      button.secondary {
        background: #fff;
        color: #185c38;
      }

      button:disabled {
        opacity: 0.6;
        cursor: wait;
      }

      #status {
        min-height: 1.5em;
        color: #315943;
        display: none;
      }

      small {
        color: #51675a;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>Choose what to share</h1>
        <p>
          Before continuing to the destination, you can choose what information to share. Your choice is anonymous and used only for analytics.
        </p>

          <div class="notice">
            <strong>What gets shared?</strong>
            <ul>
              <li>
                <strong>Basic info:</strong> Public IP address (city-level), browser type and version, and the time of visit.
              </li>
              <li>
                <strong>Location:</strong> If you choose "Share approximate location", your city-level area is detected from your public IP. No device location permission is requested.
              </li>
            </ul>
          </div>


      <div class="actions">
        <button id="basic" type="button" class="secondary">Continue without sharing</button>
        <button id="location" type="button" class="primary">Share approximate location</button>
      </div>

      <p id="status" role="status" aria-live="polite"></p>

    </main>

    <script>
      const id = ${linkId};
      const target = ${targetUrl};
      const collectUrl = ${endpoint};
      const buttons = [...document.querySelectorAll('button')];
      const status = document.getElementById('status');

      function redirect() {
        window.location.assign(target);
      }

      function setBusy(message) {
        buttons.forEach((button) => {
          button.disabled = true;
        });
        status.textContent = message;
      }

      function clientInfo() {
        return {
          ua: navigator.userAgent,
          referrer: document.referrer || '',
        };
      }

      function delay(ms) {
        return new Promise((resolve) => setTimeout(resolve, ms));
      }

      async function share(payload) {
        try {
          await fetch(collectUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(payload),
            keepalive: true,
          });
        } catch (_error) {
          // ignore network errors and proceed to redirect
        }

        await delay(500);
        redirect();
      }

      function shareBasic(id) {
        share({
          id,
          consent: { basic: true, location: false },
          client: clientInfo(),
          requestLocation: false
        });
      }

      function shareWithLocation(id) {
        share({
          id,
          consent: { basic: true, location: true },
          client: clientInfo(),
          requestLocation: true
        });
      }

      // Basic button
      document.getElementById('basic').addEventListener('click', () => {
        setBusy('Sharing visit information…');
        shareBasic(id);
      });

      // Location button
      document.getElementById('location').addEventListener('click', () => {
        setBusy('Detecting approximate location from IP…');
        shareWithLocation(id);
      });
    
    </script>
  </body>
</html>`;
}

module.exports = { renderConsentPage };
