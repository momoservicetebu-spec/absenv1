// ==========================================
// FILE: js/ui.js (PENGGABUNGAN LENGKAP)
// ==========================================

// ==========================================
// FUNGSI NAVIGASI TAB UTAMA & LOAD DATA
// ==========================================

async function fetchAPI(action, payload = null) {
  showLoading("Memproses data..."); // 1. Tampilkan loading otomatis

  // 2. Pasang batas waktu (timeout) 20 detik untuk mencegah aplikasi macet selamanya
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000); 

  // ==========================================
  // TAMBAHAN RBAC: Ambil Role User Saat Ini
  // ==========================================
  // Jika belum ada sistem login utuh, otomatis dianggap sebagai 'Superadmin' sementara
  const userRole = localStorage.getItem('role') || 'Superadmin'; 

  try {
    // Sisipkan roleAktif ke URL (untuk metode GET)
    let url = `${API_URL}?action=${action}&roleAktif=${userRole}&t=${new Date().getTime()}`;
    let options = { 
      method: 'GET',
      signal: controller.signal // Kaitkan sinyal batas waktu
    };

    if (payload) {
      // Sisipkan roleAktif ke dalam payload (untuk metode POST)
      payload.roleAktif = userRole;
      
      options = {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify(payload),
        signal: controller.signal
      };
    }

    const response = await fetch(url, options);
    clearTimeout(timeoutId); // Hapus batas waktu jika server membalas cepat
    return await response.json();

  } catch (error) {
    console.error(`API Error (${action}):`, error);
    
    // Tangani error khusus jika terputus karena batas waktu habis (timeout)
    if (error.name === 'AbortError') {
      return { success: false, message: "Koneksi ke server terputus karena terlalu lama (Timeout)." };
    }
    return { success: false, message: error.message };
    
  } finally {
    // 3. WAJIB ADA: Pastikan loading selalu ditutup apa pun yang terjadi
    hideLoading(); 
  }
}
// -----------------------------------------------------
function switchTab(tabId, btnElement) {
  // 1. Cari SEMUA elemen halaman yang memiliki class 'section' maupun 'tab-content'
  const allSections = document.querySelectorAll('.section, .tab-content');
  
  // Sembunyikan semuanya tanpa kecuali
  allSections.forEach(sec => {
    sec.classList.remove('active');
    sec.style.display = 'none';
  });
  
  // Hentikan interval polling live monitor jika pengguna berpindah ke tab lain
  if (tabId !== 'live-absen' && typeof liveAbsenInterval !== 'undefined' && liveAbsenInterval) {
    clearInterval(liveAbsenInterval);
    liveAbsenInterval = null;
  }
  
  // Hapus class 'active' dari semua tombol sidebar
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  
  // 2. Tampilkan HANYA elemen yang ID-nya sesuai dengan menu yang diklik
  const targetSection = document.getElementById(tabId);
  if (targetSection) {
    targetSection.classList.add('active');
    targetSection.style.display = 'block';
  }
  
  // Beri warna/efek aktif pada tombol yang baru saja diklik
  if (btnElement) {
    btnElement.classList.add('active');
  }
  
  // --- Pemicu Fungsi Spesifik ---
  if (tabId === 'live-absen') {
    if (typeof initLiveAbsen === 'function') initLiveAbsen();
  } else if (tabId === 'enrollment' && !window.aiLoaded) {
    if (typeof initFaceAI === 'function') initFaceAI();
  } else if (tabId === 'data-siswa') {
    if (typeof loadDataSiswa === 'function') loadDataSiswa();
  } else if (tabId === 'data-guru') {
    if (typeof loadDataGuru === 'function') loadDataGuru();
  } else if (tabId === 'admin-operator') {
    if (typeof loadDataAdmin === 'function') loadDataAdmin();
  } else if (tabId === 'hak-akses') {
    if (typeof loadDataRole === 'function') loadDataRole();
  } else if (tabId === 'barcode') {
    if (typeof loadUserForQR === 'function') loadUserForQR();
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
    "# 1. JANGAN MENGUBAH / MENGHAPUS NAMA HEADER PADA BARIS KE-8.\n" +
    "# 2. Format Tanggal (TglLahir & TglMasuk): YYYY-MM-DD (Contoh: 1990-05-20).\n" +
    "# 3. Jenis Kelamin (JK): 'L' (Laki-Laki) atau 'P' (Perempuan).\n" +
    "# 4. Status: 'Aktif', 'Cuti', atau 'Non-Aktif'.\n" +
    "# 5. Role_Sistem: 'Admin', 'Kepsek', atau 'Guru'.\n" +
    "# ==========================================================================\n" +
    "GuruID;NIP;Nama;JK;TmpLahir;TglLahir;HP;WA;Email;Alamat;Jabatan;Mapel;Status;FotoURL;TglMasuk;Role_Sistem;Username;Password;Kode_Guru\n" +
    "GURU-001;199001012015011001;Ahmad Dahlan M.Pd;L;Jakarta;1990-01-01;081234567890;081234567890;ahmad@sekolah.sch.id;Jl. Merdeka No. 123;Guru Matematika;Matematika;Aktif;https://link-foto.com/guru.jpg;2015-01-10;Guru;guru_ahmad;pass123;KG-001\n";
  fileName = "Template_Import_Guru.csv";
} else {
  csvContent = 
    "# ==========================================================================\n" +
    "# ATURAN PENGISIAN TEMPLATE DATA SISWA (BISA LANGSUNG DIISI DI BAWAH)\n" +
    "# 1. JANGAN MENGUBAH / MENGHAPUS NAMA HEADER PADA BARIS KE-8.\n" +
    "# 2. Format Tanggal (TglLahir): YYYY-MM-DD (Contoh: 2007-11-15).\n" +
    "# 3. Jenis Kelamin (JK): 'L' (Laki-Laki) atau 'P' (Perempuan).\n" +
    "# 4. Angkatan: Tahun masuk 4 digit (Contoh: 2024).\n" +
    "# 5. Status: 'Aktif', 'Mutasi', atau 'Lulus'.\n" +
    "# ==========================================================================\n" +
    "SiswaID;NIS;NISN;Nama;JK;TmpLahir;TglLahir;HP;WA;NamaOrtu;WA_Ortu;KelasID;JurusanID;Angkatan;Status;FotoURL;Username;Password\n" +
    "SISWA-001;23001;0050012345;Alfa Romeo Prasetya;L;Jakarta;2007-01-01;082100001111;082100001111;Budi Prasetya;083100002222;X-A;RPL;2023;Aktif;https://link-foto.com/siswa.jpg;siswa_alfa;pass123\n";
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
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    modal.style.display = 'flex'; // Paksa tampilkan modal
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    modal.style.display = 'none'; // Paksa sembunyikan modal total
  }
  
  // Pastikan loading overlay juga dipaksa sembunyi saat modal tutup
  const loading = document.getElementById('loadingOverlay');
  if (loading) {
    loading.classList.add('hidden');
    loading.style.display = 'none';
  }
}

