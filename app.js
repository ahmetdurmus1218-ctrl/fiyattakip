// Firebase CDN (GitHub Pages için doğru yol)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth, onAuthStateChanged,
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  sendEmailVerification, sendPasswordResetEmail, reload, signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirestore, collection, doc, setDoc, getDocs, deleteDoc,
  query, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

// ✅ Senin config’in
const firebaseConfig = {
  apiKey: "AIzaSyBcXkVFQzB2XtxO7wqnbXhzM1Io54zCsBI",
  authDomain: "fiyattakip-ttoxub.firebaseapp.com",
  projectId: "fiyattakip-ttoxub",
  storageBucket: "fiyattakip-ttoxub.firebasestorage.app",
  messagingSenderId: "105868725844",
  appId: "1:105868725844:web:fc04f5a08e708916e727c1"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// -------------------- helpers --------------------
const $ = (id) => document.getElementById(id);
const LS = {
  get(k, d=""){ return localStorage.getItem(k) ?? d; },
  set(k, v){ localStorage.setItem(k, v); }
};
function toast(msg){
  const d = document.createElement("div");
  d.textContent = msg;
  d.style.position="fixed"; d.style.left="50%"; d.style.bottom="22px";
  d.style.transform="translateX(-50%)";
  d.style.background="#111827"; d.style.color="#fff";
  d.style.padding="10px 14px"; d.style.borderRadius="14px";
  d.style.boxShadow="0 10px 25px rgba(0,0,0,.25)";
  d.style.zIndex="9999"; d.style.fontWeight="900"; d.style.maxWidth="92vw";
  document.body.appendChild(d);
  setTimeout(()=>{ d.style.opacity="0"; d.style.transition="opacity .25s"; }, 1600);
  setTimeout(()=> d.remove(), 2000);
}
function enc(x){ return encodeURIComponent(x); }
function parseNum(x){
  const s = String(x ?? "").replace(",", ".").replace(/[^\d.]/g,"");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}
function pctDrop(oldP, newP){
  if(!oldP || oldP<=0) return 0;
  return ((oldP - newP) / oldP) * 100;
}
function sixMonthsAgo(){ return Date.now() - 180*24*60*60*1000; }
function min6(history, excludeLast=false){
  const cut = sixMonthsAgo();
  const arr = (history||[]).filter(h=>h.t>=cut);
  const arr2 = excludeLast ? arr.slice(0, Math.max(0, arr.length-1)) : arr;
  if(arr2.length===0) return null;
  return arr2.reduce((m,x)=>Math.min(m,x.price), Infinity);
}

// -------------------- sites --------------------
const SITES = [
  { id:"trendyol", name:"Trendyol",
    url:(q)=>`https://www.trendyol.com/sr?q=${enc(q)}`,
    cheap:(q)=>`https://www.trendyol.com/sr?q=${enc(q)}&sst=PRICE_BY_ASC`
  },
  { id:"hb", name:"Hepsiburada",
    url:(q)=>`https://www.hepsiburada.com/ara?q=${enc(q)}`,
    cheap:(q)=>`https://www.hepsiburada.com/ara?q=${enc(q)}&sorting=price-asc`
  },
  { id:"n11", name:"N11",
    url:(q)=>`https://www.n11.com/arama?q=${enc(q)}`,
    cheap:(q)=>`https://www.n11.com/arama?q=${enc(q)}&srt=PRICE_LOW`
  },
  { id:"amazon", name:"Amazon TR",
    url:(q)=>`https://www.amazon.com.tr/s?k=${enc(q)}`,
    cheap:(q)=>`https://www.amazon.com.tr/s?k=${enc(q)}&s=price-asc-rank`
  },
  { id:"pazarama", name:"Pazarama",
    url:(q)=>`https://www.pazarama.com/arama?q=${enc(q)}`,
    cheap:(q)=>`https://www.pazarama.com/arama?q=${enc(q)}&sort=price_asc`
  },
  { id:"ciceksepeti", name:"ÇiçekSepeti",
    url:(q)=>`https://www.ciceksepeti.com/arama?query=${enc(q)}`,
    cheap:(q)=>`https://www.ciceksepeti.com/arama?query=${enc(q)}&sort=PRICE_ASC`
  },
  { id:"idefix", name:"İdefix",
    url:(q)=>`https://www.idefix.com/search?q=${enc(q)}`,
    cheap:(q)=>`https://www.idefix.com/search?q=${enc(q)}&sort=price-asc`
  },
];

const LS_SITES = "ft_sites";
let selectedSites = JSON.parse(LS.get(LS_SITES, "null")) ?? SITES.map(s=>s.id);

// -------------------- firebase paths --------------------
const favCol = (uid)=>collection(db,"users",uid,"favorites");
const alertCol = (uid)=>collection(db,"users",uid,"alerts");

// -------------------- state --------------------
let user = null;
let results = [];
let favorites = [];
let alerts = [];

// -------------------- auth ui --------------------
const authOverlay = $("authOverlay");
const authMsg = $("authMsg");
const paneLogin = $("paneLogin");
const paneReg = $("paneReg");
const paneVer = $("paneVer");

function setAuthTab(which){
  $("tabLogin").classList.toggle("active", which==="login");
  $("tabReg").classList.toggle("active", which==="reg");
  $("tabVer").classList.toggle("active", which==="ver");
  paneLogin.style.display = which==="login" ? "block" : "none";
  paneReg.style.display = which==="reg" ? "block" : "none";
  paneVer.style.display = which==="ver" ? "block" : "none";
  $("authTitle").textContent = which==="login" ? "Giriş" : which==="reg" ? "Kayıt" : "Email Doğrulama";
  authMsg.textContent = "";
}
$("tabLogin").onclick = ()=>setAuthTab("login");
$("tabReg").onclick = ()=>setAuthTab("reg");
$("tabVer").onclick = ()=>setAuthTab("ver");

async function openAuth(which){
  authOverlay.classList.add("open");
  setAuthTab(which);
}
function closeAuth(){ authOverlay.classList.remove("open"); authMsg.textContent=""; }

$("loginGo").onclick = async ()=>{
  try{
    const email = $("loginEmail").value.trim();
    const pass = $("loginPass").value;
    if(!email || !pass) throw new Error("Email ve şifre gir.");
    await signInWithEmailAndPassword(auth, email, pass);
    authMsg.textContent = "Giriş başarılı…";
  }catch(e){ authMsg.textContent = e?.message || "Giriş hatası"; }
};
$("regGo").onclick = async ()=>{
  try{
    const email = $("regEmail").value.trim();
    const pass = $("regPass").value;
    if(!email || !pass) throw new Error("Email ve şifre gir.");
    const cred = await createUserWithEmailAndPassword(auth, email, pass);
    await sendEmailVerification(cred.user);
    authMsg.textContent = "Kayıt tamam. Doğrulama maili gönderildi.";
    setAuthTab("ver");
  }catch(e){ authMsg.textContent = e?.message || "Kayıt hatası"; }
};
$("resetGo").onclick = async ()=>{
  try{
    const email = $("loginEmail").value.trim();
    if(!email) throw new Error("Email yaz.");
    await sendPasswordResetEmail(auth, email);
    authMsg.textContent = "Şifre sıfırlama maili gönderildi.";
  }catch(e){ authMsg.textContent = e?.message || "Hata"; }
};
$("resendGo").onclick = async ()=>{
  try{
    if(!auth.currentUser) throw new Error("Önce giriş yap.");
    await sendEmailVerification(auth.currentUser);
    authMsg.textContent = "Mail tekrar gönderildi.";
  }catch(e){ authMsg.textContent = e?.message || "Hata"; }
};
$("checkVerGo").onclick = async ()=>{
  try{
    if(!auth.currentUser) throw new Error("Önce giriş yap.");
    await reload(auth.currentUser);
    if(auth.currentUser.emailVerified){
      authMsg.textContent = "Doğrulandı ✅";
      closeAuth();
    }else{
      authMsg.textContent = "Henüz doğrulanmamış. Maildeki linke tıkla, sonra tekrar dene.";
    }
  }catch(e){ authMsg.textContent = e?.message || "Hata"; }
};

$("logoutBtn").onclick = async ()=>{
  try{ await signOut(auth); toast("Çıkış yapıldı"); }
  catch{ toast("Çıkış hatası"); }
};

// -------------------- firestore load/save --------------------
async function loadUserData(uid){
  favorites = [];
  const fq = query(favCol(uid), orderBy("createdAt","desc"));
  const fs = await getDocs(fq);
  fs.forEach(d=>{
    const x = d.data();
    favorites.push({
      id:d.id,
      title:x.title,
      query:x.query,
      createdAt: x.createdAtMs ?? Date.now(),
      links: x.links || {}
    });
  });

  alerts = [];
  const aq = query(alertCol(uid), orderBy("createdAt","desc"));
  const as = await getDocs(aq);
  as.forEach(d=>{
    const x = d.data();
    alerts.push({
      id:d.id,
      title:x.title,
      url:x.url,
      minPct: x.minPct ?? 5,
      history: x.history || [],
      createdAt: x.createdAtMs ?? Date.now(),
      lastCheckedAt: x.lastCheckedAt ?? 0,
      lastNotifiedAt: x.lastNotifiedAt ?? 0
    });
  });

  renderFavorites();
  renderAlerts();
}

async function saveFav(f){
  const uid = user?.uid; if(!uid) return;
  await setDoc(doc(db,"users",uid,"favorites",f.id),{
    title:f.title, query:f.query, links:f.links,
    createdAt: serverTimestamp(), createdAtMs:f.createdAt
  },{merge:true});
}
async function delFav(id){
  const uid = user?.uid; if(!uid) return;
  await deleteDoc(doc(db,"users",uid,"favorites",id));
}
async function saveAlert(a){
  const uid = user?.uid; if(!uid) return;
  await setDoc(doc(db,"users",uid,"alerts",a.id),{
    title:a.title, url:a.url, minPct:a.minPct,
    history:a.history || [],
    createdAt: serverTimestamp(), createdAtMs:a.createdAt,
    lastCheckedAt:a.lastCheckedAt||0, lastNotifiedAt:a.lastNotifiedAt||0
  },{merge:true});
}
async function delAlert(id){
  const uid = user?.uid; if(!uid) return;
  await deleteDoc(doc(db,"users",uid,"alerts",id));
}

// -------------------- UI render: sites --------------------
function renderSites(){
  const host = $("siteList");
  host.innerHTML = "";
  SITES.forEach(s=>{
    const b = document.createElement("div");
    b.className = "chip" + (selectedSites.includes(s.id) ? " active":"");
    b.textContent = s.name;
    b.onclick = ()=>{
      if(selectedSites.includes(s.id)) selectedSites = selectedSites.filter(x=>x!==s.id);
      else selectedSites.push(s.id);
      if(selectedSites.length===0) selectedSites=[s.id];
      LS.set(LS_SITES, JSON.stringify(selectedSites));
      renderSites();
    };
    host.appendChild(b);
  });
}

// -------------------- Search / Results --------------------
function makeResults(q){
  const sites = SITES.filter(s=>selectedSites.includes(s.id));
  return sites.map(s=>({
    id: crypto.randomUUID(),
    query:q,
    siteName:s.name,
    url:s.url(q),
    cheapUrl:s.cheap(q),
  }));
}
function renderResults(){
  const host = $("results");
  host.innerHTML = "";
  if(results.length===0){
    host.innerHTML = `<p class="muted">Henüz arama yapılmadı.</p>`;
    return;
  }
  results.forEach(r=>{
    const row = document.createElement("div");
    row.className = "item";
    row.innerHTML = `
      <div class="left">
        <p class="title">${r.siteName}</p>
        <p class="small">Arama: <b>${r.query}</b></p>
      </div>
      <div class="acts">
        <button class="btnGhost ok">Aç</button>
        <button class="btnGhost ok">En Ucuz Aç</button>
      </div>
    `;
    row.querySelectorAll("button")[0].onclick = ()=>window.open(r.url,"_blank");
    row.querySelectorAll("button")[1].onclick = ()=>window.open(r.cheapUrl,"_blank");
    host.appendChild(row);
  });
}

$("searchBtn").onclick = ()=>{
  const q = $("q").value.trim();
  if(!q) return toast("Ürün adı yaz.");
  results = makeResults(q);
  renderResults();
};
$("clearResultsBtn").onclick = ()=>{ results=[]; renderResults(); };

$("openCheapestAll").onclick = ()=>{
  const q = $("q").value.trim();
  if(!q) return toast("Ürün adı yaz.");
  const items = makeResults(q);
  items.forEach((it,i)=> setTimeout(()=>window.open(it.cheapUrl,"_blank"), i*220));
};

function buildLinks(queryText){
  const map = {};
  SITES.forEach(s=> map[s.id] = { normal:s.url(queryText), cheap:s.cheap(queryText) });
  return map;
}

$("addFavBtn").onclick = async ()=>{
  if(!user) return openAuth("login");
  if(!user.emailVerified) return openAuth("ver");
  const q = $("q").value.trim();
  if(!q) return toast("Ürün adı yaz.");
  if(favorites.some(f=>f.query===q)) return toast("Zaten favorilerde.");
  const f = { id: crypto.randomUUID(), title:q, query:q, createdAt:Date.now(), links: buildLinks(q) };
  favorites.unshift(f);
  renderFavorites();
  toast("Favoriye eklendi ✅");
  await saveFav(f);
};

// -------------------- Favorites UI --------------------
async function copyText(text){
  try{ await navigator.clipboard.writeText(text); toast("Kopyalandı ✅"); }
  catch{
    const ta=document.createElement("textarea");
    ta.value=text; document.body.appendChild(ta);
    ta.select(); document.execCommand("copy"); ta.remove();
    toast("Kopyalandı ✅");
  }
}

function renderFavorites(){
  const host = $("favorites");
  host.innerHTML = "";
  if(!user){ host.innerHTML=`<p class="muted">Favoriler için giriş yap.</p>`; return; }
  if(!user.emailVerified){ host.innerHTML=`<p class="muted">Email doğrula.</p>`; return; }
  if(favorites.length===0){ host.innerHTML=`<p class="muted">Favori yok.</p>`; return; }

  favorites.forEach(f=>{
    const links = f.links || buildLinks(f.query);
    const row = document.createElement("div");
    row.className = "item";
    row.innerHTML = `
      <div class="left">
        <p class="title">${f.title}</p>
        <p class="small">${new Date(f.createdAt).toLocaleString()}</p>
      </div>
      <div class="acts">
        <button class="btnGhost ok">Trendyol</button>
        <button class="btnGhost ok">HB</button>
        <button class="btnGhost ok">N11</button>
        <button class="btnGhost ok">Amazon</button>
        <button class="btnGhost">Copy</button>
        <button class="btnGhost danger">Sil</button>
      </div>
    `;
    const btns = row.querySelectorAll("button");
    btns[0].onclick = ()=>window.open(links.trendyol?.cheap || links.trendyol?.normal,"_blank");
    btns[1].onclick = ()=>window.open(links.hb?.cheap || links.hb?.normal,"_blank");
    btns[2].onclick = ()=>window.open(links.n11?.cheap || links.n11?.normal,"_blank");
    btns[3].onclick = ()=>window.open(links.amazon?.cheap || links.amazon?.normal,"_blank");
    btns[4].onclick = ()=>copyText(links.trendyol?.normal || f.query);
    btns[5].onclick = async ()=>{
      favorites = favorites.filter(x=>x.id!==f.id);
      renderFavorites();
      await delFav(f.id);
    };
    host.appendChild(row);
  });
}

$("clearFavBtn").onclick = async ()=>{
  if(!user) return openAuth("login");
  if(!user.emailVerified) return openAuth("ver");
  if(!confirm("Tüm favoriler silinsin mi?")) return;
  for(const f of favorites) await delFav(f.id);
  favorites = [];
  renderFavorites();
  toast("Silindi.");
};

// -------------------- Alerts --------------------
async function ensureNotif(){
  if(!("Notification" in window)) { toast("Bildirim desteklenmiyor."); return false; }
  if(Notification.permission==="granted") return true;
  const p = await Notification.requestPermission();
  return p==="granted";
}
async function notify(title, body){
  const ok = await ensureNotif();
  if(!ok) return;
  try{ new Notification(title,{body}); }catch{ toast(body); }
}

$("notifBtn").onclick = ensureNotif;

$("addAlertBtn").onclick = async ()=>{
  if(!user) return openAuth("login");
  if(!user.emailVerified) return openAuth("ver");

  const title = $("alertTitle").value.trim();
  const url = $("alertUrl").value.trim();
  const cur = parseNum($("alertCurrent").value.trim());
  const minPct = parseNum($("alertMinPct").value.trim()) ?? 5;

  if(!title || !url || cur==null) return toast("Ürün adı + link + fiyat gir.");
  const a = {
    id: crypto.randomUUID(),
    title, url,
    minPct: Math.max(0, Math.min(100, minPct)),
    history:[{t:Date.now(), price:cur}],
    createdAt:Date.now(),
    lastCheckedAt:0,
    lastNotifiedAt:0
  };
  alerts.unshift(a);
  renderAlerts();
  toast("Uyarı eklendi 🔔");
  await saveAlert(a);
};

$("checkBtn").onclick = async ()=>{
  if(!user) return openAuth("login");
  if(!user.emailVerified) return openAuth("ver");
  const now = Date.now();
  for(const a of alerts){
    a.lastCheckedAt = now;
    await saveAlert(a);
  }
  renderAlerts();
  toast("Kontrol yapıldı.");
};

async function updateAlertPrice(id, newPrice){
  const now = Date.now();
  alerts = alerts.map(a=>{
    if(a.id!==id) return a;
    const hist = Array.isArray(a.history) ? a.history.slice() : [];
    const prev = hist.length ? hist[hist.length-1].price : null;
    hist.push({t:now, price:newPrice});
    a.history = hist;

    // %5 altı sayma, %5+ bildir
    if(prev!=null){
      const drop = pctDrop(prev, newPrice);
      const thresh = a.minPct ?? 5;
      const prevMin = min6(hist, true);
      const isNewLow = (prevMin!=null) ? newPrice < prevMin : false;
      const extraLowPct = (isNewLow && prevMin!=null) ? pctDrop(prevMin, newPrice) : 0;

      if(drop >= thresh && (now - (a.lastNotifiedAt||0) > 60*60*1000)){
        a.lastNotifiedAt = now;
        let msg = `${a.title}: %${drop.toFixed(1)} indirim (${prev} → ${newPrice})`;
        if(isNewLow){
          msg += ` • 6 ayın en düşüğü! (Önceki min ${prevMin} → ${newPrice}, ek %${extraLowPct.toFixed(1)})`;
        }
        notify("Fiyat düştü ✅", msg);
      }
    }
    return a;
  });

  renderAlerts();
  const a = alerts.find(x=>x.id===id);
  if(a) await saveAlert(a);
}

function renderAlerts(){
  const host = $("alerts");
  host.innerHTML = "";
  if(!user){ host.innerHTML=`<p class="muted">Uyarılar için giriş yap.</p>`; return; }
  if(!user.emailVerified){ host.innerHTML=`<p class="muted">Email doğrula.</p>`; return; }
  if(alerts.length===0){ host.innerHTML=`<p class="muted">Uyarı yok.</p>`; return; }

  alerts.forEach(a=>{
    const hist = a.history || [];
    const last = hist.length ? hist[hist.length-1].price : null;
    const prev = hist.length>1 ? hist[hist.length-2].price : null;
    const drop = (prev!=null && last!=null) ? pctDrop(prev,last) : 0;
    const prevMin = min6(hist, true);
    const isNewLow = (prevMin!=null && last!=null) ? last < prevMin : false;

    const row = document.createElement("div");
    row.className = "item";
    row.innerHTML = `
      <div class="left">
        <p class="title">${a.title}</p>
        <p class="small">${a.url}</p>
        <p class="small">Son: <b>${last ?? "-"}</b> • Eşik: <b>%${a.minPct ?? 5}</b> • Son değişim: <b>%${drop.toFixed(1)}</b></p>
        <p class="small">${isNewLow ? "✅ 6 ayın en düşüğü!" : `6 ay min: ${prevMin ?? "-"}`}</p>
      </div>
      <div class="acts">
        <button class="btnGhost ok">Aç</button>
        <button class="btnGhost">Fiyat Güncelle</button>
        <button class="btnGhost danger">Sil</button>
      </div>
    `;
    const btns = row.querySelectorAll("button");
    btns[0].onclick = ()=>window.open(a.url,"_blank");
    btns[1].onclick = async ()=>{
      const v = prompt("Yeni fiyat:", last!=null?String(last):"");
      if(v==null) return;
      const n = parseNum(v);
      if(n==null) return toast("Geçersiz fiyat");
      await updateAlertPrice(a.id, n);
      toast("Fiyat eklendi (geçmişe).");
    };
    btns[2].onclick = async ()=>{
      alerts = alerts.filter(x=>x.id!==a.id);
      renderAlerts();
      await delAlert(a.id);
    };
    host.appendChild(row);
  });
}

// -------------------- AI --------------------
const AI_KEY = "ft_ai_key";
const AI_PROVIDER = "ft_ai_provider";
const aiSheet = $("aiSheet");

$("aiBtn").onclick = ()=> aiSheet.classList.add("open");
$("aiClose").onclick = ()=> aiSheet.classList.remove("open");
aiSheet.addEventListener("click", (e)=>{ if(e.target===aiSheet) aiSheet.classList.remove("open"); });

$("saveAiKey").onclick = ()=>{
  LS.set(AI_KEY, ($("aiKey").value||"").trim());
  LS.set(AI_PROVIDER, $("aiProvider").value);
  $("aiStatus").textContent = "Key kaydedildi.";
  toast("AI key kaydedildi.");
};
$("fillExample").onclick = ()=>{
  $("aiPrompt").value = "Xiaomi Pad 7 256GB tablet en ucuz?";
  toast("Örnek dolduruldu.");
};

function aiPromptWrap(raw){
  return `Kullanıcının yazdığını tek satır ürün arama sorgusuna çevir.
Sadece sorguyu döndür, açıklama yazma.
Girdi: ${raw}
Çıktı:`.trim();
}

async function callGemini(apiKey, userText){
  const url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";
  const res = await fetch(url,{
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      "x-goog-api-key": apiKey
    },
    body: JSON.stringify({
      contents:[{role:"user", parts:[{text:userText}]}],
      generationConfig:{temperature:0.2, maxOutputTokens:120}
    })
  });
  if(!res.ok) throw new Error(await res.text());
  const data = await res.json();
  const text = data?.candidates?.[0]?.content?.parts?.map(p=>p.text).join("") ?? "";
  return String(text).trim();
}

