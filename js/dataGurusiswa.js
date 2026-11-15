// ==========================================
// FILE: js/dataGurusiswa.js
// MODUL KHUSUS CRUD DATA GURU & DATA SISWA
// ==========================================

// Deklarasi Variabel Global Data Master
let listDataGuru = [];
let listDataSiswa = [];

// ==========================================
// 1. OPEN MODAL GURU (TAMBAH / EDIT)
// ==========================================
function openGuruModal(data = null) {
  const modal = document.getElementById('modalGuru') || document.getElementById('modal-guru');
  const form = document.getElementById('formGuru') || document.getElementById('form-guru');

  if (form) form.reset();

  if (data) {
    const elTitle = document.getElementById('modalGuruTitle') || document.getElementById('modal-guru-title');
    if (elTitle) elTitle.innerText = '✏️ Edit Data Guru / Staf';

    if (document.getElementById('guru_GuruID')) document.getElementById('guru_GuruID').value = data.GuruID || data.id || '';
    if (document.getElementById('guru_NIP')) document.getElementById('guru_NIP').value = data.NIP || data.nip || '';
    if (document.getElementById('guru_Nama')) document.getElementById('guru_Nama').value = data.Nama || data.nama || '';
    if (document.getElementById('guru_JK')) document.getElementById('guru_JK').value = data.JK || 'L';
    if (document.getElementById('guru_TmpLahir')) document.getElementById('guru_TmpLahir').value = data.TmpLahir || '';
    if (document.getElementById('guru_TglLahir')) document.getElementById('guru_TglLahir').value = data.TglLahir ? String(data.TglLahir).split('T')[0] : '';
    if (document.getElementById('guru_HPWA')) document.getElementById('guru_HPWA').value = data.HPWA || data.HP || data.WA || '';
    if (document.getElementById('guru_Email')) document.getElementById('guru_Email').value = data.Email || '';
    if (document.getElementById('guru_Alamat')) document.getElementById('guru_Alamat').value = data.Alamat || '';
    if (document.getElementById('guru_Jabatan')) document.getElementById('guru_Jabatan').value = data.Jabatan || '';
    if (document.getElementById('guru_Mapel')) document.getElementById('guru_Mapel').value = data.Mapel || '';
    if (document.getElementById('guru_Status')) document.getElementById('guru_Status').value = data.Status || 'Aktif';
    if (document.getElementById('guru_TglMasuk')) document.getElementById('guru_TglMasuk').value = data.TglMasuk ? String(data.TglMasuk).split('T')[0] : '';
    if (document.getElementById('Kode_Guru')) document.getElementById('Kode_Guru').value = data.Kode_Guru || '';

    let rawRole = String(data.Role_Sistem || data.Role || data.Jabatan || 'Guru').trim();
    if (rawRole.includes('Admin') || rawRole.includes('TU') || rawRole.includes('Tenaga')) {
      rawRole = 'Tenaga Kependidikan';
    } else if (rawRole.includes('Kepsek') || rawRole.includes('Kepala')) {
      rawRole = 'Kepala Sekolah';
    } else {
      rawRole = 'Guru';
    }
    if (document.getElementById('guru_Role_Sistem')) document.getElementById('guru_Role_Sistem').value = rawRole;
    if (document.getElementById('guru_Username')) document.getElementById('guru_Username').value = data.Username || data.NIP || '';
  } else {
    const elTitle = document.getElementById('modalGuruTitle') || document.getElementById('modal-guru-title');
    if (elTitle) elTitle.innerText = '👔 Tambah Data Guru / Staf';
    if (document.getElementById('guru_GuruID')) document.getElementById('guru_GuruID').value = 'AUTO';
  }

  if (modal) {
    modal.style.display = 'flex';
  } else {
    alert("Elemen 'modalGuru' tidak ditemukan di HTML!");
  }
}

