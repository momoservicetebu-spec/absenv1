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
let modeAbsensiSaatIni = "Tap Kartu + Scan Wajah (MFA)"; // Default

// 1. Inisialisasi AI dan Pengaturan secara bersamaan
Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri(CONFIG.MODEL_URL),
  faceapi.nets.faceLandmark68Net.loadFromUri(CONFIG.MODEL_URL),
  faceapi.nets.faceRecognitionNet.loadFromUri(CONFIG.MODEL_URL),
  loadFaceDatabase(),
  terapkanPengaturanTerminal() // Panggil pengaturan dari database
]).then(() => {
  startVideo();
}).catch(err => {
  statusText.innerText = "Gagal memuat AI atau Konfigurasi";
  console.error(err);
});

function startVideo() {
  navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => { video.srcObject = stream; })
    .catch(err => console.error(err));
}

// 2. Fungsi Mengambil Pengaturan MFA dari Backend
async function terapkanPengaturanTerminal() {
    statusText.innerText = "Mengambil konfigurasi terminal...";
    const result = await fetchAPI("getSettings"); 

    if (result && result.success) {
        // config sekarang berisi data langsung dari Sheet Anda
        const config = result.data; 
        
        // 1. Sinkronisasi Metode Absen berdasarkan Role (Siswa/Guru)
        if (typeof TERMINAL_ROLE !== 'undefined') {
            if (TERMINAL_ROLE === "SISWA") {
                modeAbsensiSaatIni = config.MFA_STUDENT; // Membaca baris 11
            } else if (TERMINAL_ROLE === "GURU") {
                modeAbsensiSaatIni = config.MFA_TEACHER; // Membaca baris 12
            }
        }

        // 2. Sinkronisasi Fitur Anti Fake GPS
        // Konversi ke string & uppercase untuk jaga-jaga format dari Sheet
        const antiFakeGps = String(config.ANTI_FAKE_GPS).toUpperCase() === "TRUE";
        const boxGps = document.getElementById("btnGps");
        const statusGps = document.getElementById("gpsStatusText");

        if (antiFakeGps) {
            if(boxGps) boxGps.style.display = "inline-block";
            if(statusGps) statusGps.style.display = "block";
        } else {
            if(boxGps) boxGps.style.display = "none";
            if(statusGps) statusGps.style.display = "none";
            bukaKunciMetodeInput(); 
        }

        statusText.innerText = `Sistem Siap (${TERMINAL_ROLE})`;
        statusText.style.color = "#2ecc71";
    } else {
        console.warn("Gagal memuat pengaturan API, menggunakan pengaturan bawaan.");
        bukaKunciMetodeInput();
    }
}

function bukaKunciMetodeInput() {
    if (modeAbsensiSaatIni === "Hanya Scan Wajah (Face Recognition)") {
        // Jika mode hanya wajah, sembunyikan NFC dan langsung jalankan kamera
        standbyUI.style.display = 'none';
        videoContainer.style.display = 'flex';
        // (Opsional: Tambahkan logika deteksi wajah massal di sini jika diperlukan)
    } else {
        // Jika butuh NFC/Barcode sebagai faktor pertama
        if (nfcInput) {
            nfcInput.disabled = false;
            nfcInput.focus();
        }
    }
}

async function loadFaceDatabase() {
  console.log("Mencoba mengunduh data wajah...");
  const result = await fetchAPI("getFaceReferences");
  
  if (result.success && Array.isArray(result.data)) {
    result.data.forEach(item => {
      const keys = Object.keys(item);
      const embedKey = keys.find(k => k.toLowerCase().includes('embed') || k.toLowerCase().includes('vektor') || k.toLowerCase().includes('face'));
      const userKey = keys.find(k => k.toLowerCase().includes('id') || k.toLowerCase().includes('user'));
      
      if(embedKey && userKey) {
        const rawEmbed = item[embedKey];
        const userID = String(item[userKey]).trim();
        if (rawEmbed && rawEmbed !== "undefined") {
          try {
            const parsed = typeof rawEmbed === 'string' ? JSON.parse(rawEmbed) : rawEmbed;
            const descriptor = new Float32Array(parsed);
            databaseWajah.push({ id: userID, descriptor: descriptor });
          } catch(e){}
        }
      }
    });
  }
}

