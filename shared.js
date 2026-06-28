const RE_EVENTS_KEY = 're_events_v1';
const RE_ROOM_RATES_KEY = 're_room_rates_v1';

function fmt(n) { return '$' + Number(n).toFixed(2); }

function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function getAllLocations() {
  return Object.values(RETIREMENT_EVEREST.locations);
}

function getOrdersForLocation(loc) {
  return JSON.parse(localStorage.getItem(loc.storageKey) || '[]');
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
    return orders.reduce((s, o) => s + (prices[o.entreeId] || o.entreePrice || 66), 0);
  }
  if (loc.type === 'preorder') {
    const prices = {};
    [...loc.menus.starters, ...loc.menus.mains, ...loc.menus.drinks].forEach(i => { prices[i.id] = i.price; });
    const sub = orders.reduce((s, o) =>
      s + (prices[o.starterId] || o.starterPrice || 0) + (prices[o.mainId] || o.mainPrice || 0) + (prices[o.drinkId] || o.drinkPrice || 0), 0);
    return sub * 1.2;
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

function guestLink(slug) {
  const base = location.href.replace(/[^/]*$/, '');
  return `${base}guest.html?location=${slug}`;
}