// ==========================================
// FILE: js/fingerprint.js
// LOGIKA PENDAFTARAN FINGERPRINT / SIDIK JARI
// ==========================================

document.addEventListener('DOMContentLoaded', () => {
  const fpInput = document.getElementById('fpStatusInput');

  // Scanner USB biasanya otomatis mengirimkan tombol 'Enter' setelah selesai memindai
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
 * Memproses dan menyimpan mapping Fingerprint Pengguna ke Backend
 */
async function simpanFingerprint() {
  const userSelect = document.getElementById("fpUserSelect");
  const fpInput = document.getElementById("fpStatusInput");
  const btnSave = document.getElementById("btnSaveFingerprint") || document.querySelector("button[onclick*='simpanFingerprint']");

  const userID = userSelect ? userSelect.value : "";
  const fpCode = fpInput ? fpInput.value.trim() : "";

  // 1. Validasi Input
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

  // 2. Indikator Loading di Tombol
  let originalText = "Simpan Fingerprint User";
  if (btnSave) {
    originalText = btnSave.innerText;
    btnSave.innerText = "⏳ Menyimpan...";
    btnSave.disabled = true;
  }

  try {
    // 3. Deteksi Role singkat dari teks opsi yang dipilih
    const selectedText = userSelect.options[userSelect.selectedIndex].text.toUpperCase();
    let role = "Siswa";
    if (selectedText.includes('GURU') || userID.toUpperCase().includes('GURU')) {
      role = "Guru";
    }

    // 4. Payload dikirim via fetchAPI
    const payload = {
      userID: userID,
      fingerprintID: fpCode,
      role: role
    };

    const result = await fetchAPI("saveFingerprintMapping", payload);

    if (result && result.success) {
      alert(`✅ ${result.message}`);
      if (fpInput) {
        fpInput.value = ""; // Reset input setelah berhasil
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