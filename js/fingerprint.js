// ==========================================
// FILE: js/fingerprint.js
// INTEGRASI HW ZKTECO VIA WEBSOCKET & PENYIMPANAN DATA
// ==========================================

let zkSocket = null;
let isSensorConnected = false;

document.addEventListener('DOMContentLoaded', () => {
  // 1. Muat pengguna ke dropdown
  loadFingerprintUserOptions();
  // 2. Hubungkan ke Hardware ZKTeco
  connectToZKTecoHardware();
});

/**
 * Membuka koneksi WebSocket ke Service Lokal ZKTeco
 */
function connectToZKTecoHardware() {
  const statusLabel = document.getElementById('hardwareStatus') || createHardwareStatusElement();
  const zkServerUrl = "ws://127.0.0.1:24010/zkfinger";

  if (statusLabel) statusLabel.innerHTML = '⏳ Menghubungkan ke ZKTeco Hardware Service...';

  try {
    zkSocket = new WebSocket(zkServerUrl);

    zkSocket.onopen = () => {
      isSensorConnected = true;
      console.log("✅ Terhubung ke ZKTeco WebAgent Service");
      if (statusLabel) statusLabel.innerHTML = '🟢 <span style="color: green;">Hardware ZKTeco Siap (Standby)</span>';
      zkSocket.send(JSON.stringify({ command: "init" }));
    };

    zkSocket.onmessage = (event) => {
      try {
        const response = JSON.parse(event.data);
        handleZKTecoEvent(response);
      } catch (e) {
        console.log("Raw Message ZK:", event.data);
      }
    };

    zkSocket.onerror = (err) => {
      console.warn("❌ ZKTeco WebAgent tidak terdeteksi. Mencoba mode Universal Fallback.");
      fallbackToUniversalInput();
    };

    zkSocket.onclose = () => {
      isSensorConnected = false;
      if (statusLabel) statusLabel.innerHTML = '🔴 <span style="color: red;">Hardware Terputus (Service Offline)</span>';
    };

  } catch (e) {
    fallbackToUniversalInput();
  }
}

/**
 * Memproses respon & event dari Sensor ZKTeco
 */
function handleZKTecoEvent(data) {
  const statusLabel = document.getElementById('hardwareStatus');
  const fpInput = document.getElementById('fpStatusInput');

  if (data.event === "finger_touch") {
    if (statusLabel) statusLabel.innerHTML = '🟡 <span style="color: orange;">Jari Terdeteksi, Memindai...</span>';
  }

  if (data.event === "capture" || data.status === "success") {
    const templateBase64 = data.template || data.data;
    if (templateBase64) {
      if (fpInput) fpInput.value = templateBase64;
      if (statusLabel) statusLabel.innerHTML = '⚡ <span style="color: blue;">Sidik Jari Berhasil Di-scan!</span>';
      // Otomatis simpan saat sidik jari berhasil discan
      simpanFingerprint();
    }
  }

  if (data.event === "error") {
    alert("⚠️ Error Hardware: " + (data.message || "Gagal membaca sidik jari"));
  }
}

function fallbackToUniversalInput() {
  const statusLabel = document.getElementById('hardwareStatus');
  const fpInput = document.getElementById('fpStatusInput');

  if (statusLabel) statusLabel.innerHTML = '🟠 <span style="color: orange;">Mode Standar / Manual Active</span>';
  if (fpInput) {
    fpInput.focus();
    fpInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        simpanFingerprint();
      }
    });
  }
}

function createHardwareStatusElement() {
  const container = document.getElementById('fpStatusInput')?.parentElement;
  if (!container) return null;

  const statusDiv = document.createElement('div');
  statusDiv.id = 'hardwareStatus';
  statusDiv.style.marginTop = '8px';
  statusDiv.style.fontSize = '14px';
  statusDiv.style.fontWeight = 'bold';
  statusDiv.innerHTML = '⏳ Menyiapkan Hardware...';
  container.appendChild(statusDiv);
  return statusDiv;
}

/**
 * 1. MENGAMBIL DATA DARI ENDPOINT getFingerUsers
 */
