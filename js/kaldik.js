// Array penampung tanggal libur yang diunggah
let daftarHariLibur = JSON.parse(localStorage.getItem('kaldik_data')) || [
  { tanggal: "2026-08-17", keterangan: "HUT RI Ke-81", tipe: "Libur Nasional" },
  { tanggal: "2026-12-25", keterangan: "Hari Raya Natal", tipe: "Libur Nasional" }
];

// Fungsi mengecek apakah hari ini Libur
function isHariLibur(dateObj = new Date()) {
  const dayName = dateObj.getDay(); // 0 = Minggu, 6 = Sabtu
  const isSabtuLibur = document.getElementById('libur-sabtu')?.checked ?? true;
  const isMingguLibur = document.getElementById('libur-minggu')?.checked ?? true;

  // 1. Cek Libur Rutin Mingguan
  if (dayName === 0 && isMingguLibur) return { isLibur: true, alasan: "Libur Akhir Pekan (Minggu)" };
  if (dayName === 6 && isSabtuLibur) return { isLibur: true, alasan: "Libur Akhir Pekan (Sabtu)" };

  // 2. Cek Libur Kalender Pendidikan (YYYY-MM-DD)
  const dateStr = dateObj.toISOString().split('T')[0];
  const itemLibur = daftarHariLibur.find(item => item.tanggal === dateStr);
  
  if (itemLibur) {
    return { isLibur: true, alasan: itemLibur.keterangan };
  }

  return { isLibur: false, alasan: "Hari Efektif" };
}