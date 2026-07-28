const RE_INTEGRATIONS_KEY = 're_integrations_v1';
const RE_INVITES_KEY = 're_invites_v1';
const RE_MARKETING_SEL_KEY = 're_marketing_selections_v1';

const DEFAULT_INTEGRATIONS = {
  /* HAG (Harris Assurance Group) location 24UgqDfh5TcJs5IPnA25 */
  ghlWebhookUrl: 'https://services.leadconnectorhq.com/hooks/24UgqDfh5TcJs5IPnA25/webhook-trigger/bfe13f27-a90b-46ec-ae0c-7744bcec2f8d',
  ghlLocationId: '24UgqDfh5TcJs5IPnA25',
  ghlBrand: 'HAG',
  googleSheetsWebhookUrl: '',
  googleSheetId: '',
  defaultSheetTab: 'Orders',
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
    ? 'Dinner is the Backyard BBQ buffet (complimentary). Use the link to share your food & drink preferences so we can plan the evening:'
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

function buildExportRows(loc, orders, type) {
  if (type === 'guest-list') {
    return [['Location', 'Guest Name', 'Order Time', 'Guest Link'],
      ...orders.map(o => [loc.shortName, o.name, new Date(o.ts).toLocaleString(), absoluteGuestLink(loc.slug)])];
  }
  if (type === 'cost-summary') {
    const roomRates = getRoomRates();
    const est = estimateCostForLocation(loc, orders, roomRates);
    const guests = countGuestsForLocation(loc, orders);
    const ev = getLocationEvent(loc.slug);
    return [
      ['Field', 'Value'],
      ['Location', loc.name],
      ['City', loc.city],
      ['Event Type', loc.type],
      ['Event Date', ev?.eventDate || 'Not set'],
      ['Guest Goal', ev?.guestGoal || ''],
      ['Orders', orders.length],
      ['Guests', guests],
      ['Estimated Cost', est.toFixed(2)],
      ['Avg per Guest', guests ? (est / guests).toFixed(2) : '0'],
      ['Exported', new Date().toLocaleString()]
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
  const a = document.createElement('a');
  a.href = `data:${mime},${encodeURIComponent(content)}`;
  a.download = filename;
  a.click();
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