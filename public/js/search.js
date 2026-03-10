// Search functionality
const Search = (() => {
  const input = document.getElementById('search-input');
  let debounceTimer = null;
  let lastQuery = '';

  input.addEventListener('input', () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
      const query = input.value.trim();
      if (query === lastQuery) return;
      lastQuery = query;

      if (!query) {
        Sidebar.loadTree();
        return;
      }

      performSearch(query);
    }, 300);
  });

  async function performSearch(query) {
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
      const results = await res.json();
      Sidebar.showSearchResults(results);
    } catch (err) {
      Sidebar.showSearchResults([]);
    }
  }

  return { performSearch };
})();
