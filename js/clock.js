// ==========================================
// FILE: js/clock.js
// TUGAS: Mengelola Jam & Tanggal Digital Real-Time
// ==========================================

function updateDashboardClock() {
  const dateElem = document.getElementById('widget-date');
  const clockElem = document.getElementById('widget-clock');

  if (!dateElem || !clockElem) return;

  const now = new Date();

  // Format Tanggal Indonesia (Contoh: Sen, 26 Okt 2026)
  const opsiTanggal = { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' };
  const tanggalStr = now.toLocaleDateString('id-ID', opsiTanggal);

  // Format Waktu Real-Time (Contoh: 17:45:12 WIB)
  const jam = String(now.getHours()).padStart(2, '0');
  const menit = String(now.getMinutes()).padStart(2, '0');
  const detik = String(now.getSeconds()).padStart(2, '0');
  const jamStr = `${jam}:${menit}:${detik} WIB`;

  dateElem.innerText = tanggalStr;
  clockElem.innerText = jamStr;
}

// Inisialisasi otomatis saat halaman selesai di-load
document.addEventListener('DOMContentLoaded', () => {
  updateDashboardClock();
  setInterval(updateDashboardClock, 1000);
});