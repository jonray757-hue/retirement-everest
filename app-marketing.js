const MKT_ASSETS = [
  { id: 'flyer-letter', name: 'Event Flyer', category: 'flyer', size: '8.5 × 11 in', desc: 'Print flyer for handouts & bulletin boards' },
  { id: 'mailer-postcard', name: 'Postcard Mailer', category: 'mailer', size: '6 × 4 in', desc: 'Direct mail postcard — front & back' },
  { id: 'mailer-letter', name: 'Invitation Letter', category: 'mailer', size: '8.5 × 11 in', desc: 'Formal mailer with RSVP tear-off' },
  { id: 'ad-square', name: 'Social Square', category: 'digital', size: '1080 × 1080', desc: 'Instagram / Facebook feed post' },
  { id: 'ad-landscape', name: 'Social Landscape', category: 'digital', size: '1200 × 628', desc: 'Facebook / LinkedIn ad' },
  { id: 'ad-story', name: 'Story / Reel', category: 'digital', size: '1080 × 1920', desc: 'Instagram / Facebook story vertical' },
  { id: 'email-banner', name: 'Email Banner', category: 'email', size: '600 × 280', desc: 'Header for email campaigns' }
];

const MKT_THEMES = {
  gold: { bg: '#1a0a10', panel: '#2d1520', accent: '#c9a84c', text: '#f0e6d0', font: "'Playfair Display', serif" },
  forest: { bg: '#0d1410', panel: '#1a2e26', accent: '#b9824f', text: '#e8f0ea', font: "'Oswald', sans-serif" },
  navy: { bg: '#050a14', panel: '#0a1628', accent: '#aac4e0', text: '#e8f0fa', font: "'Oswald', sans-serif" },
  hub: { bg: '#0a0c10', panel: '#12151c', accent: '#c9a84c', text: '#e8ecf4', font: "'Playfair Display', serif" }
};

let mktSlug = 'edgefield';
let mktCategory = 'all';
let mktPreviewId = null;

function mktTheme(loc) {
  return MKT_THEMES[loc.theme] || MKT_THEMES.hub;
}

function mktEventDetails(slug) {
  const ev = getLocationEvent(slug) || {};
  return {
    date: ev.eventDate || '',
    doors: ev.doorsTime || '5:45 PM',
    show: ev.showTime || '6:30 PM',
    goal: ev.guestGoal || '',
    notes: ev.notes || ''
  };
}

function mktFormatDate(dateStr) {
  if (!dateStr) return 'Date TBA';
  return formatEventDate(dateStr);
}

function mktGuestUrl(slug) {
  return absoluteGuestLink(slug);
}

