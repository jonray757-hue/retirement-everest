/**
 * Retirement Everest — Google Sheets webhook (standalone)
 *
 * Prefer the combined Shared Store (re-shared-store.gs v4+) which also
 * accepts this same payload on the same /exec URL.
 *
 * SETUP (if deploying standalone):
 * 1. https://script.google.com -> New project -> name "RE Sheets Webhook"
 * 2. Paste this file, save
 * 3. Run setupOnce once (creates spreadsheet + logs ID)
 * 4. Deploy -> New deployment -> Web app -> Me / Anyone -> copy /exec
 * 5. host.html -> Outreach -> paste webhook URL + sheet ID
 *
 * POST body:
 *   { sheetId, sheetName|location, rows: [[...], ...] }
 * GET:
 *   health JSON
 */

var META_SHEET_KEY = 're_events_sheet_id';

function setupOnce() {
  var ss = SpreadsheetApp.create('Retirement Everest Events');
  var sheet = ss.getSheets()[0];
  sheet.setName('Orders');
  sheet.getRange(1, 1, 1, 4).setValues([['#', 'Name', 'Notes', 'Time']]);
  PropertiesService.getScriptProperties().setProperty(META_SHEET_KEY, ss.getId());
  Logger.log('Sheet created: ' + ss.getUrl());
  Logger.log('Spreadsheet ID: ' + ss.getId());
  Logger.log('Next: Deploy -> New deployment -> Web app -> Anyone -> copy /exec URL');
  return { url: ss.getUrl(), id: ss.getId() };
}

function doPost(e) {
  try {
    var data = JSON.parse(e.postData.contents);
    var sheetId = data.sheetId || PropertiesService.getScriptProperties().getProperty(META_SHEET_KEY);
    if (!sheetId) throw new Error('Missing sheetId — run setupOnce() or pass sheetId');

    var ss = SpreadsheetApp.openById(sheetId);
    var tabName = data.sheetName || data.location || 'Orders';
    var sheet = ss.getSheetByName(tabName);
    if (!sheet) {
      sheet = ss.insertSheet(tabName);
    }

    var rows = data.rows || [];
    if (!rows.length) {
      return jsonResponse({ ok: true, message: 'No rows' });
    }

    var lastRow = sheet.getLastRow();
    var needsHeader = lastRow === 0;
    var hasTitleRow = rows[0][0] === '#' || rows[0][0] === 'Location' || rows[0][0] === 'Field';
    var dataRows = needsHeader ? rows : (hasTitleRow ? rows.slice(1) : rows);
    var startRow = needsHeader ? 1 : lastRow + 1;

    if (needsHeader) {
      sheet.getRange(1, 1, 1, rows[0].length).setValues([rows[0]]);
      if (rows.length > 1) {
        sheet.getRange(2, 1, rows.length - 1, rows[0].length).setValues(rows.slice(1));
      }
    } else if (dataRows.length) {
      sheet.getRange(startRow, 1, dataRows.length, dataRows[0].length).setValues(dataRows);
    }

    return jsonResponse({ ok: true, tab: tabName, rows: rows.length, sheetId: sheetId });
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message });
  }
}

function doGet() {
  return jsonResponse({
    ok: true,
    service: 'Retirement Everest Sheets Webhook',
    version: 2
  });
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
