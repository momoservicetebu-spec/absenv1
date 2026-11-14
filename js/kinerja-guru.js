// =========================================================
// MODUL FRONTEND: PERFORMA KINERJA GURU (PKG)
// =========================================================
let cacheKinerjaGuru = [];
let cacheDaftarGuruKG = [];

function getKinerjaApiUrl_() {
  if (typeof API_URL !== 'undefined' && API_URL) return API_URL;
  if (typeof CONFIG !== 'undefined' && CONFIG.SCRIPT_URL) return CONFIG.SCRIPT_URL;
  if (typeof SCRIPT_URL !== 'undefined' && SCRIPT_URL) return SCRIPT_URL;
  return window.API_URL || window.SCRIPT_URL || '';
}

function showModalKinerja_() {
  const modal = document.getElementById('modalKinerjaGuru');
  if (modal) {
    modal.style.display = 'flex';
    modal.classList.add('active');
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const nowMonth = new Date().toISOString().slice(0, 7);
  const filterEl = document.getElementById('kg-filter-periode');
  const modalPeriodeEl = document.getElementById('kg-periode');
  if (filterEl && !filterEl.value) filterEl.value = nowMonth;
  if (modalPeriodeEl && !modalPeriodeEl.value) modalPeriodeEl.value = nowMonth;

  if (modalPeriodeEl) {
    modalPeriodeEl.addEventListener('change', onModalPeriodeChange);
  }
});

async function loadKinerjaGuru(customPeriode) {
  const periode = customPeriode || document.getElementById('kg-filter-periode')?.value || new Date().toISOString().slice(0, 7);
  const tbody = document.getElementById('tbody-kinerja-guru');
  if (!customPeriode && tbody) {
    tbody.innerHTML = '<tr><td colspan="11" style="text-align:center; padding:20px; color:#a29bfe;">⏳ Memuat data performa kinerja guru...</td></tr>';
  }

  try {
    const url = `${getKinerjaApiUrl_()}?action=getKinerjaGuru&periode=${encodeURIComponent(periode)}`;
    const res = await fetch(url);
    const json = await res.json();

    if (json.status === 'success') {
      cacheDaftarGuruKG = json.daftarGuru || [];
      await populateDropdownGuruKG_();

      if (!customPeriode) {
        cacheKinerjaGuru = (json.data || []).sort((a, b) => b.skorAkhir - a.skorAkhir);
        updateKpiKinerjaGuru_();
        renderTabelKinerjaGuru();
      }
    } else {
      await populateDropdownGuruKG_();
    }
  } catch (err) {
    console.warn('Gagal memuat getKinerjaGuru, mencoba fallback getGuru:', err);
    await populateDropdownGuruKG_();
    if (!customPeriode && tbody) {
      tbody.innerHTML = '<tr><td colspan="11" style="text-align:center; padding:20px; color:#ff6b6b;">Gagal memuat data kinerja guru. Pastikan Apps Script sudah di-deploy versi terbaru.</td></tr>';
    }
  }
}

