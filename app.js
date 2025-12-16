// ====================== Firebase (CDN modular) ======================
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.13.1/firebase-app.js";
import {
  getAuth,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithPopup,
  sendEmailVerification,
  sendPasswordResetEmail,
  signOut
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  updateDoc,
  serverTimestamp,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/10.13.1/firebase-firestore.js";

// --- SENİN CONFIG (doğru olanı koy) ---
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

// ====================== PWA SW ======================
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch(()=>{});
}

// ====================== Helpers ======================
const $ = (id) => document.getElementById(id);

const SITES = [
  { key:"trendyol", name:"Trendyol", color:"--ok" },
  { key:"hepsiburada", name:"Hepsiburada", color:"--ok" },
  { key:"n11", name:"N11", color:"--ok" },
  { key:"amazon", name:"Amazon TR", color:"--ok" },
  { key:"pazarama", name:"Pazarama", color:"--ok" },
  { key:"ciceksepeti", name:"ÇiçekSepeti", color:"--ok" },
  { key:"idefix", name:"İdefix", color:"--ok" }
];

function enc(s){ return encodeURIComponent(String(s||"").trim()); }

function buildSearchUrl(siteKey, queryText){
  const q = enc(queryText);

  // ✅ “site içi ucuzdan sırala” mümkün olanlara parametre eklendi
  switch(siteKey){
    case "trendyol":
      // Trendyol: sr? (sorting=PRICE_BY_ASC) çoğu zaman çalışır
      return `https://www.trendyol.com/sr?q=${q}&sst=PRICE_BY_ASC`;
    case "hepsiburada":
      // Hepsiburada sıralama parametresi zamanla değişebiliyor; çoğu cihazda "siralama=artan" çalışır
      return `https://www.hepsiburada.com/ara?q=${q}&siralama=artan`;
    case "n11":
      // N11: "srt=PRICE_LOW" benzeri; çalışmazsa normal arama açar
      return `https://www.n11.com/arama?q=${q}&srt=PRICE_LOW`;
    case "amazon":
      // Amazon: sort=price-asc-rank
      return `https://www.amazon.com.tr/s?k=${q}&s=price-asc-rank`;
    case "pazarama":
      return `https://www.pazarama.com/arama?q=${q}`;
    case "ciceksepeti":
      return `https://www.ciceksepeti.com/arama?query=${q}`;
    case "idefix":
      return `https://www.idefix.com/search?q=${q}`;
    default:
      return `https://www.google.com/search?q=${q}`;
  }
}

function toast(el, msg, type=""){
  el.className = "msg " + (type||"");
  el.textContent = msg || "";
}

function moneyTry(n){
  const x = Number(n);
  if(!isFinite(x)) return "";
  return x.toLocaleString("tr-TR") + " TL";
}

function todayKey(){
  const d = new Date();
  const yy = d.getFullYear();
  const mm = String(d.getMonth()+1).padStart(2,"0");
  const dd = String(d.getDate()).padStart(2,"0");
  return `${yy}-${mm}-${dd}`;
}

function clampHistory(arr, max=200){
  if(!Array.isArray(arr)) return [];
  if(arr.length<=max) return arr;
  return arr.slice(arr.length-max);
}

// ====================== Auth UI ======================
let mode = "signin"; // signin | signup
let currentUser = null;

const authOverlay = $("authOverlay");
const tabSignIn = $("tabSignIn");
const tabSignUp = $("tabSignUp");
const authEmail = $("authEmail");
const authPass = $("authPass");
const authPass2 = $("authPass2");
const confirmWrap = $("confirmWrap");
const authPrimaryBtn = $("authPrimaryBtn");
const btnGoogle = $("btnGoogle");
const btnReset = $("btnReset");
const btnResendVerify = $("btnResendVerify");
const authMsg = $("authMsg");
const togglePass = $("togglePass");
const togglePass2 = $("togglePass2");

function setMode(m){
  mode = m;
  tabSignIn.classList.toggle("active", m==="signin");
  tabSignUp.classList.toggle("active", m==="signup");
  confirmWrap.classList.toggle("hidden", m!=="signup");
  authPrimaryBtn.textContent = (m==="signin") ? "Giriş Yap" : "Create Account";
  toast(authMsg, "");
}
tabSignIn.onclick = () => setMode("signin");
tabSignUp.onclick = () => setMode("signup");