// ========================================================
// EVENT LISTENER UNTUK INPUT KARTU NFC / BARCODE
// ========================================================
nfcInput.addEventListener('keypress', async function (e) {
  if (e.key === 'Enter') {
    const rfidNumber = this.value.trim();
    this.value = ''; 
    
    if (rfidNumber !== '') {
      if (isProcessing) return;
      isProcessing = true;
      
      statusText.innerText = "Memverifikasi ID...";
      statusText.style.color = "orange";

      const result = await fetchAPI("verifikasiRFID", { rfid: rfidNumber, role: TERMINAL_ROLE });
      
      if (result.success) {
         const userID = result.data.userId || result.data.id; 
         
         // Jika aturan mengharuskan pakai Wajah
         if (modeAbsensiSaatIni.includes("Scan Wajah")) {
             statusText.innerText = `ID Dikenali! Memulai verifikasi wajah...`;
             isProcessing = false; 
             startVerificationState(userID); 
         } 
         // Jika aturan HANYA Tap Kartu (Tanpa MFA Wajah)
         else {
             executeAttendance(userID);
         }
         
      } else {
         showAlert(`❌ ID (${rfidNumber}) tidak terdaftar untuk ${TERMINAL_ROLE}.`, "#e74c3c");
         setTimeout(resetToStandby, 3000);
      }
    }
  }
});

function startVerificationState(userID) {
  if(isProcessing) return;
  isProcessing = true;

  const targetUser = databaseWajah.find(u => u.id === userID);
  
  if (!targetUser) {
    showAlert(`Data wajah ID ${userID} belum didaftarkan di sistem.`, "#e74c3c");
    setTimeout(resetToStandby, 3000);
    return;
  }

  currentMFAUser = targetUser;
  standbyUI.style.display = 'none';
  videoContainer.style.display = 'flex';
  statusText.innerText = `Verifikasi Wajah: ${userID}`;
  statusText.style.color = "#3498db";

  let canvas = document.querySelector('canvas');
  if(!canvas){
    canvas = faceapi.createCanvasFromMedia(video);
    videoContainer.append(canvas);
  }
  const displaySize = { width: video.width, height: video.height };
  faceapi.matchDimensions(canvas, displaySize);

  verificationInterval = setInterval(async () => {
    const detections = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
                                    .withFaceLandmarks()
                                    .withFaceDescriptor();
    
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);

    if (detections) {
      const resized = faceapi.resizeResults(detections, displaySize);
      faceapi.draw.drawDetections(canvas, resized);

      const distance = faceapi.euclideanDistance(detections.descriptor, currentMFAUser.descriptor);
      
      if (distance < 0.5) { 
        clearInterval(verificationInterval);
        canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
        executeAttendance(currentMFAUser.id);
      }
    }
  }, 200);

  setTimeout(() => {
    if(isProcessing && verificationInterval) {
      clearInterval(verificationInterval);
      showAlert(`Wajah tidak cocok dengan pemilik ID ${userID}.`, "#e74c3c");
      setTimeout(resetToStandby, 3000);
    }
  }, 10000);
}

async function executeAttendance(userID) {
  showAlert(`Mencatat Absensi...`, "#f1c40f");
  statusText.innerText = "Mengirim Data...";

  const result = await fetchAPI("submitAutoAttendance", {
    userId: userID,
    role: TERMINAL_ROLE, // Otomatis menyesuaikan apakah GURU atau SISWA
    checkType: "IN"
  });

  if (result.success) {
    showAlert(`✅ ABSENSI SUKSES: ${userID}`, "#2ecc71");
  } else {
    showAlert(`❌ Gagal: ${result.message}`, "#e74c3c");
  }

  setTimeout(resetToStandby, 3000);
}

function resetToStandby() {
  clearInterval(verificationInterval);
  verificationInterval = null;
  currentMFAUser = null;
  isProcessing = false;
  
  const canvas = document.querySelector('canvas');
  if(canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);

  hideAlert();
  
  // Kembalikan UI berdasarkan mode saat ini
  if (modeAbsensiSaatIni !== "Hanya Scan Wajah (Face Recognition)") {
      videoContainer.style.display = 'none';
      standbyUI.style.display = 'block';
  }
  
  statusText.innerText = `Sistem Siap (${TERMINAL_ROLE})`;
  statusText.style.color = "#2ecc71";
  
  if(nfcInput && !nfcInput.disabled) {
      nfcInput.focus();
  }
}

function showAlert(text, color) {
  alertBox.style.display = "block";
  alertBox.style.backgroundColor = color;
  alertBox.innerText = text;
}
function hideAlert() { alertBox.style.display = "none"; }