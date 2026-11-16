// =========================================================
// MODUL FRONTEND: PERFORMA KINERJA TENAGA KEPENDIDIKAN (PKT)
// =========================================================
let cacheKinerjaTendik = [];
let cacheDaftarTendikKT = [];

function getKinerjaTendikApiUrl_() {
  if (typeof API_URL !== 'undefined' && API_URL) return API_URL;
  if (typeof CONFIG !== 'undefined' && CONFIG.SCRIPT_URL) return CONFIG.SCRIPT_URL;
  if (typeof SCRIPT_URL !== 'undefined' && SCRIPT_URL) return SCRIPT_URL;
  return window.API_URL || window.SCRIPT_URL || '';
}

function showModalKinerjaTendik_() {
  const modal = document.getElementById('modalKinerjaTendik');
  if (modal) {
    modal.style.display = 'flex';
    modal.classList.add('active');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const nowMonth = new Date().toISOString().slice(0, 7);
  const filterEl = document.getElementById('kt-filter-periode');
  const modalPeriodeEl = document.getElementById('kt-periode');
  if (filterEl && !filterEl.value) filterEl.value = nowMonth;
  if (modalPeriodeEl && !modalPeriodeEl.value) modalPeriodeEl.value = nowMonth;

  if (modalPeriodeEl) {
    modalPeriodeEl.addEventListener('change', onModalPeriodeTendikChange);
  }
});

async function loadKinerjaTendik(customPeriode) {
  const periode = customPeriode || document.getElementById('kt-filter-periode')?.value || new Date().toISOString().slice(0, 7);
  const tbody = document.getElementById('tbody-kinerja-tendik');
  if (!customPeriode && tbody) {
    tbody.innerHTML = '<tr><td colspan="11" style="text-align:center; padding:20px; color:#74b9ff;">⏳ Memuat data performa kinerja Tenaga Kependidikan...</td></tr>';
  }

  try {
    const url = `${getKinerjaTendikApiUrl_()}?action=getKinerjaTendik&periode=${encodeURIComponent(periode)}`;
    const res = await fetch(url);
    const json = await res.json();

    if (json.status === 'success') {
      cacheDaftarTendikKT = json.daftarTendik || [];
      await populateDropdownTendikKT_();

      if (!customPeriode) {
        cacheKinerjaTendik = (json.data || []).sort((a, b) => b.skorAkhir - a.skorAkhir);
        updateKpiKinerjaTendik_();
        renderTabelKinerjaTendik();
      }
    } else {
      await populateDropdownTendikKT_();
    }
  } catch (err) {
    console.warn('Gagal memuat getKinerjaTendik, mencoba fallback getGuru:', err);
    await populateDropdownTendikKT_();
    if (!customPeriode && tbody) {
      tbody.innerHTML = '<tr><td colspan="11" style="text-align:center; padding:20px; color:#ff6b6b;">Gagal memuat data kinerja Tendik. Pastikan Apps Script sudah di-deploy versi terbaru.</td></tr>';
    }
  }
}

