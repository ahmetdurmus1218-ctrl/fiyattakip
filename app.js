/* =========================
   Service Worker
   ========================= */
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js"));
}

/* =========================
   Firebase (Modular CDN)
   ========================= */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  deleteDoc,
  getDocs,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

/* ✅ SENİN CONFIG */
const firebaseConfig = {
  apiKey: "AIzaSyBcXkVFQzB2XtxO7wqnbXhzM1Io54zCsBI",
  authDomain: "fiyattakip-ttoxub.firebaseapp.com",
  projectId: "fiyattakip-ttoxub",
  storageBucket: "fiyattakip-ttoxub.firebasestorage.app",
  messagingSenderId: "105868725844",
  appId: "1:105868725844:web:fc04f5a08e708916e727c1",
  measurementId: "G-M6JXDZ3PK0"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

/* =========================
   DOM helpers
   ========================= */
const $ = (id) => document.getElementById(id);
const show = (el) => el.classList.remove("hidden");
const hide = (el) => el.classList.add("hidden");

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

/* =========================
   Sites
   ========================= */
const SITES = [
  { key:"trendyol", name:"Trendyol", base:"https://www.trendyol.com/sr?q=" },
  { key:"hepsiburada", name:"Hepsiburada", base:"https://www.hepsiburada.com/ara?q=" },
  { key:"n11", name:"N11", base:"https://www.n11.com/arama?q=" },
  { key:"amazontr", name:"Amazon TR", base:"https://www.amazon.com.tr/s?k=" },
  { key:"pazarama", name:"Pazarama", base:"https://www.pazarama.com/arama?q=" },
  { key:"ciceksepeti", name:"ÇiçekSepeti", base:"https://www.ciceksepeti.com/arama?query=" },
  { key:"idefix", name:"İdefix", base:"https://www.idefix.com/search?q=" }
];

let selectedSites = new Set(SITES.map(s=>s.key)); // default all
let currentUser = null;

/* =========================
   Auth UI events
   ========================= */
$("btnToggleInPass").onclick = () => togglePw("inPass");
$("btnToggleUpPass").onclick = () => togglePw("upPass");
$("btnToggleUpPass2").onclick = () => togglePw("upPass2");

$("tabSignIn").onclick = () => {
  $("tabSignIn").classList.add("active");
  $("tabSignUp").classList.remove("active");
  show($("signInPanel")); hide($("signUpPanel"));
  hide($("authMsg"));
};

$("tabSignUp").onclick = () => {
  $("tabSignUp").classList.add("active");
  $("tabSignIn").classList.remove("active");
  show($("signUpPanel")); hide($("signInPanel"));
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
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await sendEmailVerification(cred.user);
    await ensureUserDoc(cred.user.uid, cred.user.email);
    authMsg("Kayıt tamam! Doğrulama maili gönderildi. Maili onayla, sonra giriş yap.", "info");
    await signOut(auth);
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
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    if (!cred.user.emailVerified){
      authMsg("Email doğrulanmamış. Mailini onayla. İstersen doğrulama mailini tekrar gönder.", "error");
      await signOut(auth);
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
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    await sendEmailVerification(cred.user);
    authMsg("Doğrulama maili tekrar gönderildi. Maili onaylayınca giriş yap.", "info");
    await signOut(auth);
  }catch(e){
    authMsg("Hata: " + e.message, "error");
  }
};

$("btnForgot").onclick = async () => {
  try{
    const email = $("inEmail").value.trim();
    if (!email) return authMsg("Şifre sıfırlama için email gir.", "error");
    await sendPasswordResetEmail(auth, email);
    authMsg("Şifre sıfırlama maili gönderildi.", "info");
  }catch(e){
    authMsg("Hata: " + e.message, "error");
  }
};

$("btnLogout").onclick = () => signOut(auth);

/* =========================
   Notifications
   ========================= */
$("btnAskNotify").onclick = async () => {
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

/* =========================
   Firestore helpers
   ========================= */
async function ensureUserDoc(uid, email){
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()){
    await setDoc(ref, { email, createdAt: serverTimestamp() });
  }
}

const favCol = () => collection(db, "users", currentUser.uid, "favorites");
const favDoc = (favId) => doc(db, "users", currentUser.uid, "favorites", favId);
const priceCol = (favId) => collection(db, "users", currentUser.uid, "favorites", favId, "prices");

/* =========================
   Auth state
   ========================= */
onAuthStateChanged(auth, async (user) => {
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
  await runDiscountCheckOnOpen(); // uygulama açılınca %5+ kontrol
});

/* =========================
   Site chips
   ========================= */
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

/* =========================
   Search UI
   ========================= */
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
        <button class="btn smallbtn open">Aç</button>
        <button class="btn smallbtn primary">Favori Ekle</button>
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
  // aynı query ile tekrar eklemeyelim
  const q1 = queryFirestore(query);
  const ex = await getDocs(q1);
  if (!ex.empty) return;

  await addDoc(favCol(), {
    query,
    createdAt: serverTimestamp(),
    lastPrice: null,
    lastTs: null
  });
}

