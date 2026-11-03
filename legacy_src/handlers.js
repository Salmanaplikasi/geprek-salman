// =========================================================
// 4. FORM HANDLERS, UNIVERSAL EDIT POP-UP & EXPORTS (handlers.js)
// =========================================================

window.CLOUD_TOPIC_ID     = window.CLOUD_TOPIC_ID || 'geprek_king_salman_cloud_sync_v19';
window.NTFY_BASE_URL      = window.NTFY_BASE_URL || ('https://ntfy.sh/' + window.CLOUD_TOPIC_ID);
window.KVDB_BASE_URL      = window.KVDB_BASE_URL || ('https://kvdb.io/N7cmQg1DwZbADh2Hu3NncF/' + window.CLOUD_TOPIC_ID);
window.STORAGE_KEY_STATE  = window.STORAGE_KEY_STATE || 'SIKEU_FULL_STATE_V19';
window.SESSION_KEY_PERIOD = window.SESSION_KEY_PERIOD || 'SIKEU_SELECTED_PERIOD';

window.state = window.state || {
  selectedMonth: '',
  updatedAt: 0,
  transactions: [],
  modals: []
};

window.getEl = window.getEl || function(id) { return document.getElementById(id); };
window.setVal = window.setVal || function(id, val) { const el = document.getElementById(id); if (el) el.value = val; };
window.getVal = window.getVal || function(id, fallback = '') { const el = document.getElementById(id); return el && typeof el.value !== 'undefined' ? el.value : fallback; };
window.setText = window.setText || function(id, text) { const el = document.getElementById(id); if (el) el.textContent = text; };
window.setHtml = window.setHtml || function(id, html) { const el = document.getElementById(id); if (el) el.innerHTML = html; };

window.formatRupiah = window.formatRupiah || function(angka) {
  const nilai = Number(angka) || 0;
  const tanda = nilai < 0 ? '- ' : '';
  return tanda + 'Rp ' + Math.abs(nilai).toLocaleString('id-ID');
};

window.formatTanggalID = window.formatTanggalID || function(isoDate) {
  if (!isoDate) return '-';
  const parts = isoDate.split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : isoDate;
};

window.formatNamaBulan = window.formatNamaBulan || function(yyyyMm) {
  if (!yyyyMm) return '-';
  const [year, month] = yyyyMm.split('-');
  const namaBulan = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  return `${namaBulan[parseInt(month, 10) - 1] || month} ${year}`;
};

