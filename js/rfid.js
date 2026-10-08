// ==========================================
// FILE: js/rfid.js
// SINKRONISASI DENGAN HTML ENROLLMENT RFID / NFC
// ==========================================

// 1. Simpan Data RFID ke Database
async function registerCurrentRFID() {
  const userSelect = document.getElementById('rfidUserSelect'); // Pastikan ID ini sama dengan ID dropdown di HTML
  const rfidInput = document.getElementById('rfidUidInput');    // Pastikan ID ini sama dengan ID input teks di HTML
  const btnEnroll = document.getElementById('btnEnrollRFID');   // Pastikan ID ini sama dengan tombol simpan di HTML

  const userId = userSelect ? userSelect.value : "";
  const rfidUid = rfidInput ? rfidInput.value.trim() : "";

  // Validasi Input
  if (!userId) {
    alert("Silakan pilih Pengguna terlebih dahulu dari list dropdown!");
    return;
  }
  if (!rfidUid) {
    alert("Silakan tap kartu Anda ke scanner terlebih dahulu!");
    rfidInput.focus(); // Mengembalikan kursor ke kotak teks
    return;
  }

  // DETEKSI ROLE (GURU atau SISWA)
  const selectedText = userSelect.options[userSelect.selectedIndex].text.toLowerCase();
  let userRole = "Siswa"; // Default ke Siswa
  if (selectedText.includes('guru') || userId.toLowerCase().includes('guru') || userId.toLowerCase().includes('nip')) {
    userRole = "Guru";
  }

  btnEnroll.innerText = "⏳ Menyimpan ke Server...";
  btnEnroll.disabled = true;

  // Siapkan paket data untuk dikirim ke GAS
  const payload = {
    userId: userId,
    role: userRole,
    rfidUid: rfidUid
  };

  // Panggil endpoint registerRFID yang baru dibuat di router.gs
  const result = await fetchAPI("registerRFID", payload);

  if (result && result.success) {
    alert(`✅ ${result.message}`); // Pesan sukses dari server
    
    // Reset Kotak Input
    rfidInput.value = "";
    
    // Opsional: Langsung fokus kembali ke form jika ingin scan kartu pengguna lain secara cepat
    rfidInput.focus(); 
  } else {
    alert(`❌ Gagal Menyimpan: ${result?.message || 'Terjadi kesalahan koneksi'}`);
  }

  btnEnroll.innerText = "💾 Simpan Kartu";
  btnEnroll.disabled = false;
}


// ==========================================
// 2. FUNGSI: Muat Data Pengguna ke Dropdown RFID
// ==========================================
async function loadUserForRFID() {
  const selectElement = document.getElementById('rfidUserSelect'); // Pastikan ID dropdown sesuai
  
  if (!selectElement) return;

  selectElement.innerHTML = '<option value="">⏳ Memuat data dari database...</option>';

  try {
    // Memanggil API khusus RFID yang baru dibuat di router.gs
    const result = await fetchAPI("getRFIDUsers");
    
    if (result && result.success) {
      selectElement.innerHTML = '<option value="">-- Ketik atau Pilih Pengguna --</option>';
      
      let usersArray = [];

      // Mengekstrak data list Guru & Siswa
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

        // Aktifkan fitur pencarian (Search) bawaan Select2 (Jika Anda menggunakannya)
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
    console.error("Error Load User:", error);
    selectElement.innerHTML = `<option value="">❌ Error Koneksi: ${error.message}</option>`;
  }
}


// ==========================================
// 3. EVENT LISTENER OTOMATIS
// ==========================================
document.addEventListener("DOMContentLoaded", () => {
  // 1. Langsung muat daftar dropdown saat halaman dibuka
  loadUserForRFID();

  // 2. LANGSUNG MUAT TABEL DATA KARTU SAAT HALAMAN DIBUKA
  loadRFIDTable(); 

  // 3. OTOMATISASI SCANNER USB:
  // Sebagian besar scanner RFID USB memancarkan tombol "Enter" setelah mencetak nomor kartu.
  // Kode di bawah ini berguna agar tombol "Simpan Kartu" langsung tertekan otomatis.
  const rfidInput = document.getElementById('rfidUidInput');
  if (rfidInput) {
    // Memastikan kursor langsung siap di kotak saat halaman dibuka
    rfidInput.focus(); 

    rfidInput.addEventListener('keypress', function (e) {
      if (e.key === 'Enter') {
        e.preventDefault(); // Mencegah reload halaman
        registerCurrentRFID(); // Panggil fungsi simpan
      }
    });
  }
});

// ==========================================
// 4. FUNGSI CRUD: MUAT TABEL (READ)
// ==========================================
async function loadRFIDTable() {
  const tbody = document.getElementById('rfidTableBody');
  if (!tbody) return;

  tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 15px;">⏳ Memuat data...</td></tr>';

  try {
    // Tambahkan timestamp '_t' agar browser selalu ambil data paling baru (anti-cache)
    const result = await fetchAPI("getAllRFIDData", { _t: new Date().getTime() });
    
    if (result && result.success) {
      const data = result.data;
      if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 15px;">Belum ada kartu terdaftar.</td></tr>';
        return;
      }

      tbody.innerHTML = '';
      data.forEach((row, index) => {
        const tr = document.createElement('tr');
        tr.innerHTML = `
          <td style="padding: 8px; border: 1px solid #444;">${index + 1}</td>
          <td style="padding: 8px; border: 1px solid #444; font-weight: bold;">${row.UserID}</td>
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
    } else {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red;">❌ Gagal memuat data tabel</td></tr>';
    }
  } catch (error) {
    tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:red;">❌ Error: ${error.message}</td></tr>`;
  }
}

// ==========================================
// 5. FUNGSI CRUD: HAPUS DATA (DELETE)
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
      
      // Refresh tabel RFID
      if (typeof loadRFIDTable === "function") {
        await loadRFIDTable();
      } else if (typeof loadRFIDData === "function") {
        await loadRFIDData();
      }
    } else {
      alert("❌ Gagal menghapus: " + (result?.message || "Kesalahan server."));
    }
  } catch (error) {
    console.error("Error Hapus RFID:", error);
    alert("❌ Error: " + error.message);
  }
}

