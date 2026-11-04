// ==========================================
// FILE: js/unduhlaporan.js
// MODUL EKSPOR LAPORAN ABSENSI (CSV & PDF RESMI)
// ==========================================

/**
 * 1. FUNGSI UNDUH LAPORAN EXCEL / CSV
 */
function unduhLaporanCSV() {
  // Ambil tabel preview yang sedang tampil
  const table = document.querySelector("#tabel-preview-laporan") || document.querySelector("#laporan-absensi table"); 
  
  if (!table || table.querySelector("tbody")?.children.length === 0) {
    alert("Silakan klik 'Tampilkan Preview' terlebih dahulu!");
    return;
  }

  // Tarik data identitas sekolah dari input pengaturan (Fallback ke default)
  const instansiAtas = document.getElementById("setting-instansi-atas")?.value || document.getElementById("set-instansi-atas")?.value || "PEMERINTAH PROVINSI LAMPUNG";
  const dinas = document.getElementById("setting-dinas")?.value || document.getElementById("set-dinas")?.value || "DINAS PENDIDIKAN DAN KEBUDAYAAN";
  const namaSekolah = document.getElementById("setting-nama-sekolah")?.value || document.getElementById("set-nama-sekolah")?.value || "SMA NEGERI 1 BUMI AGUNG";
  const alamatSekolah = document.getElementById("setting-alamat")?.value || document.getElementById("set-alamat-kop")?.value || "Jl. Protokol No 1 Pisang Baru, Kec. Bumi Agung, Kab. Way Kanan";

  let csv = [];
  
  // Kop Informasi Spreadsheet
  csv.push(`"${instansiAtas}"`);
  csv.push(`"${dinas}"`);
  csv.push(`"${namaSekolah}"`);
  csv.push(`"${alamatSekolah}"`);
  csv.push(""); 
  csv.push('"LAPORAN REKAPITULASI ABSENSI RESMI"');
  csv.push(""); 

  // Ambil isi tabel
  const rows = table.querySelectorAll("tr");
  for (let i = 0; i < rows.length; i++) {
    let row = [];
    let cols = rows[i].querySelectorAll("td, th");
    
    // Abaikan baris placeholder "Pilih filter..."
    if (cols.length === 1 && cols[0].getAttribute("colspan")) continue;

    for (let j = 0; j < cols.length; j++) {
      let data = cols[j].innerText.replace(/"/g, '""').trim();
      row.push(`"${data}"`);
    }
    if (row.length > 0) csv.push(row.join(";"));
  }

  // Tambahkan UTF-8 BOM (\uFEFF) agar huruf & karakter terbaca rapi saat dibuka di Microsoft Excel
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
 * 2. FUNGSI UNDUH LAPORAN PDF RESMI (CETAK DOKUMEN CLEAN & KOP SURAT)
 */
function unduhLaporanPDF() {
  const table = document.querySelector("#tabel-preview-laporan") || document.querySelector("#laporan-absensi table");
  
  if (!table || table.querySelector("tbody")?.children.length === 0) {
    alert("Silakan klik 'Tampilkan Preview' terlebih dahulu sebelum mengunduh PDF.");
    return;
  }

  // Tarik data identitas Kop & Tanda Tangan dari Pengaturan
  const instansiAtas = document.getElementById("setting-instansi-atas")?.value || document.getElementById("set-instansi-atas")?.value || "PEMERINTAH PROVINSI LAMPUNG";
  const dinas = document.getElementById("setting-dinas")?.value || document.getElementById("set-dinas")?.value || "DINAS PENDIDIKAN DAN KEBUDAYAAN";
  const namaSekolah = document.getElementById("setting-nama-sekolah")?.value || document.getElementById("set-nama-sekolah")?.value || "SMA NEGERI 1 BUMI AGUNG";
  const alamatSekolah = document.getElementById("setting-alamat")?.value || document.getElementById("set-alamat-kop")?.value || "Jl. Protokol No 1 Pisang Baru, Kec. Bumi Agung, Kab. Way Kanan";
  const website = document.getElementById("setting-website")?.value || "Website: sman1ba.sch.id";
  
  const logoKiri = document.getElementById("setting-logo-kiri")?.value || document.getElementById("set-logo-sekolah")?.value || "";
  const logoKanan = document.getElementById("setting-logo-kanan")?.value || "";
  const namaKepsek = document.getElementById("setting-nama-kepsek")?.value || document.getElementById("set-nama-kepsek")?.value || "Nama Kepala Sekolah";
  const nipKepsek = document.getElementById("setting-nip")?.value || document.getElementById("set-nip-kepsek")?.value || "-";

  const role = document.getElementById("lap-role")?.value || "Siswa";
  const jenis = document.getElementById("lap-jenis")?.value || "Harian";
  const tglMulai = document.getElementById("lap-tgl-mulai")?.value || "-";

  // Salin tabel agar style di halaman admin tidak merusak layout cetak PDF
  const tableClone = table.cloneNode(true);
  tableClone.style.width = "100%";
  tableClone.style.borderCollapse = "collapse";
  tableClone.style.marginTop = "15px";

  // Format sel tabel agar bergaris hitam tegas khas dokumen resmi
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

  // Susun elemen Kop dan Tanda Tangan
  const imgKiriTag = (logoKiri && logoKiri.startsWith("http")) ? `<img src="${logoKiri}" style="width: 75px; height: auto;">` : '<div style="width: 75px;"></div>';
  const imgKananTag = (logoKanan && logoKanan.startsWith("http")) ? `<img src="${logoKanan}" style="width: 75px; height: auto;">` : '<div style="width: 75px;"></div>';

  // Buka jendela khusus untuk proses simpan PDF
  const printWin = window.open("", "_blank");
  
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

        .ttd-container { margin-top: 30px; float: right; text-align: right; font-size: 11pt; padding-right: 15px; page-break-inside: avoid; }
        .ttd-container p { margin: 2px 0; }
        .ttd-space { height: 65px; }

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
        <div class="ttd-space"></div>
        <p><strong><u>${namaKepsek}</u></strong></p>
        <p>NIP. ${nipKepsek}</p>
      </div>

      <script>
        window.onload = function() {
          window.print();
          setTimeout(function() { window.close(); }, 600);
        };
      <\/script>
    </body>
    </html>
  `;

  printWin.document.open();
  printWin.document.write(htmlContent);
  printWin.document.close();
}