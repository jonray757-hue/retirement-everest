let currentSlug = 'edgefield';
let roomRates = getRoomRates();

function initHost() {
  // Restore scheduled events (localStorage) + seed Kennedy School Aug 27 if missing
  if (typeof ensureEventDefaults === 'function') ensureEventDefaults();

  const sel = document.getElementById('locSelect');
  const typeLabels = { retreat: 'Retreat', screening: 'Screening', preorder: 'Preorder', buffet: 'Buffet' };
  let plannerLocs = (typeof getPlannerLocations === 'function') ? getPlannerLocations() : Object.values(RETIREMENT_EVEREST.locations);
  /* Sort Kennedy School to top */
  plannerLocs = plannerLocs.sort((a, b) => {
    if (a.slug === 'kennedy-school') return -1;
    if (b.slug === 'kennedy-school') return 1;
    if (a.slug === 'kennedy-school-bbq') return -1;
    if (b.slug === 'kennedy-school-bbq') return 1;
    return 0;
  });
  sel.innerHTML = plannerLocs.map(l => {
    const typeTag = l.guestSlug ? 'BBQ prefs' : (typeLabels[l.type] || 'Event');
    return `<option value="${l.slug}">${l.shortName} — ${typeTag}</option>`;
  }).join('');
  /* Show location selector in prominent topbar position */
  document.getElementById('loc-topbar').style.display = 'flex';
  const p = new URLSearchParams(location.search);
  const startView = ['overview', 'venues', 'location', 'planner', 'contacts', 'outreach'].includes(p.get('view')) ? p.get('view') : 'overview';
  currentSlug = p.get('location') || 'kennedy-school';
  // If someone deep-linked to guest-only BBQ page, show parent Kennedy School
  if (RETIREMENT_EVEREST.locations[currentSlug]?.guestOnly) {
    currentSlug = 'kennedy-school';
  }
  if (![...sel.options].some(o => o.value === currentSlug)) currentSlug = plannerLocs[0]?.slug || 'edgefield';
  sel.value = currentSlug;
  plannerLocs.forEach(l => {
    if (roomRates[l.slug] == null && l.avgRoomRate) roomRates[l.slug] = l.avgRoomRate;
  });
  sel.addEventListener('change', () => { currentSlug = sel.value; renderReport(); });

  document.querySelectorAll('.host-tab').forEach(tab => {
    tab.addEventListener('click', () => switchHostView(tab.dataset.view));
  });

  loadChecklistDefaults().then(() => switchHostView(startView));
}

function getLoc() { return RETIREMENT_EVEREST.locations[currentSlug]; }

/** When a venue points invites at a locked package page (guestSlug), use that for orders/reports */
function getReportLoc() {
  const loc = getLoc();
  if (loc?.guestSlug && RETIREMENT_EVEREST.locations[loc.guestSlug]) {
    return RETIREMENT_EVEREST.locations[loc.guestSlug];
  }
  return loc;
}

function getOrders() {
  const loc = getReportLoc();
  return JSON.parse(localStorage.getItem(loc.storageKey) || '[]');
}

/** Merge remote shared log into this browser so command center shows all guest submits */
async function refreshOrdersFromShared() {
  const loc = getReportLoc();
  if (!window.RESharedOrders?.loadOrdersForLocation) return getOrders();
  try {
    const merged = await RESharedOrders.loadOrdersForLocation(loc);
    return merged;
  } catch (e) {
    console.warn('[RE] refresh shared orders failed', e);
    return getOrders();
  }
}

function rankBars(counts) {
  const entries = Object.entries(counts).sort((a,b) => b[1]-a[1]);
  const max = entries[0]?.[1] || 1;
  return entries.map(([name, count]) => `
    <div class="rank-row"><div class="rank-name">${name}</div>
    <div class="rank-bar-wrap"><div class="rank-bar" style="width:${(count/max*100).toFixed(0)}%"></div></div>
    <div class="rank-count">${count}</div></div>`).join('');
}

function mealWeight(o, orders) {
  /* Each join-partner submission is 1 meal. Primary couple counts as 2 until
     their partner submits via “Partner already reserved”; then both are 1. */
  if (o.joinedPartner) return 1;
  if (o.partyType !== 'couple') return 1;
  const joined = (orders || []).some(j =>
    j.joinedPartner &&
    (
      (o.email && j.linkedPartnerEmail && o.email.toLowerCase() === j.linkedPartnerEmail.toLowerCase()) ||
      (o.name && j.linkedPartnerName && o.name.toLowerCase() === j.linkedPartnerName.toLowerCase()) ||
      (o.name && j.spouse && o.name.toLowerCase() === String(j.spouse).toLowerCase())
    )
  );
  return joined ? 1 : 2;
}

