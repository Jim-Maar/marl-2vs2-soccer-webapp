import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="app-header">
      <img
        src="./logo.png"
        alt="RL Soccer Logo"
        className="header-logo"
      />

      <style>{`
        .app-header {
          // background: linear-gradient(135deg, #2b5876, #4e4376);
          color: white;
          padding: 20px;
          text-align: center;
          border-radius: 8px;
          margin-bottom: 20px;
          // box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .header-logo {
          max-width: 100%;
          height: auto;
          max-height: 3600px;
          width: auto;
          object-fit: contain;
        }

        @media (max-width: 768px) {
          .header-logo {
            max-height: 240px;
          }
        }

        @media (max-width: 480px) {
          .header-logo {
            max-height: 180px;
          }
        }
      `}</style>
    </header>
  );
};

export default Header; 