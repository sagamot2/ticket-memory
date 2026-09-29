const KEY = 'cine-stub-tickets-v1';
let tickets = JSON.parse(localStorage.getItem(KEY) || '[]');
let posterData = null;
let selTmdbId = null;
let editId = null;
let selColor = '#cda255';
let selTpl = 'plain';
let selRating = 0;
let selMood = '';
let viewMode = 'grid';


const COLORS = ['#cda255','#8c2a45','#2f7a6f','#c46a3c','#5a7a9c','#b8865f'];
const COMPANIONS = {
  alone:   {label:'ดูคนเดียว',    icon:'🎬', color:'#cda255'},
  partner: {label:'กับแฟน',       icon:'💑', color:'#8c2a45'},
  friends: {label:'กับเพื่อน',     icon:'👯', color:'#2f7a6f'},
  family:  {label:'กับครอบครัว',   icon:'👨‍👩‍👧', color:'#c46a3c'},
  group:   {label:'กลุ่มใหญ่',     icon:'🎉', color:'#5a7a9c'}
};
const GENRES = {
  action:'🎬 แอคชั่น', horror:'👻 สยองขวัญ', romance:'💕 โรแมนติก', comedy:'😂 คอมเมดี้',
  scifi:'🚀 ไซไฟ', drama:'🎭 ดราม่า', animation:'🧸 แอนิเมชัน', thriller:'🔪 ทริลเลอร์'
};
const TMDB_GENRE_MAP = {
  28:'action', 12:'action', 27:'horror', 10749:'romance',
  35:'comedy', 878:'scifi', 18:'drama', 16:'animation', 53:'thriller', 80:'thriller'
};
const MOODS = ['😍','😊','😐','😢','😱','🤯'];
const MILESTONES = [
  {n:1, icon:'🎟️', label:'ตั๋วใบแรก'},
  {n:5, icon:'🍿', label:'นักดูหนังมือใหม่'},
  {n:10, icon:'🎬', label:'ขาประจำโรงหนัง'},
  {n:25, icon:'🏆', label:'คอหนังตัวยง'},
  {n:50, icon:'👑', label:'ตำนานโรงหนัง'}
];

