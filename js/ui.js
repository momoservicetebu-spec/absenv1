// ==========================================
// FILE: js/ui.js
// ==========================================

// ==========================================
// FUNGSI NAVIGASI TAB UTAMA & LOAD DATA
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
  
  // --- Pemicu Fungsi Spesifik ---

  // 1. Inisialisasi Face AI (Kode Asli)
  if(tabId === 'enrollment' && !window.aiLoaded) {
    initFaceAI();
  }

  // 2. Trigger Load Data Database (Kode Baru)
  // TRIGGER LOAD DATA DATABASE
  if (tabId === 'data-siswa') {
    if (typeof loadDataSiswa === 'function') loadDataSiswa();
  } else if (tabId === 'data-guru') {
    if (typeof loadDataGuru === 'function') loadDataGuru();
  } else if (tabId === 'admin-operator') {
    if (typeof loadDataAdmin === 'function') loadDataAdmin();
  } else if (tabId === 'hak-akses') {
    if (typeof loadDataRole === 'function') loadDataRole(); // <-- Tambahkan baris ini
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

    // Deteksi otomatis apakah file menggunakan pemisah titik koma (;) atau koma (,)
    const delimiter = lines[0].includes(';') ? ';' : ',';

    const headers = lines[0].split(delimiter).map(h => h.trim());
    const dataRows = lines.slice(1).map(line => line.split(delimiter).map(d => d.trim()));

    parsedCsvData = { headers, rows: dataRows };
    renderPreviewTable(headers, dataRows);
  };
  reader.readAsText(file);
}

// ==========================================
// FITUR IMPORT CSV (TEMPLATE, PREVIEW, SUBMIT)
// ==========================================

// 1. FUNGSI UNDUH TEMPLATE (DENGAN PETUNJUK ATURAN & CONTOH DATA)
function downloadTemplate(type) {
  let csvContent = "";
  let fileName = "";

  if (type === 'guru') {
    csvContent = 
      "# ==========================================================================\n" +
      "# ATURAN PENGISIAN TEMPLATE DATA GURU (BISA LANGSUNG DIISI DI BAWAH)\n" +
      "# 1. JANGAN MENGUBAH / MENGHAPUS NAMA HEADER PADA BARIS KE-10.\n" +
      "# 2. Format Tanggal (TglLahir & TglMasuk): YYYY-MM-DD (Contoh: 1990-05-20).\n" +
      "# 3. Jenis Kelamin (JK): 'L' (Laki-Laki) atau 'P' (Perempuan).\n" +
      "# 4. Status: 'Aktif', 'Cuti', atau 'Non-Aktif'.\n" +
      "# 5. Role_Sistem: 'Admin', 'Kepsek', atau 'Guru'.\n" +
      "# 6. Face_Registered: 'TRUE' atau 'FALSE'.\n" +
      "# 7. Username & Password: Isi untuk akses login aplikasi (Contoh: pass123).\n" +
      "# ==========================================================================\n" +
      "GuruID;NIP;Nama;JK;TmpLahir;TglLahir;HPWA;Email;Alamat;Jabatan;Mapel;Status;NFC_UID;QR_Token;BarcodeID;FingerprintID;FotoURL;TglMasuk;Role_Sistem;Face_Registered;Username;Password;Kode_Guru\n" +
      "GURU-001;199001012015011001;Ahmad Dahlan M.Pd;L;Jakarta;1990-01-01;081234567890;ahmad@sekolah.sch.id;Jl. Merdeka No. 123;Guru Matematika;Matematika;Aktif;UID991;QR-GURU-001;BC-GURU-001;F-01;https://link-foto.com/guru.jpg;2015-01-10;Guru;FALSE;guru_ahmad;pass123\n";
    fileName = "Template_Import_Guru.csv";
  } else {
    csvContent = 
      "# ==========================================================================\n" +
      "# ATURAN PENGISIAN TEMPLATE DATA SISWA (BISA LANGSUNG DIISI DI BAWAH)\n" +
      "# 1. JANGAN MENGUBAH / MENGHAPUS NAMA HEADER PADA BARIS KE-9.\n" +
      "# 2. Format Tanggal (TglLahir): YYYY-MM-DD (Contoh: 2007-11-15).\n" +
      "# 3. Jenis Kelamin (JK): 'L' (Laki-Laki) atau 'P' (Perempuan).\n" +
      "# 4. Angkatan: Tahun masuk 4 digit (Contoh: 2024).\n" +
      "# 5. Status: 'Aktif', 'Mutasi', atau 'Lulus'.\n" +
      "# 6. Username & Password: Isi untuk akses login aplikasi (Contoh: pass123).\n" +
      "# ==========================================================================\n" +
      "SiswaID;NIS;NISN;Nama;JK;TmpLahir;TglLahir;HPWA;NamaOrtu;WA_Ortu;KelasID;JurusanID;Angkatan;Status;NFC_UID;QR_Token;BarcodeID;FingerprintID;FotoURL;Face_Registered;Username;Password\n" +
      "SISWA-001;23001;0050012345;Alfa Romeo Prasetya;L;Jakarta;2007-01-01;082100001111;Budi Prasetya;083100002222;X-A;RPL;2023;Aktif;UID001;QR-SISWA-001;BC-SISWA-001;F-11;https://link-foto.com/siswa.jpg;FALSE;siswa_alfa;pass123\n";
    fileName = "Template_Import_Siswa.csv";
  }

  const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' }); 
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", fileName);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// 2. FUNGSI MEMECAH TEKS CSV MENJADI TABEL PRATINJAU
function processCSV(text) {
  // 1. Hapus karakter tersembunyi BOM (Byte Order Mark) dari Excel
  text = text.replace(/^\uFEFF/, '');
  
  // 2. Pisahkan baris, abaikan baris kosong DAN abaikan baris petunjuk yang diawali '#'
  const lines = text.split('\n')
    .map(line => line.trim())
    .filter(line => line !== '' && !line.startsWith('#'));

  if (lines.length < 2) {
    alert("❌ File CSV kosong atau hanya berisi header/petunjuk.");
    return;
  }

  // 3. Deteksi pemisah secara otomatis: titik koma (;) atau koma (,)
  const separator = lines[0].includes(';') ? ';' : ',';

  // Ambil header di baris pertama dan bersihkan tanda kutip/spasi
  const headers = lines[0].split(separator).map(h => h.replace(/^"|"$/g, '').trim());
  
  // Deteksi otomatis apakah ini data Guru atau Siswa
  if (headers.includes('GuruID') || headers.includes('NIP')) {
    csvTargetSheet = 'Guru';
  } else if (headers.includes('SiswaID') || headers.includes('NIS')) {
    csvTargetSheet = 'Siswa';
  } else {
    alert("❌ Format CSV tidak dikenali.\nHeader yang terbaca: " + headers.join(", "));
    return resetCsvUpload();
  }

  parsedCsvData = [];
  let theadHTML = "<tr>" + headers.map(h => `<th>${h}</th>`).join('') + "</tr>";
  let tbodyHTML = "";

  // 4. Regex dinamis berdasarkan pemisah yang terdeteksi
  const regex = new RegExp(`${separator}(?=(?:(?:[^"]*"){2})*[^"]*$)`);

  // Looping isi data mulai dari baris kedua (index 1)
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(regex).map(v => v.replace(/^"|"$/g, '').trim());
    
    let rowObj = {};
    let trContent = "";
    
    headers.forEach((h, index) => {
      rowObj[h] = values[index] || "";
      trContent += `<td>${rowObj[h]}</td>`;
    });
    
    parsedCsvData.push(rowObj);
    tbodyHTML += `<tr>${trContent}</tr>`;
  }

  // Tampilkan ke antarmuka HTML
  document.getElementById('csvPreviewHead').innerHTML = theadHTML;
  document.getElementById('csvPreviewBody').innerHTML = tbodyHTML;
  document.getElementById('rowCount').innerText = parsedCsvData.length;
  document.getElementById('csvPreviewContainer').style.display = 'block';
}

