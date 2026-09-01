// ==========================================
// FILE: js/api.js
// ==========================================
async function fetchAPI(action, payload = {}) {
  try {
    if (typeof CONFIG === 'undefined' || !CONFIG.SCRIPT_URL) {
      throw new Error("URL API (CONFIG.SCRIPT_URL) belum dikonfigurasi.");
    }

    const url = `${CONFIG.SCRIPT_URL}?action=${action}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const result = await response.json();
    return result;
  } catch (error) {
    console.error("Gagal memanggil API:", error);
    return { status: 'error', message: error.message };
  }
}