function queryFirestore(qStr){
  return query(favCol(), where("query", "==", qStr), limit(1));
}

/* =========================
   Favorites
   ========================= */
$("btnRefreshFav").onclick = () => loadFavorites();

async function loadFavorites(){
  const wrap = $("favList");
  wrap.innerHTML = "";

  const snaps = await getDocs(query(favCol(), orderBy("createdAt","desc")));
  if (snaps.empty){
    wrap.className = "favGrid empty";
    wrap.textContent = "Favori yok.";
    return;
  }
  wrap.className = "favGrid";

  for (const d of snaps.docs){
    const fav = { id:d.id, ...d.data() };

    const card = document.createElement("div");
    card.className = "favCard";

    const lastPrice = fav.lastPrice ? formatTL(fav.lastPrice) : "Fiyat yok";
    const canvasId = `mini_${fav.id}`;

    card.innerHTML = `
      <div class="favTop">
        <div>
          <div class="favTitle">${escapeHtml(fav.query)}</div>
          <div class="small">Linkler gizli • Site butonlarıyla aç</div>
        </div>
        <div class="badgeRow">
          <span class="badge">${lastPrice}</span>
          <span class="badge">%5+ düşüş: bildirim</span>
        </div>
      </div>

      <div class="siteButtons" id="sites_${fav.id}"></div>

      <div class="row" style="margin-top:10px">
        <button class="btn smallbtn price">Fiyat Ekle</button>
        <button class="btn smallbtn ghost">Sil</button>
      </div>

      <div class="miniChart" title="Grafiği büyütmek için tıkla">
        <canvas id="${canvasId}" width="900" height="220"></canvas>
      </div>
    `;

    // site butonlarını doldur
    const siteWrap = card.querySelector(`#sites_${fav.id}`);
    for (const s of SITES){
      const url = s.base + encodeURIComponent(fav.query);

      const btnOpen = document.createElement("button");
      btnOpen.className = "btn smallbtn open";
      btnOpen.textContent = `${s.name} Aç`;
      btnOpen.onclick = () => window.open(url, "_blank");

      const btnCopy = document.createElement("button");
      btnCopy.className = "btn smallbtn copy";
      btnCopy.textContent = "Copy Link";
      btnCopy.onclick = async () => {
        await navigator.clipboard.writeText(url);
        toast(`${s.name} link kopyalandı ✅`);
      };

      siteWrap.appendChild(btnOpen);
      siteWrap.appendChild(btnCopy);
    }

    // actions
    const [btnPrice, btnDel] = card.querySelectorAll(".row button");
    btnPrice.onclick = () => openPriceModal(fav);
    btnDel.onclick = async () => {
      if (!confirm("Favori silinsin mi?")) return;
      await deleteDoc(favDoc(fav.id));
      toast("Silindi.");
      await loadFavorites();
    };

    // mini chart click -> open chart modal
    card.querySelector(".miniChart").onclick = async () => openChartModal(fav);

    wrap.appendChild(card);

    // draw mini chart
    const history = await getLastPrices(fav.id, 90);
    drawChart($(canvasId), history);
  }
}

/* =========================
   Price modal
   ========================= */
let priceModalFav = null;

function showModal(id){
  show($("modalBackdrop"));
  show($(id));
}
function closeModals(){
  hide($("modalBackdrop"));
  hide($("priceModal"));
  hide($("chartModal"));
  priceModalFav = null;
}

$("pmClose").onclick = closeModals;
$("pmCancel").onclick = closeModals;

function openPriceModal(fav){
  priceModalFav = fav;
  $("pmTitle").textContent = "Fiyat Ekle";
  $("pmSub").textContent = `${fav.query}`;
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

  // önceki son fiyatı çek
  const last = await getLastPrice(fav.id);

  // price record ekle
  await addDoc(priceCol(fav.id), {
    price,
    note,
    ts: Date.now(),
    at: serverTimestamp()
  });

  // favorite güncelle (merge)
  await setDoc(favDoc(fav.id), {
    lastPrice: price,
    lastTs: Date.now()
  }, { merge:true });

  closeModals();
  toast("Fiyat kaydedildi ✅");

  // %5+ düşüş kontrol (kaydetme anında)
  if (last && last.price){
    const dropPct = ((last.price - price) / last.price) * 100;
    if (dropPct >= 5){
      const txt = `${fav.query} fiyatı %${dropPct.toFixed(1)} düştü! (${formatTL(last.price)} → ${formatTL(price)})`;
      toast(txt);
      notify("Fiyat düştü!", txt);
      markNotifiedToday(fav.id);
    }
  }

  await loadFavorites();
};