function save(){ localStorage.setItem(KEY, JSON.stringify(tickets)); }
function escapeHtml(s){ return (s||'').replace(/[&<>"']/g, m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m])); }
function patternCss(tpl, color){
  if(tpl==='strip') return `repeating-linear-gradient(0deg, transparent 0 14px, ${color}22 14px 16px)`;
  if(tpl==='stars') return `radial-gradient(${color}35 1.5px, transparent 1.5px)`;
  if(tpl==='holo')  return `linear-gradient(125deg, transparent 20%, ${color}28 45%, rgba(90,122,156,0.22) 55%, transparent 80%)`;
  return 'none';
}
function priceNum(t){ return parseFloat(t.price)||0; }


(function initSelects(){
  const fg = document.getElementById('fGenre'), fltg = document.getElementById('filterGenre');
  Object.entries(GENRES).forEach(([k,v])=>{
    fg.insertAdjacentHTML('beforeend', `<option value="${k}">${v}</option>`);
    fltg.insertAdjacentHTML('beforeend', `<option value="${k}">${v}</option>`);
  });
  const fltc = document.getElementById('filterCompanion');
  Object.entries(COMPANIONS).forEach(([k,v])=>{
    fltc.insertAdjacentHTML('beforeend', `<option value="${k}">${v.icon} ${v.label}</option>`);
  });
  const starWrap = document.getElementById('starInput');
  for(let i=1;i<=5;i++){
    const b=document.createElement('button'); b.type='button'; b.textContent='★'; b.dataset.v=i;
    b.onclick=()=>{ selRating = (selRating===i?0:i); paintStars(); };
    starWrap.appendChild(b);
  }
  const moodWrap = document.getElementById('moodPicker');
  MOODS.forEach(m=>{
    const b=document.createElement('button'); b.type='button'; b.textContent=m;
    b.onclick=()=>{ selMood = (selMood===m?'':m); paintMoods(); };
    moodWrap.appendChild(b);
  });
})();

function paintStars(){ document.querySelectorAll('#starInput button').forEach(b=> b.classList.toggle('on', +b.dataset.v<=selRating)); }
function paintMoods(){ document.querySelectorAll('#moodPicker button').forEach(b=> b.classList.toggle('active', b.textContent===selMood)); }

function getFiltered(){
  const q = document.getElementById('toolSearch').value.trim().toLowerCase();
  const g = document.getElementById('filterGenre').value;
  const c = document.getElementById('filterCompanion').value;
  const sort = document.getElementById('toolSort').value;
  let list = tickets.filter(t=>{
    if(g!=='all' && t.genre!==g) return false;
    if(c!=='all' && t.companion!==c) return false;
    if(q){
      const hay = [t.title,t.review,t.companionName,t.cinema].join(' ').toLowerCase();
      if(!hay.includes(q)) return false;
    }
    return true;
  });
  list.sort((a,b)=>{
    if(sort==='new') return (b.date||'').localeCompare(a.date||'') || b.id.localeCompare(a.id);
    if(sort==='old') return (a.date||'').localeCompare(b.date||'') || a.id.localeCompare(b.id);
    if(sort==='priceHigh') return priceNum(b)-priceNum(a);
    if(sort==='priceLow') return priceNum(a)-priceNum(b);
    if(sort==='az') return (a.title||'').localeCompare(b.title||'','th');
    return 0;
  });
  return list;
}

function makeTicketQr(t){
  const baseUrl = window.location.origin !== 'null'
    ? (window.location.origin + window.location.pathname)
    : 'https://www.themoviedb.org/';
  const targetUrl = t.tmdbId
    ? `https://www.themoviedb.org/movie/${t.tmdbId}`
    : `${baseUrl}?movie=${encodeURIComponent(t.title || '')}&date=${encodeURIComponent(t.date || '')}`;
  if(typeof QRious === 'undefined') return '';
  const qr = new QRious({
    value: targetUrl,
    size: 120,
    level: 'M',
    background: '#ffffff',
    foreground: '#111111'
  });
  return qr.toDataURL('image/png');
}

function ticketCardHtml(t){
  const dateStr = t.date ? new Date(t.date+'T00:00:00').toLocaleDateString('th-TH',{day:'numeric',month:'short',year:'numeric'}) : '—';
  const comp = COMPANIONS[t.companion];
  const patSize = t.template === 'holo' ? '100% 100%' : '22px 22px';
  const serialCode = String(t.id).slice(-6).toUpperCase();
  const qrImg = makeTicketQr(t);

  return `
    <div class="ticket" style="--tk-accent:${t.color};--tk-line:${t.color}80;--tk-pattern:${patternCss(t.template,t.color)};--tk-pat-size:${patSize}">
      <div class="t-poster ${t.poster?'':'noimg'}" style="${t.poster?`background-image:url(${t.poster})`:''}">${t.poster?'':'🎬'}</div>
      <span class="t-serial">NO. ${serialCode}</span>
      <div class="t-div"></div>
      <div class="t-stub">
        <div class="t-head">
          <h3 class="t-title">${escapeHtml(t.title||'ไม่มีชื่อเรื่อง')}</h3>
          ${t.home?'<span class="badge">🏠 ดูที่บ้าน</span>':''}
        </div>
        <div class="t-tags">
          ${comp ? `<span class="badge outline">${comp.icon} ${comp.label}${t.companionName?' · '+escapeHtml(t.companionName):''}</span>` : ''}
        </div>
        <div class="t-meta">
          ${t.genre && GENRES[t.genre] ? `<span class="genre-tag">${GENRES[t.genre]}</span>` : ''}
          ${t.rating ? `<span class="rating-stars">${'★'.repeat(t.rating)}${'☆'.repeat(5-t.rating)}</span>` : ''}
          ${t.mood ? `<span>${t.mood}</span>` : ''}
        </div>
        <div class="t-facts">
          <div><label>วันที่</label><span>${dateStr}</span></div>
          <div><label>เวลา</label><span>${escapeHtml(t.time||'—')}</span></div>
          <div><label>${t.home?'แพลตฟอร์ม':'โรงภาพยนตร์'}</label><span>${escapeHtml(t.cinema||(t.home?'Streaming':'—'))}</span></div>
          <div><label>${t.home?'มุมที่นั่ง':'ที่นั่ง'}</label><span>${escapeHtml(t.seat||'—')}</span></div>
          <div><label>ราคา</label><span>${t.price? '฿'+Number(t.price).toLocaleString() : '—'}</span></div>
        </div>
        ${t.review?`<div class="t-review">"${escapeHtml(t.review)}"</div>`:''}
        <div class="t-footer">
          ${qrImg ? `
          <div class="t-qr-box">
            <img src="${qrImg}" alt="QR">
            <div class="t-qr-meta">
              <small>SCAN PASS</small>
              <b>#${serialCode}</b>
            </div>
          </div>` : ''}
          <div class="t-actions">
            <button class="mini-btn" data-act="dl" data-id="${t.id}">⬇ รูป</button>
            <button class="mini-btn" data-act="edit" data-id="${t.id}">แก้ไข</button>
            <button class="mini-btn danger" data-act="del" data-id="${t.id}">ลบ</button>
          </div>
        </div>
      </div>
    </div>`;
}

function render(){
  const grid = document.getElementById('grid');
  const empty = document.getElementById('emptyState');
  empty.style.display = tickets.length ? 'none':'block';
  const list = getFiltered();
  grid.innerHTML='';
  if(viewMode==='timeline'){
    const sorted = list.slice().sort((a,b)=> (a.date||'').localeCompare(b.date||''));
    let lastMonth='';
    sorted.forEach(t=>{
      const m = t.date ? t.date.slice(0,7) : 'ไม่ระบุวันที่';
      if(m!==lastMonth){
        lastMonth=m;
        const label = t.date ? new Date(t.date+'T00:00:00').toLocaleDateString('th-TH',{month:'long',year:'numeric'}) : 'ไม่ระบุวันที่';
        grid.insertAdjacentHTML('beforeend', `<div class="month-head">${label}</div>`);
      }
      grid.insertAdjacentHTML('beforeend', ticketCardHtml(t));
    });
  } else {
    list.forEach(t=> grid.insertAdjacentHTML('beforeend', ticketCardHtml(t)));
  }
  renderStats();
}

function mostFrequent(arr){
  if(!arr.length) return null;
  const count={}; arr.forEach(v=>count[v]=(count[v]||0)+1);
  return Object.entries(count).sort((a,b)=>b[1]-a[1])[0][0];
}

function renderStats(){
  const box = document.getElementById('stats');
  if(!tickets.length){ box.innerHTML=''; return; }
  const total = tickets.length;
  const spent = tickets.reduce((s,t)=>s+priceNum(t),0);
  const compKey = mostFrequent(tickets.map(t=>t.companion).filter(Boolean));
  const genreKey = mostFrequent(tickets.map(t=>t.genre).filter(Boolean));
  const comp = compKey && COMPANIONS[compKey];
  const genre = genreKey && GENRES[genreKey];
  const trophies = MILESTONES.map(m=>`<span class="trophy ${total>=m.n?'unlocked':''}" title="${m.label} (${m.n} เรื่อง)">${m.icon}</span>`).join('');
  box.innerHTML = `
    <div class="stat-pill">🎟️ ดูไปแล้ว <b>${total}</b> เรื่อง</div>
    <div class="stat-pill">💸 จ่ายรวม <b>฿${spent.toLocaleString()}</b></div>
    ${comp?`<div class="stat-pill">${comp.icon} ดูกับ <b>${comp.label}</b> บ่อยสุด</div>`:''}
    ${genre?`<div class="stat-pill">🎞️ แนวโปรด <b>${genre}</b></div>`:''}
    <div class="stat-pill trophies">${trophies}</div>`;
}

function openModal(ticket){
  editId = ticket ? ticket.id : null;
  document.getElementById('modalTitle').textContent = ticket ? 'แก้ไขตั๋ว' : 'เพิ่มตั๋วหนัง';
  document.getElementById('fTitle').value = ticket?.title || '';
  document.getElementById('fCompanion').value = ticket?.companion || 'alone';
  document.getElementById('fCompanionName').value = ticket?.companionName || '';
  document.getElementById('fHome').checked = !!ticket?.home;
  document.getElementById('fDate').value = ticket?.date || new Date().toISOString().split('T')[0];
  document.getElementById('fTime').value = ticket?.time || '';
  document.getElementById('fCinema').value = ticket?.cinema || '';
  document.getElementById('fSeat').value = ticket?.seat || '';
  document.getElementById('fPrice').value = ticket?.price || '';
  document.getElementById('fGenre').value = ticket?.genre || '';
  document.getElementById('fReview').value = ticket?.review || '';
  selRating = ticket?.rating || 0; paintStars();
  selMood = ticket?.mood || ''; paintMoods();
  posterData = ticket?.poster || null;
  selTmdbId = ticket?.tmdbId || null;
  selColor = ticket?.color || '#cda255';
  selTpl = ticket?.template || 'plain';
  document.getElementById('fColor').value = selColor;
  updatePosterPreview();
  buildSwatches();
  document.getElementById('psQuery').value = ticket?.title || '';
  document.getElementById('psResults').innerHTML = '';
  document.querySelectorAll('#tplOpts button').forEach(b=>b.classList.toggle('active', b.dataset.tpl===selTpl));
  toggleHomeFields();
  document.getElementById('overlay').classList.add('show');
}
function closeModal(){ document.getElementById('overlay').classList.remove('show'); }

function updatePosterPreview(){
  const img=document.getElementById('posterPreview'), ph=document.getElementById('posterPh');
  if(posterData){ img.src=posterData; img.style.display='block'; ph.style.display='none'; }
  else { img.style.display='none'; ph.style.display='flex'; }
}
function buildSwatches(){
  const wrap=document.getElementById('swatches'); wrap.innerHTML='';
  COLORS.forEach(c=>{
    const s=document.createElement('div');
    s.className='swatch'+(c.toLowerCase()===selColor.toLowerCase()?' active':'');
    s.style.background=c;
    s.onclick=()=>{ selColor=c; document.getElementById('fColor').value=c; buildSwatches(); };
    wrap.appendChild(s);
  });
}

function toggleHomeFields(){
  const home = document.getElementById('fHome').checked;
  const lblCinema = document.getElementById('lblCinema');
  const lblSeat = document.getElementById('lblSeat');
  const fCinema = document.getElementById('fCinema');
  const fSeat = document.getElementById('fSeat');
  if(home){
    lblCinema.textContent = 'แพลตฟอร์มสตรีมมิ่ง';
    fCinema.placeholder = 'เช่น Netflix, Disney+, Max';
    lblSeat.textContent = 'มุมที่นั่ง / อุปกรณ์';
    fSeat.placeholder = 'เช่น โซฟา, ห้องนอน, iPad';
  } else {
    lblCinema.textContent = 'โรงภาพยนตร์';
    fCinema.placeholder = 'เช่น SF World CentralWorld';
    lblSeat.textContent = 'ที่นั่ง';
    fSeat.placeholder = 'เช่น G12';
  }
}

document.getElementById('addBtn').onclick = ()=>openModal(null);
document.getElementById('cancelBtn').onclick = closeModal;
document.getElementById('overlay').onclick = (e)=>{ if(e.target.id==='overlay') closeModal(); };
document.getElementById('fHome').onchange = toggleHomeFields;
document.getElementById('fColor').oninput = (e)=>{ selColor=e.target.value; buildSwatches(); };
document.getElementById('fCompanion').onchange = (e)=>{
  const c = COMPANIONS[e.target.value];
  if(c){ selColor = c.color; document.getElementById('fColor').value = c.color; buildSwatches(); }
};
document.getElementById('posterDrop').onclick = ()=>document.getElementById('posterInput').click();
document.getElementById('posterInput').onchange = (e)=>{
  const file=e.target.files[0]; if(!file) return;
  const reader=new FileReader();
  reader.onload=ev=>{ posterData=ev.target.result; updatePosterPreview(); };
  reader.readAsDataURL(file);
};
document.getElementById('tplOpts').onclick = (e)=>{
  const b=e.target.closest('button'); if(!b) return;
  selTpl=b.dataset.tpl;
  document.querySelectorAll('#tplOpts button').forEach(x=>x.classList.toggle('active', x===b));
};

async function searchTmdb(){
  const resDiv = document.getElementById('psResults');
  const q = document.getElementById('psQuery').value.trim() || document.getElementById('fTitle').value.trim();
  if(!q){ resDiv.innerHTML = '<span class="ps-hint">พิมพ์ชื่อหนังในช่องค้นหาก่อนนะครับ</span>'; return; }
  resDiv.innerHTML = '<span class="ps-hint">⏳ กำลังค้นหาโปสเตอร์จาก TMDb...</span>';

  try{ 
    const r = await fetch('/api/tmdb?query=' + encodeURIComponent(q));
    if(!r.ok) throw new Error('search failed');
    const data = await r.json();
    const items = (data.results||[]).filter(m=>m.poster_path).slice(0,10);
    if(!items.length){
      resDiv.innerHTML = '<span class="ps-hint">ไม่พบโปสเตอร์ ลองสะกดเป็นชื่อภาษาอังกฤษดูนะครับ</span>';
      return;
    }
    resDiv.innerHTML = '';
    items.forEach(m=>{
      const img = document.createElement('img');
      img.crossOrigin = 'anonymous';
      img.src = `https://image.tmdb.org/t/p/w342${m.poster_path}`;
      img.title = `${m.title} (${(m.release_date||'').slice(0,4)})`;
      img.onclick = ()=>pickTmdbPoster(img.src, m);
      resDiv.appendChild(img);
    });
  }catch(err){
    resDiv.innerHTML = '<span class="ps-hint">❌ ค้นหาไม่สำเร็จ กรุณาเช็คอินเทอร์เน็ตแล้วลองใหม่</span>';
  }
}

async function pickTmdbPoster(url, movieObj){
  if(movieObj?.id) selTmdbId = movieObj.id;
  if(!document.getElementById('fTitle').value.trim() && movieObj?.title){
    document.getElementById('fTitle').value = movieObj.title;
  }
  if(!document.getElementById('fGenre').value && Array.isArray(movieObj?.genre_ids)){
    for(const gid of movieObj.genre_ids){
      if(TMDB_GENRE_MAP[gid]){
        document.getElementById('fGenre').value = TMDB_GENRE_MAP[gid];
        break;
      }
    }
  }
  try{
    const r = await fetch(url);
    const blob = await r.blob();
    const reader = new FileReader();
    reader.onload = ev=>{ posterData = ev.target.result; updatePosterPreview(); };
    reader.readAsDataURL(blob);
  }catch(err){
    posterData = url;
    updatePosterPreview();
  }
}

document.getElementById('psSearchBtn').onclick = searchTmdb;
document.getElementById('psQuery').addEventListener('keydown', e=>{ if(e.key==='Enter'){ e.preventDefault(); searchTmdb(); } });

function fireConfetti(big){
  if(typeof confetti !== 'function') return;
  confetti({particleCount: big?140:60, spread: big?100:65, origin:{y:.6}, colors:['#cda255','#8c2a45','#2f7a6f']});
}

document.getElementById('saveBtn').onclick = ()=>{
  const data = {
    id: editId || (Date.now()+''+Math.random().toString(36).slice(2,7)),
    title: document.getElementById('fTitle').value.trim(),
    companion: document.getElementById('fCompanion').value,
    companionName: document.getElementById('fCompanionName').value.trim(),
    home: document.getElementById('fHome').checked,
    date: document.getElementById('fDate').value,
    time: document.getElementById('fTime').value,
    cinema: document.getElementById('fCinema').value.trim(),
    seat: document.getElementById('fSeat').value.trim(),
    price: document.getElementById('fPrice').value,
    genre: document.getElementById('fGenre').value,
    rating: selRating,
    mood: selMood,
    review: document.getElementById('fReview').value.trim(),
    poster: posterData,
    tmdbId: selTmdbId,
    color: selColor,
    template: selTpl
  };
  if(!data.title){ document.getElementById('fTitle').focus(); return; }
  const wasNew = !editId;
  if(editId){ tickets = tickets.map(t=> t.id===editId ? data : t); }
  else { tickets.push(data); }
  save(); render(); closeModal();
  if(wasNew){
    const hitMilestone = MILESTONES.some(m=>m.n===tickets.length);
    fireConfetti(hitMilestone);
  }
};

document.getElementById('grid').addEventListener('click', async (e)=>{
  const btn = e.target.closest('button[data-act]'); if(!btn) return;
  const id = btn.dataset.id;
  const t = tickets.find(x=>x.id===id);
  if(btn.dataset.act==='del'){
    if(confirm('ลบตั๋วนี้หรือไม่?')){ tickets = tickets.filter(x=>x.id!==id); save(); render(); }
  } else if(btn.dataset.act==='edit'){
    openModal(t);
  } else if(btn.dataset.act==='dl'){
    const card = btn.closest('.ticket');
    card.classList.add('exporting');
    try{
      const canvas = await html2canvas(card, {backgroundColor:null, scale:3, useCORS:true});
      const link = document.createElement('a');
      link.download = (t.title||'ticket').replace(/[^a-zA-Zก-๙0-9_-]+/g,'_') + '.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    }catch(err){ alert('ดาวน์โหลดไม่สำเร็จ ลองใหม่อีกครั้ง'); }
    finally{ card.classList.remove('exporting'); }
  }
});

['toolSearch','filterGenre','filterCompanion','toolSort'].forEach(id=>{
  document.getElementById(id).addEventListener('input', render);
  document.getElementById(id).addEventListener('change', render);
});
document.getElementById('viewGridBtn').onclick = ()=>{ viewMode='grid'; document.getElementById('viewGridBtn').classList.add('active'); document.getElementById('viewTimelineBtn').classList.remove('active'); render(); };
document.getElementById('viewTimelineBtn').onclick = ()=>{ viewMode='timeline'; document.getElementById('viewTimelineBtn').classList.add('active'); document.getElementById('viewGridBtn').classList.remove('active'); render(); };

function openWrapped(){
  const years = [...new Set(tickets.filter(t=>t.date).map(t=>t.date.slice(0,4)))].sort().reverse();
  const sel = document.getElementById('wrappedYear');
  sel.innerHTML = years.length ? years.map(y=>`<option value="${y}">ปี ${y}</option>`).join('') : `<option value="all">ทั้งหมด</option>`;
  renderWrapped();
  document.getElementById('wrappedOverlay').classList.add('show');
}
function renderWrapped(){
  const y = document.getElementById('wrappedYear').value;
  const list = tickets.filter(t=> y==='all' || (t.date && t.date.slice(0,4)===y));
  const spent = list.reduce((s,t)=>s+priceNum(t),0);
  const compKey = mostFrequent(list.map(t=>t.companion).filter(Boolean));
  const genreKey = mostFrequent(list.map(t=>t.genre).filter(Boolean));
  const months = {};
  list.forEach(t=>{ if(t.date){ const m=t.date.slice(0,7); months[m]=(months[m]||0)+1; } });
  const busiest = Object.entries(months).sort((a,b)=>b[1]-a[1])[0];
  const busiestLabel = busiest ? new Date(busiest[0]+'-01').toLocaleDateString('th-TH',{month:'long'}) : '—';
  const homeCount = list.filter(t=>t.home).length;
  document.getElementById('wrappedTotal').textContent = `${list.length} เรื่อง`;
  document.getElementById('wrappedGrid').innerHTML = `
    <div><label>จ่ายไปทั้งหมด</label><span>฿${spent.toLocaleString()}</span></div>
    <div><label>ดูกับใครบ่อยสุด</label><span>${compKey?COMPANIONS[compKey].icon+' '+COMPANIONS[compKey].label:'—'}</span></div>
    <div><label>แนวโปรด</label><span>${genreKey?GENRES[genreKey]:'—'}</span></div>
    <div><label>เดือนที่ดูเยอะสุด</label><span>${busiestLabel}</span></div>
    <div><label>ดูที่บ้าน</label><span>${homeCount} เรื่อง</span></div>
    <div><label>ดูในโรง</label><span>${list.length-homeCount} เรื่อง</span></div>`;
}
document.getElementById('wrappedBtn').onclick = openWrapped;
document.getElementById('wrappedCloseBtn').onclick = ()=>document.getElementById('wrappedOverlay').classList.remove('show');
document.getElementById('wrappedOverlay').onclick = (e)=>{ if(e.target.id==='wrappedOverlay') e.currentTarget.classList.remove('show'); };
document.getElementById('wrappedYear').addEventListener('change', renderWrapped);
document.getElementById('wrappedDlBtn').onclick = async ()=>{
  const btn = document.getElementById('wrappedDlBtn');
  btn.textContent='กำลังสร้างรูป...';
  try{
    const canvas = await html2canvas(document.getElementById('wrappedCard'), {backgroundColor:'#0b1f1d', scale:3});
    const link = document.createElement('a');
    link.download = 'movie-wrapped.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
  }catch(err){ alert('ดาวน์โหลดไม่สำเร็จ'); }
  btn.textContent='⬇ ดาวน์โหลดสรุป';
};

function applyTheme(mode){
  document.documentElement.setAttribute('data-theme', mode);
  document.getElementById('themeBtn').textContent = mode==='light' ? '☀️' : '🌙';
  try{ localStorage.setItem('cine-stub-theme', mode); }catch(e){}
}
(function initTheme(){
  let mode='dark';
  try{ mode = localStorage.getItem('cine-stub-theme') || (matchMedia('(prefers-color-scheme: light)').matches ? 'light':'dark'); }catch(e){}
  applyTheme(mode);
})();
document.getElementById('themeBtn').onclick = ()=>{
  const cur = document.documentElement.getAttribute('data-theme');
  applyTheme(cur==='light' ? 'dark' : 'light');
};

render();