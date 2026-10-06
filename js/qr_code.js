/**
 * FILE: js/qr_code.js
 * Fitur: Single & Bulk QR Card Generator (Portrait/Landscape) + CRUD Table
 */

let qrUserListCache = [];
let currentQRMode = 'single'; // 'single' atau 'bulk'
let currentQRDataToSave = null;

document.addEventListener("DOMContentLoaded", function () {
  loadUserForQR();
  loadSavedQRTable();
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
        if (result.data.listSiswa) {
          let siswa = result.data.listSiswa.map(u => ({...u, Role: 'Siswa'}));
          usersArray = usersArray.concat(siswa);
          siswa.forEach(s => { if (s.Kelas) classSet.add(s.Kelas); });
        }
        if (result.data.listGuru) {
          let guru = result.data.listGuru.map(u => ({...u, Role: 'Guru'}));
          usersArray = usersArray.concat(guru);
        }
      } else if (Array.isArray(result.data)) {
        usersArray = result.data;
      }

      if (usersArray.length > 0) {
        qrUserListCache = usersArray;

        // Isi Dropdown Single User
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

        // Isi Dropdown Kelas untuk Bulk
        classSet.forEach(kelas => {
          let opt = document.createElement('option');
          opt.value = kelas;
          opt.text = `Kelas: ${kelas}`;
          classElement.appendChild(opt);
        });

        selectElement.onchange = () => renderQRPreview();
        if (classElement) classElement.onchange = () => renderQRPreview();

      } else {
        selectElement.innerHTML = '<option value="">❌ Data pengguna kosong</option>';
      }
    }
  } catch (error) {
    console.error("Error QR:", error);
  }
}

// 2. SWITCH MODE (SINGLE / BULK)
function switchQRMode(mode) {
  currentQRMode = mode;
  const btnSingle = document.getElementById("btnModeSingle");
  const btnBulk = document.getElementById("btnModeBulk");
  const containerSingle = document.getElementById("containerSingleUser");
  const containerBulk = document.getElementById("containerBulkClass");

  if (mode === 'single') {
    btnSingle.classList.add("active");
    btnBulk.classList.remove("active");
    containerSingle.style.display = "block";
    containerBulk.style.display = "none";
  } else {
    btnBulk.classList.add("active");
    btnSingle.classList.remove("active");
    containerSingle.style.display = "none";
    containerBulk.style.display = "block";
  }
  renderQRPreview();
}

