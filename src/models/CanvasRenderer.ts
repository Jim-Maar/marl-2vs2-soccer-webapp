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
  
  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
    this.canvasWidth = SCREEN_WIDTH;
    this.canvasHeight = SCREEN_HEIGHT;
    this.pixelsPerMeter = PPM;
  }
  
  // Clear the canvas
  clear() {
    console.log('CanvasRenderer: Clearing canvas with color:', BLACK);
    this.ctx.fillStyle = BLACK;
    this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight);
  }
  
  // Draw the field (boundaries, goals, etc.)
  drawField() {
    console.log('CanvasRenderer: drawField called, canvas dimensions:', 
      {width: this.canvasWidth, height: this.canvasHeight, pixelsPerMeter: this.pixelsPerMeter}
    );
    
    this.ctx.save();
    
    // New coordinate system for horizontal field with lower left at bottom left of canvas
    console.log('CanvasRenderer: Transforming coordinates for field');
    
    // Move to bottom-left of canvas
    this.ctx.translate(0, this.canvasHeight);
    
    // Scale with Y flipped (positive Y goes up)
    this.ctx.scale(this.pixelsPerMeter, -this.pixelsPerMeter);
    
    console.log('CanvasRenderer: After transformation, game dimensions:', 
      {gameWidth: GAME_WIDTH, gameHeight: GAME_HEIGHT}
    );
    
    // Draw field background
    this.ctx.fillStyle = "rgb(25, 105, 25)";
    this.ctx.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    console.log('CanvasRenderer: Drew field background rect at:', 
      {x: 0, y: 0, width: GAME_WIDTH, height: GAME_HEIGHT}
    );
    
    // Draw field lines
    this.ctx.strokeStyle = WHITE;
    this.ctx.lineWidth = 0.1;
    
    // Center line
    this.ctx.beginPath();
    this.ctx.moveTo(GAME_WIDTH / 2, 0);
    this.ctx.lineTo(GAME_WIDTH / 2, GAME_HEIGHT);
    this.ctx.stroke();
    
    // Center circle
    this.ctx.beginPath();
    this.ctx.arc(GAME_WIDTH / 2, GAME_HEIGHT / 2, 5, 0, Math.PI * 2);
    this.ctx.stroke();
    
    // Draw walls
    this.ctx.fillStyle = WHITE;
    
    // Bottom wall (y = 0 in our physics/game coordinates)
    this.ctx.fillRect(0, 0, GAME_WIDTH, WALL_THICKNESS);
    
    // Top wall (y = GAME_HEIGHT - WALL_THICKNESS)
    this.ctx.fillRect(0, GAME_HEIGHT - WALL_THICKNESS, GAME_WIDTH, WALL_THICKNESS);
    
    // Draw left wall
    this.ctx.fillRect(0, 0, WALL_THICKNESS, GAME_HEIGHT);
    
    // Draw right wall
    this.ctx.fillRect(GAME_WIDTH - WALL_THICKNESS, 0, WALL_THICKNESS, GAME_HEIGHT);
    
    // Draw goal openings
    const goalLeftPos = (GAME_HEIGHT - GOAL_WIDTH) / 2;
    const goalRightPos = goalLeftPos;
    
    // Clear left goal opening
    this.ctx.clearRect(0, goalLeftPos, WALL_THICKNESS, GOAL_WIDTH);
    
    // Clear right goal opening
    this.ctx.clearRect(GAME_WIDTH - WALL_THICKNESS, goalRightPos, WALL_THICKNESS, GOAL_WIDTH);
    
    // Draw goal lines
    this.ctx.strokeStyle = GREEN;
    this.ctx.lineWidth = 0.2;
    
    // Left goal line
    this.ctx.beginPath();
    this.ctx.moveTo(0, goalLeftPos);
    this.ctx.lineTo(0, goalLeftPos + GOAL_WIDTH);
    this.ctx.stroke();
    
    // Right goal line
    this.ctx.beginPath();
    this.ctx.moveTo(GAME_WIDTH, goalRightPos);
    this.ctx.lineTo(GAME_WIDTH, goalRightPos + GOAL_WIDTH);
    this.ctx.stroke();
    
    this.ctx.restore();
  }
  
  // Draw the players
  drawPlayers(players: GameState['players']) {
    console.log('CanvasRenderer: drawPlayers called with', players.length, 'players');
    this.ctx.save();
    
    // Same coordinate system as drawField
    this.ctx.translate(0, this.canvasHeight);
    this.ctx.scale(this.pixelsPerMeter, -this.pixelsPerMeter);
    
    players.forEach(player => {
      // Get player color based on team
      const color = player.team === 0 ? RED : BLUE;
      
      // Draw player as a square
      this.ctx.fillStyle = color;
      
      // Calculate screen coordinates for player drawing
      const drawX = player.position.x - PLAYER_SIZE / 2;
      const drawY = player.position.y - PLAYER_SIZE / 2;
      
      console.log(`CanvasRenderer: Drawing player ${player.id} (Team ${player.team}) at`, 
        `game pos (${player.position.x.toFixed(2)}, ${player.position.y.toFixed(2)})`,
        `-> canvas pos (${drawX.toFixed(2)}, ${drawY.toFixed(2)}), size: ${PLAYER_SIZE}`
      );
      
      this.ctx.fillRect(
        drawX,
        drawY,
        PLAYER_SIZE,
        PLAYER_SIZE
      );
      
      // Draw player number
      this.ctx.fillStyle = WHITE;
      this.ctx.font = '1px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(
        (player.id + 1).toString(),
        player.position.x,
        player.position.y
      );
    });
    
    this.ctx.restore();
  }
  
  // Draw the ball
  drawBall(ballPosition: GameState['ball']['position']) {
    console.log('CanvasRenderer: drawBall called with position:',
      `x=${ballPosition.x.toFixed(2)}, y=${ballPosition.y.toFixed(2)}`);
    this.ctx.save();
    
    // Same coordinate system as drawField
    this.ctx.translate(0, this.canvasHeight);
    this.ctx.scale(this.pixelsPerMeter, -this.pixelsPerMeter);
    
    console.log('CanvasRenderer: Drawing ball at', 
      `game pos (${ballPosition.x.toFixed(2)}, ${ballPosition.y.toFixed(2)})`,
      `radius: ${BALL_RADIUS}`
    );
    
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
  
  // Draw score
  drawScore(score: [number, number]) {
    this.ctx.save();
    
    this.ctx.fillStyle = WHITE;
    this.ctx.font = '24px Arial';
    this.ctx.textAlign = 'center';
    
    // Team names and scores
    this.ctx.fillText(
      `Red ${score[0]} - ${score[1]} Blue`,
      this.canvasWidth / 2,
      30
    );
    
    this.ctx.restore();
  }
  
  // Draw FPS counter
  drawFPS(fps: number) {
    this.ctx.save();
    
    this.ctx.fillStyle = WHITE;
    this.ctx.font = '12px Arial';
    this.ctx.textAlign = 'left';
    this.ctx.fillText(`FPS: ${fps}`, 10, 20);
    
    this.ctx.restore();
  }
  
  // Draw entire game state
  drawGame(gameState: GameState, fps: number) {
    console.log('CanvasRenderer: drawGame called with state:', 
      {
        playerCount: gameState.players.length,
        ballPosition: gameState.ball.position,
        score: gameState.score,
        fps
      }
    );
    
    this.clear();
    console.log('CanvasRenderer: Canvas cleared');
    
    this.drawField();
    console.log('CanvasRenderer: Field drawn');
    
    this.drawPlayers(gameState.players);
    console.log('CanvasRenderer: Players drawn, count:', gameState.players.length);
    console.log('CanvasRenderer: Player positions:', gameState.players.map(p => 
      `Player ${p.id} (Team ${p.team}): x=${p.position.x.toFixed(2)}, y=${p.position.y.toFixed(2)}`
    ));
    
    this.drawBall(gameState.ball.position);
    console.log('CanvasRenderer: Ball drawn at position:', 
      `x=${gameState.ball.position.x.toFixed(2)}, y=${gameState.ball.position.y.toFixed(2)}`
    );
    
    this.drawScore(gameState.score);
    console.log('CanvasRenderer: Score drawn:', gameState.score);
    
    this.drawFPS(fps);
    console.log('CanvasRenderer: FPS drawn:', fps);
  }
} 