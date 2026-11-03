import test from 'node:test';
import assert from 'node:assert/strict';
import {
  formatRupiah,
  formatTanggalID,
  sumItemsTotal,
  parseQuickBreakdownText,
  calculateMonthlyMetrics,
  mergeStates,
  Transaction,
  ModalEntry,
  AppState
} from './calculations';

test('formatRupiah formats positive and negative IDR amounts correctly', () => {
  assert.equal(formatRupiah(50000), 'Rp 50.000');
  assert.equal(formatRupiah(0), 'Rp 0');
  assert.equal(formatRupiah(-25000), '- Rp 25.000');
});

test('formatTanggalID converts YYYY-MM-DD to DD/MM/YYYY', () => {
  assert.equal(formatTanggalID('2026-11-03'), '03/11/2026');
  assert.equal(formatTanggalID(''), '-');
});

test('sumItemsTotal accurately sums quantity * price with fallback', () => {
  const items = [
    { nama: 'Ayam Geprek', qty: 10, harga: 15000 },
    { nama: 'Es Teh Manis', qty: 5, harga: 4000 }
  ];
  assert.equal(sumItemsTotal(items), 170000);
  assert.equal(sumItemsTotal([], 99000), 99000);
});

test('parseQuickBreakdownText parses shorthand notation with quantities and prices', () => {
  const input = 'Ayam Geprek (20 x 15000), Es Teh (10 x 5000)';
  const result = parseQuickBreakdownText(input);
  assert.equal(result.length, 2);
  assert.equal(result[0].nama, 'Ayam Geprek');
  assert.equal(result[0].qty, 20);
  assert.equal(result[0].harga, 15000);
  assert.equal(result[1].nama, 'Es Teh');
  assert.equal(result[1].qty, 10);
  assert.equal(result[1].harga, 5000);
});

test('calculateMonthlyMetrics computes income, expenses, running capital, and net profit', () => {
  const transactions: Transaction[] = [
    {
      id: 'tx-1',
      tanggal: '2026-11-01',
      pemasukanRp: 500000,
      pengeluaranRp: 100000
    },
    {
      id: 'tx-2',
      tanggal: '2026-11-02',
      pemasukanRp: 300000,
      pengeluaranRp: 50000
    },
    {
      id: 'tx-3',
      tanggal: '2026-10-25', // previous month, should be filtered out
      pemasukanRp: 200000,
      pengeluaranRp: 50000
    }
  ];

  const modals: ModalEntry[] = [
    {
      id: 'mdl-1',
      tanggal: '2026-11-01',
      kategori: 'Modal Berjalan',
      nominal: 150000
    },
    {
      id: 'mdl-2',
      tanggal: '2026-11-01',
      kategori: 'Modal Awal',
      nominal: 2000000
    }
  ];

  const metrics = calculateMonthlyMetrics(transactions, modals, '2026-11');
  assert.equal(metrics.totalPemasukan, 800000);
  assert.equal(metrics.totalPengeluaran, 150000);
  assert.equal(metrics.modalBerjalan, 150000);
  assert.equal(metrics.totalBersihPendapatan, 500000); // 800000 - 150000 - 150000
  assert.equal(metrics.jumlahTransaksi, 2);
});

test('mergeStates blends existing local device data and server state without dropping records', () => {
  const serverState: AppState = {
    updatedAt: 1000,
    version: 1,
    transactions: [
      { id: 'tx-1', tanggal: '2026-11-01', pemasukanRp: 100000, pengeluaranRp: 20000 }
    ],
    modals: []
  };

  const clientExistingState: AppState = {
    updatedAt: 2000,
    version: 1,
    transactions: [
      { id: 'tx-1', tanggal: '2026-11-01', pemasukanRp: 150000, pengeluaranRp: 20000 },
      { id: 'tx-2', tanggal: '2026-11-02', pemasukanRp: 200000, pengeluaranRp: 30000 }
    ],
    modals: [
      { id: 'mdl-1', tanggal: '2026-11-01', kategori: 'Modal Awal', nominal: 500000 }
    ]
  };

  const merged = mergeStates(serverState, clientExistingState);
  assert.equal(merged.transactions.length, 2);
  // tx-1 should take client's updated amount since client was newer
  assert.equal(merged.transactions.find(t => t.id === 'tx-1')?.pemasukanRp, 150000);
  assert.equal(merged.modals.length, 1);
});
