let currentSlug = 'edgefield';
let roomRates = getRoomRates();

function initHost() {
  const sel = document.getElementById('locSelect');
  const typeLabels = { retreat: 'Retreat', screening: 'Screening', preorder: 'Preorder', buffet: 'Buffet poll' };
  sel.innerHTML = Object.values(RETIREMENT_EVEREST.locations).map(l =>
    `<option value="${l.slug}">${l.shortName} — ${typeLabels[l.type] || 'Event'}</option>`
  ).join('');
  const p = new URLSearchParams(location.search);
  const startView = ['overview', 'venues', 'location', 'planner', 'outreach'].includes(p.get('view')) ? p.get('view') : 'overview';
  currentSlug = p.get('location') || 'edgefield';
  sel.value = currentSlug;
  Object.values(RETIREMENT_EVEREST.locations).forEach(l => {
    if (roomRates[l.slug] == null && l.avgRoomRate) roomRates[l.slug] = l.avgRoomRate;
  });
  sel.addEventListener('change', () => { currentSlug = sel.value; renderReport(); });

  document.querySelectorAll('.host-tab').forEach(tab => {
    tab.addEventListener('click', () => switchHostView(tab.dataset.view));
  });

  loadChecklistDefaults().then(() => switchHostView(startView));
}

function getLoc() { return RETIREMENT_EVEREST.locations[currentSlug]; }

function getOrders() {
  const loc = getLoc();
  return JSON.parse(localStorage.getItem(loc.storageKey) || '[]');
}

function rankBars(counts) {
  const entries = Object.entries(counts).sort((a,b) => b[1]-a[1]);
  const max = entries[0]?.[1] || 1;
  return entries.map(([name, count]) => `
    <div class="rank-row"><div class="rank-name">${name}</div>
    <div class="rank-bar-wrap"><div class="rank-bar" style="width:${(count/max*100).toFixed(0)}%"></div></div>
    <div class="rank-count">${count}</div></div>`).join('');
}

function renderBuffetReport(orders, loc) {
  const buffetCounts = {}, starterCounts = {}, drinkCounts = {};
  orders.forEach(o => {
    if (o.buffet) buffetCounts[o.buffet] = (buffetCounts[o.buffet] || 0) + 1;
    if (o.starter) starterCounts[o.starter] = (starterCounts[o.starter] || 0) + 1;
    if (o.drink) drinkCounts[o.drink] = (drinkCounts[o.drink] || 0) + 1;
  });
  const topBuffet = Object.entries(buffetCounts).sort((a, b) => b[1] - a[1])[0];
  const topStarter = Object.entries(starterCounts).sort((a, b) => b[1] - a[1])[0];
  const topDrink = Object.entries(drinkCounts).sort((a, b) => b[1] - a[1])[0];
  return `
    <div class="stats-row" style="display:grid;grid-template-columns:repeat(3,1fr);gap:12px;margin-bottom:16px">
      <div class="card-box"><div class="stat-label">Votes</div><div class="stat-val">${orders.length}</div></div>
      <div class="card-box"><div class="stat-label">Leading buffet</div><div class="stat-val" style="font-size:1rem">${topBuffet ? esc(topBuffet[0]) + ' (' + topBuffet[1] + ')' : '—'}</div></div>
      <div class="card-box"><div class="stat-label">Leading beverage</div><div class="stat-val" style="font-size:1rem">${topDrink ? esc(topDrink[0]) + ' (' + topDrink[1] + ')' : '—'}</div></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:16px">
      <div class="card-box"><h3>Buffet popularity</h3>${rankBars(buffetCounts) || '<p style="color:var(--muted);font-size:0.8rem">No votes yet.</p>'}</div>
      <div class="card-box"><h3>Appetizer package votes</h3>${rankBars(starterCounts) || '<p style="color:var(--muted);font-size:0.8rem">No votes yet.</p>'}</div>
      <div class="card-box"><h3>Beverage preference</h3>${rankBars(drinkCounts) || '<p style="color:var(--muted);font-size:0.8rem">No votes yet.</p>'}</div>
    </div>
    <p style="color:var(--muted);font-size:0.85rem;margin-bottom:12px">Leading starter package: <strong>${topStarter ? esc(topStarter[0]) : '—'}</strong>. Use these tallies to lock one group buffet + whether to add apps with McMenamins sales.</p>
    <div class="card-box" style="overflow:auto">
      <table class="data-table">
        <thead><tr><th>#</th><th>Name</th><th>Buffet</th><th>Appetizers</th><th>Beverage</th><th>Time</th></tr></thead>
        <tbody>${orders.map((o, i) => `<tr><td>${i + 1}</td><td><strong>${esc(o.name)}</strong></td><td>${esc(o.buffet || '—')}</td><td>${esc(o.starter || '—')}</td><td>${esc(o.drink || '—')}</td><td>${new Date(o.ts).toLocaleString()}</td></tr>`).join('')}</tbody>
      </table>
    </div>`;
}

