const RE_EVENTS_KEY = 're_events_v1';
const RE_ROOM_RATES_KEY = 're_room_rates_v1';

function fmt(n) { return '$' + Number(n).toFixed(2); }

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function getAllLocations() {
  return Object.values(RETIREMENT_EVEREST.locations);
}

/** Locations shown in host planner / overview / dropdowns (hide guest-only package pages) */
function getPlannerLocations() {
  return getAllLocations().filter(l => !l.guestOnly && !l.hideFromPlanner);
}

function getOrdersForLocation(loc) {
  // Prefer locked package page storage when venue has guestSlug (e.g. Kennedy → BBQ)
  let key = loc.storageKey;
  if (loc.guestSlug && RETIREMENT_EVEREST?.locations?.[loc.guestSlug]) {
    key = RETIREMENT_EVEREST.locations[loc.guestSlug].storageKey || key;
  }
  return JSON.parse(localStorage.getItem(key) || '[]');
}

/** Async: merge remote shared preference log into this browser (for overview counts) */
async function syncOrdersForLocation(loc) {
  const reportLoc =
    loc.guestSlug && RETIREMENT_EVEREST?.locations?.[loc.guestSlug]
      ? RETIREMENT_EVEREST.locations[loc.guestSlug]
      : loc;
  if (window.RESharedOrders?.loadOrdersForLocation) {
    try {
      return await RESharedOrders.loadOrdersForLocation(reportLoc);
    } catch (_) {}
  }
  return getOrdersForLocation(loc);
}

function getRoomRates() {
  return JSON.parse(localStorage.getItem(RE_ROOM_RATES_KEY) || '{}');
}

function saveRoomRates(rates) {
  localStorage.setItem(RE_ROOM_RATES_KEY, JSON.stringify(rates));
}

function getEventMeta() {
  return JSON.parse(localStorage.getItem(RE_EVENTS_KEY) || '{}');
}

function saveEventMeta(meta) {
  localStorage.setItem(RE_EVENTS_KEY, JSON.stringify(meta));
}

/**
 * Events live in browser localStorage (not git). Without a seed:
 * - new browser / cleared site data / different origin → "no events"
 * - date saved on guest-only slug (kennedy-school-bbq) → hidden after hideFromPlanner
 * Call once on host init. Safe to re-run.
 */
function ensureEventDefaults() {
  const meta = getEventMeta();
  let changed = false;
  const locs = RETIREMENT_EVEREST?.locations || {};

  // Migrate guest-only package page events onto the parent planner venue
  Object.values(locs).forEach((loc) => {
    if (!loc?.guestSlug) return;
    const child = meta[loc.guestSlug];
    const parent = meta[loc.slug];
    if (child?.eventDate && !parent?.eventDate) {
      meta[loc.slug] = { ...(parent || {}), ...child };
      changed = true;
    }
  });

  // Seed any location that declares defaultEvent and has no saved date yet
  Object.values(locs).forEach((loc) => {
    if (!loc?.defaultEvent?.eventDate) return;
    if (meta[loc.slug]?.eventDate) return;
    meta[loc.slug] = {
      ...(meta[loc.slug] || {}),
      eventDate: loc.defaultEvent.eventDate,
      doorsTime: loc.defaultEvent.doorsTime || '',
      showTime: loc.defaultEvent.showTime || '',
      guestGoal: loc.defaultEvent.guestGoal ?? null,
      notes: loc.defaultEvent.notes || '',
      checklist: meta[loc.slug]?.checklist || []
    };
    changed = true;
  });

  if (changed) saveEventMeta(meta);
  return meta;
}

function getLocationEvent(slug) {
  return getEventMeta()[slug] || null;
}

function setLocationEvent(slug, patch) {
  const meta = getEventMeta();
  meta[slug] = { ...(meta[slug] || {}), ...patch };
  saveEventMeta(meta);
  return meta[slug];
}

function countGuestsForLocation(loc, orders) {
  if (loc.type === 'retreat') {
    return orders.reduce((sum, o) => sum + (o.partySize || 1), 0);
  }
  return orders.length;
}