async function populateDropdownTendikKT_() {
  const select = document.getElementById('kt-tendik-select');
  if (!select) return;

  if (!cacheDaftarTendikKT || cacheDaftarTendikKT.length === 0) {
    try {
      const res = await fetch(`${getKinerjaTendikApiUrl_()}?action=getGuru`);
      const json = await res.json();
      const rawList = Array.isArray(json) ? json : (json.data || json.guru || []);

      cacheDaftarTendikKT = rawList.filter(g => {
        const gab = `${g.Jabatan || g.jabatan || ''} ${g.Mapel || g.mapel || ''} ${g.Role || g.role || ''}`;
        return /(tendik|tenaga\s*kependidikan|tata\s*usaha|\btu\b|operator|administrasi|staf|staff|pustakawan|laboran|satpam|keamanan|kebersihan|penjaga|caraka|bendahara|teknisi)/i.test(gab);
      }).map((g, idx) => {
        const nama = g.Nama_Lengkap || g.Nama_Guru || g.Nama || g.nama || '';
        const nip = g.NIP || g.nip || g.NUPTK || '-';
        const id = g.GuruID || g.ID_Guru || g.ID || g.id || ('TENDIK-' + (idx + 1));
        const jabatan = [g.Jabatan || g.jabatan || '', g.Mapel || g.mapel || ''].filter(Boolean).join(' - ') || 'Tenaga Kependidikan';
        return {
          tendikId: String(id).trim(),
          nip: String(nip).trim(),
          nama: String(nama).trim(),
          jabatan: jabatan,
          skorKehadiranAuto: 0,
          ringkasanAbsen: 'Belum ada log absensi pada bulan ini'
        };
      }).filter(t => t.nama);
    } catch (e) {
      console.warn('Fallback getGuru untuk Tendik gagal:', e);
    }
  }

  const currentVal = select.value;

  if (window.jQuery && $.fn.select2 && $(select).data('select2')) {
    $(select).select2('destroy');
  }

  if (cacheDaftarTendikKT.length === 0) {
    select.innerHTML = '<option value="">-- Data Tendik belum ditemukan di sheet Guru --</option>';
  } else {
    select.innerHTML = '<option value="">-- Pilih Tenaga Kependidikan --</option>';
    cacheDaftarTendikKT.forEach(t => {
      const opt = document.createElement('option');
      opt.value = t.tendikId;
      opt.textContent = `${t.nama} — ${t.jabatan} (${t.nip})`;
      select.appendChild(opt);
    });
  }

  if (currentVal) select.value = currentVal;

  if (window.jQuery && $.fn.select2) {
    $(select).select2({
      width: '100%',
      dropdownParent: $('#modalKinerjaTendik'),
      placeholder: '-- Cari & Pilih Tendik --'
    });
    $(select).off('change.kt').on('change.kt', onSelectTendikKinerja);
  }
}

async function onModalPeriodeTendikChange() {
  const modalPeriode = document.getElementById('kt-periode')?.value;
  if (!modalPeriode) return;
  const detailEl = document.getElementById('kt-absen-detail');
  if (detailEl) detailEl.textContent = '⏳ Menyinkronkan rekap absensi Tendik bulan terpilih...';

  await loadKinerjaTendik(modalPeriode);
  onSelectTendikKinerja();
}

function updateKpiKinerjaTendik_() {
  const total = cacheKinerjaTendik.length;
  const avg = total > 0
    ? (cacheKinerjaTendik.reduce((sum, item) => sum + Number(item.skorAkhir || 0), 0) / total).toFixed(1)
    : '0.0';
  const unggul = cacheKinerjaTendik.filter(item => item.skorAkhir >= 91).length;
  const bina = cacheKinerjaTendik.filter(item => item.skorAkhir < 70).length;

  document.getElementById('kt-kpi-total').textContent = total;
  document.getElementById('kt-kpi-avg').textContent = avg;
  document.getElementById('kt-kpi-unggul').textContent = unggul;
  document.getElementById('kt-kpi-bina').textContent = bina;
}

function renderTabelKinerjaTendik() {
  const tbody = document.getElementById('tbody-kinerja-tendik');
  if (!tbody) return;

  const keyword = (document.getElementById('kt-search-input')?.value || '').toLowerCase();
  const filtered = cacheKinerjaTendik.filter(item =>
    item.namaTendik.toLowerCase().includes(keyword) ||
    String(item.nip).toLowerCase().includes(keyword) ||
    String(item.jabatan).toLowerCase().includes(keyword) ||
    item.predikat.toLowerCase().includes(keyword)
  );

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="11" style="text-align:center; padding:20px; color:#74b9ff;">Belum ada data penilaian kinerja Tendik pada periode ini.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered.map((item, idx) => {
    let badgeClass = 'badge-danger';
    if (item.skorAkhir >= 91) badgeClass = 'badge-success';
    else if (item.skorAkhir >= 81) badgeClass = 'badge';
    else if (item.skorAkhir >= 70) badgeClass = 'badge-warning';

    const extraStyle = (item.skorAkhir >= 81 && item.skorAkhir < 91)
      ? 'background:#54a0ff; color:#fff;'
      : '';

    return `
      <tr>
        <td>${idx + 1}</td>
        <td><strong>${item.namaTendik}</strong><br><small style="color:#74b9ff;">NIP/NIK: ${item.nip}</small></td>
        <td>${item.jabatan}</td>
        <td>${item.skorKehadiran}</td>
        <td>${item.skorLayanan}</td>
        <td>${item.skorProduktivitas}</td>
        <td>${item.skorPerilaku}</td>
        <td><strong style="color:#00d2d3; font-size:14px;">${item.skorAkhir}</strong></td>
        <td><span class="badge ${badgeClass}" style="${extraStyle}">${item.predikat}</span></td>
        <td style="white-space:normal; min-width:160px;">${item.catatan || '-'}</td>
        <td>
          <button type="button" class="btn-action btn-small" onclick="editKinerjaTendik('${item.idKinerja}')">✏️ Edit</button>
          <button type="button" class="btn-action btn-small badge-danger" style="border:none;" onclick="hapusKinerjaTendik('${item.idKinerja}')">🗑️</button>
        </td>
      </tr>
    `;
  }).join('');
}