function renderPreorderReport(orders, loc) {
  const prices = {};
  [...loc.menus.starters, ...loc.menus.mains, ...loc.menus.drinks].forEach(item => { prices[item.id] = item.price; });
  const enriched = orders.map(o => ({
    ...o,
    starterPrice: prices[o.starterId] || o.starterPrice || 0,
    mainPrice: prices[o.mainId] || o.mainPrice || 0,
    drinkPrice: prices[o.drinkId] || o.drinkPrice || 0,
    total: (prices[o.starterId] || o.starterPrice || 0) + (prices[o.mainId] || o.mainPrice || 0) + (prices[o.drinkId] || o.drinkPrice || 0)
  }));
  const grandStarter = enriched.reduce((s, o) => s + o.starterPrice, 0);
  const grandFood = enriched.reduce((s, o) => s + o.mainPrice, 0);
  const grandDrink = enriched.reduce((s, o) => s + o.drinkPrice, 0);
  const grandTotal = grandStarter + grandFood + grandDrink;
  const skippedStarter = enriched.filter(o => !o.starter).length;
  const starterCounts = {}, mainCounts = {}, drinkCounts = {};
  enriched.forEach(o => {
    if (o.starter) starterCounts[o.starter] = (starterCounts[o.starter] || 0) + 1;
    mainCounts[o.main] = (mainCounts[o.main] || 0) + 1;
    drinkCounts[o.drink] = (drinkCounts[o.drink] || 0) + 1;
  });
  const estTip = grandTotal * 0.20;
  return `
    <div class="stats">
      <div class="stat"><div class="stat-label">Guests ordered</div><div class="stat-val">${enriched.length}</div></div>
      <div class="stat"><div class="stat-label">Arrival bites</div><div class="stat-val accent">${fmt(grandStarter)}</div><div class="stat-sub" style="font-size:0.72rem;color:var(--muted);margin-top:4px">${skippedStarter} skipped</div></div>
      <div class="stat"><div class="stat-label">Food subtotal</div><div class="stat-val accent">${fmt(grandFood)}</div></div>
      <div class="stat"><div class="stat-label">Est. total + tip</div><div class="stat-val accent">${fmt(grandTotal + estTip)}</div></div>
    </div>
    <div class="two-col">
      <div class="card-box"><h3>Arrival bites</h3>${rankBars(starterCounts) || '<p style="color:var(--muted);font-size:0.8rem">No bites ordered yet.</p>'}</div>
      <div class="card-box"><h3>Mains</h3>${rankBars(mainCounts)}</div>
    </div>
    <div class="card-box"><h3>Drinks</h3>${rankBars(drinkCounts)}</div>
    <div class="card-box">
      <h3>All orders (${enriched.length})</h3>
      <div style="overflow-x:auto;margin-top:12px"><table>
        <thead><tr><th>#</th><th>Guest</th><th>Arrival Bite</th><th>Main</th><th>Drink</th><th>Subtotal</th><th>Time</th></tr></thead>
        <tbody>${enriched.map((o, i) => `<tr>
          <td>${i + 1}</td><td><strong>${o.name}</strong></td>
          <td>${o.starter || '—'}</td><td>${o.main}</td><td>${o.drink}</td>
          <td>${fmt(o.total)}</td><td>${new Date(o.ts).toLocaleString()}</td></tr>`).join('')}
        </tbody></table></div>
    </div>`;
}

