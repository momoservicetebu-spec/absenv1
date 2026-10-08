/**
 * FILE: js/qr_code.js
 * Fitur: Single & Bulk QR Card Generator (Portrait/Landscape) + CRUD Table
 */

let qrUserListCache = [];
let currentQRMode = 'single';
let currentQRDataToSave = null;

document.addEventListener("DOMContentLoaded", function () {
  loadUserForQR();
  loadSavedQRTable();
});
// Inisialisasi Select2 pada dropdown pengguna agar bisa dicari
$(document).ready(function() {
    $('#qrUserSelect').select2({
        placeholder: "-- Cari Pengguna --",
        allowClear: true,
        width: '100%' // Sesuaikan lebar otomatis
    });
    
    // Pastikan saat Select2 berubah, kartu preview juga terupdate
    $('#qrUserSelect').on('change', function() {
        renderQRPreview();
    });
});

// 1. MEMUAT DATA UNTUK DROPDOWN
async function loadUserForQR() {
  const selectElement = document.getElementById('qrUserSelect');
  const classElement = document.getElementById('qrClassSelect');
  if (!selectElement) return;

  selectElement.innerHTML = '<option value="">⏳ Memuat data pengguna...</option>';

  try {
    const result = await fetchAPI("getQRUsers");

    if (result && result.success) {
      selectElement.innerHTML = '<option value="">-- Pilih Pengguna --</option>';
      if (classElement) classElement.innerHTML = '<option value="ALL">-- Cetak Semua (Siswa & Guru) --</option><option value="GURU">-- Semua Guru --</option>';

      let usersArray = [];
      let classSet = new Set();

      if (typeof result.data === 'object' && result.data !== null) {
        if (result.data.listSiswa && Array.isArray(result.data.listSiswa)) {
          let siswa = result.data.listSiswa.map(u => ({...u, Role: 'Siswa'}));
          usersArray = usersArray.concat(siswa);
          siswa.forEach(s => { if (s.Kelas) classSet.add(s.Kelas); });
        }
        if (result.data.listGuru && Array.isArray(result.data.listGuru)) {
          let guru = result.data.listGuru.map(u => ({...u, Role: 'Guru'}));
          usersArray = usersArray.concat(guru);
        }
      } else if (Array.isArray(result.data)) {
        usersArray = result.data;
      }

      if (usersArray.length > 0) {
        qrUserListCache = usersArray;

        usersArray.forEach(user => {
          let userId = user.UserID || user.NIP || user.NIS || user.id;
          let userName = user.Nama || user.nama || "Tanpa Nama";
          let userRole = user.Role || (String(userId).length > 10 ? 'Guru' : 'Siswa');

          if (userId) {
            let option = document.createElement('option');
            option.value = userId;
            option.text = `[${userRole}] ${userId} - ${userName}`;
            selectElement.appendChild(option);
          }
        });

        classSet.forEach(kelas => {
          if (classElement) {
            let opt = document.createElement('option');
            opt.value = kelas;
            opt.text = `Kelas: ${kelas}`;
            classElement.appendChild(opt);
          }
        });

        selectElement.onchange = () => renderQRPreview();
        if (classElement) classElement.onchange = () => renderQRPreview();

      } else {
        selectElement.innerHTML = '<option value="">❌ Data pengguna kosong</option>';
      }
    } else {
      selectElement.innerHTML = '<option value="">❌ Gagal mengambil data</option>';
    }
  } catch (error) {
    console.error("Error QR:", error);
    selectElement.innerHTML = `<option value="">❌ Error: ${error.message}</option>`;
  }
}

