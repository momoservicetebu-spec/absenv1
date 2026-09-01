// ==========================================
// FILE: /js/api.js
// TUGAS: Mengelola HTTP Request ke Google Apps Script
// ==========================================

// PASTE URL ANDA DI SINI
const GAS_URL = "https://script.google.com/macros/s/AKfycbxx3BLAOh7RZwF2vvukhDPhytbAPXfMP3H_RAJNeWgxLe2LNcCzojm-6HQ1kktPQMTQ/exec"; 
const API_TOKEN = "KUNCI_RAHASIA_SEKOLAH_123";

/**
 * Fungsi utama untuk mengirim data ke Backend
 * @param {string} action - Nama action di 1_Router.gs (misal: 'submitAutoAttendance')
 * @param {object} payload - Data JSON yang dikirim
 */
async function fetchAPI(action, payload = {}) {
  try {
    const formData = new URLSearchParams();
    formData.append('action', action);
    formData.append('data', JSON.stringify(payload));
    formData.append('token', API_TOKEN);

    const response = await fetch(GAS_URL, {
      method: 'POST',
      body: formData
    });

    const result = await response.json();
    
    if (!result.success) {
      console.warn("Pesan dari Server:", result.message);
    }
    
    return result;
  } catch (error) {
    console.error("Koneksi API Gagal:", error);
    return { 
      success: false, 
      message: "Tidak dapat terhubung ke server. Periksa koneksi internet Anda." 
    };
  }
}

// Fungsi ringan untuk mengecek status server saat dashboard dimuat
async function checkServerStatus() {
  const ping = await fetchAPI('ping');
  if (ping.success) {
    console.log("🟢 Server Online!", ping.message);
  } else {
    console.error("🔴 Server Offline/Error!");
  }
}