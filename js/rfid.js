// ==========================================
// FILE: js/rfid.js
// SINKRONISASI DENGAN HTML ENROLLMENT RFID / NFC
// ==========================================

// 1. Simpan Data RFID ke Database
async function registerCurrentRFID() {
  const userSelect = document.getElementById('rfidUserSelect'); // Pastikan ID ini sama dengan ID dropdown di HTML
  const rfidInput = document.getElementById('rfidUidInput');    // Pastikan ID ini sama dengan ID input teks di HTML
  const btnEnroll = document.getElementById('btnEnrollRFID');   // Pastikan ID ini sama dengan tombol simpan di HTML

  const userId = userSelect ? userSelect.value : "";
  const rfidUid = rfidInput ? rfidInput.value.trim() : "";

  // Validasi Input
  if (!userId) {
    alert("Silakan pilih Pengguna terlebih dahulu dari list dropdown!");
    return;
  }
  if (!rfidUid) {
    alert("Silakan tap kartu Anda ke scanner terlebih dahulu!");
    rfidInput.focus(); // Mengembalikan kursor ke kotak teks
    return;
  }

  // DETEKSI ROLE (GURU atau SISWA)
  const selectedText = userSelect.options[userSelect.selectedIndex].text.toLowerCase();
  let userRole = "Siswa"; // Default ke Siswa
  if (selectedText.includes('guru') || userId.toLowerCase().includes('guru') || userId.toLowerCase().includes('nip')) {
    userRole = "Guru";
  }

  btnEnroll.innerText = "⏳ Menyimpan ke Server...";
  btnEnroll.disabled = true;

  // Siapkan paket data untuk dikirim ke GAS
  const payload = {
    userId: userId,
    role: userRole,
    rfidUid: rfidUid
  };

  // Panggil endpoint registerRFID yang baru dibuat di router.gs
  const result = await fetchAPI("registerRFID", payload);

  if (result && result.success) {
    alert(`✅ ${result.message}`); // Pesan sukses dari server
    
    // Reset Kotak Input
    rfidInput.value = "";
    
    // Opsional: Langsung fokus kembali ke form jika ingin scan kartu pengguna lain secara cepat
    rfidInput.focus(); 
  } else {
    alert(`❌ Gagal Menyimpan: ${result?.message || 'Terjadi kesalahan koneksi'}`);
  }

  btnEnroll.innerText = "💾 Simpan Kartu";
  btnEnroll.disabled = false;
}


// ==========================================
// 2. FUNGSI: Muat Data Pengguna ke Dropdown RFID
// ==========================================
async function loadUserForRFID() {
  const selectElement = document.getElementById('rfidUserSelect'); // Pastikan ID dropdown sesuai
  
  if (!selectElement) return;

  selectElement.innerHTML = '<option value="">⏳ Memuat data dari database...</option>';

  try {
    // Memanggil API khusus RFID yang baru dibuat di router.gs
    const result = await fetchAPI("getRFIDUsers");
    
    if (result && result.success) {
      selectElement.innerHTML = '<option value="">-- Ketik atau Pilih Pengguna --</option>';
      
      let usersArray = [];

      // Mengekstrak data list Guru & Siswa
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

        // Aktifkan fitur pencarian (Search) bawaan Select2 (Jika Anda menggunakannya)
        if (typeof jQuery !== 'undefined' && typeof jQuery.fn.select2 !== 'undefined') {
          jQuery('#rfidUserSelect').select2({
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
// 3. EVENT LISTENER OTOMATIS
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  // 1. Langsung muat daftar dropdown saat halaman dibuka
  loadUserForRFID();

  // 2. OTOMATISASI SCANNER USB:
  // Sebagian besar scanner RFID USB memancarkan tombol "Enter" setelah mencetak nomor kartu.
  // Kode di bawah ini berguna agar tombol "Simpan Kartu" langsung tertekan otomatis.
  const rfidInput = document.getElementById('rfidUidInput');
  if (rfidInput) {
    // Memastikan kursor langsung siap di kotak saat halaman dibuka
    rfidInput.focus(); 

    rfidInput.addEventListener('keypress', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault(); // Mencegah reload halaman
        registerCurrentRFID(); // Panggil fungsi simpan
      }
    });
  }
});