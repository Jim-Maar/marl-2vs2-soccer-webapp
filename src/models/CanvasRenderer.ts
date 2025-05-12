import {
  SCREEN_WIDTH,
  SCREEN_HEIGHT,
  GAME_WIDTH,
  GAME_HEIGHT,
  PPM,
  WHITE,
  BLACK,
  RED,
  BLUE,
  GREEN,
  WALL_THICKNESS,
  GOAL_WIDTH,
  PLAYER_SIZE,
  BALL_RADIUS
} from '../utils/constants';

import { GameState } from '../types';

// Class to handle rendering the soccer game on canvas
export class CanvasRenderer {
  private ctx: CanvasRenderingContext2D;
  private canvasWidth: number;
  private canvasHeight: number;
  private pixelsPerMeter: number;
  
  constructor(ctx: CanvasRenderingContext2D, width?: number, height?: number) {
    this.ctx = ctx;
    this.canvasWidth = width || SCREEN_WIDTH;
    this.canvasHeight = height || SCREEN_HEIGHT;
    this.pixelsPerMeter = Math.min(this.canvasWidth / GAME_WIDTH, this.canvasHeight / GAME_HEIGHT);
  }
  
  // Update canvas dimensions
  updateDimensions(width: number, height: number) {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.pixelsPerMeter = Math.min(this.canvasWidth / GAME_WIDTH, this.canvasHeight / GAME_HEIGHT);
  }
  
  // Clear the canvas with black background
  clear() {
    this.ctx.fillStyle = BLACK;
    this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
  }
  
  // Draw boundaries/walls
  drawWalls(boundaries: any) {
    this.ctx.save();
    
    // Transform to game coordinates
    this.ctx.translate(0, this.canvasHeight);
    this.ctx.scale(this.pixelsPerMeter, -this.pixelsPerMeter);
    
    // Draw walls
    this.ctx.fillStyle = WHITE;
    
    if (boundaries) {
      // Draw the walls directly from boundary data
      Object.entries(boundaries).forEach(([key, boundary]: [string, any]) => {
        // Adjust rendering position to match physics bodies
        let x = boundary.x;
        let y = boundary.y;
        
        // For the right wall, the physics position is at the edge, but we draw from the left side of the wall
        if (key.includes('right')) {
          x = GAME_WIDTH - boundary.width;
        }
        
        this.ctx.fillRect(
          x,
          y,
          boundary.width,
          boundary.height
        );
      });
    } else {
      // Fallback if boundary data is not available
      // Left wall - full height
      this.ctx.fillRect(0, 0, WALL_THICKNESS, GAME_HEIGHT);
      
      // Right wall - full height
      this.ctx.fillRect(GAME_WIDTH - WALL_THICKNESS, 0, WALL_THICKNESS, GAME_HEIGHT);
      
      // Calculate goal position
      const goalWidth = GOAL_WIDTH;
      const wallWidth = (GAME_WIDTH - goalWidth) / 2;
      
      // Bottom wall with goal opening
      this.ctx.fillRect(0, 0, wallWidth, WALL_THICKNESS); // Left part
      this.ctx.fillRect(wallWidth + goalWidth, 0, wallWidth, WALL_THICKNESS); // Right part
      
      // Top wall with goal opening
      this.ctx.fillRect(0, GAME_HEIGHT - WALL_THICKNESS, wallWidth, WALL_THICKNESS); // Left part
      this.ctx.fillRect(wallWidth + goalWidth, GAME_HEIGHT - WALL_THICKNESS, wallWidth, WALL_THICKNESS); // Right part
    }
    
    this.ctx.restore();
  }
  
  // Draw the players as simple rectangles
  drawPlayers(players: GameState['players']) {
    this.ctx.save();
    
    // Transform to game coordinates
    this.ctx.translate(0, this.canvasHeight);
    this.ctx.scale(this.pixelsPerMeter, -this.pixelsPerMeter);
    
    players.forEach(player => {
      // Get player color based on team
      const color = player.team === 0 ? BLUE : RED;
      
      // Draw player as a square
      this.ctx.fillStyle = color;
      
      // Calculate screen coordinates for player drawing
      const drawX = player.position.x - PLAYER_SIZE / 2;
      const drawY = player.position.y - PLAYER_SIZE / 2;
      
      this.ctx.fillRect(
        drawX,
        drawY,
        PLAYER_SIZE,
        PLAYER_SIZE
      );
    });
    
    this.ctx.restore();
  }
  
  // Draw the ball as a simple circle
  drawBall(ballPosition: GameState['ball']['position']) {
    this.ctx.save();
    
    // Transform to game coordinates
    this.ctx.translate(0, this.canvasHeight);
    this.ctx.scale(this.pixelsPerMeter, -this.pixelsPerMeter);
    
    // Draw ball as a circle
    this.ctx.fillStyle = WHITE;
    this.ctx.beginPath();
    this.ctx.arc(
      ballPosition.x,
      ballPosition.y,
      BALL_RADIUS,
      0,
      Math.PI * 2
    );
    this.ctx.fill();
    
    this.ctx.restore();
  }
  
  // Draw score - scaled with window size
  drawScore(score: [number, number]) {
    this.ctx.save();
    
    // Scale font size based on canvas width
    const fontSize = Math.max(12, Math.min(24, this.canvasWidth / 25));
    
    this.ctx.fillStyle = WHITE;
    this.ctx.font = `${fontSize}px Arial`;
    this.ctx.textAlign = 'center';
    
    // Team names and scores - positioned at the top with minimal margin
    this.ctx.fillText(
      `Red ${score[0]} - ${score[1]} Blue`,
      this.canvasWidth / 2,
      fontSize + 5 // Just enough margin from the top
    );
    
    this.ctx.restore();
  }
  
  // Draw entire game state - simplified version
  drawGame(gameState: GameState, fps: number, worldManager?: any) {
    // Clear with black background
    this.clear();
    
    // Get boundaries from the world manager if available
    const boundaries = worldManager?.getBoundaryData();
    
    // Draw walls
    this.drawWalls(boundaries);
    
    // Draw players
    this.drawPlayers(gameState.players);
    
    // Draw ball
    this.drawBall(gameState.ball.position);
    
    // Draw score
    this.drawScore(gameState.score);
    
    // FPS display removed as requested
  }
} 