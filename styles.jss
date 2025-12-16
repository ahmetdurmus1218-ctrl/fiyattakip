:root{
  --bg:#f4f6fb;
  --card:#fff;
  --text:#0f172a;
  --muted:#64748b;
  --primary:#3f51b5;
  --primary2:#2f3f9e;
  --danger:#e74c3c;
  --border:#e5e7eb;
  --soft:#eef2ff;
  --chip:#eef2ff;
  --chipText:#27339a;
  --shadow:0 10px 30px rgba(15, 23, 42, .08);
  --radius:18px;
}

*{box-sizing:border-box}
body{
  margin:0;
  font-family:system-ui,-apple-system,Segoe UI,Roboto,Ubuntu,"Helvetica Neue",Arial;
  background:var(--bg);
  color:var(--text);
}

.topbar{
  position:sticky; top:0;
  z-index:10;
  display:flex; align-items:center; justify-content:space-between;
  padding:12px 14px;
  background:rgba(244,246,251,.9);
  backdrop-filter: blur(10px);
  border-bottom:1px solid var(--border);
}

.pill{
  background:var(--chip);
  color:var(--chipText);
  padding:6px 12px;
  border-radius:999px;
  font-weight:600;
}

.hamburger{
  border:0;
  background:#fff;
  border-radius:12px;
  padding:10px 12px;
  box-shadow:0 6px 18px rgba(0,0,0,.06);
  font-size:18px;
}

.container{
  max-width:980px;
  margin:0 auto;
  padding:16px 14px 60px;
}

.card{
  background:var(--card);
  border:1px solid var(--border);
  border-radius:var(--radius);
  box-shadow:var(--shadow);
  padding:16px;
  margin:14px 0;
}

.hero h1{margin:0 0 6px; font-size:36px; letter-spacing:-.6px}
.sub{margin:0 0 14px; color:var(--muted)}

.siteChips{
  display:flex; flex-wrap:wrap; gap:10px;
  margin:12px 0 10px;
}
.chip{
  display:flex; align-items:center; gap:8px;
  padding:10px 12px;
  border-radius:999px;
  border:1px solid var(--border);
  background:#fff;
  cursor:pointer;
  user-select:none;
}
.chip.active{
  background:var(--chip);
  border-color:#c7d2fe;
}
.chip .dot{
  width:10px; height:10px; border-radius:99px;
  background:#cbd5e1;
}
.chip.active .dot{background:var(--primary)}

