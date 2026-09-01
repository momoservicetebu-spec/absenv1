// ==========================================
// FILE: js/charts.js
// ==========================================

window.addEventListener('DOMContentLoaded', async () => {
  // 1. Siapkan Data Dummy sebagai Fallback (jika API belum terhubung/gagal)
  let dbData = {
    statusAbsen: [428, 15, 7, 3], // Hadir, Terlambat, Izin, Alpa
    kehadiranAngkatan: [96, 92, 95], // X, XI, XII
    alasan: { labels: ['Macet', 'Sakit', 'Ban Bocor', 'Hujan', 'Keluarga'], data: [12, 8, 5, 4, 2] },
    tren: { labels: ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'], data: [440, 435, 438, 428, 410, 425] },
    topSiswa: { labels: ['Andi W', 'Siska A', 'Reza R', 'Dewi P', 'Bagus P'], data: [100, 100, 99, 98, 98] },
    kpi: { total: 512, persen: "94.2%", hadir: 428, telat: 15, izin: 7, alpa: 3 }
  };

  // 2. Ambil data asli dari Database (Google Apps Script)
  console.log("Mengambil data analitik dari server...");
  const res = await fetchAPI('getDashboardStats');
  
  if (res && res.success && res.data) {
    console.log("Berhasil memuat data asli dari database!");
    dbData = res.data; // Timpa data dummy dengan data asli dari server
    updateKPICards(dbData.kpi); // Update angka KPI Card di HTML
  } else {
    console.warn("Menggunakan data dummy. Backend mungkin belum menyiapkan endpoint 'getDashboardStats'.");
  }

  // 3. Render Grafik dengan data (Asli atau Dummy)
  renderCharts(dbData);
});

// Fungsi untuk mengupdate angka pada kotak KPI (Total User, Hadir, dll) di HTML
function updateKPICards(kpi) {
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

// Fungsi untuk menggambar Chart.js
function renderCharts(data) {
  const chartOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#dcdde1', font: { size: 10 } } } } };

  // 1. Donut Chart Status Absen
  new Chart(document.getElementById('donutStatusChart'), {
    type: 'doughnut',
    data: {
      labels: ['Hadir', 'Terlambat', 'Izin', 'Alpa'],
      datasets: [{ data: data.statusAbsen, backgroundColor: ['#1dd1a1', '#feca57', '#ff9ff3', '#ff6b6b'] }]
    },
    options: chartOptions
  });

  // 2. Bar Chart per Angkatan
  new Chart(document.getElementById('barGradeChart'), {
    type: 'bar',
    data: {
      labels: ['Kelas X', 'Kelas XI', 'Kelas XII'],
      datasets: [{ label: 'Hadir (%)', data: data.kehadiranAngkatan, backgroundColor: '#54a0ff' }]
    },
    options: { ...chartOptions, scales: { y: { ticks: { color: '#a29bfe' } }, x: { ticks: { color: '#a29bfe' } } } }
  });

  // 3. Horizontal Bar Alasan
  new Chart(document.getElementById('horizontalReasonChart'), {
    type: 'bar',
    indexAxis: 'y',
    data: {
      labels: data.alasan.labels,
      datasets: [{ label: 'Jumlah', data: data.alasan.data, backgroundColor: '#ff9ff3' }]
    },
    options: chartOptions
  });

  // 4. Line Chart Tren Kehadiran
  new Chart(document.getElementById('lineTrendChart'), {
    type: 'line',
    data: {
      labels: data.tren.labels,
      datasets: [{ label: 'Jumlah Hadir', data: data.tren.data, borderColor: '#00d2d3', fill: true, backgroundColor: 'rgba(0,210,211,0.1)' }]
    },
    options: chartOptions
  });

  // 5. Horizontal Bar Top Siswa
  new Chart(document.getElementById('topStudentChart'), {
    type: 'bar',
    indexAxis: 'y',
    data: {
      labels: data.topSiswa.labels,
      datasets: [{ label: 'Total Kehadiran', data: data.topSiswa.data, backgroundColor: '#1dd1a1' }]
    },
    options: chartOptions
  });
}