// 2. SWITCH MODE (SINGLE / BULK)
function switchQRMode(mode) {
  currentQRMode = mode;
  const btnSingle = document.getElementById("btnModeSingle");
  const btnBulk = document.getElementById("btnModeBulk");
  const containerSingle = document.getElementById("containerSingleUser");
  const containerBulk = document.getElementById("containerBulkClass");

  if (!btnSingle || !btnBulk) return;

  if (mode === 'single') {
    btnSingle.style.background = "#4f46e5";
    btnSingle.style.color = "#ffffff";
    btnSingle.style.border = "none";

    btnBulk.style.background = "transparent";
    btnBulk.style.color = "#a5b4fc";
    btnBulk.style.border = "1px solid #4f46e5";

    if (containerSingle) containerSingle.style.display = "block";
    if (containerBulk) containerBulk.style.display = "none";
  } else {
    btnBulk.style.background = "#4f46e5";
    btnBulk.style.color = "#ffffff";
    btnBulk.style.border = "none";

    btnSingle.style.background = "transparent";
    btnSingle.style.color = "#a5b4fc";
    btnSingle.style.border = "1px solid #4f46e5";

    if (containerSingle) containerSingle.style.display = "none";
    if (containerBulk) containerBulk.style.display = "block";
  }
  renderQRPreview();
}

