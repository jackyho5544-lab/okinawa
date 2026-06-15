/**
 * 沖繩 Dashboard — Sheet 寫入端口（Google Apps Script Web App）
 * 部署教學見 ../APPS_SCRIPT_SETUP.md
 *
 * 安全：改下面 EDIT_TOKEN 做你自己嘅密碼（唔好用預設）。
 * 個密碼只存喺呢個 script（唔會入 public repo）。app 編輯時會問一次，
 * 答啱先寫得入。只將密碼私下畀信得過嘅人。
 */
var EDIT_TOKEN = 'CHANGE_ME_改成你自己嘅密碼';

function doPost(e) {
  try {
    var body = JSON.parse(e.postData.contents);
    if (body.token !== EDIT_TOKEN) return json({ ok: false, error: '密碼錯誤' });

    var tab = String(body.tab || '');
    var cols = body.columns || [];
    var rows = body.rows || [];
    if (!tab || !cols.length) return json({ ok: false, error: '缺 tab 或 columns' });

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName(tab);
    if (!sh) return json({ ok: false, error: '搵唔到 tab：' + tab });

    // 整張表重寫：第一行欄名 + 之後每行資料（按 columns 次序）
    var out = [cols];
    for (var i = 0; i < rows.length; i++) {
      var r = rows[i], line = [];
      for (var j = 0; j < cols.length; j++) line.push(r[cols[j]] == null ? '' : r[cols[j]]);
      out.push(line);
    }
    sh.clearContents();
    sh.getRange(1, 1, out.length, cols.length).setValues(out);
    return json({ ok: true, tab: tab, count: rows.length });
  } catch (err) {
    return json({ ok: false, error: String(err) });
  }
}

function doGet() {
  return json({ ok: true, msg: 'okinawa dashboard write endpoint alive' });
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
