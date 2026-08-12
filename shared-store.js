/**
 * Durable multi-device store client (Google Apps Script web app).
 * Survives for the full event window — not a 24h toy blob.
 *
 * Config (first match wins):
 *   1. localStorage re_integrations_v1.sharedStoreUrl
 *   2. RETIREMENT_EVEREST.sharedStoreUrl
 */
(function (global) {
  const LS_INTEGRATIONS = 're_integrations_v1';

  function getSharedStoreUrl() {
    try {
      const integ = JSON.parse(localStorage.getItem(LS_INTEGRATIONS) || '{}');
      if (integ.sharedStoreUrl) return String(integ.sharedStoreUrl).trim();
    } catch (_) {}
    const cfg = global.RETIREMENT_EVEREST || {};
    return String(cfg.sharedStoreUrl || '').trim();
  }

  function isConfigured() {
    const u = getSharedStoreUrl();
    return /^https:\/\/script\.google\.com\//.test(u) || /^https:\/\/script\.googleusercontent\.com\//.test(u);
  }

  /* Short in-memory TTL so one page load doesn't hit Apps Script 3–4 times.
     Apps Script cold starts are often 1.5–8s each — sequential multiplies pain. */
  const mem = { seats: null, orders: null, at: { seats: 0, orders: 0 }, inflight: {} };
  const MEM_TTL_MS = 8000;

  function memGet(key) {
    if (key !== 'seats' && key !== 'orders') return null;
    if (mem[key] != null && Date.now() - (mem.at[key] || 0) < MEM_TTL_MS) return mem[key];
    return null;
  }

  function memSet(key, data) {
    if (key !== 'seats' && key !== 'orders') return;
    mem[key] = data;
    mem.at[key] = Date.now();
  }

  function memInvalidate(key) {
    if (key) {
      mem[key] = null;
      mem.at[key] = 0;
    } else {
      mem.seats = null;
      mem.orders = null;
      mem.at.seats = 0;
      mem.at.orders = 0;
    }
  }

  /** Abort slow Apps Script so UI can fall back instead of spinning forever. */
  function fetchWithTimeout(url, opts, ms) {
    const ctrl = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timer = ctrl ? setTimeout(() => ctrl.abort(), ms || 12000) : null;
    const finalOpts = ctrl ? { ...opts, signal: ctrl.signal } : opts;
    return fetch(url, finalOpts).finally(() => {
      if (timer) clearTimeout(timer);
    });
  }

  /**
   * Apps Script web apps often need redirect: 'follow' and no custom content-type
   * preflight issues — use text/plain for POST body (script still parses JSON).
   */
  async function storeGet(key) {
    const base = getSharedStoreUrl();
    if (!base) throw new Error('Shared store URL not configured');
    const hit = memGet(key);
    if (hit !== null) return hit;
    if (mem.inflight[key]) return mem.inflight[key];

    const url = base + (base.includes('?') ? '&' : '?') + 'key=' + encodeURIComponent(key) + '&t=' + Date.now();
    mem.inflight[key] = (async () => {
      try {
        const res = await fetchWithTimeout(
          url,
          {
            method: 'GET',
            mode: 'cors',
            redirect: 'follow',
            cache: 'no-store',
            headers: { Accept: 'application/json' }
          },
          10000
        );
        const text = await res.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch (_) {
          throw new Error('Shared store GET non-JSON: ' + text.slice(0, 120));
        }
        if (!res.ok || data.ok === false) {
          throw new Error(data.error || 'Shared store GET HTTP ' + res.status);
        }
        memSet(key, data.data);
        return data.data;
      } finally {
        delete mem.inflight[key];
      }
    })();
    return mem.inflight[key];
  }

  async function storePut(key, payload) {
    const base = getSharedStoreUrl();
    if (!base) throw new Error('Shared store URL not configured');
    memInvalidate(key);
    const body = JSON.stringify({ key: key, data: payload });
    const res = await fetchWithTimeout(
      base,
      {
        method: 'POST',
        mode: 'cors',
        redirect: 'follow',
        cache: 'no-store',
        // text/plain avoids CORS preflight on many Apps Script deployments
        headers: { 'Content-Type': 'text/plain;charset=utf-8', Accept: 'application/json' },
        body
      },
      15000
    );
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (_) {
      throw new Error('Shared store PUT non-JSON: ' + text.slice(0, 120));
    }
    if (!res.ok || data.ok === false) {
      throw new Error(data.error || 'Shared store PUT HTTP ' + res.status);
    }
    memSet(key, payload);
    return data;
  }

  async function storeAction(action, fields) {
    const base = getSharedStoreUrl();
    if (!base) throw new Error('Shared store URL not configured');
    // Mutations invalidate both maps (stripSeats / clearOrders touch orders ± seats)
    memInvalidate();
    const body = JSON.stringify({ action: action, ...(fields || {}) });
    const res = await fetchWithTimeout(
      base,
      {
        method: 'POST',
        mode: 'cors',
        redirect: 'follow',
        cache: 'no-store',
        headers: { 'Content-Type': 'text/plain;charset=utf-8', Accept: 'application/json' },
        body
      },
      15000
    );
    const text = await res.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch (_) {
      throw new Error('Shared store action non-JSON: ' + text.slice(0, 120));
    }
    if (!res.ok || data.ok === false) {
      throw new Error(data.error || 'Shared store action HTTP ' + res.status);
    }
    return data;
  }

  async function health() {
    const base = getSharedStoreUrl();
    if (!base) return { ok: false, configured: false, error: 'not configured' };
    try {
      const url = base + (base.includes('?') ? '&' : '?') + 'key=health&t=' + Date.now();
      const res = await fetch(url, { method: 'GET', mode: 'cors', redirect: 'follow', cache: 'no-store' });
      const data = await res.json();
      return { ok: !!(data && data.ok), configured: true, durable: !!data.durable, raw: data };
    } catch (e) {
      return { ok: false, configured: true, error: String(e.message || e) };
    }
  }

  // ── Seats ─────────────────────────────────────────────
  async function fetchSeats() {
    const data = await storeGet('seats');
    if (!data || typeof data !== 'object' || Array.isArray(data)) {
      return { v: 1, event: 'kennedy-school-bbq', seats: {}, couples: [], accommodations: [] };
    }
    return data;
  }

  async function putSeats(state) {
    await storePut('seats', state);
    return state;
  }

  // ── Orders ────────────────────────────────────────────
  async function fetchOrders() {
    const data = await storeGet('orders');
    return Array.isArray(data) ? data : [];
  }

  async function putOrders(list) {
    const body = Array.isArray(list) ? list.slice(0, 500) : [];
    await storePut('orders', body);
    return body;
  }

  async function appendOrder(order) {
    // Atomic-ish append on the server so two phones don't clobber each other
    try {
      await storeAction('appendOrder', { order: order });
      return true;
    } catch (e) {
      // Fallback: read-modify-write
      const list = await fetchOrders();
      list.unshift(order);
      await putOrders(list.slice(0, 500));
      return true;
    }
  }

  global.RESharedStore = {
    getSharedStoreUrl,
    isConfigured,
    health,
    storeGet,
    storePut,
    storeAction,
    fetchSeats,
    putSeats,
    fetchOrders,
    putOrders,
    appendOrder,
    memInvalidate
  };
})(typeof window !== 'undefined' ? window : globalThis);
