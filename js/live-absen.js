// ==========================================
// MODUL LIVE ABSEN MONITOR REAL-TIME (GURU & SISWA)
// ==========================================

let liveAbsenInterval = null;
let rawLiveAbsenData = [];
let currentLiveRole = "GURU"; // Default awal: GURU

// 1. FUNGSI INISIALISASI SAAT TAB LIVE ABSEN DIKLIK
function initLiveAbsen() {
  loadLiveAbsenData();
  
  // Hentikan interval lama jika ada
  if (liveAbsenInterval) clearInterval(liveAbsenInterval);
  
  // Auto-refresh interval (polling) setiap 15 detik
  liveAbsenInterval = setInterval(() => {
    const liveTab = document.getElementById("live-absen");
    if (liveTab && liveTab.style.display !== "none") {
      loadLiveAbsenData(true); // true = reload otomatis tanpa menampilkan spinner/loading
    }
  }, 15000);
}

// 2. FUNGSI BERPINDAH SUB-TAB ROLE (GURU / SISWA)
function switchLiveRole(role) {
  currentLiveRole = role;
  
  const btnGuru = document.getElementById("btn-live-guru");
  const btnSiswa = document.getElementById("btn-live-siswa");

  if (!btnGuru || !btnSiswa) return;

  if (role === "GURU") {
    btnGuru.style.background = "#3498db";
    btnGuru.style.color = "white";
    btnSiswa.style.background = "#e0e0e0";
    btnSiswa.style.color = "#333";
  } else {
    btnSiswa.style.background = "#2ecc71";
    btnSiswa.style.color = "white";
    btnGuru.style.background = "#e0e0e0";
    btnGuru.style.color = "#333";
  }

  // Render ulang data kartu sesuai role terpilih
  renderLiveCards();
}

// 3. FUNGSI AMBIL DATA LOG ABSEN HARI INI DARI SERVER
async function loadLiveAbsenData(isSilent = false) {
  const container = document.getElementById("live-absen-grid");
  if (!isSilent && container) {
    container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #777;">🔄 Memuat log absensi real-time...</div>`;
  }

  try {
    const result = await fetchAPI("getTodayAttendanceLogs", {});
    
    if (result && result.success && Array.isArray(result.data)) {
      rawLiveAbsenData = result.data;
      renderLiveCards();
    } else {
      if (!isSilent && container) {
        container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #e74c3c;">Belum ada log absensi hari ini.</div>`;
      }
    }
  } catch (err) {
    console.error("Gagal memuat live absen:", err);
  }
}

// Helper konversi URL Google Drive ke Link Gambar Langsung (Anti-Error)
function fixDrivePhotoUrl(url) {
  try {
    if (!url || typeof url !== 'string') return '';
    let cleanUrl = url.trim();
    if (!cleanUrl) return '';
    
    // Jika sudah format lh3, langsung gunakan
    if (cleanUrl.includes('lh3.googleusercontent.com')) return cleanUrl;
    
    // Ekstrak ID File dari URL Drive
    let fileId = '';
    const matchD = cleanUrl.match(/\/d\/([^\/\?]+)/);
    const matchId = cleanUrl.match(/id=([^&]+)/);
    
    if (matchD && matchD[1]) fileId = matchD[1];
    else if (matchId && matchId[1]) fileId = matchId[1];
    
    return fileId ? 'https://lh3.googleusercontent.com/d/' + fileId : cleanUrl;
  } catch (e) {
    console.error("Error fixDrivePhotoUrl:", e);
    return url || '';
  }
}

