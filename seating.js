/**
 * Seat reservations — Kennedy School BBQ (Martha Jordan Room).
 * Five 60" round tables (true 5 ft tops). Each is an 8-chair ring with the
 * 2 screen-side chairs removed so no one's back faces the screen → 6 tops.
 * Tables A–E in an arch facing the screen (30 seats total).
 *
 * Live shared state: durable Google Apps Script store (RESharedStore) preferred.
 * jsonblob fallback only if sharedStoreUrl is not configured (expires ~24h).
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
  const SEATS_PER_TABLE = 6;
  /* Martha Jordan Room, drawn to scale: 23 ft wide × 31 ft deep (713 sq ft), 34 px/ft.
     Screen on the short wall; BBQ buffet on the opposite short wall.
     Tables are true 60" (5 ft) rounds — venue 8-tops with 2 screen-side chairs
     removed so every guest faces the screen (6 tops). Footprint ≈ 8 ft with chairs. */
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

  function allSeats() {
    const out = [];
    TABLES.forEach((t) => {
      for (let n = 1; n <= SEATS_PER_TABLE; n++) out.push(seatKey(t, n));
    });
    return out;
  }

  function screenAngle(t) {
    const c = TABLE_POS[t];
    return Math.atan2(SCREEN.cy - c.y, SCREEN.cx - c.x); // toward screen
  }

  /** Seat position: real 8-top spacing (45°), 90° opening faces the screen. */
  function seatXY(t, n) {
    const c = TABLE_POS[t];
    const deg = FIRST_SEAT_DEG + (n - 1) * SEAT_STEP; // 67.5°..292.5°
    const a = screenAngle(t) + (deg * Math.PI) / 180;
    return {
      x: c.x + SEAT_RING * Math.cos(a),
      y: c.y + SEAT_RING * Math.sin(a)
    };
  }

  /** Positions of the two REMOVED screen-side chairs (rendered as ghosts). */
  function removedXY(t) {
    const c = TABLE_POS[t];
    return REMOVED_DEG.map((deg) => {
      const a = screenAngle(t) + (deg * Math.PI) / 180;
      return { x: c.x + SEAT_RING * Math.cos(a), y: c.y + SEAT_RING * Math.sin(a) };
    });
  }

  /* ---------------- Shared state ---------------- */
  /* Bump version when layout / seat IDs change so ghost caches on phones die. */
  const LOCAL_KEY = 're_seats_cache_v3';
  const SEAT_ID_RE = /^[A-E][1-6]$/;

  function emptyState() {
    return {
      v: 1,
      event: 'kennedy-school-bbq',
      seats: {},
      couples: [],
      accommodations: [],
      offline: false
    };
  }

  function normalize(data) {
    const st = data && typeof data === 'object' && !Array.isArray(data) ? data : {};
    // Prefer seats map; ignore legacy "tables" shape from bad blob seeds
    const seats =
      st.seats && typeof st.seats === 'object' && !Array.isArray(st.seats) ? st.seats : {};
    return {
      v: 1,
      event: st.event || 'kennedy-school-bbq',
      seats,
      couples: Array.isArray(st.couples) ? st.couples : [],
      accommodations: Array.isArray(st.accommodations) ? st.accommodations : [],
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
    return m[2].split(/\s*&\s*/).map((n) => t + String(n).trim()).filter((id) => SEAT_ID_RE.test(id));
  }

  /**
   * Rebuild seat claims from preference submissions (local or shared log).
   * Orders are a durable backup when the live seats blob is empty/expired.
   */
  function claimsFromOrders(orders) {
    const seats = {};
    (orders || []).forEach((o) => {
      if (!o || typeof o !== 'object') return;
      let ids = Array.isArray(o.seats) ? o.seats.filter((id) => SEAT_ID_RE.test(String(id))) : [];
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
        if (!claim || !SEAT_ID_RE.test(id)) return;
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

  /** Wipe local seat cache entirely (used by clear / full reset). */
  function clearLocalCache() {
    try {
      if (typeof localStorage === 'undefined') return;
      localStorage.removeItem(LOCAL_KEY);
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

    // ── Offline: best-effort local chart (never write back to remote) ──
    const parts = [emptyState()];
    if (local) parts.push(local);
    if (opts.offlineOrders !== false) parts.push(fromOrders);
    const merged = mergeStates(...parts);
    merged.offline = true;
    return merged;
  }

  async function putState(state) {
    const clean = normalize(state);
    delete clean.offline;
    // Always persist intentional writes — including empty seat maps after release/clear
    writeLocalCache(clean, { force: true });
    await remotePutSeats(clean);
    return clean;
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
      // healRemote false during claim loop — we putState ourselves after merge
      const st = await fetchState({ healRemote: false });
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
          partnerJoined: false,
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
          source: 'guest-reserve',
          pendingPartner: true,
          ts: new Date().toISOString()
        };
        const pe = (info.email || '').toLowerCase();
        const exists = (st.couples || []).some((c) => {
          const ae = (c.a?.email || '').toLowerCase();
          return (pe && ae && pe === ae) || (c.groupId && c.groupId === groupId);
        });
        if (!exists) {
          st.couples.unshift(pending);
          st.couples = st.couples.slice(0, 200);
        }
      }
      await putState(st);
      await sleep(500 + Math.random() * 400);
      const verify = await fetchState();
      const lost = seatIds.filter((id) => verify.seats[id]?.groupId !== groupId);
      if (!lost.length) return { ok: true, groupId, state: verify };
      if (attempt === 2) return { ok: false, taken: lost, state: verify };
    }
  }

  /**
   * Free seat(s) on the live map.
   * healRemote:false + no order re-merge so a released seat is not immediately
   * re-healed from preference logs (host must strip seats from orders separately).
   */
  async function releaseSeats(seatIds) {
    const ids = (seatIds || []).map(String).filter((id) => SEAT_ID_RE.test(id));
    if (!ids.length) return emptyState();

    // Read remote + local only (do not re-seed from orders here)
    const st = await fetchState({ healRemote: false, orders: [] });
    ids.forEach((id) => {
      delete st.seats[id];
    });
    // Drop couple rows that only referenced released seats
    if (Array.isArray(st.couples)) {
      st.couples = st.couples.filter((cp) => {
        const seats = Array.isArray(cp.seats) ? cp.seats.map(String) : [];
        if (!seats.length) return true;
        return !seats.every((s) => ids.includes(s));
      });
    }
    const written = await putState(st);
    // Verify remote accepted the release (last-seat bug was local cache refusing empty)
    try {
      const verify = await fetchState({ healRemote: false, orders: [] });
      const stillThere = ids.filter((id) => verify.seats[id]);
      if (stillThere.length) {
        stillThere.forEach((id) => {
          delete verify.seats[id];
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
        ? o.seats.filter((id) => SEAT_ID_RE.test(String(id)))
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
    const seats = Array.isArray(primary.seats) ? primary.seats.filter((id) => SEAT_ID_RE.test(id)) : [];
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
        <text x="${c.x}" y="${c.y + 26}" text-anchor="middle" font-size="12" letter-spacing="1" fill="var(--accent, #c9a44a)" fill-opacity="0.55">SEATS 6</text>
        ${ghosts}
      </g>`;
    }).join('');

    return `<svg viewBox="0 0 ${VIEW.w} ${VIEW.h}" xmlns="http://www.w3.org/2000/svg" style="width:100%;height:auto;display:block">
      <rect x="${ROOM.x}" y="${ROOM.y}" width="${ROOM.w}" height="${ROOM.h}" rx="4" fill="rgba(255,255,255,0.015)" stroke="#3c3c44" stroke-width="2"></rect>
      <rect x="${SCREEN.x}" y="${SCREEN.y}" width="${SCREEN.w}" height="${SCREEN.h}" rx="6" fill="#26262c" stroke="#4a4a52"></rect>
      <text x="${SCREEN.cx}" y="${SCREEN.cy + 5}" text-anchor="middle" font-size="15" letter-spacing="6" fill="#9a9aa4">SCREEN</text>
      <text x="${SCREEN.cx}" y="${SCREEN.y + SCREEN.h + 24}" text-anchor="middle" font-size="13" fill="#8a8a94">Martha Jordan Room · 23 × 31 ft — ✕ chairs removed so every seat faces the screen</text>
      <rect x="${BUFFET.x}" y="${BUFFET.y}" width="${BUFFET.w}" height="${BUFFET.h}" rx="5" fill="rgba(201,164,74,0.05)" stroke="#4a4a52" stroke-dasharray="6 4"></rect>
      <text x="${BUFFET.x + BUFFET.w / 2}" y="${BUFFET.y + BUFFET.h / 2 + 5}" text-anchor="middle" font-size="14" letter-spacing="5" fill="#8a8a94">BBQ BUFFET</text>
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
    emptyState,
    normalize,
    mergeStates,
    claimsFromOrders,
    parseSeatLabel,
    fetchState,
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
    renderMapSVG,
    legendHTML,
    seatLabel,
    pushSeatEventToGHL,
    initials
  };
})(typeof window !== 'undefined' ? window : globalThis);
