/**
 * Retirement Everest — durable multi-device store (seats + preference log)
 *
 * Survives weeks/months (Google Apps Script + Spreadsheet). Replaces jsonblob.
 *
 * SETUP (once, ~3 minutes):
 * 1. https://script.google.com → New project → name it "RE Shared Store"
 * 2. Paste this entire file, save
 * 3. Run → setupOnce  (authorize when asked — open spreadsheet link in Logs)
 * 4. Deploy → New deployment → Web app
 *      Execute as: Me
 *      Who has access: Anyone
 * 5. Copy the /exec URL
 * 6. Command center → Outreach → paste into "Shared store URL" → Save
 *    (or set RETIREMENT_EVEREST.sharedStoreUrl in locations.js and redeploy Pages)
 *
 * API (JSON, CORS-friendly via redirect mode from browser):
 *   GET  ?key=seats|orders|health
 *   POST { key: "seats"|"orders", data: <object|array> }
 *   POST { action: "appendOrder", order: {...} }
 *   POST { action: "clearOrders", locationIds: ["kennedy-school-bbq", ...] }
 *   POST { action: "stripSeats", locationIds: [...], seatIds: ["A1",...] }
 */

var STORE_SHEET = 'RE_STORE';
var META_KEY = 're_shared_store_sheet_id';

function setupOnce() {
  var ss = SpreadsheetApp.create('Retirement Everest — Shared Store');
  var sheet = ss.getSheets()[0];
  sheet.setName(STORE_SHEET);
  sheet.getRange(1, 1, 1, 3).setValues([['key', 'json', 'updatedAt']]);
  sheet.getRange(2, 1, 2, 3).setValues([
    ['seats', JSON.stringify({ v: 1, event: 'kennedy-school-bbq', seats: {}, couples: [], accommodations: [] }), new Date().toISOString()],
    ['orders', '[]', new Date().toISOString()]
  ]);
  PropertiesService.getScriptProperties().setProperty(META_KEY, ss.getId());
  Logger.log('Sheet created: ' + ss.getUrl());
  Logger.log('Spreadsheet ID: ' + ss.getId());
  Logger.log('Next: Deploy → New deployment → Web app → Anyone → copy /exec URL');
  return ss.getUrl();
}

function getSheet_() {
  var id = PropertiesService.getScriptProperties().getProperty(META_KEY);
  if (!id) {
    // Prefer bound spreadsheet if this script is container-bound
    try {
      var bound = SpreadsheetApp.getActiveSpreadsheet();
      if (bound) {
        id = bound.getId();
        PropertiesService.getScriptProperties().setProperty(META_KEY, id);
      }
    } catch (e) {}
  }
  if (!id) throw new Error('Run setupOnce() once, then Deploy as Web app.');
  var ss = SpreadsheetApp.openById(id);
  var sheet = ss.getSheetByName(STORE_SHEET);
  if (!sheet) {
    sheet = ss.insertSheet(STORE_SHEET);
    sheet.getRange(1, 1, 1, 3).setValues([['key', 'json', 'updatedAt']]);
  }
  return sheet;
}

function readKey_(key) {
  var sheet = getSheet_();
  var values = sheet.getDataRange().getValues();
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]) === key) {
      var raw = values[i][1];
      if (raw === '' || raw == null) return key === 'orders' ? [] : {};
      try {
        return JSON.parse(raw);
      } catch (e) {
        return key === 'orders' ? [] : {};
      }
    }
  }
  return key === 'orders' ? [] : null;
}

function writeKey_(key, data) {
  var sheet = getSheet_();
  var values = sheet.getDataRange().getValues();
  var json = JSON.stringify(data);
  var now = new Date().toISOString();
  // Sheet.getRange(row, column, numRows, numColumns) — NOT endRow/endColumn
  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]) === key) {
      sheet.getRange(i + 1, 2, 1, 2).setValues([[json, now]]);
      return { ok: true, key: key, updatedAt: now, bytes: json.length };
    }
  }
  sheet.appendRow([key, json, now]);
  return { ok: true, key: key, updatedAt: now, bytes: json.length };
}

