/**
 * Shared preference log — multi-device command center + guest writes.
 * Uses jsonblob.com (CORS) so host browser and guest browsers share one list.
 * Host also merges into localStorage so reports persist after first sync.
 */
(function (global) {
  const DEFAULT_BLOB =
    (global.RETIREMENT_EVEREST && global.RETIREMENT_EVEREST.sharedOrdersBlobId) ||
    '019f9b86-4651-7f0e-b7ce-120127b03201';

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
    if (!Array.isArray(data)) data = data?.orders || [];
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
    const put = await fetch(url, {
      method: 'PUT',
      mode: 'cors',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(list)
    });
    if (!put.ok) throw new Error('Shared log write HTTP ' + put.status);
    return list;
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

  global.RESharedOrders = {
    blobUrl,
    mergeOrders,
    fetchSharedOrders,
    appendSharedOrder,
    emailHostReport,
    loadOrdersForLocation
  };
})(typeof window !== 'undefined' ? window : globalThis);
