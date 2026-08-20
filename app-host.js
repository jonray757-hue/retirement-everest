let currentSlug = (typeof getActiveEventSlug === 'function' ? getActiveEventSlug() : null) || 'kennedy-school';
let roomRates = getRoomRates();

function fillLocationSelect() {
  const sel = document.getElementById('locSelect');
  if (!sel) return;
  const typeLabels = { retreat: 'Retreat', screening: 'Screening', preorder: 'Preorder', buffet: 'Buffet' };
  // Always list ALL planner venues in the dropdown so you can switch events.
  // Focus mode only trims Overview cards — it must not hide this select.
  const plannerLocs =
    typeof getAllPlannerLocations === 'function'
      ? getAllPlannerLocations()
      : typeof getPlannerLocations === 'function'
        ? getPlannerLocations()
        : Object.values(RETIREMENT_EVEREST.locations || {});
  const activeSlug = typeof getActiveEventSlug === 'function' ? getActiveEventSlug() : 'kennedy-school';
  sel.innerHTML = plannerLocs
    .map((l) => {
      const typeTag = l.guestSlug ? 'BBQ · live' : typeLabels[l.type] || 'Event';
      const star = l.active || l.slug === activeSlug ? '★ ' : '';
      return `<option value="${l.slug}">${star}${l.shortName} — ${typeTag}</option>`;
    })
    .join('');
  if (![...sel.options].some((o) => o.value === currentSlug)) {
    currentSlug = activeSlug || plannerLocs[0]?.slug || currentSlug;
  }
  sel.value = currentSlug;
  sel.style.display = '';

  const topbar = document.getElementById('loc-topbar');
  if (topbar) {
    topbar.style.display = 'flex';
    // Small live-event chip next to the dropdown (dropdown stays usable)
    let badge = document.getElementById('activeEventBadge');
    const live = RETIREMENT_EVEREST.locations[activeSlug];
    const ev = typeof getLocationEvent === 'function' ? getLocationEvent(activeSlug) : null;
    const dateBit = ev?.eventDate
      ? ` · ${typeof formatEventDate === 'function' ? formatEventDate(ev.eventDate) : ev.eventDate}`
      : '';
    if (!badge) {
      badge = document.createElement('div');
      badge.id = 'activeEventBadge';
      badge.style.cssText =
        'font-size:0.78rem;font-weight:600;color:var(--accent);padding:4px 8px;border:1px solid color-mix(in srgb,var(--accent) 35%,transparent);border-radius:8px;background:color-mix(in srgb,var(--accent) 10%,transparent);white-space:nowrap';
      topbar.appendChild(badge);
    }
    badge.style.display = 'block';
    badge.textContent = `Live: ${live?.shortName || activeSlug}${live?.guestSlug ? ' BBQ' : ''}${dateBit}`;
  }
  plannerLocs.forEach((l) => {
    if (roomRates[l.slug] == null && l.avgRoomRate) roomRates[l.slug] = l.avgRoomRate;
  });
}

