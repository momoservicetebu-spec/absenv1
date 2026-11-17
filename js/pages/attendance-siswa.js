// ==========================================
// FILE: js/pages/attendance-siswa.js (ULTRA-FAST 1-STEP BARCODE/RFID SISWA)
// ==========================================
const standbyUI = document.getElementById('standby-ui');
const nfcInput = document.getElementById('nfcSimulator');
const statusText = document.getElementById('statusText');
const alertBox = document.getElementById('alertBox');
const selectPos = document.getElementById('pilihPosGerbang');

let dataSiswa = [];
let mapSiswaLokal = {}; // Lookup instan O(1) berdasarkan UserID, NIS, atau RFID
let isProcessing = false;
let modeAbsensiSaatIni = "qr";

// ==========================================
// PENGATURAN OTOMATIS POS / GERBANG PERANGKAT
// ==========================================
const urlParams = new URLSearchParams(window.location.search);
let posAktif = urlParams.get('pos') || localStorage.getItem('pos_gerbang_siswa') || "GERBANG-1";
posAktif = posAktif.toUpperCase();
localStorage.setItem('pos_gerbang_siswa', posAktif);

let DEVICE_ID_SISWA = `TERMINAL-${posAktif}`;

if (selectPos) {
  selectPos.value = posAktif;
  selectPos.addEventListener('change', function () {
    posAktif = this.value.toUpperCase();
    localStorage.setItem('pos_gerbang_siswa', posAktif);
    DEVICE_ID_SISWA = `TERMINAL-${posAktif}`;
    if (nfcInput && !nfcInput.disabled) nfcInput.focus();
  });
}

// 1. Inisialisasi Master Siswa & Pengaturan (Tanpa AI Wajah & Kamera)
Promise.all([
  loadMasterSiswa(),
  terapkanPengaturanTerminalSiswa()
]).catch(err => {
  if (statusText) statusText.innerText = "Gagal memuat konfigurasi terminal siswa";
  console.error(err);
});