togglePass.onclick = () => authPass.type = (authPass.type==="password" ? "text":"password");
togglePass2.onclick = () => authPass2.type = (authPass2.type==="password" ? "text":"password");

authPrimaryBtn.onclick = async () => {
  toast(authMsg, "");
  const email = authEmail.value.trim();
  const pass = authPass.value;

  try{
    if(mode==="signin"){
      const res = await signInWithEmailAndPassword(auth, email, pass);
      if(!res.user.emailVerified){
        toast(authMsg, "Mail doğrulanmamış. 'Doğrulama maili' ile gönder.", "err");
      } else {
        toast(authMsg, "Giriş başarılı.", "ok");
      }
    }else{
      const pass2 = authPass2.value;
      if(pass.length < 6) return toast(authMsg, "Şifre en az 6 karakter olmalı.", "err");
      if(pass !== pass2) return toast(authMsg, "Şifreler aynı değil.", "err");
      const res = await createUserWithEmailAndPassword(auth, email, pass);
      await sendEmailVerification(res.user);
      toast(authMsg, "Hesap oluşturuldu. Mail doğrulama gönderildi.", "ok");
    }
  }catch(e){
    toast(authMsg, e?.message || "Hata", "err");
  }
};

btnGoogle.onclick = async () => {
  toast(authMsg, "");
  try{
    const prov = new GoogleAuthProvider();
    await signInWithPopup(auth, prov);
    toast(authMsg, "Google ile giriş tamam.", "ok");
  }catch(e){
    toast(authMsg, e?.message || "Hata", "err");
  }
};

btnReset.onclick = async () => {
  const email = authEmail.value.trim();
  if(!email) return toast(authMsg, "Email yaz.", "err");
  try{
    await sendPasswordResetEmail(auth, email);
    toast(authMsg, "Şifre sıfırlama maili gönderildi.", "ok");
  }catch(e){
    toast(authMsg, e?.message || "Hata", "err");
  }
};

btnResendVerify.onclick = async () => {
  if(!auth.currentUser) return toast(authMsg, "Önce giriş yap.", "err");
  try{
    await sendEmailVerification(auth.currentUser);
    toast(authMsg, "Doğrulama maili tekrar gönderildi.", "ok");
  }catch(e){
    toast(authMsg, e?.message || "Hata", "err");
  }
};

// Logout
$("btnLogout").onclick = async () => {
  await signOut(auth);
};

// ====================== Firestore paths ======================
function userRoot(uid){ return doc(db, "users", uid); }
function favCol(uid){ return collection(db, "users", uid, "favorites"); }

// Favorite doc structure:
// { name, createdAt, sites: {siteKey: {url, faved:boolean}}, history: [{date, price}] }
async function ensureUserDoc(u){
  const ref = userRoot(u.uid);
  const snap = await getDoc(ref);
  if(!snap.exists()){
    await setDoc(ref, { email: u.email || "", createdAt: serverTimestamp() }, { merge:true });
  }
}

// ====================== UI: site chips + search results ======================
const siteChips = $("siteChips");
const results = $("results");
const qInp = $("q");
const btnSearch = $("btnSearch");
const btnClearResults = $("btnClearResults");

let selectedSites = new Set(SITES.map(s=>s.key)); // default all selected

function renderChips(){
  siteChips.innerHTML = "";
  SITES.forEach(s=>{
    const b = document.createElement("button");
    b.className = "chip " + (selectedSites.has(s.key) ? "active":"");
    b.type = "button";
    b.innerHTML = `<span class="dot"></span> ${s.name}`;
    b.onclick = ()=>{
      if(selectedSites.has(s.key)) selectedSites.delete(s.key);
      else selectedSites.add(s.key);
      renderChips();
    };
    siteChips.appendChild(b);
  });
}

function openUrl(url){
  window.open(url, "_blank", "noopener,noreferrer");
}

function copyText(text){
  navigator.clipboard?.writeText(text).catch(()=>{});
}

// ====================== Favorites state ======================
let favoritesCache = []; // from firestore
let lastResults = [];    // current results list

async function loadFavorites(){
  if(!currentUser) return;
  const qs = query(favCol(currentUser.uid), orderBy("createdAt", "desc"));
  const snap = await getDocs(qs);
  const arr = [];
  snap.forEach(d=>{
    arr.push({ id:d.id, ...d.data() });
  });
  favoritesCache = arr;
  renderFavorites();
}