// 3. BUILD TEMPLATE KARTU (PORTRAIT & LANDSCAPE)
function buildCardHtml(userId, nama, role, orientation) {
  const qrPayload = JSON.stringify({ id: userId, role: role, nama: nama });
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrPayload)}`;

  if (orientation === 'landscape') {
    return `
      <div class="qr-printable-card" style="background: #ffffff; color: #1f2937; padding: 16px; border-radius: 12px; width: 340px; height: 210px; border: 2px solid #6366f1; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); margin: 10px auto; font-family: sans-serif; box-sizing: border-box;">
        <div style="text-align: left; width: 55%; padding-right: 10px;">
          <span style="font-size: 10px; background: #e0e7ff; color: #3730a3; padding: 3px 8px; border-radius: 20px; font-weight: bold; text-transform: uppercase;">${role}</span>
          <h5 style="margin: 10px 0 4px 0; font-size: 13px; color: #4f46e5; font-weight: 800;">KARTU ABSENSI DIGITAL</h5>
          <h6 style="margin: 6px 0 2px 0; font-size: 14px; font-weight: bold; color: #111827; line-height: 1.2;">${nama}</h6>
          <p style="margin: 0; font-size: 11px; color: #6b7280; font-family: monospace;">ID: ${userId}</p>
        </div>
        <div style="width: 45%; text-align: center;">
          <img src="${qrImageUrl}" alt="QR Code" style="width: 120px; height: 120px; border: 1px solid #e5e7eb; padding: 4px; border-radius: 8px; background: #fff;" />
        </div>
      </div>
    `;
  } else {
    return `
      <div class="qr-printable-card" style="background: #ffffff; color: #1f2937; padding: 20px; border-radius: 12px; width: 230px; height: 340px; border: 2px solid #6366f1; text-align: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); margin: 10px auto; font-family: sans-serif; display: flex; flex-direction: column; justify-content: space-between; box-sizing: border-box;">
        <div>
          <h5 style="margin: 0; font-size: 12px; color: #4f46e5; font-weight: 800; letter-spacing: 0.5px;">KARTU ABSENSI DIGITAL</h5>
          <small style="font-size: 10px; background: #e0e7ff; color: #3730a3; padding: 2px 8px; border-radius: 12px; font-weight: bold; text-transform: uppercase; display: inline-block; margin-top: 4px;">${role}</small>
        </div>
        <div style="margin: 10px 0;">
          <img src="${qrImageUrl}" alt="QR Code" style="width: 135px; height: 135px; border: 1px solid #e5e7eb; padding: 4px; border-radius: 8px; background: #fff;" />
        </div>
        <div>
          <h6 style="margin: 0 0 4px 0; font-size: 14px; font-weight: bold; color: #111827;">${nama}</h6>
          <p style="margin: 0; font-size: 11px; color: #6b7280; font-family: monospace;">ID: ${userId}</p>
        </div>
      </div>
    `;
  }
}

// 4. PREVIEW KARTU
function renderQRPreview() {
  const previewBox = document.getElementById("qrPreviewBox");
  const orientationElem = document.getElementById("qrOrientationSelect");
  if (!previewBox || !orientationElem) return;

  const orientation = orientationElem.value;

  if (currentQRMode === 'single') {
    const selectElem = document.getElementById("qrUserSelect");
    const selectedUserId = selectElem ? selectElem.value : "";
    if (!selectedUserId) {
      previewBox.innerHTML = '<p style="color: #9ca3af; margin: 0;">Pilih pengguna di atas untuk menampilkan kartu QR Code</p>';
      currentQRDataToSave = null;
      return;
    }

    const user = qrUserListCache.find(u => String(u.UserID || u.NIP || u.NIS || u.id) === String(selectedUserId));
    const nama = user ? (user.Nama || user.nama) : "Pengguna";
    const role = user ? (user.Role || (String(selectedUserId).length > 10 ? 'Guru' : 'Siswa')) : 'Siswa';

    previewBox.innerHTML = buildCardHtml(selectedUserId, nama, role, orientation);

    currentQRDataToSave = {
      action: "saveQRCode",
      userId: selectedUserId,
      role: role,
      qrPayload: JSON.stringify({ id: selectedUserId, role: role, nama: nama })
    };

  } else {
    const classElem = document.getElementById("qrClassSelect");
    const selectedClass = classElem ? classElem.value : "";
    let filteredUsers = [];

    if (selectedClass === "ALL") {
      filteredUsers = qrUserListCache;
    } else if (selectedClass === "GURU") {
      filteredUsers = qrUserListCache.filter(u => u.Role === "Guru");
    } else if (selectedClass) {
      filteredUsers = qrUserListCache.filter(u => u.Kelas === selectedClass);
    }

    if (filteredUsers.length === 0) {
      previewBox.innerHTML = '<p style="color: #9ca3af; margin: 0;">Pilih kelas di atas untuk melihat preview massal.</p>';
      return;
    }

    let bulkHtml = `<p style="color: #38bdf8; font-weight: bold; margin-bottom: 15px;">Menampilkan ${filteredUsers.length} Kartu Siap Cetak:</p>`;
    bulkHtml += `<div style="display: flex; flex-wrap: wrap; gap: 15px; justify-content: center; max-height: 450px; overflow-y: auto; padding: 10px;">`;
    
    filteredUsers.forEach(u => {
      let uId = u.UserID || u.NIP || u.NIS || u.id;
      let uNama = u.Nama || u.nama || "Pengguna";
      let uRole = u.Role || (String(uId).length > 10 ? 'Guru' : 'Siswa');
      bulkHtml += buildCardHtml(uId, uNama, uRole, orientation);
    });

    bulkHtml += `</div>`;
    previewBox.innerHTML = bulkHtml;
  }
}

// 5. SIMPAN KE DATABASE
async function simpanKeDatabaseQR() {
  if (currentQRMode === 'bulk') {
    alert("Fitur simpan otomatis tersedia di mode Per Orang. Untuk cetak massal, Anda bisa langsung mencetak kartu.");
    return;
  }

  if (!currentQRDataToSave) {
    alert("⚠️ Silakan pilih pengguna terlebih dahulu!");
    return;
  }

  const btnSimpan = document.getElementById("btnSimpanQR");
  if (!btnSimpan) return;

  const teksAsli = btnSimpan.innerHTML;
  btnSimpan.innerHTML = "⏳ Menyimpan...";
  btnSimpan.disabled = true;

  try {
    const result = await fetchAPI("saveQRCode", currentQRDataToSave);
    if (result && result.success) {
      alert(`✅ Berhasil! QR Code untuk ID: ${currentQRDataToSave.userId} telah tersimpan.`);
      loadSavedQRTable();
    } else {
      alert("❌ Gagal menyimpan data: " + (result.message || "Terjadi kesalahan."));
    }
  } catch (error) {
    alert("❌ Error: " + error.message);
  } finally {
    btnSimpan.innerHTML = teksAsli;
    btnSimpan.disabled = false;
  }
}

// 6. CETAK KARTU (PRINTING GRID A4)
function cetakKartuQR() {
  const previewBox = document.getElementById("qrPreviewBox");
  if (!previewBox) return;

  const cards = previewBox.querySelectorAll('.qr-printable-card');

  if (cards.length === 0) {
    alert("Silakan pilih pengguna/kelas yang akan dicetak!");
    return;
  }

  let cardsHtml = '';
  cards.forEach(card => {
    cardsHtml += card.outerHTML;
  });

  const printWindow = window.open("", "", "width=900,height=700");
  printWindow.document.write(`
    <html>
      <head>
        <title>Cetak Kartu Absensi</title>
        <style>
          body { font-family: sans-serif; background: #fff; padding: 20px; margin: 0; }
          .print-grid { display: flex; flex-wrap: wrap; gap: 15px; justify-content: flex-start; }
          @media print {
            body { padding: 0; }
            .print-grid { gap: 10px; }
            .qr-printable-card { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <div class="print-grid">${cardsHtml}</div>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => { printWindow.print(); printWindow.close(); }, 600);
}

// 7. MEMUAT TABEL CRUD DATA QR
async function loadSavedQRTable() {
  const tbody = document.getElementById("tbodySavedQR");
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px; color: #9ca3af;">⏳ Memuat data tabel QR Code...</td></tr>';

  try {
    const result = await fetchAPI("getAllQRData");

    if (result && result.success && Array.isArray(result.data) && result.data.length > 0) {
      let html = '';
      result.data.forEach((row, index) => {
        let badgeBg = row.Role === 'Guru' ? '#f59e0b' : '#0284c7';
        let badgeColor = row.Role === 'Guru' ? '#000000' : '#ffffff';

        // Ambil RecordID dari Google Sheet (misal: QR-1791279407702)
        let recordId = row.RecordID || row.QRID || row.qrId || '';
        let userId = row.UserID || row.userId || '';
        let role = row.Role || 'Siswa';

        html += `
          <tr style="border-bottom: 1px solid #332d4a;">
            <td style="padding: 12px 16px;">${index + 1}</td>
            <td style="padding: 12px 16px;"><span style="background: #374151; color: #e5e7eb; padding: 3px 8px; border-radius: 4px; font-family: monospace; font-size: 0.8rem;">${recordId || '-'}</span></td>
            <td style="padding: 12px 16px; font-weight: bold; color: #ffffff;">${userId || '-'}</td>
            <td style="padding: 12px 16px;"><span style="background: ${badgeBg}; color: ${badgeColor}; padding: 3px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: bold;">${role}</span></td>
            <td style="padding: 12px 16px;"><span style="background: #10b981; color: #ffffff; padding: 3px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: bold;">${row.Status || 'Active'}</span></td>
            <td style="padding: 12px 16px; color: #9ca3af; font-size: 0.85rem;">${row.CreatedAt || row.UpdatedAt || '-'}</td>
            <td style="padding: 12px 16px; text-align: right;">
              <!-- Kirim recordId, userId, dan role ke fungsi hapus -->
              <button type="button" onclick="hapusQRFromTable('${recordId}', '${userId}', '${role}')" style="background: transparent; color: #ef4444; border: 1px solid #dc2626; padding: 4px 10px; border-radius: 6px; font-size: 0.8rem; cursor: pointer;">🗑️ Hapus</button>
            </td>
          </tr>
        `;
      });
      tbody.innerHTML = html;
    } else {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px; color: #9ca3af;">📭 Belum ada data QR Code yang tersimpan di database.</td></tr>';
    }
  } catch (error) {
    console.error("Error Load Saved QR Table:", error);
    tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px; color: #f87171;">❌ Error: ${error.message}</td></tr>`;
  }
}

// 8. HAPUS DATA QR
async function hapusQRFromTable(recordId, userId, role) {
  const targetId = recordId || userId;
  
  if (!targetId) {
    alert("❌ Error: RecordID tidak valid!");
    return;
  }

  if (!confirm(`Apakah Anda yakin ingin menghapus data QR (${targetId})?`)) return;

  try {
    // Kirim kunci recordId dan RecordID agar sesuai pencarian di Google Apps Script
    const result = await fetchAPI("deleteQRCode", { 
      recordId: recordId,
      RecordID: recordId,
      userId: userId, 
      role: role 
    });

    if (result && result.success) {
      alert("✅ Data QR berhasil dihapus dari " + (role === 'Guru' ? 'QR_Guru' : 'QR_Siswa') + "!");
      loadSavedQRTable();
    } else {
      alert("❌ Gagal menghapus: " + (result.message || "Kesalahan server."));
    }
  } catch (error) {
    alert("❌ Error: " + error.message);
  }
}