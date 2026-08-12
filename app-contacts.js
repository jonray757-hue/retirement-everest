/**
 * Command center — Event CRM (Contacts) tab
 * Pipeline: Talking → Invited → Prefs in → Seated
 * Host sends preference links through HAG GHL so they land in Conversations.
 */
let contactsCache = [];
let contactsFilter = { q: '', status: 'all', location: 'all', board: true };
let connectDraft = null; // { contact, channel, purpose }

const CRM_STAGES = [
  { id: 'talking', label: 'Talking', hint: 'Manual / pipeline' },
  { id: 'invited', label: 'Registered · invited', hint: 'In CRM — send prefs link' },
  { id: 'registered', label: 'Preferences in', hint: 'Food prefs submitted' },
  { id: 'seated', label: 'Prefs + seat', hint: 'Seats reserved' }
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
      return `Hi ${first} — Johnny here. You're on the list for Retirement Everest at ${loc}. Pick your BBQ prefs + seat here: ${link} — reply if you need help. — ${sign.split(' ')[0]}`;
    }
    return `Hi ${first},

You're registered for Retirement Everest at ${loc}.

Next step — open this link and choose your food preferences and seat (takes about 2 minutes):

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

  // Pull HAG GHL + live seat/order seed so CRM is never blank for Kennedy guests
  try {
    if (window.REContacts?.importEventCrmSeed) {
      const r = await REContacts.importEventCrmSeed();
      if (r?.imported) console.info('[RE] Event CRM seed imported', r.imported, 'of', r.total);
    }
  } catch (e) {
    console.warn('[RE] event CRM seed import', e);
  }

  // Default filter to active event (Kennedy) unless user already chose
  if (contactsFilter.location === 'all' && typeof getActiveEventSlug === 'function') {
    const active = getActiveEventSlug();
    if (active) contactsFilter.location = active;
  }

  contactsCache = window.REContacts?.buildContactDirectory?.() || [];
  paintContactsView();
}

function filterContactsList() {
  const q = (contactsFilter.q || '').trim().toLowerCase();
  return contactsCache.filter((c) => {
    const status = REContacts?.contactPipelineStatus?.(c) || c.status;
    if (contactsFilter.status !== 'all' && status !== contactsFilter.status) return false;
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
      c.preferences?.preferencesSummary
    ]
      .filter(Boolean)
      .join(' ')
      .toLowerCase();
    return hay.includes(q);
  });
}

function contactCardHTML(c) {
  const status = REContacts?.contactPipelineStatus?.(c) || c.status || 'prospect';
  const prefs = c.preferences;
  const seatBit = prefs?.seatLabel
    ? `<span class="crm-chip crm-chip-seat">${esc(prefs.seatLabel)}</span>`
    : status === 'registered'
      ? `<span class="crm-chip">Prefs only · no seat yet</span>`
      : '';
  const prefsLine = prefs?.preferencesSummary
    ? esc(prefs.preferencesSummary.replace(/\n/g, ' · ').slice(0, 120))
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

  return `<div class="contact-card crm-card" data-idx="${idx}" data-status="${esc(status)}">
    <div class="contact-card-main">
      <div class="contact-card-top">
        <strong class="contact-name">${esc(c.name || '—')}</strong>
        <span class="contact-status status-${esc(status)}">${esc(stageLabel(status))}</span>
      </div>
      <div class="contact-channels">
        <span>${esc(c.email || '—')}</span>
        <span>${esc(c.phone || '—')}</span>
      </div>
      <div class="contact-prefs">${prefsLine}</div>
      ${seatBit ? `<div style="margin-top:6px">${seatBit}</div>` : ''}
      <div class="contact-foot">
        <span>${esc(c.locationName || 'Kennedy School')}</span>
        <span>Last: ${esc(last)}</span>
      </div>
    </div>
    <div class="contact-actions">
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

  const list = filterContactsList();

  const counts = {
    all: contactsCache.length,
    talking: contactsCache.filter((c) => (REContacts?.contactPipelineStatus?.(c) || c.status) === 'talking').length,
    invited: contactsCache.filter((c) => (REContacts?.contactPipelineStatus?.(c) || c.status) === 'invited').length,
    registered: contactsCache.filter((c) => (REContacts?.contactPipelineStatus?.(c) || c.status) === 'registered').length,
    seated: contactsCache.filter((c) => (REContacts?.contactPipelineStatus?.(c) || c.status) === 'seated').length
  };

  const locs = typeof getPlannerLocations === 'function' ? getPlannerLocations() : [];
  const locOpts = locs
    .map(
      (l) =>
        `<option value="${esc(l.slug)}" ${contactsFilter.location === l.slug ? 'selected' : ''}>${esc(l.shortName)}</option>`
    )
    .join('');

  const statusOpts = [
    ['all', 'All stages'],
    ['talking', 'Talking'],
    ['invited', 'Registered · invited'],
    ['registered', 'Preferences in'],
    ['seated', 'Prefs + seat']
  ]
    .map(
      ([v, lab]) =>
        `<option value="${v}" ${contactsFilter.status === v ? 'selected' : ''}>${lab}</option>`
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
        ${col.length ? col.map(contactCardHTML).join('') : `<p class="crm-col-empty">None yet</p>`}
      </div>
    </div>`;
  }).join('');

  const listHTML = list.length
    ? list.map(contactCardHTML).join('')
    : `<p class="empty" style="padding:28px">No contacts yet for this event. <strong>Add contact</strong> or send invites from Outreach — they'll land here as <em>Registered · invited</em>. When they finish the guest form they move to <em>Preferences in</em> / <em>Prefs + seat</em>.</p>`;

  root.innerHTML = `
    <div class="card-box" style="margin-bottom:18px;border:2px solid var(--accent)">
      <div style="display:flex;flex-wrap:wrap;gap:12px;align-items:flex-start;justify-content:space-between">
        <div>
          <div style="font-size:0.72rem;font-weight:700;letter-spacing:0.06em;color:var(--accent);margin-bottom:4px">CONTACTS · EVENT CRM · KENNEDY SCHOOL</div>
          <h3 style="margin:0 0 6px">Guest pipeline</h3>
          <p class="integration-note" style="margin:0;max-width:640px">
            Add or invite someone → they show as <strong>Registered · invited</strong>.
            Use <strong>Text/Email prefs link (GHL)</strong> so the message hits HAG Conversations — then coach them through the form.
            When they submit prefs they move to <strong>Preferences in</strong>; with a seat claim they move to <strong>Prefs + seat</strong>.
          </p>
        </div>
        <div style="display:flex;flex-wrap:wrap;gap:8px">
          <button type="button" class="lock-btn btn-accent" id="btnAddContact" style="max-width:none;width:auto;padding:12px 18px">+ Add contact</button>
          <button type="button" class="btn-sm" id="btnRefreshContacts">Refresh from cloud</button>
          <button type="button" class="btn-sm btn-accent" id="btnImportGhlSeed">Re-import GHL / seats</button>
          <button type="button" class="btn-sm" id="btnExportContacts">Export CSV</button>
          <button type="button" class="btn-sm" id="btnToggleBoard">${contactsFilter.board ? 'List view' : 'Pipeline board'}</button>
        </div>
      </div>
      <div class="contact-stats" style="margin-top:16px">
        <div class="card-box contact-stat"><div class="stat-label">All</div><div class="stat-val">${counts.all}</div></div>
        <div class="card-box contact-stat"><div class="stat-label">Invited</div><div class="stat-val">${counts.invited + counts.talking}</div></div>
        <div class="card-box contact-stat"><div class="stat-label">Prefs in</div><div class="stat-val">${counts.registered}</div></div>
        <div class="card-box contact-stat"><div class="stat-label">Seated</div><div class="stat-val accent">${counts.seated}</div></div>
      </div>
    </div>

    <div class="contact-filters card-box">
      <div class="planner-form" style="grid-template-columns: 2fr 1fr 1fr; gap:12px">
        <label class="planner-field full" style="grid-column:auto"><span>Search</span>
          <input type="search" id="contactSearch" placeholder="Name, email, phone, prefs…" value="${esc(contactsFilter.q)}"></label>
        <label class="planner-field"><span>Stage</span>
          <select id="contactStatusFilter">${statusOpts}</select></label>
        <label class="planner-field"><span>Event</span>
          <select id="contactLocFilter"><option value="all">All events</option>${locOpts}</select></label>
      </div>
      <p style="font-size:0.78rem;color:var(--muted);margin-top:10px">Showing <strong style="color:var(--text)">${list.length}</strong> · GHL webhook must branch on <code>event=host_quick_connect</code> to Send SMS / Email (shows in Conversations).</p>
    </div>

    ${contactsFilter.board ? `<div class="crm-board">${boardHTML}</div>` : `<div class="contact-list">${listHTML}</div>`}
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
  root.querySelector('#contactLocFilter')?.addEventListener('change', (e) => {
    contactsFilter.location = e.target.value;
    paintContactsView();
  });
  root.querySelector('#btnAddContact')?.addEventListener('click', () => openContactEditModal(null));
  root.querySelector('#btnRefreshContacts')?.addEventListener('click', () => renderContacts());
  root.querySelector('#btnImportGhlSeed')?.addEventListener('click', async () => {
    const btn = root.querySelector('#btnImportGhlSeed');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Importing…';
    }
    try {
      const r = await REContacts.importEventCrmSeed({ force: true });
      alert(
        r?.ok
          ? `Imported ${r.imported} guest(s) from HAG GHL + seat/preference store into Contacts.`
          : `Import failed: ${r?.error || 'unknown'}`
      );
    } catch (e) {
      alert('Import failed: ' + (e.message || e));
    }
    renderContacts();
  });
  root.querySelector('#btnExportContacts')?.addEventListener('click', exportContactsCsv);
  root.querySelector('#btnToggleBoard')?.addEventListener('click', () => {
    contactsFilter.board = !contactsFilter.board;
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
      `Remove ${label} from Event CRM?\n\nDeletes them from this browser's directory, invite queue, and preference log. Reserved seats they hold are released. GHL is not changed.`
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
  const rows = [
    [
      'Name',
      'First',
      'Last',
      'Email',
      'Phone',
      'Position',
      'Company',
      'Event',
      'Pipeline',
      'Sources',
      'Preferences',
      'Seats',
      'Notes',
      'Last contact'
    ],
    ...contactsCache.map((c) => [
      c.name,
      c.firstName,
      c.lastName,
      c.email,
      c.phone,
      c.position,
      c.company,
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
  const status = REContacts?.contactPipelineStatus?.(c) || c.status;
  const prefs = c.preferences?.preferencesSummary || 'No preference submission yet.';
  alert(
    [
      c.name,
      c.position || c.company ? [c.position, c.company].filter(Boolean).join(' · ') : '',
      c.email,
      c.phone,
      c.locationName ? `Event: ${c.locationName}` : '',
      `Pipeline: ${stageLabel(status)}`,
      c.preferences?.seatLabel ? `Seats: ${c.preferences.seatLabel}` : '',
      '',
      '— Preferences —',
      prefs,
      c.notes ? `\n— Notes —\n${c.notes}` : ''
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
  document.getElementById('ctNotes').value = c.notes || '';
  const st = document.getElementById('ctStatus');
  if (st) {
    // Ensure seated option exists
    if (![...st.options].some((o) => o.value === 'seated')) {
      st.insertAdjacentHTML('beforeend', '<option value="seated">Prefs + seat</option>');
    }
    if (![...st.options].some((o) => o.value === 'registered')) {
      /* already there usually */
    }
    st.value = c.status || 'invited';
  }

  const sel = document.getElementById('ctLocation');
  const locs = typeof getPlannerLocations === 'function' ? getPlannerLocations() : [];
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

  REContacts.upsertManualContact({
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
    sources: ['manual']
  });
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
