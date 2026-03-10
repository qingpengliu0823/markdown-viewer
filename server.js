const express = require('express');
const path = require('path');
const { WebSocketServer } = require('ws');
const chokidar = require('chokidar');
const { buildTree } = require('./lib/fileTree');
const { searchFiles } = require('./lib/searchIndex');
const fs = require('fs');

const ROOT = path.resolve(process.argv[2] || '.');
const PORT = process.env.PORT || 3000;

const app = express();
app.use(express.json({ limit: '5mb' }));
app.use(express.static(path.join(__dirname, 'public')));

// Serve vendor libs from node_modules
app.use('/vendor/highlight.js', express.static(path.join(__dirname, 'node_modules/highlight.js')));
app.use('/vendor/markdown-it', express.static(path.join(__dirname, 'node_modules/markdown-it/dist')));
app.use('/vendor/katex', express.static(path.join(__dirname, 'node_modules/katex/dist')));
app.use('/vendor/texmath', express.static(path.join(__dirname, 'node_modules/markdown-it-texmath')));

// Validate that a requested path is within the root directory
function safePath(requestedPath) {
  const resolved = path.resolve(ROOT, requestedPath);
  if (!resolved.startsWith(ROOT + path.sep) && resolved !== ROOT) {
    return null;
  }
  return resolved;
}

