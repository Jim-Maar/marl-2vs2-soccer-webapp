import React from 'react';

const GameDescription: React.FC = () => {
  return (
    <div className="game-description">
      <h2>About the Game</h2>
      <p>
        This is a 2vs2 top-down soccer game where players control soccer agents in a physics-based environment. 
        The game features Red and Blue teams, each with 2 players trying to score against the opposing team.
      </p>
      
      <h3>Controls</h3>
      <ul>
        <li><strong>WASD:</strong> W (up), A (left), S (down), D (right)</li>
        <li><strong>IJKL:</strong> I (up), J (left), K (down), L (right)</li>
        <li><strong>Arrows:</strong> Arrow keys for movement</li>
        <li><strong>Numpad:</strong> 8 (up), 4 (left), 5 (down), 6 (right)</li>
        <li><strong>AI Model:</strong> Agent controlled by AI</li>
      </ul>
      
      <p>
        You can select which controls to use for each player in the menu below. 
        The game allows for combinations of human and AI players. Press diagonal keys 
        (e.g., W+D) for diagonal movement.
      </p>
      
      <p>
        <strong>Note:</strong> Controls are adjusted based on each player's starting position. 
        So regardless of which player you control or which corner they start in, pressing 'up' will always 
        move toward the opposing team's goal, 'down' toward your own goal, 'left' toward the left side of the field, 
        and 'right' toward the right side of the field from your player's perspective.
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