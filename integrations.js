const RE_INTEGRATIONS_KEY = 're_integrations_v1';
const RE_INVITES_KEY = 're_invites_v1';
const RE_MARKETING_SEL_KEY = 're_marketing_selections_v1';

const DEFAULT_INTEGRATIONS = {
  ghlWebhookUrl: 'https://services.leadconnectorhq.com/hooks/UeAtlT0oS5n9RHD70I2U/webhook-trigger/be827838-c5a8-4655-8e61-ec7be7874ce9',
  googleSheetsWebhookUrl: '',
  googleSheetId: '',
  defaultSheetTab: 'Orders',
  organizerName: 'Retirement Everest Team',
  organizerEmail: '',
  organizerPhone: ''
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
  return `${base}guest.html?location=${slug}`;
}

function buildInviteMessage(loc, guestLink, event, guestName) {
  const name = guestName ? guestName.split(' ')[0] : 'there';
  const dateLine = event?.eventDate ? formatEventDate(event.eventDate) : 'an upcoming private evening';
  const timeLine = event?.showTime ? ` Doors at ${event.doorsTime || 'TBD'}, film at ${event.showTime}.` : '';
  return `Hi ${name},

You're personally invited to a private screening of Retirement Everest at ${loc.name} in ${loc.city} on ${dateLine}.${timeLine}

Dinner is complimentary — reserve your seat and meal selections here:
${guestLink}

We look forward to hosting you.

— ${getIntegrations().organizerName || 'Retirement Everest'}`;
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
  if (!cfg.ghlWebhookUrl) throw new Error('GoHighLevel webhook URL not configured.');
  await fetch(cfg.ghlWebhookUrl, {
    method: 'POST',
    mode: 'no-cors',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      firstName: invite.firstName,
      lastName: invite.lastName,
      email: invite.email,
      phone: invite.phone,
      location: invite.locationSlug,
      guestLink: invite.guestLink,
      message: invite.message,
      source: 'retirement-everest-host'
    })
  });
}