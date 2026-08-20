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
  const locs =
    typeof getPlannerLocations === 'function' ? getPlannerLocations() : getAllLocations();
  const allLocs =
    typeof getAllPlannerLocations === 'function' ? getAllPlannerLocations() : locs;
  const showingAll = typeof isShowingAllVenues === 'function' ? isShowingAllVenues() : false;
  const active =
    typeof getActiveEventLocation === 'function' ? getActiveEventLocation() : locs[0];
  const roomRates = getRoomRates();
  const eventMeta = getEventMeta();

  const cardFor = (loc, { featured } = {}) => {
    const orders = getOrdersForLocation(loc);
    const guests = countGuestsForLocation(loc, orders);
    const est = estimateCostForLocation(loc, orders, roomRates);
    const ev = eventMeta[loc.slug];
    const progress = checklistProgress(ev?.checklist);
    const days = daysUntil(ev?.eventDate);
    const dateLine = ev?.eventDate
      ? `${formatEventDate(ev.eventDate)}${days != null ? (days > 0 ? ` · ${days}d away` : days === 0 ? ' · Today' : ` · ${Math.abs(days)}d ago`) : ''}`
      : 'Not scheduled';
    const border = featured
      ? 'border:2px solid var(--accent);box-shadow:0 0 0 1px color-mix(in srgb,var(--accent) 30%,transparent)'
      : '';
    return `
      <a class="dash-loc-card" href="#" data-goto="location" data-slug="${loc.slug}" style="${border}">
        <div class="dash-loc-top">
          <span class="dash-loc-name">${featured ? '★ ' : ''}${esc(loc.shortName)}${loc.guestSlug ? ' BBQ' : ''}</span>
          <span class="dash-loc-type">${featured ? 'LIVE EVENT' : esc(loc.type)}</span>
        </div>
        <div class="dash-loc-stats">
          <span><strong>${orders.length}</strong> ${loc.type === 'retreat' ? 'reservations' : 'preferences'}</span>
          <span><strong>${guests}</strong> guests</span>
          <span><strong>${fmt(est)}</strong> est.</span>
        </div>
        <div class="dash-loc-date">${esc(dateLine)}${loc.venue ? ` · ${esc(loc.venue)}` : ''}</div>
        ${ev?.checklist?.length ? `<div class="dash-progress"><div class="dash-progress-bar" style="width:${progress}%"></div></div><div class="dash-progress-label">${progress}% checklist</div>` : ''}
        <div style="margin-top:12px;display:flex;gap:6px;flex-wrap:wrap" onclick="event.preventDefault();event.stopPropagation()">
          <button type="button" class="btn-sm btn-accent" data-open-report="${loc.slug}">Open report</button>
          <button type="button" class="btn-sm btn-accent" data-invite="${loc.slug}">Send link</button>
          <a class="btn-sm" href="marketing-kit.html?location=${loc.slug}" style="text-decoration:none">Marketing</a>
        </div>
      </a>`;
  };

  let totalOrders = 0;
  let totalGuests = 0;
  let totalEst = 0;
  locs.forEach((loc) => {
    const orders = getOrdersForLocation(loc);
    totalOrders += orders.length;
    totalGuests += countGuestsForLocation(loc, orders);
    totalEst += estimateCostForLocation(loc, orders, roomRates);
  });

  const activeOrders = active ? getOrdersForLocation(active) : [];
  const activeEv = active ? eventMeta[active.slug] : null;
  const activeDays = daysUntil(activeEv?.eventDate);
  const hero = active
    ? `<div class="card-box" style="margin-bottom:24px;border:2px solid var(--accent);background:color-mix(in srgb,var(--accent) 8%,var(--panel))">
        <div style="display:flex;flex-wrap:wrap;gap:16px;align-items:flex-start;justify-content:space-between">
          <div>
            <div style="font-size:0.75rem;font-weight:700;letter-spacing:0.06em;color:var(--accent);margin-bottom:6px">ACTIVE EVENT</div>
            <h2 style="margin:0 0 6px;font-family:var(--heading-font);color:var(--text);font-size:1.45rem">${esc(active.shortName)}${active.guestSlug ? ' · Backyard BBQ' : ''}</h2>
            <p style="margin:0;color:var(--muted);font-size:0.9rem">
              ${esc(active.venue || active.name)} · ${esc(active.city || '')}
              ${activeEv?.eventDate ? `<br><strong style="color:var(--text)">${formatEventDate(activeEv.eventDate)}</strong>${activeDays != null ? (activeDays > 0 ? ` · ${activeDays} days away` : activeDays === 0 ? ' · <strong>Today</strong>' : ` · ${Math.abs(activeDays)}d ago`) : ''}` : ''}
            </p>
            <div style="display:flex;gap:16px;flex-wrap:wrap;margin-top:14px;font-size:0.9rem">
              <span><strong style="color:var(--accent)">${activeOrders.length}</strong> preferences</span>
              <span><strong style="color:var(--accent)">${countGuestsForLocation(active, activeOrders)}</strong> guests</span>
              <span><strong style="color:var(--accent)">${fmt(estimateCostForLocation(active, activeOrders, roomRates))}</strong> est.</span>
            </div>
          </div>
          <div style="display:flex;flex-direction:column;gap:8px;min-width:180px">
            <button type="button" class="lock-btn btn-accent" id="heroOpenReport" style="max-width:none;width:100%;padding:12px 18px">Open location report →</button>
            <button type="button" class="btn-sm btn-accent" id="heroContacts">Open Contacts / Event CRM</button>
            <button type="button" class="btn-sm" id="heroInvite" data-invite="${active.slug}">Send guest link</button>
            <button type="button" class="btn-sm" id="heroFlyers">Guest flyers</button>
            <button type="button" class="btn-sm" id="heroPlanner">Event planner</button>
          </div>
        </div>
      </div>`
    : '';

  const focusToggle = `
    <div style="display:flex;flex-wrap:wrap;gap:10px;align-items:center;justify-content:space-between;margin-bottom:16px">
      <h3 class="dash-section-title" style="margin:0">${showingAll ? 'All venues' : 'Working on'}</h3>
      <button type="button" class="btn-sm" id="toggleShowAllVenues">
        ${showingAll ? '★ Focus on active event only' : `Show all venues (${allLocs.length})`}
      </button>
    </div>`;

  const cards = locs.map((loc) => cardFor(loc, { featured: active && loc.slug === active.slug })).join('');

  const upcoming = locs
    .map((loc) => ({ loc, ev: eventMeta[loc.slug] }))
    .filter((x) => x.ev?.eventDate)
    .sort((a, b) => a.ev.eventDate.localeCompare(b.ev.eventDate));

  const timeline = upcoming.length
    ? upcoming
        .map(({ loc, ev }) => {
          const progress = checklistProgress(ev.checklist);
          const overdue = (ev.checklist || []).filter(
            (i) => !i.done && i.dueDate < new Date().toISOString().slice(0, 10)
          ).length;
          return `<div class="timeline-row">
          <div class="timeline-date">${formatEventDate(ev.eventDate)}</div>
          <div class="timeline-body">
            <strong>${esc(loc.shortName)}</strong> · ${countGuestsForLocation(loc, getOrdersForLocation(loc))} guests
            · ${progress}% done${overdue ? ` · <span style="color:var(--red)">${overdue} overdue</span>` : ''}
          </div>
        </div>`;
        })
        .join('')
    : '<p class="empty" style="padding:24px">No event dates set yet. Open <strong>Event Planner</strong> to schedule.</p>';

  document.getElementById('view-overview').innerHTML = `
    ${hero}
    ${typeof guestFlyerShortcutsHTML === 'function' ? guestFlyerShortcutsHTML() : ''}
    <div class="stats">
      <div class="stat"><div class="stat-label">${showingAll ? 'Venues shown' : 'Active events'}</div><div class="stat-val">${locs.length}</div></div>
      <div class="stat"><div class="stat-label">Preferences</div><div class="stat-val accent">${totalOrders}</div></div>
      <div class="stat"><div class="stat-label">Guests</div><div class="stat-val">${totalGuests}</div></div>
      <div class="stat"><div class="stat-label">Est. cost</div><div class="stat-val accent">${fmt(totalEst)}</div></div>
    </div>
    <div class="card-box" style="margin-bottom:24px">
      <h3>Upcoming</h3>
      <div class="timeline">${timeline}</div>
    </div>
    ${focusToggle}
    <div class="dash-loc-grid">${cards}</div>
    ${!showingAll ? `<p style="margin-top:14px;font-size:0.78rem;color:var(--muted)">Other venues (Edgefield, Grand Lodge, restaurants, etc.) are hidden so Kennedy School stays front and center. Use <strong>Show all venues</strong> when you need them.</p>` : ''}`;

  document.getElementById('toggleShowAllVenues')?.addEventListener('click', () => {
    if (typeof setShowAllVenues === 'function') setShowAllVenues(!showingAll);
    if (typeof fillLocationSelect === 'function') fillLocationSelect();
    renderOverview();
  });

  const goActive = (slug) => {
    currentSlug = slug || active?.slug || currentSlug;
    if (typeof fillLocationSelect === 'function') fillLocationSelect();
    else {
      const sel = document.getElementById('locSelect');
      if (sel) sel.value = currentSlug;
    }
    switchHostView('location');
    renderReport();
  };

  document.getElementById('heroOpenReport')?.addEventListener('click', () => goActive(active?.slug));
  document.getElementById('heroContacts')?.addEventListener('click', () => switchHostView('contacts'));
  document.getElementById('heroPlanner')?.addEventListener('click', () => {
    plannerSlug = active?.slug || plannerSlug;
    currentSlug = plannerSlug;
    if (typeof fillLocationSelect === 'function') fillLocationSelect();
    switchHostView('planner');
  });
  document.getElementById('heroInvite')?.addEventListener('click', (e) => {
    e.preventDefault();
    openInviteModal(active?.slug);
  });
  document.getElementById('heroFlyers')?.addEventListener('click', () => {
    document.getElementById('guest-flyers')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  document.querySelectorAll('[data-goto="location"], [data-open-report]').forEach((el) => {
    el.addEventListener('click', (e) => {
      if (e.target.closest('[data-invite]')) return;
      e.preventDefault();
      goActive(el.dataset.slug || el.dataset.openReport);
    });
  });
  document.querySelectorAll('[data-invite]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      openInviteModal(btn.dataset.invite);
    });
  });
}

