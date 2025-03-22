import React from 'react';

interface ScoreBoardProps {
  score: [number, number];
  isRunning: boolean;
}

const ScoreBoard: React.FC<ScoreBoardProps> = ({ score, isRunning }) => {
  return (
    <div className="scoreboard">
      <div className="team-score red">
        <div className="team-name">Red Team</div>
        <div className="score">{score[0]}</div>
      </div>
      
      <div className="game-status">
        {isRunning ? 'Game in Progress' : 'Game Paused'}
      </div>
      
      <div className="team-score blue">
        <div className="team-name">Blue Team</div>
        <div className="score">{score[1]}</div>
      </div>
      
      <style>{`
        .scoreboard {
          display: flex;
          justify-content: space-between;
          align-items: center;
          background-color: #2c3e50;
          color: white;
          padding: 10px 20px;
          border-radius: 8px;
          margin-bottom: 20px;
          width: 800px;
          box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        }
        
        .team-score {
          display: flex;
          flex-direction: column;
          align-items: center;
          padding: 10px;
          border-radius: 6px;
          min-width: 120px;
        }
        
        .red {
          background-color: rgba(231, 76, 60, 0.7);
        }
        
        .blue {
          background-color: rgba(52, 152, 219, 0.7);
        }
        
        .team-name {
          font-weight: bold;
          margin-bottom: 5px;
        }
        
        .score {
          font-size: 2.5rem;
          font-weight: bold;
        }
        
        .game-status {
          background-color: rgba(0, 0, 0, 0.3);
          padding: 8px 15px;
          border-radius: 4px;
          font-weight: bold;
        }
      `}</style>
    </div>
  );
};

export default ScoreBoard; 