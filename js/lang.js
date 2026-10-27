// ==========================================
// FILE: js/lang.js
// SISTERM TRANSLASI DUAL BAHASA (ID/EN)
// ==========================================

const dictionary = {
  id: {
    navAdminPanel: "⚙️ Admin Panel",
    navDashboardUtama: "🏠 Dashboard Utama",
    navManajemenData: "Manajemen Data",
    navDataSiswa: "🎓 Data Siswa",
    navDataGuru: "👔 Data Guru",
    navImportCsv: "📁 Import Data (CSV)",
    navPendaftaranKredensial: "Pendaftaran Kredensial",
    navDaftarWajah: "📸 Daftar Wajah (AI)",
    navDaftarFingerprint: "👆 Daftar Fingerprint",
    navDaftarRfid: "💳 Daftar RFID / NFC",
    navBuatBarcode: "🎫 Buat Barcode / QR",
    navManajemenUser: "Manajemen User",
    navAdminOperator: "🛡️ Admin & Operator",
    navHakAkses: "🔐 Hak Akses (Role)",
    navOperasionalAbsensi: "Operasional & Absensi",
    navLiveAbsen: "📺 Live Absen Monitor",
    navJadwalPelajaran: "📅 Jadwal Pelajaran",
    navManajemenGatePass: "🎟️ Manajemen Gate Pass",
    navAbsensiKelasSiswa: "📝 Absensi Kelas Siswa",
    navAbsensiManualGuru: "📝 Absensi Manual Guru",
    navSistemLaporan: "Sistem & Laporan",
    navLaporanAbsensi: "📊 Laporan Absensi",
    navPengaturan: "🛠 Pengaturan (Setting)",
    navBackupRestore: "💾 Backup & Restore",
    navNotifikasiWa: "💬 Notifikasi WhatsApp",
    navLokasiGeofencing: "📍 Lokasi & Geofencing",
    navKeluarSistem: "🚪 Keluar Sistem",

    dashTitle: "📊 Absensi Analytics Dashboard",
    btnHarian: "Harian",
    btnBulanan: "Bulanan",
    btnTahunan: "Tahunan",
    btnTampilkan: "Tampilkan Data",
    statSiswa: "Statistik Siswa",
    statGuru: "Statistik Guru & Staf"
  },
  en: {
    navAdminPanel: "⚙️ Admin Panel",
    navDashboardUtama: "🏠 Main Dashboard",
    navManajemenData: "Data Management",
    navDataSiswa: "🎓 Student Data",
    navDataGuru: "👔 Teacher Data",
    navImportCsv: "📁 Import Data (CSV)",
    navPendaftaranKredensial: "Credential Enrollment",
    navDaftarWajah: "📸 Face Recognition (AI)",
    navDaftarFingerprint: "👆 Fingerprint Enrollment",
    navDaftarRfid: "💳 RFID / NFC Enrollment",
    navBuatBarcode: "🎫 Generate Barcode / QR",
    navManajemenUser: "User Management",
    navAdminOperator: "🛡️ Admin & Operator",
    navHakAkses: "🔐 Access Roles",
    navOperasionalAbsensi: "Operational & Attendance",
    navLiveAbsen: "📺 Live Attendance Monitor",
    navJadwalPelajaran: "📅 Class Timetable",
    navManajemenGatePass: "🎟️ Gate Pass Management",
    navAbsensiKelasSiswa: "📝 Student Class Attendance",
    navAbsensiManualGuru: "📝 Teacher Manual Attendance",
    navSistemLaporan: "System & Reports",
    navLaporanAbsensi: "📊 Attendance Reports",
    navPengaturan: "🛠 System Settings",
    navBackupRestore: "💾 Backup & Restore",
    navNotifikasiWa: "💬 WhatsApp Notifications",
    navLokasiGeofencing: "📍 Location & Geofencing",
    navKeluarSistem: "🚪 Log Out",

    dashTitle: "📊 Attendance Analytics Dashboard",
    btnHarian: "Daily",
    btnBulanan: "Monthly",
    btnTahunan: "Yearly",
    btnTampilkan: "Show Data",
    statSiswa: "Student Statistics",
    statGuru: "Teacher & Staff Statistics"
  }
};

let currentLang = localStorage.getItem('app_lang') || 'id';

function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('app_lang', lang);
  applyLanguage();
}

function applyLanguage() {
  const langData = dictionary[currentLang];
  if (!langData) return;

  document.querySelectorAll('[data-lang]').forEach(elem => {
    const key = elem.getAttribute('data-lang');
    if (langData[key]) {
      if (elem.tagName === 'INPUT' && elem.hasAttribute('placeholder')) {
        elem.placeholder = langData[key];
      } else {
        elem.innerHTML = langData[key];
      }
    }
  });

  const btnId = document.getElementById('btn-lang-id');
  const btnEn = document.getElementById('btn-lang-en');
  if (btnId && btnEn) {
    btnId.style.background = currentLang === 'id' ? '#6c5ce7' : 'transparent';
    btnId.style.color = currentLang === 'id' ? '#ffffff' : '#a0aec0';
    btnEn.style.background = currentLang === 'en' ? '#6c5ce7' : 'transparent';
    btnEn.style.color = currentLang === 'en' ? '#ffffff' : '#a0aec0';
  }
}


document.addEventListener('DOMContentLoaded', () => {
  applyLanguage();
});

