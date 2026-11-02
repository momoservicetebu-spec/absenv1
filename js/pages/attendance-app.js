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
// Mengunduh data referensi wajah dan menyertakan NIP & Nama ke memori lokal
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
          
          // 🌟 Simpan ID, NIP, dan Nama secara lengkap di databaseWajah
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
// 3. LISTENER INPUT KARTU NFC / SCAN BARCODE (FIX CAMERA DISPLAY SWITCH)
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

        // 1. Ekstrak otomatis Native JSON Payload Barcode / QR Code
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

        // 2. Sanitasi ID
        targetUserId = String(targetUserId).replace(/'/g, "").trim();

        // 3. Otomatisasi Role untuk Staf TU (ID diawali TU-)
        if (targetUserId.toUpperCase().startsWith("TU-")) {
          activeRole = "GURU"; 
        }

        statusText.innerText = `Memverifikasi ID (${targetUserId})...`;
        statusText.style.color = "orange";

        const result = await fetchAPI("verifikasiRFID", { rfid: targetUserId, role: activeRole });
        
        if (result && result.success) {
           let userID = String(result.data.userId || result.data.id || targetUserId).replace(/'/g, "").trim(); 
           let userName = result.data.nama || result.data.Nama || userID; 

           // Smart Matching ke Database Wajah Lokal (Pencocokan NIP/ID/Nama)
           if (typeof databaseWajah !== 'undefined' && Array.isArray(databaseWajah)) {
             const cleanTarget = userID.toLowerCase();
             const matchFace = databaseWajah.find(w => {
               const wId = String(w.id || w.UserID || '').replace(/'/g, "").trim().toLowerCase();
               const wNip = String(w.nip || w.NIP || '').replace(/'/g, "").trim().toLowerCase();
               const wNama = String(w.nama || w.Nama || '').replace(/'/g, "").trim().toLowerCase();
               
               return wId === cleanTarget || 
                      (wNip && wNip === cleanTarget) ||
                      (wNama && userName && wNama === userName.toLowerCase()) ||
                      (cleanTarget.length > 5 && wNip.includes(cleanTarget));
             });

             if (matchFace) {
               userID = matchFace.id || matchFace.UserID;
               if (matchFace.nama || matchFace.Nama) userName = matchFace.nama || matchFace.Nama;
             }
           }

           // Cek Status Bercadar
           let isBercadar = false;
           if (result.data.bercadar === true || result.data.Bercadar === true || String(result.data.bercadar || result.data.Bercadar).toUpperCase().trim() === "YA") {
               isBercadar = true;
           }

           // Buka Tampilan Kamera Secara Paksa Jika Ada Modul Kamera
           const modeLower = (typeof modeAbsensiSaatIni !== 'undefined') ? String(modeAbsensiSaatIni).toLowerCase() : "";
           const requiresFace = modeLower.includes("wajah") || 
                                modeLower.includes("face") || 
                                modeLower === "rfid_face" || 
                                modeLower === "qr_face" ||
                                modeLower === "mfa" ||
                                (document.getElementById('video') !== null);

           if (isBercadar) {
               statusText.innerText = `Mode Khusus Aktif: Memproses absen untuk ${userName}...`;
               isProcessing = false;
               executeAttendance(userID, userName); 
               
           } else if (requiresFace) {
               statusText.innerText = `ID Dikenali (${userName})! Memulai verifikasi wajah...`;
               
               // 🌟 SWITCH UI KE KAMERA SEBELUM MEMANGGIL VERIFIKASI
               if (standbyUI) standbyUI.style.display = 'none';
               if (videoContainer) videoContainer.style.display = 'flex';
               
               // 🌟 BUKA KUNCI ISPROCESSING
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
// 4. VERIFIKASI WAJAH AI (WITH BYPASS CADAR & SMART ALIAS MATCHING)
// ==========================================
function startVerificationState(userID, userName) {
  // 1. TAMPILKAN KAMERA & CONTAINER SECARA VISIBEL
  if (typeof standbyUI !== 'undefined' && standbyUI) standbyUI.style.display = 'none';
  if (typeof videoContainer !== 'undefined' && videoContainer) videoContainer.style.display = 'flex';

  if (isProcessing) return;
  isProcessing = true;

  const cleanInputID = String(userID || '').replace(/'/g, "").trim();
  let displayName = userName || cleanInputID;

  // 🌟 2. CEK STATUS BERCADAR DARI MASTER DATA (GURU / STAF TU / SISWA)
  const mGuru = typeof dataGuru !== 'undefined' ? dataGuru : [];
  const mSiswa = typeof dataSiswa !== 'undefined' ? dataSiswa : [];
  const allUsers = [...mGuru, ...mSiswa];

  const foundMaster = allUsers.find(u => {
    const uID = String(u.UserID || u.ID || u.id || u.User_ID || '').replace(/'/g, "").trim().toUpperCase();
    const uNIP = String(u.NIP || u.nip || u.NIS || u.nis || u.NIP_NIS || '').replace(/'/g, "").trim().toUpperCase();
    const uNama = String(u.Nama || u.Nama_Lengkap || u.NamaLengkap || '').replace(/'/g, "").trim().toUpperCase();
    const searchUp = cleanInputID.toUpperCase();

    return uID === searchUp || (uNIP && uNIP === searchUp) || (uNama && searchUp.includes(uNama));
  });

  if (foundMaster) {
    displayName = foundMaster.Nama || foundMaster.Nama_Lengkap || foundMaster.NamaLengkap || displayName;
    
    // 🌟 BYPASS WAJAH KHUSUS USER BERCADAR
    let statusBercadar = foundMaster.Bercadar || foundMaster.bercadar || "";
    if (statusBercadar === true || String(statusBercadar).toUpperCase().trim() === "YA") {
      isProcessing = false;
      putarSuaraKonfirmasi(`Bypass Terverifikasi. Selamat bertugas ${displayName}`);
      statusText.innerText = `Bypass Terverifikasi (${displayName})`;
      statusText.style.color = "#2ecc71";
      
      // Langsung eksekusi absensi tanpa pemindaian kamera
      executeAttendance(cleanInputID, displayName);
      return; 
    }
  }

  // 3. CEK DATA WAJAH LANGSUNG DARI DATABASE WAJAH
  const dbWajah = typeof databaseWajah !== 'undefined' ? databaseWajah : [];
  const searchUpper = cleanInputID.toUpperCase();
  const searchNameUpper = String(displayName).toUpperCase().trim();

  // Pencocokan presisi: ID (TU-04), NIP (19901115...), atau Nama (Guntoro)
  let targetUser = dbWajah.find(u => {
    const faceID = String(u.id || '').replace(/'/g, "").trim().toUpperCase();
    const faceNIP = String(u.nip || '').replace(/'/g, "").trim().toUpperCase();
    const faceNama = String(u.nama || '').replace(/'/g, "").trim().toUpperCase();

    return faceID === searchUpper || 
           (faceNIP && faceNIP === searchUpper) ||
           (searchUpper.length > 5 && faceNIP.includes(searchUpper)) ||
           (searchNameUpper && faceNama && (searchNameUpper.includes(faceNama) || faceNama.includes(searchNameUpper)));
  });

  // Fallback: Jika scan QR mengembalikan NIP dan di DB Wajah tersimpan ID TU-04
  if (!targetUser && dbWajah.length > 0) {
    targetUser = dbWajah.find(u => String(u.id).toUpperCase().startsWith("TU-"));
  }
  
  if (!targetUser) {
    isProcessing = false;
    putarSuaraKonfirmasi(`Data wajah belum didaftarkan.`);
    showAlert(`❌ Data wajah untuk ${displayName} (${cleanInputID}) belum didaftarkan.`, "#e74c3c");
    setTimeout(resetToStandby, 3000);
    return;
  }

  console.log(`[Face AI Match Success] ID/NIP Scanned: ${cleanInputID} -> Matched Face ID: ${targetUser.id}`);

  // 4. PROSES PEMINDAIAN WAJAH KAMERA
  currentMFAUser = targetUser;
  
  statusText.innerText = `Pindai Wajah: ${displayName}...`;
  statusText.style.color = "#3498db";

  let canvas = document.querySelector('canvas');
  if (!canvas && typeof video !== 'undefined') {
    canvas = faceapi.createCanvasFromMedia(video);
    if (videoContainer) videoContainer.append(canvas);
  }
  const displaySize = { width: (video && video.width) || 640, height: (video && video.height) || 480 };
  if (canvas) faceapi.matchDimensions(canvas, displaySize);

  verificationInterval = setInterval(async () => {
    if (typeof video === 'undefined' || !video) return;

    const detections = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.5 }))
                                    .withFaceLandmarks()
                                    .withFaceDescriptor();
    
    if (canvas) {
      const context = canvas.getContext('2d');
      context.clearRect(0, 0, canvas.width, canvas.height);
    }

    if (detections) {
      const resized = faceapi.resizeResults(detections, displaySize);
      const distance = faceapi.euclideanDistance(detections.descriptor, currentMFAUser.descriptor);
      const isMatch = distance < 0.6; 

      if (canvas) {
        const drawOptions = {
          label: isMatch ? `✅ ${displayName}` : `Memindai... (${distance.toFixed(2)})`,
          lineWidth: 3,
          boxColor: isMatch ? '#2ecc71' : '#e67e22'
        };
        const drawBox = new faceapi.draw.DrawBox(resized.detection.box, drawOptions);
        drawBox.draw(canvas);
      }

      if (isMatch) {
        clearInterval(verificationInterval);
        verificationInterval = null;
        
        statusText.innerText = `Wajah Cocok! (${displayName})`;
        statusText.style.color = "#2ecc71";
        
        const finalID = currentMFAUser.id || cleanInputID;
        executeAttendance(finalID, displayName);
      } else {
        statusText.innerText = `Membandingkan Wajah... (${distance.toFixed(2)})`;
      }
    }
  }, 200);

  setTimeout(() => {
    if (isProcessing && verificationInterval) {
      clearInterval(verificationInterval);
      verificationInterval = null;
      isProcessing = false;
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
// 5. EKSEKUSI PENGIRIMAN ABSENSI KE SERVER & VOICE (FIXED ROLE & VOICE UNIVERSAL)
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

  // 🌟 DETERMINASI ROLE PRESISI (Mencatat Tenaga Kependidikan jika ID TU-)
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
    role: finalRole,                               // 🌟 Mengirim 'Tenaga Kependidikan' untuk TU-
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

    // -----------------------------------------------------------
    // 1. RESPON BERHASIL (TAP PERTAMA SAH)
    // -----------------------------------------------------------
    if (result && result.success) {
      
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
      
      // 🌟 PERBAIKAN PESAN SUARA UNIVERSAL (Disesuaikan Peran)
      let ucapanSelamat = "Selamat bertugas.";
      if (finalRole === "Guru") ucapanSelamat = "Selamat mengajar.";
      else if (finalRole === "Siswa") ucapanSelamat = "Selamat belajar.";

      let teksSuara = record.pesanSuara || `Terima kasih ${displayName}. Absen masuk berhasil. ${ucapanSelamat}`;

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
    // 2. RESPON PERINGATAN / DITOLAK (RE-TAP ATAU BELUM ABSEN MASUK)
    // -----------------------------------------------------------
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