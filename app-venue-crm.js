/* Venue tracking CRM — Command Center tab
   Data: data/venue-crm.js (preferred for file://) or fetch data/venue-crm.json
   Refresh source: ~/Work/projects/active-clients/events/sync_venue_crm.py
*/
let venueCrm = null;
let venueCrmFilter = 'all';
let venueCrmSelectedId = null;

async function loadVenueCrm() {
  if (venueCrm) return venueCrm;
  if (window.VENUE_CRM) {
    venueCrm = window.VENUE_CRM;
    return venueCrm;
  }
  try {
    const res = await fetch('data/venue-crm.json');
    if (res.ok) venueCrm = await res.json();
  } catch { /* file:// */ }
  venueCrm = venueCrm || { venues: [], counts: {}, follow_ups_due: [], total: 0, generated_at: null };
  return venueCrm;
}

/** Active + parked (over-budget) + out-of-market for lookup / filters */
function crmAllVenues(data) {
  const active = data.venues || [];
  const parked = (data.over_budget_venues || []).map(v => ({
    ...v,
    status: v.status || 'over_budget',
    parked: true,
  }));
  const oom = (data.out_of_market_venues || []).map(v => ({
    ...v,
    status: v.status || 'out_of_market',
    geo_excluded: true,
  }));
  // Prefer active copy if same id exists
  const seen = new Set(active.map(v => v.id));
  const extra = parked.concat(oom).filter(v => !seen.has(v.id));
  return active.concat(extra);
}

function crmFindVenue(data, id) {
  return crmAllVenues(data).find(v => v.id === id) || null;
}

function crmStatusLabel(s) {
  return ({
    awaiting_reply: 'No reply',
    replied: 'Replied',
    bounced: 'Bounced',
    partial_bounce: 'Partial bounce',
    over_budget: 'Over $3k',
    out_of_market: 'Out of market (WA)',
    security_hold: '⚠ Security hold',
  })[s] || (s || '—');
}

function crmStatusClass(s) {
  return ({
    awaiting_reply: 'crm-st-wait',
    replied: 'crm-st-ok',
    bounced: 'crm-st-bad',
    partial_bounce: 'crm-st-warn',
    over_budget: 'crm-st-park',
    out_of_market: 'crm-st-park',
    security_hold: 'crm-st-security',
  })[s] || 'crm-st-wait';
}

function crmIsImage(att) {
  const name = (att.name || att.path || '').toLowerCase();
  const kind = (att.kind || '').toLowerCase();
  if (kind === 'photo' || kind === 'image') return true;
  return /\.(jpe?g|png|gif|webp|heic|bmp)$/i.test(name);
}

function crmIsPdf(att) {
  const name = (att.name || att.path || '').toLowerCase();
  return (att.kind || '').toLowerCase() === 'pdf' || name.endsWith('.pdf');
}

/** Collect unique attachments from venue + thread (photos, PDFs, menus). */
function crmCollectAttachments(v) {
  if (!v) return [];
  const out = [];
  const seen = new Set();
  const push = (a, source) => {
    if (!a || !a.path) return;
    const key = a.path + '|' + (a.name || '');
    if (seen.has(key)) return;
    seen.add(key);
    out.push({
      name: a.name || a.path.split('/').pop(),
      path: a.path,
      thumb: a.thumb || (crmIsImage(a) ? a.path : null),
      kind: a.kind || (crmIsImage(a) ? 'photo' : crmIsPdf(a) ? 'pdf' : 'file'),
      note: a.note || '',
      source: source || '',
    });
  };
  (v.attachments || []).forEach(a => push(a, 'venue'));
  (v.thread || []).forEach(t => {
    (t.attachments || []).forEach(a => push(a, t.from || t.dir || 'thread'));
  });
  return out;
}

function crmFuClass(state) {
  return ({
    overdue: 'crm-fu-overdue',
    due_today: 'crm-fu-today',
    pending: 'crm-fu-pending',
    done: 'crm-fu-done',
  })[state] || 'crm-fu-pending';
}

function crmDirLabel(dir) {
  return ({ out: '→ Sent', in: '← Received', note: '· Note' })[dir] || dir;
}

function crmDaysSince(iso) {
  if (!iso) return null;
  const d = new Date(iso.slice(0, 10) + 'T12:00:00');
  if (Number.isNaN(d.getTime())) return null;
  const now = new Date();
  const mid = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((mid - d) / 86400000);
}

function crmBranches(v) {
  if (Array.isArray(v.branches) && v.branches.length) return v.branches;
  if (v.parked || v.status === 'over_budget') return ['premium'];
  return ['premium'];
}

function filteredVenues(data) {
  let list = data.venues || [];
  if (venueCrmFilter === 'parked') {
    return (data.over_budget_venues || []).map(v => ({ ...v, status: v.status || 'over_budget', parked: true, branches: ['premium'] }));
  }
  if (venueCrmFilter === 'out_of_market') {
    return (data.out_of_market_venues || []).map(v => ({
      ...v, status: v.status || 'out_of_market', geo_excluded: true,
    }));
  }
  if (venueCrmFilter === 'files') {
    return crmAllVenues(data).filter(v => crmCollectAttachments(v).length > 0);
  }
  if (venueCrmFilter === 'action') list = list.filter(v => v.needs_action || v.status === 'replied');
  else if (venueCrmFilter === 'waiting') list = list.filter(v => v.status === 'awaiting_reply');
  else if (venueCrmFilter === 'bounced') list = list.filter(v => v.status === 'bounced' || v.status === 'partial_bounce');
  else if (venueCrmFilter === 'security') list = list.filter(v => v.status === 'security_hold');
  else if (venueCrmFilter === 'replied') list = list.filter(v => v.status === 'replied');
  else if (venueCrmFilter === 'affordable') list = list.filter(v => crmBranches(v).includes('affordable'));
  else if (venueCrmFilter === 'premium') list = list.filter(v => crmBranches(v).includes('premium'));
  return list;
}

