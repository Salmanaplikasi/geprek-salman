// =========================================================
// 3. UI, TABLE & DASHBOARD RENDERERS (renderers.js)
// =========================================================
function ensureDataIds() {
  let changed = false;
  if (Array.isArray(state.transactions)) {
    state.transactions.forEach((t, idx) => {
      if (!t.id) {
        t.id = 'TX-' + Date.now() + '-' + idx;
        changed = true;
      }
    });
  }
  if (Array.isArray(state.modals)) {
    state.modals.forEach((m, idx) => {
      if (!m.id) {
        m.id = 'MDL-' + Date.now() + '-' + idx;
        changed = true;
      }
    });
  }
}

function renderActionButtons(id, type = 'harian') {
  const editFn = type === 'modal' ? `editModal('${id}')` : `editHarian('${id}')`;
  const delFn  = type === 'modal' ? `deleteModal('${id}')` : `deleteHarian('${id}')`;
  return `
    <div class="flex items-center justify-center gap-1.5">
      <button type="button" onclick="${editFn}" class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-600 hover:text-white transition shadow-sm">
        ✏️ Edit
      </button>
      <button type="button" onclick="${delFn}" class="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-600 hover:text-white transition shadow-sm">
        🗑️ Hapus
      </button>
    </div>
  `;
}

function renderRpBreakdownCell(items, totalNominal, colorType) {
  const total = Number(totalNominal) || 0;
  const colorClass = colorType === 'income' ? 'text-emerald-700' : 'text-rose-700';
  const badgeBg = colorType === 'income' ? 'bg-emerald-50/70' : 'bg-rose-50/70';

  if (!Array.isArray(items) || items.length === 0) {
    return total === 0
      ? '<span class="text-slate-400">-</span>'
      : `<div class="font-bold ${colorClass} whitespace-nowrap">${formatRupiah(total)}</div>`;
  }

  const listHtml = items.map(it => {
    const qty = Number(it.qty) || 0;
    const harga = Number(it.harga) || 0;
    return `<li class="rp-breakdown-item">
      <span>&bull; ${it.nama} (${qty} &times; ${formatRupiah(harga)}):</span>
      <span class="font-semibold whitespace-nowrap">${formatRupiah(qty * harga)}</span>
    </li>`;
  }).join('');

  return `<div class="p-1.5 rounded ${badgeBg}">
    <ul class="rp-breakdown-list">${listHtml}</ul>
    <div class="rp-breakdown-subtotal ${colorClass}">
      <span>Subtotal:</span>
      <span class="whitespace-nowrap">${formatRupiah(total)}</span>
    </div>
  </div>`;
}

function buildStandardTableFooter(totalMasuk, totalKeluar, saldoAkhir, includeActionCol) {
  return `<tr class="bg-slate-100 font-bold text-slate-900 border-t-2 border-slate-400">
    <td>Total</td>
    <td></td>
    <td></td>
    <td class="text-emerald-700 whitespace-nowrap">${formatRupiah(totalMasuk)}</td>
    <td></td>
    <td class="text-rose-700 whitespace-nowrap">${formatRupiah(totalKeluar)}</td>
    <td class="${saldoAkhir >= 0 ? 'text-emerald-700' : 'text-rose-700'} whitespace-nowrap">${formatRupiah(saldoAkhir)}</td>
    ${includeActionCol ? '<td class="no-export"></td>' : ''}
  </tr>`;
}

