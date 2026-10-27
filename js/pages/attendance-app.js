// ==========================================
// FILE: js/pages/attendance-app.js
// ==========================================
const video = document.getElementById('video');
const videoContainer = document.getElementById('video-container');
const standbyUI = document.getElementById('standby-ui');
const nfcInput = document.getElementById('nfcSimulator');
const statusText = document.getElementById('statusText');
const alertBox = document.getElementById('alertBox');

let databaseWajah = []; 
let currentMFAUser = null; 
let verificationInterval = null;
let isProcessing = false;
let modeAbsensiSaatIni = "rfid"; // Default fallback

// 1. Inisialisasi AI & Pengaturan Terminal
Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri(CONFIG.MODEL_URL),
  faceapi.nets.faceLandmark68Net.loadFromUri(CONFIG.MODEL_URL),
  faceapi.nets.faceRecognitionNet.loadFromUri(CONFIG.MODEL_URL),
  loadFaceDatabase(),
  terapkanPengaturanTerminal()
]).then(() => {
  startVideo();
}).catch(err => {
  statusText.innerText = "Gagal memuat AI / Konfigurasi";
  console.error(err);
});

function startVideo() {
  navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => { video.srcObject = stream; })
    .catch(err => console.error(err));
}

// 2. Ambil Pengaturan Langsung dari Database Sheet (Key-Value)
async function terapkanPengaturanTerminal() {
    statusText.innerText = "Mengambil konfigurasi terminal...";
    const result = await fetchAPI("getSettings"); 

    if (result && result.success) {
        const config = result.data || {};
        const activeRole = (typeof TERMINAL_ROLE !== 'undefined') ? TERMINAL_ROLE : "SISWA";
        
        // Baca nilai MFA_STUDENT / MFA_TEACHER dari Sheet
        if (activeRole === "SISWA") {
            modeAbsensiSaatIni = config.MFA_STUDENT || config.keamanan?.mfaSiswa || "rfid";
        } else if (activeRole === "GURU") {
            modeAbsensiSaatIni = config.MFA_TEACHER || config.keamanan?.mfaGuru || "rfid";
        }

        // Baca ANTI_FAKE_GPS dari Sheet
        const antiFakeVal = config.ANTI_FAKE_GPS !== undefined ? config.ANTI_FAKE_GPS : config.keamanan?.antiFakeGps;
        const isAntiFakeGpsActive = String(antiFakeVal).toUpperCase() === "TRUE" || antiFakeVal === true;
        
        const boxGps = document.getElementById("btnGps");
        const statusGps = document.getElementById("gpsStatusText");

        if (isAntiFakeGpsActive) {
            if(boxGps) boxGps.style.display = "inline-block";
            if(statusGps) statusGps.style.display = "block";
        } else {
            if(boxGps) boxGps.style.display = "none";
            if(statusGps) statusGps.style.display = "none";
            bukaKunciMetodeInput(); 
        }

        statusText.innerText = `Sistem Siap (${activeRole})`;
        statusText.style.color = "#2ecc71";
    } else {
        console.warn("Gagal memuat API settings, menggunakan mode fallback.");
        bukaKunciMetodeInput();
    }
}

function bukaKunciMetodeInput() {
    const modeLower = String(modeAbsensiSaatIni).toLowerCase();
    
    // Jika pengaturannya murni hanya wajah tanpa NFC
    if (modeLower === "face" || modeLower.includes("hanya scan wajah")) {
        if(standbyUI) standbyUI.style.display = 'none';
        if(videoContainer) videoContainer.style.display = 'flex';
    } else {
        if (nfcInput) {
            nfcInput.disabled = false;
            nfcInput.focus();
        }
    }
}