// 3. FUNGSI BATAL / HAPUS FILE
function resetCsvUpload() {
  document.getElementById('csvFileInput').value = "";
  document.getElementById('csvPreviewContainer').style.display = 'none';
  document.getElementById('csvPreviewHead').innerHTML = "";
  document.getElementById('csvPreviewBody').innerHTML = "";
  parsedCsvData = [];
  csvTargetSheet = "";
}

// 4. FUNGSI SUBMIT ASLI KE DATABASE GOOGLE SHEETS
async function submitCsvData() {
  if (parsedCsvData.length === 0) return;
  
  const btn = document.getElementById('btnSubmitCsv');
  btn.innerText = "⏳ Sedang Menyimpan ke Spreadsheet...";
  btn.disabled = true;

  // Tentukan endpoint aksi berdasarkan jenis data
  const action = csvTargetSheet === 'Guru' ? 'saveGuru' : 'saveSiswa';
  
  let successCount = 0;
  let failCount = 0;

  try {
    // Looping untuk mengirim setiap baris data CSV ke Apps Script
    for (const rowData of parsedCsvData) {
      const response = await fetchAPI(action, rowData);
      
      // Cek apakah response berhasil
      if (response && (response.success || response.status === 'success' || response.data || response.id)) {
        successCount++;
      } else {
        failCount++;
      }
    }

    if (successCount > 0) {
      alert(`✅ Berhasil menyimpan ${successCount} data ${csvTargetSheet} ke Google Sheets!` + (failCount > 0 ? ` (${failCount} gagal)` : ''));
      resetCsvUpload();
      if (typeof loadAllData === 'function') loadAllData();
    } else {
      alert(`❌ Gagal menyimpan data ke Google Sheets. Silakan periksa koneksi atau deployment Apps Script.`);
    }
  } catch (error) {
    console.error("Error submit CSV:", error);
    alert("❌ Terjadi kesalahan saat mengirim data ke database.");
  } finally {
    btn.innerText = "🚀 Submit Data ke Database";
    btn.disabled = false;
  }
}

// ==========================================
// FITUR IMPORT CSV (DRAG & DROP )
// ==========================================
let parsedCsvData = [];
let csvTargetSheet = ""; 

document.addEventListener('DOMContentLoaded', () => {
  const dropzone = document.getElementById('dropzone');
  
  if (dropzone) {
    // Efek saat file diseret ke atas area dropzone
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.style.borderColor = '#1dd1a1';
      dropzone.style.backgroundColor = 'rgba(29, 209, 161, 0.1)';
    });

    // Efek saat file keluar dari area dropzone
    dropzone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dropzone.style.borderColor = '#6c5ce7';
      dropzone.style.backgroundColor = 'transparent';
    });

    // Menangkap file saat dilepaskan (Drop)
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.style.borderColor = '#6c5ce7';
      dropzone.style.backgroundColor = 'transparent';
      
      if (e.dataTransfer.files.length) {
        document.getElementById('csvFileInput').files = e.dataTransfer.files;
        handleFileSelect({ target: { files: e.dataTransfer.files } });
      }
    });
  }
});

// Fungsi Membaca File CSV
function handleFileSelect(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const text = e.target.result;
    processCSV(text);
  };
  reader.readAsText(file);
}

/// ==========================================
// FUNGSI KONTROL MODAL (TAMBAH & EDIT)
// ==========================================

function openModal(modalId) {
  document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active');
}

// 1. Membuka Modal Guru (Mode Tambah/Edit)
function openGuruModal(data = null) {
  const form = document.getElementById('formGuru');
  form.reset();

  if (data) {
    document.getElementById('modalGuruTitle').innerText = '✏️ Edit Data Guru';
    document.getElementById('guru_GuruID').value = data.GuruID || '';
    document.getElementById('guru_NIP').value = data.NIP || '';
    document.getElementById('guru_Nama').value = data.Nama || '';
    document.getElementById('guru_JK').value = data.JK || 'L';
    document.getElementById('guru_TmpLahir').value = data.TmpLahir || '';
    document.getElementById('guru_TglLahir').value = data.TglLahir || '';
    document.getElementById('guru_HPWA').value = data.HPWA || '';
    document.getElementById('guru_Email').value = data.Email || '';
    document.getElementById('guru_Alamat').value = data.Alamat || '';
    document.getElementById('guru_Jabatan').value = data.Jabatan || '';
    document.getElementById('guru_Mapel').value = data.Mapel || '';
    document.getElementById('guru_Status').value = data.Status || 'Aktif';
    document.getElementById('guru_TglMasuk').value = data.TglMasuk || '';
    document.getElementById('guru_Role_Sistem').value = data.Role_Sistem || 'Guru';
    document.getElementById('Kode_Guru').value = data.Kode_Guru || '';
    
    // Set field kredensial (Password selalu dikosongkan saat edit)
    document.getElementById('guru_Username').value = data.Username || data.NIP || '';
    document.getElementById('guru_Password').value = ''; 
  } else {
    document.getElementById('modalGuruTitle').innerText = '👔 Tambah Data Guru Manual';
    document.getElementById('guru_GuruID').value = 'AUTO';
    document.getElementById('guru_Username').value = '';
    document.getElementById('guru_Password').value = '';
  }

  openModal('modalGuru');
}

