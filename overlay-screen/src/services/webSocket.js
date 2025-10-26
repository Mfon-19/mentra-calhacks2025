let socket = null;
let listener = null;

export function connectWebSocket(url) {
  if (
    socket &&
    (socket.readyState === WebSocket.OPEN ||
      socket.readyState === WebSocket.CONNECTING)
  ) {
    return socket;
  }

  socket = new WebSocket(url);

  socket.addEventListener("open", () => {
    socket.send(JSON.stringify({ type: "hello", client: "overlay" }));
  });

  socket.addEventListener("message", (event) => {
    try {
      const data = JSON.parse(event.data);
      try {
        listener(data);
      } catch (_err) {
      }
    } catch (_e) {
    }
  });

  socket.addEventListener("close", () => {
    // Optionally implement reconnection logic here
  });

  socket.addEventListener("error", () => {
    // Errors are handled by the browser; consumers can observe via close
  });

  return socket;
}

export function subscribeWebSocket(callback) {
  if (typeof callback === "function") {
    listener = callback;
    return () => {
      if (listener === callback) listener = null;
    };
  }
  return () => {};
}

export function disconnectWebSocket() {
  if (socket) {
    try {
      socket.close();
    } catch (_e) {
    }
    socket = null;
  }
  listener = null;
}

export default {
  connectWebSocket,
  subscribeWebSocket,
  disconnectWebSocket,
};