function renderScreeningReport(orders, loc) {
  const prices = {};
  loc.menus.entrees.forEach(e => { prices[e.id] = e.price; });
  (loc.menus.drinks || []).forEach(d => { prices[d.id] = d.price; });
  const enriched = orders.map(o => ({
    ...o,
    entreePrice: prices[o.entreeId] || o.entreePrice || 66,
    drinkPrice: prices[o.drinkId] || o.drinkPrice || 0,
    total: (prices[o.entreeId] || o.entreePrice || 66) + (prices[o.drinkId] || o.drinkPrice || 0)
  }));
  const total = enriched.reduce((s,o) => s + o.total, 0);
  const saladCounts = {}, entreeCounts = {}, dessertCounts = {}, drinkCounts = {};
  enriched.forEach(o => {
    saladCounts[o.salad] = (saladCounts[o.salad] || 0) + 1;
    entreeCounts[o.entree] = (entreeCounts[o.entree] || 0) + 1;
    dessertCounts[o.dessert] = (dessertCounts[o.dessert] || 0) + 1;
    if (o.drink) drinkCounts[o.drink] = (drinkCounts[o.drink] || 0) + 1;
  });
  const drinkBox = loc.menus.drinks?.length
    ? `<div class="card-box"><h3>Drink selections</h3>${rankBars(drinkCounts)}</div>` : '';
  const drinkCol = loc.menus.drinks?.length ? '<th>Drink</th>' : '';
  const drinkCells = o => loc.menus.drinks?.length ? `<td>${o.drink || '—'}</td>` : '';
  return `
    <div class="stats">
      <div class="stat"><div class="stat-label">Guests ordered</div><div class="stat-val">${enriched.length}</div></div>
      <div class="stat"><div class="stat-label">Dinner subtotal</div><div class="stat-val accent">${fmt(total)}</div></div>
      <div class="stat"><div class="stat-label">Avg per guest</div><div class="stat-val">${fmt(total / enriched.length || 0)}</div></div>
      <div class="stat"><div class="stat-label">Location</div><div class="stat-val accent" style="font-size:1.1rem">${loc.shortName}</div></div>
    </div>
    <div class="two-col">
      <div class="card-box"><h3>Salad selections</h3>${rankBars(saladCounts)}</div>
      <div class="card-box"><h3>Dessert selections</h3>${rankBars(dessertCounts)}</div>
    </div>
    <div class="two-col">
      <div class="card-box"><h3>Entrée selections</h3>${rankBars(entreeCounts)}</div>
      ${drinkBox}
    </div>
    <div class="card-box">
      <h3>All orders (${enriched.length})</h3>
      <div style="overflow-x:auto;margin-top:12px"><table>
        <thead><tr><th>#</th><th>Guest</th><th>Salad</th><th>Entrée</th><th>Dessert</th>${drinkCol}<th>Cost</th><th>Time</th></tr></thead>
        <tbody>${enriched.map((o,i) => `<tr><td>${i+1}</td><td><strong>${o.name}</strong></td><td>${o.salad}</td><td>${o.entree}</td><td>${o.dessert}</td>${drinkCells(o)}<td>${fmt(o.total)}</td><td>${new Date(o.ts).toLocaleString()}</td></tr>`).join('')}</tbody>
      </table></div>
    </div>`;
}