// 2. Membuka Modal Siswa (Mode Tambah/Edit)
function openSiswaModal(data = null) {
  const form = document.getElementById('formSiswa');
  form.reset();

  if (data) {
    document.getElementById('modalSiswaTitle').innerText = '✏️ Edit Data Siswa';
    document.getElementById('siswa_SiswaID').value = data.SiswaID || '';
    document.getElementById('siswa_NIS').value = data.NIS || '';
    document.getElementById('siswa_NISN').value = data.NISN || '';
    document.getElementById('siswa_Nama').value = data.Nama || '';
    document.getElementById('siswa_JK').value = data.JK || 'L';
    document.getElementById('siswa_TmpLahir').value = data.TmpLahir || '';
    document.getElementById('siswa_TglLahir').value = (data.TglLahir) ? data.TglLahir.split('T')[0] : '';
    document.getElementById('siswa_HPWA').value = data.HPWA || '';
    document.getElementById('siswa_NamaOrtu').value = data.NamaOrtu || '';
    document.getElementById('siswa_WA_Ortu').value = data.WA_Ortu || '';
    document.getElementById('siswa_KelasID').value = data.KelasID || '';
    document.getElementById('siswa_JurusanID').value = data.JurusanID || '';
    document.getElementById('siswa_Angkatan').value = data.Angkatan || '';
    document.getElementById('siswa_Status').value = data.Status || 'Aktif';

    // Set field kredensial
    document.getElementById('siswa_Username').value = data.Username || data.NIS || '';
    document.getElementById('siswa_Password').value = ''; 
  } else {
    document.getElementById('modalSiswaTitle').innerText = '🎓 Tambah Data Siswa Manual';
    document.getElementById('siswa_SiswaID').value = 'AUTO';
    document.getElementById('siswa_Username').value = '';
    document.getElementById('siswa_Password').value = '';
  }

  openModal('modalSiswa');
}

// 3. Handler Submit Guru ke Database
async function handleGuruSubmit(e) {
  e.preventDefault();
  const payload = {
    GuruID: document.getElementById('guru_GuruID').value,
    NIP: document.getElementById('guru_NIP').value,
    Nama: document.getElementById('guru_Nama').value,
    JK: document.getElementById('guru_JK').value,
    TmpLahir: document.getElementById('guru_TmpLahir').value,
    TglLahir: document.getElementById('guru_TglLahir').value,
    HPWA: document.getElementById('guru_HPWA').value,
    Email: document.getElementById('guru_Email').value,
    Alamat: document.getElementById('guru_Alamat').value,
    Jabatan: document.getElementById('guru_Jabatan').value,
    Status: document.getElementById('guru_Status').value,
    TglMasuk: document.getElementById('guru_TglMasuk').value,
    Role_Sistem: document.getElementById('guru_Role_Sistem').value,
    // Menambahkan field kredensial
    Username: document.getElementById('guru_Username').value,
    Password: document.getElementById('guru_Password').value 
  };

  const res = await fetchAPI('saveGuru', payload);
  if (res.success) {
    alert('✅ Data Guru Berhasil Disimpan!');
    closeModal('modalGuru');
    loadAllData(); // Pastikan tabel otomatis refresh
  } else {
    alert('❌ Gagal Menyimpan: ' + res.message);
  }
}

// 4. Handler Submit Siswa ke Database
async function handleSiswaSubmit(e) {
  e.preventDefault();
  const payload = {
    SiswaID: document.getElementById('siswa_SiswaID').value,
    NIS: document.getElementById('siswa_NIS').value,
    NISN: document.getElementById('siswa_NISN').value,
    Nama: document.getElementById('siswa_Nama').value,
    JK: document.getElementById('siswa_JK').value,
    TmpLahir: document.getElementById('siswa_TmpLahir').value,
    TglLahir: document.getElementById('siswa_TglLahir').value,
    HPWA: document.getElementById('siswa_HPWA').value,
    NamaOrtu: document.getElementById('siswa_NamaOrtu').value,
    WA_Ortu: document.getElementById('siswa_WA_Ortu').value,
    KelasID: document.getElementById('siswa_KelasID').value,
    JurusanID: document.getElementById('siswa_JurusanID').value,
    Angkatan: document.getElementById('siswa_Angkatan').value,
    Status: document.getElementById('siswa_Status').value,
    // Menambahkan field kredensial
    Username: document.getElementById('siswa_Username').value,
    Password: document.getElementById('siswa_Password').value
  };

  const res = await fetchAPI('saveSiswa', payload);
  if (res.success) {
    alert('✅ Data Siswa Berhasil Disimpan!');
    closeModal('modalSiswa');
    loadAllData(); // Pastikan tabel otomatis refresh
  } else {
    alert('❌ Gagal Menyimpan: ' + res.message);
  }
}
// ==========================================
// FUNGSI PENCARIAN (SEARCH) REAL-TIME
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  // Listener Search Guru
  const searchGuru = document.querySelector('#data-guru .search-bar input');
  if (searchGuru) {
    searchGuru.addEventListener('keyup', (e) => filterTable('data-guru', e.target.value));
  }

  // Listener Search Siswa
  const searchSiswa = document.querySelector('#data-siswa .search-bar input');
  if (searchSiswa) {
    searchSiswa.addEventListener('keyup', (e) => filterTable('data-siswa', e.target.value));
  }
});

function filterTable(sectionId, keyword) {
  const lowerKeyword = keyword.toLowerCase();
  const rows = document.querySelectorAll(`#${sectionId} tbody tr`);
  
  rows.forEach(row => {
    // Mengecek seluruh teks di dalam satu baris (tr)
    const textContent = row.textContent.toLowerCase();
    row.style.display = textContent.includes(lowerKeyword) ? '' : 'none';
  });
}


// ==========================================
// FUNGSI EDIT & HAPUS (GURU)
// ==========================================
function editGuru(btnElement) {
  const row = btnElement.closest('tr');
  // Menarik data dari kolom tabel yang terlihat
  const id = row.cells[0].innerText;
  const namaLengkap = row.cells[1].innerText;
  const jabatan = row.cells[2].innerText;
  
  // Membungkusnya menjadi objek untuk dikirim ke openGuruModal()
  // Catatan: Kolom lain akan kosong sementara sampai dihubungkan dengan Database
  const data = {
    GuruID: id,
    NIP: id, 
    Nama: namaLengkap,
    Jabatan: jabatan,
    Status: 'Aktif'
  };
  
  openGuruModal(data);
}

