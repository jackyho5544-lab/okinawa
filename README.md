# 沖繩自駕 2026 · 6 人行 Dashboard

手機優先嘅旅行 dashboard，畀 3 對情侶旅行時一齊睇 / 改。
**靜態網站（GitHub Pages）＋ Google Sheet 做可改資料層** 嘅 hybrid：

- 連咗 Google Sheet → 大家改 Sheet，個網自動更新（唔使識 git）。
- 未連 → 用 `data/seed.json`（memo 內容）做 fallback，打開即有嘢睇。

## 功能
- 📅 **行程** — 逐日卡片、一撳開 Google Maps
- ✅ **訂位** — to-do 即時狀態（✅/⏳）
- 🚗 **分車** — 20–24 共用車安排（私人租車細節唔會喺度公開）
- 💰 **夾數** — 入支出自動計人均 + 找數建議
- 🗳️ **投票** — 3 對情侶投 21–24 候選景點，自動排名（Form 範本見 [`GOOGLE_FORM_VOTING.md`](GOOGLE_FORM_VOTING.md)）
- 🗒️ **用語** — 日文短句 / 船家 / 預約資料，一撳複製
- ✏️ **App 內編輯** — 每個 tab 改/加/刪，密碼閘住，儲存即寫返共享 Sheet（需部署 Apps Script，見 [`APPS_SCRIPT_SETUP.md`](APPS_SCRIPT_SETUP.md)）

## 點上線（GitHub Pages）
1. push 上 `jackyho5544-lab/okinawa`（見下面指令）。
2. repo → **Settings → Pages → Source: Deploy from a branch → `main` / `/root`** → Save。
3. 一兩分鐘後個網喺 `https://jackyho5544-lab.github.io/okinawa/`。

## 連 Google Sheet（可改資料）
睇 [`GOOGLE_SHEET_SETUP.md`](GOOGLE_SHEET_SETUP.md)。簡單講：
1. 用嗰份 Sheet template 開個 Google Sheet（tab 名同 `seed.json` 一樣）。
2. **File → Share → Publish to web**（或設成「知道連結可檢視」）。
3. 抄 Sheet ID 填入 `config.js` 嘅 `sheetId`，順手填 `sheetEditUrl`。
4. commit + push → 搞掂。

## 本地預覽
```bash
# 任揀一個
python -m http.server 8080
npx serve .
```
開 `http://localhost:8080`。（要本機 server，因為會 fetch `data/seed.json`，直接 file:// 開唔到。）

## 檔案結構
```
index.html              入口
config.js               Sheet ID / 編輯連結設定
assets/style.css        樣式（手機優先）
assets/app.js           載資料 + 渲染 + 夾數計算
data/seed.json          fallback 資料（memo）
manifest.webmanifest    PWA（可加到主畫面）
GOOGLE_SHEET_SETUP.md   Sheet 欄位教學
```