function renderAwalBulanBanner() {
  const banner = getEl('awalBulanBanner');
  if (!banner) return;

  const isFirst = new Date().getDate() === 1;
  const prevYM = getPreviousMonth(state.selectedMonth);
  const prev = calculateMonthlyMetrics(prevYM);
  const curr = calculateMonthlyMetrics(state.selectedMonth);

  banner.className = `rounded-xl border p-4 shadow-sm ${prev.totalBersihPendapatan >= 0 ? 'bg-emerald-50 border-emerald-300 text-emerald-950' : 'bg-rose-50 border-rose-300 text-rose-950'}`;
  banner.innerHTML = `
    <div class="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
      <div>
        <span class="px-2.5 py-0.5 text-[11px] font-bold uppercase rounded-full ${isFirst ? 'bg-amber-500 text-white' : 'bg-slate-900 text-white'}">
          ${isFirst ? '🔔 Tanggal 1: Rekap Otomatis Awal Bulan' : '⚙️ Kalkulasi Otomatis Total Bersih Pendapatan'}
        </span>
        <p class="text-xs mt-1.5">
          <strong>Bulan Lalu (${formatNamaBulan(prevYM)}):</strong>
          Pemasukan (${formatRupiah(prev.totalPemasukan)}) &minus; Pengeluaran (${formatRupiah(prev.totalPengeluaran)}) &minus; Modal Berjalan (${formatRupiah(prev.modalBerjalan)}) =
          <span class="font-bold underline">${formatRupiah(prev.totalBersihPendapatan)}</span>
        </p>
      </div>
      <div class="bg-white/90 px-4 py-2 rounded-lg border text-xs">
        <span class="text-slate-500 block">Total Bersih (${formatNamaBulan(state.selectedMonth)}):</span>
        <strong class="text-sm ${curr.totalBersihPendapatan >= 0 ? 'text-emerald-600' : 'text-rose-600'}">${formatRupiah(curr.totalBersihPendapatan)}</strong>
      </div>
    </div>`;
}