async function deleteGuru(btnElement) {
  const row = btnElement.closest('tr');
  const id = row.cells[0].innerText;
  const nama = row.cells[1].innerText;
  
  if (confirm(`⚠️ PERINGATAN:\nApakah Anda yakin ingin menghapus data Guru:\n${nama} (${id})?`)) {
    btnElement.innerText = "Menghapus...";
    btnElement.disabled = true;
    
    // Nanti ini akan diganti dengan request ke API (fetchAPI)
    // const res = await fetchAPI('deleteGuru', { GuruID: id });
    
    // Simulasi sukses untuk frontend saat ini
    setTimeout(() => {
      row.remove();
      alert(`✅ Data ${nama} berhasil dihapus!`);
    }, 600);
  }
}


// ==========================================
// FUNGSI EDIT & HAPUS (SISWA)
// ==========================================
function editSiswa(btnElement) {
  const row = btnElement.closest('tr');
  const id = row.cells[0].innerText;
  const namaSiswa = row.cells[1].innerText;
  const kelas = row.cells[2].innerText;
  
  const data = {
    SiswaID: id,
    NISN: id,
    Nama: namaSiswa,
    KelasID: kelas,
    Status: 'Aktif'
  };
  
  openSiswaModal(data);
}

async function deleteSiswa(btnElement) {
  const row = btnElement.closest('tr');
  const id = row.cells[0].innerText;
  const nama = row.cells[1].innerText;
  
  if (confirm(`⚠️ PERINGATAN:\nApakah Anda yakin ingin menghapus data Siswa:\n${nama} (${id})?`)) {
    btnElement.innerText = "Menghapus...";
    btnElement.disabled = true;
    
    // Simulasi sukses untuk frontend
    setTimeout(() => {
      row.remove();
      alert(`✅ Data ${nama} berhasil dihapus!`);
    }, 600);
  }
}
// Variable Global Penyimpan State Data dari Database
let listDataGuru = [];
let listDataSiswa = [];

// ==========================================
// 1. RENDER TABEL GURU DINAMIS
// ==========================================
function renderGuruTable(dataArray) {
  listDataGuru = dataArray; // Simpan ke state global
  const tbody = document.getElementById('guru-table-body');
  if (!tbody) return;

  if (dataArray.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#a29bfe;">Belum ada data guru.</td></tr>`;
    return;
  }

  tbody.innerHTML = dataArray.map(guru => {
    // Generate Badge Kredensial Otomatis
    let badges = [];
    if (guru.Face_Registered === "TRUE" || guru.Face_Registered === true) badges.push("Wajah");
    if (guru.FingerprintID) badges.push("Fingerprint");
    if (guru.NFC_UID) badges.push("RFID");
    
    const badgeHTML = badges.length > 0 
      ? `<span class="badge badge-success">${badges.join(', ')}</span>`
      : `<span class="badge badge-danger">Belum Terdaftar</span>`;

    return `
      <tr>
        <td>${guru.NIP || guru.GuruID}</td>
        <td>${guru.Nama}</td>
        <td>${guru.Jabatan || '-'}</td>
        <td>${badgeHTML}</td>
        <td>
          <button class="btn-action btn-small" onclick="editGuruByID('${guru.GuruID}')">Edit</button>
          <button class="btn-action btn-small badge-danger" style="border:none;" onclick="deleteGuruByID('${guru.GuruID}')">Hapus</button>
        </td>
      </tr>
    `;
  }).join('');
}


// ==========================================
// 2. RENDER TABEL SISWA DINAMIS
// ==========================================
function renderSiswaTable(dataArray) {
  listDataSiswa = dataArray; // Simpan ke state global
  const tbody = document.getElementById('siswa-table-body');
  if (!tbody) return;

  if (dataArray.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#a29bfe;">Belum ada data siswa.</td></tr>`;
    return;
  }

  tbody.innerHTML = dataArray.map(siswa => {
    // Generate Badge Kredensial Otomatis
    let badges = [];
    if (siswa.FotoURL) badges.push("Wajah");
    if (siswa.NFC_UID) badges.push("RFID");
    if (siswa.FingerprintID) badges.push("Fingerprint");

    const badgeHTML = badges.length > 0 
      ? `<span class="badge badge-success">${badges.join(', ')}</span>`
      : `<span class="badge badge-warning">Belum Terdaftar</span>`;

    return `
      <tr>
        <td>${siswa.NIS || siswa.SiswaID}</td>
        <td>${siswa.Nama}</td>
        <td>${siswa.KelasID || '-'}</td>
        <td>${badgeHTML}</td>
        <td>
          <button class="btn-action btn-small" onclick="editSiswaByID('${siswa.SiswaID}')">Edit</button>
          <button class="btn-action btn-small badge-danger" style="border:none;" onclick="deleteSiswaByID('${siswa.SiswaID}')">Hapus</button>
        </td>
      </tr>
    `;
  }).join('');
}


// ==========================================
// 3. HANDLER EDIT & HAPUS BERDASARKAN ID UNIK
// ==========================================

function editGuruByID(guruID) {
  const guru = listDataGuru.find(g => g.GuruID === guruID);
  if (guru) openGuruModal(guru);
}

function editSiswaByID(siswaID) {
  const siswa = listDataSiswa.find(s => s.SiswaID === siswaID);
  if (siswa) openSiswaModal(siswa);
}

async function deleteGuruByID(guruID) {
  const guru = listDataGuru.find(g => g.GuruID === guruID);
  if (!guru) return;

  if (confirm(`⚠️ PERINGATAN:\nHapus data Guru: ${guru.Nama} (${guru.NIP || guruID})?`)) {
    const res = await fetchAPI('deleteGuru', { GuruID: guruID });
    if (res.success) {
      alert('✅ Data berhasil dihapus!');
      // Refresh tabel dengan menghapus item dari list lokal
      renderGuruTable(listDataGuru.filter(g => g.GuruID !== guruID));
    } else {
      alert('❌ Gagal menghapus: ' + res.message);
    }
  }
}

async function deleteSiswaByID(siswaID) {
  const siswa = listDataSiswa.find(s => s.SiswaID === siswaID);
  if (!siswa) return;

  if (confirm(`⚠️ PERINGATAN:\nHapus data Siswa: ${siswa.Nama} (${siswa.NIS || siswaID})?`)) {
    const res = await fetchAPI('deleteSiswa', { SiswaID: siswaID });
    if (res.success) {
      alert('✅ Data berhasil dihapus!');
      renderSiswaTable(listDataSiswa.filter(s => s.SiswaID !== siswaID));
    } else {
      alert('❌ Gagal menghapus: ' + res.message);
    }
  }
}
// Jalankan saat halaman selesai dimuat
document.addEventListener('DOMContentLoaded', () => {
  loadAllData();
});

