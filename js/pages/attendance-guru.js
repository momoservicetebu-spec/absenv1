// ==========================================
// FILE: js/pages/attendance-guru.js (KHUSUS TERMINAL GURU & STAF TU)
// ==========================================
const video = document.getElementById('video');
const videoContainer = document.getElementById('video-container');
const standbyUI = document.getElementById('standby-ui');
const nfcInput = document.getElementById('nfcSimulator');
const statusText = document.getElementById('statusText');
const alertBox = document.getElementById('alertBox');

let databaseWajah = [];
let dataGuru = [];
let currentMFAUser = null;
let verificationInterval = null;
let isProcessing = false;
let isSubmittingAttendance = false;
let modeAbsensiSaatIni = "finger_face";

const STRICT_FACE_THRESHOLD = 0.50;

// 1. Inisialisasi AI, Master Guru/TU, Database Wajah Guru & Setting
Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri(CONFIG.MODEL_URL),
  faceapi.nets.faceLandmark68Net.loadFromUri(CONFIG.MODEL_URL),
  faceapi.nets.faceRecognitionNet.loadFromUri(CONFIG.MODEL_URL),
  loadMasterGuru(),
  loadFaceDatabaseGuru(),
  terapkanPengaturanTerminal()
]).then(() => {
  startVideo();
}).catch(err => {
  if (statusText) statusText.innerText = "Gagal memuat AI / Konfigurasi";
  console.error(err);
});

function startVideo() {
  navigator.mediaDevices.getUserMedia({ video: true })
    .then(stream => { if (video) video.srcObject = stream; })
    .catch(err => console.error(err));
}

async function loadMasterGuru() {
  try {
    const resGuru = await fetchAPI("getGuru");
    if (resGuru && resGuru.success && Array.isArray(resGuru.data)) {
      dataGuru = resGuru.data;
      console.log(`[Master Guru/TU Loaded] Total: ${dataGuru.length} akun`);
    }
  } catch (e) {
    console.warn("Gagal memuat master data guru:", e);
  }
}

async function terapkanPengaturanTerminal() {
  if (statusText) statusText.innerText = "Mengambil konfigurasi terminal guru...";
  const result = await fetchAPI("getSettings");

  if (result && result.success) {
    const config = result.data || {};
    modeAbsensiSaatIni = config.MFA_TEACHER || config.keamanan?.mfaGuru || "finger_face";

    const antiFakeVal = config.ANTI_FAKE_GPS !== undefined ? config.ANTI_FAKE_GPS : config.keamanan?.antiFakeGps;
    const isAntiFakeGpsActive = String(antiFakeVal).toUpperCase() === "TRUE" || antiFakeVal === true;

    const boxGps = document.getElementById("btnGps");
    const statusGps = document.getElementById("gpsStatusText");
    if (boxGps) boxGps.style.display = isAntiFakeGpsActive ? "inline-block" : "none";
    if (statusGps) statusGps.style.display = isAntiFakeGpsActive ? "block" : "none";
  }
  bukaKunciMetodeInput();
}

function bukaKunciMetodeInput() {
  const modeLower = String(modeAbsensiSaatIni).toLowerCase();
  const isOnlyFace = (modeLower === "face");
  const isOnlyQR = (modeLower === "qr");
  const isOnlyRFID = (modeLower === "rfid");
  const isOnlyFinger = (modeLower === "finger");

  if (isOnlyFace) {
    if (standbyUI) standbyUI.style.display = 'none';
    if (videoContainer) videoContainer.style.display = 'flex';
    if (statusText) {
      statusText.innerText = `[GURU] Mode: Hanya Scan Wajah`;
      statusText.style.color = "#3498db";
    }
  } else {
    if (standbyUI) standbyUI.style.display = 'block';
    if (videoContainer) videoContainer.style.display = 'none';

    if (nfcInput) {
      nfcInput.disabled = false;
      nfcInput.focus();
    }

    let labelPesan = `Sistem Siap (GURU & TU)`;
    if (isOnlyQR) labelPesan = `[GURU] Silakan Scan Barcode / QR Code`;
    else if (isOnlyRFID) labelPesan = `[GURU] Silakan Tap Kartu (RFID/NFC)`;
    else if (isOnlyFinger) labelPesan = `[GURU] Silakan Scan Sidik Jari`;
    else if (modeLower.includes("face")) labelPesan = `[GURU] Step 1: Scan ID | Step 2: Verifikasi Wajah`;

    if (statusText) {
      statusText.innerText = labelPesan;
      statusText.style.color = "#2ecc71";
    }
  }
}

