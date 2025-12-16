// PWA SW
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => navigator.serviceWorker.register("./sw.js"));
}

/* =========================
   Firebase (CDN Modular)
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
   UI Helpers
   ========================= */
const $ = (id) => document.getElementById(id);
const show = (el) => el.classList.remove("hidden");
const hide = (el) => el.classList.add("hidden");

function msg(text, kind="info") {
  const box = $("authMsg");
  box.textContent = text;
  box.style.background = kind === "error" ? "#ffecec" : "#f1f5f9";
  box.style.borderColor = kind === "error" ? "#ffd0d0" : "#e5e7eb";
  box.style.color = kind === "error" ? "#a01616" : "#0f172a";
  show(box);
}

function togglePw(inputId){
  const el = $(inputId);
  el.type = el.type === "password" ? "text" : "password";
}

$("btnToggleInPass").onclick = () => togglePw("inPass");
$("btnToggleUpPass").onclick = () => togglePw("upPass");
$("btnToggleUpPass2").onclick = () => togglePw("upPass2");

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
   Auth Tabs
   ========================= */
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

/* =========================
   Auth Actions
   ========================= */
$("btnSignUp").onclick = async () => {
  hide($("authMsg"));
  const email = $("upEmail").value.trim();
  const pass = $("upPass").value.trim();
  const pass2 = $("upPass2").value.trim();
  if (!email || !pass) return msg("Email ve şifre boş olamaz.", "error");
  if (pass.length < 6) return msg("Şifre en az 6 karakter olmalı.", "error");
  if (pass !== pass2) return msg("Şifreler eşleşmiyor.", "error");

  try{
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await sendEmailVerification(cred.user);
    await ensureUserDoc(cred.user.uid, cred.user.email);
    msg("Kayıt tamam! Email doğrulama linki gönderildi. Maili onayla, sonra giriş yap.", "info");
  }catch(e){
    msg("Kayıt hatası: " + e.message, "error");
  }
};

$("btnSignIn").onclick = async () => {
  hide($("authMsg"));
  const email = $("inEmail").value.trim();
  const pass = $("inPass").value.trim();
  if (!email || !pass) return msg("Email ve şifre boş olamaz.", "error");
  try{
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    if (!cred.user.emailVerified) {
      msg("Email doğrulanmamış. Mailini onayla. İstersen 'Doğrulama Maili Tekrar' butonuna bas.", "error");
      await signOut(auth);
      return;
    }
  }catch(e){
    msg("Giriş hatası: " + e.message, "error");
  }
};

$("btnResendVerify").onclick = async () => {
  try{
    const email = $("inEmail").value.trim();
    const pass = $("inPass").value.trim();
    if (!email || !pass) return msg("Önce email+şifre gir.", "error");
    const cred = await signInWithEmailAndPassword(auth, email, pass);
    await sendEmailVerification(cred.user);
    msg("Doğrulama maili tekrar gönderildi. Mailini onaylayınca giriş yap.", "info");
    await signOut(auth);
  }catch(e){
    msg("Hata: " + e.message, "error");
  }
};

$("btnForgot").onclick = async () => {
  try{
    const email = $("inEmail").value.trim();
    if (!email) return msg("Şifre sıfırlama için email gir.", "error");
    await sendPasswordResetEmail(auth, email);
    msg("Şifre sıfırlama maili gönderildi.", "info");
  }catch(e){
    msg("Hata: " + e.message, "error");
  }
};

$("btnLogout").onclick = () => signOut(auth);

/* =========================
   Auth State
   ========================= */
onAuthStateChanged(auth, async (user) => {
  currentUser = user;
  if (!user) {
    show($("authOverlay"));
    return;
  }
  if (!user.emailVerified) {
    show($("authOverlay"));
    msg("Email doğrulanmamış. Lütfen mailini onayla.", "error");
    return;
  }
  hide($("authOverlay"));
  await ensureUserDoc(user.uid, user.email);
  buildSiteChips();
  await loadFavorites();
});

/* =========================
   Firestore Helpers
   ========================= */
async function ensureUserDoc(uid, email){
  const ref = doc(db, "users", uid);
  const snap = await getDoc(ref);
  if (!snap.exists()){
    await setDoc(ref, { email, createdAt: serverTimestamp() });
  }
}

function favCol(){
  return collection(db, "users", currentUser.uid, "favorites");
}

function priceCol(favId){
  return collection(db, "users", currentUser.uid, "favorites", favId, "prices");
}

/* =========================
   UI: Site Chips
   ========================= */
