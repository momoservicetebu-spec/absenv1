// ==========================================
// FILE: js/charts.js - REVISI LENGKAP
// ==========================================

const chartInstances = {};

/**
 * Helper Merender Chart.js dengan Proteksi Data & Skala Dinamis
 */
function renderChart(canvasId, type, labels, datasets, options = {}) {
  const ctx = document.getElementById(canvasId);
  if (!ctx) return;

  // Hancurkan instance chart lama jika ada
  if (chartInstances[canvasId]) {
    chartInstances[canvasId].destroy();
    delete chartInstances[canvasId];
  }

  let finalLabels = labels;
  let finalDatasets = datasets;
  let isDataEmpty = false;

  // 1. LOGIKA HANDLING PIE / DOUGHNUT KOSONG
  if ((type === 'doughnut' || type === 'pie') && datasets && datasets[0]) {
    const totalSum = datasets[0].data.reduce((acc, curr) => acc + (Number(curr) || 0), 0);
    if (totalSum === 0) {
      isDataEmpty = true;
      finalLabels = ['Belum Ada Data'];
      finalDatasets = [{
        data: [1],
        backgroundColor: ['rgba(255, 255, 255, 0.08)'],
        borderColor: 'rgba(255, 255, 255, 0.15)',
        borderWidth: 1
      }];
    }
  }

  // 2. DEFAULT CONFIGURATION
  const defaultPlugins = {
    legend: {
      labels: { color: '#a2a3b7', font: { size: 11 } }
    },
    tooltip: {
      enabled: !isDataEmpty // Matikan tooltip jika data kosong
    }
  };

  const defaultScales = (type !== 'doughnut' && type !== 'pie') ? {
    x: {
      ticks: { color: '#a2a3b7' },
      grid: { color: 'rgba(255,255,255,0.05)' }
    },
    y: {
      ticks: { 
        color: '#a2a3b7',
        precision: 0
      },
      grid: { color: 'rgba(255,255,255,0.05)' },
      beginAtZero: true
    }
  } : {};

  // Combine Options (Smart Merge)
  const finalOptions = {
    responsive: true,
    maintainAspectRatio: false,
    ...options,
    plugins: { ...defaultPlugins, ...(options.plugins || {}) },
    scales: (type !== 'doughnut' && type !== 'pie') ? {
      x: { ...defaultScales.x, ...(options.scales?.x || {}) },
      y: { ...defaultScales.y, ...(options.scales?.y || {}) }
    } : {}
  };

  chartInstances[canvasId] = new Chart(ctx, {
    type: type,
    data: { labels: finalLabels, datasets: finalDatasets },
    options: finalOptions
  });
}

/**
 * 1. UPDATE DASHBOARD ANALYTICS (KPI & CHARTS)
 */