async function populateDropdownGuruKG_() {
  const select = document.getElementById('kg-guru-select');
  if (!select) return;

  // Cadangan otomatis: tarik langsung dari sheet "Guru" via action=getGuru jika daftarGuru kosong
  if (!cacheDaftarGuruKG || cacheDaftarGuruKG.length === 0) {
    try {
      const res = await fetch(`${getKinerjaApiUrl_()}?action=getGuru`);
      const json = await res.json();
      const rawList = Array.isArray(json) ? json : (json.data || json.guru || []);

      cacheDaftarGuruKG = rawList.map((g, idx) => {
        const nama = g.Nama_Lengkap || g.Nama_Guru || g.Nama || g.nama || g.nama_guru || '';
        const nip = g.NIP || g.nip || g.NUPTK || '-';
        const id = g.GuruID || g.ID_Guru || g.ID || g.id || ('GURU-' + (idx + 1));
        const jabatan = [g.Jabatan || g.jabatan || '', g.Mapel || g.mapel || ''].filter(Boolean).join(' - ') || 'Guru';
        return {
          guruId: String(id).trim(),
          nip: String(nip).trim(),
          nama: String(nama).trim(),
          jabatan: jabatan,
          skorKehadiranAuto: 0,
          ringkasanAbsen: 'Belum ada log absensi pada bulan ini'
        };
      }).filter(g => g.nama);
    } catch (e) {
      console.warn('Fallback getGuru gagal:', e);
    }
  }

  const currentVal = select.value;

  if (window.jQuery && $.fn.select2 && $(select).data('select2')) {
    $(select).select2('destroy');
  }

  if (cacheDaftarGuruKG.length === 0) {
    select.innerHTML = '<option value="">-- Data sheet Guru masih kosong (0 guru) --</option>';
  } else {
    select.innerHTML = '<option value="">-- Pilih Guru --</option>';
    cacheDaftarGuruKG.forEach(g => {
      const opt = document.createElement('option');
      opt.value = g.guruId;
      opt.textContent = `${g.nama} (${g.nip})`;
      select.appendChild(opt);
    });
  }

  if (currentVal) select.value = currentVal;

  if (window.jQuery && $.fn.select2) {
    $(select).select2({
      width: '100%',
      dropdownParent: $('#modalKinerjaGuru'),
      placeholder: '-- Cari & Pilih Guru --'
    });
    $(select).off('change.kg').on('change.kg', onSelectGuruKinerja);
  }
}

async function onModalPeriodeChange() {
  const modalPeriode = document.getElementById('kg-periode')?.value;
  if (!modalPeriode) return;
  const detailEl = document.getElementById('kg-absen-detail');
  if (detailEl) detailEl.textContent = '⏳ Menyinkronkan rekap absensi bulan terpilih...';

  await loadKinerjaGuru(modalPeriode);
  onSelectGuruKinerja();
}

function updateKpiKinerjaGuru_() {
  const total = cacheKinerjaGuru.length;
  const avg = total > 0
    ? (cacheKinerjaGuru.reduce((sum, item) => sum + Number(item.skorAkhir || 0), 0) / total).toFixed(1)
    : '0.0';
  const unggul = cacheKinerjaGuru.filter(item => item.skorAkhir >= 91).length;
  const bina = cacheKinerjaGuru.filter(item => item.skorAkhir < 70).length;

  document.getElementById('kg-kpi-total').textContent = total;
  document.getElementById('kg-kpi-avg').textContent = avg;
  document.getElementById('kg-kpi-unggul').textContent = unggul;
  document.getElementById('kg-kpi-bina').textContent = bina;
}