async function aiToSearch(){
  const provider = $("aiProvider").value;
  const key = ($("aiKey").value || LS.get(AI_KEY,"")).trim();
  const raw = ($("aiPrompt").value || "").trim();
  if(!key) throw new Error("AI key boş.");
  if(!raw) throw new Error("AI prompt boş.");
  $("aiStatus").textContent = "AI çalışıyor…";

  if(provider==="gemini"){
    const out = await callGemini(key, aiPromptWrap(raw));
    $("aiStatus").textContent = "AI hazır ✅";
    return out;
  }

  $("aiStatus").textContent = "OpenAI tarayıcıda riskli. Backend önerilir.";
  throw new Error("OpenAI tarayıcıda kapalı. İstersen Render proxy ile açarız.");
}

$("aiFill").onclick = async ()=>{
  try{
    const text = await aiToSearch();
    $("q").value = text;
    toast("Arama dolduruldu.");
  }catch(e){
    $("aiStatus").textContent = e?.message || "AI hata";
    toast(e?.message || "AI hata");
  }
};
$("aiSearch").onclick = async ()=>{
  await $("aiFill").onclick();
  $("searchBtn").click();
};

// -------------------- init --------------------
renderSites();
renderResults();
renderFavorites();
renderAlerts();

// SW
if("serviceWorker" in navigator){
  navigator.serviceWorker.register("sw.js").catch(()=>{});
}

// -------------------- auth state --------------------
onAuthStateChanged(auth, async (u)=>{
  user = u || null;

  if(!user){
    $("banner").textContent = "Giriş yapmadın. Favori/Uyarı için giriş gerekli.";
    favorites = []; alerts = [];
    renderFavorites(); renderAlerts();
    await openAuth("login");
    return;
  }

  if(user && !user.emailVerified){
    $("banner").textContent = `Giriş: ${user.email} • Email doğrulaması gerekli`;
    favorites = []; alerts = [];
    renderFavorites(); renderAlerts();
    await openAuth("ver");
    return;
  }

  $("banner").textContent = `Giriş: ${user.email} ✅`;
  closeAuth();
  await loadUserData(user.uid);

  // AI restore
  $("aiKey").value = LS.get(AI_KEY,"");
  $("aiProvider").value = LS.get(AI_PROVIDER,"gemini");
  $("aiStatus").textContent = "AI hazır.";
});
