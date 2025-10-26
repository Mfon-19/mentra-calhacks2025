import { io } from "socket.io-client";

let socket = null;
let listener = null;

function deriveBaseUrl(inputUrl) {
  try {
    const u = new URL(inputUrl);
    const isWs = u.protocol === "ws:" || u.protocol === "wss:";
    const protocol = isWs ? (u.protocol === "wss:" ? "https:" : "http:") : u.protocol;
    return `${protocol}//${u.host}`; // strip path; socket.io uses /socket.io
  } catch (_e) {
    return inputUrl; // fallback if malformed
  }
}

export function connectWebSocket(url) {
  if (socket && socket.connected) {
    return socket;
  }

  const baseUrl = deriveBaseUrl(url || "http://localhost:5000");
  socket = io(baseUrl, {
    transports: ["websocket", "polling"],
    withCredentials: false,
  });

  // Optional connection status event from backend
  socket.on("status", (data) => {
    // no-op; can be logged if needed
  });

  // Core popup channel from Flask-SocketIO
  socket.on("popup_message", (data) => {
    if (typeof listener === "function") {
      // Map backend shape -> UI-consumed shape
      const mapped = {
        header: "Step",
        body: data?.message || "",
        raw: data,
      };
      try {
        listener(mapped);
      } catch (_e) {
      }
    }
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
      socket.removeAllListeners();
      socket.disconnect();
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
