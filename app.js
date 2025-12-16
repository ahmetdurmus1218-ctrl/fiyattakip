// app.js (ESM)
import { auth, db } from "./firebase.js";
import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
  doc, getDoc, setDoc, updateDoc,
  collection, getDocs,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

/* -------------------- SİTELER -------------------- */
const SITES = [
  { id:"trendyol",    name:"Trendyol",     makeUrl:(q)=>`https://www.trendyol.com/sr?q=${encodeURIComponent(q)}` },
  { id:"hepsiburada", name:"Hepsiburada",  makeUrl:(q)=>`https://www.hepsiburada.com/ara?q=${encodeURIComponent(q)}` },
  { id:"n11",         name:"N11",          makeUrl:(q)=>`https://www.n11.com/arama?q=${encodeURIComponent(q)}` },
  { id:"amazontr",    name:"Amazon TR",    makeUrl:(q)=>`https://www.amazon.com.tr/s?k=${encodeURIComponent(q)}` },
  { id:"pazarama",    name:"Pazarama",     makeUrl:(q)=>`https://www.pazarama.com/arama?q=${encodeURIComponent(q)}` },
  { id:"cicek",       name:"ÇiçekSepeti",  makeUrl:(q)=>`https://www.ciceksepeti.com/arama?query=${encodeURIComponent(q)}` },
  { id:"idefix",      name:"Idefix",       makeUrl:(q)=>`https://www.idefix.com/arama/?q=${encodeURIComponent(q)}` },
];

/* -------------------- DOM -------------------- */
const el = (id)=>document.getElementById(id);
const siteChips = el("siteChips");
const qInput = el("q");
const btnSearch = el("btnSearch");
const btnClear = el("btnClear");
const results = el("results");
const favList = el("favList");
const suggestBox = el("suggest");

const btnLogout = el("btnLogout");
const btnRefreshFav = el("btnRefreshFav");
const btnClearAllFav = el("btnClearAllFav");

const priceModalBack = el("priceModalBack");
const pmClose = el("pmClose");
const pmSave = el("pmSave");
const pmProduct = el("pmProduct");
const pmSite = el("pmSite");
const pmPrice = el("pmPrice");

const bellModalBack = el("bellModalBack");
const btnBell = el("btnBell");
const bellClose = el("bellClose");
const bellPerm = el("bellPerm");

const aiModalBack = el("aiModalBack");
const btnAi = el("btnAi");
const aiClose = el("aiClose");
const aiRun = el("aiRun");
const aiKey = el("aiKey");
const aiPrompt = el("aiPrompt");
const aiOut = el("aiOut");

/* -------------------- STATE -------------------- */
let user = null;
let selectedSites = new Set(SITES.map(s=>s.id)); // default hepsi açık
let lastSearchRows = []; // {siteId, name, url}
let favorites = [];      // {id, product, sites:{siteId:{url, price?}}, createdAt}
let favIndex = new Map(); // key: product|siteId => true

let priceModalCtx = null; // {favId, siteId}

/* -------------------- FIREBASE DOC PATHS -------------------- */
const userDocRef = ()=>doc(db, "users", user.uid);
const favColRef = ()=>collection(db, "users", user.uid, "favorites");

/* -------------------- UTIL -------------------- */
function keyOf(product, siteId){ return `${product}||${siteId}`; }

function toast(msg){
  // basit toast
  const t = document.createElement("div");
  t.textContent = msg;
  t.style.position="fixed";
  t.style.left="50%";
  t.style.bottom="18px";
  t.style.transform="translateX(-50%)";
  t.style.background="#111827";
  t.style.color="#fff";
  t.style.padding="10px 12px";
  t.style.borderRadius="12px";
  t.style.zIndex="200";
  t.style.fontWeight="800";
  t.style.maxWidth="92vw";
  document.body.appendChild(t);
  setTimeout(()=>t.remove(), 1700);
}

async function copyText(text){
  try{
    await navigator.clipboard.writeText(text);
    toast("Kopyalandı");
  }catch{
    // fallback
    const ta=document.createElement("textarea");
    ta.value=text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
    toast("Kopyalandı");
  }
}

function openUrl(url){
  window.open(url, "_blank", "noopener,noreferrer");
}

