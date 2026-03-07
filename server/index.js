const express  = require('express');
const cors     = require('cors');
const path     = require('path');
const fs       = require('fs');
const { spawn } = require('child_process');

const app = express();
const PORT = 3001;

// ─── Paths ────────────────────────────────────────────────────────────────────
const DATA_DIR  = path.join(__dirname, '..', 'data');
const MEDIA_DIR = '/home/akumaru/Downloads/colmsg';

// ─── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// Prevent browsers from caching API responses
app.use('/api', (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  next();
});

// Serve built React app in production
const DIST = path.join(__dirname, '..', 'client', 'dist');
if (fs.existsSync(DIST)) {
  app.use(express.static(DIST));
}

// ─── Media files ─────────────────────────────────────────────────────────────
// e.g. GET /media/乃木坂46/田村真佑/xxxxxx.jpg
app.use('/media', (req, res, next) => {
  // Decode the URI so Japanese folder names work correctly
  const decodedPath = decodeURIComponent(req.path);
  const absolutePath = path.join(MEDIA_DIR, decodedPath);

  // Block path traversal attempts
  if (!absolutePath.startsWith(MEDIA_DIR)) {
    return res.status(403).send('Forbidden');
  }

  res.sendFile(absolutePath, (err) => {
    if (err) next(err);
  });
});

// ─── API: member index ────────────────────────────────────────────────────────
app.get('/api/members', (req, res) => {
  const filePath = path.join(DATA_DIR, 'members.json');
  if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Not found' });
  res.sendFile(filePath);
});

// ─── API: individual member messages (paginated) ─────────────────────────────
// GET /api/messages/:dataFile?offset=0&limit=100
//
// The JSON file on disk is sorted newest-first (index 0 = most recent).
// We serve pages from that order so the client can start at the newest messages
// and load older ones on demand.
//
// Response: { messages: [...], total: N, offset: N, hasMore: bool }
//   messages are returned in CHRONOLOGICAL order (oldest-first) within the
//   requested slice, so the client can simply prepend each batch to the top.
app.get('/api/messages/:dataFile', (req, res) => {
  const dataFile     = decodeURIComponent(req.params.dataFile);
  const absolutePath = path.join(DATA_DIR, dataFile);

  // Block path traversal
  if (!absolutePath.startsWith(DATA_DIR)) {
    return res.status(403).json({ error: 'Forbidden' });
  }

  if (!fs.existsSync(absolutePath)) {
    return res.status(404).json({ error: 'File not found', dataFile });
  }

  try {
    const all    = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
    const total  = all.length;
    const offset = Math.max(0, parseInt(req.query.offset ?? '0', 10));
    const limit  = Math.min(200, Math.max(1, parseInt(req.query.limit ?? '100', 10)));

    // Slice from the newest-first array, then reverse to get chronological order
    const slice  = all.slice(offset, offset + limit).reverse();

    res.json({
      messages: slice,
      total,
      offset,
      limit,
      hasMore: offset + limit < total,
    });
  } catch (e) {
    res.status(500).json({ error: 'Parse error' });
  }
});

// ─── API: available months for a member ───────────────────────────────────────
app.get('/api/months/:dataFile', (req, res) => {
  const dataFile    = decodeURIComponent(req.params.dataFile);
  const absolutePath = path.join(DATA_DIR, dataFile);

  if (!absolutePath.startsWith(DATA_DIR) || !fs.existsSync(absolutePath)) {
    return res.status(404).json({ error: 'File not found' });
  }

  try {
    const messages = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
    const monthSet = new Set();

    for (const msg of messages) {
      const ts = msg.timestamp || '';
      if (ts.length >= 6) {
        monthSet.add(ts.slice(0, 6)); // YYYYMM
      }
    }

    // Return sorted descending (newest first)
    const months = Array.from(monthSet).sort((a, b) => b.localeCompare(a));
    res.json(months);
  } catch (e) {
    res.status(500).json({ error: 'Parse error' });
  }
});

// ─── API: find load offset for a given month ──────────────────────────────────
// GET /api/offset/:dataFile?month=YYYYMM
//
// Returns the offset (index in the newest-first array) to pass to /api/messages
// so that the OLDEST message of the target month lands at the start of the
// returned (chronological) slice — i.e. the month appears at the top of the view.
app.get('/api/offset/:dataFile', (req, res) => {
  const dataFile     = decodeURIComponent(req.params.dataFile);
  const absolutePath = path.join(DATA_DIR, dataFile);
  const month        = req.query.month; // YYYYMM

  if (!absolutePath.startsWith(DATA_DIR) || !fs.existsSync(absolutePath)) {
    return res.status(404).json({ error: 'File not found' });
  }
  if (!month || !/^\d{6}$/.test(month)) {
    return res.status(400).json({ error: 'month param required (YYYYMM)' });
  }

  try {
    const messages = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
    const limit    = Math.min(200, Math.max(1, parseInt(req.query.limit ?? '100', 10)));

    // In the newest-first array, find the contiguous block for this month.
    // firstIdx = newest message of the month (smallest index)
    // lastIdx  = oldest message of the month (largest index)
    let firstIdx = -1;
    let lastIdx  = -1;
    for (let i = 0; i < messages.length; i++) {
      const ts = messages[i].timestamp || '';
      if (ts.startsWith(month)) {
        if (firstIdx === -1) firstIdx = i;
        lastIdx = i;
      } else if (firstIdx !== -1) {
        break; // past the month block — no need to scan further
      }
    }

    if (firstIdx === -1) {
      return res.json({ offset: 0 }); // month not found, fall back to top
    }

    // We want `lastIdx` (the oldest message of the month) to be the LAST element
    // of our slice so that after reversing it becomes the FIRST chronologically.
    // offset = lastIdx - limit + 1  (clamped to 0)
    const offset = Math.max(0, lastIdx - limit + 1);
    res.json({ offset });
  } catch (e) {
    res.status(500).json({ error: 'Parse error' });
  }
});

