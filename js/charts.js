// ==========================================
// FILE: js/charts.js - FULL RENDERING DASHBOARD (REVISI DATA KOSONG)
// ==========================================

const chartInstances = {};

function renderChart(canvasId, type, labels, datasets, options = {}) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  if (chartInstances[canvasId]) {
    chartInstances[canvasId].destroy();
  }

  const defaultOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { labels: { color: '#a2a3b7', font: { size: 11 } } }
    },
    scales: (type !== 'doughnut' && type !== 'pie') ? {
      x: { ticks: { color: '#a2a3b7' }, grid: { color: 'rgba(255,255,255,0.05)' } },
      // PERBAIKAN: Tambah stepSize dan suggestedMax agar grid grafik tetap tergambar walau data 0
      y: { ticks: { color: '#a2a3b7', stepSize: 1 }, grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: true, suggestedMax: 5 }
    } : {}
  };

  chartInstances[canvasId] = new Chart(ctx, {
    type: type,
    data: { labels: labels, datasets: datasets },
    options: { ...defaultOptions, ...options }
  });
}

window.updateDashboardUI = function(data) {
  if (!data) return;

  // 1. KPI CARDS
  const kpiNums = document.querySelectorAll('.kpi-num');
  if (kpiNums.length >= 8) {
    kpiNums[0].innerText = data.kpiSiswa?.total ?? 0;
    kpiNums[1].innerText = data.kpiSiswa?.hadir ?? '0%';
    kpiNums[2].innerText = data.kpiSiswa?.telat ?? 0;
    kpiNums[3].innerText = data.kpiSiswa?.alpa ?? 0;
    
    kpiNums[4].innerText = data.kpiGuru?.total ?? 0;
    kpiNums[5].innerText = data.kpiGuru?.hadir ?? '0%';
    kpiNums[6].innerText = data.kpiGuru?.telat ?? 0;
    kpiNums[7].innerText = data.kpiGuru?.cuti ?? 0;
  }

  // 2. PIE CHARTS
  if (data.statusSiswa) renderChart('chartStatusSiswa', 'doughnut', ['Hadir', 'Telat', 'Izin/Sakit', 'Alpa'], [{ data: data.statusSiswa, backgroundColor: ['#1dd1a1', '#feca57', '#54a0ff', '#ff6b6b'] }]);
  if (data.statusGuru) renderChart('chartStatusGuru', 'doughnut', ['Hadir', 'Telat', 'Cuti/Izin', 'Dinas'], [{ data: data.statusGuru, backgroundColor: ['#1dd1a1', '#feca57', '#54a0ff', '#ff9ff3'] }]);

  // 3. TREN MINGGUAN (LINE) - Hapus fake data 95, 92, dst ganti dengan [0,0,0,0,0] jika kosong
  renderChart('chartTrenSiswa', 'line', ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'], [{ label: 'Kehadiran Siswa (%)', data: data.trenSiswa || [0,0,0,0,0], borderColor: '#1dd1a1', tension: 0.3, fill: false }]);
  renderChart('chartTrenGuru', 'line', ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'], [{ label: 'Konsistensi Guru (%)', data: data.trenGuru || [0,0,0,0,0], borderColor: '#54a0ff', tension: 0.3, fill: false }]);

  // 4. BAR CHARTS (ANGKATAN)
  renderChart('chartAngkatan', 'bar', ['Kelas X', 'Kelas XI', 'Kelas XII'], [{ label: 'Jumlah Hadir', data: data.angkatanSiswa || [0,0,0], backgroundColor: '#00d2d3' }]);
  renderChart('chartJabatanGuru', 'bar', ['PNS', 'PPPK', 'GTT', 'Staf'], [{ label: 'Jumlah Hadir', data: data.jabatanGuru || [0,0,0,0], backgroundColor: '#ff9ff3' }]);

  // 6. DISTRIBUSI JAM MASUK (BAR)
  const jamLabels = ['< 06:30', '06:30-07:00', '07:01-07:30', '07:31-08:00', '> 08:00'];
  // PERBAIKAN: Selalu render chart dengan data [0,0,0,0,0] jika dari database kosong
  renderChart('chartHeatmapSiswa', 'bar', jamLabels, [{ label: 'Siswa Tap-In', data: data.distribusiJamSiswa || [0,0,0,0,0], backgroundColor: '#1dd1a1' }]);
  renderChart('chartHeatmapGuru', 'bar', jamLabels, [{ label: 'Guru Tap-In', data: data.distribusiJamGuru || [0,0,0,0,0], backgroundColor: '#54a0ff' }]);

  // 10. METODE ABSENSI
  renderChart('chartMetodeSiswa', 'doughnut', ['Wajah AI', 'RFID', 'Fingerprint', 'Manual'], [{ data: data.metodeSiswa || [0,0,0,0], backgroundColor: ['#ff9ff3', '#feca57', '#1dd1a1', '#54a0ff'] }]);
  renderChart('chartMetodeGuru', 'doughnut', ['Wajah AI (GPS)', 'Manual Admin'], [{ data: data.metodeGuru || [0,0], backgroundColor: ['#00d2d3', '#ff6b6b'] }]);

  // 11. TREN BULANAN
  renderChart('chartTelatBulanSiswa', 'line', ['M1', 'M2', 'M3', 'M4'], [{ label: 'Total Terlambat', data: data.telatBulanSiswa || [0,0,0,0], borderColor: '#feca57', tension: 0.3 }]);
  renderChart('chartPulangAwalGuru', 'line', ['M1', 'M2', 'M3', 'M4'], [{ label: 'Pulang Awal / Dinas', data: data.pulangAwalGuru || [0,0,0,0], borderColor: '#ff6b6b', tension: 0.3 }]);
};

window.updateListsUI = function(data) {
  if (!data) return;

  const fillTable = (elementId, list, cols) => {
    const el = document.getElementById(elementId);
    if (!el) return;
    // PERBAIKAN: Ganti pesan N/A di tabel
    if (!list || list.length === 0) {
      el.innerHTML = `<tr><td colspan="${cols.length}" style="text-align:center; color:#888; padding:15px;">Data Kosong / Nihil</td></tr>`;
      return;
    }
    el.innerHTML = list.map(item => `
      <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
        ${cols.map(c => `<td style="padding: 6px 4px;">${item[c] ?? 0}</td>`).join('')}
      </tr>
    `).join('');
  };

  // PERBAIKAN: Default parameter emptyText diubah dari 'N/A' menjadi 'Nihil'
  const fillList = (elementId, list, keyVal = 'nilai', emptyText = 'Nihil') => {
    const el = document.getElementById(elementId);
    if (!el) return;
    if (!list || list.length === 0) {
      el.innerHTML = `<li style="padding: 10px 0; color: #888; text-align: center;">${emptyText}</li>`;
      return;
    }
    el.innerHTML = list.map(item => `
      <li style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px dashed rgba(255,255,255,0.1);">
        <span>${item.nama}</span>
        <strong>${item[keyVal] ?? item.keterangan ?? ''}</strong>
      </li>
    `).join('');
  };

  fillTable('table-kelas-body', data.kelasSiswa, ['nama', 'hadir', 'kedua', 'ketiga']);
  fillTable('table-rumpun-body', data.rumpunGuru, ['nama', 'hadir', 'kedua', 'ketiga']);

  // PERBAIKAN: Pesan kustom untuk setiap list agar tidak cuma bertuliskan N/A
  fillList('list-terajin-siswa', data.terajinSiswa, 'nilai', 'Belum ada tap-in');
  fillList('list-terajin-guru', data.terajinGuru, 'nilai', 'Belum ada tap-in');
  fillList('list-telat-siswa', data.telatSiswa, 'nilai', 'Nihil');
  fillList('list-telat-guru', data.telatGuru, 'nilai', 'Nihil');
  fillList('list-alpa-siswa', data.alpaSiswa, 'nilai', 'Nihil');
  fillList('list-cuti-guru', data.cutiGuru, 'nilai', 'Nihil');
  fillList('list-belum-absen-siswa', data.belumAbsenSiswa, 'keterangan', 'Semua Sudah Tap');
  fillList('list-kosong-guru', data.kosongGuru, 'keterangan', 'Semua Sudah Tap');
};