function renderBbqMenuPickReport(orders, loc) {
  const sideCounts = {}, entreeCounts = {}, dessertCounts = {};
  let adult = 0, soft = 0, guests = 0;
  orders.forEach(o => {
    const w = mealWeight(o, orders);
    guests += w;
    (o.sides || []).forEach(s => { sideCounts[s] = (sideCounts[s] || 0) + w; });
    if (o.entree) entreeCounts[o.entree] = (entreeCounts[o.entree] || 0) + w;
    if (o.dessert) dessertCounts[o.dessert] = (dessertCounts[o.dessert] || 0) + w;
    const cat = o.drinkCat || (o.drinkId === 'd-adult' ? 'Adult' : 'Soft');
    if (cat === 'Adult') adult += w;
    else soft += w;
  });
  const bevTotal = adult + soft || 1;
  const adultPct = Math.round((adult / bevTotal) * 100);
  const softPct = Math.round((soft / bevTotal) * 100);
  const buffetName = loc.menus?.buffetName || 'Backyard Barbecue Buffet';
  return `
    <div class="stats-row" style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px">
      <div class="card-box"><div class="stat-label">Preferences</div><div class="stat-val">${orders.length} <span style="font-size:0.75rem;color:var(--muted)">(${guests} guest${guests === 1 ? '' : 's'})</span></div></div>
      <div class="card-box"><div class="stat-label">Dinner package</div><div class="stat-val" style="font-size:0.95rem">${esc(buffetName)}</div></div>
      <div class="card-box"><div class="stat-label">Want adult drinks</div><div class="stat-val">${adult} <span style="font-size:0.75rem;color:var(--muted)">(${adultPct}%)</span></div></div>
      <div class="card-box"><div class="stat-label">No adult drink</div><div class="stat-val">${soft} <span style="font-size:0.75rem;color:var(--muted)">(${softPct}%)</span></div></div>
    </div>
    <div class="card-box" style="margin-bottom:16px">
      <h3>Adult drink interest</h3>
      <div style="display:flex;height:14px;border-radius:8px;overflow:hidden;background:var(--border);margin:8px 0 10px">
        <div style="width:${adultPct}%;background:var(--accent)" title="Want adult drink"></div>
        <div style="width:${softPct}%;background:color-mix(in srgb, var(--muted) 50%, var(--panel))" title="No adult drink"></div>
      </div>
      <p style="font-size:0.85rem;color:var(--muted);margin:0">
        <strong style="color:var(--text)">${adult}</strong> want adult drinks ·
        <strong style="color:var(--text)">${soft}</strong> fine without (coffee / tea / soda included).
        Use the adult count to decide whether to provide a bar package or have guests order from the bar.
      </p>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:16px">
      <div class="card-box"><h3>Sides &amp; salads (2 picks each)</h3>${rankBars(sideCounts) || '<p style="color:var(--muted);font-size:0.8rem">No votes yet.</p>'}</div>
      <div class="card-box"><h3>Entrées</h3>${rankBars(entreeCounts) || '<p style="color:var(--muted);font-size:0.8rem">No votes yet.</p>'}</div>
      <div class="card-box"><h3>Desserts</h3>${rankBars(dessertCounts) || '<p style="color:var(--muted);font-size:0.8rem">No votes yet.</p>'}</div>
    </div>
    <p style="color:var(--muted);font-size:0.85rem;margin-bottom:12px">Tallies are preference votes for planning quantities — full BBQ package still served for the group.</p>
    <div class="card-box" style="overflow:auto">
      <table class="data-table">
        <thead><tr><th>#</th><th>Name</th><th>Party</th><th>Seats</th><th>Sides (2)</th><th>Entrée</th><th>Dessert</th><th>Adult drink?</th><th>Notes</th><th>Time</th></tr></thead>
        <tbody>${orders.map((o, i) => {
          const cat = o.drinkCat || (o.drinkId === 'd-adult' ? 'Adult' : 'Soft');
          let party = 'Solo';
          if (o.joinedPartner) {
            party = `Joined · ${esc(o.linkedPartnerName || o.spouse || 'partner')}`;
          } else if (o.partyType === 'couple') {
            const partnerIn = (orders || []).some(j =>
              j.joinedPartner &&
              ((o.email && j.linkedPartnerEmail && o.email.toLowerCase() === j.linkedPartnerEmail.toLowerCase()) ||
               (o.name && j.linkedPartnerName && o.name.toLowerCase() === j.linkedPartnerName.toLowerCase()))
            );
            party = `Couple${o.spouse ? ` · ${esc(o.spouse)}` : ''}${partnerIn ? ' ✓ linked' : ' · awaiting partner form'}`;
          }
          const seatCol = o.seatLabel ? `<strong style="color:var(--accent)">${esc(o.seatLabel)}</strong>` : (o.seatAccommodation ? '<span style="color:var(--red,#e05252)">Needs arranging</span>' : '—');
          return `<tr><td>${i + 1}</td><td><strong>${esc(o.name)}</strong></td><td>${party}</td><td>${seatCol}</td><td>${esc((o.sides || []).join(' · ') || '—')}</td><td>${esc(o.entree || '—')}</td><td>${esc(o.dessert || '—')}</td><td>${esc(cat === 'Adult' ? 'Yes — adult drink' : 'No adult drink')}</td><td>${esc(o.notes || '—')}</td><td>${new Date(o.ts).toLocaleString()}</td></tr>`;
        }).join('')}</tbody>
      </table>
    </div>`;
}