function renderTabelKinerjaGuru() {
  const tbody = document.getElementById('tbody-kinerja-guru');
  if (!tbody) return;

  const keyword = (document.getElementById('kg-search-input')?.value || '').toLowerCase();
  const filtered = cacheKinerjaGuru.filter(item =>
    item.namaGuru.toLowerCase().includes(keyword) ||
    String(item.nip).toLowerCase().includes(keyword) ||
    item.predikat.toLowerCase().includes(keyword)
  );

  if (filtered.length === 0) {
    tbody.innerHTML = '<tr><td colspan="11" style="text-align:center; padding:20px; color:#a29bfe;">Belum ada data penilaian kinerja pada periode ini.</td></tr>';
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
        <td><strong>${item.namaGuru}</strong><br><small style="color:#a29bfe;">NIP: ${item.nip}</small></td>
        <td>${item.jabatan}</td>
        <td>${item.skorKehadiran}</td>
        <td>${item.skorPerangkat}</td>
        <td>${item.skorMengajar}</td>
        <td>${item.skorAdministrasi}</td>
        <td><strong style="color:#00d2d3; font-size:14px;">${item.skorAkhir}</strong></td>
        <td><span class="badge ${badgeClass}" style="${extraStyle}">${item.predikat}</span></td>
        <td style="white-space:normal; min-width:160px;">${item.catatan || '-'}</td>
        <td>
          <button type="button" class="btn-action btn-small" onclick="editKinerjaGuru('${item.idKinerja}')">✏️ Edit</button>
          <button type="button" class="btn-action btn-small badge-danger" style="border:none;" onclick="hapusKinerjaGuru('${item.idKinerja}')">🗑️</button>
        </td>
      </tr>
    `;
  }).join('');
}

async function openModalKinerjaGuru() {
  showModalKinerja_();

  document.getElementById('modalKinerjaTitle').textContent = '🏆 Form Penilaian Kinerja Guru';
  document.getElementById('kg-id').value = '';
  const activePeriode = document.getElementById('kg-filter-periode')?.value || new Date().toISOString().slice(0, 7);
  document.getElementById('kg-periode').value = activePeriode;

  document.getElementById('kg-skor-hadir').value = 0;
  document.getElementById('kg-skor-perangkat').value = 85;
  document.getElementById('kg-skor-mengajar').value = 85;
  document.getElementById('kg-skor-admin').value = 85;
  document.getElementById('kg-catatan').value = '';
  const detailEl = document.getElementById('kg-absen-detail');
  if (detailEl) detailEl.textContent = 'Pilih guru untuk menarik rekap absensi...';

  const btn = document.getElementById('btn-simpan-kg');
  if (btn) {
    btn.disabled = false;
    btn.textContent = '💾 Simpan Penilaian';
  }

  hitungPreviewKinerja();

  if (!cacheDaftarGuruKG || cacheDaftarGuruKG.length === 0) {
    const select = document.getElementById('kg-guru-select');
    if (select) select.innerHTML = '<option value="">⏳ Memuat data guru...</option>';
    await loadKinerjaGuru(activePeriode);
  } else {
    await populateDropdownGuruKG_();
  }

  const select = document.getElementById('kg-guru-select');
  if (select) {
    select.value = '';
    try {
      if (window.jQuery && $(select).data('select2')) {
        $(select).trigger('change.select2');
      }
    } catch (e) {}
  }
}

function onSelectGuruKinerja() {
  const guruId = document.getElementById('kg-guru-select').value;
  const guru = cacheDaftarGuruKG.find(g => String(g.guruId) === String(guruId));
  const detailEl = document.getElementById('kg-absen-detail');

  if (guru) {
    document.getElementById('kg-skor-hadir').value = guru.skorKehadiranAuto;
    if (detailEl) detailEl.textContent = guru.ringkasanAbsen || 'Tersinkron dengan log absensi';
    hitungPreviewKinerja();
  } else {
    document.getElementById('kg-skor-hadir').value = 0;
    if (detailEl) detailEl.textContent = 'Pilih guru untuk menarik rekap absensi...';
    hitungPreviewKinerja();
  }
}

async function syncAbsensiKinerja() {
  const periode = document.getElementById('kg-filter-periode')?.value;
  if (!periode) return;
  if (!confirm(`Sinkronkan ulang skor kehadiran (40%) seluruh guru pada periode ${periode} dari data absensi terbaru?`)) return;

  try {
    const url = `${getKinerjaApiUrl_()}?action=syncAbsensiKinerjaGuru&periode=${encodeURIComponent(periode)}`;
    const res = await fetch(url);
    const json = await res.json();
    alert(json.message || 'Sinkronisasi selesai.');
    loadKinerjaGuru();
  } catch (err) {
    alert('Gagal menyinkronkan data absensi.');
  }
}

function hitungPreviewKinerja() {
  const h = Number(document.getElementById('kg-skor-hadir').value) || 0;
  const p = Number(document.getElementById('kg-skor-perangkat').value) || 0;
  const m = Number(document.getElementById('kg-skor-mengajar').value) || 0;
  const a = Number(document.getElementById('kg-skor-admin').value) || 0;

  const akhir = ((h * 0.4) + (p * 0.2) + (m * 0.25) + (a * 0.15)).toFixed(1);
  const skorEl = document.getElementById('kg-preview-skor');
  const predEl = document.getElementById('kg-preview-predikat');

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

async function submitKinerjaGuru(e) {
  e.preventDefault();
  const guruId = document.getElementById('kg-guru-select').value;
  const guru = cacheDaftarGuruKG.find(g => String(g.guruId) === String(guruId));
  if (!guru) return alert('Silakan pilih guru terlebih dahulu.');

  const btn = document.getElementById('btn-simpan-kg');
  btn.disabled = true;
  btn.textContent = 'Menyimpan...';

  const payload = {
    action: 'saveKinerjaGuru',
    idKinerja: document.getElementById('kg-id').value,
    periode: document.getElementById('kg-periode').value,
    guruId: guru.guruId,
    nip: guru.nip,
    namaGuru: guru.nama,
    jabatan: guru.jabatan,
    skorKehadiran: document.getElementById('kg-skor-hadir').value,
    skorPerangkat: document.getElementById('kg-skor-perangkat').value,
    skorMengajar: document.getElementById('kg-skor-mengajar').value,
    skorAdministrasi: document.getElementById('kg-skor-admin').value,
    catatan: document.getElementById('kg-catatan').value,
    penilai: localStorage.getItem('nama') || 'Admin'
  };

  try {
    const res = await fetch(getKinerjaApiUrl_(), {
      method: 'POST',
      body: JSON.stringify(payload)
    });
    const json = await res.json();
    alert(json.message || 'Penilaian tersimpan!');
    closeModal('modalKinerjaGuru');
    loadKinerjaGuru();
  } catch (err) {
    alert('Gagal menyimpan penilaian kinerja.');
  } finally {
    btn.disabled = false;
    btn.textContent = '💾 Simpan Penilaian';
  }
}

async function editKinerjaGuru(idKinerja) {
  const item = cacheKinerjaGuru.find(x => String(x.idKinerja) === String(idKinerja));
  if (!item) return;

  showModalKinerja_();

  if (!cacheDaftarGuruKG || cacheDaftarGuruKG.length === 0) {
    await populateDropdownGuruKG_();
  }

  document.getElementById('modalKinerjaTitle').textContent = '✏️ Edit Penilaian Kinerja Guru';
  document.getElementById('kg-id').value = item.idKinerja;
  document.getElementById('kg-periode').value = item.periode;
  document.getElementById('kg-guru-select').value = item.guruId;
  try {
    if (window.jQuery && $('#kg-guru-select').data('select2')) {
      $('#kg-guru-select').trigger('change.select2');
    }
  } catch (e) {}

  document.getElementById('kg-skor-hadir').value = item.skorKehadiran;
  document.getElementById('kg-skor-perangkat').value = item.skorPerangkat;
  document.getElementById('kg-skor-mengajar').value = item.skorMengajar;
  document.getElementById('kg-skor-admin').value = item.skorAdministrasi;
  document.getElementById('kg-catatan').value = item.catatan;

  const btn = document.getElementById('btn-simpan-kg');
  if (btn) {
    btn.disabled = false;
    btn.textContent = '💾 Simpan Penilaian';
  }

  hitungPreviewKinerja();
}

async function hapusKinerjaGuru(idKinerja) {
  if (!confirm('Hapus data penilaian kinerja guru ini?')) return;
  try {
    const url = `${getKinerjaApiUrl_()}?action=deleteKinerjaGuru&idKinerja=${encodeURIComponent(idKinerja)}`;
    const res = await fetch(url);
    const json = await res.json();
    alert(json.message || 'Data dihapus.');
    loadKinerjaGuru();
  } catch (err) {
    alert('Gagal menghapus data.');
  }
}

function exportKinerjaGuruCSV() {
  if (cacheKinerjaGuru.length === 0) return alert('Tidak ada data untuk diunduh.');
  const rows = [
    ['No', 'Periode', 'NIP', 'Nama Guru', 'Jabatan', 'Kehadiran (40%)', 'Perangkat (20%)', 'Mengajar (25%)', 'Administrasi (15%)', 'Skor Akhir', 'Predikat', 'Catatan']
  ];
  cacheKinerjaGuru.forEach((r, i) => {
    rows.push([i + 1, r.periode, `"${r.nip}"`, `"${r.namaGuru}"`, `"${r.jabatan}"`, r.skorKehadiran, r.skorPerangkat, r.skorMengajar, r.skorAdministrasi, r.skorAkhir, r.predikat, `"${r.catatan}"`]);
  });
  const csvContent = 'data:text/csv;charset=utf-8,' + rows.map(e => e.join(',')).join('\n');
  const link = document.createElement('a');
  link.setAttribute('href', encodeURI(csvContent));
  link.setAttribute('download', `Performa_Kinerja_Guru_${document.getElementById('kg-filter-periode').value}.csv`);
  document.body.appendChild(link);
  link.click();
  link.remove();
}