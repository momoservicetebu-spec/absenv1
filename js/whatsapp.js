// ==========================================
// MODULE: NOTIFIKASI WHATSAPP (AUTO-LOAD & AUTO-CHECK)
// ==========================================

/**
 * 1. FUNGSI OTOMATIS: Memuat Pengaturan & Mengecek Koneksi Saat Reload/Tab Dibuka
 */
async function loadWaSettings() {
  const badge = document.getElementById("waStatusBadge");
  if (badge) {
    badge.textContent = "Mengecek...";
    badge.style.backgroundColor = "rgba(234, 179, 8, 0.2)";
    badge.style.color = "#facc15";
  }

  try {
    // Tarik data token dan centang pengaturan dari Script Properties server
    const res = await fetchAPI("getWaSettings", {});

    if (res && res.success && res.data) {
      const cfg = res.data;

      // Isi input token jika ada
      const tokenInput = document.getElementById("waApiToken");
      if (tokenInput && cfg.token) {
        tokenInput.value = cfg.token;
      }

      const noKepsekInput = document.getElementById("waNoKepsek");
      if (noKepsekInput && cfg.noKepsek) {
        noKepsekInput.value = cfg.noKepsek;
      }

      // Restore status centang penerima
      if (document.getElementById("waOrangTua")) document.getElementById("waOrangTua").checked = !!cfg.waOrangTua;
      if (document.getElementById("waSiswa")) document.getElementById("waSiswa").checked = !!cfg.waSiswa;
      if (document.getElementById("waGuruPribadi")) document.getElementById("waGuruPribadi").checked = !!cfg.waGuruPribadi;
      if (document.getElementById("waGuru")) document.getElementById("waGuru").checked = !!cfg.waGuru;

      // Restore status centang pemicu
      if (cfg.pemicu) {
        if (document.getElementById("trigMasuk")) document.getElementById("trigMasuk").checked = !!cfg.pemicu.masuk;
        if (document.getElementById("trigPulang")) document.getElementById("trigPulang").checked = !!cfg.pemicu.pulang;
        if (document.getElementById("trigTerlambat")) document.getElementById("trigTerlambat").checked = !!cfg.pemicu.terlambat;
        if (document.getElementById("trigAlpa")) document.getElementById("trigAlpa").checked = !!cfg.pemicu.alpa;
      }

      // 🌟 OTOMATIS JALANKAN CEK KONEKSI KE FONNTE MENGGUNAKAN TOKEN TERSIMPAN
      await checkWaConnection();
    } else {
      setWaBadgeDisconnected();
    }
  } catch (err) {
    console.error("Gagal memuat pengaturan WA:", err);
    setWaBadgeDisconnected();
  }
}

/**
 * 2. FUNGSI CEK KONEKSI WA (KE FONNTE API)
 */
async function checkWaConnection() {
  const badge = document.getElementById("waStatusBadge");
  const tokenInput = document.getElementById("waApiToken") ? document.getElementById("waApiToken").value.trim() : "";

  if (badge) {
    badge.textContent = "Mengecek...";
    badge.style.backgroundColor = "rgba(234, 179, 8, 0.2)";
    badge.style.color = "#facc15";
  }

  // Kirim request cek koneksi ke backend
  const response = await fetchAPI("cekKoneksiWA", { token: tokenInput });

  if (response && response.success) {
    if (badge) {
      badge.textContent = "Terhubung";
      badge.style.backgroundColor = "rgba(16, 185, 129, 0.2)";
      badge.style.color = "#34d399";
    }
  } else {
    setWaBadgeDisconnected();
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
 * 3. FUNGSI SIMPAN PENGATURAN WA
 */
async function saveWaSettings() {
  const tokenInput = document.getElementById("waApiToken") ? document.getElementById("waApiToken").value.trim() : "";
  const noKepsek = document.getElementById("waNoKepsek") ? document.getElementById("waNoKepsek").value.trim() : "";

  const settingsData = {
    token: tokenInput,
    noKepsek: noKepsek,
    waOrangTua: document.getElementById("waOrangTua") ? document.getElementById("waOrangTua").checked : false,
    waSiswa: document.getElementById("waSiswa") ? document.getElementById("waSiswa").checked : false,
    waGuruPribadi: document.getElementById("waGuruPribadi") ? document.getElementById("waGuruPribadi").checked : false,
    waGuru: document.getElementById("waGuru") ? document.getElementById("waGuru").checked : false,
    pemicu: {
      masuk: document.getElementById("trigMasuk") ? document.getElementById("trigMasuk").checked : false,
      pulang: document.getElementById("trigPulang") ? document.getElementById("trigPulang").checked : false,
      terlambat: document.getElementById("trigTerlambat") ? document.getElementById("trigTerlambat").checked : false,
      alpa: document.getElementById("trigAlpa") ? document.getElementById("trigAlpa").checked : false
    }
  };

  const response = await fetchAPI("simpanPengaturanWA", settingsData);

  if (response && response.success) {
    alert("✅ " + response.message);
    checkWaConnection();
  } else {
    alert("❌ Gagal menyimpan pengaturan: " + (response ? response.message : "Kesalahan sistem"));
  }
}

// 🌟 EVENT LISTENER: PANGGIL OTOMATIS SAAT DOM / HALAMAN SELESAI DIMUAT
document.addEventListener("DOMContentLoaded", () => {
  // Panggil muat data WA
  if (document.getElementById("waStatusBadge") || document.getElementById("waApiToken")) {
    loadWaSettings();
  }
});