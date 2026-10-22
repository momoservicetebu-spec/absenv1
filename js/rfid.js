// ==========================================
// FILE: js/rfid.js
// SINKRONISASI DENGAN HTML ENROLLMENT RFID / NFC
// ==========================================

// 1. Simpan Data RFID ke Database
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

  const selectedText = userSelect.options[userSelect.selectedIndex].text.toLowerCase();
  let userRole = "Siswa";
  if (selectedText.includes('guru') || userId.toLowerCase().includes('guru') || userId.toLowerCase().includes('nip')) {
    userRole = "Guru";
  }

  if(btnEnroll) {
    btnEnroll.innerText = "⏳ Menyimpan...";
    btnEnroll.disabled = true;
  }

  const payload = {
    userId: userId,
    role: userRole,
    rfidUid: rfidUid
  };

  const result = await fetchAPI("registerRFID", payload);

  if (result && result.success) {
    alert(`✅ ${result.message}`);
    rfidInput.value = "";
    rfidInput.focus(); 
    loadRFIDTable(); // Langsung perbarui tabel setelah berhasil simpan
  } else {
    alert(`❌ Gagal Menyimpan: ${result?.message || 'Terjadi kesalahan koneksi'}`);
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
// 3. FUNGSI CRUD: MUAT TABEL (READ)
// ==========================================
async function loadRFIDTable() {
  // PASTIKAN ID 'rfidTableBody' INI SAMA DENGAN <tbody id="..."> DI HTML ANDA
  const tbody = document.getElementById('rfidTableBody');
  if (!tbody) {
    console.warn("Elemen tbody dengan ID 'rfidTableBody' tidak ditemukan di HTML!");
    return;
  }

  // 1. Pastikan tabel dikosongkan dan diisi pesan loading
  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 15px;">⏳ Memuat data...</td></tr>';

  try {
    const result = await fetchAPI("getAllRFIDData");
    
    // 2. Jika data kosong (Sudah terhapus di database)
    if (!result || !result.data || result.data.length === 0) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 15px;">Belum ada kartu terdaftar atau data telah kosong.</td></tr>';
      return;
    }

    // 3. Jika data ada, cetak barisnya
    if (result.success) {
      tbody.innerHTML = ''; // Hapus pesan loading
      result.data.forEach((row, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td style="padding: 8px; border: 1px solid #444;">${index + 1}</td>
          <td style="padding: 8px; border: 1px solid #444;">${row.UserID}</td>
          <td style="padding: 8px; border: 1px solid #444; font-weight: bold;">${row.Nama}</td>
          <td style="padding: 8px; border: 1px solid #444;">${row.Role}</td>
          <td style="padding: 8px; border: 1px solid #444;">${row.UID_Kartu || row.UID}</td>
          <td style="padding: 8px; border: 1px solid #444; color: #1dd1a1;">${row.Status || 'Active'}</td>
          <td style="padding: 8px; border: 1px solid #444;">
            <button class="btn-action btn-warning" style="padding: 5px 10px; font-size: 12px; margin-right: 5px;" onclick="editRFIDUI('${row.UserID}')">Edit</button>
            <button class="btn-action btn-danger" style="padding: 5px 10px; font-size: 12px;" onclick="deleteRFIDData('${row.UserID}', '${row.Role}', '${row.UID_Kartu || row.RecordID}')">Hapus</button>
          </td>
        `;
        tbody.appendChild(tr);
      });
    }
  } catch (error) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:red;">❌ Error: ${error.message}</td></tr>`;
  }
}

// ==========================================
// 4. FUNGSI CRUD: HAPUS DATA (DELETE)
// ==========================================
async function deleteRFIDData(userId, role, recordId) {
  const idTarget = userId || recordId;
  if (!idTarget) {
    alert("❌ Error: ID Kartu / UserID tidak ditemukan!");
    return;
  }

  if (!confirm(`Yakin ingin MENCABUT akses kartu RFID untuk ID: ${idTarget}?`)) return;

  try {
    const result = await fetchAPI("deleteRFID", { 
      userId: userId,
      role: role,
      recordId: recordId || userId
    });

    if (result && result.success) {
      alert("✅ " + (result.message || "Kartu RFID berhasil dicabut!"));
      // WAJIB: Panggil ulang tabel agar data yang terhapus menghilang dari layar
      await loadRFIDTable();
    } else {
      alert("❌ Gagal menghapus: " + (result?.message || "Kesalahan server."));
    }
  } catch (error) {
    console.error("Error Hapus RFID:", error);
    alert("❌ Error: " + error.message);
  }
}

// ==========================================
// 5. FUNGSI CRUD: ARAHKAN KE FORM EDIT (UPDATE)
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
// 6. FUNGSI PENCARIAN REAL-TIME TABEL RFID
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
// 7. EVENT LISTENER OTOMATIS SAAT HALAMAN DIBUKA
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