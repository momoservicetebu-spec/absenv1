// ==========================================
// FILE: js/charts.js
// ==========================================
let chartsInstance = {};

window.updateDashboardUI = function(data) {
  if (!data) return;
  
  // Update 8 KPI (Sesuai urutan di HTML)
  const kpiElements = document.querySelectorAll('.kpi-num');
  if (kpiElements.length >= 8) {
    // KPI Siswa
    kpiElements[0].innerText = data.kpiSiswa?.total || 0;
    kpiElements[1].innerText = data.kpiSiswa?.hadir || "0%";
    kpiElements[2].innerText = data.kpiSiswa?.telat || 0;
    kpiElements[3].innerText = data.kpiSiswa?.alpa || 0;
    // KPI Guru
    kpiElements[4].innerText = data.kpiGuru?.total || 0;
    kpiElements[5].innerText = data.kpiGuru?.hadir || "0%";
    kpiElements[6].innerText = data.kpiGuru?.telat || 0;
    kpiElements[7].innerText = data.kpiGuru?.cuti || 0;
  }

  // Render Grafik
  const baseOpt = { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#dcdde1'} } } };
  const buildChart = (id, type, labels, datasets, opts = baseOpt) => {
    const canvas = document.getElementById(id);
    if (!canvas) return;
    if (chartsInstance[id]) chartsInstance[id].destroy();
    chartsInstance[id] = new Chart(canvas, { type, data: { labels, datasets }, options: opts });
  };

  // --- GRAFIK SISWA ---
  if (data.statusSiswa) buildChart('chartStatusSiswa', 'doughnut', ['Hadir', 'Telat', 'Izin', 'Alpa'], [{ data: data.statusSiswa, backgroundColor: ['#1dd1a1', '#feca57', '#ff9ff3', '#ff6b6b'] }]);
  if (data.trenSiswa) buildChart('chartTrenSiswa', 'line', data.trenSiswa.labels, [{ label: 'Kehadiran', data: data.trenSiswa.data, borderColor: '#00d2d3' }]);
  if (data.angkatanSiswa) buildChart('chartAngkatan', 'bar', data.angkatanSiswa.labels, [{ label: 'Hadir', data: data.angkatanSiswa.data, backgroundColor: '#54a0ff' }]);
  if (data.jamMasukSiswa) buildChart('chartHeatmapSiswa', 'bar', data.jamMasukSiswa.labels, [{ label: 'Siswa', data: data.jamMasukSiswa.data, backgroundColor: '#ff9ff3' }]);
  if (data.metodeSiswa) buildChart('chartMetodeSiswa', 'pie', data.metodeSiswa.labels, [{ data: data.metodeSiswa.data, backgroundColor: ['#54a0ff', '#1dd1a1', '#feca57'] }]);
  if (data.trenTelatSiswa) buildChart('chartTelatBulanSiswa', 'line', data.trenTelatSiswa.labels, [{ label: 'Telat', data: data.trenTelatSiswa.data, borderColor: '#ff6b6b' }]);

  // --- GRAFIK GURU ---
  if (data.statusGuru) buildChart('chartStatusGuru', 'doughnut', ['Hadir', 'Telat', 'Cuti', 'Dinas'], [{ data: data.statusGuru, backgroundColor: ['#1dd1a1', '#feca57', '#ff6b6b', '#54a0ff'] }]);
  if (data.trenGuru) buildChart('chartTrenGuru', 'line', data.trenGuru.labels, [{ label: 'Kehadiran', data: data.trenGuru.data, borderColor: '#54a0ff' }]);
  if (data.jabatanGuru) buildChart('chartJabatanGuru', 'bar', data.jabatanGuru.labels, [{ label: 'Hadir', data: data.jabatanGuru.data, backgroundColor: '#feca57' }]);
  if (data.jamMasukGuru) buildChart('chartHeatmapGuru', 'bar', data.jamMasukGuru.labels, [{ label: 'Guru', data: data.jamMasukGuru.data, backgroundColor: '#1dd1a1' }]);
  if (data.metodeGuru) buildChart('chartMetodeGuru', 'pie', data.metodeGuru.labels, [{ data: data.metodeGuru.data, backgroundColor: ['#54a0ff', '#1dd1a1'] }]);
  if (data.pulangGuru) buildChart('chartPulangAwalGuru', 'line', data.pulangGuru.labels, [{ label: 'Pulang Awal', data: data.pulangGuru.data, borderColor: '#ff9ff3' }]);
};