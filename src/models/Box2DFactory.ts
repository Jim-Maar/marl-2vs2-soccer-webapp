import Box2DFactory from 'box2d-wasm';
import { Box2DType, Point } from '../types';
import { FPS } from '../utils/constants';

// Helper class for Box2D operations
export class Helpers {
  constructor(private readonly box2D: Box2DType) {}

  copyVec2 = (vec: Box2D.b2Vec2): Box2D.b2Vec2 => {
    const { b2Vec2 } = this.box2D;
    return new b2Vec2(vec.get_x(), vec.get_y());
  };

  scaledVec2 = (vec: Box2D.b2Vec2, scale: number): Box2D.b2Vec2 => {
    const { b2Vec2 } = this.box2D;
    return new b2Vec2(scale * vec.get_x(), scale * vec.get_y());
  };

  createPolygonShape = (vertices: Box2D.b2Vec2[]): Box2D.b2PolygonShape => {
    const { _malloc, b2Vec2, b2PolygonShape, HEAPF32, wrapPointer } = this.box2D;
    const shape = new b2PolygonShape();            
    const buffer = _malloc(vertices.length * 8);
    let offset = 0;
    for (let i=0; i<vertices.length; i++) {
      HEAPF32[buffer + offset >> 2] = vertices[i].get_x();
      HEAPF32[buffer + (offset + 4) >> 2] = vertices[i].get_y();
      offset += 8;
    }            
    const ptr_wrapped = wrapPointer(buffer, b2Vec2);
    shape.Set(ptr_wrapped, vertices.length);
    return shape;
  };

  createRandomPolygonShape = (radius: number): Box2D.b2PolygonShape => {
    const { b2Vec2 } = this.box2D;
    let numVerts = 3.5 + Math.random() * 5;
    numVerts = numVerts | 0;
    const verts = [];
    for (let i = 0; i < numVerts; i++) {
      const angle = i / numVerts * 360.0 * 0.0174532925199432957;
      verts.push(new b2Vec2(radius * Math.sin(angle), radius * -Math.cos(angle)));
    }            
    return this.createPolygonShape(verts);
  };
}

// Soccer world manager to create and manage physics for the soccer game
export class SoccerWorldManager {
  private world: Box2D.b2World | null = null;
  private players: Box2D.b2Body[] = [];
  private ball: Box2D.b2Body | null = null;
  private groundBody: Box2D.b2Body | null = null;
  private debugDraw: Box2D.JSDraw | null = null;
  private boundaries: {
    topLeft: { x: number; y: number; width: number; height: number; };
    topRight: { x: number; y: number; width: number; height: number; };
    bottomLeft: { x: number; y: number; width: number; height: number; };
    bottomRight: { x: number; y: number; width: number; height: number; };
    leftWall: { x: number; y: number; width: number; height: number; };
    rightWall: { x: number; y: number; width: number; height: number; };
  } | null = null;
  private wallBodies: Box2D.b2Body[] = [];

  constructor(
    private readonly box2D: Box2DType, 
    private readonly helpers: Helpers
  ) {}

  createWorld() {
    const { b2World, b2Vec2 } = this.box2D;
    // Create physics world with no gravity
    this.world = new b2World(new b2Vec2(0.0, 0.0));
    
    // Set debug draw immediately if available
    if (this.debugDraw) {
      this.world.SetDebugDraw(this.debugDraw);
    }
    
    return this.world;
  }