function estimateCostForLocation(loc, orders, roomRates) {
  if (!orders.length) return 0;
  if (loc.type === 'screening') {
    const prices = {};
    loc.menus.entrees.forEach(e => { prices[e.id] = e.price; });
    (loc.menus.drinks || []).forEach(d => { prices[d.id] = d.price; });
    return orders.reduce((s, o) =>
      s + (prices[o.entreeId] || o.entreePrice || 66) + (prices[o.drinkId] || o.drinkPrice || 0), 0);
  }
  if (loc.type === 'preorder') {
    const prices = {};
    [...loc.menus.starters, ...loc.menus.mains, ...loc.menus.drinks].forEach(i => { prices[i.id] = i.price; });
    const sub = orders.reduce((s, o) =>
      s + (prices[o.starterId] || o.starterPrice || 0) + (prices[o.mainId] || o.mainPrice || 0) + (prices[o.drinkId] || o.drinkPrice || 0), 0);
    return sub * 1.2;
  }
  if (loc.type === 'buffet') {
    const reportLoc = (loc.guestSlug && RETIREMENT_EVEREST?.locations?.[loc.guestSlug])
      ? RETIREMENT_EVEREST.locations[loc.guestSlug]
      : loc;
    // Locked BBQ menu pick: package price × guests + drink
    if (reportLoc.bbqMenuPick) {
      const n = orders.length || 1;
      const pkg = reportLoc.menus.buffetPrice || 63.50;
      const drinkAvg = orders.reduce((s, o) => s + (o.drinkPrice || 0), 0) / n;
      return n * (pkg + drinkAvg) * 1.21;
    }
    // Group buffet poll: leading package price × guests + drink prefs + optional apps if majority want them
    const prices = {};
    (reportLoc.menus.buffets || []).forEach(b => { prices[b.id] = b.price; });
    (reportLoc.menus.starters || []).forEach(s => { prices[s.id] = s.price; });
    (reportLoc.menus.drinks || []).forEach(d => { prices[d.id] = d.price; });
    const n = orders.length || 1;
    const buffetAvg = orders.reduce((s, o) => s + (prices[o.buffetId] || o.buffetPrice || 64), 0) / n;
    const drinkAvg = orders.reduce((s, o) => s + (prices[o.drinkId] || o.drinkPrice || 0), 0) / n;
    const starterVotes = orders.filter(o => o.starterId && o.starterId !== 'a-skip' && o.starterId !== 'st-skip');
    const starterAvg = starterVotes.length
      ? starterVotes.reduce((s, o) => s + (prices[o.starterId] || o.starterPrice || 0), 0) / starterVotes.length
      : 0;
    const appsOn = starterVotes.length > orders.length / 2;
    return n * (buffetAvg + drinkAvg + (appsOn ? starterAvg : 0)) * 1.21;
  }
  const rate = roomRates[loc.slug] || loc.avgRoomRate || 150;
  const roomCost = orders.length * rate;
  const dinnerCost = orders.reduce((s, o) => {
    const people = o.people || [{ dinnerPrice: o.dinnerPrice || 0 }];
    return s + people.reduce((ps, p) => ps + (p.dinnerPrice || 0), 0);
  }, 0);
  return roomCost + dinnerCost;
}

function checklistProgress(checklist) {
  if (!checklist?.length) return 0;
  const done = checklist.filter(i => i.done).length;
  return Math.round((done / checklist.length) * 100);
}

function formatEventDate(dateStr) {
  if (!dateStr) return 'Not scheduled';
  const d = new Date(dateStr + 'T12:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function daysUntil(dateStr) {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr + 'T12:00:00');
  return Math.ceil((target - today) / 86400000);
}

function resolveGuestSlug(slug) {
  const loc = RETIREMENT_EVEREST?.locations?.[slug];
  return (loc && loc.guestSlug) ? loc.guestSlug : slug;
}

function guestLink(slug) {
  const base = location.href.replace(/[^/]*$/, '');
  return `${base}guest.html?location=${resolveGuestSlug(slug)}`;
}