function renderDashboard() {
  ensureDataIds();
  if (!getEl('tbody-dashboard')) return;

  const dashTheadRow = document.querySelector('#table-dashboard thead tr');
  if (dashTheadRow && dashTheadRow.children.length === 7) {
    const th = document.createElement('th');
    th.className = 'w-28 text-center no-export';
    th.textContent = 'Aksi';
    dashTheadRow.appendChild(th);
  }

  const curr = calculateMonthlyMetrics(state.selectedMonth);
  const prevYM = getPreviousMonth(state.selectedMonth);
  const prev = calculateMonthlyMetrics(prevYM);
  const totalSeluruhModal = state.modals.reduce((a, m) => a + (Number(m.nominal) || 0), 0);

  const todayISO = new Date().toISOString().slice(0, 10);
  const todayTx = state.transactions.filter(t => t.tanggal === todayISO);
  const todayMasuk = todayTx.reduce((a, b) => a + (Number(b.pemasukanRp) || 0), 0);
  const todayKeluar = todayTx.reduce((a, b) => a + (Number(b.pengeluaranRp) || 0), 0);

  setText('statModalBerjalan', formatRupiah(curr.modalBerjalan));
  setText('statModalTotalAll', `Seluruh Modal: ${formatRupiah(totalSeluruhModal)}`);
  setText('statPemasukanBulanan', formatRupiah(curr.totalPemasukan));
  setText('statHariIniPemasukan', `Hari Ini: ${formatRupiah(todayMasuk)}`);
  setText('statPengeluaranBulanan', formatRupiah(curr.totalPengeluaran));
  setText('statHariIniPengeluaran', `Hari Ini: ${formatRupiah(todayKeluar)}`);

  const elBersih = getEl('statTotalBersihBulanan');
  if (elBersih) {
    elBersih.textContent = formatRupiah(curr.totalBersihPendapatan);
    elBersih.className = `text-2xl font-bold mt-2 ${curr.totalBersihPendapatan >= 0 ? 'text-emerald-400' : 'text-rose-400'}`;
  }

  const sortedTx = [...state.transactions]
    .filter(t => t.tanggal && t.tanggal.startsWith(state.selectedMonth))
    .sort((a, b) => a.tanggal.localeCompare(b.tanggal));

  const recentTx = sortedTx.slice(-3).reverse();
  setHtml('ringkasanHarianBox', recentTx.length
    ? recentTx.map(t => `<div class="p-2 rounded bg-slate-50 border flex justify-between items-center gap-2">
        <div class="min-w-0">
          <span class="font-semibold text-slate-800">${formatTanggalID(t.tanggal)}</span>
          <p class="text-[11px] text-slate-500 truncate max-w-[150px]">${t.pemasukanText || t.pengeluaranText || '-'}</p>
        </div>
        <div class="text-right shrink-0">
          <span class="text-emerald-600 font-semibold block">+${formatRupiah(t.pemasukanRp)}</span>
          <button type="button" onclick="editHarian('${t.id}')" class="text-[11px] text-blue-600 font-semibold hover:underline">✏️ Edit</button>
        </div>
      </div>`).join('')
    : '<p class="text-slate-400 italic">Belum ada transaksi bulan ini.</p>'
  );

  const weekly = getWeeklyAggregates(state.selectedMonth);
  setHtml('ringkasanMingguanBox', weekly.map(w => `
    <div class="flex justify-between items-center py-1 border-b last:border-none">
      <span class="font-medium text-slate-700">${w.label}</span>
      <span class="font-semibold ${w.net >= 0 ? 'text-emerald-600' : 'text-rose-600'}">${formatRupiah(w.net)}</span>
    </div>`).join(''));

  setHtml('ringkasanKalkulasiBox', `
    <div class="space-y-1.5">
      <div class="flex justify-between"><span>Bulan Lalu (${formatNamaBulan(prevYM)}):</span><strong>${formatRupiah(prev.totalBersihPendapatan)}</strong></div>
      <div class="flex justify-between"><span>Pemasukan:</span><strong class="text-emerald-600">${formatRupiah(curr.totalPemasukan)}</strong></div>
      <div class="flex justify-between"><span>Pengeluaran:</span><strong class="text-rose-600">${formatRupiah(curr.totalPengeluaran)}</strong></div>
      <div class="flex justify-between"><span>Modal Berjalan:</span><strong>${formatRupiah(curr.modalBerjalan)}</strong></div>
      <div class="border-t pt-1.5 flex justify-between font-bold">
        <span>Total Bersih:</span>
        <span class="${curr.totalBersihPendapatan >= 0 ? 'text-emerald-600' : 'text-rose-600'}">${formatRupiah(curr.totalBersihPendapatan)}</span>
      </div>
    </div>`);

  setText('judulTabelDashboard', `RINGKASAN LAPORAN - ${formatNamaBulan(state.selectedMonth).toUpperCase()}`);
  let runningTotal = 0, sumMasuk = 0, sumKeluar = 0;

  setHtml('tbody-dashboard', sortedTx.length === 0
    ? `<tr><td colspan="8" class="text-center text-slate-400 py-6">Belum ada data transaksi pada periode ini.</td></tr>`
    : sortedTx.map((t, i) => {
        const masuk = Number(t.pemasukanRp) || 0;
        const keluar = Number(t.pengeluaranRp) || 0;
        sumMasuk += masuk;
        sumKeluar += keluar;
        runningTotal += (masuk - keluar);
        return `<tr>
          <td class="text-right font-medium">${i + 1}</td>
          <td class="whitespace-nowrap">${formatTanggalID(t.tanggal)}</td>
          <td>${t.pemasukanText || '-'}</td>
          <td>${renderRpBreakdownCell(t.pemasukanItems, masuk, 'income')}</td>
          <td>${t.pengeluaranText || '-'}</td>
          <td>${renderRpBreakdownCell(t.pengeluaranItems, keluar, 'expense')}</td>
          <td class="font-bold ${runningTotal >= 0 ? 'text-emerald-700' : 'text-rose-700'} whitespace-nowrap">${formatRupiah(runningTotal)}</td>
          <td class="text-center whitespace-nowrap no-export">${renderActionButtons(t.id, 'harian')}</td>
        </tr>`;
      }).join('')
  );

  setHtml('tfoot-dashboard', buildStandardTableFooter(sumMasuk, sumKeluar, runningTotal, true));
}

