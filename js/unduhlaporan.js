// ==========================================
// FILE: js/unduhlaporan.js
// MODUL EKSPOR LAPORAN ABSENSI & PKG (CSV & PDF RESMI)
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

/**
 * HELPER: Muat library eksternal sekali saja
 */
function loadPdfLibOnce_(src) {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) return resolve();
    const s = document.createElement("script");
    s.src = src;
    s.onload = resolve;
    s.onerror = reject;
    document.head.appendChild(s);
  });
}

/**
 * HELPER: Konversi gambar logo/TTD ke DataURL aman untuk jsPDF
 */
function toBase64ImageSafe_(url) {
  return new Promise((resolve) => {
    if (!url) return resolve("");
    const img = new Image();
    img.crossOrigin = "anonymous";
    const timer = setTimeout(() => resolve(""), 3000);

    img.onload = function () {
      clearTimeout(timer);
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth || img.width;
        canvas.height = img.naturalHeight || img.height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL("image/png"));
      } catch (e) {
        resolve("");
      }
    };
    img.onerror = function () {
      clearTimeout(timer);
      resolve("");
    };
    img.src = url;
  });
}

/**
 * 4. FUNGSI UNDUH LANGSUNG FILE PDF PERFORMA KINERJA GURU (NATIVE VECTOR PDF)
 */
