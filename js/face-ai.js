// ==========================================
// FILE: js/face-ai.js
// SINKRONISASI DENGAN HTML ENROLLMENT WAJAH
// ==========================================

let localStream = null;
let lastDescriptor = null; // Ini variabel penyimpan embedding wajah
let capturedFaceBase64 = "";
let currentFacingMode = "user"; // "user" (depan) atau "environment" (belakang)

// ==========================================
// 1. Fungsi Membuka Kamera (FIXED FOR MOBILE & SWITCHING)
// ==========================================
async function startCamera() {
  const video = document.getElementById('video');
  const statusText = document.getElementById('statusText');

  if (!video) return;

  if (statusText) {
    statusText.innerText = "⏳ Membuka kamera...";
    statusText.style.color = "#feca57";
  }

  try {
    // Matikan stream lama jika sedang berjalan
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      localStream = null;
    }

    // Panggil kamera dengan facingMode dinamis
    localStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: currentFacingMode },
      audio: false
    });

    video.srcObject = localStream;
    
    // Efek mirror hanya untuk kamera depan
    if (currentFacingMode === "user") {
      video.style.transform = "scaleX(-1)";
    } else {
      video.style.transform = "scaleX(1)";
    }

    // Tunggu metadata video termuat agar tahu resolusi aslinya
    video.onloadedmetadata = () => {
      video.play();
      video.width = video.videoWidth;
      video.height = video.videoHeight;
    };

    if (statusText) {
      const cameraLabel = currentFacingMode === "user" ? "Depan" : "Belakang";
      statusText.innerText = `📷 Kamera ${cameraLabel} Aktif. Siapkan wajah lalu klik 'Ambil Foto'.`;
      statusText.style.color = "#1dd1a1";
    }

    if (typeof faceapi !== 'undefined' && typeof CONFIG !== 'undefined') {
      loadFaceAIModels();
    }
  } catch (err) {
    if (statusText) {
      statusText.innerText = "❌ Gagal Akses Kamera: " + err.message;
      statusText.style.color = "#ff6b6b";
    }
  }
}

// ==========================================
// 2. Fungsi Mematikan Kamera
// ==========================================
function stopCamera() {
  const video = document.getElementById('video');
  const statusText = document.getElementById('statusText');

  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
    localStream = null;
  }

  if (video) {
    video.srcObject = null;
  }

  if (statusText) {
    statusText.innerText = "🚫 Kamera dimatikan.";
    statusText.style.color = "#a2a3b7";
  }
}

// ==========================================
// 3. Fungsi Beralih Kamera (Depan <-> Belakang)
// ==========================================
function switchCamera() {
  currentFacingMode = (currentFacingMode === "user") ? "environment" : "user";
  startCamera();
}