async function loadMasterSiswa() {
  try {
    const resSiswa = await fetchAPI("getSiswa");
    if (resSiswa && resSiswa.success && Array.isArray(resSiswa.data)) {
      dataSiswa = resSiswa.data;
      mapSiswaLokal = {};

      dataSiswa.forEach(s => {
        const id = String(s.SiswaID || s.UserID || s.ID || s.id || "").replace(/'/g, "").trim();
        const nis = String(s.NIS || s.nis || s.NISN || s.nisn || "").replace(/'/g, "").trim();
        const rfid = String(s.UID_Kartu || s.RFID || s.rfid || "").replace(/'/g, "").trim();
        const nama = String(s.Nama || s.Nama_Lengkap || s.NamaLengkap || id).trim();
        const kelas = String(s.Kelas || s.kelas || "").trim();

        const info = { id: id || nis, nama: nama, kelas: kelas };
        if (id) mapSiswaLokal[id.toUpperCase()] = info;
        if (nis) mapSiswaLokal[nis.toUpperCase()] = info;
        if (rfid) mapSiswaLokal[rfid.toUpperCase()] = info;
      });

      console.log(`[Master Siswa Loaded] Total: ${dataSiswa.length} akun | Pos: ${DEVICE_ID_SISWA}`);
    }
  } catch (e) {
    console.warn("Gagal memuat master data siswa:", e);
  }
}

async function terapkanPengaturanTerminalSiswa() {
  if (statusText) statusText.innerText = "Mengambil konfigurasi terminal siswa...";
  const result = await fetchAPI("getSettings");

  if (result && result.success) {
    const config = result.data || {};
    modeAbsensiSaatIni = config.MFA_STUDENT || config.keamanan?.mfaSiswa || "qr";

    const antiFakeVal = config.ANTI_FAKE_GPS !== undefined ? config.ANTI_FAKE_GPS : config.keamanan?.antiFakeGps;
    const isAntiFakeGpsActive = String(antiFakeVal).toUpperCase() === "TRUE" || antiFakeVal === true;

    const boxGps = document.getElementById("btnGps");
    const statusGps = document.getElementById("gpsStatusText");
    if (boxGps) boxGps.style.display = isAntiFakeGpsActive ? "inline-block" : "none";
    if (statusGps) statusGps.style.display = isAntiFakeGpsActive ? "block" : "none";
  }
  bukaKunciInputSiswa();
}

function bukaKunciInputSiswa() {
  if (standbyUI) standbyUI.style.display = 'block';
  if (nfcInput) {
    nfcInput.disabled = false;
    nfcInput.focus();
  }

  const modeLower = String(modeAbsensiSaatIni).toLowerCase();
  let labelPesan = `[SISWA] Silakan Scan Barcode / QR Code`;
  if (modeLower === "rfid") labelPesan = `[SISWA] Silakan Tap Kartu (RFID/NFC)`;
  else if (modeLower === "finger") labelPesan = `[SISWA] Silakan Scan Sidik Jari`;

  if (statusText) {
    statusText.innerText = labelPesan;
    statusText.style.color = "#2ecc71";
  }
}

// ==========================================
// 2. LISTENER SCANNER INSTAN (1x TEMBAK SERVER)
// ==========================================
if (nfcInput) {
  // Pastikan kursor selalu fokus di kolom scanner jika terklik di luar (kecuali tombol/dropdown)
  document.addEventListener('click', (e) => {
    const tag = e.target.tagName;
    if (tag !== 'BUTTON' && tag !== 'A' && tag !== 'SELECT' && tag !== 'OPTION' && !nfcInput.disabled) {
      nfcInput.focus();
    }
  });

  nfcInput.addEventListener('keypress', async function (e) {
    if (e.key === 'Enter') {
      const rawInput = this.value.trim();
      this.value = '';
      if (rawInput === '' || isProcessing) return;

      isProcessing = true;
      let targetUserId = rawInput;

      // Bongkar jika QR Code berformat JSON {"id":"SISWA-001", ...}
      if (rawInput.startsWith("{") && rawInput.endsWith("}")) {
        try {
          const parsedQR = JSON.parse(rawInput);
          if (parsedQR.id) targetUserId = String(parsedQR.id).replace(/'/g, "").trim();
        } catch (err) {}
      }

      targetUserId = String(targetUserId).replace(/'/g, "").trim();
      const lookupKey = targetUserId.toUpperCase();

      // Cek langsung di memori lokal browser (0.001 detik tanpa tanya server)
      let siswaDitemukan = mapSiswaLokal[lookupKey];

      // Jika belum ketemu di cache lokal (misal siswa baru ditambahkan), verifikasi ke server
      if (!siswaDitemukan) {
        if (statusText) {
          statusText.innerText = `Memverifikasi ID (${targetUserId})...`;
          statusText.style.color = "orange";
        }
        const resVerif = await fetchAPI("verifikasiRFID", { rfid: targetUserId, role: "SISWA" });
        if (resVerif && resVerif.success) {
          siswaDitemukan = {
            id: String(resVerif.data.userId || resVerif.data.id || targetUserId).replace(/'/g, "").trim(),
            nama: resVerif.data.nama || resVerif.data.Nama || targetUserId,
            kelas: resVerif.data.kelas || ""
          };
          mapSiswaLokal[lookupKey] = siswaDitemukan;
        }
      }

      if (siswaDitemukan) {
        executeAttendanceSiswa(siswaDitemukan.id, siswaDitemukan.nama, siswaDitemukan.kelas);
      } else {
        isProcessing = false;
        putarSuaraKonfirmasi("Kartu atau barcode tidak terdaftar.");
        showAlert(`❌ ID (${targetUserId}) tidak terdaftar.`, "#e74c3c");
        setTimeout(resetToStandbySiswa, 1500);
      }
    }
  });
}

// ==========================================
// 3. EKSEKUSI ABSENSI SISWA (CEPAT + ANTREAN WA)
// ==========================================
async function executeAttendanceSiswa(userID, userName, kelasSiswa) {
  let displayName = userName || userID;

  showAlert(`⏳ Mencatat Absensi: ${displayName}...`, "#f1c40f");
  if (statusText) {
    statusText.innerText = `Memproses (${displayName})...`;
    statusText.style.color = "#f1c40f";
  }

  const JAM_MASUK_CONFIG = (typeof CONFIG !== 'undefined' && CONFIG.jamMasuk) ? CONFIG.jamMasuk : (localStorage.getItem('jam_masuk') || "07:15");
  const modeLower = String(modeAbsensiSaatIni).toLowerCase();
  const priMethod = modeLower.includes("rfid") ? "RFID" : "QR_CODE";

  const payload = {
    userId: String(userID).trim(),
    nama: displayName,
    role: "Siswa",
    subGroup: kelasSiswa || "",
    checkType: "AUTO",
    primaryMethod: priMethod,
    secondaryMethod: "NONE",
    authLevel: "1FA",
    jamMasukConfig: JAM_MASUK_CONFIG,
    deviceId: DEVICE_ID_SISWA,
    keterangan: `Absen Sukses (${priMethod})`,
    fotoBase64: ""
  };

  try {
    const result = await fetchAPI("submitAutoAttendance", payload);
    const record = result && result.data ? result.data : {};
    const backendMessage = result ? result.message || "" : "";

    if (record.Nama || record.nama) displayName = record.Nama || record.nama;

    if (result && result.success) {
      // Kirim WA orang tua di latar belakang
      if (result.queuePayload) {
        fetchAPI("processAttendanceQueue", result.queuePayload).catch(() => {});
      }

      const statusAbsen = String(record["Status(Hadir/Telat/Izin/dll)"] || record.Status || record.status || backendMessage || "").toUpperCase().trim();
      let warnaBg = "#2ecc71", ikon = "✅", teksJudul = "ABSEN MASUK SUKSES", teksStatus = "Masuk Tepat Waktu";
      let teksSuara = record.pesanSuara || `Terima kasih ${displayName}. Absen masuk berhasil. Selamat belajar.`;

      if (statusAbsen.includes("PULANG NORMAL") || statusAbsen.includes("PULANG")) {
        warnaBg = "#3498db"; ikon = "🔵"; teksJudul = "ABSEN PULANG SUKSES"; teksStatus = "Sudah Absen Pulang";
        teksSuara = record.pesanSuara || `Terima kasih ${displayName}. Absen pulang berhasil. Hati-hati di jalan.`;
      } else if (statusAbsen.includes("PULANG AWAL")) {
        warnaBg = "#f39c12"; ikon = "🟡"; teksJudul = "ABSEN PULANG AWAL"; teksStatus = "Pulang Awal";
        teksSuara = record.pesanSuara || `Terima kasih ${displayName}. Absen pulang awal berhasil dicatat.`;
      } else if (statusAbsen.includes("TELAT") || statusAbsen.includes("TERLAMBAT")) {
        warnaBg = "#e67e22"; ikon = "⚠️"; teksJudul = "ABSEN MASUK (TERLAMBAT)"; teksStatus = "Masuk Terlambat";
      }

      putarSuaraKonfirmasi(teksSuara);
      showAlert(`${ikon} ${teksJudul}: ${displayName}`, warnaBg);
      if (statusText) {
        statusText.innerText = `${ikon} ${teksStatus} (${displayName})`;
        statusText.style.color = warnaBg;
      }
    } else {
      const cleanMsg = (backendMessage || "Absensi Ditolak").replace("[Sistem]", "").trim();
      putarSuaraKonfirmasi((record && record.pesanSuara) ? record.pesanSuara : cleanMsg);
      showAlert(`⚠️ ${cleanMsg}`, "#e67e22");
      if (statusText) {
        statusText.innerText = `⚠️ ${cleanMsg}`;
        statusText.style.color = "#e67e22";
      }
    }
  } catch (error) {
    console.error("Error Absen Siswa:", error);
    putarSuaraKonfirmasi("Terjadi kesalahan jaringan.");
    showAlert(`❌ Error Jaringan, silakan scan ulang`, "#e74c3c");
  }

  // Jeda 1.2 detik agar antrean siswa berikutnya di gerbang bisa langsung scan
  setTimeout(resetToStandbySiswa, 1200);
}

function resetToStandbySiswa() {
  isProcessing = false;
  hideAlert();
  bukaKunciInputSiswa();
}

function showAlert(text, color) {
  if (!alertBox) return;
  alertBox.style.display = "block";
  alertBox.style.backgroundColor = color;
  alertBox.innerText = text;
}

function hideAlert() { if (alertBox) alertBox.style.display = "none"; }

function putarSuaraKonfirmasi(teks) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(String(teks || ''));
  utterance.lang = 'id-ID';
  utterance.rate = 1.05;
  const voices = window.speechSynthesis.getVoices();
  const idVoice = voices.find(v => (v.lang.includes('id') || v.lang.includes('IND')) && (v.name.includes('Google') || v.name.includes('Natural')))
               || voices.find(v => v.lang.includes('id') || v.lang.includes('IND'));
  if (idVoice) utterance.voice = idVoice;
  window.speechSynthesis.speak(utterance);
}