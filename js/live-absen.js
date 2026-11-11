// ==========================================
// MODUL LIVE ABSEN MONITOR REAL-TIME (GURU, TU & SISWA)
// ==========================================

let liveAbsenInterval = null;
let rawLiveAbsenData = [];
let currentLiveRole = "GURU"; // Default awal: GURU & STAF TU

// 🌟 VARIABEL GLOBAL UNTUK MODUL CETAK UNDUHLAPORAN.JS
window.dataLiveAbsenAktif = [];
window.currentLiveRole = "GURU";

// 1. FUNGSI INISIALISASI SAAT TAB LIVE ABSEN DIKLIK
function initLiveAbsen() {
  loadLiveAbsenData();
  
  // Hentikan interval lama jika ada
  if (liveAbsenInterval) clearInterval(liveAbsenInterval);
  
  // Auto-refresh interval (polling) setiap 15 detik
  liveAbsenInterval = setInterval(() => {
    const liveTab = document.getElementById("live-absen");
    if (liveTab && liveTab.style.display !== "none") {
      loadLiveAbsenData(true); // true = reload otomatis tanpa spinner
    }
  }, 15000);
}

// 2. FUNGSI BERPINDAH SUB-TAB ROLE (GURU & STAF / SISWA)
function switchLiveRole(role) {
  currentLiveRole = role;
  window.currentLiveRole = role; // 🌟 Simpan variabel ke window
  
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
      window.dataLiveAbsenAktif = []; // 🌟 Kosongkan jika tidak ada data
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
    
    if (cleanUrl.includes('lh3.googleusercontent.com')) return cleanUrl;
    
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

  // 🌟 Filter 1: Pemisahan Role (GURU + TENAGA KEPENDIDIKAN / TU DITAMPILKAN DI TAB GURU & STAF)
  let filteredByRole = (rawLiveAbsenData || []).filter(item => {
    const roleItem = String(item.Role || item.role || "").toUpperCase();
    const idItem = String(item.UserID || item.userId || "").toUpperCase();
    
    const isTUorGuru = roleItem.includes("GURU") || 
                       roleItem.includes("TENAGA") || 
                       roleItem.includes("TU") || 
                       idItem.startsWith("TU-");

    if (currentLiveRole === "GURU") {
      return isTUorGuru;
    } else {
      return !isTUorGuru || roleItem.includes("SISWA");
    }
  });

  // Hitung ulang statistik ringkasan khusus untuk role tersebut
  updateStatistikCounter(filteredByRole);

  // Filter 2: Pencarian Nama atau UserID
  let finalData = filteredByRole.filter(item => {
    return String(item.Nama || item.UserID || "").toLowerCase().includes(searchFilter);
  });

  // 🌟 SIMPAN DATA TERATUR KELUARAN KE WINDOW AGAR BISA DICETAK PDF SECARA PRESISI
  window.dataLiveAbsenAktif = finalData;

  if (finalData.length === 0) {
    container.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: #888;">Tidak ada data absensi untuk kategori <b>${currentLiveRole === 'GURU' ? 'Guru & Staf TU' : 'Siswa'}</b> saat ini.</div>`;
    return;
  }

  // Render Kartu Tampilan Foto & Detail
  container.innerHTML = finalData.map(item => {
    const nama = item.Nama || item.UserID || "Tanpa Nama";
    const rawRole = String(item.Role || item.role || "").toUpperCase();
    const userID = String(item.UserID || "-");
    
    // 🌟 Normalisasi Label Peran (Menampilkan 'Tenaga Kependidikan' jika ID TU- atau Staf)
    let displayRole = item.Role || "Guru";
    if (userID.toUpperCase().startsWith("TU-") || rawRole.includes("TENAGA") || rawRole.includes("TU")) {
      displayRole = "Tenaga Kependidikan";
    }

    const waktu = item.Timestamp || item.Time || "-";
    
    const rawFoto = item.Foto || item.ImageURL || item["Foto (URL)"] || item["Foto"] || "";
    const fotoProcessed = fixDrivePhotoUrl(rawFoto);
    const foto = fotoProcessed ? fotoProcessed : "https://via.placeholder.com/150?text=Foto+Tidak+Ada";

    const statusText = item["Status(Hadir/Telat/Izin/dll)"] || item.Status || item.Keterangan || "Hadir";
    const checkType = item["CheckType (IN/OUT)"] || "IN";

    let colorTheme = "#2ecc71"; // Hijau (Masuk Normal)
    let statusLabel = "✅ MASUK";

    const stLow = String(statusText).toLowerCase();
    const typeUp = String(checkType).toUpperCase();

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
    } else {
      if (stLow.includes("terlambat") || stLow.includes("telat")) {
        colorTheme = "#e74c3c"; // Merah (Terlambat)
        statusLabel = "🔴 TERLAMBAT";
      }
    }

    // 🌟 Penentuan NIP / NISN & Label Dinamis
    const isSiswa = currentLiveRole === "SISWA" || rawRole.includes("SISWA");
    const labelIdentitas = isSiswa ? "NISN" : "NIP";
    const nomorIdentitas = item.NIP || item.nip || item.NISN || item.nisn || item["NIP/NISN"] || "-";

    return `
      <div class="live-card" style="background: #1e1b2e; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 14px rgba(0,0,0,0.3); border: 1px solid #2d2643; border-top: 5px solid ${colorTheme}; display: flex; flex-direction: column;">
        
        <!-- FOTO DAN BADGE STATUS -->
        <div style="position: relative; height: 180px; background: #0f0c1b; overflow: hidden;">
          <img src="${foto}" alt="${nama}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.src='https://via.placeholder.com/150?text=Foto+Tidak+Ada'">
          
          <span class="status" style="position: absolute; top: 10px; right: 10px; background: ${colorTheme}; color: #ffffff; padding: 6px 12px; border-radius: 6px; font-size: 0.85em; font-weight: 800; letter-spacing: 0.5px; box-shadow: 0 2px 8px rgba(0,0,0,0.4); text-transform: uppercase;">
            ${statusLabel}
          </span>
          
          <span class="role" style="position: absolute; bottom: 10px; left: 10px; background: rgba(0, 0, 0, 0.75); color: #a29bfe; border: 1px solid rgba(255, 255, 255, 0.2); padding: 4px 10px; border-radius: 6px; font-size: 0.75em; font-weight: 600;">
            ${displayRole}
          </span>
        </div>

        <!-- DETAIL INFORMASI -->
        <div style="padding: 15px; flex: 1; display: flex; flex-direction: column; justify-content: space-between; background: #1e1b2e;">
          <div>
            <h4 class="nama" style="margin: 0 0 6px 0; color: #ffffff !important; font-size: 1.15em; font-weight: 700; line-height: 1.3;">
              ${nama}
            </h4>
            
            <p class="waktu" style="margin: 0; color: #a29bfe !important; font-size: 0.9em; font-weight: 600;">
              ⏰ ${waktu}
            </p>
          </div>

          <!-- FOOTER KARTU (LABEL DINAMIS NIP / NISN) -->
          <div style="margin-top: 12px; padding-top: 10px; border-top: 1px solid #2d2643; font-size: 0.82em; color: #b2bec3; display: flex; flex-direction: column; gap: 4px;">
            <div style="display: flex; justify-content: space-between; align-items: center;">
              <span class="id">ID: <b style="color: #ffffff;">${userID}</b></span>
              <a href="${foto}" target="_blank" style="color: #00cec9; text-decoration: none; font-weight: bold; background: rgba(0, 206, 201, 0.1); padding: 3px 8px; border-radius: 4px; font-size: 0.9em;">
                🔍 Foto
              </a>
            </div>
            
            <!-- 🌟 MENAMPILKAN LABEL SESUAI ROLE (NIP UNTUK GURU, NISN UNTUK SISWA) -->
            <div style="color: #81ecec; font-size: 0.95em;">
              ${labelIdentitas}: <b>${nomorIdentitas}</b>
            </div>
          </div>
        </div>
      </div>
    `;
  }).join("");
}

// 5. FUNGSI HITUNG COUNTER STATISTIK HARI INI
function updateStatistikCounter(data) {
  let masuk = 0, awalTelat = 0, pulang = 0, lembur = 0;

  (data || []).forEach(item => {
    const status = String(item["Status(Hadir/Telat/Izin/dll)"] || item.Status || "").toLowerCase();
    const type = String(item["CheckType (IN/OUT)"] || "").toUpperCase();

    if (type === "OUT") {
      if (status.includes("lembur") || status.includes("diperbarui")) lembur++;
      else if (status.includes("awal")) awalTelat++;
      else pulang++;
    } else {
      if (status.includes("terlambat") || status.includes("telat")) awalTelat++;
      else masuk++;
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