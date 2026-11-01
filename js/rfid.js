// ==========================================
// FILE: js/rfid.js (FULL FIX - TENAGA KEPENDIDIKAN)
// SINKRONISASI DENGAN HTML ENROLLMENT RFID / NFC
// ==========================================

// ==========================================
// 1. Simpan Data RFID ke Database
// ==========================================
async function registerCurrentRFID() {
  const userSelect = document.getElementById('rfidUserSelect');
  const rfidInput = document.getElementById('rfidUidInput');
  const btnEnroll = document.getElementById('btnEnrollRFID');

  const userId = userSelect ? userSelect.value : "";
  const rfidUid = rfidInput ? rfidInput.value.trim() : "";

  if (!userId) {
    alert("Silakan pilih Pengguna terlebih dahulu dari list dropdown!");
    return;
  }
  if (!rfidUid) {
    alert("Silakan tap kartu Anda ke scanner terlebih dahulu!");
    if(rfidInput) rfidInput.focus();
    return;
  }

  // --- EKSTRAK NAMA & DETERMINASI ROLE PRESISI ---
  let userName = "";
  let fullText = "";

  if (typeof jQuery !== 'undefined' && jQuery('#rfidUserSelect').length > 0) {
    const selectedOpt = jQuery('#rfidUserSelect option:selected');
    userName = selectedOpt.attr('data-nama') || "";
    fullText = selectedOpt.text();
  } else if (userSelect && userSelect.selectedIndex >= 0) {
    const opt = userSelect.options[userSelect.selectedIndex];
    userName = opt.getAttribute('data-nama') || "";
    fullText = opt.text;
  }

  fullText = fullText.replace(/[\r\n]+/g, " ").trim();

  if (!userName && fullText) {
    if (fullText.includes(" - ")) {
      userName = fullText.split(" - ").slice(1).join(" - ").trim();
    } else if (fullText.includes(" ")) {
      userName = fullText.split(" ").slice(1).join(" ").trim();
    } else {
      userName = fullText.trim();
    }
  }

  // DETERMINASI ROLE PRESISI (MEMBEDAKAN TU DA GURU)
  const selectedText = fullText.toLowerCase();
  const userIdClean = userId.toLowerCase();
  let userRole = "Siswa";
  
  if (
    selectedText.includes('tenaga kependidikan') || 
    selectedText.includes('tu') || 
    selectedText.includes('staf') || 
    userIdClean.startsWith('tu-') || 
    userIdClean.includes('tu')
  ) {
    userRole = "Tenaga Kependidikan";
  } else if (
    selectedText.includes('guru') || 
    selectedText.includes('kepsek') || 
    userIdClean.startsWith('guru-') || 
    userIdClean.includes('guru') || 
    userIdClean.includes('nip')
  ) {
    userRole = "Guru";
  }

  if(btnEnroll) {
    btnEnroll.innerText = "⏳ Menyimpan...";
    btnEnroll.disabled = true;
  }

  const payload = {
    userId: userId,
    nama: userName || userId,
    Nama: userName || userId,
    role: userRole,
    roleSistem: userRole,
    rfidUid: rfidUid
  };

  try {
    const result = await fetchAPI("registerRFID", payload);

    if (result && result.success) {
      alert(`✅ ${result.message}`);
      if (rfidInput) {
        rfidInput.value = "";
        rfidInput.focus();
      }
      loadRFIDTable();
    } else {
      alert(`❌ Gagal Menyimpan: ${result?.message || 'Terjadi kesalahan koneksi'}`);
    }
  } catch (err) {
    alert(`❌ Error: ${err.message}`);
  }

  if(btnEnroll) {
    btnEnroll.innerText = "💾 Simpan Kartu";
    btnEnroll.disabled = false;
  }
}