/* -------------------- UI: CHIPS -------------------- */
function renderChips(){
  siteChips.innerHTML = "";
  for(const s of SITES){
    const chip = document.createElement("div");
    chip.className = "chip" + (selectedSites.has(s.id) ? " active" : "");
    chip.innerHTML = `<span class="dot"></span>${s.name}`;
    chip.onclick = ()=>{
      if(selectedSites.has(s.id)) selectedSites.delete(s.id);
      else selectedSites.add(s.id);
      renderChips();
    };
    siteChips.appendChild(chip);
  }
}

/* -------------------- ARAMA (SATIRLAR) -------------------- */
function buildSearchRows(query){
  const rows = [];
  for(const s of SITES){
    if(!selectedSites.has(s.id)) continue;
    rows.push({
      siteId: s.id,
      name: s.name,
      url: s.makeUrl(query),
      q: query,
    });
  }
  return rows;
}

function isFav(product, siteId){
  return favIndex.has(keyOf(product, siteId));
}

/* Arama satırlarında: Aç + Favori kalp */
function renderResults(rows){
  lastSearchRows = rows;

  if(!rows.length){
    results.innerHTML = `<div class="empty">Site seçmedin.</div>`;
    return;
  }

  results.innerHTML = "";
  rows.forEach(r=>{
    const card = document.createElement("div");
    card.className = "resultCard";
    card.innerHTML = `
      <div class="resultRow">
        <div>
          <div class="siteName">${r.name}</div>
          <div class="qSmall">${r.q}</div>
        </div>
        <div class="smallBtns">
          <button class="pill open">Aç</button>
          <button class="pill fav ${isFav(r.q,r.siteId) ? "on" : ""}">
            ${isFav(r.q,r.siteId) ? "❤️ Favoride" : "♡ Favori"}
          </button>
        </div>
      </div>
    `;

    const btnOpen = card.querySelector(".pill.open");
    const btnFav  = card.querySelector(".pill.fav");

    btnOpen.onclick = ()=>openUrl(r.url);

    btnFav.onclick = async ()=>{
      if(!user){ toast("Giriş gerekli"); return; }
      await addFavoriteFromRow(r);
      // UI güncelle
      btnFav.classList.add("on");
      btnFav.textContent = "❤️ Favoride";
    };

    results.appendChild(card);
  });
}

/* -------------------- FAVORİ EKLE (tek ürün içinde site birikir) -------------------- */
async function addFavoriteFromRow(row){
  // Aynı ürünün farklı site linkleri tek fav kartına toplansın:
  // Doc id: sanitize(product)
  const favId = sanitizeId(row.q);

  const ref = doc(db, "users", user.uid, "favorites", favId);
  const snap = await getDoc(ref);

  if(!snap.exists()){
    await setDoc(ref, {
      product: row.q,
      createdAt: serverTimestamp(),
      sites: {
        [row.siteId]: { url: row.url, lastPrice: null, history: [] }
      }
    });
  }else{
    const data = snap.data();
    const sites = data.sites || {};
    sites[row.siteId] = sites[row.siteId] || { url: row.url, lastPrice: null, history: [] };
    // url güncel kalsın
    sites[row.siteId].url = row.url;

    await updateDoc(ref, { sites });
  }

  // local state güncelle
  await loadFavorites();
}

/* -------------------- FAVORİLERİ OKU -------------------- */
async function loadFavorites(){
  favIndex.clear();
  favorites = [];

  const q = await getDocs(favColRef());
  q.forEach(d=>{
    const data = d.data();
    favorites.push({
      id: d.id,
      product: data.product,
      sites: data.sites || {},
    });

    for(const siteId of Object.keys(data.sites || {})){
      favIndex.set(keyOf(data.product, siteId), true);
    }
  });

  // alfabetik
  favorites.sort((a,b)=> (a.product||"").localeCompare(b.product||"", "tr"));

  renderFavorites();
  // arama satırlarında kalpleri güncellemek için:
  if(lastSearchRows.length) renderResults(lastSearchRows);
}

