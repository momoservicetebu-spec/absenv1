// ==========================================
// LOGIKA MODAL & SIMPAN MANAJEMEN ADMIN / USER
// ==========================================

// 1. Buka Modal Admin
function openModalAdmin(data = null) {
  const modal = document.getElementById('modal-admin');
  const title = document.getElementById('modal-admin-title');
  
  if (data) {
    // Mode Edit
    title.innerText = "Edit Data Admin";
    document.getElementById('admin-id').value = data.UserID || data.id || '';
    document.getElementById('admin-username').value = data.Username || '';
    document.getElementById('admin-nama').value = data.Nama || data.FullName || data.NamaLengkap || '';
    document.getElementById('admin-password').value = ''; // Biarkan kosong jika tidak ubah password
    document.getElementById('admin-role').value = data.Role || 'Admin';
    document.getElementById('admin-status').value = data.Status || 'Active';
  } else {
    // Mode Tambah Baru
    title.innerText = "Tambah Admin Baru";
    document.getElementById('form-admin').reset();
    document.getElementById('admin-id').value = '';
  }

  modal.style.display = 'flex';
}

// 2. Tutup Modal Admin
function closeModalAdmin() {
  document.getElementById('modal-admin').style.display = 'none';
  document.getElementById('form-admin').reset();
  document.getElementById('admin-id').value = '';
}

// 3. Eksekusi Simpan Data Admin (POST via fetchAPI)
async function simpanAdmin(event) {
  event.preventDefault();

  const id = document.getElementById('admin-id').value;
  const username = document.getElementById('admin-username').value;
  const nama = document.getElementById('admin-nama').value;
  const password = document.getElementById('admin-password').value;
  const role = document.getElementById('admin-role').value;
  const status = document.getElementById('admin-status').value;

  // Validasi: Password wajib diisi jika tambah baru
  if (!id && !password) {
    alert("Password wajib diisi untuk Admin baru!");
    return;
  }

  const payload = {
    UserID: id || 'AUTO', // Jika kosong, backend otomatis bikin UserID
    Username: username,
    Nama: nama,
    Password: password,
    Role: role,
    Status: status
  };

  // Panggil API
  const response = await fetchAPI('saveAdmin', payload, "Menyimpan data Admin...");

  if (response && (response.success || response.status === 'success')) {
    alert("Data Admin berhasil disimpan!");
    closeModalAdmin();
    if (typeof loadAdminData === 'function') loadAdminData(); // Refresh tabel admin
  } else {
    alert("Gagal menyimpan data Admin: " + (response.message || "Terjadi kesalahan"));
  }
}


// ==========================================
// LOGIKA MODAL & SIMPAN MANAJEMEN ROLE
// ==========================================

// 1. Buka Modal Role
function openModalRole(data = null) {
  const modal = document.getElementById('modal-role');
  const title = document.getElementById('modal-role-title');

  if (data) {
    // Mode Edit
    title.innerText = "Edit Role";
    document.getElementById('role-id-old').value = data.Role || '';
    document.getElementById('role-nama').value = data.Role || '';
    document.getElementById('role-deskripsi').value = data.Deskripsi || data.Description || '';
    document.getElementById('role-status').value = data.Status || 'TRUE';
  } else {
    // Mode Tambah Baru
    title.innerText = "Tambah Role Baru";
    document.getElementById('form-role').reset();
    document.getElementById('role-id-old').value = '';
  }

  modal.style.display = 'flex';
}

// 2. Tutup Modal Role
function closeModalRole() {
  document.getElementById('modal-role').style.display = 'none';
  document.getElementById('form-role').reset();
  document.getElementById('role-id-old').value = '';
}

// 3. Eksekusi Simpan Data Role (POST via fetchAPI)
async function simpanRole(event) {
  event.preventDefault();

  const roleNama = document.getElementById('role-nama').value;
  const deskripsi = document.getElementById('role-deskripsi').value;
  const status = document.getElementById('role-status').value;

  const payload = {
    Role: roleNama,
    Deskripsi: deskripsi,
    Status: status
  };

  // Panggil API
  const response = await fetchAPI('saveRole', payload, "Menyimpan data Role...");

  if (response && (response.success || response.status === 'success')) {
    alert("Data Role berhasil disimpan!");
    closeModalRole();
    if (typeof loadRoleData === 'function') loadRoleData(); // Refresh tabel role
  } else {
    alert("Gagal menyimpan data Role: " + (response.message || "Terjadi kesalahan"));
  }
}