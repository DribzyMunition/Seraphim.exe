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

--- a/docs/app.js
+++ b/docs/app.js
@@ -116,33 +116,38 @@
-// ------------------------------
-// Composer (JSON generator)
-// ------------------------------
-(function(){
-  const bodyEl = document.getElementById('c_body');
-  const makeBtn = document.getElementById('c_make');
-  const copyBtn = document.getElementById('c_copy');
-  const outEl = document.getElementById('c_output');
-
-  if (!bodyEl || !makeBtn || !copyBtn || !outEl) return;
-
-  makeBtn.addEventListener('click', () => {
-    const body = (bodyEl.value || '').trim();
-    const thread = body.split('\n').map(s=>s.trim()).filter(Boolean);
-
-    const today = new Date().toISOString().slice(0,10);
-    const slug = body.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0, 24);
-    const id = `${today}-${slug || 'post'}`;
-
-    const imagesField = (document.getElementById('c_images')?.value || '').trim();
-    const images = imagesField ? imagesField.split(',').map(s=>s.trim()).filter(Boolean).map(name => `./media/${name}`) : [];
-
-    const block = { id, status: "new", date_planned: null, tags: [], images, thread };
-    outEl.value = JSON.stringify(block, null, 2) + ',';
-  });
-
-  copyBtn.addEventListener('click', async () => {
-    const txt = outEl.value;
-    if (!txt) return;
-    try { await navigator.clipboard.writeText(txt); copyBtn.textContent = 'Copied ✓'; }
-    catch { copyBtn.textContent = 'Copy failed'; }
-    setTimeout(()=> copyBtn.textContent = 'Copy to clipboard', 1200);
-  });
-})();
// ------------------------------
// Composer (Post button adds a draft tile to the Text rail)
// ------------------------------
(function(){
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

    const p = { id, title: thread[0] || 'Untitled', status: 'new', date_planned: null, tags: [], images, thread };

    // Prepend so NEWEST is at the LEFT (right next to composer)
    const existing = Array.isArray(window.__SERAPHIM_POSTS__)? window.__SERAPHIM_POSTS__ : [];
    window.__SERAPHIM_POSTS__ = [p, ...existing];

    // Clear inputs + re-render the rail
    bodyEl.value = '';
    const imgEl = document.getElementById('c_images'); if (imgEl) imgEl.value = '';
    if (window.__renderRailSeraphim) window.__renderRailSeraphim();
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

      const lines = Array.isArray(p.thread) && p.thread.length ? p.thread : [(p.title||'').trim()].filter(Boolean);
const fullHTML = lines.map(l=>`<div>${l.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>`).join('');
tile.innerHTML = `
  <div class="badge" style="font-size:11px;opacity:.6">Draft</div>
  <div style="font-size:13px;line-height:1.35;margin:6px 0 8px;white-space:pre-wrap;word-wrap:break-word">${fullHTML || 'Untitled'}</div>
  <div class="thumbs" style="position:static;display:flex;gap:6px;flex-wrap:wrap"></div>
  <div style="font-size:12px;opacity:.6">Ready to schedule → drag to a calendar day (later)</div>
`;


      // Accept images dropped onto this tile (pairing)
      tile.addEventListener('dragover', e => e.preventDefault());
      tile.addEventListener('drop', e => {
        e.preventDefault();
        const pay = getPayload(e);
        if (!pay || pay.type!=='image') return;
        const t = tile.querySelector('.thumbs');
        const exists = [...t.children].some(img => img.dataset.src === pay.src);
        if (!exists){
          const img = document.createElement('img');
          img.className='thumb';
          img.dataset.src = pay.src;
          img.src = pay.src;
          img.alt = pay.alt||'';
          img.style.width='48px';
          img.style.height='48px';
          t.appendChild(img);
        }
      });

      rail.appendChild(tile);
    }
  }

  // Build 14-day calendar
  function startOfDay(d){ const x=new Date(d); x.setHours(0,0,0,0); return x; }
  function fmtDay(d){ return d.toLocaleDateString(undefined,{weekday:'short', month:'short', day:'numeric'}); }

  function makeCalendar(){
    calendar.innerHTML = '';
    const base = startOfDay(new Date());

    for (let i=0;i<14;i++){
      const d = new Date(base); d.setDate(base.getDate()+i);

      const cell = document.createElement('div');
      cell.className='day';
      cell.innerHTML = `
        <div class="dayhead"><div>${fmtDay(d)}</div><div class="badge slots" style="font-size:11px;opacity:.6">0/6</div></div>
        <div class="slots"></div>
      `;
      const slotsEl = cell.querySelector('.slots');
      const count = () => cell.querySelector('.dayhead .slots').textContent = `${slotsEl.children.length}/6`;

      // Accept text tiles only; fill next free slot
      cell.addEventListener('dragover', e => { if (slotsEl.children.length<6) e.preventDefault(); });
      cell.addEventListener('drop', e => {
        e.preventDefault();
        const pay = getPayload(e);
        if (!pay || pay.type!=='text') return;
        if (slotsEl.children.length>=6) return;

        const time = SLOT_TIMES[slotsEl.children.length] || '—';
        const post = posts.find(pp=>pp.id===pay.id) || { title:'Draft' };

        const slot = document.createElement('div');
        slot.className='slot';
        slot.innerHTML = `<div class="time">${time}</div><div style="font-size:12px;line-height:1.35;padding-right:36px">${(post.title||'Draft').slice(0,140)}</div>`;
        slotsEl.appendChild(slot);
        count();
      });

      calendar.appendChild(cell);
    }
  }

