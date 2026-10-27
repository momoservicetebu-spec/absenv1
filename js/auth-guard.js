// ==========================================
// FILE: js/auth-guard.js
// BLOK KEAMANAN & PENJAGA GERBANG
// ==========================================

// 1. BLOK KEAMANAN (Berjalan Langsung Sebelum DOM Render)
(function () {
  const isLoggedInDirect = localStorage.getItem('isLoggedIn') === 'true';
  const roleDirect = localStorage.getItem('role');
  const sessionStr = localStorage.getItem('user_session');
  
  let sessionObj = null;
  if (sessionStr) {
    try { sessionObj = JSON.parse(sessionStr); } catch (e) {}
  }

  const isAuth = isLoggedInDirect || 
                 (sessionObj && (sessionObj.isLoggedIn === true || sessionObj.token)) ||
                 (roleDirect && roleDirect !== '');

  if (!isAuth) {
    alert("Akses ditolak! Anda harus login terlebih dahulu.");
    window.location.replace("login.html");
    return;
  }

  const userRole = (roleDirect || (sessionObj ? sessionObj.role : '') || '').toLowerCase();
  
  const allowedRoles = [
    'superadmin', 
    'admin', 
    'operator', 
    'guru piket', 
    'guru mata pelajaran', 
    'guru',
    'kepala sekolah'
  ];

  if (!allowedRoles.includes(userRole)) {
    alert(`Akses ditolak! Role [${userRole}] tidak diizinkan masuk ke Dashboard.`);
    window.location.replace("login.html");
  }
})();

// 2. BLOK TAMPILAN PROFIL (Berjalan Saat Halaman Selesai Dimuat)
document.addEventListener("DOMContentLoaded", function() {
  const sessionStr = localStorage.getItem('user_session');
  let nama = localStorage.getItem('nama') || localStorage.getItem('userName') || "Pengguna";
  let role = localStorage.getItem('role') || "Guest";

  if (sessionStr) {
    try {
      const sessionObj = JSON.parse(sessionStr);
      // Mendukung kunci 'nama', 'name', atau 'userName' di dalam objek JSON
      if (sessionObj.nama) nama = sessionObj.nama;
      else if (sessionObj.name) nama = sessionObj.name;
      else if (sessionObj.userName) nama = sessionObj.userName;

      if (sessionObj.role) role = sessionObj.role;
    } catch (e) {}
  }

  const elNama = document.getElementById('display-nama');
  const elRole = document.getElementById('display-role');
  
  if (elNama) elNama.textContent = nama;
  if (elRole) elRole.textContent = role;
});