/* -------------------- FAVORİ KARTI UI -------------------- */
function renderFavorites(){
  if(!favorites.length){
    favList.innerHTML = `<div class="empty">Favori yok.</div>`;
    return;
  }

  favList.innerHTML = "";
  favorites.forEach(f=>{
    const card = document.createElement("div");
    card.className = "favBox";

    // En düşük/yüksek sıralama: fiyat varsa ona göre, yoksa site adına göre
    const entries = Object.entries(f.sites || {}).map(([siteId, obj])=>{
      const site = SITES.find(s=>s.id===siteId);
      return { siteId, siteName: site?.name || siteId, ...obj };
    });

    const priced = entries.filter(e=>typeof e.lastPrice === "number");
    const unpriced = entries.filter(e=>typeof e.lastPrice !== "number");

    priced.sort((a,b)=>a.lastPrice-b.lastPrice); // UCZDAN
    unpriced.sort((a,b)=>a.siteName.localeCompare(b.siteName, "tr"));

    const ordered = [...priced, ...unpriced];

    const anyPrice = priced.length ? `Ucuzdan: ${priced[0].siteName} (${priced[0].lastPrice}₺)` : "Fiyat yok";

    card.innerHTML = `
      <div class="favTitle">
        <div>
          <b>${escapeHtml(f.product)}</b>
        </div>
        <span class="badge ${priced.length ? "priceBadge":""}">${anyPrice}</span>
      </div>

      <div class="siteGrid"></div>

      <div class="controls">
        <button class="btn secondary" data-act="addPrice">Fiyat Ekle</button>
        <button class="dangerBtn" data-act="delFav">Sil</button>
      </div>

      <div class="graphHint">Grafik: fiyat geçmişi ekledikçe oluşur (en az 2 kayıt). Sonra mini grafik ekleriz.</div>
    `;

    const grid = card.querySelector(".siteGrid");

    ordered.forEach(e=>{
      // Her site için: "Site Aç" + "Copy Link"
      const openBtn = document.createElement("button");
      openBtn.className = "siteBtn";
      openBtn.textContent = `${e.siteName} Aç`;
      openBtn.onclick = ()=>openUrl(e.url);

      const copyBtn = document.createElement("button");
      copyBtn.className = "copyBtn";
      copyBtn.textContent = "Copy Link";
      copyBtn.onclick = ()=>copyText(e.url);

      grid.appendChild(openBtn);
      grid.appendChild(copyBtn);
    });

    const addPriceBtn = card.querySelector('[data-act="addPrice"]');
    const delFavBtn = card.querySelector('[data-act="delFav"]');

    addPriceBtn.onclick = ()=>{
      // Fiyat ekleme: önce site seçtireceğiz (en basit: ilk site)
      const firstSite = ordered[0];
      if(!firstSite){ toast("Site yok"); return; }
      openPriceModal(f.id, firstSite.siteId, f.product, firstSite.siteName);
    };

    delFavBtn.onclick = async ()=>{
      if(!confirm("Favori silinsin mi?")) return;
      await setDoc(doc(db,"users",user.uid,"favorites",f.id), {}, {merge:false});
      // Firestore delete yerine bu basit; ama en doğrusu deleteDoc.:
      // (burada deleteDoc kullanmadan da temizliyor, ama doc kalır)
      // Hızlı çözüm: update ile boş bırakmak yerine deleteDoc kullanalım:
      // (aşağıda gerçek delete kullanıyorum)
    };

    favList.appendChild(card);
  });

  // delete işlemini düzgün yapalım (tek tek)
  // (DOM render sonrası tekrar bağlamaya gerek yok, yukarıda confirm var ama deleteDoc yoktu)
}

/* -------------------- DELETE FAVORİ (DÜZGÜN) -------------------- */
import { deleteDoc } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

async function deleteFavorite(favId){
  await deleteDoc(doc(db,"users",user.uid,"favorites",favId));
  await loadFavorites();
}