// Mengunduh data referensi wajah sesuai Role (Face_Guru atau Face_Siswa)
async function loadFaceDatabase() {
  const activeRole = (typeof TERMINAL_ROLE !== 'undefined') ? TERMINAL_ROLE : "SISWA";
  console.log(`Mengunduh database wajah untuk role: ${activeRole}...`);
  
  const result = await fetchAPI("getFaceReferences", { role: activeRole });
  
  databaseWajah = []; 
  if (result && result.success && Array.isArray(result.data)) {
    result.data.forEach(item => {
      const rawUserID = item.UserID || item.user_id || item.NIP || item.NIS;
      const rawEmbed = item['EmbeddingData (JSON)'] || item.EmbeddingData || item.descriptor;

      const keys = Object.keys(item);
      const userKey = rawUserID ? null : keys.find(k => {
        const lower = k.toLowerCase();
        return (lower.includes('user') || lower.includes('nip') || lower.includes('nis')) && !lower.includes('face');
      });
      const embedKey = rawEmbed ? null : keys.find(k => k.toLowerCase().includes('embed') || k.toLowerCase().includes('vektor'));

      const finalUserID = String(rawUserID || (userKey ? item[userKey] : "")).trim();
      const finalEmbed = rawEmbed || (embedKey ? item[embedKey] : null);

      if (finalUserID && finalEmbed && finalEmbed !== "undefined") {
        try {
          const parsed = typeof finalEmbed === 'string' ? JSON.parse(finalEmbed) : finalEmbed;
          const descriptor = new Float32Array(parsed);
          databaseWajah.push({ id: finalUserID, descriptor: descriptor });
        } catch(e) {
          console.error("Gagal memproses data vektor wajah ID:", finalUserID, e);
        }
      }
    });
    console.log(`Database Wajah Loaded (${activeRole}):`, databaseWajah);
  }
}
// ==========================================
// 3. LISTENER INPUT KARTU NFC / SCAN BARCODE
// ==========================================
if (nfcInput) {
  nfcInput.addEventListener('keypress', async function (e) {
    if (e.key === 'Enter') {
      const rfidNumber = this.value.trim();
      this.value = ''; 
    
      if (rfidNumber !== '') {
        if (isProcessing) return;
        isProcessing = true;
        
        const activeRole = (typeof TERMINAL_ROLE !== 'undefined') ? TERMINAL_ROLE : "SISWA";
        statusText.innerText = "Memverifikasi ID...";
        statusText.style.color = "orange";

        const result = await fetchAPI("verifikasiRFID", { rfid: rfidNumber, role: activeRole });
        
        if (result && result.success) {
           const userID = result.data.userId || result.data.id; 
           const userName = result.data.nama || result.data.Nama || userID; 
           
           // ==========================================
           // CEK STATUS GURU BERCADAR 
           // ==========================================
           // 1. Cek dari data respons API (Tipe Boolean dari Backend yang baru)
           let isBercadar = false;
           if (result.data.bercadar === true || result.data.Bercadar === true) {
               isBercadar = true;
           } else if (String(result.data.bercadar || result.data.Bercadar).toUpperCase().trim() === "YA") {
               isBercadar = true;
           }
           
           // 2. Jika tidak terbaca di API, cocokkan dari databaseWajah lokal
           if (!isBercadar && typeof databaseWajah !== 'undefined') {
               const targetUser = databaseWajah.find(u => String(u.id).trim() === String(userID).trim());
               if (targetUser) {
                   const lokalBercadar = targetUser.Bercadar || targetUser.bercadar || "";
                   if (lokalBercadar === true || String(lokalBercadar).toUpperCase().trim() === "YA") {
                       isBercadar = true;
                   }
               }
           }
           // ==========================================

           const modeLower = String(modeAbsensiSaatIni).toLowerCase();
           const requiresFace = modeLower.includes("wajah") || modeLower.includes("face") || modeLower === "rfid_face" || modeLower === "mfa";

           if (isBercadar) {
               // JIKA BERCADAR: Langsung absen, abaikan kamera
               statusText.innerText = `Mode Khusus Aktif: Memproses absen untuk ${userName}...`;
               isProcessing = false;
               
               // Panggil fungsi absen langsung
               executeAttendance(userID, userName); 
               
           } else if (requiresFace) {
               // JIKA TIDAK BERCADAR: Lanjut verifikasi wajah
               statusText.innerText = `ID Dikenali (${userName})! Memulai verifikasi wajah...`;
               isProcessing = false; 
               startVerificationState(userID, userName); 
               
           } else {
               // JIKA MODE ABSENSI SAAT INI HANYA RFID (Tanpa Wajah)
               executeAttendance(userID, userName);
           }
           
        } else {
           putarSuaraKonfirmasi("Kartu atau ID tidak terdaftar.");
           showAlert(`❌ ID (${rfidNumber}) tidak terdaftar untuk ${activeRole}.`, "#e74c3c");
           setTimeout(resetToStandby, 3000);
        }
      }
    }
  });
}

