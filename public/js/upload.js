// Upload handling: button + drag-and-drop
const Upload = (() => {
  const uploadBtn = document.getElementById('upload-btn');
  const fileInput = document.getElementById('file-input');
  const mainEl = document.getElementById('main');
  const overlay = document.getElementById('drop-overlay');

  let dragCounter = 0;

  // Button click opens file picker
  uploadBtn.addEventListener('click', () => fileInput.click());

  // File picker change
  fileInput.addEventListener('change', () => {
    if (fileInput.files.length > 0) {
      handleFiles(fileInput.files);
      fileInput.value = '';
    }
  });

  // Drag and drop on the main area
  mainEl.addEventListener('dragenter', (e) => {
    e.preventDefault();
    dragCounter++;
    overlay.classList.add('visible');
  });

  mainEl.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dragCounter--;
    if (dragCounter <= 0) {
      dragCounter = 0;
      overlay.classList.remove('visible');
    }
  });

  mainEl.addEventListener('dragover', (e) => {
    e.preventDefault();
  });

  mainEl.addEventListener('drop', (e) => {
    e.preventDefault();
    dragCounter = 0;
    overlay.classList.remove('visible');

    const files = Array.from(e.dataTransfer.files).filter(f =>
      f.name.endsWith('.md') || f.name.endsWith('.markdown') || f.name.endsWith('.txt')
    );
    if (files.length > 0) handleFiles(files);
  });

  async function handleFiles(fileList) {
    const payload = [];

    for (const file of fileList) {
      const content = await readFileText(file);
      // Ensure .md extension
      let name = file.name;
      if (!name.endsWith('.md')) name = name.replace(/\.[^.]+$/, '') + '.md';
      payload.push({ name, content });
    }

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ files: payload }),
      });
      const data = await res.json();

      // Refresh sidebar and open the uploaded files
      await Sidebar.loadTree();
      data.saved.forEach(p => Tabs.open(p));
    } catch (err) {
      console.error('Upload failed:', err);
    }
  }

  function readFileText(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsText(file);
    });
  }

  return {};
})();