function openGuruModal(data = null) {
  const form = document.getElementById('formGuru');
  if (form) form.reset();

  if (data) {
    document.getElementById('modalGuruTitle').innerText = '✏️ Edit Data Guru';
    document.getElementById('guru_GuruID').value = data.GuruID || '';
    document.getElementById('guru_NIP').value = data.NIP || '';
    document.getElementById('guru_Nama').value = data.Nama || '';
    document.getElementById('guru_JK').value = data.JK || 'L';
    document.getElementById('guru_TmpLahir').value = data.TmpLahir || '';
    document.getElementById('guru_TglLahir').value = data.TglLahir ? String(data.TglLahir).split('T')[0] : '';
    document.getElementById('guru_HPWA').value = data.HPWA || '';
    document.getElementById('guru_Email').value = data.Email || '';
    document.getElementById('guru_Alamat').value = data.Alamat || '';
    document.getElementById('guru_Jabatan').value = data.Jabatan || '';
    document.getElementById('guru_Mapel').value = data.Mapel || '';
    document.getElementById('guru_Status').value = data.Status || 'Aktif';
    document.getElementById('guru_TglMasuk').value = data.TglMasuk ? String(data.TglMasuk).split('T')[0] : '';
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
  if (form) form.reset();

  if (data) {
    document.getElementById('modalSiswaTitle').innerText = '✏️ Edit Data Siswa';
    document.getElementById('siswa_SiswaID').value = data.SiswaID || '';
    document.getElementById('siswa_NIS').value = data.NIS || '';
    document.getElementById('siswa_NISN').value = data.NISN || '';
    document.getElementById('siswa_Nama').value = data.Nama || '';
    document.getElementById('siswa_JK').value = data.JK || 'L';
    document.getElementById('siswa_TmpLahir').value = data.TmpLahir || '';
    document.getElementById('siswa_TglLahir').value = data.TglLahir ? String(data.TglLahir).split('T')[0] : '';
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
    GuruID: document.getElementById('guru_GuruID')?.value || '',
    NIP: document.getElementById('guru_NIP')?.value || '',
    Nama: document.getElementById('guru_Nama')?.value || '',
    JK: document.getElementById('guru_JK')?.value || 'L',
    TmpLahir: document.getElementById('guru_TmpLahir')?.value || '',
    TglLahir: document.getElementById('guru_TglLahir')?.value || '',
    HPWA: document.getElementById('guru_HPWA')?.value || '',
    Email: document.getElementById('guru_Email')?.value || '',
    Alamat: document.getElementById('guru_Alamat')?.value || '',
    Jabatan: document.getElementById('guru_Jabatan')?.value || '',
    Mapel: document.getElementById('guru_Mapel')?.value || '',          // ← Ditambahkan
    Status: document.getElementById('guru_Status')?.value || 'Aktif',
    TglMasuk: document.getElementById('guru_TglMasuk')?.value || '',
    Role_Sistem: document.getElementById('guru_Role_Sistem')?.value || 'Guru',
    Kode_Guru: document.getElementById('Kode_Guru')?.value || '',        // ← Ditambahkan
    Username: document.getElementById('guru_Username')?.value || '',
    Password: document.getElementById('guru_Password')?.value || '' 
  };

  try {
    const res = await fetchAPI('saveGuru', payload);
    if (res && res.success) {
      alert('✅ Data Guru Berhasil Disimpan!');
      closeModal('modalGuru');
      loadAllData();
    } else {
      alert('❌ Gagal Menyimpan: ' + (res?.message || 'Terjadi kesalahan sistem'));
    }
  } catch (err) {
    console.error('Error saving Guru:', err);
    alert('❌ Gagal Menyimpan: Terjadi kesalahan jaringan / server.');
  }
}

async function handleSiswaSubmit(e) {
  e.preventDefault();

  const payload = {
    SiswaID: document.getElementById('siswa_SiswaID')?.value || '',
    NIS: document.getElementById('siswa_NIS')?.value || '',
    NISN: document.getElementById('siswa_NISN')?.value || '',
    Nama: document.getElementById('siswa_Nama')?.value || '',
    JK: document.getElementById('siswa_JK')?.value || 'L',
    TmpLahir: document.getElementById('siswa_TmpLahir')?.value || '',
    TglLahir: document.getElementById('siswa_TglLahir')?.value || '',
    HPWA: document.getElementById('siswa_HPWA')?.value || '',
    NamaOrtu: document.getElementById('siswa_NamaOrtu')?.value || '',
    WA_Ortu: document.getElementById('siswa_WA_Ortu')?.value || '',
    KelasID: document.getElementById('siswa_KelasID')?.value || '',
    JurusanID: document.getElementById('siswa_JurusanID')?.value || '',
    Angkatan: document.getElementById('siswa_Angkatan')?.value || '',
    Status: document.getElementById('siswa_Status')?.value || 'Aktif',
    Username: document.getElementById('siswa_Username')?.value || '',
    Password: document.getElementById('siswa_Password')?.value || ''
  };

  try {
    const res = await fetchAPI('saveSiswa', payload);
    if (res && res.success) {
      alert('✅ Data Siswa Berhasil Disimpan!');
      closeModal('modalSiswa');
      loadAllData();
    } else {
      alert('❌ Gagal Menyimpan: ' + (res?.message || 'Terjadi kesalahan sistem'));
    }
  } catch (err) {
    console.error('Error saving Siswa:', err);
    alert('❌ Gagal Menyimpan: Terjadi kesalahan jaringan / server.');
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
// FUNGSI RENDER TABEL GURU
// ==========================================
function renderGuruTable(dataArray) {
  listDataGuru = Array.isArray(dataArray) ? dataArray : [];
  const tbody = document.getElementById('guru-table-body');
  if (!tbody) return;

  if (listDataGuru.length === 0) {
    tbody.innerHTML = `<tr><td colspan="16" style="text-align:center; color:#a29bfe; padding:20px;">Belum ada data guru.</td></tr>`;
    return;
  }

  // Gunakan variabel penampung string sebelum disuntikkan ke DOM
  const htmlString = listDataGuru.map(guru => {
    const id = guru.GuruID || '';
    const tglLahir = guru.TglLahir ? String(guru.TglLahir).split('T')[0] : '-';
    const tglMasuk = guru.TglMasuk ? String(guru.TglMasuk).split('T')[0] : '-';
    const statusColor = guru.Status === 'Aktif' ? '#1dd1a1' : '#ff6b6b';

    return `
    <tr style="border-bottom: 1px solid #332d4a;">
      <td>${id || '-'}</td>
      <td>${guru.NIP || '-'}</td>
      <td style="font-weight:bold; color: #1dd1a1;">${guru.Nama || '-'}</td>
      <td>${guru.JK || '-'}</td>
      <td>${guru.TmpLahir || '-'}</td>
      <td>${tglLahir}</td>
      <td>${guru.HP || guru.WA || '-'}</td>
      <td>${guru.Email || '-'}</td>
      <td>${guru.Alamat || '-'}</td>
      <td>${guru.Jabatan || '-'}</td>
      <td>${guru.Mapel || '-'}</td>
      <td>
        <span style="background:${statusColor}; color:#161224; padding:3px 8px; border-radius:4px; font-size:12px; font-weight:bold;">
          ${guru.Status || '-'}
        </span>
      </td>
      <td>${tglMasuk}</td>
      <td>${guru.Role_Sistem || '-'}</td>
      <td>${guru.Username || '-'}</td>
      <td style="white-space: nowrap; position: sticky; right: 0; background: #1e1b2e; border-left: 1px solid #332d4a;">
        <button type="button" class="btn-action btn-small" style="background:#feca57; color:#111; border:none;" onclick="editGuruByID('${id}')">✏️ Edit</button>
        <button type="button" class="btn-action btn-small badge-danger" style="border:none;" onclick="deleteGuruByID('${id}')">🗑️ Hapus</button>
      </td>
    </tr>
    `;
  }).join('');

  tbody.innerHTML = htmlString;
}

// ==========================================
// FUNGSI RENDER TABEL SISWA
// ==========================================
function renderSiswaTable(dataArray) {
  listDataSiswa = Array.isArray(dataArray) ? dataArray : [];
  const tbody = document.getElementById('siswa-table-body');
  if (!tbody) return;

  if (listDataSiswa.length === 0) {
    tbody.innerHTML = `<tr><td colspan="16" style="text-align:center; color:#a29bfe; padding:20px;">Belum ada data siswa.</td></tr>`;
    return;
  }

  const htmlString = listDataSiswa.map(siswa => {
    const id = siswa.SiswaID || '';
    const tglLahir = siswa.TglLahir ? String(siswa.TglLahir).split('T')[0] : '-';
    const statusColor = siswa.Status === 'Aktif' ? '#1dd1a1' : '#ff6b6b';

    return `
    <tr style="border-bottom: 1px solid #332d4a;">
      <td>${id || '-'}</td>
      <td>${siswa.NIS || '-'}</td>
      <td>${siswa.NISN || '-'}</td>
      <td style="font-weight:bold; color: #1dd1a1;">${siswa.Nama || '-'}</td>
      <td>${siswa.JK || '-'}</td>
      <td>${siswa.TmpLahir || '-'}</td>
      <td>${tglLahir}</td>
      <td>${siswa.HP || siswa.WA || '-'}</td>
      <td>${siswa.NamaOrtu || '-'}</td>
      <td>${siswa.WA_Ortu || '-'}</td>
      <td><span style="background:#4834d4; padding:3px 8px; border-radius:4px; color:white;">${siswa.KelasID || '-'}</span></td>
      <td>${siswa.JurusanID || '-'}</td>
      <td>${siswa.Angkatan || '-'}</td>
      <td>
        <span style="background:${statusColor}; color:#161224; padding:3px 8px; border-radius:4px; font-size:12px; font-weight:bold;">
          ${siswa.Status || '-'}
        </span>
      </td>
      <td>${siswa.Username || '-'}</td>
      <td style="white-space: nowrap; position: sticky; right: 0; background: #1e1b2e; border-left: 1px solid #332d4a;">
        <button type="button" class="btn-action btn-small" style="background:#feca57; color:#111; border:none;" onclick="editSiswaByID('${id}')">✏️ Edit</button>
        <button type="button" class="btn-action btn-small badge-danger" style="border:none;" onclick="deleteSiswaByID('${id}')">🗑️ Hapus</button>
      </td>
    </tr>
    `;
  }).join('');

  tbody.innerHTML = htmlString;
}

// ==========================================
// PERBAIKAN FUNGSI EDIT
// ==========================================
function editGuruByID(guruID) {
  // Gunakan == agar kebal terhadap perbedaan Integer vs String
  const guru = listDataGuru.find(g => g.GuruID == guruID); 
  if (guru) openGuruModal(guru);
}

function editSiswaByID(siswaID) {
  // Gunakan == 
  const siswa = listDataSiswa.find(s => s.SiswaID == siswaID);
  if (siswa) openSiswaModal(siswa);
}

// ==========================================
// PERBAIKAN FUNGSI HAPUS
// ==========================================
async function deleteGuruByID(guruID) {
  const guru = listDataGuru.find(g => g.GuruID == guruID);
  if (!guru) return;

  if (confirm(`⚠️ PERINGATAN:\nHapus data Guru: ${guru.Nama} (${guru.NIP || guruID})?`)) {
    try {
      const res = await fetchAPI('deleteGuru', { GuruID: guruID });
      if (res && res.success) {
        alert('✅ Data berhasil dihapus!');
        // Gunakan != untuk menyaring tipe data dengan aman
        listDataGuru = listDataGuru.filter(g => g.GuruID != guruID); 
        renderGuruTable(listDataGuru);
      } else {
        alert('❌ Gagal menghapus: ' + (res?.message || 'Terjadi kesalahan sistem'));
      }
    } catch (err) {
      console.error("Error deleting Guru:", err);
      alert('❌ Gagal menghapus: Terjadi kesalahan jaringan / server.');
    }
  }
}

async function deleteSiswaByID(siswaID) {
  const siswa = listDataSiswa.find(s => s.SiswaID == siswaID);
  if (!siswa) return;

  if (confirm(`⚠️ PERINGATAN:\nHapus data Siswa: ${siswa.Nama} (${siswa.NIS || siswaID})?`)) {
    try {
      const res = await fetchAPI('deleteSiswa', { SiswaID: siswaID });
      if (res && res.success) {
        alert('✅ Data berhasil dihapus!');
        // Gunakan != untuk menyaring tipe data dengan aman
        listDataSiswa = listDataSiswa.filter(s => s.SiswaID != siswaID); 
        renderSiswaTable(listDataSiswa);
      } else {
        alert('❌ Gagal menghapus: ' + (res?.message || 'Terjadi kesalahan sistem'));
      }
    } catch (err) {
      console.error("Error deleting Siswa:", err);
      alert('❌ Gagal menghapus: Terjadi kesalahan jaringan / server.');
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  loadAllData();

  // Daftarkan listener submit form CRUD
  const formGuru = document.getElementById('formGuru');
  if (formGuru) formGuru.addEventListener('submit', handleGuruSubmit);

  const formSiswa = document.getElementById('formSiswa');
  if (formSiswa) formSiswa.addEventListener('submit', handleSiswaSubmit);
});

async function loadAllData() {
  try {
    const resGuru = await fetchAPI('getGuru');
    if (resGuru && resGuru.success && resGuru.data) {
      // WAJIB DITAMBAHKAN: Simpan data ke variabel global agar bisa dibaca oleh tombol Edit/Hapus
      listDataGuru = resGuru.data; 
      renderGuruTable(listDataGuru);
    }

    const resSiswa = await fetchAPI('getSiswa');
    if (resSiswa && resSiswa.success && resSiswa.data) {
      // WAJIB DITAMBAHKAN: Simpan data ke variabel global
      listDataSiswa = resSiswa.data; 
      renderSiswaTable(listDataSiswa);
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
    overlay.style.display = 'flex';
  }
}

function hideLoading() {
  const overlay = document.getElementById('loadingOverlay');
  if (overlay) {
    overlay.classList.add('hidden');
    overlay.style.display = 'none';
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
  
  // 1. Ambil Role user yang sedang login (default ke Superadmin jika kosong)
  const userRole = localStorage.getItem('role') || 'Superadmin';
  
  // 2. Sisipkan roleAktif ke dalam query URL
  let queryParams = `action=getDashboardData&periode=${currentPeriod}&roleAktif=${userRole}`;

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

// ==========================================
// FUNGSI INPUT ABSENSI MANUAL (GURU & SISWA)
// ==========================================

// 1. Memuat daftar nama Guru/Siswa ke Dropdown
async function loadUserDropdownManual() {
  const role = document.getElementById('man-role')?.value || 'GURU';
  const selectUser = document.getElementById('man-user');
  const dateInput = document.getElementById('man-date');

  if (!selectUser) return;

  // Setel tanggal otomatis ke hari ini jika kosong
  if (dateInput && !dateInput.value) {
    dateInput.value = new Date().toISOString().split('T')[0];
  }

  selectUser.innerHTML = '<option value="">⏳ Memuat data...</option>';

  try {
    const action = (role === 'GURU') ? 'getGuru' : 'getSiswa';
    const res = await fetchAPI(action);

    if (res && res.success && res.data) {
      let optionsHtml = '<option value="">-- Pilih Nama Pengguna --</option>';

      res.data.forEach(item => {
        if (role === 'GURU') {
          const id = item.NIP || item.GuruID || item.ID;
          optionsHtml += `<option value="${id}">${item.Nama} (NIP/ID: ${id})</option>`;
        } else {
          const id = item.NIS || item.SiswaID || item.ID;
          optionsHtml += `<option value="${id}">${item.Nama} (Kelas: ${item.KelasID || '-'})</option>`;
        }
      });

      selectUser.innerHTML = optionsHtml;
    } else {
      selectUser.innerHTML = '<option value="">Gagal memuat data pengguna</option>';
    }
  } catch (err) {
    console.error("Error load user dropdown:", err);
    selectUser.innerHTML = '<option value="">Koneksi terputus</option>';
  }
}

// 2. Mengirim data input manual ke Srv_Attendance.processManualInput
async function submitAbsensiManual(event) {
  if (event) event.preventDefault();

  const btn = document.getElementById('btn-submit-manual');
  const role = document.getElementById('man-role').value;
  const userId = document.getElementById('man-user').value;
  const status = document.getElementById('man-status').value;
  const date = document.getElementById('man-date').value;
  const keterangan = document.getElementById('man-keterangan').value;

  if (!userId || !status || !date) {
    alert("Harap lengkapi semua kolom yang wajib diisi!");
    return;
  }

  const payload = {
    userId: userId,
    role: role,
    status: status,
    date: date,
    keterangan: keterangan || `Input Manual (${status})`
  };

  btn.innerText = "⏳ Menyimpan Data...";
  btn.disabled = true;

  try {
    const res = await fetchAPI('processManualInput', payload);

    if (res && (res.success || res.attendanceId)) {
      alert(`✅ Presensi manual untuk ${role} (${userId}) [${status}] berhasil dicatat!`);
      document.getElementById('form-absensi-manual').reset();
      document.getElementById('man-date').value = new Date().toISOString().split('T')[0];
      loadUserDropdownManual();
    } else {
      alert("❌ Gagal menyimpan: " + (res?.message || "Terjadi kesalahan server"));
    }
  } catch (err) {
    alert("⚠️ Terjadi kesalahan jaringan saat menyimpan data.");
    console.error(err);
  } finally {
    btn.innerText = "💾 Simpan Presensi Manual";
    btn.disabled = false;
  }
}

// 2. Mengambil Data Laporan dari Server & Memunculkan Preview
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

  // PERBAIKAN 1: Sesuaikan nama payload dengan yang ditangkap di srv_laporan.gs
  // Tambahkan roleAktif agar lolos satpam RBAC di 1_Router.gs
  const payload = { 
    roleAktif: localStorage.getItem('role') || 'Admin', 
    roleTarget: role,          // Dikirim ke backend sebagai roleTarget
    jenisLaporan: jenis,       // Dikirim ke backend sebagai jenisLaporan
    tanggalMulai: tglMulai, 
    tanggalSampai: tglSampai, 
    namaTarget: namaTarget 
  };

  try {
    // PERBAIKAN 2: Gunakan wrapper fetchAPI() bawaan aplikasi Anda 
    // agar lebih rapi, tidak kena blokir CORS, dan loading otomatis ter-handle
    const result = await fetchAPI("tarikLaporan", payload);

    if (result && result.success) {
      dataLaporanAktif = result.data; 
      renderTabelLaporan(jenis, result.data); 
    } else {
      tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:20px; color:#ff7675;">❌ ${result ? result.message : 'Data tidak ditemukan'}</td></tr>`;
    }

  } catch (error) {
    console.error("Gagal memuat laporan:", error);
    tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:20px; color:#ff7675;">❌ Gagal menghubungi server. Pastikan koneksi internet stabil.</td></tr>`;
  }
}

// 3. Render Header dan Isi Tabel Laporan secara Dinamis
function renderTabelLaporan(jenis, data) {
  const thead = document.getElementById('head-preview-laporan');
  const tbody = document.getElementById('body-preview-laporan');

  let headHtml = '';
  let bodyHtml = '';

  // PERBAIKAN 3: Cegah error jika data kosong dari backend
  if (!data || data.length === 0) {
      tbody.innerHTML = `<tr><td colspan="10" style="text-align:center; padding:20px; color:#feca57;">Belum ada data absensi untuk pencarian ini.</td></tr>`;
      return;
  }

  if (jenis === 'Kategori') {
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
    // Tampilan Tabel Harian / Mingguan / Bulanan
    headHtml = `
      <tr>
        <th>NO</th>
        <th>TANGGAL</th>
        <th>NAMA</th>
        <th>ROLE / KELAS</th>
        <th>TIPE (IN/OUT)</th>
        <th>STATUS</th>
        <th>WAKTU (JAM)</th>
      </tr>`;

    data.forEach((item, i) => {
      // PERBAIKAN 4: Pemanggilan item dicocokkan dengan JSON output dari srv_laporan.gs
      // Yaitu: item.Kelas, item.CheckType, item.Timestamp
      bodyHtml += `
        <tr style="border-bottom: 1px solid #3a3553;">
          <td>${i + 1}</td>
          <td>${item.Tanggal || '-'}</td>
          <td><strong>${item.Nama || '-'}</strong></td>
          <td>${item.Kelas !== '-' ? item.Kelas : item.Role || '-'}</td>
          <td>${item.CheckType || 'IN'}</td>
          <td>
            <span style="background:${getWarnaBadgeStatus(item.Status)}; color:white; padding:3px 8px; border-radius:4px; font-size:11px;">
              ${item.Status || 'Hadir'}
            </span>
          </td>
          <td style="color:#feca57; font-weight:bold;">${item.Timestamp || '-'}</td>
        </tr>`;
    });
  }

  thead.innerHTML = headHtml;
  tbody.innerHTML = bodyHtml;
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
    
    // Cukup panggil URL langsung, default fetch adalah GET
    const response = await fetch(`${WEB_APP_URL}?action=${action}`);
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
// FUNGSI: SIMPAN PENGATURAN LENGKAP (DIPERBARUI: JAM MASUK & JAM PULANG)
// ============================================================================
async function simpanPengaturanLengkap() {
    const btnSimpan = document.querySelector('button[onclick="simpanPengaturanLengkap()"]');
    const textAsli = btnSimpan ? btnSimpan.innerHTML : '💾 Simpan Seluruh Pengaturan'; 
    
    if (btnSimpan) {
        btnSimpan.innerHTML = '⏳ Menyimpan ke Database...';
        btnSimpan.disabled = true;
        btnSimpan.style.opacity = '0.7';
    }

    // 1. Ambil data sesi dari localStorage (memakai user_session sesuai browser Anda)
    let userSessionData = localStorage.getItem('user_session') || sessionStorage.getItem('user_session');
    let userRole = 'Superadmin';
    let username = 'admin';

    // Parse isi JSON dari user_session jika ada
    if (userSessionData) {
        try {
            const parsedSession = JSON.parse(userSessionData);
            userRole = parsedSession.role || 'Superadmin';
            username = parsedSession.username || 'admin';
        } catch (e) {
            console.error("Gagal membaca session:", e);
        }
    }

    const payloadPengaturan = {
        action: "saveSettings", 
        
        // 2. DATA AUTENTIKASI
        roleAktif: userRole,  // <--- Backend router.gs meminta "roleAktif"
        role: userRole,       // Tetap dikirim untuk jaga-jaga
        token: userSessionData,
        username: username,

        identitas: {
            namaSekolah: document.getElementById('set-nama-sekolah')?.value || '',
            logoSekolah: document.getElementById('set-logo-sekolah')?.value || '',
            namaKepsek: document.getElementById('set-nama-kepsek')?.value || '',
            nipKepsek: document.getElementById('set-nip-kepsek')?.value || '',
            alamatKop: document.getElementById('set-alamat-kop')?.value || ''
        },
        tema: {
            mode: document.getElementById('set-tema-mode')?.value || 'dark',
            aksen: document.getElementById('set-tema-aksen')?.value || 'default'
        },
        parameter: {
            batasTelat: document.getElementById('set-batas-telat')?.value || '07:15',
            batasPulang: document.getElementById('set-batas-pulang')?.value || '14:50' // Menggantikan radiusAbsen
        },
        keamanan: {
            mfaSiswa: document.getElementById('set-mfa-siswa')?.value || 'rfid_face',
            mfaGuru: document.getElementById('set-mfa-guru')?.value || 'finger_face',
            antiLiveness: document.getElementById('anti-liveness')?.checked ?? true,
            antiFakeGps: document.getElementById('anti-fakegps')?.checked ?? true,
            antiDeviceBind: document.getElementById('anti-devicebind')?.checked ?? true,
            antiTimeSync: document.getElementById('anti-timesync')?.checked ?? true,
            antiQr: document.getElementById('anti-qr')?.checked ?? true
        }
    };

    const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxx3BLAOh7RZwF2vvukhDPhytbAPXfMP3H_RAJNeWgxLe2LNcCzojm-6HQ1kktPQMTQ/exec';

    try {
        const response = await fetch(WEB_APP_URL, { 
            method: 'POST',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payloadPengaturan)
        });

        const result = await response.json();

        if (result.success || result.status === 'success') {
            alert('✅ Pengaturan Jam Masuk & Jam Pulang berhasil disimpan!');
        } else {
            alert('❌ Gagal menyimpan pengaturan: ' + (result.message || 'Error tidak diketahui'));
        }

    } catch (error) {
        alert('⚠️ Terjadi kesalahan koneksi saat menyimpan pengaturan.');
    } finally {
        if (btnSimpan) {
            btnSimpan.innerHTML = textAsli;
            btnSimpan.disabled = false;
            btnSimpan.style.opacity = '1';
        }
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

// DEKLARASIKAN URL API DISINI (Ganti dengan link Web App Anda)
const urlAPI = "https://script.google.com/macros/s/AKfycbxx3BLAOh7RZwF2vvukhDPhytbAPXfMP3H_RAJNeWgxLe2LNcCzojm-6HQ1kktPQMTQ/exec";

// Meminta seluruh data dari server dan mendownloadnya sebagai file JSON
async function prosesBackup() {
    const btn = document.getElementById('btnBackup');
    btn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i> Menyiapkan Data...';
    btn.disabled = true;

    try {
        // Panggil endpoint ke Google Apps Script dengan redirect 'follow'
        const response = await fetch(urlAPI + "?action=doBackup", { 
            method: "GET",
            redirect: "follow" 
        });
        
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
        alert("Terjadi kesalahan jaringan saat mencoba backup. Pastikan URL API sudah benar.");
        console.error(error);
    } finally {
        btn.innerHTML = '<i class="fas fa-download mr-2"></i> Unduh File Backup';
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
            
            // PERBAIKAN: Menambahkan ?action=doRestore pada urlAPI agar terbaca oleh router backend
            const response = await fetch(urlAPI + "?action=doRestore", {
                method: 'POST',
                headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                redirect: "follow",
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
            alert("File tidak valid atau terjadi kesalahan jaringan. Pastikan URL API sudah benar.");
            console.error(error);
        } finally {
            btn.innerHTML = '<i class="fas fa-database mr-2"></i> Pulihkan Data';
            btn.disabled = false;
        }
    };
    
    // Baca file sebagai teks
    reader.readAsText(file);
}

// ==========================================
// MODULE: NOTIFIKASI WHATSAPP (FIXED FETCH_API)
// ==========================================

/**
 * 1. Cek Koneksi WA
 */
async function checkWaConnection() {
  const badge = document.getElementById("waStatusBadge");

  badge.textContent = "Mengecek...";
  badge.style.backgroundColor = "rgba(234, 179, 8, 0.2)";
  badge.style.color = "#facc15";

  // PERBAIKAN: Masukkan action sebagai string di parameter ke-1
  const response = await fetchAPI("cekKoneksiWA", {});

  if (response && response.success) {
    badge.textContent = "Terhubung";
    badge.style.backgroundColor = "rgba(16, 185, 129, 0.2)";
    badge.style.color = "#34d399";
    alert("Koneksi berhasil! Perangkat WA Anda sudah terhubung.");
  } else {
    badge.textContent = "Terputus";
    badge.style.backgroundColor = "rgba(239, 68, 68, 0.2)";
    badge.style.color = "#f87171";
    alert("Gagal terhubung: " + (response ? response.message : "Token belum diatur atau terjadi kesalahan sistem"));
  }
}

/**
 * 2. Simpan Pengaturan WA & Token
 */
/**
 * Simpan Pengaturan WA & Token ke Server
 */
async function saveWaSettings() {
  const tokenInput = document.getElementById("waApiToken") ? document.getElementById("waApiToken").value : "";
  const noKepsek = document.getElementById("waNoKepsek") ? document.getElementById("waNoKepsek").value : "";

  const settingsData = {
    token: tokenInput,
    noKepsek: noKepsek,
    waOrangTua: document.getElementById("waOrangTua") ? document.getElementById("waOrangTua").checked : false,
    waSiswa: document.getElementById("waSiswa") ? document.getElementById("waSiswa").checked : false,
    waGuruPribadi: document.getElementById("waGuruPribadi") ? document.getElementById("waGuruPribadi").checked : false,
    waGuru: document.getElementById("waGuru") ? document.getElementById("waGuru").checked : false,
    pemicu: {
      masuk: document.getElementById("trigMasuk") ? document.getElementById("trigMasuk").checked : false,
      pulang: document.getElementById("trigPulang") ? document.getElementById("trigPulang").checked : false,
      terlambat: document.getElementById("trigTerlambat") ? document.getElementById("trigTerlambat").checked : false,
      alpa: document.getElementById("trigAlpa") ? document.getElementById("trigAlpa").checked : false
    }
  };

  // Panggil API backend Apps Script
  const response = await fetchAPI("simpanPengaturanWA", settingsData);

  if (response && response.success) {
    alert("✅ " + response.message);
    if (document.getElementById("waApiToken")) {
      document.getElementById("waApiToken").value = ""; // Kosongkan input token setelah simpan
    }
    checkWaConnection(); // Cek status koneksi otomatis
  } else {
    alert("❌ Gagal menyimpan pengaturan: " + (response ? response.message : "Kesalahan sistem"));
  }
}

/**
 * 3. Simpan Template Pesan
 */
async function saveWaTemplate() {
  const type = document.getElementById("waTemplateType").value;
  const message = document.getElementById("waTemplateMessage").value;

  if (!message.trim()) {
    alert("Isi pesan tidak boleh kosong!");
    return;
  }

  // PERBAIKAN: Masukkan action 'simpanTemplateWA' sebagai argumen ke-1
  const response = await fetchAPI("simpanTemplateWA", { jenis: type, pesan: message });

  if (response && response.success) {
    alert("Template pesan '" + type + "' berhasil disimpan!");
  } else {
    alert("Gagal menyimpan template: " + (response ? response.message : "Kesalahan sistem"));
  }
}

/**
 * 4. Uji Kirim Pesan WA
 */
async function testWaMessage() {
  const targetNo = prompt("Masukkan nomor WA tujuan untuk uji coba (contoh: 08123456789):");
  if (!targetNo) return;

  const testMsg = "Halo! Ini adalah pesan uji coba dari Sistem Absensi Sekolah. Jika pesan ini masuk, koneksi WA Anda sudah bekerja dengan baik ✅";

  // PERBAIKAN: Masukkan action 'ujiKirimWA' sebagai argumen ke-1
  const response = await fetchAPI("ujiKirimWA", { targetNo: targetNo, msg: testMsg });

  if (response && response.success) {
    alert("Berhasil! Pesan uji coba telah dikirim ke " + targetNo);
  } else {
    alert("Gagal mengirim pesan: " + (response ? response.message : "Cek kembali nomor tujuan atau Pengaturan Token Anda di server."));
  }
}


// ==========================================
// PENGELOLA KREDENSIAL TERPADU (FP, RFID, QR)
// (WAJAH SUDAH DIURUS OLEH face-ai.js)
// ==========================================

// ------------------------------------------
// 0. LOADER DROPDOWN USER (OTOMATIS)
// ------------------------------------------

async function loadAllUserDropdowns() {
  // faceUserSelect dihapus dari sini agar tidak bentrok dengan fungsi loadUserForFaceAI()
  const dropdownIds = ["fpUserSelect", "rfidUserSelect", "qrUserSelect"];
  
  const result = await fetchAPI("getDashboardData", { role: "semua" });
  if (!result || !result.success) return;

  const data = result.data || result;
  const listSiswa = data.listSiswa || [];
  const listGuru = data.listGuru || [];

  dropdownIds.forEach(id => {
    const select = document.getElementById(id);
    if (!select) return;

    select.innerHTML = "<option value=''>-- Pilih Pengguna --</option>";

    if (listSiswa.length > 0) {
      const groupSiswa = document.createElement("optgroup");
      groupSiswa.label = "--- SISWA ---";
      listSiswa.forEach(s => {
        groupSiswa.innerHTML += `<option value="${s.id || s.nis}">${s.nama} (${s.nis || s.kelas})</option>`;
      });
      select.appendChild(groupSiswa);
    }

    if (listGuru.length > 0) {
      const groupGuru = document.createElement("optgroup");
      groupGuru.label = "--- GURU / STAF ---";
      listGuru.forEach(g => {
        groupGuru.innerHTML += `<option value="${g.id || g.nip}">${g.nama} (${g.nip || 'Guru'})</option>`;
      });
      select.appendChild(groupGuru);
    }
  });
}


// ------------------------------------------
// 2. LOGIKA RFID / NFC
// ------------------------------------------
async function simpanKartuRFID() {
  const userID = document.getElementById("rfidUserSelect").value;
  const cardUID = document.getElementById("rfidCardInput").value.trim();
  const btn = document.getElementById("btnSimpanRfid");

  if (!userID) return alert("Pilih Pengguna terlebih dahulu!");
  if (!cardUID) return alert("Tap kartu RFID pada scanner!");

  btn.innerText = "Menyimpan...";
  btn.disabled = true;

  const result = await fetchAPI("saveRFIDCard", { userID: userID, rfidUID: cardUID });

  if (result && result.success) {
    alert(`✅ Kartu RFID (${cardUID}) berhasil terdaftar!`);
    document.getElementById("rfidCardInput").value = "";
    document.getElementById("rfidCardInput").focus();
  } else {
    alert("❌ Gagal menyimpan RFID: " + (result?.message || "Error server"));
  }

  btn.innerText = "Simpan Kartu";
  btn.disabled = false;
}

// ==========================================
// FUNGSI MODAL HAK AKSES (ROLE)
// ==========================================

function openModalTambahRole() {
  const modal = document.getElementById('modal-role');
  if (modal) {
    modal.style.display = 'flex';
  }
  
  // Ubah judul form kembali ke "Tambah Role Baru"
  const judul = document.getElementById('modal-role-title');
  if(judul) {
    judul.innerHTML = '➕ Tambah Role Baru';
  }

  // Kosongkan isi ketikan sebelumnya
  const form = document.getElementById('form-role');
  if (form) {
    form.reset();
  }

  // Kosongkan ID Lama (Penting agar tidak menimpa data saat simpan)
  const inputOldId = document.getElementById('role-id-old');
  if (inputOldId) {
    inputOldId.value = '';
  }

  // Buka gembok (readonly) pada kolom Nama Role
  const inputNama = document.getElementById('role-nama');
  if (inputNama) {
    inputNama.removeAttribute('readonly');
    inputNama.removeAttribute('disabled');
    inputNama.style.opacity = '1';
    inputNama.style.backgroundColor = '#2a2640'; // Sesuaikan warna background asli input Anda
  }
}

// Fungsi pelengkap untuk menutup modal (berjaga-jaga jika belum ada)
function closeModalRole() {
  const modal = document.getElementById('modal-role');
  if (modal) {
    modal.style.display = 'none';
  }
}

// ==========================================
// MAPPING AKSES TAB NAVIGASI SIDEBAR
// ==========================================
const TAB_PERMISSIONS = {
  'Superadmin': ['*'], // Bebas akses semua tab

  'Admin': [
    'dashboard', 'data-siswa', 'data-guru', 'import',
    'enrollment', 'fingerprint', 'rfid', 'barcode',
    'admin-operator', 'hak-akses', 'jadwal-pelajaran',
    'gate-pass', 'absensi-kelas', 'laporan-absensi',
    'setting', 'backup', 'whatsapp-settings', 'geofencing'
  ],

  'Operator': [
    'dashboard', 'data-siswa', 'data-guru',
    'enrollment', 'fingerprint', 'rfid', 'barcode',
    'absensi-kelas', 'laporan-absensi'
  ],

  'Guru Piket': [
    'dashboard','gate-pass', 'absensi-kelas', 'laporan-absensi'
  ],

  'Guru Mata Pelajaran': [
    'dashboard', 'absensi-kelas', 'laporan-absensi'
  ],

  'Kepala Sekolah': [
    'dashboard', 'laporan-absensi'
  ],

  'Guru': [
  'dashboard', 'absensi-kelas', 'laporan-absensi'
  ],

};

function renderSidebarByRole() {
  const userRole = localStorage.getItem('role') || 'Guest';
  
  // Match nama role (case-insensitive)
  const formattedRole = Object.keys(TAB_PERMISSIONS).find(
    r => r.toLowerCase() === userRole.trim().toLowerCase()
  ) || 'Guest';

  const allowedTabs = TAB_PERMISSIONS[formattedRole] || [];

  // 1. Filter Tombol Navigasi
  const navButtons = document.querySelectorAll('.sidebar .nav-btn');
  navButtons.forEach(btn => {
    // Ambil nama tab dari parameter onclick, contoh: switchTab('data-siswa', this) -> 'data-siswa'
    const onclickAttr = btn.getAttribute('onclick') || '';
    const match = onclickAttr.match(/switchTab\('([^']+)'/);
    
    if (match && match[1]) {
      const tabName = match[1];
      
      if (allowedTabs.includes('*') || allowedTabs.includes(tabName)) {
        btn.style.display = 'block';
      } else {
        btn.style.display = 'none';
      }
    }
  });

  // 2. Sembunyikan Judul Kelompok Menu (menu-group) Jika Semua Anaknya Tersembunyi
  const menuGroups = document.querySelectorAll('.sidebar .menu-group');
  menuGroups.forEach(group => {
    let nextEl = group.nextElementSibling;
    let hasVisibleChild = false;

    // Periksa tombol-tombol di bawah kelompok menu ini
    while (nextEl && !nextEl.classList.contains('menu-group') && !nextEl.classList.contains('logout-btn')) {
      if (nextEl.classList.contains('nav-btn') && nextEl.style.display !== 'none') {
        hasVisibleChild = true;
        break;
      }
      nextEl = nextEl.nextElementSibling;
    }

    group.style.display = hasVisibleChild ? 'block' : 'none';
  });
}

// ==========================================
// FUNGSI HAPUS ADMIN / OPERATOR (FRONTEND)
// ==========================================
async function hapusAdmin(idAtauUsername, btnElement) {
  // 1. Validasi input
  if (!idAtauUsername) {
    alert("Error: ID atau Username tidak terbaca dari tombol Hapus!");
    return;
  }

  // 2. Konfirmasi penghapusan
  if (!confirm(`Apakah Anda yakin ingin menghapus data '${idAtauUsername}'?`)) {
    return;
  }

  // 3. BUNGKUS DATA KE DALAM OBJEK
  const payload = {
    action: 'deleteAdmin',
    UserID: idAtauUsername,
    Username: idAtauUsername,
    id: idAtauUsername
  };

  try {
    const response = await fetchAPI('deleteAdmin', payload); 

    if (response && response.success) {
      alert(response.message || "Data berhasil dihapus!");
      
      // 4. HAPUS BARIS TABEL SEKERAS/SEKETIKA DARI DOM (EFEK INSTAN)
      if (btnElement) {
        const row = btnElement.closest('tr');
        if (row) row.remove();
      } else {
        // Fallback: Cari baris tabel yang mengandung teks username lalu hapus
        const allRows = document.querySelectorAll('tr');
        allRows.forEach(row => {
          if (row.innerText.includes(idAtauUsername)) {
            row.remove();
          }
        });
      }

      // 5. Re-fetch data dari server jika ada fungsi loader
      if (typeof loadDataAdmin === 'function') {
        loadDataAdmin();
      } else if (typeof loadAdminData === 'function') {
        loadAdminData();
      }

    } else {
      alert("Gagal menghapus: " + (response?.message || "Terjadi kesalahan server."));
    }
  } catch (error) {
    console.error("Error saat menghapus:", error);
    alert("Gagal menghubungi server!");
  }
}

// Jalankan saat halaman selesai dimuat
document.addEventListener("DOMContentLoaded", renderSidebarByRole);