import { auth, db, fb } from "./firebase.js";

/* SW */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js"));
}

/* DOM */
const $ = (id) => document.getElementById(id);
const show = (el) => el.classList.remove("hidden");
const hide = (el) => el.classList.add("hidden");

/* Sites */
const SITES = [
  { key:"trendyol", name:"Trendyol", base:"https://www.trendyol.com/sr?q=" },
  { key:"hepsiburada", name:"Hepsiburada", base:"https://www.hepsiburada.com/ara?q=" },
  { key:"n11", name:"N11", base:"https://www.n11.com/arama?q=" },
  { key:"amazontr", name:"Amazon TR", base:"https://www.amazon.com.tr/s?k=" },
  { key:"pazarama", name:"Pazarama", base:"https://www.pazarama.com/arama?q=" },
  { key:"ciceksepeti", name:"ÇiçekSepeti", base:"https://www.ciceksepeti.com/arama?query=" },
  { key:"idefix", name:"İdefix", base:"https://www.idefix.com/search?q=" }
];

let selectedSites = new Set(SITES.map(s=>s.key));
let currentUser = null;

/* Toast */
function toast(text){
  let t = document.getElementById("toast");
  if (!t){
    t = document.createElement("div");
    t.id = "toast";
    t.style.position = "fixed";
    t.style.left = "50%";
    t.style.bottom = "18px";
    t.style.transform = "translateX(-50%)";
    t.style.zIndex = "2500";
    t.style.padding = "12px 14px";
    t.style.borderRadius = "14px";
    t.style.border = "1px solid #e5e7eb";
    t.style.background = "#fff";
    t.style.boxShadow = "0 14px 45px rgba(0,0,0,.18)";
    t.style.fontWeight = "900";
    t.style.maxWidth = "92vw";
    t.style.display = "none";
    document.body.appendChild(t);
  }
  t.textContent = text;
  t.style.display = "block";
  clearTimeout(window.__toastTimer);
  window.__toastTimer = setTimeout(()=> t.style.display="none", 3200);
}

/* Auth message */
function authMsg(text, kind="info"){
  const box = $("authMsg");
  box.textContent = text;
  if (kind === "error"){
    box.style.background = "#ffecec";
    box.style.borderColor = "#ffd0d0";
    box.style.color = "#a01616";
  } else {
    box.style.background = "#f1f5f9";
    box.style.borderColor = "#e5e7eb";
    box.style.color = "#0f172a";
  }
  show(box);
}

function togglePw(inputId){
  const el = $(inputId);
  el.type = el.type === "password" ? "text" : "password";
}

/* Auth UI */
$("toggleInPass").onclick = () => togglePw("inPass");
$("toggleUpPass").onclick = () => togglePw("upPass");
$("toggleUpPass2").onclick = () => togglePw("upPass2");

$("tabSignIn").onclick = () => {
  $("tabSignIn").classList.add("active");
  $("tabSignUp").classList.remove("active");
  show($("panelSignIn")); hide($("panelSignUp"));
  hide($("authMsg"));
};

$("tabSignUp").onclick = () => {
  $("tabSignUp").classList.add("active");
  $("tabSignIn").classList.remove("active");
  show($("panelSignUp")); hide($("panelSignIn"));
  hide($("authMsg"));
};

$("btnSignUp").onclick = async () => {
  hide($("authMsg"));
  const email = $("upEmail").value.trim();
  const pass = $("upPass").value.trim();
  const pass2 = $("upPass2").value.trim();
  if (!email || !pass) return authMsg("Email ve şifre boş olamaz.", "error");
  if (pass.length < 6) return authMsg("Şifre en az 6 karakter olmalı.", "error");
  if (pass !== pass2) return authMsg("Şifreler eşleşmiyor.", "error");

  try{
    const cred = await fb.createUserWithEmailAndPassword(auth, email, pass);
    await fb.sendEmailVerification(cred.user);
    await ensureUserDoc(cred.user.uid, cred.user.email);
    authMsg("Kayıt tamam! Doğrulama maili gönderildi. Maili onayla, sonra giriş yap.", "info");
    await fb.signOut(auth);
  }catch(e){
    authMsg("Kayıt hatası: " + e.message, "error");
  }
};