async function loadFingerprintUserOptions() {
  const userSelect = document.getElementById("fpUserSelect");
  if (!userSelect) return;

  userSelect.innerHTML = '<option value="">⏳ Memuat data pengguna...</option>';

  try {
    // Memanggil endpoint backend yang baru
    const result = await fetchAPI("getFingerUsers");
    const dataObj = result.data || result; 
    
    // Menggunakan listSiswa dan listGuru sesuai ide Anda
    const siswa = dataObj.listSiswa || [];
    const guru = dataObj.listGuru || [];

    if (siswa.length > 0 || guru.length > 0) {
      userSelect.innerHTML = '<option value="">-- Pilih Pengguna --</option>';

      if (guru.length > 0) {
        const optGroupGuru = document.createElement('optgroup');
        optGroupGuru.label = "👨‍🏫 GURU / STAF";
        guru.forEach(g => {
          const id = g.id || g.ID || g.GuruID || g.nip || g.NIP || "";
          const nama = g.nama || g.Nama || g.NamaGuru || g.nama_lengkap || g.NamaLengkap || "Tanpa Nama";
          if (id) {
            const opt = document.createElement('option');
            opt.value = id;
            opt.textContent = `[GURU] ${id} - ${nama}`;
            optGroupGuru.appendChild(opt);
          }
        });
        userSelect.appendChild(optGroupGuru);
      }

      if (siswa.length > 0) {
        const optGroupSiswa = document.createElement('optgroup');
        optGroupSiswa.label = "👨‍🎓 SISWA";
        siswa.forEach(s => {
          const id = s.id || s.ID || s.SiswaID || s.nis || s.NIS || s.nisn || "";
          const nama = s.nama || s.Nama || s.NamaSiswa || s.nama_lengkap || s.NamaLengkap || "Tanpa Nama";
          if (id) {
            const opt = document.createElement('option');
            opt.value = id;
            opt.textContent = `[SISWA] ${id} - ${nama}`;
            optGroupSiswa.appendChild(opt);
          }
        });
        userSelect.appendChild(optGroupSiswa);
      }
    } else {
      userSelect.innerHTML = '<option value="">❌ Data siswa dan guru kosong</option>';
    }
  } catch (err) {
    console.error("Error loadFingerprintUserOptions:", err);
    userSelect.innerHTML = '<option value="">❌ Error koneksi data pengguna</option>';
  }
}

/**
 * 2. MENYIMPAN DATA KE ENDPOINT saveFingerprintMapping
 */
async function simpanFingerprint() {
  const userSelect = document.getElementById("fpUserSelect");
  const fpInput = document.getElementById("fpStatusInput");
  const btnSave = document.getElementById("btnSaveFingerprint") || document.querySelector("button[onclick*='simpanFingerprint']");

  const userID = userSelect ? userSelect.value : "";
  const fpCode = fpInput ? fpInput.value.trim() : "";

  if (!userID) {
    alert("⚠️ Silakan pilih Pengguna terlebih dahulu di dropdown!");
    if (userSelect) userSelect.focus();
    return;
  }

  if (!fpCode) {
    alert("⚠️ Tempelkan jari pada scanner ZKTeco terlebih dahulu!");
    return;
  }

  let originalText = "Simpan Fingerprint User";
  if (btnSave) {
    originalText = btnSave.innerText;
    btnSave.innerText = "⏳ Menyimpan...";
    btnSave.disabled = true;
  }

  try {
    // Menentukan Role (Guru / Siswa) dari teks yang dipilih di dropdown
    const selectedText = userSelect.options[userSelect.selectedIndex].text.toUpperCase();
    let role = selectedText.includes('GURU') ? "Guru" : "Siswa";

    // Menyusun payload sesuai permintaan backend
    const payload = {
      userID: userID,
      fingerprintID: fpCode,
      role: role
    };

    // Mengirim ke backend
    const result = await fetchAPI("saveFingerprintMapping", payload);

    if (result && (result.success || result.status === 'success' || result.status === 200)) {
      alert(`✅ ${result.message || "Data cap jari berhasil disimpan!"}`);
      if (fpInput) fpInput.value = ""; // Kosongkan input setelah sukses
    } else {
      alert(`❌ Gagal menyimpan: ${result?.message || "Terjadi kesalahan server"}`);
    }
  } catch (err) {
    alert(`❌ Error sistem: ${err.message}`);
  } finally {
    if (btnSave) {
      btnSave.innerText = originalText;
      btnSave.disabled = false;
    }
  }
}