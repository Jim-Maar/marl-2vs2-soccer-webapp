import React, { useState, useEffect, useCallback, useRef } from 'react';
import './App.css';
import Header from './components/Header';
import GameDescription from './components/GameDescription';
import ControlsMenu from './components/ControlsMenu';
import SoccerGame from './components/SoccerGame';
import { ControlType } from './utils/constants';

function App() {
  // Game state
  const [isRunning, setIsRunning] = useState(false);
  const [score, setScore] = useState<[number, number]>([0, 0]);
  const [playerControls, setPlayerControls] = useState<ControlType[]>([
    ControlType.WASD,  // Player 0 (Red team, left)
    ControlType.AI1,   // Player 1 (Red team, right)
    ControlType.AI1,   // Player 2 (Blue team, left)
    ControlType.AI1    // Player 3 (Blue team, right)
  ]);
  
  // Ref to track previous isRunning state
  const prevIsRunningRef = useRef(isRunning);
  
  // Add logging for isRunning state changes only when it actually changes
  useEffect(() => {
    if (prevIsRunningRef.current !== isRunning) {
      console.log('App: isRunning state changed to:', isRunning);
      prevIsRunningRef.current = isRunning;
    }
  }, [isRunning]);
  
  // Handle control change
  const handleControlChange = useCallback((playerIndex: number, controlType: ControlType) => {
    setPlayerControls(prevControls => {
      // Only update if there's an actual change
      if (prevControls[playerIndex] === controlType) {
        return prevControls;
      }
      const newControls = [...prevControls];
      newControls[playerIndex] = controlType;
      return newControls;
    });
  }, []);
  
  // Handle start/stop game
  const handleStartStop = useCallback(() => {
    console.log('App: Start/Stop button clicked. Current isRunning:', isRunning);
    setIsRunning(prev => !prev);
  }, [isRunning]);
  
  // Handle score update
  const handleScoreUpdate = useCallback((newScore: [number, number]) => {
    setScore(prevScore => {
      // Only update if there's an actual change
      if (prevScore[0] === newScore[0] && prevScore[1] === newScore[1]) {
        return prevScore;
      }
      return newScore;
    });
  }, []);
  
  return (
    <div className="App">
      <div className="container">
        <Header />
        
        <GameDescription />
        
        <ControlsMenu 
          playerControls={playerControls} 
          onControlChange={handleControlChange} 
          onStartStop={handleStartStop}
          isRunning={isRunning}
        />
        
        <SoccerGame
          playerControls={playerControls}
          isRunning={isRunning}
          onScoreUpdate={handleScoreUpdate}
        />
      </div>

      <style>{`
        .container {
          max-width: 1200px;
          margin: 0 auto;
          padding: 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
      `}</style>
    </div>
  );
}

export default App;
