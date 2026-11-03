/**
 * Pure business logic and calculation utilities for
 * Ayam Geprek KING SALMAN Financial & Cashflow Management.
 */

export interface TransactionItem {
  nama: string;
  qty: number;
  satuan?: string;
  harga: number;
}

export interface Transaction {
  id: string;
  tanggal: string; // YYYY-MM-DD
  pemasukanItems?: TransactionItem[];
  pemasukanText?: string;
  pemasukanRp: number;
  pengeluaranItems?: TransactionItem[];
  pengeluaranText?: string;
  pengeluaranRp: number;
}

export interface ModalItem {
  nama: string;
  qty: number;
  satuan?: string;
  harga: number;
}

export interface ModalEntry {
  id: string;
  tanggal: string; // YYYY-MM-DD
  kategori: 'Modal Awal' | 'Tambahan Investasi' | 'Modal Berjalan';
  items?: ModalItem[];
  keterangan?: string;
  nominal: number;
}

export interface AppState {
  selectedMonth?: string;
  updatedAt: number;
  version?: number;
  transactions: Transaction[];
  modals: ModalEntry[];
}

export function formatRupiah(angka: number | string): string {
  const nilai = Number(angka) || 0;
  const tanda = nilai < 0 ? '- ' : '';
  return tanda + 'Rp ' + Math.abs(nilai).toLocaleString('id-ID');
}

export function formatTanggalID(isoDate?: string): string {
  if (!isoDate) return '-';
  const parts = isoDate.split('-');
  return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : isoDate;
}

export function getPreviousMonth(yyyyMm?: string): string {
  if (!yyyyMm || !yyyyMm.includes('-')) {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }
  const [y, m] = yyyyMm.split('-').map(Number);
  const d = new Date(y, m - 2, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

export function sumItemsTotal(items?: TransactionItem[] | ModalItem[], fallbackRp?: number): number {
  if (!Array.isArray(items) || items.length === 0) return Number(fallbackRp) || 0;
  return items.reduce((acc, it) => acc + ((Number(it.qty) || 0) * (Number(it.harga) || 0)), 0);
}

export function parseQuickBreakdownText(rawText?: string): Array<{ nama: string; qty: number; satuan: string; harga: number }> {
  if (!rawText || !rawText.trim()) return [];
  return rawText.split(',').map(s => s.trim()).filter(Boolean).map(part => {
    const matchQty = part.match(/^(.+?)\s*\(\s*(\d+)\s*[xX*]\s*([\d.]+)\s*\)$/);
    const matchSingle = part.match(/^(.+?)\s*\(\s*([\d.]+)\s*\)$/);
    if (matchQty) {
      return {
        nama: matchQty[1].trim(),
        qty: parseInt(matchQty[2], 10) || 1,
        satuan: '',
        harga: parseInt(matchQty[3].replace(/\./g, ''), 10) || 0
      };
    }
    if (matchSingle) {
      return {
        nama: matchSingle[1].trim(),
        qty: 1,
        satuan: '',
        harga: parseInt(matchSingle[2].replace(/\./g, ''), 10) || 0
      };
    }
    return { nama: part, qty: 1, satuan: '', harga: 0 };
  });
}

export function calculateMonthlyMetrics(transactions: Transaction[], modals: ModalEntry[], yyyyMm: string) {
  const txInMonth = (transactions || []).filter(t => t.tanggal && t.tanggal.startsWith(yyyyMm));
  const modalInMonth = (modals || []).filter(m => m.tanggal && m.tanggal.startsWith(yyyyMm));

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

/**
 * Merges server and client state safely to avoid losing offline edits
 * or existing data stored in local device storage.
 */
export function mergeStates(serverState: AppState, clientState: AppState): AppState {
  if (!serverState || !serverState.transactions) return clientState;
  if (!clientState || !clientState.transactions) return serverState;

  // If client is newer or has records not in server, merge records by ID
  const txMap = new Map<string, Transaction>();
  // Place server transactions first
  (serverState.transactions || []).forEach(t => txMap.set(t.id, t));
  // Place or overwrite with client transactions if client has them
  (clientState.transactions || []).forEach(t => {
    if (!txMap.has(t.id) || (clientState.updatedAt > serverState.updatedAt)) {
      txMap.set(t.id, t);
    }
  });

  const modalMap = new Map<string, ModalEntry>();
  (serverState.modals || []).forEach(m => modalMap.set(m.id, m));
  (clientState.modals || []).forEach(m => {
    if (!modalMap.has(m.id) || (clientState.updatedAt > serverState.updatedAt)) {
      modalMap.set(m.id, m);
    }
  });

  const mergedTx = Array.from(txMap.values()).sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || ''));
  const mergedModals = Array.from(modalMap.values()).sort((a, b) => (b.tanggal || '').localeCompare(a.tanggal || ''));

  return {
    selectedMonth: clientState.selectedMonth || serverState.selectedMonth,
    updatedAt: Math.max(serverState.updatedAt || 0, clientState.updatedAt || 0, Date.now()),
    version: Math.max(serverState.version || 1, clientState.version || 1) + 1,
    transactions: mergedTx,
    modals: mergedModals
  };
}