function renderCreativeHTML(loc, assetId, details) {
  const t = mktTheme(loc);
  const poster = RETIREMENT_EVEREST.hero?.image || 'assets/hero-poster.jpg';
  const date = mktFormatDate(details.date);
  const link = mktGuestUrl(loc.slug);
  const typeLabel = loc.type === 'retreat' ? 'Overnight Retreat' : 'Private Screening + Dinner';
  const bullets = loc.type === 'retreat'
    ? ['Private film screening', 'Complimentary overnight stay', 'Dinner at the resort', 'Mineral hot springs access']
    : ['Exclusive documentary premiere', 'Complimentary dinner included', 'No pitch — just conversation', 'Limited seats available'];

  const baseStyle = `font-family:Inter,sans-serif;color:${t.text};background:${t.bg};`;

  if (assetId === 'flyer-letter') {
    return `<div class="mkt-canvas mkt-flyer" style="${baseStyle}">
      <div class="mkt-flyer-poster"><img src="${poster}" alt="Retirement Everest"></div>
      <div class="mkt-flyer-body" style="background:${t.panel}">
        <div class="mkt-eyebrow" style="color:${t.accent}">Brett Kitchen &amp; Ethan Kap Present</div>
        <h1 style="font-family:${t.font};color:${t.accent}">Retirement Everest</h1>
        <p class="mkt-venue">${loc.name} · ${loc.city}</p>
        <p class="mkt-type">${typeLabel}</p>
        <div class="mkt-date-block" style="border-color:${t.accent}">
          <div class="mkt-date-label">You're Invited</div>
          <div class="mkt-date-val">${date}</div>
          <div class="mkt-date-sub">Doors ${details.doors} · Film ${details.show}</div>
        </div>
        <ul class="mkt-bullets">${bullets.map(b => `<li>${b}</li>`).join('')}</ul>
        <div class="mkt-cta" style="background:${t.accent};color:${t.bg}">RSVP · Complimentary Dinner Included</div>
        <div class="mkt-link">${link}</div>
      </div>
    </div>`;
  }

  if (assetId === 'mailer-postcard') {
    return `<div class="mkt-canvas mkt-postcard" style="${baseStyle}">
      <div class="mkt-postcard-front" style="background:${t.panel}">
        <img src="${poster}" alt="">
        <div class="mkt-postcard-overlay">
          <div style="color:${t.accent};font-size:10px;letter-spacing:3px;text-transform:uppercase">Private Invitation</div>
          <h2 style="font-family:${t.font};color:${t.text};margin:6px 0">Retirement Everest</h2>
          <div style="font-size:11px">${loc.shortName} · ${date}</div>
        </div>
      </div>
      <div class="mkt-postcard-back" style="background:${t.bg};border-color:${t.accent}">
        <p style="font-size:11px;line-height:1.5">Join us for an exclusive screening exploring the financial risks most Americans face in retirement — and the strategies that make the difference.</p>
        <p style="font-size:11px;margin-top:8px"><strong style="color:${t.accent}">${date}</strong><br>Doors ${details.doors} · Film ${details.show}<br>${loc.venue}, ${loc.city}</p>
        <div class="mkt-cta-sm" style="background:${t.accent};color:${t.bg}">Scan or visit to reserve</div>
        <div class="mkt-link-sm">${link}</div>
      </div>
    </div>`;
  }

  if (assetId === 'mailer-letter') {
    return `<div class="mkt-canvas mkt-letter" style="${baseStyle}background:#fff;color:#222">
      <div class="mkt-letter-head" style="border-color:${t.accent}">
        <img src="${poster}" alt="" class="mkt-letter-thumb">
        <div><div style="color:${t.accent};font-size:9px;letter-spacing:2px">PRIVATE PREMIERE</div>
        <h2 style="font-family:${t.font};color:#111;margin:4px 0">Retirement Everest</h2>
        <div style="font-size:11px;color:#555">${loc.name} · ${loc.city}</div></div>
      </div>
      <p style="font-size:12px;line-height:1.7;margin:16px 0">Dear Friend,</p>
      <p style="font-size:12px;line-height:1.7">You've been personally invited to a private screening of <em>Retirement Everest</em> on <strong>${date}</strong> at ${loc.venue}. Dinner is on us — no cost, no obligation, no sales pitch.</p>
      <p style="font-size:12px;line-height:1.7">Doors open at ${details.doors}. The film begins at ${details.show}. Seats are limited.</p>
      <div class="mkt-letter-rsvp" style="border-color:${t.accent}">
        <strong>Reserve your seat:</strong> ${link}
      </div>
      <div class="mkt-letter-footer" style="background:${t.panel};color:${t.text}">
        <span>Retirement Everest · ${loc.shortName}</span>
        <span>${date}</span>
      </div>
    </div>`;
  }

  if (assetId === 'ad-square') {
    return `<div class="mkt-canvas mkt-ad-square" style="${baseStyle}">
      <img src="${poster}" alt="" class="mkt-ad-bg">
      <div class="mkt-ad-overlay" style="background:linear-gradient(180deg,transparent 30%,${t.bg} 85%)">
        <div class="mkt-eyebrow" style="color:${t.accent}">You're Invited</div>
        <h2 style="font-family:${t.font};color:${t.text}">Retirement<br>Everest</h2>
        <p style="font-size:13px;opacity:0.9">${loc.shortName} · ${date}</p>
        <div class="mkt-cta" style="background:${t.accent};color:${t.bg};font-size:10px">Free Dinner · Reserve Now</div>
      </div>
    </div>`;
  }

  if (assetId === 'ad-landscape') {
    return `<div class="mkt-canvas mkt-ad-landscape" style="${baseStyle}">
      <div class="mkt-ad-land-left"><img src="${poster}" alt=""></div>
      <div class="mkt-ad-land-right" style="background:${t.panel}">
        <div class="mkt-eyebrow" style="color:${t.accent}">Private Film Screening</div>
        <h2 style="font-family:${t.font};color:${t.accent};font-size:28px;line-height:1.1">Retirement Everest</h2>
        <p style="font-size:12px;margin:10px 0 14px;opacity:0.85">${loc.name}<br>${date} · Doors ${details.doors}</p>
        <div class="mkt-cta" style="background:${t.accent};color:${t.bg};display:inline-block;font-size:9px">Complimentary Dinner · Limited Seats</div>
      </div>
    </div>`;
  }

  if (assetId === 'ad-story') {
    return `<div class="mkt-canvas mkt-ad-story" style="${baseStyle}">
      <img src="${poster}" alt="" class="mkt-ad-bg">
      <div class="mkt-ad-story-content" style="background:linear-gradient(180deg,transparent,rgba(0,0,0,0.85))">
        <div class="mkt-eyebrow" style="color:${t.accent}">Brett Kitchen &amp; Ethan Kap Present</div>
        <h2 style="font-family:${t.font};color:${t.text};font-size:32px">Retirement Everest</h2>
        <p style="font-size:14px">${loc.shortName}</p>
        <p style="font-size:13px;color:${t.accent};margin:12px 0">${date}</p>
        <p style="font-size:12px;opacity:0.8">Film + complimentary dinner<br>Limited seats · RSVP required</p>
        <div class="mkt-cta" style="background:${t.accent};color:${t.bg}">Reserve Your Seat</div>
      </div>
    </div>`;
  }

  if (assetId === 'email-banner') {
    return `<div class="mkt-canvas mkt-email-banner" style="${baseStyle}">
      <img src="${poster}" alt="" class="mkt-email-img">
      <div class="mkt-email-text" style="background:${t.panel}">
        <div style="color:${t.accent};font-size:8px;letter-spacing:2px;text-transform:uppercase">You're Invited</div>
        <div style="font-family:${t.font};font-size:18px;color:${t.text}">Retirement Everest</div>
        <div style="font-size:10px;opacity:0.8">${loc.shortName} · ${date}</div>
        <div class="mkt-cta-sm" style="background:${t.accent};color:${t.bg};margin-top:8px">Reserve →</div>
      </div>
    </div>`;
  }

  return '<div>Unknown asset</div>';
}