function renderRetreatReport(orders, loc) {
  const rate = roomRates[loc.slug] || loc.avgRoomRate || 150;
  const normalized = orders.map(o => {
    if (o.people) return o;
    return { ...o, partySize: 1, people: [{ dinner: o.dinner, dinnerId: o.dinnerId, dinnerPrice: o.dinnerPrice || 0 }] };
  });
  const totalRes = normalized.length;
  const totalGuests = normalized.reduce((s,o) => s + (o.partySize || 1), 0);
  const roomCost = totalRes * rate;
  const dinnerCost = normalized.reduce((s,o) => s + o.people.reduce((ps,p) => ps + (p.dinnerPrice || 0), 0), 0);
  const solo = normalized.filter(o => (o.partySize || 1) === 1).length;
  const couples = normalized.filter(o => (o.partySize || 1) === 2).length;
  const roomCounts = {}, dinnerCounts = {};
  normalized.forEach(o => {
    roomCounts[o.room] = (roomCounts[o.room] || 0) + 1;
    o.people.forEach(p => { dinnerCounts[p.dinner] = (dinnerCounts[p.dinner] || 0) + 1; });
  });
  return `
    <div class="rate-note">💰 Room rate: <strong>$${rate}/night</strong> per reservation
      <button class="btn-sm" style="margin-left:8px" onclick="adjustRate()">Adjust</button></div>
    <div class="stats">
      <div class="stat"><div class="stat-label">Reservations</div><div class="stat-val">${totalRes}</div></div>
      <div class="stat"><div class="stat-label">Total guests</div><div class="stat-val">${totalGuests}</div></div>
      <div class="stat"><div class="stat-label">Solo / Couples</div><div class="stat-val">${solo} / ${couples}</div></div>
      <div class="stat"><div class="stat-label">Est. total</div><div class="stat-val accent">${fmt(roomCost + dinnerCost)}</div></div>
    </div>
    <div class="two-col">
      <div class="card-box"><h3>Rooms</h3>${rankBars(roomCounts)}</div>
      <div class="card-box"><h3>Dinners</h3>${rankBars(dinnerCounts)}</div>
    </div>
    <div class="card-box">
      <h3>All reservations (${totalRes})</h3>
      <div style="overflow-x:auto;margin-top:12px"><table>
        <thead><tr><th>#</th><th>Guest</th><th>Room</th><th>Party</th><th>Selections</th><th>Dinner $</th><th>Time</th></tr></thead>
        <tbody>${normalized.map((o,i) => `<tr>
          <td>${i+1}</td><td><strong>${o.name}</strong></td><td>${o.room}</td><td>${o.partySize||1}</td>
          <td>${o.people.map(p => `${p.dinner}${p.starter?' + '+p.starter:''}`).join('<br>')}</td>
          <td>${fmt(o.people.reduce((s,p)=>s+(p.dinnerPrice||0),0))}</td>
          <td>${new Date(o.ts).toLocaleString()}</td></tr>`).join('')}
        </tbody></table></div>
    </div>`;
}

function renderShareBar(loc) {
  const link = absoluteGuestLink(loc.slug);
  return `<div class="card-box" style="margin-bottom:20px;display:flex;flex-wrap:wrap;gap:12px;align-items:center;justify-content:space-between">
    <div>
      <h3 style="margin-bottom:6px">Guest RSVP page</h3>
      <code style="font-size:0.78rem;word-break:break-all">${link}</code>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button type="button" class="btn-sm btn-accent" onclick="openInviteModal('${loc.slug}')">Send guest link</button>
      <a class="btn-sm" href="${link}" target="_blank" style="text-decoration:none">Open page ↗</a>
      <button type="button" class="btn-sm" data-copy-link="${esc(link)}">Copy link</button>
    </div>
  </div>`;
}

