/**
 * Command-center contacts directory.
 * Merges: guest preference submits, invite/outreach queue, manual host-added people.
 * Quick Email / Text runs through HAG GHL webhook (not device Mail/Messages).
 */
const RE_CONTACTS_KEY = 're_contacts_v1';

function normalizePhone(p) {
  return String(p || '').replace(/\D/g, '');
}

function normalizeEmail(e) {
  return String(e || '').trim().toLowerCase();
}

function contactMatchKey(c) {
  const email = normalizeEmail(c.email);
  if (email) return 'e:' + email;
  const phone = normalizePhone(c.phone);
  if (phone.length >= 10) return 'p:' + phone.slice(-10);
  const name = String(c.name || [c.firstName, c.lastName].filter(Boolean).join(' ') || '')
    .trim()
    .toLowerCase();
  const loc = c.locationSlug || '';
  if (name) return 'n:' + name + '|' + loc;
  return 'id:' + (c.id || Math.random().toString(36).slice(2));
}

function splitContactName(full) {
  const parts = String(full || '').trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return { firstName: '', lastName: '' };
  if (parts.length === 1) return { firstName: parts[0], lastName: '' };
  return { firstName: parts[0], lastName: parts.slice(1).join(' ') };
}

function getManualContacts() {
  try {
    const list = JSON.parse(localStorage.getItem(RE_CONTACTS_KEY) || '[]');
    return Array.isArray(list) ? list : [];
  } catch {
    return [];
  }
}

function saveManualContacts(list) {
  localStorage.setItem(RE_CONTACTS_KEY, JSON.stringify((list || []).slice(0, 1000)));
  return list;
}

/** Upsert a host-owned contact record (manual fields, notes, position). */
function upsertManualContact(partial) {
  const list = getManualContacts();
  const now = new Date().toISOString();
  const incoming = { ...partial };
  if (!incoming.id) incoming.id = 'c_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7);
  if (!incoming.name) {
    incoming.name = [incoming.firstName, incoming.lastName].filter(Boolean).join(' ').trim();
  }
  if (!incoming.firstName && incoming.name) {
    const sp = splitContactName(incoming.name);
    incoming.firstName = sp.firstName;
    incoming.lastName = sp.lastName;
  }
  const key = contactMatchKey(incoming);
  const idx = list.findIndex((c) => contactMatchKey(c) === key || c.id === incoming.id);
  if (idx >= 0) {
    list[idx] = {
      ...list[idx],
      ...incoming,
      sources: uniqueSources([...(list[idx].sources || []), ...(incoming.sources || ['manual'])]),
      updatedAt: now,
      createdAt: list[idx].createdAt || now
    };
    saveManualContacts(list);
    return list[idx];
  }
  const row = {
    status: 'talking',
    sources: ['manual'],
    preferences: null,
    notes: '',
    position: '',
    company: '',
    ...incoming,
    createdAt: now,
    updatedAt: now
  };
  list.unshift(row);
  saveManualContacts(list);
  return row;
}

function uniqueSources(arr) {
  return [...new Set((arr || []).filter(Boolean))];
}

function prefsFromOrder(o) {
  if (!o) return null;
  return {
    buffet: o.buffet || '',
    sides: Array.isArray(o.sides) ? o.sides : o.sides ? [o.sides] : o.starter ? [o.starter] : [],
    entree: o.entree || o.main || o.dinner || '',
    dessert: o.dessert || '',
    drink: o.drink || '',
    drinkCat: o.drinkCat || '',
    notes: o.notes || '',
    partyType: o.partyType || '',
    spouse: o.spouse || '',
    seats: Array.isArray(o.seats) ? o.seats : [],
    seatLabel: o.seatLabel || '',
    salad: o.salad || '',
    starter: o.starter || '',
    main: o.main || '',
    room: o.room || '',
    partySize: o.partySize || '',
    preferencesSummary: o.preferencesSummary || buildPrefsSummary(o),
    submittedAt: o.ts || ''
  };
}