// ==========================================
// 4. VERIFIKASI WAJAH AI (DENGAN NAMA MASTER)
// ==========================================
function startVerificationState(userID, userName) {
  if (isProcessing) return;
  isProcessing = true;

  // 1. PENCARIAN NAMA & STATUS BERCADAR DARI MASTER DATA 
  let displayName = userID;
  const masterGuru = typeof dataGuru !== 'undefined' ? dataGuru : (typeof listGuru !== 'undefined' ? listGuru : []);
  const masterSiswa = typeof dataSiswa !== 'undefined' ? dataSiswa : (typeof listSiswa !== 'undefined' ? listSiswa : []);
  const allUsers = [...masterGuru, ...masterSiswa];

  const foundMaster = allUsers.find(
    u => String(u.UserID || u.NIP || u.NIS || u.ID).trim().toUpperCase() === String(userID).trim().toUpperCase()
  );

  if (foundMaster) {
    displayName = foundMaster.Nama || foundMaster.Nama_Lengkap || foundMaster.NamaLengkap || displayName;
    
    // 🌟 BYPASS WAJAH KHUSUS GURU BERCADAR
    let statusBercadar = foundMaster.Bercadar || foundMaster.bercadar || "";
    if (statusBercadar === true || String(statusBercadar).toUpperCase().trim() === "YA") {
      if (standbyUI) standbyUI.style.display = 'none';
      statusText.innerText = `Bypass Terverifikasi (${displayName})`;
      statusText.style.color = "#2ecc71";
      
      // Langsung eksekusi absensi tanpa kamera
      executeAttendance(userID, displayName);
      return; // Hentikan fungsi di sini
    }
  } else if (userName && userName !== userID) {
    displayName = userName;
  }

  // 2. CEK DATA WAJAH (Hanya untuk yang tidak bercadar)
  const targetUser = (typeof databaseWajah !== 'undefined' ? databaseWajah : []).find(
    u => String(u.id || u.UserID).trim().toUpperCase() === String(userID).trim().toUpperCase()
  );
  
  if (!targetUser) {
    putarSuaraKonfirmasi(`Data wajah belum didaftarkan.`);
    showAlert(`Data wajah untuk ${userID} belum didaftarkan.`, "#e74c3c");
    setTimeout(resetToStandby, 3000);
    return;
  }

  // 3. PROSES PEMINDAIAN WAJAH KAMERA
  currentMFAUser = targetUser;
  if (standbyUI) standbyUI.style.display = 'none';
  if (videoContainer) videoContainer.style.display = 'flex';
  
  statusText.innerText = `Pindai Wajah: ${displayName}...`;
  statusText.style.color = "#3498db";

  let canvas = document.querySelector('canvas');
  if (!canvas) {
    canvas = faceapi.createCanvasFromMedia(video);
    videoContainer.append(canvas);
  }
  const displaySize = { width: video.width || 640, height: video.height || 480 };
  faceapi.matchDimensions(canvas, displaySize);

  verificationInterval = setInterval(async () => {
    const detections = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
                                    .withFaceLandmarks()
                                    .withFaceDescriptor();
    
    const context = canvas.getContext('2d');
    context.clearRect(0, 0, canvas.width, canvas.height);

    if (detections) {
      const resized = faceapi.resizeResults(detections, displaySize);
      const distance = faceapi.euclideanDistance(detections.descriptor, currentMFAUser.descriptor);
      const isMatch = distance < 0.6; 

      const drawOptions = {
        label: isMatch ? `✅ ${displayName}` : `Memindai... (${distance.toFixed(2)})`,
        lineWidth: 3,
        boxColor: isMatch ? '#2ecc71' : '#e67e22'
      };
      const drawBox = new faceapi.draw.DrawBox(resized.detection.box, drawOptions);
      drawBox.draw(canvas);

      if (isMatch) {
        clearInterval(verificationInterval);
        verificationInterval = null;
        
        statusText.innerText = `Wajah Cocok! (${displayName})`;
        statusText.style.color = "#2ecc71";
        
        executeAttendance(userID, displayName);
      } else {
        statusText.innerText = `Membandingkan Wajah... (${distance.toFixed(2)})`;
      }
    }
  }, 200);

  setTimeout(() => {
    if (isProcessing && verificationInterval) {
      clearInterval(verificationInterval);
      verificationInterval = null;
      putarSuaraKonfirmasi("Verifikasi wajah gagal.");
      showAlert(`Wajah tidak cocok untuk ${displayName}.`, "#e74c3c");
      setTimeout(resetToStandby, 3000);
    }
  }, 12000);
}

