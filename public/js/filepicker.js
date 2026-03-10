// File picker modal — Finder-like directory browser
const FilePicker = (() => {
  const overlay = document.getElementById('file-picker-overlay');
  const closeBtn = document.getElementById('picker-close');
  const upBtn = document.getElementById('picker-up');
  const goBtn = document.getElementById('picker-go');
  const pathInput = document.getElementById('picker-path-input');
  const listEl = document.getElementById('picker-list');

  let currentDir = '';
  let onSelect = null;

  closeBtn.addEventListener('click', close);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) close();
  });

  upBtn.addEventListener('click', () => {
    if (currentDir) {
      const parent = currentDir.replace(/\/[^/]+\/?$/, '') || '/';
      browse(parent);
    }
  });

  goBtn.addEventListener('click', () => {
    const val = pathInput.value.trim();
    if (val) browse(val);
  });

  pathInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const val = pathInput.value.trim();
      if (val) browse(val);
    }
  });

  function open(callback) {
    onSelect = callback;
    overlay.classList.remove('hidden');
    browse('');
  }

  function close() {
    overlay.classList.add('hidden');
    onSelect = null;
  }

  async function browse(dir) {
    listEl.innerHTML = '<div class="picker-loading">Loading...</div>';
    try {
      const url = dir ? `/api/browse?dir=${encodeURIComponent(dir)}` : '/api/browse';
      const res = await fetch(url);
      if (!res.ok) throw new Error('Cannot read directory');
      const data = await res.json();
      currentDir = data.dir;
      pathInput.value = data.dir;
      renderList(data);
    } catch (err) {
      listEl.innerHTML = `<div class="picker-error">Cannot access this folder.</div>`;
    }
  }

  function renderList(data) {
    listEl.innerHTML = '';

    if (data.items.length === 0) {
      listEl.innerHTML = '<div class="picker-empty">No .md files or folders here.</div>';
      return;
    }

    data.items.forEach(item => {
      const row = document.createElement('div');
      row.className = 'picker-item';

      if (item.type === 'directory') {
        row.innerHTML = `<span class="picker-icon">📁</span><span class="picker-name">${escapeHtml(item.name)}</span>`;
        row.addEventListener('click', () => {
          browse(currentDir + '/' + item.name);
        });
      } else {
        row.innerHTML = `<span class="picker-icon">📄</span><span class="picker-name">${escapeHtml(item.name)}</span>`;
        row.addEventListener('click', () => {
          const fullPath = currentDir + '/' + item.name;
          if (onSelect) onSelect(fullPath);
          close();
        });
      }

      listEl.appendChild(row);
    });
  }

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  return { open, close };
})();