function buildPrefsSummary(o) {
  const lines = [
    o.buffet ? `Dinner: ${o.buffet}` : '',
    o.sides?.length ? `Sides: ${Array.isArray(o.sides) ? o.sides.join(' · ') : o.sides}` : o.starter ? `Starter: ${o.starter}` : '',
    o.entree || o.main || o.dinner ? `Entrée: ${o.entree || o.main || o.dinner}` : '',
    o.dessert ? `Dessert: ${o.dessert}` : '',
    o.drink ? `Drink: ${o.drink}${o.drinkCat ? ` (${o.drinkCat})` : ''}` : '',
    o.salad ? `Salad: ${o.salad}` : '',
    o.room ? `Room: ${o.room}` : '',
    o.partyType === 'couple' ? `Party: Couple${o.spouse ? ` — with ${o.spouse}` : ''}` : o.partyType ? 'Party: Solo' : '',
    o.seatLabel ? `Seats: ${o.seatLabel}` : '',
    o.notes ? `Notes: ${o.notes}` : ''
  ].filter(Boolean);
  return lines.join('\n');
}

function contactFromOrder(o) {
  const locId = o.locationId || o.location || '';
  const loc =
    (typeof RETIREMENT_EVEREST !== 'undefined' &&
      (RETIREMENT_EVEREST.locations[locId] ||
        Object.values(RETIREMENT_EVEREST.locations || {}).find(
          (l) => l.id === locId || l.slug === locId || l.storageKey === o.storageKey
        ))) ||
    null;
  const sp = splitContactName(o.name);
  return {
    id: 'ord_' + (o.id || contactMatchKey({ email: o.email, phone: o.phone, name: o.name })),
    firstName: sp.firstName,
    lastName: sp.lastName,
    name: o.name || '',
    email: o.email || '',
    phone: o.phone || '',
    position: o.position || o.title || '',
    company: o.company || '',
    locationSlug: loc?.slug || locId,
    locationName: loc?.shortName || loc?.name || locId || '',
    sources: ['guest'],
    status: 'registered',
    preferences: prefsFromOrder(o),
    notes: '',
    orderId: o.id,
    createdAt: o.ts || new Date().toISOString(),
    updatedAt: o.ts || new Date().toISOString()
  };
}

function contactFromInvite(inv) {
  const name = [inv.firstName, inv.lastName].filter(Boolean).join(' ').trim() || inv.name || '';
  return {
    id: 'inv_' + (inv.id || contactMatchKey(inv)),
    firstName: inv.firstName || splitContactName(name).firstName,
    lastName: inv.lastName || splitContactName(name).lastName,
    name,
    email: inv.email || '',
    phone: inv.phone || '',
    position: inv.position || '',
    company: inv.company || '',
    locationSlug: inv.locationSlug || '',
    locationName: inv.locationName || '',
    sources: ['invite'],
    status: inv.status === 'email-opened' || inv.status === 'sms-opened' || inv.status === 'queued'
      ? 'invited'
      : 'invited',
    preferences: null,
    notes: inv.message ? 'Invite sent' : '',
    inviteId: inv.id,
    lastContactAt: inv.ts || '',
    lastConnectChannel:
      inv.status === 'sms-opened' ? 'sms' : inv.status === 'email-opened' ? 'email' : '',
    createdAt: inv.ts || new Date().toISOString(),
    updatedAt: inv.ts || new Date().toISOString()
  };
}

function mergeContactRecords(a, b) {
  const sources = uniqueSources([...(a.sources || []), ...(b.sources || [])]);
  let status = a.status || b.status || 'prospect';
  // registered > invited > talking > prospect
  const rank = { registered: 4, invited: 3, talking: 2, prospect: 1 };
  if ((rank[b.status] || 0) > (rank[status] || 0)) status = b.status;
  if (sources.includes('guest')) status = 'registered';

  const prefs = a.preferences?.preferencesSummary
    ? a.preferences
    : b.preferences?.preferencesSummary
      ? b.preferences
      : a.preferences || b.preferences || null;

  return {
    ...a,
    ...b,
    id: a.id?.startsWith('c_') ? a.id : b.id?.startsWith('c_') ? b.id : a.id || b.id,
    firstName: b.firstName || a.firstName || '',
    lastName: b.lastName || a.lastName || '',
    name: b.name || a.name || [b.firstName || a.firstName, b.lastName || a.lastName].filter(Boolean).join(' '),
    email: b.email || a.email || '',
    phone: b.phone || a.phone || '',
    position: b.position || a.position || '',
    company: b.company || a.company || '',
    locationSlug: b.locationSlug || a.locationSlug || '',
    locationName: b.locationName || a.locationName || '',
    notes: [a.notes, b.notes].filter(Boolean).join('\n').trim() || '',
    sources,
    status,
    preferences: prefs,
    orderId: b.orderId || a.orderId,
    inviteId: b.inviteId || a.inviteId,
    lastContactAt: (b.lastContactAt || '') > (a.lastContactAt || '') ? b.lastContactAt : a.lastContactAt,
    lastConnectChannel: b.lastConnectChannel || a.lastConnectChannel || '',
    createdAt: (a.createdAt || '') < (b.createdAt || '') ? a.createdAt || b.createdAt : b.createdAt || a.createdAt,
    updatedAt: (b.updatedAt || '') > (a.updatedAt || '') ? b.updatedAt : a.updatedAt
  };
}

