// WebSocket client — connects to same host:port the page loaded from.
// Exports: connect(handlers), send(obj), close()

let ws = null;
let handlers = {};
let reconnectTimer = null;

export function connect(h) {
  handlers = h;
  _connect();
}

function _connect() {
  const proto = location.protocol === "https:" ? "wss:" : "ws:";
  ws = new WebSocket(`${proto}//${location.host}`);

  ws.onopen = () => {
    if (handlers.onopen) handlers.onopen();
  };

  ws.onmessage = (e) => {
    let msg;
    try { msg = JSON.parse(e.data); } catch { return; }
    if (handlers.onmessage) handlers.onmessage(msg);
  };

  ws.onclose = () => {
    if (handlers.onclose) handlers.onclose();
    // Auto-reconnect after 2s unless intentionally closed
    if (!reconnectTimer) {
      reconnectTimer = setTimeout(() => {
        reconnectTimer = null;
        _connect();
      }, 2000);
    }
  };

  ws.onerror = () => { /* onclose fires next */ };
}

export function send(obj) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(obj));
  }
}

export function close() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (ws) {
    ws.onclose = null; // suppress auto-reconnect
    ws.close();
    ws = null;
  }
}