/* renderFavorites içinde Sil butonunu düzeltelim */
function rerenderFavoritesWithDelete(){
  if(!favorites.length){
    favList.innerHTML = `<div class="empty">Favori yok.</div>`;
    return;
  }
  favList.innerHTML = "";
  favorites.forEach(f=>{
    const card = document.createElement("div");
    card.className = "favBox";

    const entries = Object.entries(f.sites || {}).map(([siteId, obj])=>{
      const site = SITES.find(s=>s.id===siteId);
      return { siteId, siteName: site?.name || siteId, ...obj };
    });

    const priced = entries.filter(e=>typeof e.lastPrice === "number");
    const unpriced = entries.filter(e=>typeof e.lastPrice !== "number");
    priced.sort((a,b)=>a.lastPrice-b.lastPrice);
    unpriced.sort((a,b)=>a.siteName.localeCompare(b.siteName, "tr"));
    const ordered = [...priced, ...unpriced];

    const anyPrice = priced.length ? `Ucuzdan: ${priced[0].siteName} (${priced[0].lastPrice}₺)` : "Fiyat yok";

    card.innerHTML = `
      <div class="favTitle">
        <div><b>${escapeHtml(f.product)}</b></div>
        <span class="badge ${priced.length ? "priceBadge":""}">${anyPrice}</span>
      </div>
      <div class="siteGrid"></div>
      <div class="controls">
        <button class="btn secondary" data-act="addPrice">Fiyat Ekle</button>
        <button class="dangerBtn" data-act="delFav">Sil</button>
      </div>
      <div class="graphHint">Grafik: fiyat geçmişi ekledikçe oluşur (en az 2 kayıt). Sonra mini grafik ekleriz.</div>
    `;

    const grid = card.querySelector(".siteGrid");
    ordered.forEach(e=>{
      const openBtn = document.createElement("button");
      openBtn.className = "siteBtn";
      openBtn.textContent = `${e.siteName} Aç`;
      openBtn.onclick = ()=>openUrl(e.url);

      const copyBtn = document.createElement("button");
      copyBtn.className = "copyBtn";
      copyBtn.textContent = "Copy Link";
      copyBtn.onclick = ()=>copyText(e.url);

      grid.appendChild(openBtn);
      grid.appendChild(copyBtn);
    });

    card.querySelector('[data-act="addPrice"]').onclick = ()=>{
      const firstSite = ordered[0];
      if(!firstSite){ toast("Site yok"); return; }
      openPriceModal(f.id, firstSite.siteId, f.product, firstSite.siteName);
    };

    card.querySelector('[data-act="delFav"]').onclick = async ()=>{
      if(!confirm("Favori silinsin mi?")) return;
      await deleteFavorite(f.id);
    };

    favList.appendChild(card);
  });
}

/* renderFavorites yerine bunu kullan */
function renderFavorites(){
  rerenderFavoritesWithDelete();
}

/* -------------------- FİYAT MODALI -------------------- */
function openPriceModal(favId, siteId, product, siteName){
  priceModalCtx = { favId, siteId };
  pmProduct.value = product;
  pmSite.value = siteName;
  pmPrice.value = "";
  priceModalBack.classList.add("show");
}

function closePriceModal(){
  priceModalBack.classList.remove("show");
  priceModalCtx = null;
}

pmClose.onclick = closePriceModal;
priceModalBack.onclick = (e)=>{ if(e.target===priceModalBack) closePriceModal(); };

pmSave.onclick = async ()=>{
  if(!priceModalCtx) return;
  const p = Number(pmPrice.value);
  if(!Number.isFinite(p) || p<=0){ toast("Fiyat hatalı"); return; }

  const ref = doc(db,"users",user.uid,"favorites",priceModalCtx.favId);
  const snap = await getDoc(ref);
  if(!snap.exists()){ toast("Favori yok"); closePriceModal(); return; }

  const data = snap.data();
  const sites = data.sites || {};
  const s = sites[priceModalCtx.siteId];
  if(!s){ toast("Site yok"); closePriceModal(); return; }

  const now = new Date().toISOString().slice(0,10); // YYYY-MM-DD
  const history = Array.isArray(s.history) ? s.history : [];

  history.push({ date: now, price: p });
  s.lastPrice = p;
  s.history = history;

  sites[priceModalCtx.siteId] = s;

  await updateDoc(ref, { sites });
  toast("Kaydedildi");
  closePriceModal();
  await loadFavorites();
};

/* -------------------- SUGGEST (ÖNERİLER) -------------------- */
const POPULAR = [
  "iphone 15", "xiaomi pad 7 256gb", "dyson v15", "playstation 5",
  "samsung s24", "airfryer", "robot süpürge", "bluetooth kulaklık"
];

function buildSuggestions(input){
  const v = input.trim().toLowerCase();
  if(!v) return [];

  const fromFav = favorites.map(f=>f.product).filter(Boolean);
  const fromPopular = POPULAR;

  // basit eşleşme
  const pool = [...new Set([...fromFav, ...fromPopular])];
  return pool
    .filter(x=>x.toLowerCase().includes(v))
    .slice(0,7);
}

function renderSuggest(items){
  if(!items.length){ suggestBox.classList.remove("show"); suggestBox.innerHTML=""; return; }
  suggestBox.innerHTML = "";
  items.forEach(t=>{
    const b = document.createElement("button");
    b.textContent = t;
    b.onclick = ()=>{
      qInput.value = t;
      suggestBox.classList.remove("show");
      qInput.focus();
    };
    suggestBox.appendChild(b);
  });
  suggestBox.classList.add("show");
}