function initHost() {
  // Restore scheduled events (localStorage) + seed Kennedy School Aug 27 if missing
  if (typeof ensureEventDefaults === 'function') ensureEventDefaults();

  const p = new URLSearchParams(location.search);
  // Default to Location Report for the live event (not a multi-venue overview hunt)
  const startView = ['overview', 'venues', 'location', 'waitlist', 'gym', 'planner', 'contacts', 'outreach'].includes(
    p.get('view')
  )
    ? p.get('view')
    : 'location';
  currentSlug =
    p.get('location') ||
    (typeof getActiveEventSlug === 'function' ? getActiveEventSlug() : null) ||
    'kennedy-school';
  // If someone deep-linked to guest-only BBQ page, show parent Kennedy School
  if (RETIREMENT_EVEREST.locations[currentSlug]?.guestOnly) {
    currentSlug = 'kennedy-school';
  }

  fillLocationSelect();
  const sel = document.getElementById('locSelect');
  sel?.addEventListener('change', () => {
    currentSlug = sel.value;
    if (document.getElementById('view-location')?.classList.contains('active')) renderReport();
    else if (document.getElementById('view-planner')?.classList.contains('active')) {
      plannerSlug = currentSlug;
      renderPlanner();
    } else if (document.getElementById('view-outreach')?.classList.contains('active')) {
      renderOutreach();
    }
  });

  document.querySelectorAll('.host-tab').forEach((tab) => {
    tab.addEventListener('click', () => switchHostView(tab.dataset.view));
  });
  document.getElementById('navGuestFlyers')?.addEventListener('click', () => {
    switchHostView('outreach');
    requestAnimationFrame(() => document.getElementById('guest-flyers')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
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

/** Pull cloud preference log (source of truth) into this browser */
async function refreshOrdersFromShared(opts = {}) {
  const loc = getReportLoc();
  if (!window.RESharedOrders?.loadOrdersForLocation) {
    return opts.meta ? { orders: getOrders(), source: 'local-offline' } : getOrders();
  }
  try {
    const result = await RESharedOrders.loadOrdersForLocation(loc, { meta: true });
    if (result && Array.isArray(result.orders)) {
      if (result.source === 'remote' && result.localCount > result.orders.length) {
        console.info(
          `[RE] dropped ${result.localCount - result.orders.length} local-only ghost preference(s); cloud has ${result.remoteCount}`
        );
      }
      return opts.meta ? result : result.orders;
    }
    const list = Array.isArray(result) ? result : getOrders();
    return opts.meta ? { orders: list, source: 'remote' } : list;
  } catch (e) {
    console.warn('[RE] refresh shared orders failed', e);
    const list = getOrders();
    return opts.meta ? { orders: list, source: 'local-offline' } : list;
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

const REPORT_FOLD_KEY = 're_report_folds_v1';
const REPORT_FOLD_DEFAULTS = {
  'loc-share': false,
  'loc-kitchen': false,
  'loc-guests': false,
  'loc-seats': true,
  'loc-reserved': false,
  'loc-help': true,
  'loc-couples': false
};

function reportFoldState() {
  try {
    return { ...REPORT_FOLD_DEFAULTS, ...JSON.parse(localStorage.getItem(REPORT_FOLD_KEY) || '{}') };
  } catch (_) {
    return { ...REPORT_FOLD_DEFAULTS };
  }
}

function setReportFold(id, open) {
  const st = reportFoldState();
  st[id] = !!open;
  try {
    localStorage.setItem(REPORT_FOLD_KEY, JSON.stringify(st));
  } catch (_) {}
}

function reportFoldHTML(id, title, meta, inner, opts = {}) {
  const open = opts.forceOpen != null ? !!opts.forceOpen : !!reportFoldState()[id];
  const tone = opts.tone ? ` report-fold-${opts.tone}` : '';
  return `<details class="report-fold${tone}" data-report-fold="${esc(id)}"${open ? ' open' : ''}>
    <summary class="report-fold-head">
      <span class="report-fold-chevron" aria-hidden="true">▸</span>
      <span class="report-fold-title">${title}</span>
      ${meta ? `<span class="report-fold-meta">${meta}</span>` : ''}
    </summary>
    <div class="report-fold-body">${inner}</div>
  </details>`;
}

function wireReportFolds(root) {
  (root || document).querySelectorAll('details[data-report-fold]').forEach((el) => {
    el.addEventListener('toggle', () => setReportFold(el.dataset.reportFold, el.open));
  });
}

function setAllReportFolds(root, open) {
  (root || document).querySelectorAll('details[data-report-fold]').forEach((el) => {
    el.open = open;
    setReportFold(el.dataset.reportFold, open);
  });
}

function reportFoldToolbarHTML() {
  return `<div class="report-fold-toolbar">
    <span class="report-fold-toolbar-label">Tap a row to expand</span>
    <button type="button" class="btn-sm" data-folds="open">Expand all</button>
    <button type="button" class="btn-sm" data-folds="close">Collapse all</button>
  </div>`;
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
  const flagged = orders.filter(o => o.dietHasRestrictions || (o.notes && !/^no restrictions$/i.test(String(o.notes).trim())));
  const hasLegacy = Object.keys(sideCounts).length || Object.keys(entreeCounts).length || Object.keys(dessertCounts).length;
  const statsHTML = `
    <div class="stats-row" style="display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:12px">
      <div class="card-box" style="margin-bottom:0"><div class="stat-label">Preferences</div><div class="stat-val">${orders.length} <span style="font-size:0.75rem;color:var(--muted)">(${guests} guest${guests === 1 ? '' : 's'})</span></div></div>
      <div class="card-box" style="margin-bottom:0"><div class="stat-label">Dinner package</div><div class="stat-val" style="font-size:0.95rem">${esc(buffetName)}</div></div>
      <div class="card-box" style="margin-bottom:0"><div class="stat-label">Want adult drinks</div><div class="stat-val">${adult} <span style="font-size:0.75rem;color:var(--muted)">(${adultPct}%)</span></div></div>
      <div class="card-box" style="margin-bottom:0"><div class="stat-label">No adult drink</div><div class="stat-val">${soft} <span style="font-size:0.75rem;color:var(--muted)">(${softPct}%)</span></div></div>
    </div>`;
  const kitchenHTML = `
    <div style="margin-bottom:12px">
      <h3>Adult drink interest</h3>
      <div style="display:flex;height:14px;border-radius:8px;overflow:hidden;background:var(--border);margin:8px 0 10px">
        <div style="width:${adultPct}%;background:var(--accent)" title="Want adult drink"></div>
        <div style="width:${softPct}%;background:color-mix(in srgb, var(--muted) 50%, var(--panel))" title="No adult drink"></div>
      </div>
      <p style="font-size:0.85rem;color:var(--muted);margin:0">
        <strong style="color:var(--text)">${adult}</strong> want adult drinks ·
        <strong style="color:var(--text)">${soft}</strong> fine without (coffee, tea, or water).
        Use the adult count to decide whether to provide a bar package or have guests order from the bar.
      </p>
    </div>
    <div style="margin-bottom:12px">
      <h3>Dietary restrictions</h3>
      ${!flagged.length
        ? '<p style="color:var(--muted);font-size:0.8rem;margin:0">No restrictions reported yet.</p>'
        : `<ul style="margin:8px 0 0;padding-left:18px">${flagged.map(o =>
            `<li style="margin-bottom:6px"><strong>${esc(o.name)}</strong> — ${esc(o.notes || 'restriction noted')}</li>`
          ).join('')}</ul>`}
    </div>
    ${hasLegacy ? `
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:12px">
      <div><h3>Legacy side picks</h3>${rankBars(sideCounts) || '<p style="color:var(--muted);font-size:0.8rem">None</p>'}</div>
      <div><h3>Legacy entrée picks</h3>${rankBars(entreeCounts) || '<p style="color:var(--muted);font-size:0.8rem">None</p>'}</div>
      <div><h3>Legacy dessert picks</h3>${rankBars(dessertCounts) || '<p style="color:var(--muted);font-size:0.8rem">None</p>'}</div>
    </div>` : ''}
    <p style="color:var(--muted);font-size:0.85rem;margin:0">Guests no longer pick plates. Kitchen serves the full BBQ buffet — use diet notes + adult-drink counts to plan.</p>`;
  const guestsHTML = `
    <div style="overflow:auto">
      <table class="data-table">
        <thead><tr><th>#</th><th>Name</th><th>Party</th><th>Seats</th><th>Adult drink?</th><th>Dietary notes</th><th>Time</th><th></th></tr></thead>
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
          const seatCol = o.seatLabel
            ? `<strong style="color:var(--accent)">${esc(o.seatLabel)}</strong>`
            : (o.seatAccommodation
              ? '<span style="color:var(--red,#e05252)">Needs arranging</span>'
              : '<span style="color:var(--red,#e05252);font-weight:700">No seat picked</span>');
          const ok = orderKeyAttr(o);
          return `<tr>
            <td>${i + 1}</td>
            <td><strong>${esc(o.name)}</strong>${o.email || o.phone ? `<div style="font-size:0.72rem;color:var(--muted)">${esc([o.email, o.phone].filter(Boolean).join(' · '))}</div>` : ''}</td>
            <td>${party}</td><td>${seatCol}</td>
            <td>${esc(cat === 'Adult' ? 'Yes — adult drink' : 'No adult drink')}</td>
            <td>${esc(o.notes || (o.dietHasRestrictions ? 'Restriction noted' : '—'))}</td>
            <td>${new Date(o.ts).toLocaleString()}</td>
            <td><button type="button" class="btn-sm" data-remove-guest="${esc(ok)}" data-remove-name="${esc(o.name || 'this guest')}" title="Remove this guest's preferences and free their seats">Remove</button></td>
          </tr>`;
        }).join('')}</tbody>
      </table>
    </div>`;
  return {
    statsHTML,
    kitchenHTML,
    guestsHTML,
    adult,
    soft,
    dietN: flagged.length,
    guests
  };
}

/** Preference rows that never landed on the Jordan or waitlist chart. */
function unseatedPreferenceOrders(orders, st) {
  const claimed = new Set();
  const addClaim = (c) => {
    if (!c) return;
    const email = String(c.email || '').toLowerCase().trim();
    const name = String(c.person || c.name || '').toLowerCase().trim();
    if (email) claimed.add('e:' + email);
    if (name) claimed.add('n:' + name);
  };
  Object.values((st && st.seats) || {}).forEach(addClaim);
  Object.values((st && st.waitlist && st.waitlist.seats) || {}).forEach(addClaim);
  return (orders || []).filter((o) => {
    if (!o || o.joinedPartner) return false;
    if ((Array.isArray(o.seats) && o.seats.length) || o.seatLabel) return false;
    const email = String(o.email || '').toLowerCase().trim();
    const name = String(o.name || '').toLowerCase().trim();
    if (email && claimed.has('e:' + email)) return false;
    if (name && claimed.has('n:' + name)) return false;
    return true;
  });
}

function renderUnseatedGuestBox(unseated, opts = {}) {
  if (!unseated.length) return '';
  const waitlist = !!opts.waitlist;
  const rows = unseated.map((o) => {
    const key = orderKeyAttr(o);
    const party = o.partyType === 'couple'
      ? `Couple${o.spouse ? ` · ${esc(o.spouse)}` : ''}`
      : 'Solo';
    return `<div style="display:flex;flex-wrap:wrap;gap:8px;align-items:center;justify-content:space-between;padding:8px 0;border-top:1px solid var(--border)">
      <div>
        <strong>${esc(o.name || 'Guest')}</strong>
        <div style="font-size:0.75rem;color:var(--muted)">${esc([o.email, o.phone].filter(Boolean).join(' · ') || 'no contact')}${o.waitlist || o.waitlistHold ? ' · marked waitlist' : ''} · ${party}</div>
      </div>
      <button type="button" class="btn-sm btn-accent" data-place-unseated="${esc(key)}">${waitlist ? 'Hold a waitlist chair' : 'Place on waitlist chart'}</button>
    </div>`;
  }).join('');
  return `
    <div class="card-box" style="margin:12px 0;border:1px solid #c9a44a;background:rgba(201,164,74,0.08)">
      <h4 style="color:var(--accent);margin:0 0 6px">⚠ Submitted without a seat (${unseated.length})</h4>
      <p style="color:var(--muted);font-size:0.8rem;margin:0 0 8px">
        These people got through the form without highlighting a chair, so they never appeared on the chart.
        Place them here — that does <strong>not</strong> send another text or email.
      </p>
      ${rows}
    </div>`;
}

let pendingWaitlistGuest = null;
let wlUnseated = [];

function startWaitlistHoldForOrder(order) {
  pendingWaitlistGuest = order || null;
  fillWaitlistAssignFromOrder(order);
  const already = document.getElementById('view-waitlist')?.classList.contains('active');
  if (already) {
    renderWaitlistView();
    return;
  }
  if (typeof switchHostView === 'function') switchHostView('waitlist');
}

function fillWaitlistAssignFromOrder(order) {
  if (!order) return;
  const nameEl = document.getElementById('wlName');
  const emailEl = document.getElementById('wlEmail');
  const phoneEl = document.getElementById('wlPhone');
  const partyEl = document.getElementById('wlParty');
  const spouseEl = document.getElementById('wlSpouse');
  const keyEl = document.getElementById('wlExistingKey');
  const sel = document.getElementById('wlExisting');
  if (nameEl) nameEl.value = order.name || '';
  if (emailEl) emailEl.value = order.email || '';
  if (phoneEl) phoneEl.value = order.phone || '';
  if (partyEl) partyEl.value = order.partyType === 'couple' ? 'couple' : 'solo';
  if (spouseEl) spouseEl.value = order.spouse || '';
  if (keyEl) keyEl.value = orderKeyAttr(order);
  if (sel) sel.value = orderKeyAttr(order);
}

function wireUnseatedPlaceButtons(root, unseated) {
  (root || document).querySelectorAll('[data-place-unseated]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const key = btn.dataset.placeUnseated;
      const order = (unseated || []).find((o) => orderKeyAttr(o) === key);
      startWaitlistHoldForOrder(order || null);
    });
  });
}

/** Stable key for a preference row (matches RESharedOrders.orderKey). */
function orderKeyAttr(o) {
  if (window.RESharedOrders?.orderKey) return RESharedOrders.orderKey(o);
  if (o?.id != null && String(o.id)) return 'id:' + String(o.id);
  return (
    'k:' +
    `${String(o?.email || '').toLowerCase()}|${o?.phone || ''}|${o?.ts || ''}|${String(o?.name || '').toLowerCase()}`
  );
}

/**
 * Remove one preference submission + free any seats they held.
 * Does not clear the rest of the guest list.
 */
async function removeGuestPreference(orderKey, displayName) {
  const loc = getReportLoc();
  const name = displayName || 'this guest';
  if (
    !confirm(
      `Remove ${name} from the guest list?\n\nThis deletes their diet/drink notes and frees any seats they reserved.\nOther guests are left alone.`
    )
  ) {
    return false;
  }

  const errors = [];
  let seatIds = [];

  // Snapshot seats from local list before delete (in case remote already dropped seats field)
  try {
    const local = JSON.parse(localStorage.getItem(loc.storageKey) || '[]');
    (local || []).forEach((o) => {
      if (orderKeyAttr(o) !== orderKey && String(o?.id) !== orderKey.replace(/^id:/, '')) return;
      if (Array.isArray(o.seats)) seatIds.push(...o.seats.map(String));
    });
  } catch (_) {}

  try {
    if (window.RESharedStore?.memInvalidate) RESharedStore.memInvalidate();
    if (window.RESharedOrders?.removeOrders) {
      const result = await RESharedOrders.removeOrders(loc, [orderKey]);
      if (Array.isArray(result.seatIds) && result.seatIds.length) {
        seatIds = [...new Set([...seatIds, ...result.seatIds.map(String)])];
      }
      if (!result.removed) {
        // Still try seat cleanup; may only have existed on seats map
      }
    } else {
      errors.push('removeOrders not available — hard-refresh command center');
    }
  } catch (e) {
    errors.push('preferences: ' + e);
  }

  // Free seats even if they only existed on the live map
  if (seatIds.length && window.RESeating?.releaseSeats) {
    try {
      if (window.RESharedOrders?.stripSeatsFromOrders) {
        await RESharedOrders.stripSeatsFromOrders(loc, seatIds);
      }
      await RESeating.releaseSeats(seatIds);
    } catch (e) {
      errors.push('seats: ' + e);
    }
  } else if (window.RESeating?.fetchState && window.RESeating?.releaseSeats) {
    // Fallback: find seats claimed under this guest name on the map
    try {
      const st = await RESeating.fetchState({ healRemote: false, orders: [], offlineOrders: false });
      const needle = String(displayName || '').toLowerCase().trim();
      const hit = Object.values(st.seats || {})
        .filter((c) => {
          const n = String(c.person || c.name || '').toLowerCase();
          return needle && (n === needle || n.includes(needle) || needle.includes(n));
        })
        .map((c) => c.seatId);
      if (hit.length) await RESeating.releaseSeats(hit);
    } catch (e) {
      errors.push('seat lookup: ' + e);
    }
  }

  if (errors.length) {
    alert(`Removed with some issues:\n\n${errors.join('\n')}`);
  }
  return true;
}

function wireGuestRemoveButtons(root) {
  (root || document).querySelectorAll('[data-remove-guest]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const key = btn.dataset.removeGuest;
      const name = btn.dataset.removeName || 'this guest';
      if (!key) return;
      btn.disabled = true;
      btn.textContent = '…';
      const ok = await removeGuestPreference(key, name);
      if (ok) renderReport();
      else {
        btn.disabled = false;
        btn.textContent = 'Remove';
      }
    });
  });
}

