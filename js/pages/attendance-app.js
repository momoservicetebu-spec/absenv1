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
           // 1. Cek dari data respons API spreadsheet
           let isBercadar = String(result.data.Bercadar || result.data.bercadar || "").toUpperCase().trim() === "YA";
           
           // 2. Jika tidak terbaca di API, cocokkan dari databaseWajah lokal
           if (!isBercadar && typeof databaseWajah !== 'undefined') {
               const targetUser = databaseWajah.find(u => String(u.id).trim() === String(userID).trim());
               if (targetUser) {
                   isBercadar = String(targetUser.Bercadar || targetUser.bercadar || "").toUpperCase().trim() === "YA";
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

  // Cari data deskriptor wajah
  const targetUser = (typeof databaseWajah !== 'undefined' ? databaseWajah : []).find(
    u => String(u.id || u.UserID).trim().toUpperCase() === String(userID).trim().toUpperCase()
  );
  
  if (!targetUser) {
    putarSuaraKonfirmasi(`Data wajah belum didaftarkan.`);
    showAlert(`Data wajah untuk ${userID} belum didaftarkan.`, "#e74c3c");
    setTimeout(resetToStandby, 3000);
    return;
  }

  // 🌟 PENCARIAN NAMA ASLI DARI MASTER DATA (Daftar Guru / Siswa)
  let displayName = userID;
  const masterGuru = typeof dataGuru !== 'undefined' ? dataGuru : (typeof listGuru !== 'undefined' ? listGuru : []);
  const masterSiswa = typeof dataSiswa !== 'undefined' ? dataSiswa : (typeof listSiswa !== 'undefined' ? listSiswa : []);
  const allUsers = [...masterGuru, ...masterSiswa];

  const foundMaster = allUsers.find(
    u => String(u.UserID || u.NIP || u.NIS || u.ID).trim().toUpperCase() === String(userID).trim().toUpperCase()
  );

  if (foundMaster) {
    displayName = foundMaster.Nama || foundMaster.Nama_Lengkap || foundMaster.NamaLengkap || displayName;
  } else if (userName && userName !== userID) {
    displayName = userName;
  }

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
// 5. EKSEKUSI PENGIRIMAN ABSENSI KE SERVER & VOICE
// ==========================================
let isSubmittingAttendance = false;

async function executeAttendance(userID, userName) {
  if (isSubmittingAttendance) return; 
  isSubmittingAttendance = true;

  let displayName = userName || userID;
  showAlert(`Mencatat Absensi...`, "#f1c40f");
  statusText.innerText = "Mengirim Data...";

  const activeRole = (typeof TERMINAL_ROLE !== 'undefined') ? TERMINAL_ROLE : "SISWA";
  const payload = {
    userId: String(userID).trim(),
    nama: displayName,
    role: activeRole,
    checkType: "IN",
    primaryMethod: "RFID",
    secondaryMethod: "FACE",
    authLevel: "2FA",
    lat: (typeof currentLat !== 'undefined') ? currentLat : "",
    long: (typeof currentLng !== 'undefined') ? currentLng : "",
    deviceId: "TERMINAL-" + activeRole,
    keterangan: "Absen Wajah & Kartu Sukses"
  };

  try {
    const result = await fetchAPI("submitAutoAttendance", payload);
    
    const record = result && result.data ? result.data : {};
    const backendMessage = result ? result.message : "";
    const customVoice = record.pesanSuara || "";

    if (record.Nama) {
       displayName = record.Nama;
    }

    if (result && result.success) {
      const checkType = record["CheckType (IN/OUT)"] || "IN";
      
      if (customVoice) {
        putarSuaraKonfirmasi(customVoice);
      } else {
        putarSuaraKonfirmasi(`Terima kasih ${displayName}. Absensi berhasil.`);
      }

      if (checkType === "OUT") {
         showAlert(`🔵 ABSEN PULANG SUKSES: ${displayName}`, "#3498db");
         statusText.innerText = `🔵 Absen Pulang (${displayName})`;
         statusText.style.color = "#3498db";
      } else {
         showAlert(`✅ ABSEN MASUK SUKSES: ${displayName}`, "#2ecc71");
         statusText.innerText = `✅ Absen Masuk (${displayName})`;
         statusText.style.color = "#2ecc71";
      }

    } else {
      // PERINGATAN REPEAT TAP / SPAM / DI LUAR JAM
      const errMessage = backendMessage || "Koneksi terputus";
      const cleanMsg = errMessage.replace("[Sistem]", "").trim();
      
      putarSuaraKonfirmasi(customVoice || cleanMsg); 
      
      showAlert(`⚠️ ${cleanMsg}`, "#e67e22"); // Warna Oranye
      statusText.innerText = `⚠️ Peringatan (${displayName})`;
      statusText.style.color = "#e67e22";
    }
  } catch (error) {
     putarSuaraKonfirmasi(`Terjadi kesalahan jaringan.`);
     showAlert(`❌ Error Jaringan`, "#e74c3c");
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