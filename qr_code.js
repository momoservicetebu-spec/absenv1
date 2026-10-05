/**
 * FILE: qr_code.js
 * Disesuaikan khusus dengan HTML Dashboard Admin Anda:
 * - Select ID: qrUserSelect
 * - Preview Box ID: qrPreviewBox
 * - Function Onchange: generateQRCode()
 * - Function Onclick: cetakKartuQR()
 */

// GANTI DENGAN URL WEB APP GOOGLE APPS SCRIPT (DEPLOYMENT) ANDA
const API_URL = "https://script.google.com/macros/s/AKfycbx.../exec"; 

let userListCache = []; // Menyimpan memori data pengguna yang ditarik dari server

// Jalankan pemuatan data pengguna otomatis saat halaman selesai dimuat
document.addEventListener("DOMContentLoaded", function () {
  loadQRUsersDropdown();
});

/**
 * 1. Tarik Data Guru & Siswa dari Database untuk Dropdown (#qrUserSelect)
 */
async function loadQRUsersDropdown() {
  const selectElement = document.getElementById("qrUserSelect");
  if (!selectElement) return;

  selectElement.innerHTML = '<option value="">-- Memuat Data Pengguna... --</option>';

  try {
    const response = await fetch(`${API_URL}?action=getQRUsers`);
    const result = await response.json();

    // Terima array data dari backend
    const users = result.data.users || (Array.isArray(result.data) ? result.data : []);

    if (result.success && users.length > 0) {
      userListCache = users;

      let options = '<option value="">-- Pilih Pengguna --</option>';
      users.forEach((user) => {
        const userId = user.UserID || user.id || user.NIP || user.NIS;
        const nama = user.Nama || user.nama;
        const role = user.Role || user.role;
        options += `<option value="${userId}">[${role}] ${nama} (${userId})</option>`;
      });

      selectElement.innerHTML = options;
    } else {
      selectElement.innerHTML = '<option value="">-- Data Pengguna Kosong --</option>';
    }
  } catch (error) {
    console.error("Error loading QR users:", error);
    selectElement.innerHTML = '<option value="">-- Gagal Terhubung ke Server --</option>';
  }
}

/**
 * 2. Fungsi Dipanggil saat Dropdown Berubah (onchange="generateQRCode()")
 */
async function generateQRCode() {
  const selectElement = document.getElementById("qrUserSelect");
  const previewBox = document.getElementById("qrPreviewBox");
  
  if (!selectElement || !previewBox) return;

  const selectedUserId = selectElement.value;

  if (!selectedUserId) {
    previewBox.innerHTML = '<p style="color:#666; margin:0;">Pilih pengguna untuk membuat QR Code</p>';
    return;
  }

  // Cari detail pengguna dari cache
  const user = userListCache.find((u) => String(u.UserID || u.id) === String(selectedUserId));
  if (!user) return;

  const role = user.Role || user.role || "Siswa";
  const nama = user.Nama || user.nama || "Pengguna";

  // Payload data yang tersimpan di dalam QR Code
  const qrPayload = JSON.stringify({
    id: selectedUserId,
    role: role,
    nama: nama
  });

  // URL API Generator Gambar QR Code & Barcode
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrPayload)}`;
  const barcodeImageUrl = `https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(selectedUserId)}&scale=2&rotate=N&includetext`;

  // Tampilkan desain kartu di area preview (#qrPreviewBox)
  previewBox.innerHTML = `
    <div id="printableCard" style="background: #ffffff; color: #1f2937; padding: 20px; border-radius: 12px; width: 100%; max-width: 280px; margin: 0 auto; text-align: center; box-shadow: 0 4px 10px rgba(0,0,0,0.15); border: 2px solid #6366f1;">
      <div style="border-bottom: 2px solid #4f46e5; padding-bottom: 8px; margin-bottom: 12px;">
        <h4 style="margin: 0; font-size: 14px; color: #4338ca; font-weight: bold; letter-spacing: 0.5px;">KARTU ABSENSI DIGITAL</h4>
        <span style="font-size: 11px; font-weight: bold; color: #6b7280; text-transform: uppercase;">STATUS: ${role}</span>
      </div>
      
      <div style="margin: 12px 0;">
        <img src="${qrImageUrl}" alt="QR Code" style="width: 150px; height: 150px; border: 1px solid #e5e7eb; padding: 4px; border-radius: 8px; background: #fff;" />
      </div>

      <div style="margin-top: 8px;">
        <h3 style="margin: 4px 0; font-size: 15px; font-weight: bold; color: #111827;">${nama}</h3>
        <p style="margin: 2px 0; font-size: 12px; color: #4b5563; font-weight: 600;">ID: ${selectedUserId}</p>
      </div>

      <div style="margin-top: 12px; padding-top: 6px; border-top: 1px dashed #e5e7eb;">
        <img src="${barcodeImageUrl}" alt="Barcode" style="max-width: 100%; height: 35px;" />
      </div>
    </div>
  `;

  // Simpan data secara otomatis ke Sheet QR_Guru / QR_Siswa
  saveQRToDatabase(selectedUserId, role, qrPayload);
}

/**
 * 3. Simpan Data QR ke Database Google Spreadsheet (Auto-Save Backend)
 */
async function saveQRToDatabase(userId, role, qrPayload) {
  try {
    await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({
        action: "saveQRCode",
        userId: userId,
        role: role,
        qrPayload: qrPayload
      })
    });
    console.log(`[Database] QR Code (${userId}) berhasil disinkronkan ke sheet.`);
  } catch (err) {
    console.error("[Database Error] Gagal menyimpan QR Code:", err);
  }
}

/**
 * 4. Fungsi Dipanggil saat Tombol Cetak Diklik (onclick="cetakKartuQR()")
 */
function cetakKartuQR() {
  const cardContent = document.getElementById("printableCard");
  if (!cardContent) {
    alert("Silakan pilih pengguna terlebih dahulu sebelum mencetak kartu!");
    return;
  }

  const printWindow = window.open("", "", "width=800,height=600");
  printWindow.document.write(`
    <html>
      <head>
        <title>Cetak Kartu Identitas</title>
        <style>
          body {
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background-color: #f3f4f6;
          }
          @media print {
            body { background: none; }
            #printableCard { box-shadow: none !important; border: 1px solid #000 !important; }
          }
        </style>
      </head>
      <body>
        ${cardContent.outerHTML}
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