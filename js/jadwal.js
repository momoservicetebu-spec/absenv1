// ==========================================
// FILE: js/pages/jadwal.js (STANDALONE MODUL JADWAL PELAJARAN)
// ==========================================

const GAS_BASE_URL = "https://script.google.com/macros/s/AKfycbxx3BLAOh7RZwF2vvukhDPhytbAPXfMP3H_RAJNeWgxLe2LNcCzojm-6HQ1kktPQMTQ/exec";
let dataJadwalGlobal = []; 
let filterHariAktif = "SEMUA"; 

// 1. MEMUAT DATA JADWAL DARI SERVER (GOOGLE APPS SCRIPT)
window.loadJadwal = function() {
  const tableBody = document.getElementById('jadwal-table-body');
  if (!tableBody) return;

  tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #feca57; padding: 20px;">Memuat data jadwal... ⏳</td></tr>';

  fetch(`${GAS_BASE_URL}?action=getJadwal`)
  .then(response => response.json())
  .then(result => {
    const data = result.data || result;
    dataJadwalGlobal = Array.isArray(data) ? data : [];
    renderTabelJadwal(dataJadwalGlobal);
  })
  .catch(error => {
    console.error("Error load data jadwal:", error);
    tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #ff6b6b; padding: 20px;">Gagal memuat data dari server.</td></tr>';
  });
};

// 2. RENDER TABEL JADWAL (FILTER HARI & MAPPING TANGGUP HEADER SPREADSHEET)
function renderTabelJadwal(data) {
  const tableBody = document.getElementById('jadwal-table-body');
  if (!tableBody) return;

  // Filter baris yang berisi data valid
  let validData = data.filter(item => Object.values(item).some(val => val !== "" && val !== null));

  // Filter Berdasarkan Hari jika filter aktif bukan "SEMUA"
  if (filterHariAktif && filterHariAktif !== "SEMUA") {
    validData = validData.filter(item => {
      const h = String(item.Hari || item.hari || "").trim().toUpperCase();
      return h === filterHariAktif.toUpperCase();
    });
  }

  if (validData.length === 0) {
    const pesanKosong = (filterHariAktif && filterHariAktif !== "SEMUA") 
      ? `Belum ada data jadwal untuk hari <b>${filterHariAktif}</b>.`
      : 'Belum ada data jadwal.';
    tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #a0a5ba; padding: 20px;">${pesanKosong}</td></tr>`;
    return;
  }

  let html = '';
  validData.forEach((item, index) => {
    const rowId = item.JadwalID || item.jadwalid || item.id || index;
    const hari = item.Hari || item.hari || '-';
    const jamKe = item.Jam_Ke || item.jam_ke || '-';
    const waktuMulai = item.Waktu_Mulai || item.waktu_mulai || '';
    const waktuSelesai = item.Waktu_Selesai || item.waktu_selesai || '';
    const kelas = item.Kelas || item.kelas || '-';
    const mapel = item.Mata_Pelajaran || item.mata_pelajaran || '-';
    const kodeGuru = item.Kode_Guru || item.kode_guru || item.guru_pengajar || '-';

    // Format jam HH:MM - HH:MM
    let waktuText = '-';
    if (waktuMulai && waktuSelesai) {
      waktuText = `${waktuMulai} - ${waktuSelesai}`;
    } else if (waktuMulai) {
      waktuText = waktuMulai;
    }

    html += `
    <tr>
      <td><b>${hari}</b></td>
      <td>Jam ke-${jamKe}</td>
      <td>⏰ ${waktuText}</td>
      <td><span style="background:#2c3e50; color:#fff; padding:3px 8px; border-radius:4px; font-weight:bold;">${kelas}</span></td>
      <td><b>${mapel}</b></td>
      <td><span style="background:#6c5ce7; padding:3px 8px; border-radius:4px; color:white; font-weight:bold;">${kodeGuru}</span></td>
      <td style="text-align: center; white-space: nowrap;">
        <button onclick="editJadwal('${rowId}')" style="background:#f1c40f; color:#1e202e; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; font-size:12px; font-weight:bold; margin-right:4px;">
          ✏️ Edit
        </button>
        <button onclick="hapusJadwal('${rowId}')" style="background:#ff6b6b; color:white; border:none; padding:5px 10px; border-radius:4px; cursor:pointer; font-size:12px; font-weight:bold;">
          🗑️ Hapus
        </button>
      </td>
    </tr>`;
  });

  tableBody.innerHTML = html;
}

// 3. FUNGSI FILTER HARI
window.setFilterHari = function(hari) {
  filterHariAktif = hari ? hari.trim().toUpperCase() : "SEMUA";
  renderTabelJadwal(dataJadwalGlobal);
};

