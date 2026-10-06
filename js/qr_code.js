/**
 * FILE: js/qr_code.js
 */

let qrUserListCache = [];

// Panggil fungsi saat dokumen selesai dimuat
document.addEventListener("DOMContentLoaded", function () {
  loadUserForQR();
});

async function loadUserForQR() {
  const selectElement = document.getElementById('qrUserSelect');
  if (!selectElement) return;

  selectElement.innerHTML = '<option value="">⏳ Memuat data pengguna...</option>';

  try {
    const result = await fetchAPI("getQRUsers");

    if (result && result.success) {
      selectElement.innerHTML = '<option value="">-- Pilih Pengguna --</option>';

      let usersArray = [];
      if (Array.isArray(result.data)) {
        usersArray = result.data;
      } else if (typeof result.data === 'object' && result.data !== null) {
        // PERBAIKAN DISINI: Langsung berikan label Role secara otomatis
        if (result.data.listSiswa) {
          let siswa = result.data.listSiswa.map(u => ({...u, Role: 'Siswa'}));
          usersArray = usersArray.concat(siswa);
        }
        if (result.data.listGuru) {
          let guru = result.data.listGuru.map(u => ({...u, Role: 'Guru'}));
          usersArray = usersArray.concat(guru);
        }
      }

      if (usersArray.length > 0) {
        qrUserListCache = usersArray;

        usersArray.forEach(user => {
          let userId = user.UserID || user.NIP || user.NIS || user.id;
          let userName = user.Nama || user.nama || "Tanpa Nama";
          // Cek Role dari map di atas, jika tidak ada, asumsikan Guru jika ID > 10 digit
          let userRole = user.Role || (String(userId).length > 10 ? 'Guru' : 'Siswa');

          if (userId) {
            let option = document.createElement('option');
            option.value = userId;
            option.text = `[${userRole}] ${userId} - ${userName}`;
            selectElement.appendChild(option);
          }
        });

        // Event listener saat pengguna dipilih
        selectElement.onchange = function () {
          generateQRCode();
        };
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

function generateQRCode() {
  const selectElement = document.getElementById("qrUserSelect");
  const previewBox = document.getElementById("qrPreviewBox");
  if (!selectElement || !previewBox) return;

  const selectedUserId = selectElement.value;
  if (!selectedUserId) {
    previewBox.innerHTML = '<p style="color:#9ca3af; margin:0;">Pilih pengguna di atas untuk menampilkan kartu QR Code</p>';
    return;
  }

  const user = qrUserListCache.find(u => String(u.UserID || u.NIP || u.NIS || u.id) === String(selectedUserId));
  const nama = user ? (user.Nama || user.nama) : "Pengguna";
  
  // Pastikan ambil role dari user object yang sudah disematkan 'Guru'/'Siswa' di atas
  const role = user ? (user.Role || (String(selectedUserId).length > 10 ? 'Guru' : 'Siswa')) : 'Siswa';

  const qrPayload = JSON.stringify({ id: selectedUserId, role: role, nama: nama });
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(qrPayload)}`;

  previewBox.innerHTML = `
    <div id="printableCard" style="background: #ffffff; color: #1f2937; padding: 20px; border-radius: 12px; width: 260px; margin: 15px auto; text-align: center; border: 2px solid #6366f1;">
      <h5 style="margin:0; font-size: 13px; color: #4f46e5; font-weight: bold;">KARTU ABSENSI DIGITAL</h5>
      <small style="color: #6b7280; font-weight: bold;">${role.toUpperCase()}</small>
      <div style="margin: 12px 0;">
        <img src="${qrImageUrl}" alt="QR Code" style="width: 140px; height: 140px; border: 1px solid #e5e7eb; padding: 4px; border-radius: 6px;" />
      </div>
      <h6 style="margin: 4px 0; font-size: 14px; font-weight: bold; color: #111827;">${nama}</h6>
      <p style="margin: 0; font-size: 12px; color: #4b5563;">ID: ${selectedUserId}</p>
    </div>
  `;
}

function cetakKartuQR() {
  const cardContent = document.getElementById("printableCard");
  if (!cardContent) {
    alert("Silakan pilih pengguna terlebih dahulu!");
    return;
  }
  const printWindow = window.open("", "", "width=600,height=600");
  printWindow.document.write(`<html><head><title>Cetak Kartu</title></head><body style="display:flex;justify-content:center;align-items:center;height:100vh;">${cardContent.outerHTML}</body></html>`);
  printWindow.document.close();
  printWindow.focus();
  setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
}

// Fungsi navigasi di qr_code.js
function showBarcodeSection() {
  document.querySelectorAll('.page-section').forEach(section => {
    section.style.display = 'none';
  });

  const barcodeSection = document.getElementById('barcode');
  if (barcodeSection) {
    barcodeSection.style.display = 'block';
  }

  loadUserForQR();
}

// Tambahkan variabel global ini di paling atas file (di bawah let qrUserListCache = [];)
let currentQRDataToSave = null;

// --- REVISI fungsi generateQRCode() ---
// Di dalam fungsi generateQRCode(), tepat SETELAH baris:
// const qrPayload = JSON.stringify({ id: selectedUserId, role: role, nama: nama });
// TAMBAHKAN KODE INI:
currentQRDataToSave = {
  action: "simpanQR", // Penanda untuk Google Apps Script
  UserID: selectedUserId,
  Role: role,
  QRPayload: qrPayload,
  Status: "Aktif"
};

// --- TAMBAHKAN FUNGSI BARU INI DI BAGIAN BAWAH qr_code.js ---
async function simpanKeDatabaseQR() {
  if (!currentQRDataToSave) {
    alert("⚠️ Silakan pilih pengguna dan biarkan QR Code muncul terlebih dahulu!");
    return;
  }

  const btnSimpan = document.getElementById("btnSimpanQR");
  const teksAsli = btnSimpan.innerHTML;
  btnSimpan.innerHTML = "⏳ Menyimpan...";
  btnSimpan.disabled = true;

  try {
    // Memanggil fungsi fetchAPI Anda (pastikan fetchAPI mendukung metode POST)
    const result = await fetchAPI("simpanQR", currentQRDataToSave);

    if (result && result.success) {
      alert(`✅ Berhasil! Data QR untuk ${currentQRDataToSave.Role} telah disimpan ke database.`);
    } else {
      alert("❌ Gagal menyimpan data: " + (result.message || "Kesalahan tidak diketahui"));
    }
  } catch (error) {
    console.error("Error Simpan QR:", error);
    alert("❌ Terjadi kesalahan jaringan/sistem: " + error.message);
  } finally {
    btnSimpan.innerHTML = teksAsli;
    btnSimpan.disabled = false;
  }
}