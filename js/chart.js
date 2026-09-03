// ==========================================
// FILE: js/charts.js (OPTIMIZED FOR 12 WIDGETS - SISWA & GURU)
// ==========================================

// 1. Storage global instance chart untuk cegah memory leak
let chartsInstance = {};

window.addEventListener('DOMContentLoaded', async () => {
  // Data Dummy Awal (Meliputi Data Siswa & Guru)
  let dbData = {
    // Data KPI
    kpi: { total: 512, persen: "94.2%", hadir: 428, telat: 15, izin: 7, alpa: 3 },

    // Data Grafik Siswa
    statusSiswa: [428, 15, 7, 3], // Hadir, Terlambat, Izin, Alpa
    trenSiswa: { labels: ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'], data: [440, 435, 438, 428, 410, 425] },
    angkatanSiswa: { labels: ['Kelas X', 'Kelas XI', 'Kelas XII'], data: [96, 92, 95] },
    alasanSiswa: { labels: ['Macet', 'Sakit', 'Ban Bocor', 'Hujan', 'Keluarga'], data: [12, 8, 5, 4, 2] },
    topSiswa: { labels: ['Andi W', 'Siska A', 'Reza R', 'Dewi P', 'Bagus P'], data: [100, 100, 99, 98, 98] },

    // Data Grafik Guru
    statusGuru: [58, 4, 2, 1], // Hadir, Terlambat, Cuti, Dinas
    trenGuru: { labels: ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'], data: [62, 64, 63, 60, 61, 65] },
    jabatanGuru: { labels: ['PNS/PPPK', 'GTT', 'GTY', 'Honorer'], data: [98, 94, 90, 92] },
    alasanGuru: { labels: ['Dinas Luar', 'Sakit', 'Cuti Menerangkan', 'Macet'], data: [6, 4, 3, 2] },
    topGuru: { labels: ['Budi, S.Pd', 'Siti, M.Pd', 'Ahmad, S.T', 'Eka, S.Kom', 'Rina, M.Si'], data: [100, 100, 100, 99, 98] }
  };

  console.log("Mengambil data analitik awal dari server...");
  if (typeof fetchAPI === "function") {
    try {
      const res = await fetchAPI('getDashboardStats');
      if (res && res.success && res.data) {
        console.log("Berhasil memuat data asli dari database!");
        dbData = res.data;
      } else {
        console.warn("Menggunakan data dummy awal.");
      }
    } catch (err) {
      console.error("Gagal koneksi API, memuat data dummy.", err);
    }
  }

  // Render pertama kali saat halaman dibuka
  window.updateDashboardUI(dbData);
});

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

  // Render Ulang Grafik
  renderCharts(data);
};

// 3. Fungsi Update Kotak KPI (Sesuai ID & Class)
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

// 4. Fungsi Menggambar Grafik (Mendukung Multi-Chart 12 Widget)
function renderCharts(data) {
  if (!data) return;

  const isMobile = window.innerWidth <= 768;

  // Konfigurasi dasar responsive
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

  // Helper universal untuk pembuatan chart dan auto-destroy
  const buildChart = (id, config) => {
    const canvas = document.getElementById(id);
    if (!canvas) return;
    if (chartsInstance[id]) {
      chartsInstance[id].destroy();
    }
    chartsInstance[id] = new Chart(canvas, config);
  };

  // ==========================================
  // GRAFIK SISWA
  // ==========================================
  
  // 1. Donut Status Siswa (ID: chartStatusSiswa / donutStatusChart)
  const dataStatusSiswa = data.statusSiswa || data.statusAbsen;
  if (dataStatusSiswa) {
    const targetId = document.getElementById('chartStatusSiswa') ? 'chartStatusSiswa' : 'donutStatusChart';
    buildChart(targetId, {
      type: 'doughnut',
      data: {
        labels: ['Hadir', 'Terlambat', 'Izin', 'Alpa'],
        datasets: [{ data: dataStatusSiswa, backgroundColor: ['#1dd1a1', '#feca57', '#ff9ff3', '#ff6b6b'] }]
      },
      options: {
        ...baseChartOptions,
        plugins: {
          ...baseChartOptions.plugins,
          legend: { ...baseChartOptions.plugins.legend, position: isMobile ? 'bottom' : 'top' }
        }
      }
    });
  }

  // 2. Line Tren Siswa (ID: chartTrenSiswa / lineTrendChart)
  const dataTrenSiswa = data.trenSiswa || data.tren;
  if (dataTrenSiswa && dataTrenSiswa.labels) {
    const targetId = document.getElementById('chartTrenSiswa') ? 'chartTrenSiswa' : 'lineTrendChart';
    buildChart(targetId, {
      type: 'line',
      data: {
        labels: dataTrenSiswa.labels,
        datasets: [{ label: 'Kehadiran Siswa', data: dataTrenSiswa.data, borderColor: '#00d2d3', fill: true, backgroundColor: 'rgba(0,210,211,0.1)' }]
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

  // 3. Bar Angkatan Siswa (ID: chartAngkatan / barGradeChart)
  const dataAngkatan = data.angkatanSiswa || data.kehadiranAngkatan;
  if (dataAngkatan) {
    const targetId = document.getElementById('chartAngkatan') ? 'chartAngkatan' : 'barGradeChart';
    const labels = Array.isArray(dataAngkatan) ? ['Kelas X', 'Kelas XI', 'Kelas XII'] : dataAngkatan.labels;
    const chartData = Array.isArray(dataAngkatan) ? dataAngkatan : dataAngkatan.data;
    buildChart(targetId, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{ label: 'Hadir (%)', data: chartData, backgroundColor: '#54a0ff' }]
      },
      options: {
        ...baseChartOptions,
        scales: {
          x: { ticks: { color: '#a29bfe', font: { size: isMobile ? 9 : 11 } }, grid: { display: false } },
          y: { ticks: { color: '#a29bfe', font: { size: isMobile ? 9 : 11 } }, grid: { color: 'rgba(255,255,255,0.05)' } }
        }
      }
    });
  }

  // 4. Horizontal Bar Alasan Siswa (ID: chartReasonSiswa / horizontalReasonChart)
  const dataAlasanSiswa = data.alasanSiswa || data.alasan;
  if (dataAlasanSiswa && dataAlasanSiswa.labels) {
    const targetId = document.getElementById('chartReasonSiswa') ? 'chartReasonSiswa' : 'horizontalReasonChart';
    buildChart(targetId, {
      type: 'bar',
      indexAxis: 'y',
      data: {
        labels: dataAlasanSiswa.labels,
        datasets: [{ label: 'Jumlah', data: dataAlasanSiswa.data, backgroundColor: '#ff9ff3' }]
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

  // 5. Top Siswa Terajin (ID: chartTopSiswa / topStudentChart)
  const dataTopSiswa = data.topSiswa;
  if (dataTopSiswa && dataTopSiswa.labels) {
    const targetId = document.getElementById('chartTopSiswa') ? 'chartTopSiswa' : 'topStudentChart';
    buildChart(targetId, {
      type: 'bar',
      indexAxis: 'y',
      data: {
        labels: dataTopSiswa.labels,
        datasets: [{ label: 'Kehadiran (%)', data: dataTopSiswa.data, backgroundColor: '#1dd1a1' }]
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

  // ==========================================
  // GRAFIK GURU
  // ==========================================

  // 6. Donut Status Guru (ID: chartStatusGuru)
  if (data.statusGuru) {
    buildChart('chartStatusGuru', {
      type: 'doughnut',
      data: {
        labels: ['Hadir', 'Terlambat', 'Cuti', 'Dinas Luar'],
        datasets: [{ data: data.statusGuru, backgroundColor: ['#1dd1a1', '#feca57', '#ff6b6b', '#54a0ff'] }]
      },
      options: {
        ...baseChartOptions,
        plugins: {
          ...baseChartOptions.plugins,
          legend: { ...baseChartOptions.plugins.legend, position: isMobile ? 'bottom' : 'top' }
        }
      }
    });
  }

  // 7. Line Tren Guru (ID: chartTrenGuru)
  if (data.trenGuru && data.trenGuru.labels) {
    buildChart('chartTrenGuru', {
      type: 'line',
      data: {
        labels: data.trenGuru.labels,
        datasets: [{ label: 'Kehadiran Guru', data: data.trenGuru.data, borderColor: '#54a0ff', fill: true, backgroundColor: 'rgba(84, 160, 255, 0.1)' }]
      },
      options: {
        ...baseChartOptions,
        scales: {
          x: { ticks: { color: '#a29bfe', font: { size: isMobile ? 9 : 11 } } },
          y: { ticks: { color: '#a29bfe', font: { size: isMobile ? 9 : 11 } } }
        }
      }
    });
  }

  // 8. Bar Jabatan/Status Guru (ID: chartJabatanGuru)
  if (data.jabatanGuru && data.jabatanGuru.labels) {
    buildChart('chartJabatanGuru', {
      type: 'bar',
      data: {
        labels: data.jabatanGuru.labels,
        datasets: [{ label: 'Kehadiran (%)', data: data.jabatanGuru.data, backgroundColor: '#feca57' }]
      },
      options: {
        ...baseChartOptions,
        scales: {
          x: { ticks: { color: '#a29bfe', font: { size: isMobile ? 9 : 11 } }, grid: { display: false } },
          y: { ticks: { color: '#a29bfe', font: { size: isMobile ? 9 : 11 } } }
        }
      }
    });
  }

  // 9. Horizontal Bar Alasan Guru (ID: chartReasonGuru)
  if (data.alasanGuru && data.alasanGuru.labels) {
    buildChart('chartReasonGuru', {
      type: 'bar',
      indexAxis: 'y',
      data: {
        labels: data.alasanGuru.labels,
        datasets: [{ label: 'Jumlah Disetujui', data: data.alasanGuru.data, backgroundColor: '#ff9ff3' }]
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

  // 10. Top Guru Terajin (ID: chartTopGuru)
  if (data.topGuru && data.topGuru.labels) {
    buildChart('chartTopGuru', {
      type: 'bar',
      indexAxis: 'y',
      data: {
        labels: data.topGuru.labels,
        datasets: [{ label: 'Kehadiran (%)', data: data.topGuru.data, backgroundColor: '#1dd1a1' }]
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