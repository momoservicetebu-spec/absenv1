// ==========================================
// 1. MANAJEMEN ADMIN & OPERATOR
// ==========================================

async function loadAdminData() {
  const tbody = document.getElementById('table-body-admin');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="5" style="text-align: center;">⏳ Mengambil data admin...</td></tr>`;

  try {
    const response = await fetchAPI('getAdmin');
    if (response && response.success) {
      const data = response.data || [];
      if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center;">Belum ada admin terdaftar.</td></tr>`;
        return;
      }
      let html = '';
      data.forEach(admin => {
        html += `
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.1);">
            <td style="padding: 10px;">${admin.Username || '-'}</td>
            <td style="padding: 10px;">${admin.Name || admin.Nama || '-'}</td>
            <td style="padding: 10px;">${admin.Role || '-'}</td>
            <td style="padding: 10px;">${admin.Status || 'Active'}</td>
            <td style="padding: 10px;">
              <button onclick='openModalAdmin(${JSON.stringify(admin)})' style="background: #f1c40f; border: none; padding: 5px 10px; cursor: pointer; color: #161224; font-weight: bold; border-radius: 4px;">✏️ Edit</button>
              <button onclick="hapusAdmin('${admin.Username || admin.UserID}')" style="background: #e74c3c; color: white; border: none; padding: 5px 10px; cursor: pointer; font-weight: bold; border-radius: 4px;">🗑️ Hapus</button>
            </td>
          </tr>
        `;
      });
      tbody.innerHTML = html;
    } else {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #ff7675;">❌ Gagal memuat data.</td></tr>`;
    }
  } catch (error) {
    tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: #ff7675;">❌ Terjadi kesalahan koneksi.</td></tr>`;
  }
}

function openModalAdmin(data = null) {
  const modal = document.getElementById('modal-admin');
  const title = document.getElementById('modal-admin-title');
  
  if (data) {
    title.innerText = "Edit Data Admin";
    document.getElementById('admin-id').value = data.UserID || data.id || '';
    document.getElementById('admin-username').value = data.Username || '';
    document.getElementById('admin-username').readOnly = true;
    document.getElementById('admin-nama').value = data.Name || data.Nama || '';
    document.getElementById('admin-password').value = ''; 
    document.getElementById('admin-role').value = data.Role || 'Admin';
    document.getElementById('admin-status').value = data.Status || 'Active';
  } else {
    title.innerText = "Tambah Admin Baru";
    document.getElementById('form-admin').reset();
    document.getElementById('admin-id').value = '';
    document.getElementById('admin-username').readOnly = false;
  }
  modal.style.display = 'flex';
}

function closeModalAdmin() {
  document.getElementById('modal-admin').style.display = 'none';
  document.getElementById('form-admin').reset();
}

async function simpanAdmin(event) {
  event.preventDefault();
  const id = document.getElementById('admin-id').value;
  const username = document.getElementById('admin-username').value;
  const password = document.getElementById('admin-password').value;

  if (!id && !password) {
    alert("Password wajib diisi untuk Admin baru!");
    return;
  }

  const payload = {
    UserID: id || username, 
    Username: username,
    Name: document.getElementById('admin-nama').value,
    Password: password,
    Role: document.getElementById('admin-role').value,
    Status: document.getElementById('admin-status').value
  };

  const response = await fetchAPI('saveAdmin', payload, "Menyimpan data Admin...");
  if (response && (response.success || response.status === 'success')) {
    alert("Data Admin berhasil disimpan!");
    closeModalAdmin();
    loadAdminData(); 
  } else {
    alert("Gagal menyimpan: " + (response.message || "Error"));
  }
}

async function hapusAdmin(username) {
  if (!confirm(`Anda yakin ingin menghapus admin "${username}"?`)) return;
  try {
    const res = await fetchAPI('deleteAdmin', { UserID: username });
    if (res && res.success) {
      alert('Admin berhasil dihapus!');
      loadAdminData(); 
    } else {
      alert('Gagal menghapus: ' + (res ? res.message : 'Error server'));
    }
  } catch (error) {
    alert('Terjadi kesalahan saat menghapus data.');
  }
}

// ==========================================
// 2. MANAJEMEN ROLE (HAK AKSES)
// ==========================================

