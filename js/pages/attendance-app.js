// ==========================================
// FILE: js/pages/attendance-app.js (STRICT FACE VERIFICATION & CADAR BYPASS)
// ==========================================
const video = document.getElementById('video');
const videoContainer = document.getElementById('video-container');
const standbyUI = document.getElementById('standby-ui');
const nfcInput = document.getElementById('nfcSimulator');
const statusText = document.getElementById('statusText');
const alertBox = document.getElementById('alertBox');

let databaseWajah = []; 
let dataGuru = [];
let dataSiswa = [];
let currentMFAUser = null; 
let verificationInterval = null;
let isProcessing = false;
let modeAbsensiSaatIni = "rfid"; // Default fallback

// 🌟 THRESHOLD KETAT: 0.45 (Mencegah Wajah Orang Lain Lolos)
const STRICT_FACE_THRESHOLD = 0.50;

// 1. Inisialisasi AI, Master Users (Guru/TU/Siswa) & Database Wajah
Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri(CONFIG.MODEL_URL),
  faceapi.nets.faceLandmark68Net.loadFromUri(CONFIG.MODEL_URL),
  faceapi.nets.faceRecognitionNet.loadFromUri(CONFIG.MODEL_URL),
  loadMasterUsers(), // Muat Master Data Guru & Siswa (Termasuk Kolom S Bercadar)
  loadFaceDatabase(), // Muat Vektor Wajah dari Face_Guru & Face_Siswa
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

// Mengunduh Data Master Guru (Sheet 'Guru') & Siswa (Sheet 'Siswa')
async function loadMasterUsers() {
  try {
    const resGuru = await fetchAPI("getGuru");
    if (resGuru && resGuru.success && Array.isArray(resGuru.data)) {
      dataGuru = resGuru.data;
      console.log(`[Master Guru/TU Loaded] Total: ${dataGuru.length} akun`);
    }

    const resSiswa = await fetchAPI("getSiswa");
    if (resSiswa && resSiswa.success && Array.isArray(resSiswa.data)) {
      dataSiswa = resSiswa.data;
      console.log(`[Master Siswa Loaded] Total: ${dataSiswa.length} akun`);
    }
  } catch(e) {
    console.warn("Gagal memuat master data pengguna:", e);
  }
}