async function unduhKinerjaGuruPDF(btnEl) {
  const rawData = (typeof cacheKinerjaGuru !== "undefined" && Array.isArray(cacheKinerjaGuru))
    ? cacheKinerjaGuru
    : [];

  if (rawData.length === 0) {
    alert("Belum ada data penilaian kinerja guru pada periode ini untuk diunduh.");
    return;
  }

  const keyword = (document.getElementById("kg-search-input")?.value || "").toLowerCase();
  const listData = rawData.filter(item =>
    String(item.namaGuru || "").toLowerCase().includes(keyword) ||
    String(item.nip || "").toLowerCase().includes(keyword) ||
    String(item.predikat || "").toLowerCase().includes(keyword)
  );

  if (listData.length === 0) {
    alert("Data hasil pencarian kosong untuk diunduh ke PDF.");
    return;
  }

  const targetBtn = btnEl || document.querySelector('button[onclick*="unduhKinerjaGuruPDF"], button[onclick*="exportKinerjaGuruPDF"]');
  const oldLabel = targetBtn ? targetBtn.innerHTML : "";
  if (targetBtn) {
    targetBtn.disabled = true;
    targetBtn.innerHTML = "⏳ Mengunduh PDF...";
  }

  try {
    // Muat jsPDF & jsPDF-AutoTable
    if (!window.jspdf) {
      await loadPdfLibOnce_("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
    }
    if (!window.jspdf?.jsPDF?.API?.autoTable) {
      await loadPdfLibOnce_("https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js");
    }

    // Ambil identitas sekolah & TTD dari Settings
    const instansiAtas = getSettingVal("INSTANSI_ATAS", ["setting-instansi-atas", "set-instansi-atas"], "PEMERINTAH PROVINSI LAMPUNG");
    const dinas = getSettingVal("DINAS", ["setting-dinas", "set-dinas"], "DINAS PENDIDIKAN DAN KEBUDAYAAN");
    const namaSekolah = getSettingVal("SCHOOL_NAME", ["setting-nama-sekolah", "set-nama-sekolah"], "SMA NEGERI 1 BUMI AGUNG");
    const alamatSekolah = getSettingVal("SCHOOL_ADDRESS", ["setting-alamat", "set-alamat-kop"], "Jl. Protokol No 1 Pisang Baru, Kec. Bumi Agung, Kab. Way Kanan");
    const website = getSettingVal("WEBSITE", ["setting-website"], "Website: sman1ba.sch.id");

    const rawLogoKiri = fixDrivePhotoUrl(getSettingVal("LOGO_KIRI", ["setting-logo-kiri", "set-logo-sekolah"], ""));
    const rawLogoKanan = fixDrivePhotoUrl(getSettingVal("SCHOOL_LOGO_URL", ["setting-logo-kanan", "set-logo-kanan"], ""));
    const rawTtd = fixDrivePhotoUrl(getSettingVal("TTD_KEPSEK", ["setting-ttd-kepsek", "set-ttd-kepsek"], ""));

    const [logoKiri, logoKanan, ttdKepsek] = await Promise.all([
      toBase64ImageSafe_(rawLogoKiri),
      toBase64ImageSafe_(rawLogoKanan),
      toBase64ImageSafe_(rawTtd)
    ]);

    const namaKepsek = getSettingVal("HEADMASTER_NAME", ["setting-nama-kepsek", "set-nama-kepsek"], "AMRODI NURUL HUDA, S.Ag");
    const nipKepsek = getSettingVal("HEADMASTER_NIP", ["setting-nip", "set-nip-kepsek"], "197103041998021001");

    const periodeVal = document.getElementById("kg-filter-periode")?.value || new Date().toISOString().slice(0, 7);
    const namaBulan = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
    const [thn, bln] = periodeVal.split("-");
    const periodeLabel = (thn && bln) ? `${namaBulan[parseInt(bln, 10) - 1] || bln} ${thn}` : periodeVal;

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth(); // 297 mm

    // --- KOP SURAT RESMI ---
    if (logoKiri && logoKiri.startsWith("data:image/")) {
      try { doc.addImage(logoKiri, "PNG", 16, 10, 19, 21); } catch (e) {}
    }
    if (logoKanan && logoKanan.startsWith("data:image/")) {
      try { doc.addImage(logoKanan, "PNG", pageWidth - 35, 10, 19, 21); } catch (e) {}
    }

    doc.setTextColor(0, 0, 0);
    doc.setFont("times", "normal");
    doc.setFontSize(11.5);
    doc.text(String(instansiAtas).toUpperCase(), pageWidth / 2, 14, { align: "center" });
    doc.text(String(dinas).toUpperCase(), pageWidth / 2, 19, { align: "center" });

    doc.setFont("times", "bold");
    doc.setFontSize(14.5);
    doc.text(String(namaSekolah).toUpperCase(), pageWidth / 2, 24.5, { align: "center" });

    doc.setFont("times", "italic");
    doc.setFontSize(8.5);
    doc.text(`${alamatSekolah}  |  ${website}`, pageWidth / 2, 29.5, { align: "center" });

    // Garis Ganda Kop Surat
    doc.setLineWidth(0.7);
    doc.line(14, 33, pageWidth - 14, 33);
    doc.setLineWidth(0.25);
    doc.line(14, 34.2, pageWidth - 14, 34.2);

    // --- JUDUL DOKUMEN ---
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11.5);
    doc.text("LAPORAN EVALUASI PERFORMA KINERJA GURU (PKG)", pageWidth / 2, 41, { align: "center" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(
      `Periode Penilaian: ${periodeLabel}   |   Bobot: Kehadiran (40%) & Supervisi Mengajar (60%)   |   Dicetak: ${new Date().toLocaleDateString("id-ID")}`,
      pageWidth / 2, 46, { align: "center" }
    );

    // --- RINGKASAN KPI ---
    const totalGuru = listData.length;
    const rataSkor = (listData.reduce((sum, x) => sum + Number(x.skorAkhir || 0), 0) / totalGuru).toFixed(1);
    const sangatBaik = listData.filter(x => Number(x.skorAkhir) >= 91).length;
    const perluBina = listData.filter(x => Number(x.skorAkhir) < 70).length;

    doc.setFillColor(242, 242, 242);
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.2);
    doc.rect(14, 49.5, pageWidth - 28, 7, "FD");

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.text(`Total Dinilai: ${totalGuru} Guru`, 18, 54);
    doc.text(`Rata-Rata Skor: ${rataSkor}`, 85, 54);
    doc.text(`Predikat Sangat Baik (>=91): ${sangatBaik} Guru`, 150, 54);
    doc.text(`Perlu Pembinaan (<70): ${perluBina} Guru`, 230, 54);

    // --- TABEL DATA ---
    const tableBody = listData.map((item, idx) => [
      idx + 1,
      `${item.namaGuru}\nNIP. ${item.nip || "-"}`,
      item.jabatan || "-",
      item.skorKehadiran,
      item.skorPerangkat,
      item.skorMengajar,
      item.skorAdministrasi,
      Number(item.skorAkhir).toFixed(1),
      item.predikat,
      item.catatan || "-"
    ]);

    doc.autoTable({
      startY: 59,
      margin: { left: 14, right: 14 },
      head: [[
        "NO", "NAMA GURU & NIP", "JABATAN / MAPEL",
        "HADIR\n(40%)", "PERANGKAT\n(20%)", "MENGAJAR\n(25%)", "ADMIN\n(15%)",
        "SKOR\nAKHIR", "PREDIKAT", "CATATAN PEMBINAAN"
      ]],
      body: tableBody,
      theme: "grid",
      styles: {
        font: "helvetica",
        fontSize: 8.5,
        textColor: [0, 0, 0],
        lineColor: [0, 0, 0],
        lineWidth: 0.2,
        cellPadding: 2.5,
        valign: "middle"
      },
      headStyles: {
        fillColor: [224, 224, 224],
        textColor: [0, 0, 0],
        fontStyle: "bold",
        halign: "center"
      },
      columnStyles: {
        0: { halign: "center", cellWidth: 10 },
        1: { cellWidth: 54 },
        2: { cellWidth: 38 },
        3: { halign: "center", cellWidth: 17 },
        4: { halign: "center", cellWidth: 21 },
        5: { halign: "center", cellWidth: 21 },
        6: { halign: "center", cellWidth: 17 },
        7: { halign: "center", cellWidth: 18, fontStyle: "bold" },
        8: { halign: "center", cellWidth: 25, fontStyle: "bold" },
        9: { cellWidth: 48 }
      }
    });

    // --- BLOK TANDA TANGAN KEPALA SEKOLAH ---
    let finalY = (doc.lastAutoTable?.finalY || 120) + 10;
    if (finalY > 168) {
      doc.addPage();
      finalY = 20;
    }

    const ttdX = pageWidth - 65;
    doc.setFont("times", "normal");
    doc.setFontSize(10.5);
    doc.text("Mengetahui,", ttdX, finalY, { align: "center" });
    doc.text("Kepala Sekolah", ttdX, finalY + 5, { align: "center" });

    if (ttdKepsek && ttdKepsek.startsWith("data:image/")) {
      try { doc.addImage(ttdKepsek, "PNG", ttdX - 18, finalY + 6, 36, 15); } catch (e) {}
    }

    doc.setFont("times", "bold");
    doc.text(String(namaKepsek), ttdX, finalY + 24, { align: "center" });
    const nameWidth = doc.getTextWidth(String(namaKepsek));
    doc.setLineWidth(0.3);
    doc.line(ttdX - nameWidth / 2, finalY + 25, ttdX + nameWidth / 2, finalY + 25);

    doc.setFont("times", "normal");
    doc.text(`NIP. ${nipKepsek}`, ttdX, finalY + 29.5, { align: "center" });

    // Simpan langsung ke folder Downloads
    doc.save(`Laporan_Performa_Kinerja_Guru_${periodeVal}.pdf`);
  } catch (err) {
    console.error("Gagal mengunduh PDF:", err);
    alert("Gagal membuat file PDF. Periksa koneksi internet Anda lalu coba kembali.");
  } finally {
    if (targetBtn) {
      targetBtn.disabled = false;
      targetBtn.innerHTML = oldLabel || "📄 Unduh PDF";
    }
  }
}

// Alias agar tetap jalan jika tombol memanggil exportKinerjaGuruPDF()
const exportKinerjaGuruPDF = unduhKinerjaGuruPDF;