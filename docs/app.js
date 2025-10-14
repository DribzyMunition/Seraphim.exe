--- a/docs/app.js
+++ b/docs/app.js
@@ -1,4 +1,5 @@
-async function main(){ const res = await fetch('./content/posts.json',{cache:'no-store'}); const data = await res.json(); const posts = data.posts.slice().sort((a,b)=> (a.date_planned||'').localeCompare(b.date_planned||'')); const q = document.getElementById('q'); const statusSel = document.getElementById('status'); const list = document.getElementById('list'); const lightbox = document.getElementById('lightbox'); const lightImg = lightbox.querySelector('img'); function openLight(src,alt){ lightImg.src = src; lightImg.alt = alt||''; lightbox.classList.add('show'); } function closeLight(){ lightbox.classList.remove('show'); lightImg.src=''; lightImg.alt=''; } lightbox.addEventListener('click', closeLight); window.addEventListener('keydown', e=>{ if(e.key==='Escape') closeLight(); }); function normStatus(s){ // Treat older statuses as "new" so nothing disappears if (!s) return 'new'; s = s.toLowerCase(); if (s === 'draft' || s === 'queued') return 'new'; return s; // 'new', 'scheduled', 'posted' } function render(){ const needle = (q.value||'').toLowerCase(); const want = statusSel.value; list.innerHTML = ''; for(const p of posts){ if (normStatus(p.status) !== want) continue; const hay = (p.title+' '+(p.tags||[]).join(' ')+' '+(p.thread||[]).join(' ')).toLowerCase(); if(!hay.includes(needle)) continue; const card = document.createElement('div'); card.className='card'; const tags = (p.tags||[]).map(t=>`${t}`).join(' '); const threadHTML = (p.thread||[]).map(t=>`
+async function main(){
+  const res = await fetch('./content/posts.json',{cache:'no-store'}); const data = await res.json(); const posts = data.posts.slice().sort((a,b)=> (a.date_planned||'').localeCompare(b.date_planned||''));
   const q = document.getElementById('q'); const statusSel = document.getElementById('status'); const list = document.getElementById('list'); const lightbox = document.getElementById('lightbox'); const lightImg = lightbox.querySelector('img'); function openLight(src,alt){ lightImg.src = src; lightImg.alt = alt||''; lightbox.classList.add('show'); } function closeLight(){ lightbox.classList.remove('show'); lightImg.src=''; lightImg.alt=''; } lightbox.addEventListener('click', closeLight); window.addEventListener('keydown', e=>{ if(e.key==='Escape') closeLight(); }); function normStatus(s){ // Treat older statuses as "new" so nothing disappears if (!s) return 'new'; s = s.toLowerCase(); if (s === 'draft' || s === 'queued') return 'new'; return s; // 'new', 'scheduled', 'posted' } function render(){ const needle = (q.value||'').toLowerCase(); const want = statusSel.value; list.innerHTML = ''; for(const p of posts){ if (normStatus(p.status) !== want) continue; const hay = (p.title+' '+(p.tags||[]).join(' ')+' '+(p.thread||[]).join(' ')).toLowerCase(); if(!hay.includes(needle)) continue; const card = document.createElement('div'); card.className='card'; const tags = (p.tags||[]).map(t=>`${t}`).join(' '); const threadHTML = (p.thread||[]).map(t=>`
@@ -22,7 +23,118 @@
   q.addEventListener('input', render); statusSel.addEventListener('change', render); render(); }
 main();
 
 // --- Image Library ---
 (async function(){ const libBtn = document.getElementById('libraryBtn'); const panel = document.getElementById('library'); const grid = document.getElementById('lib_grid'); const q = document.getElementById('lib_q'); if (!libBtn || !panel) return; let media = { images: [] }; try { const res = await fetch('./content/media.json', { cache: 'no-store' }); if (res.ok) media = await res.json(); } catch {} function renderLib() { const needle = (q?.value || '').toLowerCase(); grid.innerHTML = ''; const imgs = (media.images || []).filter(i => { const hay = (i.src + ' ' + (i.alt||'') + ' ' + (i.tags||[]).join(' ')).toLowerCase(); return hay.includes(needle); }); for (const i of imgs) { const img = document.createElement('img'); img.className = 'thumb'; img.src = i.src; img.alt = i.alt || ''; img.title = (i.tags||[]).join(', '); img.addEventListener('click', () => { const field = document.getElementById('c_images'); if (!field) return; const name = i.src.split('/').pop(); const parts = field.value.split(',').map(s=>s.trim()).filter(Boolean); if (!parts.includes(name)) parts.push(name); field.value = parts.join(', '); }); grid.appendChild(img); } if (!grid.children.length) grid.innerHTML = '
@@ -30,3 +142,172 @@
 '; } libBtn.addEventListener('click', () => { panel.style.display = panel.style.display === 'none' ? 'block' : 'none'; if (panel.style.display === 'block') renderLib(); }); q?.addEventListener('input', renderLib); })();
 
 // --- Composer (JSON generator) ---
 const composeBtn = document.getElementById('composeBtn'); const sheet = document.getElementById('composer'); if (composeBtn && sheet) { composeBtn.addEventListener('click', () => { sheet.style.display = sheet.style.display === 'none' ? 'block' : 'none'; }); const bodyEl = document.getElementById('c_body'); const makeBtn = document.getElementById('c_make'); const copyBtn = document.getElementById('c_copy'); const outEl = document.getElementById('c_output'); makeBtn.addEventListener('click', () => { const body = (bodyEl.value || '').trim(); // Split body into lines (blank lines allowed but removed) const thread = body.split('\n').map(s=>s.trim()).filter(Boolean); // id = today + first 6 chars of a hash-like slug from body const today = new Date().toISOString().slice(0,10); const slug = body.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0, 24); const id = `${today}-${slug || 'post'}`; const block = { id, status: "new", date_planned: null, tags: [], images: [], thread }; outEl.value = JSON.stringify(block, null, 2) + ','; }); copyBtn.addEventListener('click', async () => { const txt = outEl.value; if (!txt) return; try { await navigator.clipboard.writeText(txt); copyBtn.textContent = 'Copied ✓'; } catch { copyBtn.textContent = 'Copy failed'; } setTimeout(()=> copyBtn.textContent = 'Copy to clipboard', 1200); }); }
+
+// ============================
+// Scheduler UI (Text rail + Calendar)
+// ============================
+// Build a lightweight working set of "draft" tiles from posts.json where status=new
+const rail = document.getElementById('text_rail');
+const calendar = document.getElementById('calendar');
+const SLOT_TIMES = ['09:00','11:00','13:00','15:00','17:00','19:00']; // 6 per day
+
+// Basic DnD payload helpers
+function setPayload(e, obj){ e.dataTransfer.setData('application/json', JSON.stringify(obj)); e.dataTransfer.effectAllowed='move'; }
+function getPayload(e){ try{ return JSON.parse(e.dataTransfer.getData('application/json')); }catch{return null;} }
+
+// Render text rail tiles
+function renderRail(){
+  if (!rail) return;
+  // remove any existing auto tiles (keep composer)
+  [...rail.querySelectorAll('.tile.text')].forEach(n=>n.remove());
+  const drafts = posts.filter(p => (p.status||'new').toLowerCase() === 'new');
+  for (const p of drafts){
+    const tile = document.createElement('div');
+    tile.className = 'tile text';
+    tile.draggable = true;
+    tile.addEventListener('dragstart', e => setPayload(e, {type:'text', id:p.id}));
+    // title/first line
+    const first = (p.title || (p.thread?.[0]||'')).slice(0,140);
+    tile.innerHTML = `
+      <div class="badge">Draft</div>
+      <div style="font-size:13px;line-height:1.3;margin:6px 0 8px">${first||'Untitled'}</div>
+      <div class="thumbs"></div>
+      <div style="position:absolute;left:10px;right:10px;bottom:10px;font-size:12px;opacity:.6">Drag ⤵ to calendar</div>
+    `;
+    // allow dropping images onto tile to pair
+    tile.addEventListener('dragover', e => { e.preventDefault(); });
+    tile.addEventListener('drop', e => {
+      e.preventDefault();
+      const pay = getPayload(e);
+      if (!pay || pay.type!=='image') return;
+      const t = tile.querySelector('.thumbs');
+      // add a small thumb (no duplicates)
+      const exists = [...t.children].some(img => img.dataset.src === pay.src);
+      if (!exists){
+        const img = document.createElement('img');
+        img.className='thumb'; img.dataset.src = pay.src; img.src = pay.src; img.alt = pay.alt||'';
+        img.style.width='48px'; img.style.height='48px';
+        t.appendChild(img);
+      }
+    });
+    rail.appendChild(tile);
+  }
+}
+
+// Enhance image library thumbs for drag
+(function enableImageDrag(){
+  const grid = document.getElementById('lib_grid');
+  if (!grid) return;
+  const obs = new MutationObserver(() => {
+    grid.querySelectorAll('img.thumb').forEach(img=>{
+      if (img.dataset.dnd==='1') return;
+      img.draggable = true;
+      img.addEventListener('dragstart', e => setPayload(e, {type:'image', src: img.src, alt: img.alt || ''}));
+      img.dataset.dnd='1';
+    });
+  });
+  obs.observe(grid, {childList:true, subtree:true});
+})();
+
+// Calendar: 14 days from today
+function startOfDay(d){ const x=new Date(d); x.setHours(0,0,0,0); return x; }
+function fmtDay(d){ return d.toLocaleDateString(undefined,{weekday:'short', month:'short', day:'numeric'}); }
+function makeCalendar(){
+  if (!calendar) return;
+  calendar.innerHTML = '';
+  const base = startOfDay(new Date());
+  for (let i=0;i<14;i++){
+    const d = new Date(base); d.setDate(base.getDate()+i);
+    const cell = document.createElement('div');
+    cell.className='day';
+    cell.innerHTML = `
+      <div class="dayhead"><div>${fmtDay(d)}</div><div class="badge slots">0/6</div></div>
+      <div class="slots"></div>
+    `;
+    const slotsEl = cell.querySelector('.slots');
+    function count(){ cell.querySelector('.slots').previousElementSibling.querySelector('.slots').textContent = slotsEl.children.length + '/6'; }
+    // accept text tiles, fill next free slot
+    cell.addEventListener('dragover', e => { if (slotsEl.children.length<6) e.preventDefault(); });
+    cell.addEventListener('drop', e => {
+      e.preventDefault();
+      const pay = getPayload(e);
+      if (!pay || pay.type!=='text') return;
+      if (slotsEl.children.length>=6) return;
+      const slot = document.createElement('div');
+      slot.className='slot';
+      const time = SLOT_TIMES[slotsEl.children.length] || '—';
+      // minimal visual; content is represented by its first line/title
+      const post = posts.find(pp=>pp.id===pay.id) || { title:'Draft' };
+      slot.innerHTML = `<div class="time">${time}</div><div style="font-size:12px;line-height:1.35;padding-right:36px">${(post.title||'Draft').slice(0,140)}</div>`;
+      slotsEl.appendChild(slot);
+      count();
+    });
+    calendar.appendChild(cell);
+  }
+}
+
+renderRail();
+makeCalendar();
