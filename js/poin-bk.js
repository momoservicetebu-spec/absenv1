// =========================================================
// MODUL FRONTEND: SISTEM POIN SISWA & BIMBINGAN KONSELING
// =========================================================
let cacheDataPoinBK = {
  daftarSiswa: [],
  masterAturan: [],
  rekapSiswa: [],
  logPoin: [],
  logBK: []
};
let activeTabPoinBK = "rekap";

function getPoinApiUrl_() {
  if (typeof API_URL !== "undefined" && API_URL) return API_URL;
  if (typeof CONFIG !== "undefined" && CONFIG.SCRIPT_URL) return CONFIG.SCRIPT_URL;
  if (typeof SCRIPT_URL !== "undefined" && SCRIPT_URL) return SCRIPT_URL;
  return window.API_URL || window.SCRIPT_URL || "";
}

document.addEventListener("DOMContentLoaded", () => {
  const today = new Date().toISOString().slice(0, 10);
  const ym = today.slice(0, 7);
  if (document.getElementById("pbk-sync-bulan")) document.getElementById("pbk-sync-bulan").value = ym;
  if (document.getElementById("pbk-tanggal")) document.getElementById("pbk-tanggal").value = today;
  if (document.getElementById("bk-tanggal")) document.getElementById("bk-tanggal").value = today;
});

async function loadDataPoinBK() {
  const tbody = document.getElementById("tbody-pbk-rekap");
  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:20px; color:#a29bfe;">⏳ Memuat data poin siswa & bimbingan konseling...</td></tr>';
  }

  try {
    const res = await fetch(`${getPoinApiUrl_()}?action=getDataPoinBK`);
    const json = await res.json();

    if (json.status === "success") {
      cacheDataPoinBK = json;
      populateFilterKelasPoin_();
      updateKpiPoinBK_();
      renderActiveTabPoinBK();
    }
  } catch (err) {
    console.error("Gagal memuat data Poin & BK:", err);
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:20px; color:#ff6b6b;">Gagal memuat data Poin & BK. Pastikan Apps Script sudah di-deploy versi terbaru.</td></tr>';
    }
  }
}

function populateFilterKelasPoin_() {
  const sel = document.getElementById("pbk-filter-kelas");
  if (!sel) return;
  const current = sel.value;
  const kelasSet = new Set(
    (cacheDataPoinBK.daftarSiswa || []).map(s => s.kelas).filter(k => k && k !== "-")
  );
  sel.innerHTML = '<option value="">Semua Kelas</option>';
  Array.from(kelasSet).sort().forEach(k => {
    const opt = document.createElement("option");
    opt.value = k;
    opt.textContent = `Kelas ${k}`;
    sel.appendChild(opt);
  });
  if (current) sel.value = current;
}

function updateKpiPoinBK_() {
  const rekap = cacheDataPoinBK.rekapSiswa || [];
  const tercatat = rekap.filter(s => s.totalPelanggaran > 0 || s.totalPrestasi > 0).length;
  const sp1 = rekap.filter(s => s.poinNetto >= 16 && s.poinNetto <= 35).length;
  const sp23 = rekap.filter(s => s.poinNetto >= 36).length;
  const totalBK = (cacheDataPoinBK.logBK || []).length;

  document.getElementById("pbk-kpi-siswa").textContent = tercatat;
  document.getElementById("pbk-kpi-sp1").textContent = sp1;
  document.getElementById("pbk-kpi-sp2").textContent = sp23;
  document.getElementById("pbk-kpi-bk").textContent = totalBK;
}

function switchTabPoinBK(tabName) {
  activeTabPoinBK = tabName;
  ["rekap", "riwayat", "bk"].forEach(t => {
    const panel = document.getElementById(`pbk-panel-${t}`);
    const btn = document.getElementById(`tab-btn-${t}`);
    if (panel) panel.style.display = t === tabName ? "block" : "none";
    if (btn) {
      if (t === tabName) {
        btn.classList.add("btn-primary");
        btn.style.background = "";
      } else {
        btn.classList.remove("btn-primary");
        btn.style.background = "#161224";
      }
    }
  });
  renderActiveTabPoinBK();
}

