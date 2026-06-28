/**
 * Retirement Everest — Google Sheets webhook
 *
 * Deploy as Web App (Execute as: Me, Access: Anyone)
 * Paste the /exec URL into host.html → Outreach → Google Sheets webhook URL
 */
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const sheetId = data.sheetId;
    if (!sheetId) throw new Error('Missing sheetId');

    const ss = SpreadsheetApp.openById(sheetId);
    const tabName = data.sheetName || data.location || 'Orders';
    let sheet = ss.getSheetByName(tabName);
    if (!sheet) {
      sheet = ss.insertSheet(tabName);
    }

    const rows = data.rows || [];
    if (!rows.length) {
      return jsonResponse({ ok: true, message: 'No rows' });
    }

    const lastRow = sheet.getLastRow();
    const needsHeader = lastRow === 0;
    const hasTitleRow = rows[0][0] === '#' || rows[0][0] === 'Location' || rows[0][0] === 'Field';
    const dataRows = needsHeader ? rows : (hasTitleRow ? rows.slice(1) : rows);
    const startRow = needsHeader ? 1 : lastRow + 1;

    if (needsHeader) {
      sheet.getRange(1, 1, 1, rows[0].length).setValues([rows[0]]);
      if (rows.length > 1) {
        sheet.getRange(2, 1, rows.length - 1, rows[0].length).setValues(rows.slice(1));
      }
    } else if (dataRows.length) {
      sheet.getRange(startRow, 1, dataRows.length, dataRows[0].length).setValues(dataRows);
    }

    return jsonResponse({ ok: true, tab: tabName, rows: rows.length });
  } catch (err) {
    return jsonResponse({ ok: false, error: err.message });
  }
}

function doGet() {
  return jsonResponse({ ok: true, service: 'Retirement Everest Sheets Webhook', version: 1 });
}

function jsonResponse(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}