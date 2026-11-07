// ============================================================================
// FILE: js/setting.js
// MODUL PENGATURAN SISTEM, JADWAL HARIAN (SENIN-SABTU), KALENDER PENDIDIKAN & TEMA
// ============================================================================

window.dataKaldikAktif = [];

/**
 * 1. FUNGSI: SIMPAN SELURUH PENGATURAN KE DATABASE GOOGLE SHEETS
 */
async function simpanPengaturanLengkap() {
  const btnSimpan = document.querySelector('button[onclick="simpanPengaturanLengkap()"]');
  const textAsli = btnSimpan ? btnSimpan.innerHTML : '💾 Simpan Seluruh Pengaturan'; 
  
  if (btnSimpan) {
    btnSimpan.innerHTML = '⏳ Menyimpan ke Database...';
    btnSimpan.disabled = true;
    btnSimpan.style.opacity = '0.7';
  }

  // 1. Ambil data sesi pengguna
  let userSessionData = localStorage.getItem('user_session') || sessionStorage.getItem('user_session');
  let userRole = 'Superadmin';
  let username = 'admin';

  if (userSessionData) {
    try {
      const parsedSession = JSON.parse(userSessionData);
      userRole = parsedSession.role || 'Superadmin';
      username = parsedSession.username || 'admin';
    } catch (e) {
      console.error("Gagal membaca session:", e);
    }
  }

  // Helper membaca nilai elemen HTML
  const getVal = (id, fallback = '') => {
    const el = document.getElementById(id);
    return el && el.value !== undefined ? el.value.trim() : fallback;
  };

  const getCheck = (id, fallback = true) => {
  const el = document.getElementById(id);
  return el ? el.checked : fallback;
};

  // 🌟 BACAKAN JADWAL HARIAN SENIN SAMPAI SABTU DARI TABEL FORMULIR
  const daftarHari = ['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];
  let jadwalHarian = {};
 daftarHari.forEach(hari => {
  // Sabtu default false, Senin-Jumat default true
  const defaultAktif = (hari !== 'sabtu');
  jadwalHarian[hari] = {
    aktif: getCheck(`set-aktif-${hari}`, defaultAktif),
    masuk: getVal(`set-masuk-${hari}`, '07:15'),
    pulang: getVal(`set-pulang-${hari}`, hari === 'jumat' ? '11:14' : '14:50')
  };
});

  // 2. Susun Payload Pengaturan Sesuai Struktur Database
  const payloadPengaturan = {
    action: "saveSettings", 
    roleAktif: userRole,
    role: userRole,
    token: userSessionData,
    username: username,

    // Identitas Sekolah & Kop Laporan
    identitas: {
      instansiAtas: getVal('set-instansi-atas', 'PEMERINTAH PROVINSI LAMPUNG'),
      dinas: getVal('set-dinas', 'DINAS PENDIDIKAN DAN KEBUDAYAAN'),
      namaSekolah: getVal('set-nama-sekolah', 'SMA Negeri 1 Contoh'),
      alamatKop: getVal('set-alamat-kop', ''),
      website: getVal('set-website', ''),
      nomorSurat: getVal('set-nomor-surat', ''),
      logoKiri: getVal('set-logo-kiri', ''),
      logoSekolah: getVal('set-logo-kanan', ''), 
      namaKepsek: getVal('set-nama-kepsek', ''),
      nipKepsek: getVal('set-nip-kepsek', ''),
      ttdKepsek: getVal('set-ttd-kepsek', '')
    },

    // Tema Dashboard
    tema: {
      mode: getVal('set-tema-mode', 'dark'),
      aksen: getVal('set-tema-aksen', 'default')
    },

    // 🌟 JADWAL HARIAN HARIAN & KALENDER PENDIDIKAN
    jadwalHarian: jadwalHarian,
    kalenderPendidikan: window.dataKaldikAktif || [],

    // Keamanan MFA & Anti-Manipulasi
    keamanan: {
      mfaSiswa: getVal('set-mfa-siswa', 'rfid_face'),
      mfaGuru: getVal('set-mfa-guru', 'finger_face'),
      antiLiveness: getCheck('anti-liveness'),
      antiFakeGps: getCheck('anti-fakegps'),
      antiDeviceBind: getCheck('anti-devicebind'),
      antiTimeSync: getCheck('anti-timesync'),
      antiQr: getCheck('anti-qr')
    }
  };

  const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxx3BLAOh7RZwF2vvukhDPhytbAPXfMP3H_RAJNeWgxLe2LNcCzojm-6HQ1kktPQMTQ/exec';

  try {
    const response = await fetch(WEB_APP_URL, { 
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payloadPengaturan)
    });

    const result = await response.json();

    if (result.success || result.status === 'success') {
      alert('✅ Seluruh Pengaturan Sistem & Jadwal Absensi Harian Berhasil Disimpan!');
      await muatPengaturanLengkap();
    } else {
      alert('❌ Gagal menyimpan pengaturan: ' + (result.message || 'Error tidak diketahui'));
    }

  } catch (error) {
    console.error("Error simpanPengaturanLengkap:", error);
    alert('⚠️ Terjadi kesalahan koneksi saat menyimpan pengaturan.');
  } finally {
    if (btnSimpan) {
      btnSimpan.innerHTML = textAsli;
      btnSimpan.disabled = false;
      btnSimpan.style.opacity = '1';
    }
  }
}
/**
 * 2. FUNGSI: MUAT PENGATURAN (SINKRONKAN DATABASE "SETTINGS" DENGAN ELEMENT HTML)
 */
