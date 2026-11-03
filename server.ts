import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
export interface TransactionItem {
  nama: string;
  qty: number;
  satuan?: string;
  harga: number;
}

export interface Transaction {
  id: string;
  tanggal: string;
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
  tanggal: string;
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

function mergeStates(serverState: AppState, clientState: AppState): AppState {
  if (!serverState || !serverState.transactions) return clientState;
  if (!clientState || !clientState.transactions) return serverState;

  const txMap = new Map<string, Transaction>();
  (serverState.transactions || []).forEach(t => txMap.set(t.id, t));
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

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

// Persistent database storage directory
const DATA_DIR = path.resolve(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

// Ensure data folder exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial seed data for Ayam Geprek KING SALMAN
function getDefaultSeedState(): AppState {
  const now = new Date();
  const currentYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const d = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const prevYM = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

  return {
    selectedMonth: currentYM,
    updatedAt: Date.now(),
    version: 1,
    transactions: [
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
    ],
    modals: [
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
    ]
  };
}

// In-memory cache synced with disk
let currentState: AppState;

function loadStateFromDisk(): AppState {
  try {
    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      if (parsed && (Array.isArray(parsed.transactions) || Array.isArray(parsed.modals))) {
        return {
          selectedMonth: parsed.selectedMonth || '',
          updatedAt: Number(parsed.updatedAt) || Date.now(),
          version: Number(parsed.version) || 1,
          transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
          modals: Array.isArray(parsed.modals) ? parsed.modals : []
        };
      }
    }
  } catch (err) {
    console.error('Error reading database file:', err);
  }
  const defaultState = getDefaultSeedState();
  saveStateToDisk(defaultState);
  return defaultState;
}

function saveStateToDisk(state: AppState) {
  try {
    // Safety: keep rolling backup whenever database contains records
    if ((state.transactions && state.transactions.length > 0) || (state.modals && state.modals.length > 0)) {
      if (fs.existsSync(DB_FILE)) {
        try {
          fs.copyFileSync(DB_FILE, path.join(DATA_DIR, 'database.bak.json'));
        } catch (e) {}
      }
    }
    fs.writeFileSync(DB_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing database file:', err);
  }
}

currentState = loadStateFromDisk();

// Middleware
app.use(express.json({ limit: '15mb' }));

// CORS headers for multi-device cross-origin support
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  if (req.method === 'OPTIONS') {
    return res.sendStatus(200);
  }
  next();
});

// SSE connected clients
const sseClients = new Set<express.Response>();

function broadcastState(state: AppState, sourceClient?: string) {
  const payload = JSON.stringify({
    type: 'sync',
    data: state,
    sourceClient: sourceClient || null,
    clientCount: sseClients.size,
    timestamp: Date.now()
  });

  for (const client of sseClients) {
    try {
      client.write(`data: ${payload}\n\n`);
    } catch {
      sseClients.delete(client);
    }
  }
}

// REST API ROUTES
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    appName: 'Ayam Geprek KING SALMAN - Cloud Online',
    devicesConnected: sseClients.size,
    updatedAt: currentState.updatedAt,
    transactionCount: currentState.transactions.length,
    modalCount: currentState.modals.length,
    time: new Date().toISOString()
  });
});

// Get current state
app.get('/api/state', (req, res) => {
  res.json({
    ...currentState,
    devicesConnected: sseClients.size,
    serverTime: Date.now()
  });
});

// Save or update state safely
app.post('/api/state', (req, res) => {
  const body = req.body;
  if (!body) {
    return res.status(400).json({ error: 'Body tidak boleh kosong' });
  }

  const incomingTransactions = Array.isArray(body.transactions) ? body.transactions : [];
  const incomingModals = Array.isArray(body.modals) ? body.modals : [];
  const incomingTime = Number(body.updatedAt) || Date.now();
  const sourceClient = typeof body.clientId === 'string' ? body.clientId : undefined;

  // Anti-Data Loss Protection:
  // If incoming payload has 0 items but server already has data, perform safe merge
  // to prevent accidental wipe from a freshly-opened uninitialized client!
  if (incomingTransactions.length === 0 && currentState.transactions.length > 0 && !body.forceReset) {
    currentState = mergeStates(currentState, {
      selectedMonth: body.selectedMonth,
      updatedAt: incomingTime,
      transactions: incomingTransactions,
      modals: incomingModals
    });
  } else {
    currentState = {
      selectedMonth: body.selectedMonth || currentState.selectedMonth,
      updatedAt: Math.max(incomingTime, Date.now()),
      version: (currentState.version || 1) + 1,
      transactions: incomingTransactions,
      modals: incomingModals
    };
  }

  saveStateToDisk(currentState);
  broadcastState(currentState, sourceClient);

  res.json({
    success: true,
    message: 'Data berhasil disimpan dan disinkronkan ke seluruh perangkat',
    state: currentState
  });
});

// Smart Merge: Merges existing data from local device with server data
app.post('/api/sync-merge', (req, res) => {
  const body = req.body;
  const clientState: AppState = {
    selectedMonth: body?.selectedMonth,
    updatedAt: Number(body?.updatedAt) || Date.now(),
    version: Number(body?.version) || 1,
    transactions: Array.isArray(body?.transactions) ? body.transactions : [],
    modals: Array.isArray(body?.modals) ? body.modals : []
  };

  const sourceClient = typeof body?.clientId === 'string' ? body.clientId : undefined;

  // Merge client records with server records
  currentState = mergeStates(currentState, clientState);
  saveStateToDisk(currentState);
  broadcastState(currentState, sourceClient);

  res.json({
    success: true,
    message: 'Data lokal berhasil digabungkan dengan server online',
    state: currentState
  });
});

// Real-Time Server-Sent Events (SSE)
app.get('/api/stream', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  sseClients.add(res);

  // Send initial connection event
  const initMsg = JSON.stringify({
    type: 'init',
    data: currentState,
    clientCount: sseClients.size,
    timestamp: Date.now()
  });
  res.write(`data: ${initMsg}\n\n`);

  // Periodic heartbeat to keep mobile connection alive
  const heartbeat = setInterval(() => {
    try {
      res.write(`data: ${JSON.stringify({ type: 'ping', time: Date.now() })}\n\n`);
    } catch {
      clearInterval(heartbeat);
      sseClients.delete(res);
    }
  }, 15000);

  req.on('close', () => {
    clearInterval(heartbeat);
    sseClients.delete(res);
  });
});

// Reset to sample initial data
app.post('/api/reset', (req, res) => {
  currentState = getDefaultSeedState();
  saveStateToDisk(currentState);
  broadcastState(currentState);
  res.json({
    success: true,
    message: 'Data contoh berhasil dimuat ulang dan disinkronkan',
    state: currentState
  });
});

// Start dev server with Vite middleware
async function startServer() {
  const isDev = process.env.NODE_ENV !== 'production';

  if (isDev) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server Ayam Geprek KING SALMAN berjalan di port ${PORT}`);
    console.log(`Cloud online & multi-device sync aktif di http://localhost:${PORT}`);
  });
}

startServer();
