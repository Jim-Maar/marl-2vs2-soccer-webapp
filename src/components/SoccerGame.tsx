import React, { useEffect, useRef, useState, useCallback } from 'react';
import { initBox2D, SoccerWorldFactory } from '../models/Box2DFactory';
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
    const centerV = wrapPointer(center_p, b2Vec2);
    const axisV = wrapPointer(axis_p, b2Vec2);
    
    this.context.beginPath();
    this.context.arc(centerV.get_x(), centerV.get_y(), radius, 0, 2 * Math.PI, false);
    if (fill) {
      this.context.fill();
    }
    this.context.stroke();
    
    if (fill) {
      // Render axis marker
      const vert2V = wrapPointer(center_p, b2Vec2);
      const x = centerV.get_x() + axisV.get_x() * radius;
      const y = centerV.get_y() + axisV.get_y() * radius;
      this.context.beginPath();
      this.context.moveTo(centerV.get_x(), centerV.get_y());
      this.context.lineTo(x, y);
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
  const worldFactoryRef = useRef<SoccerWorldFactory | null>(null);
  const box2dRef = useRef<Box2DType | null>(null);
  const debugDrawRef = useRef<Box2D.JSDraw | null>(null);
  const prevIsRunningRef = useRef(isRunning);
  const animationRef = useRef<number | null>(null);
  
  // State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [score, setScore] = useState<[number, number]>([0, 0]);
  const [fps, setFps] = useState<number>(0);
  
  // ONNX Models
  const { 
    isLoading: isLoadingModels, 
    error: modelError, 
    getAction: getAIAction,
    isReady: areModelsReady
  } = useOnnxModel({
    modelPath1: '/models/actor1.onnx',
    modelPath2: '/models/actor2.onnx'
  });
  
  // Keyboard controls
  const { getWASDAction, getIJKLAction, getArrowsAction, getNumpadAction } = useKeyboard();
  
  // Initialize Box2D and set up the game
  useEffect(() => {
    const init = async () => {
      try {
        setLoading(true);
        
        // Initialize Box2D
        console.log("SoccerGame: Loading Box2D...");
        const [box2d, helpers, worldFactory] = await initBox2D();
        console.log("SoccerGame: Box2D initialized successfully");
        box2dRef.current = box2d;
        worldFactoryRef.current = worldFactory;
        
        setLoading(false);
      } catch (err) {
        console.error('Failed to initialize game:', err);
        setError(`Game initialization failed: ${err instanceof Error ? err.message : String(err)}`);
        setLoading(false);
      }
    };
    
    init();
    
    // Cleanup when component unmounts
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
      if (worldFactoryRef.current) {
        worldFactoryRef.current.destroy();
      }
    };
  }, []);
  
  // Set up canvas and debug draw
  useEffect(() => {
    if (loading || error || !canvasRef.current || !box2dRef.current || !worldFactoryRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.error('SoccerGame: Failed to get 2D context from canvas');
      return;
    }
    
    const box2d = box2dRef.current;
    
    // Canvas setup - following PhysicsSimulation.tsx
    const pixelsPerMeter = PPM;
    const canvasOffset = {
      x: canvas.width / 2,
      y: canvas.height / 2
    };
    
    // Create debug draw
    const debugDraw = new CanvasDebugDraw(box2d, ctx, pixelsPerMeter).constructJSDraw();
    debugDraw.SetFlags(box2d.b2Draw.e_shapeBit);
    debugDrawRef.current = debugDraw;
    
    // Set debug draw on world
    const worldFactory = worldFactoryRef.current;
    worldFactory.setDebugDraw(debugDraw);
    
    console.log('SoccerGame: Debug draw set up on world factory');
    
    // Set up new game when isRunning changes
    if (isRunning && prevIsRunningRef.current !== isRunning) {
      setupGame();
    }
    
    // Drawing function
    const drawCanvas = () => {
      // Black background
      ctx.fillStyle = BLACK;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.save();
      
      // Transform like PhysicsSimulation.tsx
      ctx.translate(canvasOffset.x, canvasOffset.y);
      ctx.scale(pixelsPerMeter, -pixelsPerMeter); // Flip Y axis
      ctx.lineWidth /= pixelsPerMeter;
      
      // Draw world using Box2D debug draw
      worldFactory.draw();
      
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
    
    // Store the draw function for the animation loop
    const animateFrame = (prevTime: number = performance.now()) => {
      const currentTime = performance.now();
      const deltaTime = (currentTime - prevTime) / 1000; // Convert to seconds
      
      if (isRunning && worldFactoryRef.current) {
        // Get actions and process AI
        processActions();
        
        // Step the world
        worldFactoryRef.current.step(deltaTime);
        
        // Check for goals
        checkGoal();
      }
      
      // Draw the canvas
      drawCanvas();
      
      // Calculate FPS
      setFps(Math.round(1 / deltaTime));
      
      // Request next frame
      animationRef.current = requestAnimationFrame(() => animateFrame(currentTime));
    };
    
    // Start animation
    if (!animationRef.current) {
      animationRef.current = requestAnimationFrame(() => animateFrame());
    }
    
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [loading, error, isRunning]);
  
  // Set up a new game
  const setupGame = useCallback(() => {
    console.log('SoccerGame: Setting up new game');
    if (!worldFactoryRef.current) {
      console.log('SoccerGame: worldFactory is null, cannot set up game');
      return;
    }
    
    // Create world
    worldFactoryRef.current.createWorld();
    
    // Create boundaries
    worldFactoryRef.current.createBoundaries(
      GAME_WIDTH, 
      GAME_HEIGHT, 
      WALL_THICKNESS, 
      GOAL_WIDTH
    );
    
    // Create players
    worldFactoryRef.current.createPlayers(
      GAME_WIDTH,
      GAME_HEIGHT,
      PLAYER_SIZE,
      SPAWNING_RADIUS,
      PLAYER_DENSITY,
      PLAYER_FRICTION
    );
    
    // Create ball
    worldFactoryRef.current.createBall(
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
  
  // Reset the game (after a goal)
  const resetGame = useCallback(() => {
    if (!worldFactoryRef.current) return;
    
    // Reset ball position
    worldFactoryRef.current.resetBall(GAME_WIDTH, GAME_HEIGHT);
  }, []);
  
  // Process player actions
  const processActions = useCallback(() => {
    if (!worldFactoryRef.current || !isRunning) return;
    
    const actions: number[] = [];
    
    // Get actions for each player based on their control type
    for (let i = 0; i < 4; i++) {
      const controlType = playerControls[i];
      let action = NO_OP;
      
      switch (controlType) {
        case ControlType.WASD:
          action = getWASDAction();
          break;
        case ControlType.IJKL:
          action = getIJKLAction();
          break;
        case ControlType.ARROWS:
          action = getArrowsAction();
          break;
        case ControlType.NUMPAD:
          action = getNumpadAction();
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
        worldFactoryRef.current.applyPlayerAction(i, actions[i], PLAYER_SPEED);
      }
    }
    
    // Process AI actions asynchronously
    processAIActions();
  }, [playerControls, isRunning, getWASDAction, getIJKLAction, getArrowsAction, getNumpadAction]);
  
  // Process AI actions
  const processAIActions = useCallback(async () => {
    if (!worldFactoryRef.current || !areModelsReady) return;
    
    const state = worldFactoryRef.current.getGameState(GAME_WIDTH, GAME_HEIGHT);
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
          
          // Apply the action
          worldFactoryRef.current.applyPlayerAction(i, aiAction, PLAYER_SPEED);
        } catch (err) {
          console.error(`Error getting AI action for player ${i}:`, err);
        }
      }
    }
  }, [playerControls, areModelsReady, getAIAction]);
  
  // Check for goals
  const checkGoal = useCallback(() => {
    if (!worldFactoryRef.current) return;
    
    const goalScored = worldFactoryRef.current.checkGoal(GAME_HEIGHT);
    if (goalScored !== -1) {
      // Update score
      const newScore: [number, number] = [...score];
      if (goalScored === 0 || goalScored === 1) {
        newScore[goalScored] += 1;
      }
      setScore(newScore);
      
      // Reset ball position
      resetGame();
    }
  }, [score, resetGame]);
  
  // Handle game starting/stopping
  useEffect(() => {
    // Only log if isRunning actually changed
    if (prevIsRunningRef.current !== isRunning) {
      console.log('SoccerGame: isRunning changed to:', isRunning);
      prevIsRunningRef.current = isRunning;
    }
    
    if (isRunning) {
      if (!worldFactoryRef.current) {
        setupGame();
      } else {
        const state = worldFactoryRef.current.getGameState(GAME_WIDTH, GAME_HEIGHT);
        const hasPlayers = state && state.players.length > 0;
        
        if (!hasPlayers) {
          setupGame();
        }
      }
    }
  }, [isRunning, setupGame]);
  
  // Handle score update
  useEffect(() => {
    if (onScoreUpdate) {
      onScoreUpdate(score);
    }
  }, [score, onScoreUpdate]);
  
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