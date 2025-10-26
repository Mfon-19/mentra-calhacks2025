import React, { useEffect, useState } from "react";
import "./OverlayScreen.css";
import DynamicTextboxDemo from "./DynamicTextboxDemo";

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
  }, []);

  return (
    <div className="overlay-screen">
      <h1 className="overlay-header">{header}</h1>
      <p className="overlay-body">{body}</p>
      <DynamicTextboxDemo />
    </div>
  );
};

export default OverlayScreen;