function renderActiveTabPoinBK() {
  const kelasFilter = document.getElementById("pbk-filter-kelas")?.value || "";
  const kw = (document.getElementById("pbk-search")?.value || "").toLowerCase();

  const matchFilter = (nama, nisn, kelas) => {
    if (kelasFilter && String(kelas) !== kelasFilter) return false;
    if (kw && !String(nama).toLowerCase().includes(kw) && !String(nisn).toLowerCase().includes(kw)) return false;
    return true;
  };

  if (activeTabPoinBK === "rekap") {
    const tbody = document.getElementById("tbody-pbk-rekap");
    const list = (cacheDataPoinBK.rekapSiswa || []).filter(s => matchFilter(s.namaSiswa, s.nisn, s.kelas));
    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:20px; color:#a29bfe;">Tidak ada data siswa yang sesuai filter.</td></tr>';
      return;
    }
    tbody.innerHTML = list.map((s, idx) => {
      let badgeStyle = "background:#10ac84; color:#fff;";
      if (s.poinNetto > 60) badgeStyle = "background:#ee5253; color:#fff;";
      else if (s.poinNetto >= 36) badgeStyle = "background:#ff9f43; color:#000;";
      else if (s.poinNetto >= 16) badgeStyle = "background:#feca57; color:#000;";

      return `
        <tr>
          <td>${idx + 1}</td>
          <td><strong>${s.namaSiswa}</strong><br><small style="color:#a29bfe;">NISN: ${s.nisn}</small></td>
          <td>${s.kelas}</td>
          <td style="color:#ff6b6b; font-weight:bold;">+${s.totalPelanggaran}</td>
          <td style="color:#1dd1a1; font-weight:bold;">-${s.totalPrestasi}</td>
          <td><strong style="font-size:14px; color:#00d2d3;">${s.poinNetto}</strong></td>
          <td><span class="badge" style="${badgeStyle}">${s.statusSP}</span></td>
          <td>${s.jumlahBK} Sesi</td>
          <td>
            <button type="button" class="btn-action btn-small" onclick="openModalInputPoin('${s.siswaId}')" title="Input Poin">+ Poin</button>
            <button type="button" class="btn-action btn-small" style="background:#00b894; color:#fff;" onclick="openModalInputBK('${s.siswaId}')" title="Catat Konseling BK">BK</button>
            <button type="button" class="btn-action btn-small" style="background:#d63031; color:#fff;" onclick="cetakSuratPanggilanPDF('${s.siswaId}')" title="Cetak Surat Peringatan / Panggilan Ortu PDF">📄 SP</button>
          </td>
        </tr>
      `;
    }).join("");
  } else if (activeTabPoinBK === "riwayat") {
    const tbody = document.getElementById("tbody-pbk-riwayat");
    const list = (cacheDataPoinBK.logPoin || []).filter(r => matchFilter(r.namaSiswa, r.nisn, r.kelas));
    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:20px; color:#a29bfe;">Belum ada riwayat catatan pelanggaran maupun prestasi.</td></tr>';
      return;
    }
    tbody.innerHTML = list.map((r, idx) => {
      const isPrestasi = r.kategori === "PRESTASI";
      const badge = isPrestasi
        ? '<span class="badge badge-success">PRESTASI</span>'
        : '<span class="badge badge-danger">PELANGGARAN</span>';
      const poinStr = isPrestasi
        ? `<strong style="color:#1dd1a1;">-${r.poin}</strong>`
        : `<strong style="color:#ff6b6b;">+${r.poin}</strong>`;

      return `
        <tr>
          <td>${idx + 1}</td>
          <td>${r.tanggal}</td>
          <td><strong>${r.namaSiswa}</strong><br><small style="color:#a29bfe;">NISN: ${r.nisn}</small></td>
          <td>${r.kelas}</td>
          <td>${badge}</td>
          <td style="white-space:normal;"><strong>${r.namaAturan}</strong>${r.keterangan ? `<br><small style="color:#a29bfe;">${r.keterangan}</small>` : ""}</td>
          <td>${poinStr}</td>
          <td>${r.pelapor}</td>
          <td>
            <button type="button" class="btn-action btn-small badge-danger" style="border:none;" onclick="hapusLogPoin('${r.idPoin}')">🗑️</button>
          </td>
        </tr>
      `;
    }).join("");
  } else if (activeTabPoinBK === "bk") {
    const tbody = document.getElementById("tbody-pbk-bk");
    const list = (cacheDataPoinBK.logBK || []).filter(b => matchFilter(b.namaSiswa, b.nisn, b.kelas));
    if (list.length === 0) {
      tbody.innerHTML = '<tr><td colspan="9" style="text-align:center; padding:20px; color:#a29bfe;">Belum ada catatan layanan Bimbingan Konseling (BK).</td></tr>';
      return;
    }
    tbody.innerHTML = list.map((b, idx) => {
      const stBadge = b.statusKasus === "Selesai"
        ? '<span class="badge badge-success">Selesai</span>'
        : '<span class="badge badge-warning">Proses</span>';
      return `
        <tr>
          <td>${idx + 1}</td>
          <td>${b.tanggal}</td>
          <td><strong>${b.namaSiswa}</strong><br><small style="color:#a29bfe;">Kelas ${b.kelas}</small></td>
          <td><strong>${b.jenisLayanan}</strong></td>
          <td style="white-space:normal;">${b.permasalahan}</td>
          <td style="white-space:normal;">${b.tindakLanjut}</td>
          <td>${stBadge}</td>
          <td>${b.konselor}</td>
          <td>
            <button type="button" class="btn-action btn-small" onclick="editLogBK('${b.idBK}')">✏️</button>
            <button type="button" class="btn-action btn-small badge-danger" style="border:none;" onclick="hapusLogBK('${b.idBK}')">🗑️</button>
          </td>
        </tr>
      `;
    }).join("");
  }
}