window.updateDashboardUI = function(data) {
  if (!data) return;

  // Helper format persen pada KPI
  const formatPercent = (val) => {
    if (val === undefined || val === null) return '0%';
    if (typeof val === 'number') return `${val.toFixed(1).replace('.0', '')}%`;
    return String(val).includes('%') ? val : `${val}%`;
  };

  // 1. KPI CARDS
  const kpiNums = document.querySelectorAll('.kpi-num');
  if (kpiNums.length >= 8) {
    kpiNums[0].innerText = data.kpiSiswa?.total ?? 0;
    kpiNums[1].innerText = formatPercent(data.kpiSiswa?.hadir);
    kpiNums[2].innerText = data.kpiSiswa?.telat ?? 0;
    kpiNums[3].innerText = data.kpiSiswa?.alpa ?? 0;
    
    kpiNums[4].innerText = data.kpiGuru?.total ?? 0;
    kpiNums[5].innerText = formatPercent(data.kpiGuru?.hadir);
    kpiNums[6].innerText = data.kpiGuru?.telat ?? 0;
    kpiNums[7].innerText = data.kpiGuru?.cuti ?? 0;
  }

  // 2. PIE / DOUGHNUT CHARTS (STATUS)
  renderChart('chartStatusSiswa', 'doughnut', 
    ['Hadir', 'Telat', 'Izin/Sakit', 'Alpa'], 
    [{ data: data.statusSiswa || [0,0,0,0], backgroundColor: ['#1dd1a1', '#feca57', '#54a0ff', '#ff6b6b'] }]
  );
  renderChart('chartStatusGuru', 'doughnut', 
    ['Hadir', 'Telat', 'Cuti/Izin', 'Dinas'], 
    [{ data: data.statusGuru || [0,0,0,0], backgroundColor: ['#1dd1a1', '#feca57', '#54a0ff', '#ff9ff3'] }]
  );

  // 3. TREN MINGGUAN (LINE - SCALE 0-100%)
  const percentScaleOption = {
    scales: {
      y: {
        min: 0,
        max: 100,
        ticks: {
          callback: (value) => value + '%'
        }
      }
    }
  };

  renderChart('chartTrenSiswa', 'line', 
    ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'], 
    [{ label: 'Kehadiran Siswa (%)', data: data.trenSiswa || [0,0,0,0,0], borderColor: '#1dd1a1', tension: 0.3, fill: false }],
    percentScaleOption
  );
  renderChart('chartTrenGuru', 'line', 
    ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat'], 
    [{ label: 'Konsistensi Guru (%)', data: data.trenGuru || [0,0,0,0,0], borderColor: '#54a0ff', tension: 0.3, fill: false }],
    percentScaleOption
  );

  // 4. BAR CHARTS (ANGKATAN & JABATAN)
  renderChart('chartAngkatan', 'bar', 
    ['Kelas X', 'Kelas XI', 'Kelas XII'], 
    [{ label: 'Jumlah Hadir', data: data.angkatanSiswa || [0,0,0], backgroundColor: '#00d2d3' }]
  );
  renderChart('chartJabatanGuru', 'bar', 
    ['PNS', 'PPPK', 'GTT', 'Staf'], 
    [{ label: 'Jumlah Hadir', data: data.jabatanGuru || [0,0,0,0], backgroundColor: '#ff9ff3' }]
  );

  // 5. DISTRIBUSI JAM MASUK (BAR)
  const jamLabels = ['< 06:30', '06:30-07:00', '07:01-07:30', '07:31-08:00', '> 08:00'];
  renderChart('chartHeatmapSiswa', 'bar', 
    jamLabels, 
    [{ label: 'Siswa Tap-In', data: data.distribusiJamSiswa || [0,0,0,0,0], backgroundColor: '#1dd1a1' }]
  );
  renderChart('chartHeatmapGuru', 'bar', 
    jamLabels, 
    [{ label: 'Guru Tap-In', data: data.distribusiJamGuru || [0,0,0,0,0], backgroundColor: '#54a0ff' }]
  );

  // 6. METODE ABSENSI (PIE / DOUGHNUT)
  renderChart('chartMetodeSiswa', 'doughnut', 
    ['Wajah AI', 'RFID', 'Fingerprint', 'Manual'], 
    [{ data: data.metodeSiswa || [0,0,0,0], backgroundColor: ['#ff9ff3', '#feca57', '#1dd1a1', '#54a0ff'] }]
  );
  renderChart('chartMetodeGuru', 'doughnut', 
    ['Wajah AI (GPS)', 'Manual Admin'], 
    [{ data: data.metodeGuru || [0,0], backgroundColor: ['#00d2d3', '#ff6b6b'] }]
  );

  // 7. TREN BULANAN (LINE)
  renderChart('chartTelatBulanSiswa', 'line', 
    ['M1', 'M2', 'M3', 'M4'], 
    [{ label: 'Total Terlambat', data: data.telatBulanSiswa || [0,0,0,0], borderColor: '#feca57', tension: 0.3 }]
  );
  renderChart('chartPulangAwalGuru', 'line', 
    ['M1', 'M2', 'M3', 'M4'], 
    [{ label: 'Pulang Awal / Dinas', data: data.pulangAwalGuru || [0,0,0,0], borderColor: '#ff6b6b', tension: 0.3 }]
  );
};

/**
 * 2. UPDATE TABEL & LIST UI
 */
window.updateListsUI = function(data) {
  if (!data) return;

  // Helper render tabel
  const fillTable = (elementId, list, cols) => {
    const el = document.getElementById(elementId);
    if (!el) return;
    
    if (!Array.isArray(list) || list.length === 0) {
      el.innerHTML = `<tr><td colspan="${cols.length}" style="text-align:center; color:#888; padding:15px;">Data Kosong / Nihil</td></tr>`;
      return;
    }
    el.innerHTML = list.map(item => `
      <tr style="border-bottom: 1px solid rgba(255,255,255,0.05);">
        ${cols.map(c => `<td style="padding: 6px 4px;">${item[c] ?? 0}</td>`).join('')}
      </tr>
    `).join('');
  };

  // Helper render list UL
  const fillList = (elementId, list, keyVal = 'nilai', emptyText = 'Nihil') => {
    const el = document.getElementById(elementId);
    if (!el) return;

    if (!Array.isArray(list) || list.length === 0) {
      el.innerHTML = `<li style="padding: 10px 0; color: #888; text-align: center;">${emptyText}</li>`;
      return;
    }
    el.innerHTML = list.map(item => `
      <li style="display: flex; justify-content: space-between; padding: 4px 0; border-bottom: 1px dashed rgba(255,255,255,0.1);">
        <span>${item.nama ?? item.label ?? '-'}</span>
        <strong>${item[keyVal] ?? item.keterangan ?? ''}</strong>
      </li>
    `).join('');
  };

  // Rendering
  fillTable('table-kelas-body', data.kelasSiswa, ['nama', 'hadir', 'kedua', 'ketiga']);
  fillTable('table-rumpun-body', data.rumpunGuru, ['nama', 'hadir', 'kedua', 'ketiga']);

  fillList('list-terajin-siswa', data.terajinSiswa, 'nilai', 'Belum ada tap-in');
  fillList('list-terajin-guru', data.terajinGuru, 'nilai', 'Belum ada tap-in');
  fillList('list-telat-siswa', data.telatSiswa, 'nilai', 'Nihil');
  fillList('list-telat-guru', data.telatGuru, 'nilai', 'Nihil');
  fillList('list-alpa-siswa', data.alpaSiswa, 'nilai', 'Nihil');
  fillList('list-cuti-guru', data.cutiGuru, 'nilai', 'Nihil');
  fillList('list-belum-absen-siswa', data.belumAbsenSiswa, 'keterangan', 'Semua Sudah Tap');
  fillList('list-kosong-guru', data.kosongGuru, 'keterangan', 'Semua Kelas Terisi');
};