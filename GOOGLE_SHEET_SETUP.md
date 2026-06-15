# 連 Google Sheet 教學

個網會用 Google 嘅 **gviz** 介面讀 Sheet（免 API key），所以只要份 Sheet「知道連結就睇到」就得。

## 1. 開一份 Google Sheet
建議直接複製呢個結構：每個 **tab（工作表）名** 要同下面一樣（英文細階），**第一行 = 欄名**。

### tab：`itinerary`（行程）
| day | date | time | icon | title | place | address | note | booked |
|-----|------|------|------|-------|-------|---------|------|--------|
| Day 1 | 2026-06-17 (三) | 20:00 | 🍽️ | 築地青空三代目 | 那覇 | 那覇市 | 已訂 8pm | Y |

- `address` 有嘢就會出「🗺️ 地圖」掣；`booked` 填 `Y` 會出「已訂」標籤。

### tab：`stays`（住宿）
| name | dates | address | map | checkin | checkout | note |
|------|-------|---------|-----|---------|----------|------|
| 名護 Nago | 18/6 → 20/6 | 1174-5 Biimata... | https://maps.app.goo.gl/... | 16:00 | 11:00 | |

- `map` 留空就會用 `address` 自動開 Google Maps。

### tab：`bookings`（訂位）
| item | status | detail | owner | link |
|------|--------|--------|-------|------|
| 第二架車 20–24 | ⏳ | 6 人要 7 座 | Jacky | |

- `status` 填 `✅` 或 `⏳`（✅ 會自動排去最底）。

### tab：`cars`（分車）
| car | seats | vendor | pickup | dropoff | members | note |
|-----|-------|--------|--------|---------|---------|------|

### tab：`members`（成員，夾數同分車用）
| name | couple | color |
|------|--------|-------|
| Jacky | A | #e8635a |

### tab：`expenses`（夾數）
| date | item | payer | amount | split | note |
|------|------|-------|--------|-------|------|
| 6/18 | 油錢 | Jacky | 4000 | all | |
| 6/19 | 船 | Amy | 16000 | Amy,Ben | 釣魚 |

- `payer` / `split` 要用 `members` 裏面嘅 `name`。
- `split` 填 `all` = 6 人分；或用逗號列邊幾個分。個網會自動計人均同找數。

### tab：`votes`（投票）
| spot | area | votes | note | voters |
|------|------|-------|------|--------|
| 瀨長島 | 南部 | 2 | Umikaji Terrace | Marc,Tina |

- **逐人投票**：app 入面揀返「我係邊個」之後，撳景點就會將你個名加入 `voters`，`votes` 數字＝投票人數（自動同步）。
- `voters` 欄**唔使自己加**：第一次有人投票時，Apps Script 會自動建立。
- 需要部署咗 Apps Script（見 `APPS_SCRIPT_SETUP.md`）先投到票。

### tab：`phrases`（用語）
| title | jp | romaji | zh |
|-------|----|----|----|

## 2. 公開份 Sheet
**File → Share → General access → 改成「Anyone with the link · Viewer」**
（gviz 需要「可檢視」；如果唔 work 就再用 **File → Share → Publish to web**。）

## 3. 抄 Sheet ID 入 `config.js`
連結中間嗰段就係 ID：
```
https://docs.google.com/spreadsheets/d/【1AbC...xyz 呢段】/edit
```
填入：
```js
window.OKINAWA_CONFIG = {
  sheetId: "1AbC...xyz",
  sheetEditUrl: "https://docs.google.com/spreadsheets/d/1AbC...xyz/edit",
  voteFormUrl: "",      // 可選：Google Form 投票
  expenseFormUrl: ""    // 可選：Google Form 入帳
};
```
commit + push → 個網自動轉用 live 資料（右上角 badge 會變 🟢）。

## 4.（可選）用 Google Form 收投票 / 夾數
1. 開 Google Form，回應存去同一份 Sheet。
2. 表單連結填入 `voteFormUrl` / `expenseFormUrl`，個 tab 上面就會出投票 / 入帳掣。
3. 注意：Form 回應 tab 嘅欄名要對得返上面（或自己加一條公式整理去 `votes`/`expenses` tab）。

## 疑難
- **個網仲係 🟡 seed**：份 Sheet 未公開，或者 `sheetId` 錯，或者 tab 名串錯。
- **某個 tab 空咗**：個網會自動 fallback 返該 tab 嘅 seed 資料，唔會爆。
- gviz 有 cache，改完 Sheet 約幾分鐘先反映。
