// WebSocket client with auto-reconnect
const WS = (() => {
  let ws = null;
  let backoff = 1000;

  function connect() {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(`${protocol}//${location.host}`);

    ws.onopen = () => {
      backoff = 1000;
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      switch (data.type) {
        case 'fileChanged':
          Tabs.reload(data.path);
          break;
        case 'fileAdded':
          Sidebar.loadTree();
          break;
        case 'fileDeleted':
          Tabs.remove(data.path);
          Sidebar.loadTree();
          break;
      }
    };

    ws.onclose = () => {
      setTimeout(() => {
        backoff = Math.min(backoff * 2, 30000);
        connect();
      }, backoff);
    };
  }

  connect();
  return { connect };
})();