qInput.addEventListener("input", ()=>{
  renderSuggest(buildSuggestions(qInput.value));
});

document.addEventListener("click",(e)=>{
  if(!suggestBox.contains(e.target) && e.target!==qInput){
    suggestBox.classList.remove("show");
  }
});

/* -------------------- ARAMA BUTONLARI -------------------- */
btnSearch.onclick = ()=>{
  const query = qInput.value.trim();
  if(!query){ toast("Ürün adı yaz"); return; }
  const rows = buildSearchRows(query);
  renderResults(rows);
};

btnClear.onclick = ()=>{
  results.innerHTML = `<div class="empty">Henüz arama yapılmadı.</div>`;
  qInput.value="";
  suggestBox.classList.remove("show");
};

/* -------------------- FAVORİ BUTONLARI -------------------- */
btnRefreshFav.onclick = ()=>loadFavorites();

btnClearAllFav.onclick = async ()=>{
  if(!confirm("Tüm favoriler silinsin mi?")) return;
  const q = await getDocs(favColRef());
  const tasks = [];
  q.forEach(d=>tasks.push(deleteDoc(d.ref)));
  await Promise.all(tasks);
  await loadFavorites();
  toast("Temizlendi");
};

/* -------------------- BİLDİRİM MODALI (izin) -------------------- */
btnBell.onclick = ()=>bellModalBack.classList.add("show");
bellClose.onclick = ()=>bellModalBack.classList.remove("show");
bellModalBack.onclick = (e)=>{ if(e.target===bellModalBack) bellModalBack.classList.remove("show"); };

bellPerm.onclick = async ()=>{
  if(!("Notification" in window)){ toast("Bildirim desteklenmiyor"); return; }
  const r = await Notification.requestPermission();
  toast("İzin: "+r);
};

/* -------------------- AI DEMO -------------------- */
btnAi.onclick = ()=>aiModalBack.classList.add("show");
aiClose.onclick = ()=>aiModalBack.classList.remove("show");
aiModalBack.onclick = (e)=>{ if(e.target===aiModalBack) aiModalBack.classList.remove("show"); };

aiRun.onclick = ()=>{
  // Demo: prompttan anahtar kelime çıkar gibi yap
  const p = aiPrompt.value.trim();
  if(!p){ aiOut.textContent = "Bir şey yaz."; return; }
  const fake = ["en ucuz", "orijinal", "garantili", "256gb", "indirim"];
  aiOut.textContent = `Demo öneri kelimeler:\n- ${fake.join("\n- ")}\n\n(API bağlayınca burası gerçek cevap olacak.)`;
};

/* -------------------- AUTH (şimdilik çıkış) -------------------- */
btnLogout.onclick = async ()=>{
  try{ await signOut(auth); }
  catch(e){ console.error(e); toast("Çıkış hata"); }
};

onAuthStateChanged(auth, async (u)=>{
  user = u;
  if(!user){
    // GitHub Pages’te ayrı login sayfası yoksa “giriş yok” uyarı verelim
    toast("Giriş yok. Firebase Auth sayfasını sonra ekleyeceğiz.");
    // Yine de local çalışsın
    renderChips();
    results.innerHTML = `<div class="empty">Henüz arama yapılmadı.</div>`;
    favList.innerHTML = `<div class="empty">Favori yok. (Giriş gerekli)</div>`;
    return;
  }

  renderChips();
  results.innerHTML = `<div class="empty">Henüz arama yapılmadı.</div>`;
  await ensureUserDoc();
  await loadFavorites();
});

/* -------------------- USER DOC CREATE -------------------- */
async function ensureUserDoc(){
  const ref = userDocRef();
  const snap = await getDoc(ref);
  if(!snap.exists()){
    await setDoc(ref, {
      email: user.email || null,
      createdAt: serverTimestamp()
    });
  }
}

/* -------------------- HELPERS -------------------- */
function sanitizeId(str){
  return (str||"")
    .toLowerCase()
    .trim()
    .replace(/\s+/g,"-")
    .replace(/[^a-z0-9\-ığüşöç]/g,"")
    .slice(0,120) || "fav";
}

function escapeHtml(s){
  return (s||"")
    .replaceAll("&","&amp;")
    .replaceAll("<","&lt;")
    .replaceAll(">","&gt;")
    .replaceAll('"',"&quot;")
    .replaceAll("'","&#039;");
  }
