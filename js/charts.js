// ==========================================
// FILE: js/charts.js - FULL RENDERING DASHBOARD
// ==========================================

// Penampung instance chart agar tidak error saat di-update ulang
const chartInstances = {};

// Helper untuk merender/memperbarui Chart.js secara aman
function renderChart(canvasId, type, labels, datasets, options = {}) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  // Hapus instance lama jika sudah ada
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
      y: { ticks: { color: '#a2a3b7' }, grid: { color: 'rgba(255,255,255,0.05)' }, beginAtZero: true }
    } : {}
  };

  chartInstances[canvasId] = new Chart(ctx, {
    type: type,
    data: { labels: labels, datasets: datasets },
    options: { ...defaultOptions, ...options }
  });
}

// ------------------------------------------
// 1. FUNGSI UPDATE GRAFIK & KPI UTAMA
// ------------------------------------------
window.updateDashboardUI = function(data) {
  if (!data) return;

  // --- 1. BARIS ATAS (KPI CARDS) ---
  const kpiNums = document.querySelectorAll('.kpi-num');
  if (kpiNums.length >= 8) {
    if (data.kpiSiswa) {
      kpiNums[0].innerText = data.kpiSiswa.total ?? 0;
      kpiNums[1].innerText = data.kpiSiswa.hadir ?? '0%';
      kpiNums[2].innerText = data.kpiSiswa.telat ?? 0;
      kpiNums[3].innerText = data.kpiSiswa.alpa ?? 0;
    }
    if (data.kpiGuru) {
      kpiNums[4].innerText = data.kpiGuru.total ?? 0;
      kpiNums[5].innerText = data.kpiGuru.hadir ?? '0%';
      kpiNums[6].innerText = data.kpiGuru.telat ?? 0;
      kpiNums[7].innerText = data.kpiGuru.cuti ?? 0;
    }
  }

  // --- 2. DISTRIBUSI STATUS (PIE/DOUGHNUT) ---
  if (data.statusSiswa) {
    renderChart('chartStatusSiswa', 'doughnut', ['Hadir', 'Telat', 'Izin/Sakit', 'Alpa'], [{
      data: data.statusSiswa,
      backgroundColor: ['#1dd1a1', '#feca57', '#54a0ff', '#ff6b6b']
    }]);
  }
  if (data.statusGuru) {
    renderChart('chartStatusGuru', 'doughnut', ['Hadir', 'Telat', 'Cuti/Izin', 'Dinas'], [{
      data: data.statusGuru,
      backgroundColor: ['#1dd1a1', '#feca57', '#54a0ff', '#ff9ff3']
    }]);
  }

  // --- 3. TREN KEHADIRAN MINGGUAN (LINE CHART) ---
  renderChart('chartTrenSiswa', 'line', ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'], [{
    label: 'Kehadiran Siswa (%)',
    data: data.trenSiswa || [95, 92, 98, 94, 90],
    borderColor: '#1dd1a1',
    tension: 0.3,
    fill: false
  }]);
  renderChart('chartTrenGuru', 'line', ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'], [{
    label: 'Konsistensi Guru (%)',
    data: data.trenGuru || [98, 100, 96, 98, 95],
    borderColor: '#54a0ff',
    tension: 0.3,
    fill: false
  }]);

  // --- 4. KEHADIRAN PER ANGKATAN / JABATAN (BAR CHART) ---
  renderChart('chartAngkatan', 'bar', ['Kelas X', 'Kelas XI', 'Kelas XII'], [{
    label: 'Jumlah Hadir',
    data: data.angkatanSiswa || [120, 115, 110],
    backgroundColor: '#00d2d3'
  }]);
  renderChart('chartJabatanGuru', 'bar', ['PNS', 'PPPK', 'GTT', 'Staf'], [{
    label: 'Jumlah Hadir',
    data: data.jabatanGuru || [15, 10, 20, 8],
    backgroundColor: '#ff9ff3'
  }]);

  // --- 6. DISTRIBUSI JAM MASUK (BAR CHART) ---
  const jamLabels = ['< 06:30', '06:30-07:00', '07:01-07:30', '07:31-08:00', '> 08:00'];
  if (data.distribusiJamSiswa) {
    renderChart('chartHeatmapSiswa', 'bar', jamLabels, [{
      label: 'Jumlah Siswa Tap-In',
      data: data.distribusiJamSiswa,
      backgroundColor: '#1dd1a1'
    }]);
  }
  if (data.distribusiJamGuru) {
    renderChart('chartHeatmapGuru', 'bar', jamLabels, [{
      label: 'Jumlah Guru Tap-In',
      data: data.distribusiJamGuru,
      backgroundColor: '#54a0ff'
    }]);
  }

  // --- 10. METODE ABSENSI ---
  renderChart('chartMetodeSiswa', 'doughnut', ['Wajah AI', 'RFID', 'Fingerprint', 'Manual'], [{
    data: data.metodeSiswa || [75, 15, 8, 2],
    backgroundColor: ['#ff9ff3', '#feca57', '#1dd1a1', '#54a0ff']
  }]);
  renderChart('chartMetodeGuru', 'doughnut', ['Wajah AI (GPS)', 'Manual Admin'], [{
    data: data.metodeGuru || [92, 8],
    backgroundColor: ['#00d2d3', '#ff6b6b']
  }]);

  // --- 11. TREN BULANAN ---
  renderChart('chartTelatBulanSiswa', 'line', ['Minggu 1', 'Minggu 2', 'Minggu 3', 'Minggu 4'], [{
    label: 'Total Terlambat',
    data: data.telatBulanSiswa || [12, 8, 5, 9],
    borderColor: '#feca57',
    tension: 0.3
  }]);
  renderChart('chartPulangAwalGuru', 'line', ['Minggu 1', 'Minggu 2', 'Minggu 3', 'Minggu 4'], [{
    label: 'Pulang Awal / Dinas',
    data: data.pulangAwalGuru || [1, 3, 0, 2],
    borderColor: '#ff6b6b',
    tension: 0.3
  }]);
};

