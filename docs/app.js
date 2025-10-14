// ------------------------------
// Seraphim.exe — Core Rendering
// ------------------------------
async function main(){
  // Load posts.json
  const res = await fetch('./content/posts.json',{cache:'no-store'});
  const data = await res.json();
  const posts = (data.posts || []).slice().sort((a,b)=> (a.date_planned||'').localeCompare(b.date_planned||''));

  // Expose for scheduler
  window.__SERAPHIM_POSTS__ = posts;

  // DOM refs
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

      const card = document.createElement('div');
      card.className = 'card';

      const tags = (p.tags||[]).map(t=>`${t}`).join(' ');
      const threadHTML = (p.thread||[]).map(t=>`
        <pre>${t}</pre>
      `).join('');

      // Build gallery if images exist
      let imgs = '';
      if (Array.isArray(p.images)) {
        imgs = p.images.map(src=>{
          const alt = p.title || '';
          return `<img class="thumb" src="${src}" alt="${alt}" />`;
        }).join('');
      }
      const gallery = imgs ? `<div class="gallery">${imgs}</div>` : '';

      card.innerHTML = `
        <div class="meta">${p.date_planned||'—'} · <strong>${normStatus(p.status)}</strong> · ${tags}</div>
        <h3>${p.title||''}</h3>
        ${gallery}
        <div class="thread">${threadHTML}</div>
      `;

      // Lightbox hooks
      card.querySelectorAll('.thumb').forEach(img=>{
        img.addEventListener('click', ()=> openLight(img.src, img.alt));
      });

      list.appendChild(card);
    }
  }

  q.addEventListener('input', render);
  statusSel.addEventListener('change', render);
  render();
}
main();

// ------------------------------
// Image Library Panel
// ------------------------------
(async function(){
  const libBtn = document.getElementById('libraryBtn');
  const panel = document.getElementById('library');
  const grid = document.getElementById('lib_grid');
  const q = document.getElementById('lib_q');
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

      // Click: append filename into composer images field
      img.addEventListener('click', () => {
        const field = document.getElementById('c_images');
        if (!field) return;
        const name = i.src.split('/').pop();
        const parts = field.value.split(',').map(s=>s.trim()).filter(Boolean);
        if (!parts.includes(name)) parts.push(name);
        field.value = parts.join(', ');
      });

      // Drag: enable image → text tile pairing
      img.draggable = true;
      img.addEventListener('dragstart', e => {
        e.dataTransfer.setData('application/json', JSON.stringify({type:'image', src: i.src, alt: i.alt || ''}));
        e.dataTransfer.effectAllowed = 'move';
      });

      grid.appendChild(img);
    }

    if (!grid.children.length) {
      grid.innerHTML = '<div style="opacity:.6">No images match your filter.</div>';
    }
  }

  libBtn.addEventListener('click', () => {
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    if (panel.style.display === 'block') renderLib();
  });
  q?.addEventListener('input', renderLib);
})();

// ------------------------------
// Composer (JSON generator)
// ------------------------------
(function(){
  const bodyEl = document.getElementById('c_body');
  const makeBtn = document.getElementById('c_make');
  const copyBtn = document.getElementById('c_copy');
  const outEl = document.getElementById('c_output');

  if (!bodyEl || !makeBtn || !copyBtn || !outEl) return;

  makeBtn.addEventListener('click', () => {
    const body = (bodyEl.value || '').trim();
    const thread = body.split('\n').map(s=>s.trim()).filter(Boolean);

    const today = new Date().toISOString().slice(0,10);
    const slug = body.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0, 24);
    const id = `${today}-${slug || 'post'}`;

    const imagesField = (document.getElementById('c_images')?.value || '').trim();
    const images = imagesField ? imagesField.split(',').map(s=>s.trim()).filter(Boolean).map(name => `./media/${name}`) : [];

    const block = { id, status: "new", date_planned: null, tags: [], images, thread };
    outEl.value = JSON.stringify(block, null, 2) + ',';
  });

  copyBtn.addEventListener('click', async () => {
    const txt = outEl.value;
    if (!txt) return;
    try { await navigator.clipboard.writeText(txt); copyBtn.textContent = 'Copied ✓'; }
    catch { copyBtn.textContent = 'Copy failed'; }
    setTimeout(()=> copyBtn.textContent = 'Copy to clipboard', 1200);
  });
})();

// ------------------------------
// Scheduler: Text Rail + Calendar
// ------------------------------
(function(){
  const rail = document.getElementById('text_rail');
  const calendar = document.getElementById('calendar');
  if (!rail || !calendar) return;

  const SLOT_TIMES = ['09:00','11:00','13:00','15:00','17:00','19:00']; // 6/day

  function setPayload(e, obj){
    e.dataTransfer.setData('application/json', JSON.stringify(obj));
    e.dataTransfer.effectAllowed='move';
  }
  function getPayload(e){
    try { return JSON.parse(e.dataTransfer.getData('application/json')); }
    catch { return null; }
  }
  function normStatus(s){ if(!s) return 'new'; s=s.toLowerCase(); return (s==='draft'||s==='queued')?'new':s; }

  let posts = Array.isArray(window.__SERAPHIM_POSTS__) ? window.__SERAPHIM_POSTS__ : [];

  // Render draft tiles into rail
  function renderRail(){
    // remove prior rendered tiles (keep composer)
    [...rail.querySelectorAll('.tile.text')].forEach(n=>n.remove());

    const drafts = posts.filter(p => normStatus(p.status) === 'new');
    for (const p of drafts){
      const tile = document.createElement('div');
      tile.className = 'tile text';
      tile.draggable = true;
      tile.addEventListener('dragstart', e => setPayload(e, {type:'text', id:p.id}));

      const first = (p.title || (p.thread?.[0]||'')).slice(0,140);
      tile.innerHTML = `
        <div class="badge" style="font-size:11px;opacity:.6">Draft</div>
        <div style="font-size:13px;line-height:1.3;margin:6px 0 8px">${first||'Untitled'}</div>
        <div class="thumbs"></div>
        <div style="position:absolute;left:10px;right:10px;bottom:10px;font-size:12px;opacity:.6">Drag ⤵ to calendar</div>
      `;

      // Accept images dropped onto this tile (pairing)
      tile.addEventLi
