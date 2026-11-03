// =========================================================
// ONLINE CLOUD STORAGE & MULTI-DEVICE REAL-TIME SYNC (cloud.js)
// Ayam Geprek KING SALMAN - Sistem Kas & Keuangan Terpusat
// =========================================================

// Generate or retrieve persistent client session ID
var clientInstanceId = (function() {
  var id = sessionStorage.getItem('SIKEU_CLIENT_ID');
  if (!id) {
    id = 'DEV-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    sessionStorage.setItem('SIKEU_CLIENT_ID', id);
  }
  return id;
})();

var isUploading = false;
var isSyncing = false;
var activeDevicesCount = 1;
var sseConnection = null;
var lastSyncedTime = null;
var syncErrorCount = 0;

// Base API endpoints
var API_BASE_URL = window.API_BASE_URL || '';
var API_STATE_URL = API_BASE_URL + '/api/state';
var API_MERGE_URL = API_BASE_URL + '/api/sync-merge';
var API_STREAM_URL = API_BASE_URL + '/api/stream';
var API_RESET_URL = API_BASE_URL + '/api/reset';

/**
 * Update UI Sync Status Badges on Header and Footer
 */
function setSyncStatus(text, statusType) {
  // statusType: 'online' | 'syncing' | 'offline' | 'saved'
  if (typeof setText === 'function') {
    setText('statusPenyimpanan', text);
  }

  const badge = document.getElementById('liveCloudBadge');
  if (badge) {
    badge.textContent = text;
    badge.style.cursor = 'pointer';
    badge.title = 'Klik untuk melihat rincian koneksi & sinkronisasi semua perangkat';
    badge.onclick = showCloudSyncModal;

    if (statusType === 'syncing') {
      badge.className = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-sky-500/20 text-sky-300 border border-sky-500/40 animate-pulse';
    } else if (statusType === 'offline') {
      badge.className = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-amber-500/20 text-amber-300 border border-amber-500/40';
    } else {
      // online / saved
      badge.className = 'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 hover:bg-emerald-500/30 transition shadow-sm';
    }
  }
}

/**
 * Format timestamp into Indonesian locale time
 */
function getFormattedTime(dateObj) {
  var d = dateObj || new Date();
  return d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

/**
 * Package current state for cloud transmission
 */
function packStateForCloud() {
  return {
    clientId: clientInstanceId,
    selectedMonth: state.selectedMonth || '',
    updatedAt: state.updatedAt || Date.now(),
    transactions: Array.isArray(state.transactions) ? state.transactions : [],
    modals: Array.isArray(state.modals) ? state.modals : []
  };
}

/**
 * Auto-detect and migrate any existing data previously stored
 * in this browser's localStorage to the online cloud server.
 */
async function checkAndMigrateExistingLocalData() {
  try {
    var possibleKeys = [
      window.STORAGE_KEY_STATE || 'SIKEU_FULL_STATE_V19',
      'SIKEU_FULL_STATE',
      'SIKEU_FULL_STATE_V18',
      'SIKEU_FULL_STATE_V20',
      'Ayam_Geprek_State'
    ];

    var localPayload = null;
    for (var i = 0; i < possibleKeys.length; i++) {
      var raw = localStorage.getItem(possibleKeys[i]);
      if (raw) {
        try {
          var parsed = JSON.parse(raw);
          if (parsed && (Array.isArray(parsed.transactions) && parsed.transactions.length > 0 ||
                         Array.isArray(parsed.modals) && parsed.modals.length > 0)) {
            localPayload = parsed;
            break;
          }
        } catch (e) {}
      }
    }

    if (localPayload) {
      console.log('🔄 Data lokal lama terdeteksi, mengirimkan ke server online untuk digabungkan...');
      setSyncStatus('🔄 Menyinkronkan data lokal ke cloud...', 'syncing');
      
      const res = await fetch(API_MERGE_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId: clientInstanceId,
          updatedAt: localPayload.updatedAt || Date.now(),
          transactions: localPayload.transactions || [],
          modals: localPayload.modals || []
        })
      });

      if (res.ok) {
        const json = await res.json();
        if (json && json.state) {
          applyServerState(json.state, true);
          setSyncStatus('🌐 Data Terhubung & Tersinkron (' + getFormattedTime() + ')', 'online');
          console.log('✅ Data lokal berhasil dimigrasikan ke online!');
          return true;
        }
      }
    }
  } catch (err) {
    console.warn('Migrasi data lokal dilewati:', err);
  }
  return false;
}

/**
 * Apply state received from server to the local app
 */
