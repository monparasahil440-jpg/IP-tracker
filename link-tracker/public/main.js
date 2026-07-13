async function createLink(target) {
  const res = await fetch('/create', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ target, base: window.location.origin }) });
  return await res.json();
}

async function listLinks() {
  const res = await fetch('/links');
  return await res.json();
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
    adminUrl.href = `/admin/${data.id}`; adminUrl.textContent = `/admin/${data.id}`;
    targetInput.value = '';
    await refreshList();
  });

  async function refreshList(){
    const links = await listLinks();
    linksList.innerHTML = Object.keys(links).length ? Object.entries(links).map(([id,l])=>{
      return `<div class="linkItem"><div><strong>${id}</strong> — <a href="/r/${id}" target="_blank">/r/${id}</a></div><div class="small">${l.target}</div><div style="margin-top:6px"><a href="/admin/${id}" target="_blank">Admin</a></div></div>`
    }).join('') : '<div>No links yet</div>';
  }

  await refreshList();
});