// ==========================================
// 2. OPEN MODAL SISWA (TAMBAH / EDIT)
// ==========================================
function openSiswaModal(data = null) {
  const modal = document.getElementById('modalSiswa') || document.getElementById('modal-siswa');
  const form = document.getElementById('formSiswa') || document.getElementById('form-siswa');

  if (form) form.reset();

  if (data) {
    const elTitle = document.getElementById('modalSiswaTitle') || document.getElementById('modal-siswa-title');
    if (elTitle) elTitle.innerText = '✏️ Edit Data Siswa';

    if (document.getElementById('siswa_SiswaID')) document.getElementById('siswa_SiswaID').value = data.SiswaID || data.id || '';
    if (document.getElementById('siswa_NIS')) document.getElementById('siswa_NIS').value = data.NIS || data.nis || '';
    if (document.getElementById('siswa_NISN')) document.getElementById('siswa_NISN').value = data.NISN || data.nisn || '';
    if (document.getElementById('siswa_Nama')) document.getElementById('siswa_Nama').value = data.Nama || data.nama || '';
    if (document.getElementById('siswa_JK')) document.getElementById('siswa_JK').value = data.JK || 'L';
    if (document.getElementById('siswa_TmpLahir')) document.getElementById('siswa_TmpLahir').value = data.TmpLahir || '';
    if (document.getElementById('siswa_TglLahir')) document.getElementById('siswa_TglLahir').value = data.TglLahir ? String(data.TglLahir).split('T')[0] : '';
    if (document.getElementById('siswa_HPWA')) document.getElementById('siswa_HPWA').value = data.HPWA || data.HP || data.WA || '';
    if (document.getElementById('siswa_NamaOrtu')) document.getElementById('siswa_NamaOrtu').value = data.NamaOrtu || '';
    if (document.getElementById('siswa_WA_Ortu')) document.getElementById('siswa_WA_Ortu').value = data.WA_Ortu || '';
    if (document.getElementById('siswa_KelasID')) document.getElementById('siswa_KelasID').value = data.KelasID || data.Kelas || '';
    if (document.getElementById('siswa_JurusanID')) document.getElementById('siswa_JurusanID').value = data.JurusanID || '';
    if (document.getElementById('siswa_Angkatan')) document.getElementById('siswa_Angkatan').value = data.Angkatan || '';
    if (document.getElementById('siswa_Status')) document.getElementById('siswa_Status').value = data.Status || 'Aktif';
    if (document.getElementById('siswa_Username')) document.getElementById('siswa_Username').value = data.Username || data.NIS || '';
  } else {
    const elTitle = document.getElementById('modalSiswaTitle') || document.getElementById('modal-siswa-title');
    if (elTitle) elTitle.innerText = '🎓 Tambah Data Siswa Manual';
    if (document.getElementById('siswa_SiswaID')) document.getElementById('siswa_SiswaID').value = 'AUTO';
  }

  if (modal) {
    modal.style.display = 'flex';
  } else {
    alert("Elemen 'modalSiswa' tidak ditemukan di HTML!");
  }
}

// ==========================================
// 3. SUBMIT FORM SIMPAN GURU & SISWA
// ==========================================
async function handleGuruSubmit(event) {
  event.preventDefault();

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
    Mapel: document.getElementById('guru_Mapel').value,
    Status: document.getElementById('guru_Status').value,
    TglMasuk: document.getElementById('guru_TglMasuk').value,
    Role_Sistem: document.getElementById('guru_Role_Sistem').value,
    Kode_Guru: document.getElementById('Kode_Guru').value,
    Username: document.getElementById('guru_Username') ? document.getElementById('guru_Username').value : '',
    Password: document.getElementById('guru_Password') ? document.getElementById('guru_Password').value : ''
  };

  try {
    const result = await fetchAPI("saveGuru", payload);

    if (result && (result.success || result.status)) {
      alert("✅ Data Guru / Staf berhasil disimpan!");
      closeModal('modalGuru');
      loadDataGuru();
    } else {
      alert("❌ Gagal menyimpan data: " + (result?.message || "Terjadi kesalahan server"));
    }
  } catch (err) {
    alert("❌ Error koneksi: " + err.message);
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
      loadDataSiswa();
    } else {
      alert('❌ Gagal Menyimpan: ' + (res?.message || 'Terjadi kesalahan sistem'));
    }
  } catch (err) {
    console.error('Error saving Siswa:', err);
    alert('❌ Gagal Menyimpan: Terjadi kesalahan jaringan / server.');
  }
}

