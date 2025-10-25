import React, { useState, useEffect } from 'react';
import './OverlayScreen.css';

const OverlayScreen = () => {
  const [status, setStatus] = useState('Active');
  const [output, setOutput] = useState('');
  const [timestamp, setTimestamp] = useState('');

  useEffect(() => {
    // Set creation time
    setTimestamp(new Date().toLocaleString());
    
    // Listen for messages from parent
    if (window.electronAPI) {
      window.electronAPI.onChildProcessOutput((data) => {
        console.log('Received from parent:', data);
        setStatus(data);
      });
    }
  }, []);

  const handleSendMessage = async () => {
    if (window.electronAPI) {
      try {
        const result = await window.electronAPI.triggerChildProcess();
        console.log('Message sent to parent:', result);
        setOutput('Message sent to parent window!');
      } catch (error) {
        console.error('Error sending message:', error);
        setOutput('Error: ' + error.message);
      }
    } else {
      setOutput('Electron API not available');
    }
  };

  const handleCloseWindow = () => {
    if (window.electronAPI) {
      window.close();
    }
  };

  return (
    <div className="overlay-screen">
      <div className="overlay-screen__header">
        <h1>Overlay Screen</h1>
      </div>
      
      <div className="overlay-screen__content">
        <div className="overlay-screen__status">
          <strong>Status:</strong> <span>{status}</span>
        </div>
        
        <div className="overlay-screen__buttons">
          <button 
            className="overlay-screen__button" 
            onClick={handleSendMessage}
          >
            Send Message to Parent
          </button>
          
          <button 
            className="overlay-screen__button" 
            onClick={handleCloseWindow}
          >
            Close Window
          </button>
        </div>
        
        {output && (
          <div className="overlay-screen__output">
            {output}
          </div>
        )}
        
        <div className="overlay-screen__timestamp">
          Created: <span>{timestamp}</span>
        </div>
      </div>
    </div>
  );
};

export default OverlayScreen;