$("btnSignIn").onclick = async () => {
  hide($("authMsg"));
  const email = $("inEmail").value.trim();
  const pass = $("inPass").value.trim();
  if (!email || !pass) return authMsg("Email ve şifre boş olamaz.", "error");
  try{
    const cred = await fb.signInWithEmailAndPassword(auth, email, pass);
    if (!cred.user.emailVerified){
      authMsg("Email doğrulanmamış. Mailini onayla. İstersen doğrulama mailini tekrar gönder.", "error");
      await fb.signOut(auth);
      return;
    }
  }catch(e){
    authMsg("Giriş hatası: " + e.message, "error");
  }
};

$("btnResendVerify").onclick = async () => {
  try{
    const email = $("inEmail").value.trim();
    const pass = $("inPass").value.trim();
    if (!email || !pass) return authMsg("Önce email+şifre gir.", "error");
    const cred = await fb.signInWithEmailAndPassword(auth, email, pass);
    await fb.sendEmailVerification(cred.user);
    authMsg("Doğrulama maili tekrar gönderildi. Maili onaylayınca giriş yap.", "info");
    await fb.signOut(auth);
  }catch(e){
    authMsg("Hata: " + e.message, "error");
  }
};

$("btnForgot").onclick = async () => {
  try{
    const email = $("inEmail").value.trim();
    if (!email) return authMsg("Şifre sıfırlama için email gir.", "error");
    await fb.sendPasswordResetEmail(auth, email);
    authMsg("Şifre sıfırlama maili gönderildi.", "info");
  }catch(e){
    authMsg("Hata: " + e.message, "error");
  }
};

$("btnLogout").onclick = () => fb.signOut(auth);

/* Notifications */
$("btnNotify").onclick = async () => {
  if (!("Notification" in window)){
    toast("Bu cihaz bildirim desteklemiyor.");
    return;
  }
  const p = await Notification.requestPermission();
  toast("Bildirim izni: " + p);
};

