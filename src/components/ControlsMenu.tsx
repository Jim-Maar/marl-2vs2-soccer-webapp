import React from 'react';
import { ControlType } from '../utils/constants';

interface ControlsMenuProps {
  playerControls: ControlType[];
  onControlChange: (playerIndex: number, controlType: ControlType) => void;
  onStartStop: () => void;
  isRunning: boolean;
}

const ControlsMenu: React.FC<ControlsMenuProps> = ({ 
  playerControls, 
  onControlChange, 
  onStartStop,
  isRunning
}) => {
  return (
    <div className="controls-menu">
      <div className="controls-grid">
        {/* Headers */}
        <div className="controls-header">Player</div>
        <div className="controls-header">Controls</div>
        
        {/* Player rows */}
        {playerControls.map((control, index) => (
          <React.Fragment key={index}>
            <div className="player-label">
              Agent {index + 1} ({index < 2 ? 'Red' : 'Blue'} Team)
            </div>
            <div className="player-control">
              <select
                value={control}
                onChange={(e) => onControlChange(index, e.target.value as ControlType)}
                disabled={isRunning}
              >
                <option value={ControlType.WASD}>WASD</option>
                <option value={ControlType.IJKL}>IJKL</option>
                <option value={ControlType.ARROWS}>Arrows</option>
                <option value={ControlType.NUMPAD}>Numpad</option>
                <option value={ControlType.AI1}>AI Model 1</option>
                <option value={ControlType.AI2}>AI Model 2</option>
              </select>
            </div>
          </React.Fragment>
        ))}
      </div>
      
      <div className="start-button-container">
        <button 
          className={`start-button ${isRunning ? 'stop' : 'start'}`}
          onClick={onStartStop}
        >
          {isRunning ? 'Stop Game' : 'Start Game'}
        </button>
      </div>
      
      <style>{`
        .controls-menu {
          margin: 20px 0;
          max-width: 800px;
        }
        
        .controls-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 10px;
          margin-bottom: 20px;
        }
        
        .controls-header {
          font-weight: bold;
          padding: 10px;
          background-color: #333;
          color: white;
        }
        
        .player-label {
          padding: 8px;
          background-color: #f4f4f4;
        }
        
        .player-control {
          padding: 8px;
          background-color: #f4f4f4;
        }
        
        .player-control select {
          width: 100%;
          padding: 5px;
        }
        
        .start-button-container {
          display: flex;
          justify-content: center;
        }
        
        .start-button {
          padding: 12px 24px;
          font-size: 16px;
          font-weight: bold;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          transition: background-color 0.3s;
        }
        
        .start-button.start {
          background-color: #4CAF50;
          color: white;
        }
        
        .start-button.stop {
          background-color: #f44336;
          color: white;
        }
        
        .start-button:hover {
          opacity: 0.9;
        }
      `}</style>
    </div>
  );
};

export default ControlsMenu;

 