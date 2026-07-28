/**
 * Command center — Contacts tab UI
 */
let contactsCache = [];
let contactsFilter = { q: '', status: 'all', location: 'all' };
let connectDraft = null; // { contact, channel }

function defaultConnectMessage(contact, channel) {
  const first = contact.firstName || (contact.name || '').split(/\s+/)[0] || 'there';
  const loc = contact.locationName || 'our event';
  const cfg = typeof getIntegrations === 'function' ? getIntegrations() : {};
  const sign = cfg.organizerName || 'Johnny Harris';
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

  root.innerHTML = `<div class="empty">Loading contacts (guest prefs + invites + manual)…</div>`;

  try {
    if (window.REContacts?.refreshContactsFromShared) {
      await REContacts.refreshContactsFromShared();
    }
  } catch (e) {
    console.warn('[RE] contacts shared refresh', e);
  }

  contactsCache = window.REContacts?.buildContactDirectory?.() || [];
  paintContactsView();
}

function paintContactsView() {
  const root = document.getElementById('view-contacts');
  if (!root) return;

  const q = (contactsFilter.q || '').trim().toLowerCase();
  const list = contactsCache.filter((c) => {
    if (contactsFilter.status !== 'all' && c.status !== contactsFilter.status) return false;
    if (contactsFilter.location !== 'all' && c.locationSlug !== contactsFilter.location) return false;
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

  const counts = {
    all: contactsCache.length,
    registered: contactsCache.filter((c) => c.status === 'registered').length,
    invited: contactsCache.filter((c) => c.status === 'invited').length,
    talking: contactsCache.filter((c) => c.status === 'talking').length,
    prospect: contactsCache.filter((c) => c.status === 'prospect').length
  };

  const locs = typeof getPlannerLocations === 'function' ? getPlannerLocations() : [];
  const locOpts = locs
    .map((l) => `<option value="${esc(l.slug)}" ${contactsFilter.location === l.slug ? 'selected' : ''}>${esc(l.shortName)}</option>`)
    .join('');

  const statusOpts = [
    ['all', 'All statuses'],
    ['registered', 'Registered (prefs in)'],
    ['invited', 'Invited'],
    ['talking', 'Talking / pipeline'],
    ['prospect', 'Prospect']
  ]
    .map(
      ([v, lab]) =>
        `<option value="${v}" ${contactsFilter.status === v ? 'selected' : ''}>${lab}</option>`
    )
    .join('');

  const rows = list.length
    ? list
        .map((c, i) => {
          const prefs = c.preferences;
          const prefsLine = prefs?.preferencesSummary
            ? esc(prefs.preferencesSummary.replace(/\n/g, ' · ').slice(0, 140))
            : '<span style="color:var(--muted)">No prefs yet</span>';
          const src = (c.sources || []).join(', ') || '—';
          const last =
            c.lastContactAt
              ? `${c.lastConnectChannel || 'touch'} · ${new Date(c.lastContactAt).toLocaleString()}`
              : '—';
          const idx = contactsCache.indexOf(c);
          return `<div class="contact-card" data-idx="${idx}">
          <div class="contact-card-main">
            <div class="contact-card-top">
              <strong class="contact-name">${esc(c.name || '—')}</strong>
              <span class="contact-status status-${esc(c.status || 'prospect')}">${esc(c.status || 'prospect')}</span>
            </div>
            <div class="contact-meta">
              ${c.position ? `<span>${esc(c.position)}${c.company ? ` · ${esc(c.company)}` : ''}</span>` : c.company ? `<span>${esc(c.company)}</span>` : ''}
              ${c.locationName ? `<span class="contact-loc">${esc(c.locationName)}</span>` : ''}
            </div>
            <div class="contact-channels">
              <span>${esc(c.email || '—')}</span>
              <span>${esc(c.phone || '—')}</span>
            </div>
            <div class="contact-prefs">${prefsLine}</div>
            <div class="contact-foot">
              <span>Source: ${esc(src)}</span>
              <span>Last connect: ${esc(last)}</span>
            </div>
          </div>
          <div class="contact-actions">
            <button type="button" class="btn-sm btn-accent" data-connect="email" data-idx="${idx}" ${c.email ? '' : 'disabled title="No email"'}>Email via GHL</button>
            <button type="button" class="btn-sm btn-accent" data-connect="sms" data-idx="${idx}" ${c.phone ? '' : 'disabled title="No phone"'}>Text via GHL</button>
            <button type="button" class="btn-sm" data-edit="${idx}">Edit</button>
            <button type="button" class="btn-sm" data-detail="${idx}">Details</button>
          </div>
        </div>`;
        })
        .join('')
    : `<p class="empty" style="padding:28px">No contacts yet. Add someone manually, send invites from Outreach, or wait for guests to submit the preference form.</p>`;

  root.innerHTML = `
    <div class="two-col" style="margin-bottom:20px">
      <div class="card-box">
        <h3>Directory</h3>
        <p class="integration-note" style="margin-top:0">
          Guests who register (full prefs + contact info), people you invited, and anyone you add while talking about events.
          <strong>Email via GHL</strong> / <strong>Text via GHL</strong> create/update the contact in HAG and fire your SMS/email workflow.
        </p>
        <div class="contact-stats">
          <div class="card-box contact-stat"><div class="stat-label">All</div><div class="stat-val">${counts.all}</div></div>
          <div class="card-box contact-stat"><div class="stat-label">Registered</div><div class="stat-val">${counts.registered}</div></div>
          <div class="card-box contact-stat"><div class="stat-label">Invited</div><div class="stat-val">${counts.invited}</div></div>
          <div class="card-box contact-stat"><div class="stat-label">Talking</div><div class="stat-val">${counts.talking}</div></div>
        </div>
      </div>
      <div class="card-box">
        <h3>Quick actions</h3>
        <div style="display:flex;flex-wrap:wrap;gap:8px;margin-top:8px">
          <button type="button" class="lock-btn btn-accent" id="btnAddContact" style="max-width:none;width:auto;padding:12px 20px">+ Add contact</button>
          <button type="button" class="btn-sm" id="btnRefreshContacts">Refresh shared guests</button>
          <button type="button" class="btn-sm" id="btnExportContacts">Export CSV</button>
        </div>
        <p class="integration-note">GHL workflow needs a branch on <code>event = host_quick_connect</code> → Send SMS when <code>channel = sms</code>, Send Email when <code>channel = email</code>. See Integrations doc.</p>
      </div>
    </div>

    <div class="contact-filters card-box">
      <div class="planner-form" style="grid-template-columns: 2fr 1fr 1fr; gap:12px">
        <label class="planner-field full" style="grid-column:auto"><span>Search</span>
          <input type="search" id="contactSearch" placeholder="Name, email, phone, position, prefs…" value="${esc(contactsFilter.q)}"></label>
        <label class="planner-field"><span>Status</span>
          <select id="contactStatusFilter">${statusOpts}</select></label>
        <label class="planner-field"><span>Event</span>
          <select id="contactLocFilter"><option value="all">All events</option>${locOpts}</select></label>
      </div>
      <p style="font-size:0.78rem;color:var(--muted);margin-top:10px">Showing <strong style="color:var(--text)">${list.length}</strong> of ${contactsCache.length}</p>
    </div>

    <div class="contact-list">${rows}</div>
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
  root.querySelector('#btnExportContacts')?.addEventListener('click', exportContactsCsv);

  root.querySelectorAll('[data-connect]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.getAttribute('data-idx'), 10);
      const channel = btn.getAttribute('data-connect');
      openConnectModal(contactsCache[idx], channel);
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
      'Status',
      'Sources',
      'Preferences',
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
      c.status,
      (c.sources || []).join('|'),
      (c.preferences?.preferencesSummary || '').replace(/\n/g, ' | '),
      c.notes || '',
      c.lastContactAt || ''
    ])
  ];
  if (typeof downloadText === 'function' && typeof rowsToCSV === 'function') {
    downloadText(`re-contacts-${new Date().toISOString().slice(0, 10)}.csv`, rowsToCSV(rows), 'text/csv');
  } else {
    alert('Export helper missing.');
  }
}

function showContactDetail(c) {
  if (!c) return;
  const prefs = c.preferences?.preferencesSummary || 'No preference submission yet.';
  alert(
    [
      c.name,
      c.position || c.company ? [c.position, c.company].filter(Boolean).join(' · ') : '',
      c.email,
      c.phone,
      c.locationName ? `Event: ${c.locationName}` : '',
      `Status: ${c.status}`,
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
  document.getElementById('ctStatus').value = c.status || 'talking';

  const sel = document.getElementById('ctLocation');
  const locs = typeof getPlannerLocations === 'function' ? getPlannerLocations() : [];
  sel.innerHTML =
    `<option value="">— None / multi —</option>` +
    locs
      .map(
        (l) =>
          `<option value="${esc(l.slug)}" ${c.locationSlug === l.slug ? 'selected' : ''}>${esc(l.shortName)}</option>`
      )
      .join('');

  document.getElementById('contactEditTitle').textContent = contact ? 'Edit contact' : 'Add contact';
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
  const locSlug = document.getElementById('ctLocation').value;
  const loc = locSlug && RETIREMENT_EVEREST?.locations?.[locSlug];
  const existingId = document.getElementById('ctId').value.trim();

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
    status: document.getElementById('ctStatus').value || 'talking',
    locationSlug: locSlug || '',
    locationName: loc?.shortName || '',
    sources: ['manual']
  });
  closeContactEditModal();
  renderContacts();
}

function openConnectModal(contact, channel) {
  if (!contact) return;
  if (channel === 'email' && !contact.email) return alert('No email on this contact.');
  if (channel === 'sms' && !contact.phone) return alert('No phone on this contact.');

  connectDraft = { contact, channel };
  document.getElementById('connectModalTitle').textContent =
    channel === 'sms' ? 'Text via GHL' : 'Email via GHL';
  document.getElementById('connectModalSub').textContent =
    `${contact.name || 'Contact'} · ${channel === 'sms' ? contact.phone : contact.email} · sent through HAG webhook`;
  document.getElementById('connectSubjectWrap').style.display = channel === 'email' ? 'flex' : 'none';
  document.getElementById('connectSubject').value =
    `Retirement Everest${contact.locationName ? ` — ${contact.locationName}` : ''}`;
  document.getElementById('connectMessage').value = defaultConnectMessage(contact, channel);
  document.getElementById('connectModal').classList.add('open');
}

function closeConnectModal() {
  document.getElementById('connectModal')?.classList.remove('open');
  connectDraft = null;
}

async function submitConnectViaGHL() {
  if (!connectDraft) return;
  const { contact, channel } = connectDraft;
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
    alert(
      channel === 'sms'
        ? 'Pushed to HAG GHL for SMS.\n\nConfirm your GHL workflow sends SMS when event=host_quick_connect and channel=sms.'
        : 'Pushed to HAG GHL for email.\n\nConfirm your GHL workflow sends Email when event=host_quick_connect and channel=email.'
    );
    closeConnectModal();
    contactsCache = REContacts.buildContactDirectory();
    paintContactsView();
  } catch (e) {
    console.error(e);
    alert('GHL push failed: ' + (e.message || e) + '\n\nCheck Outreach → Integrations webhook URL and GHL workflow mapping.');
  } finally {
    if (btn) {
      btn.disabled = false;
      btn.textContent = 'Send via GHL';
    }
  }
}
