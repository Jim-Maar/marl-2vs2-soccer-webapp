import React, { useEffect, useRef, useState, useCallback } from 'react';
import { initBox2D, SoccerWorldManager, Helpers } from '../models/Box2DFactory';
import { useGameLoop } from '../hooks/useGameLoop';
import { useKeyboard } from '../hooks/useKeyboard';
import { useOnnxModel } from '../hooks/useOnnxModel';
import { generateObservation } from '../utils/observationUtils';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  PLAYER_SIZE,
  BALL_RADIUS,
  SPAWNING_RADIUS,
  PLAYER_DENSITY,
  PLAYER_FRICTION,
  BALL_DENSITY,
  BALL_FRICTION,
  BALL_RESTITUTION,
  WALL_THICKNESS,
  GOAL_WIDTH,
  PLAYER_SPEED,
  FPS,
  NO_OP,
  ControlType,
  PPM,
  WHITE,
  BLACK,
  RED,
  BLUE,
  GREEN
} from '../utils/constants';
import { KeyboardControlType } from '../hooks/useKeyboard';
import { Box2DType, GameState, PlayerData } from '../types';

// Debug Draw class for rendering similar to PhysicsSimulation.tsx
class CanvasDebugDraw {
  constructor(
    private readonly box2D: Box2DType,
    private readonly helpers: Helpers,
    private readonly context: CanvasRenderingContext2D,
    private readonly pixelsPerMeter: number
  ) {}

  static drawAxes(ctx: CanvasRenderingContext2D): void {
    ctx.strokeStyle = 'rgb(192,0,0)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(1, 0);
    ctx.stroke();
    ctx.strokeStyle = 'rgb(0,192,0)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(0, 1);
    ctx.stroke();
  }
  
  setColorFromDebugDrawCallback = (color_p: number): void => {
    const { wrapPointer, b2Color } = this.box2D;
    const col = wrapPointer(color_p, b2Color);
    const red = (col.get_r() * 255)|0;
    const green = (col.get_g() * 255)|0;
    const blue = (col.get_b() * 255)|0;
    const colStr = `${red},${green},${blue}`;
    this.context.fillStyle = `rgba(${colStr},0.5)`;
    this.context.strokeStyle = `rgb(${colStr})`;
  };

  drawSegment = (vert1_p: number, vert2_p: number): void => {
    const { wrapPointer, b2Vec2 } = this.box2D;
    const vert1V = wrapPointer(vert1_p, b2Vec2);
    const vert2V = wrapPointer(vert2_p, b2Vec2);                    
    this.context.beginPath();
    this.context.moveTo(vert1V.get_x(), vert1V.get_y());
    this.context.lineTo(vert2V.get_x(), vert2V.get_y());
    this.context.stroke();
  };
  
  drawPolygon = (vertices: number, vertexCount: number, fill: boolean): void => {
    const { wrapPointer, b2Vec2 } = this.box2D;
    this.context.beginPath();
    for(let i=0; i < vertexCount; i++) {
      const vert = wrapPointer(vertices+(i*8), b2Vec2);
      if (i === 0) {
        this.context.moveTo(vert.get_x(), vert.get_y());
      } else {
        this.context.lineTo(vert.get_x(), vert.get_y());
      }
    }
    this.context.closePath();
    if (fill) {
      this.context.fill();
    }
    this.context.stroke();
  };
  
  drawCircle = (center_p: number, radius: number, axis_p: number, fill: boolean): void => {
    const { wrapPointer, b2Vec2 } = this.box2D;
    const { copyVec2, scaledVec2 } = this.helpers;
    const centerV = wrapPointer(center_p, b2Vec2);
    const axisV = wrapPointer(axis_p, b2Vec2);
    
    this.context.beginPath();
    this.context.arc(centerV.get_x(), centerV.get_y(), radius, 0, 2 * Math.PI, false);
    if (fill) {
      this.context.fill();
    }
    this.context.stroke();
    
    if (fill) {
      // Render axis marker - fixed to use helper functions
      const vert2V = copyVec2(centerV);
      vert2V.op_add(scaledVec2(axisV, radius));
      this.context.beginPath();
      this.context.moveTo(centerV.get_x(), centerV.get_y());
      this.context.lineTo(vert2V.get_x(), vert2V.get_y());
      this.context.stroke();
    }
  };
  
