// ==========================================
// FUNGSI LOAD & HAPUS DATA ADMIN
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
// FUNGSI LOAD & HAPUS DATA ROLE
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
        const status = (role.IsActive === 'TRUE' || role.IsActive === true || role.IsActive === 'Yes' || role.IsActive === 'Aktif' || role.Status === 'TRUE') ? '✅ Aktif' : (role.IsActive || role.Status || '-');
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
// JALANKAN OTOMATIS SAAT HALAMAN DIBUKA
// ==========================================
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('table-body-admin')) loadAdminData();
  if (document.getElementById('table-body-role')) loadRoleData();
});