// --- MODAL HELPERS (BISA DIBUKA BERULANG KALI) ---
function showModalFlex_(id) {
  const m = document.getElementById(id);
  if (m) {
    m.style.display = "flex";
    m.classList.add("active");
  }
}

function initSelect2Siswa_(selectId, modalId, preselectId) {
  const sel = document.getElementById(selectId);
  if (!sel) return;
  if (window.jQuery && $.fn.select2 && $(sel).data("select2")) {
    $(sel).select2("destroy");
  }
  sel.innerHTML = '<option value="">-- Cari & Pilih Siswa --</option>';
  (cacheDataPoinBK.daftarSiswa || []).forEach(s => {
    const opt = document.createElement("option");
    opt.value = s.siswaId;
    opt.textContent = `${s.nama} - Kelas ${s.kelas} (${s.nisn})`;
    sel.appendChild(opt);
  });
  if (preselectId) sel.value = preselectId;

  if (window.jQuery && $.fn.select2) {
    $(sel).select2({
      width: "100%",
      dropdownParent: $(`#${modalId}`),
      placeholder: "-- Cari & Pilih Siswa --"
    });
  }
}

async function openModalInputPoin(preselectSiswaId = "") {
  showModalFlex_("modalInputPoin");
  if (!cacheDataPoinBK.daftarSiswa || cacheDataPoinBK.daftarSiswa.length === 0) {
    await loadDataPoinBK();
  }
  initSelect2Siswa_("pbk-siswa-select", "modalInputPoin", preselectSiswaId);
  document.getElementById("pbk-tanggal").value = new Date().toISOString().slice(0, 10);
  document.getElementById("pbk-kategori").value = "PELANGGARAN";
  document.getElementById("pbk-keterangan").value = "";
  filterDropdownAturanPoin();
}

function filterDropdownAturanPoin() {
  const kat = document.getElementById("pbk-kategori").value;
  const sel = document.getElementById("pbk-aturan-select");
  const filtered = (cacheDataPoinBK.masterAturan || []).filter(a => a.kategori === kat);

  sel.innerHTML = "";
  filtered.forEach(a => {
    const opt = document.createElement("option");
    opt.value = a.namaAturan;
    opt.dataset.poin = a.poin;
    opt.textContent = `[${a.tingkat}] ${a.namaAturan} (${kat === "PRESTASI" ? "-" : "+"}${a.poin} Poin)`;
    sel.appendChild(opt);
  });
  onSelectAturanPoin();
}

