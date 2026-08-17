const RE_INTEGRATIONS_KEY = 're_integrations_v1';
const RE_INVITES_KEY = 're_invites_v1';
const RE_MARKETING_SEL_KEY = 're_marketing_selections_v1';

const DEFAULT_INTEGRATIONS = {
  /* HAG (Harris Assurance Group) location 24UgqDfh5TcJs5IPnA25 */
  ghlWebhookUrl: 'https://services.leadconnectorhq.com/hooks/24UgqDfh5TcJs5IPnA25/webhook-trigger/bfe13f27-a90b-46ec-ae0c-7744bcec2f8d',
  ghlLocationId: '24UgqDfh5TcJs5IPnA25',
  ghlBrand: 'HAG',
  /* Same Apps Script as shared store (v4+) also accepts Sheets export payloads */
  googleSheetsWebhookUrl: 'https://script.google.com/macros/s/AKfycbxrlFuH-he19CfpJOlOJL1fKCg3ud5VDx58ZsarHLwEcrArxTyxznPi2nomkyN7sytN/exec',
  googleSheetId: '1GRhsaSpJzYpYMtatuWtWKDQOSTvB1-5LUZLVGtFQH98',
  defaultSheetTab: 'Orders',
  /* Durable multi-device seats + prefs — Google Apps Script web app /exec URL */
  sharedStoreUrl: 'https://script.google.com/macros/s/AKfycbxrlFuH-he19CfpJOlOJL1fKCg3ud5VDx58ZsarHLwEcrArxTyxznPi2nomkyN7sytN/exec',
  organizerName: 'Johnny Harris',
  organizerEmail: 'johnny@blacksandcapitalgroup.com',
  organizerPhone: '9715702438'
};

function getIntegrations() {
  return { ...DEFAULT_INTEGRATIONS, ...JSON.parse(localStorage.getItem(RE_INTEGRATIONS_KEY) || '{}') };
}

function saveIntegrations(patch) {
  const next = { ...getIntegrations(), ...patch };
  localStorage.setItem(RE_INTEGRATIONS_KEY, JSON.stringify(next));
  return next;
}

function getInviteQueue() {
  return JSON.parse(localStorage.getItem(RE_INVITES_KEY) || '[]');
}

function saveInvite(invite) {
  const queue = getInviteQueue();
  queue.unshift(invite);
  localStorage.setItem(RE_INVITES_KEY, JSON.stringify(queue.slice(0, 500)));
  return invite;
}

function getMarketingSelections() {
  return JSON.parse(localStorage.getItem(RE_MARKETING_SEL_KEY) || '{}');
}

function toggleMarketingSelection(slug, assetId, on) {
  const sel = getMarketingSelections();
  if (!sel[slug]) sel[slug] = [];
  const set = new Set(sel[slug]);
  if (on) set.add(assetId);
  else set.delete(assetId);
  sel[slug] = [...set];
  localStorage.setItem(RE_MARKETING_SEL_KEY, JSON.stringify(sel));
  return sel[slug];
}

function absoluteGuestLink(slug) {
  const base = location.href.replace(/[^/]*$/, '');
  const guestSlug = (typeof resolveGuestSlug === 'function') ? resolveGuestSlug(slug) : slug;
  return `${base}guest.html?location=${guestSlug}`;
}

function buildInviteMessage(loc, guestLink, event, guestName) {
  const cfg = getIntegrations();
  const name = guestName ? guestName.split(' ')[0] : 'there';
  const dateLine = event?.eventDate ? formatEventDate(event.eventDate) : 'an upcoming private evening';
  const timeLine = event?.showTime
    ? ` Doors ${event.doorsTime || 'TBD'}${event.showTime ? `, film ${event.showTime}` : ''}.`
    : '';
  const dinnerNote = loc.guestSlug || loc.bbqMenuPick
    ? 'Dinner is the Backyard BBQ buffet (complimentary). Use the link to see what’s being served, tell us any dietary restrictions, and whether you’d like an adult drink:'
    : 'Dinner is complimentary — open the link to share your meal preferences:';
  const sign = cfg.organizerName || 'Johnny Harris';
  const phone = cfg.organizerPhone ? `\n${cfg.organizerPhone.replace(/(\d{3})(\d{3})(\d{4})/, '$1-$2-$3')}` : '';
  return `Hi ${name},

You're invited to a private screening of Retirement Everest at ${loc.name} (${loc.city}) on ${dateLine}.${timeLine}

${dinnerNote}
${guestLink}

Questions? Just reply or text.${phone}

— ${sign}`;
}

