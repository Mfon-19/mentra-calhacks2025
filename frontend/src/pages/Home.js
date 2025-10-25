import React, { useState, useEffect } from 'react';

const Home = () => {
  const [childOutput, setChildOutput] = useState('');
  const [isElectron, setIsElectron] = useState(false);

  useEffect(() => {
    // Check if we're running in Electron
    setIsElectron(!!window.electronAPI);
    
    // Listen for child process output
    if (window.electronAPI) {
      window.electronAPI.onChildProcessOutput((data) => {
        setChildOutput(data);
      });
    }
  }, []);

  const handleTriggerChildProcess = async () => {
    if (window.electronAPI) {
      try {
        const result = await window.electronAPI.triggerChildProcess();
        console.log('Child process result:', result);
        setChildOutput('Child window created successfully!');
      } catch (error) {
        console.error('Error triggering child process:', error);
        setChildOutput('Error: ' + error.message);
      }
    } else {
      setChildOutput('Not running in Electron environment');
    }
  };

  return (
    <div className="container">
      <div className="card">
        <h1>Welcome to CalHacks 2025</h1>
        <p>Educational Platform for Lesson Planning and Media Management</p>
        
        <div style={{ marginTop: '30px' }}>
          <p>Welcome to the CalHacks 2025 educational platform!</p>
          
          {isElectron && (
            <div style={{ marginTop: '20px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
              <h3>Electron Features</h3>
              <p>Press <kbd>/</kbd> key anywhere to open a child window, or click the button below:</p>
              
              <button 
                className="btn btn-primary" 
                onClick={handleTriggerChildProcess}
                style={{ marginTop: '10px' }}
              >
                Open Child Window
              </button>
              
              {childOutput && (
                <div style={{ 
                  marginTop: '15px', 
                  padding: '10px', 
                  backgroundColor: '#e9ecef', 
                  borderRadius: '4px',
                  fontFamily: 'monospace'
                }}>
                  <strong>Output:</strong> {childOutput}
                </div>
              )}
            </div>
          )}
          
          {!isElectron && (
            <div style={{ marginTop: '20px', padding: '20px', backgroundColor: '#fff3cd', borderRadius: '8px' }}>
              <p><strong>Note:</strong> This app is designed to run in Electron. Some features may not be available in a regular browser.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Home;