async function openModalKinerjaTendik() {
  showModalKinerjaTendik_();

  document.getElementById('modalKinerjaTendikTitle').textContent = '📋 Form Penilaian Kinerja Tendik';
  document.getElementById('kt-id').value = '';
  const activePeriode = document.getElementById('kt-filter-periode')?.value || new Date().toISOString().slice(0, 7);
  document.getElementById('kt-periode').value = activePeriode;

  document.getElementById('kt-skor-hadir').value = 0;
  document.getElementById('kt-skor-layanan').value = 85;
  document.getElementById('kt-skor-produktivitas').value = 85;
  document.getElementById('kt-skor-perilaku').value = 85;
  document.getElementById('kt-catatan').value = '';
  const detailEl = document.getElementById('kt-absen-detail');
  if (detailEl) detailEl.textContent = 'Pilih Tenaga Kependidikan untuk menarik rekap absensi...';

  const btn = document.getElementById('btn-simpan-kt');
  if (btn) {
    btn.disabled = false;
    btn.textContent = '💾 Simpan Penilaian';
  }

  hitungPreviewKinerjaTendik();

  if (!cacheDaftarTendikKT || cacheDaftarTendikKT.length === 0) {
    const select = document.getElementById('kt-tendik-select');
    if (select) select.innerHTML = '<option value="">⏳ Memuat data Tendik...</option>';
    await loadKinerjaTendik(activePeriode);
  } else {
    await populateDropdownTendikKT_();
  }

  const select = document.getElementById('kt-tendik-select');
  if (select) {
    select.value = '';
    try {
      if (window.jQuery && $(select).data('select2')) {
        $(select).trigger('change.select2');
      }
    } catch (e) {}
  }
}

function onSelectTendikKinerja() {
  const tendikId = document.getElementById('kt-tendik-select').value;
  const tendik = cacheDaftarTendikKT.find(t => String(t.tendikId) === String(tendikId));
  const detailEl = document.getElementById('kt-absen-detail');

  if (tendik) {
    document.getElementById('kt-skor-hadir').value = tendik.skorKehadiranAuto;
    if (detailEl) detailEl.textContent = tendik.ringkasanAbsen || 'Tersinkron dengan log absensi';
    hitungPreviewKinerjaTendik();
  } else {
    document.getElementById('kt-skor-hadir').value = 0;
    if (detailEl) detailEl.textContent = 'Pilih Tenaga Kependidikan untuk menarik rekap absensi...';
    hitungPreviewKinerjaTendik();
  }
}

async function syncAbsensiKinerjaTendik() {
  const periode = document.getElementById('kt-filter-periode')?.value;
  if (!periode) return;
  if (!confirm(`Sinkronkan ulang skor kehadiran (40%) seluruh Tendik pada periode ${periode} dari data absensi terbaru?`)) return;

  try {
    const url = `${getKinerjaTendikApiUrl_()}?action=syncAbsensiKinerjaTendik&periode=${encodeURIComponent(periode)}`;
    const res = await fetch(url);
    const json = await res.json();
    alert(json.message || 'Sinkronisasi Tendik selesai.');
    loadKinerjaTendik();
  } catch (err) {
    alert('Gagal menyinkronkan data absensi Tendik.');
  }
}

