// ==========================================
// MODUL PEMBERSIH CACHE APLIKASI
// ==========================================
async function clearAppCache() {
  if (!confirm('Bersihkan cache aplikasi dan muat ulang versi terbaru?')) return;

  try {
    // 1. Hapus seluruh Cache Storage browser
    if ('caches' in window) {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
    }

    // 2. Lepas Service Worker jika ada
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(reg => reg.unregister()));
    }

    // 3. Amankan data sesi login aktif agar user tidak ter-logout
    const authKeys = [
      'isLoggedIn', 'role', 'user_session', 'nama',
      'name', 'userName', 'username', 'login_timestamp'
    ];
    const savedSession = {};
    authKeys.forEach(k => {
      const val = localStorage.getItem(k);
      if (val !== null) savedSession[k] = val;
    });

    // 4. Bersihkan seluruh penyimpanan sementara yang menumpuk
    localStorage.clear();
    sessionStorage.clear();

    // 5. Kembalikan sesi login aktif
    Object.keys(savedSession).forEach(k => localStorage.setItem(k, savedSession[k]));

    // 6. Paksa browser memuat ulang file terbaru dari server
    window.location.replace(window.location.pathname + '?v=' + Date.now());
  } catch (err) {
    window.location.reload(true);
  }
}