function onSelectAturanPoin() {
  const sel = document.getElementById("pbk-aturan-select");
  const opt = sel.options[sel.selectedIndex];
  if (opt && opt.dataset.poin) {
    document.getElementById("pbk-poin-val").value = opt.dataset.poin;
  }
}

async function submitFormPoinSiswa(e) {
  e.preventDefault();
  const btn = document.getElementById("btn-simpan-poin");
  btn.disabled = true;
  btn.textContent = "Menyimpan...";

  const payload = {
    action: "savePoinSiswa",
    siswaId: document.getElementById("pbk-siswa-select").value,
    tanggal: document.getElementById("pbk-tanggal").value,
    kategori: document.getElementById("pbk-kategori").value,
    namaAturan: document.getElementById("pbk-aturan-select").value,
    poin: document.getElementById("pbk-poin-val").value,
    keterangan: document.getElementById("pbk-keterangan").value,
    kirimWA: document.getElementById("pbk-kirim-wa").checked,
    pelapor: localStorage.getItem("nama") || "Admin"
  };

  try {
    const res = await fetch(getPoinApiUrl_(), { method: "POST", body: JSON.stringify(payload) });
    const json = await res.json();
    alert(json.message || "Tersimpan!");
    closeModal("modalInputPoin");
    loadDataPoinBK();
  } catch (err) {
    alert("Gagal menyimpan catatan poin.");
  } finally {
    btn.disabled = false;
    btn.textContent = "💾 Simpan Catatan Poin";
  }
}

async function syncAbsensiPoinUI() {
  const ym = document.getElementById("pbk-sync-bulan")?.value || new Date().toISOString().slice(0, 7);
  if (!confirm(`Tarik otomatis seluruh data siswa TERLAMBAT (+5 poin) dan ALPA (+10 poin) dari Absensi pada bulan ${ym}?`)) return;

  try {
    const res = await fetch(`${getPoinApiUrl_()}?action=syncAbsensiKePoin&periode=${encodeURIComponent(ym)}`);
    const json = await res.json();
    alert(json.message || "Sinkronisasi selesai.");
    loadDataPoinBK();
  } catch (err) {
    alert("Gagal menyinkronkan absensi ke poin.");
  }
}

async function openModalInputBK(preselectSiswaId = "") {
  showModalFlex_("modalInputBK");
  if (!cacheDataPoinBK.daftarSiswa || cacheDataPoinBK.daftarSiswa.length === 0) {
    await loadDataPoinBK();
  }
  document.getElementById("modalBKTitle").textContent = "🗣️ Form Layanan Bimbingan Konseling (BK)";
  document.getElementById("bk-id").value = "";
  initSelect2Siswa_("bk-siswa-select", "modalInputBK", preselectSiswaId);
  document.getElementById("bk-tanggal").value = new Date().toISOString().slice(0, 10);
  document.getElementById("bk-masalah").value = "";
  document.getElementById("bk-tindak").value = "";
  document.getElementById("bk-status").value = "Proses";
  document.getElementById("bk-kirim-wa").checked = false;
}

async function editLogBK(idBK) {
  const item = (cacheDataPoinBK.logBK || []).find(x => String(x.idBK) === String(idBK));
  if (!item) return;
  showModalFlex_("modalInputBK");
  document.getElementById("modalBKTitle").textContent = "✏️ Edit Layanan Bimbingan Konseling (BK)";
  document.getElementById("bk-id").value = item.idBK;
  initSelect2Siswa_("bk-siswa-select", "modalInputBK", item.siswaId);
  document.getElementById("bk-tanggal").value = item.tanggal;
  document.getElementById("bk-jenis").value = item.jenisLayanan;
  document.getElementById("bk-masalah").value = item.permasalahan;
  document.getElementById("bk-tindak").value = item.tindakLanjut;
  document.getElementById("bk-status").value = item.statusKasus;
}

