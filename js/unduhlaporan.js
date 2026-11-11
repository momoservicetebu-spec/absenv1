// ==========================================
// FILE: js/unduhlaporan.js
// MODUL EKSPOR LAPORAN ABSENSI (CSV & PDF RESMI)
// ==========================================

/**
 * HELPER: Konversi URL Google Drive ke Direct Image Streaming URL
 */
function fixDrivePhotoUrl(url) {
  try {
    if (!url || typeof url !== 'string') return '';
    let cleanUrl = url.trim();
    if (!cleanUrl) return '';
    
    if (cleanUrl.includes('lh3.googleusercontent.com')) return cleanUrl;
    
    let fileId = '';
    const matchD = cleanUrl.match(/\/d\/([^\/\?]+)/);
    const matchId = cleanUrl.match(/id=([^&]+)/);
    
    if (matchD && matchD[1]) fileId = matchD[1];
    else if (matchId && matchId[1]) fileId = matchId[1];
    
    return fileId ? 'https://lh3.googleusercontent.com/d/' + fileId : cleanUrl;
  } catch (e) {
    console.error("Error fixDrivePhotoUrl:", e);
    return url || '';
  }
}

/**
 * HELPER: Mengambil Data Pengaturan dari Database Settings (Window Obj / Input Form)
 */
function getSettingVal(key, inputIds, defaultValue) {
  if (window.appSettings && window.appSettings[key]) {
    return window.appSettings[key];
  }
  
  for (let id of inputIds) {
    const el = document.getElementById(id);
    if (el && el.value && el.value.trim() !== "") {
      return el.value.trim();
    }
  }

  return defaultValue;
}

/**
 * 1. FUNGSI UNDUH LAPORAN EXCEL / CSV (PUSAT LAPORAN)
 */
