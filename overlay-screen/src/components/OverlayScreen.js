import React, { useEffect, useState } from "react";
import "./OverlayScreen.css";
import screenshotService from "../services/screenshotService";
import wsClient from "../services/webSocket";
import { startStep, sendScreenshot } from "../services/apiService";

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

    let stopped = false;

    async function run() {
      try {
        // Trigger popup for current step
        await startStep();

        // Loop: every 10s send screenshot; backend will compare and advance
        while (!stopped) {
          await new Promise((r) => setTimeout(r, 10000));
          const resp = await sendScreenshot();
          const d = resp?.data || {};
          if (d.lesson_completed) break;
          // if d.completed === true, backend advanced; continue
          // if false, wait and retry
        }
      } catch (e) {
        console.error("Progress loop error:", e);
      }
    }

    run();

    return () => {
      unsubscribe();
      wsClient.disconnectWebSocket();
      stopped = true;
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