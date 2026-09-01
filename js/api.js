// ==========================================
// FILE: js/api.js
// ==========================================
async function fetchAPI(action, payload = {}) {
  try {
    const formData = new URLSearchParams();
    formData.append("action", action);
    
    // Masukkan semua data payload ke form
    for (const key in payload) {
      formData.append(key, payload[key]);
    }
    
    // Memanggil CONFIG.GAS_URL dari config.js
    const response = await fetch(CONFIG.GAS_URL, { method: "POST", body: formData });
    return await response.json();
  } catch (err) {
    console.error("Gagal memanggil API:", err);
    return { success: false, message: "Network Error" };
  }
}