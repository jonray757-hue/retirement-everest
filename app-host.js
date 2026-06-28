let currentSlug = 'edgefield';
let roomRates = getRoomRates();

function unlock() {
  const pw = document.getElementById('pwInput').value;
  if (pw === RETIREMENT_EVEREST.hostPassword) {
    document.getElementById('lock-screen').style.display = 'none';
    document.getElementById('report').style.display = 'block';
    initHost();
  } else {
    document.getElementById('lockErr').style.display = 'block';
    document.getElementById('pwInput').value = '';
  }
}

function initHost() {
  const sel = document.getElementById('locSelect');
  const typeLabels = { retreat: 'Retreat', screening: 'Screening', preorder: 'Preorder' };
  sel.innerHTML = Object.values(RETIREMENT_EVEREST.locations).map(l =>
    `<option value="${l.slug}">${l.shortName} — ${typeLabels[l.type] || 'Event'}</option>`
  ).join('');
  const p = new URLSearchParams(location.search);
  const startView = p.get('view') || 'overview';
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
  const enriched = orders.map(o => ({ ...o, entreePrice: prices[o.entreeId] || o.entreePrice || 66 }));
  const total = enriched.reduce((s,o) => s + o.entreePrice, 0);
  const saladCounts = {}, entreeCounts = {}, dessertCounts = {};
  enriched.forEach(o => {
    saladCounts[o.salad] = (saladCounts[o.salad] || 0) + 1;
    entreeCounts[o.entree] = (entreeCounts[o.entree] || 0) + 1;
    dessertCounts[o.dessert] = (dessertCounts[o.dessert] || 0) + 1;
  });
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
    <div class="card-box"><h3>Entrée selections</h3>${rankBars(entreeCounts)}</div>
    <div class="card-box">
      <h3>All orders (${enriched.length})</h3>
      <div style="overflow-x:auto;margin-top:12px"><table>
        <thead><tr><th>#</th><th>Guest</th><th>Salad</th><th>Entrée</th><th>Dessert</th><th>Cost</th><th>Time</th></tr></thead>
        <tbody>${enriched.map((o,i) => `<tr><td>${i+1}</td><td><strong>${o.name}</strong></td><td>${o.salad}</td><td>${o.entree}</td><td>${o.dessert}</td><td>${fmt(o.entreePrice)}</td><td>${new Date(o.ts).toLocaleString()}</td></tr>`).join('')}</tbody>
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

function renderReport() {
  const loc = getLoc();
  document.body.className = 'theme-hub';
  if (document.getElementById('hostTitle')) {
    document.getElementById('hostTitle').textContent = `${loc.shortName} · Report`;
  }
  const orders = getOrders();
  const body = document.getElementById('report-body');
  if (!orders.length) {
    body.innerHTML = `<div class="empty">No reservations yet for ${loc.shortName}. Share: <code>guest.html?location=${loc.slug}</code></div>`;
    return;
  }
  body.innerHTML = loc.type === 'screening' ? renderScreeningReport(orders, loc)
    : loc.type === 'preorder' ? renderPreorderReport(orders, loc)
    : renderRetreatReport(orders, loc);
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

function exportCSV() {
  const loc = getLoc();
  const orders = getOrders();
  if (!orders.length) return alert('No data to export.');
  let rows;
  if (loc.type === 'screening') {
    rows = [['#','Name','Salad','Entrée','Dessert','Price','Time'], ...orders.map((o,i) => [i+1,o.name,o.salad,o.entree,o.dessert,o.entreePrice||'',new Date(o.ts).toLocaleString()])];
  } else if (loc.type === 'preorder') {
    rows = [['#','Name','Arrival Bite','Bite Price','Main','Main Price','Drink','Drink Price','Subtotal','Time'],
      ...orders.map((o,i) => [i+1,o.name,o.starter||'—',o.starterPrice||0,o.main,o.mainPrice||0,o.drink,o.drinkPrice||0,
        (o.starterPrice||0)+(o.mainPrice||0)+(o.drinkPrice||0),new Date(o.ts).toLocaleString()])];
  } else {
    rows = [['#','Name','Room','Party','Person','Dinner','Starter','Drink','Price','Time']];
    orders.forEach((o,i) => {
      const people = o.people || [{ dinner: o.dinner, dinnerPrice: o.dinnerPrice }];
      people.forEach((p,pi) => rows.push([i+1,o.name,o.room,o.partySize||1,pi+1,p.dinner,p.starter||'',p.drink||'',p.dinnerPrice||'',new Date(o.ts).toLocaleString()]));
    });
  }
  const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  const a = document.createElement('a');
  a.href = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csv);
  a.download = `${loc.slug}_reservations.csv`;
  a.click();
}