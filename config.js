// ───────────────────────────────────────────────────────────
//  沖繩 Trip Dashboard — 設定檔
//  連 Google Sheet：填入 sheetId 就會讀 live 資料；
//  留空白就用 data/seed.json（memo 內容）做 fallback。
//  Sheet 設定教學睇 GOOGLE_SHEET_SETUP.md
// ───────────────────────────────────────────────────────────
window.OKINAWA_CONFIG = {
  // 例：https://docs.google.com/spreadsheets/d/【呢段就係 sheetId】/edit
  sheetId: "1W9ap4IFaOAIl6XF4ac4AlSddfz-VhoQKj2EwUvsFU0o",

  // 改行程 / 夾數 / 投票 嘅 Google Sheet 連結（畀朋友撳去改）
  sheetEditUrl: "https://docs.google.com/spreadsheets/d/1W9ap4IFaOAIl6XF4ac4AlSddfz-VhoQKj2EwUvsFU0o/edit",

  // App 內直接編輯（寫返去 Sheet）的 Apps Script Web App /exec URL
  // 部署教學見 APPS_SCRIPT_SETUP.md。填咗之後，每個 tab 會出「✏️ 編輯」掣。
  scriptUrl: "https://script.google.com/macros/s/AKfycbyl28SNLXVNbOTbV9adqTG5N60YCduVu6OSuKyKs742GONXxcHjL-jlr6p9t_LNpfO9/exec",

  // 投票用嘅 Google Form 連結（可選）
  voteFormUrl: "",

  // 夾數入帳用嘅 Google Form 連結（可選）
  expenseFormUrl: ""
};
