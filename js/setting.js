// ============================================================================
// FILE: js/setting.js
// MODUL PENGATURAN SISTEM, KOP SURAT, KALENDER PENDIDIKAN & KEAMANAN
// ============================================================================

// Global Variable untuk menyimpan data Kalender Pendidikan
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

  // Helper aman membaca nilai elemen HTML
  const getVal = (id, fallback = '') => {
    const el = document.getElementById(id);
    return el && el.value !== undefined ? el.value.trim() : fallback;
  };

  const getCheck = (id) => {
    const el = document.getElementById(id);
    return el ? el.checked : true;
  };

  // 2. Susun Payload Pengaturan Sesuai Struktur Formulir HTML
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
      logoSekolah: getVal('set-logo-kanan', ''), // Logo Kanan / Logo Sekolah
      namaKepsek: getVal('set-nama-kepsek', ''),
      nipKepsek: getVal('set-nip-kepsek', ''),
      ttdKepsek: getVal('set-ttd-kepsek', '')
    },

    // Tema Dashboard
    tema: {
      mode: getVal('set-tema-mode', 'dark'),
      aksen: getVal('set-tema-aksen', 'default')
    },

    // Parameter Absensi
    parameter: {
      batasTelat: getVal('set-batas-telat', '07:15'),
      batasPulang: getVal('set-batas-pulang', '14:50')
    },

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
      alert('✅ Seluruh Pengaturan Sistem & Kop Laporan Berhasil Disimpan!');
      // Reload pengaturan di memori agar langsung aktif tanpa refresh
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
      const d = result.data;

      // 🌟 SIMPAN KE WINDOW OBJECT UNTUK MODUL CETAK PDF (unduhlaporan.js)
      window.appSettings = d;

      // Helper set input
      const setVal = (id, val) => {
        const el = document.getElementById(id);
        if (el && val !== undefined && val !== null) el.value = val;
      };

      // Helper set checkbox
      const setCheck = (id, val) => {
        const el = document.getElementById(id);
        if (el) el.checked = (val === true || String(val).toUpperCase() === 'TRUE');
      };

      // 🌟 POPULASI FORMULIR DENGAN VARIABEL DATABASE (MENDUKUNG KEY CAPITAL & CAMELCASE)
      setVal('set-instansi-atas', d.INSTANSI_ATAS || d.instansiAtas);
      setVal('set-dinas', d.DINAS || d.dinas);
      setVal('set-nama-sekolah', d.SCHOOL_NAME || d.namaSekolah);
      setVal('set-alamat-kop', d.SCHOOL_ADDRESS || d.alamatKop);
      setVal('set-website', d.WEBSITE || d.website);
      setVal('set-nomor-surat', d.NOMOR_SURAT || d.nomorSurat);

      setVal('set-logo-kiri', d.LOGO_KIRI || d.logoKiri);
      setVal('set-logo-kanan', d.SCHOOL_LOGO_URL || d.logoSekolah);
      setVal('set-nama-kepsek', d.HEADMASTER_NAME || d.namaKepsek);
      setVal('set-nip-kepsek', d.HEADMASTER_NIP || d.nipKepsek);
      setVal('set-ttd-kepsek', d.HEADMASTER_TTD || d.ttdKepsek);

      setVal('set-tema-mode', d.THEME_MODE || d.temaMode || 'dark');
      setVal('set-tema-aksen', d.THEME_ACCENT || d.temaAksen || 'default');

      setVal('set-batas-telat', d.ENTRY_TIME_LIMIT || d.batasTelat || '07:15');
      setVal('set-batas-pulang', d.EXIT_TIME_LIMIT || d.batasPulang || '14:50');

      setVal('set-mfa-siswa', d.MFA_STUDENT || d.mfaSiswa || 'rfid_face');
      setVal('set-mfa-guru', d.MFA_TEACHER || d.mfaGuru || 'finger_face');

      // Checkbox Anti-Manipulasi
      setCheck('anti-liveness', d.ANTI_LIVENESS !== undefined ? d.ANTI_LIVENESS : d.antiLiveness);
      setCheck('anti-fakegps', d.ANTI_FAKE_GPS !== undefined ? d.ANTI_FAKE_GPS : d.antiFakeGps);
      setCheck('anti-devicebind', d.ANTI_DEVICE_BIND !== undefined ? d.ANTI_DEVICE_BIND : d.antiDeviceBind);
      setCheck('anti-timesync', d.ANTI_TIME_SYNC !== undefined ? d.ANTI_TIME_SYNC : d.antiTimeSync);
      setCheck('anti-qr', d.ANTI_DYNAMIC_QR !== undefined ? d.ANTI_DYNAMIC_QR : d.antiQr);

      // Terapkan Tema Secara Realtime Jika Fungsi Tersedia
      const temaMode = d.THEME_MODE || d.temaMode;
      const temaAksen = d.THEME_ACCENT || d.temaAksen;
      if (temaMode && temaAksen && typeof terapkanTemaLive === 'function') {
        terapkanTemaLive(temaMode, temaAksen);
      }

      // Muat data Kalender Pendidikan / Hari Libur jika ada di return data
      if (d.kalenderPendidikan && Array.isArray(d.kalenderPendidikan)) {
        renderTabelKaldik(d.kalenderPendidikan);
      }
    }
  } catch (err) {
    console.error("Gagal memuat data pengaturan:", err);
  }
}

/**
 * 3. FUNGSI: PEMBACAAN UPLOAD FILE CSV KALENDER PENDIDIKAN
 */
function handleUploadKaldik(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const text = e.target.result;
    const lines = text.split('\n');
    const kaldikList = [];

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;
      
      const cols = line.split(';').map(c => c.replace(/"/g, '').trim());
      if (cols.length >= 2) {
        kaldikList.push({
          tanggal: cols[0],
          keterangan: cols[1],
          tipe: cols[2] || 'Libur Nasional'
        });
      }
    }

    if (kaldikList.length > 0) {
      renderTabelKaldik(kaldikList);
      alert(`✅ Berhasil membaca ${kaldikList.length} tanggal agenda/libur dari file CSV.`);
    } else {
      alert('⚠️ Format file CSV tidak valid atau kosong.');
    }
  };

  reader.readAsText(file);
}

/**
 * 4. FUNGSI: RENDER TABEL KALENDER PENDIDIKAN (HARI LIBUR)
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
  link.click();
}

// Otomatis jalankan pemuatan data saat halaman dimuat
document.addEventListener("DOMContentLoaded", function() {
  muatPengaturanLengkap();
});