function renderReport() {
  const loc = getLoc();
  document.body.className = 'theme-hub';
  if (document.getElementById('hostTitle')) {
    document.getElementById('hostTitle').textContent = `${loc.shortName} · Report`;
  }
  const orders = getOrders();
  const body = document.getElementById('report-body');
  const share = renderShareBar(loc);
  if (!orders.length) {
    body.innerHTML = `${share}<div class="empty">No reservations yet for ${loc.shortName}. Use <strong>Send guest link</strong> to invite prospects.</div>`;
  } else {
    body.innerHTML = share + (loc.type === 'screening' ? renderScreeningReport(orders, loc)
      : loc.type === 'preorder' ? renderPreorderReport(orders, loc)
      : loc.type === 'buffet' ? renderBuffetReport(orders, loc)
      : renderRetreatReport(orders, loc));
  }
  body.querySelector('[data-copy-link]')?.addEventListener('click', e => {
    copyText(e.target.dataset.copyLink).then(() => alert('Link copied!'));
  });
}

function adjustRate() {
  const loc = getLoc();
  const val = prompt('Average room rate per night ($):', roomRates[loc.slug]);
  if (val && !isNaN(val)) {
    roomRates[loc.slug] = parseFloat(val);
    saveRoomRates(roomRates);
    renderReport();
  }
}

function clearAll() {
  const loc = getLoc();
  if (!confirm(`Delete all ${loc.shortName} reservations?`)) return;
  localStorage.removeItem(loc.storageKey);
  renderReport();
}

let inviteModalSlug = null;

function toggleExportMenu(e) {
  e.stopPropagation();
  document.getElementById('exportDropdown').classList.toggle('open');
}

document.addEventListener('click', () => {
  document.getElementById('exportDropdown')?.classList.remove('open');
});

function exportData(type) {
  document.getElementById('exportDropdown')?.classList.remove('open');
  const loc = getLoc();
  const orders = getOrders();
  if (type !== 'cost-summary' && !orders.length) return alert('No orders to export yet.');

  const rows = type === 'guest-list' ? buildExportRows(loc, orders, 'guest-list')
    : type === 'cost-summary' ? buildExportRows(loc, orders, 'cost-summary')
    : buildExportRows(loc, orders, 'orders');

  if (type === 'orders-tsv') {
    copyText(rowsToTSV(rows)).then(() => alert('Copied! Paste into Google Sheets with Cmd/Ctrl+V.'));
    return;
  }
  if (type === 'sheets-push') {
    pushToGoogleSheets(rows, { location: loc.shortName, exportType: 'orders', sheetName: loc.shortName })
      .then(() => alert(`Sent to Google Sheet. Check tab "${loc.shortName}" (may take a few seconds).`))
      .catch(err => alert(err.message));
    return;
  }
  const csv = rowsToCSV(rows);
  const suffix = type === 'guest-list' ? 'guests' : type === 'cost-summary' ? 'cost-summary' : 'orders';
  downloadText(`${loc.slug}_${suffix}.csv`, csv, 'text/csv;charset=utf-8');
}

function exportCSV() { exportData('orders-csv'); }

function openInviteModal(slug) {
  inviteModalSlug = slug || currentSlug;
  const loc = RETIREMENT_EVEREST.locations[inviteModalSlug];
  const ev = getLocationEvent(inviteModalSlug);
  const link = absoluteGuestLink(inviteModalSlug);
  document.getElementById('inviteModalSub').textContent = `${loc.shortName} · ${loc.city}`;
  document.getElementById('invFirst').value = '';
  document.getElementById('invLast').value = '';
  document.getElementById('invEmail').value = '';
  document.getElementById('invPhone').value = '';
  document.getElementById('invMessage').value = buildInviteMessage(loc, link, ev, '');
  document.getElementById('inviteModal').classList.add('open');
  ['invFirst', 'invLast'].forEach(id => {
    document.getElementById(id).oninput = updateInvitePreview;
  });
}

function closeInviteModal() {
  document.getElementById('inviteModal').classList.remove('open');
}