async function renderPlanner() {
  await loadChecklistDefaults();
  // Full venue list in planner dropdown (same as top event selector)
  const locs =
    typeof getAllPlannerLocations === 'function'
      ? getAllPlannerLocations()
      : typeof getPlannerLocations === 'function'
        ? getPlannerLocations()
        : getAllLocations();
  if (!plannerSlug || !locs.find((l) => l.slug === plannerSlug)) {
    // Prefer active live event (Kennedy School BBQ)
    const active = typeof getActiveEventSlug === 'function' ? getActiveEventSlug() : null;
    const withDate = locs.find((l) => getLocationEvent(l.slug)?.eventDate);
    plannerSlug =
      (active && locs.find((l) => l.slug === active)?.slug) ||
      withDate?.slug ||
      locs[0]?.slug;
  }
  // Keep topbar in sync with planner venue
  if (typeof currentSlug !== 'undefined') {
    currentSlug = plannerSlug;
    if (typeof fillLocationSelect === 'function') fillLocationSelect();
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

  const guestHref = guestLink(plannerSlug);
  document.getElementById('view-planner').innerHTML = `
    <div class="planner-toolbar">
      <select class="loc-select" id="plannerSelect">
        ${locs.map(l => `<option value="${l.slug}"${l.slug === plannerSlug ? ' selected' : ''}>${esc(l.shortName)}</option>`).join('')}
      </select>
          <button type="button" class="btn-sm btn-accent" onclick="openInviteModal('${plannerSlug}')">Email / text guest link</button>
          <a class="btn-sm" href="${guestHref}" target="_blank">Open guest page ↗</a>
          <button type="button" class="btn-sm" data-copy-planner-link="${esc(guestHref)}">Copy guest link</button>
    </div>
    <div class="two-col" style="margin-bottom:24px">
      <div class="card-box">
        <h3>Event details · ${esc(loc.shortName)}${loc.guestSlug ? ' · Backyard BBQ' : ''}</h3>
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
          <div class="status-row"><span>Guest link</span><code style="font-size:0.72rem;word-break:break-all">guest.html?location=${(typeof resolveGuestSlug === 'function' ? resolveGuestSlug(loc.slug) : loc.slug)}</code></div>
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

  document.querySelector('[data-copy-planner-link]')?.addEventListener('click', e => {
    const link = e.currentTarget.getAttribute('data-copy-planner-link');
    copyText(link).then(() => alert('Guest link copied:\n\n' + link));
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
  document.getElementById('loc-toolbar').style.display =
    view === 'location' || view === 'waitlist' || view === 'gym' ? 'flex' : 'none';
  document.getElementById('hostTitle').textContent =
    view === 'overview' ? 'Overview'
    : view === 'venues' ? 'Venue research'
    : view === 'contacts' ? 'Contacts · Kennedy School'
    : view === 'planner' ? 'Event Planner'
    : view === 'outreach' ? 'Outreach & Integrations'
    : view === 'waitlist' ? 'Waitlist · Jordan Room mirror'
    : view === 'gym' ? 'Gym backup · 40 × 60 ft'
    : `${getLoc().shortName} · Report`;

  if (view === 'overview') renderOverview();
  if (view === 'venues') renderVenueCrm();
  if (view === 'planner') renderPlanner();
  if (view === 'location') renderReport();
  if (view === 'waitlist') renderWaitlistView();
  if (view === 'gym') renderGymView();
  if (view === 'contacts') renderContacts();
  if (view === 'outreach') renderOutreach();
}