function applyServerState(remoteData, forceRender) {
  if (!remoteData) return false;

  var remoteTime = Number(remoteData.updatedAt) || 0;
  var currentLocalTime = Number(state.updatedAt) || 0;

  var hasNewer = remoteTime > currentLocalTime || forceRender;
  var hasDifferentCounts = (
    (remoteData.transactions || []).length !== (state.transactions || []).length ||
    (remoteData.modals || []).length !== (state.modals || []).length
  );

  if (hasNewer || hasDifferentCounts || forceRender) {
    state.updatedAt = remoteTime || Date.now();
    state.transactions = Array.isArray(remoteData.transactions) ? remoteData.transactions : [];
    state.modals = Array.isArray(remoteData.modals) ? remoteData.modals : [];
    
    // Save to local storage as instant cache
    try {
      localStorage.setItem(window.STORAGE_KEY_STATE || 'SIKEU_FULL_STATE_V19', JSON.stringify({
        updatedAt: state.updatedAt,
        transactions: state.transactions,
        modals: state.modals
      }));
    } catch (e) {}

    if (typeof renderCurrentPage === 'function') {
      renderCurrentPage();
    }
    return true;
  }
  return false;
}

/**
 * Fetch state from the centralized cloud server
 */
async function fetchFromCloudServer(silent) {
  if (isSyncing) return false;
  isSyncing = true;
  if (!silent) setSyncStatus('🔄 Menyinkronkan...', 'syncing');

  try {
    var res = await fetch(API_STATE_URL, {
      method: 'GET',
      headers: { 'Accept': 'application/json' },
      cache: 'no-store'
    });

    if (res.ok) {
      var data = await res.json();
      if (typeof data.devicesConnected === 'number') {
        activeDevicesCount = Math.max(1, data.devicesConnected);
      }
      applyServerState(data, false);
      syncErrorCount = 0;
      lastSyncedTime = new Date();
      var devText = activeDevicesCount > 1 ? ` (${activeDevicesCount} Perangkat)` : '';
      setSyncStatus(`🟢 Online${devText} • ${getFormattedTime(lastSyncedTime)}`, 'online');
      isSyncing = false;
      return true;
    } else {
      throw new Error('HTTP ' + res.status);
    }
  } catch (e) {
    syncErrorCount++;
    if (syncErrorCount > 2) {
      setSyncStatus('⚠️ Mode Offline (Tersimpan Lokal)', 'offline');
    }
  }
  isSyncing = false;
  return false;
}

/**
 * Upload state to the cloud server and broadcast to all connected devices
 */
