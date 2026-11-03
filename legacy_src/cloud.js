// =========================================================
// 2. ONLINE CLOUD STORAGE & SYNC (cloud.js)
// =========================================================
var isUploading = false;
var clientInstanceId = 'CLIENT-' + Math.random().toString(36).substring(2, 9);

function setSyncStatus(text, isOnline = true) {
  if (typeof setText === 'function') setText('statusPenyimpanan', text);
  const badge = document.getElementById('liveCloudBadge');
  if (badge) {
    badge.textContent = text;
    badge.className = isOnline
      ? 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
      : 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40';
  }
}

function packStateForCloud() {
  return {
    v: 20,
    c: clientInstanceId,
    u: state.updatedAt || Date.now(),
    transactions: state.transactions || [],
    modals: state.modals || []
  };
}

async function fetchFromCloudServer() {
  setSyncStatus('🌐 Menghubungkan Cloud Online...', true);
  try {
    const res = await fetch(window.KVDB_BASE_URL, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (data && (Array.isArray(data.transactions) || Array.isArray(data.modals))) {
        const remoteTime = Number(data.updatedAt) || 0;
        
        // Selalu ambil data online terbaru
        state.updatedAt = remoteTime;
        state.transactions = Array.isArray(data.transactions) ? data.transactions : [];
        state.modals = Array.isArray(data.modals) ? data.modals : [];

        if (typeof renderCurrentPage === 'function') renderCurrentPage();
        setSyncStatus('🌐 Online (Terhubung ke Server Bersama)', true);
        return true;
      }
    }
  } catch (e) {
    setSyncStatus('⚠️ Gagal terhubung ke Cloud Online', false);
  }
  return false;
}

async function uploadToCloudServer() {
  if (isUploading) return;
  isUploading = true;
  setSyncStatus('🟡 Menyimpan ke Cloud Online...', true);

  state.updatedAt = Date.now();
  const payload = packStateForCloud();

  try {
    const res = await fetch(window.KVDB_BASE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      setSyncStatus('🌐 Tersimpan Online & Sinkron (' + new Date().toLocaleTimeString('id-ID') + ')', true);
    } else {
      throw new Error();
    }
  } catch (e) {
    setSyncStatus('⚠️ Gagal Menyimpan ke Online', false);
  }
  isUploading = false;
}

async function forceCloudSync() {
  setSyncStatus('🔄 Memuat ulang data dari Cloud Online...', true);
  await fetchFromCloudServer();
}

function saveToStorage() {
  uploadToCloudServer();
}

function exportDataFile() {
  const data = {
    updatedAt: state.updatedAt || Date.now(),
    transactions: state.transactions,
    modals: state.modals,
    exportDate: new Date().toISOString()
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `Ayam_Geprek_King_Salman_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

function importDataFile(event) {
  const file = event.target.files[0];
  if (!file) return;
  const reader = new FileReader();
  reader.onload = function(e) {
    try {
      const parsed = JSON.parse(e.target.result);
      if (parsed && (Array.isArray(parsed.transactions) || Array.isArray(parsed.modals))) {
        state.transactions = Array.isArray(parsed.transactions) ? parsed.transactions : [];
        state.modals = Array.isArray(parsed.modals) ? parsed.modals : [];
        saveToStorage();
        if (typeof renderCurrentPage === 'function') renderCurrentPage();
        alert('✅ Data berhasil dimuat dan langsung disimpan ke Cloud Online!');
      } else {
        alert('❌ Format file tidak valid.');
      }
    } catch (err) {
      alert('❌ Gagal membaca file JSON.');
    }
    event.target.value = '';
  };
  reader.readAsText(file);
}

// Sinkronisasi otomatis setiap 3 detik agar perangkat lain langsung mendeteksi perubahan
setInterval(() => {
  if (!isUploading) fetchFromCloudServer();
}, 3000);