function renderSheetModal() {
  ensureDataIds();
  if (!getEl('tbody-modal')) return;
  const sorted = [...state.modals].sort((a, b) => a.tanggal.localeCompare(b.tanggal));
  const totalAwal = sorted.filter(m => m.kategori === 'Modal Awal').reduce((a, b) => a + (Number(b.nominal) || 0), 0);
  const totalInv = sorted.filter(m => m.kategori === 'Tambahan Investasi').reduce((a, b) => a + (Number(b.nominal) || 0), 0);
  const totalBerjalan = sorted.filter(m => m.kategori === 'Modal Berjalan' && m.tanggal.startsWith(state.selectedMonth)).reduce((a, b) => a + (Number(b.nominal) || 0), 0);

  setText('cardModalAwal', formatRupiah(totalAwal));
  setText('cardModalInvestasi', formatRupiah(totalInv));
  setText('cardModalBerjalan', formatRupiah(totalBerjalan));

  let runningModal = 0, sumMasuk = 0, sumKeluar = 0;
  setHtml('tbody-modal', sorted.length === 0
    ? `<tr><td colspan="8" class="text-center text-slate-400 py-6">Belum ada data modal.</td></tr>`
    : sorted.map((m, idx) => {
        const isMasuk = m.kategori !== 'Modal Berjalan';
        const masukRp = isMasuk ? Number(m.nominal) || 0 : 0;
        const keluarRp = !isMasuk ? Number(m.nominal) || 0 : 0;
        sumMasuk += masukRp;
        sumKeluar += keluarRp;
        runningModal += (masukRp - keluarRp);
        return `<tr>
          <td class="text-right font-medium">${idx + 1}</td>
          <td class="whitespace-nowrap">${formatTanggalID(m.tanggal)}</td>
          <td>${isMasuk ? `<strong>[${m.kategori}]</strong> ${m.keterangan}` : '-'}</td>
          <td>${isMasuk ? renderRpBreakdownCell(m.items, masukRp, 'income') : '-'}</td>
          <td>${!isMasuk ? `<strong>[${m.kategori}]</strong> ${m.keterangan}` : '-'}</td>
          <td>${!isMasuk ? renderRpBreakdownCell(m.items, keluarRp, 'expense') : '-'}</td>
          <td class="font-bold ${runningModal >= 0 ? 'text-emerald-700' : 'text-rose-700'} whitespace-nowrap">${formatRupiah(runningModal)}</td>
          <td class="text-center whitespace-nowrap no-export">${renderActionButtons(m.id, 'modal')}</td>
        </tr>`;
      }).join('')
  );
  setHtml('tfoot-modal', buildStandardTableFooter(sumMasuk, sumKeluar, runningModal, true));
}

function renderLaporanHarian() {
  ensureDataIds();
  if (!getEl('tbody-harian')) return;
  const mode = getVal('filterTampilanHarian', 'bulan_aktif');
  let list = [...state.transactions];
  if (mode === 'bulan_aktif') list = list.filter(t => t.tanggal && t.tanggal.startsWith(state.selectedMonth));
  list.sort((a, b) => a.tanggal.localeCompare(b.tanggal));

  let runningBalance = 0, totalMasuk = 0, totalKeluar = 0;
  setHtml('tbody-harian', list.length === 0
    ? `<tr><td colspan="8" class="text-center text-slate-400 py-6">Belum ada transaksi harian.</td></tr>`
    : list.map((t, idx) => {
        const masuk = Number(t.pemasukanRp) || 0;
        const keluar = Number(t.pengeluaranRp) || 0;
        totalMasuk += masuk;
        totalKeluar += keluar;
        runningBalance += (masuk - keluar);
        return `<tr>
          <td class="text-right font-medium">${idx + 1}</td>
          <td class="whitespace-nowrap">${formatTanggalID(t.tanggal)}</td>
          <td>${t.pemasukanText || '-'}</td>
          <td>${renderRpBreakdownCell(t.pemasukanItems, masuk, 'income')}</td>
          <td>${t.pengeluaranText || '-'}</td>
          <td>${renderRpBreakdownCell(t.pengeluaranItems, keluar, 'expense')}</td>
          <td class="font-bold ${runningBalance >= 0 ? 'text-emerald-700' : 'text-rose-700'} whitespace-nowrap">${formatRupiah(runningBalance)}</td>
          <td class="text-center whitespace-nowrap no-export">${renderActionButtons(t.id, 'harian')}</td>
        </tr>`;
      }).join('')
  );
  setHtml('tfoot-harian', buildStandardTableFooter(totalMasuk, totalKeluar, runningBalance, true));
}

