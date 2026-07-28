/**
 * Shared preference log — multi-device command center + guest writes.
 * Uses jsonblob.com (CORS) so host browser and guest browsers share one list.
 * Host also merges into localStorage so reports persist after first sync.
 */
(function (global) {
  const DEFAULT_BLOB =
    (global.RETIREMENT_EVEREST && global.RETIREMENT_EVEREST.sharedOrdersBlobId) ||
    '019faaca-6d9a-7cda-8085-3cd63ebda2bf';

  function blobUrl(id) {
    return `https://jsonblob.com/api/jsonBlob/${id || DEFAULT_BLOB}`;
  }

  function reportEmail() {
    return (
      (global.RETIREMENT_EVEREST && global.RETIREMENT_EVEREST.reportEmail) ||
      'johnny@blacksandcapitalgroup.com'
    );
  }

  function mergeOrders(local, remote) {
    const byKey = new Map();
    const keyOf = (o) =>
      String(o.id || '') ||
      `${o.email || ''}|${o.phone || ''}|${o.ts || ''}|${o.name || ''}`;
    [...(local || []), ...(remote || [])].forEach((o) => {
      if (!o || typeof o !== 'object') return;
      const k = keyOf(o);
      if (!byKey.has(k)) byKey.set(k, o);
    });
    return [...byKey.values()].sort((a, b) =>
      String(b.ts || '').localeCompare(String(a.ts || ''))
    );
  }

  async function fetchSharedOrders(locationId) {
    const id = global.RETIREMENT_EVEREST?.sharedOrdersBlobId || DEFAULT_BLOB;
    const res = await fetch(blobUrl(id) + '?t=' + Date.now(), {
      method: 'GET',
      mode: 'cors',
      headers: { Accept: 'application/json' },
      cache: 'no-store'
    });
    if (!res.ok) throw new Error('Shared log HTTP ' + res.status);
    let data = await res.json();
    if (data && data.error) throw new Error(String(data.error));
    if (!Array.isArray(data)) data = data?.orders || [];
    if (!Array.isArray(data)) data = [];
    if (locationId) {
      data = data.filter(
        (o) =>
          !o.locationId ||
          o.locationId === locationId ||
          o.location === locationId ||
          // parent venue kennedy-school should see bbq submits
          (locationId === 'kennedy-school-bbq' && o.locationId === 'kennedy-school') ||
          (locationId === 'kennedy-school' &&
            (o.locationId === 'kennedy-school-bbq' || o.location === 'kennedy-school-bbq'))
      );
    }
    return data;
  }

  async function putSharedOrders(list) {
    const id = global.RETIREMENT_EVEREST?.sharedOrdersBlobId || DEFAULT_BLOB;
    const url = blobUrl(id);
    const body = Array.isArray(list) ? list.slice(0, 500) : [];
    const put = await fetch(url, {
      method: 'PUT',
      mode: 'cors',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body)
    });
    if (!put.ok) throw new Error('Shared log write HTTP ' + put.status);
    return body;
  }

  async function appendSharedOrder(order) {
    const id = global.RETIREMENT_EVEREST?.sharedOrdersBlobId || DEFAULT_BLOB;
    const url = blobUrl(id);
    let list = [];
    try {
      const res = await fetch(url + '?t=' + Date.now(), {
        method: 'GET',
        mode: 'cors',
        headers: { Accept: 'application/json' },
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        list = Array.isArray(data) ? data : data?.orders || [];
      }
    } catch (_) {
      list = [];
    }
    list.unshift(order);
    // Cap log size
    list = list.slice(0, 500);
    return putSharedOrders(list);
  }

  /**
   * Host: push this browser's preference log into the shared blob when local
   * is richer (e.g. after a blob expiry wiped the remote list).
   */
  async function publishLocalOrdersForLocation(loc) {
    if (!loc?.storageKey) return [];
    let local = [];
    try {
      local = JSON.parse(localStorage.getItem(loc.storageKey) || '[]');
    } catch (_) {
      local = [];
    }
    // Also pull any legacy storage keys if present
    const legacyKeys = [
      'kennedyschool_bbq_prefs_v3',
      'kennedyschool_bbq_prefs_v2',
      'kennedyschool_bbq_prefs_v1'
    ];
    legacyKeys.forEach((k) => {
      try {
        const arr = JSON.parse(localStorage.getItem(k) || '[]');
        if (Array.isArray(arr) && arr.length) local = mergeOrders(local, arr);
      } catch (_) {}
    });
    let remote = [];
    try {
      remote = await fetchSharedOrders(loc.id || loc.slug);
    } catch (_) {}
    const merged = mergeOrders(local, remote);
    if (merged.length > remote.length) {
      try {
        await putSharedOrders(merged);
        try {
          localStorage.setItem(loc.storageKey, JSON.stringify(merged));
        } catch (_) {}
      } catch (e) {
        console.warn('[RE] publish local orders failed', e);
      }
    }
    return merged;
  }

  /** Email Johnny a plain report (FormSubmit). First use may require email confirm from FormSubmit. */
  async function emailHostReport(order, extra) {
    const to = reportEmail();
    const summary =
      extra?.preferencesSummary ||
      [
        `Name: ${order.name || ''}`,
        `Email: ${order.email || ''}`,
        `Phone: ${order.phone || ''}`,
        order.buffet ? `Dinner: ${order.buffet}` : '',
        order.sides?.length ? `Sides: ${order.sides.join(' · ')}` : '',
        order.entree ? `Entrée: ${order.entree}` : '',
        order.dessert ? `Dessert: ${order.dessert}` : '',
        order.drink ? `Drink: ${order.drink}${order.drinkCat ? ` (${order.drinkCat})` : ''}` : '',
        order.notes ? `Notes: ${order.notes}` : '',
        `Location: ${order.locationId || order.location || ''}`,
        `When: ${order.ts || new Date().toISOString()}`
      ]
        .filter(Boolean)
        .join('\n');

    const res = await fetch(`https://formsubmit.co/ajax/${encodeURIComponent(to)}`, {
      method: 'POST',
      mode: 'cors',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify({
        name: order.name || 'Guest',
        email: order.email || to,
        phone: order.phone || '',
        _subject: `Retirement Everest preferences · ${order.name || 'Guest'} · Kennedy BBQ`,
        _template: 'table',
        _captcha: 'false',
        location: order.locationId || order.location || '',
        buffet: order.buffet || '',
        sides: Array.isArray(order.sides) ? order.sides.join(' · ') : order.sides || '',
        entree: order.entree || '',
        dessert: order.dessert || '',
        drink: order.drink || '',
        drinkCat: order.drinkCat || '',
        notes: order.notes || '',
        party: order.joinedPartner
          ? `Joined partner — with ${order.linkedPartnerName || order.spouse || ''}`
          : (order.partyType === 'couple' ? `Couple${order.spouse ? ` — with ${order.spouse}` : ''}` : 'Solo'),
        seats: order.seatLabel || (Array.isArray(order.seats) ? order.seats.join(', ') : ''),
        seatingHelp: order.seatAccommodation ? 'NEEDS PERSONAL SEATING ARRANGEMENT' : '',
        message: summary
      })
    });
    const text = await res.text().catch(() => '');
    return { ok: res.ok, body: text };
  }

  /**
   * Host helper: localStorage + remote shared log, then persist merged to localStorage.
   */
  async function loadOrdersForLocation(loc) {
    const key = loc.storageKey;
    const local = JSON.parse(localStorage.getItem(key) || '[]');
    let remote = [];
    try {
      remote = await fetchSharedOrders(loc.id || loc.slug);
    } catch (e) {
      console.warn('[RE] shared orders fetch failed', e);
    }
    const merged = mergeOrders(local, remote);
    try {
      localStorage.setItem(key, JSON.stringify(merged));
    } catch (_) {}
    return merged;
  }

  function matchesLocation(o, loc) {
    if (!o || !loc) return false;
    const ids = [loc.id, loc.slug].filter(Boolean);
    if (loc.guestSlug) ids.push(loc.guestSlug);
    if (loc.slug === 'kennedy-school') ids.push('kennedy-school-bbq');
    if (loc.slug === 'kennedy-school-bbq') ids.push('kennedy-school');
    const oid = o.locationId || o.location || '';
    // Require an explicit location match — never treat blank locationId as "all"
    return !!oid && ids.includes(oid);
  }

  /**
   * Remove seat assignments from preference rows (so release is not re-healed
   * from the shared order log on next fetch).
   */
  async function stripSeatsFromOrders(loc, seatIds) {
    const ids = new Set((seatIds || []).map(String));
    if (!ids.size || !loc?.storageKey) return [];

    const scrub = (list) =>
      (list || []).map((o) => {
        if (!o || typeof o !== 'object') return o;
        const seats = Array.isArray(o.seats) ? o.seats.map(String) : [];
        const hasMatch = seats.some((s) => ids.has(s));
        const labelMatch =
          o.seatLabel &&
          [...ids].some((id) => String(o.seatLabel).includes(id));
        if (!hasMatch && !labelMatch) return o;
        const next = { ...o };
        next.seats = seats.filter((s) => !ids.has(s));
        if (!next.seats.length) {
          delete next.seats;
          delete next.seatLabel;
        } else if (typeof next.seatLabel === 'string') {
          ids.forEach((id) => {
            next.seatLabel = next.seatLabel
              .replace(new RegExp('\\b' + id + '\\b', 'gi'), '')
              .replace(/\s*&\s*$/, '')
              .replace(/^\s*&\s*/, '')
              .replace(/\s{2,}/g, ' ')
              .trim();
          });
          if (!next.seatLabel || /^Table\s+[A-D]\s*·?\s*Seats?\s*$/i.test(next.seatLabel)) {
            delete next.seatLabel;
          }
        }
        return next;
      });

    let local = [];
    try {
      local = JSON.parse(localStorage.getItem(loc.storageKey) || '[]');
    } catch (_) {
      local = [];
    }
    local = scrub(local);
    try {
      localStorage.setItem(loc.storageKey, JSON.stringify(local));
    } catch (_) {}

    try {
      const all = await fetchSharedOrders();
      const next = all.map((o) => (matchesLocation(o, loc) ? scrub([o])[0] : o));
      await putSharedOrders(next);
      return next.filter((o) => matchesLocation(o, loc));
    } catch (e) {
      console.warn('[RE] stripSeatsFromOrders remote failed', e);
      return local;
    }
  }

  /**
   * Clear preference log for one location (localStorage + shared blob rows).
   * Leaves other locations' rows intact in the shared log.
   */
  async function clearOrdersForLocation(loc) {
    if (!loc?.storageKey) return { local: 0, remoteRemoved: 0 };

    const keys = [loc.storageKey];
    // Only BBQ-related locations touch legacy Kennedy preference keys
    if (
      loc.bbqMenuPick ||
      loc.slug === 'kennedy-school' ||
      loc.slug === 'kennedy-school-bbq' ||
      /kennedyschool_bbq/i.test(loc.storageKey || '')
    ) {
      keys.push(
        'kennedyschool_bbq_prefs_v3',
        'kennedyschool_bbq_prefs_v2',
        'kennedyschool_bbq_prefs_v1'
      );
    }
    let localCount = 0;
    keys.forEach((k) => {
      try {
        const arr = JSON.parse(localStorage.getItem(k) || '[]');
        if (Array.isArray(arr)) localCount = Math.max(localCount, arr.length);
        localStorage.removeItem(k);
      } catch (_) {
        try {
          localStorage.removeItem(k);
        } catch (__) {}
      }
    });

    let remoteRemoved = 0;
    try {
      const all = await fetchSharedOrders();
      // Also drop rows with no locationId when clearing the primary BBQ event —
      // those rows match every location filter and re-seed seats after clear.
      const isBbq =
        loc.bbqMenuPick ||
        loc.slug === 'kennedy-school' ||
        loc.slug === 'kennedy-school-bbq';
      const kept = (all || []).filter((o) => {
        if (matchesLocation(o, loc)) return false;
        if (isBbq && !(o.locationId || o.location)) return false;
        return true;
      });
      remoteRemoved = (all || []).length - kept.length;
      await putSharedOrders(kept);
    } catch (e) {
      console.warn('[RE] clearOrdersForLocation remote failed', e);
    }
    return { local: localCount, remoteRemoved };
  }

  global.RESharedOrders = {
    blobUrl,
    mergeOrders,
    fetchSharedOrders,
    putSharedOrders,
    appendSharedOrder,
    publishLocalOrdersForLocation,
    emailHostReport,
    loadOrdersForLocation,
    stripSeatsFromOrders,
    clearOrdersForLocation
  };
})(typeof window !== 'undefined' ? window : globalThis);
