# 開 Live（連 Google Sheet）· 最短版

> 個網逐個 tab fallback：你**淨係要整想大家改嘅 tab**，其餘自動用 seed。
> 建議至少整：`expenses`（夾數）、`votes`（投票）、`bookings`（訂位）。

## 1. 開一份 Google Sheet
去 https://sheets.new （用 Jacky 個 account），改個名「沖繩 2026」。

## 2. 逐個 tab 貼資料
每個你想 live 嘅 tab：
1. Sheet 底部 **+** 開新工作表，**改名** = `expenses`（或 `votes`/`bookings`…，要英文細階、串到一模一樣）。
2. 開 repo 入面 `sheet-data/<tab>.tsv`（GitHub 上撳「Raw」或本機開），**全選 copy**。
3. 返 Sheet 撳 **A1**，**Ctrl+V** 貼上 → 自動入晒格（TSV 會自動分欄）。

> 想 7 個 tab 全部 live 就照做晒：itinerary / bookings / cars / members / expenses / votes / phrases。

## 3. 公開份 Sheet（要可檢視）
右上 **Share → General access → Anyone with the link → Viewer**。
（如果之後個網讀唔到，再用 File → Share → **Publish to web**。）

## 4. 抄個 Sheet ID
連結中間嗰段：
```
https://docs.google.com/spreadsheets/d/【呢段就係 ID】/edit
```

## 5. 填入 config.js → push
```js
window.OKINAWA_CONFIG = {
  sheetId: "貼你個 ID",
  sheetEditUrl: "https://docs.google.com/spreadsheets/d/你個ID/edit",
  voteFormUrl: "",
  expenseFormUrl: ""
};
```
然後 `git add -A && git commit -m "go live" && git push`。
右上角 badge 變 🟢 = 成功讀緊 live Sheet。

---
**或者**：你開好 Sheet、設成可檢視之後，**直接將個 ID（或條連結）send 畀我**，我幫你填 config.js + push。