/** Sectioned lists for the "all" pipeline view.
 *  Active replies stay open; no-reply + bounces + parked are collapsed by default.
 */
function crmPipelineSections(data) {
  const venues = data.venues || [];
  const over = (data.over_budget_venues || []).map(v => ({
    ...v, status: v.status || 'over_budget', parked: true, pipeline_section: 'over_budget',
  }));
  const replies = venues.filter(v => v.status === 'replied')
    .sort((a, b) => (a.venue || '').localeCompare(b.venue || ''));
  const noReply = venues.filter(v => v.status === 'awaiting_reply')
    .sort((a, b) => (a.venue || '').localeCompare(b.venue || ''));
  const delivery = venues.filter(v => v.status === 'bounced' || v.status === 'partial_bounce')
    .sort((a, b) => (a.venue || '').localeCompare(b.venue || ''));
  const security = venues.filter(v => v.status === 'security_hold');
  const oom = (data.out_of_market_venues || []).map(v => ({
    ...v, status: v.status || 'out_of_market', geo_excluded: true, pipeline_section: 'out_of_market',
  }));
  const cold = [...noReply, ...delivery];
  return [
    {
      id: 'replies',
      label: 'Active · Replies — your move',
      hint: 'Human replies in market. Work this list first.',
      rows: replies,
      tone: 'ok',
      open: true,
      compact: false,
    },
    {
      id: 'cold_inbox',
      label: 'No reply & bounces',
      hint: 'Collapsed by default. No reply = still waiting. Bounce = bad address / DSN — phone or web form, not more email.',
      rows: cold,
      tone: 'wait',
      open: false,
      compact: true,
      groups: [
        { id: 'no_reply', label: 'No reply yet', rows: noReply },
        { id: 'bounces', label: 'Bounces & delivery failures', rows: delivery },
      ],
    },
    {
      id: 'over_budget',
      label: 'Parked · Over $3k',
      hint: 'History only — not ideal for this series.',
      rows: over,
      tone: 'park',
      open: false,
      compact: true,
    },
    {
      id: 'out_of_market',
      label: 'Parked · Out of market (Vancouver WA)',
      hint: 'Geo/tax park — Oregon only. Do not pursue.',
      rows: oom,
      tone: 'park',
      open: false,
      compact: true,
    },
    ...(security.length
      ? [{
          id: 'security',
          label: '⚠ Security hold',
          hint: 'Verify before acting.',
          rows: security,
          tone: 'security',
          open: true,
          compact: false,
        }]
      : []),
  ];
}

/** Remember which collapsible sections the user opened (session only). */
const crmSectionOpenState = Object.create(null);

function renderVenueTableRows(list, opts = {}) {
  const compact = !!opts.compact;
  return list.map(v => {
    const days = crmDaysSince(v.first_sent);
    const nextFu = (v.follow_ups || []).find(f => f.state !== 'done' && f.kind !== 'milestone');
    const noReplyMark = v.no_reply
      ? `<span class="crm-noreply" title="No human reply yet">NO REPLY</span>`
      : '';
    const atts = crmCollectAttachments(v);
    const nImg = atts.filter(crmIsImage).length;
    const nDoc = atts.length - nImg;
    const filesCell = atts.length
      ? `<span class="crm-file-count" title="${atts.length} attachment(s)">${atts.length}${nImg ? ` · ${nImg} photo${nImg > 1 ? 's' : ''}` : ''}${nDoc ? ` · ${nDoc} file${nDoc > 1 ? 's' : ''}` : ''}</span>`
      : '<span class="crm-file-none">—</span>';
    const slugLinks = (v.linked_slugs || []).filter(Boolean).map(s =>
      `<a class="crm-slug" href="guest.html?location=${encodeURIComponent(s)}" target="_blank" rel="noopener">${esc(s)}</a>`
    ).join(' ');
    const cp = v.cost_planning || {};
    let costHint = '';
    if (cp.fb_min_usd != null || cp.median_host_cost_35 != null) {
      const bits = [];
      if (cp.fb_min_usd != null) bits.push('min $' + Number(cp.fb_min_usd).toLocaleString());
      if (cp.median_host_cost_35 != null) bits.push('@35 $' + Number(cp.median_host_cost_35).toLocaleString());
      costHint = `<div class="crm-emails">${esc(bits.join(' · '))}</div>`;
    } else if (v.quote_min) {
      costHint = `<div class="crm-emails">${esc(v.quote_min)}</div>`;
    }
    const branchBits = crmBranches(v).map(b =>
      `<span class="crm-branch crm-branch-${esc(b)}">${b === 'affordable' ? 'mid-tier' : 'premium'}</span>`
    ).join(' ');

    // Compact row for cold/parked drawers — less noise
    if (compact) {
      return `<tr class="crm-row crm-row-compact" data-open-venue="${esc(v.id)}">
        <td>
          <strong>${esc(v.venue)}</strong>
          ${noReplyMark}
          <div class="crm-emails">${esc((v.emails_sent || []).slice(0, 2).join(', '))}${(v.emails_sent || []).length > 2 ? '…' : ''}</div>
        </td>
        <td><span class="crm-badge ${crmStatusClass(v.status)}">${crmStatusLabel(v.status)}</span></td>
        <td>${days != null ? days + 'd' : '—'}</td>
        <td class="crm-action-cell">${esc(v.next_action || '—')}</td>
        <td><button type="button" class="btn-sm btn-accent" data-open-venue="${esc(v.id)}">Open</button></td>
      </tr>`;
    }

    return `<tr class="crm-row" data-open-venue="${esc(v.id)}">
      <td>
        <strong>${esc(v.venue)}</strong>
        ${noReplyMark}
        <div class="crm-branches">${branchBits}</div>
        <div class="crm-emails">${(v.emails_sent || []).map(esc).join(', ')}</div>
        ${slugLinks ? `<div class="crm-slugs">${slugLinks}</div>` : ''}
        ${costHint}
      </td>
      <td><span class="crm-badge ${crmStatusClass(v.status)}">${crmStatusLabel(v.status)}</span></td>
      <td>${filesCell}</td>
      <td>${v.first_sent ? esc(v.first_sent.slice(0, 10)) : '—'}</td>
      <td>${days != null ? days + 'd' : '—'}</td>
      <td class="${nextFu ? crmFuClass(nextFu.state) : ''}">${nextFu ? esc(nextFu.due_date + ' · ' + nextFu.label) : '—'}</td>
      <td>${esc(v.next_action || v.quote_min || '—')}</td>
      <td><button type="button" class="btn-sm btn-accent" data-open-venue="${esc(v.id)}">Open</button></td>
    </tr>`;
  }).join('');
}