function renderBuffetReport(orders, loc) {
  if (loc.bbqMenuPick) return renderBbqMenuPickReport(orders, loc);
  const buffetCounts = {}, starterCounts = {};
  let adult = 0, soft = 0;
  orders.forEach(o => {
    if (o.buffet) buffetCounts[o.buffet] = (buffetCounts[o.buffet] || 0) + 1;
    if (o.starter) starterCounts[o.starter] = (starterCounts[o.starter] || 0) + 1;
    const cat = o.drinkCat || (o.drinkId === 'd-adult' || /adult|alcohol|beer|wine|cocktail/i.test(o.drink || '') ? 'Adult' : 'Soft');
    if (cat === 'Adult') adult += 1;
    else soft += 1;
  });
  const topBuffet = Object.entries(buffetCounts).sort((a, b) => b[1] - a[1])[0];
  const topStarter = Object.entries(starterCounts).sort((a, b) => b[1] - a[1])[0];
  const bevTotal = adult + soft || 1;
  const adultPct = Math.round((adult / bevTotal) * 100);
  const softPct = Math.round((soft / bevTotal) * 100);
  return `
    <div class="stats-row" style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:16px">
      <div class="card-box"><div class="stat-label">Votes</div><div class="stat-val">${orders.length}</div></div>
      <div class="card-box"><div class="stat-label">Leading buffet</div><div class="stat-val" style="font-size:0.95rem">${topBuffet ? esc(topBuffet[0]) + ' (' + topBuffet[1] + ')' : '—'}</div></div>
      <div class="card-box"><div class="stat-label">Adult beverages</div><div class="stat-val">${adult} <span style="font-size:0.75rem;color:var(--muted)">(${adultPct}%)</span></div></div>
      <div class="card-box"><div class="stat-label">Coffee / tea / soda</div><div class="stat-val">${soft} <span style="font-size:0.75rem;color:var(--muted)">(${softPct}%)</span></div></div>
    </div>
    <div class="card-box" style="margin-bottom:16px">
      <h3>Beverage split</h3>
      <div style="display:flex;height:14px;border-radius:8px;overflow:hidden;background:var(--border);margin:8px 0 10px">
        <div style="width:${adultPct}%;background:var(--accent)" title="Adult"></div>
        <div style="width:${softPct}%;background:color-mix(in srgb, var(--muted) 50%, var(--panel))" title="Soft"></div>
      </div>
      <p style="font-size:0.85rem;color:var(--muted);margin:0">
        <strong style="color:var(--text)">${adult}</strong> adult ·
        <strong style="color:var(--text)">${soft}</strong> coffee / tea / soda
      </p>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
      <div class="card-box"><h3>Buffet popularity</h3>${rankBars(buffetCounts) || '<p style="color:var(--muted);font-size:0.8rem">No votes yet.</p>'}</div>
      <div class="card-box"><h3>Appetizer package votes</h3>${rankBars(starterCounts) || '<p style="color:var(--muted);font-size:0.8rem">No votes yet.</p>'}</div>
    </div>
    <p style="color:var(--muted);font-size:0.85rem;margin-bottom:12px">Leading starter: <strong>${topStarter ? esc(topStarter[0]) : '—'}</strong>. Lock winning buffet + apps with McMenamins sales.</p>
    <div class="card-box" style="overflow:auto">
      <table class="data-table">
        <thead><tr><th>#</th><th>Name</th><th>Buffet</th><th>Appetizers</th><th>Beverage bucket</th><th>Time</th></tr></thead>
        <tbody>${orders.map((o, i) => {
          const cat = o.drinkCat || (o.drinkId === 'd-adult' ? 'Adult' : 'Soft');
          return `<tr><td>${i + 1}</td><td><strong>${esc(o.name)}</strong></td><td>${esc(o.buffet || '—')}</td><td>${esc(o.starter || '—')}</td><td>${esc(cat === 'Adult' ? 'Adult beverage' : 'Coffee / tea / soda')}</td><td>${new Date(o.ts).toLocaleString()}</td></tr>`;
        }).join('')}</tbody>
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

/**
 * Push this browser's Kennedy prefs + seat blackouts into the shared jsonblobs
 * so the guest selection page shows the same reserved seats (prevents double-book).
 */
/**
 * Explicit host action only: push THIS browser's local prefs + seat claims
 * into the shared stores. Not called automatically on report load.
 */
async function publishHostStateToGuestMap(reportLoc, orders) {
  if (!reportLoc?.bbqMenuPick) return { orders: orders || [], seats: null };
  let mergedOrders = orders || [];
  try {
    if (window.RESharedOrders?.publishLocalOrdersForLocation) {
      mergedOrders = await RESharedOrders.publishLocalOrdersForLocation(reportLoc);
    }
  } catch (e) {
    console.warn('[RE] publish orders failed', e);
  }
  let st = null;
  try {
    if (window.RESeating?.fetchState) {
      // healRemote true ONLY here — intentional push of order-derived seats
      st = await RESeating.fetchState({ orders: mergedOrders, healRemote: true });
      if (st && RESeating.putState) {
        await RESeating.putState(st);
      }
    }
  } catch (e) {
    console.warn('[RE] publish seats failed', e);
  }
  return { orders: mergedOrders, seats: st };
}

async function renderReport() {
  const loc = getLoc();
  const reportLoc = getReportLoc();
  document.body.className = 'theme-hub';
  if (document.getElementById('hostTitle')) {
    document.getElementById('hostTitle').textContent = `${loc.shortName} · Report`;
  }
  const body = document.getElementById('report-body');
  body.innerHTML = `${renderShareBar(loc)}<div class="empty">Loading preferences (this browser + shared log)…</div>`;

  // Pull multi-device submissions. Do NOT auto-push this browser's old local
  // prefs/seats into an empty shared store — that re-ghosted clears across devices.
  let orders = await refreshOrdersFromShared();
  let liveSeats = null;
  let seatsOnline = false;
  if (reportLoc.bbqMenuPick && window.RESeating?.fetchState) {
    if (RESeating.clearLocalCache) RESeating.clearLocalCache();
    else {
      try {
        ['re_seats_cache_v1', 're_seats_cache_v2', 're_seats_cache_v3'].forEach((k) =>
          localStorage.removeItem(k)
        );
      } catch (_) {}
    }
    try {
      liveSeats = await RESeating.fetchState({ healRemote: false, orders: [], offlineOrders: false });
      seatsOnline = !liveSeats.offline;
    } catch (e) {
      console.warn('[RE] seat status', e);
    }
  }
  const seatClaimN = liveSeats ? Object.keys(liveSeats.seats || {}).length : 0;
  const share = renderShareBar(loc);
  const durable = !!(window.RESharedStore?.isConfigured?.());
  const syncBadge = reportLoc.bbqMenuPick
    ? seatsOnline
      ? `<span style="color:#6d6;font-weight:600">● Seats sync online</span> · <strong style="color:var(--text)">${seatClaimN}</strong> reserved · ${durable ? 'durable Google store' : '<span style="color:#e8a">jsonblob fallback (expires ~24h — set Shared store URL)</span>'}`
      : `<span style="color:#e88;font-weight:600">● Seats sync offline</span> — ${durable ? 'check Apps Script deploy' : 'configure durable shared store (Outreach)'}`
    : '';
  const syncNote = `<div class="card-box" style="margin-bottom:16px;font-size:0.85rem;color:var(--muted)">
    <strong style="color:var(--text)">Shared state</strong> ·
    Showing <strong style="color:var(--text)">${orders.length}</strong> preference submission(s) from the shared log (+ this browser).
    ${syncBadge ? `<div style="margin-top:8px">${syncBadge}</div>` : ''}
    ${!durable ? `<div style="margin-top:10px;padding:10px 12px;border-radius:8px;background:rgba(224,130,50,0.15);color:#f0c080;font-size:0.82rem"><strong>Action needed:</strong> Deploy the durable store (lasts through Aug 27). Open <a href="tools/setup-shared-store.html" style="color:var(--accent)">Shared store setup</a> → paste URL under Outreach. jsonblob is only a 24h emergency fallback.</div>` : ''}
    <div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:8px">
      <button type="button" class="btn-sm" id="btnRefreshShared">Refresh shared log</button>
      ${reportLoc.bbqMenuPick ? `<button type="button" class="btn-sm btn-accent" id="btnPublishSeats">Publish this browser → guest map</button>` : ''}
    </div>
    <p style="margin:10px 0 0;font-size:0.78rem">Guest submits write to the shared log automatically. Use <strong>Publish</strong> only if you need to push test data from this browser up.</p>
  </div>`;

  if (!orders.length) {
    body.innerHTML = `${share}${syncNote}<div class="empty">No preferences yet for ${esc(loc.shortName)}. Use <strong>Email / text guest link</strong>, then hit <strong>Refresh shared log</strong> after guests submit.</div>`;
  } else {
    body.innerHTML = share + syncNote + (reportLoc.type === 'screening' ? renderScreeningReport(orders, reportLoc)
      : reportLoc.type === 'preorder' ? renderPreorderReport(orders, reportLoc)
      : reportLoc.type === 'buffet' ? renderBuffetReport(orders, reportLoc)
      : renderRetreatReport(orders, reportLoc));
  }
  body.querySelector('[data-copy-link]')?.addEventListener('click', e => {
    copyText(e.target.dataset.copyLink).then(() => alert('Link copied!'));
  });
  body.querySelector('#btnRefreshShared')?.addEventListener('click', () => {
    if (window.RESharedStore?.memInvalidate) RESharedStore.memInvalidate();
    if (window.RESeating?.clearLocalCache) RESeating.clearLocalCache();
    renderReport();
  });
  body.querySelector('#btnPublishSeats')?.addEventListener('click', async () => {
    const btn = body.querySelector('#btnPublishSeats');
    if (btn) { btn.disabled = true; btn.textContent = 'Publishing…'; }
    try {
      const pub = await publishHostStateToGuestMap(reportLoc, orders);
      const n = Object.keys(pub.seats?.seats || {}).length;
      alert(`Published to guest map.\n\nPreferences: ${pub.orders?.length || 0}\nSeats blacked out: ${n}\n\nHard-refresh the guest page (Cmd+Shift+R) to confirm.`);
    } catch (e) {
      alert('Publish failed: ' + e);
    }
    renderReport();
  });
  if (reportLoc.bbqMenuPick && window.RESeating) {
    const seatDiv = document.createElement('div');
    seatDiv.id = 'seating-panel';
    seatDiv.innerHTML = '<div class="empty">Loading live seating chart…</div>';
    body.appendChild(seatDiv);
    loadSeatingPanel(reportLoc, orders);
  }
}

/* ================= Seating chart + couple linking (Kennedy BBQ) ================= */

let seatLinkPicks = [];

async function loadSeatingPanel(loc, orders, opts = {}) {
  const panel = document.getElementById('seating-panel');
  if (!panel || !window.RESeating) return;
  if (RESeating.clearLocalCache) RESeating.clearLocalCache();
  // Live seats map is authoritative when online. Prefer orders already loaded
  // by renderReport (avoids a second slow Apps Script round-trip).
  let orderList = orders || getOrders();
  if (!opts.skipSharedReload && !orders) {
    try {
      if (window.RESharedOrders?.loadOrdersForLocation) {
        orderList = await RESharedOrders.loadOrdersForLocation(loc);
      }
    } catch (_) {}
  }
  let st;
  try {
    st = await RESeating.fetchState({
      orders: orderList,
      healRemote: false,
      offlineOrders: false
    });
  } catch (e) {
    st = RESeating.emptyState ? RESeating.emptyState() : { seats: {}, couples: [], accommodations: [] };
    st.offline = true;
  }
  const claims = Object.values(st.seats || {}).sort((a, b) => String(a.seatId).localeCompare(String(b.seatId)));
  const seatsTaken = claims.length;
  const totalSeats = RESeating.allSeats().length;
  const offlineBanner = st.offline
    ? `<div class="empty" style="margin-bottom:10px">Live seat sync offline — showing local chart. <button class="btn-sm" id="btnRetrySeats">Retry sync</button></div>`
    : '';

  const rows = claims.map(c => `
    <tr>
      <td style="font-weight:700;color:var(--accent)">${esc(c.seatId)}</td>
      <td>${esc(c.person || c.name)}</td>
      <td>${esc(c.partyType === 'couple' ? `Couple${c.spouse ? ` · ${c.spouse}` : ''}` : 'Solo')}</td>
      <td style="font-size:0.78rem;color:var(--muted)">${esc([c.email, c.phone].filter(Boolean).join(' · '))}</td>
      <td><button class="btn-sm" data-release-seat="${esc(c.seatId)}">Release</button></td>
    </tr>`).join('');

  const accom = (st.accommodations || []).map(a => `
    <div class="card-box" style="margin-bottom:8px;font-size:0.85rem">
      <strong>${esc(a.name)}</strong> · ${esc(a.partyType === 'couple' ? `Couple${a.spouse ? ` (with ${a.spouse})` : ''}` : 'Solo')}
      <span style="color:var(--muted)">· ${esc([a.email, a.phone].filter(Boolean).join(' · '))}</span>
      <div style="color:var(--muted);font-size:0.75rem">Asked for help ${a.ts ? new Date(a.ts).toLocaleString() : ''} — reach out to arrange seats.</div>
    </div>`).join('');

  /* Contacts for couple linking: seat claims + preference submissions, deduped */
  const contactMap = new Map();
  const addContact = (name, email, phone) => {
    const key = (email || '').toLowerCase() || phone || name;
    if (name && key && !contactMap.has(key)) contactMap.set(key, { name, email: email || '', phone: phone || '' });
  };
  (orders || getOrders()).forEach(o => addContact(o.name, o.email, o.phone));
  claims.forEach(c => addContact(c.name, c.email, c.phone));
  const contacts = [...contactMap.values()].sort((a, b) => a.name.localeCompare(b.name));

  const linked = (st.couples || []).map(cp => {
    const pending = cp.pendingPartner && !(cp.b?.email || cp.b?.phone);
    const src = cp.source === 'guest-join' ? 'guest joined'
      : cp.source === 'guest-reserve' ? (pending ? 'awaiting partner form' : 'reserved together')
      : (cp.source || 'host');
    return `
    <div class="card-box" style="margin-bottom:8px;font-size:0.85rem">
      💑 <strong>${esc(cp.a?.name)}</strong> ♥ <strong>${esc(cp.b?.name || 'Partner')}</strong>
      ${pending ? '<span style="color:var(--accent);font-size:0.75rem"> · partner form pending</span>' : ''}
      <span style="color:var(--muted);font-size:0.75rem">· ${esc(src)}${cp.ts ? ` · ${new Date(cp.ts).toLocaleDateString()}` : ''}</span>
      ${cp.seats?.length ? `<div style="color:var(--accent);font-size:0.75rem;margin-top:2px">${esc(Array.isArray(cp.seats) ? RESeating.seatLabel(cp.seats) : cp.seats)}</div>` : ''}
      ${(cp.a?.email || cp.b?.email) ? `<div style="color:var(--muted);font-size:0.72rem">${esc([cp.a?.email, cp.b?.email].filter(Boolean).join(' · '))}</div>` : ''}
    </div>`;
  }).join('');

  const contactChips = contacts.map((c, i) => {
    const on = seatLinkPicks.includes(i);
    return `<button type="button" class="btn-sm" data-link-pick="${i}"
      style="margin:0 6px 6px 0;${on ? 'background:var(--accent);color:#141414;font-weight:700' : ''}">${esc(c.name)}</button>`;
  }).join('');

  panel.innerHTML = `
    <div class="section-gap"></div>
    <h3 style="font-family:var(--heading-font);color:var(--accent);margin-bottom:4px">Seating Chart — Jordan Room</h3>
    <div style="color:var(--muted);font-size:0.85rem;margin-bottom:10px">
      Arch layout facing the screen · five 60″ rounds as 6-tops (2 screen-side chairs removed) ·
      <strong style="color:var(--text)">${seatsTaken}/${totalSeats}</strong> seats reserved
      <button class="btn-sm" style="margin-left:8px" id="btnRefreshSeats">↻ Refresh</button>
    </div>
    ${offlineBanner}
    <div class="card-box" style="padding:10px;min-height:280px">${RESeating.renderMapSVG(st, { mode: 'host' })}${RESeating.legendHTML('host')}</div>
    ${claims.length ? `
      <div class="section-gap"></div>
      <h4 style="color:var(--text);margin-bottom:8px">Reserved seats</h4>
      <div class="card-box" style="overflow-x:auto"><table class="data-table" style="width:100%;font-size:0.85rem">
        <thead><tr><th>Seat</th><th>Guest</th><th>Party</th><th>Contact</th><th></th></tr></thead>
        <tbody>${rows}</tbody></table></div>` : ''}
    ${accom ? `<div class="section-gap"></div>
      <h4 style="color:var(--red,#e05252);margin-bottom:8px">⚠ Seating help requested</h4>${accom}` : ''}
    <div class="section-gap"></div>
    <h4 style="color:var(--text);margin-bottom:4px">Couples</h4>
    <p style="color:var(--muted);font-size:0.8rem;margin-bottom:10px">
      Couples link automatically when someone reserves for a spouse, or when the spouse submits via
      <strong>Partner already reserved</strong> on the guest form (GHL events <code>couple_reserved</code> /
      <code>couple_linked</code>). You can also tap two names below and <strong>Link as couple</strong> manually.
    </p>
    ${linked}
    <div class="card-box" style="padding:12px">
      <div style="margin-bottom:8px">${contactChips || '<span style="color:var(--muted);font-size:0.85rem">No contacts yet — they appear as guests submit preferences or reserve seats.</span>'}</div>
      <button class="btn-sm btn-accent" id="btnLinkCouple" ${seatLinkPicks.length === 2 ? '' : 'disabled'}>♥ Link as couple${seatLinkPicks.length === 2 ? `: ${esc(contacts[seatLinkPicks[0]].name)} + ${esc(contacts[seatLinkPicks[1]].name)}` : ' (pick two names)'}</button>
    </div>`;

  panel.querySelector('#btnRefreshSeats')?.addEventListener('click', () => {
    if (window.RESharedStore?.memInvalidate) RESharedStore.memInvalidate();
    if (window.RESeating?.clearLocalCache) RESeating.clearLocalCache();
    loadSeatingPanel(loc, null);
  });
  panel.querySelector('#btnRetrySeats')?.addEventListener('click', () => {
    if (window.RESharedStore?.memInvalidate) RESharedStore.memInvalidate();
    loadSeatingPanel(loc, null);
  });
  panel.querySelectorAll('[data-release-seat]').forEach(btn => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.releaseSeat;
      if (!confirm(`Release seat ${id}? It becomes open for guests to pick again.`)) return;
      btn.disabled = true; btn.textContent = '…';
      try {
        // Strip seat from preference logs first so fetchState cannot re-heal it
        if (window.RESharedStore?.memInvalidate) RESharedStore.memInvalidate();
        if (window.RESharedOrders?.stripSeatsFromOrders) {
          await RESharedOrders.stripSeatsFromOrders(loc, [id]);
        } else {
          // Local-only fallback
          const key = loc.storageKey;
          try {
            const list = JSON.parse(localStorage.getItem(key) || '[]').map((o) => {
              if (!o || !Array.isArray(o.seats)) return o;
              if (!o.seats.map(String).includes(id)) return o;
              const seats = o.seats.map(String).filter((s) => s !== id);
              const next = { ...o, seats };
              if (!seats.length) {
                delete next.seats;
                delete next.seatLabel;
              }
              return next;
            });
            localStorage.setItem(key, JSON.stringify(list));
          } catch (_) {}
        }
        await RESeating.releaseSeats([id]);
      } catch (e) {
        alert('Release failed: ' + e);
      }
      // Reload with stripped local orders; don't re-pull remote mid-release
      let fresh = [];
      try {
        fresh = JSON.parse(localStorage.getItem(loc.storageKey) || '[]');
      } catch (_) {
        fresh = [];
      }
      loadSeatingPanel(loc, fresh, { skipSharedReload: true, healRemote: false });
    });
  });
  panel.querySelectorAll('[data-link-pick]').forEach(btn => {
    btn.addEventListener('click', () => {
      const i = parseInt(btn.dataset.linkPick, 10);
      if (seatLinkPicks.includes(i)) seatLinkPicks = seatLinkPicks.filter(x => x !== i);
      else seatLinkPicks = [...seatLinkPicks, i].slice(-2);
      loadSeatingPanel(loc, orders);
    });
  });
  panel.querySelector('#btnLinkCouple')?.addEventListener('click', async () => {
    if (seatLinkPicks.length !== 2) return;
    const a = contacts[seatLinkPicks[0]], b = contacts[seatLinkPicks[1]];
    const btn = panel.querySelector('#btnLinkCouple');
    btn.disabled = true; btn.textContent = 'Linking…';
    try {
      await RESeating.addCoupleLink(a, b, { source: 'host' });
      await RESeating.pushSeatEventToGHL({
        event: 'couple_linked',
        form: 'couple-link',
        name: a.name, email: a.email, phone: a.phone,
        partnerName: b.name, partnerEmail: b.email, partnerPhone: b.phone,
        preferencesSummary: `COUPLE LINKED (host)\n${a.name} (${a.email || a.phone})\n♥\n${b.name} (${b.email || b.phone})\nCreate/label partner-spouse records.`
      });
    } catch (e) { alert('Link failed: ' + e); }
    seatLinkPicks = [];
    loadSeatingPanel(loc, orders);
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

/**
 * Snapshot current prefs + seat layout as downloadable CSV/JSON before wipe.
 */
function downloadLayoutBackup(loc, reportLoc, orders, seatState) {
  const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, (c) => (c === 'T' ? '_' : '-'));
  const base = `${reportLoc.slug || loc.slug}_layout_${stamp}`;

  // Prefs / guest layout CSV (full export when helpers exist)
  try {
    const rows =
      typeof buildExportRows === 'function'
        ? buildExportRows(reportLoc, orders || [], 'orders')
        : [['Name', 'Email', 'Phone', 'Seats', 'Notes', 'Time']].concat(
            (orders || []).map((o) => [
              o.name,
              o.email,
              o.phone,
              o.seatLabel || (Array.isArray(o.seats) ? o.seats.join(' ') : ''),
              o.notes || '',
              o.ts || ''
            ])
          );
    // Enrich with seat / contact columns for BBQ
    if (reportLoc.bbqMenuPick && rows.length) {
      const header = rows[0].slice();
      if (!header.includes('Email')) header.push('Email', 'Phone', 'Seats', 'Party', 'Spouse');
      const enriched = [header];
      (orders || []).forEach((o, i) => {
        const row = (rows[i + 1] || []).slice();
        while (row.length < header.length - 5) row.push('');
        if (!rows[0].includes('Email')) {
          row.push(
            o.email || '',
            o.phone || '',
            o.seatLabel || (Array.isArray(o.seats) ? o.seats.join(' ') : ''),
            o.partyType || '',
            o.spouse || ''
          );
        }
        enriched.push(row);
      });
      if (typeof downloadText === 'function' && typeof rowsToCSV === 'function') {
        downloadText(`${base}_prefs.csv`, rowsToCSV(enriched.length > 1 ? enriched : rows), 'text/csv;charset=utf-8');
      }
    } else if (typeof downloadText === 'function' && typeof rowsToCSV === 'function') {
      downloadText(`${base}_prefs.csv`, rowsToCSV(rows), 'text/csv;charset=utf-8');
    }
  } catch (e) {
    console.warn('[RE] layout prefs export failed', e);
  }

  // Seat map + couples JSON
  try {
    const payload = {
      exportedAt: new Date().toISOString(),
      location: reportLoc.slug || loc.slug,
      locationName: loc.shortName,
      preferences: orders || [],
      seats: seatState?.seats || {},
      couples: seatState?.couples || [],
      accommodations: seatState?.accommodations || []
    };
    if (typeof downloadText === 'function') {
      downloadText(
        `${base}_full.json`,
        JSON.stringify(payload, null, 2),
        'application/json;charset=utf-8'
      );
    }
  } catch (e) {
    console.warn('[RE] layout JSON export failed', e);
  }
}

async function clearAll() {
  const loc = getLoc();
  const reportLoc = getReportLoc();
  if (!confirm(`Delete all ${loc.shortName} preferences / reservations?\n\nThis clears the shared preference log and (for BBQ) all reserved seats.`)) {
    return;
  }

  // Offer backup of current layout before wipe
  let orders = [];
  try {
    orders = await refreshOrdersFromShared();
  } catch (_) {
    try {
      orders = JSON.parse(localStorage.getItem(reportLoc.storageKey) || '[]');
    } catch (__) {
      orders = [];
    }
  }
  let seatState = null;
  if (reportLoc.bbqMenuPick && window.RESeating?.fetchState) {
    try {
      seatState = await RESeating.fetchState({ orders, healRemote: false });
    } catch (_) {
      seatState = null;
    }
  }

  const hasAnything =
    (orders && orders.length) ||
    (seatState && Object.keys(seatState.seats || {}).length);
  if (hasAnything && confirm('Download a copy of the current layout before clearing?\n\n(CSV of preferences + JSON with seats/couples)')) {
    downloadLayoutBackup(loc, reportLoc, orders, seatState);
  }

  const body = document.getElementById('report-body');
  if (body) body.innerHTML = `<div class="empty">Clearing ${esc(loc.shortName)}…</div>`;

  const errors = [];

  // 1) Local storage (parent + report package keys)
  try {
    localStorage.removeItem(reportLoc.storageKey);
    if (reportLoc.storageKey !== loc.storageKey) localStorage.removeItem(loc.storageKey);
    // BBQ legacy keys
    if (reportLoc.bbqMenuPick || loc.slug === 'kennedy-school') {
      ['kennedyschool_bbq_prefs_v3', 'kennedyschool_bbq_prefs_v2', 'kennedyschool_bbq_prefs_v1'].forEach((k) => {
        try { localStorage.removeItem(k); } catch (_) {}
      });
    }
  } catch (e) {
    errors.push('local prefs: ' + e);
  }

  // 2) Shared multi-device preference log
  try {
    if (window.RESharedOrders?.clearOrdersForLocation) {
      await RESharedOrders.clearOrdersForLocation(reportLoc);
      if (loc.storageKey !== reportLoc.storageKey) {
        await RESharedOrders.clearOrdersForLocation(loc);
      }
    }
  } catch (e) {
    errors.push('shared prefs: ' + e);
  }

  // 3) Live seats (Kennedy BBQ) — full wipe so nothing re-heals
  if (reportLoc.bbqMenuPick || loc.slug === 'kennedy-school') {
    try {
      if (window.RESeating?.clearAllSeats) {
        await RESeating.clearAllSeats();
      } else if (window.RESeating?.putState) {
        RESeating.clearLocalCache?.();
        await RESeating.putState(RESeating.emptyState());
      }
    } catch (e) {
      errors.push('seats: ' + e);
    }
  }

  if (errors.length) {
    alert('Cleared with some errors:\n\n' + errors.join('\n') + '\n\nTry Refresh shared log / hard-refresh if seats reappear.');
  } else {
    alert(`Cleared ${loc.shortName}.\n\nPreferences + reserved seats are empty. Hard-refresh guest form (Cmd+Shift+R) if needed.`);
  }
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
  if (RETIREMENT_EVEREST.locations[inviteModalSlug]?.guestOnly) {
    inviteModalSlug = 'kennedy-school';
  }
  const loc = RETIREMENT_EVEREST.locations[inviteModalSlug];
  const ev = getLocationEvent(inviteModalSlug);
  const link = absoluteGuestLink(inviteModalSlug);
  document.getElementById('inviteModalSub').textContent =
    `${loc.shortName} · ${loc.city}${ev?.eventDate ? ' · ' + formatEventDate(ev.eventDate) : ''}`;
  const linkEl = document.getElementById('invGuestLink');
  if (linkEl) {
    linkEl.textContent = link;
    linkEl.href = link;
  }
  document.getElementById('invFirst').value = '';
  document.getElementById('invLast').value = '';
  document.getElementById('invEmail').value = '';
  document.getElementById('invPhone').value = '';
  document.getElementById('invMessage').value = buildInviteMessage(loc, link, ev, '');
  const smsEl = document.getElementById('invSmsPreview');
  if (smsEl) smsEl.value = buildInviteSms(loc, link, ev, '');
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
  const link = absoluteGuestLink(inviteModalSlug);
  const ev = getLocationEvent(inviteModalSlug);
  document.getElementById('invMessage').value = buildInviteMessage(loc, link, ev, name);
  const smsEl = document.getElementById('invSmsPreview');
  if (smsEl) smsEl.value = buildInviteSms(loc, link, ev, name);
}

function buildInviteRecord() {
  const loc = RETIREMENT_EVEREST.locations[inviteModalSlug];
  const first = document.getElementById('invFirst').value.trim();
  const last = document.getElementById('invLast').value.trim();
  const email = document.getElementById('invEmail').value.trim();
  const phone = document.getElementById('invPhone').value.trim();
  const message = document.getElementById('invMessage').value;
  const sms = document.getElementById('invSmsPreview')?.value || message;
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
    sms,
    ts: new Date().toISOString(),
    status: 'queued'
  };
}

function sendInviteEmail() {
  const inv = buildInviteRecord();
  if (!inv.email) return alert('Enter their email address, then click Email them.');
  const subject = encodeURIComponent(`You're invited — Retirement Everest at ${inv.locationName}`);
  const body = encodeURIComponent(inv.message);
  window.location.href = `mailto:${inv.email}?subject=${subject}&body=${body}`;
  saveInvite({ ...inv, status: 'email-opened' });
  if (window.REContacts?.recordInviteAsContact) REContacts.recordInviteAsContact({ ...inv, status: 'email-opened' });
}

