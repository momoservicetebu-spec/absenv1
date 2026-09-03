// ==========================================
// FILE: js/charts.js (OPTIMIZED FOR MOBILE & TABLET)
// ==========================================

// 1. Variabel Global untuk menyimpan instance Chart
let donutChartInstance = null;
let barGradeChartInstance = null;
let horizontalReasonChartInstance = null;
let lineTrendChartInstance = null;
let topStudentChartInstance = null;

window.addEventListener('DOMContentLoaded', async () => {
  // Data Dummy awal
  let dbData = {
    statusAbsen: [428, 15, 7, 3], // Hadir, Terlambat, Izin, Alpa
    kehadiranAngkatan: [96, 92, 95], // X, XI, XII
    alasan: { labels: ['Macet', 'Sakit', 'Ban Bocor', 'Hujan', 'Keluarga'], data: [12, 8, 5, 4, 2] },
    tren: { labels: ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'], data: [440, 435, 438, 428, 410, 425] },
    topSiswa: { labels: ['Andi W', 'Siska A', 'Reza R', 'Dewi P', 'Bagus P'], data: [100, 100, 99, 98, 98] },
    kpi: { total: 512, persen: "94.2%", hadir: 428, telat: 15, izin: 7, alpa: 3 }
  };

  console.log("Mengambil data analitik awal dari server...");
  if (typeof fetchAPI === "function") {
    const res = await fetchAPI('getDashboardStats');
    if (res && res.success && res.data) {
      console.log("Berhasil memuat data asli dari database!");
      dbData = res.data;
    } else {
      console.warn("Menggunakan data dummy awal.");
    }
  }

  // Render pertama kali saat halaman dibuka
  window.updateDashboardUI(dbData);
});

// 2. FUNGSI MASTER UNTUK MEMPERBARUI UI SAAT FILTER DIKLIK DARI ui.js
window.updateDashboardUI = function(data) {
  if (!data) return;

  // Update KPI Cards
  if (data.kpi) {
    updateKPICards(data.kpi);
  } else {
    updateKPICards({
      total: data.totalUsers ?? data.total ?? 0,
      persen: typeof data.persentase === 'number' ? data.persentase + '%' : (data.persen ?? "0%"),
      hadir: data.hadir ?? 0,
      telat: data.telat ?? 0,
      izin: data.izin ?? 0,
      alpa: data.alpa ?? 0
    });
  }

  // Render Ulang Grafik
  renderCharts(data);
};

// 3. Fungsi Update Kotak KPI
function updateKPICards(kpi) {
  if (!kpi) return;

  if (document.getElementById("kpi-total")) document.getElementById("kpi-total").innerText = kpi.total;
  if (document.getElementById("kpi-persen")) document.getElementById("kpi-persen").innerText = kpi.persen;
  if (document.getElementById("kpi-hadir")) document.getElementById("kpi-hadir").innerText = kpi.hadir;
  if (document.getElementById("kpi-telat")) document.getElementById("kpi-telat").innerText = kpi.telat;
  if (document.getElementById("kpi-izin")) document.getElementById("kpi-izin").innerText = kpi.izin;
  if (document.getElementById("kpi-alpa")) document.getElementById("kpi-alpa").innerText = kpi.alpa;

  const kpiElements = document.querySelectorAll('.kpi-num');
  if (kpiElements.length >= 6) {
    kpiElements[0].innerText = kpi.total;
    kpiElements[1].innerText = kpi.persen;
    kpiElements[2].innerText = kpi.hadir;
    kpiElements[3].innerText = kpi.telat;
    kpiElements[4].innerText = kpi.izin;
    kpiElements[5].innerText = kpi.alpa;
  }
}

// 4. Fungsi Menggambar Grafik (Dengan Proteksi Destroy & Mobile Responsive)
function renderCharts(data) {
  if (!data) return;

  // Detect Lebar Layar untuk penyesuaian font dinamis
  const isMobile = window.innerWidth <= 768;

  // Opsi Umum (Base Configuration)
  const baseChartOptions = { 
    responsive: true, 
    maintainAspectRatio: false, 
    layout: {
      padding: { top: 5, bottom: 5, left: 5, right: 5 }
    },
    plugins: { 
      legend: { 
        position: 'top',
        labels: { 
          color: '#dcdde1', 
          font: { size: isMobile ? 9 : 11 },
          boxWidth: isMobile ? 10 : 12,
          padding: isMobile ? 6 : 10
        } 
      } 
    } 
  };

  // 1. Donut Chart Status Absen
  const donutEl = document.getElementById('donutStatusChart');
  if (donutEl && data.statusAbsen) {
    if (donutChartInstance) donutChartInstance.destroy();
    donutChartInstance = new Chart(donutEl, {
      type: 'doughnut',
      data: {
        labels: ['Hadir', 'Terlambat', 'Izin', 'Alpa'],
        datasets: [{ data: data.statusAbsen, backgroundColor: ['#1dd1a1', '#feca57', '#ff9ff3', '#ff6b6b'] }]
      },
      options: {
        ...baseChartOptions,
        plugins: {
          ...baseChartOptions.plugins,
          // Pindahkan legend ke bawah di HP agar lingkaran donut tidak mengecil
          legend: {
            ...baseChartOptions.plugins.legend,
            position: isMobile ? 'bottom' : 'top'
          }
        }
      }
    });
  }

  // 2. Bar Chart per Angkatan
  const barGradeEl = document.getElementById('barGradeChart');
  if (barGradeEl && data.kehadiranAngkatan) {
    if (barGradeChartInstance) barGradeChartInstance.destroy();
    barGradeChartInstance = new Chart(barGradeEl, {
      type: 'bar',
      data: {
        labels: ['Kelas X', 'Kelas XI', 'Kelas XII'],
        datasets: [{ label: 'Hadir (%)', data: data.kehadiranAngkatan, backgroundColor: '#54a0ff' }]
      },
      options: { 
        ...baseChartOptions, 
        scales: { 
          y: { 
            ticks: { color: '#a29bfe', font: { size: isMobile ? 9 : 11 } },
            grid: { color: 'rgba(255,255,255,0.05)' }
          }, 
          x: { 
            ticks: { color: '#a29bfe', font: { size: isMobile ? 9 : 11 } },
            grid: { display: false }
          } 
        } 
      }
    });
  }

  // 3. Horizontal Bar Alasan
  const reasonEl = document.getElementById('horizontalReasonChart');
  if (reasonEl && data.alasan && data.alasan.labels) {
    if (horizontalReasonChartInstance) horizontalReasonChartInstance.destroy();
    horizontalReasonChartInstance = new Chart(reasonEl, {
      type: 'bar',
      indexAxis: 'y',
      data: {
        labels: data.alasan.labels,
        datasets: [{ label: 'Jumlah', data: data.alasan.data, backgroundColor: '#ff9ff3' }]
      },
      options: {
        ...baseChartOptions,
        scales: {
          x: { ticks: { color: '#a29bfe', font: { size: isMobile ? 9 : 11 } } },
          y: { ticks: { color: '#a29bfe', font: { size: isMobile ? 8 : 10 } } } // Font nama alasan lebih kecil agar tidak terpotong
        }
      }
    });
  }

  // 4. Line Chart Tren Kehadiran
  const lineEl = document.getElementById('lineTrendChart');
  if (lineEl && data.tren && data.tren.labels) {
    if (lineTrendChartInstance) lineTrendChartInstance.destroy();
    lineTrendChartInstance = new Chart(lineEl, {
      type: 'line',
      data: {
        labels: data.tren.labels,
        datasets: [{ label: 'Jumlah Hadir', data: data.tren.data, borderColor: '#00d2d3', fill: true, backgroundColor: 'rgba(0,210,211,0.1)' }]
      },
      options: {
        ...baseChartOptions,
        scales: {
          x: { ticks: { color: '#a29bfe', font: { size: isMobile ? 9 : 11 }, autoSkip: true, maxTicksLimit: 7 } },
          y: { ticks: { color: '#a29bfe', font: { size: isMobile ? 9 : 11 } } }
        }
      }
    });
  }

  // 5. Horizontal Bar Top Siswa
  const topStudentEl = document.getElementById('topStudentChart');
  if (topStudentEl && data.topSiswa && data.topSiswa.labels) {
    if (topStudentChartInstance) topStudentChartInstance.destroy();
    topStudentChartInstance = new Chart(topStudentEl, {
      type: 'bar',
      indexAxis: 'y',
      data: {
        labels: data.topSiswa.labels,
        datasets: [{ label: 'Total Kehadiran', data: data.topSiswa.data, backgroundColor: '#1dd1a1' }]
      },
      options: {
        ...baseChartOptions,
        scales: {
          x: { ticks: { color: '#a29bfe', font: { size: isMobile ? 9 : 11 } } },
          y: { ticks: { color: '#a29bfe', font: { size: isMobile ? 8 : 10 } } }
        }
      }
    });
  }
}