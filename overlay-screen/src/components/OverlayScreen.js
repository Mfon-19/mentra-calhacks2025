import React, { useEffect, useState } from "react";
import "./OverlayScreen.css";
import screenshotService from "../services/screenshotService";
import wsClient from "../services/webSocket";

const OverlayScreen = () => {
  const [header, setHeader] = useState("Step 1");
  const [body, setBody] = useState(
    "Using prototyping features to connect frames, add interactions, and create clickable mockups that simulate user flows."
  );

  useEffect(() => {
    if (window.electronAPI && window.electronAPI.onOverlaySetContent) {
      window.electronAPI.onOverlaySetContent((payload) => {
        if (payload?.header) setHeader(payload.header);
        if (payload?.body) setBody(payload.body);
      });
    }

    const url = process.env.REACT_APP_WS_URL || "ws://localhost:5000/ws";
    wsClient.connectWebSocket(url);
    const unsubscribe = wsClient.subscribeWebSocket(({ header, body }) => {
      setHeader(header);
      setBody(body);
    });

    return () => {
      unsubscribe();
      wsClient.disconnectWebSocket();
    };
  }, []);

  return (
    <div className="overlay-screen">
      <h1 className="overlay-header">{header}</h1>
      <p className="overlay-body">{body}</p>
    </div>
  );
};

export default OverlayScreen;