// ==========================================
// FUNGSI UTILITY: CAPTURE FOTO DARI KAMERA
// ==========================================
function captureKameraBase64() {
  try {
    const videoElem = document.getElementById("video");
    if (!videoElem) return "";
    
    const canvas = document.createElement("canvas");
    canvas.width = videoElem.videoWidth || 640;
    canvas.height = videoElem.videoHeight || 480;
    
    const ctx = canvas.getContext("2d");
    ctx.drawImage(videoElem, 0, 0, canvas.width, canvas.height);
    
    // Kompres gambar ke JPEG (kualitas 0.6 agar ukuran data ringan)
    return canvas.toDataURL("image/jpeg", 0.6); 
  } catch (err) {
    console.error("Gagal capture foto:", err);
    return "";
  }
}

// ==========================================
// 5. EKSEKUSI PENGIRIMAN ABSENSI KE SERVER & VOICE (FIXED STATUS & VOICE)
// ==========================================
let isSubmittingAttendance = false;

async function executeAttendance(userID, userName) {
  if (isSubmittingAttendance) return; 
  isSubmittingAttendance = true;

  let displayName = userName || userID;
  showAlert(`Mencatat Absensi...`, "#f1c40f");
  if (typeof statusText !== 'undefined' && statusText) {
    statusText.innerText = "Mengirim Data...";
  }

  const activeRole = (typeof TERMINAL_ROLE !== 'undefined') ? TERMINAL_ROLE : "GURU";
  const JAM_MASUK_CONFIG = (typeof CONFIG !== 'undefined' && CONFIG.jamMasuk) ? CONFIG.jamMasuk : (localStorage.getItem('jam_masuk') || "07:15");
  const fotoTangkapan = captureKameraBase64();
  const payload = {
    userId: String(userID).trim(),
    nama: displayName,
    role: activeRole,
    checkType: "AUTO",
    primaryMethod: "RFID",
    secondaryMethod: "FACE",
    authLevel: "2FA",
    jamMasukConfig: JAM_MASUK_CONFIG,
    deviceId: "TERMINAL-" + activeRole,
    keterangan: "Absen Wajah & Kartu Sukses",
    fotoBase64: fotoTangkapan
  };

  try {
    const result = await fetchAPI("submitAutoAttendance", payload);
    const record = result && result.data ? result.data : {};
    const backendMessage = result ? result.message : "";

    if (record.Nama) displayName = record.Nama;

    // -----------------------------------------------------------
    // 1. RESPON BERHASIL (TAP PERTAMA SAH)
    // -----------------------------------------------------------
    if (result && result.success) {
      
      // PERBAIKAN DUKUNGAN KUNCI HEADER SPREADSHEET & APPS SCRIPT
      const statusAbsen = String(
        record["Status(Hadir/Telat/Izin/dll)"] || 
        record.Status || 
        record.status || 
        ""
      ).toUpperCase().trim();

      let warnaBg = "#2ecc71"; // Hijau Default (Tepat Waktu)
      let ikon = "✅";
      let teksJudul = "ABSEN MASUK SUKSES";
      let teksStatus = "Masuk Tepat Waktu";
      
      // Ambil pesan suara khusus dari backend jika ada
      let teksSuara = record.pesanSuara || `Terima kasih ${displayName}. Absen masuk berhasil. Selamat mengajar.`;

      // A. STATUS TERLAMBAT (07:16 - 12:00)
      if (statusAbsen.includes("TELAT") || statusAbsen.includes("TERLAMBAT")) {
        warnaBg = "#e67e22"; // Oranye
        ikon = "⚠️";
        teksJudul = "ABSEN MASUK (TERLAMBAT)";
        teksStatus = "Masuk Terlambat";

      // B. STATUS PULANG AWAL (12:01 - 14:40)
      } else if (statusAbsen.includes("PULANG AWAL")) {
        warnaBg = "#f39c12"; // Kuning
        ikon = "🟡";
        teksJudul = "ABSEN PULANG AWAL";
        teksStatus = "Pulang Awal";

      // C. STATUS PULANG NORMAL (14:41 - 15:00)
      } else if (statusAbsen.includes("PULANG NORMAL") || statusAbsen === "PULANG") {
        warnaBg = "#3498db"; // Biru
        ikon = "🔵";
        teksJudul = "ABSEN PULANG SUKSES";
        teksStatus = "Pulang Normal";

      // D. STATUS PULANG LEMBUR (15:01 - 24:00)
      } else if (statusAbsen.includes("LEMBUR")) {
        warnaBg = "#9b59b6"; // Ungu
        ikon = "🟣";
        teksJudul = "ABSEN PULANG LEMBUR";
        teksStatus = "Pulang Lembur";
      }

      putarSuaraKonfirmasi(teksSuara);
      showAlert(`${ikon} ${teksJudul}: ${displayName}`, warnaBg);

      if (typeof statusText !== 'undefined' && statusText) {
        statusText.innerText = `${ikon} ${teksStatus} (${displayName})`;
        statusText.style.color = warnaBg;
      }

    // -----------------------------------------------------------
    // 2. RESPON PERINGATAN / DITOLAK (RE-TAP SEBELUM JAM 12:00)
    // -----------------------------------------------------------
    } else {
      const cleanMsg = (backendMessage || "Absensi Ditolak").replace("[Sistem]", "").trim();
      
      // Utamakan pesan suara rinci dari backend (misal: "Maaf Guntoro, Anda sudah absen masuk jam 08:43")
      const pesanSuaraAlert = (record && record.pesanSuara) ? record.pesanSuara : cleanMsg;

      putarSuaraKonfirmasi(pesanSuaraAlert); 
      showAlert(`⚠️ ${cleanMsg}`, "#e67e22"); 

      if (typeof statusText !== 'undefined' && statusText) {
        statusText.innerText = `⚠️ ${cleanMsg}`;
        statusText.style.color = "#e67e22";
      }
    }
  } catch (error) {
    console.error("Error Absen:", error);
    putarSuaraKonfirmasi(`Terjadi kesalahan sistem.`);
    showAlert(`❌ Error Sistem / Jaringan`, "#e74c3c");
  }

  setTimeout(resetToStandby, 3500);
}
// ==========================================
// 6. RESET UI KEMBALI KE STANDBY
// ==========================================
function resetToStandby() {
  if (verificationInterval) clearInterval(verificationInterval);
  verificationInterval = null;
  currentMFAUser = null;
  isProcessing = false;
  isSubmittingAttendance = false; 
  
  const canvas = document.querySelector('canvas');
  if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);

  hideAlert();
  
  const modeLower = String(modeAbsensiSaatIni).toLowerCase();
  const activeRole = (typeof TERMINAL_ROLE !== 'undefined') ? TERMINAL_ROLE : "SISWA";

  if (modeLower !== "face" && !modeLower.includes("hanya scan wajah")) {
      if (videoContainer) videoContainer.style.display = 'none';
      if (standbyUI) standbyUI.style.display = 'block';
  }
  
  statusText.innerText = `Sistem Siap (${activeRole})`;
  statusText.style.color = "#2ecc71";
  
  if (nfcInput && !nfcInput.disabled) {
      nfcInput.focus();
  }
}

