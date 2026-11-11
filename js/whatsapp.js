// ==========================================
// FILE: js/whatsapp.js
// MODUL MANAJEMEN NOTIFIKASI WHATSAPP GATEWAY (FONNTE)
// ==========================================

// Memory Cache untuk menyimpan template yang dimuat dari server
window.waTemplatesCache = {};

// Template Default jika server belum menyimpan template kustom
const DEFAULT_WA_TEMPLATES = {
  masuk: "Halo Bapak/Ibu Wali Murid,\nKami informasikan bahwa siswa an. *[nama_siswa]* telah melakukan absensi MASUK pada *[waktu]* di lokasi *[lokasi_gate]*.\n\nTerima Kasih.",
  pulang: "Halo Bapak/Ibu Wali Murid,\nKami informasikan bahwa siswa an. *[nama_siswa]* telah melakukan absensi PULANG pada *[waktu]*.\n\nTerima Kasih.",
  terlambat: "Pemberitahuan Keterlambatan:\nSiswa an. *[nama_siswa]* ([nis]) tercatat TERLAMBAT hadir di sekolah pada *[waktu]* WIB tanggal *[tanggal]*.\n\nMohon perhatian dari Bapak/Ibu Wali Murid.",
  alpa: "Pemberitahuan Ketidakhadiran:\nSiswa an. *[nama_siswa]* ([nis]) tidak hadir di sekolah (ALPA) pada tanggal *[tanggal]* tanpa keterangan.\n\nMohon konfirmasi dari Bapak/Ibu Wali Murid.",
  guru_masuk: "Pemberitahuan Absensi Guru:\nYth. Bapak/Ibu *[nama_guru]* ([nip]),\nAbsensi Anda telah berhasil dicatat pada *[waktu]* WIB tanggal *[tanggal]*.\n\nTerima Kasih."
};

/**
 * 1. FUNGSI INISIALISASI MODUL & AMBIL PENGATURAN DARI SERVER
 */
async function loadWaSettings() {
  const badge = document.getElementById("waStatusBadge");
  const tokenInput = document.getElementById("waApiToken");
  const noKepsekInput = document.getElementById("waNoKepsek");

  if (badge) {
    badge.textContent = "Mengecek...";
    badge.style.backgroundColor = "rgba(234, 179, 8, 0.2)";
    badge.style.color = "#facc15";
  }

  try {
    // Ambil data pengaturan dari Google Apps Script Backend
    const res = await fetchAPI("getWaSettings", {});

    if (res && res.success && res.data) {
      const cfg = res.data;

      // Restore Nomor Kepsek jika ada
      if (noKepsekInput && cfg.noKepsek) {
        noKepsekInput.value = cfg.noKepsek;
      }

      // Restore Centang Target Notifikasi
      if (document.getElementById("waOrangTua")) {
        document.getElementById("waOrangTua").checked = cfg.waOrangTua !== undefined ? !!cfg.waOrangTua : true;
      }
      if (document.getElementById("waGuruPribadi")) {
        document.getElementById("waGuruPribadi").checked = cfg.waGuruPribadi !== undefined ? !!cfg.waGuruPribadi : true;
      }
      if (document.getElementById("waGuru")) {
        document.getElementById("waGuru").checked = cfg.waGuru !== undefined ? !!cfg.waGuru : true;
      }

      // Restore Cache Template jika tersimpan di server
      if (cfg.templates && typeof cfg.templates === 'object') {
        window.waTemplatesCache = cfg.templates;
      }

      // Tampilkan template terpilih di textarea
      loadSelectedTemplate();

      // Jalankan cek koneksi server (mode silent agar tidak muncul popup alert)
      await checkWaConnection(true);
    } else {
      setWaBadgeDisconnected();
      loadSelectedTemplate();
    }
  } catch (err) {
    console.error("Gagal memuat pengaturan WA:", err);
    setWaBadgeDisconnected();
    loadSelectedTemplate();
  }
}

