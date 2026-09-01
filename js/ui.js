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

// ==========================================
// FUNGSI UNDUH TEMPLATE CSV (SISWA & GURU)
// ==========================================
function downloadTemplate(type) {
  let csvContent = "";
  let fileName = "";

  if (type === 'guru') {
    // Header kolom disesuaikan presisi 1:1 dengan Database Guru (19 Kolom)
    const headers = [
      "GuruID", "NIP", "Nama", "JK", "TmpLahir", "TglLahir", 
      "HPWA", "Email", "Alamat", "Jabatan", "Status", "NFC_UID", 
      "QR_Token", "BarcodeID", "FingerprintID", "FotoURL", "TglMasuk", 
      "Role_Sistem", "Face_Registered"
    ];

    // Baris Contoh Data Guru 1
    const sample1 = [
      "GURU-012", "198501012010011001", "Bapak Budi Santoso, S.Pd", "L", "Jakarta", "1985-01-01",
      "081234567890", "budi@email.com", "Jl. Merdeka No. 1", "Guru Matematika", "Aktif",
      "", "", "", "", "", "2010-01-01", "Guru", "FALSE"
    ];

    // Baris Contoh Data Guru 2
    const sample2 = [
      "GURU-015", "199002022015022002", "Ibu Siti Aminah, M.Pd", "P", "Bandung", "1990-02-02",
      "089876543210", "siti@email.com", "Jl. Mawar No. 5", "Guru Bahasa Inggris", "Aktif",
      "", "", "", "", "", "2015-02-01", "Guru", "FALSE"
    ];

    csvContent = headers.join(",") + "\n" + sample1.join(",") + "\n" + sample2.join(",");
    fileName = "Template_Import_Guru.csv";

  } else if (type === 'siswa') {
    // Header kolom disesuaikan presisi dengan Database Siswa (19 Kolom)
    const headers = [
      "SiswaID", "NIS", "NISN", "Nama", "JK", "TmpLahir", "TglLahir", 
      "HPWA", "NamaOrtu", "WA_Ortu", "KelasID", "JurusanID", "Angkatan", 
      "Status", "NFC_UID", "QR_Token", "BarcodeID", "FingerprintID", "FotoURL"
    ];
    
    // Baris Contoh Data Siswa 1
    const sample1 = [
      "SISWA-001", "21221001", "0061234567", "Andi Wijaya", "L", "Jakarta", "2006-05-12",
      "081299998888", "Bambang Wijaya", "081299998877", "KLS-12IPA1", "JUR-RPL", "2024",
      "Aktif", "", "", "", "", ""
    ];

    // Baris Contoh Data Siswa 2
    const sample2 = [
      "SISWA-002", "21221002", "0078765432", "Siska Aprilia", "P", "Surabaya", "2007-08-20",
      "081277776666", "Surya Aprilia", "081277776655", "KLS-11IPS2", "JUR-TKJ", "2025",
      "Aktif", "", "", "", "", ""
    ];

    csvContent = headers.join(",") + "\n" + sample1.join(",") + "\n" + sample2.join(",");
    fileName = "Template_Import_Siswa.csv";
  }

  // Menambahkan UTF-8 BOM (\uFEFF) agar Microsoft Excel langsung membuka CSV dengan kolom terpisah rapi
  const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}