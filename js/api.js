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
// FILE: DASBOARD ANALYTYC
// ==========================================

console.log("File JS Analytics berhasil dimuat oleh browser!"); // CEK 1

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxx3BLAOh7RZwF2vvukhDPhytbAPXfMP3H_RAJNeWgxLe2LNcCzojm-6HQ1kktPQMTQ/exec";

async function loadDashboardData() {
  console.log("Fungsi loadDashboardData mulai berjalan..."); // CEK 2

  try {
    console.log("Mencoba menghubungi Google Apps Script..."); // CEK 3
    const response = await fetch(`${SCRIPT_URL}?action=getDashboardData`);
    
    const result = await response.json();
    console.log("Data berhasil diterima dari GAS:", result); // CEK 4

    if (result.success) {
      // 1. Update Angka KPI Utama
      document.getElementById('kpi-total').innerText = result.data.totalUsers || 0;
      document.getElementById('kpi-persen').innerText = (result.data.persentase || 0) + '%';
      document.getElementById('kpi-hadir').innerText = result.data.hadir || 0;
      document.getElementById('kpi-telat').innerText = result.data.telat || 0;
      document.getElementById('kpi-izin').innerText = result.data.izin || 0;
      document.getElementById('kpi-alpa').innerText = result.data.alpa || 0;
      console.log("Angka KPI berhasil diupdate!"); // CEK 5

      // 2. Panggil semua fungsi render di SINI (di dalam blok success)
      renderDonutChart(result.data);
      renderBarChart(result.data.angkatan);
      renderTableJurusan(result.data.jurusan);
      renderTopAlasan(result.data.alasan);
      renderLineChart(result.data.tren);
      renderTerajin(result.data.terajin);
      
    } else {
      console.log("Respon diterima, tapi success = false", result);
    }
  } catch (error) {
    console.error("Gagal memuat data (Error Catch):", error);
  }
}

// ==========================================
// KUMPULAN FUNGSI RENDER KOMPONEN
// ==========================================

function renderDonutChart(data) {
  const chartElement = document.getElementById('donutStatusChart');
  if (!chartElement) return;

  const ctx = chartElement.getContext('2d');
  if(window.myDonutChart) window.myDonutChart.destroy();

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
  if(window.myBarChart) window.myBarChart.destroy();

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
  
  tbody.innerHTML = ""; // Bersihkan isi tabel

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
  if(window.myLineChart) window.myLineChart.destroy();

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

// Jalankan saat tab Dashboard aktif atau halaman dimuat
document.addEventListener("DOMContentLoaded", () => {
  console.log("DOM selesai dimuat, memanggil loadDashboardData..."); // CEK 7
  loadDashboardData();
});

