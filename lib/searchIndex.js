const fs = require('fs');
const path = require('path');

const MAX_FILE_SIZE = 1024 * 1024; // 1MB
const MAX_RESULTS = 100;

async function collectMdFiles(dir) {
  const files = [];
  async function walk(d) {
    const entries = await fs.promises.readdir(d, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      const full = path.join(d, entry.name);
      if (entry.isDirectory()) {
        await walk(full);
      } else if (entry.name.endsWith('.md')) {
        files.push(full);
      }
    }
  }
  await walk(dir);
  return files;
}

async function searchFiles(root, query) {
  const files = await collectMdFiles(root);
  const results = [];
  const lowerQuery = query.toLowerCase();

  for (const file of files) {
    if (results.length >= MAX_RESULTS) break;

    const stat = await fs.promises.stat(file);
    if (stat.size > MAX_FILE_SIZE) continue;

    const content = await fs.promises.readFile(file, 'utf8');
    const lines = content.split('\n');

    for (let i = 0; i < lines.length; i++) {
      if (results.length >= MAX_RESULTS) break;
      if (lines[i].toLowerCase().includes(lowerQuery)) {
        results.push({
          path: path.relative(root, file),
          line: i + 1,
          snippet: lines[i].trim().substring(0, 200),
        });
      }
    }
  }

  return results;
}

module.exports = { searchFiles };
