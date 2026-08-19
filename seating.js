/**
 * Seat reservations — Kennedy School BBQ.
 *
 * Jordan Room (live): five 60" rounds, 8 chairs each (screen-side chairs
 * bookable — backs to the screen). Arch facing the screen. 40 seats.
 *
 * Waitlist: mirrored Jordan chart in state.waitlist — does not touch live seats.
 *
 * Gym backup: 40 × 60 ft McMenamins gymnasium, 12 × 60" rounds as 6-tops
 * (72 seats). Stored in state.gym so a room move never overwrites Jordan.
 *
 * Live shared state: durable Google Apps Script store (RESharedStore) preferred.
 */
(function (global) {
  const SEATS_BLOB =
    (global.RETIREMENT_EVEREST && global.RETIREMENT_EVEREST.seatsBlobId) ||
    '019faaca-6bf5-7f2b-a3d5-1b92f1c0387d';
  const apiUrl = (id) => `https://jsonblob.com/api/jsonBlob/${id || SEATS_BLOB}`;

  function useDurableStore() {
    return !!(global.RESharedStore && global.RESharedStore.isConfigured && global.RESharedStore.isConfigured());
  }

  async function remoteGetSeats() {
    if (useDurableStore()) {
      return global.RESharedStore.fetchSeats();
    }
    const res = await fetch(apiUrl() + '?t=' + Date.now(), {
      method: 'GET',
      mode: 'cors',
      headers: { Accept: 'application/json' },
      cache: 'no-store'
    });
    if (!res.ok) throw new Error('Seats HTTP ' + res.status);
    const data = await res.json();
    if (data && data.error) throw new Error(String(data.error));
    return data;
  }

  async function remotePutSeats(clean) {
    if (useDurableStore()) {
      await global.RESharedStore.putSeats(clean);
      return clean;
    }
    const res = await fetch(apiUrl(), {
      method: 'PUT',
      mode: 'cors',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(clean)
    });
    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new Error('Seats write HTTP ' + res.status + (text ? ': ' + text : ''));
    }
    return clean;
  }

  /* ---------------- Layout ---------------- */
  const TABLES = ['A', 'B', 'C', 'D', 'E'];
  const SEATS_PER_TABLE = 8;
  /* All 8 chairs are bookable (screen-side = 7 next to 6, 8 next to 1). */
  const EXTRA_SEATS = {};
  const SEAT_7_DEG = -22.5;
  const SEAT_8_DEG = 22.5;
  const WAITLIST_CONFIRM =
    'WAITLIST HOLD — this is not a confirmed seat. If that seat opens we will contact you so you can claim it. You must claim it promptly when we reach you, or it will be offered to the next person on the list.';
  /* Jordan Room, drawn to scale: 23 ft wide × 31 ft deep (713 sq ft), 34 px/ft.
     Screen on the short wall; BBQ buffet on the opposite short wall.
     Tables are true 60" (5 ft) rounds — venue 8-tops. Screen-side chairs (7 & 8)
     are bookable (backs to the screen). Footprint ≈ 8 ft with chairs. */
  const PXFT = 34, M = 13;
  const VIEW = { w: 23 * PXFT + 2 * M, h: 31 * PXFT + 2 * M }; // 808 × 1080
  const ROOM = { x: M, y: M, w: 23 * PXFT, h: 31 * PXFT };
  const SCREEN = { x: 254, y: 20, w: 300, h: 30, cx: 404, cy: 35 };
  const BUFFET = { x: M + Math.round(4.5 * PXFT), y: M + Math.round(28.5 * PXFT), w: 14 * PXFT, h: 2 * PXFT };
  /*
   * Arch of 5 (opening toward screen / top of room):
   *   A ............... E   (front flanks, nearer screen)
   *     B ........... D     (mid)
   *          C              (apex toward buffet)
   * Centers in feet from room origin — min ~6.5–7 ft between centers so
   * chair rings clear; true 5 ft tops leave room for walkways.
   */
  const TABLE_POS = {
    A: { x: M + Math.round(4.8 * PXFT), y: M + 8 * PXFT },
    E: { x: M + Math.round(18.2 * PXFT), y: M + 8 * PXFT },
    B: { x: M + Math.round(5.8 * PXFT), y: M + 16 * PXFT },
    D: { x: M + Math.round(17.2 * PXFT), y: M + 16 * PXFT },
    C: { x: M + Math.round(11.5 * PXFT), y: M + 23 * PXFT }
  };
  const TABLE_R = Math.round(2.5 * PXFT);      // 60" / 5 ft round top
  const SEAT_RING = Math.round(3.2 * PXFT);     // chairs outside top
  const SEAT_R = 24;
  /* Physical 8-top on 60": chairs every 45°. The 2 nearest the screen are
     removed, leaving a 90° opening that faces the screen (6 seats kept). */
  const SEAT_STEP = 45;
  const FIRST_SEAT_DEG = 67.5;      // first kept chair from screen direction
  const REMOVED_DEG = [22.5, -22.5]; // the two removed screen-side chairs

  function seatKey(t, n) { return `${t}${n}`; }

  function seatsOnTable(t) {
    const nums = [];
    for (let n = 1; n <= SEATS_PER_TABLE; n++) nums.push(n);
    (EXTRA_SEATS[t] || []).forEach((n) => {
      if (!nums.includes(n)) nums.push(n);
    });
    return nums.sort((a, b) => a - b);
  }

  function allSeats() {
    const out = [];
    TABLES.forEach((t) => {
      seatsOnTable(t).forEach((n) => out.push(seatKey(t, n)));
    });
    return out;
  }

  function isValidSeatId(id) {
    const s = String(id || '');
    const m = s.match(/^([A-E])(\d+)$/);
    if (!m) return false;
    return seatsOnTable(m[1]).includes(parseInt(m[2], 10));
  }

  function screenAngle(t) {
    const c = TABLE_POS[t];
    return Math.atan2(SCREEN.cy - c.y, SCREEN.cx - c.x); // toward screen
  }

  /** Seat position: real 8-top spacing (45°), 90° opening faces the screen. */
  function seatXY(t, n) {
    const c = TABLE_POS[t];
    const deg = n === 7 ? SEAT_7_DEG : n === 8 ? SEAT_8_DEG : FIRST_SEAT_DEG + (n - 1) * SEAT_STEP;
    const a = screenAngle(t) + (deg * Math.PI) / 180;
    return {
      x: c.x + SEAT_RING * Math.cos(a),
      y: c.y + SEAT_RING * Math.sin(a)
    };
  }

  /** No ghost chairs — every screen-side seat is bookable. */
  function removedXY(/* t */) {
    return [];
  }

  /* ---------------- Gym backup (40 × 60 ft, 12 × 6-tops) ---------------- */
  const GYM_TABLES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L'];
  const GYM_SEATS_PER = 6;
  const GYM_PXFT = 18;
  const GYM_M = 16;
  const GYM_FT = { w: 40, d: 60 };
  const GYM_VIEW = { w: GYM_FT.w * GYM_PXFT + 2 * GYM_M, h: GYM_FT.d * GYM_PXFT + 2 * GYM_M };
  const GYM_ROOM = { x: GYM_M, y: GYM_M, w: GYM_FT.w * GYM_PXFT, h: GYM_FT.d * GYM_PXFT };
  const GYM_SCREEN = { x: GYM_M + 80, y: GYM_M + 6, w: GYM_FT.w * GYM_PXFT - 160, h: 26, cx: GYM_M + (GYM_FT.w * GYM_PXFT) / 2, cy: GYM_M + 19 };
  const GYM_BUFFET = {
    x: GYM_M + Math.round(4 * GYM_PXFT),
    y: GYM_M + GYM_FT.d * GYM_PXFT - Math.round(2.4 * GYM_PXFT),
    w: 32 * GYM_PXFT,
    h: Math.round(2 * GYM_PXFT)
  };
  const GYM_TABLE_R = Math.round(2.5 * GYM_PXFT);
  const GYM_SEAT_RING = Math.round(3.2 * GYM_PXFT);
  const GYM_SEAT_R = 18;
  /* 3 rows × 4 cols. Front row (A–D) nearest screen. */
  const GYM_TABLE_POS = (function () {
    const cols = [6, 15.5, 24.5, 34];
    const rows = [12, 30, 48];
    const letters = GYM_TABLES;
    const pos = {};
    letters.forEach((t, i) => {
      const col = i % 4;
      const row = Math.floor(i / 4);
      pos[t] = {
        x: GYM_M + Math.round(cols[col] * GYM_PXFT),
        y: GYM_M + Math.round(rows[row] * GYM_PXFT)
      };
    });
    return pos;
  })();

  function gymSeatXY(t, n) {
    const c = GYM_TABLE_POS[t];
    const a = Math.atan2(GYM_SCREEN.cy - c.y, GYM_SCREEN.cx - c.x) + ((30 + (n - 1) * 60) * Math.PI) / 180;
    return {
      x: c.x + GYM_SEAT_RING * Math.cos(a),
      y: c.y + GYM_SEAT_RING * Math.sin(a)
    };
  }

  function gymAllSeats() {
    const out = [];
    GYM_TABLES.forEach((t) => {
      for (let n = 1; n <= GYM_SEATS_PER; n++) out.push(t + n);
    });
    return out;
  }

  function isGymSeatId(id) {
    const m = String(id || '').match(/^([A-L])([1-6])$/);
    return !!(m && GYM_TABLES.includes(m[1]));
  }

  /* ---------------- Shared state ---------------- */
  /* Bump version when layout / seat IDs change so ghost caches on phones die. */
  const LOCAL_KEY = 're_seats_cache_v6';
  const LEGACY_CACHE_KEYS = ['re_seats_cache_v1', 're_seats_cache_v2', 're_seats_cache_v3', 're_seats_cache_v4', 're_seats_cache_v5', 're_seats_cache_v6'];
  const SEAT_ID_RE = /^[A-L][1-8]$/;

  function emptyBucket() {
    return { seats: {}, couples: [] };
  }

  function emptyState() {
    return {
      v: 2,
      event: 'kennedy-school-bbq',
      seats: {},
      couples: [],
      accommodations: [],
      waitlist: emptyBucket(),
      gym: { seats: {}, couples: [], transferredAt: null },
      offline: false
    };
  }

  function normBucket(raw) {
    const b = raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {};
    return {
      seats: b.seats && typeof b.seats === 'object' && !Array.isArray(b.seats) ? b.seats : {},
      couples: Array.isArray(b.couples) ? b.couples : [],
      transferredAt: b.transferredAt || null
    };
  }

  function normalize(data) {
    const st = data && typeof data === 'object' && !Array.isArray(data) ? data : {};
    // Prefer seats map; ignore legacy "tables" shape from bad blob seeds
    const seats =
      st.seats && typeof st.seats === 'object' && !Array.isArray(st.seats) ? st.seats : {};
    return {
      v: 2,
      event: st.event || 'kennedy-school-bbq',
      seats,
      couples: Array.isArray(st.couples) ? st.couples : [],
      accommodations: Array.isArray(st.accommodations) ? st.accommodations : [],
      waitlist: normBucket(st.waitlist),
      gym: normBucket(st.gym),
      offline: !!st.offline
    };
  }

  function seatCount(st) {
    return st && st.seats ? Object.keys(st.seats).length : 0;
  }

  /** "Table C · Seats 3 & 4" → ["C3","C4"] */
  function parseSeatLabel(label) {
    if (!label) return [];
    const m = String(label).match(/Table\s+([A-E]).*?Seat[s]?\s+([0-9]+(?:\s*&\s*[0-9]+)*)/i);
    if (!m) return [];
    const t = m[1].toUpperCase();
    return m[2].split(/\s*&\s*/).map((n) => t + String(n).trim()).filter((id) => isValidSeatId(id));
  }

  /**
   * Rebuild seat claims from preference submissions (local or shared log).
   * Orders are a durable backup when the live seats blob is empty/expired.
   */
  function claimsFromOrders(orders) {
    const seats = {};
    (orders || []).forEach((o) => {
      if (!o || typeof o !== 'object') return;
      if (o.waitlist || o.waitlistHold || o.form === 'waitlist-seat' || o.form === 'host-waitlist') return;
      let ids = Array.isArray(o.seats) ? o.seats.filter((id) => isValidSeatId(String(id))) : [];
      if (!ids.length) ids = parseSeatLabel(o.seatLabel);
      ids.forEach((id, i) => {
        if (seats[id]) return;
        seats[id] = {
          seatId: id,
          name: o.name || '',
          email: o.email || '',
          phone: o.phone || '',
          partyType: o.partyType || (ids.length > 1 ? 'couple' : 'solo'),
          spouse: o.spouse || null,
          person:
            ids.length > 1
              ? i === 0
                ? o.name
                : o.spouse || o.name
              : o.name,
          groupId: o.id != null ? 'order-' + o.id : 'order-recov',
          orderId: o.id || null,
          ts: o.ts || '',
          recoveredFromOrder: true
        };
      });
    });
    return seats;
  }

  /** Union seat maps / couples / accommodations. Newer claim.ts wins on conflict. */
  function mergeStates(...states) {
    const out = emptyState();
    states.forEach((raw) => {
      if (!raw) return;
      const st = normalize(raw);
      Object.entries(st.seats || {}).forEach(([id, claim]) => {
        if (!claim || !isValidSeatId(id)) return;
        const prev = out.seats[id];
        if (!prev || String(claim.ts || '') >= String(prev.ts || '')) {
          out.seats[id] = { ...claim, seatId: id };
        }
      });
      (st.couples || []).forEach((c) => {
        if (!out.couples.some((x) => JSON.stringify(x) === JSON.stringify(c))) out.couples.push(c);
      });
      (st.accommodations || []).forEach((a) => {
        if (!out.accommodations.some((x) => JSON.stringify(x) === JSON.stringify(a))) {
          out.accommodations.push(a);
        }
      });
      const mergeBucket = (key) => {
        const src = st[key] || {};
        Object.entries(src.seats || {}).forEach(([id, claim]) => {
          if (!claim) return;
          const prev = out[key].seats[id];
          if (!prev || String(claim.ts || '') >= String(prev.ts || '')) {
            out[key].seats[id] = { ...claim, seatId: id };
          }
        });
        (src.couples || []).forEach((c) => {
          if (!out[key].couples.some((x) => JSON.stringify(x) === JSON.stringify(c))) {
            out[key].couples.push(c);
          }
        });
        if (src.transferredAt && (!out[key].transferredAt || src.transferredAt > out[key].transferredAt)) {
          out[key].transferredAt = src.transferredAt;
        }
      };
      mergeBucket('waitlist');
      mergeBucket('gym');
    });
    return out;
  }

  function readLocalCache() {
    try {
      if (typeof localStorage === 'undefined') return null;
      const raw = localStorage.getItem(LOCAL_KEY);
      return raw ? normalize(JSON.parse(raw)) : null;
    } catch (_) {
      return null;
    }
  }

  function writeLocalCache(state, opts = {}) {
    try {
      if (typeof localStorage === 'undefined') return;
      const clean = normalize(state);
      delete clean.offline;
      // Never accidentally wipe a richer local cache with an empty fetch snapshot.
      // Intentional empties (release last seat / clearAll) pass force: true via putState.
      const prev = readLocalCache();
      if (
        !opts.force &&
        prev &&
        seatCount(clean) === 0 &&
        seatCount(prev) > 0
      ) {
        return;
      }
      localStorage.setItem(LOCAL_KEY, JSON.stringify(clean));
    } catch (_) {}
  }

  /** Wipe local seat cache entirely (used by clear / full reset / hard refresh). */
  function clearLocalCache() {
    try {
      if (typeof localStorage === 'undefined') return;
      LEGACY_CACHE_KEYS.forEach((k) => {
        try {
          localStorage.removeItem(k);
        } catch (_) {}
      });
    } catch (_) {}
  }

  /**
   * Live seat map.
   *
   * When the shared store is reachable it is the ONLY source of truth.
   * We used to merge localStorage + preference orders back into an empty remote
   * ("heal"), which caused different browsers to show different blackouts and
   * resurrect seats after Clear.
   *
   * opts:
   *   orders?: array       — preference rows (used only when offline / healRemote)
   *   healRemote?: boolean — host explicit publish: push order-derived seats up
   *   offlineOrders?: boolean — when offline, seed display from order seats
   */
  async function fetchState(opts = {}) {
    const local = readLocalCache();
    const fromOrders = { seats: claimsFromOrders(opts.orders || []) };
    let remote = null;
    let offline = false;

    try {
      remote = normalize(await remoteGetSeats());
    } catch (e) {
      console.warn('[RE] seat fetch failed — offline mode', e);
      offline = true;
    }

    // ── Online: remote wins (including empty after Clear) ──
    if (!offline && remote) {
      let st = normalize(remote);

      // Host-only explicit heal (Publish seats button), never automatic on load
      if (opts.healRemote === true && seatCount(fromOrders) > seatCount(st)) {
        st = mergeStates(st, fromOrders);
        try {
          st = await putState(st);
        } catch (e) {
          console.warn('[RE] seat remote heal failed', e);
        }
      } else {
        // Force local cache to match remote so old ghost seats die on this device
        writeLocalCache(st, { force: true });
      }
      st.offline = false;
      return st;
    }

    // ── Offline: last good remote cache only — do NOT re-seed from preference
    // orders. Phones often keep pre-release orders in localStorage; merging those
    // resurrected seats after a desktop Release (classic "Jon Ray still reserved").
    if (local && seatCount(local) >= 0) {
      const st = normalize(local);
      st.offline = true;
      return st;
    }
    if (opts.offlineOrders !== false && seatCount(fromOrders) > 0) {
      const st = mergeStates(emptyState(), fromOrders);
      st.offline = true;
      return st;
    }
    const empty = emptyState();
    empty.offline = true;
    return empty;
  }

  async function putState(state) {
    const clean = normalize(state);
    delete clean.offline;
    // Always persist intentional writes — including empty seat maps after release/clear
    writeLocalCache(clean, { force: true });
    // Drop short TTL so next device/tab doesn't read a stale in-memory snapshot
    if (global.RESharedStore?.memInvalidate) global.RESharedStore.memInvalidate('seats');
    await remotePutSeats(clean);
    return clean;
  }

  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

  function getBucket(st, map) {
    if (map === 'waitlist') {
      if (!st.waitlist) st.waitlist = emptyBucket();
      return st.waitlist;
    }
    if (map === 'gym') {
      if (!st.gym) st.gym = { seats: {}, couples: [], transferredAt: null };
      return st.gym;
    }
    return st;
  }

  /**
   * Claim seats atomically-ish: write, wait, verify our claim survived.
   * info.map = 'main' | 'waitlist' | 'gym'
   * Returns { ok, taken[], groupId, state }.
   */
  async function claimSeats(seatIds, info) {
    const map = (info && info.map) || 'main';
    const groupId =
      'g' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
    for (let attempt = 1; attempt <= 2; attempt++) {
      // healRemote false during claim loop — we putState ourselves after merge
      const st = await fetchState({ healRemote: false });
      const bucket = getBucket(st, map);
      const taken = seatIds.filter((id) => bucket.seats[id]);
      if (taken.length) return { ok: false, taken, state: st };
      seatIds.forEach((id, i) => {
        bucket.seats[id] = {
          seatId: id,
          name: info.name || '',
          email: info.email || '',
          phone: info.phone || '',
          partyType: info.partyType || 'solo',
          spouse: info.spouse || null,
          person: seatIds.length > 1 ? (i === 0 ? info.name : info.spouse || info.name) : info.name,
          groupId,
          orderId: info.orderId || null,
          partnerJoined: false,
          waitlist: map === 'waitlist',
          ts: new Date().toISOString()
        };
      });
      // First-time couple: record pending couple (spouse contact fills in when they join)
      if ((info.partyType === 'couple' || seatIds.length > 1) && info.spouse) {
        const pending = {
          a: { name: info.name || '', email: info.email || '', phone: info.phone || '' },
          b: { name: info.spouse || '', email: '', phone: '' },
          seats: seatIds.slice(),
          groupId,
          source: map === 'waitlist' ? 'waitlist-reserve' : 'guest-reserve',
          pendingPartner: true,
          ts: new Date().toISOString()
        };
        const pe = (info.email || '').toLowerCase();
        const exists = (bucket.couples || []).some((c) => {
          const ae = (c.a?.email || '').toLowerCase();
          return (pe && ae && pe === ae) || (c.groupId && c.groupId === groupId);
        });
        if (!exists) {
          bucket.couples = bucket.couples || [];
          bucket.couples.unshift(pending);
          bucket.couples = bucket.couples.slice(0, 200);
        }
      }
      await putState(st);
      // Brief settle only — old 500–900ms sleep made every reserve feel broken
      // on top of already-slow Apps Script round trips.
      await sleep(180 + Math.random() * 120);
      if (global.RESharedStore?.memInvalidate) global.RESharedStore.memInvalidate('seats');
      const verify = await fetchState({ healRemote: false, orders: [] });
      const vBucket = getBucket(verify, map);
      const lost = seatIds.filter((id) => vBucket.seats[id]?.groupId !== groupId);
      if (!lost.length) return { ok: true, groupId, state: verify, map };
      if (attempt === 2) return { ok: false, taken: lost, state: verify, map };
    }
  }

  /**
   * Free seat(s) on the live map.
   * healRemote:false + no order re-merge so a released seat is not immediately
   * re-healed from preference logs (host must strip seats from orders separately).
   */
  async function releaseSeats(seatIds, opts = {}) {
    const map = opts.map || 'main';
    const ids = (seatIds || []).map(String).filter((id) =>
      map === 'gym' ? isGymSeatId(id) : isValidSeatId(id)
    );
    if (!ids.length) return emptyState();

    // Read remote + local only (do not re-seed from orders here)
    const st = await fetchState({ healRemote: false, orders: [] });
    const bucket = getBucket(st, map);
    ids.forEach((id) => {
      delete bucket.seats[id];
    });
    // Drop couple rows that only referenced released seats
    if (Array.isArray(bucket.couples)) {
      bucket.couples = bucket.couples.filter((cp) => {
        const seats = Array.isArray(cp.seats) ? cp.seats.map(String) : [];
        if (!seats.length) return true;
        return !seats.every((s) => ids.includes(s));
      });
    }
    const written = await putState(st);
    // Verify remote accepted the release (last-seat bug was local cache refusing empty)
    try {
      const verify = await fetchState({ healRemote: false, orders: [] });
      const vBucket = getBucket(verify, map);
      const stillThere = ids.filter((id) => vBucket.seats[id]);
      if (stillThere.length) {
        stillThere.forEach((id) => {
          delete vBucket.seats[id];
        });
        return await putState(verify);
      }
      return verify;
    } catch (_) {
      return written;
    }
  }

  /** Full seat-map reset (preferences clear / event wipe). */
  async function clearAllSeats() {
    const blank = emptyState();
    clearLocalCache();
    const written = await putState(blank);
    return written;
  }

  async function addAccommodation(req) {
    const st = await fetchState();
    st.accommodations.unshift({ ...req, ts: new Date().toISOString() });
    st.accommodations = st.accommodations.slice(0, 200);
    await putState(st);
    return st;
  }

  async function addCoupleLink(a, b, meta) {
    const st = await fetchState();
    const link = {
      a: { name: a?.name || '', email: a?.email || '', phone: a?.phone || '' },
      b: { name: b?.name || '', email: b?.email || '', phone: b?.phone || '' },
      seats: meta?.seats || null,
      groupId: meta?.groupId || null,
      source: meta?.source || 'host',
      ts: new Date().toISOString()
    };
    // Avoid exact duplicates (same two people, either order)
    const samePerson = (p, q) => {
      const pe = (p.email || '').toLowerCase();
      const qe = (q.email || '').toLowerCase();
      if (pe && qe && pe === qe) return true;
      const pn = (p.name || '').toLowerCase().trim();
      const qn = (q.name || '').toLowerCase().trim();
      return !!(pn && qn && pn === qn);
    };
    const exists = (st.couples || []).some((c) =>
      (samePerson(c.a, link.a) && samePerson(c.b, link.b)) ||
      (samePerson(c.a, link.b) && samePerson(c.b, link.a))
    );
    if (!exists) {
      st.couples.unshift(link);
      st.couples = st.couples.slice(0, 200);
      await putState(st);
    }
    return st;
  }

  /**
   * People who already reserved as a couple so a spouse/partner can join
   * without picking new seats. Built from seat claims (+ optional orders).
   * Returns [{ key, groupId, name, email, phone, spouseExpected, seats,
   *            partnerSeatId, seatLabel, label }]
   */
  function listJoinablePartners(state, orders) {
    const byGroup = {};
    Object.values((state && state.seats) || {}).forEach((c) => {
      if (!c || !c.seatId) return;
      const gid = c.groupId || ('solo-' + c.seatId);
      if (!byGroup[gid]) byGroup[gid] = [];
      byGroup[gid].push(c);
    });

    const out = [];
    const seen = new Set();

    Object.entries(byGroup).forEach(([gid, claims]) => {
      const isCouple =
        claims.some((c) => c.partyType === 'couple') || claims.length >= 2;
      if (!isCouple) return;

      // Partner already filled their own contact on the partner seat?
      const sorted = claims.slice().sort((a, b) =>
        String(a.seatId).localeCompare(String(b.seatId))
      );
      const primary =
        sorted.find((c) => (c.person || '') === (c.name || '')) || sorted[0];
      if (!primary?.name) return;

      const partnerClaim =
        sorted.find((c) => c.seatId !== primary.seatId) ||
        sorted.find((c) => (c.person || '') !== (c.name || '')) ||
        null;
      // Already joined: flag set, or partner seat has its own contact
      if (partnerClaim?.partnerJoined || partnerClaim?.joinedAsPartner) return;
      if (primary.partnerJoined) return;
      if (
        partnerClaim &&
        partnerClaim.email &&
        primary.email &&
        partnerClaim.email.toLowerCase() !== String(primary.email).toLowerCase() &&
        partnerClaim.person &&
        partnerClaim.person !== primary.name
      ) {
        return;
      }

      const seats = sorted.map((c) => c.seatId);
      const spouseExpected =
        primary.spouse ||
        (partnerClaim && partnerClaim.person !== primary.name
          ? partnerClaim.person
          : '') ||
        '';
      const key = gid;
      if (seen.has(key)) return;
      seen.add(key);

      const label = spouseExpected
        ? `${primary.name} — reserved seats for ${spouseExpected}`
        : `${primary.name} — couple seats ${seatLabel(seats)}`;

      out.push({
        key,
        groupId: primary.groupId || gid,
        name: primary.name,
        email: primary.email || '',
        phone: primary.phone || '',
        spouseExpected,
        seats,
        partnerSeatId: partnerClaim?.seatId || seats[1] || null,
        seatLabel: seatLabel(seats),
        label
      });
    });

    // Orders backup: couple prefs with seats but thin seat blob
    (orders || []).forEach((o) => {
      if (!o || o.partyType !== 'couple' || !o.name) return;
      if (o.joinedPartner || o.partnerJoined) return;
      let ids = Array.isArray(o.seats)
        ? o.seats.filter((id) => isValidSeatId(String(id)))
        : [];
      if (!ids.length) ids = parseSeatLabel(o.seatLabel);
      if (ids.length < 1) return;
      const key = o.id != null ? 'order-' + o.id : (o.email || o.name).toLowerCase();
      if (seen.has(key) || seen.has('order-' + o.id)) return;
      // Skip if already represented by a seat group with same name
      if (out.some((p) => (p.email && o.email && p.email.toLowerCase() === o.email.toLowerCase()) ||
        p.name.toLowerCase() === String(o.name).toLowerCase())) return;
      seen.add(key);
      const spouseExpected = o.spouse || '';
      out.push({
        key,
        groupId: o.id != null ? 'order-' + o.id : null,
        name: o.name,
        email: o.email || '',
        phone: o.phone || '',
        spouseExpected,
        seats: ids,
        partnerSeatId: ids[1] || ids[0] || null,
        seatLabel: o.seatLabel || seatLabel(ids),
        label: spouseExpected
          ? `${o.name} — reserved seats for ${spouseExpected}`
          : `${o.name} — couple (${o.seatLabel || seatLabel(ids)})`
      });
    });

    return out.sort((a, b) => a.name.localeCompare(b.name));
  }

  /**
   * Spouse/partner joins an existing couple reservation:
   * updates the partner seat with their name/contact, flags partnerJoined,
   * and records a couple link. Does NOT claim new seats.
   * partnerInfo: { name, email, phone }
   * primary: { groupId?, seats?, name?, email? } from listJoinablePartners entry
   */
  async function attachPartnerToCouple(primary, partnerInfo) {
    const st = await fetchState({ healRemote: false });
    const seats = Array.isArray(primary.seats) ? primary.seats.filter((id) => isValidSeatId(id)) : [];
    let groupClaims = [];

    if (primary.groupId) {
      groupClaims = Object.values(st.seats || {}).filter((c) => c.groupId === primary.groupId);
    }
    if (!groupClaims.length && seats.length) {
      groupClaims = seats.map((id) => st.seats[id]).filter(Boolean);
    }
    // Match by primary name if group not found (order-recovered claims)
    if (!groupClaims.length && primary.name) {
      groupClaims = Object.values(st.seats || {}).filter(
        (c) =>
          c.partyType === 'couple' &&
          ((c.name || '').toLowerCase() === primary.name.toLowerCase() ||
            (primary.email && (c.email || '').toLowerCase() === primary.email.toLowerCase()))
      );
    }

    if (!groupClaims.length && seats.length) {
      // Reconstruct claims from primary + partner if seats were only in orders
      const groupId =
        primary.groupId ||
        'g' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
      seats.forEach((id, i) => {
        if (st.seats[id] && st.seats[id].partnerJoined) {
          throw new Error('That partner seat is already claimed.');
        }
        if (!st.seats[id]) {
          st.seats[id] = {
            seatId: id,
            name: primary.name || '',
            email: primary.email || '',
            phone: primary.phone || '',
            partyType: 'couple',
            spouse: partnerInfo.name || primary.spouseExpected || null,
            person: i === 0 ? primary.name : partnerInfo.name,
            groupId,
            ts: new Date().toISOString()
          };
        }
      });
      groupClaims = seats.map((id) => st.seats[id]).filter(Boolean);
    }

    if (!groupClaims.length) {
      throw new Error('Could not find your partner\'s reserved seats. Ask them to re-open the form or contact the host.');
    }

    const sorted = groupClaims.slice().sort((a, b) =>
      String(a.seatId).localeCompare(String(b.seatId))
    );
    const primaryClaim =
      sorted.find((c) => (c.person || '') === (c.name || '')) || sorted[0];
    let partnerClaim =
      (primary.partnerSeatId && st.seats[primary.partnerSeatId]) ||
      sorted.find((c) => c.seatId !== primaryClaim.seatId) ||
      sorted[1] ||
      null;

    if (!partnerClaim && sorted.length === 1) {
      // Only one seat claim — still link contacts, no seat rewrite for second
      partnerClaim = null;
    }

    if (partnerClaim?.partnerJoined || partnerClaim?.joinedAsPartner) {
      throw new Error('Someone already joined as partner on those seats.');
    }

    const groupId = primaryClaim.groupId || primary.groupId || null;
    const allSeatIds = sorted.map((c) => c.seatId);

    if (partnerClaim) {
      st.seats[partnerClaim.seatId] = {
        ...partnerClaim,
        person: partnerInfo.name || partnerClaim.person,
        // Keep primary booker as `name` on both for group identity, but track partner contact
        partnerName: partnerInfo.name || '',
        partnerEmail: partnerInfo.email || '',
        partnerPhone: partnerInfo.phone || '',
        email: partnerInfo.email || partnerClaim.email || '',
        phone: partnerInfo.phone || partnerClaim.phone || '',
        partyType: 'couple',
        spouse: primaryClaim.name || primary.name || null,
        partnerJoined: true,
        joinedAsPartner: true,
        groupId,
        ts: new Date().toISOString()
      };
    }

    // Flag primary seat so host UI shows the pair as complete
    if (primaryClaim && st.seats[primaryClaim.seatId]) {
      st.seats[primaryClaim.seatId] = {
        ...st.seats[primaryClaim.seatId],
        spouse: partnerInfo.name || st.seats[primaryClaim.seatId].spouse,
        partnerJoined: true,
        partnerName: partnerInfo.name || '',
        partnerEmail: partnerInfo.email || '',
        partnerPhone: partnerInfo.phone || ''
      };
    }

    const link = {
      a: {
        name: primaryClaim.name || primary.name || '',
        email: primaryClaim.email || primary.email || '',
        phone: primaryClaim.phone || primary.phone || ''
      },
      b: {
        name: partnerInfo.name || '',
        email: partnerInfo.email || '',
        phone: partnerInfo.phone || ''
      },
      seats: allSeatIds,
      groupId,
      source: 'guest-join',
      pendingPartner: false,
      ts: new Date().toISOString()
    };
    const samePerson = (p, q) => {
      const pe = (p.email || '').toLowerCase();
      const qe = (q.email || '').toLowerCase();
      if (pe && qe && pe === qe) return true;
      return !!(p.name && q.name && p.name.toLowerCase() === q.name.toLowerCase());
    };
    // Upgrade a pending couple row if one exists for this primary / group
    let upgraded = false;
    st.couples = (st.couples || []).map((c) => {
      const matchGroup = groupId && c.groupId && c.groupId === groupId;
      const matchPrimary = samePerson(c.a, link.a) || samePerson(c.b, link.a);
      if (!upgraded && (matchGroup || matchPrimary)) {
        upgraded = true;
        return {
          ...c,
          a: link.a,
          b: link.b,
          seats: allSeatIds,
          groupId,
          source: 'guest-join',
          pendingPartner: false,
          ts: link.ts
        };
      }
      return c;
    });
    if (!upgraded) {
      st.couples.unshift(link);
      st.couples = st.couples.slice(0, 200);
    }

    await putState(st);
    return {
      ok: true,
      state: st,
      seats: allSeatIds,
      seatLabel: seatLabel(allSeatIds),
      groupId,
      primary: link.a,
      partner: link.b
    };
  }

  /* ---------------- Pairing logic ---------------- */
  /** Runs of consecutive open seats per table (adjacency = consecutive seat numbers). */
  function openRuns(state) {
    const runs = [];
    TABLES.forEach((t) => {
      let run = [];
      seatsOnTable(t).forEach((n) => {
        const id = seatKey(t, n);
        if (!state.seats[id]) run.push(id);
        else { if (run.length) runs.push(run); run = []; }
      });
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
    const allowed = seatsOnTable(t);
    return [n - 1, n + 1]
      .filter((m) => allowed.includes(m))
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

  /**
   * Copy Jordan confirmed guests onto the gym backup, then overflow waitlist
   * holds onto remaining gym chairs. Does not touch Jordan or waitlist charts.
   */
  function transferJordanToGym(state) {
    const st = normalize(state);
    const gymSeats = {};
    const gymCouples = [];
    let ti = 0;
    let n = 1;
    const nextTable = () => {
      ti += 1;
      n = 1;
    };
    const place = (claim, extra) => {
      if (n > GYM_SEATS_PER) nextTable();
      if (ti >= GYM_TABLES.length) return null;
      const id = GYM_TABLES[ti] + n;
      n += 1;
      return {
        ...claim,
        seatId: id,
        fromSeat: extra.fromSeat || claim.seatId,
        waitlist: !!extra.waitlist,
        source: extra.source || claim.source || 'gym-transfer'
      };
    };
    const alreadyOnGym = (claim) => {
      const em = String(claim.email || '').trim().toLowerCase();
      const ph = String(claim.phone || '').replace(/\D/g, '').slice(-10);
      return Object.values(gymSeats).some((g) => {
        const gem = String(g.email || '').trim().toLowerCase();
        const gph = String(g.phone || '').replace(/\D/g, '').slice(-10);
        if (em && gem && em === gem) return true;
        if (ph.length === 10 && gph.length === 10 && ph === gph) return true;
        return false;
      });
    };
    const placeGroups = (people, extra) => {
      const groups = [];
      const seen = new Set();
      people.forEach((p) => {
        const gid = p.groupId || p.seatId;
        if (seen.has(gid)) return;
        seen.add(gid);
        groups.push(people.filter((x) => (x.groupId || x.seatId) === gid));
      });
      groups.forEach((g) => {
        if (n - 1 + g.length > GYM_SEATS_PER) nextTable();
        const placedIds = [];
        g.forEach((p) => {
          const placed = place(p, extra(p));
          if (placed) {
            gymSeats[placed.seatId] = placed;
            placedIds.push(placed.seatId);
          }
        });
        if (placedIds.length >= 2 || g.some((p) => p.partyType === 'couple')) {
          gymCouples.push({
            a: { name: g[0].person || g[0].name, email: g[0].email || '', phone: g[0].phone || '' },
            b: {
              name: (g[1] && (g[1].person || g[1].name)) || g[0].spouse || '',
              email: (g[1] && g[1].email) || '',
              phone: (g[1] && g[1].phone) || ''
            },
            seats: placedIds,
            groupId: g[0].groupId || null,
            source: extra(g[0]).source || 'gym-transfer',
            waitlist: !!extra(g[0]).waitlist,
            ts: new Date().toISOString()
          });
        }
      });
    };
    const jordanPeople = TABLES.flatMap((jt) =>
      Object.values(st.seats || {})
        .filter((c) => String(c.seatId || '').charAt(0) === jt)
        .sort((a, b) => parseInt(String(a.seatId).slice(1), 10) - parseInt(String(b.seatId).slice(1), 10))
    );
    placeGroups(jordanPeople, (p) => ({
      fromSeat: p.seatId,
      waitlist: false,
      source: 'gym-transfer'
    }));
    const waitPeople = TABLES.flatMap((jt) =>
      Object.values((st.waitlist && st.waitlist.seats) || {})
        .filter((c) => String(c.seatId || '').charAt(0) === jt)
        .sort((a, b) => parseInt(String(a.seatId).slice(1), 10) - parseInt(String(b.seatId).slice(1), 10))
    );
    placeGroups(waitPeople, (p) => ({
      fromSeat: 'WL ' + p.seatId,
      waitlist: true,
      source: 'gym-waitlist'
    }));
    return {
      seats: gymSeats,
      couples: gymCouples,
      transferredAt: new Date().toISOString()
    };
  }

  async function applyGymTransfer(state) {
    const st = state ? normalize(state) : await fetchState({ healRemote: false, orders: [] });
    st.gym = transferJordanToGym(st);
    return putState(st);
  }

  /* ---------------- SVG map ---------------- */
  /**
   * opts: { mode: 'guest'|'host', selected: [], friendly: Set|null (solo mode),
   *         partyType: 'solo'|'couple', layout: 'jordan'|'gym', map: 'main'|'waitlist'|'gym' }
   * Interactivity is handled by the embedding page via [data-seat] clicks.
   */
  function renderMapSVG(state, opts = {}) {
    const layout = opts.layout || (opts.map === 'gym' ? 'gym' : 'jordan');
    if (layout === 'gym') return renderGymSVG(state, opts);

    const mode = opts.mode || 'guest';
    const selected = new Set(opts.selected || []);
    const friendly = opts.friendly || null;
    const restrict = mode === 'guest' && opts.partyType === 'solo' && friendly;
    const claims =
      opts.map === 'waitlist'
        ? (state && state.waitlist && state.waitlist.seats) || {}
        : (state && state.seats) || {};
    const waitlist = opts.map === 'waitlist';

    let seats = '';
    TABLES.forEach((t) => {
      seatsOnTable(t).forEach((n) => {
        const id = seatKey(t, n);
        const p = seatXY(t, n);
        const claim = claims[id] || null;
        const isSel = selected.has(id);
        let cls = 'seat-open', fill = 'transparent', stroke = 'var(--accent, #c9a44a)',
          label = String(n), lblFill = 'var(--accent, #c9a44a)', extra = '', title = `Table ${t} · Seat ${n}`;
        if (claim) {
          cls = 'seat-taken';
          /* Gray blocked chair — gold is only for open / in-progress picks. */
          fill = '#2c2c32'; stroke = '#6a6a72'; lblFill = '#d0d0d6';
          label = mode === 'host' ? (xesc(initials(claim.person || claim.name)) || '✕') : '✕';
          title = mode === 'host'
            ? `Table ${t} · Seat ${n} — ${xesc(claim.person || claim.name)}${claim.partyType === 'couple' ? ' (couple)' : ''}${waitlist ? ' · waitlist' : ''}`
            : `Table ${t} · Seat ${n} — ${waitlist ? 'waitlist hold' : 'reserved'}`;
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
          <text x="${p.x.toFixed(1)}" y="${(p.y + 4.5).toFixed(1)}" text-anchor="middle" font-size="${claim ? 12 : 13}" font-weight="800" fill="${lblFill}">${label}</text>
        </g>`;
      });
    });

    const tables = TABLES.map((t) => {
      const c = TABLE_POS[t];
      /* Shaded-out removed screen-side chairs — clear visual indicator not available */
      const ghosts = removedXY(t).map((p) => `
        <g>
          <title>Chair removed — no one sits with their back to the screen</title>
          <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${SEAT_R}" fill="#1a1a1f" stroke="#3a3a42" stroke-width="2" opacity="0.8"></circle>
          <line x1="${(p.x - 8).toFixed(1)}" y1="${(p.y - 8).toFixed(1)}" x2="${(p.x + 8).toFixed(1)}" y2="${(p.y + 8).toFixed(1)}" stroke="#5a5a62" stroke-width="2" stroke-linecap="round"></line>
          <line x1="${(p.x - 8).toFixed(1)}" y1="${(p.y + 8).toFixed(1)}" x2="${(p.x + 8).toFixed(1)}" y2="${(p.y - 8).toFixed(1)}" stroke="#5a5a62" stroke-width="2" stroke-linecap="round"></line>
        </g>`).join('');
      return `<g>
        <circle cx="${c.x}" cy="${c.y}" r="${TABLE_R}" fill="rgba(201,164,74,0.07)" stroke="var(--accent, #c9a44a)" stroke-width="1.5" stroke-opacity="0.5"></circle>
        <text x="${c.x}" y="${c.y + 2}" text-anchor="middle" font-size="40" font-weight="800" fill="var(--accent, #c9a44a)" fill-opacity="0.9">${t}</text>
        <text x="${c.x}" y="${c.y + 26}" text-anchor="middle" font-size="12" letter-spacing="1" fill="var(--accent, #c9a44a)" fill-opacity="0.55">SEATS ${seatsOnTable(t).length}</text>
        ${ghosts}
      </g>`;
    }).join('');

    return `<svg viewBox="0 0 ${VIEW.w} ${VIEW.h}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;display:block">
      <rect x="${ROOM.x}" y="${ROOM.y}" width="${ROOM.w}" height="${ROOM.h}" rx="4" fill="rgba(255,255,255,0.015)" stroke="#3c3c44" stroke-width="2"></rect>
      <rect x="${SCREEN.x}" y="${SCREEN.y}" width="${SCREEN.w}" height="${SCREEN.h}" rx="6" fill="#26262c" stroke="#4a4a52"></rect>
      <text x="${SCREEN.cx}" y="${SCREEN.cy + 5}" text-anchor="middle" font-size="15" letter-spacing="6" fill="#9a9aa4">SCREEN</text>
      <text x="${SCREEN.cx}" y="${SCREEN.y + SCREEN.h + 24}" text-anchor="middle" font-size="13" fill="#8a8a94">${waitlist ? 'WAITLIST · mirrored Jordan Room — holds only, does not change confirmed seats' : 'Jordan Room · 23 × 31 ft · 8-tops (screen-side chairs face away from the screen)'}</text>
      <rect x="${BUFFET.x}" y="${BUFFET.y}" width="${BUFFET.w}" height="${BUFFET.h}" rx="5" fill="rgba(201,164,74,0.05)" stroke="#4a4a52" stroke-dasharray="6 4"></rect>
      <text x="${BUFFET.x + BUFFET.w / 2}" y="${BUFFET.y + BUFFET.h / 2 + 5}" text-anchor="middle" font-size="14" letter-spacing="5" fill="#8a8a94">BBQ BUFFET</text>
      ${tables}
      ${seats}
    </svg>`;
  }

  function renderGymSVG(state, opts = {}) {
    const mode = opts.mode || 'guest';
    const selected = new Set(opts.selected || []);
    const claims = (state && state.gym && state.gym.seats) || (state && state.seats) || {};
    let seats = '';
    GYM_TABLES.forEach((t) => {
      for (let n = 1; n <= GYM_SEATS_PER; n++) {
        const id = t + n;
        const p = gymSeatXY(t, n);
        const claim = claims[id] || null;
        const isSel = selected.has(id);
        let fill = 'transparent', stroke = 'var(--accent, #c9a44a)',
          label = String(n), lblFill = 'var(--accent, #c9a44a)',
          title = `Gym Table ${t} · Seat ${n}`;
        if (claim) {
          const wl = !!(claim.waitlist || (claim.fromSeat && String(claim.fromSeat).indexOf('WL') === 0));
          fill = wl ? 'rgba(201,164,74,0.35)' : '#2c2c32';
          stroke = wl ? 'var(--accent, #c9a44a)' : '#6a6a72';
          lblFill = wl ? '#f0e2b8' : '#d0d0d6';
          label = mode === 'host' ? (xesc(initials(claim.person || claim.name)) || '✕') : '✕';
          title = mode === 'host'
            ? `Gym Table ${t} · Seat ${n} — ${xesc(claim.person || claim.name)}${claim.fromSeat ? ` (from ${claim.fromSeat})` : ''}${wl ? ' · waitlist' : ''}`
            : `Gym Table ${t} · Seat ${n} — reserved`;
        } else if (isSel) {
          fill = 'var(--accent, #c9a44a)'; lblFill = '#141414';
        }
        seats += `<g class="seat ${claim ? 'seat-taken' : isSel ? 'seat-selected' : 'seat-open'}" data-seat="${id}" style="cursor:${claim ? 'not-allowed' : 'pointer'}">
          <title>${title}</title>
          <circle cx="${p.x.toFixed(1)}" cy="${p.y.toFixed(1)}" r="${GYM_SEAT_R}" fill="${fill}" stroke="${stroke}" stroke-width="2"></circle>
          <text x="${p.x.toFixed(1)}" y="${(p.y + 4).toFixed(1)}" text-anchor="middle" font-size="11" font-weight="800" fill="${lblFill}">${label}</text>
        </g>`;
      }
    });
    const tables = GYM_TABLES.map((t) => {
      const c = GYM_TABLE_POS[t];
      return `<g>
        <circle cx="${c.x}" cy="${c.y}" r="${GYM_TABLE_R}" fill="rgba(201,164,74,0.07)" stroke="var(--accent, #c9a44a)" stroke-width="1.5" stroke-opacity="0.5"></circle>
        <text x="${c.x}" y="${c.y + 2}" text-anchor="middle" font-size="28" font-weight="800" fill="var(--accent, #c9a44a)" fill-opacity="0.9">${t}</text>
        <text x="${c.x}" y="${c.y + 20}" text-anchor="middle" font-size="10" letter-spacing="1" fill="var(--accent, #c9a44a)" fill-opacity="0.55">6 SEATS</text>
      </g>`;
    }).join('');
    return `<svg viewBox="0 0 ${GYM_VIEW.w} ${GYM_VIEW.h}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;display:block">
      <rect x="${GYM_ROOM.x}" y="${GYM_ROOM.y}" width="${GYM_ROOM.w}" height="${GYM_ROOM.h}" rx="4" fill="rgba(255,255,255,0.015)" stroke="#3c3c44" stroke-width="2"></rect>
      <rect x="${GYM_SCREEN.x}" y="${GYM_SCREEN.y}" width="${GYM_SCREEN.w}" height="${GYM_SCREEN.h}" rx="6" fill="#26262c" stroke="#4a4a52"></rect>
      <text x="${GYM_SCREEN.cx}" y="${GYM_SCREEN.cy + 5}" text-anchor="middle" font-size="14" letter-spacing="5" fill="#9a9aa4">SCREEN</text>
      <text x="${GYM_SCREEN.cx}" y="${GYM_SCREEN.y + GYM_SCREEN.h + 20}" text-anchor="middle" font-size="12" fill="#8a8a94">Gymnasium backup · Jordan confirmed (dark) + waitlist overflow (gold) · does not change live seats</text>
      <rect x="${GYM_BUFFET.x}" y="${GYM_BUFFET.y}" width="${GYM_BUFFET.w}" height="${GYM_BUFFET.h}" rx="5" fill="rgba(201,164,74,0.05)" stroke="#4a4a52" stroke-dasharray="6 4"></rect>
      <text x="${GYM_BUFFET.x + GYM_BUFFET.w / 2}" y="${GYM_BUFFET.y + GYM_BUFFET.h / 2 + 4}" text-anchor="middle" font-size="13" letter-spacing="4" fill="#8a8a94">BBQ BUFFET</text>
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
      ${chip('background:#2c2c32;border:2px solid #6a6a72', 'Reserved')}
      ${mode === 'guest' ? chip('border:2px dashed #7a5f2a', 'Held for couples') : ''}
    </div>`;
  }

  function seatLabel(ids, prefix) {
    if (!ids || !ids.length) return '';
    const t = String(ids[0]).charAt(0);
    const nums = ids.map((id) => String(id).slice(1)).join(' & ');
    return `${prefix || 'Table'} ${t} · Seat${ids.length > 1 ? 's' : ''} ${nums}`;
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
    EXTRA_SEATS,
    GYM_TABLES,
    GYM_SEATS_PER,
    WAITLIST_CONFIRM,
    seatsOnTable,
    isValidSeatId,
    isGymSeatId,
    allSeats,
    gymAllSeats,
    emptyState,
    normalize,
    mergeStates,
    claimsFromOrders,
    parseSeatLabel,
    fetchState,
    getCachedState: readLocalCache,
    putState,
    claimSeats,
    releaseSeats,
    clearAllSeats,
    clearLocalCache,
    addAccommodation,
    addCoupleLink,
    listJoinablePartners,
    attachPartnerToCouple,
    soloFriendly,
    adjacentOpen,
    bestPartnerSeat,
    pairCapacity,
    transferJordanToGym,
    applyGymTransfer,
    getBucket,
    renderMapSVG,
    legendHTML,
    seatLabel,
    pushSeatEventToGHL,
    initials
  };
})(typeof window !== 'undefined' ? window : globalThis);