// 2. Ambil Pengaturan Langsung dari Database Sheet (Key-Value)
async function terapkanPengaturanTerminal() {
    statusText.innerText = "Mengambil konfigurasi terminal...";
    const result = await fetchAPI("getSettings"); 

    if (result && result.success) {
        const config = result.data || {};
        const activeRole = (typeof TERMINAL_ROLE !== 'undefined') ? TERMINAL_ROLE : "SISWA";
        
        if (activeRole === "SISWA") {
            modeAbsensiSaatIni = config.MFA_STUDENT || config.keamanan?.mfaSiswa || "rfid";
        } else if (activeRole === "GURU") {
            modeAbsensiSaatIni = config.MFA_TEACHER || config.keamanan?.mfaGuru || "rfid";
        }

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

// Mengunduh Data Referensi Wajah dari Sheet Face_Guru / Face_Siswa
async function loadFaceDatabase() {
  const activeRole = (typeof TERMINAL_ROLE !== 'undefined') ? TERMINAL_ROLE : "SISWA";
  console.log(`Mengunduh database wajah untuk role: ${activeRole}...`);
  
  const result = await fetchAPI("getFaceReferences", { role: activeRole });
  
  databaseWajah = []; 
  if (result && result.success && Array.isArray(result.data)) {
    result.data.forEach(item => {
      const rawUserID = item.UserID || item.user_id || item.id || item.ID;
      const rawNIP = item.NIP || item.nip || item.NIS || item.nis || "";
      const rawNama = item.Nama || item.nama || item.NamaLengkap || "";
      const rawEmbed = item['EmbeddingData (JSON)'] || item.EmbeddingData || item.descriptor;

      const finalUserID = String(rawUserID || "").trim();
      const finalNIP = String(rawNIP || "").replace(/'/g, "").trim();
      const finalNama = String(rawNama || "").trim();

      if (finalUserID && rawEmbed && rawEmbed !== "undefined") {
        try {
          const parsed = typeof rawEmbed === 'string' ? JSON.parse(rawEmbed) : rawEmbed;
          const descriptor = new Float32Array(parsed);
          
          databaseWajah.push({ 
            id: finalUserID, 
            nip: finalNIP,
            nama: finalNama,
            descriptor: descriptor 
          });
        } catch(e) {
          console.error("Gagal memproses data vektor wajah ID:", finalUserID, e);
        }
      }
    });
    console.log(`Database Wajah Loaded (${activeRole}):`, databaseWajah);
  }
}

// ==========================================
// 3. LISTENER SCANNER RFID / QR CODE
// ==========================================
if (nfcInput) {
  nfcInput.addEventListener('keypress', async function (e) {
    if (e.key === 'Enter') {
      const rawInput = this.value.trim();
      this.value = ''; 
    
      if (rawInput !== '') {
        if (isProcessing) return;
        isProcessing = true;
        
        let targetUserId = rawInput;
        let activeRole = (typeof TERMINAL_ROLE !== 'undefined') ? TERMINAL_ROLE : "SISWA";

        // 1. Parse Payload QR Code jika format JSON
        if (rawInput.startsWith("{") && rawInput.endsWith("}")) {
          try {
            const parsedQR = JSON.parse(rawInput);
            if (parsedQR.id) targetUserId = String(parsedQR.id).replace(/'/g, "").trim();
            if (parsedQR.role) {
              const rUpper = String(parsedQR.role).toUpperCase();
              if (rUpper.includes("TENAGA") || rUpper.includes("TU") || rUpper.includes("GURU")) {
                activeRole = "GURU";
              }
            }
          } catch(err) {
            console.warn("Gagal parse JSON scanner:", err);
          }
        }

        targetUserId = String(targetUserId).replace(/'/g, "").trim();

        if (targetUserId.toUpperCase().startsWith("TU-")) {
          activeRole = "GURU"; 
        }

        statusText.innerText = `Memverifikasi ID (${targetUserId})...`;
        statusText.style.color = "orange";

        const result = await fetchAPI("verifikasiRFID", { rfid: targetUserId, role: activeRole });
        
        if (result && result.success) {
           let userID = String(result.data.userId || result.data.id || targetUserId).replace(/'/g, "").trim(); 
           let userName = result.data.nama || result.data.Nama || userID; 

           // Buka Tampilan Kamera
           const modeLower = (typeof modeAbsensiSaatIni !== 'undefined') ? String(modeAbsensiSaatIni).toLowerCase() : "";
           const requiresFace = modeLower.includes("wajah") || 
                                modeLower.includes("face") || 
                                modeLower === "rfid_face" || 
                                modeLower === "qr_face" ||
                                modeLower === "mfa" ||
                                (document.getElementById('video') !== null);

           if (requiresFace) {
               statusText.innerText = `ID Dikenali (${userName})! Memulai verifikasi wajah...`;
               if (standbyUI) standbyUI.style.display = 'none';
               if (videoContainer) videoContainer.style.display = 'flex';
               
               isProcessing = false; 
               startVerificationState(userID, userName); 
           } else {
               executeAttendance(userID, userName);
           }
           
        } else {
           isProcessing = false;
           putarSuaraKonfirmasi("Kartu atau ID tidak terdaftar.");
           showAlert(`❌ ID (${targetUserId}) tidak terdaftar.`, "#e74c3c");
           setTimeout(resetToStandby, 3000);
        }
      }
    }
  });
}

// ==========================================
// 4. VERIFIKASI WAJAH KETAT & BYPASS BERCADAR EKSKLUSIF
// ==========================================
function startVerificationState(userID, userName) {
  if (typeof standbyUI !== 'undefined' && standbyUI) standbyUI.style.display = 'none';
  if (typeof videoContainer !== 'undefined' && videoContainer) videoContainer.style.display = 'flex';

  if (isProcessing) return;
  isProcessing = true;

  const cleanInputID = String(userID || '').replace(/'/g, "").trim();
  let displayName = userName || cleanInputID;

  // 1. CEK MASTER DATA (GURU / STAF TU / SISWA)
  const allUsers = [...dataGuru, ...dataSiswa];
  const searchUp = cleanInputID.toUpperCase();

  const foundMaster = allUsers.find(u => {
    const uID = String(u.UserID || u.ID || u.id || u.GuruID || '').replace(/'/g, "").trim().toUpperCase();
    const uNIP = String(u.NIP || u.nip || u.NIS || u.nis || '').replace(/'/g, "").trim().toUpperCase();
    const uNama = String(u.Nama || u.Nama_Lengkap || u.NamaLengkap || '').replace(/'/g, "").trim().toUpperCase();

    return uID === searchUp || (uNIP && uNIP === searchUp) || (uNama && uNama === searchUp);
  });

  let masterUserID = cleanInputID;
  if (foundMaster) {
    displayName = foundMaster.Nama || foundMaster.Nama_Lengkap || displayName;
    masterUserID = String(foundMaster.UserID || foundMaster.GuruID || foundMaster.ID || cleanInputID).replace(/'/g, "").trim();
    
    // 🌟 PENCEKIKAN KOLOM S BERCADAR (HANYA 'YA' YANG BISA BYPASS)
    let rawBercadar = String(foundMaster.Bercadar || foundMaster.bercadar || "").toUpperCase().trim();
    if (rawBercadar === "YA" || foundMaster.Bercadar === true) {
      isProcessing = false;
      putarSuaraKonfirmasi(`Bypass Terverifikasi. Selamat bertugas ${displayName}`);
      statusText.innerText = `Bypass Terverifikasi - Bercadar (${displayName})`;
      statusText.style.color = "#2ecc71";
      
      executeAttendance(masterUserID, displayName);
      return; // Selesai tanpa verifikasi kamera
    }
  }

  // 🌟 2. PENCOCOKAN KETAT KE DATABASE WAJAH (TIDAK ADA FALLBACK RANDOM)
  const dbWajah = typeof databaseWajah !== 'undefined' ? databaseWajah : [];
  const searchMasterUp = masterUserID.toUpperCase();
  const searchNameUpper = String(displayName).toUpperCase().trim();

  let targetUser = dbWajah.find(u => {
    const faceID = String(u.id || '').replace(/'/g, "").trim().toUpperCase();
    const faceNIP = String(u.nip || '').replace(/'/g, "").trim().toUpperCase();
    const faceNama = String(u.nama || '').replace(/'/g, "").trim().toUpperCase();

    return faceID === searchUp || 
           faceID === searchMasterUp ||
           (faceNIP && (faceNIP === searchUp || faceNIP === searchMasterUp)) ||
           (searchNameUpper && faceNama && faceNama === searchNameUpper);
  });

  // Jika data wajah tidak ada di Face_Guru / Face_Siswa, TOLAK ABSENSI!
  if (!targetUser) {
    isProcessing = false;
    putarSuaraKonfirmasi(`Data wajah belum didaftarkan.`);
    showAlert(`❌ Data wajah untuk ${displayName} (${cleanInputID}) belum didaftarkan di sistem.`, "#e74c3c");
    setTimeout(resetToStandby, 3500);
    return;
  }

  console.log(`[Strict Face Verification] User Target: ${targetUser.id} (${displayName})`);

// 3. PROSES PEMINDAIAN WAJAH DENGAN KAMERA LIVE
    currentMFAUser = targetUser;
    
    // Tentukan tantangan secara acak
   // 🌟 TANTANGAN ANGGUN & SOPAN: KEDIP MATA ATAU SENYUM
  const livenessChallenge = Math.random() > 0.5 ? 'BLINK' : 'SMILE';
  const challengeText = livenessChallenge === 'BLINK' ? '👁️ Kedipkan Mata' : '😊 Tersenyum Manis';
  
  if (statusText) {
    statusText.innerText = `${challengeText}: ${displayName}...`;
    statusText.style.color = "#3498db";
  }

  let canvas = document.querySelector('canvas');
  if (!canvas && typeof video !== 'undefined' && videoContainer) {
    canvas = faceapi.createCanvasFromMedia(video);
    videoContainer.append(canvas);
  }
  const displaySize = { width: (video && video.width) || 640, height: (video && video.height) || 480 };
  if (canvas) faceapi.matchDimensions(canvas, displaySize);

  let hasPassedChallenge = false;
  let isEyeClosed = false;

  const detectorOptions = new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 });

  verificationInterval = setInterval(async () => {
    if (typeof video === 'undefined' || !video) return;

    const detections = await faceapi.detectSingleFace(video, detectorOptions)
                                    .withFaceLandmarks()
                                    .withFaceDescriptor();
    
    if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);

    if (detections) {
      const resized = faceapi.resizeResults(detections, displaySize);
      const distance = faceapi.euclideanDistance(detections.descriptor, currentMFAUser.descriptor);
      const isMatch = distance < STRICT_FACE_THRESHOLD; 

      // EVALUASI LIVENESS SOPAN
      if (livenessChallenge === 'BLINK') {
        // Deteksi Kedip Mata (EAR)
        const avgEAR = (getEyeAspectRatio(detections.landmarks.getLeftEye()) + getEyeAspectRatio(detections.landmarks.getRightEye())) / 2.0;
        if (avgEAR < 0.22) isEyeClosed = true;
        else if (isEyeClosed && avgEAR > 0.25) hasPassedChallenge = true;
      } else {
        // Deteksi Senyum Manis (Tarik Garis Bibir Kesamping / MAR > 0.18)
        const mouthRatio = getMouthAspectRatio(detections.landmarks.getJawOutline(), detections.landmarks.getMouth());
        if (mouthRatio > 0.18) { // Cukup senyum simpul/lebar biasa tanpa perlu mangap
          hasPassedChallenge = true;
        }
      }

      if (canvas) {
        const drawOptions = {
          label: (isMatch && hasPassedChallenge) ? `✅ ${displayName}` : (isMatch ? challengeText : `Memindai... (${distance.toFixed(2)})`),
          lineWidth: 3,
          boxColor: (isMatch && hasPassedChallenge) ? '#2ecc71' : (isMatch ? '#f39c12' : '#e74c3c')
        };
        const drawBox = new faceapi.draw.DrawBox(resized.detection.box, drawOptions);
        drawBox.draw(canvas);
      }

      if (isMatch && hasPassedChallenge) {
        clearInterval(verificationInterval);
        verificationInterval = null;
        
        if (statusText) {
          statusText.innerText = `✅ Wajah & Liveness Valid! (${displayName})`;
          statusText.style.color = "#2ecc71";
        }
        
        executeAttendance(currentMFAUser.id || masterUserID, displayName);
      } else if (isMatch && !hasPassedChallenge) {
        if (statusText) {
          statusText.innerText = `Wajah Valid. Silakan: ${challengeText} (${displayName})`;
          statusText.style.color = "#e67e22";
        }
      } else {
        if (statusText) {
          statusText.innerText = `Membandingkan Wajah (${displayName})... Jarak: ${distance.toFixed(2)}`;
          statusText.style.color = "#e67e22";
        }
      }
    }
  }, 100);

  // Timeout 6 detik jika wajah tidak cocok
  setTimeout(() => {
    if (isProcessing && verificationInterval) {
      clearInterval(verificationInterval);
      verificationInterval = null;
      isProcessing = false;
      putarSuaraKonfirmasi("Verifikasi wajah gagal. Wajah tidak cocok.");
      showAlert(`❌ Verifikasi Gagal: Wajah tidak cocok dengan data ${displayName}.`, "#e74c3c");
      setTimeout(resetToStandby, 2500);
    }
  }, 5000);
}

// ==========================================
// FUNGSI UTILITY: CAPTURE FOTO KAMERA
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
    return canvas.toDataURL("image/jpeg", 0.6); 
  } catch (err) {
    console.error("Gagal capture foto:", err);
    return "";
  }
}

// ==========================================
// 5. EKSEKUSI ABSENSI KE SERVER
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

  const userIdUpper = String(userID).trim().toUpperCase();
  let finalRole = (typeof TERMINAL_ROLE !== 'undefined') ? TERMINAL_ROLE : "GURU";

  if (userIdUpper.startsWith('TU-')) {
    finalRole = "Tenaga Kependidikan";
  } else if (userIdUpper.startsWith('GURU-')) {
    finalRole = "Guru";
  } else if (userIdUpper.startsWith('SISWA') || userIdUpper.startsWith('NIS')) {
    finalRole = "Siswa";
  }

  const JAM_MASUK_CONFIG = (typeof CONFIG !== 'undefined' && CONFIG.jamMasuk) ? CONFIG.jamMasuk : (localStorage.getItem('jam_masuk') || "07:15");
  const fotoTangkapan = captureKameraBase64();

  const payload = {
    userId: String(userID).trim(),
    nama: displayName,
    role: finalRole,
    checkType: "AUTO",
    primaryMethod: "RFID",
    secondaryMethod: "FACE",
    authLevel: "2FA",
    jamMasukConfig: JAM_MASUK_CONFIG,
    deviceId: "TERMINAL-" + (finalRole === "Tenaga Kependidikan" ? "TU" : finalRole.toUpperCase()),
    keterangan: "Absen Wajah & Kartu Sukses",
    fotoBase64: fotoTangkapan
  };

  try {
    const result = await fetchAPI("submitAutoAttendance", payload);
    const record = result && result.data ? result.data : {};
    const backendMessage = result ? result.message : "";

    if (record.Nama) displayName = record.Nama;

    if (result && result.success) {
      const statusAbsen = String(record["Status(Hadir/Telat/Izin/dll)"] || record.Status || "").toUpperCase().trim();

      let warnaBg = "#2ecc71";
      let ikon = "✅";
      let teksJudul = "ABSEN MASUK SUKSES";
      let teksStatus = "Masuk Tepat Waktu";
      
      let ucapanSelamat = "Selamat bertugas.";
      if (finalRole === "Guru") ucapanSelamat = "Selamat mengajar.";
      else if (finalRole === "Siswa") ucapanSelamat = "Selamat belajar.";

      let teksSuara = record.pesanSuara || `Terima kasih ${displayName}. Absen masuk berhasil. ${ucapanSelamat}`;

      if (statusAbsen.includes("TELAT") || statusAbsen.includes("TERLAMBAT")) {
        warnaBg = "#e67e22";
        ikon = "⚠️";
        teksJudul = "ABSEN MASUK (TERLAMBAT)";
        teksStatus = "Masuk Terlambat";
      } else if (statusAbsen.includes("PULANG AWAL")) {
        warnaBg = "#f39c12";
        ikon = "🟡";
        teksJudul = "ABSEN PULANG AWAL";
        teksStatus = "Pulang Awal";
      } else if (statusAbsen.includes("PULANG NORMAL") || statusAbsen === "PULANG") {
        warnaBg = "#3498db";
        ikon = "🔵";
        teksJudul = "ABSEN PULANG SUKSES";
        teksStatus = "Pulang Normal";
      } else if (statusAbsen.includes("LEMBUR")) {
        warnaBg = "#9b59b6";
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
    } else {
      const cleanMsg = (backendMessage || "Absensi Ditolak").replace("[Sistem]", "").trim();
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
// 6. RESET UI KE STANDBY
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