  createBoundaries(gameWidth: number, gameHeight: number, wallThickness: number, goalWidth: number) {
    if (!this.world) throw new Error("World not initialized");
    
    const { b2BodyDef, b2PolygonShape, b2Vec2 } = this.box2D;
    
    // Clear any existing wall bodies
    this.wallBodies = [];
    
    // Store boundary data for rendering
    const topGoalStart = (gameWidth - goalWidth) / 2;
    const topGoalEnd = topGoalStart + goalWidth;
    const bottomGoalStart = (gameWidth - goalWidth) / 2;
    const bottomGoalEnd = bottomGoalStart + goalWidth;
    
    this.boundaries = {
      // Left wall
      leftWall: { 
        x: 0, 
        y: 0, 
        width: wallThickness, 
        height: gameHeight 
      },
      
      // Right wall
      rightWall: { 
        x: gameWidth - wallThickness, 
        y: 0, 
        width: wallThickness, 
        height: gameHeight 
      },
      
      // Top walls (y = 0)
      topLeft: { 
        x: 0, 
        y: 0,
        width: topGoalStart, 
        height: wallThickness 
      },
      
      topRight: { 
        x: topGoalEnd, 
        y: 0, 
        width: gameWidth - topGoalEnd, 
        height: wallThickness 
      },
      
      // Bottom walls (y = gameHeight - wallThickness)
      bottomLeft: { 
        x: 0, 
        y: gameHeight - wallThickness, 
        width: bottomGoalStart, 
        height: wallThickness 
      },
      
      bottomRight: { 
        x: topGoalEnd, 
        y: gameHeight - wallThickness, 
        width: gameWidth - topGoalEnd, 
        height: wallThickness 
      }
    };
    
    // Following the Python implementation to create solid wall bodies
    
    // Create left wall
    const leftWallBodyDef = new b2BodyDef();
    leftWallBodyDef.set_position(new b2Vec2(0, gameHeight / 2));
    const leftWallBody = this.world.CreateBody(leftWallBodyDef);
    
    const leftWallShape = new b2PolygonShape();
    leftWallShape.SetAsBox(wallThickness, gameHeight / 2);
    leftWallBody.CreateFixture(leftWallShape, 0.0);
    this.wallBodies.push(leftWallBody);
    
    // Create right wall
    const rightWallBodyDef = new b2BodyDef();
    rightWallBodyDef.set_position(new b2Vec2(gameWidth, gameHeight / 2));
    const rightWallBody = this.world.CreateBody(rightWallBodyDef);
    
    const rightWallShape = new b2PolygonShape();
    rightWallShape.SetAsBox(wallThickness, gameHeight / 2);
    rightWallBody.CreateFixture(rightWallShape, 0.0);
    this.wallBodies.push(rightWallBody);
    
    // Create top wall with goal opening
    this.createGoalWall(true, gameWidth, gameHeight, wallThickness, goalWidth);
    
    // Create bottom wall with goal opening
    this.createGoalWall(false, gameWidth, gameHeight, wallThickness, goalWidth);
  }

  // Helper method to create walls with goal openings
  private createGoalWall(isTop: boolean, gameWidth: number, gameHeight: number, wallThickness: number, goalWidth: number) {
    if (!this.world) return;
    
    const { b2BodyDef, b2PolygonShape, b2Vec2 } = this.box2D;
    
    const wallWidth = (gameWidth - goalWidth) / 2;
    const yPos = isTop ? 0 : gameHeight;
    
    // Left part
    const leftPartBodyDef = new b2BodyDef();
    leftPartBodyDef.set_position(new b2Vec2(wallWidth / 2, yPos));
    const leftPartBody = this.world.CreateBody(leftPartBodyDef);
    
    const leftPartShape = new b2PolygonShape();
    leftPartShape.SetAsBox(wallWidth / 2, wallThickness);
    leftPartBody.CreateFixture(leftPartShape, 0.0);
    this.wallBodies.push(leftPartBody);
    
    // Right part
    const rightPartBodyDef = new b2BodyDef();
    rightPartBodyDef.set_position(new b2Vec2(gameWidth - wallWidth / 2, yPos));
    const rightPartBody = this.world.CreateBody(rightPartBodyDef);
    
    const rightPartShape = new b2PolygonShape();
    rightPartShape.SetAsBox(wallWidth / 2, wallThickness);
    rightPartBody.CreateFixture(rightPartShape, 0.0);
    this.wallBodies.push(rightPartBody);
  }

