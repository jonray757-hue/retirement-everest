/**
 * Command center — Event CRM (Contacts) tab
 * Pipeline: Registered → Prefs in → Waitlist → Seated
 * Live waitlist chart is its own column — a hold is not a Jordan Room seat.
 * Host sends preference links through HAG GHL so they land in Conversations.
 */
let contactsCache = [];
let contactsFilter = {
  q: '',
  status: 'all',
  location: 'all',
  board: true,
  priority: 'all',
  viewMode: 'board' // board | call | list
};
let connectDraft = null; // { contact, channel, purpose }

const CRM_STAGES = [
  { id: 'invited', label: 'Registered', hint: 'On the list — still needs prefs' },
  { id: 'registered', label: 'Preferences received', hint: 'Menu in — no chair' },
  { id: 'waitlist', label: 'Waitlist', hint: 'Hold chart — not a confirmed seat' },
  { id: 'seated', label: 'Seated', hint: 'Jordan Room chair reserved' },
  { id: 'talking', label: 'Talking', hint: 'Manual follow-up' }
];

function stageLabel(status) {
  const s = CRM_STAGES.find((x) => x.id === status);
  return s?.label || status || 'prospect';
}

function defaultConnectMessage(contact, channel, purpose) {
  const first = contact.firstName || (contact.name || '').split(/\s+/)[0] || 'there';
  const loc = contact.locationName || 'Kennedy School';
  const cfg = typeof getIntegrations === 'function' ? getIntegrations() : {};
  const sign = cfg.organizerName || 'Johnny Harris';
  const slug =
    contact.locationSlug ||
    (typeof getActiveEventSlug === 'function' ? getActiveEventSlug() : 'kennedy-school');
  let link = '';
  try {
    if (typeof absoluteGuestLink === 'function') link = absoluteGuestLink(slug);
  } catch (_) {}

  if (purpose === 'prefs_link') {
    if (channel === 'sms') {
      return `Hi ${first} — Johnny here. You're on the list for Retirement Everest at ${loc}. See the buffet, share diet notes + drink here: ${link} — reply if you need help. — ${sign.split(' ')[0]}`;
    }
    return `Hi ${first},

You're registered for Retirement Everest at ${loc}.

Next step — open this link to see what’s being served, tell us any dietary restrictions, and whether you’d like an adult drink (takes about 2 minutes):

${link}

Reply to this message if anything looks off or you need help picking seats. Happy to walk you through it.

— ${sign}`;
  }

  if (channel === 'sms') {
    return `Hi ${first} — Johnny here re: Retirement Everest at ${loc}. Reply anytime if you have questions. — ${sign.split(' ')[0]}`;
  }
  return `Hi ${first},

Following up about Retirement Everest at ${loc}. Happy to answer any questions about the evening, menu, or seating.

Just reply to this email anytime.

— ${sign}`;
}

async function renderContacts() {
  const root = document.getElementById('view-contacts');
  if (!root) return;

  root.innerHTML = `<div class="empty">Loading Contacts / Event CRM…</div>`;

  try {
    if (window.REContacts?.refreshContactsFromShared) {
      await REContacts.refreshContactsFromShared();
    }
  } catch (e) {
    console.warn('[RE] contacts shared refresh', e);
  }
  try {
    if (window.RESeating?.fetchState) {
      await RESeating.fetchState({ healRemote: false, orders: [] });
    }
  } catch (e) {
    console.warn('[RE] contacts seating fetch', e);
  }

  // Always merge latest HAG/seed guests (full list — 30–40+ Producer Autopilot registrants)
  let importMsg = '';
  try {
    if (window.REContacts?.importEventCrmSeed) {
      const r = await REContacts.importEventCrmSeed({ force: true });
      if (r?.ok) {
        importMsg = `Synced ${r.imported} from HAG / seat store (of ${r.total} in seed).`;
        console.info('[RE] Event CRM seed imported', r);
      } else {
        importMsg = 'Seed sync failed: ' + (r?.error || 'unknown');
      }
    }
  } catch (e) {
    console.warn('[RE] event CRM seed import', e);
    importMsg = 'Seed sync error: ' + (e.message || e);
  }

  // Default filter: Kennedy event (still show contacts tagged for this event)
  if (!contactsFilter._locTouched && typeof getActiveEventSlug === 'function') {
    contactsFilter.location = getActiveEventSlug() || 'kennedy-school';
  }

  contactsCache = window.REContacts?.buildContactDirectory?.() || [];
  // Score immediately so call order works out of the box
  if (typeof REContactScore !== 'undefined' && REContactScore.sortByCallPriority) {
    contactsCache = REContactScore.sortByCallPriority(contactsCache);
  }
  paintContactsView();
  if (importMsg) {
    const bar = document.getElementById('crmSyncBanner');
    if (bar) bar.textContent = importMsg;
  }
}

