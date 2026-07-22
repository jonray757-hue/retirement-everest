let checklistDefaults = null;
let plannerSlug = null;

async function loadChecklistDefaults() {
  if (checklistDefaults) return checklistDefaults;
  if (window.CHECKLIST_DEFAULTS) {
    checklistDefaults = window.CHECKLIST_DEFAULTS;
    return checklistDefaults;
  }
  try {
    const res = await fetch('data/checklist-defaults.json');
    if (res.ok) checklistDefaults = await res.json();
  } catch { /* file:// or offline — fall through */ }
  checklistDefaults = checklistDefaults || { shared: [], screening: [], preorder: [], retreat: [] };
  return checklistDefaults;
}

function buildChecklist(loc, eventDate) {
  const defs = checklistDefaults;
  const items = [...(defs.shared || []), ...(defs[loc.type] || [])];
  const event = new Date(eventDate + 'T12:00:00');
  return items.map(item => {
    const due = new Date(event);
    due.setDate(due.getDate() + item.offsetDays);
    return {
      id: item.id,
      label: item.label,
      phase: item.phase || 'Planning',
      offsetDays: item.offsetDays,
      dueDate: due.toISOString().slice(0, 10),
      done: false
    };
  }).sort((a, b) => a.offsetDays - b.offsetDays);
}

function renderOverview() {
  const locs = getAllLocations();
  const roomRates = getRoomRates();
  const eventMeta = getEventMeta();
  let totalOrders = 0;
  let totalGuests = 0;
  let totalEst = 0;
  let scheduled = 0;

  const cards = locs.map(loc => {
    const orders = getOrdersForLocation(loc);
    const guests = countGuestsForLocation(loc, orders);
    const est = estimateCostForLocation(loc, orders, roomRates);
    const ev = eventMeta[loc.slug];
    const progress = checklistProgress(ev?.checklist);
    totalOrders += orders.length;
    totalGuests += guests;
    totalEst += est;
    if (ev?.eventDate) scheduled++;

    const days = daysUntil(ev?.eventDate);
    const dateLine = ev?.eventDate
      ? `${formatEventDate(ev.eventDate)}${days != null ? (days > 0 ? ` · ${days}d away` : days === 0 ? ' · Today' : ` · ${Math.abs(days)}d ago`) : ''}`
      : 'Not scheduled';

    return `
      <a class="dash-loc-card" href="#" data-goto="location" data-slug="${loc.slug}">
        <div class="dash-loc-top">
          <span class="dash-loc-name">${esc(loc.shortName)}</span>
          <span class="dash-loc-type">${esc(loc.type)}</span>
        </div>
        <div class="dash-loc-stats">
          <span><strong>${orders.length}</strong> ${loc.type === 'retreat' ? 'reservations' : 'orders'}</span>
          <span><strong>${guests}</strong> guests</span>
          <span><strong>${fmt(est)}</strong> est.</span>
        </div>
        <div class="dash-loc-date">${esc(dateLine)}</div>
        ${ev?.checklist?.length ? `<div class="dash-progress"><div class="dash-progress-bar" style="width:${progress}%"></div></div><div class="dash-progress-label">${progress}% checklist</div>` : ''}
        <div style="margin-top:12px;display:flex;gap:6px;flex-wrap:wrap" onclick="event.preventDefault();event.stopPropagation()">
          <button type="button" class="btn-sm btn-accent" data-invite="${loc.slug}">Send link</button>
          <a class="btn-sm" href="marketing-kit.html?location=${loc.slug}" style="text-decoration:none">Marketing</a>
        </div>
      </a>`;
  }).join('');

  const upcoming = locs
    .map(loc => ({ loc, ev: eventMeta[loc.slug] }))
    .filter(x => x.ev?.eventDate)
    .sort((a, b) => a.ev.eventDate.localeCompare(b.ev.eventDate));

  const timeline = upcoming.length
    ? upcoming.map(({ loc, ev }) => {
        const progress = checklistProgress(ev.checklist);
        const overdue = (ev.checklist || []).filter(i => !i.done && i.dueDate < new Date().toISOString().slice(0, 10)).length;
        return `<div class="timeline-row">
          <div class="timeline-date">${formatEventDate(ev.eventDate)}</div>
          <div class="timeline-body">
            <strong>${esc(loc.shortName)}</strong> · ${countGuestsForLocation(loc, getOrdersForLocation(loc))} guests
            · ${progress}% done${overdue ? ` · <span style="color:var(--red)">${overdue} overdue</span>` : ''}
          </div>
        </div>`;
      }).join('')
    : '<p class="empty" style="padding:24px">No event dates set yet. Open <strong>Event Planner</strong> to schedule your first event.</p>';

  const crm = window.VENUE_CRM;
  const crmCounts = crm?.counts || {};
  const crmAction = (crm?.venues || []).filter(v => v.needs_action || v.status === 'replied').length;
  const crmWaiting = crmCounts.awaiting_reply || 0;
  const crmBanner = crm ? `
    <div class="card-box" style="margin-bottom:24px">
      <h3>Venue pipeline (CRM)</h3>
      <div class="stats" style="margin-bottom:12px;grid-template-columns:repeat(4,1fr)">
        <div class="stat"><div class="stat-label">Tracked</div><div class="stat-val">${crm.total || 0}</div></div>
        <div class="stat"><div class="stat-label">Replied</div><div class="stat-val accent">${crmCounts.replied || 0}</div></div>
        <div class="stat"><div class="stat-label">No reply</div><div class="stat-val">${crmWaiting}</div></div>
        <div class="stat"><div class="stat-label">Needs action</div><div class="stat-val accent">${crmAction}</div></div>
      </div>
      <button type="button" class="btn-sm btn-accent" id="gotoVenuesCrm">Open Venue CRM →</button>
      <span style="margin-left:12px;font-size:0.72rem;color:var(--muted)">Emails, PDFs, follow-up timelines</span>
    </div>` : '';

  document.getElementById('view-overview').innerHTML = `
    <div class="stats">
      <div class="stat"><div class="stat-label">Locations</div><div class="stat-val">${locs.length}</div></div>
      <div class="stat"><div class="stat-label">Total orders</div><div class="stat-val accent">${totalOrders}</div></div>
      <div class="stat"><div class="stat-label">Total guests</div><div class="stat-val">${totalGuests}</div></div>
      <div class="stat"><div class="stat-label">Est. series cost</div><div class="stat-val accent">${fmt(totalEst)}</div></div>
      <div class="stat"><div class="stat-label">Scheduled events</div><div class="stat-val">${scheduled} / ${locs.length}</div></div>
    </div>
    ${crmBanner}
    <div class="card-box" style="margin-bottom:24px">
      <h3>Upcoming events</h3>
      <div class="timeline">${timeline}</div>
    </div>
    <h3 class="dash-section-title">Locations</h3>
    <div class="dash-loc-grid">${cards}</div>`;

  document.getElementById('gotoVenuesCrm')?.addEventListener('click', () => switchHostView('venues'));

  document.querySelectorAll('[data-goto="location"]').forEach(el => {
    el.addEventListener('click', e => {
      if (e.target.closest('[data-invite]')) return;
      e.preventDefault();
      switchHostView('location');
      document.getElementById('locSelect').value = el.dataset.slug;
      currentSlug = el.dataset.slug;
      renderReport();
    });
  });
  document.querySelectorAll('[data-invite]').forEach(btn => {
    btn.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      openInviteModal(btn.dataset.invite);
    });
  });
}