// ==========================================
// 2. Muat Data Pengguna ke Dropdown RFID
// ==========================================
async function loadUserForRFID() {
  const selectElement = document.getElementById('rfidUserSelect');
  if (!selectElement) return;

  selectElement.innerHTML = '<option value="">⏳ Memuat data dari database...</option>';

  try {
    const result = await fetchAPI("getRFIDUsers");
    
    if (result && result.success) {
      selectElement.innerHTML = '<option value="">-- Ketik atau Pilih Pengguna --</option>';
      let usersArray = [];

      if (Array.isArray(result.data)) {
        usersArray = result.data;
      } else if (typeof result.data === 'object') {
        if (result.data.listSiswa) usersArray = usersArray.concat(result.data.listSiswa);
        if (result.data.siswa) usersArray = usersArray.concat(result.data.siswa);
        if (result.data.listGuru) usersArray = usersArray.concat(result.data.listGuru);
        if (result.data.guru) usersArray = usersArray.concat(result.data.guru);
      }

      if (usersArray.length > 0) {
        usersArray.forEach(user => {
          let userId = user.GuruID || user.SiswaID || user.NIP || user.NIS || user.id || "Tanpa ID";
          let userName = user.Nama || user.nama || user.NAMA || "Tanpa Nama";
          
          if (userId !== "Tanpa ID" && userName !== "Tanpa Nama") {
            let option = document.createElement('option');
            option.value = userId; 
            option.text = `${userId} - ${userName}`; 
            
            option.setAttribute('data-nama', userName);
            selectElement.appendChild(option);
          }
        });

        if (typeof jQuery !== 'undefined' && typeof jQuery.fn.select2 !== 'undefined') {
          jQuery('#rfidUserSelect').select2({
            placeholder: "-- Ketik atau Pilih Pengguna --",
            allowClear: true,
            width: '100%'
          });
        }
      } else {
        selectElement.innerHTML = `<option value="">❌ Gagal: Data pengguna kosong</option>`;
      }
    } else {
      selectElement.innerHTML = `<option value="">❌ Gagal mengambil data</option>`;
    }
  } catch (error) {
    selectElement.innerHTML = `<option value="">❌ Error Koneksi: ${error.message}</option>`;
  }
}

