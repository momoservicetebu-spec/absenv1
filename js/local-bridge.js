// local-bridge.js (Dijalankan di PC Client: node local-bridge.js)
const express = require('express');
const cors = require('cors');
const app = express();

app.use(cors());
app.use(express.json());

// Simulasi status koneksi sensor ZKTeco via SDK
let isSensorReady = true; 

// Endpoint cek status hardware
app.get('/api/fingerprint/status', (req, res) => {
  res.json({
    connected: isSensorReady,
    device: "ZKTeco ZK4000/ZK8000 Sensor",
    sdkVersion: "ZKFinger 10.0"
  });
});

// Endpoint untuk mulai scan jari
app.get('/api/fingerprint/scan', async (req, res) => {
  try {
    // Di sini dipanggil fungsi ZKFinger SDK (InitEngine, BeginCapture, dll)
    // Mengembalikan hasil ekstraksi template / ID fingerprint
    res.json({
      success: true,
      fingerprintID: "FP_ZK_98127391823" 
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Gagal membaca sensor: " + err.message });
  }
});

app.listen(8080, () => {
  console.log("Local ZKTeco Bridge Service berjalan di http://localhost:8080");
});