// ------------------------------------------
// 2. FUNGSI UPDATE TABEL & LIST UI
// ------------------------------------------
window.updateListsUI = function(data) {
  if (!data) return;

  // Helper merender isi tabel HTML
  const fillTable = (elementId, list, cols) => {
    const el = document.getElementById(elementId);
    if (!el) return;
    if (!list || list.length === 0) {
      el.innerHTML = `<tr><td colspan="${cols.length}" style="text-align:center; color:#888; padding:8px;">Belum ada data</td></tr>`;
      return;
    }
    el.innerHTML = list.map(item => `
      <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
        ${cols.map(c => `<td style="padding: 6px 4px;">${item[c] ?? 0}</td>`).join('')}
      </tr>
    `).join('');
  };

  // Helper merender isi list UL HTML
  const fillList = (elementId, list, keyVal = 'nilai', emptyText = 'N/A') => {
    const el = document.getElementById(elementId);
    if (!el) return;
    if (!list || list.length === 0) {
      el.innerHTML = `<li style="padding: 4px 0; color: #888;">${emptyText}</li>`;
      return;
    }
    el.innerHTML = list.map(item => `
      <li style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px dashed rgba(255,255,255,0.1);">
        <span>${item.nama}</span>
        <strong>${item[keyVal] ?? item.keterangan ?? ''}</strong>
      </li>
    `).join('');
  };

  // --- 5. TABEL MATRIKS ---
  fillTable('table-kelas-body', data.kelasSiswa, ['nama', 'hadir', 'kedua', 'ketiga']);
  fillTable('table-rumpun-body', data.rumpunGuru, ['nama', 'hadir', 'kedua', 'ketiga']);

  // --- 7. LIST SISWA & GURU TERAJIN ---
  fillList('list-terajin-siswa', data.terajinSiswa);
  fillList('list-terajin-guru', data.terajinGuru);

  // --- 8. LIST SERING TERLAMBAT ---
  fillList('list-telat-siswa', data.telatSiswa);
  fillList('list-telat-guru', data.telatGuru);

  // --- 9. LIST ALPA / CUTI ---
  fillList('list-alpa-siswa', data.alpaSiswa);
  fillList('list-cuti-guru', data.cutiGuru);

  // --- 12. BELUM ABSEN / KOSONG ---
  fillList('list-belum-absen-siswa', data.belumAbsenSiswa, 'keterangan', 'Semua Sudah Tap');
  fillList('list-kosong-guru', data.kosongGuru, 'keterangan', 'Semua Guru Hadir');
};