async function loadRoleData() {
  const tbody = document.getElementById('table-body-role');
  if (!tbody) return;
  tbody.innerHTML = `<tr><td colspan="4" style="text-align: center;">⏳ Mengambil data hak akses...</td></tr>`;

  try {
    const response = await fetchAPI('getRole');
    if (response && response.success) {
      const data = response.data || [];
      if (data.length === 0) {
        tbody.innerHTML = `<tr><td colspan="4" style="text-align: center;">Belum ada data role.</td></tr>`;
        return;
      }
      let html = '';
      data.forEach(role => {
        const status = (role.IsActive === 'TRUE' || role.IsActive === true || role.Status === 'TRUE') ? '✅ Aktif' : '❌ Tidak Aktif';
        html += `
          <tr style="border-bottom: 1px solid rgba(255,255,255,0.1);">
            <td style="padding: 10px; font-weight: bold; color: #1dd1a1;">${role.Role || '-'}</td>
            <td style="padding: 10px;">${role.Description || role.Deskripsi || '-'}</td>
            <td style="padding: 10px; text-align: center;">${status}</td>
            <td style="padding: 10px;">
              <button onclick='openModalRole(${JSON.stringify(role)})' style="background: #f1c40f; border: none; padding: 5px 10px; cursor: pointer; color: #161224; font-weight: bold; border-radius: 4px;">✏️ Edit</button>
              <button onclick="hapusRole('${role.Role}')" style="background: #e74c3c; color: white; border: none; padding: 5px 10px; cursor: pointer; font-weight: bold; border-radius: 4px;">🗑️ Hapus</button>
            </td>
          </tr>
        `;
      });
      tbody.innerHTML = html;
    } else {
      tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #ff7675;">❌ Gagal memuat data role.</td></tr>`;
    }
  } catch (error) {
    tbody.innerHTML = `<tr><td colspan="4" style="text-align: center; color: #ff7675;">❌ Terjadi kesalahan koneksi.</td></tr>`;
  }
}

function openModalRole(data = null) {
  const modal = document.getElementById('modal-role');
  const title = document.getElementById('modal-role-title');

  if (data) {
    title.innerText = "Edit Role";
    document.getElementById('role-id-old').value = data.Role || '';
    document.getElementById('role-nama').value = data.Role || '';
    document.getElementById('role-nama').readOnly = true;
    document.getElementById('role-deskripsi').value = data.Description || data.Deskripsi || '';
    document.getElementById('role-status').value = (data.IsActive === 'TRUE' || data.IsActive === true) ? 'TRUE' : 'FALSE';
  } else {
    title.innerText = "Tambah Role Baru";
    document.getElementById('form-role').reset();
    document.getElementById('role-id-old').value = '';
    document.getElementById('role-nama').readOnly = false;
  }
  modal.style.display = 'flex';
}

function closeModalRole() {
  document.getElementById('modal-role').style.display = 'none';
  document.getElementById('form-role').reset();
}

async function simpanRole(event) {
  event.preventDefault();
  const payload = {
    Role: document.getElementById('role-nama').value,
    Description: document.getElementById('role-deskripsi').value,
    IsActive: document.getElementById('role-status').value
  };

  const response = await fetchAPI('saveRole', payload, "Menyimpan data Role...");
  if (response && (response.success || response.status === 'success')) {
    alert("Data Role berhasil disimpan!");
    closeModalRole();
    loadRoleData(); 
  } else {
    alert("Gagal menyimpan: " + (response.message || "Error"));
  }
}

async function hapusRole(namaRole) {
  if (!confirm(`Anda yakin ingin menghapus role "${namaRole}"?`)) return;
  try {
    const res = await fetchAPI('deleteRole', { Role: namaRole });
    if (res && res.success) {
      alert('Role berhasil dihapus!');
      loadRoleData(); 
    } else {
      alert('Gagal menghapus: ' + (res ? res.message : 'Error server'));
    }
  } catch (error) {
    alert('Terjadi kesalahan saat menghapus data.');
  }
}

// ==========================================
// 3. JALANKAN OTOMATIS SAAT HALAMAN DIBUKA
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('table-body-admin')) loadAdminData();
  if (document.getElementById('table-body-role')) loadRoleData();
});