// ==========================================
// 4. RENDER TABEL GURU & SISWA
// ==========================================
function renderGuruTable(dataArray) {
  listDataGuru = Array.isArray(dataArray) ? dataArray : [];
  const tbody = document.getElementById('guru-table-body');
  if (!tbody) return;

  if (listDataGuru.length === 0) {
    tbody.innerHTML = `<tr><td colspan="16" style="text-align:center; color:#a29bfe; padding:20px;">Belum ada data guru.</td></tr>`;
    return;
  }

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
// 5. EDIT, LOAD & DELETE DATA GURU & SISWA
// ==========================================
function editGuruByID(guruID) {
  const guru = listDataGuru.find(g =>
    String(g.GuruID || g.id || g.ID).trim() === String(guruID).trim() ||
    String(g.NIP || '').trim() === String(guruID).trim()
  );

  if (guru) {
    openGuruModal(guru);
  } else {
    console.warn("Data Guru tidak ditemukan untuk ID:", guruID, "Data Tersedia:", listDataGuru);
    alert("⚠️ Gagal memuat data guru untuk diedit.");
  }
}

function editSiswaByID(siswaID) {
  const siswa = listDataSiswa.find(s =>
    String(s.SiswaID || s.id || s.ID).trim() === String(siswaID).trim() ||
    String(s.NIS || '').trim() === String(siswaID).trim()
  );

  if (siswa) {
    openSiswaModal(siswa);
  } else {
    console.warn("Data Siswa tidak ditemukan untuk ID:", siswaID, "Data Tersedia:", listDataSiswa);
    alert("⚠️ Gagal memuat data siswa untuk diedit.");
  }
}

async function loadDataGuru() {
  try {
    const res = await fetchAPI('getGuru');
    if (res && res.success && Array.isArray(res.data)) {
      listDataGuru = res.data;
      renderGuruTable(listDataGuru);
    }
  } catch (err) {
    console.error("Gagal memuat data guru:", err);
  }
}

async function loadDataSiswa() {
  try {
    const res = await fetchAPI('getSiswa');
    if (res && res.success && Array.isArray(res.data)) {
      listDataSiswa = res.data;
      renderSiswaTable(listDataSiswa);
    }
  } catch (err) {
    console.error("Gagal memuat data siswa:", err);
  }
}

async function loadAllData() {
  try {
    const resGuru = await fetchAPI('getGuru');
    if (resGuru && resGuru.success && resGuru.data) {
      listDataGuru = resGuru.data;
      renderGuruTable(listDataGuru);
    }

    const resSiswa = await fetchAPI('getSiswa');
    if (resSiswa && resSiswa.success && resSiswa.data) {
      listDataSiswa = resSiswa.data;
      renderSiswaTable(listDataSiswa);
    }
  } catch (error) {
    console.error("Gagal memuat data dari database:", error);
  }
}

async function deleteGuruByID(guruID) {
  const guru = listDataGuru.find(g => g.GuruID == guruID);
  if (!guru) return;

  if (confirm(`⚠️ PERINGATAN:\nHapus data Guru: ${guru.Nama} (${guru.NIP || guruID})?`)) {
    try {
      const res = await fetchAPI('deleteGuru', { GuruID: guruID });
      if (res && res.success) {
        alert('✅ Data berhasil dihapus!');
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

// ==========================================
// 6. PENCARIAN REAL-TIME & INISIALISASI AWAL
// ==========================================
function filterTable(sectionId, keyword) {
  const lowerKeyword = keyword.toLowerCase();
  const rows = document.querySelectorAll(`#${sectionId} tbody tr`);

  rows.forEach(row => {
    const textContent = row.textContent.toLowerCase();
    row.style.display = textContent.includes(lowerKeyword) ? '' : 'none';
  });
}

document.addEventListener('DOMContentLoaded', () => {
  loadAllData();

  const searchGuru = document.querySelector('#data-guru .search-bar input');
  if (searchGuru) {
    searchGuru.addEventListener('keyup', (e) => filterTable('data-guru', e.target.value));
  }

  const searchSiswa = document.querySelector('#data-siswa .search-bar input');
  if (searchSiswa) {
    searchSiswa.addEventListener('keyup', (e) => filterTable('data-siswa', e.target.value));
  }
});