/** Collect every known order from all location storage keys (local after shared sync). */
function collectAllLocalOrders() {
  const locs = typeof getAllLocations === 'function' ? getAllLocations() : [];
  const byKey = new Map();
  const keyOf = (o) =>
    String(o.id || '') ||
    `${o.email || ''}|${o.phone || ''}|${o.ts || ''}|${o.name || ''}`;
  locs.forEach((loc) => {
    let orders = [];
    try {
      orders =
        typeof getOrdersForLocation === 'function'
          ? getOrdersForLocation(loc)
          : JSON.parse(localStorage.getItem(loc.storageKey) || '[]');
    } catch {
      orders = [];
    }
    (orders || []).forEach((o) => {
      if (!o || typeof o !== 'object') return;
      const k = keyOf(o);
      if (!byKey.has(k)) {
        byKey.set(k, { ...o, locationId: o.locationId || o.location || loc.id || loc.slug });
      }
    });
  });
  return [...byKey.values()];
}

/**
 * Full directory for UI: guests + invites + manual, deduped.
 */
function buildContactDirectory() {
  const map = new Map();

  const add = (rec) => {
    if (!rec) return;
    if (!rec.name && !rec.email && !rec.phone) return;
    const k = contactMatchKey(rec);
    if (map.has(k)) map.set(k, mergeContactRecords(map.get(k), rec));
    else map.set(k, rec);
  };

  collectAllLocalOrders().forEach((o) => add(contactFromOrder(o)));

  if (typeof getInviteQueue === 'function') {
    getInviteQueue().forEach((inv) => add(contactFromInvite(inv)));
  }

  getManualContacts().forEach((c) => add({ ...c, sources: uniqueSources([...(c.sources || []), 'manual']) }));

  return [...map.values()].sort((a, b) => {
    const ta = a.updatedAt || a.createdAt || '';
    const tb = b.updatedAt || b.createdAt || '';
    return String(tb).localeCompare(String(ta));
  });
}

/** Pull shared guest log into all location keys so contacts see multi-device submits. */
async function refreshContactsFromShared() {
  if (!window.RESharedOrders?.fetchSharedOrders) return collectAllLocalOrders();
  try {
    const remote = await RESharedOrders.fetchSharedOrders();
    const byLoc = new Map();
    (remote || []).forEach((o) => {
      const lid = o.locationId || o.location || '';
      if (!byLoc.has(lid)) byLoc.set(lid, []);
      byLoc.get(lid).push(o);
    });
    const locs = typeof getAllLocations === 'function' ? getAllLocations() : [];
    locs.forEach((loc) => {
      const reportLoc =
        loc.guestSlug && RETIREMENT_EVEREST?.locations?.[loc.guestSlug]
          ? RETIREMENT_EVEREST.locations[loc.guestSlug]
          : loc;
      const key = reportLoc.storageKey;
      if (!key) return;
      let local = [];
      try {
        local = JSON.parse(localStorage.getItem(key) || '[]');
      } catch {
        local = [];
      }
      const remoteFor =
        remote.filter(
          (o) =>
            !o.locationId ||
            o.locationId === reportLoc.id ||
            o.locationId === reportLoc.slug ||
            o.location === reportLoc.id ||
            o.location === reportLoc.slug ||
            (reportLoc.slug === 'kennedy-school-bbq' && o.locationId === 'kennedy-school') ||
            (reportLoc.slug === 'kennedy-school' &&
              (o.locationId === 'kennedy-school-bbq' || o.location === 'kennedy-school-bbq'))
        ) || [];
      if (window.RESharedOrders.mergeOrders) {
        const merged = RESharedOrders.mergeOrders(local, remoteFor);
        localStorage.setItem(key, JSON.stringify(merged));
      } else if (remoteFor.length) {
        localStorage.setItem(key, JSON.stringify(remoteFor));
      }
    });
    // Also dump any remote without matching location into a catch-all merge on first storage
    return remote;
  } catch (e) {
    console.warn('[RE] refreshContactsFromShared failed', e);
    return collectAllLocalOrders();
  }
}