async function uploadToCloudServer() {
  if (isUploading) return;
  isUploading = true;
  setSyncStatus('🟡 Menyimpan ke Cloud Online...', 'syncing');

  state.updatedAt = Date.now();
  var payload = packStateForCloud();

  // Save to local cache first
  try {
    localStorage.setItem(window.STORAGE_KEY_STATE || 'SIKEU_FULL_STATE_V19', JSON.stringify({
      updatedAt: state.updatedAt,
      transactions: state.transactions,
      modals: state.modals
    }));
  } catch (e) {}

  try {
    var res = await fetch(API_STATE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (res.ok) {
      var resJson = await res.json();
      lastSyncedTime = new Date();
      var devText = activeDevicesCount > 1 ? ` (${activeDevicesCount} Perangkat)` : '';
      setSyncStatus(`🌐 Tersimpan Online${devText} • ${getFormattedTime(lastSyncedTime)}`, 'saved');
      syncErrorCount = 0;
    } else {
      throw new Error('Gagal simpan ke server: ' + res.status);
    }
  } catch (e) {
    console.warn('Gagal upload ke cloud, tersimpan secara lokal:', e);
    setSyncStatus('⚠️ Tersimpan Lokal (Akan sinkron saat online)', 'offline');
  }
  isUploading = false;
}

/**
 * Force manual cloud synchronization
 */
async function forceCloudSync() {
  setSyncStatus('🔄 Memuat ulang data dari Cloud Online...', 'syncing');
  var success = await fetchFromCloudServer(false);
  if (success) {
    showToastNotification('✅ Sinkronisasi online berhasil!', 'emerald');
  } else {
    showToastNotification('⚠️ Server tidak merespon, menggunakan cache lokal.', 'amber');
  }
}

/**
 * Primary save routine called after creating/updating/deleting transactions
 */
function saveToStorage() {
  state.updatedAt = Date.now();
  try {
    localStorage.setItem(window.STORAGE_KEY_STATE || 'SIKEU_FULL_STATE_V19', JSON.stringify({
      updatedAt: state.updatedAt,
      transactions: state.transactions,
      modals: state.modals
    }));
  } catch (e) {}
  uploadToCloudServer();
}

/**
 * Setup Server-Sent Events (SSE) for zero-latency multi-device updates
 */
function initRealtimeStream() {
  if (typeof EventSource === 'undefined') {
    console.log('EventSource tidak didukung browser ini, beralih ke smart polling');
    return;
  }

  try {
    if (sseConnection) {
      sseConnection.close();
    }

    sseConnection = new EventSource(API_STREAM_URL);

    sseConnection.onmessage = function(event) {
      try {
        var msg = JSON.parse(event.data);
        if (msg.type === 'init' || msg.type === 'sync') {
          if (typeof msg.clientCount === 'number') {
            activeDevicesCount = Math.max(1, msg.clientCount);
          }
          // Only apply if the message didn't originate from this exact tab/client
          if (msg.sourceClient !== clientInstanceId) {
            var changed = applyServerState(msg.data, false);
            if (changed) {
              lastSyncedTime = new Date();
              var devText = activeDevicesCount > 1 ? ` (${activeDevicesCount} Perangkat)` : '';
              setSyncStatus(`🟢 Terhubung Real-Time${devText}`, 'online');
              showToastNotification('🔔 Data baru diterima dari perangkat lain!', 'emerald');
            }
          }
        }
      } catch (err) {
        console.warn('Gagal memproses pesan real-time:', err);
      }
    };

    sseConnection.onerror = function() {
      // Browser will automatically retry connecting EventSource
      if (sseConnection.readyState === EventSource.CLOSED) {
        setSyncStatus('⚠️ Menghubungkan ulang cloud...', 'offline');
      }
    };
  } catch (e) {
    console.warn('Gagal inisialisasi EventSource:', e);
  }
}

/**
 * Export JSON Backup
 */
function exportDataFile() {
  var data = {
    appName: 'Ayam Geprek KING SALMAN',
    updatedAt: state.updatedAt || Date.now(),
    transactions: state.transactions || [],
    modals: state.modals || [],
    exportDate: new Date().toISOString()
  };
  var blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = `Ayam_Geprek_King_Salman_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToastNotification('📥 File backup berhasil diunduh!', 'emerald');
}

/**
 * Import JSON Restore and push to cloud
 */
function importDataFile(event) {
  var file = event.target.files && event.target.files[0];
  if (!file) return;

  var reader = new FileReader();
  reader.onload = async function(e) {
    try {
      var parsed = JSON.parse(e.target.result);
      if (parsed && (Array.isArray(parsed.transactions) || Array.isArray(parsed.modals))) {
        state.transactions = Array.isArray(parsed.transactions) ? parsed.transactions : [];
        state.modals = Array.isArray(parsed.modals) ? parsed.modals : [];
        saveToStorage();
        if (typeof renderCurrentPage === 'function') renderCurrentPage();
        showToastNotification('✅ Data berhasil dimuat dan disinkronkan ke Cloud Online!', 'emerald');
      } else {
        showToastNotification('❌ Format file JSON tidak valid.', 'rose');
      }
    } catch (err) {
      showToastNotification('❌ Gagal membaca file JSON.', 'rose');
    }
    event.target.value = '';
  };
  reader.readAsText(file);
}

/**
 * Visual Toast Notification helper
 */
function showToastNotification(message, color) {
  var toastId = 'appSyncToast';
  var existing = document.getElementById(toastId);
  if (existing) existing.remove();

  var bgColor = color === 'emerald' ? 'bg-emerald-700' : color === 'amber' ? 'bg-amber-600' : 'bg-slate-900';
  var div = document.createElement('div');
  div.id = toastId;
  div.className = `fixed bottom-5 right-5 z-50 flex items-center gap-2 px-4 py-3 rounded-xl text-white text-xs font-semibold shadow-2xl transition-all duration-300 transform translate-y-2 opacity-0 ${bgColor}`;
  div.innerHTML = message;
  document.body.appendChild(div);

  requestAnimationFrame(() => {
    div.classList.remove('translate-y-2', 'opacity-0');
  });

  setTimeout(() => {
    div.classList.add('translate-y-2', 'opacity-0');
    setTimeout(() => div.remove(), 350);
  }, 3500);
}
window.showToastNotification = showToastNotification;

/**
 * Cloud Sync Information & Multi-Device Access Modal
 */
function showCloudSyncModal() {
  var modalId = 'modalCloudDetails';
  var existing = document.getElementById(modalId);
  if (existing) existing.remove();

  var currentUrl = window.location.origin + window.location.pathname;
  var txCount = (state.transactions || []).length;
  var modalCount = (state.modals || []).length;
  var lastSyncStr = lastSyncedTime ? getFormattedTime(lastSyncedTime) : 'Baru saja';

  var modalHtml = `
    <div id="${modalId}" class="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
      <div class="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
        <div class="bg-slate-900 text-white p-5 flex items-center justify-between">
          <div class="flex items-center gap-2.5">
            <span class="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-500 text-slate-950 font-bold text-sm shadow">Rp</span>
            <div>
              <h3 class="font-bold text-sm">Status Sinkronisasi Cloud Online</h3>
              <p class="text-[11px] text-slate-400">Ayam Geprek KING SALMAN - Semua Perangkat</p>
            </div>
          </div>
          <button type="button" onclick="document.getElementById('${modalId}').remove()" class="text-slate-400 hover:text-white text-lg font-bold px-2 py-1">&times;</button>
        </div>
        <div class="p-6 space-y-4">
          <div class="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
            <div class="w-3 h-3 rounded-full bg-emerald-500 animate-ping"></div>
            <div>
              <div class="text-xs font-bold text-emerald-900">Server Cloud Real-Time Aktif</div>
              <div class="text-[11px] text-emerald-700">Data otomatis tersimpan dan tampil di semua HP, tablet, dan komputer.</div>
            </div>
          </div>

          <div class="grid grid-cols-2 gap-3 text-xs">
            <div class="bg-slate-50 border rounded-xl p-3">
              <span class="text-slate-500 block text-[11px]">Perangkat Terhubung</span>
              <span class="text-base font-bold text-slate-800">${activeDevicesCount} Perangkat</span>
            </div>
            <div class="bg-slate-50 border rounded-xl p-3">
              <span class="text-slate-500 block text-[11px]">Terakhir Sinkron</span>
              <span class="text-base font-bold text-slate-800">${lastSyncStr}</span>
            </div>
            <div class="bg-slate-50 border rounded-xl p-3">
              <span class="text-slate-500 block text-[11px]">Total Transaksi Online</span>
              <span class="text-base font-bold text-emerald-600">${txCount} Data</span>
            </div>
            <div class="bg-slate-50 border rounded-xl p-3">
              <span class="text-slate-500 block text-[11px]">Total Sheet Modal</span>
              <span class="text-base font-bold text-indigo-600">${modalCount} Data</span>
            </div>
          </div>

          <div class="border-t pt-4">
            <label class="block text-xs font-bold text-slate-700 mb-1">🔗 Buka di HP / Perangkat Lain:</label>
            <div class="flex items-center gap-2">
              <input type="text" readonly value="${currentUrl}" id="shareableAppUrlInput" class="w-full text-xs font-mono bg-slate-100 border rounded-lg px-3 py-2 text-slate-700 select-all" />
              <button type="button" onclick="copyAppUrlToClipboard()" class="bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold px-3 py-2 rounded-lg whitespace-nowrap">Salin</button>
            </div>
            <p class="text-[11px] text-slate-500 mt-1.5">Buka link ini di browser HP atau perangkat lain untuk melihat data yang sama secara langsung.</p>
          </div>

          <div class="flex flex-wrap gap-2 pt-2">
            <button type="button" onclick="forceCloudSync(); document.getElementById('${modalId}').remove();" class="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold py-2.5 rounded-lg text-center transition">🔄 Sinkronkan Sekarang</button>
            <button type="button" onclick="exportDataFile();" class="bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold px-4 py-2.5 rounded-lg border transition">📥 Backup JSON</button>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', modalHtml);
}

function copyAppUrlToClipboard() {
  var input = document.getElementById('shareableAppUrlInput');
  if (input) {
    input.select();
    navigator.clipboard.writeText(input.value).then(function() {
      showToastNotification('📋 Link berhasil disalin! Silakan buka di HP Anda.', 'emerald');
    }).catch(function() {
      showToastNotification('📋 Link disorot, tekan Salin manual.', 'amber');
    });
  }
}

// Background polling every 4 seconds as resilient backup to SSE
setInterval(function() {
  if (!isUploading && !isSyncing && navigator.onLine) {
    fetchFromCloudServer(true);
  }
}, 4000);

// Window lifecycle listeners for reliable syncing
window.addEventListener('online', function() {
  setSyncStatus('🟢 Koneksi kembali online', 'online');
  fetchFromCloudServer(false);
  initRealtimeStream();
});

window.addEventListener('offline', function() {
  setSyncStatus('⚠️ Mode Offline (Tersimpan Lokal)', 'offline');
});

window.addEventListener('focus', function() {
  if (navigator.onLine) {
    fetchFromCloudServer(true);
  }
});