function buildInviteSms(loc, guestLink, event, guestName) {
  const cfg = getIntegrations();
  const name = guestName ? guestName.split(' ')[0] : 'there';
  const dateLine = event?.eventDate ? formatEventDate(event.eventDate) : 'soon';
  const sign = cfg.organizerName || 'Johnny';
  return `Hi ${name} — you're invited to Retirement Everest at ${loc.shortName} on ${dateLine}. Dinner included (Backyard BBQ). Share preferences here: ${guestLink} — ${sign}`;
}

function exportReportLoc(loc) {
  if (loc?.guestSlug && RETIREMENT_EVEREST?.locations?.[loc.guestSlug]) {
    return RETIREMENT_EVEREST.locations[loc.guestSlug];
  }
  return loc;
}

function exportStatus(o) {
  if (o.waitlist || o.waitlistHold) return 'Waitlist hold';
  if (o.seatLabel || (Array.isArray(o.seats) && o.seats.length)) return 'Seated';
  if (o.seatAccommodation) return 'Needs arranging';
  return 'Preferences only';
}

function exportDrinkLabel(o) {
  if (o.drinkCat === 'Adult' || o.drinkId === 'd-adult') return 'Yes — adult drink';
  if (o.drink || o.drinkId || o.drinkCat) return 'No adult drink (coffee/tea/water)';
  return '';
}

function exportWhen(o) {
  if (!o?.ts && !o?.claimedAt) return '';
  const d = new Date(o.ts || o.claimedAt);
  return Number.isNaN(d.getTime()) ? String(o.ts || o.claimedAt) : d.toLocaleString();
}

function exportParty(o) {
  if (o.joinedPartner) return `Joined · ${o.linkedPartnerName || o.spouse || 'partner'}`;
  if (o.partyType === 'couple' || (o.partySize && o.partySize > 1)) {
    return `Couple${o.spouse ? ` · ${o.spouse}` : ''}`;
  }
  return 'Solo';
}

function isBbqExport(loc) {
  const report = exportReportLoc(loc);
  return !!(report?.bbqMenuPick || loc?.bbqMenuPick);
}

