import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Navbar = () => {
  const location = useLocation();
  
  const isActive = (path) => {
    return location.pathname === path ? 'active' : '';
  };

  return (
    <nav style={{
      backgroundColor: '#333',
      padding: '1rem 0',
      marginBottom: '20px'
    }}>
      <div className="container">
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <Link to="/" style={{
            color: 'white',
            textDecoration: 'none',
            fontSize: '1.5rem',
            fontWeight: 'bold'
          }}>
            CalHacks 2025
          </Link>
          
          <div style={{ display: 'flex', gap: '20px' }}>
            <Link 
              to="/" 
              style={{
                color: 'white',
                textDecoration: 'none',
                padding: '8px 16px',
                borderRadius: '4px',
                backgroundColor: isActive('/') ? '#007bff' : 'transparent'
              }}
            >
              Home
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