function sendInviteSMS() {
  const inv = buildInviteRecord();
  if (!inv.phone) return alert('Enter their phone number, then click Text them.');
  const digits = inv.phone.replace(/\D/g, '');
  const smsBody = encodeURIComponent(inv.sms || inv.message);
  window.location.href = `sms:${digits}?&body=${smsBody}`;
  saveInvite({ ...inv, status: 'sms-opened' });
  if (window.REContacts?.recordInviteAsContact) REContacts.recordInviteAsContact({ ...inv, status: 'sms-opened' });
}

function copyGuestLinkOnly() {
  const link = absoluteGuestLink(inviteModalSlug);
  copyText(link).then(() => alert('Guest link copied.\n\n' + link));
}

function copyInvite() {
  const inv = buildInviteRecord();
  copyText(inv.message).then(() => alert('Full invite message copied — paste into email or text.'));
  saveInvite({ ...inv, status: 'copied' });
  if (window.REContacts?.recordInviteAsContact) REContacts.recordInviteAsContact({ ...inv, status: 'copied' });
}

async function queueInvite() {
  const inv = buildInviteRecord();
  if (!inv.firstName && !inv.email && !inv.phone) return alert('Enter at least a name, email, or phone.');
  saveInvite(inv);
  if (window.REContacts?.recordInviteAsContact) REContacts.recordInviteAsContact(inv);
  try {
    await pushToGHL(inv);
    alert('Saved to queue and sent to HAG GHL webhook.\n\nFor a simple send, use Email them or Text them — opens Mail / Messages with the BBQ link ready.');
  } catch {
    alert('Saved to invite queue. GHL webhook failed or not mapped yet — use Email them or Text them to send now.');
  }
  if (document.getElementById('view-outreach').classList.contains('active')) renderOutreach();
  if (document.getElementById('view-contacts')?.classList.contains('active')) renderContacts();
  closeInviteModal();
}

