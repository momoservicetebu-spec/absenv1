// ==========================================
// FILE: js/face-ai.js (FULL FIX - TENAGA KEPENDIDIKAN & ROLE PRESISI)
// ==========================================

let localStream = null;
let lastDescriptor = null; // Variabel penyimpan embedding wajah
let capturedFaceBase64 = "";
let currentFacingMode = "user"; // "user" (depan) atau "environment" (belakang)

// ==========================================
// 1. Fungsi Membuka Kamera
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
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      localStream = null;
    }

    localStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: currentFacingMode },
      audio: false
    });

    video.srcObject = localStream;
    
    if (currentFacingMode === "user") {
      video.style.transform = "scaleX(-1)";
    } else {
      video.style.transform = "scaleX(1)";
    }

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
// 4. Fungsi Muat Model AI 
// ==========================================
async function loadFaceAIModels() {
  const statusText = document.getElementById('statusText');
  try {
    await Promise.all([
      faceapi.nets.tinyFaceDetector.loadFromUri(CONFIG.MODEL_URL),
      faceapi.nets.faceLandmark68Net.loadFromUri(CONFIG.MODEL_URL),
      faceapi.nets.faceRecognitionNet.loadFromUri(CONFIG.MODEL_URL)
    ]);
    if (statusText) {
      statusText.innerText = "🎯 Kamera & AI Biometrik Siap!";
      statusText.style.color = "#1dd1a1";
    }
  } catch (err) {
    console.warn("Model AI tidak dapat dimuat, periksa path/koneksi.", err);
  }
}

// ==========================================
// 5. Fungsi Ambil Foto & Pindai Biometrik Wajah
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

  const vw = video.videoWidth || 320;
  const vh = video.videoHeight || 240;

  canvas.width = vw;
  canvas.height = vh;
  video.width = vw;
  video.height = vh;

  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(video, 0, 0, vw, vh);
  capturedFaceBase64 = canvas.toDataURL('image/jpeg', 0.8);

  if (statusText) {
    statusText.innerText = "⏳ Memproses pemindaian biometrik AI...";
    statusText.style.color = "#feca57";
  }

  lastDescriptor = null; 

  if (typeof faceapi !== 'undefined') {
    try {
      const detection = await faceapi.detectSingleFace(canvas, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks()
        .withFaceDescriptor();

      if (detection) {
        lastDescriptor = Array.from(detection.descriptor);
        
        const displaySize = { width: vw, height: vh };
        faceapi.matchDimensions(canvas, displaySize);
        const resizedDetections = faceapi.resizeResults(detection, displaySize);

        ctx.drawImage(video, 0, 0, vw, vh);
        faceapi.draw.drawDetections(canvas, resizedDetections);
        faceapi.draw.drawFaceLandmarks(canvas, resizedDetections);

        if (statusText) {
          statusText.innerText = "✅ Wajah & Biometrik Terdeteksi! Siap disimpan.";
          statusText.style.color = "#1dd1a1";
        }
      } else {
        if (statusText) {
          statusText.innerText = "⚠️ Foto diambil, namun AI gagal mendeteksi wajah. Coba posisi lain.";
          statusText.style.color = "#ff6b6b";
        }
        alert("Wajah tidak terdeteksi oleh AI. Mohon posisikan wajah lurus ke kamera dan cahaya cukup.");
      }
    } catch (e) {
      console.error("Error Deteksi AI:", e);
      if (statusText) {
        statusText.innerText = "❌ Terjadi kesalahan pada proses AI.";
        statusText.style.color = "#ff6b6b";
      }
    }
  }

  if (btnEnroll) {
    btnEnroll.disabled = !(lastDescriptor && lastDescriptor.length > 0);
  }
}

