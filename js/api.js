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

const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxx3BLAOh7RZwF2vvukhDPhytbAPXfMP3H_RAJNeWgxLe2LNcCzojm-6HQ1kktPQMTQ/exec";

async function loadDashboardData() {
  try {
    const response = await fetch(`${SCRIPT_URL}?action=getDashboardData`);
    const result = await response.json();

    if (result.success) {
      // Update Angka KPI
      document.getElementById('kpi-total').innerText = result.data.totalUsers;
      document.getElementById('kpi-persen').innerText = result.data.persentase + '%';
      document.getElementById('kpi-hadir').innerText = result.data.hadir;
      document.getElementById('kpi-telat').innerText = result.data.telat;
      document.getElementById('kpi-izin').innerText = result.data.izin;
      document.getElementById('kpi-alpa').innerText = result.data.alpa;

      // Render Chart
      renderDonutChart(result.data);
    }
  } catch (error) {
    console.error("Gagal memuat data:", error);
  }
}

function renderDonutChart(data) {
  const ctx = document.getElementById('donutStatusChart').getContext('2d');
  if(window.myDonutChart) window.myDonutChart.destroy();

  window.myDonutChart = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: ['Hadir', 'Terlambat', 'Izin', 'Alpa'],
      datasets: [{
        data: [data.hadir, data.telat, data.izin, data.alpa],
        backgroundColor: ['#1dd1a1', '#feca57', '#ff9ff3', '#ff6b6b']
      }]
    },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

// Jalankan saat tab Dashboard aktif atau halaman dimuat
document.addEventListener("DOMContentLoaded", loadDashboardData);