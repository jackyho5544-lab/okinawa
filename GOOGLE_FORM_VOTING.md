# 21–24 景點投票 · Google Form 範本

目標：6 個人各自揀想去邊啲景點 → 回應自動數成票數 → dashboard 個 `🗳️ 投票` tab 自動排名。

---

## 步驟 1 · 開 Form
1. 去 https://forms.new （用 Jacky 個 Google account）。
2. 標題打：**沖繩 21–24 想去邊度？**
3. 說明打：**揀晒你想去嘅（可揀多個）。每人一票，幾時都可以改。**

## 步驟 2 · 加一條「Checkboxes（核取方塊）」題目
- 題目：**你想去邊啲？**
- 類型揀 **Checkboxes / 核取方塊**（重點：要可以多選）。
- 選項逐個 paste（一行一個）：

```
瀨長島
知念岬公園
玉泉洞
波上宮
西来院（達磨寺）
萬座毛
21世紀の森公園
國際通
第一牧志公設市場
扭蛋 / Calbee / 御菓子御殿
Donki / 藥妝
JAM MARKET
港川 COCOROAR CAFE
港川 Houki Boshi 可麗露
釣魚
ATV 越野車
```

> 想記得邊個投 → 再加一條「簡答」題「你個名」（揀 Jacky/CF/Tina/Marc/Shark/Adolf）。唔加都得，純數票一樣 work。

## 步驟 3 · 回應駁去你份 Google Sheet
1. Form 上面 **Responses（回應）** → 綠色 Sheets icon → **Select existing spreadsheet** → 揀返 dashboard 嗰份 Sheet。
2. 佢會新增一個 tab（通常叫 `Form Responses 1` / `表單回應 1`）。
3. 入面會有一欄叫「你想去邊啲？」，每行係一個人揀嘅選項（用逗號連住）。

## 步驟 4 · 喺 `votes` tab 自動數票
喺 dashboard 讀緊嗰個 `votes` tab，`votes` 欄改成公式（A 欄係 spot 名）。
假設回應喺 `Form Responses 1` 嘅 **B 欄**：

```
=COUNTIF('Form Responses 1'!$B:$B, "*"&A2&"*")
```

往下拉到所有 spot。咁每次有人交表，票數即刻自動加。
（如果你嘅工作表叫「表單回應 1」就改返個名落公式。）

## 步驟 5 · 放個投票掣上 dashboard
1. Form 右上 **Send → 🔗 連結** → 抄條短連結。
2. 填入 `config.js`：
```js
voteFormUrl: "https://forms.gle/xxxxxxxx",
```
3. commit + push。`🗳️ 投票` tab 右上就會出「🗳️ 投票」掣，撳到去填表。

---

## 唔想搞 Form 嘅話（更簡單）
直接喺 `votes` tab 嘅 `votes` 欄，叫大家自己 +1 都得 —— dashboard 一樣會排名。Form 只係令交票靚啲、唔使開 Sheet。