async function loadAllData() {
  try {
    // 1. Ambil Data Guru dari Database
    const resGuru = await fetchAPI('getGuru');
    if (resGuru.success && resGuru.data) {
      renderGuruTable(resGuru.data);
    }

    // 2. Ambil Data Siswa dari Database
    const resSiswa = await fetchAPI('getSiswa');
    if (resSiswa.success && resSiswa.data) {
      renderSiswaTable(resSiswa.data);
    }
  } catch (error) {
    console.error("Gagal memuat data dari database:", error);
  }
}
// ==========================================
// FUNGSI SUBMIT DENGAN ANIMASI LOADING PROGRESS BAR
// ==========================================
async function submitCsvData() {
  if (parsedCsvData.length === 0) return;
  
  const btn = document.getElementById('btnSubmitCsv');
  btn.innerText = "⏳ Sedang Menyimpan ke Spreadsheet...";
  btn.disabled = true;

  // 1. Buat / Ambil Elemen Progress Bar secara Otomatis
  let progressContainer = document.getElementById('csvProgressContainer');
  if (!progressContainer) {
    progressContainer = document.createElement('div');
    progressContainer.id = 'csvProgressContainer';
    progressContainer.style.cssText = `
      margin-top: 15px;
      padding: 15px;
      background: rgba(108, 92, 231, 0.12);
      border: 1px solid rgba(108, 92, 231, 0.4);
      border-radius: 8px;
      text-align: left;
    `;
    progressContainer.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; color: #e0e0e0; font-size: 13px;">
        <span id="csvProgressStatus">⏳ Mempersiapkan pengiriman...</span>
        <span id="csvProgressPercent" style="font-weight: bold; color: #1dd1a1;">0%</span>
      </div>
      <div style="width: 100%; background-color: rgba(255, 255, 255, 0.1); border-radius: 10px; height: 10px; overflow: hidden;">
        <div id="csvProgressBar" style="width: 0%; height: 100%; background: linear-gradient(90deg, #6c5ce7, #1dd1a1); transition: width 0.3s ease;"></div>
      </div>
    `;
    btn.parentNode.insertBefore(progressContainer, btn.nextSibling);
  }

  progressContainer.style.display = 'block';

  const action = csvTargetSheet === 'Guru' ? 'saveGuru' : 'saveSiswa';
  const total = parsedCsvData.length;
  let successCount = 0;
  let failCount = 0;

  try {
    // 2. Looping Pengiriman Data Sambil Update Progress Bar
    for (let i = 0; i < total; i++) {
      const rowData = parsedCsvData[i];
      const currentNum = i + 1;

      // Update status & persentase awal baris
      const startPercent = Math.round((i / total) * 100);
      document.getElementById('csvProgressStatus').innerText = `⏳ Mengirim data ${currentNum} dari ${total} ke Google Sheets...`;
      document.getElementById('csvProgressPercent').innerText = `${startPercent}%`;
      document.getElementById('csvProgressBar').style.width = `${startPercent}%`;

      // Kirim data ke API Apps Script
      const response = await fetchAPI(action, rowData);
      
      if (response && (response.success || response.status === 'success' || response.data || response.id)) {
        successCount++;
      } else {
        failCount++;
      }

      // Update persentase setelah baris selesai terkirim
      const donePercent = Math.round((currentNum / total) * 100);
      document.getElementById('csvProgressPercent').innerText = `${donePercent}%`;
      document.getElementById('csvProgressBar').style.width = `${donePercent}%`;
    }

    // 3. Selesai
    setTimeout(() => {
      if (successCount > 0) {
        alert(`✅ Berhasil menyimpan ${successCount} data ${csvTargetSheet} ke Google Sheets!` + (failCount > 0 ? ` (${failCount} gagal)` : ''));
        resetCsvUpload();
        if (typeof loadAllData === 'function') loadAllData();
      } else {
        alert(`❌ Gagal menyimpan data ke Google Sheets. Periksa koneksi atau deployment Apps Script.`);
      }
    }, 400);

  } catch (error) {
    console.error("Error submit CSV:", error);
    alert("❌ Terjadi kesalahan saat mengirim data ke database.");
  } finally {
    btn.innerText = "🚀 Submit Data ke Database";
    btn.disabled = false;
  }
}

// FUNGSI BATAL / HAPUS FILE (TERMASUK SEMBUNYIKAN PROGRESS BAR)
function resetCsvUpload() {
  document.getElementById('csvFileInput').value = "";
  document.getElementById('csvPreviewContainer').style.display = 'none';
  document.getElementById('csvPreviewHead').innerHTML = "";
  document.getElementById('csvPreviewBody').innerHTML = "";
  
  const progressContainer = document.getElementById('csvProgressContainer');
  if (progressContainer) {
    progressContainer.style.display = 'none';
    document.getElementById('csvProgressBar').style.width = '0%';
  }

  parsedCsvData = [];
  csvTargetSheet = "";
}


// ==========================================
// KONTROL LOADING OVERLAY (UI)
// ==========================================

function showLoading(pesan = "Memproses data...") {
  const overlay = document.getElementById('loadingOverlay');
  const text = document.getElementById('loadingText');
  
  if (overlay && text) {
    text.innerText = pesan;
    overlay.classList.remove('hidden');
  }
}

function hideLoading() {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) {
    overlay.classList.add('hidden');
  }
}
// ==========================================
// KONTROL VISIBILITAS & FILTER DASHBOARD
// ==========================================

function setDashboardMode(role) {
  // 1. Update status tombol aktif
  const filterBtns = document.querySelectorAll('.filter-btn');
  filterBtns.forEach(btn => {
    btn.classList.remove('active');
    const btnText = btn.innerText.trim().toLowerCase();
    if (
      (role === 'all' && btnText.includes('semua')) ||
      (role === 'siswa' && btnText.includes('siswa')) ||
      (role === 'guru' && btnText.includes('guru'))
    ) {
      btn.classList.add('active');
    }
  });

  // 2. Filter Tampilan Widget dan Cangkang Pembungkusnya
  const widgets = document.querySelectorAll('[data-role]');
  widgets.forEach(widget => {
    const widgetRole = widget.getAttribute('data-role');
    
    // Deteksi otomatis jika widget berada di dalam <div> kolom pembungkus
    let wrapper = widget;
    if (widget.parentElement && 
       !widget.parentElement.classList.contains('analytics-grid') && 
       !widget.parentElement.classList.contains('dashboard-grid') &&
       !widget.parentElement.classList.contains('kpi-row')) {
        wrapper = widget.parentElement; // Targetkan div cangkang luarnya
    }
    
    if (role === 'all' || widgetRole === role) {
      wrapper.style.display = ''; // Munculkan cangkang luar
      widget.style.display = '';  // Munculkan isi grafik
    } else {
      wrapper.style.display = 'none'; // Sembunyikan cangkang secara utuh agar grid merapat
    }
  });

  // 3. Tampilkan efek loading cepat pada KPI
  const kpiNums = document.querySelectorAll('.kpi-num');
  kpiNums.forEach(el => el.innerText = '...');

  // 4. Panggil ulang fungsi fetch data
  if (typeof window.loadDashboardData === 'function') {
    window.loadDashboardData(role);
  }
}

// ==========================================
// TOGGLE MENU SMARTPHONE
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  const menuBtn = document.getElementById("mobileMenuBtn");
  const sidebar = document.querySelector(".sidebar");
  const overlay = document.getElementById("sidebarOverlay");

  if(menuBtn && sidebar && overlay) {
    // Fungsi buka/tutup menu
    const toggleMenu = () => {
      sidebar.classList.toggle("show-sidebar");
      overlay.classList.toggle("show-overlay");
    };

    // Klik tombol hamburger
    menuBtn.addEventListener("click", toggleMenu);
    
    // Klik area gelap untuk menutup menu
    overlay.addEventListener("click", toggleMenu);
  }
});

// ==========================================
// FILE: js/ui.js - KONTROLER FILTER & DATA
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  let currentPeriod = 'harian';

  const btnPeriods = document.querySelectorAll('.btn-period');
  const filterHarian = document.getElementById('filterHarian');
  const filterBulanan = document.getElementById('filterBulanan');
  const filterTahunan = document.getElementById('filterTahunan');
  const btnApplyFilter = document.getElementById('btnApplyFilter');

  // 1. TOGGLE PERIODE SWITCHER
  btnPeriods.forEach(btn => {
    btn.addEventListener('click', (e) => {
      btnPeriods.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');

      currentPeriod = e.target.getAttribute('data-period');
      
      // Sembunyikan semua input filter terlebih dahulu
      filterHarian.classList.add('hidden');
      filterBulanan.classList.add('hidden');
      filterTahunan.classList.add('hidden');

      // Tampilkan input filter sesuai periode aktif
      if (currentPeriod === 'harian') {
        filterHarian.classList.remove('hidden');
      } else if (currentPeriod === 'bulanan') {
        filterBulanan.classList.remove('hidden');
      } else if (currentPeriod === 'tahunan') {
        filterTahunan.classList.remove('hidden');
      }

      // Ambil data otomatis saat periode diganti
      loadDashboardData();
    });
  });

  // 2. TOMBOL TAPAPKAN FILTER
  if (btnApplyFilter) {
    btnApplyFilter.addEventListener('click', () => {
      loadDashboardData();
    });
  }

  // 3. FUNGSI FETCH / AMBIL DATA DASHBOARD DARI DATABASE APPS SCRIPT
  async function loadDashboardData() {
    const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxx3BLAOh7RZwF2vvukhDPhytbAPXfMP3H_RAJNeWgxLe2LNcCzojm-6HQ1kktPQMTQ/exec"; 

    let queryParams = `action=getDashboardData&periode=${currentPeriod}`;

    if (currentPeriod === 'harian') {
      queryParams += `&tanggal=${filterHarian.value}`;
    } else if (currentPeriod === 'bulanan') {
      queryParams += `&bulan=${filterBulanan.value}`;
    } else if (currentPeriod === 'tahunan') {
      queryParams += `&tahun=${filterTahunan.value}`;
    }

    try {
      const response = await fetch(`${SCRIPT_URL}?${queryParams}`);
      const result = await response.json();

      // PERBAIKAN: Ubah pengecekan menjadi result.success === true
      if (result.success === true || result.status === true) {
        const realData = result.data; 

        if (window.updateDashboardUI) window.updateDashboardUI(realData);
        if (window.updateListsUI) window.updateListsUI(realData);
      } else {
        console.error("Gagal menarik data dari server:", result.message);
      }

    } catch (error) {
      console.error('Koneksi dashboard bermasalah:', error);
    }
  }
  
  // 4. MOCK DATA GENERATOR (SESUAI PERIODE)
  function generateMockData(periode) {
    if (periode === 'bulanan') {
      return {
        kpiSiswa: { total: 320, hadir: 94.5, telat: 42, alpa: 8 },
        kpiGuru: { total: 45, hadir: 97.2, telat: 5, cuti: 3 },
        statusSiswa: [280, 25, 10, 5],
        statusGuru: [42, 2, 1, 0],
        trenSiswa: [92, 95, 96, 94, 93], // Persentase rata-rata mingguan M1-M5
        trenGuru: [98, 97, 99, 96, 97],
        angkatanSiswa: [105, 98, 95],
        jabatanGuru: [20, 12, 8, 5],
        distribusiJamSiswa: [120, 150, 30, 15, 5],
        distribusiJamGuru: [25, 15, 3, 2, 0],
        metodeSiswa: [210, 80, 20, 10],
        metodeGuru: [40, 5],
        telatBulanSiswa: [15, 12, 8, 7],
        pulangAwalGuru: [1, 2, 0, 1]
      };
    } else if (periode === 'tahunan') {
      return {
        kpiSiswa: { total: 320, hadir: 92.8, telat: 310, alpa: 64 },
        kpiGuru: { total: 45, hadir: 96.5, telat: 32, cuti: 18 },
        statusSiswa: [2700, 210, 120, 50],
        statusGuru: [410, 18, 12, 5],
        trenSiswa: [88, 91, 94, 92, 95], // Persentase per semester/bulan
        trenGuru: [96, 97, 95, 98, 97],
        angkatanSiswa: [100, 95, 90],
        jabatanGuru: [20, 12, 8, 5],
        distribusiJamSiswa: [110, 140, 40, 20, 10],
        distribusiJamGuru: [22, 18, 3, 2, 0],
        metodeSiswa: [200, 85, 25, 10],
        metodeGuru: [38, 7],
        telatBulanSiswa: [80, 75, 90, 65],
        pulangAwalGuru: [5, 4, 6, 3]
      };
    } else {
      // Data Harian
      return {
        kpiSiswa: { total: 10, hadir: 60.0, telat: 4, alpa: 0 },
        kpiGuru: { total: 10, hadir: 90.0, telat: 1, cuti: 1 },
        statusSiswa: [6, 4, 0, 0],
        statusGuru: [8, 1, 1, 0],
        trenSiswa: [60, 70, 80, 75, 90],
        trenGuru: [90, 90, 100, 90, 90],
        angkatanSiswa: [2, 2, 2],
        jabatanGuru: [3, 2, 3, 1],
        distribusiJamSiswa: [2, 4, 2, 1, 1],
        distribusiJamGuru: [4, 4, 1, 0, 0],
        metodeSiswa: [4, 2, 0, 0],
        metodeGuru: [8, 1],
        telatBulanSiswa: [2, 3, 1, 4],
        pulangAwalGuru: [0, 1, 0, 0]
      };
    }
  }

  // Load data awal (default: Harian)
  loadDashboardData();
});
// ==========================================
// FILE: js/ui.js - Update Fungsi Jadwal 
// ==========================================

function handleImportJadwal(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = function(e) {
        const text = e.target.result;
        const rows = text.split('\n');
        const tableBody = document.getElementById('jadwal-table-body');
        
        let htmlContent = '';
        let dataJadwal = []; 
        
        for (let i = 0; i < rows.length; i++) {
            const rowText = rows[i].trim();
            
            // PENTING: Pengecekan header sekarang menggunakan 'Hari;' (titik koma)
            if (rowText === '' || rowText.startsWith('#') || rowText.startsWith('Hari;')) {
                continue;
            }
            
            // PENTING: Split array sekarang memotong berdasarkan titik koma (;)
            const cols = rowText.split(';');
            
            if (cols.length >= 7) {
                // Susun object data untuk backend
                dataJadwal.push({
                    hari: cols[0].trim(),
                    jam_ke: cols[1].trim(),
                    waktu_mulai: cols[2].trim(),
                    waktu_selesai: cols[3].trim(),
                    kelas: cols[4].trim(),
                    mata_pelajaran: cols[5].trim(),
                    kode_guru: cols[6].trim() 
                });

                // Siapkan elemen HTML
                htmlContent += `
                <tr>
                    <td>${cols[0].trim()}</td>
                    <td>${cols[1].trim()}</td>
                    <td>${cols[2].trim()} - ${cols[3].trim()}</td>
                    <td>${cols[4].trim()}</td>
                    <td>${cols[5].trim()}</td>
                    <td><span style="background:#6c5ce7; padding:2px 8px; border-radius:4px;">${cols[6].trim()}</span></td> 
                </tr>`;
            }
        }
        
        if(dataJadwal.length > 0) {
            // Tampilkan status loading di tabel agar admin tahu proses sedang berjalan
            tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #feca57; padding: 20px;">Memproses dan mengirim ${dataJadwal.length} baris data ke database... ⏳</td></tr>`;
            
            // PERBAIKAN 1: Tambahkan ?action=importJadwal pada akhir URL
            const GAS_URL = "https://script.google.com/macros/s/AKfycbxx3BLAOh7RZwF2vvukhDPhytbAPXfMP3H_RAJNeWgxLe2LNcCzojm-6HQ1kktPQMTQ/exec?action=importJadwal"; 
            
            // Kirim data ke Backend GAS
            fetch(GAS_URL, {
                method: "POST",
                body: JSON.stringify(dataJadwal)
            })
            .then(response => response.json())
            .then(result => {
                // PERBAIKAN 2: Sesuaikan pengecekan status menjadi boolean (true) menyesuaikan format router
                if (result.status === true || result.success === true) {
                    alert("✅ " + result.message);
                    // Jika sukses, baru tampilkan baris HTML ke layar
                    tableBody.innerHTML = htmlContent; 
                } else {
                    alert("❌ Gagal menyimpan: " + result.message);
                    tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #ff6b6b;">Gagal memuat data. Silakan coba lagi.</td></tr>';
                }
            })
            .catch(error => {
                console.error("Error:", error);
                alert("❌ Terjadi kesalahan jaringan saat menghubungi server.");
                tableBody.innerHTML = '<tr><td colspan="6" style="text-align: center; color: #ff6b6b;">Koneksi terputus.</td></tr>';
            });

        } else {
            alert("❌ Gagal. Pastikan format CSV sesuai template.");
        }
    };
    
    reader.readAsText(file);
    event.target.value = ''; // Reset input agar bisa upload file yang sama jika perlu
}

