// ==========================================
// FILE: js/charts.js (FOKUS HANYA UNTUK MENGGAMBAR GRAFIK)
// ==========================================

// 1. Storage global instance chart untuk cegah memory leak
let chartsInstance = {};

// 2. FUNGSI MASTER UNTUK MEMPERBARUI UI
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

  // Render Ulang Grafik dengan data asli dari database
  renderCharts(data);
};

// 3. Fungsi Update Kotak KPI
function updateKPICards(kpi) {
  if (!kpi) return;

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

// 4. Fungsi Menggambar Grafik (Multi-Chart)
function renderCharts(data) {
  if (!data) return;

  const isMobile = window.innerWidth <= 768;

  // Konfigurasi dasar responsive
  const baseChartOptions = { 
    responsive: true, 
    maintainAspectRatio: false, 
    layout: { padding: { top: 5, bottom: 5, left: 5, right: 5 } },
    plugins: { 
      legend: { 
        position: 'top',
        labels: { color: '#dcdde1', font: { size: isMobile ? 9 : 11 }, boxWidth: isMobile ? 10 : 12, padding: isMobile ? 6 : 10 } 
      } 
    } 
  };

  const buildChart = (id, config) => {
    const canvas = document.getElementById(id);
    if (!canvas) return;
    if (chartsInstance[id]) chartsInstance[id].destroy();
    chartsInstance[id] = new Chart(canvas, config);
  };

  // --- GRAFIK SISWA ---
  
  const dataStatusSiswa = data.statusSiswa || data.statusAbsen;
  if (dataStatusSiswa) {
    buildChart('chartStatusSiswa', {
      type: 'doughnut',
      data: {
        labels: ['Hadir', 'Terlambat', 'Izin', 'Alpa'],
        datasets: [{ data: dataStatusSiswa, backgroundColor: ['#1dd1a1', '#feca57', '#ff9ff3', '#ff6b6b'] }]
      },
      options: { ...baseChartOptions }
    });
  }

  const dataTrenSiswa = data.trenSiswa || data.tren;
  if (dataTrenSiswa && dataTrenSiswa.labels) {
    buildChart('chartTrenSiswa', {
      type: 'line',
      data: {
        labels: dataTrenSiswa.labels,
        datasets: [{ label: 'Kehadiran Siswa', data: dataTrenSiswa.data, borderColor: '#00d2d3', fill: true, backgroundColor: 'rgba(0,210,211,0.1)' }]
      },
      options: { ...baseChartOptions }
    });
  }

  const dataAngkatan = data.angkatanSiswa || data.kehadiranAngkatan;
  if (dataAngkatan) {
    const labels = Array.isArray(dataAngkatan) ? ['Kelas X', 'Kelas XI', 'Kelas XII'] : dataAngkatan.labels;
    const chartData = Array.isArray(dataAngkatan) ? dataAngkatan : dataAngkatan.data;
    buildChart('chartAngkatan', {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{ label: 'Hadir (%)', data: chartData, backgroundColor: '#54a0ff' }]
      },
      options: { ...baseChartOptions }
    });
  }

  const dataAlasanSiswa = data.alasanSiswa || data.alasan;
  if (dataAlasanSiswa && dataAlasanSiswa.labels) {
    buildChart('chartReasonSiswa', {
      type: 'bar',
      indexAxis: 'y',
      data: {
        labels: dataAlasanSiswa.labels,
        datasets: [{ label: 'Jumlah', data: dataAlasanSiswa.data, backgroundColor: '#ff9ff3' }]
      },
      options: { ...baseChartOptions }
    });
  }

  const dataTopSiswa = data.topSiswa;
  if (dataTopSiswa && dataTopSiswa.labels) {
    buildChart('chartTopSiswa', {
      type: 'bar',
      indexAxis: 'y',
      data: {
        labels: dataTopSiswa.labels,
        datasets: [{ label: 'Kehadiran (%)', data: dataTopSiswa.data, backgroundColor: '#1dd1a1' }]
      },
      options: { ...baseChartOptions }
    });
  }

  // --- GRAFIK GURU ---

  if (data.statusGuru) {
    buildChart('chartStatusGuru', {
      type: 'doughnut',
      data: {
        labels: ['Hadir', 'Terlambat', 'Cuti', 'Dinas Luar'],
        datasets: [{ data: data.statusGuru, backgroundColor: ['#1dd1a1', '#feca57', '#ff6b6b', '#54a0ff'] }]
      },
      options: { ...baseChartOptions }
    });
  }

  if (data.trenGuru && data.trenGuru.labels) {
    buildChart('chartTrenGuru', {
      type: 'line',
      data: {
        labels: data.trenGuru.labels,
        datasets: [{ label: 'Kehadiran Guru', data: data.trenGuru.data, borderColor: '#54a0ff', fill: true, backgroundColor: 'rgba(84, 160, 255, 0.1)' }]
      },
      options: { ...baseChartOptions }
    });
  }

  if (data.jabatanGuru && data.jabatanGuru.labels) {
    buildChart('chartJabatanGuru', {
      type: 'bar',
      data: {
        labels: data.jabatanGuru.labels,
        datasets: [{ label: 'Kehadiran (%)', data: data.jabatanGuru.data, backgroundColor: '#feca57' }]
      },
      options: { ...baseChartOptions }
    });
  }
}