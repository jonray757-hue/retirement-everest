/**
 * Seat reservations — Kennedy School BBQ (Martha Jordan Room).
 * Round 10-top tables seating 8 (the 2 screen-side chairs are removed so no
 * one's back faces the screen). Tables A–D in an arch facing the screen.
 * Live shared state via jsonblob so every guest phone + the command center
 * see seat blackouts in real time.
 */
(function (global) {
  const SEATS_BLOB =
    (global.RETIREMENT_EVEREST && global.RETIREMENT_EVEREST.seatsBlobId) ||
    '019f9f6d-3af1-7e53-b473-6a40000c13a4';
  const apiUrl = (id) => `https://jsonblob.com/api/jsonBlob/${id || SEATS_BLOB}`;

  /* ---------------- Layout ---------------- */
  const TABLES = ['A', 'B', 'C', 'D'];
  const SEATS_PER_TABLE = 8;
  const VIEW = { w: 1000, h: 640 };
  const SCREEN = { x: 300, y: 14, w: 400, h: 30, cx: 500, cy: 29 };
  /* Arch: outer tables higher, inner tables lower, opening toward the screen */
  const TABLE_POS = {
    A: { x: 148, y: 300 },
    B: { x: 382, y: 442 },
    C: { x: 618, y: 442 },
    D: { x: 852, y: 300 }
  };
  const TABLE_R = 56;
  const SEAT_RING = 96;
  const SEAT_R = 17;

  function seatKey(t, n) { return `${t}${n}`; }

  function allSeats() {
    const out = [];
    TABLES.forEach((t) => {
      for (let n = 1; n <= SEATS_PER_TABLE; n++) out.push(seatKey(t, n));
    });
    return out;
  }

  /** Seat position: 60° gap (removed chairs) always faces the screen. */
  function seatXY(t, n) {
    const c = TABLE_POS[t];
    const gap = Math.atan2(SCREEN.cy - c.y, SCREEN.cx - c.x); // toward screen
    const deg = 30 + ((n - 1) * 300) / 7; // 30°..330° clockwise from gap
    const a = gap + (deg * Math.PI) / 180;
    return {
      x: c.x + SEAT_RING * Math.cos(a),
      y: c.y + SEAT_RING * Math.sin(a)
    };
  }

  /* ---------------- Shared state ---------------- */
  function normalize(data) {
    const st = data && typeof data === 'object' && !Array.isArray(data) ? data : {};
    return {
      v: 1,
      event: st.event || 'kennedy-school-bbq',
      seats: st.seats && typeof st.seats === 'object' ? st.seats : {},
      couples: Array.isArray(st.couples) ? st.couples : [],
      accommodations: Array.isArray(st.accommodations) ? st.accommodations : []
    };
  }

  async function fetchState() {
    const res = await fetch(apiUrl() + '?t=' + Date.now(), {
      method: 'GET',
      mode: 'cors',
      headers: { Accept: 'application/json' },
      cache: 'no-store'
    });
    if (!res.ok) throw new Error('Seats HTTP ' + res.status);
    return normalize(await res.json());
  }

  async function putState(state) {
    const res = await fetch(apiUrl(), {
      method: 'PUT',
      mode: 'cors',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(state)
    });
    if (!res.ok) throw new Error('Seats write HTTP ' + res.status);
    return state;
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  /**
   * Claim seats atomically-ish: write, wait, verify our claim survived.
   * Returns { ok, taken[], groupId, state }.
   */
  async function claimSeats(seatIds, info) {
    const groupId =
      'g' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    for (let attempt = 1; attempt <= 2; attempt++) {
      const st = await fetchState();
      const taken = seatIds.filter((id) => st.seats[id]);
      if (taken.length) return { ok: false, taken, state: st };
      seatIds.forEach((id, i) => {
        st.seats[id] = {
          seatId: id,
          name: info.name || '',
          email: info.email || '',
          phone: info.phone || '',
          partyType: info.partyType || 'solo',
          spouse: info.spouse || null,
          person: seatIds.length > 1 ? (i === 0 ? info.name : info.spouse || info.name) : info.name,
          groupId,
          orderId: info.orderId || null,
          ts: new Date().toISOString()
        };
      });
      await putState(st);
      await sleep(500 + Math.random() * 400);
      const verify = await fetchState();
      const lost = seatIds.filter((id) => verify.seats[id]?.groupId !== groupId);
      if (!lost.length) return { ok: true, groupId, state: verify };
      if (attempt === 2) return { ok: false, taken: lost, state: verify };
    }
  }

  async function releaseSeats(seatIds) {
    const st = await fetchState();
    seatIds.forEach((id) => { delete st.seats[id]; });
    await putState(st);
    return st;
  }

  async function addAccommodation(req) {
    const st = await fetchState();
    st.accommodations.unshift({ ...req, ts: new Date().toISOString() });
    st.accommodations = st.accommodations.slice(0, 200);
    await putState(st);
    return st;
  }

  async function addCoupleLink(a, b) {
    const st = await fetchState();
    st.couples.unshift({ a, b, ts: new Date().toISOString() });
    st.couples = st.couples.slice(0, 200);
    await putState(st);
    return st;
  }

  /* ---------------- Pairing logic ---------------- */
  /** Runs of consecutive open seats per table (adjacency = consecutive seat numbers). */
  function openRuns(state) {
    const runs = [];
    TABLES.forEach((t) => {
      let run = [];
      for (let n = 1; n <= SEATS_PER_TABLE; n++) {
        const id = seatKey(t, n);
        if (!state.seats[id]) run.push(id);
        else { if (run.length) runs.push(run); run = []; }
      }
      if (run.length) runs.push(run);
    });
    return runs;
  }

  function pairCapacity(state) {
    return openRuns(state).reduce((s, r) => s + Math.floor(r.length / 2), 0);
  }

  /**
   * Seats a solo guest can take WITHOUT reducing how many couples can still
   * sit together. In a run of length L, removing position p keeps capacity iff
   * L is odd and p is odd (1-indexed). If no such seat exists anywhere,
   * every open seat is allowed (fallback so solos are never fully blocked).
   */
  function soloFriendly(state) {
    const friendly = new Set();
    openRuns(state).forEach((run) => {
      const L = run.length;
      if (L % 2 === 1) {
        run.forEach((id, idx) => { if ((idx + 1) % 2 === 1) friendly.add(id); });
      }
    });
    if (!friendly.size) allSeats().forEach((id) => { if (!state.seats[id]) friendly.add(id); });
    return friendly;
  }

  function adjacentOpen(id, state) {
    const t = id[0];
    const n = parseInt(id.slice(1), 10);
    return [n - 1, n + 1]
      .filter((m) => m >= 1 && m <= SEATS_PER_TABLE)
      .map((m) => seatKey(t, m))
      .filter((s) => !state.seats[s]);
  }

  /** Best partner seat for a couple: the neighbor that wastes the least pairing room. */
  function bestPartnerSeat(id, state) {
    const options = adjacentOpen(id, state);
    if (!options.length) return null;
    if (options.length === 1) return options[0];
    let best = options[0], bestCap = -1;
    options.forEach((p) => {
      const sim = { ...state, seats: { ...state.seats, [id]: { x: 1 }, [p]: { x: 1 } } };
      const cap = pairCapacity(sim);
      if (cap > bestCap) { bestCap = cap; best = p; }
    });
    return best;
  }

  function xesc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function initials(name) {
    return String(name || '')
      .split(/\s+/).filter(Boolean).slice(0, 2)
      .map((w) => w[0].toUpperCase()).join('');
  }

  /* ---------------- SVG map ---------------- */
  /**
   * opts: { mode: 'guest'|'host', selected: [], friendly: Set|null (solo mode),
   *         partyType: 'solo'|'couple' }
   * Interactivity is handled by the embedding page via [data-seat] clicks.
   */
  function renderMapSVG(state, opts = {}) {
    const mode = opts.mode || 'guest';
    const selected = new Set(opts.selected || []);
    const friendly = opts.friendly || null;
    const restrict = mode === 'guest' && opts.partyType === 'solo' && friendly;

    let seats = '';
    TABLES.forEach((t) => {
      for (let n = 1; n <= SEATS_PER_TABLE; n++) {
        const id = seatKey(t, n);
        const p = seatXY(t, n);
        const claim = state.seats[id];
        const isSel = selected.has(id);
        let cls = 'seat-open', fill = 'transparent', stroke = 'var(--accent, #c9a44a)',
          label = String(n), lblFill = 'var(--accent, #c9a44a)', extra = '', title = `Table ${t} · Seat ${n}`;
        if (claim) {
          cls = 'seat-taken';
          fill = '#1b1b1f'; stroke = '#3a3a40'; lblFill = '#6b6b74';
          label = mode === 'host' ? (xesc(initials(claim.person || claim.name)) || '✕') : '✕';
          title = mode === 'host'
            ? `Table ${t} · Seat ${n} — ${xesc(claim.person || claim.name)}${claim.partyType === 'couple' ? ' (couple)' : ''}`
            : `Table ${t} · Seat ${n} — reserved`;
        } else if (isSel) {
          cls = 'seat-selected';
          fill = 'var(--accent, #c9a44a)'; lblFill = '#141414';
        } else if (restrict && !friendly.has(id)) {
          cls = 'seat-heldpair';
          stroke = '#7a5f2a'; lblFill = '#7a5f2a';
          extra = ` stroke-dasharray="4 3"`;
          title = `Table ${t} · Seat ${n} — held so couples can sit together`;
        }
        seats += `<g class="seat ${cls}" data-seat="${id}" style="cursor:${claim ? 'not-allowed' : 'pointer'}">
          <title>${title}</title>
          <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${SEAT_R}" fill="${fill}" stroke="${stroke}" stroke-width="2"${extra}></circle>
          <text x="${p.x.toFixed(1)}" y="${(p.y + 4.5).toFixed(1)}" text-anchor="middle" font-size="${claim && mode === 'host' ? 11 : 13}" font-weight="700" fill="${lblFill}">${label}</text>
        </g>`;
      }
    });

    const tables = TABLES.map((t) => {
      const c = TABLE_POS[t];
      return `<g>
        <circle cx="${c.x}" cy="${c.y}" r="${TABLE_R}" fill="rgba(201,164,74,0.07)" stroke="var(--accent, #c9a44a)" stroke-width="1.5" stroke-opacity="0.5"></circle>
        <text x="${c.x}" y="${c.y + 10}" text-anchor="middle" font-size="30" font-weight="800" fill="var(--accent, #c9a44a)" fill-opacity="0.85">${t}</text>
      </g>`;
    }).join('');

    return `<svg viewBox="0 0 ${VIEW.w} ${VIEW.h}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;display:block">
      <rect x="${SCREEN.x}" y="${SCREEN.y}" width="${SCREEN.w}" height="${SCREEN.h}" rx="6" fill="#26262c" stroke="#4a4a52"></rect>
      <text x="${SCREEN.cx}" y="${SCREEN.cy + 5}" text-anchor="middle" font-size="14" letter-spacing="6" fill="#9a9aa4">SCREEN</text>
      ${tables}
      ${seats}
    </svg>`;
  }

  function legendHTML(mode) {
    const chip = (style, label) =>
      `<span style="display:inline-flex;align-items:center;gap:6px;margin-right:14px;font-size:0.75rem;color:var(--muted,#999)">
        <span style="display:inline-block;width:13px;height:13px;border-radius:50%;${style}"></span>${label}</span>`;
    return `<div style="margin-top:8px">
      ${chip('border:2px solid var(--accent,#c9a44a)', 'Open')}
      ${chip('background:var(--accent,#c9a44a)', 'Your pick')}
      ${chip('background:#1b1b1f;border:2px solid #3a3a40', 'Reserved')}
      ${mode === 'guest' ? chip('border:2px dashed #7a5f2a', 'Held for couples') : ''}
    </div>`;
  }

  function seatLabel(ids) {
    if (!ids || !ids.length) return '';
    const t = ids[0][0];
    const nums = ids.map((id) => id.slice(1)).join(' & ');
    return `Table ${t} · Seat${ids.length > 1 ? 's' : ''} ${nums}`;
  }

  /* ---------------- GHL push (shared by guest + host pages) ---------------- */
  async function pushSeatEventToGHL(payload) {
    const url = global.RETIREMENT_EVEREST?.ghlWebhookUrl;
    if (!url) return { ok: false, reason: 'no-url' };
    try {
      const res = await fetch(url, {
        method: 'POST',
        mode: 'cors',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          source: 'retirement-everest-seating',
          brand: global.RETIREMENT_EVEREST?.ghlBrand || 'HAG',
          ghlLocationId: global.RETIREMENT_EVEREST?.ghlLocationId || '',
          ...payload
        })
      });
      const text = await res.text().catch(() => '');
      return { ok: res.ok && !/invalid data/i.test(text), body: text };
    } catch (e) {
      console.warn('[RE] seat GHL push failed', e);
      return { ok: false, reason: String(e) };
    }
  }

  global.RESeating = {
    TABLES,
    SEATS_PER_TABLE,
    allSeats,
    fetchState,
    claimSeats,
    releaseSeats,
    addAccommodation,
    addCoupleLink,
    soloFriendly,
    adjacentOpen,
    bestPartnerSeat,
    pairCapacity,
    renderMapSVG,
    legendHTML,
    seatLabel,
    pushSeatEventToGHL,
    initials
  };
})(typeof window !== 'undefined' ? window : globalThis);