// ==========================================
// 6. FUNGSI CRUD: ARAHKAN KE FORM EDIT (UPDATE)
// ==========================================
function editRFIDUI(userId) {
  // Mengubah pilihan dropdown sesuai ID yang diklik
  const select = document.getElementById('rfidUserSelect');
  select.value = userId;
  
  // Jika Anda memakai JQuery Select2, trigger perubahannya:
  if (typeof jQuery !== 'undefined' && typeof jQuery.fn.select2 !== 'undefined') {
    jQuery('#rfidUserSelect').trigger('change');
  }

  // Fokuskan kursor ke input kartu
  document.getElementById('rfidUidInput').focus();
  alert(`Mode Edit Aktif: Silakan TAP KARTU BARU ke scanner untuk mengganti kartu ID ${userId}.`);
}

// ==========================================
// FUNGSI SEARCH / FILTER TABEL RFID
// ==========================================
function filterRfidTable() {
  const input = document.getElementById("searchRfidInput");
  const filter = input.value.toLowerCase().trim();
  const tbody = document.getElementById("rfidTableBody");
  const rows = tbody.getElementsByTagName("tr");

  for (let i = 0; i < rows.length; i++) {
    // Lewati jika baris berisi pesan loading/kosong (hanya 1 kolom)
    if (rows[i].getElementsByTagName("td").length <= 1) continue;

    const userIdTd = rows[i].getElementsByTagName("td")[1]; // Kolom UserID
    const roleTd   = rows[i].getElementsByTagName("td")[2]; // Kolom Role
    const uidTd    = rows[i].getElementsByTagName("td")[3]; // Kolom UID Kartu

    if (userIdTd || roleTd || uidTd) {
      const userIdText = userIdTd ? (userIdTd.textContent || userIdTd.innerText) : "";
      const roleText   = roleTd   ? (roleTd.textContent   || roleTd.innerText)   : "";
      const uidText    = uidTd    ? (uidTd.textContent    || uidTd.innerText)    : "";

      // Cek apakah kata kunci cocok dengan UserID, Role, atau UID Kartu
      if (
        userIdText.toLowerCase().indexOf(filter) > -1 ||
        roleText.toLowerCase().indexOf(filter) > -1 ||
        uidText.toLowerCase().indexOf(filter) > -1
      ) {
        rows[i].style.display = "";
      } else {
        rows[i].style.display = "none";
      }
    }
  }
}

// ==========================================
// FUNGSI PENCARIAN REAL-TIME TABEL RFID
// ==========================================
function filterRfidTable() {
  const input = document.getElementById("searchRfidInput");
  if (!input) return;
  const filter = input.value.toLowerCase().trim();
  
  // Mencari semua baris di dalam tbody tabel RFID
  const rows = document.querySelectorAll("table tbody tr");
  
  rows.forEach(row => {
    // Abaikan baris loader / pesan "Memuat data..."
    if (row.cells.length <= 1) return; 
    
    const textContent = row.textContent.toLowerCase();
    row.style.display = textContent.includes(filter) ? "" : "none";
  });
}