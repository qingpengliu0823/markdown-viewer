// Tab management
const Tabs = (() => {
  const tabs = []; // { id, path, name, paneEl, tabEl }
  let activeId = null;

  const barEl = document.getElementById('tab-bar');
  const contentEl = document.getElementById('tab-content');
  const emptyEl = document.getElementById('empty-state');

  function updateEmpty() {
    emptyEl.classList.toggle('hidden', tabs.length > 0);
  }

  function activate(id) {
    activeId = id;
    tabs.forEach(t => {
      t.tabEl.classList.toggle('active', t.id === id);
      t.paneEl.classList.toggle('active', t.id === id);
    });
    // Update sidebar active state
    document.querySelectorAll('.tree-item').forEach(el => {
      el.classList.toggle('active', el.dataset.path === id);
    });
  }

  function open(filePath) {
    const existing = tabs.find(t => t.id === filePath);
    if (existing) {
      activate(filePath);
      return;
    }

    const name = filePath.split('/').pop();

    // Create tab element
    const tabEl = document.createElement('div');
    tabEl.className = 'tab';
    tabEl.innerHTML = `<span class="tab-name">${escapeHtml(name)}</span><span class="tab-close">&times;</span>`;
    tabEl.addEventListener('click', (e) => {
      if (e.target.classList.contains('tab-close')) {
        close(filePath);
      } else {
        activate(filePath);
      }
    });
    barEl.appendChild(tabEl);

    // Create pane element
    const paneEl = document.createElement('div');
    paneEl.className = 'tab-pane';
    paneEl.innerHTML = '<div class="markdown-body">Loading...</div>';
    contentEl.appendChild(paneEl);

    const tab = { id: filePath, path: filePath, name, paneEl, tabEl };
    tabs.push(tab);
    activate(filePath);
    updateEmpty();

    // Fetch and render
    loadContent(tab);
  }

  async function loadContent(tab) {
    try {
      const res = await fetch(`/api/file?path=${encodeURIComponent(tab.path)}`);
      if (!res.ok) throw new Error('Failed to load file');
      const markdown = await res.text();
      tab.paneEl.querySelector('.markdown-body').innerHTML = Renderer.render(markdown);
    } catch (err) {
      tab.paneEl.querySelector('.markdown-body').innerHTML = `<p style="color:red">Error loading file: ${escapeHtml(err.message)}</p>`;
    }
  }

  function close(filePath) {
    const idx = tabs.findIndex(t => t.id === filePath);
    if (idx === -1) return;

    const tab = tabs[idx];
    tab.tabEl.remove();
    tab.paneEl.remove();
    tabs.splice(idx, 1);

    if (activeId === filePath) {
      if (tabs.length > 0) {
        const newIdx = Math.min(idx, tabs.length - 1);
        activate(tabs[newIdx].id);
      } else {
        activeId = null;
      }
    }
    updateEmpty();
  }

  function reload(filePath) {
    const tab = tabs.find(t => t.id === filePath);
    if (tab) loadContent(tab);
  }

  function remove(filePath) {
    close(filePath);
  }

  function escapeHtml(s) {
    const div = document.createElement('div');
    div.textContent = s;
    return div.innerHTML;
  }

  return { open, close, reload, remove, activate };
})();