  createPlayers(gameWidth: number, gameHeight: number, playerSize: number, spawningRadius: number, playerDensity: number, playerFriction: number) {
    if (!this.world) throw new Error("World not initialized");
    
    const { b2BodyDef, b2FixtureDef, b2PolygonShape, b2Vec2, b2_dynamicBody } = this.box2D;
    
    // Default positions
    const defaultPositions = [
      { x: gameWidth/4, y: gameHeight/6 },          // Team 0 - Player 0 (bottom left)
      { x: 3*gameWidth/4, y: gameHeight/6 },        // Team 0 - Player 1 (bottom right)
      { x: gameWidth/4, y: 5*gameHeight/6 },        // Team 1 - Player 2 (top left)
      { x: 3*gameWidth/4, y: 5*gameHeight/6 },      // Team 1 - Player 3 (top right)
    ];
    
    this.players = [];
    
    for (let i = 0; i < 4; i++) {
      // Add randomness to positions within spawning radius
      const randomX = defaultPositions[i].x + (Math.random() * 2 - 1) * spawningRadius;
      const randomY = defaultPositions[i].y + (Math.random() * 2 - 1) * spawningRadius;
      
      // Ensure players stay within bounds
      const boundedX = Math.max(playerSize, Math.min(gameWidth - playerSize, randomX));
      const boundedY = Math.max(playerSize, Math.min(gameHeight - playerSize, randomY));
      
      // Create player
      const bodyDef = new b2BodyDef();
      bodyDef.set_type(b2_dynamicBody);
      bodyDef.set_position(new b2Vec2(boundedX, boundedY));
      bodyDef.set_fixedRotation(true); // Prevent rotation
      
      const body = this.world.CreateBody(bodyDef);
      
      // Create player shape
      const shape = new b2PolygonShape();
      shape.SetAsBox(playerSize/2, playerSize/2);
      
      const fixtureDef = new b2FixtureDef();
      fixtureDef.set_shape(shape);
      fixtureDef.set_density(playerDensity);
      fixtureDef.set_friction(playerFriction);
      
      body.CreateFixture(fixtureDef);
      // body.SetLinearDamping(0.5); // Add some damping for more realistic movement
      
      // Add user data - use type assertion since this is how Box2D works
      (body as any).userData = { team: Math.floor(i / 2), id: i };
      
      this.players.push(body);
    }
    
    return this.players;
  }

  createBall(gameWidth: number, gameHeight: number, ballRadius: number, ballDensity: number, ballFriction: number, ballRestitution: number) {
    if (!this.world) throw new Error("World not initialized");
    
    const { b2BodyDef, b2FixtureDef, b2CircleShape, b2Vec2, b2_dynamicBody } = this.box2D;
    
    // Create ball in center of field
    const bodyDef = new b2BodyDef();
    bodyDef.set_type(b2_dynamicBody);
    bodyDef.set_position(new b2Vec2(gameWidth/2, gameHeight/2));
    bodyDef.set_fixedRotation(true); // Prevent rotation
    
    this.ball = this.world.CreateBody(bodyDef);
    
    // Create ball shape
    const shape = new b2CircleShape();
    shape.set_m_radius(ballRadius);
    
    const fixtureDef = new b2FixtureDef();
    fixtureDef.set_shape(shape);
    fixtureDef.set_density(ballDensity);
    fixtureDef.set_friction(ballFriction);
    fixtureDef.set_restitution(ballRestitution);
    
    this.ball.CreateFixture(fixtureDef);
    this.ball.SetLinearDamping(ballFriction);
    this.ball.SetAngularDamping(ballFriction);
    
    // Add user data - use type assertion
    (this.ball as any).userData = { type: 'ball' };
    
    return this.ball;
  }

  resetBall(gameWidth: number, gameHeight: number) {
    if (!this.ball) return;
    
    const { b2Vec2 } = this.box2D;
    this.ball.SetTransform(new b2Vec2(gameWidth/2, gameHeight/2), 0);
    this.ball.SetLinearVelocity(new b2Vec2(0, 0));
    this.ball.SetAngularVelocity(0);
  }