async function renderPlanner() {
  await loadChecklistDefaults();
  const locs = getAllLocations();
  if (!plannerSlug || !RETIREMENT_EVEREST.locations[plannerSlug]) {
    plannerSlug = locs[0]?.slug;
  }
  const loc = RETIREMENT_EVEREST.locations[plannerSlug];
  let ev = getLocationEvent(plannerSlug) || {};

  // Repair: date saved but checklist empty (e.g. prior file:// fetch failure)
  if (ev.eventDate && !ev.checklist?.length) {
    const rebuilt = buildChecklist(loc, ev.eventDate);
    if (rebuilt.length) {
      ev = setLocationEvent(plannerSlug, { ...ev, checklist: rebuilt });
    }
  }

  const checklistHTML = (ev.checklist || []).map((item, idx) => {
    const overdue = !item.done && item.dueDate < new Date().toISOString().slice(0, 10);
    return `<label class="check-item${item.done ? ' done' : ''}${overdue ? ' overdue' : ''}">
      <input type="checkbox" data-idx="${idx}" ${item.done ? 'checked' : ''}>
      <div class="check-body">
        <div class="check-label">${esc(item.label)}</div>
        <div class="check-meta">${esc(item.phase)} · due ${formatEventDate(item.dueDate)}${overdue ? ' · overdue' : ''}</div>
      </div>
    </label>`;
  }).join('') || '<p class="empty" style="padding:20px">Set an event date below to generate your checklist.</p>';

  document.getElementById('view-planner').innerHTML = `
    <div class="planner-toolbar">
      <select class="loc-select" id="plannerSelect">
        ${locs.map(l => `<option value="${l.slug}"${l.slug === plannerSlug ? ' selected' : ''}>${esc(l.shortName)}</option>`).join('')}
      </select>
          <button type="button" class="btn-sm btn-accent" onclick="openInviteModal('${plannerSlug}')">Send guest link</button>
          <a class="btn-sm" href="${guestLink(plannerSlug)}" target="_blank">Open guest page ↗</a>
    </div>
    <div class="two-col" style="margin-bottom:24px">
      <div class="card-box">
        <h3>Event details · ${esc(loc.shortName)}</h3>
        <div class="planner-form">
          <label class="planner-field"><span>Event date</span>
            <input type="date" id="eventDate" value="${ev.eventDate || ''}"></label>
          <label class="planner-field"><span>Doors / check-in</span>
            <input type="text" id="eventDoors" value="${esc(ev.doorsTime || '')}" placeholder="e.g. 5:45 PM"></label>
          <label class="planner-field"><span>Film start</span>
            <input type="text" id="eventShow" value="${esc(ev.showTime || '')}" placeholder="e.g. 6:30 PM"></label>
          <label class="planner-field"><span>Guest goal</span>
            <input type="number" id="eventGoal" value="${ev.guestGoal || ''}" placeholder="e.g. 40" min="1"></label>
          <label class="planner-field full"><span>Notes</span>
            <textarea id="eventNotes" rows="3" placeholder="Venue contact, special instructions…">${esc(ev.notes || '')}</textarea></label>
          <div class="planner-actions">
            <button class="lock-btn" type="button" id="saveEventBtn" style="max-width:none;width:auto;padding:12px 28px">Save &amp; build checklist</button>
            ${ev.checklist?.length ? '<button class="btn-sm" type="button" id="resetChecklistBtn">Reset checklist</button>' : ''}
          </div>
        </div>
      </div>
      <div class="card-box">
        <h3>Status</h3>
        <div class="planner-status">
          <div class="status-row"><span>Orders</span><strong>${getOrdersForLocation(loc).length}</strong></div>
          <div class="status-row"><span>Guests</span><strong>${countGuestsForLocation(loc, getOrdersForLocation(loc))}</strong></div>
          <div class="status-row"><span>Checklist</span><strong>${checklistProgress(ev.checklist)}%</strong></div>
          <div class="status-row"><span>Guest link</span><code style="font-size:0.72rem;word-break:break-all">guest.html?location=${loc.slug}</code></div>
        </div>
      </div>
    </div>
    <div class="card-box">
      <h3>Event checklist ${ev.eventDate ? `· ${formatEventDate(ev.eventDate)}` : ''}</h3>
      <div class="checklist" id="checklist">${checklistHTML}</div>
    </div>`;

  document.getElementById('plannerSelect').addEventListener('change', e => {
    plannerSlug = e.target.value;
    renderPlanner();
  });

  document.getElementById('saveEventBtn')?.addEventListener('click', async () => {
    const date = document.getElementById('eventDate').value;
    if (!date) { alert('Pick an event date first.'); return; }
    await loadChecklistDefaults();
    const existing = getLocationEvent(plannerSlug);
    const keepExisting = existing?.eventDate === date && existing?.checklist?.length;
    const checklist = keepExisting ? existing.checklist : buildChecklist(loc, date);
    if (!checklist.length) {
      alert('Checklist template failed to load. Refresh the page and try again.');
      return;
    }
    setLocationEvent(plannerSlug, {
      eventDate: date,
      doorsTime: document.getElementById('eventDoors').value.trim(),
      showTime: document.getElementById('eventShow').value.trim(),
      guestGoal: parseInt(document.getElementById('eventGoal').value, 10) || null,
      notes: document.getElementById('eventNotes').value.trim(),
      checklist
    });
    renderPlanner();
    if (document.getElementById('view-overview').classList.contains('active')) renderOverview();
  });

  document.getElementById('resetChecklistBtn')?.addEventListener('click', async () => {
    if (!confirm('Rebuild checklist from template? Completed items will be lost.')) return;
    const date = document.getElementById('eventDate').value;
    if (!date) return;
    await loadChecklistDefaults();
    const patch = getLocationEvent(plannerSlug) || {};
    patch.checklist = buildChecklist(loc, date);
    setLocationEvent(plannerSlug, patch);
    renderPlanner();
  });

  document.getElementById('checklist')?.addEventListener('change', e => {
    if (e.target.type !== 'checkbox') return;
    const idx = parseInt(e.target.dataset.idx, 10);
    const meta = getLocationEvent(plannerSlug);
    if (!meta?.checklist) return;
    meta.checklist[idx].done = e.target.checked;
    setLocationEvent(plannerSlug, meta);
    renderPlanner();
  });
}

function switchHostView(view) {
  document.querySelectorAll('.host-tab').forEach(t => t.classList.toggle('active', t.dataset.view === view));
  document.querySelectorAll('.host-view').forEach(v => v.classList.remove('active'));
  document.getElementById('view-' + view).classList.add('active');
  document.getElementById('loc-toolbar').style.display = view === 'location' ? 'flex' : 'none';
  document.getElementById('hostTitle').textContent =
    view === 'overview' ? 'Series Overview'
    : view === 'venues' ? 'Venue CRM'
    : view === 'planner' ? 'Event Planner'
    : view === 'outreach' ? 'Outreach & Integrations'
    : `${getLoc().shortName} · Report`;

  if (view === 'overview') renderOverview();
  if (view === 'venues') renderVenueCrm();
  if (view === 'planner') renderPlanner();
  if (view === 'location') renderReport();
  if (view === 'outreach') renderOutreach();
}