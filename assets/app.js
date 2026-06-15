/* 沖繩 Trip Dashboard ───────────────────────────────────────
   資料來源：有 sheetId → 讀 Google Sheet (gviz JSON)；否則 data/seed.json
   Sheet 每個 tab 名要對應：itinerary / bookings / cars / members / expenses / votes / phrases
   ──────────────────────────────────────────────────────────*/
const CFG = window.OKINAWA_CONFIG || {};
const TABS = ["meta","stays","itinerary","bookings","cars","members","expenses","votes","phrases"];
let DATA = {};

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
    s.src = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:json;responseHandler:${cb}&headers=1&sheet=${encodeURIComponent(tab)}`;
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
      TABS.forEach(t => { if (!out[t] || !out[t].length) out[t] = seed[t]; }); // tab 缺就用 seed
      DATA = out; setSource("🟢 Google Sheet live"); return;
    } catch (e) { console.warn("Sheet 讀唔到，用 seed", e); }
  }
  DATA = await (await fetch("data/seed.json")).json();
  setSource(CFG.sheetId ? "🟡 seed（Sheet 讀唔到）" : "🟡 seed（未連 Sheet）");
}
function setSource(t) { const b = $("#data-source"); if (b) b.textContent = t; }

/* ---- Views ---- */
function editBar(label) {
  if (!CFG.sheetEditUrl) return "";
  return `<a class="edit-link" href="${esc(CFG.sheetEditUrl)}" target="_blank" rel="noopener">✏️ ${esc(label)}</a>`;
}

function viewItinerary() {
  const v = $("#view"); v.innerHTML = `<div class="section-bar"><h2>📅 行程</h2>${editBar("改行程")}</div>`;
  const rows = DATA.itinerary || [];
  let cur = null;
  rows.forEach(r => {
    if (r.day !== cur) {
      cur = r.day;
      v.appendChild(el("div", "day-head", `${esc(r.day)} <small>${esc(r.date)}</small>`));
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
  const v = $("#view"); v.innerHTML = `<div class="section-bar"><h2>✅ 訂位進度</h2>${editBar("改狀態")}</div>`;
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
  const v = $("#view"); v.innerHTML = `<div class="section-bar"><h2>🚗 分車 / 座位</h2>${editBar("改分車")}</div>`;
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
  const v = $("#view"); v.innerHTML = `<div class="section-bar"><h2>💰 夾數</h2>${editBar("入帳")}</div>`;
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
  const link = CFG.voteFormUrl ? `<a class="edit-link" href="${esc(CFG.voteFormUrl)}" target="_blank" rel="noopener">🗳️ 投票</a>` : editBar("改票數");
  v.innerHTML = `<div class="section-bar"><h2>🗳️ 21–24 景點投票</h2>${link}</div>`;
  v.appendChild(el("div", "hint", "3 對情侶各自投，票數高嘅優先排入 21–24。喺 Sheet 嘅 votes tab 改 votes 數字（或駁 Google Form）。"));
  const rows = (DATA.votes || []).map(r => ({ ...r, _v: parseInt(String(r.votes).replace(/[^0-9]/g, "")) || 0 })).sort((a, b) => b._v - a._v);
  const max = Math.max(1, ...rows.map(r => r._v));
  rows.forEach((r, i) => {
    const card = el("div", "vote");
    card.innerHTML =
      `<div class="rank">${r._v > 0 ? "#" + (i + 1) : "—"}</div>
       <div class="body">
         <div class="s">${esc(r.spot)}</div>
         <div class="a">${esc(r.area || "")}${r.note ? " · " + esc(r.note) : ""}</div>
         <div class="bar"><i style="width:${(r._v / max * 100).toFixed(0)}%"></i></div>
       </div>
       <div class="cnt">${r._v}</div>`;
    v.appendChild(card);
  });
}

function viewPhrases() {
  const v = $("#view"); v.innerHTML = `<div class="section-bar"><h2>🗒️ 日文用語 / 預約資料</h2></div>`;
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
  const v = $("#view"); v.innerHTML = `<div class="section-bar"><h2>🏨 住宿</h2>${editBar("改住宿")}</div>`;
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

const VIEWS = { itinerary: viewItinerary, stays: viewStays, bookings: viewBookings, cars: viewCars, expenses: viewExpenses, votes: viewVotes, phrases: viewPhrases };

function show(name) {
  document.querySelectorAll(".tab").forEach(t => t.classList.toggle("active", t.dataset.view === name));
  (VIEWS[name] || viewItinerary)();
  window.scrollTo(0, 0);
  location.hash = name;
}

document.addEventListener("DOMContentLoaded", async () => {
  document.querySelectorAll(".tab").forEach(t => t.addEventListener("click", () => show(t.dataset.view)));
  await loadData();
  const m = DATA.meta || {};
  if (m.title) $("#m-title").textContent = m.title;
  if (m.subtitle) $("#m-subtitle").textContent = m.subtitle;
  if (m.hotel) $("#m-hotel").textContent = "🏨 " + m.hotel;
  const start = (location.hash || "").replace("#", "");
  show(VIEWS[start] ? start : "itinerary");
});
