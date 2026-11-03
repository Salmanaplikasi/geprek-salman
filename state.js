// =========================================================
// 1. STATE & KALKULASI DASAR ONLINE-FIRST (state.js)
// =========================================================
window.STORAGE_KEY_STATE  = 'SIKEU_FULL_STATE_V19';
window.SESSION_KEY_PERIOD = 'SIKEU_SELECTED_PERIOD';
window.API_BASE_URL       = '';
window.API_STATE_URL      = '/api/state';
window.API_MERGE_URL      = '/api/sync-merge';
window.API_STREAM_URL     = '/api/stream';
window.API_RESET_URL      = '/api/reset';

window.state = window.state || {
  selectedMonth: '',
  updatedAt: 0,
  transactions: [],
  modals: []
};

function getEl(id) { return document.getElementById(id); }
function setVal(id, val) { const el = document.getElementById(id); if (el) el.value = val; }
function getVal(id, fallback = '') { const el = document.getElementById(id); return el && typeof el.value !== 'undefined' ? el.value : fallback; }
function setText(id, text) { const el = document.getElementById(id); if (el) el.textContent = text; }
function setHtml(id, html) { const el = document.getElementById(id); if (el) el.innerHTML = html; }

function formatRupiah(angka) {
  const nilai = Number(angka) || 0;
  const tanda = nilai < 0 ? '- ' : '';
  return tanda + 'Rp ' + Math.abs(nilai).toLocaleString('id-ID');
}

function formatTanggalID(isoDate) {
  if (!isoDate) return '-';
  const parts = isoDate.split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : isoDate;
}

function formatNamaBulan(yyyyMm) {
  if (!yyyyMm) return '-';
  const [year, month] = yyyyMm.split('-');
  const namaBulan = [
    'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
    'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
  ];
  return `${namaBulan[parseInt(month, 10) - 1] || month} ${year}`;
}

function getPreviousMonth(yyyyMm) {
  if (!yyyyMm || !yyyyMm.includes('-')) {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
  const [y, m] = yyyyMm.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

function buildItemsSummaryText(items, fallbackText) {
  if (!Array.isArray(items) || items.length === 0) return fallbackText || '-';
  return items.map(it => `${it.nama} (${it.qty}${it.satuan ? ' ' + it.satuan : ''})`).join(', ');
}

function sumItemsTotal(items, fallbackRp) {
  if (!Array.isArray(items) || items.length === 0) return Number(fallbackRp) || 0;
  return items.reduce((acc, it) => acc + ((Number(it.qty) || 0) * (Number(it.harga) || 0)), 0);
}

function parseQuickBreakdownText(rawText) {
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
}

function getInitialSeedData() {
  const now = new Date();
  const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const prevYM = getPreviousMonth(currentYM);

  const sampleModals = [
    {
      id: 'MDL-101',
      tanggal: `${prevYM}-01`,
      kategori: 'Modal Awal',
      items: [{ nama: 'Kompor & Peralatan Masak', qty: 1, satuan: 'Paket', harga: 3000000 }],
      keterangan: 'Kompor & Peralatan Masak (1 Paket)',
      nominal: 3000000
    }
  ];

  const sampleTransactions = [
    {
      id: 'TX-101',
      tanggal: `${currentYM}-02`,
      pemasukanItems: [{ nama: 'Paket Ayam Geprek', qty: 30, satuan: 'Porsi', harga: 15000 }],
      pemasukanText: 'Paket Ayam Geprek (30 Porsi)',
      pemasukanRp: 450000,
      pengeluaranItems: [{ nama: 'Beli Es Batu', qty: 2, satuan: 'Box', harga: 25000 }],
      pengeluaranText: 'Beli Es Batu (2 Box)',
      pengeluaranRp: 50000
    }
  ];

  return { sampleModals, sampleTransactions, currentYM };
}

function calculateMonthlyMetrics(yyyyMm) {
  const txInMonth = (state.transactions || []).filter(t => t.tanggal && t.tanggal.startsWith(yyyyMm));
  const modalInMonth = (state.modals || []).filter(m => m.tanggal && m.tanggal.startsWith(yyyyMm));

  const totalPemasukan = txInMonth.reduce((a, b) => a + (Number(b.pemasukanRp) || 0), 0);
  const totalPengeluaran = txInMonth.reduce((a, b) => a + (Number(b.pengeluaranRp) || 0), 0);
  const modalBerjalan = modalInMonth
    .filter(m => m.kategori === 'Modal Berjalan')
    .reduce((a, b) => a + (Number(b.nominal) || 0), 0);

  return {
    yyyyMm,
    totalPemasukan,
    totalPengeluaran,
    modalBerjalan,
    totalBersihPendapatan: totalPemasukan - totalPengeluaran - modalBerjalan,
    jumlahTransaksi: txInMonth.length
  };
}

function getWeeklyAggregates(yyyyMm) {
  const txList = (state.transactions || [])
    .filter(t => t.tanggal && t.tanggal.startsWith(yyyyMm))
    .sort((a, b) => a.tanggal.localeCompare(b.tanggal));

  const ranges = [
    { week: 1, label: 'Minggu 1 (Tgl 01 - 07)', min: 1, max: 7, items: [] },
    { week: 2, label: 'Minggu 2 (Tgl 08 - 14)', min: 8, max: 14, items: [] },
    { week: 3, label: 'Minggu 3 (Tgl 15 - 21)', min: 15, max: 21, items: [] },
    { week: 4, label: 'Minggu 4 (Tgl 22 - 28)', min: 22, max: 28, items: [] },
    { week: 5, label: 'Minggu 5 (Tgl 29 - 31)', min: 29, max: 31, items: [] }
  ];

  txList.forEach(t => {
    const day = parseInt(t.tanggal.split('-')[2], 10);
    (ranges.find(r => day >= r.min && day <= r.max) || ranges[4]).items.push(t);
  });

  return ranges.map(r => {
    const pemasukanRp = r.items.reduce((a, b) => a + (Number(b.pemasukanRp) || 0), 0);
    const pengeluaranRp = r.items.reduce((a, b) => a + (Number(b.pengeluaranRp) || 0), 0);
    const combinedIncomeItems = [], combinedExpenseItems = [];
    r.items.forEach(tx => {
      (tx.pemasukanItems || []).forEach(it => combinedIncomeItems.push({ ...it, nama: `[Tgl ${tx.tanggal.slice(8, 10)}] ${it.nama}` }));
      (tx.pengeluaranItems || []).forEach(it => combinedExpenseItems.push({ ...it, nama: `[Tgl ${tx.tanggal.slice(8, 10)}] ${it.nama}` }));
    });
    return {
      ...r,
      pemasukanRp,
      pengeluaranRp,
      net: pemasukanRp - pengeluaranRp,
      pemasukanList: r.items.map(i => i.pemasukanText).filter(x => x && x !== '-').join('; ') || '-',
      pengeluaranList: r.items.map(i => i.pengeluaranText).filter(x => x && x !== '-').join('; ') || '-',
      combinedIncomeItems,
      combinedExpenseItems
    };
  });
}