  resetPlayers(gameWidth: number, gameHeight: number, playerSize: number, spawningRadius: number) {
    if (!this.players || this.players.length === 0) return;
    
    const { b2Vec2 } = this.box2D;
    
    // Default positions
    const defaultPositions = [
      { x: gameWidth/4, y: gameHeight/6 },          // Team 0 - Player 0 (bottom left)
      { x: 3*gameWidth/4, y: gameHeight/6 },        // Team 0 - Player 1 (bottom right)
      { x: gameWidth/4, y: 5*gameHeight/6 },        // Team 1 - Player 2 (top left)
      { x: 3*gameWidth/4, y: 5*gameHeight/6 },      // Team 1 - Player 3 (top right)
    ];
    
    // Reset each player
    for (let i = 0; i < this.players.length; i++) {
      // Add randomness to positions within spawning radius
      const randomX = defaultPositions[i].x + (Math.random() * 2 - 1) * spawningRadius;
      const randomY = defaultPositions[i].y + (Math.random() * 2 - 1) * spawningRadius;
      
      // Ensure players stay within bounds
      const boundedX = Math.max(playerSize, Math.min(gameWidth - playerSize, randomX));
      const boundedY = Math.max(playerSize, Math.min(gameHeight - playerSize, randomY));
      
      // Reset position and velocity
      this.players[i].SetTransform(new b2Vec2(boundedX, boundedY), 0);
      this.players[i].SetLinearVelocity(new b2Vec2(0, 0));
      this.players[i].SetAngularVelocity(0);
    }
  }

  applyPlayerAction(playerIndex: number, action: number, playerSpeed: number) {
    if (playerIndex < 0 || playerIndex >= this.players.length) return;
    
    const { b2Vec2 } = this.box2D;
    const player = this.players[playerIndex];
    
    // Process action to local velocity
    let localVel: [number, number] = [0, 0];
    
    switch(action) {
      case 0: // UP
        localVel = [0, playerSpeed];
        break;
      case 1: // UP_RIGHT
        localVel = [playerSpeed * 0.7071, playerSpeed * 0.7071];
        break;
      case 2: // RIGHT
        localVel = [playerSpeed, 0];
        break;
      case 3: // DOWN_RIGHT
        localVel = [playerSpeed * 0.7071, -playerSpeed * 0.7071];
        break;
      case 4: // DOWN
        localVel = [0, -playerSpeed];
        break;
      case 5: // DOWN_LEFT
        localVel = [-playerSpeed * 0.7071, -playerSpeed * 0.7071];
        break;
      case 6: // LEFT
        localVel = [-playerSpeed, 0];
        break;
      case 7: // UP_LEFT
        localVel = [-playerSpeed * 0.7071, playerSpeed * 0.7071];
        break;
      case 8: // NO_OP
      default:
        localVel = [0, 0];
        break;
    }
    
    // Convert to global velocity based on player
    let globalVel = this.getGlobalVelocity(localVel, playerIndex);
    player.SetLinearVelocity(new b2Vec2(globalVel[0], globalVel[1]));
  }

  getLocalPosition(pos: [number, number], agentId: number, gameWidth: number, gameHeight: number, normalize = false): [number, number] {
    const [x, y] = pos;
    let newPos: [number, number];
    
    // Team 1 (bottom)
    if (agentId === 0) {  // Bottom left
      newPos = [x, y];
    } else if (agentId === 1) {  // Bottom right
      newPos = [gameWidth - x, y];
    }
    // Team 2 (top)
    else if (agentId === 2) {  // Top left
      newPos = [x, gameHeight - y];
    } else {  // Top right (agentId === 3)
      newPos = [gameWidth - x, gameHeight - y];
    }
    
    if (normalize) {
      newPos[0] = newPos[0] / gameWidth;
      newPos[1] = newPos[1] / gameHeight;
    }
    
    return newPos;
  }

  getLocalVelocity(vel: [number, number], agentId: number, normalize = false): [number, number] {
    const [vx, vy] = vel;
    let newVel: [number, number];
    
    // Team 1 (bottom)
    if (agentId === 0) {  // Bottom left
      newVel = [vx, vy];
    } else if (agentId === 1) {  // Bottom right
      newVel = [-vx, vy];
    }
    // Team 2 (top)
    else if (agentId === 2) {  // Top left
      newVel = [vx, -vy];
    } else {  // Top right (agentId === 3)
      newVel = [-vx, -vy];
    }
    
    if (normalize) {
      newVel[0] = newVel[0] / 20.0; // Normalized to REALISTIC_MAXIMUM_VELOCITY
      newVel[1] = newVel[1] / 20.0;
    }
    
    return newVel;
  }

  getGlobalVelocity(vel: [number, number], agentId: number): [number, number] {
    return this.getLocalVelocity(vel, agentId); // Works the same way for our representation
  }

