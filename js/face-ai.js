// ==========================================
// FILE: js/face-ai.js
// SINKRONISASI DENGAN HTML ENROLLMENT WAJAH
// ==========================================

let localStream = null;
let lastDescriptor = null;
let capturedFaceBase64 = "";

// 1. Fungsi Membuka Kamera
async function startCamera() {
  const video = document.getElementById('video');
  const statusText = document.getElementById('statusText');

  if (!video) return;

  statusText.innerText = "⏳ Membuka kamera...";
  statusText.style.color = "#feca57";

  try {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
    }

    localStream = await navigator.mediaDevices.getUserMedia({
      video: { width: 320, height: 240, facingMode: "user" }
    });

    video.srcObject = localStream;
    video.play();

    statusText.innerText = "📷 Kamera Aktif. Siapkan wajah lalu klik 'Ambil Foto'.";
    statusText.style.color = "#1dd1a1";

    // Muat model AI jika faceapi tersedia
    if (typeof faceapi !== 'undefined' && typeof CONFIG !== 'undefined') {
      loadFaceAIModels();
    }
  } catch (err) {
    statusText.innerText = "❌ Gagal Akses Kamera: " + err.message;
    statusText.style.color = "#ff6b6b";
  }
}

// 2. Fungsi Muat Model AI (Jika Face-API Dipasang)
async function loadFaceAIModels() {
  const statusText = document.getElementById('statusText');
  try {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(CONFIG.MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(CONFIG.MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(CONFIG.MODEL_URL)
    ]);
    statusText.innerText = "🎯 Kamera & AI Biometrik Siap!";
    statusText.style.color = "#1dd1a1";
  } catch (err) {
    console.warn("Model AI tidak dapat dimuat, berpindah ke mode Foto Kamera saja.", err);
  }
}

// 3. Fungsi Ambil Foto & Pindai Biometrik Wajah
async function captureFace() {
  const video = document.getElementById('video');
  const canvas = document.getElementById('faceCanvas');
  const statusText = document.getElementById('statusText');
  const btnEnroll = document.getElementById('btnEnroll');

  if (!localStream || video.paused || video.ended) {
    alert("Nyalakan kamera terlebih dahulu!");
    return;
  }

  // Ambil gambar dari video dan taruh di canvas 'Hasil Tangkapan'
  const ctx = canvas.getContext('2d');
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  
  // Ambil gambar sampel format Base64
  capturedFaceBase64 = canvas.toDataURL('image/jpeg', 0.8);

  statusText.innerText = "⏳ Memproses pemindaian biometrik AI...";
  statusText.style.color = "#feca57";

  // Jalankan ekstraksi AI jika Face-API tersedia
  if (typeof faceapi !== 'undefined') {
    try {
      // Deteksi AI dilakukan pada 'canvas' hasil jepretan
      const detection = await faceapi.detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detection) {
        lastDescriptor = Array.from(detection.descriptor);
        
        // Gambar landmark biometrik di atas canvas
        faceapi.draw.drawDetections(canvas, detection);
        faceapi.draw.drawFaceLandmarks(canvas, detection);

        statusText.innerText = "✅ Wajah & Biometrik Terdeteksi! Siap disimpan.";
        statusText.style.color = "#1dd1a1";
      } else {
        lastDescriptor = null;
        statusText.innerText = "⚠️ Foto diambil, namun landmark AI tidak terdeteksi. Posisikan wajah di tengah.";
        statusText.style.color = "#feca57";
      }
    } catch (e) {
      console.error("Error Deteksi AI:", e);
      lastDescriptor = null;
      statusText.innerText = "📸 Foto Sampel Terambil.";
      statusText.style.color = "#1dd1a1";
    }
  } else {
    statusText.innerText = "📸 Foto Sampel Terambil.";
    statusText.style.color = "#1dd1a1";
  }

  btnEnroll.disabled = false;
}

// 4. Simpan Data Wajah ke Database
async function registerCurrentFace() {
  const userSelect = document.getElementById('faceUserSelect');
  const btnEnroll = document.getElementById('btnEnroll');
  const userId = userSelect ? userSelect.value : "";

  if (!userId) {
    alert("Silakan pilih Pengguna terlebih dahulu dari list dropdown!");
    return;
  }

  if (!capturedFaceBase64) {
    alert("Ambil foto wajah terlebih dahulu!");
    return;
  }

  btnEnroll.innerText = "⏳ Menyimpan ke Server...";
  btnEnroll.disabled = true;

  const payload = {
    userId: userId,
    faceDescriptor: lastDescriptor ? JSON.stringify(lastDescriptor) : "",
    fotoBase64: capturedFaceBase64
  };

  const result = await fetchAPI("registerFace", payload);

  if (result && result.success) {
    alert(`✅ Data Wajah AI untuk ID (${userId}) Berhasil Disimpan!`);
    
    // Reset Canvas
    const canvas = document.getElementById('faceCanvas');
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    capturedFaceBase64 = "";
    lastDescriptor = null;
  } else {
    alert(`❌ Gagal Menyimpan: ${result?.message || 'Terjadi kesalahan koneksi server'}`);
  }

  btnEnroll.innerText = "💾 Simpan Wajah";
  btnEnroll.disabled = false;
}

// ==========================================
// 5. FUNGSI BARU: Muat Data Pengguna ke Dropdown
// ==========================================
async function loadUserForFaceAI() {
  const selectElement = document.getElementById('faceUserSelect');
  if (!selectElement) return;

  selectElement.innerHTML = '<option value="">⏳ Memuat data dari server...</option>';

  try {
    // MENGGUNAKAN ENDPOINT YANG SESUAI DENGAN CONSOLE (getDashboardData)
    const result = await fetchAPI("getDashboardData", { role: "semua" }); 
    
    if (result && result.success && result.data) {
      selectElement.innerHTML = '<option value="">-- Ketik atau Pilih Pengguna --</option>';
      
      const data = result.data;
      const listSiswa = data.listSiswa || [];
      const listGuru = data.listGuru || [];

      // Masukkan Kelompok Siswa
      if (listSiswa.length > 0) {
        const groupSiswa = document.createElement("optgroup");
        groupSiswa.label = "--- SISWA ---";
        listSiswa.forEach(s => {
          groupSiswa.innerHTML += `<option value="${s.id || s.nis}">${s.nama} (${s.nis || s.kelas})</option>`;
        });
        selectElement.appendChild(groupSiswa);
      }

      // Masukkan Kelompok Guru
      if (listGuru.length > 0) {
        const groupGuru = document.createElement("optgroup");
        groupGuru.label = "--- GURU / STAF ---";
        listGuru.forEach(g => {
          groupGuru.innerHTML += `<option value="${g.id || g.nip}">${g.nama} (${g.nip || 'Guru'})</option>`;
        });
        selectElement.appendChild(groupGuru);
      }

      // AKTIFKAN FITUR SEARCH PADA DROPDOWN (Jika jQuery & Select2 tersedia di template Anda)
      if (typeof jQuery !== 'undefined' && typeof jQuery.fn.select2 !== 'undefined') {
        jQuery('#faceUserSelect').select2({
          placeholder: "-- Ketik atau Pilih Pengguna --",
          allowClear: true,
          width: '100%'
        });
      }

    } else {
      selectElement.innerHTML = `<option value="">❌ Gagal: Data kosong</option>`;
    }
  } catch (error) {
    selectElement.innerHTML = `<option value="">❌ Error API: ${error.message}</option>`;
  }
}