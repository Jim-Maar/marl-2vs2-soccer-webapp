import React from 'react';

const GameDescription: React.FC = () => {
  return (
    <div className="game-description">
      <p>
        This is a reinforcement learning project I did for fun. It's a 2 vs 2 top-down physics-based soccer game. You control one player (bottom left by default). Your enemies and your teammate are controlled by reinforcement learning agents, that were previously trained using self-play.
      </p>
      <p>
        The AIs play differently to humans so you need to learn how to work together with your AI teammate.
      </p>
      <p>
        You can also play with multiple players on one keyboard by adjusting the controls below.
      </p>
      
      <style>{`
        .game-description {
          background-color: #f5f5f5;
          padding: 20px;
          border-radius: 8px;
          margin-bottom: 20px;
          max-width: 800px;
        }
        
        h2 {
          color: #333;
          margin-top: 0;
        }
        
        h3 {
          color: #444;
        }
        
        ul {
          padding-left: 20px;
        }
        
        li {
          margin-bottom: 8px;
        }
      `}</style>
    </div>
  );
};

export default GameDescription; 