function renderLaporanMingguan() {
  ensureDataIds();
  if (!getEl('tbody-mingguan')) return;
  const mode = getVal('modeMingguan', 'rekap');
  const buckets = getWeeklyAggregates(state.selectedMonth);
  let runningTotal = 0, sumMasuk = 0, sumKeluar = 0;

  if (mode === 'rekap') {
    setHtml('tbody-mingguan', buckets.map((b, idx) => {
      sumMasuk += b.pemasukanRp;
      sumKeluar += b.pengeluaranRp;
      runningTotal += b.net;
      const actionHtml = b.items.length === 0
        ? `<span class="text-xs text-slate-400">0 Transaksi</span>`
        : `<div class="flex flex-col gap-1 items-center">
            ${b.items.map(tx => `
              <button type="button" onclick="editHarian('${tx.id}')" class="w-full px-2 py-1 rounded text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-600 hover:text-white transition">
                ✏️ Edit (${formatTanggalID(tx.tanggal).slice(0, 5)})
              </button>
            `).join('')}
          </div>`;
      return `<tr>
        <td class="text-right font-medium">${idx + 1}</td>
        <td class="font-semibold whitespace-nowrap">${b.label}</td>
        <td>${b.pemasukanList}</td>
        <td>${renderRpBreakdownCell(b.combinedIncomeItems, b.pemasukanRp, 'income')}</td>
        <td>${b.pengeluaranList}</td>
        <td>${renderRpBreakdownCell(b.combinedExpenseItems, b.pengeluaranRp, 'expense')}</td>
        <td class="font-bold ${runningTotal >= 0 ? 'text-emerald-700' : 'text-rose-700'} whitespace-nowrap">${formatRupiah(runningTotal)}</td>
        <td class="text-center no-export">${actionHtml}</td>
      </tr>`;
    }).join(''));
  } else {
    let rowNo = 1;
    const rows = [];
    buckets.forEach(b => {
      b.items.forEach(t => {
        const masuk = Number(t.pemasukanRp) || 0;
        const keluar = Number(t.pengeluaranRp) || 0;
        sumMasuk += masuk;
        sumKeluar += keluar;
        runningTotal += (masuk - keluar);
        rows.push(`<tr>
          <td class="text-right font-medium">${rowNo++}</td>
          <td class="whitespace-nowrap"><span class="text-[11px] text-slate-500 block">Minggu ${b.week}</span>${formatTanggalID(t.tanggal)}</td>
          <td>${t.pemasukanText || '-'}</td>
          <td>${renderRpBreakdownCell(t.pemasukanItems, masuk, 'income')}</td>
          <td>${t.pengeluaranText || '-'}</td>
          <td>${renderRpBreakdownCell(t.pengeluaranItems, keluar, 'expense')}</td>
          <td class="font-bold ${runningTotal >= 0 ? 'text-emerald-700' : 'text-rose-700'} whitespace-nowrap">${formatRupiah(runningTotal)}</td>
          <td class="text-center whitespace-nowrap no-export">${renderActionButtons(t.id, 'harian')}</td>
        </tr>`);
      });
    });
    setHtml('tbody-mingguan', rows.length ? rows.join('') : `<tr><td colspan="8" class="text-center text-slate-400 py-6">Belum ada transaksi.</td></tr>`);
  }
  setHtml('tfoot-mingguan', buildStandardTableFooter(sumMasuk, sumKeluar, runningTotal, true));
}

