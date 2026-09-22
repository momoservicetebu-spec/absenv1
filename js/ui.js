// ==========================================
// FILE: js/ui.js (PENGGABUNGAN LENGKAP)
// ==========================================

// ==========================================
// FUNGSI NAVIGASI TAB UTAMA & LOAD DATA
// ==========================================

const API_URL = "https://script.google.com/macros/s/AKfycbxx3BLAOh7RZwF2vvukhDPhytbAPXfMP3H_RAJNeWgxLe2LNcCzojm-6HQ1kktPQMTQ/exec";

// --- [PERBAIKAN] TAMBAHKAN FUNGSI fetchAPI DI SINI ---
async function fetchAPI(action, payload = null) {
  try {
    let url = `${API_URL}?action=${action}`;
    let options = { method: 'GET' };

    if (payload) {
      options = {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload)
      };
    }

    const response = await fetch(url, options);
    return await response.json();
  } catch (error) {
    console.error(`API Error (${action}):`, error);
    return { success: false, message: error.message };
  }
}
// -----------------------------------------------------

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
    if (typeof loadDataRole === 'function') loadDataRole();
  }
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

function processCSV(text) {
  text = text.replace(/^\uFEFF/, '');
  const lines = text.split('\n')
    .map(line => line.trim())
    .filter(line => line !== '' && !line.startsWith('#'));

  if (lines.length < 2) {
    alert("❌ File CSV kosong atau hanya berisi header/petunjuk.");
    return;
  }

  const separator = lines[0].includes(';') ? ';' : ',';
  const headers = lines[0].split(separator).map(h => h.replace(/^"|"$/g, '').trim());
  
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

  const regex = new RegExp(`${separator}(?=(?:(?:[^"]*"){2})*[^"]*$)`);

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

  document.getElementById('csvPreviewHead').innerHTML = theadHTML;
  document.getElementById('csvPreviewBody').innerHTML = tbodyHTML;
  document.getElementById('rowCount').innerText = parsedCsvData.length;
  document.getElementById('csvPreviewContainer').style.display = 'block';
}

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
// FITUR IMPORT CSV (DRAG & DROP )
// ==========================================
let parsedCsvData = [];
let csvTargetSheet = ""; 

document.addEventListener('DOMContentLoaded', () => {
  const dropzone = document.getElementById('dropzone');
  
  if (dropzone) {
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.style.borderColor = '#1dd1a1';
      dropzone.style.backgroundColor = 'rgba(29, 209, 161, 0.1)';
    });

    dropzone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      dropzone.style.borderColor = '#6c5ce7';
      dropzone.style.backgroundColor = 'transparent';
    });

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

// ==========================================
// FUNGSI KONTROL MODAL (TAMBAH & EDIT)
// ==========================================

function openModal(modalId) {
  document.getElementById(modalId).classList.add('active');
}

function closeModal(modalId) {
  document.getElementById(modalId).classList.remove('active');
}

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
    Username: document.getElementById('guru_Username').value,
    Password: document.getElementById('guru_Password').value 
  };

  const res = await fetchAPI('saveGuru', payload);
  if (res.success) {
    alert('✅ Data Guru Berhasil Disimpan!');
    closeModal('modalGuru');
    loadAllData();
  } else {
    alert('❌ Gagal Menyimpan: ' + res.message);
  }
}

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
    Username: document.getElementById('siswa_Username').value,
    Password: document.getElementById('siswa_Password').value
  };

  const res = await fetchAPI('saveSiswa', payload);
  if (res.success) {
    alert('✅ Data Siswa Berhasil Disimpan!');
    closeModal('modalSiswa');
    loadAllData();
  } else {
    alert('❌ Gagal Menyimpan: ' + res.message);
  }
}

// ==========================================
// FUNGSI PENCARIAN (SEARCH) REAL-TIME
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  const searchGuru = document.querySelector('#data-guru .search-bar input');
  if (searchGuru) {
    searchGuru.addEventListener('keyup', (e) => filterTable('data-guru', e.target.value));
  }

  const searchSiswa = document.querySelector('#data-siswa .search-bar input');
  if (searchSiswa) {
    searchSiswa.addEventListener('keyup', (e) => filterTable('data-siswa', e.target.value));
  }
});

function filterTable(sectionId, keyword) {
  const lowerKeyword = keyword.toLowerCase();
  const rows = document.querySelectorAll(`#${sectionId} tbody tr`);
  
  rows.forEach(row => {
    const textContent = row.textContent.toLowerCase();
    row.style.display = textContent.includes(lowerKeyword) ? '' : 'none';
  });
}

// ==========================================
// FUNGSI EDIT & HAPUS (GURU & SISWA)
// ==========================================
function editGuru(btnElement) {
  const row = btnElement.closest('tr');
  const id = row.cells[0].innerText;
  const namaLengkap = row.cells[1].innerText;
  const jabatan = row.cells[2].innerText;
  
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
    setTimeout(() => {
      row.remove();
      alert(`✅ Data ${nama} berhasil dihapus!`);
    }, 600);
  }
}

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
    setTimeout(() => {
      row.remove();
      alert(`✅ Data ${nama} berhasil dihapus!`);
    }, 600);
  }
}

let listDataGuru = [];
let listDataSiswa = [];