--- a/docs/app.js
+++ b/docs/app.js
@@ -184,6 +189,12 @@
 (function(){
   const rail = document.getElementById('text_rail');
   const calendar = document.getElementById('calendar');
   if (!rail || !calendar) return;
 
+  // Keep an ordering of draft IDs for stable reordering
+  let order = [];
+  function setOrderFromPosts(posts){
+    order = posts.filter(p => normStatus(p.status)==='new').map(p=>p.id);
+  }
+
   const SLOT_TIMES = ['09:00','11:00','13:00','15:00','17:00','19:00']; // 6/day
 
@@ -198,9 +209,16 @@
   function normStatus(s){ if(!s) return 'new'; s=s.toLowerCase(); return (s==='draft'||s==='queued')?'new':s; }
 
   let posts = Array.isArray(window.__SERAPHIM_POSTS__) ? window.__SERAPHIM_POSTS__ : [];
+  setOrderFromPosts(posts);
+  // Keep posts fresh if composer adds new ones
+  Object.defineProperty(window, '__SERAPHIM_POSTS__', {
+    set(v){ posts = v; setOrderFromPosts(posts); renderRail(); },
+    get(){ return posts; }
+  });
 
   // Render draft tiles into rail
-  function renderRail(){
+  function renderRail(){
     // remove prior rendered tiles (keep composer)
     [...rail.querySelectorAll('.tile.text')].forEach(n=>n.remove());
 
-    const drafts = posts.filter(p => normStatus(p.status) === 'new');
+    const byId = Object.fromEntries(posts.map(p=>[p.id,p]));
+    const drafts = order.map(id => byId[id]).filter(Boolean);
     for (const p of drafts){
       const tile = document.createElement('div');
       tile.className = 'tile text';
-      tile.draggable = true;
-      tile.addEventListener('dragstart', e => setPayload(e, {type:'text', id:p.id}));
+      tile.draggable = true;
+      tile.dataset.id = p.id;
+      tile.addEventListener('dragstart', e => {
+        rail.classList.add('dragging');
+        setPayload(e, {type:'text', id:p.id, origin:'rail'});
+      });
+      tile.addEventListener('dragend', ()=> rail.classList.remove('dragging'));
 
       const first = (p.title || (p.thread?.[0]||'')).slice(0,140);
       tile.innerHTML = `
         <div class="badge" style="font-size:11px;opacity:.6">Draft</div>
         <div style="font-size:13px;line-height:1.3;margin:6px 0 8px">${first||'Untitled'}</div>
         <div class="thumbs"></div>
         <div style="position:absolute;left:10px;right:10px;bottom:10px;font-size:12px;opacity:.6">Drag ⤵ to calendar</div>
       `;
 
       // Accept images dropped onto this tile (pairing)
       tile.addEventListener('dragover', e => e.preventDefault());
       tile.addEventListener('drop', e => {
         e.preventDefault();
         const pay = getPayload(e);
         if (!pay) return;
-        if (pay.type!=='image') return;
-        const t = tile.querySelector('.thumbs');
-        const exists = [...t.children].some(img => img.dataset.src === pay.src);
-        if (!exists){
-          const img = document.createElement('img');
-          img.className='thumb';
-          img.dataset.src = pay.src;
-          img.src = pay.src;
-          img.alt = pay.alt||'';
-          img.style.width='48px';
-          img.style.height='48px';
-          t.appendChild(img);
-        }
+        if (pay.type==='image'){
+          const t = tile.querySelector('.thumbs');
+          const exists = [...t.children].some(img => img.dataset.src === pay.src);
+          if (!exists){
+            const img = document.createElement('img');
+            img.className='thumb';
+            img.dataset.src = pay.src;
+            img.src = pay.src;
+            img.alt = pay.alt||'';
+            img.style.width='48px';
+            img.style.height='48px';
+            t.appendChild(img);
+          }
+        }
       });
 
+      // Drag-over reordering within rail
+      tile.addEventListener('dragover', e => {
+        const payload = getPayload(e);
+        if (!payload || payload.type!=='text' || payload.origin!=='rail') return;
+        e.preventDefault();
+        const draggingId = payload.id;
+        const overId = tile.dataset.id;
+        if (draggingId === overId) return;
+        const from = order.indexOf(draggingId);
+        const to = order.indexOf(overId);
+        if (from>-1 && to>-1){
+          order.splice(from,1);
+          order.splice(to,0,draggingId);
+          renderRail();
+        }
+      });
+
       rail.appendChild(tile);
     }
   }
@@ -252,7 +280,7 @@
       cell.addEventListener('drop', e => {
         e.preventDefault();
         const pay = getPayload(e);
-        if (!pay || pay.type!=='text') return;
+        if (!pay || pay.type!=='text') return; // accepts from rail or elsewhere
         if (slotsEl.children.length>=6) return;
 
         const time = SLOT_TIMES[slotsEl.children.length] || '—';
@@ -269,6 +297,8 @@
 
   // Initial render
-  renderRail();
+  window.__renderRailSeraphim = renderRail; // allow composer to trigger rerender
+  renderRail();
   makeCalendar();
 })();