function hitungPreviewKinerjaTendik() {
  const h = Number(document.getElementById('kt-skor-hadir').value) || 0;
  const l = Number(document.getElementById('kt-skor-layanan').value) || 0;
  const p = Number(document.getElementById('kt-skor-produktivitas').value) || 0;
  const b = Number(document.getElementById('kt-skor-perilaku').value) || 0;

  const akhir = ((h * 0.40) + (l * 0.25) + (p * 0.20) + (b * 0.15)).toFixed(1);
  const skorEl = document.getElementById('kt-preview-skor');
  const predEl = document.getElementById('kt-preview-predikat');

  skorEl.textContent = akhir;
  if (akhir >= 91) {
    predEl.textContent = 'Sangat Baik';
    predEl.className = 'badge badge-success';
    predEl.style.cssText = 'font-size:13px; padding:6px 14px;';
  } else if (akhir >= 81) {
    predEl.textContent = 'Baik';
    predEl.className = 'badge';
    predEl.style.cssText = 'font-size:13px; padding:6px 14px; background:#54a0ff; color:#fff;';
  } else if (akhir >= 70) {
    predEl.textContent = 'Cukup';
    predEl.className = 'badge badge-warning';
    predEl.style.cssText = 'font-size:13px; padding:6px 14px;';
  } else {
    predEl.textContent = 'Perlu Pembinaan';
    predEl.className = 'badge badge-danger';
    predEl.style.cssText = 'font-size:13px; padding:6px 14px;';
  }
}