function unduhLaporanCSV() {
  const table = document.querySelector("#tabel-preview-laporan") || document.querySelector("#laporan-absensi table"); 
  
  if (!table || table.querySelector("tbody")?.children.length === 0) {
    alert("Silakan klik 'Tampilkan Preview' terlebih dahulu!");
    return;
  }

  const instansiAtas = getSettingVal("INSTANSI_ATAS", ["setting-instansi-atas", "set-instansi-atas"], "PEMERINTAH PROVINSI LAMPUNG");
  const dinas = getSettingVal("DINAS", ["setting-dinas", "set-dinas"], "DINAS PENDIDIKAN DAN KEBUDAYAAN");
  const namaSekolah = getSettingVal("SCHOOL_NAME", ["setting-nama-sekolah", "set-nama-sekolah"], "SMA NEGERI 1 BUMI AGUNG");
  const alamatSekolah = getSettingVal("SCHOOL_ADDRESS", ["setting-alamat", "set-alamat-kop"], "Jl. Protokol No 1 Pisang Baru, Kec. Bumi Agung, Kab. Way Kanan");

  let csv = [];
  csv.push(`"${instansiAtas}"`);
  csv.push(`"${dinas}"`);
  csv.push(`"${namaSekolah}"`);
  csv.push(`"${alamatSekolah}"`);
  csv.push(""); 
  csv.push('"LAPORAN REKAPITULASI ABSENSI RESMI"');
  csv.push(""); 

  const rows = table.querySelectorAll("tr");
  for (let i = 0; i < rows.length; i++) {
    let row = [];
    let cols = rows[i].querySelectorAll("td, th");
    if (cols.length === 1 && cols[0].getAttribute("colspan")) continue;

    for (let j = 0; j < cols.length; j++) {
      let data = cols[j].innerText.replace(/"/g, '""').trim();
      row.push(`"${data}"`);
    }
    if (row.length > 0) csv.push(row.join(";"));
  }

  const csvContent = "\uFEFF" + csv.join("\n");
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const downloadLink = document.createElement("a");
  
  const role = document.getElementById("lap-role")?.value || "Pengguna";
  const tgl = document.getElementById("lap-tgl-mulai")?.value || "Rekap";
  
  downloadLink.download = `Laporan_Absensi_${role}_${tgl}.csv`;
  downloadLink.href = window.URL.createObjectURL(blob);
  downloadLink.style.display = "none";
  
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
}

/**
 * 2. FUNGSI UNDUH LAPORAN PDF RESMI (PUSAT LAPORAN)
 */
function unduhLaporanPDF() {
  const table = document.querySelector("#tabel-preview-laporan") || document.querySelector("#laporan-absensi table");
  
  if (!table || table.querySelector("tbody")?.children.length === 0) {
    alert("Silakan klik 'Tampilkan Preview' terlebih dahulu sebelum mengunduh PDF.");
    return;
  }

  const instansiAtas = getSettingVal("INSTANSI_ATAS", ["setting-instansi-atas", "set-instansi-atas"], "PEMERINTAH PROVINSI LAMPUNG");
  const dinas = getSettingVal("DINAS", ["setting-dinas", "set-dinas"], "DINAS PENDIDIKAN DAN KEBUDAYAAN");
  const namaSekolah = getSettingVal("SCHOOL_NAME", ["setting-nama-sekolah", "set-nama-sekolah"], "SMA NEGERI 1 BUMI AGUNG");
  const alamatSekolah = getSettingVal("SCHOOL_ADDRESS", ["setting-alamat", "set-alamat-kop"], "Jl. Protokol No 1 Pisang Baru, Kec. Bumi Agung, Kab. Way Kanan");
  const website = getSettingVal("WEBSITE", ["setting-website"], "Website: sman1ba.sch.id");
  
  const rawLogoKiri = getSettingVal("LOGO_KIRI", ["setting-logo-kiri", "set-logo-sekolah"], "");
  const rawLogoKanan = getSettingVal("SCHOOL_LOGO_URL", ["setting-logo-kanan", "set-logo-kanan"], "");
  const rawTtd = getSettingVal("TTD_KEPSEK", ["setting-ttd-kepsek", "set-ttd-kepsek"], "");
  
  const logoKiri = fixDrivePhotoUrl(rawLogoKiri);
  const logoKanan = fixDrivePhotoUrl(rawLogoKanan);
  const ttdKepsek = fixDrivePhotoUrl(rawTtd);

  const namaKepsek = getSettingVal("HEADMASTER_NAME", ["setting-nama-kepsek", "set-nama-kepsek"], "Nama Kepala Sekolah");
  const nipKepsek = getSettingVal("HEADMASTER_NIP", ["setting-nip", "set-nip-kepsek"], "-");

  const role = document.getElementById("lap-role")?.value || "Siswa";
  const jenis = document.getElementById("lap-jenis")?.value || "Harian";
  const tglMulai = document.getElementById("lap-tgl-mulai")?.value || "-";

  const tableClone = table.cloneNode(true);
  tableClone.style.width = "100%";
  tableClone.style.borderCollapse = "collapse";
  tableClone.style.marginTop = "15px";

  const cells = tableClone.querySelectorAll("th, td");
  cells.forEach(cell => {
    cell.style.border = "1px solid #000";
    cell.style.padding = "6px 8px";
    cell.style.color = "#000";
    cell.style.fontSize = "10pt";
    cell.style.fontFamily = "Arial, sans-serif";
  });

  const headers = tableClone.querySelectorAll("th");
  headers.forEach(th => {
    th.style.backgroundColor = "#e0e0e0";
    th.style.fontWeight = "bold";
    th.style.textAlign = "center";
  });

  // STYLE PENYEIMBANG UKURAN LOGO
  const imgKiriTag = logoKiri ? `<img src="${logoKiri}" style="height: 80px; width: auto; max-width: 85px; object-fit: contain;" alt="Logo Kiri">` : '<div style="width: 80px;"></div>';
  const imgKananTag = logoKanan ? `<img src="${logoKanan}" style="height: 80px; width: auto; max-width: 85px; object-fit: contain;" alt="Logo Kanan">` : '<div style="width: 80px;"></div>';
  const imgTtdTag = ttdKepsek ? `<img src="${ttdKepsek}" style="max-height: 60px; max-width: 150px; object-fit: contain;" alt="TTD">` : '';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Laporan_Absensi_${role}_${tglMulai}</title>
      <style>
        body { font-family: 'Times New Roman', Times, serif; color: #000; padding: 20px; margin: 0; }
        .kop-container { display: flex; justify-content: space-between; align-items: center; border-bottom: 4px double #000; padding-bottom: 8px; margin-bottom: 15px; }
        .kop-center { text-align: center; flex-grow: 1; padding: 0 10px; }
        .kop-center h2 { margin: 0; font-size: 13pt; font-weight: normal; text-transform: uppercase; }
        .kop-center h1 { margin: 2px 0; font-size: 15pt; font-weight: bold; text-transform: uppercase; }
        .kop-center p { margin: 0; font-size: 8.5pt; font-style: italic; }
        
        .judul-doc { text-align: center; margin: 15px 0; }
        .judul-doc h3 { margin: 0; font-size: 12pt; text-decoration: underline; text-transform: uppercase; font-family: Arial, sans-serif; }
        .judul-doc p { margin: 4px 0 0 0; font-size: 9.5pt; font-family: Arial, sans-serif; }

        .ttd-container { margin-top: 30px; float: right; text-align: center; font-size: 11pt; padding-right: 15px; min-width: 220px; page-break-inside: avoid; }
        .ttd-container p { margin: 2px 0; }
        .ttd-space { height: 65px; display: flex; align-items: center; justify-content: center; }

        @media print {
          @page { size: A4 portrait; margin: 12mm; }
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      <div class="kop-container">
        ${imgKiriTag}
        <div class="kop-center">
          <h2>${instansiAtas}</h2>
          <h2>${dinas}</h2>
          <h1>${namaSekolah}</h1>
          <p>${alamatSekolah}</p>
          <p>${website}</p>
        </div>
        ${imgKananTag}
      </div>

      <div class="judul-doc">
        <h3>LAPORAN REKAPITULASI ABSENSI ${role.toUpperCase()}</h3>
        <p>Tipe Laporan: ${jenis} | Tanggal Cetak: ${new Date().toLocaleDateString('id-ID')}</p>
      </div>

      ${tableClone.outerHTML}

      <div class="ttd-container">
        <p>Mengetahui,</p>
        <p>Kepala Sekolah</p>
        <div class="ttd-space">${imgTtdTag}</div>
        <p><strong><u>${namaKepsek}</u></strong></p>
        <p>NIP. ${nipKepsek}</p>
      </div>
    </body>
    </html>
  `;

  triggerPrintWithPreload(htmlContent);
}

/**
 * 3. FUNGSI UNDUH PDF LIVE MONITOR HARIAN (REAL-TIME)
 */
function unduhLiveMonitorPDF() {
  const dataLive = window.dataLiveAbsenAktif || [];
  const daftarKartu = document.querySelectorAll("#live-absen-grid > div");
  
  if (dataLive.length === 0 && daftarKartu.length === 0) {
    alert("Belum ada data absensi yang tercatat untuk hari ini.");
    return;
  }

  const instansiAtas = getSettingVal("INSTANSI_ATAS", ["setting-instansi-atas", "set-instansi-atas"], "PEMERINTAH PROVINSI LAMPUNG");
  const dinas = getSettingVal("DINAS", ["setting-dinas", "set-dinas"], "DINAS PENDIDIKAN DAN KEBUDAYAAN");
  const namaSekolah = getSettingVal("SCHOOL_NAME", ["setting-nama-sekolah", "set-nama-sekolah"], "SMA NEGERI 1 BUMI AGUNG");
  const alamatSekolah = getSettingVal("SCHOOL_ADDRESS", ["setting-alamat", "set-alamat-kop"], "Jl. Protokol No 1 Pisang Baru, Kec. Bumi Agung, Kab. Way Kanan");
  
  const rawLogoKiri = getSettingVal("LOGO_KIRI", ["setting-logo-kiri", "set-logo-sekolah"], "");
  const rawLogoKanan = getSettingVal("SCHOOL_LOGO_URL", ["setting-logo-kanan", "set-logo-kanan"], "");
  const rawTtd = getSettingVal("TTD_KEPSEK", ["setting-ttd-kepsek", "set-ttd-kepsek"], "");

  const logoKiri = fixDrivePhotoUrl(rawLogoKiri);
  const logoKanan = fixDrivePhotoUrl(rawLogoKanan);
  const ttdKepsek = fixDrivePhotoUrl(rawTtd);

  const namaKepsek = getSettingVal("HEADMASTER_NAME", ["setting-nama-kepsek", "set-nama-kepsek"], "AMRODI NURUL HUDA, S.Ag");
  const nipKepsek = getSettingVal("HEADMASTER_NIP", ["setting-nip", "set-nip-kepsek"], "197103041998021001");

  const tglHariIni = new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  const roleAktif = window.currentLiveRole === "GURU" ? "GURU & STAF TU" : "SISWA";
  const labelIdentitas = window.currentLiveRole === "GURU" ? "NIP" : "NISN";

  let bodyTabelHtml = '';

  if (dataLive.length > 0) {
    dataLive.forEach((item, i) => {
      const nama = item.Nama || item.UserID || "Tanpa Nama";
      const userID = item.UserID || "-";
      const nipVal = item.NIP || item.nip || item.NISN || item.nisn || "-";
      const displayIdNip = (nipVal && nipVal !== "-") ? `${userID}<br><span style="font-size: 8.5pt; color: #555;">${labelIdentitas}. ${nipVal}</span>` : userID;

      let role = item.Role || "Guru";
      if (String(userID).toUpperCase().startsWith("TU-") || String(role).toUpperCase().includes("TENAGA")) {
        role = "Tenaga Kependidikan";
      }
      const waktu = item.Timestamp || item.Time || "-";
      const statusText = item["Status(Hadir/Telat/Izin/dll)"] || item.Status || "Hadir";

      bodyTabelHtml += `
        <tr>
          <td style="text-align: center;">${i + 1}</td>
          <td><strong>${nama}</strong></td>
          <td style="text-align: center;">${displayIdNip}</td>
          <td style="text-align: center;">${role}</td>
          <td style="text-align: center; font-weight: bold;">${waktu}</td>
          <td style="text-align: center; font-weight: bold;">${statusText}</td>
        </tr>`;
    });
  } else {
    daftarKartu.forEach((card, i) => {
      const nama = card.querySelector("h4")?.innerText || "-";
      const waktu = card.querySelector("p")?.innerText.replace("⏰", "").trim() || "-";
      const userID = card.querySelector(".id b")?.innerText || "-";
      const nipText = card.querySelector("div[style*='color: #81ecec'] b")?.innerText || "-";
      const displayIdNip = (nipText && nipText !== "-") ? `${userID}<br><span style="font-size: 8.5pt; color: #555;">${labelIdentitas}. ${nipText}</span>` : userID;

      const role = card.querySelector(".role")?.innerText || "Guru / Staf";
      const status = card.querySelector(".status")?.innerText || "MASUK";

      bodyTabelHtml += `
        <tr>
          <td style="text-align: center;">${i + 1}</td>
          <td><strong>${nama}</strong></td>
          <td style="text-align: center;">${displayIdNip}</td>
          <td style="text-align: center;">${role}</td>
          <td style="text-align: center; font-weight: bold;">${waktu}</td>
          <td style="text-align: center; font-weight: bold;">${status}</td>
        </tr>`;
    });
  }

  // STYLE PENYEIMBANG UKURAN LOGO
  const imgKiriTag = logoKiri ? `<img src="${logoKiri}" style="height: 80px; width: auto; max-width: 85px; object-fit: contain;" alt="Logo Kiri">` : '<div style="width: 80px;"></div>';
  const imgKananTag = logoKanan ? `<img src="${logoKanan}" style="height: 80px; width: auto; max-width: 85px; object-fit: contain;" alt="Logo Kanan">` : '<div style="width: 80px;"></div>';
  const imgTtdTag = ttdKepsek ? `<img src="${ttdKepsek}" style="max-height: 60px; max-width: 150px; object-fit: contain;" alt="TTD">` : '';

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Live_Monitor_Absensi_${new Date().toISOString().split('T')[0]}</title>
      <style>
        body { font-family: 'Times New Roman', Times, serif; color: #000; padding: 20px; margin: 0; }
        .kop-container { display: flex; justify-content: space-between; align-items: center; border-bottom: 4px double #000; padding-bottom: 8px; margin-bottom: 15px; }
        .kop-center { text-align: center; flex-grow: 1; padding: 0 10px; }
        .kop-center h2 { margin: 0; font-size: 13pt; font-weight: normal; text-transform: uppercase; }
        .kop-center h1 { margin: 2px 0; font-size: 15pt; font-weight: bold; text-transform: uppercase; }
        .kop-center p { margin: 0; font-size: 8.5pt; font-style: italic; }
        
        .judul-doc { text-align: center; margin: 15px 0 20px 0; }
        .judul-doc h3 { margin: 0; font-size: 12pt; text-decoration: underline; text-transform: uppercase; font-family: Arial, sans-serif; }
        .judul-doc p { margin: 4px 0 0 0; font-size: 9.5pt; font-family: Arial, sans-serif; }

        table { width: 100%; border-collapse: collapse; margin-top: 10px; font-family: Arial, sans-serif; font-size: 10pt; }
        th, td { border: 1px solid #000; padding: 7px 9px; }
        th { background-color: #e0e0e0; font-weight: bold; text-align: center; }

        .ttd-container { margin-top: 30px; float: right; text-align: center; font-size: 11pt; padding-right: 15px; min-width: 220px; page-break-inside: avoid; }
        .ttd-container p { margin: 2px 0; }
        .ttd-space { height: 65px; display: flex; align-items: center; justify-content: center; }

        @media print {
          @page { size: A4 portrait; margin: 12mm; }
          body { padding: 0; }
        }
      </style>
    </head>
    <body>
      <div class="kop-container">
        ${imgKiriTag}
        <div class="kop-center">
          <h2>${instansiAtas}</h2>
          <h2>${dinas}</h2>
          <h1>${namaSekolah}</h1>
          <p>${alamatSekolah}</p>
        </div>
        ${imgKananTag}
      </div>

      <div class="judul-doc">
        <h3>LAPORAN LIVE MONITOR ABSENSI (${roleAktif})</h3>
        <p>Hari / Tanggal: ${tglHariIni} | Jam Cetak: ${new Date().toLocaleTimeString('id-ID')} WIB</p>
      </div>

      <table>
        <thead>
          <tr>
            <th style="width: 35px;">NO</th>
            <th>NAMA LENGKAP</th>
            <th style="width: 140px;">ID / ${labelIdentitas}</th>
            <th style="width: 130px;">PERAN / KELAS</th>
            <th style="width: 90px;">WAKTU ABSEN</th>
            <th style="width: 110px;">STATUS</th>
          </tr>
        </thead>
        <tbody>
          ${bodyTabelHtml}
        </tbody>
      </table>

      <div class="ttd-container">
        <p>Mengetahui,</p>
        <p>Kepala Sekolah</p>
        <div class="ttd-space">${imgTtdTag}</div>
        <p><strong><u>${namaKepsek}</u></strong></p>
        <p>NIP. ${nipKepsek}</p>
      </div>
    </body>
    </html>
  `;

  triggerPrintWithPreload(htmlContent);
}

/**
 * HELPER: Membuka Jendela Print & Memastikan Semua Gambar Terunduh Sempurna
 */
function triggerPrintWithPreload(htmlContent) {
  const printWin = window.open("", "_blank");
  printWin.document.open();
  printWin.document.write(htmlContent);
  printWin.document.close();

  printWin.onload = function() {
    const images = printWin.document.getElementsByTagName('img');
    let loaded = 0;
    const total = images.length;

    const executePrint = () => {
      setTimeout(() => {
        printWin.focus();
        printWin.print();
      }, 300);
    };

    if (total === 0) {
      executePrint();
    } else {
      for (let i = 0; i < total; i++) {
        if (images[i].complete) {
          loaded++;
          if (loaded === total) executePrint();
        } else {
          images[i].onload = images[i].onerror = function() {
            loaded++;
            if (loaded === total) executePrint();
          };
        }
      }
    }
  };
}