// ==========================================
// FITUR UNDUH TEMPLATE CSV & MODAL JADWAL
// ==========================================

window.downloadTemplateJadwal = function() {
    const csvContent = 
        "# ==========================================================================\n" +
        "# ATURAN PENGISIAN TEMPLATE JADWAL PELAJARAN (BISA LANGSUNG DIISI DI BAWAH)\n" +
        "# 1. JANGAN MENGUBAH / MENGHAPUS NAMA HEADER PADA BARIS KE-7.\n" +
        "# 2. Format Waktu Mulai & Selesai: HH:MM (Contoh: 07:15).\n" +
        "# 3. Kolom Jam_Ke: Gunakan format angka atau range (Contoh: 1, atau 1-2).\n" +
        "# 4. Kolom Kode_Guru: HARUS SESUAI dengan Kode Guru di data Master Server.\n" +
        "# 5. Pemisah antar kolom WAJIB menggunakan tanda titik koma (;).\n" +
        "# ==========================================================================\n" +
        "Hari;Jam_Ke;Waktu_Mulai;Waktu_Selesai;Kelas;Mata_Pelajaran;Kode_Guru\n" +
        "Senin;1-2;07:15;08:45;10-A;Matematika;G-001\n" +
        "Selasa;3-4;08:45;10:15;11-B;Fisika;G-002\n";
    
    const fileName = "Template_Jadwal_Pelajaran.csv";
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    const url = URL.createObjectURL(blob);
    
    link.setAttribute("href", url);
    link.setAttribute("download", fileName);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

// ==========================================
// KODE UTAMA CRUD JADWAL PELAJARAN
// ==========================================

const GAS_BASE_URL = "https://script.google.com/macros/s/AKfycbxx3BLAOh7RZwF2vvukhDPhytbAPXfMP3H_RAJNeWgxLe2LNcCzojm-6HQ1kktPQMTQ/exec";
let dataJadwalGlobal = []; // Menyimpan data jadwal sementara di memori browser

// 1. READ: Memuat Data Jadwal dari Server
window.loadJadwal = function() {
    const tableBody = document.getElementById('jadwal-table-body');
    if (!tableBody) return;

    tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #feca57; padding: 20px;">Memuat data jadwal... ⏳</td></tr>';

    fetch(`${GAS_BASE_URL}?action=getJadwal`)
    .then(response => response.json())
    .then(result => {
        const data = result.data || result;
        dataJadwalGlobal = Array.isArray(data) ? data : [];
        renderTabelJadwal(dataJadwalGlobal);
    })
    .catch(error => {
        console.error("Error load data:", error);
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #ff6b6b; padding: 20px;">Gagal memuat data dari server.</td></tr>';
    });
};

// Render Data ke Tabel HTML
function renderTabelJadwal(data) {
    const tableBody = document.getElementById('jadwal-table-body');
    if (!tableBody) return;

    if (data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #a0a5ba; padding: 20px;">Belum ada data jadwal.</td></tr>';
        return;
    }

    let html = '';
    data.forEach((item, index) => {
        const rowId = item.id || index; // Gunakan item.id jika ada, atau fallback ke index
        html += `
        <tr>
            <td>${item.hari || '-'}</td>
            <td>${item.jam_ke || '-'}</td>
            <td>${item.waktu_mulai || ''} - ${item.waktu_selesai || ''}</td>
            <td>${item.kelas || '-'}</td>
            <td>${item.mata_pelajaran || '-'}</td>
            <td><span style="background:#6c5ce7; padding:2px 8px; border-radius:4px;">${item.kode_guru || item.guru_pengajar || '-'}</span></td>
            <td style="text-align: center; white-space: nowrap;">
                <button onclick="editJadwal('${rowId}')" style="background:#f1c40f; color:#1e202e; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:12px; font-weight:bold; margin-right:4px;">
                    ✏️ Edit
                </button>
                <button onclick="hapusJadwal('${rowId}')" style="background:#ff6b6b; color:white; border:none; padding:4px 8px; border-radius:4px; cursor:pointer; font-size:12px; font-weight:bold;">
                    🗑️ Hapus
                </button>
            </td>
        </tr>`;
    });

    tableBody.innerHTML = html;
}

// 2. UPDATE: Menampilkan Form Edit dengan Data Terisi
window.editJadwal = function(id) {
    const item = dataJadwalGlobal.find((j, idx) => (j.id == id || idx == id));
    if (!item) return;

    document.getElementById('modal-title').innerText = "Edit Jadwal Pelajaran";
    document.getElementById('input-jadwal-id').value = id;
    document.getElementById('input-hari').value = item.hari || 'Senin';
    document.getElementById('input-jam').value = item.jam_ke || '';
    document.getElementById('input-mulai').value = item.waktu_mulai || '';
    document.getElementById('input-selesai').value = item.waktu_selesai || '';
    document.getElementById('input-kelas').value = item.kelas || '';
    document.getElementById('input-mapel').value = item.mata_pelajaran || '';
    document.getElementById('input-kodeguru').value = item.kode_guru || item.guru_pengajar || '';

    document.getElementById('modal-tambah-jadwal').style.display = 'block';
};

// Reset & Buka Modal Tambah Manual
window.bukaModalJadwal = function() {
    document.getElementById('modal-title').innerText = "Tambah Jadwal Manual";
    document.getElementById('input-jadwal-id').value = "";
    document.getElementById('form-tambah-jadwal').reset();
    document.getElementById('modal-tambah-jadwal').style.display = 'block';
};

window.tutupModalJadwal = function() {
    document.getElementById('modal-tambah-jadwal').style.display = 'none';
    document.getElementById('form-tambah-jadwal').reset();
};

// 3. DELETE: Menghapus Data
window.hapusJadwal = function(id) {
    if (!confirm("Apakah Anda yakin ingin menghapus jadwal ini?")) return;

    const GAS_URL = `${GAS_BASE_URL}?action=deleteJadwal`;
    
    fetch(GAS_URL, {
        method: "POST",
        body: JSON.stringify({ id: id })
    })
    .then(response => response.json())
    .then(result => {
        if (result.status === true || result.success === true) {
            alert("✅ Jadwal berhasil dihapus!");
            window.loadJadwal();
        } else {
            alert("❌ Gagal menghapus: " + (result.message || "Terjadi kesalahan."));
        }
    })
    .catch(error => {
        console.error("Error delete:", error);
        alert("❌ Terjadi kesalahan koneksi saat menghapus.");
    });
};

// 4. CREATE & UPDATE SUBMIT HANDLER
document.addEventListener('DOMContentLoaded', () => {
    // Muat data saat halaman pertama kali diakses
    window.loadJadwal();

    const btnTambahManual = document.getElementById('btn-tambah-manual');
    if (btnTambahManual) {
        btnTambahManual.addEventListener('click', window.bukaModalJadwal);
    }

    // Tutup Modal jika klik area luar
    const modalJadwal = document.getElementById('modal-tambah-jadwal');
    window.addEventListener('click', (event) => {
        if (event.target === modalJadwal) {
            window.tutupModalJadwal();
        }
    });

    const formTambahJadwal = document.getElementById('form-tambah-jadwal');
    if (formTambahJadwal) {
        formTambahJadwal.addEventListener('submit', function(e) {
            e.preventDefault();

            const jadwalId = document.getElementById('input-jadwal-id').value;
            const isEdit = jadwalId !== "";
            // Jika ID kosong berarti tambah (importJadwal), jika ada ID berarti edit (updateJadwal)
            const action = isEdit ? "updateJadwal" : "importJadwal";

            const payload = {
                id: jadwalId,
                hari: document.getElementById('input-hari').value,
                jam_ke: document.getElementById('input-jam').value,
                waktu_mulai: document.getElementById('input-mulai').value,
                waktu_selesai: document.getElementById('input-selesai').value,
                kelas: document.getElementById('input-kelas').value,
                mata_pelajaran: document.getElementById('input-mapel').value,
                kode_guru: document.getElementById('input-kodeguru').value
            };

            // Backend menggunakan array untuk insert, dan object untuk update
            const bodyData = isEdit ? payload : [payload];
            const GAS_URL = `${GAS_BASE_URL}?action=${action}`;

            const submitBtn = document.getElementById('btn-submit-modal') || this.querySelector('button[type="submit"]');
            submitBtn.innerText = "Menyimpan...";
            submitBtn.disabled = true;

            fetch(GAS_URL, {
                method: "POST",
                body: JSON.stringify(bodyData)
            })
            .then(response => response.json())
            .then(result => {
                if (result.status === true || result.success === true) {
                    alert(isEdit ? "✅ Jadwal berhasil diperbarui!" : "✅ Jadwal berhasil ditambahkan!");
                    window.tutupModalJadwal();
                    window.loadJadwal(); // Refetch data terbaru ke tabel
                } else {
                    alert("❌ Gagal menyimpan: " + result.message);
                }
            })
            .catch(error => {
                console.error("Error:", error);
                alert("❌ Terjadi kesalahan koneksi saat menyimpan.");
            })
            .finally(() => {
                submitBtn.innerText = "Simpan Jadwal";
                submitBtn.disabled = false;
            });
        });
    }
});