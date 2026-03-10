// Sidebar file tree
const Sidebar = (() => {
  const treeEl = document.getElementById('file-tree');
  const sidebarEl = document.getElementById('sidebar');
  const toggleBtn = document.getElementById('sidebar-toggle');
  const openFileBtn = document.getElementById('open-file-btn');

  const showBtn = document.getElementById('sidebar-show');

  // Sidebar toggle (hide)
  toggleBtn.addEventListener('click', () => {
    sidebarEl.classList.add('collapsed');
    showBtn.classList.remove('hidden');
  });

  // Sidebar show (reopen)
  showBtn.addEventListener('click', () => {
    sidebarEl.classList.remove('collapsed');
    showBtn.classList.add('hidden');
  });

  // Sidebar resize handle
  const resizeHandle = document.getElementById('sidebar-resize');
  let isResizing = false;

  resizeHandle.addEventListener('mousedown', (e) => {
    e.preventDefault();
    isResizing = true;
    resizeHandle.classList.add('active');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  });

  document.addEventListener('mousemove', (e) => {
    if (!isResizing) return;
    const newWidth = Math.max(180, Math.min(e.clientX, window.innerWidth * 0.5));
    sidebarEl.style.width = newWidth + 'px';
    updateTogglePos();
  });

  document.addEventListener('mouseup', () => {
    if (!isResizing) return;
    isResizing = false;
    resizeHandle.classList.remove('active');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  });

  // Open file — launches native macOS Finder dialog via server
  openFileBtn.addEventListener('click', async () => {
    openFileBtn.disabled = true;
    openFileBtn.textContent = 'Waiting for Finder...';
    try {
      const res = await fetch('/api/pick-file', { method: 'POST' });
      const data = await res.json();
      if (!data.cancelled && data.path) {
        openExternal(data.path);
      }
    } catch (err) {
      console.error('Picker failed:', err);
    } finally {
      openFileBtn.disabled = false;
      openFileBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor"><path d="M1.5 3.5A1.5 1.5 0 0 1 3 2h4.586a1 1 0 0 1 .707.293l1.414 1.414a1 1 0 0 0 .707.293H13a1.5 1.5 0 0 1 1.5 1.5v7A1.5 1.5 0 0 1 13 14H3a1.5 1.5 0 0 1-1.5-1.5v-9z"/></svg> Open File`;
    }
  });

  async function openExternal(filePath) {
    try {
      const res = await fetch('/api/open', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: filePath }),
      });
      if (!res.ok) {
        const err = await res.json();
        alert(err.error || 'Failed to open file');
        return;
      }
      const data = await res.json();
      Tabs.open(data.path);
      loadTree();
    } catch (err) {
      alert('Failed to open file: ' + err.message);
    }
  }

  function render(tree) {
    treeEl.innerHTML = '';
    if (tree.children) {
      tree.children.forEach(child => {
        treeEl.appendChild(createNode(child));
      });
    }
  }

  function createNode(node) {
    if (node.type === 'file') {
      const el = document.createElement('div');
      el.className = 'tree-item';
      el.dataset.path = node.path;

      const label = document.createElement('span');
      label.className = 'tree-file-label';
      label.innerHTML = `<span class="tree-icon">📄</span>${escapeHtml(node.name)}`;

      const delBtn = document.createElement('span');
      delBtn.className = 'tree-delete';
      delBtn.title = 'Delete file';
      delBtn.innerHTML = '&times;';
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteFile(node.path, node.name);
      });

      el.appendChild(label);
      el.appendChild(delBtn);
      el.addEventListener('click', () => Tabs.open(node.path));
      return el;
    }

    // Directory
    const wrapper = document.createElement('div');
    wrapper.className = 'tree-dir open';

    const header = document.createElement('div');
    header.className = 'tree-item';
    header.innerHTML = `<span class="tree-icon">📁</span>${escapeHtml(node.name)}`;
    header.addEventListener('click', () => {
      wrapper.classList.toggle('open');
    });

    const children = document.createElement('div');
    children.className = 'tree-children';
    node.children.forEach(child => {
      children.appendChild(createNode(child));
    });

    wrapper.appendChild(header);
    wrapper.appendChild(children);
    return wrapper;
  }

  function renderExternalFiles(files) {
    if (files.length === 0) return;

    const section = document.createElement('div');
    section.className = 'external-section';

    const header = document.createElement('div');
    header.className = 'external-header';
    header.textContent = 'Linked Files';
    section.appendChild(header);

    files.forEach(f => {
      const el = document.createElement('div');
      el.className = 'tree-item';
      el.dataset.path = f.path;

      const label = document.createElement('span');
      label.className = 'tree-file-label';
      label.innerHTML = `<span class="tree-icon">🔗</span>${escapeHtml(f.name)}`;
      label.title = f.path;

      const unlinkBtn = document.createElement('span');
      unlinkBtn.className = 'tree-delete';
      unlinkBtn.title = 'Remove from list';
      unlinkBtn.innerHTML = '&times;';
      unlinkBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeExternal(f.path);
      });

      el.appendChild(label);
      el.appendChild(unlinkBtn);
      el.addEventListener('click', () => Tabs.open(f.path));
      section.appendChild(el);
    });

    treeEl.appendChild(section);
  }

  async function removeExternal(filePath) {
    try {
      await fetch(`/api/external?path=${encodeURIComponent(filePath)}`, {
        method: 'DELETE',
      });
      Tabs.remove(filePath);
      loadTree();
    } catch (err) {
      console.error('Remove failed:', err);
    }
  }

  async function deleteFile(filePath, name) {
    if (!confirm(`Delete "${name}"?`)) return;

    try {
      const res = await fetch(`/api/file?path=${encodeURIComponent(filePath)}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Delete failed');
      Tabs.remove(filePath);
      loadTree();
    } catch (err) {
      console.error('Delete failed:', err);
    }
  }

  function showSearchResults(results) {
    treeEl.innerHTML = '';
    if (results.length === 0) {
      treeEl.innerHTML = '<div style="padding:12px;color:#656d76;font-size:13px">No results found.</div>';
      return;
    }
    results.forEach(r => {
      const el = document.createElement('div');
      el.className = 'search-result';
      el.innerHTML = `
        <div class="search-result-path">${escapeHtml(r.path)}</div>
        <div class="search-result-line">Line ${r.line}</div>
        <div class="search-result-snippet">${escapeHtml(r.snippet)}</div>
      `;
      el.addEventListener('click', () => Tabs.open(r.path));
      treeEl.appendChild(el);
    });
  }

  async function loadTree() {
    try {
      const [treeRes, extRes] = await Promise.all([
        fetch('/api/tree'),
        fetch('/api/external'),
      ]);
      const tree = await treeRes.json();
      const external = await extRes.json();
      render(tree);
      renderExternalFiles(external);
    } catch (err) {
      treeEl.innerHTML = '<div style="padding:12px;color:red;font-size:13px">Failed to load file tree.</div>';
    }
  }

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  return { loadTree, render, showSearchResults };
})();
