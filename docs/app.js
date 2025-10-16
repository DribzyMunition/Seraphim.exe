// Seraphim.exe — stable, minimal app.js matching your index.html

// ------------------------------
// Core: load posts + expose to window
// ------------------------------
async function main(){
  let posts = [];
  try {
    const res = await fetch('./content/posts.json',{cache:'no-store'});
    const data = await res.json();
    posts = (data.posts || []).slice();
  } catch (_) {
    posts = [];
  }
  window.__SERAPHIM_POSTS__ = posts;

  wireLightbox();
  wireList(posts);
  wireLibrary();
  wireComposer();
  renderTextRail(posts);
  renderCalendar();
  wirePostComposer();   // <-- lives in app.js, not index.html
}
main();

// ------------------------------
// Lightbox
// ------------------------------
function wireLightbox(){
  const lightbox = document.getElementById('lightbox');
  const lightImg = lightbox?.querySelector('img');
  if (!lightbox || !lightImg) return;
  function openLight(src,alt){ lightImg.src = src; lightImg.alt = alt||''; lightbox.classList.add('show'); }
  function closeLight(){ lightbox.classList.remove('show'); lightImg.src=''; lightImg.alt=''; }
  lightbox.addEventListener('click', closeLight);
  window.addEventListener('keydown', e=>{ if(e.key==='Escape') closeLight(); });
  // expose small helper for gallery images
  window.__openLight = openLight;
}

// ------------------------------
// Posts list (filter by text + status)
// ------------------------------
function wireList(posts){
  const q = document.getElementById('q');
  const statusSel = document.getElementById('status');
  const list = document.getElementById('list');
  if (!q || !statusSel || !list) return;

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
      const threadHTML = (p.thread||[]).map(t=>`<pre>${t}</pre>`).join('');

      // Build gallery if images exist
      let imgs = '';
      if (Array.isArray(p.images)) {
        imgs = p.images.map(src=>{
          const alt = p.title || '';
          return `<img class="thumb" src="${src}" alt="${alt}" onclick="__openLight('${src}','${alt.replace(/'/g,'&#39;')}')">`;
        }).join('');
      }
      const gallery = imgs ? `<div class="gallery">${imgs}</div>` : '';

      card.innerHTML = `
        <div class="meta">${p.date_planned||'—'} · <strong>${normStatus(p.status)}</strong> · ${tags}</div>
        <h3>${p.title||''}</h3>
        ${gallery}
        <div class="thread">${threadHTML}</div>
      `;

      list.appendChild(card);
    }
  }

  q.addEventListener('input', render);
  statusSel.addEventListener('change', render);
  render();
}
// Turn the composer into a simple "Post" flow that prepends a new tile to the rail
function wirePostComposer(){
  const bodyEl = document.getElementById('c_body');
  const postBtn = document.getElementById('c_post');
  if (!bodyEl || !postBtn) return;

  postBtn.addEventListener('click', () => {
    const body = (bodyEl.value || '').trim();
    if (!body) return;

    // split into lines → store as thread; title = first line
    const thread = body.split('\n').map(s=>s.trim()).filter(Boolean);
    const today = new Date().toISOString().slice(0,10);
    const slug = body.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,24);
    const id = `${today}-${slug || ('post-'+Math.random().toString(36).slice(2,7))}`;

    // keep images field for later (does nothing yet)
    const imagesField = (document.getElementById('c_images')?.value || '').trim();
    const images = imagesField ? imagesField.split(',').map(s=>s.trim()).filter(Boolean).map(name => `./media/${name}`) : [];

    // prepend to in-memory list (newest-left)
    const existing = Array.isArray(window.__SERAPHIM_POSTS__)? window.__SERAPHIM_POSTS__ : [];
    window.__SERAPHIM_POSTS__ = [{ id, title: thread[0] || 'Untitled', status: 'new', date_planned: null, tags: [], images, thread }, ...existing];

    // clear inputs and re-render the rail from the updated list
    bodyEl.value = '';
    const imgEl = document.getElementById('c_images'); if (imgEl) imgEl.value = '';
    renderTextRail(window.__SERAPHIM_POSTS__);
  });
}

function wirePostComposer(){
  const bodyEl = document.getElementById('c_body');
  const postBtn = document.getElementById('c_post');
  if (!bodyEl || !postBtn) return;

  postBtn.addEventListener('click', () => {
    const body = (bodyEl.value || '').trim();
    if (!body) return;

    const thread = body.split('\n').map(s=>s.trim()).filter(Boolean);
    const today = new Date().toISOString().slice(0,10);
    const slug = body.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,24);
    const id = `${today}-${slug || ('post-'+Math.random().toString(36).slice(2,7))}`;

    const imagesField = (document.getElementById('c_images')?.value || '').trim();
    const images = imagesField ? imagesField.split(',').map(s=>s.trim()).filter(Boolean).map(name => `./media/${name}`) : [];

    const existing = Array.isArray(window.__SERAPHIM_POSTS__)? window.__SERAPHIM_POSTS__ : [];
    window.__SERAPHIM_POSTS__ = [{ id, title: thread[0] || 'Untitled', status: 'new', date_planned: null, tags: [], images, thread }, ...existing];

    // clear and re-render the rail using the updated list
    bodyEl.value = '';
    const imgEl = document.getElementById('c_images'); if (imgEl) imgEl.value = '';
    renderTextRail(window.__SERAPHIM_POSTS__);
  });
}