function matchesLocation_(o, locationIds) {
  if (!o) return false;
  var ids = locationIds || [];
  var oid = o.locationId || o.location || '';
  if (!oid) return false;
  for (var i = 0; i < ids.length; i++) {
    if (oid === ids[i]) return true;
  }
  // Kennedy parent/child aliases
  if (ids.indexOf('kennedy-school-bbq') >= 0 && oid === 'kennedy-school') return true;
  if (ids.indexOf('kennedy-school') >= 0 && oid === 'kennedy-school-bbq') return true;
  return false;
}

function doGet(e) {
  try {
    var key = (e && e.parameter && e.parameter.key) || 'health';
    if (key === 'health') {
      return json_({
        ok: true,
        service: 'Retirement Everest Shared Store',
        version: 2,
        durable: true,
        keys: ['seats', 'orders']
      });
    }
    if (key !== 'seats' && key !== 'orders') {
      return json_({ ok: false, error: 'Unknown key' }, 400);
    }
    var data = readKey_(key);
    if (data === null && key === 'seats') {
      data = { v: 1, event: 'kennedy-school-bbq', seats: {}, couples: [], accommodations: [] };
    }
    if (data === null && key === 'orders') data = [];
    return json_({ ok: true, key: key, data: data });
  } catch (err) {
    return json_({ ok: false, error: String(err.message || err) });
  }
}

function doPost(e) {
  try {
    var body = {};
    if (e && e.postData && e.postData.contents) {
      body = JSON.parse(e.postData.contents);
    }
    // Also accept form-encoded fallback
    if ((!body || !Object.keys(body).length) && e && e.parameter) {
      body = e.parameter;
      if (body.data && typeof body.data === 'string') {
        try { body.data = JSON.parse(body.data); } catch (x) {}
      }
      if (body.order && typeof body.order === 'string') {
        try { body.order = JSON.parse(body.order); } catch (x) {}
      }
    }

    var action = body.action || '';

    if (action === 'appendOrder') {
      var list = readKey_('orders') || [];
      if (!Array.isArray(list)) list = [];
      list.unshift(body.order || {});
      list = list.slice(0, 500);
      writeKey_('orders', list);
      return json_({ ok: true, action: 'appendOrder', count: list.length });
    }

    if (action === 'clearOrders') {
      var ids = body.locationIds || [];
      var all = readKey_('orders') || [];
      if (!Array.isArray(all)) all = [];
      var kept = all.filter(function (o) { return !matchesLocation_(o, ids); });
      // If clearing BBQ, also drop blank locationId rows (legacy ghosts)
      var clearingBbq = ids.indexOf('kennedy-school-bbq') >= 0 || ids.indexOf('kennedy-school') >= 0;
      if (clearingBbq) {
        kept = kept.filter(function (o) {
          return !!(o && (o.locationId || o.location));
        });
      }
      writeKey_('orders', kept);
      return json_({ ok: true, action: 'clearOrders', removed: all.length - kept.length, remaining: kept.length });
    }

    if (action === 'stripSeats') {
      var seatIds = (body.seatIds || []).map(String);
      var set = {};
      seatIds.forEach(function (id) { set[id] = true; });
      var orders = readKey_('orders') || [];
      if (!Array.isArray(orders)) orders = [];
      var locIds = body.locationIds || [];
      var next = orders.map(function (o) {
        if (!o || typeof o !== 'object') return o;
        if (locIds.length && !matchesLocation_(o, locIds) && (o.locationId || o.location)) return o;
        var seats = Array.isArray(o.seats) ? o.seats.map(String) : [];
        var hit = seats.some(function (s) { return set[s]; });
        var labelHit = o.seatLabel && seatIds.some(function (id) {
          return String(o.seatLabel).indexOf(id) >= 0;
        });
        if (!hit && !labelHit) return o;
        var copy = JSON.parse(JSON.stringify(o));
        copy.seats = seats.filter(function (s) { return !set[s]; });
        if (!copy.seats.length) {
          delete copy.seats;
          delete copy.seatLabel;
        }
        return copy;
      });
      writeKey_('orders', next);
      return json_({ ok: true, action: 'stripSeats', seatIds: seatIds });
    }

    var key = body.key;
    if (key !== 'seats' && key !== 'orders') {
      return json_({ ok: false, error: 'POST requires key=seats|orders or action=...' });
    }
    if (typeof body.data === 'undefined') {
      return json_({ ok: false, error: 'Missing data' });
    }
    var result = writeKey_(key, body.data);
    return json_(result);
  } catch (err) {
    return json_({ ok: false, error: String(err.message || err) });
  }
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
