// ==========================================
// FILE: js/pages/attendance-app.js
// ==========================================
const video = document.getElementById('video');
const videoContainer = document.getElementById('video-container');
const standbyUI = document.getElementById('standby-ui');
const nfcInput = document.getElementById('nfcSimulator');
const btnFingerprint = document.getElementById('btnFingerprint');
const statusText = document.getElementById('statusText');
const alertBox = document.getElementById('alertBox');

let databaseWajah = []; 
let currentMFAUser = null; 
let verificationInterval = null;
let isProcessing = false;

// 1. Inisialisasi AI menggunakan CONFIG dari config.js
Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri(CONFIG.MODEL_URL),
  faceapi.nets.faceLandmark68Net.loadFromUri(CONFIG.MODEL_URL),
  faceapi.nets.faceRecognitionNet.loadFromUri(CONFIG.MODEL_URL),
  loadFaceDatabase()
]).then(() => {
  statusText.innerText = "Sistem Siap";
  statusText.style.color = "green";
  nfcInput.disabled = false;
  btnFingerprint.disabled = false;
  nfcInput.focus();
  startVideo();
}).catch(err => {
  statusText.innerText = "Gagal memuat AI";
  console.error(err);
});

function startVideo() {
  navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => { video.srcObject = stream; })
    .catch(err => console.error(err));
}

// 2. Load Database Wajah
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

// 3. Listener UI MFA
nfcInput.addEventListener('keypress', function (e) {
  if (e.key === 'Enter') {
    const inputID = this.value.trim();
    this.value = ''; 
    if (inputID !== '') startVerificationState(inputID);
  }
});

function simulateFingerprintBridge() {
  if(isProcessing) return;
  const fpStatus = document.getElementById('fingerprintStatus');
  
  btnFingerprint.disabled = true;
  nfcInput.disabled = true;
  fpStatus.innerText = "Menunggu mesin fingerprint memproses...";
  fpStatus.style.color = "blue";

  setTimeout(() => {
    const detectedUserID = "FACE-1787924439928"; 
    fpStatus.innerText = `Sidik jari terdeteksi: ID ${detectedUserID}! Mengaktifkan Kamera...`;
    fpStatus.style.color = "green";

    setTimeout(() => {
      fpStatus.innerText = "";
      startVerificationState(detectedUserID);
    }, 1500);
  }, 1500);
}

// 4. Verifikasi Wajah AI
function startVerificationState(userID) {
  if(isProcessing) return;
  isProcessing = true;

  const targetUser = databaseWajah.find(u => u.id === userID);
  
  if (!targetUser) {
    showAlert(`ID ${userID} tidak ditemukan di database wajah.`, "red");
    setTimeout(resetToStandby, 3000);
    return;
  }

  currentMFAUser = targetUser;
  standbyUI.style.display = 'none';
  videoContainer.style.display = 'flex';
  statusText.innerText = `Halo ${userID}, Verifikasi Wajah Anda...`;
  statusText.style.color = "blue";

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
      showAlert(`Verifikasi Wajah Gagal. Anda bukan ID ${userID}.`, "red");
      setTimeout(resetToStandby, 3000);
    }
  }, 10000);
}

// 5. Eksekusi Absensi via API
async function executeAttendance(userID) {
  showAlert(`✅ Verifikasi MFA Sukses! Mencatat Absen...`, "#d39e00");
  statusText.innerText = "Mengirim Data...";

  const result = await fetchAPI("submitAutoAttendance", {
    userId: userID,
    role: "GURU", 
    checkType: "IN"
  });

  if (result.success) {
    showAlert(`✅ ABSEN BERHASIL: ${userID}`, "green");
  } else {
    showAlert(`❌ Gagal Server: ${result.message}`, "red");
  }

  setTimeout(resetToStandby, 3000);
}

// 6. UI Helpers
function resetToStandby() {
  clearInterval(verificationInterval);
  verificationInterval = null;
  currentMFAUser = null;
  isProcessing = false;
  
  const canvas = document.querySelector('canvas');
  if(canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);

  hideAlert();
  videoContainer.style.display = 'none';
  standbyUI.style.display = 'block';
  statusText.innerText = "Sistem Siap";
  statusText.style.color = "green";
  
  nfcInput.disabled = false;
  btnFingerprint.disabled = false;
  nfcInput.focus();
}

function showAlert(text, color) {
  alertBox.style.display = "block";
  alertBox.style.backgroundColor = color;
  alertBox.innerText = text;
}

function hideAlert() { alertBox.style.display = "none"; }