async function muatPengaturanLengkap() {
  try {
    const WEB_APP_URL = 'https://script.google.com/macros/s/AKfycbxx3BLAOh7RZwF2vvukhDPhytbAPXfMP3H_RAJNeWgxLe2LNcCzojm-6HQ1kktPQMTQ/exec';
    
    const response = await fetch(`${WEB_APP_URL}?action=ambilPengaturan`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({}) 
    });
    
    const result = await response.json();

    if ((result.success || result.status === 'success') && result.data) {
      // Ambil objek data (dukung jika dibungkus result.data atau result.data.data)
      const d = result.data.data || result.data;

      // 🌟 SIMPAN KE WINDOW OBJECT UNTUK MODUL CETAK PDF (unduhlaporan.js)
      window.appSettings = d;

      // Helper set input aman
      const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el && val !== undefined && val !== null && val !== "") {
          el.value = val;
        }
      };

      // Helper set checkbox aman
      const setCheck = (id, val) => {
        const el = document.getElementById(id);
        if (el) {
          el.checked = (val === true || String(val).toUpperCase() === 'TRUE');
        }
      };

      // 🌟 1. POPULASI FORMULIR IDENTITAS SEKOLAH (MENDUKUNG OBJECT NESTED & FLAT CAPITAL KEY)
      const idt = d.identitas || {};
      setVal('set-instansi-atas', idt.instansiAtas || d.INSTANSI_ATAS);
      setVal('set-dinas', idt.dinas || d.DINAS);
      setVal('set-nama-sekolah', idt.namaSekolah || d.SCHOOL_NAME);
      setVal('set-alamat-kop', idt.alamatKop || d.SCHOOL_ADDRESS);
      setVal('set-website', idt.website || d.WEBSITE);
      setVal('set-nomor-surat', idt.nomorSurat || d.NOMOR_SURAT);

      setVal('set-logo-kiri', idt.logoKiri || d.LOGO_KIRI);
      setVal('set-logo-kanan', idt.logoSekolah || d.SCHOOL_LOGO_URL || d.LOGO_KANAN);
      setVal('set-nama-kepsek', idt.namaKepsek || d.HEADMASTER_NAME);
      setVal('set-nip-kepsek', idt.nipKepsek || d.HEADMASTER_NIP);
      setVal('set-ttd-kepsek', idt.ttdKepsek || d.TTD_KEPSEK);

      // 🌟 2. POPULASI TEMA
      const tm = d.tema || {};
      setVal('set-tema-mode', tm.mode || d.THEME_MODE || 'dark');
      setVal('set-tema-aksen', tm.aksen || d.THEME_ACCENT || 'default');

      // 🌟 3. POPULASI JADWAL HARIAN SENIN SAMPAI SABTU
      const daftarHari = ['senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];
      daftarHari.forEach(hari => {
        let hUpper = hari.toUpperCase();
        let keyAktif = `JADWAL_${hUpper}_AKTIF`;
        let keyMasuk = `JADWAL_${hUpper}_MASUK`;
        let keyPulang = `JADWAL_${hUpper}_PULANG`;

        if (d.jadwalHarian && d.jadwalHarian[hari]) {
          setCheck(`set-aktif-${hari}`, d.jadwalHarian[hari].aktif);
          setVal(`set-masuk-${hari}`, d.jadwalHarian[hari].masuk);
          setVal(`set-pulang-${hari}`, d.jadwalHarian[hari].pulang);
        } else {
          if (d[keyAktif] !== undefined) setCheck(`set-aktif-${hari}`, d[keyAktif]);
          if (d[keyMasuk]) setVal(`set-masuk-${hari}`, d[keyMasuk]);
          if (d[keyPulang]) setVal(`set-pulang-${hari}`, d[keyPulang]);
        }
      });

      // 🌟 4. POPULASI KEAMANAN MFA & ANTI-MANIPULASI
      const kmn = d.keamanan || {};
      setVal('set-mfa-siswa', kmn.mfaSiswa || d.MFA_STUDENT || 'rfid_face');
      setVal('set-mfa-guru', kmn.mfaGuru || d.MFA_TEACHER || 'finger_face');

      setCheck('anti-liveness', kmn.antiLiveness !== undefined ? kmn.antiLiveness : d.ANTI_LIVENESS);
      setCheck('anti-fakegps', kmn.antiFakeGps !== undefined ? kmn.antiFakeGps : d.ANTI_FAKE_GPS);
      setCheck('anti-devicebind', kmn.antiDeviceBind !== undefined ? kmn.antiDeviceBind : d.ANTI_DEVICE_BIND);
      setCheck('anti-timesync', kmn.antiTimeSync !== undefined ? kmn.antiTimeSync : d.ANTI_TIME_SYNC);
      setCheck('anti-qr', kmn.antiQr !== undefined ? kmn.antiQr : d.ANTI_DYNAMIC_QR);

      // Terapkan Tema Secara Realtime
      const temaMode = tm.mode || d.THEME_MODE;
      const temaAksen = tm.aksen || d.THEME_ACCENT;
      if (temaMode && temaAksen && typeof terapkanTemaLive === 'function') {
        terapkanTemaLive(temaMode, temaAksen);
      }

      // Render Kalender Pendidikan
      if (d.kalenderPendidikan && Array.isArray(d.kalenderPendidikan)) {
        renderTabelKaldik(d.kalenderPendidikan);
      }
    }
  } catch (err) {
    console.error("Gagal memuat data pengaturan:", err);
  }
}