function renderGuruTable(dataArray) {
  listDataGuru = dataArray;
  const tbody = document.getElementById('guru-table-body');
  if (!tbody) return;

  if (dataArray.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#a29bfe;">Belum ada data guru.</td></tr>`;
    return;
  }

  tbody.innerHTML = dataArray.map(guru => {
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

function renderSiswaTable(dataArray) {
  listDataSiswa = dataArray;
  const tbody = document.getElementById('siswa-table-body');
  if (!tbody) return;

  if (dataArray.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:#a29bfe;">Belum ada data siswa.</td></tr>`;
    return;
  }

  tbody.innerHTML = dataArray.map(siswa => {
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

document.addEventListener('DOMContentLoaded', () => {
  loadAllData();
});

async function loadAllData() {
  try {
    const resGuru = await fetchAPI('getGuru');
    if (resGuru.success && resGuru.data) {
      renderGuruTable(resGuru.data);
    }

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
    for (let i = 0; i < total; i++) {
      const rowData = parsedCsvData[i];
      const currentNum = i + 1;

      const startPercent = Math.round((i / total) * 100);
      document.getElementById('csvProgressStatus').innerText = `⏳ Mengirim data ${currentNum} dari ${total} ke Google Sheets...`;
      document.getElementById('csvProgressPercent').innerText = `${startPercent}%`;
      document.getElementById('csvProgressBar').style.width = `${startPercent}%`;

      const response = await fetchAPI(action, rowData);
      
      if (response && (response.success || response.status === 'success' || response.data || response.id)) {
        successCount++;
      } else {
        failCount++;
      }

      const donePercent = Math.round((currentNum / total) * 100);
      document.getElementById('csvProgressPercent').innerText = `${donePercent}%`;
      document.getElementById('csvProgressBar').style.width = `${donePercent}%`;
    }

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

// ==========================================
// KONTROL LOADING OVERLAY & DASHBOARD
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

function setDashboardMode(role) {
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

  const widgets = document.querySelectorAll('[data-role]');
  widgets.forEach(widget => {
    const widgetRole = widget.getAttribute('data-role');
    
    let wrapper = widget;
    if (widget.parentElement && 
       !widget.parentElement.classList.contains('analytics-grid') && 
       !widget.parentElement.classList.contains('dashboard-grid') &&
       !widget.parentElement.classList.contains('kpi-row')) {
        wrapper = widget.parentElement; 
    }
    
    if (role === 'all' || widgetRole === role) {
      wrapper.style.display = ''; 
      widget.style.display = '';  
    } else {
      wrapper.style.display = 'none'; 
    }
  });

  const kpiNums = document.querySelectorAll('.kpi-num');
  kpiNums.forEach(el => el.innerText = '...');

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
    const toggleMenu = () => {
      sidebar.classList.toggle("show-sidebar");
      overlay.classList.toggle("show-overlay");
    };
    menuBtn.addEventListener("click", toggleMenu);
    overlay.addEventListener("click", toggleMenu);
  }
});

// ==========================================
// KONTROLER FILTER & DATA DASHBOARD
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  let currentPeriod = 'harian';

  const btnPeriods = document.querySelectorAll('.btn-period');
  const filterHarian = document.getElementById('filterHarian');
  const filterBulanan = document.getElementById('filterBulanan');
  const filterTahunan = document.getElementById('filterTahunan');
  const btnApplyFilter = document.getElementById('btnApplyFilter');

  btnPeriods.forEach(btn => {
    btn.addEventListener('click', (e) => {
      btnPeriods.forEach(b => b.classList.remove('active'));
      e.target.classList.add('active');

      currentPeriod = e.target.getAttribute('data-period');
      
      filterHarian.classList.add('hidden');
      filterBulanan.classList.add('hidden');
      filterTahunan.classList.add('hidden');

      if (currentPeriod === 'harian') {
        filterHarian.classList.remove('hidden');
      } else if (currentPeriod === 'bulanan') {
        filterBulanan.classList.remove('hidden');
      } else if (currentPeriod === 'tahunan') {
        filterTahunan.classList.remove('hidden');
      }

      loadDashboardData();
    });
  });

  if (btnApplyFilter) {
    btnApplyFilter.addEventListener('click', () => {
      loadDashboardData();
    });
  }

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

  function generateMockData(periode) {
    if (periode === 'bulanan') {
      return {
        kpiSiswa: { total: 320, hadir: 94.5, telat: 42, alpa: 8 },
        kpiGuru: { total: 45, hadir: 97.2, telat: 5, cuti: 3 },
        statusSiswa: [280, 25, 10, 5],
        statusGuru: [42, 2, 1, 0],
        trenSiswa: [92, 95, 96, 94, 93],
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
        trenSiswa: [88, 91, 94, 92, 95],
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

  loadDashboardData();
});

// ==========================================
// IMPORT JADWAL
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
      
      if (rowText === '' || rowText.startsWith('#') || rowText.startsWith('Hari;')) {
        continue;
      }
      
      const cols = rowText.split(';');
      
      if (cols.length >= 7) {
        dataJadwal.push({
          hari: cols[0].trim(),
          jam_ke: cols[1].trim(),
          waktu_mulai: cols[2].trim(),
          waktu_selesai: cols[3].trim(),
          kelas: cols[4].trim(),
          mata_pelajaran: cols[5].trim(),
          kode_guru: cols[6].trim() 
        });

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
      tableBody.innerHTML = `<tr><td colspan="6" style="text-align: center; color: #feca57; padding: 20px;">Memproses dan mengirim ${dataJadwal.length} baris data ke database... ⏳</td></tr>`;
      
      const GAS_URL = "https://script.google.com/macros/s/AKfycbxx3BLAOh7RZwF2vvukhDPhytbAPXfMP3H_RAJNeWgxLe2LNcCzojm-6HQ1kktPQMTQ/exec?action=importJadwal"; 
      
      fetch(GAS_URL, {
        method: "POST",
        body: JSON.stringify(dataJadwal)
      })
      .then(response => response.json())
      .then(result => {
        if (result.status === true || result.success === true) {
          alert("✅ " + result.message);
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
  event.target.value = ''; 
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
let dataJadwalGlobal = []; 

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

function renderTabelJadwal(data) {
  const tableBody = document.getElementById('jadwal-table-body');
  if (!tableBody) return;

  const validData = data.filter(item => Object.values(item).some(val => val !== "" && val !== null));

  if (validData.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #a0a5ba; padding: 20px;">Belum ada data jadwal.</td></tr>';
    return;
  }

  let html = '';
  validData.forEach((item, index) => {
    const rowId = item.JadwalID || item.jadwalid || item.id || index;
    const hari = item.Hari || item.hari || '-';
    const jamKe = item.Jam_Ke || item.jam_ke || '-';
    const waktuMulai = item.Waktu_Mulai || item.waktu_mulai || '';
    const waktuSelesai = item.Waktu_Selesai || item.waktu_selesai || '';
    const kelas = item.Kelas || item.kelas || '-';
    const mapel = item.Mata_Pelajaran || item.mata_pelajaran || '-';
    const kodeGuru = item.Kode_Guru || item.kode_guru || item.guru_pengajar || '-';

    const waktuText = (waktuMulai || waktuSelesai) ? `${waktuMulai} - ${waktuSelesai}` : '-';

    html += `
    <tr>
      <td>${hari}</td>
      <td>${jamKe}</td>
      <td>${waktuText}</td>
      <td>${kelas}</td>
      <td>${mapel}</td>
      <td><span style="background:#6c5ce7; padding:2px 8px; border-radius:4px; color:white;">${kodeGuru}</span></td>
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

window.editJadwal = function(id) {
  const item = dataJadwalGlobal.find((j, idx) => 
    (j.JadwalID == id || j.jadwalid == id || j.id == id || idx == id)
  );
  
  if (!item) {
    console.error("Data jadwal tidak ditemukan untuk ID:", id);
    alert("Data tidak ditemukan di sistem.");
    return;
  }

  document.getElementById('modal-title').innerText = "Edit Jadwal Pelajaran";
  
  document.getElementById('input-jadwal-id').value = item.JadwalID || item.id || id;
  document.getElementById('input-hari').value = item.Hari || item.hari || 'Senin';
  document.getElementById('input-jam').value = item.Jam_Ke || item.jam_ke || '';
  document.getElementById('input-mulai').value = item.Waktu_Mulai || item.waktu_mulai || '';
  document.getElementById('input-selesai').value = item.Waktu_Selesai || item.waktu_selesai || '';
  document.getElementById('input-kelas').value = item.Kelas || item.kelas || '';
  document.getElementById('input-mapel').value = item.Mata_Pelajaran || item.mata_pelajaran || '';
  document.getElementById('input-kodeguru').value = item.Kode_Guru || item.kode_guru || item.guru_pengajar || '';

  document.getElementById('modal-tambah-jadwal').style.display = 'block';
};

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

document.addEventListener('DOMContentLoaded', () => {
  window.loadJadwal();

  const btnTambahManual = document.getElementById('btn-tambah-manual');
  if (btnTambahManual) {
    btnTambahManual.addEventListener('click', window.bukaModalJadwal);
  }

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
          window.loadJadwal(); 
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

// ==========================================
// FITUR MANAJEMEN GATE PASS
// ==========================================

window.openModalGatepass = function() {
  const modal = document.getElementById('modal-gatepass');
  if (!modal) {
    alert("Peringatan: Elemen modal-gatepass belum dipasang di HTML!");
    return;
  }
  modal.style.display = 'block';
  loadGPOptions();
};

window.closeModal = function(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.style.display = 'none';
};

async function loadGPOptions() {
  const jenis = document.getElementById('gp-jenis').value;
  const select = document.getElementById('gp-nama');
  if (!select) return;
  
  select.innerHTML = '<option value="">Memuat data...</option>';
  const action = (jenis === 'Siswa') ? 'getSiswa' : 'getGuru';
  
  try {
    const res = await fetch(`${API_URL}?action=${action}`);
    const data = await res.json();
    
    select.innerHTML = '<option value="">-- Pilih Nama --</option>';
    if (data.success && data.data) {
      data.data.forEach(item => {
        const id = (jenis === 'Siswa') ? item.SiswaID : item.GuruID;
        const nama = item.Nama;
        const ket = (jenis === 'Siswa') ? `(Kelas ${item.Kelas || '-'})` : `(${item.Jabatan || 'Guru'})`;
        select.innerHTML += `<option value="${id}">${nama} ${ket}</option>`;
      });

      // AKTIFKAN SELECT2 SETELAH DATA DIMUAT
      $('#gp-nama').select2({
        placeholder: "-- Ketik untuk mencari nama --",
        allowClear: true,
        dropdownParent: $('#modal-gatepass')
      });
    }
  } catch (error) {
    select.innerHTML = '<option value="">Gagal memuat data</option>';
  }
}

window.toggleGPFields = function() {
  loadGPOptions();
};

window.submitGatePass = async function(event) {
  if (event) event.preventDefault(); 
  
  // Ambil teks nama bersih (tanpa embel-embel kelas/jabatan di dalam kurung)
  const selectElement = document.getElementById('gp-nama');
  let namaLengkap = "-";
  if (selectElement.selectedIndex >= 0) {
     const teksOpsi = selectElement.options[selectElement.selectedIndex].text;
     namaLengkap = teksOpsi.split('(')[0].trim(); 
  }

  const payload = {
    userId: $('#gp-nama').val(),
    nama: namaLengkap, // Mengirim nama langsung ke backend
    role: $('#gp-jenis').val(), 
    alasan: $('#gp-alasan').val()
  };

  if (!payload.userId || !payload.alasan) {
    alert("Mohon pilih Nama dan isi Alasan terlebih dahulu!");
    return;
  }

  const btnSubmit = $('#form-gatepass button');
  btnSubmit.text('Mengirim...').prop('disabled', true);

  try {
    const res = await fetchAPI('submitGatepass', payload);

    if (res.success || res.status === true) {
      alert("✅ Gate Pass berhasil dibuat!");
      closeModal('modal-gatepass'); 
      $('#form-gatepass')[0].reset(); 
      $('#gp-nama').val(null).trigger('change'); 
      if (typeof loadGatepassData === 'function') loadGatepassData();
    } else {
      alert("❌ Gagal: " + (res.message || "Terjadi kesalahan server."));
    }
  } catch (error) {
    alert("Terjadi kesalahan jaringan.");
    console.error(error);
  } finally {
    btnSubmit.text('Kirim Gate Pass').prop('disabled', false);
  }
};

window.loadGatepassData = async function() {
  const tbody = document.getElementById('gate-pass-body');
  if (!tbody) return;
  
  // colspan diubah menjadi 7 karena ada tambahan kolom Waktu Kembali
  tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #a2a3b7; padding: 15px;">Memuat data...</td></tr>';
  
  try {
    const res = await fetch(`${API_URL}?action=getGatepass`);
    const data = await res.json();
    
    if (data.success && data.data && data.data.length > 0) {
      let html = '';
      const items = [...data.data].reverse();
      
      items.forEach(item => {
        // Rapikan format Waktu Keluar jika dari Google formatnya ISO (mengandung 'T')
        let wKeluar = item.WaktuKeluar || item.Waktu_Keluar || '-';
        if(wKeluar.includes('T')) {
           const d = new Date(wKeluar);
           wKeluar = `${d.getDate().toString().padStart(2,'0')}/${(d.getMonth()+1).toString().padStart(2,'0')}/${d.getFullYear()} ${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`;
        }
        
        // Rapikan format Waktu Kembali
        let wKembali = item.WaktuKembali || item.Waktu_Kembali || '-';
        if(wKembali.includes('T')) {
           const dk = new Date(wKembali);
           wKembali = `${dk.getHours().toString().padStart(2,'0')}:${dk.getMinutes().toString().padStart(2,'0')}`;
        }

        html += `
        <tr>
          <td>${item.Nama || '-'}</td>
          <td>${item.Role || '-'}</td>
          <td>${wKeluar}</td>
          <td><span style="color: #f1c40f; font-weight:bold;">${wKembali}</span></td>
          <td>${item.Alasan || '-'}</td>
          <td><span style="background:#2ecc71; color:#fff; padding:3px 8px; border-radius:4px; font-size:12px;">${item.Status || 'KELUAR'}</span></td>
          <td><button style="background:#e74c3c; color:#fff; border:none; padding:4px 8px; border-radius:4px; cursor:pointer;" onclick="akhiriGatepass('${item.GatepassID}')">Akhiri</button></td>
        </tr>`;
      });
      tbody.innerHTML = html;
    } else {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #a2a3b7; padding: 15px;">Belum ada data gate pass...</td></tr>';
    }
  } catch (e) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #ff6b6b; padding: 15px;">Gagal mengambil data dari server.</td></tr>';
  }
};

window.akhiriGatepass = async function(gatepassId) {
  if (!confirm("Apakah pemohon sudah kembali ke sekolah?")) return;

  try {
    const payload = { gatepassId: gatepassId };

    const res = await fetch(`${API_URL}?action=akhiriGatepass`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    const result = await res.json();
    if (result.success || result.status === true) {
      alert("✅ Gate Pass berhasil diakhiri!");
      loadGatepassData();
    } else {
      alert("❌ Gagal: " + (result.message || "Gagal mengakhiri Gate Pass"));
    }
  } catch (e) {
    alert("Error jaringan saat mengakhiri Gate Pass!");
    console.error(e);
  }
};

// ==========================================
// FITUR MANAJEMEN ABSEN CERDAS (PER MAPEL)
// ==========================================

// State penyimpan sesi absensi aktif
let currentActiveAbsen = {
  kelas: "",
  mapel: "",
  jamKe: ""
};

// 1. Membuka modal otomatis dari Jadwal Cerdas
window.bukaModalAbsenJadwal = function() {
  const kelas = document.getElementById('label-jadwal-kelas').innerText.trim();
  const mapel = document.getElementById('label-jadwal-mapel').innerText.trim();
  const jamKe = document.getElementById('label-jadwal-jam').innerText.trim();
  
  openModalAbsenProcess(kelas, mapel, jamKe);
};

// 2. Membuka modal dari Opsi Manual (Guru Piket / Pengganti)
window.bukaModalAbsenManual = function() {
  const kelas = document.getElementById('select-kelas-manual').value;
  const mapel = document.getElementById('select-mapel-manual').value;
  
  if (!kelas || !mapel) {
    alert("Mohon pilih Kelas dan Mata Pelajaran terlebih dahulu!");
    return;
  }
  
  openModalAbsenProcess(kelas, mapel, "Manual");
};

// 3. Alur proses pembukaan modal & pemicu fetch data siswa
async function openModalAbsenProcess(kelas, mapel, jamKe) {
  currentActiveAbsen = { kelas, mapel, jamKe };
  
  document.getElementById('modal-title-info').innerText = `${kelas} — ${mapel} (${jamKe})`;
  document.getElementById('modal-absensi-kelas').style.display = 'block';
  
  await fetchDaftarSiswaAbsen(kelas, mapel);
}

// 4. Tutup Modal
window.closeModalAbsen = function() {
  document.getElementById('modal-absensi-kelas').style.display = 'none';
};

// 5. Fetch daftar siswa + status digital & status mapel
async function fetchDaftarSiswaAbsen(kelas, mapel) {
  const tbody = document.getElementById('tabel-absensi-kelas-body');
  tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">⏳ Memuat daftar siswa & status digital...</td></tr>';
  
  try {
    const res = await fetchAPI('getAbsensiKelas', { kelas: kelas, mapel: mapel });
    
    if (res.success && res.data && res.data.length > 0) {
      let html = '';
      res.data.forEach((siswa, index) => {
        const isDigitalHadir = siswa.StatusDigital && siswa.StatusDigital.includes("Hadir");
        const badgeBg = isDigitalHadir ? "#2ecc71" : "#e74c3c";
        const textDigital = siswa.StatusDigital || "Belum Absen";

        // Gunakan status mapel jika sudah pernah diabsen, jika belum default ke status digital
        const statusSelected = siswa.StatusMapel || (isDigitalHadir ? "Hadir" : "Alpa");

        // Penambahan opsi Telat dan Bolos pada dropdown
        html += `
        <tr style="border-bottom: 1px solid #3a3553;">
          <td style="padding: 10px;">${index + 1}</td>
          <td style="padding: 10px; font-weight: bold;">${siswa.Nama}</td>
          <td style="padding: 10px;">
            <span style="background:${badgeBg}; color:white; padding:4px 8px; border-radius:4px; font-size:12px;">${textDigital}</span>
          </td>
          <td style="padding: 10px;">
            <select class="absen-status-select" data-id="${siswa.SiswaID}" style="width: 100%; padding: 8px; background: #161224; color: white; border: 1px solid #4a4563; border-radius: 4px;">
              <option value="Hadir" ${statusSelected === 'Hadir' ? 'selected' : ''}>✅ Hadir</option>
              <option value="Sakit" ${statusSelected === 'Sakit' ? 'selected' : ''}>🏥 Sakit</option>
              <option value="Izin" ${statusSelected === 'Izin' ? 'selected' : ''}>📩 Izin</option>
              <option value="Telat" ${statusSelected === 'Telat' ? 'selected' : ''}>⏱️ Telat</option>
              <option value="Bolos" ${statusSelected === 'Bolos' ? 'selected' : ''}>🏃 Bolos</option>
              <option value="Alpa" ${statusSelected === 'Alpa' ? 'selected' : ''}>❌ Alpa</option>
            </select>
          </td>
        </tr>`;
      });
      tbody.innerHTML = html;
    } else {
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px;">Tidak ada siswa di kelas ini. (Cek kesamaan penulisan nama kelas di Sheet Siswa)</td></tr>';
    }
  } catch (err) {
    tbody.innerHTML = '<tr><td colspan="4" style="text-align:center; color:#ff6b6b; padding:20px;">Gagal memuat data siswa!</td></tr>';
  }
}

// 6. Mengirim hasil input presensi per mapel ke backend
window.simpanAbsensiMapel = async function() {
  const btn = document.getElementById('btn-simpan-absensi');
  const selects = document.querySelectorAll('.absen-status-select');
  
  if (selects.length === 0) return alert("Tidak ada data siswa untuk disimpan.");

  let detailAbsen = [];
  selects.forEach(sel => {
    detailAbsen.push({
      SiswaID: sel.getAttribute('data-id'),
      Status: sel.value
    });
  });

  const payload = {
    kelas: currentActiveAbsen.kelas,
    mapel: currentActiveAbsen.mapel,
    jamKe: currentActiveAbsen.jamKe,
    dataAbsen: detailAbsen
  };

  btn.innerText = "⏳ Menyimpan...";
  btn.disabled = true;

  try {
    const res = await fetchAPI('saveAbsensiKelas', payload); 
    
    if (res.success || res.status === true) {
      alert(`✅ Presensi ${currentActiveAbsen.mapel} (${currentActiveAbsen.kelas}) berhasil disimpan!`);
      closeModalAbsen();
    } else {
      alert("❌ Gagal menyimpan: " + (res.message || "Terjadi kesalahan server."));
    }
  } catch (err) {
    alert("Terjadi kesalahan jaringan.");
  } finally {
    btn.innerText = "💾 Simpan Presensi Mapel Ini";
    btn.disabled = false;
  }
};
// Panggil fungsi ini saat halaman / menu "Absensi Kelas" diklik oleh Super Admin
async function loadSemuaJadwalAdmin() {
  const container = document.getElementById('admin-jadwal-container');
  
  try {
    const res = await fetchAPI('getAllJadwalAdmin', {});
    
    if (res.success && res.data && res.data.length > 0) {
      let html = '';
      
      // Mengelompokkan atau langsung menampilkan semua jadwal
      res.data.forEach(jdwl => {
        // Fallback jika Nama_Guru belum terisi dari backend, maka tampilkan Kode_Guru
        const namaGuruTampil = jdwl.Nama_Guru ? jdwl.Nama_Guru : jdwl.Kode_Guru;

        // Render setiap baris database menjadi sebuah card jadwal
        html += `
        <div style="background: rgba(108, 92, 231, 0.1); border-left: 4px solid #6c5ce7; padding: 15px 20px; border-radius: 5px; display: flex; justify-content: space-between; align-items: center;">
          <div>
            <h3 style="margin: 0 0 8px 0; color: #1dd1a1; font-size: 16px;">
              ${jdwl.Hari} | ${jdwl.Mata_Pelajaran} (Jam ke ${jdwl.Jam_Ke})
            </h3>
            <p style="margin: 0; color: #a29bfe; font-size: 13px;">
              Waktu: ${jdwl.Waktu_Mulai} - ${jdwl.Waktu_Selesai} WIB | 
              Kelas: <strong style="color: #feca57;">${jdwl.Kelas}</strong> | 
              Guru: <strong style="color: #00d2d3;">${namaGuruTampil}</strong>
            </p>
          </div>
          <button class="btn-action btn-success" style="padding: 10px 18px; font-size: 14px;" 
                  onclick="openModalAbsenProcess('${jdwl.Kelas}', '${jdwl.Mata_Pelajaran}', '${jdwl.Jam_Ke}')">
            Buka Presensi
          </button>
        </div>`;
      });
      
      container.innerHTML = html;
    } else {
      container.innerHTML = '<div style="text-align:center; color:#ff6b6b; padding:20px;">Belum ada data jadwal di database.</div>';
    }
  } catch (error) {
    container.innerHTML = '<div style="text-align:center; color:#ff6b6b; padding:20px;">Terjadi kesalahan saat memuat jadwal.</div>';
    console.error(error);
  }
}

// Fungsi untuk mencari jadwal di menu Absensi Kelas (Super Admin)
function filterJadwalAdmin() {
  const input = document.getElementById('search-jadwal-admin').value.toLowerCase();
  const container = document.getElementById('admin-jadwal-container');
  const cards = container.children; // Mengambil semua kotak jadwal

  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    // Abaikan jika itu teks "Memuat..."
    if (card.innerText.includes('Memuat')) continue; 

    const textContent = card.innerText.toLowerCase();
    
    // Jika teks di kotak cocok dengan pencarian, tampilkan. Jika tidak, sembunyikan.
    if (textContent.includes(input)) {
      card.style.display = ""; 
    } else {
      card.style.display = "none"; 
    }
  }
}

// Variable global untuk menyimpan data laporan yang sedang ditampilkan (untuk kebutuhan eksport CSV/PDF)
let dataLaporanAktif = [];

// 1. Mengatur Tampilan Input Tanggal Sesuai Jenis Laporan
function aturInputTanggalLaporan() {
  const jenis = document.getElementById('lap-jenis').value;
  const wadahTgl2 = document.getElementById('wadah-tanggal-2');
  const labelTgl1 = document.getElementById('label-tgl-1');

  if (jenis === 'Harian') {
    labelTgl1.innerText = "Pilih Tanggal";
    wadahTgl2.style.display = 'none';
  } else {
    labelTgl1.innerText = "Mulai Tanggal";
    wadahTgl2.style.display = 'block';
  }
}

// Setel tampilan awal saat halaman dimuat
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('lap-jenis')) {
    aturInputTanggalLaporan();
  }
});
// 2. Mengambil Data Laporan dari Server & Memunculkan Preview (Versi Google Apps Script)
async function lihatPreviewLaporan() {
  const role = document.getElementById('lap-role').value;
  const jenis = document.getElementById('lap-jenis').value;
  const tglMulai = document.getElementById('lap-tgl-mulai').value;
  const tglSampai = document.getElementById('lap-tgl-sampai').value;
  
  const elTarget = document.getElementById('lap-target') || document.getElementById('lap-nama-target');
  const namaTarget = elTarget ? elTarget.value : '';

  if (!tglMulai) {
    alert("Mohon tentukan Tanggal Mulai terlebih dahulu!");
    return;
  }
  if (jenis !== 'Harian' && !tglSampai) {
    alert("Mohon tentukan Tanggal Sampai!");
    return;
  }

  const tbody = document.getElementById('body-preview-laporan');
  if (tbody) tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:20px;">⏳ Memuat laporan dari server, silakan tunggu...</td></tr>`;

  const payload = { role, jenis, tglMulai, tglSampai, namaTarget };

  // ========================================================
  // 1. MASUKKAN URL WEB APP GOOGLE APPS SCRIPT ANDA DI SINI
  // ========================================================
  const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxx3BLAOh7RZwF2vvukhDPhytbAPXfMP3H_RAJNeWgxLe2LNcCzojm-6HQ1kktPQMTQ/exec'; 
  
  // Kita tambahkan parameter ?action=tarikLaporan agar backend Anda tahu rutenya
  const API_URL = `${WEB_APP_URL}?action=tarikLaporan`;

  try {
    const response = await fetch(API_URL, {
      method: 'POST',
      // PENTING: Gunakan text/plain agar browser di GitHub tidak memicu preflight CORS error
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    // Karena backend Anda menggunakan responseJSON(success, message, data), formatnya seperti ini:
    if (result.success) {
      dataLaporanAktif = result.data; // Menyimpan data untuk fitur Download PDF/CSV
      renderTabelLaporan(jenis, result.data); // Mencetak tabel ke layar
    } else {
      tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:20px; color:red;">${result.message}</td></tr>`;
    }

  } catch (error) {
    console.error("Gagal memuat laporan:", error);
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:20px; color:red;">❌ Gagal menghubungi server. Pastikan koneksi internet stabil.</td></tr>`;
  }
}

// 3. Render Header dan Isi Tabel Laporan secara Dinamis
function renderTabelLaporan(jenis, data) {
  const thead = document.getElementById('head-preview-laporan');
  const tbody = document.getElementById('body-preview-laporan');

  let headHtml = '';
  let bodyHtml = '';

  if (jenis === 'Kategori') {
    // Tampilan Tabel Rekap Kategori
    headHtml = `
      <tr>
        <th>NO</th>
        <th>NAMA</th>
        <th style="color:#2ecc71;">HADIR</th>
        <th style="color:#f1c40f;">SAKIT</th>
        <th style="color:#e67e22;">IZIN</th>
        <th style="color:#e74c3c;">ALFA</th>
        <th style="color:#9b59b6;">DISPEN</th>
        <th style="color:#ff7675;">BOLOS</th>
        <th style="color:#00cec9;">CUTI</th>
      </tr>`;

    data.forEach((item, i) => {
      bodyHtml += `
        <tr style="border-bottom: 1px solid #3a3553;">
          <td>${i + 1}</td>
          <td><strong>${item.Nama || '-'}</strong></td>
          <td style="color:#2ecc71; font-weight:bold;">${item.Hadir || 0}</td>
          <td>${item.Sakit || 0}</td>
          <td>${item.Izin || 0}</td>
          <td style="color:#e74c3c; font-weight:bold;">${item.Alfa || 0}</td>
          <td>${item.Dispensasi || 0}</td>
          <td>${item.Bolos || 0}</td>
          <td>${item.Cuti || 0}</td>
        </tr>`;
    });

  } else {
    // Tampilan Tabel Transaksi Log Absensi Harian / Mgg / Bln / Thn
    headHtml = `
      <tr>
        <th>NO</th>
        <th>TANGGAL</th>
        <th>NAMA</th>
        <th>KELAS/ROLE</th>
        <th>MAPEL / JENIS</th>
        <th>STATUS</th>
        <th>WAKTU</th>
      </tr>`;

    data.forEach((item, i) => {
      bodyHtml += `
        <tr style="border-bottom: 1px solid #3a3553;">
          <td>${i + 1}</td>
          <td>${item.Tanggal || '-'}</td>
          <td><strong>${item.Nama || '-'}</strong></td>
          <td>${item.Kelas || item.Role || '-'}</td>
          <td>${item.Mapel || item.Mata_Pelajaran || '-'}</td>
          <td>
            <span style="background:${getWarnaBadgeStatus(item.Status)}; color:white; padding:3px 8px; border-radius:4px; font-size:11px;">
              ${item.Status || 'Alfa'}
            </span>
          </td>
          <td>${item.Waktu || item.Jam_Masuk || '-'}</td>
        </tr>`;
    });
  }

  thead.innerHTML = headHtml;
  tbody.innerHTML = bodyHtml;
}

// Helper Warna Badge Status
function getWarnaBadgeStatus(status) {
  if (!status) return '#e74c3c';
  const st = status.toLowerCase();
  if (st.includes('hadir')) return '#2ecc71';
  if (st.includes('sakit')) return '#f1c40f';
  if (st.includes('izin')) return '#e67e22';
  if (st.includes('dispen')) return '#9b59b6';
  if (st.includes('cuti')) return '#00cec9';
  return '#e74c3c'; // Alfa / Bolos / default
}

// 4. Unduh Laporan format Excel (CSV)
function unduhLaporanCSV() {
  if (!dataLaporanAktif || dataLaporanAktif.length === 0) {
    alert("Silakan tampilkan preview data terlebih dahulu sebelum mengunduh!");
    return;
  }

  const jenis = document.getElementById('lap-jenis').value;
  const role = document.getElementById('lap-role').value;
  
  let csvContent = "data:text/csv;charset=utf-8,\uFEFF"; // Tambah BOM UTF-8 agar Excel membaca huruf rapi

  // Header CSV
  const keys = Object.keys(dataLaporanAktif[0]);
  csvContent += keys.join(",") + "\n";

  // Isi Data CSV
  dataLaporanAktif.forEach(row => {
    let rowData = keys.map(k => {
      let val = row[k] === undefined || row[k] === null ? "" : String(row[k]);
      // Hindari error jika ada tanda koma di dalam teks
      if (val.includes(",")) val = `"${val}"`; 
      return val;
    });
    csvContent += rowData.join(",") + "\n";
  });

  // Trigger Download via Browser
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `Laporan_Absensi_${role}_${jenis}_${new Date().toISOString().slice(0,10)}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// 5. Unduh Laporan PDF (Pratinjau Cetak / Save to PDF)
function unduhLaporanPDF() {
  if (!dataLaporanAktif || dataLaporanAktif.length === 0) {
    alert("Silakan tampilkan preview data terlebih dahulu sebelum mengunduh PDF!");
    return;
  }

  const tabelElement = document.getElementById('tabel-preview-laporan').outerHTML;
  const role = document.getElementById('lap-role').value;
  const jenis = document.getElementById('lap-jenis').value;
  const tglMulai = document.getElementById('lap-tgl-mulai').value;

  const printWindow = window.open('', '', 'height=700,width=900');
  printWindow.document.write(`
    <html>
      <head>
        <title>Laporan Absensi ${role} - ${jenis}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; color: #333; }
          h2 { margin-bottom: 5px; color: #2c3e50; }
          p { margin-top: 0; color: #7f8c8d; font-size: 13px; }
          table { width: 100%; border-collapse: collapse; margin-top: 20px; }
          th, td { border: 1px solid #ddd; padding: 8px; text-align: left; font-size: 12px; }
          th { background-color: #f2f2f2; color: #333; font-weight: bold; }
          tr:nth-child(even) { background-color: #f9f9f9; }
        </style>
      </head>
      <body>
        <h2>LAPORAN ABSENSI (${role.toUpperCase()})</h2>
        <p>Jenis Laporan: ${jenis} | Periode Tanggal: ${tglMulai}</p>
        <hr>
        ${tabelElement}
      </body>
    </html>
  `);

  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => {
    printWindow.print();
    printWindow.close();
  }, 500);
}

// ==========================================
// FITUR DROPDOWN SEARCHABLE NAMA LAPORAN
// ==========================================

async function muatDaftarNamaLaporan() {
  const role = document.getElementById('lap-role').value;
  const dataList = document.getElementById('list-nama-laporan');
  const inputTarget = document.getElementById('lap-nama-target');

  // Kosongkan list dan input setiap kali Tipe Pengguna diubah
  dataList.innerHTML = '';
  inputTarget.value = '';
  inputTarget.placeholder = '⏳ Memuat daftar nama...';

  try {
    const action = (role === 'Siswa') ? 'getSiswa' : 'getGuru';
    
    // --- KODE YANG DIPERBARUI MULAI DARI SINI ---
    const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxx3BLAOh7RZwF2vvukhDPhytbAPXfMP3H_RAJNeWgxLe2LNcCzojm-6HQ1kktPQMTQ/exec';
    
    const response = await fetch(`${WEB_APP_URL}?action=${action}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8'
      },
      body: JSON.stringify({}) // Payload kosong karena hanya butuh 'action' di URL
    });
    
    const res = await response.json();
    // --- BATAS KODE YANG DIPERBARUI ---

    if (res.success && res.data) {
      let optionsHtml = '';

      // Looping data untuk dimasukkan ke opsi dropdown
      res.data.forEach(item => {
        const nama = item.Nama || item.Nama_Lengkap || item.Nama_Guru || item.Nama_Siswa || '-';
        const id = item.SiswaID || item.GuruID || item.NISN || item.NIP || '';

        // Memasukkan nama sebagai value, dan ID sebagai label tambahan
        optionsHtml += `<option value="${nama}">ID: ${id}</option>`;
      });

      dataList.innerHTML = optionsHtml;
      inputTarget.placeholder = "Ketik atau pilih nama...";
    } else {
      inputTarget.placeholder = "Kosongkan untuk Semua...";
    }
  } catch (error) {
    console.error("Gagal memuat daftar nama:", error);
    inputTarget.placeholder = "Gagal memuat daftar nama...";
  }
}

// Tambahkan pemanggilan fungsi ini saat halaman web pertama kali dimuat
document.addEventListener('DOMContentLoaded', () => {
  // ... (kode yang sudah ada) ...
  if (document.getElementById('lap-nama-target')) {
    muatDaftarNamaLaporan(); 
  }
});

// ============================================================================
// FUNGSI: SIMPAN PENGATURAN LENGKAP (Versi GitHub / CORS Safe)
// ============================================================================
async function simpanPengaturanLengkap() {
    const btnSimpan = document.querySelector('button[onclick="simpanPengaturanLengkap()"]');
    const textAsli = btnSimpan.innerHTML;
    btnSimpan.innerHTML = '⏳ Menyimpan ke Database...';
    btnSimpan.disabled = true;
    btnSimpan.style.opacity = '0.7';

    const payloadPengaturan = {
        action: "simpanPengaturan", // Tetap dipertahankan jika backend Anda butuh ini
        identitas: {
            namaSekolah: document.getElementById('set-nama-sekolah').value,
            logoSekolah: document.getElementById('set-logo-sekolah').value,
            namaKepsek: document.getElementById('set-nama-kepsek').value,
            nipKepsek: document.getElementById('set-nip-kepsek').value,
            alamatKop: document.getElementById('set-alamat-kop').value
        },
        tema: {
            mode: document.getElementById('set-tema-mode').value,
            aksen: document.getElementById('set-tema-aksen').value
        },
        parameter: {
            batasTelat: document.getElementById('set-batas-telat').value,
            radiusAbsen: document.getElementById('set-radius').value
        },
        keamanan: {
            mfaSiswa: document.getElementById('set-mfa-siswa').value,
            mfaGuru: document.getElementById('set-mfa-guru').value,
            antiLiveness: document.getElementById('anti-liveness').checked,
            antiFakeGps: document.getElementById('anti-fakegps').checked,
            antiDeviceBind: document.getElementById('anti-devicebind').checked,
            antiTimeSync: document.getElementById('anti-timesync').checked,
            antiQr: document.getElementById('anti-qr').checked
        }
    };

    // URL Web App Anda
    const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxx3BLAOh7RZwF2vvukhDPhytbAPXfMP3H_RAJNeWgxLe2LNcCzojm-6HQ1kktPQMTQ/exec';
    const API_URL = `${WEB_APP_URL}?action=saveSettings`;

    try {
        console.log("Mengirim data pengaturan:", payloadPengaturan);

        const response = await fetch(API_URL, { 
            method: 'POST',
            headers: {
                'Content-Type': 'text/plain;charset=utf-8' // KUNCI ANTI-ERROR CORS
            },
            body: JSON.stringify(payloadPengaturan)
        });

        const result = await response.json();

        // Mengakomodasi format response dari Apps Script (success atau status='success')
        if (result.success || result.status === 'success') {
            alert('✅ Pengaturan Sistem berhasil disimpan secara permanen!');
            terapkanTemaLive(payloadPengaturan.tema.mode, payloadPengaturan.tema.aksen);
        } else {
            alert('❌ Gagal menyimpan pengaturan: ' + (result.message || 'Error tidak diketahui'));
        }

    } catch (error) {
        console.error('Error Save Setting:', error);
        alert('⚠️ Terjadi kesalahan koneksi saat menyimpan pengaturan.');
    } finally {
        btnSimpan.innerHTML = textAsli;
        btnSimpan.disabled = false;
        btnSimpan.style.opacity = '1';
    }
}

// ============================================================================
// FUNGSI: MUAT PENGATURAN (Saat menu dibuka)
// ============================================================================
async function muatPengaturanLengkap() {
  try {
    const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxx3BLAOh7RZwF2vvukhDPhytbAPXfMP3H_RAJNeWgxLe2LNcCzojm-6HQ1kktPQMTQ/exec';
    
    // Kita gunakan POST dan text/plain seperti laporan agar pengambilannya lancar
    const response = await fetch(`${WEB_APP_URL}?action=ambilPengaturan`, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({}) 
    });
    
    const result = await response.json();

    if ((result.success || result.status === 'success') && result.data) {
      const d = result.data;

      // Isikan ke form jika datanya tersedia
      if (d.namaSekolah) document.getElementById('set-nama-sekolah').value = d.namaSekolah;
      if (d.logoSekolah) document.getElementById('set-logo-sekolah').value = d.logoSekolah;
      if (d.namaKepsek) document.getElementById('set-nama-kepsek').value = d.namaKepsek;
      if (d.nipKepsek) document.getElementById('set-nip-kepsek').value = d.nipKepsek;
      if (d.alamatKop) document.getElementById('set-alamat-kop').value = d.alamatKop;

      if (d.temaMode) document.getElementById('set-tema-mode').value = d.temaMode;
      if (d.temaAksen) document.getElementById('set-tema-aksen').value = d.temaAksen;

      if (d.batasTelat) document.getElementById('set-batas-telat').value = d.batasTelat;
      if (d.radiusAbsen) document.getElementById('set-radius').value = d.radiusAbsen;

      if (d.mfaSiswa) document.getElementById('set-mfa-siswa').value = d.mfaSiswa;
      if (d.mfaGuru) document.getElementById('set-mfa-guru').value = d.mfaGuru;

      // Set Checkbox
      document.getElementById('anti-liveness').checked = (d.antiLiveness === true || d.antiLiveness === 'true');
      document.getElementById('anti-fakegps').checked = (d.antiFakeGps === true || d.antiFakeGps === 'true');
      document.getElementById('anti-devicebind').checked = (d.antiDeviceBind === true || d.antiDeviceBind === 'true');
      document.getElementById('anti-timesync').checked = (d.antiTimeSync === true || d.antiTimeSync === 'true');
      document.getElementById('anti-qr').checked = (d.antiQr === true || d.antiQr === 'true');
      
      // Opsional: Terapkan tema saat data dimuat
      if (d.temaMode && d.temaAksen) terapkanTemaLive(d.temaMode, d.temaAksen);
    }
  } catch (err) {
    console.error("Gagal memuat data pengaturan:", err);
  }
}

// ============================================================================
// FUNGSI TAMBAHAN: TERAPKAN TEMA LANGSUNG (LIVE PREVIEW) - FINAL FIX
// ============================================================================
function terapkanTemaLive(mode, aksen) {
    console.log(`Mengubah tema ke Mode: ${mode}, Aksen: ${aksen}`);

    let styleEl = document.getElementById('dynamic-theme-style');
    if (!styleEl) {
        styleEl = document.createElement('style');
        styleEl.id = 'dynamic-theme-style';
        document.head.appendChild(styleEl);
    }

    // 1. Siapkan Variabel Warna Latar & Teks
    let bgBody, bgCard, bgInput, textMain, textMuted, borderCol, shadow;
    
    if (mode === 'light') {
        bgBody = '#f8f9fa';
        bgCard = '#ffffff';
        bgInput = '#ffffff';
        textMain = '#333333';
        textMuted = '#6c757d';
        borderCol = '#dee2e6';
        shadow = '0 2px 8px rgba(0,0,0,0.04)';
    } else if (mode === 'navy') {
        bgBody = '#0f172a';
        bgCard = '#1e293b';
        bgInput = '#0f172a';      
        textMain = '#f8fafc';     
        textMuted = '#94a3b8';    
        borderCol = '#334155';    
        shadow = '0 4px 6px rgba(0,0,0,0.3)';
    } else {
        bgBody = '#121212';       
        bgCard = '#1e1e1e';       
        bgInput = '#121212';      
        textMain = '#e0e0e0';     
        textMuted = '#a0a0a0';    
        borderCol = '#333333';    
        shadow = '0 4px 6px rgba(0,0,0,0.5)';
    }

    // 2. Siapkan Warna Aksen
    let accentColor, accentHover;
    if (aksen === 'blue') {
        accentColor = '#0d6efd';  
        accentHover = '#0b5ed7';  
    } else if (aksen === 'green') {
        accentColor = '#198754';  
        accentHover = '#157347';  
    } else if (aksen === 'red') {
        accentColor = '#dc3545';  
        accentHover = '#bb2d3b';  
    } else {
        accentColor = '#6f42c1'; 
        accentHover = '#59339d';  
    }

    let titleAccent = (mode === 'light') ? accentColor : accentHover;

    // 3. Susun Aturan CSS Ajaib
    const cssRules = `
        body, .main-content {
            background-color: ${bgBody} !important;
            color: ${textMain} !important;
            transition: all 0.3s ease;
        }

        /* --- KUNCI PERBAIKAN ADA DI SINI --- */
        /* Kita sasar secara spesifik div yang masih terkunci warna HTML bawaan */
        .card, .section, .analytics-table-wrap,
        div[style*="#2a2640"], 
        div[style*="#231f36"], 
        div[style*="#161224"] {
            background-color: ${bgCard} !important;
            border: 1px solid ${borderCol} !important;
            border-radius: 8px !important;
            box-shadow: ${shadow} !important;
            padding: 20px !important;
            margin-bottom: 20px !important;
            color: ${textMain} !important;
        }

        input:not([type="checkbox"]), select, datalist, textarea {
            background-color: ${bgInput} !important;
            color: ${textMain} !important;
            border: 1px solid ${borderCol} !important;
            border-radius: 6px !important;
            padding: 8px 12px !important;
            transition: border-color 0.2s ease, box-shadow 0.2s ease;
        }
        
        input:focus, select:focus {
            border-color: ${accentColor} !important;
            outline: none !important;
            box-shadow: 0 0 0 3px ${accentColor}25 !important;
        }

        button[onclick="simpanPengaturanLengkap()"], .btn-primary, .btn-action {
            background-color: ${accentColor} !important;
            color: #ffffff !important;
            border: none !important;
            border-radius: 6px !important;
            padding: 10px 20px !important;
            font-weight: 600 !important;
            cursor: pointer !important;
            transition: all 0.2s ease;
        }
        
        button[onclick="simpanPengaturanLengkap()"]:hover, .btn-primary:hover, .btn-action:hover {
            background-color: ${accentHover} !important;
            transform: translateY(-1px);
        }

        h2, h3, .section-title {
            color: ${titleAccent} !important;
            font-weight: 600 !important;
            margin-bottom: 15px !important;
            border-bottom: 1px solid ${borderCol} !important;
            padding-bottom: 8px !important;
        }
        
        label, .form-label {
            color: ${textMuted} !important;
            font-weight: 500 !important;
            font-size: 0.9em !important;
        }

        .sidebar, #sidebar {
            background-color: ${bgCard} !important;
            border-right: 1px solid ${borderCol} !important;
        }

        /* Hover dinamis sidebar */
        .sidebar button, .sidebar a, .sidebar .menu-item {
            background-color: transparent !important;
            color: ${textMain} !important;
            border: none !important;
            border-radius: 6px !important;
            transition: background-color 0.2s ease, color 0.2s ease !important;
        }

        .sidebar button:hover, .sidebar a:hover, .sidebar .menu-item:hover, .sidebar .active {
            background-color: ${accentColor} !important;
            color: #ffffff !important;
        }
    `;

    styleEl.innerHTML = cssRules;
}
// ============================================================================
// FUNGSI BACKUP & RESTORE DATABASE (Versi GitHub / CORS Safe)
// ============================================================================

// Meminta seluruh data dari server dan mendownloadnya sebagai file JSON
async function prosesBackup() {
    const btn = document.getElementById('btnBackup');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Menyiapkan Data...';
    btn.disabled = true;

    try {
        // Panggil endpoint ke Google Apps Script (pastikan rute 'doBackup' dibuat nanti di Router)
        const response = await fetch(urlAPI + "?action=doBackup", { method: "GET" });
        const result = await response.json();

        if (result.success) {
            // Konversi data dari server menjadi format string JSON
            const dataStr = JSON.stringify(result.data, null, 2);
            
            // Buat file Blob virtual di browser untuk diunduh otomatis
            const blob = new Blob([dataStr], { type: "application/json" });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `Backup_DB_Sistem_${new Date().toISOString().slice(0,10)}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            alert("✅ File backup berhasil diunduh!");
        } else {
            alert("❌ Gagal membuat backup: " + result.message);
        }
    } catch (error) {
        alert("Terjadi kesalahan jaringan saat mencoba backup.");
        console.error(error);
    } finally {
        btn.innerHTML = '<i class="fas fa-cloud-download-alt mr-2"></i> Unduh File Backup';
        btn.disabled = false;
    }
}

// Membaca file JSON dari komputer dan mengirimnya ke server
async function prosesRestore() {
    const fileInput = document.getElementById('fileRestore');
    if (!fileInput.files || fileInput.files.length === 0) {
        alert("Silakan pilih file backup (.json) terlebih dahulu!");
        return;
    }

    const konfirmasi = confirm("PERINGATAN BAHAYA!\n\nProses restore akan menghapus SELURUH data saat ini dan menggantinya dengan data dari file backup. Anda yakin ingin melanjutkan?");
    if (!konfirmasi) return;

    const btn = document.getElementById('btnRestore');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Memulihkan Data...';
    btn.disabled = true;

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = async function(e) {
        try {
            const parsedData = JSON.parse(e.target.result);
            
            // Kirim data JSON ke backend Google Apps Script
            const response = await fetch(urlAPI, {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                body: JSON.stringify({ action: 'doRestore', payload: parsedData })
            });
            
            const result = await response.json();
            
            if (result.success) {
                alert("✅ Sistem berhasil dipulihkan! Halaman akan dimuat ulang.");
                location.reload();
            } else {
                alert("❌ Gagal melakukan restore: " + result.message);
            }
        } catch (error) {
            alert("File tidak valid atau terjadi kesalahan jaringan.");
            console.error(error);
        } finally {
            btn.innerHTML = '<i class="fas fa-database mr-2"></i> Pulihkan Data';
            btn.disabled = false;
        }
    };
    
    // Baca file sebagai teks
    reader.readAsText(file);
}