// ==========================================
// 3. Fungsi Ambil Foto & Pindai Biometrik Wajah (FIXED FOR MOBILE)
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

  // PERBAIKAN: Ambil resolusi murni langsung dari sumber video saat itu juga
  const vw = video.videoWidth;
  const vh = video.videoHeight;

  // Samakan ukuran canvas secara presisi dengan resolusi video asli
  canvas.width = vw;
  canvas.height = vh;
  
  // Pastikan elemen video juga memiliki atribut ukuran yang sama agar garis AI tidak meleset
  video.width = vw;
  video.height = vh;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  
  // Jepret foto dari video dengan ukuran proporsional
  ctx.drawImage(video, 0, 0, vw, vh);
  capturedFaceBase64 = canvas.toDataURL('image/jpeg', 0.8);

  statusText.innerText = "⏳ Memproses pemindaian biometrik AI...";
  statusText.style.color = "#feca57";

  lastDescriptor = null; 

  if (typeof faceapi !== 'undefined') {
    try {
      // Deteksi AI pada canvas
      const detection = await faceapi.detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detection) {
        lastDescriptor = Array.from(detection.descriptor);
        
        const displaySize = { width: vw, height: vh };
        
        // Sesuaikan koordinat deteksi AI dengan ukuran layar yang dinamis
        faceapi.matchDimensions(canvas, displaySize);
        const resizedDetections = faceapi.resizeResults(detection, displaySize);

        // Lukis ulang latar belakang dan biometrik
        ctx.drawImage(video, 0, 0, vw, vh);
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

  // --- PERBAIKAN: Ambil Nama dari Dropdown ---
  // Jika teks dropdown adalah "GURU-014 - Budi Santoso", kita akan mengambil "Budi Santoso"-nya
  let userName = "";
  if (userSelect && userSelect.options[userSelect.selectedIndex]) {
      const selectedText = userSelect.options[userSelect.selectedIndex].text;
      // Memisahkan teks berdasarkan tanda " - "
      const parts = selectedText.split(" - "); 
      if (parts.length > 1) {
          userName = parts.slice(1).join(" - ").trim(); // Mengambil sisa teks sebagai nama
      } else {
          userName = userId; // Fallback jika tidak ada tanda hubung
      }
  }

  // PERBAIKAN: Format payload untuk Backend (Tambahkan Nama)
  const payload = {
    userId: userId,
    nama: userName, // <--- INI TAMBAHANNYA
    provider: "Face-API-JS",
    embedding: JSON.stringify(lastDescriptor), 
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

  // PERBAIKAN: Ubah colspan="5" menjadi "6"
  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 15px;">⏳ Memuat data...</td></tr>';

  try {
    const result = await fetchAPI("getAllFaceData", { _t: new Date().getTime() });
    
    if (!result || !result.data || result.data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 15px; color: #9ca3af;">Belum ada wajah terdaftar atau data kosong.</td></tr>';
      return; 
    }

    if (result.success) {
      tbody.innerHTML = ''; 
      result.data.forEach((row, index) => {
        const uid = row.UserID || row.userId || row.userid || row['UserID'] || row['UserID (SiswaID/GuruID)'] || "Tidak Ditemukan";
        
        // PERBAIKAN: Ambil variabel nama dari database
        const nama = row.Nama || row.nama || "-"; 
        
        const role = row.Role || row.role || "-";
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td style="padding: 12px 16px; border-bottom: 1px solid #332d4a; text-align: center;">${index + 1}</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #332d4a; font-weight: bold; color: #ffffff;">${uid}</td>
          
          <!-- PERBAIKAN: Tambahkan kolom NAMA di sini agar sejajar dengan HTML -->
          <td style="padding: 12px 16px; border-bottom: 1px solid #332d4a; color: #e2e8f0;">${nama}</td>
          
          <td style="padding: 12px 16px; border-bottom: 1px solid #332d4a;">
            <span style="background: ${role === 'Guru' ? '#f59e0b' : '#0284c7'}; color: ${role === 'Guru' ? '#000' : '#fff'}; padding: 3px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: bold;">${role}</span>
          </td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #332d4a; color: #10b981; font-weight: bold;">✅ Terekam</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #332d4a; text-align: center;">
            <button class="btn-action" style="background: transparent; color: #ef4444; border: 1px solid #dc2626; padding: 5px 12px; border-radius: 6px; font-size: 0.8rem; cursor:pointer;" onclick="deleteFaceData('${uid}')">🗑️ Hapus</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    } else {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#ef4444;">❌ Gagal memuat data tabel</td></tr>';
    }
  } catch (error) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:#ef4444;">❌ Error: ${error.message}</td></tr>`;
  }
}

// ==========================================
// 7. Hapus Data Wajah (DELETE)
// ==========================================
async function deleteFaceData(userId) {
  if(!confirm(`Yakin ingin MENGHAPUS data wajah untuk ID: ${userId}?`)) return;
  
  try {
    const result = await fetchAPI("deleteFace", { userId: userId });
    
    if(result && result.success) {
      alert("✅ " + result.message);
      
      // KOSONGKAN MANUAL LAYAR SAAT INI
      const tbody = document.getElementById('faceTableBody');
      if(tbody) tbody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 15px; color: #9ca3af;">⏳ Menunggu sinkronisasi database (2 detik)...</td></tr>';
      
      // KUNCI PERBAIKAN 2: Beri jeda 2 detik agar Google Sheets selesai menghapus baris
      setTimeout(async () => {
        if (typeof loadFaceTable === 'function') {
          await loadFaceTable(); 
        }
      }, 2000); 

    } else {
      alert("❌ Gagal menghapus: " + (result?.message || "Error server"));
    }
  } catch (err) {
    alert("❌ Terjadi kesalahan jaringan saat menghapus.");
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