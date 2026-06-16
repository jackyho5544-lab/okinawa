/* 沖繩 Trip Dashboard ───────────────────────────────────────
   資料來源：有 sheetId → 讀 Google Sheet (gviz JSON)；否則 data/seed.json
   Sheet 每個 tab 名要對應：itinerary / bookings / cars / members / expenses / votes / phrases
   ──────────────────────────────────────────────────────────*/
const CFG = window.OKINAWA_CONFIG || {};
const TABS = ["meta","stays","itinerary","bookings","members","expenses","votes","packing","board","phrases"];
let DATA = {};
let CURRENT = "itinerary";
let EDIT = null;
// 可 in-app 編輯嘅 tab 同欄位順序（要同 Sheet 一致）
const COLUMNS = {
  itinerary: ["day","date","time","icon","title","place","address","note","booked"],
  stays: ["name","dates","address","map","checkin","checkout","note"],
  bookings: ["item","status","detail","owner","link"],
  expenses: ["date","item","payer","amount","split","note"],
  votes: ["spot","area","icon","address","note","votes","voters"],
  packing: ["item","cat","who","done"],
  board: ["time","who","msg"],
  phrases: ["title","jp","romaji","zh"]
};

/* ---- 身分（揀名，存 localStorage；冇 login）---- */
function getMe() { return localStorage.getItem("okinawa_me") || ""; }
function setMe(n) { localStorage.setItem("okinawa_me", n); renderMeChip(); }
function renderMeChip() { const c = $("#me-chip"); if (c) c.textContent = getMe() ? ("👤 " + getMe()) : "👤 揀名"; }
function pickMe() {
  const members = (DATA.members || []).map(m => m.name);
  const ov = el("div", "overlay");
  ov.innerHTML =
    `<div class="sheet"><div class="sheet-h">你係邊個？</div>
       <div class="pick-grid">${members.map(n => `<button class="pick" data-n="${esc(n)}">${esc(n)}</button>`).join("")}</div>
       <button class="pick-close">取消</button></div>`;
  ov.addEventListener("click", e => { if (e.target === ov) ov.remove(); });
  ov.querySelectorAll(".pick").forEach(b => b.addEventListener("click", () => { setMe(b.dataset.n); ov.remove(); if (CURRENT === "votes") viewVotes(); }));
  ov.querySelector(".pick-close").addEventListener("click", () => ov.remove());
  document.body.appendChild(ov);
}

