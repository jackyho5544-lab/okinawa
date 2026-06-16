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

    // 以下動作唔使密碼（人人用得）
    if (body.action === 'vote') return handleVote(body);       // 投票（單格）
    if (body.action === 'append') return handleAppend(body);   // 留言板：append 一行
    if (body.action === 'setcell') return handleSetCell(body); // checklist：剔一格

    // 其餘（改行程/資料）：要密碼，成張表覆寫
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

// 逐人投票：spot=景點, name=投票人, on=true加票/false收回。只改 votes tab 一格。
function handleVote(body) {
  var spot = String(body.spot || ''), name = String(body.name || ''), on = !!body.on;
  if (!spot || !name) return json({ ok: false, error: '缺 spot 或 name' });
  var lock = LockService.getScriptLock();
  try { lock.waitLock(8000); } catch (e) { return json({ ok: false, error: '系統繁忙，請再試' }); }
  try {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName('votes');
    if (!sh) return json({ ok: false, error: '冇 votes tab' });
    var data = sh.getDataRange().getValues();
    var header = data[0].map(function (h) { return String(h).trim(); });
    var ci = header.indexOf('spot'), vi = header.indexOf('voters'), ti = header.indexOf('votes');
    if (ci < 0) return json({ ok: false, error: 'votes tab 冇 spot 欄' });
    if (vi < 0) { vi = header.length; sh.getRange(1, vi + 1).setValue('voters'); } // 自動加 voters 欄
    var rowIdx = -1;
    for (var r = 1; r < data.length; r++) { if (String(data[r][ci]).trim() === spot) { rowIdx = r; break; } }
    if (rowIdx < 0) return json({ ok: false, error: '搵唔到景點：' + spot });
    var cur = String(data[rowIdx][vi] == null ? '' : data[rowIdx][vi]).split(/[,，、]/).map(function (s) { return s.trim(); }).filter(String);
    var pos = cur.indexOf(name);
    if (on && pos < 0) cur.push(name);
    if (!on && pos >= 0) cur.splice(pos, 1);
    sh.getRange(rowIdx + 1, vi + 1).setValue(cur.join(','));
    if (ti >= 0) sh.getRange(rowIdx + 1, ti + 1).setValue(cur.length); // 同步票數欄
    return json({ ok: true, spot: spot, voters: cur });
  } finally { lock.releaseLock(); }
}

// 留言板：append 一行（唔使密碼）。row = {欄名: 值}，按 tab 第一行欄名對位。
function handleAppend(body) {
  var tab = String(body.tab || ''), row = body.row || {};
  if (!tab) return json({ ok: false, error: '缺 tab' });
  var lock = LockService.getScriptLock();
  try { lock.waitLock(8000); } catch (e) { return json({ ok: false, error: '系統繁忙，請再試' }); }
  try {
    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(tab);
    if (!sh) return json({ ok: false, error: '冇 tab：' + tab });
    var header = sh.getRange(1, 1, 1, Math.max(1, sh.getLastColumn())).getValues()[0].map(function (h) { return String(h).trim(); });
    var line = header.map(function (h) { return row[h] == null ? '' : row[h]; });
    sh.appendRow(line);
    return json({ ok: true, tab: tab });
  } finally { lock.releaseLock(); }
}

// checklist 剔格：搵 keyCol==keyVal 嗰行，將 col 設做 value（唔使密碼）。col 唔存在會自動加。
function handleSetCell(body) {
  var tab = String(body.tab || ''), keyCol = String(body.keyCol || ''), keyVal = String(body.keyVal || '');
  var col = String(body.col || ''), value = body.value;
  if (!tab || !keyCol || !col) return json({ ok: false, error: '缺參數' });
  var lock = LockService.getScriptLock();
  try { lock.waitLock(8000); } catch (e) { return json({ ok: false, error: '系統繁忙，請再試' }); }
  try {
    var sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(tab);
    if (!sh) return json({ ok: false, error: '冇 tab：' + tab });
    var data = sh.getDataRange().getValues();
    var header = data[0].map(function (h) { return String(h).trim(); });
    var ki = header.indexOf(keyCol), ci = header.indexOf(col);
    if (ki < 0) return json({ ok: false, error: '冇欄：' + keyCol });
    if (ci < 0) { ci = header.length; sh.getRange(1, ci + 1).setValue(col); }
    for (var r = 1; r < data.length; r++) {
      if (String(data[r][ki]).trim() === keyVal) { sh.getRange(r + 1, ci + 1).setValue(value); return json({ ok: true }); }
    }
    return json({ ok: false, error: '搵唔到：' + keyVal });
  } finally { lock.releaseLock(); }
}

function doGet() {
  return json({ ok: true, msg: 'okinawa dashboard write endpoint alive' });
}

function json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
