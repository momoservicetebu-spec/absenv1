// ==========================================
// FILE: js/lang.js
// TUGAS: Translasikan Seluruh Web App (ID <-> EN)
// ==========================================

const dictionary = {
  id: {
    // --- SIDEBAR NAVIGASI ---
    navAdminPanel: "⚙️ Admin Panel",
    navDashboardUtama: "Dashboard Utama",
    navManajemenData: "MANAJEMEN DATA",
    navDataSiswa: "Data Siswa",
    navDataGuru: "Data Guru",
    navImportCsv: "Import Data (CSV)",
    navPendaftaranKredensial: "PENDAFTARAN KREDENSIAL",
    navDaftarWajah: "Daftar Wajah (AI)",
    navDaftarFingerprint: "Daftar Fingerprint",
    navDaftarRfid: "Daftar RFID / NFC",
    navBuatBarcode: "Buat Barcode / QR",
    navManajemenUser: "MANAJEMEN USER",
    navAdminOperator: "Admin & Operator",
    navHakAkses: "Hak Akses (Role)",
    navOperasionalAbsensi: "OPERASIONAL & ABSENSI",
    navLiveAbsen: "Live Absen Monitor",
    navJadwalPelajaran: "Jadwal Pelajaran",
    navManajemenGatePass: "Manajemen Gate Pass",
    navAbsensiKelasSiswa: "Absensi Kelas Siswa",
    navAbsensiManualGuru: "Absensi Manual Guru",
    navSistemLaporan: "SISTEM & LAPORAN",
    navLaporanAbsensi: "Laporan Absensi",
    navPengaturan: "Pengaturan (Setting)",
    navBackupRestore: "Backup & Restore",
    navNotifikasiWa: "Notifikasi WhatsApp",
    navLokasiGeofencing: "Lokasi & Geofencing",
    navKeluarSistem: "Keluar Sistem",

    // --- DASHBOARD ANALYTICS ---
    dashTitle: "Absensi Analytics Dashboard",
    btnHarian: "Harian",
    btnBulanan: "Bulanan",
    btnTahunan: "Tahunan",
    btnTampilkan: "Tampilkan Data",
    statSiswa: "Statistik Siswa",
    statGuru: "Statistik Guru & Staf",
    lblTotal: "TOTAL",
    lblHadir: "HADIR",
    lblTelat: "TELAT",
    lblAlpa: "ALPA",
    lblCuti: "CUTI/DL",

    // --- ENROLLMENT RFID ---
    rfidTitle: "💳 Pendaftaran Kartu RFID / NFC",
    rfidDesc: "Tempelkan kartu pelajar/guru ke alat pembaca (RFID Reader USB).",
    rfidSelectUser: "Pilih Pengguna",
    rfidUidLabel: "UID Kartu (Tap Kartu Sekarang)",
    rfidBtnSave: "💾 Simpan Kartu",
    rfidTableTitle: "📋 Data Kartu Terdaftar",
    
    // --- TABEL ---
    tblNo: "NO",
    tblUserId: "USERID",
    tblNama: "NAMA",
    tblRole: "ROLE",
    tblUidKartu: "UID KARTU",
    tblStatus: "STATUS",
    tblAksi: "AKSI",
    btnEdit: "Edit",
    btnHapus: "Hapus"
  },

  en: {
    // --- SIDEBAR NAVIGATION ---
    navAdminPanel: "⚙️ Admin Panel",
    navDashboardUtama: "Main Dashboard",
    navManajemenData: "DATA MANAGEMENT",
    navDataSiswa: "Student Data",
    navDataGuru: "Teacher Data",
    navImportCsv: "Import Data (CSV)",
    navPendaftaranKredensial: "CREDENTIAL ENROLLMENT",
    navDaftarWajah: "Face Recognition (AI)",
    navDaftarFingerprint: "Fingerprint Registration",
    navDaftarRfid: "RFID / NFC Enrollment",
    navBuatBarcode: "Generate Barcode / QR",
    navManajemenUser: "USER MANAGEMENT",
    navAdminOperator: "Admin & Operator",
    navHakAkses: "Access Roles",
    navOperasionalAbsensi: "OPERATIONAL & ATTENDANCE",
    navLiveAbsen: "Live Attendance Monitor",
    navJadwalPelajaran: "Class Timetable",
    navManajemenGatePass: "Gate Pass Management",
    navAbsensiKelasSiswa: "Student Class Attendance",
    navAbsensiManualGuru: "Teacher Manual Attendance",
    navSistemLaporan: "SYSTEM & REPORTS",
    navLaporanAbsensi: "Attendance Reports",
    navPengaturan: "Settings",
    navBackupRestore: "Backup & Restore",
    navNotifikasiWa: "WhatsApp Notifications",
    navLokasiGeofencing: "Location & Geofencing",
    navKeluarSistem: "Log Out",

    // --- DASHBOARD ANALYTICS ---
    dashTitle: "Attendance Analytics Dashboard",
    btnHarian: "Daily",
    btnBulanan: "Monthly",
    btnTahunan: "Yearly",
    btnTampilkan: "Show Data",
    statSiswa: "Student Statistics",
    statGuru: "Teacher & Staff Statistics",
    lblTotal: "TOTAL",
    lblHadir: "PRESENT",
    lblTelat: "LATE",
    lblAlpa: "ABSENT",
    lblCuti: "LEAVE",

    // --- RFID ENROLLMENT ---
    rfidTitle: "💳 RFID / NFC Card Enrollment",
    rfidDesc: "Tap the student/teacher card onto the USB RFID Reader.",
    rfidSelectUser: "Select User",
    rfidUidLabel: "Card UID (Tap Card Now)",
    rfidBtnSave: "💾 Save Card",
    rfidTableTitle: "📋 Registered Cards Data",

    // --- TABLES ---
    tblNo: "NO",
    tblUserId: "USER ID",
    tblNama: "NAME",
    tblRole: "ROLE",
    tblUidKartu: "CARD UID",
    tblStatus: "STATUS",
    tblAksi: "ACTION",
    btnEdit: "Edit",
    btnHapus: "Delete"
  }
};

// Ambil bahasa tersimpan atau default ke 'id'
let currentLang = localStorage.getItem('app_lang') || 'id';

function setLanguage(lang) {
  currentLang = lang;
  localStorage.setItem('app_lang', lang);
  applyLanguage();
}

function applyLanguage() {
  const langData = dictionary[currentLang];
  if (!langData) return;

  // Ubah seluruh elemen yang punya atribut data-lang
  document.querySelectorAll('[data-lang]').forEach(elem => {
    const key = elem.getAttribute('data-lang');
    if (langData[key]) {
      // Jika elemen berupa input/placeholder
      if (elem.tagName === 'INPUT' && elem.hasAttribute('placeholder')) {
        elem.placeholder = langData[key];
      } else {
        elem.innerText = langData[key];
      }
    }
  });

  // Update indikator visual tombol ID/EN
  const btnId = document.getElementById('btn-lang-id');
  const btnEn = document.getElementById('btn-lang-en');
  if (btnId && btnEn) {
    btnId.style.background = currentLang === 'id' ? '#6c5ce7' : '#2d2b42';
    btnEn.style.background = currentLang === 'en' ? '#6c5ce7' : '#2d2b42';
  }
}

// Otomatis terapkan bahasa saat halaman dimuat
document.addEventListener('DOMContentLoaded', () => {
  applyLanguage();
});