// ==========================================
// FILE: js/face-ai.js
// SINKRONISASI DENGAN HTML ENROLLMENT WAJAH
// ==========================================

let localStream = null;
let lastDescriptor = null; // Ini variabel penyimpan embedding wajah
let capturedFaceBase64 = "";

// ==========================================
// 1. Fungsi Membuka Kamera
// ==========================================
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

// ==========================================
// 2. Fungsi Muat Model AI 
// ==========================================
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
    console.warn("Model AI tidak dapat dimuat, periksa path/koneksi.", err);
  }
}

// ==========================================
// 3. Fungsi Ambil Foto & Pindai Biometrik Wajah (FIXED CANVAS PHOTO)
// ==========================================
async function captureFace() {
  const video = document.getElementById('video');
  const canvas = document.getElementById('faceCanvas');
  const statusText = document.getElementById('statusText');
  const btnEnroll = document.getElementById('btnEnroll');

  if (!localStream || video.paused || video.ended) {
    alert("Nyalakan kamera terlebih dahulu!");
    return;
  }

  // 1. Samakan ukuran canvas dengan video kamera
  canvas.width = video.videoWidth || 320;
  canvas.height = video.videoHeight || 240;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  
  // 2. Jepret foto dari video
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  capturedFaceBase64 = canvas.toDataURL('image/jpeg', 0.8);

  statusText.innerText = "⏳ Memproses pemindaian biometrik AI...";
  statusText.style.color = "#feca57";

  lastDescriptor = null; 

  if (typeof faceapi !== 'undefined') {
    try {
      // Deteksi AI pada foto canvas
      const detection = await faceapi.detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detection) {
        lastDescriptor = Array.from(detection.descriptor);
        
        const displaySize = { width: canvas.width, height: canvas.height };
        
        // PENTING: matchDimensions akan mereset canvas
        faceapi.matchDimensions(canvas, displaySize);
        const resizedDetections = faceapi.resizeResults(detection, displaySize);

        // --- SOLUSI: Draw ulang foto latar belakang kamera sebelum melukis biometrik ---
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

        // Lukis garis biometrik AI di atas foto yang sudah digambar ulang
        faceapi.draw.drawDetections(canvas, resizedDetections);
        faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);

        statusText.innerText = "✅ Wajah & Biometrik Terdeteksi! Siap disimpan.";
        statusText.style.color = "#1dd1a1";
      } else {
        statusText.innerText = "⚠️ Foto diambil, namun AI gagal mendeteksi wajah. Coba posisi lain.";
        statusText.style.color = "#ff6b6b";
        alert("Wajah tidak terdeteksi oleh AI. Mohon posisikan wajah lurus ke kamera dan cahaya cukup.");
      }
    } catch (e) {
      console.error("Error Deteksi AI:", e);
      statusText.innerText = "❌ Terjadi kesalahan pada proses AI.";
      statusText.style.color = "#ff6b6b";
    }
  }

  if (lastDescriptor && lastDescriptor.length > 0) {
    btnEnroll.disabled = false;
  } else {
    btnEnroll.disabled = true; 
  }
}

// ==========================================
// 4. Simpan Data Wajah ke Database (Spreadsheet)
// ==========================================
async function registerCurrentFace() {
  const userSelect = document.getElementById('faceUserSelect');
  const userId = userSelect ? userSelect.value : '';

  if (!userId) {
    alert("⚠️ Silakan pilih pengguna terlebih dahulu!");
    return;
  }

  // PERBAIKAN: Validasi menggunakan variabel 'lastDescriptor' yang diset di captureFace()
  if (!lastDescriptor || lastDescriptor.length === 0) {
    alert("⚠️ Belum ada data wajah yang terdeteksi/ditangkap! Silakan klik 'Ambil Foto' lagi.");
    return;
  }

  const btnEnroll = document.getElementById('btnEnroll');
  if (btnEnroll) {
    btnEnroll.disabled = true;
    btnEnroll.innerText = "⏳ Menyimpan ke Database...";
  }

  // PERBAIKAN: Format payload untuk Backend
  const payload = {
    userId: userId,
    provider: "Face-API-JS",
    embedding: JSON.stringify(lastDescriptor), // Stringify agar Google Sheets menerimanya dengan baik sebagai Text
    qualityScore: 98.5
  };

  try {
    const response = await fetchAPI("registerFace", payload);
    if (response && response.success) {
      alert("✅ Data Wajah Berhasil Disimpan!");
      
      // Bersihkan memori wajah setelah sukses
      lastDescriptor = null;
      
      // Reload dropdown/tabel
      if (typeof loadFaceTable === 'function') loadFaceTable();
    } else {
      alert("❌ Gagal: " + (response ? response.message : "Terjadi kesalahan koneksi database."));
    }
  } catch (err) {
    alert("❌ Request Error: " + err.message);
  } finally {
    if (btnEnroll) {
      btnEnroll.disabled = true; // Matikan lagi sampai user ambil foto baru
      btnEnroll.innerText = "💾 Simpan Wajah";
    }
  }
}