/**
 * 2. FUNGSI CEK KONEKSI KE SERVER FONNTE (Bisa Dipanggil Manual / Otomatis)
 */
async function checkWaConnection(isSilent = false) {
  const badge = document.getElementById("waStatusBadge");
  const tokenInput = document.getElementById("waApiToken");
  const tokenValue = tokenInput ? tokenInput.value.trim() : "";

  if (badge) {
    badge.textContent = "Mengecek...";
    badge.style.backgroundColor = "rgba(234, 179, 8, 0.2)";
    badge.style.color = "#facc15";
  }

  try {
    // Kirim token dari input jika diisi, atau biarkan backend menggunakan token tersimpan
    const response = await fetchAPI("cekKoneksiWA", { token: tokenValue });

    if (response && response.success) {
      if (badge) {
        badge.textContent = "Terhubung";
        badge.style.backgroundColor = "rgba(16, 185, 129, 0.2)";
        badge.style.color = "#34d399";
      }
      if (!isSilent) {
        alert("✅ Koneksi Berhasil! WhatsApp Gateway siap digunakan.");
      }
    } else {
      setWaBadgeDisconnected();
      if (!isSilent) {
        alert("❌ Gagal Terhubung: " + (response ? response.message : "Token belum diatur atau terjadi kesalahan server."));
      }
    }
  } catch (err) {
    console.error("Error checkWaConnection:", err);
    setWaBadgeDisconnected();
    if (!isSilent) alert("❌ Gagal terhubung ke server backend.");
  }
}

function setWaBadgeDisconnected() {
  const badge = document.getElementById("waStatusBadge");
  if (badge) {
    badge.textContent = "Terputus";
    badge.style.backgroundColor = "rgba(239, 68, 68, 0.2)";
    badge.style.color = "#f87171";
  }
}

/**
 * 3. FUNGSI SIMPAN PENGATURAN KONEKSI & TARGET PENERIMA
 */
async function saveWaSettings() {
  const tokenInput = document.getElementById("waApiToken");
  const noKepsekInput = document.getElementById("waNoKepsek");

  const tokenValue = tokenInput ? tokenInput.value.trim() : "";
  const noKepsekValue = noKepsekInput ? noKepsekInput.value.trim() : "";

  const settingsData = {
    token: tokenValue, // Kosongkan jika tidak ingin mengubah token lama di server
    noKepsek: noKepsekValue,
    waOrangTua: document.getElementById("waOrangTua") ? document.getElementById("waOrangTua").checked : false,
    waGuruPribadi: document.getElementById("waGuruPribadi") ? document.getElementById("waGuruPribadi").checked : false,
    waGuru: document.getElementById("waGuru") ? document.getElementById("waGuru").checked : false,
    pemicu: {
      masuk: true,
      pulang: true,
      terlambat: true,
      alpa: true
    }
  };

  try {
    const response = await fetchAPI("simpanPengaturanWA", settingsData);

    if (response && response.success) {
      alert("✅ Pengaturan WhatsApp berhasil disimpan!");
      
      // Kosongkan password field token setelah berhasil disimpan demi keamanan
      if (tokenInput && tokenValue !== "") {
        tokenInput.value = "";
      }

      // Verifikasi ulang status koneksi
      checkWaConnection(true);
    } else {
      alert("❌ Gagal menyimpan pengaturan: " + (response ? response.message : "Terjadi kesalahan sistem."));
    }
  } catch (err) {
    console.error("Error saveWaSettings:", err);
    alert("❌ Gagal menyimpan pengaturan ke server.");
  }
}

/**
 * 4. FUNGSI BONGKAR-PASANG TEMPLATE SESUAI DROPDOWN (onchange)
 */
