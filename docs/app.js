async function main() {
  const res = await fetch('./content/posts.json', { cache: 'no-store' });
  const data = await res.json();
  const posts = data.posts.slice().sort((a,b)=> (a.date_planned||'').localeCompare(b.date_planned||''));

  const q = document.getElementById('q');
  const statusSel = document.getElementById('status');
  const list = document.getElementById('list');

  function render() {
    const needle = (q.value||'').toLowerCase();
    const want = statusSel.value;
    list.innerHTML = '';
    for (const p of posts) {
      if (want !== 'all' && p.status !== want) continue;
      const hay = (p.title + ' ' + (p.tags||[]).join(' ') + ' ' + (p.thread||[]).join(' ')).toLowerCase();
      if (!hay.includes(needle)) continue;

      const card = document.createElement('div');
      card.className = 'card';

      const img = (p.images && p.images[0]) ? `<img src="${p.images[0].src}" alt="${p.images[0].alt||''}">` : '';
      const tags = (p.tags||[]).map(t=>`<span class="tag">${t}</span>`).join(' ');
      const threadHTML = (p.thread||[]).map(t=>`<p>${t}</p>`).join('');

      card.innerHTML = `
        <div class="meta">${p.date_planned||'—'} · <strong>${p.status}</strong> · ${tags}</div>
        <h3>${p.title}</h3>
        ${img}
        <div class="thread">${threadHTML}</div>
        ${p.notes ? `<div class="notes">${p.notes}</div>` : ''}
      `;
      list.appendChild(card);
    }
    if (!list.children.length) list.innerHTML = '<div class="card">No matches.</div>';
  }

  q.addEventListener('input', render);
  statusSel.addEventListener('change', render);
  render();
}
main();
