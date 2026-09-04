// ==========================================
// FILE: js/api.js 
// ==========================================
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxx3BLAOh7RZwF2vvukhDPhytbAPXfMP3H_RAJNeWgxLe2LNcCzojm-6HQ1kktPQMTQ/exec";

async function fetchAPI(action, payload = {}) {
  try {
    const response = await fetch(`${SCRIPT_URL}?action=${action}`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(payload)
    });
    return await response.json();
  } catch (error) {
    console.error("Gagal API:", error);
    return null;
  }
}

async function loadDashboardData(role = 'semua') {
  try {
    console.log("1. Memulai fetch data dashboard untuk role:", role);
    
    const response = await fetch(`${SCRIPT_URL}?action=getDashboardData&role=${role}`);
    console.log("2. Status Response HTTP:", response.status);
    
    const result = await response.json();
    console.log("3. Hasil mentah dari server (result):", result);
    
    if (result) {
      // Mengambil payload utama dari responseJSON
      const data = result.data || result;
      console.log("4. Data yang siap dikirim ke Chart/UI (data):", data);
      
      // Update Chart dan KPI Utama
      if (typeof window.updateDashboardUI === "function") {
        window.updateDashboardUI(data);
        console.log("5. Eksekusi updateDashboardUI SELESAI.");
      } else {
        console.error("GAGAL: Fungsi updateDashboardUI tidak ditemukan! Cek urutan script di HTML.");
      }
      
      // Update List/Daftar Tabel
      if (typeof window.updateListsUI === "function") {
        window.updateListsUI(data);
      } else if (typeof updateListsUI === "function") {
        updateListsUI(data);
      }
    }
  } catch (error) {
    console.error("GAGAL FETCH SCRIPT: Pastikan SCRIPT_URL benar dan sudah di-Deploy ulang.", error);
  }
}

function updateListsUI(data) {
  if (!data) return;

  // 1. Tabel
  renderTable('table-kelas-body', data.kelasSiswa || []);
  renderTable('table-rumpun-body', data.rumpunGuru || []);

  // 2. List Siswa
  renderList('list-terajin-siswa', data.terajinSiswa || [], '#1dd1a1');
  renderList('list-telat-siswa', data.telatSiswa || [], '#feca57');
  renderList('list-alpa-siswa', data.alpaSiswa || [], '#ff6b6b');
  renderList('list-belum-absen-siswa', data.belumAbsenSiswa || [], '#a2a3b7');

  // 3. List Guru
  renderList('list-terajin-guru', data.terajinGuru || [], '#1dd1a1');
  renderList('list-telat-guru', data.telatGuru || [], '#feca57');
  renderList('list-cuti-guru', data.cutiGuru || [], '#54a0ff');
  renderList('list-kosong-guru', data.kosongGuru || [], '#a2a3b7');
}

// Helper Render List
function renderList(id, arrayData, color) {
  const ul = document.getElementById(id);
  if (!ul) return;
  ul.innerHTML = arrayData.length === 0 ? "<li style='text-align:center;'>N/A</li>" : "";
  arrayData.forEach(item => {
    ul.innerHTML += `<li style="padding: 6px 0; border-bottom: 1px dashed #333; display: flex; justify-content: space-between;">
      <span>${item.nama}</span> <span style="color:${color};">${item.nilai || item.keterangan || ''}</span>
    </li>`;
  });
}

// Helper Render Table
function renderTable(id, arrayData) {
  const tbody = document.getElementById(id);
  if (!tbody) return;
  tbody.innerHTML = arrayData.length === 0 ? "<tr><td colspan='4' style='text-align:center;'>N/A</td></tr>" : "";
  arrayData.forEach(item => {
    tbody.innerHTML += `<tr style="border-bottom: 1px solid #333;">
      <td>${item.nama}</td><td>${item.hadir || 0}</td><td>${item.kedua || 0}</td><td>${item.ketiga || 0}</td>
    </tr>`;
  });
}

document.addEventListener("DOMContentLoaded", () => loadDashboardData());