/**
 * Membuka koneksi WebSocket ke Service Lokal ZKTeco (Auto-Scan Port)
 */
function connectToZKTecoHardware() {
  const statusLabel = document.getElementById('hardwareStatus') || createHardwareStatusElement();
  const btnSave = document.getElementById("btnSaveFingerprint") || document.querySelector("button[onclick*='simpanFingerprint']");
  
  // Daftar port yang sering digunakan oleh Driver Web ZKTeco
  const portsToTry = [24010, 20824, 8080, 8090];
  let currentPortIndex = 0;

  if (statusLabel) statusLabel.innerHTML = '⏳ Mencari service ZKTeco di komputer...';

  function tryConnect() {
    if (currentPortIndex >= portsToTry.length) {
      if (statusLabel) statusLabel.innerHTML = '🔴 <span style="color: red;">Hardware Terputus (Driver ZKTeco tidak ditemukan)</span>';
      console.warn("❌ ZKTeco WebAgent tidak terdeteksi di port manapun. Pastikan aplikasi driver ZKTeco berjalan di Windows.");
      fallbackToUniversalInput();
      return;
    }

    const port = portsToTry[currentPortIndex];
    const zkServerUrl = `ws://127.0.0.1:${port}/zkfinger`;
    console.log(`Mencoba koneksi ke sensor di port: ${port}...`);

    try {
      zkSocket = new WebSocket(zkServerUrl);

      zkSocket.onopen = () => {
        isSensorConnected = true;
        console.log(`✅ Berhasil terhubung ke ZKTeco WebAgent di port ${port}`);
        if (statusLabel) statusLabel.innerHTML = '🟢 <span style="color: green;">Hardware ZKTeco Siap (Standby)</span>';
        
        // Kirim inisialisasi awal ke alat
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
        // Jika gagal, tutup socket dan coba port berikutnya
        zkSocket.close();
      };

      zkSocket.onclose = () => {
        if (!isSensorConnected) {
          // Hanya pindah ke port berikutnya jika memang belum pernah sukses terkoneksi
          currentPortIndex++;
          tryConnect();
        } else {
          // Jika sebelumnya sukses lalu terputus (misal alat dicabut)
          isSensorConnected = false;
          if (statusLabel) statusLabel.innerHTML = '🔴 <span style="color: red;">Hardware Terputus (Kabel Dicabut)</span>';
        }
      };

    } catch (e) {
      currentPortIndex++;
      tryConnect();
    }
  }

  // Mulai percobaan koneksi pertama
  tryConnect();
}