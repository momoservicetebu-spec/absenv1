/**
 * FILE: qr_code.js
 * Menggunakan pola fetchAPI & Select2 yang sama persis dengan modul RFID
 */

let qrUserListCache = []; // Menyimpan data pengguna lokal untuk generator

document.addEventListener("DOMContentLoaded", function () {
  loadUserForQR();
});

// ==========================================
// 1. FUNGSI: Muat Data Pengguna ke Dropdown QR Code
// ==========================================
async function loadUserForQR() {
  const selectElement = document.getElementById('qrUserSelect');
  
  if (!selectElement) return;

  selectElement.innerHTML = '<option value="">⏳ Memuat data dari database...</option>';

  try {
    // Memanggil API khusus QR Users yang ada di router.gs
    const result = await fetchAPI("getQRUsers");
    
    if (result && result.success) {
      selectElement.innerHTML = '<option value="">-- Ketik atau Pilih Pengguna --</option>';
      
      let usersArray = [];

      // Mengekstrak data list Guru & Siswa (Pola pencarian fleksibel)
      if (Array.isArray(result.data)) {
        usersArray = result.data;
      } else if (typeof result.data === 'object' && result.data !== null) {
        if (result.data.users) usersArray = usersArray.concat(result.data.users);
        if (result.data.listSiswa) usersArray = usersArray.concat(result.data.listSiswa);
        if (result.data.siswa) usersArray = usersArray.concat(result.data.siswa);
        if (result.data.listGuru) usersArray = usersArray.concat(result.data.listGuru);
        if (result.data.guru) usersArray = usersArray.concat(result.data.guru);
      }

      if (usersArray.length > 0) {
        qrUserListCache = usersArray; // Simpan cache untuk generateQRCode()

        usersArray.forEach(user => {
          let userId = user.UserID || user.GuruID || user.SiswaID || user.NIP || user.NIS || user.id || "Tanpa ID";
          let userName = user.Nama || user.nama || user.NAMA || "Tanpa Nama";
          let userRole = user.Role || user.role || (user.NIP || user.GuruID ? 'Guru' : 'Siswa');
          
          if (userId !== "Tanpa ID" && userName !== "Tanpa Nama") {
            let option = document.createElement('option');
            option.value = userId; 
            option.text = `[${userRole}] ${userId} - ${userName}`; 
            option.setAttribute('data-role', userRole);
            option.setAttribute('data-nama', userName);
            selectElement.appendChild(option);
          }
        });

        // Aktifkan fitur pencarian (Search) bawaan Select2 jika terpasang
        if (typeof jQuery !== 'undefined' && typeof jQuery.fn.select2 !== 'undefined') {
          jQuery('#qrUserSelect').select2({
            placeholder: "-- Ketik atau Pilih Pengguna --",
            allowClear: true,
            width: '100%'
          });

          // Event pemicu generate QR saat opsi Select2 dipilih
          jQuery('#qrUserSelect').off('change.qr').on('change.qr', function () {
            generateQRCode();
          });
        }
      } else {
        selectElement.innerHTML = `<option value="">❌ Gagal: Data pengguna kosong</option>`;
      }
    } else {
      selectElement.innerHTML = `<option value="">❌ Gagal mengambil data</option>`;
    }
  } catch (error) {
    console.error("Error Load User QR:", error);
    selectElement.innerHTML = `<option value="">❌ Error Koneksi: ${error.message}</option>`;
  }
}

// ==========================================
// 2. FUNGSI: Generate QR Code saat Pengguna Dipilih
// ==========================================
async function generateQRCode() {
  const selectElement = document.getElementById("qrUserSelect");
  const previewBox = document.getElementById("qrPreviewBox");
  
  if (!selectElement || !previewBox) return;

  const selectedUserId = selectElement.value;

  if (!selectedUserId) {
    previewBox.innerHTML = '<p style="color:#666; margin:0;">Pilih pengguna untuk membuat QR Code</p>';
    return;
  }

  // Cari data dari cache atau atribut elemen option
  const selectedOption = selectElement.options[selectElement.selectedIndex];
  const user = qrUserListCache.find(u => 
    String(u.UserID || u.GuruID || u.SiswaID || u.NIP || u.NIS || u.id) === String(selectedUserId)
  );

  const nama = user ? (user.Nama || user.nama) : (selectedOption ? selectedOption.getAttribute('data-nama') : 'Pengguna');
  let role = user ? (user.Role || user.role) : (selectedOption ? selectedOption.getAttribute('data-role') : 'Siswa');

  if (!role) role = selectedUserId.toUpperCase().includes('GURU') ? 'Guru' : 'Siswa';

  // Format data di dalam QR Code
  const qrPayload = JSON.stringify({
    id: selectedUserId,
    role: role,
    nama: nama
  });

  // URL Gambar QR & Barcode
  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(qrPayload)}`;
  const barcodeImageUrl = `https://bwipjs-api.metafloor.com/?bcid=code128&text=${encodeURIComponent(selectedUserId)}&scale=2&rotate=N&includetext`;

  // Render Tampilan Kartu
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

  // Simpan ke spreadsheet via backend
  saveQRToDatabase(selectedUserId, role, qrPayload);
}

// ==========================================
// 3. FUNGSI: Simpan QR ke Database
// ==========================================
async function saveQRToDatabase(userId, role, qrPayload) {
  try {
    if (typeof fetchAPI === 'function') {
      await fetchAPI("saveQRCode", {
        userId: userId,
        role: role,
        qrPayload: qrPayload
      });
      console.log(`[Database] QR Code (${userId}) berhasil disimpan.`);
    }
  } catch (err) {
    console.error("[Database Error] Gagal menyimpan QR Code:", err);
  }
}

// ==========================================
// 4. FUNGSI: Cetak Kartu (Print)
// ==========================================
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