function renderVenueTable(list, opts = {}) {
  const compact = !!opts.compact;
  if (!list.length) {
    return `<p class="empty" style="padding:12px 4px">None in this section.</p>`;
  }
  if (compact) {
    return `<div style="overflow-x:auto">
      <table class="crm-table crm-table-compact">
        <thead>
          <tr>
            <th>Venue</th><th>Status</th><th>Days</th><th>Next action</th><th></th>
          </tr>
        </thead>
        <tbody>${renderVenueTableRows(list, { compact: true })}</tbody>
      </table>
    </div>`;
  }
  return `<div style="overflow-x:auto">
    <table class="crm-table">
      <thead>
        <tr>
          <th>Venue</th><th>Status</th><th>Files</th><th>Sent</th><th>Days</th>
          <th>Next follow-up</th><th>Next action / quote</th><th></th>
        </tr>
      </thead>
      <tbody>${renderVenueTableRows(list, { compact: false })}</tbody>
    </table>
  </div>`;
}

function renderSectionBody(sec) {
  if (sec.groups && sec.groups.length) {
    const parts = sec.groups.map(g => {
      const gn = g.rows.length;
      if (!gn) return '';
      return `<div class="crm-subsec">
        <div class="crm-subsec-head">
          <span class="crm-subsec-title">${esc(g.label)}</span>
          <span class="crm-section-count">${gn}</span>
        </div>
        ${renderVenueTable(g.rows, { compact: !!sec.compact })}
      </div>`;
    }).filter(Boolean);
    if (!parts.length) {
      return `<p class="empty" style="padding:12px 4px">None in this section.</p>`;
    }
    return parts.join('');
  }
  return renderVenueTable(sec.rows, { compact: !!sec.compact });
}

function renderSectionedPipeline(data) {
  const sections = crmPipelineSections(data);
  return sections.map(sec => {
    const n = sec.rows.length;
    // User override > default open for active replies only
    const isOpen = crmSectionOpenState[sec.id] != null
      ? crmSectionOpenState[sec.id]
      : !!sec.open;
    const openAttr = isOpen ? ' open' : '';
    const chevron = isOpen ? '▾' : '▸';
    return `
      <details class="crm-section crm-section-${esc(sec.tone)} ${isOpen ? 'is-open' : 'is-collapsed'}"
               id="crm-sec-${esc(sec.id)}"
               data-crm-section="${esc(sec.id)}"${openAttr}>
        <summary class="crm-section-summary">
          <span class="crm-section-chevron" aria-hidden="true">${chevron}</span>
          <span class="crm-section-title-text">${esc(sec.label)}</span>
          <span class="crm-section-count">${n}</span>
          <span class="crm-section-toggle-hint">${isOpen ? 'Click to collapse' : 'Click to expand'}</span>
        </summary>
        <div class="crm-section-body">
          <p class="crm-section-hint">${esc(sec.hint)}</p>
          ${renderSectionBody(sec)}
        </div>
      </details>`;
  }).join('');
}