function isSiteFaved(fav, siteKey){
  return !!fav?.sites?.[siteKey]?.faved;
}

function getFavSiteUrl(fav, siteKey){
  return fav?.sites?.[siteKey]?.url || "";
}

function getLastPrice(fav){
  // history last item price
  const h = Array.isArray(fav.history) ? fav.history : [];
  if(h.length===0) return null;
  const p = Number(h[h.length-1]?.price);
  return isFinite(p) ? p : null;
}

function sortFavoritesByPrice(){
  favoritesCache.sort((a,b)=>{
    const pa = getLastPrice(a);
    const pb = getLastPrice(b);
    if(pa==null && pb==null) return 0;
    if(pa==null) return 1;
    if(pb==null) return -1;
    return pa - pb;
  });
  renderFavorites();
}

async function addOrUpdateFavoriteFromResult(siteKey, name, url){
  if(!currentUser) return;

  // Aynı isimli favori varsa onu güncelle, yoksa ekle
  const existing = favoritesCache.find(f => (f.name||"").toLowerCase() === (name||"").toLowerCase());
  if(existing){
    const newSites = structuredClone(existing.sites || {});
    newSites[siteKey] = { url, faved:true };
    // diğer siteleri bozma
    await updateDoc(doc(db, "users", currentUser.uid, "favorites", existing.id), {
      sites: newSites
    });
  }else{
    const sitesObj = {};
    SITES.forEach(s => sitesObj[s.key] = { url:"", faved:false });
    sitesObj[siteKey] = { url, faved:true };

    await addDoc(favCol(currentUser.uid), {
      name,
      createdAt: serverTimestamp(),
      sites: sitesObj,
      history: [] // fiyat geçmişi (manuel girince dolar)
    });
  }
  await loadFavorites();
}

async function deleteFavorite(favId){
  await deleteDoc(doc(db, "users", currentUser.uid, "favorites", favId));
  await loadFavorites();
}

async function clearAllFavorites(){
  const snap = await getDocs(favCol(currentUser.uid));
  const dels = [];
  snap.forEach(d => dels.push(deleteDoc(d.ref)));
  await Promise.all(dels);
  await loadFavorites();
}

async function addPricePoint(fav, price){
  const p = Number(price);
  if(!isFinite(p) || p<=0) return;

  const date = todayKey();
  const h = Array.isArray(fav.history) ? [...fav.history] : [];
  // Aynı gün varsa güncelle
  const idx = h.findIndex(x => x?.date === date);
  if(idx>=0) h[idx] = { date, price:p };
  else h.push({ date, price:p });

  const newH = clampHistory(h, 240);

  await updateDoc(doc(db, "users", currentUser.uid, "favorites", fav.id), {
    history: newH
  });

  // %5+ düşüş kontrolü: son 2 kaydı kıyasla
  if(newH.length >= 2){
    const prev = Number(newH[newH.length-2].price);
    const cur = Number(newH[newH.length-1].price);
    if(isFinite(prev) && prev>0 && isFinite(cur)){
      const pct = ((prev-cur)/prev)*100;
      if(pct >= 5){
        notify(`%${pct.toFixed(1)} düşüş`, `${fav.name} fiyatı ${moneyTry(prev)} → ${moneyTry(cur)}`);
      }
    }
  }

  await loadFavorites();
}

// ====================== Notification ======================
$("btnNotifPerm").onclick = async () => {
  if(!("Notification" in window)) return alert("Bildirim desteklenmiyor.");
  const perm = await Notification.requestPermission();
  if(perm !== "granted") alert("Bildirim izni verilmedi.");
  else alert("Bildirim izni verildi ✅");
};

function notify(title, body){
  if(!("Notification" in window)) return;
  if(Notification.permission !== "granted") return;
  try{
    new Notification(title, { body });
  }catch(_){}
}