// ─── Sync scripts ─────────────────────────────────────────────────────────────
const ROOT_DIR = path.join(__dirname, '..');

const SCRIPTS = {
  generate_data:  path.join(ROOT_DIR, 'generate_data.py'),
  refresh_online: path.join(ROOT_DIR, 'refresh_online.py'),
};

const syncState = {
  generate_data:  { running: false, lastStatus: null },
  refresh_online: { running: false, lastStatus: null },
};

// POST /api/sync  — body: { script: 'generate_data' | 'refresh_online' }
app.post('/api/sync', (req, res) => {
  const { script } = req.body;
  if (!SCRIPTS[script]) return res.status(400).json({ error: 'Unknown script' });
  if (syncState[script].running) return res.status(409).json({ error: 'Already running' });

  syncState[script].running    = true;
  syncState[script].lastStatus = null;

  const proc = spawn('python3', [SCRIPTS[script]], { cwd: ROOT_DIR });
  proc.stdout.on('data', (d) => process.stdout.write(`[${script}] ${d}`));
  proc.stderr.on('data', (d) => process.stderr.write(`[${script}] ${d}`));
  proc.on('close', (code) => {
    console.log(`[${script}] exited with code ${code}`);
    syncState[script].running    = false;
    syncState[script].lastStatus = code === 0 ? 'success' : 'error';
  });

  res.json({ started: true });
});

// GET /api/sync/status
app.get('/api/sync/status', (req, res) => {
  res.json({
    generate_data:  syncState.generate_data,
    refresh_online: syncState.refresh_online,
  });
});

// ─── API: favorites ───────────────────────────────────────────────────────────
const FAVORITES_FILE = path.join(DATA_DIR, 'favorites.json');

function readFavorites() {
  if (!fs.existsSync(FAVORITES_FILE)) return [];
  try { return JSON.parse(fs.readFileSync(FAVORITES_FILE, 'utf8')); } catch { return []; }
}

function writeFavorites(ids) {
  fs.writeFileSync(FAVORITES_FILE, JSON.stringify(ids, null, 2), 'utf8');
}

// GET /api/favorites  — returns array of favorited data_file IDs
app.get('/api/favorites', (req, res) => {
  res.json(readFavorites());
});

// POST /api/favorites  — body: { id: 'filename.json', action: 'add' | 'remove' }
app.post('/api/favorites', (req, res) => {
  const { id, action } = req.body;
  if (!id || !['add', 'remove'].includes(action)) {
    return res.status(400).json({ error: "Expected { id, action: 'add'|'remove' }" });
  }
  let ids = readFavorites();
  if (action === 'add')    ids = [...new Set([...ids, id])];
  if (action === 'remove') ids = ids.filter(f => f !== id);
  writeFavorites(ids);
  res.json({ favorites: ids });
});

// ─── API: chat message favorites (per-member) ────────────────────────────────
const CHAT_FAVORITES_FILE = path.join(DATA_DIR, 'chat_favorites.json');

function readChatFavorites() {
  if (!fs.existsSync(CHAT_FAVORITES_FILE)) return {};
  try { return JSON.parse(fs.readFileSync(CHAT_FAVORITES_FILE, 'utf8')); } catch { return {}; }
}

function writeChatFavorites(data) {
  fs.writeFileSync(CHAT_FAVORITES_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// Helper: resolve an array of IDs → full message objects from the member data file
function resolveFavMessages(dataFileName, ids) {
  if (!ids.length) return [];
  const dataFilePath = path.join(DATA_DIR, dataFileName);
  let messages = [];
  try { messages = JSON.parse(fs.readFileSync(dataFilePath, 'utf8')); } catch { return []; }
  const idSet = new Set(ids);
  const byId  = Object.fromEntries(messages.filter(m => idSet.has(m.id)).map(m => [m.id, m]));
  return ids.map(id => byId[id]).filter(Boolean);
}

// GET /api/chat-favorites/:dataFile  — returns array of favorited message objects
app.get('/api/chat-favorites/:dataFile', (req, res) => {
  const all = readChatFavorites();
  const ids = all[req.params.dataFile] || [];
  res.json(resolveFavMessages(req.params.dataFile, ids));
});

// POST /api/chat-favorites/:dataFile  — body: { id: 'msgId', action: 'add'|'remove' }
app.post('/api/chat-favorites/:dataFile', (req, res) => {
  const { id, action } = req.body;
  if (!id || !['add', 'remove'].includes(action)) {
    return res.status(400).json({ error: "Expected { id: 'msgId', action: 'add'|'remove' }" });
  }
  const all = readChatFavorites();
  const key = req.params.dataFile;
  let ids   = all[key] || [];
  if (action === 'add')    ids = [...ids.filter(i => i !== id), id];
  if (action === 'remove') ids = ids.filter(i => i !== id);
  all[key] = ids;
  writeChatFavorites(all);
  res.json({ favorites: resolveFavMessages(key, ids) });
});

// ─── SPA fallback (production) ────────────────────────────────────────────────
if (fs.existsSync(DIST)) {
  app.get('*', (req, res) => {
    res.sendFile(path.join(DIST, 'index.html'));
  });
}

// ─── Error handler ────────────────────────────────────────────────────────────
app.use((err, req, res, _next) => {
  console.error(err.message);
  res.status(err.status || 500).send(err.message || 'Server error');
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`\n  Mobame server running at http://0.0.0.0:${PORT}\n`);
  console.log(`  Data dir : ${DATA_DIR}`);
  console.log(`  Media dir: ${MEDIA_DIR}\n`);
});