function renderOutreach() {
  const cfg = getIntegrations();
  const queue = getInviteQueue();
  const locs = (typeof getPlannerLocations === 'function') ? getPlannerLocations() : getAllLocations();

  const locCards = locs.map(loc => {
    const link = absoluteGuestLink(loc.slug);
    const ev = getLocationEvent(loc.slug);
    return `<div class="card-box">
      <h3>${esc(loc.shortName)}${loc.guestSlug ? ' · BBQ' : ''}</h3>
      <p style="font-size:0.8rem;color:var(--muted);margin-bottom:12px">${esc(loc.name)} · ${esc(loc.city)}</p>
      <div class="status-row"><span>Event date</span><strong>${ev?.eventDate ? formatEventDate(ev.eventDate) : 'Not set'}</strong></div>
      <div class="status-row"><span>Preferences</span><strong>${getOrdersForLocation(loc).length}</strong></div>
      <code style="display:block;font-size:0.7rem;margin:12px 0;word-break:break-all">${esc(link)}</code>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:12px">
        <button type="button" class="btn-sm btn-accent" onclick="openInviteModal('${loc.slug}')">Email / text link</button>
        <a class="btn-sm" href="marketing-kit.html?location=${loc.slug}" style="text-decoration:none">Marketing creatives</a>
        <a class="btn-sm" href="${link}" target="_blank" style="text-decoration:none">Open guest page ↗</a>
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
        <p class="integration-note">Primary send is <strong>Email them / Text them</strong> (opens your Mail &amp; Messages apps). HAG GHL webhook is optional for automation — location <code>24UgqDfh5TcJs5IPnA25</code>.</p>
        <div class="planner-form" style="margin-top:16px">
          <label class="planner-field full"><span>Durable shared store URL (seats + prefs across phones)</span>
            <input type="url" id="intSharedStore" value="${esc(cfg.sharedStoreUrl || '')}" placeholder="https://script.google.com/macros/s/.../exec"></label>
          <p class="integration-note" style="margin-top:0">Required for multi-device seating. Deploy <code>tools/re-shared-store.gs</code> as a Google Apps Script web app (Anyone). See setup steps below the save button.</p>
          <label class="planner-field full"><span>HAG GHL inbound webhook URL</span>
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
          <button type="button" class="btn-sm btn-accent" id="testSharedStoreBtn">Test shared store</button>
          <a class="btn-sm" href="tools/setup-shared-store.html" target="_blank" style="text-decoration:none">Shared store setup ↗</a>
          <a class="btn-sm" href="docs/INTEGRATIONS.md" target="_blank" style="text-decoration:none">Integrations guide ↗</a>
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
      sharedStoreUrl: document.getElementById('intSharedStore').value.trim(),
      ghlWebhookUrl: document.getElementById('intGhl').value.trim(),
      googleSheetsWebhookUrl: document.getElementById('intSheets').value.trim(),
      googleSheetId: document.getElementById('intSheetId').value.trim(),
      defaultSheetTab: document.getElementById('intSheetTab').value.trim() || 'Orders',
      organizerName: document.getElementById('intOrgName').value.trim(),
      organizerEmail: document.getElementById('intOrgEmail').value.trim()
    });
    // Mirror into runtime so guest tabs opened later on this browser pick it up immediately
    if (typeof RETIREMENT_EVEREST !== 'undefined') {
      RETIREMENT_EVEREST.sharedStoreUrl = document.getElementById('intSharedStore').value.trim();
    }
    alert('Integrations saved.' + (document.getElementById('intSharedStore').value.trim()
      ? '\n\nShared store URL is set — hard-refresh guest form on each device once after deploy.'
      : '\n\nWARNING: No shared store URL — seats still use short-lived jsonblob.'));
  });
  document.getElementById('testSharedStoreBtn')?.addEventListener('click', async () => {
    const url = document.getElementById('intSharedStore').value.trim();
    if (url) {
      saveIntegrations({ sharedStoreUrl: url });
      if (typeof RETIREMENT_EVEREST !== 'undefined') RETIREMENT_EVEREST.sharedStoreUrl = url;
    }
    if (!window.RESharedStore?.health) {
      return alert('shared-store.js not loaded — hard-refresh command center.');
    }
    const h = await RESharedStore.health();
    if (h.ok) {
      alert('Shared store OK (durable).\n\n' + JSON.stringify(h.raw || h, null, 2));
    } else {
      alert('Shared store NOT ready.\n\n' + (h.error || 'unknown') + '\n\nOpen Shared store setup and deploy tools/re-shared-store.gs as a Web app (Anyone).');
    }
  });
}