/* =========================
   Chart modal
   ========================= */
$("cmClose").onclick = closeModals;

async function openChartModal(fav){
  $("cmTitle").textContent = "Fiyat Grafiği";
  $("cmSub").textContent = fav.query;

  const history = await getLastPrices(fav.id, 180);
  drawChart($("bigChart"), history);

  const tbl = $("cmTable");
  tbl.innerHTML = "";

  if (!history.length){
    tbl.innerHTML = `<div class="tr"><div class="td">Kayıt yok</div><div class="td m"></div></div>`;
  } else {
    for (const h of history.slice().reverse()){
      const dt = new Date(h.ts).toLocaleString("tr-TR");
      const right = `${formatTL(h.price)}${h.note ? (" • " + escapeHtml(h.note)) : ""}`;
      tbl.innerHTML += `<div class="tr"><div class="td">${dt}</div><div class="td m">${right}</div></div>`;
    }
  }

  showModal("chartModal");
}

/* =========================
   Firestore read prices
   ========================= */
async function getLastPrice(favId){
  const snaps = await getDocs(query(priceCol(favId), orderBy("ts","desc"), limit(1)));
  if (snaps.empty) return null;
  return snaps.docs[0].data();
}

async function getLastPrices(favId, n=90){
  const snaps = await getDocs(query(priceCol(favId), orderBy("ts","desc"), limit(n)));
  return snaps.docs.map(d=>d.data()).reverse(); // oldest->newest
}

/* =========================
   %5+ check on app open
   ========================= */
async function runDiscountCheckOnOpen(){
  // Bildirim izni yoksa sadece toast gösterir (istersen)
  const snaps = await getDocs(query(favCol(), orderBy("createdAt","desc"), limit(50)));
  if (snaps.empty) return;

  for (const d of snaps.docs){
    const fav = { id:d.id, ...d.data() };
    const history = await getLastPrices(fav.id, 2);
    if (history.length < 2) continue;

    const prev = history[history.length-2].price;
    const last = history[history.length-1].price;
    if (!prev || !last) continue;

    const dropPct = ((prev - last) / prev) * 100;
    if (dropPct >= 5){
      // aynı gün tekrar spam olmasın
      if (wasNotifiedToday(fav.id)) continue;

      const txt = `${fav.query} fiyatı %${dropPct.toFixed(1)} düştü! (${formatTL(prev)} → ${formatTL(last)})`;
      toast(txt);
      notify("Fiyat düştü!", txt);
      markNotifiedToday(fav.id);
    }
  }
}

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

/* =========================
   Chart drawing (Canvas)
   ========================= */
function drawChart(canvas, data){
  const ctx = canvas.getContext("2d");
  const w = canvas.width, h = canvas.height;
  ctx.clearRect(0,0,w,h);

  // background
  ctx.fillStyle = "#fafcff";
  ctx.fillRect(0,0,w,h);

  if (!data || data.length < 2){
    ctx.fillStyle = "#64748b";
    ctx.font = "900 26px system-ui";
    ctx.fillText("Grafik için en az 2 fiyat kaydı", 24, 70);
    return;
  }

  const prices = data.map(d=>d.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const pad = 40;

  const xStep = (w - pad*2) / (data.length - 1);
  const scaleY = (h - pad*2) / ((max - min) || 1);

  // axis
  ctx.strokeStyle = "#e5e7eb";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(pad, pad);
  ctx.lineTo(pad, h-pad);
  ctx.lineTo(w-pad, h-pad);
  ctx.stroke();

  // labels
  ctx.fillStyle = "#334155";
  ctx.font = "900 18px system-ui";
  ctx.fillText(`${formatTL(max)}`, 10, pad+10);
  ctx.fillText(`${formatTL(min)}`, 10, h-pad);

  // line
  ctx.strokeStyle = "#3f51b5";
  ctx.lineWidth = 4;
  ctx.beginPath();
  data.forEach((d,i)=>{
    const x = pad + i*xStep;
    const y = h - pad - (d.price - min)*scaleY;
    if (i===0) ctx.moveTo(x,y);
    else ctx.lineTo(x,y);
  });
  ctx.stroke();

  // points
  ctx.fillStyle = "#3f51b5";
  data.forEach((d,i)=>{
    const x = pad + i*xStep;
    const y = h - pad - (d.price - min)*scaleY;
    ctx.beginPath();
    ctx.arc(x,y,6,0,Math.PI*2);
    ctx.fill();
  });

  // last label
  const last = data[data.length-1];
  ctx.fillStyle = "#0f172a";
  ctx.font = "1000 20px system-ui";
  ctx.fillText(`Son: ${formatTL(last.price)}`, pad, pad+22);
}

/* =========================
   Utils
   ========================= */
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