  getGameState(gameWidth: number, gameHeight: number) {
    if (!this.world || !this.ball) return null;
    
    const players = this.players.map(player => {
      const position = {
        x: player.GetPosition().get_x(),
        y: player.GetPosition().get_y()
      };
      
      const velocity = {
        x: player.GetLinearVelocity().get_x(),
        y: player.GetLinearVelocity().get_y()
      };
      
      return {
        // Use type assertion to access userData which is added dynamically
        id: (player as any).userData.id,
        team: (player as any).userData.team,
        position,
        velocity
      };
    });
    
    const ball = {
      position: {
        x: this.ball.GetPosition().get_x(),
        y: this.ball.GetPosition().get_y()
      },
      velocity: {
        x: this.ball.GetLinearVelocity().get_x(),
        y: this.ball.GetLinearVelocity().get_y()
      }
    };
    
    return { players, ball };
  }

  checkGoal(gameHeight: number) {
    if (!this.ball) return -1;
    
    const ballPos = this.ball.GetPosition();
    const ballX = ballPos.get_x();
    const ballY = ballPos.get_y();
    
    // Check if ball is in top goal area
    if (ballY < 0) {
      // Team 0 scores on top goal
      return 0;
    }
    
    // Check if ball is in bottom goal area
    if (ballY > gameHeight) {
      // Team 1 scores on bottom goal
      return 1;
    }
    
    return -1;  // No goal
  }

  step(deltaMs: number) {
    if (!this.world) return;
    
    // Use FPS constant to calculate max time step
    const maxTimeStepMs = 1000 / FPS; // Convert FPS to ms per frame
    const clampedDeltaMs = Math.min(deltaMs, maxTimeStepMs);
    
    // Convert ms to seconds for Box2D
    this.world.Step(clampedDeltaMs/1000, 6, 2);
  }

  destroy() {
    if (this.world) {
      try {
        // Clean up player bodies first
        this.players.forEach(player => {
          if (player && this.world) {
            this.world.DestroyBody(player);
          }
        });
        
        // Clean up ball
        if (this.ball && this.world) {
          this.world.DestroyBody(this.ball);
        }
        
        // Clean up wall bodies
        this.wallBodies.forEach(body => {
          if (body && this.world) {
            this.world.DestroyBody(body);
          }
        });
        
        // Clean up ground body if it exists
        if (this.groundBody && this.world) {
          this.world.DestroyBody(this.groundBody);
        }
        
        // Destroy the world
        this.box2D.destroy(this.world);
        
        // Clear references
        this.world = null;
        this.players = [];
        this.ball = null;
        this.groundBody = null;
        this.wallBodies = [];
        this.debugDraw = null;
        this.boundaries = null;
      } catch (e) {
        console.error("Error destroying SoccerWorldManager:", e);
      }
    }
  }

  /**
   * Set the debug draw for visualization
   */
  setDebugDraw(debugDraw: Box2D.JSDraw) {
    this.debugDraw = debugDraw;
    if (this.world) {
      this.world.SetDebugDraw(debugDraw);
    }
  }

  /**
   * Draw the world using debug draw
   */
  draw() {
    if (this.world && this.debugDraw) {
      this.world.DebugDraw();
    }
  }

  // Get boundary data for rendering
  getBoundaryData() {
    return this.boundaries;
  }
}

// Initialize Box2D
export const initBox2D = async (): Promise<[Box2DType, Helpers, SoccerWorldManager]> => {
  try {
    console.log('Box2DFactory: Starting Box2D initialization');
    const box2d = await Box2DFactory({
      locateFile: (path: string) => {
        const wasmPath = `/wasm/${path}`;
        console.log(`Box2DFactory: Loading WASM file from: ${wasmPath}`);
        return wasmPath;
      }
    }) as unknown as Box2DType;
    
    console.log('Box2DFactory: Box2D WASM loaded successfully');
    const helpers = new Helpers(box2d);
    const worldManager = new SoccerWorldManager(box2d, helpers);
    
    console.log('Box2DFactory: Initialization complete');
    return [box2d, helpers, worldManager];
  } catch (error) {
    console.error('Failed to initialize Box2D:', error);
    throw error;
  }
}; 