window.getPreviousMonth = window.getPreviousMonth || function(yyyyMm) {
  if (!yyyyMm || !yyyyMm.includes('-')) {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
  const [y, m] = yyyyMm.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

window.buildItemsSummaryText = window.buildItemsSummaryText || function(items, fallbackText) {
  if (!Array.isArray(items) || items.length === 0) return fallbackText || '-';
  return items.map(it => `${it.nama} (${it.qty}${it.satuan ? ' ' + it.satuan : ''})`).join(', ');
};

window.sumItemsTotal = window.sumItemsTotal || function(items, fallbackRp) {
  if (!Array.isArray(items) || items.length === 0) return Number(fallbackRp) || 0;
  return items.reduce((acc, it) => acc + ((Number(it.qty) || 0) * (Number(it.harga) || 0)), 0);
};

window.parseQuickBreakdownText = window.parseQuickBreakdownText || function(rawText) {
  if (!rawText || !rawText.trim()) return [];
  return rawText.split(',').map(s => s.trim()).filter(Boolean).map(part => {
    const matchQty = part.match(/^(.+?)\s*\(\s*(\d+)\s*[xX*]\s*([\d.]+)\s*\)$/);
    const matchSingle = part.match(/^(.+?)\s*\(\s*([\d.]+)\s*\)$/);
    if (matchQty) {
      return { nama: matchQty[1].trim(), qty: parseInt(matchQty[2], 10) || 1, satuan: '', harga: parseInt(matchQty[3].replace(/\./g, ''), 10) || 0 };
    }
    if (matchSingle) {
      return { nama: matchSingle[1].trim(), qty: 1, satuan: '', harga: parseInt(matchSingle[2].replace(/\./g, ''), 10) || 0 };
    }
    return { nama: part, qty: 1, satuan: '', harga: 0 };
  });
};

window.getInitialSeedData = window.getInitialSeedData || function() {
  const now = new Date();
  const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prevYM = window.getPreviousMonth(currentYM);

  const sampleModals = [
    {
      id: 'MDL-101',
      tanggal: `${prevYM}-01`,
      kategori: 'Modal Awal',
      items: [
        { nama: 'Kompor & Peralatan Masak', qty: 1, satuan: 'Paket', harga: 3000000 },
        { nama: 'Kas Operasional Awal', qty: 1, satuan: 'Paket', harga: 2000000 }
      ],
      keterangan: 'Kompor & Peralatan Masak (1 Paket), Kas Operasional Awal (1 Paket)',
      nominal: 5000000
    },
    {
      id: 'MDL-102',
      tanggal: `${currentYM}-02`,
      kategori: 'Modal Berjalan',
      items: [
        { nama: 'Beras Premium 25Kg', qty: 1, satuan: 'Karung', harga: 350000 },
        { nama: 'Minyak Goreng', qty: 10, satuan: 'Liter', harga: 17500 }
      ],
      keterangan: 'Beras Premium 25Kg (1 Karung), Minyak Goreng (10 Liter)',
      nominal: 525000
    }
  ];

  const sampleTransactions = [
    {
      id: 'TX-101',
      tanggal: `${currentYM}-02`,
      pemasukanItems: [
        { nama: 'Paket Ayam Geprek', qty: 30, satuan: 'Porsi', harga: 15000 },
        { nama: 'Es Teh Manis', qty: 25, satuan: 'Cup', harga: 5000 }
      ],
      pemasukanText: 'Paket Ayam Geprek (30 Porsi), Es Teh Manis (25 Cup)',
      pemasukanRp: 575000,
      pengeluaranItems: [
        { nama: 'Beli Es Batu', qty: 2, satuan: 'Box', harga: 25000 }
      ],
      pengeluaranText: 'Beli Es Batu (2 Box)',
      pengeluaranRp: 50000
    }
  ];

  return { sampleModals, sampleTransactions, currentYM };
};

// =========================================================
// INISIALISASI HALAMAN BERSAMA
// =========================================================
async function initSharedApp() {
  const { sampleModals, sampleTransactions, currentYM } = window.getInitialSeedData();
  const savedPeriod = sessionStorage.getItem(window.SESSION_KEY_PERIOD);
  state.selectedMonth = savedPeriod || currentYM;
  if (getEl('filterBulanGlobal')) setVal('filterBulanGlobal', state.selectedMonth);

  const todayISO = new Date().toISOString().slice(0, 10);
  ['modalTanggal', 'harianTanggal', 'mingguanTanggal', 'bulananTanggal'].forEach(id => {
    setVal(id, todayISO);
  });

  const savedRaw = localStorage.getItem(window.STORAGE_KEY_STATE);
  if (savedRaw) {
    try {
      const parsed = JSON.parse(savedRaw);
      if (parsed && (Array.isArray(parsed.transactions) || Array.isArray(parsed.modals))) {
        state.updatedAt = Number(parsed.updatedAt) || 1000;
        state.transactions = parsed.transactions || [];
        state.modals = parsed.modals || [];
      }
    } catch (e) {}
  }

  if (state.updatedAt === 0) {
    state.updatedAt = 1000;
    state.transactions = sampleTransactions;
    state.modals = sampleModals;
  }

  if (typeof renderCurrentPage === 'function') renderCurrentPage();

  const pendingEditTx = sessionStorage.getItem('PENDING_EDIT_TX');
  if (pendingEditTx) {
    sessionStorage.removeItem('PENDING_EDIT_TX');
    editHarian(pendingEditTx);
  }
  const pendingEditModal = sessionStorage.getItem('PENDING_EDIT_MODAL');
  if (pendingEditModal) {
    sessionStorage.removeItem('PENDING_EDIT_MODAL');
    editModal(pendingEditModal);
  }

  if (typeof fetchFromCloudServer === 'function') {
    const hasNewerFromCloud = await fetchFromCloudServer();
    if (!hasNewerFromCloud && typeof uploadToCloudServer === 'function') {
      await uploadToCloudServer();
    }
  }
  if (typeof startRealtimeStream === 'function') {
    startRealtimeStream();
  }
}

function saveToStorage() {
  state.updatedAt = Date.now();
  localStorage.setItem(window.STORAGE_KEY_STATE, JSON.stringify({
    updatedAt: state.updatedAt,
    transactions: state.transactions,
    modals: state.modals
  }));
  if (typeof uploadToCloudServer === 'function') {
    uploadToCloudServer();
  }
}

function handlePeriodChange() {
  const val = getVal('filterBulanGlobal');
  if (val) {
    state.selectedMonth = val;
    sessionStorage.setItem(window.SESSION_KEY_PERIOD, val);
    if (typeof renderCurrentPage === 'function') renderCurrentPage();
  }
}

function pilihBulan(ym) {
  state.selectedMonth = ym;
  sessionStorage.setItem(window.SESSION_KEY_PERIOD, ym);
  setVal('filterBulanGlobal', ym);
  setVal('modeBulanan', 'detail_bulan_ini');
  if (typeof renderLaporanBulanan === 'function') renderLaporanBulanan();
}

function resetSampleData() {
  if (!confirm('Muat ulang data contoh awal? (Perubahan ini juga akan disinkronkan ke semua perangkat)')) return;
  const { sampleModals, sampleTransactions, currentYM } = window.getInitialSeedData();
  state.transactions = sampleTransactions;
  state.modals = sampleModals;
  state.selectedMonth = currentYM;
  sessionStorage.setItem(window.SESSION_KEY_PERIOD, currentYM);
  setVal('filterBulanGlobal', currentYM);
  saveToStorage();
  if (getEl('formModal')) resetFormModal();
  if (getEl('formHarian')) resetFormHarian();
  if (typeof renderCurrentPage === 'function') renderCurrentPage();
}

function removeDynamicRow(btn, type) {
  const row = btn.closest('div.grid');
  if (row) row.remove();
  if (type === 'modal') updateModalFormPreview();
  else if (type === 'harian') updateHarianFormPreview();
  else if (type === 'popup-harian') updatePopupHarianPreview();
  else if (type === 'popup-modal') updatePopupModalPreview();
}

// =========================================================
// HANDLERS FORM SHEET MODAL
// =========================================================
function addModalItemRow(item = { nama: '', qty: 1, satuan: 'Unit', harga: '' }) {
  const container = getEl('modalItemsContainer');
  if (!container) return;
  const row = document.createElement('div');
  row.className = 'modal-item-row grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-white p-2 rounded-lg border';
  row.innerHTML = `
    <div class="sm:col-span-5"><input type="text" placeholder="Nama Barang" value="${item.nama || ''}" oninput="updateModalFormPreview()" required class="modal-item-nama w-full rounded border px-2.5 py-1.5 text-xs" /></div>
    <div class="sm:col-span-2"><input type="number" min="1" placeholder="Qty" value="${item.qty || 1}" oninput="updateModalFormPreview()" required class="modal-item-qty w-full rounded border px-2.5 py-1.5 text-xs" /></div>
    <div class="sm:col-span-2"><input type="text" placeholder="Satuan" value="${item.satuan || ''}" oninput="updateModalFormPreview()" class="modal-item-satuan w-full rounded border px-2.5 py-1.5 text-xs" /></div>
    <div class="sm:col-span-2"><input type="number" min="0" placeholder="Harga" value="${item.harga !== undefined && item.harga !== '' ? item.harga : ''}" oninput="updateModalFormPreview()" required class="modal-item-harga w-full rounded border px-2.5 py-1.5 text-xs" /></div>
    <div class="sm:col-span-1 text-right"><button type="button" onclick="removeDynamicRow(this, 'modal')" class="text-rose-600 font-bold px-2 py-1">✕</button></div>`;
  container.appendChild(row);
  updateModalFormPreview();
}

function getModalFormItems() {
  const items = [];
  document.querySelectorAll('#modalItemsContainer .modal-item-row').forEach(r => {
    const nama = r.querySelector('.modal-item-nama')?.value.trim() || '';
    const qty = Number(r.querySelector('.modal-item-qty')?.value) || 0;
    const satuan = r.querySelector('.modal-item-satuan')?.value.trim() || '';
    const harga = Number(r.querySelector('.modal-item-harga')?.value) || 0;
    if (nama) items.push({ nama, qty, satuan, harga });
  });
  return items;
}

function updateModalFormPreview() {
  setText('previewTotalModalForm', formatRupiah(sumItemsTotal(getModalFormItems(), 0)));
}

function handleSaveModal(e) {
  e.preventDefault();
  const editId = getVal('modalEditId');
  const tanggal = getVal('modalTanggal');
  const kategori = getVal('modalKategori', 'Modal Awal');
  const items = getModalFormItems();
  if (items.length === 0) return alert('Mohon isi minimal 1 rincian barang modal.');

  const payload = {
    id: editId || ('MDL-' + Date.now()),
    tanggal,
    kategori,
    items,
    keterangan: buildItemsSummaryText(items, '-'),
    nominal: sumItemsTotal(items, 0)
  };

  if (editId) {
    const idx = state.modals.findIndex(m => String(m.id) === String(editId));
    if (idx !== -1) state.modals[idx] = payload;
  } else {
    state.modals.push(payload);
  }

  resetFormModal();
  saveToStorage();
  if (typeof renderCurrentPage === 'function') renderCurrentPage();
}

function editModal(id) {
  const item = state.modals.find(m => String(m.id) === String(id));
  if (!item) return alert('Data modal tidak ditemukan.');
  openPopupEditModal(item);
}

function deleteModal(id) {
  if (!confirm('Hapus catatan modal ini?')) return;
  state.modals = state.modals.filter(m => String(m.id) !== String(id));
  saveToStorage();
  if (typeof renderCurrentPage === 'function') renderCurrentPage();
}

function resetFormModal() {
  setVal('modalEditId', '');
  const c = getEl('modalItemsContainer');
  if (c) { c.innerHTML = ''; addModalItemRow(); }
  setText('formModalTitle', 'Tambah Catatan Modal Usaha');
  setText('btnSimpanModal', '+ Simpan Modal');
  const btnBatal = getEl('btnBatalModal');
  if (btnBatal) btnBatal.classList.add('hidden');
  updateModalFormPreview();
}

// =========================================================
// HANDLERS FORM LAPORAN HARIAN
// =========================================================
function addIncomeItemRow(item = { nama: '', qty: 1, satuan: 'Porsi', harga: '' }) {
  const c = getEl('incomeItemsContainer');
  if (!c) return;
  const row = document.createElement('div');
  row.className = 'income-item-row grid grid-cols-12 gap-1.5 items-center bg-white p-2 rounded-lg border border-emerald-200';
  row.innerHTML = `
    <div class="col-span-5"><input type="text" placeholder="Nama Barang" value="${item.nama || ''}" oninput="updateHarianFormPreview()" class="inc-nama w-full rounded border px-2 py-1 text-xs" /></div>
    <div class="col-span-2"><input type="number" min="1" placeholder="Qty" value="${item.qty || 1}" oninput="updateHarianFormPreview()" class="inc-qty w-full rounded border px-2 py-1 text-xs" /></div>
    <div class="col-span-2"><input type="text" placeholder="Satuan" value="${item.satuan || ''}" oninput="updateHarianFormPreview()" class="inc-satuan w-full rounded border px-2 py-1 text-xs" /></div>
    <div class="col-span-2"><input type="number" min="0" placeholder="Harga" value="${item.harga !== undefined && item.harga !== '' ? item.harga : ''}" oninput="updateHarianFormPreview()" class="inc-harga w-full rounded border px-2 py-1 text-xs" /></div>
    <div class="col-span-1 text-right"><button type="button" onclick="removeDynamicRow(this, 'harian')" class="text-rose-600 font-bold px-1">✕</button></div>`;
  c.appendChild(row);
  updateHarianFormPreview();
}

function addExpenseItemRow(item = { nama: '', qty: 1, satuan: 'Pack', harga: '' }) {
  const c = getEl('expenseItemsContainer');
  if (!c) return;
  const row = document.createElement('div');
  row.className = 'expense-item-row grid grid-cols-12 gap-1.5 items-center bg-white p-2 rounded-lg border border-rose-200';
  row.innerHTML = `
    <div class="col-span-5"><input type="text" placeholder="Nama Pengeluaran" value="${item.nama || ''}" oninput="updateHarianFormPreview()" class="exp-nama w-full rounded border px-2 py-1 text-xs" /></div>
    <div class="col-span-2"><input type="number" min="1" placeholder="Qty" value="${item.qty || 1}" oninput="updateHarianFormPreview()" class="exp-qty w-full rounded border px-2 py-1 text-xs" /></div>
    <div class="col-span-2"><input type="text" placeholder="Satuan" value="${item.satuan || ''}" oninput="updateHarianFormPreview()" class="exp-satuan w-full rounded border px-2 py-1 text-xs" /></div>
    <div class="col-span-2"><input type="number" min="0" placeholder="Harga" value="${item.harga !== undefined && item.harga !== '' ? item.harga : ''}" oninput="updateHarianFormPreview()" class="exp-harga w-full rounded border px-2 py-1 text-xs" /></div>
    <div class="col-span-1 text-right"><button type="button" onclick="removeDynamicRow(this, 'harian')" class="text-rose-600 font-bold px-1">✕</button></div>`;
  c.appendChild(row);
  updateHarianFormPreview();
}

function getHarianFormItems() {
  const pemasukanItems = [], pengeluaranItems = [];
  document.querySelectorAll('#incomeItemsContainer .income-item-row').forEach(r => {
    const nama = r.querySelector('.inc-nama')?.value.trim() || '';
    const qty = Number(r.querySelector('.inc-qty')?.value) || 0;
    const satuan = r.querySelector('.inc-satuan')?.value.trim() || '';
    const harga = Number(r.querySelector('.inc-harga')?.value) || 0;
    if (nama) pemasukanItems.push({ nama, qty, satuan, harga });
  });
  document.querySelectorAll('#expenseItemsContainer .expense-item-row').forEach(r => {
    const nama = r.querySelector('.exp-nama')?.value.trim() || '';
    const qty = Number(r.querySelector('.exp-qty')?.value) || 0;
    const satuan = r.querySelector('.exp-satuan')?.value.trim() || '';
    const harga = Number(r.querySelector('.exp-harga')?.value) || 0;
    if (nama) pengeluaranItems.push({ nama, qty, satuan, harga });
  });
  return { pemasukanItems, pengeluaranItems };
}

function updateHarianFormPreview() {
  const { pemasukanItems, pengeluaranItems } = getHarianFormItems();
  setText('previewTotalMasukHarian', formatRupiah(sumItemsTotal(pemasukanItems, 0)));
  setText('previewTotalKeluarHarian', formatRupiah(sumItemsTotal(pengeluaranItems, 0)));
}

function handleSaveHarian(e) {
  e.preventDefault();
  const editId = getVal('harianEditId');
  const tanggal = getVal('harianTanggal');
  const { pemasukanItems, pengeluaranItems } = getHarianFormItems();
  if (!pemasukanItems.length && !pengeluaranItems.length) return alert('Mohon isi minimal 1 rincian Pemasukan atau Pengeluaran.');

  const payload = {
    id: editId || ('TX-' + Date.now()),
    tanggal,
    pemasukanItems,
    pemasukanText: buildItemsSummaryText(pemasukanItems, '-'),
    pemasukanRp: sumItemsTotal(pemasukanItems, 0),
    pengeluaranItems,
    pengeluaranText: buildItemsSummaryText(pengeluaranItems, '-'),
    pengeluaranRp: sumItemsTotal(pengeluaranItems, 0)
  };

  if (editId) {
    const idx = state.transactions.findIndex(t => String(t.id) === String(editId));
    if (idx !== -1) state.transactions[idx] = payload;
  } else {
    state.transactions.push(payload);
  }

  if (tanggal && tanggal.slice(0, 7)) {
    state.selectedMonth = tanggal.slice(0, 7);
    sessionStorage.setItem(window.SESSION_KEY_PERIOD, state.selectedMonth);
    setVal('filterBulanGlobal', state.selectedMonth);
  }

  resetFormHarian();
  saveToStorage();
  if (typeof renderCurrentPage === 'function') renderCurrentPage();
}

function editHarian(id) {
  const item = state.transactions.find(t => String(t.id) === String(id));
  if (!item) return alert('Data transaksi tidak ditemukan.');
  openPopupEditHarian(item);
}

function deleteHarian(id) {
  if (!confirm('Hapus transaksi ini?')) return;
  state.transactions = state.transactions.filter(t => String(t.id) !== String(id));
  saveToStorage();
  if (typeof renderCurrentPage === 'function') renderCurrentPage();
}

function resetFormHarian() {
  setVal('harianEditId', '');
  const inc = getEl('incomeItemsContainer');
  const exp = getEl('expenseItemsContainer');
  if (inc) { inc.innerHTML = ''; addIncomeItemRow(); }
  if (exp) { exp.innerHTML = ''; addExpenseItemRow(); }
  setText('formHarianTitle', 'Formulir Input Laporan Harian & Rincian Harga');
  setText('btnSimpanHarian', '+ Simpan Transaksi Harian');
  const btnBatal = getEl('btnBatalHarian');
  if (btnBatal) btnBatal.classList.add('hidden');
  updateHarianFormPreview();
}

// =========================================================
// POP-UP MODAL EDIT UNIVERSAL (LANGSUNG MUNCUL DI SEMUA HALAMAN)
// =========================================================
function ensureUniversalModalContainer() {
  let modal = getEl('universalEditOverlay');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'universalEditOverlay';
    modal.className = 'fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm hidden flex items-center justify-center p-4 overflow-y-auto';
    document.body.appendChild(modal);
  }
  return modal;
}

function closeUniversalEditModal() {
  const modal = getEl('universalEditOverlay');
  if (modal) {
    modal.classList.add('hidden');
    modal.innerHTML = '';
  }
}

function openPopupEditHarian(item) {
  const overlay = ensureUniversalModalContainer();
  overlay.classList.remove('hidden');
  overlay.innerHTML = `
    <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-4xl w-full p-5 space-y-4 my-8 max-h-[90vh] overflow-y-auto">
      <div class="flex justify-between items-center border-b pb-3">
        <div>
          <span class="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-blue-100 text-blue-800">Mode Koreksi Data</span>
          <h3 class="text-base font-bold text-slate-900 mt-0.5">✏️ Edit Laporan Transaksi (${formatTanggalID(item.tanggal)})</h3>
        </div>
        <button type="button" onclick="closeUniversalEditModal()" class="text-slate-400 hover:text-slate-700 font-bold text-lg px-2">✕</button>
      </div>
      <form onsubmit="handleSavePopupHarian(event, '${item.id}')" class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
          <div>
            <label class="block text-xs font-semibold mb-1">Tanggal Transaksi</label>
            <input type="date" id="popupHarianTanggal" value="${item.tanggal}" required class="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm" />
          </div>
          <div class="bg-emerald-50 border border-emerald-200 rounded-lg p-2.5">
            <span class="text-[11px] font-semibold text-emerald-800 block">Total Pemasukan Baru:</span>
            <span id="popupPreviewMasuk" class="text-base font-bold text-emerald-700">Rp 0</span>
          </div>
          <div class="bg-rose-50 border border-rose-200 rounded-lg p-2.5">
            <span class="text-[11px] font-semibold text-rose-800 block">Total Pengeluaran Baru:</span>
            <span id="popupPreviewKeluar" class="text-base font-bold text-rose-700">Rp 0</span>
          </div>
        </div>
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div class="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-2.5">
            <div class="flex justify-between items-center">
              <h4 class="text-xs font-bold text-emerald-900 uppercase">1. Rincian Pemasukan / Penjualan</h4>
              <button type="button" onclick="addPopupIncomeRow()" class="bg-emerald-600 hover:bg-emerald-700 text-white text-xs px-2.5 py-1 rounded font-semibold">+ Tambah Barang</button>
            </div>
            <div id="popupIncomeContainer" class="space-y-2"></div>
          </div>
          <div class="p-3.5 rounded-xl bg-rose-50/50 border border-rose-200 space-y-2.5">
            <div class="flex justify-between items-center">
              <h4 class="text-xs font-bold text-rose-900 uppercase">2. Rincian Pengeluaran / Belanja</h4>
              <button type="button" onclick="addPopupExpenseRow()" class="bg-rose-600 hover:bg-rose-700 text-white text-xs px-2.5 py-1 rounded font-semibold">+ Tambah Barang</button>
            </div>
            <div id="popupExpenseContainer" class="space-y-2"></div>
          </div>
        </div>
        <div class="flex justify-end gap-2 border-t pt-3">
          <button type="button" onclick="closeUniversalEditModal()" class="px-4 py-2 rounded-lg border text-xs font-semibold hover:bg-slate-100">Batal</button>
          <button type="submit" class="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-xs font-semibold shadow">💾 Simpan Perubahan</button>
        </div>
      </form>
    </div>
  `;

  const incList = item.pemasukanItems && item.pemasukanItems.length
    ? item.pemasukanItems
    : (item.pemasukanRp ? [{ nama: item.pemasukanText || 'Pemasukan', qty: 1, satuan: 'Porsi', harga: item.pemasukanRp }] : [{}]);
  const expList = item.pengeluaranItems && item.pengeluaranItems.length
    ? item.pengeluaranItems
    : (item.pengeluaranRp ? [{ nama: item.pengeluaranText || 'Pengeluaran', qty: 1, satuan: 'Pack', harga: item.pengeluaranRp }] : [{}]);

  incList.forEach(it => addPopupIncomeRow(it));
  expList.forEach(it => addPopupExpenseRow(it));
  updatePopupHarianPreview();
}

function addPopupIncomeRow(item = { nama: '', qty: 1, satuan: 'Porsi', harga: '' }) {
  const c = getEl('popupIncomeContainer');
  if (!c) return;
  const row = document.createElement('div');
  row.className = 'popup-inc-row grid grid-cols-12 gap-1.5 items-center bg-white p-2 rounded-lg border border-emerald-200';
  row.innerHTML = `
    <div class="col-span-5"><input type="text" placeholder="Nama Barang" value="${item.nama || ''}" oninput="updatePopupHarianPreview()" class="p-inc-nama w-full rounded border px-2 py-1 text-xs" /></div>
    <div class="col-span-2"><input type="number" min="1" placeholder="Qty" value="${item.qty || 1}" oninput="updatePopupHarianPreview()" class="p-inc-qty w-full rounded border px-2 py-1 text-xs" /></div>
    <div class="col-span-2"><input type="text" placeholder="Satuan" value="${item.satuan || ''}" oninput="updatePopupHarianPreview()" class="p-inc-satuan w-full rounded border px-2 py-1 text-xs" /></div>
    <div class="col-span-2"><input type="number" min="0" placeholder="Harga" value="${item.harga !== undefined && item.harga !== '' ? item.harga : ''}" oninput="updatePopupHarianPreview()" class="p-inc-harga w-full rounded border px-2 py-1 text-xs" /></div>
    <div class="col-span-1 text-right"><button type="button" onclick="removeDynamicRow(this, 'popup-harian')" class="text-rose-600 font-bold px-1">✕</button></div>`;
  c.appendChild(row);
  updatePopupHarianPreview();
}

function addPopupExpenseRow(item = { nama: '', qty: 1, satuan: 'Pack', harga: '' }) {
  const c = getEl('popupExpenseContainer');
  if (!c) return;
  const row = document.createElement('div');
  row.className = 'popup-exp-row grid grid-cols-12 gap-1.5 items-center bg-white p-2 rounded-lg border border-rose-200';
  row.innerHTML = `
    <div class="col-span-5"><input type="text" placeholder="Nama Pengeluaran" value="${item.nama || ''}" oninput="updatePopupHarianPreview()" class="p-exp-nama w-full rounded border px-2 py-1 text-xs" /></div>
    <div class="col-span-2"><input type="number" min="1" placeholder="Qty" value="${item.qty || 1}" oninput="updatePopupHarianPreview()" class="p-exp-qty w-full rounded border px-2 py-1 text-xs" /></div>
    <div class="col-span-2"><input type="text" placeholder="Satuan" value="${item.satuan || ''}" oninput="updatePopupHarianPreview()" class="p-exp-satuan w-full rounded border px-2 py-1 text-xs" /></div>
    <div class="col-span-2"><input type="number" min="0" placeholder="Harga" value="${item.harga !== undefined && item.harga !== '' ? item.harga : ''}" oninput="updatePopupHarianPreview()" class="p-exp-harga w-full rounded border px-2 py-1 text-xs" /></div>
    <div class="col-span-1 text-right"><button type="button" onclick="removeDynamicRow(this, 'popup-harian')" class="text-rose-600 font-bold px-1">✕</button></div>`;
  c.appendChild(row);
  updatePopupHarianPreview();
}

function getPopupHarianItems() {
  const pemasukanItems = [], pengeluaranItems = [];
  document.querySelectorAll('#popupIncomeContainer .popup-inc-row').forEach(r => {
    const nama = r.querySelector('.p-inc-nama')?.value.trim() || '';
    const qty = Number(r.querySelector('.p-inc-qty')?.value) || 0;
    const satuan = r.querySelector('.p-inc-satuan')?.value.trim() || '';
    const harga = Number(r.querySelector('.p-inc-harga')?.value) || 0;
    if (nama) pemasukanItems.push({ nama, qty, satuan, harga });
  });
  document.querySelectorAll('#popupExpenseContainer .popup-exp-row').forEach(r => {
    const nama = r.querySelector('.p-exp-nama')?.value.trim() || '';
    const qty = Number(r.querySelector('.p-exp-qty')?.value) || 0;
    const satuan = r.querySelector('.p-exp-satuan')?.value.trim() || '';
    const harga = Number(r.querySelector('.p-exp-harga')?.value) || 0;
    if (nama) pengeluaranItems.push({ nama, qty, satuan, harga });
  });
  return { pemasukanItems, pengeluaranItems };
}

function updatePopupHarianPreview() {
  const { pemasukanItems, pengeluaranItems } = getPopupHarianItems();
  setText('popupPreviewMasuk', formatRupiah(sumItemsTotal(pemasukanItems, 0)));
  setText('popupPreviewKeluar', formatRupiah(sumItemsTotal(pengeluaranItems, 0)));
}

function handleSavePopupHarian(e, editId) {
  e.preventDefault();
  const tanggal = getVal('popupHarianTanggal');
  const { pemasukanItems, pengeluaranItems } = getPopupHarianItems();
  if (!pemasukanItems.length && !pengeluaranItems.length) return alert('Mohon isi minimal 1 rincian Pemasukan atau Pengeluaran.');

  const payload = {
    id: editId,
    tanggal,
    pemasukanItems,
    pemasukanText: buildItemsSummaryText(pemasukanItems, '-'),
    pemasukanRp: sumItemsTotal(pemasukanItems, 0),
    pengeluaranItems,
    pengeluaranText: buildItemsSummaryText(pengeluaranItems, '-'),
    pengeluaranRp: sumItemsTotal(pengeluaranItems, 0)
  };

  const idx = state.transactions.findIndex(t => String(t.id) === String(editId));
  if (idx !== -1) state.transactions[idx] = payload;

  if (tanggal && tanggal.slice(0, 7)) {
    state.selectedMonth = tanggal.slice(0, 7);
    sessionStorage.setItem(window.SESSION_KEY_PERIOD, state.selectedMonth);
    setVal('filterBulanGlobal', state.selectedMonth);
  }

  closeUniversalEditModal();
  saveToStorage();
  if (typeof renderCurrentPage === 'function') renderCurrentPage();
}

function openPopupEditModal(item) {
  const overlay = ensureUniversalModalContainer();
  overlay.classList.remove('hidden');
  overlay.innerHTML = `
    <div class="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-3xl w-full p-5 space-y-4 my-8 max-h-[90vh] overflow-y-auto">
      <div class="flex justify-between items-center border-b pb-3">
        <div>
          <span class="px-2 py-0.5 text-[10px] font-bold uppercase rounded bg-amber-100 text-amber-800">Mode Koreksi Modal</span>
          <h3 class="text-base font-bold text-slate-900 mt-0.5">✏️ Edit Catatan Modal (${formatTanggalID(item.tanggal)})</h3>
        </div>
        <button type="button" onclick="closeUniversalEditModal()" class="text-slate-400 hover:text-slate-700 font-bold text-lg px-2">✕</button>
      </div>
      <form onsubmit="handleSavePopupModal(event, '${item.id}')" class="space-y-4">
        <div class="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label class="block text-xs font-semibold mb-1">Tanggal</label>
            <input type="date" id="popupModalTanggal" value="${item.tanggal}" required class="w-full rounded-lg border px-3 py-2 text-sm" />
          </div>
          <div>
            <label class="block text-xs font-semibold mb-1">Kategori Modal</label>
            <select id="popupModalKategori" class="w-full rounded-lg border px-3 py-2 text-sm">
              <option value="Modal Awal" ${item.kategori === 'Modal Awal' ? 'selected' : ''}>Modal Awal</option>
              <option value="Tambahan Investasi" ${item.kategori === 'Tambahan Investasi' ? 'selected' : ''}>Tambahan Investasi</option>
              <option value="Modal Berjalan" ${item.kategori === 'Modal Berjalan' ? 'selected' : ''}>Modal Berjalan</option>
            </select>
          </div>
          <div class="bg-slate-50 p-2.5 rounded-lg border flex flex-col justify-center">
            <span class="text-[11px] font-semibold text-slate-500 uppercase">Total Nominal Baru:</span>
            <span id="popupPreviewModal" class="text-base font-bold text-slate-900">Rp 0</span>
          </div>
        </div>
        <div class="p-3.5 rounded-xl bg-slate-50 border space-y-2.5">
          <div class="flex justify-between items-center">
            <h4 class="text-xs font-bold">Rincian Barang Modal</h4>
            <button type="button" onclick="addPopupModalRow()" class="bg-slate-900 text-white text-xs px-3 py-1 rounded font-semibold">+ Tambah Baris</button>
          </div>
          <div id="popupModalItemsContainer" class="space-y-2"></div>
        </div>
        <div class="flex justify-end gap-2 border-t pt-3">
          <button type="button" onclick="closeUniversalEditModal()" class="px-4 py-2 rounded-lg border text-xs font-semibold hover:bg-slate-100">Batal</button>
          <button type="submit" class="bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-xs font-semibold shadow">💾 Simpan Perubahan</button>
        </div>
      </form>
    </div>
  `;

  const list = item.items && item.items.length
    ? item.items
    : [{ nama: item.keterangan || 'Modal', qty: 1, satuan: 'Paket', harga: item.nominal || 0 }];
  list.forEach(it => addPopupModalRow(it));
  updatePopupModalPreview();
}

function addPopupModalRow(item = { nama: '', qty: 1, satuan: 'Unit', harga: '' }) {
  const c = getEl('popupModalItemsContainer');
  if (!c) return;
  const row = document.createElement('div');
  row.className = 'popup-mdl-row grid grid-cols-12 gap-2 items-center bg-white p-2 rounded-lg border';
  row.innerHTML = `
    <div class="col-span-5"><input type="text" placeholder="Nama Barang" value="${item.nama || ''}" oninput="updatePopupModalPreview()" required class="p-mdl-nama w-full rounded border px-2 py-1 text-xs" /></div>
    <div class="col-span-2"><input type="number" min="1" placeholder="Qty" value="${item.qty || 1}" oninput="updatePopupModalPreview()" required class="p-mdl-qty w-full rounded border px-2 py-1 text-xs" /></div>
    <div class="col-span-2"><input type="text" placeholder="Satuan" value="${item.satuan || ''}" oninput="updatePopupModalPreview()" required class="p-mdl-satuan w-full rounded border px-2 py-1 text-xs" /></div>
    <div class="col-span-2"><input type="number" min="0" placeholder="Harga" value="${item.harga !== undefined && item.harga !== '' ? item.harga : ''}" oninput="updatePopupModalPreview()" required class="p-mdl-harga w-full rounded border px-2 py-1 text-xs" /></div>
    <div class="col-span-1 text-right"><button type="button" onclick="removeDynamicRow(this, 'popup-modal')" class="text-rose-600 font-bold px-1">✕</button></div>`;
  c.appendChild(row);
  updatePopupModalPreview();
}

function getPopupModalItems() {
  const items = [];
  document.querySelectorAll('#popupModalItemsContainer .popup-mdl-row').forEach(r => {
    const nama = r.querySelector('.p-mdl-nama')?.value.trim() || '';
    const qty = Number(r.querySelector('.p-mdl-qty')?.value) || 0;
    const satuan = r.querySelector('.p-mdl-satuan')?.value.trim() || '';
    const harga = Number(r.querySelector('.p-mdl-harga')?.value) || 0;
    if (nama) items.push({ nama, qty, satuan, harga });
  });
  return items;
}

function updatePopupModalPreview() {
  setText('popupPreviewModal', formatRupiah(sumItemsTotal(getPopupModalItems(), 0)));
}

function handleSavePopupModal(e, editId) {
  e.preventDefault();
  const tanggal = getVal('popupModalTanggal');
  const kategori = getVal('popupModalKategori', 'Modal Awal');
  const items = getPopupModalItems();
  if (!items.length) return alert('Mohon isi minimal 1 rincian barang modal.');

  const payload = {
    id: editId,
    tanggal,
    kategori,
    items,
    keterangan: buildItemsSummaryText(items, '-'),
    nominal: sumItemsTotal(items, 0)
  };

  const idx = state.modals.findIndex(m => String(m.id) === String(editId));
  if (idx !== -1) state.modals[idx] = payload;

  closeUniversalEditModal();
  saveToStorage();
  if (typeof renderCurrentPage === 'function') renderCurrentPage();
}

function handleQuickAddFromSheet(e, prefix) {
  e.preventDefault();
  const tanggal = getVal(`${prefix}Tanggal`);
  const pemasukanItems = parseQuickBreakdownText(getVal(`${prefix}PemasukanText`));
  const pengeluaranItems = parseQuickBreakdownText(getVal(`${prefix}PengeluaranText`));

  if (!pemasukanItems.length && !pengeluaranItems.length) return alert('Mohon isi rincian Pemasukan atau Pengeluaran.');

  state.transactions.push({
    id: 'TX-' + Date.now(),
    tanggal,
    pemasukanItems,
    pemasukanText: buildItemsSummaryText(pemasukanItems, '-'),
    pemasukanRp: sumItemsTotal(pemasukanItems, 0),
    pengeluaranItems,
    pengeluaranText: buildItemsSummaryText(pengeluaranItems, '-'),
    pengeluaranRp: sumItemsTotal(pengeluaranItems, 0)
  });

  setVal(`${prefix}PemasukanText`, '');
  setVal(`${prefix}PengeluaranText`, '');
  saveToStorage();
  if (typeof renderCurrentPage === 'function') renderCurrentPage();
}

// =========================================================
// EKSPOR DOKUMEN (PDF, WORD, EXCEL)
// =========================================================
function getActiveTableClone(tableId) {
  const tableEl = getEl(tableId);
  if (!tableEl) return null;
  const clone = tableEl.cloneNode(true);
  clone.querySelectorAll('.no-export').forEach(el => el.remove());
  return clone;
}

function exportToPDF(tableId, namePrefix) {
  const clone = getActiveTableClone(tableId);
  if (!clone) return;
  const wrapper = document.createElement('div');
  wrapper.style.padding = '16px';
  wrapper.innerHTML = `<h2 style="font-size:15px;font-weight:bold;margin-bottom:8px;">LAPORAN KEUANGAN - ${namePrefix.toUpperCase()} (${formatNamaBulan(state.selectedMonth)})</h2>`;
  wrapper.appendChild(clone);
  html2pdf().set({ margin: 8, filename: `Laporan_${namePrefix}_${state.selectedMonth}.pdf`, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' } }).from(wrapper).save();
}

function exportToWord(tableId, namePrefix) {
  const clone = getActiveTableClone(tableId);
  if (!clone) return;
  const html = `<html xmlns:w="urn:schemas-microsoft-com:office:word"><head><meta charset="utf-8"><style>table{border-collapse:collapse;width:100%;}th,td{border:1px solid #000;padding:5px;font-size:10pt;vertical-align:top;}</style></head><body><h2>LAPORAN KEUANGAN - ${namePrefix.toUpperCase()}</h2>${clone.outerHTML}</body></html>`;
  const blob = new Blob(['\ufeff', html], { type: 'application/msword' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `Laporan_${namePrefix}_${state.selectedMonth}.doc`;
  a.click();
}

function exportToExcel(tableId, namePrefix) {
  const clone = getActiveTableClone(tableId);
  if (!clone) return;
  clone.querySelectorAll('.rp-breakdown-item').forEach(li => li.after(document.createTextNode(' | ')));
  const wb = XLSX.utils.book_new();
  const ws = XLSX.utils.table_to_sheet(clone, { raw: true });
  XLSX.utils.book_append_sheet(wb, ws, `Sheet_${namePrefix}`);
  XLSX.writeFile(wb, `Laporan_${namePrefix}_${state.selectedMonth}.xlsx`);
}