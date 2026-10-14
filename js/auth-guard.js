// Isi file: auth-guard.js
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
    'kepala sekolah'
  ];

  if (!allowedRoles.includes(userRole)) {
    alert(`Akses ditolak! Role [${userRole}] tidak diizinkan masuk ke Dashboard.`);
    window.location.replace("login.html");
  }
})();