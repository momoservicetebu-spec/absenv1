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