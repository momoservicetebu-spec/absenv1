// ==========================================
// FILE: js/fingerprint.js
// LOGIKA PENDAFTARAN FINGERPRINT / SIDIK JARI
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  // 1. Muat daftar Siswa & Guru ke dropdown saat halaman terbuka
  loadFingerprintUserOptions();

  const fpInput = document.getElementById('fpStatusInput');

  // Scanner USB biasanya otomatis mengirim tombol 'Enter' setelah scan
  if (fpInput) {
    fpInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        simpanFingerprint();
      }
    });
  }
});

/**
 * Memuat data Siswa & Guru dari Database ke Dropdown #fpUserSelect
 */
async function loadFingerprintUserOptions() {
  const userSelect = document.getElementById("fpUserSelect");
  if (!userSelect) return;

  userSelect.innerHTML = '<option value="">⏳ Memuat data pengguna...</option>';

  try {
    const result = await fetchAPI("getAllUsers");

    if (result && result.success && result.data) {
      userSelect.innerHTML = '<option value="">-- Pilih Pengguna --</option>';

      const { siswa, guru } = result.data;

      // Group Guru
      if (guru && guru.length > 0) {
        const optGroupGuru = document.createElement('optgroup');
        optGroupGuru.label = "👨‍🏫 GURU / STAF";
        guru.forEach(g => {
          const id = g.GuruID || g.NIP || g.ID || "";
          const nama = g.Nama || g.NamaGuru || g.NamaLengkap || "";
          if (id) {
            const opt = document.createElement('option');
            opt.value = id;
            opt.textContent = `[GURU] ${id} - ${nama}`;
            optGroupGuru.appendChild(opt);
          }
        });
        userSelect.appendChild(optGroupGuru);
      }

      // Group Siswa
      if (siswa && siswa.length > 0) {
        const optGroupSiswa = document.createElement('optgroup');
        optGroupSiswa.label = "👨‍🎓 SISWA";
        siswa.forEach(s => {
          const id = s.SiswaID || s.NIS || s.ID || "";
          const nama = s.Nama || s.NamaSiswa || s.NamaLengkap || "";
          if (id) {
            const opt = document.createElement('option');
            opt.value = id;
            opt.textContent = `[SISWA] ${id} - ${nama}`;
            optGroupSiswa.appendChild(opt);
          }
        });
        userSelect.appendChild(optGroupSiswa);
      }
    } else {
      userSelect.innerHTML = '<option value="">❌ Gagal memuat data pengguna</option>';
    }
  } catch (err) {
    console.error("Error loadFingerprintUserOptions:", err);
    userSelect.innerHTML = '<option value="">❌ Error koneksi data pengguna</option>';
  }
}

/**
 * Memproses dan menyimpan mapping Fingerprint Pengguna ke Backend
 */
async function simpanFingerprint() {
  const userSelect = document.getElementById("fpUserSelect");
  const fpInput = document.getElementById("fpStatusInput");
  const btnSave = document.getElementById("btnSaveFingerprint") || document.querySelector("button[onclick*='simpanFingerprint']");

  const userID = userSelect ? userSelect.value : "";
  const fpCode = fpInput ? fpInput.value.trim() : "";

  if (!userID) {
    alert("⚠️ Silakan pilih Pengguna terlebih dahulu!");
    if (userSelect) userSelect.focus();
    return;
  }

  if (!fpCode) {
    alert("⚠️ Masukkan atau tempelkan jari ke scanner untuk mengambil ID Fingerprint!");
    if (fpInput) fpInput.focus();
    return;
  }

  let originalText = "Simpan Fingerprint User";
  if (btnSave) {
    originalText = btnSave.innerText;
    btnSave.innerText = "⏳ Menyimpan...";
    btnSave.disabled = true;
  }

  try {
    const selectedText = userSelect.options[userSelect.selectedIndex].text.toUpperCase();
    let role = "Siswa";
    if (selectedText.includes('GURU') || userID.toUpperCase().includes('GURU')) {
      role = "Guru";
    }

    const payload = {
      userID: userID,
      fingerprintID: fpCode,
      role: role
    };

    const result = await fetchAPI("saveFingerprintMapping", payload);

    if (result && result.success) {
      alert(`✅ ${result.message}`);
      if (fpInput) {
        fpInput.value = "";
        fpInput.focus();
      }
    } else {
      alert(`❌ Gagal menyimpan: ${result?.message || "Terjadi kesalahan server"}`);
    }
  } catch (err) {
    alert(`❌ Error sistem: ${err.message}`);
  } finally {
    if (btnSave) {
      btnSave.innerText = originalText;
      btnSave.disabled = false;
    }
  }
}