// ------------------------------
// Image Library (toggle + filter + click-to-add filenames)
// ------------------------------
async function wireLibrary(){
  const libBtn = document.getElementById('libraryBtn');
  const panel = document.getElementById('library');
  const grid = document.getElementById('lib_grid');
  const q = document.getElementById('lib_q');
  if (!libBtn || !panel || !grid) return;

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
}

// ------------------------------
// Composer (JSON block maker you already use)
// ------------------------------
function wireComposer(){
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
}

// ------------------------------
// Text Section: show drafts (status=new) as tiles, newest-left
// ------------------------------
function renderTextRail(allPosts){
  const rail = document.getElementById('text_rail');
  if (!rail) return;

  // Remove old tiles (keep composer which is the first child in index.html)
  [...rail.querySelectorAll('.tile.text')].forEach(n=>n.remove());

  // Drafts only; newest-left simply uses array order as loaded
  const drafts = (allPosts || []).filter(p => (p.status||'new').toLowerCase() === 'new');

  for (const p of drafts){
    const tile = document.createElement('div');
    tile.className = 'tile text';

    // Full post text (all lines)
    const lines = Array.isArray(p.thread) && p.thread.length ? p.thread : [(p.title||'').trim()].filter(Boolean);
    const fullHTML = lines.map(l=>`<div>${l.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>`).join('');

    tile.innerHTML = `
      <div class="meta" style="margin-bottom:6px;opacity:.65">Draft</div>
      <div style="font-size:13px;line-height:1.35;white-space:pre-wrap;word-wrap:break-word">${fullHTML || 'Untitled'}</div>
    `;

    // Insert right after the composer so newer items appear LEFT
    const composer = rail.querySelector('.composer');
    if (composer && composer.nextSibling) {
      rail.insertBefore(tile, composer.nextSibling);
    } else {
      rail.appendChild(tile);
    }
  }
}

// ------------------------------
// Calendar: static 14-day grid (no drag yet)
// ------------------------------
function renderCalendar(){
  const cal = document.getElementById('calendar');
  if (!cal) return;
  cal.innerHTML = '';
  const base = new Date(); base.setHours(0,0,0,0);

  function fmtDay(d){ return d.toLocaleDateString(undefined,{weekday:'short', month:'short', day:'numeric'}); }

  for (let i=0;i<14;i++){
    const d = new Date(base); d.setDate(base.getDate()+i);
    const cell = document.createElement('div');
    cell.className='day';
    cell.innerHTML = `
      <div class="dayhead"><div>${fmtDay(d)}</div><div class="slots badge">0/6</div></div>
      <div class="slots"></div>
    `;
    cal.appendChild(cell);
  }
}
/* ===== Text Section V1 (isolated) — makes Post work without touching anything else ===== */
(function TextSectionV1(){
  const rail = document.getElementById('text_rail');
  const composer = rail?.querySelector('.composer');
  const box = document.getElementById('c_body');
  const postBtn = document.getElementById('c_post');
  if (!rail || !composer || !box || !postBtn) return; // quietly bail if markup missing

  // Use existing posts if present; otherwise start empty
  let posts = Array.isArray(window.__SERAPHIM_POSTS__) ? window.__SERAPHIM_POSTS__ : [];
  window.__SERAPHIM_POSTS__ = posts; // keep synced for other parts of the page

  function asLines(p){
    // Full post = thread lines if present; else title
    const lines = Array.isArray(p.thread) && p.thread.length ? p.thread : [(p.title||'').trim()].filter(Boolean);
    return lines;
  }

  function renderRail(){
    // remove previously rendered text tiles only (leave composer)
    [...rail.querySelectorAll('.tile.text')].forEach(n=>n.remove());

    // Show newest next to the composer (left). We render in reverse so newest ends up closest.
    const drafts = posts.filter(p => ((p.status||'new')+'').toLowerCase() === 'new');
    for (let i = drafts.length - 1; i >= 0; i--){
      const p = drafts[i];
      const tile = document.createElement('div');
      tile.className = 'tile text';

      const html = asLines(p).map(l=>`<div>${l.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>`).join('');
      tile.innerHTML = `
        <div class="meta" style="margin-bottom:6px;opacity:.65">Draft</div>
        <div style="font-size:13px;line-height:1.35;white-space:pre-wrap;word-wrap:break-word">${html || 'Untitled'}</div>
      `;

      // insert immediately to the right of the composer
      if (composer && composer.nextSibling) rail.insertBefore(tile, composer.nextSibling);
      else rail.appendChild(tile);
    }
  }

  function postNow(){
    const body = (box.value || '').trim();
    if (!body) return;

    const thread = body.split('\n').map(s=>s.trim()).filter(Boolean);
    const today = new Date().toISOString().slice(0,10);
    const slug = body.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,24);
    const id = `${today}-${slug || ('post-'+Math.random().toString(36).slice(2,7))}`;

    const p = { id, title: thread[0] || 'Untitled', status: 'new', date_planned: null, tags: [], images: [], thread };
    posts = [p, ...posts];                 // prepend so newest is left
    window.__SERAPHIM_POSTS__ = posts;     // keep global in sync
    box.value = '';                        // clear composer
    renderRail();                          // update tiles
    box.focus();
  }

  // Wire once
  postBtn.addEventListener('click', postNow);

  // Initial draw
  renderRail();
})();
