// ==========================================
// FILE: js/pages/geofencing.js
// FUNGSI: Keamanan Lokasi & Validasi Jarak
// ==========================================

const KORDINAT_SEKOLAH = {
  latitude: -6.200000,   // Ganti dengan kordinat sekolah Anda
  longitude: 106.816666, // Ganti dengan kordinat sekolah Anda
  radiusToleransi: 150   // Dalam meter
};

function prosesAbsensiGPS() {
  const btn = document.getElementById("btnGps");
  btn.innerText = "Mencari sinyal GPS...";
  btn.disabled = true;

  if (!navigator.geolocation) {
    alert("Browser Anda tidak mendukung fitur GPS.");
    btn.innerText = "📍 Verifikasi Lokasi Perangkat Dulu";
    btn.disabled = false;
    return;
  }

  const options = {
    enableHighAccuracy: true,
    maximumAge: 0,
    timeout: 10000 
  };

  navigator.geolocation.getCurrentPosition(berhasilDeteksi, gagalDeteksi, options);
}

function berhasilDeteksi(position) {
  const latSiswa = position.coords.latitude;
  const lonSiswa = position.coords.longitude;
  const akurasi = position.coords.accuracy;
  const btn = document.getElementById("btnGps");

  if (akurasi > 100) {
    alert(`Sinyal GPS lemah atau tidak akurat (${akurasi.toFixed(0)} meter). Pastikan koneksi WiFi/Sinyal stabil.`);
    btn.innerText = "📍 Ulangi Verifikasi Lokasi";
    btn.disabled = false;
    return;
  }

  const jarakMeter = hitungJarakHaversine(
    KORDINAT_SEKOLAH.latitude, 
    KORDINAT_SEKOLAH.longitude, 
    latSiswa, 
    lonSiswa
  );

  if (jarakMeter <= KORDINAT_SEKOLAH.radiusToleransi) {
    // BUKA KUNCI SISTEM
    document.getElementById("btnGps").style.display = "none";
    const gpsStatus = document.getElementById("gpsStatusText");
    gpsStatus.innerText = `Lokasi Valid (Jarak: ${jarakMeter.toFixed(0)}m). Sistem Siap Digunakan.`;
    gpsStatus.style.color = "#28a745";

    // Aktifkan area NFC dan Fingerprint
    document.getElementById("boxNfc").classList.add("unlocked");
    document.getElementById("boxFingerprint").classList.add("unlocked");
    document.getElementById("nfcSimulator").disabled = false;
    
    // Fokus otomatis ke input NFC
    document.getElementById("nfcSimulator").focus();
    
  } else {
    alert(`Akses ditolak! Perangkat ini berada ${jarakMeter.toFixed(0)} meter di luar area radius sekolah.`);
    btn.innerText = "📍 Ulangi Verifikasi Lokasi";
    btn.disabled = false;
  }
}

function gagalDeteksi(error) {
  let pesan = "Gagal mendapatkan lokasi: ";
  switch(error.code) {
    case error.PERMISSION_DENIED: pesan += "Akses GPS/Lokasi ditolak oleh browser."; break;
    case error.POSITION_UNAVAILABLE: pesan += "Sinyal GPS tidak tersedia."; break;
    case error.TIMEOUT: pesan += "Waktu permintaan GPS habis (Timeout)."; break;
  }
  alert(pesan);
  const btn = document.getElementById("btnGps");
  btn.innerText = "📍 Ulangi Verifikasi Lokasi";
  btn.disabled = false;
}

function hitungJarakHaversine(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Radius bumi meter
  const p1 = lat1 * Math.PI / 180;
  const p2 = lat2 * Math.PI / 180;
  const dp = (lat2 - lat1) * Math.PI / 180;
  const dl = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dp/2) * Math.sin(dp/2) +
            Math.cos(p1) * Math.cos(p2) *
            Math.sin(dl/2) * Math.sin(dl/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; 
}