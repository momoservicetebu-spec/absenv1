// ==========================================
// FILE: js/api.js
// ==========================================
async function fetchAPI(action, payload = {}, loadingMessage = "Memproses data...") {
  // 1. MUNCULKAN LOADING SEBELUM PROSES DIMULAI
  if (typeof showLoading === 'function') {
    showLoading(loadingMessage);
  }

  try {
    if (typeof CONFIG === 'undefined' || !CONFIG.SCRIPT_URL) {
      throw new Error("URL API (CONFIG.SCRIPT_URL) belum dikonfigurasi.");
    }

    const url = `${CONFIG.SCRIPT_URL}?action=${action}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Gagal memanggil API:", error);
    return { status: 'error', message: error.message };
  } finally {
    // 2. SEMBUNYIKAN LOADING SETELAH SELESAI (SUKSES MAUPUN ERROR)
    if (typeof hideLoading === 'function') {
      hideLoading();
    }
  }
}

// ==========================================
// FILE: js/api.js (BERSIH & TERPERBAIKI)
// ==========================================

console.log("File JS Analytics berhasil dimuat oleh browser!");

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxx3BLAOh7RZwF2vvukhDPhytbAPXfMP3H_RAJNeWgxLe2LNcCzojm-6HQ1kktPQMTQ/exec";

// Tambahkan parameter 'role' di fungsi loadDashboardData
async function loadDashboardData(role = 'semua') {
  const cleanRole = role.toLowerCase();
  console.log(`Mencari data analitik untuk filter: ${cleanRole}...`);

  try {
    // Kirim parameter role dan filterRole sekaligus
    const response = await fetch(`${SCRIPT_URL}?action=getDashboardData&role=${cleanRole}&filterRole=${cleanRole}`);
    const result = await response.json();
    console.log("Data berhasil diterima dari GAS:", result);

    if (result.success || result.status === true) {
      const data = result.data || result;
      window.updateDashboardUI(data);
    } else {
      console.warn("Respon diterima tapi status gagal:", result);
    }
  } catch (error) {
    console.error("Gagal memuat data (Error Catch):", error);
  }
}

// Pastikan fungsi ini bisa diakses secara global oleh ui.js
window.loadDashboardData = loadDashboardData;

// ==========================================
// 2. FUNGSI MASTER UNTUK UPDATE UI & FILTER
// ==========================================
window.updateDashboardUI = function(data) {
  if (!data) return;

  // Update Data Tabel & List Siswa
  if (typeof renderTableKelas === "function") renderTableKelas(data.kelas || []);
  if (typeof renderListSiswa === "function") {
    renderListSiswa('list-terajin-siswa', data.terajinSiswa || []);
    renderListSiswa('list-telat-siswa', data.seringTelatSiswa || []);
    renderListSiswa('list-alpa-siswa', data.alpaSiswa || []);
    renderListSiswa('list-belum-absen-siswa', data.belumAbsenSiswa || []);
  }

  // Update Data Tabel & List Guru
  if (typeof renderTableRumpun === "function") renderTableRumpun(data.rumpun || []);
  if (typeof renderListGuru === "function") {
    renderListGuru('list-terajin-guru', data.terajinGuru || []);
    renderListGuru('list-telat-guru', data.seringTelatGuru || []);
    renderListGuru('list-cuti-guru', data.cutiDinasGuru || []);
    renderListGuru('list-kosong-guru', data.tanpaStatusGuru || []);
  }

  // Lempar data ke charts.js untuk dirender
  if (typeof renderCharts === "function") renderCharts(data);
};

// Fungsi Universal Helper untuk List UI
function renderListSiswa(id, arrayData) {
  const ul = document.getElementById(id);
  if (!ul) return;
  ul.innerHTML = arrayData.length === 0 ? "<li style='text-align:center;'>Tidak ada data</li>" : "";
  arrayData.forEach(item => {
    ul.innerHTML += `<li style="padding: 8px 0; border-bottom: 1px solid #333; display: flex; justify-content: space-between;">
      <span>${item.nama}</span> <span>${item.nilai || ''}</span>
    </li>`;
  });
}

function renderListGuru(id, arrayData) {
  const ul = document.getElementById(id);
  if (!ul) return;
  ul.innerHTML = arrayData.length === 0 ? "<li style='text-align:center;'>Tidak ada data</li>" : "";
  arrayData.forEach(item => {
    ul.innerHTML += `<li style="padding: 8px 0; border-bottom: 1px solid #333; display: flex; justify-content: space-between;">
      <span>${item.nama}</span> <span>${item.keterangan || ''}</span>
    </li>`;
  });
}

// ==========================================
// 3. KUMPULAN FUNGSI RENDER KOMPONEN
// ==========================================

function renderDonutChart(data) {
  const chartElement = document.getElementById('donutStatusChart');
  if (!chartElement || !data) return;

  const ctx = chartElement.getContext('2d');
  if (window.myDonutChart) window.myDonutChart.destroy();

  window.myDonutChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Hadir', 'Terlambat', 'Izin', 'Alpa'],
      datasets: [{
        data: [data.hadir || 0, data.telat || 0, data.izin || 0, data.alpa || 0],
        backgroundColor: ['#1dd1a1', '#feca57', '#ff9ff3', '#ff6b6b']
      }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

function renderBarChart(dataAngkatan) {
  const chartElement = document.getElementById('barGradeChart');
  if (!chartElement || !dataAngkatan) return;
  
  const ctx = chartElement.getContext('2d');
  if (window.myBarChart) window.myBarChart.destroy();

  window.myBarChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: dataAngkatan.labels || [],
      datasets: [{
        label: '% Kehadiran',
        data: dataAngkatan.persentase || [],
        backgroundColor: '#54a0ff',
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { y: { beginAtZero: true, max: 100 } }
    }
  });
}

function renderTableJurusan(dataJurusan) {
  const tbody = document.getElementById('table-jurusan-body');
  if (!tbody) return;
  tbody.innerHTML = "";

  if (!dataJurusan || dataJurusan.length === 0) {
    tbody.innerHTML = "<tr><td colspan='4' style='text-align:center;'>Belum ada data</td></tr>";
    return;
  }

  dataJurusan.forEach(item => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>${item.nama}</td>
      <td>${item.hadir}</td>
      <td>${item.izin}</td>
      <td>${item.alpa}</td>
    `;
    tbody.appendChild(tr);
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

function renderLineChart(dataTren) {
  const chartElement = document.getElementById('lineTrendChart');
  if (!chartElement || !dataTren) return;
  
  const ctx = chartElement.getContext('2d');
  if (window.myLineChart) window.myLineChart.destroy();

  window.myLineChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: dataTren.labels || [],
      datasets: [{ 
        label: 'Tingkat Kehadiran', 
        data: dataTren.hadir || [], 
        borderColor: '#1dd1a1', 
        tension: 0.3,
        fill: true,
        backgroundColor: 'rgba(29, 209, 161, 0.1)'
      }]
    },
    options: { responsive: true, maintainAspectRatio: false }
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
  ul.innerHTML = "";
  
  if (dataTerburuk.length === 0) {
    ul.innerHTML = "<li style='text-align:center; color:#1dd1a1;'>Tidak ada data Alpa</li>";
    return;
  }

  dataTerburuk.forEach(item => {
    ul.innerHTML += `<li style="padding: 8px 0; border-bottom: 1px solid #333; display: flex; justify-content: space-between;">
      <span>⚠️ ${item.nama}</span> <span style="color:#ff6b6b; font-weight:bold;">${item.alpa} Alpa</span>
    </li>`;
  });
}

function renderBulanan(dataBulanan) {
  const chartElement = document.getElementById('barBulanChart');
  if (!chartElement || !dataBulanan) return;
  
  const ctx = chartElement.getContext('2d');
  if (window.myBulanChart) window.myBulanChart.destroy();

  window.myBulanChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: dataBulanan.labels || [],
      datasets: [{ label: 'Total Kehadiran', data: dataBulanan.data || [], backgroundColor: '#48dbfb', borderRadius: 4 }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

function renderTahunan(dataTahunan) {
  const chartElement = document.getElementById('barTahunChart');
  if (!chartElement || !dataTahunan) return;
  
  const ctx = chartElement.getContext('2d');
  if (window.myTahunChart) window.myTahunChart.destroy();

  window.myTahunChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: dataTahunan.labels || [],
      datasets: [{ label: 'Total Kehadiran', data: dataTahunan.data || [], backgroundColor: '#a29bfe', borderRadius: 4 }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

function renderTableKelas(dataKelas) {
  const tbody = document.getElementById('table-kelas-body');
  if (!tbody || !dataKelas) return;
  tbody.innerHTML = "";

  if (dataKelas.length === 0) {
    tbody.innerHTML = "<tr><td colspan='4' style='text-align:center;'>Belum ada data</td></tr>";
    return;
  }

  dataKelas.forEach(item => {
    tbody.innerHTML += `
      <tr style="border-bottom: 1px solid #333;">
        <td style="padding: 8px 0;">${item.nama}</td>
        <td>${item.hadir}</td>
        <td>${item.izin}</td>
        <td style="color:#ff6b6b;">${item.alpa}</td>
      </tr>
    `;
  });
}

function renderSeringTelat(dataTelat) {
  const ul = document.getElementById('list-sering-telat');
  if (!ul || !dataTelat) return;
  ul.innerHTML = "";
  
  if (dataTelat.length === 0) {
    ul.innerHTML = "<li style='text-align:center; color:#1dd1a1;'>Semua siswa tepat waktu!</li>";
    return;
  }

  dataTelat.forEach(item => {
    ul.innerHTML += `<li style="padding: 8px 0; border-bottom: 1px solid #333; display: flex; justify-content: space-between;">
      <span>🐌 ${item.nama}</span> <span style="color:#feca57; font-weight:bold;">${item.jumlah}x Telat</span>
    </li>`;
  });
}

function renderBelumAbsen(dataBelum) {
  const ul = document.getElementById('list-belum-absen');
  if (!ul || !dataBelum) return;
  ul.innerHTML = "";
  
  if (dataBelum.length === 0) {
    ul.innerHTML = "<li style='text-align:center; color:#1dd1a1;'>Semua User Sudah Absen Hari Ini!</li>";
    return;
  }

  dataBelum.forEach(item => {
    ul.innerHTML += `<li style="padding: 8px 0; border-bottom: 1px solid #333; display: flex; justify-content: space-between;">
      <span>❌ ${item.nama}</span> <span style="font-size: 11px; color:#aaa;">(${item.role})</span>
    </li>`;
  });
}

// Jalankan load data otomatis saat pertama kali halaman dimuat
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM selesai dimuat, memanggil loadDashboardData...");
  loadDashboardData();
});