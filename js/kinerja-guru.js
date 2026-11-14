// =========================================================
// MODUL FRONTEND: PERFORMA KINERJA GURU (PKG)
// =========================================================
let cacheKinerjaGuru = [];
let cacheDaftarGuruKG = [];

function getKinerjaApiUrl_() {
  return window.API_URL || (window.CONFIG && CONFIG.SCRIPT_URL) || window.SCRIPT_URL || '';
}

document.addEventListener('DOMContentLoaded', () => {
  const nowMonth = new Date().toISOString().slice(0, 7);
  const filterEl = document.getElementById('kg-filter-periode');
  const modalPeriodeEl = document.getElementById('kg-periode');
  if (filterEl && !filterEl.value) filterEl.value = nowMonth;
  if (modalPeriodeEl && !modalPeriodeEl.value) modalPeriodeEl.value = nowMonth;
});

async function loadKinerjaGuru() {
  const periode = document.getElementById('kg-filter-periode')?.value || new Date().toISOString().slice(0, 7);
  const tbody = document.getElementById('tbody-kinerja-guru');
  if (tbody) {
    tbody.innerHTML = '<tr><td colspan="11" style="text-align:center; padding:20px; color:#a29bfe;">⏳ Memuat data performa kinerja guru...</td></tr>';
  }

  try {
    const url = `${getKinerjaApiUrl_()}?action=getKinerjaGuru&periode=${encodeURIComponent(periode)}`;
    const res = await fetch(url);
    const json = await res.json();

    if (json.status === 'success') {
      cacheKinerjaGuru = (json.data || []).sort((a, b) => b.skorAkhir - a.skorAkhir);
      cacheDaftarGuruKG = json.daftarGuru || [];
      populateDropdownGuruKG_();
      updateKpiKinerjaGuru_();
      renderTabelKinerjaGuru();
    }
  } catch (err) {
    if (tbody) {
      tbody.innerHTML = '<tr><td colspan="11" style="text-align:center; padding:20px; color:#ff6b6b;">Gagal memuat data kinerja guru.</td></tr>';
    }
  }
}

function populateDropdownGuruKG_() {
  const select = document.getElementById('kg-guru-select');
  if (!select) return;
  select.innerHTML = '<option value="">-- Pilih Guru --</option>';
  cacheDaftarGuruKG.forEach(g => {
    const opt = document.createElement('option');
    opt.value = g.guruId;
    opt.textContent = `${g.nama} (${g.nip})`;
    select.appendChild(opt);
  });
  if (window.jQuery && $(select).data('select2')) {
    $(select).trigger('change.select2');
  }
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

function openModalKinerjaGuru() {
  document.getElementById('modalKinerjaTitle').textContent = '🏆 Form Penilaian Kinerja Guru';
  document.getElementById('kg-id').value = '';
  document.getElementById('kg-periode').value = document.getElementById('kg-filter-periode')?.value || new Date().toISOString().slice(0, 7);
  document.getElementById('kg-guru-select').value = '';
  if (window.jQuery && $('#kg-guru-select').data('select2')) {
    $('#kg-guru-select').trigger('change.select2');
  }
  document.getElementById('kg-skor-hadir').value = 100;
  document.getElementById('kg-skor-perangkat').value = 85;
  document.getElementById('kg-skor-mengajar').value = 85;
  document.getElementById('kg-skor-admin').value = 85;
  document.getElementById('kg-catatan').value = '';
  hitungPreviewKinerja();
  document.getElementById('modalKinerjaGuru').classList.add('active');
}

function onSelectGuruKinerja() {
  const guruId = document.getElementById('kg-guru-select').value;
  const guru = cacheDaftarGuruKG.find(g => String(g.guruId) === String(guruId));
  if (guru) {
    document.getElementById('kg-skor-hadir').value = guru.skorKehadiranAuto;
    hitungPreviewKinerja();
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
    predEl.style.cssText = 'font-size:13px; padding:6px 12px;';
  } else if (akhir >= 81) {
    predEl.textContent = 'Baik';
    predEl.className = 'badge';
    predEl.style.cssText = 'font-size:13px; padding:6px 12px; background:#54a0ff; color:#fff;';
  } else if (akhir >= 70) {
    predEl.textContent = 'Cukup';
    predEl.className = 'badge badge-warning';
    predEl.style.cssText = 'font-size:13px; padding:6px 12px;';
  } else {
    predEl.textContent = 'Perlu Pembinaan';
    predEl.className = 'badge badge-danger';
    predEl.style.cssText = 'font-size:13px; padding:6px 12px;';
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

function editKinerjaGuru(idKinerja) {
  const item = cacheKinerjaGuru.find(x => String(x.idKinerja) === String(idKinerja));
  if (!item) return;

  document.getElementById('modalKinerjaTitle').textContent = '✏️ Edit Penilaian Kinerja Guru';
  document.getElementById('kg-id').value = item.idKinerja;
  document.getElementById('kg-periode').value = item.periode;
  document.getElementById('kg-guru-select').value = item.guruId;
  if (window.jQuery && $('#kg-guru-select').data('select2')) {
    $('#kg-guru-select').trigger('change.select2');
  }
  document.getElementById('kg-skor-hadir').value = item.skorKehadiran;
  document.getElementById('kg-skor-perangkat').value = item.skorPerangkat;
  document.getElementById('kg-skor-mengajar').value = item.skorMengajar;
  document.getElementById('kg-skor-admin').value = item.skorAdministrasi;
  document.getElementById('kg-catatan').value = item.catatan;
  hitungPreviewKinerja();
  document.getElementById('modalKinerjaGuru').classList.add('active');
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