// ==========================================
// 5. Muat Data Pengguna ke Dropdown
// ==========================================
async function loadUserForFaceAI() {
  const selectElement = document.getElementById('faceUserSelect');
  if (!selectElement) return;

  selectElement.innerHTML = '<option value="">⏳ Memuat data dari database...</option>';

  try {
    const result = await fetchAPI("getFaceUsers");
    
    if (result && result.success) {
      selectElement.innerHTML = '<option value="">-- Ketik atau Pilih Pengguna --</option>';
      let usersArray = [];

      if (Array.isArray(result.data)) {
        usersArray = result.data;
      } else if (typeof result.data === 'object') {
        if (result.data.listSiswa) usersArray = usersArray.concat(result.data.listSiswa);
        if (result.data.siswa) usersArray = usersArray.concat(result.data.siswa);
        if (result.data.listGuru) usersArray = usersArray.concat(result.data.listGuru);
        if (result.data.guru) usersArray = usersArray.concat(result.data.guru);
      }

      if (usersArray.length > 0) {
        usersArray.forEach(user => {
          let userId = user.GuruID || user.SiswaID || user.NIP || user.NIS || user.id || "Tanpa ID";
          let userName = user.Nama || user.nama || user.NAMA || "Tanpa Nama";
          
          if (userId !== "Tanpa ID" && userName !== "Tanpa Nama") {
            let option = document.createElement('option');
            option.value = userId; 
            option.text = `${userId} - ${userName}`; 
            selectElement.appendChild(option);
          }
        });

        // Aktifkan Select2 jika jQuery tersedia
        if (typeof jQuery !== 'undefined' && typeof jQuery.fn.select2 !== 'undefined') {
          jQuery('#faceUserSelect').select2({
            placeholder: "-- Ketik atau Pilih Pengguna --",
            allowClear: true,
            width: '100%'
          });
        }
      } else {
        selectElement.innerHTML = `<option value="">❌ Gagal: Data pengguna kosong</option>`;
      }
    } else {
      selectElement.innerHTML = `<option value="">❌ Gagal mengambil data</option>`;
    }
  } catch (error) {
    console.error("Error Load User:", error);
    selectElement.innerHTML = `<option value="">❌ Error Koneksi: ${error.message}</option>`;
  }
}

// ==========================================
// 6. Muat Tabel Wajah (READ)
// ==========================================
async function loadFaceTable() {
  const tbody = document.getElementById('faceTableBody');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 15px;">⏳ Memuat data...</td></tr>';

  try {
    const result = await fetchAPI("getAllFaceData");
    if (result && result.success) {
      const data = result.data;
      if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 15px;">Belum ada wajah terdaftar.</td></tr>';
        return;
      }

      tbody.innerHTML = '';
      data.forEach((row, index) => {
        // Ambil ID sesuai nama kolom yang diubah (UserID)
        const uid = row.UserID || row.userId || row.userid || row['UserID'] || row['UserID (SiswaID/GuruID)'] || "Tidak Ditemukan";
        const role = row.Role || row.role || "-";
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td style="padding: 8px; border: 1px solid #444; text-align: center;">${index + 1}</td>
          <td style="padding: 8px; border: 1px solid #444; font-weight: bold;">${uid}</td>
          <td style="padding: 8px; border: 1px solid #444;">${role}</td>
          <td style="padding: 8px; border: 1px solid #444; color: #1dd1a1;">✅ Terekam</td>
          <td style="padding: 8px; border: 1px solid #444; text-align: center;">
            <button class="btn-action btn-danger" style="padding: 5px 10px; font-size: 12px; cursor:pointer;" onclick="deleteFaceData('${uid}')">Hapus</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    } else {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; color:red;">❌ Gagal memuat data tabel</td></tr>';
    }
  } catch (error) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:red;">❌ Error: ${error.message}</td></tr>`;
  }
}

// ==========================================
// 7. Hapus Data Wajah (DELETE)
// ==========================================
async function deleteFaceData(userId) {
  if(!confirm(`Yakin ingin MENGHAPUS data wajah untuk ID: ${userId}?`)) return;
  
  const result = await fetchAPI("deleteFace", { userId: userId });
  if(result && result.success) {
    alert("✅ " + result.message);
    loadFaceTable(); 
  } else {
    alert("❌ Gagal menghapus: " + result?.message);
  }
}

// ==========================================
// 8. Search / Filter Tabel Wajah
// ==========================================
function filterFaceTable() {
  const input = document.getElementById("searchFaceInput");
  const filter = input.value.toLowerCase().trim();
  const tbody = document.getElementById("faceTableBody");
  const rows = tbody.getElementsByTagName("tr");

  for (let i = 0; i < rows.length; i++) {
    if (rows[i].getElementsByTagName("td").length <= 1) continue;

    const userIdTd = rows[i].getElementsByTagName("td")[1];
    const roleTd = rows[i].getElementsByTagName("td")[2];

    if (userIdTd || roleTd) {
      const userIdText = userIdTd.textContent || userIdTd.innerText;
      const roleText = roleTd.textContent || roleTd.innerText;

      if (userIdText.toLowerCase().indexOf(filter) > -1 || roleText.toLowerCase().indexOf(filter) > -1) {
        rows[i].style.display = "";
      } else {
        rows[i].style.display = "none";
      }
    }
  }
}

// ==========================================
// EVENT LISTENER GLOBAL
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  loadUserForFaceAI();
  loadFaceTable(); 
});