// ====================== Results rendering ======================
function renderResults(list){
  results.innerHTML = "";
  if(!list.length){
    results.innerHTML = `<div class="muted">Seçili sitelerle sonuç yok.</div>`;
    return;
  }

  list.forEach(item=>{
    const row = document.createElement("div");
    row.className = "resRow";

    const left = document.createElement("div");
    left.className = "resLeft";
    left.innerHTML = `
      <div class="resTitle">${item.siteName}</div>
      <div class="resSub">${item.name}</div>
    `;

    const btns = document.createElement("div");
    btns.className = "resBtns";

    const openBtn = document.createElement("button");
    openBtn.className = "smallBtn open";
    openBtn.textContent = "Aç";
    openBtn.onclick = ()=> openUrl(item.url);

    const favBtn = document.createElement("button");
    const isFavedNow = favoritesCache.some(f =>
      (f.name||"").toLowerCase() === (item.name||"").toLowerCase() && isSiteFaved(f, item.siteKey)
    );

    favBtn.className = "smallBtn " + (isFavedNow ? "faved":"fav");
    favBtn.textContent = isFavedNow ? "❤️ Eklendi" : "Favori Ekle";
    favBtn.onclick = async ()=>{
      await addOrUpdateFavoriteFromResult(item.siteKey, item.name, item.url);
      // tekrar çiz
      const newIsFaved = true;
      favBtn.className = "smallBtn faved";
      favBtn.textContent = "❤️ Eklendi";
    };

    btns.appendChild(openBtn);
    btns.appendChild(favBtn);

    row.appendChild(left);
    row.appendChild(btns);
    results.appendChild(row);
  });
}

btnSearch.onclick = async () => {
  const text = qInp.value.trim();
  if(!text) return;

  // Favoriler cache güncel değilse önce çek
  await loadFavorites();

  const list = [];
  [...selectedSites].forEach(siteKey=>{
    const site = SITES.find(s=>s.key===siteKey);
    const url = buildSearchUrl(siteKey, text);
    list.push({
      siteKey,
      siteName: site?.name || siteKey,
      name: text,
      url
    });
  });

  lastResults = list;
  renderResults(list);
};

btnClearResults.onclick = () => {
  lastResults = [];
  results.innerHTML = `<div class="muted">Henüz arama yapılmadı.</div>`;
};

// ====================== Favorites rendering + UI tidy ======================
const favList = $("favList");
$("btnRefreshFav").onclick = loadFavorites;
$("btnClearFav").onclick = () => {
  if(confirm("Tüm favoriler silinsin mi?")) clearAllFavorites();
};
$("btnSortFav").onclick = sortFavoritesByPrice;

function renderFavorites(){
  favList.innerHTML = "";
  if(!favoritesCache.length){
    favList.innerHTML = `<div class="muted">Favori yok.</div>`;
    return;
  }

  favoritesCache.forEach(fav=>{
    const card = document.createElement("div");
    card.className = "favCard";

    const lastP = getLastPrice(fav);

    // hangi siteler faved?
    const favedSites = SITES
      .filter(s=> isSiteFaved(fav, s.key))
      .map(s=> s.name);

    const top = document.createElement("div");
    top.className = "favTop";
    top.innerHTML = `
      <div>
        <div class="favName">${fav.name || "Ürün"}</div>
        <div class="favMeta">
          ${favedSites.length ? `Favorili siteler: <b>${favedSites.join(", ")}</b>` : `Henüz site seçilmedi.`}
        </div>
      </div>
      <div style="text-align:right">
        <div class="badge">${lastP==null ? "Fiyat yok" : moneyTry(lastP)}</div>
      </div>
    `;

    // site butonları: sadece favorili olanlar üstte
    const pills = document.createElement("div");
    pills.className = "pillsRow";

    // Site aç + copy (küçük, karışıklık yok)
    SITES.forEach(s=>{
      if(!isSiteFaved(fav, s.key)) return;

      const url = getFavSiteUrl(fav, s.key);
      const openB = document.createElement("button");
      openB.className = "pill site";
      openB.textContent = `${s.name} Aç`;
      openB.onclick = ()=> url ? openUrl(url) : alert("URL yok (bu site için).");

      const copyB = document.createElement("button");
      copyB.className = "pill copy";
      copyB.textContent = "Copy Link";
      copyB.onclick = ()=>{
        if(!url) return alert("URL yok.");
        copyText(url);
        alert("Kopyalandı ✅");
      };

      pills.appendChild(openB);
      pills.appendChild(copyB);
    });

    // fiyat ekle / sil
    const priceB = document.createElement("button");
    priceB.className = "pill price";
    priceB.textContent = "Fiyat ekle";
    priceB.onclick = async ()=>{
      const v = prompt("Bugünkü fiyatı gir (sadece sayı):");
      if(v==null) return;
      await addPricePoint(fav, v);
    };

    const delB = document.createElement("button");
    delB.className = "pill del";
    delB.textContent = "Sil";
    delB.onclick = ()=> {
      if(confirm("Bu favori silinsin mi?")) deleteFavorite(fav.id);
    };

    pills.appendChild(priceB);
    pills.appendChild(delB);

    // mini chart
    const chart = document.createElement("div");
    chart.className = "chartWrap";
    const h = Array.isArray(fav.history) ? fav.history : [];
    const hint = h.length < 2 ? "Grafik için en az 2 fiyat kaydı" : `${h.length} kayıt`;

    chart.innerHTML = `
      <div class="chartHdr">
        <div class="chartTitle">Fiyat grafiği</div>
        <div class="chartHint">${hint}</div>
      </div>
      <canvas height="90"></canvas>
      <div class="muted subtle" style="margin-top:8px">
        İpucu: Uygulamaya girince “Fiyat ekle” ile günlük fiyat girersen zamanla veri oluşur.
      </div>
    `;

    card.appendChild(top);
    card.appendChild(pills);
    card.appendChild(chart);

    favList.appendChild(card);

    // draw after attach
    const canvas = chart.querySelector("canvas");
    drawMiniChart(canvas, h);
  });
}