async function renderVenueCrm() {
  const data = await loadVenueCrm();
  const counts = data.counts || {};
  const list = filteredVenues(data);
  const fu = data.follow_ups_due || [];

  const bounceN = (counts.bounced || 0) + (counts.partial_bounce || 0);
  const parkedN = (data.over_budget_venues || []).length;
  const oomN = (data.out_of_market_venues || []).length;
  const stats = `
    <div class="stats" style="grid-template-columns:repeat(6,1fr)">
      <div class="stat"><div class="stat-label">1 · Replies</div><div class="stat-val accent">${counts.replied || 0}</div></div>
      <div class="stat"><div class="stat-label">2 · No reply</div><div class="stat-val">${counts.awaiting_reply || 0}</div></div>
      <div class="stat"><div class="stat-label">3 · Bounces</div><div class="stat-val">${bounceN}</div></div>
      <div class="stat"><div class="stat-label">4 · Over $3k</div><div class="stat-val">${parkedN}</div></div>
      <div class="stat"><div class="stat-label">5 · Out of mkt</div><div class="stat-val">${oomN}</div></div>
      <div class="stat"><div class="stat-label">Follow-ups (7d)</div><div class="stat-val accent">${fu.length}</div></div>
    </div>`;

  const policy = data.policy || {};
  const budget = data.budget_policy || {};
  const geo = data.geo_policy || {};
  const budgetMax = budget.max_ideal_fb_min_usd;
  const policyNote = `
    <div class="rate-note">
      <strong>Market</strong> — ${esc(geo.primary_market || 'Portland, OR + surrounding Oregon only')}.
      ${geo.reason ? `<br>${esc(geo.reason)}` : ' <strong>No Vancouver WA</strong> (sales tax).'}
      <br><strong>Follow-up policy</strong> — No reply: ${(policy.awaiting_reply || []).join(' · ') || 'soft D+3 / phone'}.
      Replied: ${policy.replied || 'Act same day'}. Bounce: ${policy.bounced || 'Alternate path now'}.
      ${budgetMax ? `<br><strong>Budget</strong> — Ideal F&amp;B min ≤ $${Number(budgetMax).toLocaleString()}. Event #1 mid-tier target $45–70/head.` : ''}
      <br><span style="opacity:.85">CRM refreshed ${data.generated_at ? new Date(data.generated_at).toLocaleString() : '—'}.</span>
    </div>`;

  const renderFuRows = (items) => items.map(f => `
    <button type="button" class="crm-fu-row ${crmFuClass(f.state)}" data-open-venue="${esc(f.venue_id)}">
      <span class="crm-fu-date">${esc(f.due_date)}</span>
      <span class="crm-fu-venue">${esc(f.venue)}</span>
      <span class="crm-fu-label">${esc(f.label)}</span>
      <span class="crm-fu-action">${esc(f.action)}</span>
      <span class="crm-badge ${crmStatusClass(f.status)}">${crmStatusLabel(f.status)}</span>
    </button>`).join('');

  // Split follow-ups: keep "replied / needs action" visible; collapse no-reply + bounces
  const fuActive = fu.filter(f => f.status === 'replied' || f.status === 'security_hold');
  const fuNoReply = fu.filter(f => f.status === 'awaiting_reply');
  const fuBounce = fu.filter(f => f.status === 'bounced' || f.status === 'partial_bounce');
  const fuCold = fu.filter(f =>
    f.status === 'awaiting_reply' || f.status === 'bounced' || f.status === 'partial_bounce'
  );
  const fuOther = fu.filter(f =>
    !['replied', 'security_hold', 'awaiting_reply', 'bounced', 'partial_bounce'].includes(f.status)
  );
  const coldOpen = crmSectionOpenState['fu-cold'] != null ? crmSectionOpenState['fu-cold'] : false;

  const fuBlock = fu.length
    ? `<div class="card-box crm-fu-box">
        <h3 style="margin:0 0 6px">Follow-up timeline</h3>
        <p class="crm-section-hint" style="margin:0 0 12px">
          Overdue → next 7 days. <strong>Active replies</strong> stay open;
          <strong>no reply &amp; bounces</strong> are collapsed so they don’t flood the page.
        </p>

        ${fuActive.length ? `
          <div class="crm-fu-group">
            <div class="crm-fu-group-head">
              <span class="crm-fu-group-title">Active · replies / your move</span>
              <span class="crm-section-count">${fuActive.length}</span>
            </div>
            <div class="crm-fu-list">${renderFuRows(fuActive)}</div>
          </div>` : ''}

        ${fuOther.length ? `
          <div class="crm-fu-group">
            <div class="crm-fu-group-head">
              <span class="crm-fu-group-title">Other</span>
              <span class="crm-section-count">${fuOther.length}</span>
            </div>
            <div class="crm-fu-list">${renderFuRows(fuOther)}</div>
          </div>` : ''}

        ${fuCold.length ? `
          <details class="crm-fu-drawer"${coldOpen ? ' open' : ''} data-crm-section="fu-cold">
            <summary class="crm-fu-drawer-summary">
              <span class="crm-section-chevron">${coldOpen ? '▾' : '▸'}</span>
              <span class="crm-fu-group-title">No reply &amp; bounces</span>
              <span class="crm-section-count">${fuCold.length}</span>
              <span class="crm-section-toggle-hint">${coldOpen ? 'Click to collapse' : 'Click to expand'}</span>
            </summary>
            <div class="crm-fu-drawer-body">
              ${fuNoReply.length ? `
                <div class="crm-subsec">
                  <div class="crm-subsec-head">
                    <span class="crm-subsec-title">No reply yet</span>
                    <span class="crm-section-count">${fuNoReply.length}</span>
                  </div>
                  <div class="crm-fu-list">${renderFuRows(fuNoReply)}</div>
                </div>` : ''}
              ${fuBounce.length ? `
                <div class="crm-subsec">
                  <div class="crm-subsec-head">
                    <span class="crm-subsec-title">Bounces &amp; delivery failures</span>
                    <span class="crm-section-count">${fuBounce.length}</span>
                  </div>
                  <div class="crm-fu-list">${renderFuRows(fuBounce)}</div>
                </div>` : ''}
            </div>
          </details>` : ''}

        ${!fuActive.length && !fuCold.length && !fuOther.length
          ? '<p class="empty" style="padding:12px 0">No follow-ups due in the next 7 days.</p>'
          : ''}
      </div>`
    : `<div class="card-box"><h3>Follow-up timeline</h3><p class="empty" style="padding:20px">No follow-ups due in the next 7 days.</p></div>`;

  const money = (n) => (n == null ? '—' : '$' + Number(n).toLocaleString());
  const renderCostTable = (rows, title, hint, opts = {}) => {
    if (!rows || !rows.length) return '';
    const sorted = rows.slice().sort((a, b) => {
      const am = a.median_35 != null ? a.median_35 : 9e9;
      const bm = b.median_35 != null ? b.median_35 : 9e9;
      return am - bm;
    });
    const sid = opts.sectionId || ('cost-' + title.slice(0, 12).replace(/\W+/g, '-').toLowerCase());
    const isOpen = crmSectionOpenState[sid] != null ? crmSectionOpenState[sid] : !!opts.open;
    return `<details class="card-box crm-drawer"${isOpen ? ' open' : ''} data-crm-section="${esc(sid)}">
        <summary class="crm-drawer-summary">
          <span class="crm-section-chevron">${isOpen ? '▾' : '▸'}</span>
          <span>${esc(title)}</span>
          <span class="crm-section-count">${sorted.length}</span>
          <a class="btn-sm btn-accent" href="cost-simulation.html" target="_blank" rel="noopener" onclick="event.stopPropagation()">Full planner ↗</a>
        </summary>
        <div class="crm-section-body">
        <p class="crm-section-hint" style="margin:0 0 12px">${hint}</p>
        <div style="overflow-x:auto">
          <table class="crm-table">
            <thead>
              <tr>
                <th>Venue</th><th>Budget</th><th>F&amp;B min</th><th>@35 median</th><th>$/head</th><th>Hub</th>
              </tr>
            </thead>
            <tbody>
              ${sorted.map(r => {
                const badge = r.budget_ok === true
                  ? '<span class="crm-badge crm-st-ok">In band / OK</span>'
                  : r.budget_ok === false
                    ? '<span class="crm-badge crm-st-park">Over / parked</span>'
                    : '<span class="crm-badge crm-st-wait">Min TBD</span>';
                const ph = r.per_head != null ? r.per_head
                  : (r.median_35 != null ? Math.round(r.median_35 / 35) : null);
                return `<tr>
                  <td><strong>${esc(r.name)}</strong></td>
                  <td>${badge}</td>
                  <td>${r.fb_min != null ? money(r.fb_min) : 'TBD'}</td>
                  <td><strong>${money(r.median_35)}</strong></td>
                  <td>${ph != null ? money(ph) : '—'}</td>
                  <td>${r.slug ? `<a class="crm-slug" href="cost-simulation.html" target="_blank" rel="noopener">${esc(r.slug)}</a>` : '—'}</td>
                </tr>`;
              }).join('')}
            </tbody>
          </table>
        </div>
        </div>
      </details>`;
  };

  const branches = data.pipeline_branches || {};
  const bc = data.branch_counts || {};
  const branchBanner = `
    <div class="card-box crm-branch-banner">
      <h3 style="margin:0 0 8px">Dual pipeline (Path C)</h3>
      <p class="crm-section-hint" style="margin:0 0 12px">
        <strong>Market:</strong> Portland OR + surrounding Oregon only — <strong>no Vancouver WA</strong> (sales tax).
        <strong>Event #1 focus:</strong> mid-tier <strong>$45–70/head</strong>
        (${bc.affordable || 0} venues · ${bc.affordable_replied || 0} replied).
        <strong>Premium retained</strong> for later events
        (${bc.premium || 0} venues · ${bc.premium_replied || 0} replied).
        WA leads parked under Out of market (history kept).
      </p>
      <div class="crm-branch-cards">
        <div class="crm-branch-card crm-branch-card-aff">
          <div class="crm-k">Affordable mid-tier</div>
          <div class="stat-val accent" style="font-size:1.2rem">$45–70/head</div>
          <div class="crm-emails">${esc((branches.affordable || {}).note || 'First-event economics')}</div>
        </div>
        <div class="crm-branch-card crm-branch-card-prem">
          <div class="crm-k">Premium private dining</div>
          <div class="stat-val" style="font-size:1.2rem">$90–150/head</div>
          <div class="crm-emails">${esc((branches.premium || {}).note || 'Kept warm for pipeline growth')}</div>
        </div>
      </div>
    </div>`;

  const costBlock =
    renderCostTable(
      data.cost_comparison_affordable_35 || [],
      'Cost compare · AFFORDABLE mid-tier · 35 guests',
      'Event #1 band: <strong>$45–70/head</strong>. Estimates until quotes land. Prefer real mins over placeholders.',
      { sectionId: 'cost-affordable', open: false }
    ) +
    renderCostTable(
      data.cost_comparison_35 || [],
      'Cost compare · full pipeline (incl. premium)',
      'Includes premium + parked. Ideal F&amp;B min ≤ $3,000 still applies as hard filter for over-budget parking.',
      { sectionId: 'cost-full', open: false }
    );

  const filesCount = crmAllVenues(data).filter(v => crmCollectAttachments(v).length > 0).length;
  const parkedCount = (data.over_budget_venues || []).length;
  const filters = `
    <div class="crm-filters">
      ${[
        ['all', 'Full pipeline'],
        ['affordable', `Mid-tier (${bc.affordable || 0})`],
        ['premium', `Premium (${bc.premium || 0})`],
        ['replied', `Replies (${counts.replied || 0})`],
        ['waiting', `No reply (${counts.awaiting_reply || 0})`],
        ['bounced', `Bounces (${bounceN})`],
        ['parked', `Over $3k (${parkedCount})`],
        ['out_of_market', `WA / out of mkt (${oomN})`],
        ['files', `Has files (${filesCount})`],
        ['action', 'Needs action'],
      ].map(([k, lab]) => `
        <button type="button" class="host-tab ${venueCrmFilter === k ? 'active' : ''}" data-crm-filter="${k}">${lab}</button>
      `).join('')}
    </div>`;

  // Default "all" view = active replies open; cold/parked in collapsible drawers
  const isColdFilter = venueCrmFilter === 'waiting' || venueCrmFilter === 'bounced'
    || venueCrmFilter === 'parked' || venueCrmFilter === 'out_of_market';
  const table = venueCrmFilter === 'all'
    ? `<div class="card-box crm-pipeline-box">
        <h3>Venue pipeline</h3>
        <p class="crm-section-hint" style="margin:0 0 10px">
          <strong>Active replies</strong> stay open. <strong>No reply &amp; bounces</strong> and parked lists are collapsed — click a header to expand.
        </p>
        ${filters}
        <div class="crm-sections" style="margin-top:16px">${renderSectionedPipeline(data)}</div>
      </div>`
    : `<div class="card-box">
        <h3>Venue pipeline (${list.length})</h3>
        ${filters}
        <div style="margin-top:14px">
          ${list.length
            ? renderVenueTable(list, { compact: isColdFilter })
            : '<p class="empty" style="padding:20px">No venues in this filter.</p>'}
        </div>
      </div>`;

  const detail = venueCrmSelectedId
    ? renderVenueDetail(crmFindVenue(data, venueCrmSelectedId))
    : `<div class="card-box"><h3>Conversation & files</h3>
        <p class="empty" style="padding:24px">Select a venue to see emails, replies, <strong>photos</strong>, PDFs, and the follow-up timeline. Use the <em>Has files</em> filter to jump to venues that sent attachments.</p></div>`;

  // Dual pipeline + policy + cost: collapsible so they don't dominate the page
  const branchOpen = crmSectionOpenState['dual-pipeline'] != null
    ? crmSectionOpenState['dual-pipeline'] : false;
  const branchDrawer = `
    <details class="card-box crm-drawer"${branchOpen ? ' open' : ''} data-crm-section="dual-pipeline">
      <summary class="crm-drawer-summary">
        <span class="crm-section-chevron">${branchOpen ? '▾' : '▸'}</span>
        <span>Dual pipeline (Path C) &amp; market notes</span>
      </summary>
      <div class="crm-section-body">
        ${branchBanner.replace('card-box crm-branch-banner', 'crm-branch-banner')}
        ${policyNote}
      </div>
    </details>`;

  document.getElementById('view-venues').innerHTML = `
    ${stats}
    ${branchDrawer}
    ${costBlock}
    ${fuBlock}
    <div class="crm-layout">
      <div class="crm-main">${table}</div>
      <div class="crm-side" id="crm-detail">${detail}</div>
    </div>`;

  document.querySelectorAll('[data-crm-filter]').forEach(btn => {
    btn.addEventListener('click', () => {
      venueCrmFilter = btn.dataset.crmFilter;
      renderVenueCrm();
    });
  });
  document.querySelectorAll('[data-open-venue]').forEach(el => {
    el.addEventListener('click', e => {
      e.preventDefault();
      e.stopPropagation();
      venueCrmSelectedId = el.dataset.openVenue;
      renderVenueCrm();
      document.getElementById('crm-detail')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    });
  });
  // Persist open/closed for drawers across re-renders in this session
  document.querySelectorAll('details[data-crm-section]').forEach(el => {
    el.addEventListener('toggle', () => {
      const id = el.dataset.crmSection;
      if (!id) return;
      crmSectionOpenState[id] = el.open;
      const chev = el.querySelector('.crm-section-chevron');
      if (chev) chev.textContent = el.open ? '▾' : '▸';
      const hint = el.querySelector('.crm-section-toggle-hint');
      if (hint) hint.textContent = el.open ? 'Click to collapse' : 'Click to expand';
    });
  });
}

function renderAttachmentGallery(atts) {
  if (!atts.length) {
    return `<p class="empty" style="padding:8px 0">No photos or files saved for this venue yet. When a venue sends menus/photos, they land in <code>data/venue-attachments/</code> and show here.</p>`;
  }
  const photos = atts.filter(crmIsImage);
  const docs = atts.filter(a => !crmIsImage(a));

  const photoGrid = photos.length
    ? `<div class="crm-photo-grid">
        ${photos.map((a, i) => {
          const src = a.thumb || a.path;
          return `
          <button type="button" class="crm-photo-card" data-crm-lightbox="${esc(a.path)}" data-crm-lightbox-label="${esc(a.note || a.name)}" title="${esc(a.name)}">
            <img src="${esc(src)}" alt="${esc(a.note || a.name)}" loading="lazy" />
            <span class="crm-photo-cap">${esc(a.note || a.name)}</span>
          </button>`;
        }).join('')}
      </div>`
    : '';

  const docList = docs.length
    ? `<div class="crm-doc-grid">
        ${docs.map(a => {
          const kind = crmIsPdf(a) ? 'PDF' : (a.kind || 'FILE').toUpperCase();
          return `
          <a class="crm-doc-card" href="${esc(a.path)}" target="_blank" rel="noopener" title="${esc(a.name)}">
            <span class="crm-doc-kind">${esc(kind)}</span>
            <span class="crm-doc-name">${esc(a.name)}</span>
            ${a.note ? `<span class="crm-doc-note">${esc(a.note)}</span>` : ''}
            <span class="crm-doc-open">Open ↗</span>
          </a>`;
        }).join('')}
      </div>`
    : '';

  return `
    <div class="crm-files-panel">
      <div class="crm-files-meta">${photos.length} photo${photos.length === 1 ? '' : 's'} · ${docs.length} document${docs.length === 1 ? '' : 's'}</div>
      ${photos.length ? `<div class="crm-k" style="margin-top:10px">Photos / room shots</div>${photoGrid}` : ''}
      ${docs.length ? `<div class="crm-k" style="margin-top:14px">Menus & PDFs</div>${docList}` : ''}
    </div>`;
}

function renderVenueDetail(v) {
  if (!v) {
    return `<div class="card-box"><h3>Conversation & files</h3><p class="empty">Venue not found.</p></div>`;
  }
  const days = crmDaysSince(v.first_sent);
  const contacts = (v.contacts || []).map(c => {
    const bits = [c.name, c.role, c.email, c.phone].filter(Boolean);
    return `<div class="crm-contact">${bits.map(esc).join(' · ')}</div>`;
  }).join('') || '<div class="crm-contact">—</div>';

  const thread = (v.thread || []).map(t => {
    const tAtts = t.attachments || [];
    const attBits = tAtts.map(a => {
      if (crmIsImage(a)) {
        const src = a.thumb || a.path;
        return `<button type="button" class="crm-msg-thumb" data-crm-lightbox="${esc(a.path)}" data-crm-lightbox-label="${esc(a.note || a.name)}">
          <img src="${esc(src)}" alt="${esc(a.name)}" loading="lazy" />
        </button>`;
      }
      return `<a class="crm-att" href="${esc(a.path)}" target="_blank" rel="noopener">${esc(a.name)}</a>${a.note ? ` <span class="crm-att-note">${esc(a.note)}</span>` : ''}`;
    }).join('');
    const links = (t.links || []).filter(l => l.url).map(l =>
      `<a class="crm-att" href="${esc(l.url)}" target="_blank" rel="noopener">${esc(l.label || l.url)}</a>`
    ).join('<br>');
    return `
      <div class="crm-msg crm-msg-${esc(t.dir || 'note')}">
        <div class="crm-msg-meta">
          <span class="crm-msg-dir">${crmDirLabel(t.dir)}</span>
          <span>${t.at ? esc(String(t.at).replace('T', ' ').slice(0, 16)) : ''}</span>
        </div>
        <div class="crm-msg-from">${esc(t.from || '')}</div>
        ${t.subject ? `<div class="crm-msg-subj">${esc(t.subject)}</div>` : ''}
        <div class="crm-msg-body">${esc(t.body || '')}</div>
        ${attBits ? `<div class="crm-msg-atts crm-msg-atts-rich">${attBits}</div>` : ''}
        ${links ? `<div class="crm-msg-atts">${links}</div>` : ''}
      </div>`;
  }).join('') || '<p class="empty" style="padding:12px">No thread logged yet.</p>';

  const fus = (v.follow_ups || []).map(f => `
    <div class="crm-fu-item ${crmFuClass(f.state)}">
      <div class="crm-fu-item-date">${esc(f.due_date || '—')}</div>
      <div>
        <strong>${esc(f.label)}</strong>
        <div class="crm-fu-item-action">${esc(f.action)}</div>
        <span class="crm-fu-state">${esc((f.state || '').replace('_', ' '))}</span>
      </div>
    </div>`).join('');

  const allAtts = crmCollectAttachments(v);
  const hubLinks = (v.linked_slugs || []).filter(Boolean).map(s =>
    `<a class="btn-sm" href="guest.html?location=${encodeURIComponent(s)}" target="_blank" rel="noopener">${esc(s)} guest page</a>
     <a class="btn-sm" href="cost-simulation.html" target="_blank" rel="noopener">Cost planning</a>
     <button type="button" class="btn-sm" data-goto-loc="${esc(s)}">Open in reports</button>`
  ).join(' ');

  const parkedBanner = (v.parked || v.status === 'over_budget')
    ? `<div class="crm-park-banner">PARKED · over $3k budget filter · still viewable for files / history</div>`
    : (v.geo_excluded || v.status === 'out_of_market')
      ? `<div class="crm-park-banner">OUT OF MARKET · Vancouver WA / WA sales tax · Portland OR + surrounding Oregon only · history kept</div>`
      : '';
  const securityBanner = (v.status === 'security_hold')
    ? `<div class="crm-security-banner"><strong>⚠ SECURITY HOLD — verify before acting</strong>
        Do <em>not</em> reply, open attachments, click links, or send deposit/contract info until the person and offer
        are confirmed by phone using a number from an official public listing (not from the email).
        Domain research may show a real corporate domain; that still is not enough for a deposit.</div>`
    : '';

  const cp = v.cost_planning || null;
  let costPanel = '';
  if (cp) {
    const budgetLabel = cp.budget_ok === true
      ? '<span class="crm-badge crm-st-ok">Under $3k min</span>'
      : cp.budget_ok === false
        ? '<span class="crm-badge crm-st-park">Over $3k / parked</span>'
        : '<span class="crm-badge crm-st-wait">Min TBD</span>';
    const money = (n) => (n == null || n === '' ? '—' : '$' + Number(n).toLocaleString());
    const opts = (cp.options || []).map(o =>
      `<tr>
        <td>${esc(o.name || o.slug)}</td>
        <td>${o.fb_min_usd != null ? money(o.fb_min_usd) : 'TBD'}</td>
        <td>${o.service_pct != null ? Math.round(o.service_pct * 100) + '%' : '—'}</td>
        <td>${o.median_host_cost_35 != null ? money(o.median_host_cost_35) : '—'}</td>
        <td>${o.budget_ok === false || o.parked ? 'Parked' : o.budget_ok === true ? 'OK' : 'TBD'}</td>
      </tr>`
    ).join('');
    costPanel = `
      <h4 class="crm-subh">Cost planning</h4>
      <div class="crm-cost-panel">
        <div class="crm-detail-grid">
          <div><span class="crm-k">Budget filter</span>${budgetLabel}</div>
          <div><span class="crm-k">F&amp;B min</span>${cp.fb_min_usd != null ? money(cp.fb_min_usd) : 'TBD'}${cp.fb_min_note ? `<div class="crm-emails">${esc(cp.fb_min_note)}</div>` : ''}</div>
          <div><span class="crm-k">Service</span>${cp.service_pct != null ? Math.round(cp.service_pct * 100) + '%' : '—'}${cp.service_note ? `<div class="crm-emails">${esc(cp.service_note)}</div>` : ''}</div>
          <div><span class="crm-k">Room + AV</span>${money((cp.room_fee_usd || 0) + (cp.av_fee_usd || 0))}</div>
          <div><span class="crm-k">Package / pp</span>${cp.package_pp_usd != null ? money(cp.package_pp_usd) : '—'}</div>
          <div><span class="crm-k">Drink / pp</span>${cp.drink_pp_usd != null ? money(cp.drink_pp_usd) : '—'}</div>
          <div><span class="crm-k">@35 host cost</span><strong>${cp.median_host_cost_35 != null ? money(cp.median_host_cost_35) : '—'}</strong>${cp.median_note ? `<div class="crm-emails">${esc(cp.median_note)}</div>` : ''}</div>
          <div><span class="crm-k">Quote date</span>${esc(cp.quote_date || '—')}</div>
        </div>
        ${cp.room_name ? `<p class="crm-emails" style="margin:8px 0 0">Room: ${esc(cp.room_name)}</p>` : ''}
        ${cp.av_note ? `<p class="crm-emails" style="margin:4px 0 0">AV: ${esc(cp.av_note)}</p>` : ''}
        ${cp.deposit_note ? `<p class="crm-emails" style="margin:4px 0 0">Hold: ${esc(cp.deposit_note)}</p>` : ''}
        ${cp.source ? `<p class="crm-emails" style="margin:4px 0 0">Source: ${esc(cp.source)}</p>` : ''}
        ${opts ? `<table class="crm-table" style="margin-top:10px"><thead><tr><th>Option</th><th>F&amp;B min</th><th>Svc</th><th>@35</th><th>Budget</th></tr></thead><tbody>${opts}</tbody></table>` : ''}
        <div class="crm-hub-links" style="margin-top:10px">
          <a class="btn-sm btn-accent" href="cost-simulation.html" target="_blank" rel="noopener">Open full cost planner ↗</a>
          ${cp.hub_slug ? `<a class="btn-sm" href="guest.html?location=${encodeURIComponent(cp.hub_slug)}" target="_blank" rel="noopener">Guest page · ${esc(cp.hub_slug)}</a>` : ''}
        </div>
      </div>`;
  }

  return `
    <div class="card-box crm-detail-card">
      <div class="crm-detail-head">
        <h3 style="margin:0">${esc(v.venue)}</h3>
        <span class="crm-badge ${crmStatusClass(v.status)}">${crmStatusLabel(v.status)}</span>
      </div>
      ${parkedBanner}
      ${securityBanner}
      ${v.no_reply && v.status !== 'security_hold' ? `<div class="crm-noreply-banner">NO REPLY YET · ${days != null ? days + ' day(s) since send' : 'pending'} · follow timeline below</div>` : ''}
      <div class="crm-detail-grid">
        <div><span class="crm-k">Emails</span>${(v.emails_sent || []).map(esc).join('<br>') || '—'}</div>
        <div><span class="crm-k">First sent</span>${esc(v.first_sent || '—')}</div>
        <div><span class="crm-k">Quote / min</span>${esc(v.quote_min || '—')}</div>
        <div><span class="crm-k">Capacity</span>${esc(v.capacity_fit || '—')}</div>
      </div>
      <div class="crm-k" style="margin-top:12px">Contacts</div>
      ${contacts}
      ${v.notes ? `<div class="crm-notes">${esc(v.notes)}</div>` : ''}
      <div class="crm-next"><strong>Next:</strong> ${esc(v.next_action || '—')}</div>
      ${hubLinks ? `<div class="crm-hub-links">${hubLinks}</div>` : ''}
      ${costPanel}

      <h4 class="crm-subh">Files, menus & photos</h4>
      ${renderAttachmentGallery(allAtts)}

      <h4 class="crm-subh">Follow-up timeline</h4>
      <div class="crm-fu-timeline">${fus || '<p class="empty" style="padding:8px 0">No follow-ups logged.</p>'}</div>

      <h4 class="crm-subh">Emails & conversation</h4>
      <div class="crm-thread">${thread}</div>
    </div>`;
}

function openCrmLightbox(src, label) {
  let box = document.getElementById('crm-lightbox');
  if (!box) {
    box = document.createElement('div');
    box.id = 'crm-lightbox';
    box.className = 'crm-lightbox';
    box.innerHTML = `
      <button type="button" class="crm-lightbox-close" aria-label="Close">×</button>
      <img class="crm-lightbox-img" alt="" />
      <div class="crm-lightbox-label"></div>
      <a class="crm-lightbox-open" href="#" target="_blank" rel="noopener">Open full size ↗</a>`;
    document.body.appendChild(box);
    box.addEventListener('click', e => {
      if (e.target === box || e.target.classList.contains('crm-lightbox-close')) {
        box.classList.remove('open');
      }
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') box.classList.remove('open');
    });
  }
  const img = box.querySelector('.crm-lightbox-img');
  const lab = box.querySelector('.crm-lightbox-label');
  const link = box.querySelector('.crm-lightbox-open');
  img.src = src;
  img.alt = label || '';
  lab.textContent = label || '';
  link.href = src;
  box.classList.add('open');
}

// Photo lightbox (delegation — survives re-renders)
document.addEventListener('click', e => {
  const btn = e.target.closest('[data-crm-lightbox]');
  if (!btn) return;
  e.preventDefault();
  e.stopPropagation();
  openCrmLightbox(btn.dataset.crmLightbox, btn.dataset.crmLightboxLabel || '');
});

// Wire "Open in reports" after detail render (called inside renderVenueCrm after HTML set)
document.addEventListener('click', e => {
  const btn = e.target.closest('[data-goto-loc]');
  if (!btn) return;
  e.preventDefault();
  const slug = btn.dataset.gotoLoc;
  if (!RETIREMENT_EVEREST.locations[slug]) return;
  currentSlug = slug;
  const sel = document.getElementById('locSelect');
  if (sel) sel.value = slug;
  switchHostView('location');
  renderReport();
});