async function submitFormBK(e) {
  e.preventDefault();
  const btn = document.getElementById("btn-simpan-bk");
  btn.disabled = true;
  btn.textContent = "Menyimpan...";

  const payload = {
    action: "saveBimbinganBK",
    idBK: document.getElementById("bk-id").value,
    siswaId: document.getElementById("bk-siswa-select").value,
    tanggal: document.getElementById("bk-tanggal").value,
    jenisLayanan: document.getElementById("bk-jenis").value,
    permasalahan: document.getElementById("bk-masalah").value,
    tindakLanjut: document.getElementById("bk-tindak").value,
    statusKasus: document.getElementById("bk-status").value,
    kirimWA: document.getElementById("bk-kirim-wa").checked,
    konselor: localStorage.getItem("nama") || "Guru BK"
  };

  try {
    const res = await fetch(getPoinApiUrl_(), { method: "POST", body: JSON.stringify(payload) });
    const json = await res.json();
    alert(json.message || "Tersimpan!");
    closeModal("modalInputBK");
    loadDataPoinBK();
  } catch (err) {
    alert("Gagal menyimpan catatan BK.");
  } finally {
    btn.disabled = false;
    btn.textContent = "💾 Simpan Catatan BK";
  }
}

function openModalMasterPoin() {
  showModalFlex_("modalMasterPoin");
  document.getElementById("mp-nama").value = "";
  document.getElementById("mp-poin").value = 5;
}

async function submitMasterPoin(e) {
  e.preventDefault();
  const payload = {
    action: "saveMasterPoin",
    kategori: document.getElementById("mp-kategori").value,
    tingkat: document.getElementById("mp-tingkat").value,
    namaAturan: document.getElementById("mp-nama").value,
    poin: document.getElementById("mp-poin").value
  };
  try {
    const res = await fetch(getPoinApiUrl_(), { method: "POST", body: JSON.stringify(payload) });
    const json = await res.json();
    alert(json.message || "Berhasil ditambahkan.");
    closeModal("modalMasterPoin");
    loadDataPoinBK();
  } catch (err) {
    alert("Gagal menyimpan jenis poin.");
  }
}

async function hapusLogPoin(idPoin) {
  if (!confirm("Hapus catatan poin siswa ini?")) return;
  await fetch(`${getPoinApiUrl_()}?action=deletePoinSiswa&idPoin=${encodeURIComponent(idPoin)}`);
  loadDataPoinBK();
}

async function hapusLogBK(idBK) {
  if (!confirm("Hapus catatan bimbingan konseling ini?")) return;
  await fetch(`${getPoinApiUrl_()}?action=deleteBimbinganBK&idBK=${encodeURIComponent(idBK)}`);
  loadDataPoinBK();
}