// 4. IMPORT CSV JADWAL PELAJARAN
function handleImportJadwal(event) {
  const file = event.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(e) {
    const text = e.target.result;
    const rows = text.split('\n');
    const tableBody = document.getElementById('jadwal-table-body');
    
    let htmlContent = '';
    let dataJadwal = []; 
    
    for (let i = 0; i < rows.length; i++) {
      const rowText = rows[i].trim();
      
      if (rowText === '' || rowText.startsWith('#') || rowText.startsWith('Hari;')) {
        continue;
      }
      
      const cols = rowText.split(';');
      
      if (cols.length >= 7) {
        dataJadwal.push({
          hari: cols[0].trim(),
          jam_ke: cols[1].trim(),
          waktu_mulai: cols[2].trim(),
          waktu_selesai: cols[3].trim(),
          kelas: cols[4].trim(),
          mata_pelajaran: cols[5].trim(),
          kode_guru: cols[6].trim() 
        });

        htmlContent += `
        <tr>
          <td>${cols[0].trim()}</td>
          <td>${cols[1].trim()}</td>
          <td>${cols[2].trim()} - ${cols[3].trim()}</td>
          <td>${cols[4].trim()}</td>
          <td>${cols[5].trim()}</td>
          <td><span style="background:#6c5ce7; padding:2px 8px; border-radius:4px; color:white;">${cols[6].trim()}</span></td> 
        </tr>`;
      }
    }
    
    if(dataJadwal.length > 0) {
      if(tableBody) tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: #feca57; padding: 20px;">Memproses dan mengirim ${dataJadwal.length} baris data ke database... ⏳</td></tr>`;
      
      const GAS_URL = `${GAS_BASE_URL}?action=importJadwal`;
      
      fetch(GAS_URL, {
        method: "POST",
        body: JSON.stringify(dataJadwal)
      })
      .then(response => response.json())
      .then(result => {
        if (result.status === true || result.success === true) {
          alert("✅ " + result.message);
          window.loadJadwal(); 
        } else {
          alert("❌ Gagal menyimpan: " + result.message);
          window.loadJadwal();
        }
      })
      .catch(error => {
        console.error("Error import:", error);
        alert("❌ Terjadi kesalahan jaringan saat menghubungi server.");
        window.loadJadwal();
      });

    } else {
      alert("❌ Gagal. Pastikan format CSV sesuai template.");
    }
  };
  
  reader.readAsText(file);
  event.target.value = ''; 
}

