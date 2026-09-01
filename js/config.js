// ==========================================
// FILE: /js/config.js (Atau di dalam /js/api.js)
// ==========================================

// Ganti URL di bawah dengan URL Web App hasil copy dari Google Apps Script
const GAS_URL = "https://script.google.com/macros/s/AKfycbxx3BLAOh7RZwF2vvukhDPhytbAPXfMP3H_RAJNeWgxLe2LNcCzojm-6HQ1kktPQMTQ/exec";

// Token untuk lapisan keamanan ekstra (Cocokkan dengan API_SECRET_KEY di backend)
const API_TOKEN = "KUNCI_RAHASIA_SEKOLAH_123";
async function fetchAPI(action, payload = {}) {
  const formData = new URLSearchParams();
  formData.append('action', action);
  formData.append('data', JSON.stringify(payload));
  formData.append('token', API_TOKEN); // Jika backend Anda mengecek token

  const response = await fetch(GAS_URL, {
    method: 'POST',
    body: formData
  });

  return await response.json();
}