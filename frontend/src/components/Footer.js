import React from 'react';

const Footer = () => {
  return (
    <footer style={{
      backgroundColor: '#333',
      color: 'white',
      padding: '20px 0',
      marginTop: 'auto',
      textAlign: 'center'
    }}>
      <div className="container">
        <p>&copy; 2025 CalHacks 2025. All rights reserved.</p>
        <p>Built with React, Flask, and Electron</p>
      </div>
    </footer>
  );
};

export default Footer;