function buildExportRows(loc, orders, type) {
  const reportLoc = exportReportLoc(loc);
  const list = Array.isArray(orders) ? orders : [];
  const evSlug = loc?.guestOnly ? (Object.values(RETIREMENT_EVEREST?.locations || {}).find((l) => l.guestSlug === loc.slug)?.slug || loc.slug) : loc.slug;
  const ev = typeof getLocationEvent === 'function' ? getLocationEvent(evSlug) || getLocationEvent(loc.slug) : null;

  if (type === 'guest-list') {
    return [
      ['Location', 'Name', 'Email', 'Phone', 'Status', 'Seats', 'Party', 'Spouse / guest', 'Adult drink', 'Dietary notes', 'Time'],
      ...list.map((o) => [
        loc.shortName || reportLoc.shortName || '',
        o.name || '',
        o.email || '',
        o.phone || '',
        exportStatus(o),
        o.seatLabel || (Array.isArray(o.seats) ? o.seats.join(' ') : ''),
        exportParty(o),
        o.spouse || o.linkedPartnerName || '',
        exportDrinkLabel(o),
        o.notes || (o.dietHasRestrictions ? 'Restriction noted' : ''),
        exportWhen(o)
      ])
    ];
  }

  if (type === 'waitlist') {
    const holds = list.filter((o) => o.waitlist || o.waitlistHold);
    return [
      ['#', 'Name', 'Email', 'Phone', 'Waitlist seat', 'Party', 'Spouse / guest', 'Dietary notes', 'Claimed', 'Source'],
      ...holds.map((o, i) => [
        i + 1,
        o.name || '',
        o.email || '',
        o.phone || '',
        o.seatLabel || (Array.isArray(o.seats) ? o.seats.join(' ') : ''),
        exportParty(o),
        o.spouse || '',
        o.notes || '',
        exportWhen(o),
        o.source || o.form || ''
      ])
    ];
  }

  if (type === 'kitchen') {
    return [
      ['Name', 'Seats', 'Status', 'Adult drink', 'Dietary notes', 'Restrictions?', 'Phone'],
      ...list.map((o) => [
        o.name || '',
        o.seatLabel || (Array.isArray(o.seats) ? o.seats.join(' ') : ''),
        exportStatus(o),
        exportDrinkLabel(o),
        o.notes || '',
        o.dietHasRestrictions || (o.notes && !/^no restrictions$/i.test(String(o.notes).trim())) ? 'Yes' : 'No',
        o.phone || ''
      ])
    ];
  }

  if (type === 'cost-summary') {
    const roomRates = typeof getRoomRates === 'function' ? getRoomRates() : {};
    const costLoc = loc.guestSlug ? loc : (Object.values(RETIREMENT_EVEREST?.locations || {}).find((l) => l.guestSlug === loc.slug) || loc);
    const est = typeof estimateCostForLocation === 'function' ? estimateCostForLocation(costLoc, list, roomRates) : 0;
    const guests = typeof countGuestsForLocation === 'function' ? countGuestsForLocation(costLoc, list) : list.length;
    const seated = list.filter((o) => exportStatus(o) === 'Seated').length;
    const waitlist = list.filter((o) => o.waitlist || o.waitlistHold).length;
    const prefsOnly = list.length - seated - waitlist;
    const adult = list.filter((o) => o.drinkCat === 'Adult' || o.drinkId === 'd-adult').length;
    const soft = list.filter((o) => exportDrinkLabel(o).startsWith('No')).length;
    const diet = list.filter((o) => o.dietHasRestrictions || (o.notes && !/^no restrictions$/i.test(String(o.notes).trim()))).length;
    const pkg = reportLoc.menus?.buffetPrice || '';
    return [
      ['Field', 'Value'],
      ['Location', loc.name || reportLoc.name || ''],
      ['Venue', loc.venue || reportLoc.venue || ''],
      ['City', loc.city || ''],
      ['Event Type', loc.type || ''],
      ['Event Date', ev?.eventDate || loc.defaultEvent?.eventDate || 'Not set'],
      ['Doors / show', [ev?.doorsTime, ev?.showTime].filter(Boolean).join(' / ') || ''],
      ['Guest Goal', ev?.guestGoal ?? loc.defaultEvent?.guestGoal ?? ''],
      ['Preference submissions', list.length],
      ['Guest count (party-adjusted)', guests],
      ['Seated (confirmed chair)', seated],
      ['Waitlist holds', waitlist],
      ['Preferences only (no chair)', Math.max(0, prefsOnly)],
      ['Want adult drink', adult],
      ['No adult drink (coffee/tea/water)', soft],
      ['Dietary restrictions noted', diet],
      ['Dinner package $ / guest', pkg],
      ['Estimated cost', typeof est === 'number' ? est.toFixed(2) : est],
      ['Avg per guest', guests ? (est / guests).toFixed(2) : '0'],
      ['Exported', new Date().toLocaleString()]
    ];
  }

  if (isBbqExport(loc)) {
    return [
      ['#', 'Name', 'Email', 'Phone', 'Status', 'Seats', 'Party', 'Spouse / guest', 'Guest email', 'Adult drink', 'Dietary notes', 'Restrictions?', 'Waitlist', 'Joined partner', 'Linked partner', 'Time', 'Source'],
      ...list.map((o, i) => [
        i + 1,
        o.name || '',
        o.email || '',
        o.phone || '',
        exportStatus(o),
        o.seatLabel || (Array.isArray(o.seats) ? o.seats.join(' ') : ''),
        exportParty(o),
        o.spouse || '',
        o.linkedPartnerEmail || '',
        exportDrinkLabel(o),
        o.notes || '',
        o.dietHasRestrictions || (o.notes && !/^no restrictions$/i.test(String(o.notes).trim())) ? 'Yes' : 'No',
        o.waitlist || o.waitlistHold ? 'Yes' : 'No',
        o.joinedPartner ? 'Yes' : 'No',
        o.linkedPartnerName || '',
        exportWhen(o),
        o.source || o.form || ''
      ])
    ];
  }

  if (loc.type === 'screening') {
    const hasDrinks = !!loc.menus.drinks?.length;
    if (hasDrinks) {
      return [['#', 'Name', 'Salad', 'Entrée', 'Dessert', 'Drink', 'Drink $', 'Entrée $', 'Total $', 'Time'],
        ...orders.map((o, i) => [i + 1, o.name, o.salad, o.entree, o.dessert, o.drink || '—',
          o.drinkPrice || 0, o.entreePrice || '', (o.entreePrice || 0) + (o.drinkPrice || 0), new Date(o.ts).toLocaleString()])];
    }
    return [['#', 'Name', 'Salad', 'Entrée', 'Dessert', 'Price', 'Time'],
      ...orders.map((o, i) => [i + 1, o.name, o.salad, o.entree, o.dessert, o.entreePrice || '', new Date(o.ts).toLocaleString()])];
  }
  if (loc.type === 'preorder') {
    return [['#', 'Name', 'Arrival Bite', 'Bite $', 'Main', 'Main $', 'Drink', 'Drink $', 'Subtotal', 'Time'],
      ...orders.map((o, i) => [i + 1, o.name, o.starter || '—', o.starterPrice || 0, o.main, o.mainPrice || 0,
        o.drink, o.drinkPrice || 0, (o.starterPrice || 0) + (o.mainPrice || 0) + (o.drinkPrice || 0), new Date(o.ts).toLocaleString()])];
  }
  if (loc.type === 'buffet') {
    return [['#', 'Name', 'Preferred Buffet', 'Buffet $', 'Appetizer Preference', 'App $', 'Beverage', 'Drink $', 'Time'],
      ...orders.map((o, i) => [i + 1, o.name, o.buffet || '—', o.buffetPrice || 0, o.starter || '—', o.starterPrice || 0,
        o.drink || '—', o.drinkPrice || 0, new Date(o.ts).toLocaleString()])];
  }
  const rows = [['#', 'Name', 'Room', 'Party', 'Person', 'Dinner', 'Starter', 'Drink', 'Price', 'Time']];
  orders.forEach((o, i) => {
    const people = o.people || [{ dinner: o.dinner, dinnerPrice: o.dinnerPrice }];
    people.forEach((p, pi) => rows.push([i + 1, o.name, o.room, o.partySize || 1, pi + 1, p.dinner, p.starter || '', p.drink || '', p.dinnerPrice || '', new Date(o.ts).toLocaleString()]));
  });
  return rows;
}

