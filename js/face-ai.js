// ==========================================
// FILE: js/face-ai.js
// ==========================================

const video = document.getElementById('video');
const statusText = document.getElementById('statusText');
const btnEnroll = document.getElementById('btnEnroll');
let lastDescriptor = null;

function initFaceAI() {
  window.aiLoaded = true;
  statusText.innerText = "Memuat AI...";
  
  // Menggunakan CONFIG.MODEL_URL dari config.js
  Promise.all([
    faceapi.nets.tinyFaceDetector.loadFromUri(CONFIG.MODEL_URL),
    faceapi.nets.faceLandmark68Net.loadFromUri(CONFIG.MODEL_URL),
    faceapi.nets.faceRecognitionNet.loadFromUri(CONFIG.MODEL_URL)
  ]).then(() => {
    statusText.innerText = "Kamera Siap!";
    statusText.style.color = "#1dd1a1";
    btnEnroll.disabled = false;
    navigator.mediaDevices.getUserMedia({ video: true }).then(stream => { 
      video.srcObject = stream; 
      startTracking(); 
    });
  }).catch(err => {
    statusText.innerText = "Gagal memuat AI!";
    statusText.style.color = "#ff6b6b";
    console.error(err);
  });
}

function startTracking() {
  const canvas = faceapi.createCanvasFromMedia(video);
  document.getElementById('video-container').append(canvas);
  faceapi.matchDimensions(canvas, { width: video.width, height: video.height });
  
  setInterval(async () => {
    const detections = await faceapi.detectSingleFace(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();
      
    canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    
    if (detections) {
      lastDescriptor = Array.from(detections.descriptor);
      faceapi.draw.drawDetections(canvas, faceapi.resizeResults(detections, { width: video.width, height: video.height }));
    } else { 
      lastDescriptor = null; 
    }
  }, 200);
}

async function registerCurrentFace() {
  const userId = document.getElementById('userIdInput').value;
  
  if (!userId) {
    alert("Silakan masukkan ID Pengguna terlebih dahulu!");
    return;
  }
  if (!lastDescriptor) {
    alert("Wajah belum terdeteksi oleh kamera. Pastikan pencahayaan terang.");
    return;
  }

  btnEnroll.innerText = "Menyimpan ke Server...";
  btnEnroll.disabled = true;

  const result = await fetchAPI("registerFace", {
    userId: userId,
    nama: "User-" + userId,
    faceDescriptor: lastDescriptor
  });

  if (result.success) {
    alert(`✅ Data Wajah ${userId} Berhasil Disimpan ke Database!`);
    document.getElementById('userIdInput').value = '';
  } else {
    alert(`❌ Gagal: ${result.message}`);
  }

  btnEnroll.innerText = "Simpan Wajah";
  btnEnroll.disabled = false;
}