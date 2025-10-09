async function load() {
  const res = await fetch('./content/posts.json', { cache: 'no-store' });
  const data = await res.json();
  const q = document.getElementById('q');
  const list = document.getElementById('list');

  function render(filter='') {
    list.innerHTML = '';
    const needle = filter.trim().toLowerCase();
    const items = data.posts.filter(p => {
      const hay = (p.title + ' ' + p.text + ' ' + (p.tags||[]).join(' ')).toLowerCase();
      return hay.includes(needle);
    });
    for (const p of items) {
      const div = document.createElement('div');
      div.className = 'card';
      const tags = (p.tags||[]).map(t=>`<span class="tag">${t}</span>`).join(' ');
      div.innerHTML = `
        <div class="meta">${p.date} · ${tags}</div>
        <strong>${p.title}</strong>
        <pre>${p.text}</pre>
      `;
      list.appendChild(div);
    }
    if (!items.length) list.innerHTML = '<div class="card">No matches.</div>';
  }

  q.addEventListener('input', e => render(e.target.value));
  render('');
}
load();