function filterContactsList() {
  const q = (contactsFilter.q || '').trim().toLowerCase();
  return contactsCache.filter((c) => {
    const status = REContacts?.contactPipelineStatus?.(c) || c.status;
    if (contactsFilter.status !== 'all' && status !== contactsFilter.status) return false;
    if (contactsFilter.priority && contactsFilter.priority !== 'all') {
      const cat = c.priorityCategory || '';
      if (cat !== contactsFilter.priority) return false;
    }
    if (contactsFilter.location !== 'all') {
      const slug = c.locationSlug || '';
      const active = contactsFilter.location;
      const ok =
        slug === active ||
        (active === 'kennedy-school' && (slug === 'kennedy-school-bbq' || slug === 'kennedy-school')) ||
        (active === 'kennedy-school-bbq' && (slug === 'kennedy-school' || slug === 'kennedy-school-bbq')) ||
        !slug;
      // When focused on Kennedy, still show contacts with no location set
      if (!ok && slug) return false;
    }
    if (!q) return true;
    const hay = [
      c.name,
      c.firstName,
      c.lastName,
      c.email,
      c.phone,
      c.position,
      c.company,
      c.locationName,
      c.notes,
      c.priorityLabel,
      c.priorityTag,
      c.preferences?.preferencesSummary
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return hay.includes(q);
  });
}

function contactCardHTML(c, opts = {}) {
  const status = REContacts?.contactPipelineStatus?.(c) || c.status || 'prospect';
  const prefs = c.preferences;
  const rank = opts.rank != null ? opts.rank : null;
  const compact = !!opts.compact;
  const seatBit =
    status === 'waitlist'
      ? `<span class="crm-chip" title="Waitlist hold — not a confirmed Jordan chair">Waitlist${prefs?.seatLabel ? ' · ' + esc(prefs.seatLabel) : ''}</span>`
      : prefs?.seatLabel
    ? `<span class="crm-chip crm-chip-seat">${esc(prefs.seatLabel)}</span>`
    : status === 'registered'
      ? `<span class="crm-chip">Prefs in · no seat</span>`
      : '';
  const pri =
    c.priorityLabel ||
    (typeof REContactScore !== 'undefined'
      ? REContactScore.categoryLabel(c.priorityCategory)
      : '');
  const priTag = c.priorityTag || '';
  const score = c.callScore != null ? c.callScore : '—';
  const foodBits = [
    prefs?.notes && !/^no restrictions$/i.test(String(prefs.notes).trim()) ? prefs.notes : '',
    prefs?.drinkCat === 'Adult' ? 'adult drink' : (prefs?.drinkCat === 'Soft' ? 'no adult drink' : '')
  ]
    .filter(Boolean)
    .join(' · ');
  const prefsLine = foodBits
    ? esc(foodBits)
    : prefs?.preferencesSummary
      ? esc(prefs.preferencesSummary.replace(/\n/g, ' · ').slice(0, compact ? 80 : 120))
      : status === 'invited' || status === 'talking'
        ? '<span style="color:var(--muted)">Waiting on prefs form</span>'
        : '<span style="color:var(--muted)">No prefs yet</span>';
  const last = c.lastContactAt
    ? `${c.lastConnectChannel || 'touch'} · ${new Date(c.lastContactAt).toLocaleString()}`
    : c.lastLinkSentAt
      ? `link · ${new Date(c.lastLinkSentAt).toLocaleString()}`
      : '—';
  const idx = contactsCache.indexOf(c);
  const needsLink = status === 'invited' || status === 'talking' || status === 'prospect';
  const household = c.household === 'couple' ? 'Couple' : c.household === 'single' ? 'Single' : 'HH?';
  const gender =
    c.gender === 'female' ? 'F' : c.gender === 'male' ? 'M' : c.genderGuess === 'female' ? 'F?' : c.genderGuess === 'male' ? 'M?' : '?';

  if (compact) {
    return `<div class="contact-card crm-card crm-card-compact" data-idx="${idx}" data-status="${esc(status)}">
      <div class="contact-card-main">
        <div class="contact-card-top">
          <strong class="contact-name">${esc(c.name || '—')}</strong>
          <span class="contact-status status-${esc(status)}">${esc(stageLabel(status))}</span>
        </div>
        <div class="contact-channels"><span>${esc(c.phone || c.email || '—')}</span></div>
        <div class="contact-prefs">${prefsLine}</div>
        ${seatBit ? `<div style="margin-top:6px">${seatBit}</div>` : ''}
      </div>
      <div class="contact-actions">
        ${needsLink
          ? `<button type="button" class="btn-sm btn-accent" data-prefs-link="sms" data-idx="${idx}" ${c.phone ? '' : 'disabled'}>Text link</button>`
          : `<button type="button" class="btn-sm" data-detail="${idx}">Details</button>`}
      </div>
    </div>`;
  }

  return `<div class="contact-card crm-card" data-idx="${idx}" data-status="${esc(status)}" data-priority="${esc(c.priorityCategory || '')}">
    <div class="contact-card-main">
      <div class="contact-card-top">
        ${rank != null ? `<span class="crm-rank">#${rank}</span>` : ''}
        <strong class="contact-name">${esc(c.name || '—')}</strong>
        <span class="contact-status status-${esc(status)}">${esc(stageLabel(status))}</span>
        ${pri ? `<span class="crm-chip crm-chip-priority crm-pri-${esc(c.priorityCategory || 'unknown')}">${esc(pri)}</span>` : ''}
      </div>
      <div class="contact-channels">
        <span>${esc(c.phone || '—')}</span>
        <span>${esc(c.email || '—')}</span>
        <span title="Household / gender">HH: ${esc(household)} · ${esc(gender)}</span>
        <span title="Call score"><strong style="color:var(--accent)">${esc(String(score))}</strong> pts</span>
      </div>
      <div class="contact-prefs">${prefsLine}</div>
      <div style="margin-top:6px;display:flex;flex-wrap:wrap;gap:6px">
        ${seatBit}
        ${priTag ? `<span class="crm-chip" title="Tag for filtering / GHL">${esc(priTag)}</span>` : ''}
      </div>
      <div class="contact-foot">
        <span>${esc(c.locationName || 'Kennedy School')}</span>
        <span>Last: ${esc(last)}</span>
      </div>
    </div>
    <div class="contact-actions">
      ${
        c.phone
          ? `<a class="btn-sm btn-accent" href="tel:${esc(String(c.phone).replace(/[^\d+]/g, ''))}">Call</a>`
          : `<button type="button" class="btn-sm" disabled>Call</button>`
      }
      ${
        needsLink
          ? `<button type="button" class="btn-sm btn-accent" data-prefs-link="sms" data-idx="${idx}" ${c.phone ? '' : 'disabled title="No phone"'}>Text prefs link (GHL)</button>
             <button type="button" class="btn-sm btn-accent" data-prefs-link="email" data-idx="${idx}" ${c.email ? '' : 'disabled title="No email"'}>Email prefs link (GHL)</button>`
          : `<button type="button" class="btn-sm" data-connect="sms" data-idx="${idx}" ${c.phone ? '' : 'disabled'}>Text via GHL</button>
             <button type="button" class="btn-sm" data-connect="email" data-idx="${idx}" ${c.email ? '' : 'disabled'}>Email via GHL</button>`
      }
      <button type="button" class="btn-sm" data-edit="${idx}">Edit</button>
      <button type="button" class="btn-sm" data-detail="${idx}">Details</button>
      <button type="button" class="btn-sm btn-danger" data-delete="${idx}">Remove</button>
    </div>
  </div>`;
}

function paintContactsView() {
  const root = document.getElementById('view-contacts');
  if (!root) return;

  // Always enrich for display / call order
  if (typeof REContactScore !== 'undefined' && REContactScore.sortByCallPriority) {
    contactsCache = REContactScore.sortByCallPriority(contactsCache);
  } else if (typeof REContactScore !== 'undefined' && REContactScore.enrichContact) {
    contactsCache = contactsCache.map((c) => REContactScore.enrichContact(c));
  }

  const list = filterContactsList();
  // Keep call order (score desc) even after filter
  list.sort((a, b) => (b.callScore || 0) - (a.callScore || 0));

  const counts = {
    all: contactsCache.length,
    talking: contactsCache.filter((c) => (REContacts?.contactPipelineStatus?.(c) || c.status) === 'talking').length,
    invited: contactsCache.filter((c) => (REContacts?.contactPipelineStatus?.(c) || c.status) === 'invited').length,
    registered: contactsCache.filter((c) => (REContacts?.contactPipelineStatus?.(c) || c.status) === 'registered').length,
    waitlist: contactsCache.filter((c) => (REContacts?.contactPipelineStatus?.(c) || c.status) === 'waitlist').length,
    seated: contactsCache.filter((c) => (REContacts?.contactPipelineStatus?.(c) || c.status) === 'seated').length,
    couple: contactsCache.filter((c) => c.priorityCategory === 'couple').length,
    singleWoman: contactsCache.filter((c) => c.priorityCategory === 'singleWoman').length,
    singleMan: contactsCache.filter((c) => c.priorityCategory === 'singleMan').length,
    unknown: contactsCache.filter((c) => c.priorityCategory === 'unknown').length
  };

  const locs =
    typeof getAllPlannerLocations === 'function'
      ? getAllPlannerLocations()
      : typeof getPlannerLocations === 'function'
        ? getPlannerLocations()
        : [];
  const locOpts = locs
    .map(
      (l) =>
        `<option value="${esc(l.slug)}" ${contactsFilter.location === l.slug ? 'selected' : ''}>${esc(l.shortName)}</option>`
    )
    .join('');

  const statusOpts = [
    ['all', 'All stages'],
    ['invited', 'Registered'],
    ['registered', 'Preferences received'],
    ['waitlist', 'Waitlist'],
    ['seated', 'Seated'],
    ['talking', 'Talking']
  ]
    .map(
      ([v, lab]) =>
        `<option value="${v}" ${contactsFilter.status === v ? 'selected' : ''}>${lab}</option>`
    )
    .join('');

  const priorityOpts = [
    ['all', 'All call tags'],
    ['couple', '★ Couples / married'],
    ['singleWoman', 'Single women'],
    ['singleMan', 'Single men'],
    ['unknown', 'Needs review']
  ]
    .map(
      ([v, lab]) =>
        `<option value="${v}" ${contactsFilter.priority === v ? 'selected' : ''}>${lab}</option>`
    )
    .join('');

  const boardHTML = CRM_STAGES.map((stage) => {
    const col = list.filter((c) => (REContacts?.contactPipelineStatus?.(c) || c.status) === stage.id);
    return `<div class="crm-col" data-stage="${stage.id}">
      <div class="crm-col-head">
        <div>
          <strong>${esc(stage.label)}</strong>
          <div class="crm-col-hint">${esc(stage.hint)}</div>
        </div>
        <span class="crm-col-count">${col.length}</span>
      </div>
      <div class="crm-col-body">
        ${col.length ? col.map((c) => contactCardHTML(c, { compact: true })).join('') : `<p class="crm-col-empty">None yet</p>`}
      </div>
    </div>`;
  }).join('');

  const callHTML = list.length
    ? list.map((c, i) => contactCardHTML(c, { rank: i + 1 })).join('')
    : `<p class="empty" style="padding:28px">No contacts yet. Import GHL/seats or add someone — then hit <strong>Enrich &amp; score</strong>.</p>`;

  const listHTML = list.length
    ? list.map((c) => contactCardHTML(c)).join('')
    : `<p class="empty" style="padding:28px">No contacts yet for this event.</p>`;

  const mode = contactsFilter.viewMode || 'call';

  root.innerHTML = `
    <div class="card-box" style="margin-bottom:18px;border:2px solid var(--accent)">
      <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:flex-start;justify-content:space-between">
        <div>
          <div style="font-size:0.72rem;font-weight:700;letter-spacing:0.06em;color:var(--accent);margin-bottom:4px">EVENT CRM · AUG 27 BBQ</div>
          <h3 style="margin:0 0 6px">Kennedy School pipeline</h3>
          <p class="integration-note" style="margin:0;max-width:680px">
            Same stages as GHL: <strong>Registered</strong> → <strong>Preferences received</strong> → <strong>Waitlist</strong> → <strong>Seated</strong>.
            Waitlist holds are not seated. Guest form submits move the card.
          </p>
          <p id="crmSyncBanner" style="margin:8px 0 0;font-size:0.8rem;color:var(--accent)"></p>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:8px">
          <button type="button" class="lock-btn btn-accent" id="btnEnrichScore" style="max-width:none;width:auto;padding:12px 18px">Enrich &amp; score all</button>
          <button type="button" class="btn-sm btn-accent" id="btnAddContact">+ Add contact</button>
          <button type="button" class="btn-sm" id="btnRefreshContacts">Refresh from cloud</button>
          <button type="button" class="btn-sm" id="btnImportGhlSeed">Re-import GHL / seats</button>
          <button type="button" class="btn-sm" id="btnExportContacts">Export CSV</button>
          <button type="button" class="btn-sm" id="btnViewBoard" ${mode === 'board' ? 'disabled' : ''}>Pipeline</button>
          <button type="button" class="btn-sm" id="btnViewCall" ${mode === 'call' ? 'disabled' : ''}>Call order</button>
          <button type="button" class="btn-sm" id="btnViewList" ${mode === 'list' ? 'disabled' : ''}>List</button>
        </div>
      </div>
      <div class="contact-stats" style="margin-top:16px">
        <div class="card-box contact-stat"><div class="stat-label">All</div><div class="stat-val">${counts.all}</div></div>
        <div class="card-box contact-stat"><div class="stat-label">Registered</div><div class="stat-val">${counts.invited}</div></div>
        <div class="card-box contact-stat"><div class="stat-label">Prefs in</div><div class="stat-val accent">${counts.registered}</div></div>
        <div class="card-box contact-stat"><div class="stat-label">Waitlist</div><div class="stat-val">${counts.waitlist}</div></div>
        <div class="card-box contact-stat"><div class="stat-label">Seated</div><div class="stat-val">${counts.seated}</div></div>
        <div class="card-box contact-stat"><div class="stat-label">Couples</div><div class="stat-val">${counts.couple}</div></div>
      </div>
    </div>

    <div class="contact-filters card-box">
      <div class="planner-form" style="grid-template-columns: 2fr 1fr 1fr 1fr; gap:12px">
        <label class="planner-field full" style="grid-column:auto"><span>Search</span>
          <input type="search" id="contactSearch" placeholder="Name, email, phone, tag, prefs…" value="${esc(contactsFilter.q)}"></label>
        <label class="planner-field"><span>Call tag</span>
          <select id="contactPriorityFilter">${priorityOpts}</select></label>
        <label class="planner-field"><span>Stage</span>
          <select id="contactStatusFilter">${statusOpts}</select></label>
        <label class="planner-field"><span>Event</span>
          <select id="contactLocFilter"><option value="all">All events</option>${locOpts}</select></label>
      </div>
      <p style="font-size:0.78rem;color:var(--muted);margin-top:10px">
        Showing <strong style="color:var(--text)">${list.length}</strong>.
        Pipeline matches GHL. Call order still ranks couples first if you switch views.
      </p>
    </div>

    ${
      mode === 'board'
        ? `<div class="crm-board">${boardHTML}</div>`
        : mode === 'list'
          ? `<div class="contact-list">${listHTML}</div>`
          : `<div class="contact-list crm-call-order">${callHTML}</div>`
    }
  `;

  root.querySelector('#contactSearch')?.addEventListener('input', (e) => {
    contactsFilter.q = e.target.value;
    paintContactsView();
    const el = document.getElementById('contactSearch');
    if (el) {
      el.focus();
      const len = el.value.length;
      el.setSelectionRange(len, len);
    }
  });
  root.querySelector('#contactStatusFilter')?.addEventListener('change', (e) => {
    contactsFilter.status = e.target.value;
    paintContactsView();
  });
  root.querySelector('#contactPriorityFilter')?.addEventListener('change', (e) => {
    contactsFilter.priority = e.target.value;
    paintContactsView();
  });
  root.querySelector('#contactLocFilter')?.addEventListener('change', (e) => {
    contactsFilter.location = e.target.value;
    contactsFilter._locTouched = true;
    paintContactsView();
  });
  root.querySelector('#btnAddContact')?.addEventListener('click', () => openContactEditModal(null));
  root.querySelector('#btnRefreshContacts')?.addEventListener('click', () => renderContacts());
  root.querySelector('#btnEnrichScore')?.addEventListener('click', () => {
    if (typeof REContactScore === 'undefined') {
      return alert('Scoring module not loaded — hard-refresh command center.');
    }
    contactsCache = REContactScore.applyEnrichmentToDirectory(contactsCache);
    contactsCache = REContactScore.sortByCallPriority(contactsCache);
    const n = contactsCache.length;
    const couples = contactsCache.filter((c) => c.priorityCategory === 'couple').length;
    const sw = contactsCache.filter((c) => c.priorityCategory === 'singleWoman').length;
    const sm = contactsCache.filter((c) => c.priorityCategory === 'singleMan').length;
    alert(
      `Enriched ${n} contact(s).\n\n★ Couples: ${couples}\nSingle women: ${sw}\nSingle men: ${sm}\n\nTags saved. Call order is ready — highest score first.`
    );
    paintContactsView();
  });
  root.querySelector('#btnImportGhlSeed')?.addEventListener('click', async () => {
    const btn = root.querySelector('#btnImportGhlSeed');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Importing…';
    }
    try {
      // Clear accidental bare-email bans from older delete bug
      if (REContacts.getRemovedContactKeys) {
        const banned = REContacts.getRemovedContactKeys() || [];
        const cleaned = banned.filter((k) => !/^e:[^|]+$/.test(k) && !/^p:\d+$/.test(k));
        if (cleaned.length !== banned.length && REContacts.unmarkContactRemoved) {
          // wipe and re-add only person-level bans
          REContacts.unmarkContactRemoved(null);
          cleaned.forEach((k) => REContacts.markContactRemoved(k));
        }
      }
      const r = await REContacts.importEventCrmSeed({ force: true });
      alert(
        r?.ok
          ? `Restored/imported ${r.imported} guest(s) from HAG + seat store.\n\nCouples who share an email are separate contacts again.`
          : `Import failed: ${r?.error || 'unknown'}`
      );
    } catch (e) {
      alert('Import failed: ' + (e.message || e));
    }
    renderContacts();
  });
  root.querySelector('#btnExportContacts')?.addEventListener('click', exportContactsCsv);
  root.querySelector('#btnViewCall')?.addEventListener('click', () => {
    contactsFilter.viewMode = 'call';
    paintContactsView();
  });
  root.querySelector('#btnViewBoard')?.addEventListener('click', () => {
    contactsFilter.viewMode = 'board';
    paintContactsView();
  });
  root.querySelector('#btnViewList')?.addEventListener('click', () => {
    contactsFilter.viewMode = 'list';
    paintContactsView();
  });

  root.querySelectorAll('[data-connect]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-idx'), 10);
      const channel = btn.getAttribute('data-connect');
      openConnectModal(contactsCache[idx], channel, 'general');
    });
  });
  root.querySelectorAll('[data-prefs-link]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-idx'), 10);
      const channel = btn.getAttribute('data-prefs-link');
      openConnectModal(contactsCache[idx], channel, 'prefs_link');
    });
  });
  root.querySelectorAll('[data-edit]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-edit'), 10);
      openContactEditModal(contactsCache[idx]);
    });
  });
  root.querySelectorAll('[data-detail]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-detail'), 10);
      showContactDetail(contactsCache[idx]);
    });
  });
  root.querySelectorAll('[data-delete]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-delete'), 10);
      removeContactAt(idx, btn);
    });
  });
}

async function removeContactAt(idx, btn) {
  const c = contactsCache[idx];
  if (!c) return;
  const label = c.name || c.email || c.phone || 'this contact';
  if (
    !confirm(
      `Remove ${label} only?\n\nThis removes that person from Contacts — not a spouse who shares the same email.\n\nTheir preference row / seats with their name may also clear. GHL is not changed.\n\nTo bring someone back: Re-import GHL / seats.`
    )
  ) {
    return;
  }
  if (btn) {
    btn.disabled = true;
    btn.textContent = '…';
  }
  try {
    if (!window.REContacts?.deleteContact) throw new Error('deleteContact missing — hard-refresh host page');
    await REContacts.deleteContact(c, { hard: true });
    contactsCache = REContacts.buildContactDirectory();
    paintContactsView();
  } catch (e) {
    console.error(e);
    alert('Remove failed: ' + (e.message || e));
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Remove';
    }
  }
}

function exportContactsCsv() {
  const ranked =
    typeof REContactScore !== 'undefined'
      ? REContactScore.sortByCallPriority(contactsCache)
      : contactsCache;
  const rows = [
    [
      'Call rank',
      'Call score',
      'Priority tag',
      'Priority category',
      'Household',
      'Gender',
      'Name',
      'First',
      'Last',
      'Email',
      'Phone',
      'Event',
      'Pipeline',
      'Sources',
      'Preferences',
      'Seats',
      'Notes',
      'Last contact'
    ],
    ...ranked.map((c, i) => [
      i + 1,
      c.callScore || '',
      c.priorityTag || '',
      c.priorityCategory || '',
      c.household || '',
      c.gender || c.genderGuess || '',
      c.name,
      c.firstName,
      c.lastName,
      c.email,
      c.phone,
      c.locationName,
      REContacts?.contactPipelineStatus?.(c) || c.status,
      (c.sources || []).join('|'),
      (c.preferences?.preferencesSummary || '').replace(/\n/g, ' | '),
      c.preferences?.seatLabel || '',
      c.notes || '',
      c.lastContactAt || ''
    ])
  ];
  if (typeof downloadText === 'function' && typeof rowsToCSV === 'function') {
    downloadText(`re-event-crm-${new Date().toISOString().slice(0, 10)}.csv`, rowsToCSV(rows), 'text/csv');
  } else {
    alert('Export helper missing.');
  }
}

function showContactDetail(c) {
  if (!c) return;
  const en = typeof REContactScore !== 'undefined' ? REContactScore.enrichContact(c) : c;
  const status = REContacts?.contactPipelineStatus?.(en) || en.status;
  const prefs = en.preferences?.preferencesSummary || 'No preference submission yet.';
  const br = (en.callScoreBreakdown || []).map((b) => `  ${b.label}: +${b.pts}`).join('\n');
  alert(
    [
      en.name,
      en.email,
      en.phone,
      en.locationName ? `Event: ${en.locationName}` : '',
      `Pipeline: ${stageLabel(status)}`,
      `Call priority: ${en.priorityLabel || '—'} (${en.priorityTag || ''})`,
      `Score: ${en.callScore ?? '—'}`,
      br ? `Breakdown:\n${br}` : '',
      `Household: ${en.household || '—'} (${en.householdConfidence || ''})`,
      `Gender: ${en.gender || en.genderGuess || '—'} (${en.genderConfidence || ''})`,
      en.preferences?.seatLabel ? `Seats: ${en.preferences.seatLabel}` : '',
      '',
      '— Preferences —',
      prefs,
      en.notes ? `\n— Notes —\n${en.notes}` : ''
    ]
      .filter((x) => x != null && x !== '')
      .join('\n')
  );
}

function openContactEditModal(contact) {
  const c = contact || {};
  document.getElementById('ctId').value = c.id?.startsWith('c_') ? c.id : '';
  document.getElementById('ctFirst').value = c.firstName || '';
  document.getElementById('ctLast').value = c.lastName || '';
  document.getElementById('ctEmail').value = c.email || '';
  document.getElementById('ctPhone').value = c.phone || '';
  document.getElementById('ctPosition').value = c.position || '';
  document.getElementById('ctCompany').value = c.company || '';
  // Encode household/gender overrides in notes prefix only if fields missing — use dedicated selects if present
  let notes = c.notes || '';
  document.getElementById('ctNotes').value = notes;
  const st = document.getElementById('ctStatus');
  if (st) {
    if (![...st.options].some((o) => o.value === 'seated')) {
      st.insertAdjacentHTML('beforeend', '<option value="seated">Prefs + seat</option>');
    }
    st.value = c.status || 'invited';
  }

  // Inject household + gender override fields once
  let extra = document.getElementById('ctPriorityFields');
  if (!extra) {
    const notesField = document.getElementById('ctNotes')?.closest('.modal-field');
    extra = document.createElement('div');
    extra.id = 'ctPriorityFields';
    extra.innerHTML = `
      <div class="modal-field"><span>Household (call priority)</span>
        <select id="ctHousehold">
          <option value="">Auto from registration</option>
          <option value="couple">Couple / married</option>
          <option value="single">Single</option>
        </select>
      </div>
      <div class="modal-field"><span>Gender (call priority)</span>
        <select id="ctGender">
          <option value="">Auto from first name</option>
          <option value="female">Female</option>
          <option value="male">Male</option>
        </select>
      </div>
      <div class="modal-field"><span>Manual score boost</span>
        <input type="number" id="ctBoost" placeholder="0" step="1">
      </div>`;
    notesField?.parentNode?.insertBefore(extra, notesField);
  }
  const hh = document.getElementById('ctHousehold');
  const gen = document.getElementById('ctGender');
  const boost = document.getElementById('ctBoost');
  if (hh) hh.value = c.household === 'couple' || c.household === 'single' ? c.household : '';
  if (gen) gen.value = c.gender === 'female' || c.gender === 'male' ? c.gender : '';
  if (boost) boost.value = c.priorityBoost || '';

  const sel = document.getElementById('ctLocation');
  const locs =
    typeof getAllPlannerLocations === 'function'
      ? getAllPlannerLocations()
      : typeof getPlannerLocations === 'function'
        ? getPlannerLocations()
        : [];
  const active = typeof getActiveEventSlug === 'function' ? getActiveEventSlug() : 'kennedy-school';
  sel.innerHTML =
    locs
      .map(
        (l) =>
          `<option value="${esc(l.slug)}" ${
            (c.locationSlug || active) === l.slug ? 'selected' : ''
          }>${esc(l.shortName)}</option>`
      )
      .join('') || `<option value="${esc(active)}">Kennedy School</option>`;

  document.getElementById('contactEditTitle').textContent = contact ? 'Edit contact' : 'Add contact (register in CRM)';
  document.getElementById('contactEditModal').classList.add('open');
}

function closeContactEditModal() {
  document.getElementById('contactEditModal')?.classList.remove('open');
}

function saveContactFromModal() {
  const first = document.getElementById('ctFirst').value.trim();
  const last = document.getElementById('ctLast').value.trim();
  const email = document.getElementById('ctEmail').value.trim();
  const phone = document.getElementById('ctPhone').value.trim();
  if (!first && !last && !email && !phone) {
    return alert('Enter at least a name, email, or phone.');
  }
  const locSlug =
    document.getElementById('ctLocation').value ||
    (typeof getActiveEventSlug === 'function' ? getActiveEventSlug() : 'kennedy-school');
  const loc = locSlug && RETIREMENT_EVEREST?.locations?.[locSlug];
  const existingId = document.getElementById('ctId').value.trim();
  const status = document.getElementById('ctStatus').value || 'invited';

  const household = document.getElementById('ctHousehold')?.value || '';
  const gender = document.getElementById('ctGender')?.value || '';
  const boostRaw = document.getElementById('ctBoost')?.value;
  const priorityBoost = boostRaw === '' || boostRaw == null ? undefined : Number(boostRaw);

  const saved = REContacts.upsertManualContact({
    id: existingId || undefined,
    firstName: first,
    lastName: last,
    name: [first, last].filter(Boolean).join(' '),
    email,
    phone,
    position: document.getElementById('ctPosition').value.trim(),
    company: document.getElementById('ctCompany').value.trim(),
    notes: document.getElementById('ctNotes').value.trim(),
    status: status === 'talking' ? 'invited' : status,
    locationSlug: locSlug || '',
    locationName: loc?.shortName || 'Kennedy School',
    sources: ['manual'],
    household: household || undefined,
    gender: gender || undefined,
    priorityBoost
  });
  // Re-score immediately with manual overrides
  if (typeof REContactScore !== 'undefined' && saved) {
    REContactScore.applyEnrichmentToDirectory([saved]);
  }
  closeContactEditModal();
  renderContacts();
}

function openConnectModal(contact, channel, purpose) {
  if (!contact) return;
  if (channel === 'email' && !contact.email) return alert('No email on this contact.');
  if (channel === 'sms' && !contact.phone) return alert('No phone on this contact.');

  const why = purpose || 'general';
  connectDraft = { contact, channel, purpose: why };
  document.getElementById('connectModalTitle').textContent =
    why === 'prefs_link'
      ? channel === 'sms'
        ? 'Text prefs link via GHL'
        : 'Email prefs link via GHL'
      : channel === 'sms'
        ? 'Text via GHL'
        : 'Email via GHL';
  document.getElementById('connectModalSub').textContent =
    `${contact.name || 'Contact'} · ${channel === 'sms' ? contact.phone : contact.email} · lands in HAG Conversations`;
  document.getElementById('connectSubjectWrap').style.display = channel === 'email' ? 'flex' : 'none';
  document.getElementById('connectSubject').value =
    why === 'prefs_link'
      ? `Your Retirement Everest seat & menu link${contact.locationName ? ` — ${contact.locationName}` : ''}`
      : `Retirement Everest${contact.locationName ? ` — ${contact.locationName}` : ''}`;
  document.getElementById('connectMessage').value = defaultConnectMessage(contact, channel, why);
  document.getElementById('connectModal').classList.add('open');
}

function closeConnectModal() {
  document.getElementById('connectModal')?.classList.remove('open');
  connectDraft = null;
}

async function submitConnectViaGHL() {
  if (!connectDraft) return;
  const { contact, channel, purpose } = connectDraft;
  const message = document.getElementById('connectMessage').value.trim();
  const subject = document.getElementById('connectSubject').value.trim();
  if (!message) return alert('Write a message first.');

  const btn = document.getElementById('connectSendBtn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Sending to GHL…';
  }
  try {
    await REContacts.pushQuickConnectToGHL({ contact, channel, message, subject });
    // Promote prospect/talking → invited after link send
    if (purpose === 'prefs_link' || contact.status === 'prospect' || contact.status === 'talking') {
      REContacts.upsertManualContact({
        id: contact.id?.startsWith('c_') ? contact.id : undefined,
        firstName: contact.firstName,
        lastName: contact.lastName,
        name: contact.name,
        email: contact.email,
        phone: contact.phone,
        locationSlug: contact.locationSlug,
        locationName: contact.locationName,
        sources: uniqueSourcesLocal([...(contact.sources || []), 'invite']),
        status: contact.status === 'registered' || contact.status === 'seated' ? contact.status : 'invited',
        lastLinkSentAt: new Date().toISOString(),
        lastContactAt: new Date().toISOString(),
        lastConnectChannel: channel
      });
    }
    alert(
      channel === 'sms'
        ? 'Pushed to HAG GHL for SMS.\n\nCheck Conversations in GHL — the contact should have the prefs link message. Workflow needs event=host_quick_connect + channel=sms → Send SMS.'
        : 'Pushed to HAG GHL for email.\n\nCheck Conversations in GHL. Workflow needs event=host_quick_connect + channel=email → Send Email.'
    );
    closeConnectModal();
    contactsCache = REContacts.buildContactDirectory();
    paintContactsView();
  } catch (e) {
    console.error(e);
    alert(
      'GHL push failed: ' +
        (e.message || e) +
        '\n\nCheck Outreach → Integrations webhook URL and GHL workflow mapping for host_quick_connect.'
    );
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Send via GHL';
    }
  }
}

function uniqueSourcesLocal(arr) {
  return [...new Set((arr || []).filter(Boolean))];
}