  drawTransform = (transform_p: number): void => {
    const { wrapPointer, b2Transform } = this.box2D;
    const trans = wrapPointer(transform_p, b2Transform);
    const pos = trans.get_p();
    const rot = trans.get_q();
    
    this.context.save();
    this.context.translate(pos.get_x(), pos.get_y());
    this.context.scale(0.5, 0.5);
    this.context.rotate(rot.GetAngle());
    this.context.lineWidth *= 2;
    CanvasDebugDraw.drawAxes(this.context);
    this.context.restore();
  };

  drawPoint = (vec_p: number, sizeMetres: number, color_p: number): void => {
    const { wrapPointer, b2Vec2 } = this.box2D;
    const vert = wrapPointer(vec_p, b2Vec2);
    this.setColorFromDebugDrawCallback(color_p);
    const sizePixels = sizeMetres/this.pixelsPerMeter;
    this.context.fillRect(vert.get_x()-sizePixels/2, vert.get_y()-sizePixels/2, sizePixels, sizePixels);
  };

  constructJSDraw = (): Box2D.JSDraw => {
    const { JSDraw, b2Vec2, getPointer } = this.box2D;
    const debugDraw = Object.assign(new JSDraw(), {
      DrawSegment: (vert1_p: number, vert2_p: number, color_p: number): void => {
        this.setColorFromDebugDrawCallback(color_p);
        this.drawSegment(vert1_p, vert2_p);
      },
      DrawPolygon: (vertices: number, vertexCount: number, color_p: number): void => {
        this.setColorFromDebugDrawCallback(color_p);
        this.drawPolygon(vertices, vertexCount, false);
      },
      DrawSolidPolygon: (vertices: number, vertexCount: number, color_p: number): void => {
        this.setColorFromDebugDrawCallback(color_p);
        this.drawPolygon(vertices, vertexCount, true);
      },
      DrawCircle: (center_p: number, radius: number, color_p: number): void => {
        this.setColorFromDebugDrawCallback(color_p);
        const dummyAxis = new b2Vec2(0, 0);
        const dummyAxis_p = getPointer(dummyAxis);
        this.drawCircle(center_p, radius, dummyAxis_p, false);
      },
      DrawSolidCircle: (center_p: number, radius: number, axis_p: number, color_p: number): void => {
        this.setColorFromDebugDrawCallback(color_p);
        this.drawCircle(center_p, radius, axis_p, true);
      },
      DrawTransform: (transform_p: number): void => {
        this.drawTransform(transform_p);
      },
      DrawPoint: (vec_p: number, size: number, color_p: number): void => {
        this.drawPoint(vec_p, size, color_p);
      }
    });
    return debugDraw;
  };
}

interface SoccerGameProps {
  playerControls: ControlType[];
  isRunning: boolean;
  onScoreUpdate?: (score: [number, number]) => void;
}