const $ = (s, r = document) => r.querySelector(s);
const el = (t, c, html) => { const e = document.createElement(t); if (c) e.className = c; if (html != null) e.innerHTML = html; return e; };
const esc = s => String(s == null ? "" : s).replace(/[&<>"]/g, m => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[m]));
const mapsUrl = q => "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(q);

/* ---- Google Sheet gviz 解析（用 JSONP 繞過 CORS）---- */
function parseGviz(json) {
  const cols = json.table.cols.map(c => (c.label || "").trim());
  return json.table.rows.map(r => {
    const o = {};
    (r.c || []).forEach((cell, i) => {
      if (!cols[i]) return;
      // 優先用 formatted 值 .f（避免日期變 "Date(2026,5,18)"），否則 .v
      o[cols[i]] = !cell ? "" : (cell.f != null ? cell.f : (cell.v == null ? "" : cell.v));
    });
    return o;
  }).filter(o => Object.values(o).some(v => String(v).trim() !== ""));
}
function fetchSheetTab(sheetId, tab) {
  return new Promise((resolve, reject) => {
    const cb = "__gviz_" + Math.random().toString(36).slice(2);
    const s = document.createElement("script");
    let done = false;
    const cleanup = () => { try { delete window[cb]; } catch (_) { window[cb] = undefined; } s.remove(); };
    const timer = setTimeout(() => { if (!done) { done = true; cleanup(); reject(new Error("timeout " + tab)); } }, 12000);
    window[cb] = json => { done = true; clearTimeout(timer); cleanup(); try { resolve(parseGviz(json)); } catch (e) { reject(e); } };
    s.onerror = () => { if (!done) { done = true; clearTimeout(timer); cleanup(); reject(new Error("load fail " + tab)); } };
    // headers=1：強制第一行做欄名（全文字 tab 否則 gviz 認唔到 header）
    s.src = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json;responseHandler:${cb}&headers=1&sheet=${encodeURIComponent(tab)}&_=${Date.now()}`;
    document.head.appendChild(s);
  });
}

async function loadData() {
  if (CFG.sheetId) {
    try {
      const out = {};
      await Promise.all(TABS.filter(t => t !== "meta").map(async t => {
        try { out[t] = await fetchSheetTab(CFG.sheetId, t); } catch { out[t] = null; }
      }));
      const seed = await (await fetch("data/seed.json")).json();
      out.meta = seed.meta;
      // 只有讀唔到（null）先用 seed；空 tab 當真係空（唔好用 seed 蓋過用戶刪走嘅嘢）
      TABS.forEach(t => { if (out[t] == null) out[t] = seed[t]; });
      DATA = out; setSource("🟢 Google Sheet live"); return;
    } catch (e) { console.warn("Sheet 讀唔到，用 seed", e); }
  }
  DATA = await (await fetch("data/seed.json")).json();
  setSource(CFG.sheetId ? "🟡 seed（Sheet 讀唔到）" : "🟡 seed（未連 Sheet）");
}
function setSource(t) { const b = $("#data-source"); if (b) b.textContent = t; }

/* ---- Views ---- */
function editBar(tab) {
  if (CFG.scriptUrl && COLUMNS[tab]) return `<button class="edit-link" data-edit="${esc(tab)}">✏️ 編輯</button>`;
  if (CFG.sheetEditUrl) return `<a class="edit-link" href="${esc(CFG.sheetEditUrl)}" target="_blank" rel="noopener">✏️ 改</a>`;
  return "";
}

function viewItinerary() {
  const v = $("#view"); v.innerHTML = `<div class="section-bar"><h2>📅 行程</h2>${editBar("itinerary")}</div>`;
  const nn = nowNextCard(); if (nn) v.appendChild(nn);
  const rows = DATA.itinerary || [];
  let cur = null;
  rows.forEach(r => {
    if (r.day !== cur) {
      cur = r.day;
      v.appendChild(el("div", "day-head", `${esc(r.day)} <small>${esc(r.date)}</small> ${wxFor(r.date)}`));
    }
    const card = el("div", "card");
    const booked = String(r.booked).toUpperCase() === "Y"
      ? '<span class="pill ok">已訂</span>' : "";
    const maps = (r.address || r.place)
      ? `<a class="maps" href="${mapsUrl(r.address || r.place)}" target="_blank" rel="noopener">🗺️ 地圖</a>` : "";
    card.innerHTML =
      `<div class="row">
        <div class="time">${esc(r.time)}</div>
        <div class="ico">${esc(r.icon || "📍")}</div>
        <div class="body">
          <div class="t">${esc(r.title)} ${booked}</div>
          ${r.place ? `<div class="p">${esc(r.place)}</div>` : ""}
          ${r.note ? `<div class="n">${esc(r.note)}</div>` : ""}
          ${maps}
        </div>
      </div>`;
    v.appendChild(card);
  });
}

function viewBookings() {
  const v = $("#view"); v.innerHTML = `<div class="section-bar"><h2>✅ 訂位進度</h2>${editBar("bookings")}</div>`;
  const rows = (DATA.bookings || []).slice().sort((a, b) => (a.status === "✅" ? 1 : 0) - (b.status === "✅" ? 1 : 0));
  rows.forEach(r => {
    const card = el("div", "card");
    card.innerHTML =
      `<div class="bk">
        <div class="st">${esc(r.status || "⏳")}</div>
        <div class="body">
          <div class="t">${esc(r.item)}</div>
          ${r.detail ? `<div class="d">${esc(r.detail)}</div>` : ""}
          ${r.owner ? `<div class="o">👤 ${esc(r.owner)}</div>` : ""}
          ${r.link ? `<a class="maps" href="${esc(r.link)}" target="_blank" rel="noopener">🔗 連結</a>` : ""}
        </div>
      </div>`;
    v.appendChild(card);
  });
}

function viewCars() {
  const v = $("#view"); v.innerHTML = `<div class="section-bar"><h2>🚗 分車 / 座位</h2>${editBar("cars")}</div>`;
  v.appendChild(el("div", "hint", "20–24 共用車（建議 7 座載 6 人＋行李）。其餘車輛安排由各自負責人處理。"));
  (DATA.cars || []).forEach(r => {
    const warn = String(r.car).includes("⚠️");
    const card = el("div", "card car-card" + (warn ? " warn" : ""));
    card.innerHTML =
      `<h3>${esc(r.car)}</h3>
       <div class="car-meta">
         ${r.seats ? `<span class="chip">🪑 ${esc(r.seats)}</span>` : ""}
         ${r.vendor ? `<span class="chip">🏢 ${esc(r.vendor)}</span>` : ""}
         ${r.pickup ? `<span class="chip">取 ${esc(r.pickup)}</span>` : ""}
         ${r.dropoff ? `<span class="chip">還 ${esc(r.dropoff)}</span>` : ""}
       </div>
       ${r.members ? `<div class="p" style="font-size:13px">👥 ${esc(r.members)}</div>` : ""}
       ${r.note ? `<div class="n" style="margin-top:8px">${esc(r.note)}</div>` : ""}`;
    v.appendChild(card);
  });
}

/* 夾數：payer 畀錢、split 攤分（"all" 或逗號分隔名），自動計找數 */
function viewExpenses() {
  const v = $("#view"); v.innerHTML = `<div class="section-bar"><h2>💰 夾數</h2>${editBar("expenses")}</div>`;
  const members = (DATA.members || []).map(m => m.name);
  const exps = DATA.expenses || [];
  if (!exps.length) {
    v.appendChild(el("div", "hint", "仲未有支出記錄。喺 Sheet 嘅 expenses tab 填：date / item / payer / amount / split（all 或 用逗號分名）/ note。"));
    return;
  }
  const net = {}; members.forEach(n => net[n] = 0);
  let total = 0;
  exps.forEach(e => {
    const amt = parseFloat(String(e.amount).replace(/[^0-9.\-]/g, "")) || 0;
    total += amt;
    const split = (!e.split || String(e.split).toLowerCase() === "all")
      ? members : String(e.split).split(/[,，、]/).map(s => s.trim()).filter(Boolean);
    const share = amt / (split.length || 1);
    if (net[e.payer] != null) net[e.payer] += amt;
    split.forEach(n => { if (net[n] != null) net[n] -= share; });
  });

  const sum = el("div", "exp-summary");
  sum.innerHTML =
    `<div class="box"><b>¥${Math.round(total).toLocaleString()}</b><span>總支出</span></div>
     <div class="box"><b>¥${Math.round(total / (members.length || 1)).toLocaleString()}</b><span>人均（${members.length}人）</span></div>`;
  v.appendChild(sum);

  // 找數建議（貪心）
  const cred = members.map(n => ({ n, v: net[n] })).filter(x => x.v > 0.5).sort((a, b) => b.v - a.v);
  const debt = members.map(n => ({ n, v: -net[n] })).filter(x => x.v > 0.5).sort((a, b) => b.v - a.v);
  const settle = el("div", "settle");
  settle.innerHTML = "<div class='who' style='margin-bottom:6px'>🤝 找數建議</div>";
  let i = 0, j = 0;
  if (!cred.length) settle.innerHTML += "<div class='line'>已經平 👍</div>";
  while (i < debt.length && j < cred.length) {
    const pay = Math.min(debt[i].v, cred[j].v);
    settle.innerHTML += `<div class="line"><span>${esc(debt[i].n)} → ${esc(cred[j].n)}</span><span class="net-neg">¥${Math.round(pay).toLocaleString()}</span></div>`;
    debt[i].v -= pay; cred[j].v -= pay;
    if (debt[i].v < 0.5) i++; if (cred[j].v < 0.5) j++;
  }
  v.appendChild(settle);

  // 每人結餘
  const bal = el("div", "settle");
  bal.innerHTML = "<div class='who' style='margin-bottom:6px'>每人結餘</div>" +
    members.map(n => `<div class="line"><span>${esc(n)}</span><span class="${net[n] >= 0 ? "net-pos" : "net-neg"}">${net[n] >= 0 ? "+" : "−"}¥${Math.abs(Math.round(net[n])).toLocaleString()}</span></div>`).join("");
  v.appendChild(bal);

  // 明細
  const list = el("div", "card");
  list.innerHTML = "<div class='who' style='margin-bottom:4px'>明細</div>" +
    exps.map(e => `<div class="exp-row"><span>${esc(e.date || "")} ${esc(e.item)} <small style="color:var(--muted)">· ${esc(e.payer)} 畀</small></span><span class="amt">¥${(parseFloat(String(e.amount).replace(/[^0-9.\-]/g, "")) || 0).toLocaleString()}</span></div>`).join("");
  v.appendChild(list);
}

function viewVotes() {
  const v = $("#view");
  const me = getMe();
  v.innerHTML = `<div class="section-bar"><h2>🗳️ 21–24 景點投票</h2>${editBar("votes")}</div>`;
  if (!me) {
    const b = el("button", "add-row", "👤 先揀返「我係邊個」至投到票");
    b.addEventListener("click", pickMe);
    v.appendChild(b);
  } else {
    v.appendChild(el("div", "hint", `你係 <b>${esc(me)}</b>。撳一下景點 = 投票 / 再撳 = 收回。`));
  }
  const rows = (DATA.votes || []).map(r => {
    const voters = String(r.voters || "").split(/[,，、]/).map(s => s.trim()).filter(Boolean);
    return { ...r, _voters: voters, _n: voters.length };
  }).sort((a, b) => b._n - a._n);
  const max = Math.max(1, ...rows.map(r => r._n));
  // 投票進度
  const members = (DATA.members || []).map(m => m.name);
  if (members.length) {
    const voted = new Set(rows.flatMap(r => r._voters));
    const notYet = members.filter(n => !voted.has(n));
    v.appendChild(el("div", "vote-summary", `✅ 已投 ${members.length - notYet.length}/${members.length}` +
      (notYet.length ? ` · 未投：${notYet.map(esc).join("、")}` : " · 全部投晒 🎉")));
  }
  rows.forEach((r, i) => {
    const mine = me && r._voters.includes(me);
    const card = el("div", "vote" + (mine ? " voted" : "") + (me ? " tappable" : ""));
    const mq = r.address || r.spot;
    card.innerHTML =
      `<div class="rank">${r._n > 0 ? "#" + (i + 1) : "—"}</div>
       <div class="body">
         <div class="s"><span class="vico">${esc(r.icon || "📍")}</span>${esc(r.spot)} ${mine ? '<span class="pill ok">你投咗</span>' : ''}</div>
         <div class="a"><span class="area-chip">${esc(r.area || "—")}</span>${r.note ? " " + esc(r.note) : ""}</div>
         <div class="bar"><i style="width:${(r._n / max * 100).toFixed(0)}%"></i></div>
         ${r._voters.length ? `<div class="voters">${r._voters.map(n => `<span class="vchip${n === me ? " me" : ""}">${esc(n)}</span>`).join("")}</div>` : ""}
         <a class="maps vote-map" href="${mapsUrl(mq)}" target="_blank" rel="noopener">🗺️ 地圖</a>
       </div>
       <div class="cnt">${r._n}</div>`;
    if (me) card.addEventListener("click", e => { if (e.target.closest("a")) return; toggleVote(r.spot, !mine); });
    v.appendChild(card);
  });
}
async function toggleVote(spot, on) {
  const me = getMe(); if (!me) return pickMe();
  if (!CFG.scriptUrl) { alert("仲未開通寫入（config.js 嘅 scriptUrl 未填，見 APPS_SCRIPT_SETUP.md）"); return; }
  const row = (DATA.votes || []).find(r => r.spot === spot);
  if (row) {
    let voters = String(row.voters || "").split(/[,，、]/).map(s => s.trim()).filter(Boolean);
    const pos = voters.indexOf(me);
    if (on && pos < 0) voters.push(me);
    if (!on && pos >= 0) voters.splice(pos, 1);
    row.voters = voters.join(","); row.votes = voters.length;
  }
  viewVotes(); // 樂觀更新，即刻見到
  try {
    await fetch(CFG.scriptUrl, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ action: "vote", spot, name: me, on }) });
  } catch (_) { /* 寫入通常已成功；gviz 約 1–2 分鐘同步 */ }
}

function viewPhrases() {
  const v = $("#view"); v.innerHTML = `<div class="section-bar"><h2>🗒️ 日文用語 / 預約資料</h2>${editBar("phrases")}</div>`;
  (DATA.phrases || []).forEach(r => {
    const card = el("div", "phrase");
    card.innerHTML =
      `<div class="t">${esc(r.title)}</div>
       <div class="jp">${esc(r.jp)}</div>
       ${r.romaji ? `<div class="rj">${esc(r.romaji)}</div>` : ""}
       ${r.zh ? `<div class="zh">${esc(r.zh)}</div>` : ""}
       <button class="copy">📋 複製日文</button>`;
    card.querySelector(".copy").addEventListener("click", e => {
      navigator.clipboard?.writeText(r.jp); e.target.textContent = "✅ 已複製"; setTimeout(() => e.target.textContent = "📋 複製日文", 1500);
    });
    v.appendChild(card);
  });
}

function viewStays() {
  const v = $("#view"); v.innerHTML = `<div class="section-bar"><h2>🏨 住宿</h2>${editBar("stays")}</div>`;
  (DATA.stays || []).forEach(r => {
    const warn = String(r.note).includes("⚠️");
    const map = r.map
      ? `<a class="maps" href="${esc(r.map)}" target="_blank" rel="noopener">🗺️ 地圖</a>`
      : (r.address ? `<a class="maps" href="${mapsUrl(r.address)}" target="_blank" rel="noopener">🗺️ 地圖</a>` : "");
    const card = el("div", "card car-card" + (warn ? " warn" : ""));
    card.innerHTML =
      `<div class="row">
        <div class="ico">🏨</div>
        <div class="body">
          <div class="t">${esc(r.name)} <span class="pill wait">${esc(r.dates)}</span></div>
          ${r.address ? `<div class="p">${esc(r.address)}</div>` : ""}
          <div class="n">🛎️ 入住 ${esc(r.checkin || "-")} ／ 退房 ${esc(r.checkout || "-")}</div>
          ${r.note ? `<div class="n" style="border-left-color:var(--gold)">${esc(r.note)}</div>` : ""}
          ${map}
        </div>
      </div>`;
    v.appendChild(card);
  });
}

/* ---- In-app 編輯（經 Apps Script 寫返去 Sheet）---- */
function startEdit(tab) {
  if (!CFG.scriptUrl) { alert("未設定 scriptUrl：去 config.js 填 Apps Script 嘅 /exec URL（教學見 APPS_SCRIPT_SETUP.md）"); return; }
  if (!COLUMNS[tab]) return;
  EDIT = { tab, rows: (DATA[tab] || []).map(r => ({ ...r })) };
  renderEditor();
}
function blankRow(tab, cols, ref) {
  const o = {}; cols.forEach(c => o[c] = "");
  if (tab === "expenses") { o.payer = getMe(); o.split = "all"; const d = new Date(); o.date = (d.getMonth() + 1) + "/" + d.getDate(); }
  if (tab === "itinerary" && ref) { o.day = ref.day || ""; o.date = ref.date || ""; } // 帶埋上一行嘅日子，插中間更順
  return o;
}
function renderEditor() {
  const tab = EDIT.tab, cols = COLUMNS[tab];
  const long = { note: 1, detail: 1, jp: 1, address: 1 };
  const v = $("#view");
  v.innerHTML =
    `<div class="section-bar"><h2>✏️ 改緊：${esc(tab)}</h2>
       <span class="ed-actions"><button class="edit-link" id="ed-save">💾 儲存</button><button class="edit-link gray" id="ed-cancel">取消</button></span>
     </div>
     <div class="hint">改完撳「儲存」會一次過寫返去大家共享嘅 Sheet（Sheet 同步約 1–2 分鐘）。</div>`;
  EDIT.rows.forEach((row, idx) => {
    const card = el("div", "card edit-card");
    card.innerHTML =
      `<div class="erow-head"><b>#${idx + 1}</b>
        <span class="erow-btns">
          <button class="row-btn" data-act="up" data-i="${idx}" title="上移">↑</button>
          <button class="row-btn" data-act="down" data-i="${idx}" title="下移">↓</button>
          <button class="row-btn ins" data-act="ins" data-i="${idx}">＋ 下面插一行</button>
          <button class="row-btn del" data-act="del" data-i="${idx}">🗑️</button>
        </span></div>` +
      cols.map(c => long[c]
        ? `<label class="efield"><span>${esc(c)}</span><textarea data-i="${idx}" data-c="${esc(c)}" rows="2">${esc(row[c] || "")}</textarea></label>`
        : `<label class="efield"><span>${esc(c)}</span><input data-i="${idx}" data-c="${esc(c)}" value="${esc(row[c] || "")}"></label>`).join("");
    v.appendChild(card);
  });
  const add = el("button", "add-row", "＋ 喺最底加一行");
  v.appendChild(add);
  v.querySelectorAll("[data-c]").forEach(inp => inp.addEventListener("input", e => {
    EDIT.rows[+e.target.dataset.i][e.target.dataset.c] = e.target.value;
  }));
  v.querySelectorAll("[data-act]").forEach(b => b.addEventListener("click", e => {
    const i = +e.currentTarget.dataset.i, act = e.currentTarget.dataset.act, rows = EDIT.rows;
    if (act === "del") rows.splice(i, 1);
    else if (act === "up" && i > 0) { const t = rows[i - 1]; rows[i - 1] = rows[i]; rows[i] = t; }
    else if (act === "down" && i < rows.length - 1) { const t = rows[i + 1]; rows[i + 1] = rows[i]; rows[i] = t; }
    else if (act === "ins") rows.splice(i + 1, 0, blankRow(tab, cols, rows[i]));
    else return;
    renderEditor();
  }));
  add.addEventListener("click", () => { EDIT.rows.push(blankRow(tab, cols, EDIT.rows[EDIT.rows.length - 1])); renderEditor(); });
  $("#ed-cancel").addEventListener("click", () => { const t = EDIT.tab; EDIT = null; show(t); });
  $("#ed-save").addEventListener("click", saveEdit);
}
async function saveEdit() {
  const tab = EDIT.tab, cols = COLUMNS[tab];
  const token = getToken(); if (token == null) return;
  const btn = $("#ed-save"); btn.textContent = "儲存緊…"; btn.disabled = true;
  const payload = JSON.stringify({ token, tab, columns: cols, rows: EDIT.rows });
  let result = null;
  try {
    const res = await fetch(CFG.scriptUrl, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: payload });
    try { result = await res.json(); } catch (_) { /* CORS 可能讀唔到 body，但寫入通常已成功 */ }
  } catch (_) { /* 同上 */ }
  if (result && result.ok === false) {
    if (/密碼|token/i.test(result.error || "")) localStorage.removeItem("okinawa_token");
    alert("儲存失敗：" + (result.error || "未知")); btn.textContent = "💾 儲存"; btn.disabled = false; return;
  }
  DATA[tab] = EDIT.rows.map(r => ({ ...r })); // 樂觀更新，即刻見到
  EDIT = null; show(tab);
  toast(result && result.ok ? "✅ 已儲存" : "✅ 已送出（Sheet 約 1–2 分鐘同步）");
}
function getToken() {
  let t = localStorage.getItem("okinawa_token");
  if (!t) { const x = prompt("輸入編輯密碼（問 Jacky）："); if (x == null || x.trim() === "") return null; t = x.trim(); localStorage.setItem("okinawa_token", t); }
  return t;
}
function toast(msg) {
  const d = el("div", "toast", esc(msg)); document.body.appendChild(d);
  requestAnimationFrame(() => d.classList.add("show"));
  setTimeout(() => { d.classList.remove("show"); setTimeout(() => d.remove(), 300); }, 2600);
}

/* ---- 🧳 執嘢 checklist（一撳剔，免密碼）---- */
function viewPacking() {
  const v = $("#view"); v.innerHTML = `<div class="section-bar"><h2>🧳 執嘢 checklist</h2>${editBar("packing")}</div>`;
  const rows = DATA.packing || [];
  const done = rows.filter(r => String(r.done).trim()).length;
  v.appendChild(el("div", "vote-summary", `已搞掂 ${done}/${rows.length}`));
  let curCat = null;
  rows.forEach(r => {
    if (r.cat !== curCat) { curCat = r.cat; v.appendChild(el("div", "day-head", esc(r.cat || "其他"))); }
    const isDone = !!String(r.done).trim();
    const card = el("div", "card pk" + (isDone ? " pk-done" : ""));
    card.innerHTML =
      `<div class="pk-row"><span class="pk-box">${isDone ? "✅" : "⬜"}</span>
        <span class="pk-item">${esc(r.item)}</span>${isDone ? `<span class="vchip">${esc(r.done)}</span>` : ""}</div>`;
    card.addEventListener("click", () => togglePack(r.item, !isDone));
    v.appendChild(card);
  });
}
async function togglePack(item, on) {
  if (!CFG.scriptUrl) { alert("未開通寫入（見 APPS_SCRIPT_SETUP.md）"); return; }
  const me = getMe(), row = (DATA.packing || []).find(r => r.item === item);
  const prev = row ? row.done : "";
  if (row) row.done = on ? (me || "✓") : "";
  viewPacking();
  try {
    const res = await fetch(CFG.scriptUrl, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ action: "setcell", tab: "packing", keyCol: "item", keyVal: item, col: "done", value: on ? (me || "✓") : "" }) });
    const j = await res.json();
    if (!j.ok) throw new Error(j.error || "未知");
  } catch (e) {
    if (row) row.done = prev; viewPacking();
    alert("儲存失敗：" + (e.message || e) + "\n（多數係 Apps Script 未 redeploy 新版本，或未建 packing tab）");
  }
}

/* ---- 💬 留言板（append，免密碼）---- */
function viewBoard() {
  const v = $("#view"); v.innerHTML = `<div class="section-bar"><h2>💬 留言板</h2></div>`;
  const me = getMe();
  const box = el("div", "board-box");
  box.innerHTML = `<textarea id="bd-msg" rows="2" placeholder="${me ? "以 " + esc(me) + " 留言…" : "留言…（建議右上揀返名）"}"></textarea><button class="edit-link" id="bd-send">送出</button>`;
  v.appendChild(box);
  $("#bd-send").addEventListener("click", postBoard);
  (DATA.board || []).slice().reverse().forEach(r => {
    const card = el("div", "card bd");
    card.innerHTML = `<div class="bd-h"><b>${esc(r.who || "匿名")}</b><span>${esc(r.time || "")}</span></div><div class="bd-m">${esc(r.msg)}</div>`;
    v.appendChild(card);
  });
}
async function postBoard() {
  const ta = $("#bd-msg"), msg = (ta.value || "").trim();
  if (!msg) return;
  if (!CFG.scriptUrl) { alert("未開通寫入（見 APPS_SCRIPT_SETUP.md）"); return; }
  const me = getMe() || "匿名", now = new Date();
  const time = `${now.getMonth() + 1}/${now.getDate()} ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const row = { time, who: me, msg };
  const btn = $("#bd-send"); if (btn) { btn.disabled = true; btn.textContent = "送緊…"; }
  try {
    const res = await fetch(CFG.scriptUrl, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify({ action: "append", tab: "board", row }) });
    const j = await res.json();
    if (!j.ok) throw new Error(j.error || "未知");
    (DATA.board = DATA.board || []).push(row);
    ta.value = ""; viewBoard();
  } catch (e) {
    alert("留言失敗：" + (e.message || e) + "\n（多數係 Apps Script 未 redeploy 新版本，或未建 board tab）");
    const b = $("#bd-send"); if (b) { b.disabled = false; b.textContent = "送出"; }
  }
}

/* ---- 🌤️ 天氣（Open-Meteo，免 key、CORS OK）---- */
let WX = null;
const wxEmoji = c => c === 0 ? "☀️" : c <= 2 ? "🌤️" : c === 3 ? "☁️" : (c >= 45 && c <= 48) ? "🌫️" : (c >= 51 && c <= 67) ? "🌦️" : (c >= 71 && c <= 77) ? "❄️" : (c >= 80 && c <= 82) ? "🌧️" : c >= 95 ? "⛈️" : "🌥️";
async function loadWeather() {
  try {
    const u = "https://api.open-meteo.com/v1/forecast?latitude=26.21&longitude=127.68&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max&timezone=Asia%2FTokyo&start_date=2026-06-17&end_date=2026-06-24";
    const d = (await (await fetch(u)).json()).daily; if (!d) return;
    WX = {}; d.time.forEach((t, i) => { WX[t] = { c: d.weather_code[i], hi: Math.round(d.temperature_2m_max[i]), lo: Math.round(d.temperature_2m_min[i]), p: d.precipitation_probability_max[i] }; });
  } catch (_) { WX = null; }
}
function wxFor(dateStr) {
  if (!WX) return "";
  const m = String(dateStr).match(/(\d{4})-(\d{2})-(\d{2})/); if (!m) return "";
  const w = WX[`${m[1]}-${m[2]}-${m[3]}`]; if (!w) return "";
  return `<span class="wx">${wxEmoji(w.c)} ${w.hi}°/${w.lo}° ☔${w.p}%</span>`;
}

/* ---- 🎯 而家 / 下一個 + 倒數 ---- */
function itinWhen(r) {
  const dm = String(r.date).match(/(\d{4})-(\d{2})-(\d{2})/); if (!dm) return null;
  let h = 9, mi = 0; const tm = String(r.time).match(/(\d{1,2}):(\d{2})/);
  if (tm) { h = +tm[1]; mi = +tm[2]; } else if (/下午|傍晚/.test(r.time)) h = 14;
  return new Date(+dm[1], +dm[2] - 1, +dm[3], h, mi);
}
function nowNextCard() {
  const items = (DATA.itinerary || []).map(r => ({ r, t: itinWhen(r) })).filter(x => x.t).sort((a, b) => a.t - b.t);
  if (!items.length) return null;
  const now = new Date(), first = items[0].t, last = items[items.length - 1].t, card = el("div", "nn");
  if (now < first) {
    const start = new Date(first.getFullYear(), first.getMonth(), first.getDate());
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const days = Math.round((start - today) / 86400000); // 用日曆日計
    card.innerHTML = (days <= 0 ? `<div class="nn-big">🎒 今日出發！</div>` : `<div class="nn-big">🚀 仲有 ${days} 日出發！</div>`)
      + `<div class="nn-sub">第一站：${esc(items[0].r.title)}</div>`;
  } else if (now > last) {
    card.innerHTML = `<div class="nn-big">🎉 旅程完滿！</div>`;
  } else {
    const next = items.find(x => x.t >= now) || items[items.length - 1];
    const mins = Math.max(0, Math.round((next.t - now) / 60000));
    const when = mins < 60 ? `${mins} 分鐘後` : `${Math.floor(mins / 60)} 小時 ${mins % 60} 分後`;
    const mq = next.r.address || next.r.place || next.r.title;
    card.innerHTML = `<div class="nn-lbl">⏰ 下一個（${when}）</div><div class="nn-big">${esc(next.r.icon || "📍")} ${esc(next.r.title)}</div><div class="nn-sub">${esc(next.r.time)} · ${esc(next.r.place || "")} <a href="${mapsUrl(mq)}" target="_blank" rel="noopener">🗺️ 地圖</a></div>`;
  }
  return card;
}

const VIEWS = { itinerary: viewItinerary, stays: viewStays, bookings: viewBookings, expenses: viewExpenses, votes: viewVotes, packing: viewPacking, board: viewBoard, phrases: viewPhrases };

function show(name) {
  CURRENT = name;
  document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t.dataset.view === name));
  (VIEWS[name] || viewItinerary)();
  window.scrollTo(0, 0);
  location.hash = name;
}

document.addEventListener("DOMContentLoaded", async () => {
  document.querySelectorAll(".tab").forEach(t => t.addEventListener("click", () => show(t.dataset.view)));
  document.addEventListener("click", e => { const b = e.target.closest("[data-edit]"); if (b) startEdit(b.dataset.edit); });
  await loadData();
  renderMeChip();
  const mc = $("#me-chip"); if (mc) mc.addEventListener("click", pickMe);
  loadWeather().then(() => { if (CURRENT === "itinerary") viewItinerary(); }); // 天氣到就補上
  const m = DATA.meta || {};
  if (m.title) $("#m-title").textContent = m.title;
  if (m.subtitle) $("#m-subtitle").textContent = m.subtitle;
  if (m.hotel) $("#m-hotel").textContent = "🏨 " + m.hotel;
  const start = (location.hash || "").replace("#", "");
  show(VIEWS[start] ? start : "itinerary");
});