function buildSiteChips(){
  const wrap = $("siteChips");
  wrap.innerHTML = "";
  for (const s of SITES){
    const chip = document.createElement("div");
    chip.className = "chip active";
    chip.innerHTML = `<span class="dot"></span><b>${s.name}</b>`;
    chip.onclick = () => {
      if (selectedSites.has(s.key)) {
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
   Search
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

  const active = SITES.filter(s=>selectedSites.has(s.key));
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
        <div class="rowTitle">${s.name}</div>
        <div class="rowMeta">${term}</div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;justify-content:flex-end">
        <button class="smallbtn open">Aç</button>
        <button class="smallbtn primary">Favori Ekle</button>
      </div>
    `;
    const [btnOpen, btnFav] = row.querySelectorAll("button");
    btnOpen.onclick = () => window.open(url, "_blank");
    btnFav.onclick = async () => {
      await addFavorite({ title: term, siteKey: s.key, siteName: s.name, url });
      toast(`Favoriye eklendi: ${term} (${s.name})`);
      await loadFavorites();
    };
    list.appendChild(row);
  }
}

/* =========================
   Favorites
   ========================= */
$("btnDeleteAllFav").onclick = async () => {
  if (!currentUser) return;
  if (!confirm("Tüm favoriler silinsin mi?")) return;
  const snaps = await getDocs(favCol());
  for (const d of snaps.docs){
    await deleteDoc(d.ref);
  }
  await loadFavorites();
};

async function addFavorite({title, siteKey, siteName, url}){
  // aynı ürün+site tekrar eklenmesin diye basit kontrol
  const q1 = query(favCol(), where("title","==",title), where("siteKey","==",siteKey), limit(1));
  const ex = await getDocs(q1);
  if (!ex.empty) return;

  await addDoc(favCol(), {
    title,
    siteKey,
    siteName,
    url,
    createdAt: serverTimestamp(),
    lastPrice: null,
    lastPriceAt: null
  });
}

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

    // mini chart canvas
    const canvasId = `mini_${fav.id}`;

    card.innerHTML = `
      <div class="favTop">
        <div>
          <div class="favTitle">${escapeHtml(fav.title)}</div>
          <div class="favSub">${escapeHtml(fav.siteName)} • Link gizli</div>
        </div>
        <div class="badges">
          <span class="badge">${escapeHtml(fav.siteName)}</span>
          <span class="badge">${fav.lastPrice ? (formatTL(fav.lastPrice) + " • Son") : "Fiyat yok"}</span>
        </div>
      </div>

      <div class="favActions">
        <button class="smallbtn open">Aç</button>
        <button class="smallbtn copy">Copy Link</button>
        <button class="smallbtn price">Fiyat Ekle</button>
        <button class="smallbtn del">Sil</button>
      </div>

      <div class="miniChart" data-favid="${fav.id}" title="Grafiği büyütmek için tıkla">
        <canvas id="${canvasId}" width="900" height="220"></canvas>
      </div>
    `;

    const [btnOpen, btnCopy, btnPrice, btnDel] = card.querySelectorAll("button");
    btnOpen.onclick = () => window.open(fav.url, "_blank");
    btnCopy.onclick = async () => {
      await navigator.clipboard.writeText(fav.url);
      toast("Link kopyalandı ✅");
    };
    btnDel.onclick = async () => {
      if (!confirm("Favori silinsin mi?")) return;
      await deleteDoc(doc(db, "users", currentUser.uid, "favorites", fav.id));
      await loadFavorites();
    };

    btnPrice.onclick = () => openPriceModal(fav);

    // chart click -> open big
    card.querySelector(".miniChart").onclick = async () => {
      await openChartModal(fav);
    };

    wrap.appendChild(card);

    // draw mini
    const history = await getLastPrices(fav.id, 60);
    drawChart($(canvasId), history);
  }
}

/* =========================
   Price Modal
   ========================= */
let priceModalState = null;

function openPriceModal(fav){
  priceModalState = fav;
  $("pmTitle").textContent = "Fiyat Ekle";
  $("pmSub").textContent = `${fav.title} • ${fav.siteName}`;
  $("pmPrice").value = "";
  $("pmNote").value = "";
  showModal("priceModal");
}

$("pmClose").onclick = closeModals;
$("pmCancel").onclick = closeModals;

$("pmSave").onclick = async () => {
  const fav = priceModalState;
  if (!fav) return;

  const price = Number($("pmPrice").value);
  if (!price || price <= 0){
    toast("Geçerli fiyat gir.");
    return;
  }
  const note = $("pmNote").value.trim();

  // last price
  const last = await getLastPrice(fav.id);

  // save price record
  await addDoc(priceCol(fav.id), {
    price,
    note,
    at: serverTimestamp(),
    ts: Date.now()
  });

  // update fav lastPrice
  await setDoc(doc(db, "users", currentUser.uid, "favorites", fav.id), {
    ...fav,
    lastPrice: price,
    lastPriceAt: Date.now()
  }, { merge:true });

  closeModals();
  toast("Fiyat kaydedildi ✅");

  // indirim kontrol
  if (last && last.price){
    const dropPct = ((last.price - price) / last.price) * 100;
    if (dropPct >= 5){
      const txt = `${fav.title} ${fav.siteName} fiyatı %${dropPct.toFixed(1)} düştü! (${formatTL(last.price)} → ${formatTL(price)})`;
      toast(txt);
      notify("Fiyat düştü!", txt);
    }
  }

  await loadFavorites();
};

/* =========================
   Chart Modal
   ========================= */
$("cmClose").onclick = closeModals;

async function openChartModal(fav){
  $("cmTitle").textContent = "Fiyat Grafiği";
  $("cmSub").textContent = `${fav.title} • ${fav.siteName}`;

  const history = await getLastPrices(fav.id, 180);
  drawChart($("bigChart"), history);

  // table
  const tbl = $("cmTable");
  tbl.innerHTML = "";
  if (!history.length){
    tbl.innerHTML = `<div class="tr"><div class="td">Kayıt yok</div><div class="td m"></div></div>`;
  } else {
    for (const h of history.slice().reverse()){
      tbl.innerHTML += `
        <div class="tr">
          <div class="td">${new Date(h.ts).toLocaleString("tr-TR")}</div>
          <div class="td m">${formatTL(h.price)} ${h.note ? (" • " + escapeHtml(h.note)) : ""}</div>
        </div>
      `;
    }
  }

  showModal("chartModal");
}

/* =========================
   Firestore Price reads
   ========================= */
async function getLastPrice(favId){
  const snaps = await getDocs(query(priceCol(favId), orderBy("ts","desc"), limit(1)));
  if (snaps.empty) return null;
  return snaps.docs[0].data();
}

async function getLastPrices(favId, n=60){
  const snaps = await getDocs(query(priceCol(favId), orderBy("ts","desc"), limit(n)));
  const arr = snaps.docs.map(d=>d.data()).reverse(); // oldest->newest
  return arr;
}

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
  new Notification(title, { body });
}

/* =========================
   Modal helpers
   ========================= */
function showModal(id){
  show($("modalBackdrop"));
  show($(id));
}
function closeModals(){
  hide($("modalBackdrop"));
  hide($("priceModal"));
  hide($("chartModal"));
  priceModalState = null;
}

/* =========================
   Toast
   ========================= */
let toastTimer = null;
function toast(text){
  let t = document.getElementById("toast");
  if (!t){
    t = document.createElement("div");
    t.id = "toast";
    t.style.position = "fixed";
    t.style.left = "50%";
    t.style.bottom = "18px";
    t.style.transform = "translateX(-50%)";
    t.style.zIndex = "2000";
    t.style.padding = "12px 14px";
    t.style.borderRadius = "14px";
    t.style.border = "1px solid #e5e7eb";
    t.style.background = "#fff";
    t.style.boxShadow = "0 14px 45px rgba(0,0,0,.18)";
    t.style.fontWeight = "800";
    t.style.maxWidth = "92vw";
    document.body.appendChild(t);
  }
  t.textContent = text;
  t.style.display = "block";
  clearTimeout(toastTimer);
  toastTimer = setTimeout(()=> t.style.display="none", 3200);
}

/* =========================
   Chart (Canvas)
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
    ctx.font = "700 28px system-ui";
    ctx.fillText("Grafik için en az 2 fiyat kaydı lazım", 24, 70);
    return;
  }

  const prices = data.map(d=>d.price);
  const min = Math.min(...prices);
  const max = Math.max(...prices);
  const pad = 40;

  const xStep = (w - pad*2) / (data.length - 1);
  const scaleY = (h - pad*2) / (max - min || 1);

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
  ctx.font = "800 20px system-ui";
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
  ctx.font = "900 22px system-ui";
  ctx.fillText(`Son: ${formatTL(last.price)}`, pad, pad+22);
}

/* =========================
   Utils
   ========================= */
function formatTL(n){
  try{
    return new Intl.NumberFormat("tr-TR", { style:"currency", currency:"TRY", maximumFractionDigits:0 }).format(n);
  }catch{
    return n + " TL";
  }
}
function escapeHtml(s){
  return String(s).replace(/[&<>"']/g, m => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[m]));
          }
