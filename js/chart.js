// ==========================================
// FILE: js/charts.js
// ==========================================

window.addEventListener('DOMContentLoaded', () => {
  const chartOptions = { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#dcdde1', font: { size: 10 } } } } };

  new Chart(document.getElementById('donutStatusChart'), {
    type: 'doughnut',
    data: {
      labels: ['Hadir', 'Terlambat', 'Izin', 'Alpa'],
      datasets: [{ data: [428, 15, 7, 3], backgroundColor: ['#1dd1a1', '#feca57', '#ff9ff3', '#ff6b6b'] }]
    },
    options: chartOptions
  });

  new Chart(document.getElementById('barGradeChart'), {
    type: 'bar',
    data: {
      labels: ['Kelas X', 'Kelas XI', 'Kelas XII'],
      datasets: [{ label: 'Hadir (%)', data: [96, 92, 95], backgroundColor: '#54a0ff' }]
    },
    options: { ...chartOptions, scales: { y: { ticks: { color: '#a29bfe' } }, x: { ticks: { color: '#a29bfe' } } } }
  });

  new Chart(document.getElementById('horizontalReasonChart'), {
    type: 'bar',
    indexAxis: 'y',
    data: {
      labels: ['Macet', 'Sakit', 'Ban Bocor', 'Hujan', 'Keluarga'],
      datasets: [{ label: 'Jumlah', data: [12, 8, 5, 4, 2], backgroundColor: '#ff9ff3' }]
    },
    options: chartOptions
  });

  new Chart(document.getElementById('lineTrendChart'), {
    type: 'line',
    data: {
      labels: ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'],
      datasets: [{ label: 'Jumlah Hadir', data: [440, 435, 438, 428, 410, 425], borderColor: '#00d2d3', fill: true, backgroundColor: 'rgba(0,210,211,0.1)' }]
    },
    options: chartOptions
  });

  new Chart(document.getElementById('topStudentChart'), {
    type: 'bar',
    indexAxis: 'y',
    data: {
      labels: ['Andi W', 'Siska A', 'Reza R', 'Dewi P', 'Bagus P'],
      datasets: [{ label: 'Total Kehadiran', data: [100, 100, 99, 98, 98], backgroundColor: '#1dd1a1' }]
    },
    options: chartOptions
  });
});