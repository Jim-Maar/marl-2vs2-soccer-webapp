import { useState, useRef, useEffect, useCallback } from 'react';
import { FPS } from '../utils/constants';

type GameLoopCallback = (deltaTime: number) => void;

export const useGameLoop = (callback: GameLoopCallback, isRunning: boolean) => {
  const [fps, setFps] = useState(0);
  const requestRef = useRef<number | null>(null);
  const previousTimeRef = useRef<number | null>(null);
  const fpsCounterRef = useRef<{ frames: number; time: number }>({
    frames: 0,
    time: 0
  });
  
  // Track previous isRunning state to avoid redundant logging
  const prevIsRunningRef = useRef(isRunning);

  const animate = useCallback((time: number) => {
    if (previousTimeRef.current !== null) {
      const deltaTime = time - previousTimeRef.current;
      
      // Cap delta time to avoid large jumps if the tab was in background
      const cappedDeltaTime = Math.min(deltaTime, 1000 / 10); // Cap at 10 FPS minimum
      
      // Run the game loop
      callback(cappedDeltaTime / 1000); // Convert to seconds
      
      // Update FPS counter
      fpsCounterRef.current.frames += 1;
      fpsCounterRef.current.time += deltaTime;
      
      if (fpsCounterRef.current.time >= 1000) {
        setFps(Math.round(fpsCounterRef.current.frames * 1000 / fpsCounterRef.current.time));
        fpsCounterRef.current.frames = 0;
        fpsCounterRef.current.time = 0;
      }
    }
    
    previousTimeRef.current = time;
    requestRef.current = requestAnimationFrame(animate);
  }, [callback]);

  useEffect(() => {
    // Only log when isRunning actually changes
    if (prevIsRunningRef.current !== isRunning) {
      console.log('useGameLoop: isRunning changed to:', isRunning);
      prevIsRunningRef.current = isRunning;
    }
    
    if (isRunning) {
      if (!requestRef.current) {
        console.log('useGameLoop: Starting game loop');
        requestRef.current = requestAnimationFrame(animate);
      }
      
      return () => {
        if (requestRef.current) {
          cancelAnimationFrame(requestRef.current);
          requestRef.current = null;
        }
      };
    } else {
      if (requestRef.current) {
        console.log('useGameLoop: Stopping game loop');
        cancelAnimationFrame(requestRef.current);
        requestRef.current = null;
        previousTimeRef.current = null;
      }
    }
  }, [isRunning, animate]);

  return { fps };
}; 