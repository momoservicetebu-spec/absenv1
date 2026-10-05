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
        if (result.data.listSiswa) usersArray = usersArray.concat(result.data.listSiswa);
        if (result.data.listGuru) usersArray = usersArray.concat(result.data.listGuru);
      }

      if (usersArray.length > 0) {
        qrUserListCache = usersArray;

        usersArray.forEach(user => {
          let userId = user.UserID || user.NIP || user.NIS || user.id;
          let userName = user.Nama || user.nama || "Tanpa Nama";
          let userRole = user.Role || (String(userId).toUpperCase().includes('GURU') ? 'Guru' : 'Siswa');

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
  const role = user ? (user.Role || (String(selectedUserId).toUpperCase().includes('GURU') ? 'Guru' : 'Siswa')) : 'Siswa';

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