function notify(title, body){
  if (!("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try { new Notification(title, { body }); } catch {}
}

/* AI demo */
$("btnAiToggle").onclick = () => $("aiBox").classList.toggle("hidden");
$("btnAiAsk").onclick = () => {
  const p = $("aiPrompt").value.trim();
  if (!p) { $("aiResult").textContent = "Bir şey yaz."; return; }
  $("aiResult").textContent =
    "Demo cevap: Ürün adını daha net yazmayı dene (model+depolama+renk).\n" +
    "Örn: 'Xiaomi Pad 7 256GB Wi-Fi'.\n" +
    "Backend gelince burada gerçek Gemini/GPT cevabı dönecek.";
};

/* Firestore structure */
async function ensureUserDoc(uid, email){
  const ref = fb.doc(db, "users", uid);
  const snap = await fb.getDoc(ref);
  if (!snap.exists()){
    await fb.setDoc(ref, { email, createdAt: fb.serverTimestamp() });
  }
}
const favCol = () => fb.collection(db, "users", currentUser.uid, "favorites");
const favDoc = (favId) => fb.doc(db, "users", currentUser.uid, "favorites", favId);

/* Auth state */
fb.onAuthStateChanged(auth, async (user) => {
  currentUser = user;

  if (!user){
    show($("authOverlay"));
    hide($("appRoot"));
    return;
  }

  if (!user.emailVerified){
    show($("authOverlay"));
    hide($("appRoot"));
    authMsg("Email doğrulanmamış. Lütfen mailini onayla.", "error");
    return;
  }

  hide($("authOverlay"));
  show($("appRoot"));
  await ensureUserDoc(user.uid, user.email);

  buildSiteChips();
  await loadFavorites();
  await runDiscountCheckOnOpen();
});

/* Site chips */
function buildSiteChips(){
  const wrap = $("siteChips");
  wrap.innerHTML = "";
  for (const s of SITES){
    const chip = document.createElement("div");
    chip.className = "chip active";
    chip.innerHTML = `<span class="dot"></span>${s.name}`;
    chip.onclick = () => {
      if (selectedSites.has(s.key)){
        selectedSites.delete(s.key);
        chip.classList.remove("active");
      } else {
        selectedSites.add(s.key);
        chip.classList.add("active");
      }
    };
    wrap.appendChild(chip);
  }
}

/* Search */
$("btnSearch").onclick = doSearch;
$("q").addEventListener("keydown", (e)=>{ if(e.key==="Enter") doSearch(); });

$("btnClearResults").onclick = () => {
  $("resultList").className = "list empty";
  $("resultList").textContent = "Henüz arama yapılmadı.";
};

async function doSearch(){
  const term = $("q").value.trim();
  if (!term) return;

  const active = SITES.filter(s => selectedSites.has(s.key));
  const list = $("resultList");
  list.className = "list";
  list.innerHTML = "";

  if (!active.length){
    list.className = "list empty";
    list.textContent = "Hiç site seçilmedi.";
    return;
  }

  for (const s of active){
    const url = s.base + encodeURIComponent(term);

    const row = document.createElement("div");
    row.className = "rowItem";
    row.innerHTML = `
      <div>
        <div class="rowTitle">${escapeHtml(s.name)}</div>
        <div class="rowMeta">${escapeHtml(term)}</div>
      </div>
      <div class="row" style="justify-content:flex-end">
        <button class="btn smallbtn btnOpen">Aç</button>
        <button class="btn smallbtn btnCopy">Favori Ekle</button>
      </div>
    `;

    const [btnOpen, btnFav] = row.querySelectorAll("button");
    btnOpen.onclick = () => window.open(url, "_blank");
    btnFav.onclick = async () => {
      await addFavorite({ query: term });
      toast("Favoriye eklendi ✅");
      await loadFavorites();
    };

    list.appendChild(row);
  }
}

async function addFavorite({ query }){
  const q1 = fb.query(favCol(), fb.where("query", "==", query), fb.limit(1));
  const ex = await fb.getDocs(q1);
  if (!ex.empty) return;

  await fb.addDoc(favCol(), {
    query,
    createdAt: Date.now(),
    lastPrice: null,
    lastTs: null,
    prices: [] // {price, ts, note}
  });
}

/* Favorites UI + logic */
$("btnRefreshFav").onclick = () => loadFavorites();

let chartMiniCache = new Map(); // favId -> Chart instance
let bigChart = null;

async function loadFavorites(){
  const wrap = $("favList");
  wrap.innerHTML = "";

  const snaps = await fb.getDocs(fb.query(favCol(), fb.orderBy("createdAt","desc")));
  if (snaps.empty){
    wrap.className = "favGrid empty";
    wrap.textContent = "Favori yok.";
    return;
  }
  wrap.className = "favGrid";

  for (const d of snaps.docs){
    const fav = { id:d.id, ...d.data() };

    const lastPriceTxt = fav.lastPrice ? formatTL(fav.lastPrice) : "Fiyat yok";
    const badge2 = (fav.prices?.length >= 2) ? "Takip aktif" : "Fiyat ekle";

    const card = document.createElement("div");
    card.className = "favCard";
    card.innerHTML = `
      <div class="favTop">
        <div>
          <div class="favTitle">${escapeHtml(fav.query)}</div>
          <div class="muted small">Linkler gizli • Site butonlarıyla aç</div>
        </div>
        <div class="badgeRow">
          <span class="badge">${lastPriceTxt}</span>
          <span class="badge">${badge2}</span>
        </div>
      </div>

      <div class="siteButtons" id="sites_${fav.id}"></div>

      <div class="row" style="margin-top:10px">
        <button class="btn smallbtn btnPrice">Fiyat Ekle</button>
        <button class="btn smallbtn btnDel">Sil</button>
      </div>

      <div class="miniChart" title="Grafiği büyütmek için tıkla">
        <canvas id="mini_${fav.id}" height="120"></canvas>
      </div>
    `;

    // site butonları (Aç + Copy Link)
    const siteWrap = card.querySelector(`#sites_${fav.id}`);
    for (const s of SITES){
      const url = s.base + encodeURIComponent(fav.query);

      const bOpen = document.createElement("button");
      bOpen.className = "btn smallbtn btnOpen";
      bOpen.textContent = `${s.name} Aç`;
      bOpen.onclick = () => window.open(url, "_blank");

      const bCopy = document.createElement("button");
      bCopy.className = "btn smallbtn btnCopy";
      bCopy.textContent = "Copy Link";
      bCopy.onclick = async () => {
        await navigator.clipboard.writeText(url);
        toast(`${s.name} link kopyalandı ✅`);
      };

      siteWrap.appendChild(bOpen);
      siteWrap.appendChild(bCopy);
    }

    // actions
    const [btnPrice, btnDel] = card.querySelectorAll(".row button");
    btnPrice.onclick = () => openPriceModal(fav);
    btnDel.onclick = async () => {
      if (!confirm("Favori silinsin mi?")) return;
      await fb.deleteDoc(favDoc(fav.id));
      toast("Silindi.");
      await loadFavorites();
    };

    // mini chart click -> open chart modal
    card.querySelector(".miniChart").onclick = () => openChartModal(fav);

    $("favList").appendChild(card);

    // render mini chart
    renderMiniChart(fav);
  }
}

/* Price modal */
let priceModalFav = null;

function showModal(modalId){
  show($("backdrop"));
  show($(modalId));
}
function closeModals(){
  hide($("backdrop"));
  hide($("priceModal"));
  hide($("chartModal"));
  priceModalFav = null;
}

$("pmClose").onclick = closeModals;
$("pmCancel").onclick = closeModals;
$("cmClose").onclick = closeModals;

function openPriceModal(fav){
  priceModalFav = fav;
  $("pmInfo").textContent = fav.query;
  $("pmPrice").value = "";
  $("pmNote").value = "";
  showModal("priceModal");
}

$("pmSave").onclick = async () => {
  const fav = priceModalFav;
  if (!fav) return;

  const price = Number($("pmPrice").value);
  if (!price || price <= 0){
    toast("Geçerli fiyat gir.");
    return;
  }
  const note = $("pmNote").value.trim();
  const now = Date.now();

  // yeniden doc çek (en güncel)
  const snap = await fb.getDoc(favDoc(fav.id));
  if (!snap.exists()) { toast("Favori bulunamadı."); closeModals(); return; }
  const cur = snap.data();

  const prices = Array.isArray(cur.prices) ? cur.prices : [];
  prices.push({ price, ts: now, note });

  // 180 gün limiti
  const cutoff = now - 180*24*60*60*1000;
  const trimmed = prices.filter(p => (p.ts||0) >= cutoff);

  // indirim hesabı (son 2 kayıt)
  let dropTxt = null;
  if (trimmed.length >= 2){
    const sorted = [...trimmed].sort((a,b)=>a.ts-b.ts);
    const prev = sorted[sorted.length-2].price;
    const last = sorted[sorted.length-1].price;
    const dropPct = ((prev - last) / prev) * 100;
    if (dropPct >= 5){
      // 6 ay min kontrol
      const min6 = sorted.reduce((m,x)=>Math.min(m, x.price), Infinity);
      const extra = (last <= min6) ? " (6 ayın en düşüğü!)" : "";
      dropTxt = `${fav.query} %${dropPct.toFixed(1)} düştü! ${formatTL(prev)} → ${formatTL(last)}${extra}`;
      if (!wasNotifiedToday(fav.id)){
        notify("Fiyat düştü! 🔔", dropTxt);
        markNotifiedToday(fav.id);
      }
      toast(dropTxt);
    }
  }

  await fb.updateDoc(favDoc(fav.id), {
    prices: trimmed,
    lastPrice: price,
    lastTs: now
  });

  closeModals();
  toast("Fiyat kaydedildi ✅");
  await loadFavorites();
};

/* Open check on app open */
async function runDiscountCheckOnOpen(){
  const snaps = await fb.getDocs(fb.query(favCol(), fb.orderBy("createdAt","desc"), fb.limit(80)));
  if (snaps.empty) return;

  for (const d of snaps.docs){
    const fav = { id:d.id, ...d.data() };
    const arr = Array.isArray(fav.prices) ? fav.prices : [];
    if (arr.length < 2) continue;

    const sorted = [...arr].sort((a,b)=>a.ts-b.ts);
    const prev = sorted[sorted.length-2].price;
    const last = sorted[sorted.length-1].price;
    const dropPct = ((prev - last) / prev) * 100;
    if (dropPct < 5) continue;

    if (wasNotifiedToday(fav.id)) continue;

    const min6 = sorted.reduce((m,x)=>Math.min(m, x.price), Infinity);
    const extra = (last <= min6) ? " (6 ayın en düşüğü!)" : "";
    const txt = `${fav.query} %${dropPct.toFixed(1)} düştü! ${formatTL(prev)} → ${formatTL(last)}${extra}`;
    notify("Fiyat düştü! 🔔", txt);
    toast(txt);
    markNotifiedToday(fav.id);
  }
}

/* Notification spam guard */
function todayKey(){
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function wasNotifiedToday(favId){
  return localStorage.getItem(`notified:${favId}`) === todayKey();
}
function markNotifiedToday(favId){
  localStorage.setItem(`notified:${favId}`, todayKey());
}

/* Chart.js */
function renderMiniChart(fav){
  const canvas = document.getElementById(`mini_${fav.id}`);
  if (!canvas) return;

  const arr = Array.isArray(fav.prices) ? fav.prices : [];
  if (arr.length < 2){
    // temiz
    const ctx = canvas.getContext("2d");
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.font = "900 14px system-ui";
    ctx.fillStyle = "#64748b";
    ctx.fillText("Grafik için en az 2 fiyat kaydı", 10, 30);
    return;
  }

  const sorted = [...arr].sort((a,b)=>a.ts-b.ts);
  const labels = sorted.map(p=>{
    const d = new Date(p.ts);
    return `${String(d.getDate()).padStart(2,"0")}.${String(d.getMonth()+1).padStart(2,"0")}`;
  });
  const data = sorted.map(p=>p.price);

  const old = chartMiniCache.get(fav.id);
  if (old) old.destroy();

  const c = new Chart(canvas, {
    type: "line",
    data: { labels, datasets: [{ data, tension:0.3 }] },
    options: {
      plugins:{ legend:{ display:false } },
      scales:{ x:{ display:false }, y:{ display:false } },
      responsive:true,
      maintainAspectRatio:false
    }
  });

  chartMiniCache.set(fav.id, c);
}

function openChartModal(fav){
  $("cmTitle").textContent = "Fiyat Grafiği";
  $("cmSub").textContent = fav.query;

  const arr = Array.isArray(fav.prices) ? fav.prices : [];
  const sorted = [...arr].sort((a,b)=>a.ts-b.ts);

  const labels = sorted.map(p=> new Date(p.ts).toLocaleString("tr-TR"));
  const data = sorted.map(p=> p.price);

  if (bigChart) bigChart.destroy();
  bigChart = new Chart($("bigChart"), {
    type:"line",
    data:{ labels, datasets:[{ data, tension:0.25 }] },
    options:{
      plugins:{ legend:{ display:false } },
      scales:{ y:{ ticks:{ callback:(v)=> `${v} TL` } } }
    }
  });

  const tbl = $("cmTable");
  tbl.innerHTML = "";
  if (!sorted.length){
    tbl.innerHTML = `<div class="tr"><div class="td">Kayıt yok</div><div class="tdm"></div></div>`;
  } else {
    for (let i=sorted.length-1;i>=0;i--){
      const p = sorted[i];
      const left = new Date(p.ts).toLocaleString("tr-TR");
      const right = `${formatTL(p.price)}${p.note ? (" • " + escapeHtml(p.note)) : ""}`;
      tbl.innerHTML += `<div class="tr"><div class="td">${left}</div><div class="tdm">${right}</div></div>`;
    }
  }

  showModal("chartModal");
}

/* Utils */
function formatTL(n){
  try{
    return new Intl.NumberFormat("tr-TR", { style:"currency", currency:"TRY", maximumFractionDigits:0 }).format(n);
  }catch{
    return `${n} TL`;
  }
}
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));
                          }
