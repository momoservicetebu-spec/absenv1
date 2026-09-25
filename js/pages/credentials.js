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
// 1. LOGIKA FINGERPRINT
// ------------------------------------------
async function simpanFingerprint() {
  const userID = document.getElementById("fpUserSelect").value;
  const fpCode = document.getElementById("fpStatusInput").value.trim();

  if (!userID) return alert("Pilih Pengguna terlebih dahulu!");
  if (!fpCode) return alert("Masukkan ID Fingerprint hasil scan hardware!");

  const result = await fetchAPI("saveFingerprintMapping", { userID: userID, fingerprintID: fpCode });

  if (result && result.success) {
    alert("✅ Fingerprint berhasil terhubung dengan pengguna!");
    document.getElementById("fpStatusInput").value = "";
  } else {
    alert("❌ Gagal menyimpan: " + (result?.message || "Error server"));
  }
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

// ------------------------------------------
// 3. LOGIKA GENERATE & PRINT QR CODE
// ------------------------------------------
function generateQRCode() {
  const userID = document.getElementById("qrUserSelect").value;
  const previewBox = document.getElementById("qrPreviewBox");

  if (!userID) {
    previewBox.innerHTML = `<p style="color:#666; margin:0;">Pilih pengguna untuk membuat QR Code</p>`;
    return;
  }

  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(userID)}`;
  previewBox.innerHTML = `
    <div style="text-align:center;">
      <img src="${qrUrl}" alt="QR Code" style="border: 1px solid #ccc; padding: 5px; border-radius: 4px;">
      <p style="margin:5px 0 0 0; font-weight:bold; color:#333;">ID: ${userID}</p>
    </div>
  `;
}

function cetakKartuQR() {
  const userID = document.getElementById("qrUserSelect").value;
  if (!userID) return alert("Pilih Pengguna yang ingin dicetak kartunya!");

  const printWindow = window.open('', '', 'width=600,height=400');
  const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(userID)}`;

  printWindow.document.write(`
    <html>
      <head>
        <title>Cetak Kartu - ${userID}</title>
        <style>
          body { font-family: sans-serif; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
          .card { border: 2px solid #000; padding: 20px; border-radius: 12px; text-align: center; width: 250px; }
          img { margin-top: 10px; }
        </style>
      </head>
      <body>
        <div class="card">
          <h3 style="margin:0 0 10px 0;">KARTU AKSES ABSENSI</h3>
          <img src="${qrUrl}" />
          <h2 style="margin:10px 0 0 0;">${userID}</h2>
        </div>
        <script>
          window.onload = function() { window.print(); window.close(); }
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

// Auto-Load saat DOM Siap
document.addEventListener("DOMContentLoaded", () => {
  loadAllUserDropdowns();

  // Listener Enter pada input RFID Reader
  const rfidInput = document.getElementById("rfidCardInput");
  if (rfidInput) {
    rfidInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        simpanKartuRFID();
      }
    });
  }
});