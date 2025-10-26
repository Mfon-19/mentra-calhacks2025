import React from "react";
import "./OverlayScreen.css";
import DynamicTextbox from "./DynamicTextbox";
import { FiSearch, FiEdit2, FiMessageSquare } from "react-icons/fi";

const OverlayScreen = () => {
  return (
    <div className="overlay-container">
      <div className="top-bar">
        <button className="action-button-top">What should I say?</button>
      </div>
      <div className="content-area">
        <div className="searched-records">
          <div className="records-header">
            <FiSearch className="header-icon" />
            <span>Searched records</span>
          </div>
          <p className="record-text">
            "So just to recap—you need new cabinets and lighting. I'll send you
            a quote within the hour. Let's do a kickoff call next Wednesday if
            that works for you?"
          </p>
        </div>
        <div className="suggested-actions">
          <button className="action-button">
            <FiEdit2 className="button-icon" />
            What should I say?
          </button>
          <button className="action-button">
            <FiMessageSquare className="button-icon" />
            Follow-up questions
          </button>
        </div>
      </div>
      <div className="input-area">
        <DynamicTextbox
          placeholder="Ask, ⌘⏎ to start typing"
          className="custom-textbox"
          maxWidth={600}
        />
      </div>
    </div>
  );
};

export default OverlayScreen;