// 3. RENDER TEMPLATE KARTU (PORTRAIT & LANDSCAPE)
function buildCardHtml(userId, nama, role, orientation) {
  const qrPayload = JSON.stringify({ id: userId, role: role, nama: nama });
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(qrPayload)}`;

  if (orientation === 'landscape') {
    return `
      <div class="qr-printable-card" style="background: #ffffff; color: #1f2937; padding: 16px; border-radius: 12px; width: 340px; height: 210px; border: 2px solid #6366f1; display: flex; align-items: center; justify-content: space-between; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); margin: 10px auto; font-family: sans-serif;">
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
    // Default: Portrait
    return `
      <div class="qr-printable-card" style="background: #ffffff; color: #1f2937; padding: 20px; border-radius: 12px; width: 230px; height: 340px; border: 2px solid #6366f1; text-align: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); margin: 10px auto; font-family: sans-serif; display: flex; flex-direction: column; justify-content: space-between;">
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

// 4. PREVIEW KARTU SINGLE & MASSAL
function renderQRPreview() {
  const previewBox = document.getElementById("qrPreviewBox");
  const orientation = document.getElementById("qrOrientationSelect").value;
  if (!previewBox) return;

  if (currentQRMode === 'single') {
    const selectedUserId = document.getElementById("qrUserSelect").value;
    if (!selectedUserId) {
      previewBox.innerHTML = '<p class="text-muted m-0">Pilih pengguna di atas untuk menampilkan kartu QR Code</p>';
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
    // Mode Bulk / Massal
    const selectedClass = document.getElementById("qrClassSelect").value;
    let filteredUsers = [];

    if (selectedClass === "ALL") {
      filteredUsers = qrUserListCache;
    } else if (selectedClass === "GURU") {
      filteredUsers = qrUserListCache.filter(u => u.Role === "Guru");
    } else if (selectedClass) {
      filteredUsers = qrUserListCache.filter(u => u.Kelas === selectedClass);
    }

    if (filteredUsers.length === 0) {
      previewBox.innerHTML = '<p class="text-muted m-0">Pilih kelas di atas untuk melihat preview massal.</p>';
      return;
    }

    let bulkHtml = `<p class="text-info fw-bold mb-3">Menampilkan ${filteredUsers.length} Kartu Siap Cetak:</p>`;
    bulkHtml += `<div style="display: flex; flex-wrap: wrap; gap: 15px; justify-content: center; max-height: 450px; overflow-y: auto; padding: 10px;">`;
    
    filteredUsers.forEach(u => {
      let uId = u.UserID || u.NIP || u.NIS || u.id;
      let uNama = u.Nama || u.nama;
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
    alert("ℹ️ Untuk opsi simpan massal otomatis, silakan cetak kartu. Sistem akan merekam saat penggunaan absensi.");
    return;
  }

  if (!currentQRDataToSave) {
    alert("⚠️ Silakan pilih pengguna terlebih dahulu!");
    return;
  }

  const btnSimpan = document.getElementById("btnSimpanQR");
  const teksAsli = btnSimpan.innerHTML;
  btnSimpan.innerHTML = "⏳ Menyimpan...";
  btnSimpan.disabled = true;

  try {
    const result = await fetchAPI("saveQRCode", currentQRDataToSave);
    if (result && result.success) {
      alert(`✅ Berhasil! QR Code untuk ID: ${currentQRDataToSave.userId} telah tersimpan.`);
      loadSavedQRTable(); // Refresh tabel setelah simpan
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

// 6. FUNGSI CETAK (PRINTING GRID A4)
function cetakKartuQR() {
  const previewBox = document.getElementById("qrPreviewBox");
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

// 7. MEMUAT TABEL DATA TERDAFTAR (CRUD)
async function loadSavedQRTable() {
  const tbody = document.getElementById("tbodySavedQR");
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-muted">⏳ Memuat data tabel QR Code...</td></tr>';

  try {
    const result = await fetchAPI("getAllQRData");

    if (result && result.success && Array.isArray(result.data) && result.data.length > 0) {
      let html = '';
      result.data.forEach((row, index) => {
        html += `
          <tr class="border-secondary">
            <td class="ps-3">${index + 1}</td>
            <td><span class="badge bg-secondary">${row.QRID || '-'}</span></td>
            <td class="fw-bold">${row.UserID || '-'}</td>
            <td><span class="badge ${row.Role === 'Guru' ? 'bg-warning text-dark' : 'bg-info'}">${row.Role || 'Siswa'}</span></td>
            <td><span class="badge bg-success">${row.Status || 'Active'}</span></td>
            <td class="small text-muted">${row.CreatedAt || '-'}</td>
            <td class="text-end pe-3">
              <button class="btn btn-sm btn-outline-danger" onclick="hapusQRFromTable('${row.UserID}', '${row.Role}')">🗑️ Hapus</button>
            </td>
          </tr>
        `;
      });
      tbody.innerHTML = html;
    } else {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center py-4 text-muted">📭 Belum ada data QR Code yang tersimpan di database.</td></tr>';
    }
  } catch (error) {
    console.error("Error Load Saved QR Table:", error);
    tbody.innerHTML = `<tr><td colspan="7" class="text-center py-4 text-danger">❌ Error: ${error.message}</td></tr>`;
  }
}

// 8. HAPUS DATA QR DARI TABEL
async function hapusQRFromTable(userId, role) {
  if (!confirm(`Apakah Anda yakin ingin menghapus data QR untuk ID: ${userId}?`)) return;

  try {
    const result = await fetchAPI("deleteQRCode", { userId: userId, role: role });
    if (result && result.success) {
      alert("✅ Data QR berhasil dihapus!");
      loadSavedQRTable();
    } else {
      alert("❌ Gagal menghapus: " + (result.message || "Kesalahan server."));
    }
  } catch (error) {
    alert("❌ Error: " + error.message);
  }
}

function showBarcodeSection() {
  document.querySelectorAll('.page-section').forEach(s => s.style.display = 'none');
  const section = document.getElementById('barcode');
  if (section) section.style.display = 'block';
  loadUserForQR();
  loadSavedQRTable();
}