function showAlert(text, color) {
  if (!alertBox) return;
  alertBox.style.display = "block";
  alertBox.style.backgroundColor = color;
  alertBox.innerText = text;
}

function hideAlert() { 
  if (alertBox) alertBox.style.display = "none"; 
}

// ==========================================
// FUNGSI SUARA KONFIRMASI (TEXT-TO-SPEECH)
// ==========================================
function putarSuaraKonfirmasi(teks) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel(); // Hentikan suara yang sedang berjalan

    const utterance = new SpeechSynthesisUtterance(teks);
    utterance.lang = 'id-ID'; // Pengaturan Bahasa Indonesia
    utterance.rate = 1.0;     // Kecepatan standar
    utterance.pitch = 1.0;    // Nada standar

    const voices = window.speechSynthesis.getVoices();
    const idVoice = voices.find(v => v.lang.includes('id') || v.lang.includes('IND'));
    if (idVoice) utterance.voice = idVoice;

    window.speechSynthesis.speak(utterance);
  } else {
    console.warn("Browser tidak mendukung Web Speech API");
  }
}

// Inisialisasi daftar vokal browser saat halaman dimuat
if ('speechSynthesis' in window) {
  window.speechSynthesis.onvoiceschanged = () => {
    window.speechSynthesis.getVoices();
  };
}

// FUNGSI UTILITAS SIMPAN FOTO (TARUH DI BAGIAN PALING BAWAH FILE)
function simpanFotoAbsen(base64Image, namaUser) {
  try {
    if (!base64Image || !base64Image.includes("data:image")) return "";
    
    const FOLDER_ID = "1DB093nSU2NZNqIG3Hmlt6BKPvl3v9XlE"; // Folder ID Anda[cite: 8]
    const folder = DriveApp.getFolderById(FOLDER_ID);
    
    const base64Data = base64Image.split(",")[1];
    const blob = Utilities.newBlob(
      Utilities.base64Decode(base64Data), 
      "image/jpeg", 
      "Absen_" + namaUser + "_" + new Date().getTime() + ".jpg"
    );
    
    const file = folder.createFile(blob);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    return file.getUrl();
  } catch (e) {
    Logger.log("Gagal simpan foto: " + e.toString());
    return "";
  }
}