function rowsToCSV(rows) {
  return rows.map(r => r.map(c => `"${String(c ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
}

function rowsToTSV(rows) {
  return rows.map(r => r.map(c => String(c ?? '').replace(/\t/g, ' ')).join('\t')).join('\n');
}

function downloadText(filename, content, mime) {
  const type = mime || 'text/plain;charset=utf-8';
  const isCsv = /csv/i.test(type) || /\.csv$/i.test(filename);
  const body = (isCsv ? '\uFEFF' : '') + String(content ?? '');
  const blob = new Blob([body], { type: isCsv ? 'text/csv;charset=utf-8' : type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename || 'download.txt';
  a.rel = 'noopener';
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    URL.revokeObjectURL(url);
    a.remove();
  }, 2000);
}

function copyText(text) {
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text);
  const ta = document.createElement('textarea');
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
  return Promise.resolve();
}

async function pushToGoogleSheets(rows, meta) {
  const cfg = getIntegrations();
  if (!cfg.googleSheetsWebhookUrl) throw new Error('Google Sheets webhook URL not configured. Open Integrations in the command center.');
  const payload = {
    sheetId: cfg.googleSheetId,
    sheetName: meta?.sheetName || cfg.defaultSheetTab || 'Orders',
    location: meta?.location || '',
    exportType: meta?.exportType || 'orders',
    rows
  };
  await fetch(cfg.googleSheetsWebhookUrl, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

async function pushToGHL(invite) {
  const cfg = getIntegrations();
  if (!cfg.ghlWebhookUrl) throw new Error('HAG GHL webhook URL not configured.');
  const locFields =
    typeof buildGhlLocationFields === 'function'
      ? buildGhlLocationFields(invite.locationSlug, {
          locationName: invite.locationName,
          locationShort: invite.locationName
        })
      : {
          location: invite.locationSlug,
          locationSlug: invite.locationSlug,
          locationName: invite.locationName,
          locationShort: invite.locationName,
          eventLocation: invite.locationName,
          reEventLocation: invite.locationName,
          re_event_location: invite.locationName,
          reEventLocationSlug: invite.locationSlug,
          re_event_location_slug: invite.locationSlug
        };
  const payload = {
    firstName: invite.firstName,
    lastName: invite.lastName,
    email: invite.email,
    phone: invite.phone,
    ...locFields,
    guestLink: invite.guestLink,
    message: invite.message,
    sms: invite.sms || invite.message,
    brand: cfg.ghlBrand || 'HAG',
    ghlLocationId: cfg.ghlLocationId || '24UgqDfh5TcJs5IPnA25',
    event: 'invite_queued',
    source: 'retirement-everest-host'
  };
  // Must use cors + JSON — no-cors strips JSON content-type and GHL rejects body
  const res = await fetch(cfg.ghlWebhookUrl, {
    method: 'POST',
    mode: 'cors',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify(payload)
  });
  const text = await res.text().catch(() => '');
  if (!res.ok || (/invalid data|error/i.test(text) && !/success/i.test(text))) {
    throw new Error(text || `GHL webhook HTTP ${res.status}`);
  }
  return text;
}