function renderLaporanBulanan() {
  ensureDataIds();
  if (!getEl('tbody-bulanan')) return;
  const m = calculateMonthlyMetrics(state.selectedMonth);
  setText('bulananCardMasuk', formatRupiah(m.totalPemasukan));
  setText('bulananCardKeluar', formatRupiah(m.totalPengeluaran));
  setText('bulananCardModal', formatRupiah(m.modalBerjalan));
  setText('bulananCardBersih', formatRupiah(m.totalBersihPendapatan));

  const mode = getVal('modeBulanan', 'detail_bulan_ini');
  let runningTotal = 0, sumMasuk = 0, sumKeluar = 0;

  if (mode === 'detail_bulan_ini') {
    const txRows = state.transactions.filter(t => t.tanggal && t.tanggal.startsWith(state.selectedMonth)).map(t => ({
      id: t.id, source: 'harian', tanggal: t.tanggal, pemasukanItems: t.pemasukanItems || [], pemasukanText: t.pemasukanText || '-', pemasukanRp: Number(t.pemasukanRp) || 0, pengeluaranItems: t.pengeluaranItems || [], pengeluaranText: t.pengeluaranText || '-', pengeluaranRp: Number(t.pengeluaranRp) || 0
    }));
    const modalRows = state.modals.filter(x => x.tanggal && x.tanggal.startsWith(state.selectedMonth) && x.kategori === 'Modal Berjalan').map(x => ({
      id: x.id, source: 'modal', tanggal: x.tanggal, pemasukanItems: [], pemasukanText: '-', pemasukanRp: 0, pengeluaranItems: x.items || [], pengeluaranText: `[Modal Berjalan] ${x.keterangan}`, pengeluaranRp: Number(x.nominal) || 0
    }));

    const combined = [...txRows, ...modalRows].sort((a, b) => a.tanggal.localeCompare(b.tanggal));
    setHtml('tbody-bulanan', combined.length === 0
      ? `<tr><td colspan="8" class="text-center text-slate-400 py-6">Belum ada data pada bulan ini.</td></tr>`
      : combined.map((r, idx) => {
          sumMasuk += r.pemasukanRp;
          sumKeluar += r.pengeluaranRp;
          runningTotal += (r.pemasukanRp - r.pengeluaranRp);
          return `<tr>
            <td class="text-right font-medium">${idx + 1}</td>
            <td class="whitespace-nowrap">${formatTanggalID(r.tanggal)}</td>
            <td>${r.pemasukanText}</td>
            <td>${renderRpBreakdownCell(r.pemasukanItems, r.pemasukanRp, 'income')}</td>
            <td>${r.pengeluaranText}</td>
            <td>${renderRpBreakdownCell(r.pengeluaranItems, r.pengeluaranRp, 'expense')}</td>
            <td class="font-bold ${runningTotal >= 0 ? 'text-emerald-700' : 'text-rose-700'} whitespace-nowrap">${formatRupiah(runningTotal)}</td>
            <td class="text-center whitespace-nowrap no-export">
              ${renderActionButtons(r.id, r.source === 'harian' ? 'harian' : 'modal')}
            </td>
          </tr>`;
        }).join('')
    );
  } else {
    const months = Array.from(new Set([...state.transactions.map(t => t.tanggal?.slice(0, 7)), ...state.modals.map(x => x.tanggal?.slice(0, 7))].filter(Boolean))).sort();
    setHtml('tbody-bulanan', months.map((ym, idx) => {
      const mt = calculateMonthlyMetrics(ym);
      const keluarTotal = mt.totalPengeluaran + mt.modalBerjalan;
      sumMasuk += mt.totalPemasukan;
      sumKeluar += keluarTotal;
      runningTotal += mt.totalBersihPendapatan;
      return `<tr>
        <td class="text-right font-medium">${idx + 1}</td>
        <td class="font-semibold whitespace-nowrap">${formatNamaBulan(ym)}</td>
        <td>Total Pemasukan (${mt.jumlahTransaksi} Transaksi)</td>
        <td>${renderRpBreakdownCell([{ nama: 'Pemasukan Bulanan', qty: 1, harga: mt.totalPemasukan }], mt.totalPemasukan, 'income')}</td>
        <td>Pengeluaran Harian & Modal Berjalan</td>
        <td>${renderRpBreakdownCell([{ nama: 'Pengeluaran Harian', qty: 1, harga: mt.totalPengeluaran }, { nama: 'Modal Berjalan', qty: 1, harga: mt.modalBerjalan }], keluarTotal, 'expense')}</td>
        <td class="font-bold ${runningTotal >= 0 ? 'text-emerald-700' : 'text-rose-700'} whitespace-nowrap">${formatRupiah(runningTotal)}</td>
        <td class="text-center no-export">
          <button type="button" onclick="pilihBulan('${ym}')" class="px-2.5 py-1 rounded-md text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-600 hover:text-white transition">
            🔍 Lihat & Edit
          </button>
        </td>
      </tr>`;
    }).join(''));
  }
  setHtml('tfoot-bulanan', buildStandardTableFooter(sumMasuk, sumKeluar, runningTotal, true));
}

function renderAll() {
  if (typeof renderCurrentPage === 'function') renderCurrentPage();
}