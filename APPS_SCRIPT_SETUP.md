# App 內直接編輯 · Apps Script 部署教學

裝完之後，dashboard 每個 tab 右上會有「**✏️ 編輯**」掣 → app 入面改/加/刪 → 撳「💾 儲存」就寫返去大家共享嘅 Sheet。唔使 server、唔使收費。

---

## 1. 開 Apps Script（綁住你份 Sheet）
1. 開你份 Google Sheet。
2. 頂部 **擴充功能 (Extensions) → Apps Script**。
3. 將 `apps-script/Code.gs` 入面**全部內容** copy，覆蓋編輯器預設嘅 `myFunction(){}`。
4. 改 `EDIT_TOKEN`：
   ```js
   var EDIT_TOKEN = '你自己嘅密碼';   // 例如 okinawa2026
   ```
   呢個密碼只存喺呢度（唔會入 GitHub）。編輯時 app 會問一次。
5. 💾 儲存（Ctrl+S）。

## 2. 部署成 Web App
1. 右上 **部署 (Deploy) → 新增部署 (New deployment)**。
2. 類型（齒輪）揀 **網頁應用程式 (Web app)**。
3. 設定：
   - **執行身分 (Execute as)**：`我 (你自己)`
   - **誰可以存取 (Who has access)**：`任何人 (Anyone)`  ← 一定要揀呢個，app 先 POST 到
4. **部署** → 第一次會叫你授權（Authorize）→ 揀你個 Google 帳號 → 「進階 → 前往（不安全）」→ 允許。（因為係你自己寫嘅 script，安全。）
5. copy 個 **Web app URL**，樣似：
   ```
   https://script.google.com/macros/s/AKfy.....xxxx/exec
   ```

## 3. 填入 config.js
```js
window.OKINAWA_CONFIG = {
  ...
  scriptUrl: "https://script.google.com/macros/s/AKfy...xxxx/exec",
};
```
`git add -A && git commit -m "enable in-app edit" && git push`。

## 4. 用法
- 入任何 tab → 右上「✏️ 編輯」→ 改格仔 / ＋加一行 / 🗑️刪行 → 「💾 儲存」。
- 第一次儲存會問**編輯密碼**（即 `EDIT_TOKEN`），答啱之後記住喺嗰部機，唔使再問。
- 改完 app 即刻見到（樂觀更新）；Sheet 同步約 1–2 分鐘（gviz cache）。

## ⚠️ 注意
- **權限**：知道個 /exec URL ＋ 密碼先改得到。想收返權就喺 Apps Script 改 `EDIT_TOKEN` 再**重新部署**（管理部署 → 編輯 → 新版本）。
- **同時改**：兩個人同時改同一個 tab，後 save 嗰個會蓋過前一個（成張表覆寫）。人少問題不大；緊要嘢 save 前 refresh 一下。
- 改完 `EDIT_TOKEN` 一定要**重新部署新版本**先生效。
