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
    
    // Set the coordinate system for horizontal field
    // Rotate from vertical game logic to horizontal display
    console.log('CanvasRenderer: Transforming coordinates for field');
    console.log('CanvasRenderer: Original canvas center:', 
      {x: this.canvasWidth / 2, y: this.canvasHeight / 2}
    );
    
    this.ctx.translate(this.canvasWidth / 2, this.canvasHeight / 2);
    this.ctx.rotate(-Math.PI / 2); // Rotate 90 degrees counter-clockwise
    this.ctx.scale(this.pixelsPerMeter, this.pixelsPerMeter);
    this.ctx.translate(-GAME_HEIGHT / 2, -GAME_WIDTH / 2);
    
    console.log('CanvasRenderer: After transformation, game dimensions:', 
      {gameWidth: GAME_WIDTH, gameHeight: GAME_HEIGHT}
    );
    
    // Draw field background
    this.ctx.fillStyle = "rgb(25, 105, 25)";
    this.ctx.fillRect(0, 0, GAME_HEIGHT, GAME_WIDTH);
    console.log('CanvasRenderer: Drew field background rect at:', 
      {x: 0, y: 0, width: GAME_HEIGHT, height: GAME_WIDTH}
    );
    
    // Draw field lines
    this.ctx.strokeStyle = WHITE;
    this.ctx.lineWidth = 0.1;
    
    // Center line
    this.ctx.beginPath();
    this.ctx.moveTo(GAME_HEIGHT / 2, 0);
    this.ctx.lineTo(GAME_HEIGHT / 2, GAME_WIDTH);
    this.ctx.stroke();
    
    // Center circle
    this.ctx.beginPath();
    this.ctx.arc(GAME_HEIGHT / 2, GAME_WIDTH / 2, 5, 0, Math.PI * 2);
    this.ctx.stroke();
    
    // Draw walls
    this.ctx.fillStyle = WHITE;
    
    // Left wall (top in original game)
    this.ctx.fillRect(0, 0, WALL_THICKNESS, GAME_WIDTH);
    
    // Right wall (bottom in original game)
    this.ctx.fillRect(GAME_HEIGHT - WALL_THICKNESS, 0, WALL_THICKNESS, GAME_WIDTH);
    
    // Draw top wall (left in original)
    const goalLeftPos = (GAME_WIDTH - GOAL_WIDTH) / 2;
    this.ctx.fillRect(0, 0, GAME_HEIGHT, WALL_THICKNESS);
    this.ctx.clearRect(0, goalLeftPos, WALL_THICKNESS, GOAL_WIDTH); // Goal opening
    
    // Draw bottom wall (right in original)
    const goalRightPos = (GAME_WIDTH - GOAL_WIDTH) / 2;
    this.ctx.fillRect(0, GAME_WIDTH - WALL_THICKNESS, GAME_HEIGHT, WALL_THICKNESS);
    this.ctx.clearRect(GAME_HEIGHT - WALL_THICKNESS, goalRightPos, WALL_THICKNESS, GOAL_WIDTH); // Goal opening
    
    // Draw goal lines
    this.ctx.strokeStyle = GREEN;
    this.ctx.lineWidth = 0.2;
    
    // Left goal line (top in original)
    this.ctx.beginPath();
    this.ctx.moveTo(0, goalLeftPos);
    this.ctx.lineTo(0, goalLeftPos + GOAL_WIDTH);
    this.ctx.stroke();
    
    // Right goal line (bottom in original)
    this.ctx.beginPath();
    this.ctx.moveTo(GAME_HEIGHT, goalRightPos);
    this.ctx.lineTo(GAME_HEIGHT, goalRightPos + GOAL_WIDTH);
    this.ctx.stroke();
    
    this.ctx.restore();
  }
  
  // Draw the players
  drawPlayers(players: GameState['players']) {
    console.log('CanvasRenderer: drawPlayers called with', players.length, 'players');
    this.ctx.save();
    
    // Set the coordinate system for horizontal field
    this.ctx.translate(this.canvasWidth / 2, this.canvasHeight / 2);
    this.ctx.rotate(-Math.PI / 2); // Rotate 90 degrees counter-clockwise
    this.ctx.scale(this.pixelsPerMeter, this.pixelsPerMeter);
    this.ctx.translate(-GAME_HEIGHT / 2, -GAME_WIDTH / 2);
    
    players.forEach(player => {
      // Get player color based on team
      const color = player.team === 0 ? RED : BLUE;
      
      // Draw player as a square
      this.ctx.fillStyle = color;
      
      // Calculate screen coordinates for player drawing
      const drawX = player.position.y - PLAYER_SIZE / 2; // Note: x and y are swapped due to rotation
      const drawY = player.position.x - PLAYER_SIZE / 2;
      
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
        player.position.y,
        player.position.x
      );
    });
    
    this.ctx.restore();
  }
  
  // Draw the ball
  drawBall(ballPosition: GameState['ball']['position']) {
    console.log('CanvasRenderer: drawBall called with position:',
      `x=${ballPosition.x.toFixed(2)}, y=${ballPosition.y.toFixed(2)}`);
    this.ctx.save();
    
    // Set the coordinate system for horizontal field
    this.ctx.translate(this.canvasWidth / 2, this.canvasHeight / 2);
    this.ctx.rotate(-Math.PI / 2); // Rotate 90 degrees counter-clockwise
    this.ctx.scale(this.pixelsPerMeter, this.pixelsPerMeter);
    this.ctx.translate(-GAME_HEIGHT / 2, -GAME_WIDTH / 2);
    
    // Calculate screen coordinates for ball drawing
    const drawX = ballPosition.y;  // Note: x and y are swapped due to rotation
    const drawY = ballPosition.x;
    
    console.log('CanvasRenderer: Drawing ball at', 
      `game pos (${ballPosition.x.toFixed(2)}, ${ballPosition.y.toFixed(2)})`,
      `-> canvas pos (${drawX.toFixed(2)}, ${drawY.toFixed(2)}), radius: ${BALL_RADIUS}`
    );
    
    // Draw ball as a circle
    this.ctx.fillStyle = WHITE;
    this.ctx.beginPath();
    this.ctx.arc(
      drawX,
      drawY,
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