function updateInvitePreview() {
  const loc = RETIREMENT_EVEREST.locations[inviteModalSlug];
  const first = document.getElementById('invFirst').value.trim();
  const last = document.getElementById('invLast').value.trim();
  const name = [first, last].filter(Boolean).join(' ');
  document.getElementById('invMessage').value = buildInviteMessage(loc, absoluteGuestLink(inviteModalSlug), getLocationEvent(inviteModalSlug), name);
}

function buildInviteRecord() {
  const loc = RETIREMENT_EVEREST.locations[inviteModalSlug];
  const first = document.getElementById('invFirst').value.trim();
  const last = document.getElementById('invLast').value.trim();
  const email = document.getElementById('invEmail').value.trim();
  const phone = document.getElementById('invPhone').value.trim();
  const message = document.getElementById('invMessage').value;
  const link = absoluteGuestLink(inviteModalSlug);
  return {
    id: Date.now(),
    firstName: first,
    lastName: last,
    email,
    phone,
    locationSlug: inviteModalSlug,
    locationName: loc.shortName,
    guestLink: link,
    message,
    ts: new Date().toISOString(),
    status: 'queued'
  };
}

function sendInviteEmail() {
  const inv = buildInviteRecord();
  if (!inv.email) return alert('Enter an email address.');
  const subject = encodeURIComponent(`You're invited — Retirement Everest at ${inv.locationName}`);
  const body = encodeURIComponent(inv.message);
  window.location.href = `mailto:${inv.email}?subject=${subject}&body=${body}`;
  saveInvite({ ...inv, status: 'email-opened' });
}

function sendInviteSMS() {
  const inv = buildInviteRecord();
  if (!inv.phone) return alert('Enter a phone number.');
  const digits = inv.phone.replace(/\D/g, '');
  const smsBody = encodeURIComponent(inv.message);
  window.location.href = `sms:${digits}?&body=${smsBody}`;
  saveInvite({ ...inv, status: 'sms-opened' });
}

function copyInvite() {
  const inv = buildInviteRecord();
  copyText(inv.message).then(() => alert('Invite message copied.'));
  saveInvite({ ...inv, status: 'copied' });
}

async function queueInvite() {
  const inv = buildInviteRecord();
  if (!inv.firstName && !inv.email && !inv.phone) return alert('Enter at least a name, email, or phone.');
  saveInvite(inv);
  try {
    await pushToGHL(inv);
    alert('Saved to invite queue and sent to GHL webhook.');
  } catch {
    alert('Saved to invite queue. Configure GHL webhook in Outreach → Integrations to auto-sync.');
  }
  if (document.getElementById('view-outreach').classList.contains('active')) renderOutreach();
  closeInviteModal();
}

