// ==========================================
// FILE: js/pages/jadwal.js (FULL CLEAN FIX)
// ==========================================

const GAS_BASE_URL = "https://script.google.com/macros/s/AKfycbxx3BLAOh7RZwF2vvukhDPhytbAPXfMP3H_RAJNeWgxLe2LNcCzojm-6HQ1kktPQMTQ/exec";
let dataJadwalGlobal = []; 

// 1. MEMUAT DATA JADWAL DARI SERVER
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
    console.error("Error load data:", error);
    tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #ff6b6b; padding: 20px;">Gagal memuat data dari server.</td></tr>';
  });
};

// 2. RENDER TABEL JADWAL
function renderTabelJadwal(data) {
  const tableBody = document.getElementById('jadwal-table-body');
  if (!tableBody) return;

  const validData = data.filter(item => Object.values(item).some(val => val !== "" && val !== null));

  if (validData.length === 0) {
    tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #a0a5ba; padding: 20px;">Belum ada data jadwal.</td></tr>';
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

// 3. EDIT JADWAL MANUAL
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

  const modal = document.getElementById('modal-tambah-jadwal');
  if (modal) modal.style.display = 'block';
};

// 4. UTILS MODAL
window.bukaModalJadwal = function() {
  document.getElementById('modal-title').innerText = "Tambah Jadwal Manual";
  document.getElementById('input-jadwal-id').value = "";
  const form = document.getElementById('form-tambah-jadwal');
  if (form) form.reset();
  const modal = document.getElementById('modal-tambah-jadwal');
  if (modal) modal.style.display = 'block';
};

window.tutupModalJadwal = function() {
  const modal = document.getElementById('modal-tambah-jadwal');
  if (modal) modal.style.display = 'none';
  const form = document.getElementById('form-tambah-jadwal');
  if (form) form.reset();
};

// 5. HAPUS JADWAL
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

// 6. INITIALIZATION LISTENERS
document.addEventListener('DOMContentLoaded', () => {
  window.loadJadwal();

  const btnTambahManual = document.getElementById('btn-tambah-manual');
  if (btnTambahManual) {
    btnTambahManual.addEventListener('click', window.bukaModalJadwal);
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