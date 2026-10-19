// ==========================================
// FILE: js/pages/geofencing.js
// FUNGSI: Keamanan Lokasi & Validasi Jarak dari Google Sheets
// ==========================================

let KORDINAT_SEKOLAH = {}; // Wajib ada di luar agar bisa dibaca oleh semua fungsi

async function prosesAbsensiGPS() {
  const btn = document.getElementById("btnGps");
  const gpsStatus = document.getElementById("gpsStatusText");
  
  btn.innerText = "Mengambil data kordinat dari server...";
  btn.disabled = true;

  if (!navigator.geolocation) {
    alert("Browser Anda tidak mendukung fitur GPS.");
    btn.innerText = "📍 Verifikasi Lokasi Perangkat Dulu";
    btn.disabled = false;
    return;
  }

  try {
    // ---> PERBAIKAN: Hanya deklarasikan SATU KALI dengan action yang benar
    const API_LOKASI_URL = CONFIG.SCRIPT_URL + "?action=getLocation";
    
    // 1. Ambil kordinat dari Google Sheets
    const response = await fetch(API_LOKASI_URL);
    const resData = await response.json();
    
    // Periksa jika respons dari server false/gagal
    if (resData.success === false) {
       throw new Error(resData.message || "Gagal mengambil data dari server.");
    }

    // Mengambil data spesifik dari response JSON (resData.data)
    const dataLokasi = resData.data || resData;

    // Masukkan data ke variabel
    KORDINAT_SEKOLAH = {
      latitude: parseFloat(dataLokasi.latitude),
      longitude: parseFloat(dataLokasi.longitude),
      radiusToleransi: parseInt(dataLokasi.radius)
    };

    // Validasi pencegah NaN / undefined / Kosong
    if (isNaN(KORDINAT_SEKOLAH.latitude) || isNaN(KORDINAT_SEKOLAH.longitude) || isNaN(KORDINAT_SEKOLAH.radiusToleransi) || KORDINAT_SEKOLAH.latitude === 0) {
      throw new Error("Data koordinat dari server masih kosong. Pastikan Sheet 'PengaturanLokasi' sudah terisi angka!");
    }

    // 2. Mulai cari sinyal GPS perangkat
    btn.innerText = "Mencari sinyal GPS perangkat...";
    const options = { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 };
    navigator.geolocation.getCurrentPosition(berhasilDeteksi, gagalDeteksi, options);

  } catch (error) {
    console.error("Detail Error API Lokasi:", error);
    
    if (gpsStatus) gpsStatus.innerText = "Gagal terhubung: " + error.message;
    alert("Error Lokasi: " + error.message);
    
    btn.innerText = "📍 Ulangi Verifikasi Lokasi";
    btn.disabled = false;
  }
}

function berhasilDeteksi(position) {
  const latSiswa = position.coords.latitude;
  const lonSiswa = position.coords.longitude;
  const akurasi = position.coords.accuracy;
  const btn = document.getElementById("btnGps");
  const gpsStatus = document.getElementById("gpsStatusText");

  if (akurasi > 1000) {
    alert(`Sinyal GPS lemah atau tidak akurat (${akurasi.toFixed(0)} meter). Pastikan sinyal stabil.`);
    btn.innerText = "📍 Ulangi Verifikasi Lokasi";
    btn.disabled = false;
    return;
  }

  const jarakMeter = hitungJarakHaversine(
    KORDINAT_SEKOLAH.latitude, KORDINAT_SEKOLAH.longitude, 
    latSiswa, lonSiswa
  );

  if (jarakMeter <= KORDINAT_SEKOLAH.radiusToleransi) {
    // BUKA KUNCI
    btn.style.display = "none";
    if (gpsStatus) {
      gpsStatus.innerText = `Lokasi Valid (Jarak: ${jarakMeter.toFixed(0)}m / Max: ${KORDINAT_SEKOLAH.radiusToleransi}m). Sistem Siap.`;
      gpsStatus.style.color = "#28a745";
    }

    document.getElementById("boxNfc")?.classList.add("unlocked");
    document.getElementById("boxFingerprint")?.classList.add("unlocked");
    
    const inputNfc = document.getElementById("nfcSimulator");
    if (inputNfc) {
      inputNfc.disabled = false;
      inputNfc.focus();
    }
  } else {
    alert(`Akses ditolak! Perangkat ini berada ${jarakMeter.toFixed(0)}m dari titik absensi (Maksimal ${KORDINAT_SEKOLAH.radiusToleransi}m).`);
    btn.innerText = "📍 Ulangi Verifikasi Lokasi";
    btn.disabled = false;
  }
}

function gagalDeteksi(error) {
  let pesan = "Gagal mendapatkan lokasi: ";
  if (error.code === error.PERMISSION_DENIED) pesan += "Izin Lokasi ditolak oleh browser.";
  else if (error.code === error.POSITION_UNAVAILABLE) pesan += "Sinyal GPS tidak tersedia.";
  else if (error.code === error.TIMEOUT) pesan += "Waktu permintaan GPS habis.";
  
  alert(pesan);
  const btn = document.getElementById("btnGps");
  btn.innerText = "📍 Ulangi Verifikasi Lokasi";
  btn.disabled = false;
}

function hitungJarakHaversine(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // Radius bumi dalam meter
  const p1 = lat1 * Math.PI / 180;
  const p2 = lat2 * Math.PI / 180;
  const dp = (lat2 - lat1) * Math.PI / 180;
  const dl = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dp/2) * Math.sin(dp/2) + Math.cos(p1) * Math.cos(p2) * Math.sin(dl/2) * Math.sin(dl/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; 
}