function renderBuffetReport(orders, loc) {
  if (loc.bbqMenuPick) {
    const p = renderBbqMenuPickReport(orders, loc);
    return (p.statsHTML || '') + (p.kitchenHTML || '') + (p.guestsHTML || '');
  }
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
      <div class="card-box"><div class="stat-label">Coffee / tea / water</div><div class="stat-val">${soft} <span style="font-size:0.75rem;color:var(--muted)">(${softPct}%)</span></div></div>
    </div>
    <div class="card-box" style="margin-bottom:16px">
      <h3>Beverage split</h3>
      <div style="display:flex;height:14px;border-radius:8px;overflow:hidden;background:var(--border);margin:8px 0 10px">
        <div style="width:${adultPct}%;background:var(--accent)" title="Adult"></div>
        <div style="width:${softPct}%;background:color-mix(in srgb, var(--muted) 50%, var(--panel))" title="Soft"></div>
      </div>
      <p style="font-size:0.85rem;color:var(--muted);margin:0">
        <strong style="color:var(--text)">${adult}</strong> adult ·
        <strong style="color:var(--text)">${soft}</strong> coffee, tea, or water
      </p>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:16px">
      <div class="card-box"><h3>Buffet popularity</h3>${rankBars(buffetCounts) || '<p style="color:var(--muted);font-size:0.8rem">No votes yet.</p>'}</div>
      <div class="card-box"><h3>Appetizer package votes</h3>${rankBars(starterCounts) || '<p style="color:var(--muted);font-size:0.8rem">No votes yet.</p>'}</div>
    </div>
    <p style="color:var(--muted);font-size:0.85rem;margin-bottom:12px">Leading starter: <strong>${topStarter ? esc(topStarter[0]) : '—'}</strong>. Lock winning buffet + apps with McMenamins sales.</p>
    ${reportFoldHTML('loc-guests', 'Guest list', `${orders.length} vote${orders.length === 1 ? '' : 's'}`, `<div style="overflow:auto">
      <table class="data-table">
        <thead><tr><th>#</th><th>Name</th><th>Buffet</th><th>Appetizers</th><th>Beverage bucket</th><th>Time</th><th></th></tr></thead>
        <tbody>${orders.map((o, i) => {
          const cat = o.drinkCat || (o.drinkId === 'd-adult' ? 'Adult' : 'Soft');
          const ok = orderKeyAttr(o);
          return `<tr><td>${i + 1}</td><td><strong>${esc(o.name)}</strong></td><td>${esc(o.buffet || '—')}</td><td>${esc(o.starter || '—')}</td><td>${esc(cat === 'Adult' ? 'Adult beverage' : 'Coffee, tea, or water')}</td><td>${new Date(o.ts).toLocaleString()}</td><td><button type="button" class="btn-sm" data-remove-guest="${esc(ok)}" data-remove-name="${esc(o.name || 'this guest')}">Remove</button></td></tr>`;
        }).join('')}</tbody>
      </table>
    </div>`)}`;
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
        <thead><tr><th>#</th><th>Guest</th><th>Arrival Bite</th><th>Main</th><th>Drink</th><th>Subtotal</th><th>Time</th><th></th></tr></thead>
        <tbody>${enriched.map((o, i) => `<tr>
          <td>${i + 1}</td><td><strong>${esc(o.name)}</strong></td>
          <td>${esc(o.starter || '—')}</td><td>${esc(o.main)}</td><td>${esc(o.drink)}</td>
          <td>${fmt(o.total)}</td><td>${new Date(o.ts).toLocaleString()}</td>
          <td><button type="button" class="btn-sm" data-remove-guest="${esc(orderKeyAttr(o))}" data-remove-name="${esc(o.name || 'this guest')}">Remove</button></td></tr>`).join('')}
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
        <thead><tr><th>#</th><th>Guest</th><th>Salad</th><th>Entrée</th><th>Dessert</th>${drinkCol}<th>Cost</th><th>Time</th><th></th></tr></thead>
        <tbody>${enriched.map((o,i) => `<tr><td>${i+1}</td><td><strong>${esc(o.name)}</strong></td><td>${esc(o.salad)}</td><td>${esc(o.entree)}</td><td>${esc(o.dessert)}</td>${drinkCells(o)}<td>${fmt(o.total)}</td><td>${new Date(o.ts).toLocaleString()}</td><td><button type="button" class="btn-sm" data-remove-guest="${esc(orderKeyAttr(o))}" data-remove-name="${esc(o.name || 'this guest')}">Remove</button></td></tr>`).join('')}</tbody>
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

function paintLocationReport(loc, reportLoc, orders, opts = {}) {
  const body = document.getElementById('report-body');
  if (!body) return;
  const seatClaimN = opts.seatClaimN != null ? opts.seatClaimN : 0;
  const seatsOnline = !!opts.seatsOnline;
  const loading = !!opts.loading;
  const source = opts.source || '';
  const share = renderShareBar(loc);
  const durable = !!(window.RESharedStore?.isConfigured?.());
  const syncBadge = reportLoc.bbqMenuPick
    ? seatsOnline
      ? `<span style="color:#6d6;font-weight:600">● Seats sync online</span> · <strong style="color:var(--text)">${seatClaimN}</strong> reserved · ${durable ? 'cloud store' : '<span style="color:#e8a">jsonblob fallback</span>'}`
      : loading
        ? `<span style="color:#ca8;font-weight:600">● Syncing seats…</span>`
        : `<span style="color:#e88;font-weight:600">● Seats sync offline</span> — ${durable ? 'cloud store slow/unreachable' : 'configure shared store'}`
    : '';
  const sourceNote =
    source === 'remote'
      ? 'from shared cloud log'
      : source === 'local-offline'
        ? 'from this browser only (cloud unreachable)'
        : source === 'local-cache'
          ? 'cached on this device — refreshing from cloud…'
          : 'from shared log';
  const syncNote = `<div class="card-box" style="margin-bottom:16px;font-size:0.85rem;color:var(--muted)">
    <strong style="color:var(--text)">Shared state</strong> ·
    Showing <strong style="color:var(--text)">${orders.length}</strong> preference submission(s) ${sourceNote}.
    ${loading ? `<span style="margin-left:8px;color:var(--accent)">Updating…</span>` : ''}
    ${syncBadge ? `<div style="margin-top:8px">${syncBadge}</div>` : ''}
    ${!durable ? `<div style="margin-top:10px;padding:10px 12px;border-radius:8px;background:rgba(224,130,50,0.15);color:#f0c080;font-size:0.82rem"><strong>Action needed:</strong> Deploy the durable store. Open <a href="tools/setup-shared-store.html" style="color:var(--accent)">Shared store setup</a>.</div>` : ''}
    <div style="margin-top:10px;display:flex;flex-wrap:wrap;gap:8px">
      <button type="button" class="btn-sm" id="btnRefreshShared">Refresh from cloud</button>
      ${reportLoc.bbqMenuPick ? `<button type="button" class="btn-sm btn-accent" id="btnPublishSeats">Publish recent local only → guest map</button>` : ''}
    </div>
    <p style="margin:10px 0 0;font-size:0.78rem">Cloud list is the source of truth. <strong>Remove</strong> on a guest row deletes that person only. <strong>Clear</strong> (toolbar) wipes everyone.</p>
  </div>`;

  const emptyMsg = `<div class="empty">${loading ? 'Loading preferences…' : `No preferences yet for ${esc(loc.shortName)}. Use <strong>Email / text guest link</strong>, then hit <strong>Refresh from cloud</strong> after guests submit.`}</div>`;

  if (reportLoc.bbqMenuPick) {
    const parts = orders.length ? renderBbqMenuPickReport(orders, reportLoc) : null;
    const kitchenMeta = parts
      ? `${parts.adult} adult · ${parts.soft} no drink · ${parts.dietN} diet note${parts.dietN === 1 ? '' : 's'}`
      : '';
    body.innerHTML =
      reportFoldToolbarHTML() +
      (parts ? parts.statsHTML : '') +
      '<div id="unseated-slot"></div>' +
      reportFoldHTML(
        'loc-seats',
        'Seating chart — Jordan Room',
        seatsOnline
          ? `${seatClaimN} reserved`
          : loading
            ? 'loading…'
            : 'offline',
        `<div id="seating-panel">${loading && !opts.seatsReady ? '<div class="empty">Loading live seating chart…</div>' : ''}</div>`
      ) +
      (parts
        ? reportFoldHTML('loc-kitchen', 'Kitchen &amp; drinks', kitchenMeta, parts.kitchenHTML) +
          reportFoldHTML('loc-guests', 'Guest list', `${orders.length} submission${orders.length === 1 ? '' : 's'}`, parts.guestsHTML)
        : emptyMsg) +
      reportFoldHTML('loc-share', 'Guest link &amp; sync', `${orders.length} in cloud log`, share + syncNote);
  } else if (!orders.length) {
    body.innerHTML = `${share}${syncNote}${emptyMsg}`;
  } else {
    const reportHTML =
      reportLoc.type === 'screening'
        ? renderScreeningReport(orders, reportLoc)
        : reportLoc.type === 'preorder'
          ? renderPreorderReport(orders, reportLoc)
          : reportLoc.type === 'buffet'
            ? renderBuffetReport(orders, reportLoc)
            : renderRetreatReport(orders, reportLoc);
    body.innerHTML = reportFoldToolbarHTML() + share + syncNote + reportHTML;
  }

  wireReportFolds(body);
  body.querySelectorAll('[data-folds]').forEach((btn) => {
    btn.addEventListener('click', () => setAllReportFolds(body, btn.dataset.folds === 'open'));
  });
  body.querySelector('[data-copy-link]')?.addEventListener('click', (e) => {
    copyText(e.target.dataset.copyLink).then(() => alert('Link copied!'));
  });
  body.querySelector('#btnRefreshShared')?.addEventListener('click', () => {
    if (window.RESharedStore?.memInvalidate) RESharedStore.memInvalidate();
    if (window.RESeating?.clearLocalCache) RESeating.clearLocalCache();
    renderReport({ forceCloud: true });
  });
  body.querySelector('#btnPublishSeats')?.addEventListener('click', async () => {
    const btn = body.querySelector('#btnPublishSeats');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Publishing…';
    }
    try {
      const pub = await publishHostStateToGuestMap(reportLoc, orders);
      const n = Object.keys(pub.seats?.seats || {}).length;
      alert(
        `Published to guest map.\n\nPreferences: ${pub.orders?.length || 0}\nSeats blacked out: ${n}\n\nHard-refresh the guest page to confirm.`
      );
    } catch (e) {
      alert('Publish failed: ' + e);
    }
    renderReport({ forceCloud: true });
  });
  wireGuestRemoveButtons(body);
}

async function renderReport(opts = {}) {
  const loc = getLoc();
  const reportLoc = getReportLoc();
  document.body.className = 'theme-hub';
  if (document.getElementById('hostTitle')) {
    document.getElementById('hostTitle').textContent = `${loc.shortName} · Report`;
  }

  // 1) Paint instantly from this device (no waiting on Google)
  let orders = getOrders();
  paintLocationReport(loc, reportLoc, orders, {
    loading: true,
    source: 'local-cache',
    seatsOnline: false,
    seatClaimN: 0
  });

  if (opts.forceCloud && window.RESharedStore?.memInvalidate) {
    RESharedStore.memInvalidate();
  }

  // 2) Fetch orders + seats in parallel (was sequential = 2× wait)
  const ordersPromise = refreshOrdersFromShared({ meta: true }).catch((e) => {
    console.warn('[RE] orders refresh', e);
    return { orders, source: 'local-offline' };
  });
  const seatsPromise =
    reportLoc.bbqMenuPick && window.RESeating?.fetchState
      ? RESeating.fetchState({ healRemote: false, orders: [], offlineOrders: false }).catch((e) => {
          console.warn('[RE] seat status', e);
          return null;
        })
      : Promise.resolve(null);

  const [ordersMeta, liveSeats] = await Promise.all([ordersPromise, seatsPromise]);
  orders = Array.isArray(ordersMeta?.orders) ? ordersMeta.orders : Array.isArray(ordersMeta) ? ordersMeta : orders;
  const seatsOnline = !!(liveSeats && !liveSeats.offline);
  const seatClaimN = liveSeats ? Object.keys(liveSeats.seats || {}).length : 0;

  paintLocationReport(loc, reportLoc, orders, {
    loading: false,
    source: ordersMeta?.source || 'remote',
    seatsOnline,
    seatClaimN,
    seatsReady: true
  });

  if (reportLoc.bbqMenuPick && window.RESeating) {
    // Pass already-fetched orders so panel doesn't re-hit the store
    loadSeatingPanel(reportLoc, orders, { skipSharedReload: true, prefetchedSeats: liveSeats });
  }
}

/* ================= Seating chart + couple linking (Kennedy BBQ) ================= */

let seatLinkPicks = [];

async function loadSeatingPanel(loc, orders, opts = {}) {
  const panel = document.getElementById('seating-panel');
  if (!panel || !window.RESeating) return;
  // Live seats map is authoritative when online. Prefer orders/seats already
  // loaded by renderReport (avoids a second slow Apps Script round-trip).
  let orderList = orders || getOrders();
  if (!opts.skipSharedReload && !orders) {
    try {
      if (window.RESharedOrders?.loadOrdersForLocation) {
        orderList = await RESharedOrders.loadOrdersForLocation(loc);
      }
    } catch (_) {}
  }
  let st = opts.prefetchedSeats || null;
  if (!st) {
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
  }
  const claims = Object.values(st.seats || {}).sort((a, b) => String(a.seatId).localeCompare(String(b.seatId)));
  const seatsTaken = claims.length;
  const totalSeats = RESeating.allSeats().length;
  const unseated = unseatedPreferenceOrders(orderList, st);
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

  const unseatedSlot = document.getElementById('unseated-slot');
  if (unseatedSlot) {
    unseatedSlot.innerHTML = renderUnseatedGuestBox(unseated, { waitlist: false });
    wireUnseatedPlaceButtons(unseatedSlot, unseated);
  }

  panel.innerHTML = `
    <div style="color:var(--muted);font-size:0.85rem;margin-bottom:10px">
      Arch layout facing the screen · five 60″ 8-tops ·
      <strong style="color:var(--text)">${seatsTaken}/${totalSeats}</strong> reserved
      <button class="btn-sm" style="margin-left:8px" id="btnRefreshSeats">↻ Refresh</button>
      <button class="btn-sm" style="margin-left:6px" id="btnOpenWaitlist">Waitlist chart →</button>
      <button class="btn-sm" style="margin-left:6px" id="btnOpenGym">Gym backup →</button>
    </div>
    ${offlineBanner}
    <div class="card-box" style="padding:10px;margin-bottom:10px">${RESeating.renderMapSVG(st, { mode: 'host' })}${RESeating.legendHTML('host')}</div>
    ${claims.length ? reportFoldHTML(
      'loc-reserved',
      'Reserved seats',
      `${claims.length} chair${claims.length === 1 ? '' : 's'}`,
      `<div style="overflow-x:auto"><table class="data-table" style="width:100%;font-size:0.85rem">
        <thead><tr><th>Seat</th><th>Guest</th><th>Party</th><th>Contact</th><th></th></tr></thead>
        <tbody>${rows}</tbody></table></div>`
    ) : ''}
    ${accom ? reportFoldHTML(
      'loc-help',
      '⚠ Seating help requested',
      `${st.accommodations.length}`,
      accom,
      { tone: 'alert', forceOpen: true }
    ) : ''}
    ${reportFoldHTML(
      'loc-couples',
      'Couples',
      `${(st.couples || []).length} linked`,
      `<p style="color:var(--muted);font-size:0.8rem;margin:0 0 10px">
        Couples link automatically when someone reserves for a spouse, or when the spouse submits via
        <strong>Partner already reserved</strong>. You can also tap two names and <strong>Link as couple</strong>.
      </p>
      ${linked}
      <div style="padding-top:4px">
        <div style="margin-bottom:8px">${contactChips || '<span style="color:var(--muted);font-size:0.85rem">No contacts yet — they appear as guests submit preferences or reserve seats.</span>'}</div>
        <button class="btn-sm btn-accent" id="btnLinkCouple" ${seatLinkPicks.length === 2 ? '' : 'disabled'}>♥ Link as couple${seatLinkPicks.length === 2 ? `: ${esc(contacts[seatLinkPicks[0]].name)} + ${esc(contacts[seatLinkPicks[1]].name)}` : ' (pick two names)'}</button>
      </div>`
    )}`;

  wireReportFolds(panel);
  if (!unseatedSlot) wireUnseatedPlaceButtons(panel, unseated);
  panel.querySelector('#btnRefreshSeats')?.addEventListener('click', () => {
    if (window.RESharedStore?.memInvalidate) RESharedStore.memInvalidate();
    if (window.RESeating?.clearLocalCache) RESeating.clearLocalCache();
    loadSeatingPanel(loc, null);
  });
  panel.querySelector('#btnOpenWaitlist')?.addEventListener('click', () => {
    if (typeof switchHostView === 'function') switchHostView('waitlist');
  });
  panel.querySelector('#btnOpenGym')?.addEventListener('click', () => {
    if (typeof switchHostView === 'function') switchHostView('gym');
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

function exportRowKind(type) {
  if (type === 'guest-list') return 'guest-list';
  if (type === 'cost-summary') return 'cost-summary';
  if (type === 'waitlist') return 'waitlist';
  if (type === 'kitchen') return 'kitchen';
  return 'orders';
}

function exportFileSuffix(type) {
  if (type === 'guest-list') return 'guests';
  if (type === 'cost-summary') return 'cost-summary';
  if (type === 'waitlist') return 'waitlist';
  if (type === 'kitchen') return 'kitchen-diet';
  return 'orders';
}

async function collectExportOrders() {
  const loc = getLoc();
  const reportLoc = getReportLoc();
  let orders = [];
  try {
    const result = await refreshOrdersFromShared();
    orders = Array.isArray(result) ? result : (result?.orders || getOrders());
  } catch (_) {
    orders = getOrders();
  }
  orders = Array.isArray(orders) ? orders.slice() : [];

  if (reportLoc?.bbqMenuPick && window.RESeating?.fetchState) {
    try {
      const st = await RESeating.fetchState({ healRemote: false, orders });
      const claims = Object.values((st.waitlist && st.waitlist.seats) || {});
      claims.forEach((c) => {
        const email = String(c.email || '').toLowerCase();
        const phone = String(c.phone || '');
        const name = c.person || c.name || '';
        const match = orders.find((o) =>
          (email && String(o.email || '').toLowerCase() === email) ||
          (phone && String(o.phone || '') === phone) ||
          (name && String(o.name || '').toLowerCase() === name.toLowerCase() && (o.waitlist || o.waitlistHold))
        );
        if (match) {
          match.waitlist = match.waitlist || true;
          match.waitlistHold = match.waitlistHold || true;
          if (!match.seatLabel) match.seatLabel = c.seatId;
          return;
        }
        orders.push({
          name,
          email: c.email || '',
          phone: c.phone || '',
          partyType: c.partyType,
          spouse: c.spouse || '',
          seats: c.seatId ? [c.seatId] : [],
          seatLabel: c.seatId || '',
          waitlist: true,
          waitlistHold: true,
          ts: c.ts || c.claimedAt || '',
          source: 'waitlist-chart'
        });
      });
    } catch (e) {
      console.warn('[RE] waitlist merge for export failed', e);
    }
  }
  return { loc, reportLoc, orders };
}

async function exportData(type) {
  document.getElementById('exportDropdown')?.classList.remove('open');
  let loc, reportLoc, orders;
  try {
    ({ loc, reportLoc, orders } = await collectExportOrders());
  } catch (e) {
    console.warn('[RE] export collect failed', e);
    return alert('Could not load guest data for export. Refresh the page and try again.');
  }
  const kind = exportRowKind(type);
  if (kind === 'waitlist') {
    const holds = orders.filter((o) => o.waitlist || o.waitlistHold);
    if (!holds.length) return alert('No waitlist holds to export yet.');
  } else if (kind !== 'cost-summary' && !orders.length) {
    return alert('No guest data to export yet. Open the location report (so the shared log can load), then try again.');
  }

  const rows = buildExportRows(reportLoc || loc, kind === 'waitlist' ? orders.filter((o) => o.waitlist || o.waitlistHold) : orders, kind);
  const dataRows = Math.max(0, rows.length - 1);

  if (type === 'orders-tsv') {
    copyText(rowsToTSV(rows)).then(() =>
      alert(`Copied ${dataRows} row${dataRows === 1 ? '' : 's'}. Paste into Google Sheets with Cmd/Ctrl+V.`)
    );
    return;
  }
  if (type === 'sheets-push') {
    pushToGoogleSheets(rows, { location: loc.shortName, exportType: kind, sheetName: loc.shortName })
      .then(() => alert(`Sent ${dataRows} row${dataRows === 1 ? '' : 's'} to Google Sheet tab "${loc.shortName}".`))
      .catch((err) => alert(err.message));
    return;
  }
  const csv = rowsToCSV(rows);
  const suffix = exportFileSuffix(type);
  const filename = `${(reportLoc || loc).slug}_${suffix}.csv`;
  downloadText(filename, csv, 'text/csv;charset=utf-8');
  alert(`Downloaded ${filename} — ${dataRows} row${dataRows === 1 ? '' : 's'}.`);
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

function guestFlyerShortcutsHTML(opts = {}) {
  const focus = opts.focus || 'all';
  const full = `
    <div class="flyer-shortcut">
      <h4>Not confirmed / no seat</h4>
      <p>Thursday is full. Send the clickable PDF (as a file) or the live page. Do not flatten to a photo.</p>
      <div class="flyer-shortcut-actions">
        <a class="btn-sm btn-accent" href="next.html" target="_blank" rel="noopener">Live page</a>
        <a class="btn-sm" href="flyers/Thursday-is-full.pdf" target="_blank" rel="noopener">Clickable PDF</a>
        <a class="btn-sm" href="flyers/Thursday-is-full.jpg" target="_blank" rel="noopener" download>JPG</a>
      </div>
    </div>`;
  const wait = `
    <div class="flyer-shortcut">
      <h4>Waitlist</h4>
      <p>You raised your hand. Talk now, or promise a seat at the next night if Thursday does not open.</p>
      <div class="flyer-shortcut-actions">
        <a class="btn-sm btn-accent" href="waitlist.html" target="_blank" rel="noopener">Live page</a>
        <a class="btn-sm" href="flyers/Waitlist-you-raised-your-hand.pdf" target="_blank" rel="noopener">Clickable PDF</a>
        <a class="btn-sm" href="flyers/Waitlist-you-raised-your-hand.jpg" target="_blank" rel="noopener" download>JPG</a>
      </div>
    </div>`;
  const grid = focus === 'waitlist' ? wait : focus === 'full' ? full : `${full}${wait}`;
  return `<div class="card-box flyer-shortcuts" id="guest-flyers">
    <h3 style="margin-top:0">Guest flyers</h3>
    <p class="integration-note" style="margin:0 0 14px">7 days out. Email the PDF as an attachment, or text it as a file. On a phone they tap the box.</p>
    <div class="flyer-shortcuts-grid">${grid}</div>
  </div>`;
}

function renderOutreach() {
  const cfg = getIntegrations();
  const queue = typeof getInviteQueue === 'function' ? getInviteQueue() : [];
  // Full venue catalog for outreach (never hide Edgefield / other events here)
  const locs =
    typeof getAllPlannerLocations === 'function'
      ? getAllPlannerLocations()
      : typeof getPlannerLocations === 'function'
        ? getPlannerLocations()
        : getAllLocations();
  const activeSlug = typeof getActiveEventSlug === 'function' ? getActiveEventSlug() : null;

  const locCards = locs
    .map((loc) => {
      const link = absoluteGuestLink(loc.slug);
      const ev = getLocationEvent(loc.slug);
      const isActive = loc.slug === activeSlug || loc.active;
      return `<div class="card-box"${isActive ? ' style="border:2px solid var(--accent)"' : ''}>
      <h3>${isActive ? '★ ' : ''}${esc(loc.shortName)}${loc.guestSlug ? ' · BBQ' : ''}${isActive ? ' <span style="font-size:0.7rem;color:var(--accent)">LIVE</span>' : ''}</h3>
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
    })
    .join('');

  const queueHTML = queue.length
    ? queue
        .slice(0, 100)
        .map(
          (inv) => `<div class="invite-row">
        <strong>${esc(inv.firstName || '')} ${esc(inv.lastName || '')}</strong> · ${esc(inv.locationName || inv.locationSlug || '—')}
        <div style="font-size:0.75rem;color:var(--muted)">${esc(inv.email || '—')} · ${esc(inv.phone || '—')} · ${esc(inv.status || '')} · ${inv.ts ? new Date(inv.ts).toLocaleString() : ''}</div>
      </div>`
        )
        .join('')
    : `<p class="empty" style="padding:16px">No invites in this browser yet. Invites are stored on this device (<code>re_invites_v1</code>) — they are not wiped by focus mode. If you used another browser/computer, open command center there to see that queue.</p>`;

  document.getElementById('view-outreach').innerHTML = `
    ${guestFlyerShortcutsHTML()}
    <div class="card-box" style="margin-bottom:18px">
      <h3 style="margin-top:0">Outreach records</h3>
      <p class="integration-note" style="margin:0">
        Invite history, marketing links, and integrations are still here — nothing was deleted by the Kennedy cleanup.
        Overview can hide other venues; <strong>this tab always lists every event</strong> and the full invite queue from this browser.
      </p>
    </div>
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
    <h3 class="dash-section-title">Send links by location <span style="font-weight:400;color:var(--muted);font-size:0.85rem">(${locs.length} venues)</span></h3>
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

/* ================= Waitlist (mirrored Jordan chart) ================= */

let wlPick = [];

async function renderWaitlistView() {
  const body = document.getElementById('waitlist-body');
  if (!body || !window.RESeating) return;
  body.innerHTML = '<div class="empty">Loading waitlist chart…</div>';
  let st;
  try {
    st = await RESeating.fetchState({ healRemote: false, orders: [] });
  } catch (e) {
    st = RESeating.emptyState();
    st.offline = true;
  }
  const claims = Object.values((st.waitlist && st.waitlist.seats) || {}).sort((a, b) =>
    String(a.seatId).localeCompare(String(b.seatId))
  );
  const total = RESeating.allSeats().length;
  let orderList = [];
  try {
    const loc = typeof getReportLoc === 'function' ? getReportLoc() : null;
    if (loc && window.RESharedOrders?.loadOrdersForLocation) {
      orderList = await RESharedOrders.loadOrdersForLocation(loc);
    } else {
      orderList = typeof getOrders === 'function' ? getOrders() : [];
    }
  } catch (_) {
    orderList = typeof getOrders === 'function' ? getOrders() : [];
  }
  wlUnseated = unseatedPreferenceOrders(orderList, st);
  const rows = claims.map((c) => `
    <tr>
      <td style="font-weight:700;color:var(--accent)">${esc(c.seatId)}</td>
      <td>${esc(c.person || c.name)}</td>
      <td>${esc(c.partyType === 'couple' ? `Couple${c.spouse ? ` · ${c.spouse}` : ''}` : 'Solo')}</td>
      <td style="font-size:0.78rem;color:var(--muted)">${esc([c.email, c.phone].filter(Boolean).join(' · '))}</td>
      <td><button class="btn-sm" data-wl-release="${esc(c.seatId)}">Release hold</button></td>
    </tr>`).join('');
  body.innerHTML = `
    ${guestFlyerShortcutsHTML({ focus: 'waitlist' })}
    <div class="rate-note" style="margin-top:8px">
      <strong>Separate waitlist chart.</strong> Holds here do not change confirmed Jordan Room seats.
      If a confirmed seat opens, contact the person on the matching waitlist chair so they can claim it.
      They must claim it promptly or the hold goes to the next person.
    </div>
    <h3 style="font-family:var(--heading-font);color:var(--accent);margin-bottom:4px">Waitlist — Jordan Room mirror</h3>
    <div style="color:var(--muted);font-size:0.85rem;margin-bottom:10px">
      <strong style="color:var(--text)">${claims.length}/${total}</strong> waitlist holds
      <button class="btn-sm" style="margin-left:8px" id="btnWlRefresh">↻ Refresh</button>
      <button class="btn-sm" style="margin-left:6px" id="btnWlToJordan">← Jordan Room</button>
    </div>
    ${renderUnseatedGuestBox(wlUnseated, { waitlist: true })}
    <div class="card-box" style="padding:10px;min-height:280px" id="wl-map">${RESeating.renderMapSVG(st, { mode: 'host', map: 'waitlist' })}${RESeating.legendHTML('host')}</div>
    <p style="color:var(--muted);font-size:0.8rem;margin:8px 0 16px">Tap an open chair to place a waitlist hold${wlPick.length ? ` · selected <strong>${esc(wlPick.join(', '))}</strong>` : ''}.</p>
    ${claims.length
      ? reportFoldHTML(
          'wl-holds',
          'Waitlist holds',
          `${claims.length} hold${claims.length === 1 ? '' : 's'} · tap to ${reportFoldState()['wl-holds'] ? 'collapse' : 'expand'}`,
          `<div style="overflow-x:auto"><table class="data-table" style="width:100%;font-size:0.85rem">
            <thead><tr><th>Seat</th><th>Guest</th><th>Party</th><th>Contact</th><th></th></tr></thead>
            <tbody>${rows}</tbody></table></div>`
        )
      : '<p style="color:var(--muted);font-size:0.85rem">No waitlist holds yet.</p>'}`;

  wireReportFolds(body);
  const wlFold = body.querySelector('details[data-report-fold="wl-holds"]');
  if (wlFold) {
    const meta = wlFold.querySelector('.report-fold-meta');
    const n = claims.length;
    const syncHint = () => {
      if (meta) meta.textContent = `${n} hold${n === 1 ? '' : 's'} · tap to ${wlFold.open ? 'collapse' : 'expand'}`;
    };
    syncHint();
    wlFold.addEventListener('toggle', syncHint);
  }
  wireUnseatedPlaceButtons(body, wlUnseated);
  const existingSel = document.getElementById('wlExisting');
  if (existingSel) {
    existingSel.innerHTML =
      '<option value="">New person — will send confirmation</option>' +
      wlUnseated.map((o) =>
        `<option value="${esc(orderKeyAttr(o))}">${esc(o.name || 'Guest')}${o.phone || o.email ? ` · ${esc(o.phone || o.email)}` : ''}</option>`
      ).join('');
    existingSel.onchange = () => {
      const key = existingSel.value;
      const order = wlUnseated.find((o) => orderKeyAttr(o) === key);
      if (order) fillWaitlistAssignFromOrder(order);
      else {
        const keyEl = document.getElementById('wlExistingKey');
        if (keyEl) keyEl.value = '';
      }
    };
  }
  if (pendingWaitlistGuest) {
    fillWaitlistAssignFromOrder(pendingWaitlistGuest);
    pendingWaitlistGuest = null;
  }
  body.querySelector('#btnWlRefresh')?.addEventListener('click', () => {
    if (window.RESharedStore?.memInvalidate) RESharedStore.memInvalidate();
    renderWaitlistView();
  });
  body.querySelector('#btnWlToJordan')?.addEventListener('click', () => switchHostView('location'));
  body.querySelectorAll('[data-seat]').forEach((el) => {
    el.addEventListener('click', () => {
      const id = el.getAttribute('data-seat');
      if (!id) return;
      if ((st.waitlist && st.waitlist.seats && st.waitlist.seats[id])) return;
      if (wlPick.includes(id)) wlPick = wlPick.filter((x) => x !== id);
      else wlPick = [...wlPick, id].slice(-2);
      openWaitlistAssign(wlPick);
    });
  });
  body.querySelectorAll('[data-wl-release]').forEach((btn) => {
    btn.addEventListener('click', async () => {
      const id = btn.dataset.wlRelease;
      if (!confirm(`Release waitlist hold on ${id}?`)) return;
      btn.disabled = true;
      try {
        await RESeating.releaseSeats([id], { map: 'waitlist' });
      } catch (e) {
        alert('Release failed: ' + e);
      }
      renderWaitlistView();
    });
  });
}

function openWaitlistAssign(ids) {
  const modal = document.getElementById('waitlistAssignModal');
  if (!modal) return;
  document.getElementById('wlSeatIds').value = (ids || []).join(',');
  document.getElementById('wlAssignSeats').textContent =
    `Hold ${RESeating.seatLabel(ids)} — not a confirmed Jordan Room seat.`;
  document.getElementById('wlParty').value = ids.length > 1 ? 'couple' : 'solo';
  modal.classList.add('open');
}

function closeWaitlistAssign() {
  document.getElementById('waitlistAssignModal')?.classList.remove('open');
  wlPick = [];
}

async function submitWaitlistAssign() {
  const ids = (document.getElementById('wlSeatIds').value || '').split(',').map((s) => s.trim()).filter(Boolean);
  const name = document.getElementById('wlName').value.trim();
  const email = document.getElementById('wlEmail').value.trim();
  const phone = document.getElementById('wlPhone').value.trim();
  const partyType = document.getElementById('wlParty').value;
  const spouse = document.getElementById('wlSpouse').value.trim();
  if (!ids.length) return alert('Pick a seat on the waitlist chart first.');
  if (!name || (!email && !phone)) return alert('Add a name and an email or phone.');
  try {
    const result = await RESeating.claimSeats(ids, {
      name, email, phone, partyType, spouse: spouse || null, map: 'waitlist'
    });
    if (!result.ok) {
      alert('Those waitlist seats were just taken. Refresh and try another chair.');
      closeWaitlistAssign();
      return renderWaitlistView();
    }
    const existingKey = (document.getElementById('wlExistingKey')?.value || '').trim();
    const seatPatch = {
      seats: ids,
      seatLabel: RESeating.seatLabel(ids),
      waitlist: true,
      waitlistHold: true,
      confirmationNote: RESeating.WAITLIST_CONFIRM,
      partyType,
      spouse: spouse || null
    };
    if (existingKey && window.RESharedOrders?.updateSharedOrder) {
      const loc = typeof getReportLoc === 'function' ? getReportLoc() : { id: 'kennedy-school-bbq', slug: 'kennedy-school-bbq', storageKey: 'kennedyschool_bbq_prefs_v5' };
      const updated = await RESharedOrders.updateSharedOrder(loc, existingKey, seatPatch);
      if (!updated.ok) {
        alert('Seat is held on the chart, but the original form row could not be updated. They will still show on the waitlist chart — no extra text was sent.');
      }
    } else {
      const order = {
        id: Date.now(),
        locationId: 'kennedy-school-bbq',
        name, email, phone,
        form: 'host-waitlist',
        partyType,
        partySize: ids.length,
        spouse: spouse || null,
        ...seatPatch,
        ts: new Date().toISOString(),
        location: 'kennedy-school-bbq',
        source: 'retirement-everest-host'
      };
      if (window.RESharedOrders?.appendSharedOrder) {
        await RESharedOrders.appendSharedOrder(order);
      }
      await RESeating.pushSeatEventToGHL({
        event: 'waitlist_hold',
        form: 'host-waitlist',
        name, email, phone,
        seats: ids.join(', '),
        seatLabel: order.seatLabel,
        waitlist: 'yes',
        waitlistHold: 'yes',
        confirmationNote: RESeating.WAITLIST_CONFIRM,
        tag: 're-waitlist',
        status: 'waitlist',
        pipelineStage: 'Waitlist',
        preferencesSummary: `WAITLIST HOLD (host)\n${name}\n${order.seatLabel}\n${RESeating.WAITLIST_CONFIRM}`
      });
    }
  } catch (e) {
    alert('Waitlist save failed: ' + e);
  }
  document.getElementById('wlName').value = '';
  document.getElementById('wlEmail').value = '';
  document.getElementById('wlPhone').value = '';
  document.getElementById('wlSpouse').value = '';
  const existingKeyEl = document.getElementById('wlExistingKey');
  const existingSel = document.getElementById('wlExisting');
  if (existingKeyEl) existingKeyEl.value = '';
  if (existingSel) existingSel.value = '';
  closeWaitlistAssign();
  renderWaitlistView();
}

/* ================= Gym backup (40 × 60 ft, 12 × 6) ================= */

async function renderGymView() {
  const body = document.getElementById('gym-body');
  if (!body || !window.RESeating) return;
  body.innerHTML = '<div class="empty">Loading gym backup chart…</div>';
  let st;
  try {
    st = await RESeating.fetchState({ healRemote: false, orders: [] });
  } catch (e) {
    st = RESeating.emptyState();
    st.offline = true;
  }
  const gym = st.gym || { seats: {}, couples: [] };
  if (!Object.keys(gym.seats || {}).length && Object.keys(st.seats || {}).length) {
    try {
      st = await RESeating.applyGymTransfer(st);
    } catch (e) {
      console.warn('[RE] gym auto-transfer failed', e);
    }
  }
  const claims = Object.values((st.gym && st.gym.seats) || {}).sort((a, b) =>
    String(a.seatId).localeCompare(String(b.seatId))
  );
  const total = RESeating.gymAllSeats().length;
  const rows = claims.map((c) => `
    <tr>
      <td style="font-weight:700;color:var(--accent)">${esc(c.seatId)}</td>
      <td>${esc(c.person || c.name)}</td>
      <td style="font-size:0.78rem;color:var(--muted)">${esc(c.fromSeat || '—')}</td>
      <td>${esc(c.partyType === 'couple' ? `Couple${c.spouse ? ` · ${c.spouse}` : ''}` : 'Solo')}</td>
      <td style="font-size:0.78rem;color:var(--muted)">${esc([c.email, c.phone].filter(Boolean).join(' · '))}</td>
    </tr>`).join('');
  const when = st.gym && st.gym.transferredAt
    ? new Date(st.gym.transferredAt).toLocaleString()
    : 'not yet';
  body.innerHTML = `
    <div class="rate-note" style="margin-top:8px">
      <strong>Backup only.</strong> McMenamins Gymnasium is 40 × 60 ft (2,400 sq ft) — from the Kennedy School color map / venue sheet.
      Twelve 60″ rounds as 6-tops (72 seats). Jordan confirmed guests first, then waitlist overflow (gold chairs). This does <em>not</em> change Jordan or waitlist reservations.
    </div>
    <h3 style="font-family:var(--heading-font);color:var(--accent);margin-bottom:4px">Gymnasium backup layout</h3>
    <div style="color:var(--muted);font-size:0.85rem;margin-bottom:10px">
      <strong style="color:var(--text)">${claims.length}/${total}</strong> placed · last sync ${esc(when)}
      <button class="btn-sm btn-accent" style="margin-left:8px" id="btnGymSync">Place Jordan + waitlist here</button>
      <button class="btn-sm" style="margin-left:6px" id="btnGymRefresh">↻ Refresh</button>
      <button class="btn-sm" style="margin-left:6px" id="btnGymToJordan">← Jordan Room</button>
    </div>
    <div class="card-box" style="padding:10px;min-height:280px">${RESeating.renderMapSVG(st, { mode: 'host', layout: 'gym' })}${RESeating.legendHTML('host')}</div>
    ${claims.length ? `
      <div class="section-gap"></div>
      <h4 style="color:var(--text);margin-bottom:8px">Guests on gym chart</h4>
      <div class="card-box" style="overflow-x:auto"><table class="data-table" style="width:100%;font-size:0.85rem">
        <thead><tr><th>Gym seat</th><th>Guest</th><th>From</th><th>Party</th><th>Contact</th></tr></thead>
        <tbody>${rows}</tbody></table></div>` : '<p style="color:var(--muted);font-size:0.85rem">No guests placed yet — tap <strong>Place Jordan + waitlist here</strong>.</p>'}`;

  body.querySelector('#btnGymRefresh')?.addEventListener('click', () => {
    if (window.RESharedStore?.memInvalidate) RESharedStore.memInvalidate();
    renderGymView();
  });
  body.querySelector('#btnGymToJordan')?.addEventListener('click', () => switchHostView('location'));
  body.querySelector('#btnGymSync')?.addEventListener('click', async () => {
    if (!confirm('Rebuild the gym backup from Jordan confirmed guests plus the waitlist? This only updates the gym chart.')) return;
    const btn = body.querySelector('#btnGymSync');
    if (btn) { btn.disabled = true; btn.textContent = 'Placing…'; }
    try {
      await RESeating.applyGymTransfer();
    } catch (e) {
      alert('Gym sync failed: ' + e);
    }
    renderGymView();
  });
}