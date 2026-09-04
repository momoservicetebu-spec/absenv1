// ==========================================
// FILE: js/api.js (VERSI LENGKAP TANPA KONFLIK CHART)
// ==========================================

console.log("File JS Analytics berhasil dimuat oleh browser!");
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxx3BLAOh7RZwF2vvukhDPhytbAPXfMP3H_RAJNeWgxLe2LNcCzojm-6HQ1kktPQMTQ/exec";

// 1. FUNGSI FETCH API
async function fetchAPI(action, payload = {}, loadingMessage = "Memproses data...") {
  if (typeof showLoading === 'function') showLoading(loadingMessage);
  try {
    const response = await fetch(`${SCRIPT_URL}?action=${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    return await response.json();
  } catch (error) {
    console.error("Gagal memanggil API:", error);
    return { status: 'error', message: error.message };
  } finally {
    if (typeof hideLoading === 'function') hideLoading();
  }
}

// 2. LOAD DATA DASHBOARD
async function loadDashboardData(role = 'semua') {
  const cleanRole = role.toLowerCase();
  try {
    const response = await fetch(`${SCRIPT_URL}?action=getDashboardData&role=${cleanRole}&filterRole=${cleanRole}`);
    const result = await response.json();
    
    if (result.success || result.status === true) {
      const data = result.data || result;
      // Panggil update grafik di charts.js
      if (typeof window.updateDashboardUI === "function") window.updateDashboardUI(data); 
      
      // Panggil fungsi render list/tabel di bawah
      updateListsUI(data);
    }
  } catch (error) {
    console.error("Gagal memuat data:", error);
  }
}
window.loadDashboardData = loadDashboardData;

// 3. PENGATUR SELURUH LIST & TABEL (NON-GRAFIK)
function updateListsUI(data) {
  if (!data) return;
  if (typeof renderTableKelas === "function") renderTableKelas(data.kelas || []);
  if (typeof renderTableJurusan === "function") renderTableJurusan(data.jurusan || []);
  if (typeof renderTopAlasan === "function") renderTopAlasan(data.alasan || []);
  if (typeof renderTerajin === "function") renderTerajin(data.terajinSiswa || []);
  if (typeof renderTerburuk === "function") renderTerburuk(data.alpaSiswa || []);
  if (typeof renderSeringTelat === "function") renderSeringTelat(data.seringTelatSiswa || []);
  if (typeof renderBelumAbsen === "function") renderBelumAbsen(data.belumAbsenSiswa || []);
}

// ==========================================
// KUMPULAN FUNGSI RENDER LIST HTML YG DIKEMBALIKAN
// ==========================================

function renderTableJurusan(dataJurusan) {
  const tbody = document.getElementById('table-jurusan-body');
  if (!tbody) return;
  tbody.innerHTML = "";
  if (!dataJurusan || dataJurusan.length === 0) {
    tbody.innerHTML = "<tr><td colspan='4' style='text-align:center;'>Belum ada data</td></tr>";
    return;
  }
  dataJurusan.forEach(item => {
    tbody.innerHTML += `<tr><td>${item.nama}</td><td>${item.hadir}</td><td>${item.izin}</td><td>${item.alpa}</td></tr>`;
  });
}

function renderTopAlasan(dataAlasan) {
  const ul = document.getElementById('list-alasan');
  if (!ul || !dataAlasan) return;
  ul.innerHTML = "";
  dataAlasan.forEach(item => {
    ul.innerHTML += `<li style="padding: 8px 0; border-bottom: 1px solid #333; display: flex; justify-content: space-between;">
      <span>${item.alasan}</span> <span style="color:#feca57;">${item.jumlah} kasus</span>
    </li>`;
  });
}

function renderTerajin(dataTerajin) {
  const ul = document.getElementById('list-terajin');
  if (!ul || !dataTerajin) return;
  ul.innerHTML = "";
  dataTerajin.forEach(item => {
    ul.innerHTML += `<li style="padding: 8px 0; border-bottom: 1px solid #333; display: flex; justify-content: space-between;">
      <span>👤 ${item.nama}</span> <span style="color:#1dd1a1;">${item.kelas}</span>
    </li>`;
  });
}

function renderTerburuk(dataTerburuk) {
  const ul = document.getElementById('list-terburuk');
  if (!ul || !dataTerburuk) return;
  ul.innerHTML = dataTerburuk.length === 0 ? "<li style='text-align:center; color:#1dd1a1;'>Tidak ada data Alpa</li>" : "";
  dataTerburuk.forEach(item => {
    ul.innerHTML += `<li style="padding: 8px 0; border-bottom: 1px solid #333; display: flex; justify-content: space-between;">
      <span>⚠️ ${item.nama}</span> <span style="color:#ff6b6b; font-weight:bold;">${item.alpa} Alpa</span>
    </li>`;
  });
}

function renderTableKelas(dataKelas) {
  const tbody = document.getElementById('table-kelas-body');
  if (!tbody || !dataKelas) return;
  tbody.innerHTML = dataKelas.length === 0 ? "<tr><td colspan='4' style='text-align:center;'>Belum ada data</td></tr>" : "";
  dataKelas.forEach(item => {
    tbody.innerHTML += `<tr style="border-bottom: 1px solid #333;">
      <td style="padding: 8px 0;">${item.nama}</td><td>${item.hadir}</td><td>${item.izin}</td><td style="color:#ff6b6b;">${item.alpa}</td>
    </tr>`;
  });
}

function renderSeringTelat(dataTelat) {
  const ul = document.getElementById('list-sering-telat');
  if (!ul || !dataTelat) return;
  ul.innerHTML = dataTelat.length === 0 ? "<li style='text-align:center; color:#1dd1a1;'>Semua siswa tepat waktu!</li>" : "";
  dataTelat.forEach(item => {
    ul.innerHTML += `<li style="padding: 8px 0; border-bottom: 1px solid #333; display: flex; justify-content: space-between;">
      <span>🐌 ${item.nama}</span> <span style="color:#feca57; font-weight:bold;">${item.jumlah}x Telat</span>
    </li>`;
  });
}

function renderBelumAbsen(dataBelum) {
  const ul = document.getElementById('list-belum-absen');
  if (!ul || !dataBelum) return;
  ul.innerHTML = dataBelum.length === 0 ? "<li style='text-align:center; color:#1dd1a1;'>Semua User Sudah Absen!</li>" : "";
  dataBelum.forEach(item => {
    ul.innerHTML += `<li style="padding: 8px 0; border-bottom: 1px solid #333; display: flex; justify-content: space-between;">
      <span>❌ ${item.nama}</span> <span style="font-size: 11px; color:#aaa;">(${item.role})</span>
    </li>`;
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadDashboardData();
});