/**
 * Push Email or SMS through HAG GHL inbound webhook.
 * GHL workflow must: Create/Update Contact → Send SMS or Send Email using {{message}}.
 */
async function pushQuickConnectToGHL({ contact, channel, message, subject }) {
  const cfg = typeof getIntegrations === 'function' ? getIntegrations() : {};
  const url = cfg.ghlWebhookUrl || (typeof RETIREMENT_EVEREST !== 'undefined' && RETIREMENT_EVEREST.ghlWebhookUrl);
  if (!url) throw new Error('HAG GHL webhook URL not configured. Open Outreach → Integrations.');

  const firstName = contact.firstName || splitContactName(contact.name).firstName;
  const lastName = contact.lastName || splitContactName(contact.name).lastName;
  const ch = channel === 'sms' ? 'sms' : 'email';
  const prefs = contact.preferences || {};
  const locFields =
    typeof buildGhlLocationFields === 'function'
      ? buildGhlLocationFields(contact.locationSlug, {
          locationName: contact.locationName,
          locationShort: contact.locationName
        })
      : {
          location: contact.locationSlug || '',
          locationSlug: contact.locationSlug || '',
          locationName: contact.locationName || '',
          locationShort: contact.locationName || '',
          eventLocation: contact.locationName || '',
          reEventLocation: contact.locationName || '',
          re_event_location: contact.locationName || '',
          reEventLocationSlug: contact.locationSlug || '',
          re_event_location_slug: contact.locationSlug || ''
        };
  const eventLabel = locFields.re_event_location || locFields.eventLocation || contact.locationName || 'update';

  const payload = {
    event: 'host_quick_connect',
    channel: ch,
    sendSms: ch === 'sms' ? 'yes' : 'no',
    sendEmail: ch === 'email' ? 'yes' : 'no',
    firstName,
    lastName,
    name: contact.name || [firstName, lastName].filter(Boolean).join(' '),
    email: contact.email || '',
    phone: contact.phone || '',
    position: contact.position || '',
    company: contact.company || '',
    title: contact.position || '',
    subject: subject || `Retirement Everest — ${eventLabel}`,
    message: message || '',
    sms: ch === 'sms' ? message || '' : '',
    emailBody: ch === 'email' ? message || '' : '',
    ...locFields,
    status: contact.status || '',
    contactSource: (contact.sources || []).join(','),
    preferencesSummary: prefs.preferencesSummary || '',
    buffet: prefs.buffet || '',
    entree: prefs.entree || '',
    drink: prefs.drink || '',
    brand: cfg.ghlBrand || 'HAG',
    ghlLocationId: cfg.ghlLocationId || '24UgqDfh5TcJs5IPnA25',
    source: 'retirement-everest-contacts',
    submittedAt: new Date().toISOString()
  };

  const res = await fetch(url, {
    method: 'POST',
    mode: 'cors',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload)
  });
  const text = await res.text().catch(() => '');
  if (!res.ok || (/invalid data|error/i.test(text) && !/success/i.test(text))) {
    throw new Error(text || `GHL webhook HTTP ${res.status}`);
  }

  // Log last contact on manual record so directory shows activity
  upsertManualContact({
    id: contact.id?.startsWith('c_') ? contact.id : undefined,
    firstName,
    lastName,
    name: payload.name,
    email: contact.email,
    phone: contact.phone,
    position: contact.position,
    company: contact.company,
    locationSlug: contact.locationSlug,
    locationName: contact.locationName,
    sources: contact.sources || ['manual'],
    status: contact.status === 'registered' ? 'registered' : contact.status || 'talking',
    lastContactAt: new Date().toISOString(),
    lastConnectChannel: ch,
    notes: contact.notes || ''
  });

  return { ok: true, body: text, payload };
}

/** Keep contacts directory in sync when host sends an invite. */
function recordInviteAsContact(inv) {
  if (!inv) return;
  upsertManualContact({
    ...contactFromInvite(inv),
    id: undefined, // let match key merge
    sources: ['invite'],
    status: 'invited'
  });
}

// Expose for host UI
window.REContacts = {
  buildContactDirectory,
  refreshContactsFromShared,
  upsertManualContact,
  getManualContacts,
  pushQuickConnectToGHL,
  recordInviteAsContact,
  contactMatchKey,
  splitContactName,
  prefsFromOrder,
  buildPrefsSummary
};
