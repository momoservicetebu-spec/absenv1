// ==========================================
// FILE: js/ui.js
// ==========================================

function switchTab(tabId, btnElement) {
  document.querySelectorAll('.section').forEach(sec => sec.classList.remove('active'));
  document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
  
  const targetSection = document.getElementById(tabId);
  if (targetSection) {
    targetSection.classList.add('active');
  }
  
  if (btnElement) {
    btnElement.classList.add('active');
  }
  
  if(tabId === 'enrollment' && !window.aiLoaded) {
    initFaceAI();
  }
}

function processCSV() {
  alert("Proses import data CSV sedang disiapkan.");
}

function getCurrentLocation() {
  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition((position) => {
      document.getElementById('latInput').value = position.coords.latitude;
      document.getElementById('lngInput').value = position.coords.longitude;
      alert("📍 Kordinat berhasil didapatkan dari GPS perangkat!");
    }, (error) => {
      alert("Gagal mendapatkan lokasi. Pastikan izin GPS aktif di browser.");
    });
  } else {
    alert("Geolokasi tidak didukung oleh browser ini.");
  }
}
// Variable global menyimpan data hasil parse CSV
let parsedCsvData = [];

// 1. Fungsi Unduh Template CSV
function downloadTemplate(type) {
  let csvContent = "";
  let fileName = "";

  if (type === 'guru') {
    csvContent = "NIP,Nama,JK,TmpLahir,TglLahir,HPWA,Email,Alamat,Jabatan,Status,TglMasuk,Role_Sistem\n" +
                 "198501012010011001,Budi Santoso,L,Jakarta,1985-01-01,08123456789,budi@email.com,Jl. Merdeka No. 1,Guru Matematika,Aktif,2010-01-01,Guru\n" +
                 "199002022015022002,Siti Aminah,P,Bandung,1990-02-02,08987654321,siti@email.com,Jl. Mawar No. 5,Guru Bahasa Inggris,Aktif,2015-02-01,Guru";
    fileName = "Template_Import_Guru.csv";
  } else if (type === 'siswa') {
    csvContent = "NISN,Nama,Kelas,JK,TmpLahir,TglLahir,HPWA,Email,Alamat,Status\n" +
                 "0012345678,Andi Wijaya,XII IPA 1,L,Jakarta,2006-05-12,08129999888,andi@email.com,Jl. Sudirman No. 10,Aktif\n" +
                 "0087654321,Siska Aprilia,XI IPS 2,P,Surabaya,2007-08-20,08127777666,siska@email.com,Jl. Pemuda No. 4,Aktif";
    fileName = "Template_Import_Siswa.csv";
  }

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// 2. Setup Drag & Drop Event Listener pada Dropzone
document.addEventListener("DOMContentLoaded", () => {
  const dropzone = document.getElementById("dropzone");
  if (!dropzone) return;

  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => e.preventDefault(), false);
  });

  ['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, () => dropzone.classList.add('dragover'), false);
  });

  ['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, () => dropzone.classList.remove('dragover'), false);
  });

  dropzone.addEventListener('drop', (e) => {
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      document.getElementById('csvFileInput').files = files;
      parseCSVFile(files[0]);
    }
  });
});

function handleFileSelect(event) {
  const file = event.target.files[0];
  if (file) parseCSVFile(file);
}

// 3. Membaca dan Menampilkan Preview CSV
function parseCSVFile(file) {
  if (!file.name.endsWith('.csv')) {
    alert("Mohon unggah file berformat .CSV!");
    return;
  }

  const reader = new FileReader();
  reader.onload = function (e) {
    const text = e.target.result;
    const lines = text.split(/\r\n|\n/).filter(line => line.trim() !== "");
    
    if (lines.length < 2) {
      alert("File CSV kosong atau hanya berisi baris judul/header!");
      return;
    }

    const headers = lines[0].split(',').map(h => h.trim());
    const dataRows = lines.slice(1).map(line => line.split(',').map(d => d.trim()));

    parsedCsvData = { headers, rows: dataRows };
    renderPreviewTable(headers, dataRows);
  };
  reader.readAsText(file);
}

function renderPreviewTable(headers, rows) {
  const thead = document.getElementById('csvPreviewHead');
  const tbody = document.getElementById('csvPreviewBody');
  const previewContainer = document.getElementById('csvPreviewContainer');
  const rowCount = document.getElementById('rowCount');

  thead.innerHTML = "<tr>" + headers.map(h => `<th>${h}</th>`).join('') + "</tr>";
  tbody.innerHTML = rows.map(row => "<tr>" + row.map(cell => `<td>${cell}</td>`).join('') + "</tr>").join('');

  rowCount.innerText = rows.length;
  previewContainer.style.display = 'block';
}

function resetCsvUpload() {
  document.getElementById('csvFileInput').value = '';
  document.getElementById('csvPreviewContainer').style.display = 'none';
  parsedCsvData = [];
}

// 4. Submit Data CSV ke API
async function submitCsvData() {
  if (!parsedCsvData || !parsedCsvData.rows || parsedCsvData.rows.length === 0) {
    alert("Tidak ada data CSV untuk dikirim.");
    return;
  }

  const btn = document.getElementById('btnSubmitCsv');
  btn.innerText = "Mengirim Data...";
  btn.disabled = true;

  const result = await fetchAPI("importCSV", {
    headers: parsedCsvData.headers,
    rows: parsedCsvData.rows
  });

  if (result.success) {
    alert(`✅ Berhasil mengimpor ${parsedCsvData.rows.length} data ke database!`);
    resetCsvUpload();
  } else {
    alert(`❌ Gagal impor data: ${result.message}`);
  }

  btn.innerText = "🚀 Submit Data ke Database";
  btn.disabled = false;
}