function initMarketing() {
  const p = new URLSearchParams(location.search);
  mktSlug = p.get('location') || Object.keys(RETIREMENT_EVEREST.locations)[0];
  renderMarketingPage();
}

function renderMarketingPage() {
  const loc = RETIREMENT_EVEREST.locations[mktSlug];
  if (!loc) return;
  const details = {
    date: document.getElementById('mktDate')?.value || mktEventDetails(mktSlug).date,
    doors: document.getElementById('mktDoors')?.value || mktEventDetails(mktSlug).doors,
    show: document.getElementById('mktShow')?.value || mktEventDetails(mktSlug).show
  };
  const sel = getMarketingSelections()[mktSlug] || [];
  const filtered = mktCategory === 'all' ? MKT_ASSETS : MKT_ASSETS.filter(a => a.category === mktCategory);

  document.getElementById('mktGrid').innerHTML = filtered.map(asset => {
    const checked = sel.includes(asset.id);
    return `<div class="mkt-card${checked ? ' selected' : ''}" data-id="${asset.id}">
      <label class="mkt-select"><input type="checkbox" data-asset="${asset.id}" ${checked ? 'checked' : ''}> Select</label>
      <div class="mkt-preview-wrap" data-preview="${asset.id}">${renderCreativeHTML(loc, asset.id, details)}</div>
      <div class="mkt-card-meta">
        <h3>${asset.name}</h3>
        <p>${asset.desc}</p>
        <span class="mkt-size">${asset.size}</span>
        <div class="mkt-card-actions">
          <button type="button" class="btn-sm" data-action="preview" data-id="${asset.id}">Full preview</button>
          <button type="button" class="btn-sm" data-action="print" data-id="${asset.id}">Print / PDF</button>
        </div>
      </div>
    </div>`;
  }).join('');

  document.getElementById('mktSelCount').textContent = `${sel.length} selected for ${loc.shortName}`;
}