/**
 * 3. FUNGSI: PEMBACAAN UPLOAD FILE CSV KALENDER PENDIDIKAN (HANDAL & AUTO-DELIMITER)
 */
function handleUploadKaldik(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    let text = e.target.result;
    
    // Hapus karakter tersembunyi UTF-8 BOM jika ada
    if (text.charCodeAt(0) === 0xFEFF) {
      text = text.substr(1);
    }

    // Normalisasi pemisah baris (\r\n menjadi \n)
    const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    const kaldikList = [];

    // Deteksi pemisah kolom otomatis (koma, titik koma, atau tab) dari baris pertama
    let delimiter = ';';
    if (lines[0]) {
      if (lines[0].indexOf(';') !== -1) delimiter = ';';
      else if (lines[0].indexOf(',') !== -1) delimiter = ',';
      else if (lines[0].indexOf('\t') !== -1) delimiter = '\t';
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      // Abaikan baris header jika berisi kata "TANGGAL" atau "DATE"
      if (i === 0 && (line.toUpperCase().includes("TANGGAL") || line.toUpperCase().includes("DATE"))) {
        continue;
      }
      
      const cols = line.split(delimiter).map(c => c.replace(/^"|"$/g, '').trim());
      
      if (cols.length >= 2 && cols[0] !== '') {
        kaldikList.push({
          tanggal: cols[0],
          keterangan: cols[1] || 'Libur Sekolah',
          tipe: cols[2] || 'Libur Sekolah'
        });
      }
    }

    if (kaldikList.length > 0) {
      renderTabelKaldik(kaldikList);
      alert(`✅ Berhasil memuat ${kaldikList.length} tanggal agenda/libur dari file CSV.`);
      // Reset value input file agar bisa upload file yang sama jika diperlukan
      event.target.value = '';
    } else {
      alert('⚠️ Format file CSV tidak valid atau kosong.\nPastikan file memiliki kolom Tanggal dan Keterangan.');
    }
  };

  reader.readAsText(file);
}

