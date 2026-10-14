// ==========================================
// 1. BLOK KEAMANAN & PENJAGA GERBANG
// ==========================================
(function () {
  const isLoggedInDirect = localStorage.getItem('isLoggedIn') === 'true';
  const roleDirect = localStorage.getItem('role');
  const sessionStr = localStorage.getItem('user_session');
  
  let sessionObj = null;
  if (sessionStr) {
    try { sessionObj = JSON.parse(sessionStr); } catch (e) {}
  }

  const isAuth = isLoggedInDirect || 
                 (sessionObj && sessionObj.isLoggedIn === true) ||
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

// ==========================================
// 2. BLOK TAMPILAN PROFIL (Berjalan saat HTML selesai dimuat)
// ==========================================
document.addEventListener("DOMContentLoaded", function() {
  const sessionStr = localStorage.getItem('user_session');
  let nama = "Pengguna";
  let role = localStorage.getItem('role') || "Guest";

  if (sessionStr) {
    try {
      const sessionObj = JSON.parse(sessionStr);
      if (sessionObj.name) nama = sessionObj.name;
    } catch (e) {}
  }

  const elNama = document.getElementById('display-nama');
  const elRole = document.getElementById('display-role');
  
  if (elNama) elNama.textContent = nama;
  if (elRole) elRole.textContent = role;
});