function openMktPreview(assetId) {
  const loc = RETIREMENT_EVEREST.locations[mktSlug];
  const details = {
    date: document.getElementById('mktDate').value || mktEventDetails(mktSlug).date,
    doors: document.getElementById('mktDoors').value,
    show: document.getElementById('mktShow').value
  };
  mktPreviewId = assetId;
  document.getElementById('mktModalBody').innerHTML = renderCreativeHTML(loc, assetId, details);
  document.getElementById('mktModal').classList.add('open');
}

function printMktAsset(assetId) {
  const loc = RETIREMENT_EVEREST.locations[mktSlug];
  const details = {
    date: document.getElementById('mktDate').value || mktEventDetails(mktSlug).date,
    doors: document.getElementById('mktDoors').value,
    show: document.getElementById('mktShow').value
  };
  const win = window.open('', '_blank');
  win.document.write(`<!DOCTYPE html><html><head><title>${loc.shortName} · ${assetId}</title>
    <link rel="stylesheet" href="styles.css"><style>body{margin:0;padding:20px;background:#fff}</style></head>
    <body>${renderCreativeHTML(loc, assetId, details)}</body></html>`);
  win.document.close();
  setTimeout(() => win.print(), 400);
}

function bindMarketingEvents() {
  document.getElementById('mktLocSelect').addEventListener('change', e => {
    mktSlug = e.target.value;
    const ev = mktEventDetails(mktSlug);
    document.getElementById('mktDate').value = ev.date;
    document.getElementById('mktDoors').value = ev.doors;
    document.getElementById('mktShow').value = ev.show;
    history.replaceState(null, '', `marketing-kit.html?location=${mktSlug}`);
    renderMarketingPage();
  });

  document.querySelectorAll('.mkt-cat-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      mktCategory = btn.dataset.cat;
      document.querySelectorAll('.mkt-cat-btn').forEach(b => b.classList.toggle('active', b === btn));
      renderMarketingPage();
    });
  });

  ['mktDate', 'mktDoors', 'mktShow'].forEach(id => {
    document.getElementById(id).addEventListener('change', renderMarketingPage);
  });

  document.getElementById('mktGrid').addEventListener('click', e => {
    const btn = e.target.closest('[data-action]');
    if (btn) {
      const id = btn.dataset.id;
      if (btn.dataset.action === 'preview') openMktPreview(id);
      if (btn.dataset.action === 'print') printMktAsset(id);
      return;
    }
    const preview = e.target.closest('[data-preview]');
    if (preview) openMktPreview(preview.dataset.preview);
  });

  document.getElementById('mktGrid').addEventListener('change', e => {
    if (e.target.type !== 'checkbox') return;
    toggleMarketingSelection(mktSlug, e.target.dataset.asset, e.target.checked);
    renderMarketingPage();
  });

  document.getElementById('mktModalClose').addEventListener('click', () => {
    document.getElementById('mktModal').classList.remove('open');
  });
  document.getElementById('mktModalPrint').addEventListener('click', () => {
    if (mktPreviewId) printMktAsset(mktPreviewId);
  });

  document.getElementById('mktDownloadSel').addEventListener('click', () => {
    const sel = getMarketingSelections()[mktSlug] || [];
    if (!sel.length) { alert('Select at least one creative first.'); return; }
    sel.forEach((id, i) => setTimeout(() => printMktAsset(id), i * 600));
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const sel = document.getElementById('mktLocSelect');
  sel.innerHTML = Object.values(RETIREMENT_EVEREST.locations).map(l =>
    `<option value="${l.slug}"${l.slug === mktSlug ? ' selected' : ''}>${l.shortName} — ${l.city}</option>`
  ).join('');
  const ev = mktEventDetails(mktSlug);
  document.getElementById('mktDate').value = ev.date;
  document.getElementById('mktDoors').value = ev.doors;
  document.getElementById('mktShow').value = ev.show;
  bindMarketingEvents();
  initMarketing();
});