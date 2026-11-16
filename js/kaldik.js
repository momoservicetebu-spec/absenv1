// ==========================================
// FILE: js/kaldik.js
// PENGECEKAN HARI LIBUR & KALENDER PENDIDIKAN (SINKRON DENGAN SETTING.JS)
// ==========================================

function getDaftarHariLibur_() {
  if (Array.isArray(window.dataKaldikAktif) && window.dataKaldikAktif.length > 0) {
    return window.dataKaldikAktif;
  }
  try {
    const saved = JSON.parse(localStorage.getItem('kaldik_data'));
    if (Array.isArray(saved) && saved.length > 0) return saved;
  } catch (e) {}

  return [
    { tanggal: "2026-08-17", keterangan: "HUT RI Ke-81", tipe: "Libur Nasional" },
    { tanggal: "2026-12-25", keterangan: "Hari Raya Natal", tipe: "Libur Nasional" }
  ];
}

// Fungsi mengecek apakah tanggal tertentu adalah Hari Libur
function isHariLibur(dateObj = new Date(), roleUser = 'GURU') {
  const dayName = dateObj.getDay(); // 0 = Minggu, 6 = Sabtu

  // 1. Cek status Sabtu dari checkbox Settings atau cache (default: Sabtu libur / 5 hari kerja)
  let isSabtuLibur = true;
  const elSabtuAktif = document.getElementById('set-aktif-sabtu');
  if (elSabtuAktif) {
    isSabtuLibur = !elSabtuAktif.checked;
  } else {
    try {
      const cached = JSON.parse(localStorage.getItem('app_settings_cache') || '{}');
      if (cached.jadwalHarian && cached.jadwalHarian.sabtu !== undefined) {
        isSabtuLibur = !cached.jadwalHarian.sabtu.aktif;
      } else if (cached.JADWAL_SABTU_AKTIF !== undefined) {
        isSabtuLibur = !(cached.JADWAL_SABTU_AKTIF === true || String(cached.JADWAL_SABTU_AKTIF).toUpperCase() === 'TRUE');
      }
    } catch (e) {}
  }

  if (dayName === 0) {
    return { isLibur: true, alasan: "Libur Akhir Pekan (Minggu)", tipe: "Akhir Pekan" };
  }
  if (dayName === 6 && isSabtuLibur) {
    return { isLibur: true, alasan: "Libur Akhir Pekan (Sabtu - 5 Hari Kerja)", tipe: "Akhir Pekan" };
  }

  // 2. Format tanggal lokal YYYY-MM-DD (anti pergeseran jam UTC)
  const yyyy = dateObj.getFullYear();
  const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
  const dd = String(dateObj.getDate()).padStart(2, '0');
  const dateStr = `${yyyy}-${mm}-${dd}`;

  const daftarLibur = getDaftarHariLibur_();
  const itemLibur = daftarLibur.find(item => String(item.tanggal).trim() === dateStr);

  if (itemLibur) {
    const tipe = String(itemLibur.tipe || 'Libur Nasional').trim();
    const tipeUpper = tipe.toUpperCase();

    // Agenda Sekolah / Rapat / Upacara tetap hari efektif
    if (tipeUpper.includes('AGENDA') || tipeUpper.includes('RAPAT') || tipeUpper.includes('UPACARA')) {
      return { isLibur: false, alasan: `Hari Efektif (${itemLibur.keterangan})`, tipe: tipe };
    }

    // Libur Semester hanya berlaku bagi Guru & Siswa; Tendik tetap masuk kerja
    const isTendik = /TENDIK|ADMIN|TU|STAF|OPERATOR/i.test(String(roleUser || ''));
    if (tipeUpper.includes('SEMESTER') && isTendik) {
      return { isLibur: false, alasan: `Hari Efektif Tendik (${itemLibur.keterangan})`, tipe: tipe };
    }

    return { isLibur: true, alasan: itemLibur.keterangan, tipe: tipe };
  }

  return { isLibur: false, alasan: "Hari Efektif", tipe: "Efektif" };
}

// ==========================================
// FILE: js/kaldik.js
// FUNGSI UNDUH TEMPLATE CSV KALENDER PENDIDIKAN
// ==========================================

function downloadTemplateKaldik() {
  // Isi struktur data CSV template
  const csvContent = "tanggal;keterangan;tipe\n" +
                     "2026-08-17;HUT Kemerdekaan RI Ke-81;Libur Nasional\n" +
                     "2026-10-01;Hari Kesaktian Pancasila;Agenda Sekolah\n" +
                     "2026-12-25;Hari Raya Natal;Libur Nasional\n" +
                     "2027-01-01;Tahun Baru 2027;Libur Nasional";

  // Buat Blob data CSV
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  
  // Buat elemen anchor unduhan virtual
  const link = document.createElement("a");
  link.setAttribute("href", url);
  link.setAttribute("download", "Template_Kalender_Pendidikan.csv");
  document.body.appendChild(link);
  
  // Triger unduh otomatis
  link.click();
  document.body.removeChild(link);
}