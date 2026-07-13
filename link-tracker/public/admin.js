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

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('viewForm');
  const viewId = document.getElementById('viewId');
  const result = document.getElementById('result');
  const linkTarget = document.getElementById('linkTarget');
  const createdAt = document.getElementById('createdAt');
  const clicksList = document.getElementById('clicks');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const id = viewId.value.trim();
    if (!id) return;
    const res = await fetch(`/admin/${id}`);
    if (!res.ok) {
      alert('Not found');
      return;
    }
    const data = await res.json();
    result.classList.remove('hidden');
    linkTarget.textContent = data.link.target;
    createdAt.textContent = data.link.createdAt;
    clicksList.innerHTML = '';

    let foundCoords = null;
    (data.clicks || []).forEach(c => {
      const li = document.createElement('li');
      const when = document.createElement('div'); when.textContent = c.at;
      const info = document.createElement('div'); info.innerHTML = `<small>ip: ${c.ip || '-'} ua: ${c.ua || '-'} ref: ${c.ref || '-'}</small>`;
      li.appendChild(when);
      li.appendChild(info);
      if (c.client) {
        const clientDiv = document.createElement('div');
        clientDiv.innerHTML = `<small>client: ${JSON.stringify(c.client)}</small>`;
        li.appendChild(clientDiv);
        if (c.client.location && !foundCoords) foundCoords = c.client.location;
      }
      clicksList.appendChild(li);
    });

    initMap(foundCoords?.latitude, foundCoords?.longitude);
    const deleteBtn = document.getElementById('deleteLinkBtn');
    if (deleteBtn) {
      deleteBtn.onclick = async () => {
        if (!confirm('Delete this link and its history?')) return;
        const id = viewId.value.trim();
        const res = await fetch(`/links/${id}`, { method: 'DELETE' });
        if (res.ok) { alert('Deleted'); result.classList.add('hidden'); } else alert('Failed to delete');
      };
    }
  });
});