async function submitKinerjaTendik(e) {
  e.preventDefault();
  const tendikId = document.getElementById('kt-tendik-select').value;
  const tendik = cacheDaftarTendikKT.find(t => String(t.tendikId) === String(tendikId));
  if (!tendik) return alert('Silakan pilih Tenaga Kependidikan terlebih dahulu.');

  const btn = document.getElementById('btn-simpan-kt');
  btn.disabled = true;
  btn.textContent = 'Menyimpan...';

  const payload = {
    action: 'saveKinerjaTendik',
    idKinerja: document.getElementById('kt-id').value,
    periode: document.getElementById('kt-periode').value,
    tendikId: tendik.tendikId,
    nip: tendik.nip,
    namaTendik: tendik.nama,
    jabatan: tendik.jabatan,
    skorKehadiran: document.getElementById('kt-skor-hadir').value,
    skorLayanan: document.getElementById('kt-skor-layanan').value,
    skorProduktivitas: document.getElementById('kt-skor-produktivitas').value,
    skorPerilaku: document.getElementById('kt-skor-perilaku').value,
    catatan: document.getElementById('kt-catatan').value,
    penilai: localStorage.getItem('nama') || 'Admin'
  };

  try {
    const res = await fetch(getKinerjaTendikApiUrl_(), {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    alert(json.message || 'Penilaian Tendik tersimpan!');
    closeModal('modalKinerjaTendik');
    loadKinerjaTendik();
  } catch (err) {
    alert('Gagal menyimpan penilaian kinerja Tendik.');
  } finally {
    btn.disabled = false;
    btn.textContent = '💾 Simpan Penilaian';
  }
}

async function editKinerjaTendik(idKinerja) {
  const item = cacheKinerjaTendik.find(x => String(x.idKinerja) === String(idKinerja));
  if (!item) return;

  showModalKinerjaTendik_();

  if (!cacheDaftarTendikKT || cacheDaftarTendikKT.length === 0) {
    await populateDropdownTendikKT_();
  }

  document.getElementById('modalKinerjaTendikTitle').textContent = '✏️ Edit Penilaian Kinerja Tendik';
  document.getElementById('kt-id').value = item.idKinerja;
  document.getElementById('kt-periode').value = item.periode;
  document.getElementById('kt-tendik-select').value = item.tendikId;
  try {
    if (window.jQuery && $('#kt-tendik-select').data('select2')) {
      $('#kt-tendik-select').trigger('change.select2');
    }
  } catch (e) {}

  document.getElementById('kt-skor-hadir').value = item.skorKehadiran;
  document.getElementById('kt-skor-layanan').value = item.skorLayanan;
  document.getElementById('kt-skor-produktivitas').value = item.skorProduktivitas;
  document.getElementById('kt-skor-perilaku').value = item.skorPerilaku;
  document.getElementById('kt-catatan').value = item.catatan;

  const btn = document.getElementById('btn-simpan-kt');
  if (btn) {
    btn.disabled = false;
    btn.textContent = '💾 Simpan Penilaian';
  }

  hitungPreviewKinerjaTendik();
}

async function hapusKinerjaTendik(idKinerja) {
  if (!confirm('Hapus data penilaian kinerja Tendik ini?')) return;
  try {
    const url = `${getKinerjaTendikApiUrl_()}?action=deleteKinerjaTendik&idKinerja=${encodeURIComponent(idKinerja)}`;
    const res = await fetch(url);
    const json = await res.json();
    alert(json.message || 'Data dihapus.');
    loadKinerjaTendik();
  } catch (err) {
    alert('Gagal menghapus data Tendik.');
  }
}

function exportKinerjaTendikCSV() {
  if (cacheKinerjaTendik.length === 0) return alert('Tidak ada data Tendik untuk diunduh.');
  const rows = [
    ['No', 'Periode', 'NIP/NIK', 'Nama Tendik', 'Jabatan / Unit', 'Kehadiran (40%)', 'Layanan & Admin (25%)', 'Produktivitas (20%)', 'Perilaku (15%)', 'Skor Akhir', 'Predikat', 'Catatan']
  ];
  cacheKinerjaTendik.forEach((r, i) => {
    rows.push([i + 1, r.periode, `"${r.nip}"`, `"${r.namaTendik}"`, `"${r.jabatan}"`, r.skorKehadiran, r.skorLayanan, r.skorProduktivitas, r.skorPerilaku, r.skorAkhir, r.predikat, `"${r.catatan}"`]);
  });
  const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
  const link = document.createElement('a');
  link.setAttribute('href', encodeURI(csvContent));
  link.setAttribute('download', `Performa_Kinerja_Tendik_${document.getElementById('kt-filter-periode').value}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
}

async function unduhKinerjaTendikPDF(btnEl) {
  if (!cacheKinerjaTendik || cacheKinerjaTendik.length === 0) {
    return alert('Tidak ada data penilaian kinerja Tendik pada periode ini untuk diunduh.');
  }

  if (typeof html2pdf === 'undefined') {
    return alert('Library html2pdf belum termuat. Periksa koneksi internet lalu muat ulang halaman.');
  }

  const oriText = btnEl ? btnEl.innerHTML : '📄 Unduh PDF';
  if (btnEl) {
    btnEl.disabled = true;
    btnEl.innerHTML = '⏳ Membuat PDF...';
  }

  try {
    const periodeVal = document.getElementById('kt-filter-periode')?.value || new Date().toISOString().slice(0, 7);
    const namaBulan = [
      'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
      'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
    ];
    const [tahunStr, bulanStr] = periodeVal.split('-');
    const labelPeriode = (tahunStr && bulanStr)
      ? `${namaBulan[parseInt(bulanStr, 10) - 1] || bulanStr} ${tahunStr}`
      : periodeVal;

    // Ambil data Kop Surat & Kepala Sekolah dari form Setting / localStorage
    let savedCfg = {};
    try {
      savedCfg = JSON.parse(localStorage.getItem('app_settings') || localStorage.getItem('school_settings') || '{}');
    } catch (e) {}

    const getFieldVal = (id, key, fallback = '') => {
      const el = document.getElementById(id);
      return (el && el.value ? el.value.trim() : '') || savedCfg[key] || fallback;
    };

    const instansiAtas = getFieldVal('set-instansi-atas', 'instansiAtas', 'PEMERINTAH PROVINSI / YAYASAN PENDIDIKAN');
    const dinas = getFieldVal('set-dinas', 'dinas', 'DINAS PENDIDIKAN');
    const namaSekolah = getFieldVal('set-nama-sekolah', 'namaSekolah', 'SEKOLAH MENENGAH');
    const alamatKop = getFieldVal('set-alamat-kop', 'alamatKop', '');
    const website = getFieldVal('set-website', 'website', '');
    const nomorSurat = getFieldVal('set-nomor-surat', 'nomorSurat', '');
    const logoKiri = getFieldVal('set-logo-kiri', 'logoKiri', '');
    const logoKanan = getFieldVal('set-logo-kanan', 'logoKanan', '');
    const namaKepsek = getFieldVal('set-nama-kepsek', 'namaKepsek', '__________________________');
    const nipKepsek = getFieldVal('set-nip-kepsek', 'nipKepsek', '-');
    const ttdKepsek = getFieldVal('set-ttd-kepsek', 'ttdKepsek', '');

    // Hitung ringkasan statistik
    const total = cacheKinerjaTendik.length;
    const avg = (cacheKinerjaTendik.reduce((s, x) => s + Number(x.skorAkhir || 0), 0) / total).toFixed(1);
    const sangatBaik = cacheKinerjaTendik.filter(x => Number(x.skorAkhir) >= 91).length;
    const baik = cacheKinerjaTendik.filter(x => Number(x.skorAkhir) >= 81 && Number(x.skorAkhir) < 91).length;
    const cukup = cacheKinerjaTendik.filter(x => Number(x.skorAkhir) >= 70 && Number(x.skorAkhir) < 81).length;
    const pembinaan = cacheKinerjaTendik.filter(x => Number(x.skorAkhir) < 70).length;

    const tglCetak = new Date().toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'long',
      year: 'numeric'
    });

    const rowsHtml = cacheKinerjaTendik.map((item, idx) => {
      let badgeColor = '#d63031';
      if (item.skorAkhir >= 91) badgeColor = '#00b894';
      else if (item.skorAkhir >= 81) badgeColor = '#0984e3';
      else if (item.skorAkhir >= 70) badgeColor = '#e17055';

      return `
        <tr>
          <td style="border:1px solid #333; padding:6px; text-align:center;">${idx + 1}</td>
          <td style="border:1px solid #333; padding:6px;">
            <strong>${item.namaTendik}</strong><br>
            <span style="font-size:9px; color:#555;">NIP/NIK: ${item.nip || '-'}</span>
          </td>
          <td style="border:1px solid #333; padding:6px;">${item.jabatan || '-'}</td>
          <td style="border:1px solid #333; padding:6px; text-align:center;">${item.skorKehadiran}</td>
          <td style="border:1px solid #333; padding:6px; text-align:center;">${item.skorLayanan}</td>
          <td style="border:1px solid #333; padding:6px; text-align:center;">${item.skorProduktivitas}</td>
          <td style="border:1px solid #333; padding:6px; text-align:center;">${item.skorPerilaku}</td>
          <td style="border:1px solid #333; padding:6px; text-align:center; font-weight:bold;">${item.skorAkhir}</td>
          <td style="border:1px solid #333; padding:6px; text-align:center; font-weight:bold; color:${badgeColor};">${item.predikat}</td>
          <td style="border:1px solid #333; padding:6px;">${item.catatan || '-'}</td>
        </tr>
      `;
    }).join('');

    const container = document.createElement('div');
    container.style.cssText = 'font-family: Arial, Helvetica, sans-serif; color: #111; background: #fff; padding: 12px 18px; font-size: 11px;';
    container.innerHTML = `
      <div style="display:flex; align-items:center; justify-content:space-between; border-bottom:3px double #000; padding-bottom:8px; margin-bottom:12px;">
        <div style="width:65px; text-align:center;">
          ${logoKiri ? `<img src="${logoKiri}" crossorigin="anonymous" style="max-height:60px; max-width:60px;">` : ''}
        </div>
        <div style="flex:1; text-align:center; line-height:1.35;">
          <div style="font-size:12px; font-weight:bold; text-transform:uppercase;">${instansiAtas}</div>
          <div style="font-size:12px; font-weight:bold; text-transform:uppercase;">${dinas}</div>
          <div style="font-size:16px; font-weight:bold; text-transform:uppercase;">${namaSekolah}</div>
          ${alamatKop ? `<div style="font-size:10px;">${alamatKop}</div>` : ''}
          ${website ? `<div style="font-size:9px; color:#333;">${website}</div>` : ''}
        </div>
        <div style="width:65px; text-align:center;">
          ${logoKanan ? `<img src="${logoKanan}" crossorigin="anonymous" style="max-height:60px; max-width:60px;">` : ''}
        </div>
      </div>

      <div style="text-align:center; margin-bottom:12px;">
        <div style="font-size:13px; font-weight:bold; text-decoration:underline;">LAPORAN REKAPITULASI PERFORMA KINERJA TENAGA KEPENDIDIKAN (PKT)</div>
        ${nomorSurat ? `<div style="font-size:10px; margin-top:2px;">${nomorSurat}</div>` : ''}
        <div style="font-size:11px; margin-top:3px;">Periode Penilaian: <strong>${labelPeriode}</strong></div>
      </div>

      <div style="display:flex; gap:12px; margin-bottom:10px; font-size:10px; background:#f4f6f9; border:1px solid #ccc; padding:7px 10px; border-radius:4px;">
        <div>Total Dinilai: <strong>${total} Tendik</strong></div>
        <div>|</div>
        <div>Rata-rata Skor: <strong>${avg}</strong></div>
        <div>|</div>
        <div>Sangat Baik: <strong>${sangatBaik}</strong></div>
        <div>|</div>
        <div>Baik: <strong>${baik}</strong></div>
        <div>|</div>
        <div>Cukup: <strong>${cukup}</strong></div>
        <div>|</div>
        <div>Perlu Pembinaan: <strong>${pembinaan}</strong></div>
      </div>

      <table style="width:100%; border-collapse:collapse; font-size:10px;">
        <thead>
          <tr style="background:#2d3436; color:#fff;">
            <th style="border:1px solid #333; padding:7px; width:28px;">NO</th>
            <th style="border:1px solid #333; padding:7px;">NAMA TENDIK &amp; NIP</th>
            <th style="border:1px solid #333; padding:7px;">JABATAN / UNIT</th>
            <th style="border:1px solid #333; padding:7px; width:65px;">HADIR (40%)</th>
            <th style="border:1px solid #333; padding:7px; width:68px;">LAYANAN (25%)</th>
            <th style="border:1px solid #333; padding:7px; width:72px;">PRODUKTIVITAS (20%)</th>
            <th style="border:1px solid #333; padding:7px; width:68px;">PERILAKU (15%)</th>
            <th style="border:1px solid #333; padding:7px; width:58px;">SKOR AKHIR</th>
            <th style="border:1px solid #333; padding:7px; width:85px;">PREDIKAT</th>
            <th style="border:1px solid #333; padding:7px;">CATATAN</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <div style="display:flex; justify-content:flex-end; margin-top:18px; page-break-inside:avoid;">
        <div style="width:240px; text-align:left; font-size:10.5px; line-height:1.4;">
          <div>Ditetapkan pada tanggal ${tglCetak}</div>
          <div>Mengetahui,<br>Kepala Sekolah,</div>
          <div style="height:55px; display:flex; align-items:center;">
            ${ttdKepsek ? `<img src="${ttdKepsek}" crossorigin="anonymous" style="max-height:50px;">` : ''}
          </div>
          <div style="font-weight:bold; text-decoration:underline;">${namaKepsek}</div>
          <div>NIP. ${nipKepsek}</div>
        </div>
      </div>
    `;

    const opt = {
      margin: [8, 8, 8, 8],
      filename: `Laporan_Performa_Kinerja_Tendik_${periodeVal}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };

    await html2pdf().set(opt).from(container).save();
  } catch (err) {
    console.error('Gagal membuat PDF PKT:', err);
    alert('Terjadi kesalahan saat membuat PDF Kinerja Tendik.');
  } finally {
    if (btnEl) {
      btnEl.disabled = false;
      btnEl.innerHTML = oriText;
    }
  }
}