const SoccerGame: React.FC<SoccerGameProps> = ({ 
  playerControls, 
  isRunning,
  onScoreUpdate
}) => {
  // References
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const worldManagerRef = useRef<SoccerWorldManager | null>(null);
  const box2dRef = useRef<Box2DType | null>(null);
  const debugDrawRef = useRef<Box2D.JSDraw | null>(null);
  const prevIsRunningRef = useRef(isRunning);
  const rafRef = useRef<number | null>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const previousTimeRef = useRef<number | null>(null);
  const accumulatorRef = useRef<number>(0);
  const fpsCounterRef = useRef<{ frames: number; time: number }>({ frames: 0, time: 0 });
  
  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [score, setScore] = useState<[number, number]>([0, 0]);
  const [fps, setFps] = useState<number>(0);

  console.log("SoccerGame: Rerendering");
  
  // ONNX Models
  const { 
    isLoading: isLoadingModels, 
    error: modelError, 
    getAction:  getAIAction,
    isReady: areModelsReady
  } = useOnnxModel({
    modelPath1: '/models/actor1.onnx',
    modelPath2: '/models/actor2.onnx'
  });
  
  // Keyboard controls
  const { getWASDAction, getIJKLAction, getArrowsAction, getNumpadAction } = useKeyboard();
  
  // Process player actions
  const processActions = useCallback(() => {
    if (!worldManagerRef.current || !isRunning) return;
    
    const actions: number[] = [];
    
    // Get actions for each player based on their control type
    for (let i = 0; i < 4; i++) {
      const controlType = playerControls[i];
      let action = NO_OP;
      
      switch (controlType) {
        case ControlType.WASD:
          action = getWASDAction(i);
          break;
        case ControlType.IJKL:
          action = getIJKLAction(i);
          break;
        case ControlType.ARROWS:
          action = getArrowsAction(i);
          break;
        case ControlType.NUMPAD:
          action = getNumpadAction(i);
          break;
        case ControlType.AI1:
        case ControlType.AI2:
          // Will be handled by processAIActions
          action = NO_OP;
          break;
      }
      
      actions.push(action);
    }
    
    // Apply human actions
    for (let i = 0; i < 4; i++) {
      const controlType = playerControls[i];
      if (controlType !== ControlType.AI1 && controlType !== ControlType.AI2) {
        worldManagerRef.current.applyPlayerAction(i, actions[i], PLAYER_SPEED);
      }
    }
    
    // Process AI actions asynchronously
    processAIActions();
  }, [playerControls, isRunning, getWASDAction, getIJKLAction, getArrowsAction, getNumpadAction]);
  
  // Process AI actions
  const processAIActions = useCallback(async () => {
    if (!worldManagerRef.current || !areModelsReady) return;
    
    const state = worldManagerRef.current.getGameState(GAME_WIDTH, GAME_HEIGHT);
    if (!state) return;
    
    // Process each player
    for (let i = 0; i < 4; i++) {
      const controlType = playerControls[i];
      
      // Only process AI-controlled players
      if (controlType === ControlType.AI1 || controlType === ControlType.AI2) {
        try {
          // Generate observation for this player
          const playerPositions = state.players.map(p => p.position);
          const playerVelocities = state.players.map(p => p.velocity);
          
          const observation = generateObservation(
            i,
            playerPositions,
            playerVelocities,
            state.ball.position,
            state.ball.velocity,
            GAME_WIDTH,
            GAME_HEIGHT
          );
          
          // Get AI action (model 1 or 2 based on control type)
          const modelNumber = controlType === ControlType.AI1 ? 1 : 2;
          const aiAction = await getAIAction(observation, modelNumber);
          
          // console.log("AI action:", aiAction);
          // Apply the action
          worldManagerRef.current.applyPlayerAction(i, aiAction, PLAYER_SPEED);
        } catch (err) {
          console.error(`Error getting AI action for player ${i}:`, err);
        }
      }
    }
  }, [playerControls, areModelsReady, getAIAction]);
  
  // Check for goals
  const checkGoal = useCallback(() => {
    if (!worldManagerRef.current) return;
    
    const goalScored = worldManagerRef.current.checkGoal(GAME_HEIGHT);
    if (goalScored !== -1) {
      // Update score
      const newScore: [number, number] = [...score];
      if (goalScored === 0) {
        // Ball entered top goal, Red team (bottom) scored
        newScore[0] += 1;
      } else if (goalScored === 1) {
        // Ball entered bottom goal, Blue team (top) scored
        newScore[1] += 1;
      }
      setScore(newScore);
      
      // Reset game state
      resetGame();
      
      // Call onScoreUpdate callback if provided
      if (onScoreUpdate) {
        onScoreUpdate(newScore);
      }
    }
  }, [score, onScoreUpdate]);
  
  // Reset the game (after a goal)
  const resetGame = useCallback(() => {
    if (!worldManagerRef.current) return;
    
    // Reset ball position
    worldManagerRef.current.resetBall(GAME_WIDTH, GAME_HEIGHT);
    
    // Reset player positions
    worldManagerRef.current.resetPlayers(
      GAME_WIDTH,
      GAME_HEIGHT,
      PLAYER_SIZE,
      SPAWNING_RADIUS
    );
  }, []);
  
  // Set up a new game
  const setupGame = useCallback(() => {
    console.log('SoccerGame: Setting up new game');
    if (!worldManagerRef.current) {
      console.log('SoccerGame: worldManager is null, cannot set up game');
      return;
    }
    
    // Create world
    worldManagerRef.current.createWorld();
    
    // Create boundaries
    worldManagerRef.current.createBoundaries(
      GAME_WIDTH, 
      GAME_HEIGHT, 
      WALL_THICKNESS, 
      GOAL_WIDTH
    );
    
    // Create players
    worldManagerRef.current.createPlayers(
      GAME_WIDTH,
      GAME_HEIGHT,
      PLAYER_SIZE,
      SPAWNING_RADIUS,
      PLAYER_DENSITY,
      PLAYER_FRICTION
    );
    
    // Create ball
    worldManagerRef.current.createBall(
      GAME_WIDTH,
      GAME_HEIGHT,
      BALL_RADIUS,
      BALL_DENSITY,
      BALL_FRICTION,
      BALL_RESTITUTION
    );
    
    // Reset score
    setScore([0, 0]);
    
    console.log('SoccerGame: Game setup complete');
  }, []);
  
  // Initialize Box2D and create a world manager
  useEffect(() => {
    const init = async () => {
      try {
        console.log('SoccerGame: Initializing Box2D');
        // Load Box2D
        setLoading(true);
        
        // Initialize Box2D
        console.log("SoccerGame: Loading Box2D...");
        const [box2d, helpers, worldManager] = await initBox2D();
        console.log("SoccerGame: Box2D initialized successfully");
        box2dRef.current = box2d;
        worldManagerRef.current = worldManager;
        
        setLoading(false);
      } catch (err) {
        console.error('SoccerGame: Error initializing Box2D:', err);
        setError('Failed to initialize physics engine. Please refresh the page.');
        setLoading(false);
      }
    };
    
    init();
    
    // Clean up references
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      
      if (worldManagerRef.current) {
        try {
          // Ensure all Box2D resources are properly cleaned up
          console.log('SoccerGame: Cleaning up Box2D resources');
          worldManagerRef.current.destroy();
          worldManagerRef.current = null;
        } catch (e) {
          console.error('Error destroying world manager:', e);
        }
      }
      
      // Clear other refs
      box2dRef.current = null;
      debugDrawRef.current = null;
    };
  }, []);
  
  // Set up canvas and debug draw
  useEffect(() => {
    if (loading || error || !canvasRef.current || !box2dRef.current || !worldManagerRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('SoccerGame: Failed to get 2D context from canvas');
      return;
    }
    
    const box2d = box2dRef.current;
    
    // Create helpers instance
    const helpers = new Helpers(box2d);
    
    // Canvas setup
    const pixelsPerMeter = PPM;
    
    // Create debug draw
    const debugDraw = new CanvasDebugDraw(box2d, helpers, ctx, pixelsPerMeter).constructJSDraw();
    debugDraw.SetFlags(box2d.b2Draw.e_shapeBit);
    debugDrawRef.current = debugDraw;
    
    // Set debug draw on world
    const worldManager = worldManagerRef.current;
    worldManager.setDebugDraw(debugDraw);
    
    console.log('SoccerGame: Debug draw set up on world manager');
    
    // Set up new game when isRunning changes
    if (isRunning && prevIsRunningRef.current !== isRunning) {
      setupGame();
    }
    
    // Draw the canvas function
    const drawCanvas = () => {
      // Black background
      ctx.fillStyle = BLACK;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.save();
      
      // Transform to match CanvasRenderer
      ctx.translate(0, canvas.height);
      ctx.scale(pixelsPerMeter, -pixelsPerMeter);
      ctx.lineWidth /= pixelsPerMeter;
      
      // Draw world using Box2D debug draw - for ball and dynamic objects physics
      worldManager.draw();
      
      // Draw boundaries with proper thickness
      const boundaries = worldManager.getBoundaryData();
      if (boundaries) {
        ctx.fillStyle = WHITE;
        
        // Draw all wall segments
        Object.entries(boundaries).forEach(([key, boundary]) => {
          // Adjust rendering position to match physics bodies
          let x = boundary.x;
          let y = boundary.y;
          
          // For the right wall, the physics position is at the edge, but we draw from the left side of the wall
          if (key === 'rightWall') {
            x = GAME_WIDTH - boundary.width;
          }
          
          ctx.fillRect(
            x,
            y,
            boundary.width,
            boundary.height
          );
        });
      }
      
      // Get game state for drawing players and ball
      if (worldManager) {
        const gameState = worldManager.getGameState(GAME_WIDTH, GAME_HEIGHT);
        if (gameState) {
          // Draw players with team colors
          if (gameState.players) {
            // Draw each player with team color
            gameState.players.forEach(player => {
              // Set color based on team
              ctx.fillStyle = player.team === 0 ? BLUE : RED;
              
              // Draw player rectangle
              const drawX = player.position.x - PLAYER_SIZE / 2;
              const drawY = player.position.y - PLAYER_SIZE / 2;
              
              ctx.fillRect(
                drawX,
                drawY,
                PLAYER_SIZE,
                PLAYER_SIZE
              );
            });
          }
          
          // Draw ball with white color
          if (gameState.ball) {
            ctx.fillStyle = WHITE;
            ctx.beginPath();
            ctx.arc(
              gameState.ball.position.x,
              gameState.ball.position.y,
              BALL_RADIUS,
              0,
              Math.PI * 2
            );
            ctx.fill();
          }
        }
      }
      
      ctx.restore();
      
      // Draw score directly on screen
      ctx.fillStyle = WHITE;
      ctx.font = '24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText(`Red ${score[0]} - ${score[1]} Blue`, canvas.width / 2, 30);
      
      // Draw FPS
      ctx.fillStyle = WHITE;
      ctx.font = '12px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(`FPS: ${fps}`, 10, 20);
    };
    
    // Animation loop with fixed timestep
    const animateFrame = (currentTime: number = performance.now()) => {
      if (!previousTimeRef.current) {
        previousTimeRef.current = currentTime;
        rafRef.current = requestAnimationFrame(animateFrame);
        return;
      }
      
      // Calculate elapsed time since last frame
      const deltaMs = currentTime - previousTimeRef.current;
      previousTimeRef.current = currentTime;
      
      // Cap delta time to avoid spiral of death if tab was in background
      const cappedDeltaMs = Math.min(deltaMs, 200);
      
      // Add elapsed time to accumulator
      accumulatorRef.current += cappedDeltaMs;
      
      // Fixed time step in milliseconds
      const fixedTimeStepMs = 1000 / FPS;
      
      // Track FPS
      fpsCounterRef.current.frames++;
      fpsCounterRef.current.time += deltaMs;
      if (fpsCounterRef.current.time >= 1000) {
        setFps(Math.round(fpsCounterRef.current.frames * 1000 / fpsCounterRef.current.time));
        fpsCounterRef.current.frames = 0;
        fpsCounterRef.current.time = 0;
      }
      
      // Run physics updates in fixed time steps
      let updatesPerformed = 0;
      while (accumulatorRef.current >= fixedTimeStepMs && updatesPerformed < 5) {
        if (isRunning && worldManagerRef.current) {
          // Get actions and process AI
          processActions();
          
          // Step the world with a fixed time step for consistent physics
          worldManagerRef.current.step(fixedTimeStepMs);
          
          // Check for goals
          checkGoal();
        }
        
        // Subtract fixed time step from accumulator
        accumulatorRef.current -= fixedTimeStepMs;
        updatesPerformed++;
      }
      
      // If we're still behind after max updates, reset accumulator to avoid spiral of death
      if (updatesPerformed >= 5 && accumulatorRef.current >= fixedTimeStepMs) {
        console.warn('SoccerGame: Too many physics updates needed, resetting accumulator');
        accumulatorRef.current = 0;
      }
      
      // Draw the canvas (happens every frame regardless of physics updates)
      drawCanvas();
      
      // Request next frame immediately
      rafRef.current = requestAnimationFrame(animateFrame);
    };
    
    // Start animation
    if (!rafRef.current) {
      rafRef.current = requestAnimationFrame(animateFrame);
    }
    
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      previousTimeRef.current = null;
      accumulatorRef.current = 0;
    };
  }, [loading, error, isRunning, prevIsRunningRef, setupGame, processActions, checkGoal, score, fps]);
  
  // Handle game starting/stopping
  useEffect(() => {
    // Only log if isRunning actually changed
    if (prevIsRunningRef.current !== isRunning) {
      console.log('SoccerGame: isRunning changed to:', isRunning);
      prevIsRunningRef.current = isRunning;
    }
    
    if (isRunning) {
      if (!worldManagerRef.current) {
        setupGame();
      } else {
        const state = worldManagerRef.current.getGameState(GAME_WIDTH, GAME_HEIGHT);
        const hasPlayers = state && state.players.length > 0;
        
        if (!hasPlayers) {
          setupGame();
        }
      }
    } else {
      // Clean up animation when game is paused
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    }
  }, [isRunning, setupGame]);
  
  // Combine all error states
  const combinedError = error || modelError;
  const isLoadingAny = loading || isLoadingModels;
  
  return (
    <div className="soccer-game">
      {isLoadingAny ? (
        <div className="loading">Loading game...</div>
      ) : combinedError ? (
        <div className="error">
          <h3>Error:</h3>
          <p>{combinedError}</p>
        </div>
      ) : (
        <canvas
          ref={canvasRef}
          width={SCREEN_WIDTH}
          height={SCREEN_HEIGHT}
          className="game-canvas"
        />
      )}
      
      <style>{`
        .soccer-game {
          display: flex;
          justify-content: center;
          margin: 20px 0;
        }
        
        .game-canvas {
          border: 2px solid #333;
          border-radius: 4px;
          background-color: #000;
          max-width: 100%;
          height: auto;
        }
        
        .loading, .error {
          padding: 40px;
          text-align: center;
          background-color: #f5f5f5;
          border-radius: 8px;
          width: ${SCREEN_WIDTH}px;
          height: ${SCREEN_HEIGHT}px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        }
        
        .error {
          color: #d32f2f;
        }
      `}</style>
    </div>
  );
};

export default SoccerGame; 