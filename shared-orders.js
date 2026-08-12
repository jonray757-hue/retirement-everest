/**
 * Shared preference log — multi-device command center + guest writes.
 * Durable store: Google Apps Script (RESharedStore) when configured.
 * Fallback: jsonblob (short-lived — only if sharedStoreUrl not set).
 */
(function (global) {
  const DEFAULT_BLOB =
    (global.RETIREMENT_EVEREST && global.RETIREMENT_EVEREST.sharedOrdersBlobId) ||
    '019faaca-6d9a-7cda-8085-3cd63ebda2bf';

  function blobUrl(id) {
    return `https://jsonblob.com/api/jsonBlob/${id || DEFAULT_BLOB}`;
  }

  function useDurableStore() {
    return !!(global.RESharedStore && global.RESharedStore.isConfigured && global.RESharedStore.isConfigured());
  }

  function reportEmail() {
    return (
      (global.RETIREMENT_EVEREST && global.RETIREMENT_EVEREST.reportEmail) ||
      'johnny@blacksandcapitalgroup.com'
    );
  }

  function keyOf(o) {
    if (!o || typeof o !== 'object') return '';
    if (o.id != null && String(o.id)) return 'id:' + String(o.id);
    return (
      'k:' +
      `${String(o.email || '').toLowerCase()}|${o.phone || ''}|${o.ts || ''}|${String(o.name || '').toLowerCase()}`
    );
  }

  function mergeOrders(local, remote) {
    const byKey = new Map();
    // Remote first: shared store is source of truth after host Release/Clear/Remove.
    [...(remote || []), ...(local || [])].forEach((o) => {
      if (!o || typeof o !== 'object') return;
      const k = keyOf(o);
      if (!byKey.has(k)) {
        byKey.set(k, o);
        return;
      }
      // Same key: prefer the row with fewer seat claims (stripped wins)
      const prev = byKey.get(k);
      const prevN = Array.isArray(prev.seats) ? prev.seats.length : prev.seatLabel ? 1 : 0;
      const nextN = Array.isArray(o.seats) ? o.seats.length : o.seatLabel ? 1 : 0;
      if (nextN < prevN) byKey.set(k, o);
    });
    return [...byKey.values()].sort((a, b) =>
      String(b.ts || '').localeCompare(String(a.ts || ''))
    );
  }

  /**
   * When cloud is reachable, cloud IS the guest list.
   * Local-only rows used to stay forever (phone shows "4 guests" after host
   * removed people on desktop). Only keep ultra-recent local submits not yet
   * visible on remote (in-flight guest form, last 2 minutes).
   */
  function reconcileWithRemote(local, remote) {
    const remoteList = Array.isArray(remote) ? remote : [];
    const remoteKeys = new Set(remoteList.map(keyOf).filter(Boolean));
    const now = Date.now();
    const pending = (local || []).filter((o) => {
      if (!o || typeof o !== 'object') return false;
      const k = keyOf(o);
      if (!k || remoteKeys.has(k)) return false;
      const ts = Date.parse(o.ts || '');
      if (!Number.isFinite(ts)) return false;
      return now - ts < 120000; // 2 minutes
    });
    return mergeOrders(pending, remoteList);
  }

  async function fetchSharedOrders(locationId) {
    let data = [];
    if (useDurableStore()) {
      data = await global.RESharedStore.fetchOrders();
    } else {
      const id = global.RETIREMENT_EVEREST?.sharedOrdersBlobId || DEFAULT_BLOB;
      const res = await fetch(blobUrl(id) + '?t=' + Date.now(), {
        method: 'GET',
        mode: 'cors',
        headers: { Accept: 'application/json' },
        cache: 'no-store'
      });
      if (!res.ok) throw new Error('Shared log HTTP ' + res.status);
      let raw = await res.json();
      if (raw && raw.error) throw new Error(String(raw.error));
      if (!Array.isArray(raw)) raw = raw?.orders || [];
      data = Array.isArray(raw) ? raw : [];
    }
    if (locationId) {
      data = data.filter(
        (o) =>
          !o.locationId ||
          o.locationId === locationId ||
          o.location === locationId ||
          (locationId === 'kennedy-school-bbq' && o.locationId === 'kennedy-school') ||
          (locationId === 'kennedy-school' &&
            (o.locationId === 'kennedy-school-bbq' || o.location === 'kennedy-school-bbq'))
      );
    }
    return data;
  }

  async function putSharedOrders(list) {
    const body = Array.isArray(list) ? list.slice(0, 500) : [];
    if (useDurableStore()) {
      await global.RESharedStore.putOrders(body);
      return body;
    }
    const id = global.RETIREMENT_EVEREST?.sharedOrdersBlobId || DEFAULT_BLOB;
    const put = await fetch(blobUrl(id), {
      method: 'PUT',
      mode: 'cors',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(body)
    });
    if (!put.ok) throw new Error('Shared log write HTTP ' + put.status);
    return body;
  }

  async function appendSharedOrder(order) {
    if (useDurableStore()) {
      await global.RESharedStore.appendOrder(order);
      return true;
    }
    let list = [];
    try {
      list = await fetchSharedOrders();
    } catch (_) {
      list = [];
    }
    list.unshift(order);
    list = list.slice(0, 500);
    return putSharedOrders(list);
  }

  /**
   * Host: push this browser's preference log into the shared store when local
   * is richer (explicit publish only — not on every report load).
   */
  async function publishLocalOrdersForLocation(loc) {
    if (!loc?.storageKey) return [];
    // Never bulk-upload local ghosts over a cleaner cloud list.
    // Only append local rows that are missing from remote (by key) and recent.
    let local = [];
    try {
      local = JSON.parse(localStorage.getItem(loc.storageKey) || '[]');
    } catch (_) {
      local = [];
    }
    let remote = [];
    try {
      remote = await fetchSharedOrders(loc.id || loc.slug);
    } catch (_) {
      remote = [];
    }
    const remoteKeys = new Set((remote || []).map(keyOf).filter(Boolean));
    const now = Date.now();
    const toAdd = (local || []).filter((o) => {
      const k = keyOf(o);
      if (!k || remoteKeys.has(k)) return false;
      const ts = Date.parse(o.ts || '');
      // Only push intentional recent local submits (not ancient test ghosts)
      return Number.isFinite(ts) && now - ts < 7 * 24 * 3600 * 1000;
    });
    if (!toAdd.length) {
      const cleaned = reconcileWithRemote(local, remote);
      try {
        localStorage.setItem(loc.storageKey, JSON.stringify(cleaned));
      } catch (_) {}
      return cleaned;
    }
    // Full list put: remote + only the missing local rows
    const merged = mergeOrders(toAdd, remote);
    try {
      await putSharedOrders(merged);
      try {
        localStorage.setItem(loc.storageKey, JSON.stringify(merged));
      } catch (_) {}
    } catch (e) {
      console.warn('[RE] publish local orders failed', e);
    }
    return merged;
  }

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

  async function loadOrdersForLocation(loc, opts = {}) {
    const key = loc.storageKey;
    let local = [];
    try {
      local = JSON.parse(localStorage.getItem(key) || '[]');
    } catch (_) {
      local = [];
    }
    // Also scrub legacy BBQ keys into local once so ghosts can be dropped together
    if (
      loc.bbqMenuPick ||
      loc.slug === 'kennedy-school' ||
      loc.slug === 'kennedy-school-bbq'
    ) {
      [
        'kennedyschool_bbq_prefs_v5',
        'kennedyschool_bbq_prefs_v4',
        'kennedyschool_bbq_prefs_v3',
        'kennedyschool_bbq_prefs_v2',
        'kennedyschool_bbq_prefs_v1'
      ].forEach((k) => {
        try {
          const arr = JSON.parse(localStorage.getItem(k) || '[]');
          if (Array.isArray(arr) && arr.length) local = mergeOrders(local, arr);
        } catch (_) {}
      });
    }

    let remote = null; // null = fetch failed (offline)
    try {
      remote = await fetchSharedOrders(loc.id || loc.slug);
    } catch (e) {
      console.warn('[RE] shared orders fetch failed', e);
    }

    let next;
    let source;
    if (remote !== null) {
      // Cloud won — drop local-only ghosts (except in-flight last 2 min)
      next = reconcileWithRemote(local, remote);
      source = 'remote';
      // Wipe legacy keys so they cannot re-merge later
      if (
        loc.bbqMenuPick ||
        loc.slug === 'kennedy-school' ||
        loc.slug === 'kennedy-school-bbq'
      ) {
        [
          'kennedyschool_bbq_prefs_v5',
          'kennedyschool_bbq_prefs_v4',
          'kennedyschool_bbq_prefs_v3',
          'kennedyschool_bbq_prefs_v2',
          'kennedyschool_bbq_prefs_v1'
        ].forEach((k) => {
          try {
            localStorage.removeItem(k);
          } catch (_) {}
        });
      }
    } else {
      next = Array.isArray(local) ? local : [];
      source = 'local-offline';
    }

    try {
      localStorage.setItem(key, JSON.stringify(next));
    } catch (_) {}

    if (opts.meta) {
      return { orders: next, source, remoteCount: remote ? remote.length : null, localCount: local.length };
    }
    return next;
  }

  function matchesLocation(o, loc) {
    if (!o || !loc) return false;
    const ids = [loc.id, loc.slug].filter(Boolean);
    if (loc.guestSlug) ids.push(loc.guestSlug);
    if (loc.slug === 'kennedy-school') ids.push('kennedy-school-bbq');
    if (loc.slug === 'kennedy-school-bbq') ids.push('kennedy-school');
    const oid = o.locationId || o.location || '';
    return !!oid && ids.includes(oid);
  }

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

    if (useDurableStore() && global.RESharedStore.storeAction) {
      try {
        await global.RESharedStore.storeAction('stripSeats', {
          seatIds: [...ids],
          locationIds: [loc.id, loc.slug, loc.guestSlug].filter(Boolean)
        });
        return await fetchSharedOrders(loc.id || loc.slug);
      } catch (e) {
        console.warn('[RE] stripSeats durable action failed, falling back', e);
      }
    }

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

  function orderKey(o) {
    return keyOf(o);
  }

  function matchesRemoveKey(o, keys) {
    const set = new Set((keys || []).map(String));
    if (!set.size) return false;
    return set.has(orderKey(o)) || (o.id != null && set.has(String(o.id))) || set.has('id:' + String(o.id));
  }

  /**
   * Remove one or more preference submissions (not just seats).
   * keys: orderKey() strings and/or raw id values.
   * Returns { removed, remaining, seatIds } — seatIds from deleted rows for map cleanup.
   */
  async function removeOrders(loc, keys) {
    const keyList = (keys || []).map(String).filter(Boolean);
    if (!keyList.length || !loc?.storageKey) {
      return { removed: 0, remaining: [], seatIds: [] };
    }

    const seatIds = [];
    const collectSeats = (o) => {
      if (!o) return;
      if (Array.isArray(o.seats)) {
        o.seats.forEach((s) => {
          if (s && !seatIds.includes(String(s))) seatIds.push(String(s));
        });
      }
    };

    const drop = (list) => {
      const kept = [];
      let removed = 0;
      (list || []).forEach((o) => {
        if (matchesRemoveKey(o, keyList)) {
          collectSeats(o);
          removed += 1;
        } else {
          kept.push(o);
        }
      });
      return { kept, removed };
    };

    // Local + legacy BBQ keys
    const storageKeys = [loc.storageKey];
    if (
      loc.bbqMenuPick ||
      loc.slug === 'kennedy-school' ||
      loc.slug === 'kennedy-school-bbq' ||
      /kennedyschool_bbq/i.test(loc.storageKey || '')
    ) {
      storageKeys.push(
        'kennedyschool_bbq_prefs_v5',
        'kennedyschool_bbq_prefs_v4',
        'kennedyschool_bbq_prefs_v3',
        'kennedyschool_bbq_prefs_v2',
        'kennedyschool_bbq_prefs_v1'
      );
    }
    let localRemoved = 0;
    let primaryKept = [];
    storageKeys.forEach((k, idx) => {
      try {
        const arr = JSON.parse(localStorage.getItem(k) || '[]');
        if (!Array.isArray(arr)) return;
        const { kept, removed } = drop(arr);
        localRemoved += removed;
        localStorage.setItem(k, JSON.stringify(kept));
        if (idx === 0) primaryKept = kept;
      } catch (_) {}
    });

    // Shared log: filter full list then put (works with durable + jsonblob)
    let remoteRemoved = 0;
    let remainingForLoc = primaryKept;
    try {
      if (global.RESharedStore?.memInvalidate) global.RESharedStore.memInvalidate('orders');
      const all = await fetchSharedOrders();
      const before = (all || []).length;
      const next = (all || []).filter((o) => !matchesRemoveKey(o, keyList));
      remoteRemoved = before - next.length;
      if (remoteRemoved > 0) {
        await putSharedOrders(next);
      }
      remainingForLoc = next.filter((o) => matchesLocation(o, loc));
      try {
        localStorage.setItem(loc.storageKey, JSON.stringify(remainingForLoc));
      } catch (_) {}
    } catch (e) {
      console.warn('[RE] removeOrders remote failed', e);
      remainingForLoc = primaryKept;
    }

    return {
      removed: Math.max(localRemoved, remoteRemoved),
      remaining: remainingForLoc,
      seatIds
    };
  }

  async function clearOrdersForLocation(loc) {
    if (!loc?.storageKey) return { local: 0, remoteRemoved: 0 };

    const keys = [loc.storageKey];
    if (
      loc.bbqMenuPick ||
      loc.slug === 'kennedy-school' ||
      loc.slug === 'kennedy-school-bbq' ||
      /kennedyschool_bbq/i.test(loc.storageKey || '')
    ) {
      keys.push(
        'kennedyschool_bbq_prefs_v5',
        'kennedyschool_bbq_prefs_v4',
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
    if (useDurableStore() && global.RESharedStore.storeAction) {
      try {
        const r = await global.RESharedStore.storeAction('clearOrders', {
          locationIds: [loc.id, loc.slug, loc.guestSlug, 'kennedy-school', 'kennedy-school-bbq'].filter(Boolean)
        });
        remoteRemoved = r.removed || 0;
        return { local: localCount, remoteRemoved };
      } catch (e) {
        console.warn('[RE] clearOrders durable action failed', e);
      }
    }

    try {
      const all = await fetchSharedOrders();
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
    reconcileWithRemote,
    orderKey,
    keyOf,
    fetchSharedOrders,
    putSharedOrders,
    appendSharedOrder,
    publishLocalOrdersForLocation,
    emailHostReport,
    loadOrdersForLocation,
    stripSeatsFromOrders,
    removeOrders,
    clearOrdersForLocation,
    useDurableStore
  };
})(typeof window !== 'undefined' ? window : globalThis);