// ==========================================
// 6. Simpan Data Wajah ke Database (Spreadsheet)
// ==========================================
async function registerCurrentFace() {
  const userSelect = document.getElementById('faceUserSelect');
  const userId = userSelect ? userSelect.value : '';

  if (!userId) {
    alert("⚠️ Silakan pilih pengguna terlebih dahulu!");
    return;
  }

  if (!lastDescriptor || lastDescriptor.length === 0) {
    alert("⚠️ Belum ada data wajah yang terdeteksi/ditangkap! Silakan klik 'Ambil Foto' lagi.");
    return;
  }

  const btnEnroll = document.getElementById('btnEnroll');
  if (btnEnroll) {
    btnEnroll.disabled = true;
    btnEnroll.innerText = "⏳ Menyimpan ke Database...";
  }

  // --- DETERMINASI NAMA DAN ROLE PRESISI ---
  let userName = "";
  let fullText = "";
  if (userSelect && userSelect.options[userSelect.selectedIndex]) {
    fullText = userSelect.options[userSelect.selectedIndex].text;
    const parts = fullText.split(" - "); 
    if (parts.length > 1) {
      userName = parts.slice(1).join(" - ").trim();
    } else {
      userName = userId;
    }
  }

  const userIdClean = userId.toUpperCase();
  const textClean = fullText.toUpperCase();
  
  let userRole = "SISWA";
  if (userIdClean.startsWith('TU-') || textClean.includes('TENAGA KEPENDIDIKAN') || textClean.includes('TU')) {
    userRole = "TENAGA KEPENDIDIKAN";
  } else if (userIdClean.startsWith('GURU-') || textClean.includes('GURU') || textClean.includes('KEPSEK')) {
    userRole = "GURU";
  }

  const payload = {
    userId: userId,
    nama: userName,
    role: userRole,
    roleSistem: userRole,
    provider: "Face-API-JS",
    embedding: JSON.stringify(lastDescriptor), 
    qualityScore: 98.5
  };

  try {
    const response = await fetchAPI("registerFace", payload);
    if (response && response.success) {
      alert("✅ Data Wajah Berhasil Disimpan!");
      lastDescriptor = null;
      if (typeof loadFaceTable === 'function') loadFaceTable();
    } else {
      alert("❌ Gagal: " + (response ? response.message : "Terjadi kesalahan koneksi database."));
    }
  } catch (err) {
    alert("❌ Request Error: " + err.message);
  } finally {
    if (btnEnroll) {
      btnEnroll.disabled = true;
      btnEnroll.innerText = "💾 Simpan Wajah";
    }
  }
}

// ==========================================
// 7. Muat Data Pengguna ke Dropdown
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
// 8. Muat Tabel Wajah (READ DENGAN ROLE NORMALISASI)
// ==========================================
async function loadFaceTable() {
  const tbody = document.getElementById('faceTableBody');
  if (!tbody) return;

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
        const uid = String(row.UserID || row.userId || row.userid || row['UserID'] || row['UserID (SiswaID/GuruID)'] || "Tidak Ditemukan").toUpperCase();
        const nama = row.Nama || row.nama || "-"; 
        const rawRole = String(row.Role || row.role || row.Role_Sistem || "").toUpperCase();

        // Determinasi Tampilan Badge Role
        let displayRole = 'Siswa';
        let badgeBg = '#0284c7';
        let badgeColor = '#ffffff';

        if (uid.startsWith('TU-') || rawRole.includes('TENAGA') || rawRole.includes('TU')) {
          displayRole = 'Tenaga Kependidikan';
          badgeBg = '#e67e22'; // Warna orange/emas khusus TU
          badgeColor = '#ffffff';
        } else if (uid.startsWith('GURU-') || rawRole.includes('GURU')) {
          displayRole = 'Guru';
          badgeBg = '#f59e0b';
          badgeColor = '#000000';
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td style="padding: 12px 16px; border-bottom: 1px solid #332d4a; text-align: center;">${index + 1}</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #332d4a; font-weight: bold; color: #ffffff;">${uid}</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #332d4a; color: #e2e8f0;">${nama}</td>
          <td style="padding: 12px 16px; border-bottom: 1px solid #332d4a;">
            <span style="background: ${badgeBg}; color: ${badgeColor}; padding: 3px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: bold;">
              ${displayRole}
            </span>
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
// 9. Hapus Data Wajah (DELETE)
// ==========================================
async function deleteFaceData(userId) {
  if (!confirm(`Yakin ingin MENGHAPUS data wajah untuk ID: ${userId}?`)) return;
  
  try {
    const result = await fetchAPI("deleteFace", { userId: userId });
    
    if (result && result.success) {
      alert("✅ " + result.message);
      
      const tbody = document.getElementById('faceTableBody');
      if (tbody) tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 15px; color: #9ca3af;">⏳ Menunggu sinkronisasi database (2 detik)...</td></tr>';
      
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
// 10. Search / Filter Tabel Wajah
// ==========================================
function filterFaceTable() {
  const input = document.getElementById("searchFaceInput");
  if (!input) return;
  const filter = input.value.toLowerCase().trim();
  const tbody = document.getElementById("faceTableBody");
  if (!tbody) return;
  const rows = tbody.getElementsByTagName("tr");

  for (let i = 0; i < rows.length; i++) {
    if (rows[i].getElementsByTagName("td").length <= 1) continue;

    const userIdTd = rows[i].getElementsByTagName("td")[1];
    const namaTd = rows[i].getElementsByTagName("td")[2];
    const roleTd = rows[i].getElementsByTagName("td")[3];

    if (userIdTd || namaTd || roleTd) {
      const userIdText = userIdTd ? userIdTd.textContent || userIdTd.innerText : '';
      const namaText = namaTd ? namaTd.textContent || namaTd.innerText : '';
      const roleText = roleTd ? roleTd.textContent || roleTd.innerText : '';

      if (userIdText.toLowerCase().indexOf(filter) > -1 || 
          namaText.toLowerCase().indexOf(filter) > -1 || 
          roleText.toLowerCase().indexOf(filter) > -1) {
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