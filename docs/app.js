async function main(){
  const res = await fetch('./content/posts.json',{cache:'no-store'});
  const data = await res.json();
  const posts = data.posts.slice().sort((a,b)=> (a.date_planned||'').localeCompare(b.date_planned||''));

  const q = document.getElementById('q');
  const statusSel = document.getElementById('status');
  const list = document.getElementById('list');
  const lightbox = document.getElementById('lightbox');
  const lightImg = lightbox.querySelector('img');

  function openLight(src,alt){ lightImg.src = src; lightImg.alt = alt||''; lightbox.classList.add('show'); }
  function closeLight(){ lightbox.classList.remove('show'); lightImg.src=''; lightImg.alt=''; }
  lightbox.addEventListener('click', closeLight);
  window.addEventListener('keydown', e=>{ if(e.key==='Escape') closeLight(); });

function normStatus(s){
  // Treat older statuses as "new" so nothing disappears
  if (!s) return 'new';
  s = s.toLowerCase();
  if (s === 'draft' || s === 'queued') return 'new';
  return s; // 'new', 'scheduled', 'posted'
}
  
  function render(){
    const needle = (q.value||'').toLowerCase();
    const want = statusSel.value;
    list.innerHTML = '';
    for(const p of posts){
      if (normStatus(p.status) !== want) continue;
      const hay = (p.title+' '+(p.tags||[]).join(' ')+' '+(p.thread||[]).join(' ')).toLowerCase();
      if(!hay.includes(needle)) continue;

      const card = document.createElement('div'); card.className='card';
      const tags = (p.tags||[]).map(t=>`<span class="tag">${t}</span>`).join(' ');
      const threadHTML = (p.thread||[]).map(t=>`<p>${t}</p>`).join('');

      // gallery
      const imgs = (p.images||[]).map(i=>`<img class="thumb" src="${i.src}" alt="${i.alt||''}" data-full="${i.src}">`).join('');
      const gallery = imgs ? `<div class="gallery">${imgs}</div>` : '';

      card.innerHTML = `
        <div class="meta">${p.date_planned||'—'} · <strong>${p.status}</strong> · ${tags}</div>
        <h3>${p.title}</h3>
        ${gallery}
        <div class="thread">${threadHTML}</div>
        ${p.notes ? `<div class="notes">${p.notes}</div>` : ''}
      `;
      list.appendChild(card);
    }
    if(!list.children.length) list.innerHTML = '<div class="card">No matches.</div>';

    // bind image clicks
    list.querySelectorAll('.thumb').forEach(img=>{
      img.addEventListener('click', ()=> openLight(img.dataset.full, img.alt));
    });
  }

  q.addEventListener('input', render);
  statusSel.addEventListener('change', render);
  render();
}
main();

// --- Image Library ---
(async function(){
  const libBtn = document.getElementById('libraryBtn');
  const panel  = document.getElementById('library');
  const grid   = document.getElementById('lib_grid');
  const q      = document.getElementById('lib_q');
  if (!libBtn || !panel) return;

  let media = { images: [] };
  try {
    const res = await fetch('./content/media.json', { cache: 'no-store' });
    if (res.ok) media = await res.json();
  } catch {}

  function renderLib() {
    const needle = (q?.value || '').toLowerCase();
    grid.innerHTML = '';
    const imgs = (media.images || []).filter(i => {
      const hay = (i.src + ' ' + (i.alt||'') + ' ' + (i.tags||[]).join(' ')).toLowerCase();
      return hay.includes(needle);
    });
    for (const i of imgs) {
      const img = document.createElement('img');
      img.className = 'thumb';
      img.src = i.src;
      img.alt = i.alt || '';
      img.title = (i.tags||[]).join(', ');
      img.addEventListener('click', () => {
        const field = document.getElementById('c_images');
        if (!field) return;
        const name = i.src.split('/').pop();
        const parts = field.value.split(',').map(s=>s.trim()).filter(Boolean);
        if (!parts.includes(name)) parts.push(name);
        field.value = parts.join(', ');
      });
      grid.appendChild(img);
    }
    if (!grid.children.length) grid.innerHTML = '<div class="notes">No images yet. Upload to <code>docs/media/</code> and list them in <code>media.json</code>.</div>';
  }

  libBtn.addEventListener('click', () => {
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    if (panel.style.display === 'block') renderLib();
  });
  q?.addEventListener('input', renderLib);
})();


// --- Composer (JSON generator) ---
const composeBtn = document.getElementById('composeBtn');
const sheet = document.getElementById('composer');
if (composeBtn && sheet) {
  composeBtn.addEventListener('click', () => {
    sheet.style.display = sheet.style.display === 'none' ? 'block' : 'none';
  });

  const el = id => document.getElementById(id);
  const makeBtn = el('c_make'), copyBtn = el('c_copy');
  makeBtn.addEventListener('click', () => {
    const title = el('c_title').value.trim();
    const date_planned = el('c_date').value.trim();
    const status = el('c_status').value;
    const tags = el('c_tags').value.split(',').map(s=>s.trim()).filter(Boolean);
    const images = el('c_images').value.split(',').map(s=>s.trim()).filter(Boolean)
                     .map(name => ({ src: `./media/${name}`, alt: '' }));
    const thread = el('c_thread').value.split('\n').map(s=>s.trim()).filter(Boolean);
    const notes = el('c_notes').value.trim();

    const id = (date_planned || new Date().toISOString().slice(0,10))
               + '-' + title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');

    const block = {
      id, title, status,
      date_planned: date_planned || null,
      tags,
      images,
      thread,
      ...(notes ? { notes } : {})
    };

    el('c_output').value = JSON.stringify(block, null, 2) + ',';
  });

  copyBtn.addEventListener('click', async () => {
    const out = document.getElementById('c_output').value;
    if (!out) return;
    try { await navigator.clipboard.writeText(out); copyBtn.textContent = 'Copied ✓'; }
    catch { copyBtn.textContent = 'Copy failed'; }
    setTimeout(()=> copyBtn.textContent = 'Copy to clipboard', 1200);
  });
}