async function loadFaceDatabaseGuru() {
  const result = await fetchAPI("getFaceReferences", { role: "GURU" });
  databaseWajah = [];
  if (result && result.success && Array.isArray(result.data)) {
    result.data.forEach(item => {
      const finalUserID = String(item.UserID || item.user_id || item.id || item.ID || "").trim();
      const finalNIP = String(item.NIP || item.nip || "").replace(/'/g, "").trim();
      const finalNama = String(item.Nama || item.nama || item.NamaLengkap || "").trim();
      const rawEmbed = item['EmbeddingData (JSON)'] || item.EmbeddingData || item.descriptor;

      if (finalUserID && rawEmbed && rawEmbed !== "undefined") {
        try {
          const parsed = typeof rawEmbed === 'string' ? JSON.parse(rawEmbed) : rawEmbed;
          databaseWajah.push({
            id: finalUserID,
            nip: finalNIP,
            nama: finalNama,
            descriptor: new Float32Array(parsed)
          });
        } catch (e) {
          console.error("Gagal memproses vektor wajah ID:", finalUserID, e);
        }
      }
    });
    console.log(`Database Wajah Guru Loaded: ${databaseWajah.length} wajah`);
  }
}

// Listener Scanner Guru/TU
if (nfcInput) {
  nfcInput.addEventListener('keypress', async function (e) {
    if (e.key === 'Enter') {
      const rawInput = this.value.trim();
      this.value = '';
      if (rawInput === '' || isProcessing) return;

      isProcessing = true;
      let targetUserId = rawInput;

      if (rawInput.startsWith("{") && rawInput.endsWith("}")) {
        try {
          const parsedQR = JSON.parse(rawInput);
          if (parsedQR.id) targetUserId = String(parsedQR.id).replace(/'/g, "").trim();
        } catch (err) {}
      }

      targetUserId = String(targetUserId).replace(/'/g, "").trim();
      if (statusText) {
        statusText.innerText = `Memverifikasi ID (${targetUserId})...`;
        statusText.style.color = "orange";
      }

      const result = await fetchAPI("verifikasiRFID", { rfid: targetUserId, role: "GURU" });

      if (result && result.success) {
        const userID = String(result.data.userId || result.data.id || targetUserId).replace(/'/g, "").trim();
        const userName = result.data.nama || result.data.Nama || userID;
        const modeLower = String(modeAbsensiSaatIni).toLowerCase();
        const requiresFace = modeLower.includes("face") || modeLower.includes("wajah");

        if (requiresFace) {
          if (statusText) statusText.innerText = `ID Dikenali (${userName})! Memulai verifikasi wajah...`;
          if (standbyUI) standbyUI.style.display = 'none';
          if (videoContainer) videoContainer.style.display = 'flex';
          isProcessing = false;
          startVerificationState(userID, userName);
        } else {
          executeAttendance(userID, userName);
        }
      } else {
        isProcessing = false;
        putarSuaraKonfirmasi("Kartu atau ID tidak terdaftar.");
        showAlert(`❌ ID (${targetUserId}) tidak terdaftar.`, "#e74c3c");
        setTimeout(resetToStandby, 2500);
      }
    }
  });
}

function startVerificationState(userID, userName) {
  if (standbyUI) standbyUI.style.display = 'none';
  if (videoContainer) videoContainer.style.display = 'flex';
  if (isProcessing) return;
  isProcessing = true;

  const cleanInputID = String(userID || '').replace(/'/g, "").trim();
  let displayName = userName || cleanInputID;
  const searchUp = cleanInputID.toUpperCase();

  const foundMaster = dataGuru.find(u => {
    const uID = String(u.UserID || u.ID || u.id || u.GuruID || '').replace(/'/g, "").trim().toUpperCase();
    const uNIP = String(u.NIP || u.nip || '').replace(/'/g, "").trim().toUpperCase();
    const uNama = String(u.Nama || u.Nama_Lengkap || u.NamaLengkap || '').replace(/'/g, "").trim().toUpperCase();
    return uID === searchUp || (uNIP && uNIP === searchUp) || (uNama && uNama === searchUp);
  });

  let masterUserID = cleanInputID;
  if (foundMaster) {
    displayName = foundMaster.Nama || foundMaster.Nama_Lengkap || displayName;
    masterUserID = String(foundMaster.UserID || foundMaster.GuruID || foundMaster.ID || cleanInputID).replace(/'/g, "").trim();

    const rawBercadar = String(foundMaster.Bercadar || foundMaster.bercadar || "").toUpperCase().trim();
    if (rawBercadar === "YA" || foundMaster.Bercadar === true) {
      isProcessing = false;
      putarSuaraKonfirmasi(`Bypass Terverifikasi. Selamat bertugas ${displayName}`);
      if (statusText) {
        statusText.innerText = `Bypass Terverifikasi - Bercadar (${displayName})`;
        statusText.style.color = "#2ecc71";
      }
      executeAttendance(masterUserID, displayName);
      return;
    }
  }

  const searchMasterUp = masterUserID.toUpperCase();
  const searchNameUpper = String(displayName).toUpperCase().trim();

  const targetUser = databaseWajah.find(u => {
    const faceID = String(u.id || '').replace(/'/g, "").trim().toUpperCase();
    const faceNIP = String(u.nip || '').replace(/'/g, "").trim().toUpperCase();
    const faceNama = String(u.nama || '').replace(/'/g, "").trim().toUpperCase();
    return faceID === searchUp || faceID === searchMasterUp ||
           (faceNIP && (faceNIP === searchUp || faceNIP === searchMasterUp)) ||
           (searchNameUpper && faceNama && faceNama === searchNameUpper);
  });

  if (!targetUser) {
    isProcessing = false;
    putarSuaraKonfirmasi(`Data wajah belum didaftarkan.`);
    showAlert(`❌ Data wajah untuk ${displayName} (${cleanInputID}) belum didaftarkan.`, "#e74c3c");
    setTimeout(resetToStandby, 3000);
    return;
  }

  currentMFAUser = targetUser;
  const livenessChallenge = Math.random() > 0.5 ? 'BLINK' : 'SMILE';
  const challengeText = livenessChallenge === 'BLINK' ? '👁️ Kedipkan Mata' : '😊 Tersenyum Manis';

  if (statusText) {
    statusText.innerText = `${challengeText}: ${displayName}...`;
    statusText.style.color = "#3498db";
  }

  let canvas = document.querySelector('canvas');
  if (!canvas && video && videoContainer) {
    canvas = faceapi.createCanvasFromMedia(video);
    videoContainer.append(canvas);
  }
  const displaySize = { width: (video && video.width) || 640, height: (video && video.height) || 480 };
  if (canvas) faceapi.matchDimensions(canvas, displaySize);

  let hasPassedChallenge = false;
  let baselineEAR = null;
  let baselineMAR = null;
  let baselineNose = null;

  const detectorOptions = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });

  verificationInterval = setInterval(async () => {
    if (!video) return;
    const detections = await faceapi.detectSingleFace(video, detectorOptions).withFaceLandmarks().withFaceDescriptor();
    if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);

    if (detections) {
      const resized = faceapi.resizeResults(detections, displaySize);
      const distance = faceapi.euclideanDistance(detections.descriptor, currentMFAUser.descriptor);
      const isMatch = distance < STRICT_FACE_THRESHOLD;

      const leftEye = detections.landmarks.getLeftEye();
      const rightEye = detections.landmarks.getRightEye();
      const jawOutline = detections.landmarks.getJawOutline();
      const mouth = detections.landmarks.getMouth();
      const nose = detections.landmarks.getNose()[3];

      const calcEAR = (eye) => {
        const d = (p1, p2) => Math.hypot(p1.x - p2.x, p1.y - p2.y);
        return (d(eye[1], eye[5]) + d(eye[2], eye[4])) / (2.0 * d(eye[0], eye[3]));
      };
      const currentEAR = typeof getEyeAspectRatio === 'function'
        ? (getEyeAspectRatio(leftEye) + getEyeAspectRatio(rightEye)) / 2.0
        : (calcEAR(leftEye) + calcEAR(rightEye)) / 2.0;

      const currentMAR = typeof getMouthAspectRatio === 'function'
        ? getMouthAspectRatio(jawOutline, mouth)
        : Math.hypot(mouth[13].x - mouth[19].x, mouth[13].y - mouth[19].y) / Math.hypot(mouth[0].x - mouth[6].x, mouth[0].y - mouth[6].y);

      if (baselineEAR === null) {
        baselineEAR = currentEAR;
        baselineMAR = currentMAR;
        baselineNose = { x: nose.x, y: nose.y };
      } else if (!hasPassedChallenge) {
        const earDiff = Math.abs(baselineEAR - currentEAR);
        const marDiff = Math.abs(baselineMAR - currentMAR);
        const headMove = Math.hypot(nose.x - baselineNose.x, nose.y - baselineNose.y);

        if (livenessChallenge === 'BLINK') {
          if (earDiff >= 0.045 || currentEAR < 0.27 || (headMove >= 7 && earDiff >= 0.025)) hasPassedChallenge = true;
        } else {
          if (marDiff >= 0.045 || currentMAR > 0.15 || (headMove >= 7 && marDiff >= 0.025)) hasPassedChallenge = true;
        }
      }

      if (canvas) {
        const drawBox = new faceapi.draw.DrawBox(resized.detection.box, {
          label: (isMatch && hasPassedChallenge) ? `✅ ${displayName}` : (isMatch ? challengeText : `Memindai... (${distance.toFixed(2)})`),
          lineWidth: 3,
          boxColor: (isMatch && hasPassedChallenge) ? '#2ecc71' : (isMatch ? '#f39c12' : '#e74c3c')
        });
        drawBox.draw(canvas);
      }

      if (isMatch && hasPassedChallenge) {
        clearInterval(verificationInterval);
        verificationInterval = null;
        if (statusText) {
          statusText.innerText = `✅ Wajah & Liveness Valid! (${displayName})`;
          statusText.style.color = "#2ecc71";
        }
        executeAttendance(currentMFAUser.id || masterUserID, displayName);
      } else if (isMatch && !hasPassedChallenge && statusText) {
        statusText.innerText = `Wajah Valid. Silakan: ${challengeText} (${displayName})`;
        statusText.style.color = "#e67e22";
      } else if (statusText) {
        statusText.innerText = `Membandingkan Wajah (${displayName})... Jarak: ${distance.toFixed(2)}`;
        statusText.style.color = "#e67e22";
      }
    }
  }, 100);

  setTimeout(() => {
    if (isProcessing && verificationInterval) {
      clearInterval(verificationInterval);
      verificationInterval = null;
      isProcessing = false;
      putarSuaraKonfirmasi("Verifikasi wajah gagal. Wajah tidak cocok.");
      showAlert(`❌ Verifikasi Gagal: Wajah tidak cocok dengan data ${displayName}.`, "#e74c3c");
      setTimeout(resetToStandby, 1500);
    }
  }, 3500);
}

function captureKameraBase64() {
  try {
    if (!video) return "";
    const canvas = document.createElement("canvas");
    canvas.width = 320;
    canvas.height = 240;
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.45);
  } catch (err) {
    return "";
  }
}

async function executeAttendance(userID, userName) {
  if (isSubmittingAttendance) return;
  isSubmittingAttendance = true;

  let displayName = userName || userID;
  const userIdUpper = String(userID).trim().toUpperCase();
  const finalRole = userIdUpper.startsWith('TU-') ? "Tenaga Kependidikan" : "Guru";

  showAlert(`⏳ Memproses Status Absensi: ${displayName}...`, "#f1c40f");
  if (statusText) {
    statusText.innerText = `Memproses Status (${displayName})...`;
    statusText.style.color = "#f1c40f";
  }

  const JAM_MASUK_CONFIG = (typeof CONFIG !== 'undefined' && CONFIG.jamMasuk) ? CONFIG.jamMasuk : (localStorage.getItem('jam_masuk') || "07:15");
  const fotoTangkapan = captureKameraBase64();
  const modeLower = String(modeAbsensiSaatIni).toLowerCase();

  let priMethod = "FINGERPRINT";
  if (modeLower.includes("qr")) priMethod = "QR_CODE";
  else if (modeLower.includes("rfid")) priMethod = "RFID";
  else if (modeLower === "face") priMethod = "FACE";

  const secMethod = (!modeLower.includes("face") && priMethod !== "FACE") ? "NONE" : "FACE";

  const payload = {
    userId: String(userID).trim(),
    nama: displayName,
    role: finalRole,
    checkType: "AUTO",
    primaryMethod: priMethod,
    secondaryMethod: secMethod,
    authLevel: secMethod === "NONE" ? "1FA" : "2FA",
    jamMasukConfig: JAM_MASUK_CONFIG,
    deviceId: "TERMINAL-" + (finalRole === "Tenaga Kependidikan" ? "TU" : "GURU"),
    keterangan: `Absen Sukses (${modeAbsensiSaatIni.toUpperCase()})`,
    fotoBase64: fotoTangkapan
  };

  try {
    const result = await fetchAPI("submitAutoAttendance", payload);
    const record = result && result.data ? result.data : {};
    const backendMessage = result ? result.message || "" : "";

    if (record.Nama || record.nama) displayName = record.Nama || record.nama;

    if (result && result.success) {
      if (result.queuePayload) {
        fetchAPI("processAttendanceQueue", result.queuePayload).catch(() => {});
      }

      const statusAbsen = String(record["Status(Hadir/Telat/Izin/dll)"] || record.Status || record.status || backendMessage || "").toUpperCase().trim();
      let warnaBg = "#2ecc71", ikon = "✅", teksJudul = "ABSEN MASUK SUKSES", teksStatus = "Masuk Tepat Waktu";
      const ucapanSelamat = finalRole === "Guru" ? "Selamat mengajar." : "Selamat bertugas.";
      let teksSuara = record.pesanSuara || `Terima kasih ${displayName}. Absen masuk berhasil. ${ucapanSelamat}`;

      if (statusAbsen.includes("PULANG NORMAL") || statusAbsen.includes("PULANG")) {
        warnaBg = "#3498db"; ikon = "🔵"; teksJudul = "ABSEN PULANG SUKSES"; teksStatus = "Sudah Absen Pulang";
        teksSuara = record.pesanSuara || `Terima kasih ${displayName}. Absen pulang berhasil. Hati-hati di jalan.`;
      } else if (statusAbsen.includes("PULANG AWAL")) {
        warnaBg = "#f39c12"; ikon = "🟡"; teksJudul = "ABSEN PULANG AWAL"; teksStatus = "Pulang Awal";
        teksSuara = record.pesanSuara || `Terima kasih ${displayName}. Absen pulang awal berhasil dicatat.`;
      } else if (statusAbsen.includes("LEMBUR")) {
        warnaBg = "#9b59b6"; ikon = "🟣"; teksJudul = "ABSEN PULANG LEMBUR"; teksStatus = "Pulang Lembur";
        teksSuara = record.pesanSuara || `Terima kasih ${displayName}. Absen lembur berhasil.`;
      } else if (statusAbsen.includes("TELAT") || statusAbsen.includes("TERLAMBAT")) {
        warnaBg = "#e67e22"; ikon = "⚠️"; teksJudul = "ABSEN MASUK (TERLAMBAT)"; teksStatus = "Masuk Terlambat";
      }

      putarSuaraKonfirmasi(teksSuara);
      showAlert(`${ikon} ${teksJudul}: ${displayName}`, warnaBg);
      if (statusText) {
        statusText.innerText = `${ikon} ${teksStatus} (${displayName})`;
        statusText.style.color = warnaBg;
      }
    } else {
      const cleanMsg = (backendMessage || "Absensi Ditolak").replace("[Sistem]", "").trim();
      putarSuaraKonfirmasi((record && record.pesanSuara) ? record.pesanSuara : cleanMsg);
      showAlert(`⚠️ ${cleanMsg}`, "#e67e22");
      if (statusText) {
        statusText.innerText = `⚠️ ${cleanMsg}`;
        statusText.style.color = "#e67e22";
      }
    }
  } catch (error) {
    console.error("Error Absen:", error);
    putarSuaraKonfirmasi("Terjadi kesalahan sistem.");
    showAlert(`❌ Error Sistem / Jaringan`, "#e74c3c");
  }

  setTimeout(resetToStandby, 2500);
}

function resetToStandby() {
  if (verificationInterval) clearInterval(verificationInterval);
  verificationInterval = null;
  currentMFAUser = null;
  isProcessing = false;
  isSubmittingAttendance = false;
  const canvas = document.querySelector('canvas');
  if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
  hideAlert();
  bukaKunciMetodeInput();
}

function showAlert(text, color) {
  if (!alertBox) return;
  alertBox.style.display = "block";
  alertBox.style.backgroundColor = color;
  alertBox.innerText = text;
}

function hideAlert() { if (alertBox) alertBox.style.display = "none"; }

function putarSuaraKonfirmasi(teks) {
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const teksHasil = String(teks || '')
    .toLowerCase()
    .replace(/(?:^|\s|-)\S/g, match => match.toUpperCase())
    .replace(/\bS\.?Pd\b/gi, 'Sarjana Pendidikan')
    .replace(/\bM\.?Pd\b/gi, 'Magister Pendidikan')
    .replace(/\bS\.?ST\b/gi, 'Sarjana Terapan')
    .replace(/[^\w\s,.]/gi, '');
  const utterance = new SpeechSynthesisUtterance(teksHasil);
  utterance.lang = 'id-ID';
  utterance.rate = 0.95;
  const voices = window.speechSynthesis.getVoices();
  const idVoice = voices.find(v => (v.lang.includes('id') || v.lang.includes('IND')) && (v.name.includes('Google') || v.name.includes('Natural')))
               || voices.find(v => v.lang.includes('id') || v.lang.includes('IND'));
  if (idVoice) utterance.voice = idVoice;
  window.speechSynthesis.speak(utterance);
}