// 5. UNDUH TEMPLATE CSV JADWAL
window.downloadTemplateJadwal = function() {
  const csvContent = 
    "# ==========================================================================\n" +
    "# ATURAN PENGISIAN TEMPLATE JADWAL PELAJARAN (BISA LANGSUNG DIISI DI BAWAH)\n" +
    "# 1. JANGAN MENGUBAH / MENGHAPUS NAMA HEADER PADA BARIS KE-7.\n" +
    "# 2. Format Waktu Mulai & Selesai: HH:MM (Contoh: 07:15).\n" +
    "# 3. Kolom Jam_Ke: Gunakan format angka atau range (Contoh: 1, atau 1-2).\n" +
    "# 4. Kolom Kode_Guru: HARUS SESUAI dengan Kode Guru di data Master Server.\n" +
    "# 5. Pemisah antar kolom WAJIB menggunakan tanda titik koma (;).\n" +
    "# ==========================================================================\n" +
    "Hari;Jam_Ke;Waktu_Mulai;Waktu_Selesai;Kelas;Mata_Pelajaran;Kode_Guru\n" +
    "Senin;1-2;07:15;08:45;10-A;Matematika;G-001\n" +
    "Selasa;3-4;08:45;10:15;11-B;Fisika;G-002\n";
  
  const fileName = "Template_Jadwal_Pelajaran.csv";
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  
  link.setAttribute("href", url);
  link.setAttribute("download", fileName);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// 6. EDIT JADWAL MANUAL
window.editJadwal = function(id) {
  const item = dataJadwalGlobal.find((j, idx) => 
    (j.JadwalID == id || j.jadwalid == id || j.id == id || idx == id)
  );
  
  if (!item) {
    alert("Data tidak ditemukan di sistem.");
    return;
  }

  document.getElementById('modal-title').innerText = "Edit Jadwal Pelajaran";
  document.getElementById('input-jadwal-id').value = item.JadwalID || item.id || id;
  document.getElementById('input-hari').value = item.Hari || item.hari || 'Senin';
  document.getElementById('input-jam').value = item.Jam_Ke || item.jam_ke || '';
  document.getElementById('input-mulai').value = item.Waktu_Mulai || item.waktu_mulai || '';
  document.getElementById('input-selesai').value = item.Waktu_Selesai || item.waktu_selesai || '';
  document.getElementById('input-kelas').value = item.Kelas || item.kelas || '';
  document.getElementById('input-mapel').value = item.Mata_Pelajaran || item.mata_pelajaran || '';
  document.getElementById('input-kodeguru').value = item.Kode_Guru || item.kode_guru || item.guru_pengajar || '';

  document.getElementById('modal-tambah-jadwal').style.display = 'block';
};

// 7. UTILS MODAL
window.bukaModalJadwal = function() {
  document.getElementById('modal-title').innerText = "Tambah Jadwal Manual";
  document.getElementById('input-jadwal-id').value = "";
  const form = document.getElementById('form-tambah-jadwal');
  if (form) form.reset();
  document.getElementById('modal-tambah-jadwal').style.display = 'block';
};

window.tutupModalJadwal = function() {
  const modal = document.getElementById('modal-tambah-jadwal');
  if (modal) modal.style.display = 'none';
  const form = document.getElementById('form-tambah-jadwal');
  if (form) form.reset();
};

// 8. HAPUS JADWAL
window.hapusJadwal = function(id) {
  if (!confirm("Apakah Anda yakin ingin menghapus jadwal ini?")) return;

  const GAS_URL = `${GAS_BASE_URL}?action=deleteJadwal`;
  
  fetch(GAS_URL, {
    method: "POST",
    body: JSON.stringify({ id: id, JadwalID: id })
  })
  .then(response => response.json())
  .then(result => {
    if (result.status === true || result.success === true) {
      alert("✅ Jadwal berhasil dihapus!");
      window.loadJadwal();
    } else {
      alert("❌ Gagal menghapus: " + (result.message || "Terjadi kesalahan."));
    }
  })
  .catch(error => {
    console.error("Error delete:", error);
    alert("❌ Terjadi kesalahan koneksi saat menghapus.");
  });
};

// 9. EVENT LISTENERS INITIALIZATION
document.addEventListener('DOMContentLoaded', () => {
  if (typeof window.loadJadwal === 'function') {
    window.loadJadwal();
  }

  const btnTambahManual = document.getElementById('btn-tambah-manual');
  if (btnTambahManual) {
    btnTambahManual.addEventListener('click', window.bukaModalJadwal);
  }

  const fileInput = document.getElementById('input-csv-jadwal');
  if (fileInput) {
    fileInput.addEventListener('change', handleImportJadwal);
  }

  const modalJadwal = document.getElementById('modal-tambah-jadwal');
  if (modalJadwal) {
    window.addEventListener('click', (event) => {
      if (event.target === modalJadwal) {
        window.tutupModalJadwal();
      }
    });
  }

  const formTambahJadwal = document.getElementById('form-tambah-jadwal');
  if (formTambahJadwal) {
    formTambahJadwal.addEventListener('submit', function(e) {
      e.preventDefault();

      const jadwalId = document.getElementById('input-jadwal-id').value;
      const isEdit = jadwalId !== "";
      const action = isEdit ? "updateJadwal" : "importJadwal";

      const payload = {
        id: jadwalId,
        JadwalID: jadwalId,
        hari: document.getElementById('input-hari').value,
        jam_ke: document.getElementById('input-jam').value,
        waktu_mulai: document.getElementById('input-mulai').value,
        waktu_selesai: document.getElementById('input-selesai').value,
        kelas: document.getElementById('input-kelas').value,
        mata_pelajaran: document.getElementById('input-mapel').value,
        kode_guru: document.getElementById('input-kodeguru').value
      };

      const bodyData = isEdit ? payload : [payload];
      const GAS_URL = `${GAS_BASE_URL}?action=${action}`;

      const submitBtn = document.getElementById('btn-submit-modal') || this.querySelector('button[type="submit"]');
      if (submitBtn) {
        submitBtn.innerText = "Menyimpan...";
        submitBtn.disabled = true;
      }

      fetch(GAS_URL, {
        method: "POST",
        body: JSON.stringify(bodyData)
      })
      .then(response => response.json())
      .then(result => {
        if (result.status === true || result.success === true) {
          alert(isEdit ? "✅ Jadwal berhasil diperbarui!" : "✅ Jadwal berhasil ditambahkan!");
          window.tutupModalJadwal();
          window.loadJadwal(); 
        } else {
          alert("❌ Gagal menyimpan: " + (result.message || "Error Server"));
        }
      })
      .catch(error => {
        console.error("Error submit:", error);
        alert("❌ Terjadi kesalahan koneksi saat menyimpan.");
      })
      .finally(() => {
        if (submitBtn) {
          submitBtn.innerText = "Simpan Jadwal";
          submitBtn.disabled = false;
        }
      });
    });
  }
});