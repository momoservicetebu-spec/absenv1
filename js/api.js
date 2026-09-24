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
    
    // Ambil teks mentah terlebih dahulu untuk mencegah crash saat parse JSON
    const textResponse = await response.text();
    
    try {
      return JSON.parse(textResponse);
    } catch (e) {
      console.error(`[API Error] Response dari action '${action}' bukan JSON:`, textResponse);
      return { success: false, message: "Server mengembalikan format non-JSON / HTML Error." };
    }
  } catch (error) {
    console.error("Gagal API:", error);
    return { success: false, message: error.message };
  }
}

async function loadDashboardData(role = 'semua') {
  try {
    console.log("1. Memulai fetch data dashboard untuk role:", role);
    
    const response = await fetch(`${SCRIPT_URL}?action=getDashboardData&role=${role}`);
    console.log("2. Status Response HTTP:", response.status);
    
    const result = await response.json();
    console.log("3. Hasil mentah dari server (result):", result);
    
    if (result && result.success) {
      const data = result.data || result;
      console.log("4. Data yang siap dikirim ke Chart/UI (data):", data);
      
      if (typeof window.updateDashboardUI === "function") {
        window.updateDashboardUI(data);
        console.log("5. Eksekusi updateDashboardUI SELESAI.");
      }
      
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

  renderTable('table-kelas-body', data.kelasSiswa || []);
  renderTable('table-rumpun-body', data.rumpunGuru || []);

  renderList('list-terajin-siswa', data.terajinSiswa || [], '#1dd1a1');
  renderList('list-telat-siswa', data.telatSiswa || [], '#feca57');
  renderList('list-alpa-siswa', data.alpaSiswa || [], '#ff6b6b');
  renderList('list-belum-absen-siswa', data.belumAbsenSiswa || [], '#a2a3b7');

  renderList('list-terajin-guru', data.terajinGuru || [], '#1dd1a1');
  renderList('list-telat-guru', data.telatGuru || [], '#feca57');
  renderList('list-cuti-guru', data.cutiGuru || [], '#54a0ff');
  renderList('list-kosong-guru', data.kosongGuru || [], '#a2a3b7');
}

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

function renderTable(id, arrayData) {
  const tbody = document.getElementById(id);
  if (!tbody) return;
  tbody.innerHTML = arrayData.length === 0 ? "<tr><td colspan='4' style='text-align:center;'>N/A</li>" : "";
  arrayData.forEach(item => {
    tbody.innerHTML += `<tr style="border-bottom: 1px solid #333;">
      <td>${item.nama}</td><td>${item.hadir || 0}</td><td>${item.kedua || 0}</td><td>${item.ketiga || 0}</td>
    </tr>`;
  });
}

// ==========================================
// FITUR PENGELOLAAN TITIK GPS & GEOFENCING
// ==========================================

// 1. Deteksi Lokasi GPS Admin Menggunakan Browser
function getCurrentLocation() {
  if (!navigator.geolocation) {
    alert("Browser Anda tidak mendukung fitur Geolocation.");
    return;
  }
  
  alert("Sedang mengambil kordinat GPS perangkat Anda...");
  navigator.geolocation.getCurrentPosition(
    (position) => {
      const latInput = document.getElementById("latInput");
      const lngInput = document.getElementById("lngInput");
      if (latInput) latInput.value = position.coords.latitude;
      if (lngInput) lngInput.value = position.coords.longitude;
      alert("Kordinat berhasil didapatkan!");
    },
    (error) => {
      alert("Gagal mengambil lokasi: " + error.message);
    },
    { enableHighAccuracy: true }
  );
}

// 2. Simpan Kordinat GPS Baru ke Database via fetchAPI
async function simpanKoordinatGPS() {
  const latInput = document.getElementById("latInput");
  const lngInput = document.getElementById("lngInput");
  const radiusInput = document.getElementById("radiusInput");
  const btn = document.getElementById("btnSimpanGps");

  const lat = latInput ? latInput.value : "";
  const lng = lngInput ? lngInput.value : "";
  const radius = radiusInput ? radiusInput.value : "";

  if (!lat || !lng || !radius) {
    alert("Harap isi Latitude, Longitude, dan Radius dengan lengkap!");
    return;
  }

  if (btn) {
    btn.innerText = "Menyimpan...";
    btn.disabled = true;
  }

  const payload = {
    latitude: parseFloat(lat),
    longitude: parseFloat(lng),
    radius: parseInt(radius)
  };

  const result = await fetchAPI('saveLocation', payload);

  if (result && result.success) {
    alert(result.message || "Berhasil! Kordinat GPS dan Radius berhasil disimpan.");
  } else {
    alert("Gagal menyimpan: " + (result?.message || "Terjadi kesalahan server."));
  }

  if (btn) {
    btn.innerText = "Simpan Kordinat GPS";
    btn.disabled = false;
  }
}

// 3. Memuat Kordinat Terakhir dari Database Saat Halaman Dibuka
async function loadLokasiAwal() {
  const result = await fetchAPI('getLocation', {});

  if (result && result.success && result.data) {
    const latInput = document.getElementById("latInput");
    const lngInput = document.getElementById("lngInput");
    const radiusInput = document.getElementById("radiusInput");

    if (latInput) latInput.value = result.data.latitude || "";
    if (lngInput) lngInput.value = result.data.longitude || "";
    if (radiusInput) radiusInput.value = result.data.radius || 150;
  }
}

// Inisialisasi Saat Halaman Selesai Dimuat
document.addEventListener("DOMContentLoaded", () => {
  loadDashboardData();
  loadLokasiAwal(); // Memuat titik kordinat aktif
});