// =========================================================
// CETAK PDF RESMI: 1. LAPORAN REKAP POIN & BK (A4 LANDSCAPE)
// =========================================================
async function unduhLaporanPoinBKPDF(btnEl) {
  const list = (cacheDataPoinBK.rekapSiswa || []).filter(s => s.totalPelanggaran > 0 || s.totalPrestasi > 0 || s.jumlahBK > 0);
  if (list.length === 0) {
    return alert("Belum ada siswa yang memiliki catatan poin atau layanan BK untuk dicetak.");
  }

  const oldLabel = btnEl ? btnEl.innerHTML : "";
  if (btnEl) { btnEl.disabled = true; btnEl.innerHTML = "⏳ Membuat PDF..."; }

  try {
    if (!window.jspdf) await loadPdfLibOnce_("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
    if (!window.jspdf?.jsPDF?.API?.autoTable) await loadPdfLibOnce_("https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js");

    const instansiAtas = getSettingVal("INSTANSI_ATAS", ["setting-instansi-atas", "set-instansi-atas"], "PEMERINTAH PROVINSI LAMPUNG");
    const dinas = getSettingVal("DINAS", ["setting-dinas", "set-dinas"], "DINAS PENDIDIKAN DAN KEBUDAYAAN");
    const namaSekolah = getSettingVal("SCHOOL_NAME", ["setting-nama-sekolah", "set-nama-sekolah"], "SMA NEGERI 1 BUMI AGUNG");
    const alamatSekolah = getSettingVal("SCHOOL_ADDRESS", ["setting-alamat", "set-alamat-kop"], "Jl. Protokol No 1 Pisang Baru, Kec. Bumi Agung, Kab. Way Kanan");
    const namaKepsek = getSettingVal("HEADMASTER_NAME", ["setting-nama-kepsek", "set-nama-kepsek"], "AMRODI NURUL HUDA, S.Ag");
    const nipKepsek = getSettingVal("HEADMASTER_NIP", ["setting-nip", "set-nip-kepsek"], "197103041998021001");

    const [logoKiri, logoKanan, ttdKepsek] = await Promise.all([
      toBase64ImageSafe_(fixDrivePhotoUrl(getSettingVal("LOGO_KIRI", ["setting-logo-kiri", "set-logo-sekolah"], ""))),
      toBase64ImageSafe_(fixDrivePhotoUrl(getSettingVal("SCHOOL_LOGO_URL", ["setting-logo-kanan", "set-logo-kanan"], ""))),
      toBase64ImageSafe_(fixDrivePhotoUrl(getSettingVal("TTD_KEPSEK", ["setting-ttd-kepsek", "set-ttd-kepsek"], "")))
    ]);

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
    const pageWidth = doc.internal.pageSize.getWidth();

    if (logoKiri?.startsWith("data:image/")) try { doc.addImage(logoKiri, "PNG", 16, 10, 19, 21); } catch (e) {}
    if (logoKanan?.startsWith("data:image/")) try { doc.addImage(logoKanan, "PNG", pageWidth - 35, 10, 19, 21); } catch (e) {}

    doc.setFont("times", "normal"); doc.setFontSize(11.5);
    doc.text(String(instansiAtas).toUpperCase(), pageWidth / 2, 14, { align: "center" });
    doc.text(String(dinas).toUpperCase(), pageWidth / 2, 19, { align: "center" });
    doc.setFont("times", "bold"); doc.setFontSize(14.5);
    doc.text(String(namaSekolah).toUpperCase(), pageWidth / 2, 24.5, { align: "center" });
    doc.setFont("times", "italic"); doc.setFontSize(8.5);
    doc.text(alamatSekolah, pageWidth / 2, 29.5, { align: "center" });

    doc.setLineWidth(0.7); doc.line(14, 33, pageWidth - 14, 33);
    doc.setLineWidth(0.25); doc.line(14, 34.2, pageWidth - 14, 34.2);

    doc.setFont("helvetica", "bold"); doc.setFontSize(11.5);
    doc.text("LAPORAN REKAPITULASI POIN KEDISIPLINAN & BIMBINGAN KONSELING SISWA", pageWidth / 2, 41, { align: "center" });
    doc.setFont("helvetica", "normal"); doc.setFontSize(9);
    doc.text(`Tanggal Cetak: ${new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" })}`, pageWidth / 2, 46, { align: "center" });

    doc.autoTable({
      startY: 50,
      margin: { left: 14, right: 14 },
      head: [["NO", "NAMA SISWA & NISN", "KELAS", "PELANGGARAN (+)", "PRESTASI (-)", "POIN NETTO", "STATUS PEMBINAAN / SP", "LAYANAN BK"]],
      body: list.map((s, i) => [
        i + 1, `${s.namaSiswa}\nNISN: ${s.nisn}`, s.kelas,
        `+${s.totalPelanggaran}`, `-${s.totalPrestasi}`, s.poinNetto, s.statusSP, `${s.jumlahBK} Sesi`
      ]),
      theme: "grid",
      styles: { font: "helvetica", fontSize: 8.5, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.2, cellPadding: 2.5, valign: "middle" },
      headStyles: { fillColor: [224, 224, 224], textColor: [0, 0, 0], fontStyle: "bold", halign: "center" },
      columnStyles: {
        0: { halign: "center", cellWidth: 12 },
        1: { cellWidth: 68 },
        2: { halign: "center", cellWidth: 24 },
        3: { halign: "center", cellWidth: 32 },
        4: { halign: "center", cellWidth: 28 },
        5: { halign: "center", cellWidth: 26, fontStyle: "bold" },
        6: { halign: "center", cellWidth: 52, fontStyle: "bold" },
        7: { halign: "center", cellWidth: 27 }
      }
    });

    let finalY = (doc.lastAutoTable?.finalY || 120) + 10;
    if (finalY > 168) { doc.addPage(); finalY = 20; }
    const ttdX = pageWidth - 65;
    doc.setFont("times", "normal"); doc.setFontSize(10.5);
    doc.text("Mengetahui,", ttdX, finalY, { align: "center" });
    doc.text("Kepala Sekolah", ttdX, finalY + 5, { align: "center" });
    if (ttdKepsek?.startsWith("data:image/")) try { doc.addImage(ttdKepsek, "PNG", ttdX - 18, finalY + 6, 36, 15); } catch (e) {}
    doc.setFont("times", "bold");
    doc.text(namaKepsek, ttdX, finalY + 24, { align: "center" });
    doc.setFont("times", "normal");
    doc.text(`NIP. ${nipKepsek}`, ttdX, finalY + 29.5, { align: "center" });

    doc.save(`Laporan_Poin_dan_BK_Siswa_${new Date().toISOString().slice(0, 10)}.pdf`);
  } finally {
    if (btnEl) { btnEl.disabled = false; btnEl.innerHTML = oldLabel || "📄 Unduh Laporan PDF"; }
  }
}

// =========================================================
// CETAK PDF RESMI: 2. SURAT PANGGILAN ORANG TUA / SP PER SISWA
// =========================================================
async function cetakSuratPanggilanPDF(siswaId) {
  const siswa = (cacheDataPoinBK.rekapSiswa || []).find(s => String(s.siswaId) === String(siswaId));
  if (!siswa) return;

  if (!window.jspdf) await loadPdfLibOnce_("https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js");
  if (!window.jspdf?.jsPDF?.API?.autoTable) await loadPdfLibOnce_("https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js");

  const instansiAtas = getSettingVal("INSTANSI_ATAS", ["setting-instansi-atas", "set-instansi-atas"], "PEMERINTAH PROVINSI LAMPUNG");
  const dinas = getSettingVal("DINAS", ["setting-dinas", "set-dinas"], "DINAS PENDIDIKAN DAN KEBUDAYAAN");
  const namaSekolah = getSettingVal("SCHOOL_NAME", ["setting-nama-sekolah", "set-nama-sekolah"], "SMA NEGERI 1 BUMI AGUNG");
  const alamatSekolah = getSettingVal("SCHOOL_ADDRESS", ["setting-alamat", "set-alamat-kop"], "Jl. Protokol No 1 Pisang Baru, Kec. Bumi Agung, Kab. Way Kanan");
  const namaKepsek = getSettingVal("HEADMASTER_NAME", ["setting-nama-kepsek", "set-nama-kepsek"], "AMRODI NURUL HUDA, S.Ag");
  const nipKepsek = getSettingVal("HEADMASTER_NIP", ["setting-nip", "set-nip-kepsek"], "197103041998021001");

  const [logoKiri, logoKanan, ttdKepsek] = await Promise.all([
    toBase64ImageSafe_(fixDrivePhotoUrl(getSettingVal("LOGO_KIRI", ["setting-logo-kiri", "set-logo-sekolah"], ""))),
    toBase64ImageSafe_(fixDrivePhotoUrl(getSettingVal("SCHOOL_LOGO_URL", ["setting-logo-kanan", "set-logo-kanan"], ""))),
    toBase64ImageSafe_(fixDrivePhotoUrl(getSettingVal("TTD_KEPSEK", ["setting-ttd-kepsek", "set-ttd-kepsek"], "")))
  ]);

  const { jsPDF } = window.jspdf;
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth(); // 210 mm

  if (logoKiri?.startsWith("data:image/")) try { doc.addImage(logoKiri, "PNG", 16, 12, 18, 20); } catch (e) {}
  if (logoKanan?.startsWith("data:image/")) try { doc.addImage(logoKanan, "PNG", pageWidth - 34, 12, 18, 20); } catch (e) {}

  doc.setFont("times", "normal"); doc.setFontSize(11);
  doc.text(String(instansiAtas).toUpperCase(), pageWidth / 2, 16, { align: "center" });
  doc.text(String(dinas).toUpperCase(), pageWidth / 2, 21, { align: "center" });
  doc.setFont("times", "bold"); doc.setFontSize(14);
  doc.text(String(namaSekolah).toUpperCase(), pageWidth / 2, 26.5, { align: "center" });
  doc.setFont("times", "italic"); doc.setFontSize(8.5);
  doc.text(alamatSekolah, pageWidth / 2, 31.5, { align: "center" });

  doc.setLineWidth(0.7); doc.line(15, 35, pageWidth - 15, 35);
  doc.setLineWidth(0.25); doc.line(15, 36.2, pageWidth - 15, 36.2);

  doc.setFont("times", "bold"); doc.setFontSize(12);
  doc.text("SURAT PEMBERITAHUAN & PANGGILAN ORANG TUA / WALI MURID", pageWidth / 2, 45, { align: "center" });

  doc.setFont("times", "normal"); doc.setFontSize(11);
  const tglSurat = new Date().toLocaleDateString("id-ID", { day: "2-digit", month: "long", year: "numeric" });
  doc.text(`Lampung, ${tglSurat}`, pageWidth - 20, 54, { align: "right" });

  doc.text("Kepada Yth.", 20, 62);
  doc.setFont("times", "bold");
  doc.text(`Bapak/Ibu Orang Tua / Wali dari ${siswa.namaSiswa}`, 20, 67);
  doc.setFont("times", "normal");
  doc.text("Di Tempat", 20, 72);

  const paragraf1 = `Dengan hormat,\nSehubungan dengan pembinaan kedisiplinan dan tata tertib peserta didik di ${namaSekolah}, bersama ini kami sampaikan catatan evaluasi poin tata tertib putra/putri Bapak/Ibu:`;
  doc.text(doc.splitTextToSize(paragraf1, 170), 20, 82);

  doc.text(`Nama Siswa        : ${siswa.namaSiswa}`, 28, 100);
  doc.text(`NISN                   : ${siswa.nisn}`, 28, 106);
  doc.text(`Kelas                   : ${siswa.kelas}`, 28, 112);
  doc.text(`Total Poin Netto : ${siswa.poinNetto} Poin (${siswa.statusSP})`, 28, 118);

  const riwayatSiswa = (cacheDataPoinBK.logPoin || [])
    .filter(r => String(r.siswaId) === String(siswaId))
    .slice(0, 8);

  if (riwayatSiswa.length > 0) {
    doc.autoTable({
      startY: 124,
      margin: { left: 20, right: 20 },
      head: [["No", "Tanggal", "Jenis", "Uraian Pelanggaran / Prestasi", "Poin"]],
      body: riwayatSiswa.map((r, i) => [
        i + 1, r.tanggal, r.kategori, r.namaAturan, (r.kategori === "PRESTASI" ? `-${r.poin}` : `+${r.poin}`)
      ]),
      theme: "grid",
      styles: { font: "times", fontSize: 9.5, textColor: [0, 0, 0], lineColor: [0, 0, 0], lineWidth: 0.2 },
      headStyles: { fillColor: [230, 230, 230], textColor: [0, 0, 0], fontStyle: "bold", halign: "center" }
    });
  }

  let nextY = (doc.lastAutoTable?.finalY || 132) + 8;
  const paragraf2 = `Mengingat akumulasi poin tersebut, kami mengharapkan kehadiran Bapak/Ibu Orang Tua/Wali Murid di Ruang Bimbingan Konseling (BK) ${namaSekolah} pada hari kerja jam 08.00 – 12.00 WIB guna konsultasi dan pembinaan bersama.\n\nDemikian surat pemberitahuan ini disampaikan. Atas perhatian dan kerja sama Bapak/Ibu kami ucapkan terima kasih.`;
  doc.text(doc.splitTextToSize(paragraf2, 170), 20, nextY);

  const ttdY = nextY + 34;
  doc.text("Koordinator Bimbingan Konseling,", 48, ttdY, { align: "center" });
  doc.text("( ........................................ )", 48, ttdY + 24, { align: "center" });

  doc.text("Mengetahui, Kepala Sekolah", 155, ttdY, { align: "center" });
  if (ttdKepsek?.startsWith("data:image/")) try { doc.addImage(ttdKepsek, "PNG", 137, ttdY + 2, 36, 15); } catch (e) {}
  doc.setFont("times", "bold");
  doc.text(namaKepsek, 155, ttdY + 22, { align: "center" });
  doc.setFont("times", "normal");
  doc.text(`NIP. ${nipKepsek}`, 155, ttdY + 27, { align: "center" });

  doc.save(`Surat_Panggilan_BK_${siswa.namaSiswa.replace(/\s+/g, "_")}.pdf`);
}