function renderOutreach() {
  const cfg = getIntegrations();
  const queue = getInviteQueue();
  const locs = getAllLocations();

  const locCards = locs.map(loc => {
    const link = absoluteGuestLink(loc.slug);
    const ev = getLocationEvent(loc.slug);
    return `<div class="card-box">
      <h3>${esc(loc.shortName)}</h3>
      <p style="font-size:0.8rem;color:var(--muted);margin-bottom:12px">${esc(loc.name)} · ${esc(loc.city)}</p>
      <div class="status-row"><span>Event date</span><strong>${ev?.eventDate ? formatEventDate(ev.eventDate) : 'Not set'}</strong></div>
      <div class="status-row"><span>Orders</span><strong>${getOrdersForLocation(loc).length}</strong></div>
      <code style="display:block;font-size:0.7rem;margin:12px 0;word-break:break-all">${esc(link)}</code>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
        <button type="button" class="btn-sm btn-accent" onclick="openInviteModal('${loc.slug}')">Send guest link</button>
        <a class="btn-sm" href="marketing-kit.html?location=${loc.slug}" style="text-decoration:none">Marketing creatives</a>
        <a class="btn-sm" href="${link}" target="_blank" style="text-decoration:none">Open RSVP ↗</a>
      </div>
    </div>`;
  }).join('');

  const queueHTML = queue.length
    ? queue.slice(0, 30).map(inv => `<div class="invite-row">
        <strong>${esc(inv.firstName || '')} ${esc(inv.lastName || '')}</strong> · ${esc(inv.locationName)}
        <div style="font-size:0.75rem;color:var(--muted)">${esc(inv.email || '—')} · ${esc(inv.phone || '—')} · ${inv.status} · ${new Date(inv.ts).toLocaleString()}</div>
      </div>`).join('')
    : '<p class="empty" style="padding:16px">No invites queued yet.</p>';

  document.getElementById('view-outreach').innerHTML = `
    <div class="two-col" style="margin-bottom:24px">
      <div class="card-box">
        <h3>Integrations</h3>
        <p class="integration-note">Connect GoHighLevel and Google Sheets when ready. Until then, use email/SMS buttons and copy-paste export.</p>
        <div class="planner-form" style="margin-top:16px">
          <label class="planner-field full"><span>GHL webhook URL</span>
            <input type="url" id="intGhl" value="${esc(cfg.ghlWebhookUrl)}" placeholder="https://services.leadconnectorhq.com/hooks/..."></label>
          <label class="planner-field full"><span>Google Sheets webhook URL</span>
            <input type="url" id="intSheets" value="${esc(cfg.googleSheetsWebhookUrl)}" placeholder="https://script.google.com/macros/s/.../exec"></label>
          <label class="planner-field"><span>Google Sheet ID</span>
            <input type="text" id="intSheetId" value="${esc(cfg.googleSheetId)}" placeholder="From sheet URL"></label>
          <label class="planner-field"><span>Default tab name</span>
            <input type="text" id="intSheetTab" value="${esc(cfg.defaultSheetTab)}"></label>
          <label class="planner-field"><span>Your name (invites)</span>
            <input type="text" id="intOrgName" value="${esc(cfg.organizerName)}"></label>
          <label class="planner-field"><span>Your email</span>
            <input type="email" id="intOrgEmail" value="${esc(cfg.organizerEmail)}"></label>
        </div>
        <div class="planner-actions">
          <button type="button" class="lock-btn" id="saveIntegrationsBtn" style="max-width:none;width:auto;padding:12px 24px">Save integrations</button>
          <a class="btn-sm" href="docs/INTEGRATIONS.md" target="_blank" style="text-decoration:none">Setup guide ↗</a>
        </div>
      </div>
      <div class="card-box">
        <h3>Invite queue <span style="color:var(--muted);font-weight:400">(${queue.length})</span></h3>
        <div class="invite-queue">${queueHTML}</div>
      </div>
    </div>
    <h3 class="dash-section-title">Send links by location</h3>
    <div class="dash-loc-grid">${locCards}</div>
    <div class="card-box" style="margin-top:8px">
      <h3>Marketing kit</h3>
      <p style="font-size:0.85rem;color:var(--muted);margin-bottom:14px">Flyers, postcard mailers, social ads, and email banners — all using your Retirement Everest poster.</p>
      <a class="btn-sm btn-accent" href="marketing-kit.html" style="text-decoration:none;display:inline-block">Open marketing kit →</a>
    </div>`;

  document.getElementById('saveIntegrationsBtn').addEventListener('click', () => {
    saveIntegrations({
      ghlWebhookUrl: document.getElementById('intGhl').value.trim(),
      googleSheetsWebhookUrl: document.getElementById('intSheets').value.trim(),
      googleSheetId: document.getElementById('intSheetId').value.trim(),
      defaultSheetTab: document.getElementById('intSheetTab').value.trim() || 'Orders',
      organizerName: document.getElementById('intOrgName').value.trim(),
      organizerEmail: document.getElementById('intOrgEmail').value.trim()
    });
    alert('Integrations saved.');
  });
}