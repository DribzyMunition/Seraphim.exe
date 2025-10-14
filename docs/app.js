      const gallery = imgs ? `<div class="gallery">${imgs}</div>` : '';

      card.innerHTML = `
        <div class="meta">${p.date_planned||'—'} · <strong>${p.status}</strong> · ${tags}</div>
        <div class="meta">${p.date_planned||'—'} · <strong>${normStatus(p.status)}</strong> · ${tags}</div>
        <h3>${p.title}</h3>
        ${gallery}
        <div class="thread">${threadHTML}</div>
