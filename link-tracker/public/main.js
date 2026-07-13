// Choose API base depending on how the UI is served:
// - If opened from file:// or served by a local static server (e.g. Live Server on :5500),
//   point API calls to the running Node server at http://localhost:3000
// - Otherwise use same-origin relative URLs (when the Express server is serving the UI)
const isLocalDevServer = location.protocol === 'file:' || (['localhost', '127.0.0.1', '0.0.0.0'].includes(location.hostname) && location.port && location.port !== '3000');
const API_BASE = isLocalDevServer ? 'http://localhost:3000' : '';

async function createLink(target) {
  const res = await fetch(`${API_BASE}/create`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target, base: (API_BASE || window.location.origin) }) });
  const text = await res.text();
  if (!res.ok) throw new Error(text);
  return JSON.parse(text);
}

async function listLinks() {
  const res = await fetch(`${API_BASE}/links`);
  const text = await res.text();
  if (!res.ok) throw new Error(text);
  return JSON.parse(text);
}

document.addEventListener('DOMContentLoaded', async () => {
  const form = document.getElementById('createForm');
  const targetInput = document.getElementById('target');
  const created = document.getElementById('created');
  const createdUrl = document.getElementById('createdUrl');
  const adminUrl = document.getElementById('adminUrl');
  const linksList = document.getElementById('linksList');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const target = targetInput.value.trim();
    if (!target) return;
    const data = await createLink(target);
    created.classList.remove('hidden');
    createdUrl.href = data.url; createdUrl.textContent = data.url;
    const adminPath = `${API_BASE || ''}/admin/${data.id}`;
    adminUrl.href = adminPath; adminUrl.textContent = adminPath;
    targetInput.value = '';
    await refreshList();
  });

  async function refreshList(){
    try {
      const links = await listLinks();
      linksList.innerHTML = Object.keys(links).length ? Object.entries(links).map(([id,l])=>{
        const base = API_BASE || '';
        return `<div class="linkItem"><div><strong>${id}</strong> — <a href="${base}/r/${id}" target="_blank">${base}/r/${id}</a></div><div class="small">${l.target}</div><div style="margin-top:6px"><a href="${base}/admin/${id}" target="_blank">Admin</a> · <a href="#" data-id="${id}" class="deleteLink">Delete</a></div></div>`
      }).join('') : '<div>No links yet</div>';
    } catch (err) {
      console.error('Failed to load links:', err);
      linksList.innerHTML = `<div class="error">Failed to load links. Please check the backend or set the correct API base.</div>`;
      return;
    }

    // Attach delete handlers
    document.querySelectorAll('.deleteLink').forEach(a=>{
      a.addEventListener('click', async (e)=>{
        e.preventDefault();
        const id = a.getAttribute('data-id');
        if (!confirm('Delete this link and its history?')) return;
        await deleteLink(id);
        await refreshList();
      });
    });
  }

  async function deleteLink(id){
    const res = await fetch(`${API_BASE}/links/${id}`, { method: 'DELETE' });
    return res.ok;
  }

  const deleteAllBtn = document.getElementById('deleteAllBtn');
  if (deleteAllBtn) deleteAllBtn.addEventListener('click', async ()=>{
    if (!confirm('Delete all links and click history? This cannot be undone.')) return;
    const res = await fetch(`${API_BASE}/links`, { method: 'DELETE' });
    if (res.ok) await refreshList(); else alert('Failed to delete all');
  });

  await refreshList();
});
