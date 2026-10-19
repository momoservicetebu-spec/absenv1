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

// 1. Mengunduh data referensi wajah sesuai Role (Face_Guru atau Face_Siswa)
async function loadFaceDatabase() {
  const activeRole = (typeof TERMINAL_ROLE !== 'undefined') ? TERMINAL_ROLE : "SISWA";
  console.log(`Mencoba mengunduh database wajah khusus role: ${activeRole}...`);
  
  // Kirim parameter role ke backend agar mengambil dari Face_Guru / Face_Siswa
  const result = await fetchAPI("getFaceReferences", { role: activeRole });
  
  databaseWajah = []; // Reset database lokal
  if (result.success && Array.isArray(result.data)) {
    result.data.forEach(item => {
      const keys = Object.keys(item);
      const embedKey = keys.find(k => k.toLowerCase().includes('embed') || k.toLowerCase().includes('vektor') || k.toLowerCase().includes('face'));
      const userKey = keys.find(k => k.toLowerCase().includes('id') || k.toLowerCase().includes('user') || k.toLowerCase().includes('nip') || k.toLowerCase().includes('nis'));
      
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

// 3. Listener Input Kartu NFC / Scan Barcode
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
        
        if (result.success) {
           const userID = result.data.userId || result.data.id; 
           const modeLower = String(modeAbsensiSaatIni).toLowerCase();
           
           // Cek apakah butuh verifikasi wajah (MFA / rfid_face / scan wajah)
           const requiresFace = modeLower.includes("wajah") || modeLower.includes("face") || modeLower === "rfid_face" || modeLower === "mfa";

           if (requiresFace) {
               statusText.innerText = `ID Dikenali (${userID})! Memulai verifikasi wajah...`;
               isProcessing = false; 
               startVerificationState(userID); 
           } else {
               // Jika setting di Sheet "rfid", langsung catat absen
               executeAttendance(userID);
           }
           
        } else {
           showAlert(`❌ ID (${rfidNumber}) tidak terdaftar untuk ${activeRole}.`, "#e74c3c");
           setTimeout(resetToStandby, 3000);
        }
      }
    }
  });
}

// 4. Verifikasi Wajah AI
function startVerificationState(userID) {
  if(isProcessing) return;
  isProcessing = true;

  const targetUser = databaseWajah.find(u => u.id === userID);
  
  if (!targetUser) {
    showAlert(`Data wajah untuk ID ${userID} belum didaftarkan.`, "#e74c3c");
    setTimeout(resetToStandby, 3000);
    return;
  }

  currentMFAUser = targetUser;
  if(standbyUI) standbyUI.style.display = 'none';
  if(videoContainer) videoContainer.style.display = 'flex';
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
      showAlert(`Wajah tidak cocok dengan ID ${userID}.`, "#e74c3c");
      setTimeout(resetToStandby, 3000);
    }
  }, 10000);
}

// 5. Eksekusi Pengiriman Absensi ke Server
async function executeAttendance(userID) {
  showAlert(`Mencatat Absensi...`, "#f1c40f");
  statusText.innerText = "Mengirim Data...";

  const activeRole = (typeof TERMINAL_ROLE !== 'undefined') ? TERMINAL_ROLE : "SISWA";

  const result = await fetchAPI("submitAutoAttendance", {
    userId: userID,
    role: activeRole,
    checkType: "IN"
  });

  if (result.success) {
    showAlert(`✅ ABSENSI SUKSES: ${userID}`, "#2ecc71");
  } else {
    showAlert(`❌ Gagal: ${result.message}`, "#e74c3c");
  }

  setTimeout(resetToStandby, 3000);
}

// 6. Reset UI Kembali ke Standby
function resetToStandby() {
  if (verificationInterval) clearInterval(verificationInterval);
  verificationInterval = null;
  currentMFAUser = null;
  isProcessing = false;
  
  const canvas = document.querySelector('canvas');
  if(canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);

  hideAlert();
  
  const modeLower = String(modeAbsensiSaatIni).toLowerCase();
  const activeRole = (typeof TERMINAL_ROLE !== 'undefined') ? TERMINAL_ROLE : "SISWA";

  if (modeLower !== "face" && !modeLower.includes("hanya scan wajah")) {
      if(videoContainer) videoContainer.style.display = 'none';
      if(standbyUI) standbyUI.style.display = 'block';
  }
  
  statusText.innerText = `Sistem Siap (${activeRole})`;
  statusText.style.color = "#2ecc71";
  
  if(nfcInput && !nfcInput.disabled) {
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