// 4. FUNGSI FILTER DAN RENDER TAMPILAN KARTU ABSENSI
function renderLiveCards() {
  const searchElem = document.getElementById("filter-live-search");
  const searchFilter = searchElem ? searchElem.value.toLowerCase() : "";
  const container = document.getElementById("live-absen-grid");

  if (!container) return;

  // Filter 1: Pemisahan berdasarkan Role
  let filteredByRole = (rawLiveAbsenData || []).filter(item => {
    const roleItem = String(item.Role || "GURU").toUpperCase();
    return (currentLiveRole === "GURU") ? (roleItem === "GURU") : (roleItem === "SISWA");
  });

  // Hitung ulang statistik ringkasan khusus untuk role tersebut
  updateStatistikCounter(filteredByRole);

  // Filter 2: Pencarian Nama atau UserID
  let finalData = filteredByRole.filter(item => {
    return String(item.Nama || item.UserID || "").toLowerCase().includes(searchFilter);
  });

  if (finalData.length === 0) {
    container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #888;">Tidak ada data absensi untuk kategori <b>${currentLiveRole}</b> saat ini.</div>`;
    return;
  }

  // Render Kartu Tampilan Foto & Detail
  container.innerHTML = finalData.map(item => {
    const nama = item.Nama || item.UserID || "Tanpa Nama";
    const role = item.Role || currentLiveRole;
    const waktu = item.Timestamp || item.Time || "-";
    
    // Ambil foto dari berbagai kemungkinan nama kolom
    const rawFoto = item.Foto || item.ImageURL || item["Foto (URL)"] || item["Foto"] || "";
    const fotoProcessed = fixDrivePhotoUrl(rawFoto);
    const foto = fotoProcessed ? fotoProcessed : "https://via.placeholder.com/150?text=Foto+Tidak+Ada";

    const statusText = item["Status(Hadir/Telat/Izin/dll)"] || item.Status || item.Keterangan || "Hadir";
    const checkType = item["CheckType (IN/OUT)"] || "IN";

    let colorTheme = "#2ecc71"; // Hijau (Masuk Normal)
    let statusLabel = "✅ MASUK";

    const stLow = String(statusText).toLowerCase();
    const typeUp = String(checkType).toUpperCase();

    // Logika Warna Label Sesuai Tipe dan Status
    if (typeUp === "OUT") {
      if (stLow.includes("lembur") || stLow.includes("diperbarui")) {
        colorTheme = "#9b59b6"; // Ungu (Lembur)
        statusLabel = "🟣 PULANG LEMBUR";
      } else if (stLow.includes("awal")) {
        colorTheme = "#f39c12"; // Kuning (Pulang Awal)
        statusLabel = "🟡 PULANG AWAL";
      } else {
        colorTheme = "#3498db"; // Biru (Pulang Normal)
        statusLabel = "🔵 PULANG";
      }
    } else { // Jika IN (Masuk)
      if (stLow.includes("terlambat") || stLow.includes("telat")) {
        colorTheme = "#e74c3c"; // Merah (Terlambat)
        statusLabel = "🔴 TERLAMBAT";
      }
    }

    return `
      <div style="background: #fff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.08); border-top: 5px solid ${colorTheme}; display: flex; flex-direction: column;">
        <div style="position: relative; height: 180px; background: #222; overflow: hidden;">
          <img src="${foto}" alt="${nama}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='https://via.placeholder.com/150?text=Foto+Tidak+Ada'">
          <span style="position: absolute; top: 10px; right: 10px; background: ${colorTheme}; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.75em; font-weight: bold;">
            ${statusLabel}
          </span>
          <span style="position: absolute; bottom: 10px; left: 10px; background: rgba(0,0,0,0.7); color: white; padding: 3px 8px; border-radius: 4px; font-size: 0.75em;">
            ${role}
          </span>
        </div>
        <div style="padding: 15px; flex: 1; display: flex; flex-direction: column; justify-content: space-between;">
          <div>
            <h4 style="margin: 0 0 5px 0; color: #333; font-size: 1.1em;">${nama}</h4>
            <p style="margin: 0; color: #777; font-size: 0.85em;">⏰ ${waktu}</p>
          </div>
          <div style="margin-top: 10px; padding-top: 10px; border-top: 1px solid #eee; font-size: 0.8em; color: #555; display: flex; justify-content: space-between; align-items: center;">
            <span>ID: <b>${item.UserID || "-"}</b></span>
            <a href="${foto}" target="_blank" style="color: ${colorTheme}; text-decoration: none; font-weight: bold;">🔍 Lihat Foto</a>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

// 5. FUNGSI HITUNG COUNTER STATISTIK HARI INI
function updateStatistikCounter(data) {
  let masuk = 0, awalTelat = 0, pulang = 0, lembur = 0;

  data.forEach(item => {
    // 🌟 PERBAIKAN: Baca dari kolom Spreadsheet yang baru
    const status = String(item["Status(Hadir/Telat/Izin/dll)"] || item.Status || "").toLowerCase();
    const type = String(item["CheckType (IN/OUT)"] || "").toUpperCase();

    if (type === "OUT") {
      if (status.includes("lembur") || status.includes("diperbarui")) lembur++;
      else if (status.includes("awal")) awalTelat++; // Digabung ke blok Pulang Awal / Telat
      else pulang++;
    } else {
      if (status.includes("terlambat") || status.includes("telat")) awalTelat++; // Masuk telat
      else masuk++; // Tepat waktu
    }
  });

  const elMasuk = document.getElementById("count-masuk");
  const elAwal = document.getElementById("count-awal");
  const elPulang = document.getElementById("count-pulang");
  const elLembur = document.getElementById("count-lembur");

  if (elMasuk) elMasuk.innerText = masuk;
  if (elAwal) elAwal.innerText = awalTelat;
  if (elPulang) elPulang.innerText = pulang;
  if (elLembur) elLembur.innerText = lembur;
}