function loadSelectedTemplate() {
  const typeSelect = document.getElementById("waTemplateType");
  const messageArea = document.getElementById("waTemplateMessage");

  if (!typeSelect || !messageArea) return;

  const selectedType = typeSelect.value;

  // Gunakan isi dari cache server jika ada, atau gunakan template default
  if (window.waTemplatesCache && window.waTemplatesCache[selectedType]) {
    messageArea.value = window.waTemplatesCache[selectedType];
  } else if (DEFAULT_WA_TEMPLATES[selectedType]) {
    messageArea.value = DEFAULT_WA_TEMPLATES[selectedType];
  } else {
    messageArea.value = "";
  }
}

/**
 * 5. FUNGSI SIMPAN TEMPLATE PESAN KUSTOM
 */
async function saveWaTemplate() {
  const typeSelect = document.getElementById("waTemplateType");
  const messageArea = document.getElementById("waTemplateMessage");

  if (!typeSelect || !messageArea) return;

  const jenis = typeSelect.value;
  const pesan = messageArea.value.trim();

  if (!pesan) {
    alert("Isi pesan template tidak boleh kosong!");
    return;
  }

  try {
    const response = await fetchAPI("simpanTemplateWA", { jenis: jenis, pesan: pesan });

    if (response && response.success) {
      alert("✅ Template '" + jenis + "' berhasil disimpan!");
      // Simpan ke cache lokal
      window.waTemplatesCache[jenis] = pesan;
    } else {
      alert("❌ Gagal menyimpan template: " + (response ? response.message : "Terjadi kesalahan."));
    }
  } catch (err) {
    console.error("Error saveWaTemplate:", err);
    alert("❌ Kesalahan jaringan saat menyimpan template.");
  }
}

/**
 * 6. FUNGSI UJI KIRIM PESAN MANUALLY (TESTING)
 */
async function testWaMessage() {
  const targetNo = prompt("Masukkan Nomor WA Tujuan untuk Uji Coba (Contoh: 08123456789 atau 628123456789):");
  if (!targetNo) return;

  const messageArea = document.getElementById("waTemplateMessage");
  let testMsg = messageArea ? messageArea.value.trim() : "";

  if (!testMsg) {
    testMsg = "Halo! Ini adalah pesan uji coba dari Sistem Absensi Sekolah via Fonnte WA Gateway. ✅";
  } else {
    // Simulasi penggantian variabel template untuk uji coba
    testMsg = testMsg
      .replace(/\[nama_siswa\]/g, "Ahmad (Siswa Test)")
      .replace(/\[nama_guru\]/g, "Budi, S.Pd (Guru Test)")
      .replace(/\[nis\]/g, "12345678")
      .replace(/\[nip\]/g, "198501012010011001")
      .replace(/\[waktu\]/g, new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }))
      .replace(/\[tanggal\]/g, new Date().toLocaleDateString('id-ID'))
      .replace(/\[lokasi_gate\]/g, "Gerbang Utama");
  }

  try {
    const response = await fetchAPI("ujiKirimWA", { targetNo: targetNo, msg: testMsg });

    if (response && response.success) {
      alert("✅ Berhasil! Pesan uji coba telah dikirim ke nomor " + targetNo);
    } else {
      alert("❌ Gagal mengirim pesan: " + (response ? response.message : "Periksa kembali Token Fonnte atau Nomor Tujuan."));
    }
  } catch (err) {
    console.error("Error testWaMessage:", err);
    alert("❌ Terjadi kesalahan jaringan saat mengirim pesan uji coba.");
  }
}

// Expose fungsi ke scope window global agar dapat diakses oleh HTML onclick & routing SPA
window.loadWaSettings = loadWaSettings;
window.checkWaConnection = checkWaConnection;
window.saveWaSettings = saveWaSettings;
window.loadSelectedTemplate = loadSelectedTemplate;
window.saveWaTemplate = saveWaTemplate;
window.testWaMessage = testWaMessage;

// Jalankan otomatis saat halaman awal/refresh selesai dimuat
document.addEventListener("DOMContentLoaded", () => {
  setTimeout(() => {
    if (document.getElementById("whatsapp-settings")) {
      loadWaSettings();
    }
  }, 300);
});