/**
 * 4. FUNGSI: RENDER TABEL KALENDER PENDIDIKAN
 */
function renderTabelKaldik(data) {
  window.dataKaldikAktif = data;
  const tbody = document.getElementById('table-kaldik-body');
  if (!tbody) return;

  if (!data || data.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" style="text-align: center; padding: 15px; color: #a29bfe;">Belum ada data kalender pendidikan dimuat.</td>
      </tr>`;
    return;
  }

  let html = '';
  data.forEach((item, index) => {
    html += `
      <tr style="border-bottom: 1px solid #4a4563;">
        <td style="padding: 8px 10px; border: 1px solid #4a4563; font-weight: bold; color: #feca57;">${item.tanggal}</td>
        <td style="padding: 8px 10px; border: 1px solid #4a4563; color: #ffffff;">${item.keterangan}</td>
        <td style="padding: 8px 10px; border: 1px solid #4a4563; color: #74b9ff;">${item.tipe || 'Libur Sekolah'}</td>
        <td style="padding: 8px 10px; border: 1px solid #4a4563; text-align: center;">
          <button type="button" onclick="hapusBarisKaldik(${index})" style="background: #ff7675; color: white; border: none; padding: 4px 8px; border-radius: 4px; cursor: pointer; font-size: 11px;">
            🗑 Hapus
          </button>
        </td>
      </tr>`;
  });

  tbody.innerHTML = html;
}

/**
 * 5. FUNGSI: HAPUS BARIS AGENDA KALDIK
 */
function hapusBarisKaldik(index) {
  if (window.dataKaldikAktif && window.dataKaldikAktif[index]) {
    window.dataKaldikAktif.splice(index, 1);
    renderTabelKaldik(window.dataKaldikAktif);
  }
}

/**
 * 6. FUNGSI: UNDUH TEMPLATE CSV KALENDER PENDIDIKAN
 */
function downloadTemplateKaldik() {
  const csvContent = "TANGGAL;KETERANGAN;TIPE\n2026-08-17;Hari Kemerdekaan RI;Libur Nasional\n2026-12-25;Hari Natal;Libur Nasional\n2026-06-20;Libur Semester Genap;Libur Semester";
  const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "Template_Kalender_Pendidikan.csv";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * 7. FUNGSI: TERAPKAN TEMA LIVE (MODE & AKSEN DYNAMIC CSS)
 */
function terapkanTemaLive(mode, aksen) {
  let bgBody = "#0f0c1b";
  let bgCard = "#1e1b2e";
  let bgInput = "#161224";
  let textMain = "#ffffff";
  let textMuted = "#a29bfe";
  let borderCol = "#2d2643";
  let shadow = "0 4px 14px rgba(0,0,0,0.3)";

  if (mode === "light") {
    bgBody = "#f4f6f9";
    bgCard = "#ffffff";
    bgInput = "#f1f3f6";
    textMain = "#2d3436";
    textMuted = "#636e72";
    borderCol = "#dfe6e9";
    shadow = "0 2px 10px rgba(0,0,0,0.05)";
  } else if (mode === "navy") {
    bgBody = "#0a192f";
    bgCard = "#112240";
    bgInput = "#0d1b2a";
    textMain = "#e6f1ff";
    textMuted = "#8892b0";
    borderCol = "#233554";
    shadow = "0 4px 14px rgba(0,0,0,0.4)";
  }

  let accentColor = "#6c5ce7";
  let accentHover = "#5b4bc4";
  let titleAccent = "#feca57";

  if (aksen === "blue") {
    accentColor = "#0984e3";
    accentHover = "#0768b5";
    titleAccent = "#74b9ff";
  } else if (aksen === "green") {
    accentColor = "#00b894";
    accentHover = "#009477";
    titleAccent = "#55efc4";
  } else if (aksen === "red") {
    accentColor = "#d63031";
    accentHover = "#b22627";
    titleAccent = "#ff7675";
  }

  let styleEl = document.getElementById("theme-style-dynamic");
  if (!styleEl) {
    styleEl = document.createElement("style");
    styleEl.id = "theme-style-dynamic";
    document.head.appendChild(styleEl);
  }

  const cssRules = `
    body, .main-content {
      background-color: ${bgBody} !important;
      color: ${textMain} !important;
      transition: background-color 0.3s ease, color 0.3s ease;
    }

    .card, .section, .analytics-table-wrap,
    div[style*="#2a2640"], 
    div[style*="#231f36"], 
    div[style*="#161224"] {
      background-color: ${bgCard} !important;
      border: 1px solid ${borderCol} !important;
      box-shadow: ${shadow} !important;
      color: ${textMain} !important;
    }

    input:not([type="checkbox"]):not([type="radio"]), select, textarea {
      background-color: ${bgInput} !important;
      color: ${textMain} !important;
      border: 1px solid ${borderCol} !important;
      border-radius: 6px !important;
      transition: border-color 0.2s ease, box-shadow 0.2s ease;
    }
    
    input:focus, select:focus {
      border-color: ${accentColor} !important;
      outline: none !important;
      box-shadow: 0 0 0 3px ${accentColor}33 !important;
    }

    button[onclick="simpanPengaturanLengkap()"], .btn-primary, .btn-action {
      background-color: ${accentColor} !important;
      color: #ffffff !important;
      border: none !important;
      border-radius: 6px !important;
      font-weight: 600 !important;
      cursor: pointer !important;
      transition: all 0.2s ease;
    }
    
    button[onclick="simpanPengaturanLengkap()"]:hover, .btn-primary:hover, .btn-action:hover {
      background-color: ${accentHover} !important;
    }

    h2, h3, .section-title {
      color: ${titleAccent} !important;
      border-bottom: 1px solid ${borderCol} !important;
    }
    
    label, .form-label {
      color: ${textMuted} !important;
    }

    .sidebar, #sidebar {
      background-color: ${bgCard} !important;
      border-right: 1px solid ${borderCol} !important;
    }

    .sidebar button:hover, .sidebar a:hover, .sidebar .menu-item:hover, .sidebar .active {
      background-color: ${accentColor} !important;
      color: #ffffff !important;
    }
  `;

  styleEl.innerHTML = cssRules;
}

// Event Listener Otomatis Saat DOM dimuat
document.addEventListener("DOMContentLoaded", function() {
  muatPengaturanLengkap();

  const selectMode = document.getElementById('set-tema-mode');
  const selectAksen = document.getElementById('set-tema-aksen');

  const updateTemaRealtime = () => {
    const mode = selectMode ? selectMode.value : 'dark';
    const aksen = selectAksen ? selectAksen.value : 'default';
    terapkanTemaLive(mode, aksen);
  };

  if (selectMode) selectMode.addEventListener('change', updateTemaRealtime);
  if (selectAksen) selectAksen.addEventListener('change', updateTemaRealtime);
});