// ==========================================
// FILE: /js/pages/attendance-app.js
// TUGAS: Mesin Utama Absensi Kamera & Pengiriman API
// ==========================================

const video = document.getElementById('video');
let labeledFaceDescriptors = []; // Data referensi wajah dari backend
let faceMatcher = null;
let scanCooldown = new Map(); // Mencegah frontend mengirim API berulang untuk orang yang sama

// 1. Inisialisasi Kamera dan AI
async function initSystem() {
  uiManager.showLoading("Memuat Model AI & Data Wajah...");
  
  // Load model Face-API (Pastikan path folder /assets/models benar)
  await Promise.all([
    faceapi.nets.ssdMobilenetv1.loadFromUri('/assets/models'),
    faceapi.nets.faceLandmark68Net.loadFromUri('/assets/models'),
    faceapi.nets.faceRecognitionNet.loadFromUri('/assets/models')
  ]);

  // Ambil data referensi dari backend (Sheet 'FaceReference')
  await loadFaceReferences();

  uiManager.hideLoading();
  startCamera();
}

// 2. Mengambil referensi dari backend dan membuat FaceMatcher
async function loadFaceReferences() {
  const response = await fetchAPI('getFaceReferences');
  if (response.success && response.data.length > 0) {
    labeledFaceDescriptors = response.data.map(user => {
      const descriptorArray = new Float32Array(JSON.parse(user.FaceDescriptor));
      return new faceapi.LabeledFaceDescriptors(user.UserID, [descriptorArray]);
    });
    faceMatcher = new faceapi.FaceMatcher(labeledFaceDescriptors, 0.6); // Toleransi 60%
  }
}

// 3. Menjalankan Kamera
function startCamera() {
  navigator.mediaDevices.getUserMedia({ video: true, audio: false })
    .then(stream => {
      video.srcObject = stream;
      video.play();
      detectFaces(); // Mulai scanning loop
    })
    .catch(err => console.error("Kamera tidak diizinkan atau tidak ditemukan:", err));
}

// 4. Scanning Loop 
async function detectFaces() {
  setInterval(async () => {
    if (!faceMatcher) return;

    const detections = await faceapi.detectAllFaces(video)
      .withFaceLandmarks()
      .withFaceDescriptors();

    detections.forEach(fd => {
      const bestMatch = faceMatcher.findBestMatch(fd.descriptor);
      
      if (bestMatch.label !== 'unknown') {
        const userId = bestMatch.label;
        processAttendance(userId);
      }
    });
  }, 1000); // Cek setiap 1 detik
}

// 5. Eksekusi API Absensi dengan Cooldown & GPS
async function processAttendance(userId) {
  const now = Date.now();
  const lastScan = scanCooldown.get(userId) || 0;

  // Frontend Cooldown: Jangan panggil API jika user ini sudah discan dalam 10 detik terakhir
  if (now - lastScan < 10000) return; 
  scanCooldown.set(userId, now);

  // Ambil lokasi GPS (Haversine di backend yang akan memvalidasi)
  const coords = await LocationEngine.getCurrentCoords().catch(() => null);

  const payload = {
    userId: userId,
    checkType: 'IN', // Bisa dibuat dinamis berdasarkan jam
    lat: coords ? coords.lat : null,
    lng: coords ? coords.lng : null
  };

  // Tembak ke 1_Router.gs
  const res = await fetchAPI('submitAutoAttendance', payload);

  if (res.success) {
    if (res.data.isDuplicate) {
      uiManager.showToast(`Warning: ${userId} sudah absen hari ini.`, 'warning');
      uiManager.playSound('already_scanned');
    } else {
      uiManager.showToast(`Sukses! ${userId} berhasil absen.`, 'success');
      uiManager.playSound('success');
    }
  } else {
    uiManager.showToast(`Gagal: ${res.message}`, 'error');
  }
}

// Jalankan sistem saat halaman dimuat
window.addEventListener('DOMContentLoaded', initSystem);