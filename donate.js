const PROMPTPAY_OR_LINK = 'https://www.buymeacoffee.com/';
const DISPLAY_ACCOUNT = '0801138627 (พร้อมเพย์)';

let selectedItem = 'ICED AMERICANO';
let selectedIcon = '☕';
let selectedAmount = 50;

document.getElementById('accNum').textContent = DISPLAY_ACCOUNT;
document.getElementById('vipDate').textContent = new Date().toLocaleDateString('th-TH', {
  day: 'numeric',
  month: 'short',
  year: 'numeric'
});
document.getElementById('vipSerial').textContent = 'NO. VIP-' + Math.random().toString(36).slice(2, 6).toUpperCase();

function makeQrDataUrl(text, size = 200) {
  if (typeof QRious === 'undefined') return '';
  const qr = new QRious({
    value: text,
    size: size,
    level: 'M',
    background: '#ffffff',
    foreground: '#111111'
  });
  return qr.toDataURL('image/png');
}

function updateDonatePreview() {
  const name = document.getElementById('supporterName').value.trim() || 'ผู้สนับสนุนใจดี';
  const amt = Number(document.getElementById('customAmount').value) || selectedAmount;
  const msg = document.getElementById('supporterMsg').value.trim() || 'ขอให้เว็บตั๋วหนังปัง ๆ ยิ่งขึ้นไป!';

  document.getElementById('vipIcon').textContent = selectedIcon;
  document.getElementById('vipItemTitle').textContent = selectedItem;
  document.getElementById('vipSupporterTag').textContent = '🌟 คุณ ' + name;
  document.getElementById('vipAmount').textContent = '฿' + amt.toLocaleString('th-TH');
  document.getElementById('vipMessage').textContent = `"${msg}"`;

  const qrPayload = `${PROMPTPAY_OR_LINK}?item=${encodeURIComponent(selectedItem)}&amount=${amt}&from=${encodeURIComponent(name)}`;
  document.getElementById('donateQrImg').src = makeQrDataUrl(qrPayload, 240);
  document.getElementById('vipTicketQr').src = makeQrDataUrl(qrPayload, 120);
}

document.getElementById('tierGrid').addEventListener('click', (e) => {
  const card = e.target.closest('.tier-card');
  if (!card) return;
  document.querySelectorAll('.tier-card').forEach(c => c.classList.remove('active'));
  card.classList.add('active');
  selectedItem = card.dataset.item;
  selectedIcon = card.dataset.icon;
  selectedAmount = Number(card.dataset.amt);
  document.getElementById('customAmount').value = selectedAmount;
  updateDonatePreview();
});

['supporterName', 'customAmount', 'supporterMsg'].forEach(id => {
  document.getElementById(id).addEventListener('input', updateDonatePreview);
});

function showToast(text) {
  const t = document.getElementById('toast');
  t.textContent = text;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2200);
}

document.getElementById('copyAccBtn').onclick = async () => {
  try {
    await navigator.clipboard.writeText(DISPLAY_ACCOUNT);
    showToast('📋 คัดลอกเลขพร้อมเพย์เรียบร้อยแล้ว!');
  } catch (err) {
    showToast('คัดลอก: ' + DISPLAY_ACCOUNT);
  }
};

document.getElementById('cheersBtn').onclick = async () => {
  if (typeof confetti === 'function') {
    confetti({ particleCount: 130, spread: 95, origin: { y: 0.6 }, colors: ['#e2b86b', '#9e3050', '#2f7a6f'] });
  }
  const btn = document.getElementById('cheersBtn');
  const oldText = btn.textContent;
  btn.textContent = '⏳ กำลังสร้างตั๋วที่ระลึก...';
  const card = document.getElementById('vipTicketCard');
  card.classList.add('exporting');
  try {
    const canvas = await html2canvas(card, { backgroundColor: null, scale: 3, useCORS: true });
    const link = document.createElement('a');
    link.download = 'vip-supporter-ticket.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast('💛 ขอบคุณสำหรับการสนับสนุนครับ!');
  } catch (err) {
    alert('ไม่สามารถสร้างรูปตั๋วได้ กรุณาลองอีกครั้ง');
  } finally {
    card.classList.remove('exporting');
    btn.textContent = oldText;
  }
};

function applyTheme(mode) {
  document.documentElement.setAttribute('data-theme', mode);
  document.getElementById('themeBtn').textContent = mode === 'light' ? '☀️' : '🌙';
  try { localStorage.setItem('cine-stub-theme', mode); } catch (e) {}
}

(function initTheme() {
  let mode = 'dark';
  try {
    mode = localStorage.getItem('cine-stub-theme') || (matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark');
  } catch (e) {}
  applyTheme(mode);
})();

document.getElementById('themeBtn').onclick = () => {
  const cur = document.documentElement.getAttribute('data-theme');
  applyTheme(cur === 'light' ? 'dark' : 'light');
};

updateDonatePreview();