.searchRow{
  display:flex; gap:10px;
  align-items:stretch;
}
.inp{
  width:100%;
  border:1px solid var(--border);
  border-radius:14px;
  padding:12px 14px;
  outline:none;
  font-size:15px;
  background:#fff;
}
.inp:focus{border-color:#c7d2fe; box-shadow:0 0 0 4px rgba(99,102,241,.12)}
.inp.big{font-size:16px; padding:14px 16px}

.btn{
  border:1px solid var(--border);
  background:#fff;
  border-radius:14px;
  padding:12px 14px;
  cursor:pointer;
  font-weight:700;
}
.btn.big{padding:14px 16px; font-size:16px}
.btn.primary{
  background:var(--primary);
  border-color:transparent;
  color:#fff;
}
.btn.primary:hover{background:var(--primary2)}
.btn.ghost{
  background:#fff;
}
.btn.danger{
  background:#ffecec;
  border-color:#ffd0d0;
  color:#a01616;
}
.btn.danger:hover{filter:brightness(.98)}

.note{
  margin-top:12px;
  padding:12px 14px;
  border-radius:14px;
  background:#f1f5f9;
  border:1px solid var(--border);
  color:#334155;
}

.results{margin-top:14px}
.resultsHead{
  display:flex; align-items:center; justify-content:space-between;
  gap:10px;
  margin-bottom:10px;
}
.list{
  border:1px dashed #d1d5db;
  border-radius:14px;
  padding:12px;
}
.list.empty{color:var(--muted)}
.rowItem{
  display:flex; align-items:center; justify-content:space-between;
  gap:12px;
  padding:10px 8px;
  border-bottom:1px solid var(--border);
}
.rowItem:last-child{border-bottom:0}
.rowTitle{font-weight:800}
.rowMeta{color:var(--muted); font-size:13px}

.sectionHead{
  display:flex; align-items:flex-start; justify-content:space-between; gap:12px;
}
.sectionHead h2{margin:0}
.sectionActions{display:flex; gap:10px; flex-wrap:wrap}

.favGrid{
  display:grid;
  grid-template-columns: repeat(1, 1fr);
  gap:12px;
  margin-top:12px;
}
@media(min-width:760px){
  .favGrid{grid-template-columns: repeat(2, 1fr);}
}
.favGrid.empty{color:var(--muted)}

.favCard{
  border:1px solid var(--border);
  border-radius:16px;
  padding:12px;
  background:#fff;
}
.favTop{
  display:flex; justify-content:space-between; gap:10px;
}
.favTitle{font-weight:900; font-size:16px}
.favSub{color:var(--muted); font-size:13px; margin-top:2px}

.badges{display:flex; gap:8px; flex-wrap:wrap; margin-top:10px}
.badge{
  background:#f1f5f9;
  border:1px solid var(--border);
  border-radius:999px;
  padding:6px 10px;
  font-size:12px;
  color:#334155;
  font-weight:700;
}

.favActions{
  display:flex;
  gap:8px;
  flex-wrap:wrap;
  margin-top:10px;
}
.smallbtn{
  padding:10px 12px;
  border-radius:12px;
  font-weight:800;
  border:1px solid var(--border);
  background:#fff;
  cursor:pointer;
}
.smallbtn.primary{background:var(--soft); border-color:#c7d2fe; color:#27339a}
.smallbtn.open{background:#eafff2; border-color:#baf2cd; color:#126a35}
.smallbtn.copy{background:#eef2ff; border-color:#c7d2fe; color:#27339a}
.smallbtn.price{background:#fff7e6; border-color:#ffe0a3; color:#8a5a00}
.smallbtn.del{background:#ffecec; border-color:#ffd0d0; color:#a01616}
.smallbtn:hover{filter:brightness(.98)}

.miniChart{
  width:100%;
  height:120px;
  border:1px solid var(--border);
  border-radius:14px;
  margin-top:10px;
  background:#fafcff;
  padding:8px;
  cursor:pointer;
}

.foot{
  display:flex;
  align-items:center;
  justify-content:space-between;
  gap:12px;
  margin-top:14px;
}

/* Overlay Auth */
.overlay{
  position:fixed; inset:0;
  z-index:999;
  display:flex;
  align-items:center;
  justify-content:center;
  padding:18px;
  background: radial-gradient(1200px 600px at 20% 10%, rgba(99,102,241,.18), transparent),
              radial-gradient(900px 500px at 80% 30%, rgba(59,130,246,.16), transparent),
              rgba(15,23,42,.35);
  backdrop-filter: blur(8px);
}
.auth-card{
  width:min(420px, 100%);
  background:#fff;
  border-radius:22px;
  border:1px solid var(--border);
  box-shadow:0 18px 60px rgba(0,0,0,.18);
  padding:16px;
}
.auth-brand{
  display:flex; align-items:center; gap:12px;
  margin-bottom:10px;
}
.logo{
  width:46px; height:46px;
  border-radius:16px;
  display:grid; place-items:center;
  background:var(--soft);
  border:1px solid #c7d2fe;
  font-weight:1000;
  color:#27339a;
  font-size:20px;
}
.brand-title{font-weight:1000; font-size:18px}
.brand-sub{color:var(--muted); font-size:13px}

.tabs{display:flex; gap:8px; margin-top:10px}
.tab{
  flex:1;
  padding:10px 12px;
  border-radius:14px;
  border:1px solid var(--border);
  background:#fff;
  font-weight:900;
  cursor:pointer;
}
.tab.active{
  background:var(--soft);
  border-color:#c7d2fe;
  color:#27339a;
}

.lbl{display:block; margin-top:10px; margin-bottom:6px; color:#334155; font-weight:800; font-size:13px}
.pwrow{display:flex; gap:8px; align-items:center}
.iconbtn{
  border:1px solid var(--border);
  background:#fff;
  border-radius:12px;
  padding:10px 12px;
  cursor:pointer;
}
.smallmuted{color:var(--muted); font-size:13px}
.divider{height:1px; background:var(--border); margin:12px 0}
.msg{
  padding:10px 12px;
  border-radius:14px;
  border:1px solid var(--border);
  background:#f1f5f9;
  color:#0f172a;
  margin:10px 0;
  font-weight:700;
}
.hidden{display:none!important}

/* Modal */
.backdrop{
  position:fixed; inset:0;
  z-index:500;
  background:rgba(15,23,42,.45);
  backdrop-filter: blur(4px);
}
.modal{
  position:fixed;
  z-index:600;
  left:50%;
  top:50%;
  transform:translate(-50%,-50%);
  width:min(520px, 92vw);
  background:#fff;
  border:1px solid var(--border);
  border-radius:18px;
  box-shadow:0 22px 80px rgba(0,0,0,.25);
}
.modalHead{
  display:flex; justify-content:space-between; align-items:center;
  padding:12px 12px 8px;
  border-bottom:1px solid var(--border);
}
.modalTitle{font-weight:1000; font-size:16px}
.modalBody{padding:12px}
.chartCanvas{
  width:100%;
  height:auto;
  border:1px solid var(--border);
  border-radius:14px;
  background:#fafcff;
}
.table{
  margin-top:12px;
  border:1px solid var(--border);
  border-radius:14px;
  overflow:hidden;
}
.table .tr{
  display:flex; justify-content:space-between;
  padding:10px 12px;
  border-bottom:1px solid var(--border);
}
.table .tr:last-child{border-bottom:0}
.table .td{font-weight:800}
.table .td.m{font-weight:700; color:var(--muted)}
