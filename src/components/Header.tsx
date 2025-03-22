import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="app-header">
      <h1>2vs2 Soccer Game with AI Agents</h1>
      
      <style>{`
        .app-header {
          background: linear-gradient(135deg, #2b5876, #4e4376);
          color: white;
          padding: 20px;
          text-align: center;
          border-radius: 8px;
          margin-bottom: 20px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        h1 {
          margin: 0;
          font-size: 2rem;
          font-weight: 700;
        }
      `}</style>
    </header>
  );
};

export default Header; 