// API: directory tree
app.get('/api/tree', async (req, res) => {
  try {
    const tree = await buildTree(ROOT);
    res.json(tree);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Track externally opened files for watching
const externalFiles = new Set();
const externalWatcher = chokidar.watch([], { ignoreInitial: true });

externalWatcher.on('change', filePath => {
  broadcast({ type: 'fileChanged', path: filePath });
});
externalWatcher.on('unlink', filePath => {
  broadcast({ type: 'fileDeleted', path: filePath });
  externalFiles.delete(filePath);
});

// Resolve a file path — supports both relative (within root) and absolute paths
function resolveFilePath(requestedPath) {
  if (!requestedPath) return null;
  // Absolute path: must exist and be a .md file
  if (path.isAbsolute(requestedPath)) {
    const resolved = path.resolve(requestedPath);
    if (!resolved.endsWith('.md')) return null;
    return resolved;
  }
  // Relative path: must be within root
  return safePath(requestedPath);
}

// API: file content
app.get('/api/file', (req, res) => {
  const filePath = req.query.path;
  if (!filePath) return res.status(400).json({ error: 'path required' });

  const resolved = resolveFilePath(filePath);
  if (!resolved) return res.status(403).json({ error: 'access denied' });

  fs.readFile(resolved, 'utf8', (err, data) => {
    if (err) return res.status(404).json({ error: 'file not found' });
    res.type('text/plain').send(data);
  });
});

// API: native Finder file picker (macOS)
app.post('/api/pick-file', (req, res) => {
  const { execSync } = require('child_process');
  try {
    const script = `osascript -e 'POSIX path of (choose file of type {"md"} with prompt "Select a Markdown file")'`;
    const result = execSync(script, { encoding: 'utf8', timeout: 60000 }).trim();
    if (!result) return res.json({ cancelled: true });
    res.json({ path: result });
  } catch {
    // User cancelled the dialog
    res.json({ cancelled: true });
  }
});

// API: open an external file by absolute path (validates + starts watching)
app.post('/api/open', (req, res) => {
  const filePath = req.body.path;
  if (!filePath || !path.isAbsolute(filePath)) {
    return res.status(400).json({ error: 'absolute path required' });
  }

  const resolved = path.resolve(filePath);
  if (!resolved.endsWith('.md')) {
    return res.status(400).json({ error: 'only .md files are supported' });
  }

  try {
    fs.accessSync(resolved, fs.constants.R_OK);
  } catch {
    return res.status(404).json({ error: 'file not found or not readable' });
  }

  // Start watching if not already
  if (!externalFiles.has(resolved)) {
    externalFiles.add(resolved);
    externalWatcher.add(resolved);
  }

  res.json({ path: resolved, name: path.basename(resolved) });
});

// API: list externally opened files
app.get('/api/external', (req, res) => {
  const files = Array.from(externalFiles).map(f => ({
    path: f,
    name: path.basename(f),
  }));
  res.json(files);
});

// API: unlink an external file (stop watching, don't delete from disk)
app.delete('/api/external', (req, res) => {
  const filePath = req.query.path;
  if (!filePath) return res.status(400).json({ error: 'path required' });

  const resolved = path.resolve(filePath);
  externalFiles.delete(resolved);
  externalWatcher.unwatch(resolved);
  res.json({ removed: resolved });
});

// API: browse filesystem directories (for file picker)
app.get('/api/browse', async (req, res) => {
  const dir = req.query.dir || require('os').homedir();
  const resolved = path.resolve(dir);

  try {
    const entries = await fs.promises.readdir(resolved, { withFileTypes: true });
    const items = [];

    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue;
      if (entry.isDirectory()) {
        items.push({ name: entry.name, type: 'directory' });
      } else if (entry.name.endsWith('.md')) {
        items.push({ name: entry.name, type: 'file' });
      }
    }

    // Sort: directories first, then alphabetical
    items.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'directory' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

    res.json({ dir: resolved, parent: path.dirname(resolved), items });
  } catch {
    res.status(403).json({ error: 'cannot read directory' });
  }
});

// API: delete file
app.delete('/api/file', async (req, res) => {
  const filePath = req.query.path;
  if (!filePath) return res.status(400).json({ error: 'path required' });

  const resolved = safePath(filePath);
  if (!resolved) return res.status(403).json({ error: 'access denied' });

  try {
    await fs.promises.unlink(resolved);
    res.json({ deleted: filePath });
  } catch (err) {
    res.status(404).json({ error: 'file not found' });
  }
});

// API: upload file(s)
app.post('/api/upload', async (req, res) => {
  const files = req.body.files;
  if (!Array.isArray(files) || files.length === 0) {
    return res.status(400).json({ error: 'files array required' });
  }

  const saved = [];
  for (const file of files) {
    if (!file.name || typeof file.content !== 'string') continue;

    // Sanitize: only allow .md files, no path traversal
    const name = path.basename(file.name);
    if (!name.endsWith('.md')) continue;

    const dest = path.join(ROOT, file.subdir || '', name);
    const resolved = safePath(path.join(file.subdir || '', name));
    if (!resolved) continue;

    // Create subdirectory if needed
    await fs.promises.mkdir(path.dirname(resolved), { recursive: true });
    await fs.promises.writeFile(resolved, file.content, 'utf8');
    saved.push(path.relative(ROOT, resolved));
  }

  res.json({ saved });
});

// API: search
app.get('/api/search', async (req, res) => {
  const query = req.query.q;
  if (!query) return res.status(400).json({ error: 'q required' });

  try {
    const results = await searchFiles(ROOT, query);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start HTTP server
const server = app.listen(PORT, () => {
  console.log(`Markdown Viewer running at http://localhost:${PORT}`);
  console.log(`Serving files from: ${ROOT}`);
});

// WebSocket server
const wss = new WebSocketServer({ server });

function broadcast(data) {
  const msg = JSON.stringify(data);
  wss.clients.forEach(client => {
    if (client.readyState === 1) client.send(msg);
  });
}

// File watcher
const watcher = chokidar.watch('**/*.md', {
  cwd: ROOT,
  ignoreInitial: true,
  ignored: ['**/node_modules/**', '**/.git/**'],
});

watcher.on('change', filePath => {
  broadcast({ type: 'fileChanged', path: filePath });
});
watcher.on('add', filePath => {
  broadcast({ type: 'fileAdded', path: filePath });
});
watcher.on('unlink', filePath => {
  broadcast({ type: 'fileDeleted', path: filePath });
});