// ==========================================
// 3. MUAT TABEL RFID (READ - DENGAN BADGE TENAGA KEPENDIDIKAN)
// ==========================================
async function loadRFIDTable() {
  const tbody = document.getElementById('rfidTableBody');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 15px;">⏳ Memuat data...</td></tr>';

  try {
    const result = await fetchAPI("getAllRFIDData", { _t: new Date().getTime() });
    
    if (!result || !result.data || result.data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 15px; color: #9ca3af;">Belum ada kartu terdaftar atau data telah kosong.</td></tr>';
      return;
    }

    if (result.success) {
      tbody.innerHTML = '';
      result.data.forEach((row, index) => {
        const uId = String(row.UserID || row.userId || '').toUpperCase();
        const rawRole = String(row.Role || row.role || '').toUpperCase();

        // Normalisasi tampilan badge Role
        let displayRole = 'Siswa';
        let badgeBg = '#0284c7';
        let badgeColor = '#ffffff';

        if (uId.startsWith('TU-') || rawRole.includes('TENAGA') || rawRole.includes('TU') || rawRole.includes('ADMIN')) {
          displayRole = 'Tenaga Kependidikan';
          badgeBg = '#e67e22'; // Orange/Emas untuk TU
          badgeColor = '#ffffff';
        } else if (uId.startsWith('GURU-') || rawRole.includes('GURU')) {
          displayRole = 'Guru';
          badgeBg = '#f59e0b';
          badgeColor = '#000000';
        }

        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td style="padding: 8px; border: 1px solid #444; text-align:center;">${index + 1}</td>
          <td style="padding: 8px; border: 1px solid #444; font-weight: bold;">${uId}</td>
          <td style="padding: 8px; border: 1px solid #444; font-weight: bold;">${row.Nama || '-'}</td>
          <td style="padding: 8px; border: 1px solid #444;">
            <span style="background: ${badgeBg}; color: ${badgeColor}; padding: 3px 8px; border-radius: 4px; font-size: 0.75rem; font-weight: bold;">
              ${displayRole}
            </span>
          </td>
          <td style="padding: 8px; border: 1px solid #444;">${row.UID_Kartu || row.UID || '-'}</td>
          <td style="padding: 8px; border: 1px solid #444; color: #1dd1a1; font-weight: bold;">${row.Status || 'Active'}</td>
          <td style="padding: 8px; border: 1px solid #444; text-align:center;">
            <button class="btn-action btn-warning" style="padding: 5px 10px; font-size: 12px; margin-right: 5px;" onclick="editRFIDUI('${uId}')">Edit</button>
            <button class="btn-action btn-danger" style="padding: 5px 10px; font-size: 12px;" onclick="deleteRFIDData('${uId}', '${displayRole}', '${row.UID_Kartu || row.RecordID}', this)">Hapus</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    }
  } catch (error) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center; color:#ef4444;">❌ Error: ${error.message}</td></tr>`;
  }
}

// ==========================================
// 4. HAPUS RFID INSTAN & BEBAS DELAY
// ==========================================
async function deleteRFIDData(userId, role, uid, btnElement) {
  if (!confirm(`Yakin ingin MENGHAPUS data RFID untuk UserID: ${userId}?`)) return;

  const row = btnElement ? btnElement.closest('tr') : null;

  if (row) {
    row.style.opacity = '0.3';
  }

  try {
    const result = await fetchAPI("deleteRFID", { userId: userId, role: role, uid: uid });

    if (result && result.success) {
      if (row) {
        row.remove();
        reindexTable('rfidTableBody');
      } else {
        loadRFIDTable();
      }
      setTimeout(() => {
        alert("✅ Data RFID berhasil dihapus!");
      }, 50);
    } else {
      if (row) row.style.opacity = '1';
      alert("❌ Gagal menghapus: " + (result?.message || "Error server"));
    }
  } catch (err) {
    if (row) row.style.opacity = '1';
    alert("❌ Error jaringan saat menghapus data.");
  }
}

// ==========================================
// 5. PEMBANTU MERAPIKAN NOMOR URUT
// ==========================================
function reindexTable(tbodyId) {
  const tbody = document.getElementById(tbodyId);
  if (!tbody) return;
  const rows = tbody.querySelectorAll('tr');
  rows.forEach((row, index) => {
    const firstCell = row.querySelector('td:first-child');
    if (firstCell) firstCell.innerText = index + 1;
  });
}

// ==========================================
// 6. FUNGSI CRUD: ARAHKAN KE FORM EDIT
// ==========================================
function editRFIDUI(userId) {
  const select = document.getElementById('rfidUserSelect');
  if(select) select.value = userId;
  
  if (typeof jQuery !== 'undefined' && typeof jQuery.fn.select2 !== 'undefined') {
    jQuery('#rfidUserSelect').trigger('change');
  }

  const rfidInput = document.getElementById('rfidUidInput');
  if(rfidInput) rfidInput.focus();
  alert(`Mode Edit Aktif: Silakan TAP KARTU BARU ke scanner untuk mengganti kartu ID ${userId}.`);
}

// ==========================================
// 7. FUNGSI PENCARIAN REAL-TIME TABEL RFID
// ==========================================
function filterRfidTable() {
  const input = document.getElementById("searchRfidInput");
  if (!input) return;
  const filter = input.value.toLowerCase().trim();
  
  const tbody = document.getElementById("rfidTableBody");
  if (!tbody) return;
  const rows = tbody.getElementsByTagName("tr");
  
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].getElementsByTagName("td").length <= 1) continue; 
    const textContent = rows[i].textContent.toLowerCase();
    rows[i].style.display = textContent.includes(filter) ? "" : "none";
  }
}

// ==========================================
// 8. EVENT LISTENER OTOMATIS SAAT HALAMAN DIBUKA
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  loadUserForRFID();
  loadRFIDTable(); 

  const rfidInput = document.getElementById('rfidUidInput');
  if (rfidInput) {
    rfidInput.focus(); 
    rfidInput.addEventListener('keypress', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault(); 
        registerCurrentRFID(); 
      }
    });
  }
});