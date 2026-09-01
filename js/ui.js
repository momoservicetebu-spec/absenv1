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
// FUNGSI UNDUH TEMPLATE CSV (FIX EXCEL COLUMN)
// ==========================================
// Fungsi Unduh Template Asli (Otomatis Generate File CSV)
function downloadTemplate(type) {
  let csvContent = "";
  let fileName = "";

  if (type === 'guru') {
    // Header CSV untuk Data Guru
    csvContent = "GuruID,NIP,Nama,JK,TmpLahir,TglLahir,HPWA,Email,Alamat,Jabatan,Status,NFC_UID,QR_Token,BarcodeID,FingerprintID,FotoURL,TglMasuk,Role_Sistem,Face_Registered\n";
    fileName = "Template_Import_Guru.csv";
  } else {
    // Header CSV untuk Data Siswa
    csvContent = "SiswaID,NIS,NISN,Nama,JK,TmpLahir,TglLahir,HPWA,NamaOrtu,WA_Ortu,KelasID,JurusanID,Angkatan,Status,NFC_UID,QR_Token,BarcodeID,FingerprintID,FotoURL\n";
    fileName = "Template_Import_Siswa.csv";
  }

  // Proses pembuatan file dan auto-download
  const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' }); // \uFEFF memastikan Excel membaca UTF-8 dengan benar
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", fileName);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// ==========================================
// FITUR IMPORT CSV (DRAG & DROP + PREVIEW)
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

// Fungsi Memecah Teks CSV Menjadi Tabel Pratinjau
function processCSV(text) {
  // 1. Hapus karakter tersembunyi BOM (Byte Order Mark) dari Excel
  text = text.replace(/^\uFEFF/, '');
  
  // Pisahkan baris dan hapus baris yang kosong
  const lines = text.split('\n').filter(line => line.trim() !== '');
  if (lines.length < 2) {
    alert("❌ File CSV kosong atau hanya berisi header.");
    return;
  }

  // 2. Deteksi pemisah secara otomatis: titik koma (;) atau koma (,)
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

  // 3. Regex dinamis berdasarkan pemisah yang terdeteksi
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

// Fungsi Batal / Hapus File
function resetCsvUpload() {
  document.getElementById('csvFileInput').value = "";
  document.getElementById('csvPreviewContainer').style.display = 'none';
  document.getElementById('csvPreviewHead').innerHTML = "";
  document.getElementById('csvPreviewBody').innerHTML = "";
  parsedCsvData = [];
  csvTargetSheet = "";
}

// Fungsi Submit (Proses Penyimpanan ke Database Apps Script)
async function submitCsvData() {
  if (parsedCsvData.length === 0) return;
  
  const btn = document.getElementById('btnSubmitCsv');
  btn.innerText = "⏳ Sedang Menyimpan...";
  btn.disabled = true;

  console.log(`Mengirim ${parsedCsvData.length} data ke sheet ${csvTargetSheet}...`, parsedCsvData);
  
  setTimeout(() => {
    alert(`✅ ${parsedCsvData.length} Data ${csvTargetSheet} berhasil dikirim!`);
    resetCsvUpload();
    btn.innerText = "🚀 Submit Data ke Database";
    btn.disabled = false;
    if (typeof loadAllData === 'function') loadAllData();
  }, 1500);
}
// ==========================================
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
    document.getElementById('guru_Status').value = data.Status || 'Aktif';
    document.getElementById('guru_TglMasuk').value = data.TglMasuk || '';
    document.getElementById('guru_Role_Sistem').value = data.Role_Sistem || 'Guru';
  } else {
    document.getElementById('modalGuruTitle').innerText = '👔 Tambah Data Guru Manual';
    document.getElementById('guru_GuruID').value = 'AUTO';
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
    document.getElementById('siswa_TglLahir').value = data.TglLahir || '';
    document.getElementById('siswa_HPWA').value = data.HPWA || '';
    document.getElementById('siswa_NamaOrtu').value = data.NamaOrtu || '';
    document.getElementById('siswa_WA_Ortu').value = data.WA_Ortu || '';
    document.getElementById('siswa_KelasID').value = data.KelasID || '';
    document.getElementById('siswa_JurusanID').value = data.JurusanID || '';
    document.getElementById('siswa_Angkatan').value = data.Angkatan || '';
    document.getElementById('siswa_Status').value = data.Status || 'Aktif';
  } else {
    document.getElementById('modalSiswaTitle').innerText = '🎓 Tambah Data Siswa Manual';
    document.getElementById('siswa_SiswaID').value = 'AUTO';
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
    Role_Sistem: document.getElementById('guru_Role_Sistem').value
  };

  const res = await fetchAPI('saveGuru', payload);
  if (res.success) {
    alert('✅ Data Guru Berhasil Disimpan!');
    closeModal('modalGuru');
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
    Status: document.getElementById('siswa_Status').value
  };

  const res = await fetchAPI('saveSiswa', payload);
  if (res.success) {
    alert('✅ Data Siswa Berhasil Disimpan!');
    closeModal('modalSiswa');
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