function drawMiniChart(canvas, history){
  const ctx = canvas.getContext("2d");
  const w = canvas.width = canvas.parentElement.clientWidth - 22; // padding compensate
  const h = canvas.height = 90;

  ctx.clearRect(0,0,w,h);

  const pts = (Array.isArray(history) ? history : [])
    .map(x => ({ t: x.date, p: Number(x.price) }))
    .filter(x => isFinite(x.p));

  if(pts.length < 2){
    // placeholder line
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.moveTo(10, h/2);
    ctx.lineTo(w-10, h/2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    return;
  }

  const minP = Math.min(...pts.map(x=>x.p));
  const maxP = Math.max(...pts.map(x=>x.p));
  const pad = 10;

  const xOf = (i)=> pad + (i*(w-2*pad)/(pts.length-1));
  const yOf = (p)=>{
    if(maxP===minP) return h/2;
    const t = (p - minP) / (maxP - minP);
    return (h-pad) - t*(h-2*pad);
  };

  // line
  ctx.beginPath();
  ctx.moveTo(xOf(0), yOf(pts[0].p));
  for(let i=1;i<pts.length;i++){
    ctx.lineTo(xOf(i), yOf(pts[i].p));
  }
  ctx.lineWidth = 2;
  ctx.stroke();

  // dots
  for(let i=0;i<pts.length;i++){
    ctx.beginPath();
    ctx.arc(xOf(i), yOf(pts[i].p), 2.6, 0, Math.PI*2);
    ctx.fill();
  }
}

// ====================== AI Demo ======================
const aiBox = $("aiBox");
$("btnAiToggle").onclick = ()=>{
  aiBox.classList.toggle("hidden");
};
$("btnAiRun").onclick = ()=>{
  const prov = $("aiProvider").value;
  const key = $("aiKey").value || "";
  const prompt = $("aiPrompt").value || "";
  localStorage.setItem("ai_provider", prov);
  localStorage.setItem("ai_key", key);

  // Demo: gerçek API çağrısı yok
  $("aiOut").className = "msg";
  $("aiOut").textContent =
    `Demo mod: "${prompt}" için gerçek API çağrısı yapılmadı.\n` +
    `İstersen sonraki adımda Render backend ile OpenAI/Gemini proxy yaparız.`;
};

(function restoreAi(){
  const p = localStorage.getItem("ai_provider") || "demo";
  const k = localStorage.getItem("ai_key") || "";
  $("aiProvider").value = p;
  $("aiKey").value = k;
})();

// ====================== Auth state + boot ======================
renderChips();

onAuthStateChanged(auth, async (u)=>{
  currentUser = u;

  if(!u){
    authOverlay.classList.remove("hidden");
    return;
  }

  // Email doğrulama kontrolü (Google ile girişte true olur)
  if(u.providerData?.some(p=>p.providerId==="password") && !u.emailVerified){
    authOverlay.classList.remove("hidden");
    toast(authMsg, "Mail doğrulaması gerekli. Mailini doğrula sonra giriş yap.", "err");
    return;
  }

  authOverlay.classList.add("hidden");
  await ensureUserDoc(u);
  await loadFavorites();
});
