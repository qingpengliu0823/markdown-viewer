// PDF export module
const Export = (() => {
  let busy = false;

  async function toPdf() {
    const activePath = Tabs.getActivePath();
    if (!activePath) return;
    if (busy) return;

    const btn = document.getElementById('export-pdf-btn');
    busy = true;
    btn.classList.add('exporting');
    btn.setAttribute('disabled', '');

    try {
      const res = await fetch('/api/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: activePath }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Export failed' }));
        throw new Error(err.error || 'Export failed');
      }

      const blob = await res.blob();
      const filename = activePath.split('/').pop().replace(/\.md$/i, '') + '.pdf';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('PDF export failed: ' + err.message);
    } finally {
      busy = false;
      btn.classList.remove('exporting');
      btn.removeAttribute('disabled');
    }
  }

  // Wire up button
  document.getElementById('export-pdf-btn').addEventListener('click', toPdf);

  return { toPdf };
})();
