const fs = require('fs');
const path = require('path');

async function buildTree(dir, relativeTo) {
  relativeTo = relativeTo || dir;
  const entries = await fs.promises.readdir(dir, { withFileTypes: true });
  const children = [];

  // Sort: directories first, then alphabetical
  entries.sort((a, b) => {
    if (a.isDirectory() && !b.isDirectory()) return -1;
    if (!a.isDirectory() && b.isDirectory()) return 1;
    return a.name.localeCompare(b.name);
  });

  for (const entry of entries) {
    if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;

    const fullPath = path.join(dir, entry.name);
    const relPath = path.relative(relativeTo, fullPath);

    if (entry.isDirectory()) {
      const subtree = await buildTree(fullPath, relativeTo);
      // Only include directories that contain .md files (directly or nested)
      if (subtree.children.length > 0) {
        children.push(subtree);
      }
    } else if (entry.name.endsWith('.md')) {
      children.push({ name: entry.name, path: relPath, type: 'file' });
    }
  }

  return {
    name: path.basename(dir),
    path: path.relative(relativeTo, dir) || '.',
    type: 'directory',
    children,
  };
}

module.exports = { buildTree };
