import React, { useEffect, useRef, useState } from 'react';
import Box2DFactory from 'box2d-wasm';

// Box2D Type Definitions
type EmscriptenModule = {
  _malloc: (size: number) => number;
  HEAPF32: Float32Array;
  destroy: (obj: any) => void;
  wrapPointer: <T>(ptr: number, type: any) => T;
  getPointer: (obj: any) => number;
  pointsToVec2Array: (points: Point[]) => [any, () => void];
  toFloatArray: (array: number[]) => [any, () => void];
};

type Box2DType = typeof Box2D & EmscriptenModule;

interface Point {
  x: number;
  y: number;
}

// Helper class for Box2D operations
class Helpers {
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

// Debug Draw class for rendering
class CanvasDebugDraw {
  constructor(
    private readonly box2D: Box2DType,
    private readonly helpers: Helpers,
    private readonly context: CanvasRenderingContext2D,
    private readonly canvasScaleFactor: number
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
      // Render axis marker
      const vert2V = copyVec2(centerV);
      vert2V.op_add(scaledVec2(axisV, radius));
      this.context.beginPath();
      this.context.moveTo(centerV.get_x(), centerV.get_y());
      this.context.lineTo(vert2V.get_x(), vert2V.get_y());
      this.context.stroke();
    }
  };
  
  drawPoint = (vec_p: number, sizeMetres: number, color_p: number): void => {
    const { wrapPointer, b2Vec2 } = this.box2D;
    const vert = wrapPointer(vec_p, b2Vec2);
    this.setColorFromDebugDrawCallback(color_p);
    const sizePixels = sizeMetres/this.canvasScaleFactor;
    this.context.fillRect(vert.get_x()-sizePixels/2, vert.get_y()-sizePixels/2, sizePixels, sizePixels);
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

// World factory to create and manage the physics world
class WorldFactory {
  constructor(private readonly box2D: Box2DType, private readonly helpers: Helpers) {}

  create(renderer: Box2D.JSDraw) {
    const { b2_dynamicBody, b2BodyDef, b2EdgeShape, b2World, b2Vec2, destroy } = this.box2D;
    
    // Create physics world with gravity
    const world = new b2World(new b2Vec2(0.0, -10.0));
    world.SetDebugDraw(renderer);
    
    // Create ground body
    const groundBodyDef = new b2BodyDef();
    const groundBody = world.CreateBody(groundBodyDef);

    // Create ground edges
    const shape0 = new b2EdgeShape();
    shape0.SetTwoSided(new b2Vec2(-40.0, -6.0), new b2Vec2(40.0, -6.0));
    groundBody.CreateFixture(shape0, 0.0);
    shape0.SetTwoSided(new b2Vec2(-9.0, -6.0), new b2Vec2(-9.0, -4.0));
    groundBody.CreateFixture(shape0, 0.0);
    shape0.SetTwoSided(new b2Vec2(9.0, -6.0), new b2Vec2(9.0, -4.0));
    groundBody.CreateFixture(shape0, 0.0);

    // Create falling shapes
    this.createFallingShapes(world);

    const maxTimeStepMs = 1/60*1000;
    const self = this;

    return {
      step(deltaMs: number) {
        const clampedDeltaMs = Math.min(deltaMs, maxTimeStepMs);
        world.Step(clampedDeltaMs/1000, 3, 2);
      },
      draw() {
        world.DebugDraw();
      },
      destroy() {
        destroy(world);
      },
      addBox() {
        self.createBox(world);
      }
    };
  }

  private createFallingShapes(world: Box2D.b2World): void {
    const { b2BodyDef, b2CircleShape, b2Vec2, b2_dynamicBody } = this.box2D;
    const { createRandomPolygonShape } = this.helpers;

    const cshape = new b2CircleShape();
    cshape.set_m_radius(0.5);

    const ZERO = new b2Vec2(0, 0);
    const temp = new b2Vec2(0, 0);
    
    // Create 10 random shapes
    for (let i = 0; i < 10; i++) {
      const bd = new b2BodyDef();
      bd.set_type(b2_dynamicBody);
      bd.set_position(ZERO);
      const body = world.CreateBody(bd);
      const randomValue = Math.random();
      const shape = randomValue < 0.2 ? cshape : createRandomPolygonShape(0.5);
      body.CreateFixture(shape, 1.0);
      temp.Set(16*(Math.random()-0.5), 4.0 + 2.5 * i);
      body.SetTransform(temp, 0.0);
      body.SetLinearVelocity(ZERO);
      body.SetEnabled(true);
    }
  }

  private createBox(world: Box2D.b2World): void {
    const { b2BodyDef, b2PolygonShape, b2Vec2, b2_dynamicBody } = this.box2D;
    
    const bodyDef = new b2BodyDef();
    bodyDef.set_type(b2_dynamicBody);
    bodyDef.set_position(new b2Vec2(0, 0));
    const body = world.CreateBody(bodyDef);
    
    const shape = new b2PolygonShape();
    shape.SetAsBox(0.5, 0.5);
    body.CreateFixture(shape, 1.0);
  }
}

const PhysicsSimulation: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const worldRef = useRef<any>(null);
  const animationRef = useRef<number | null>(null);
  const box2dRef = useRef<Box2DType | null>(null);
  
  // Initialize Box2D
  useEffect(() => {
    const init = async () => {
      try {
        console.log("Loading Box2D WASM...");
        const box2d = await Box2DFactory({
          locateFile: (path: string) => `/wasm/${path}`
        }) as unknown as Box2DType;
        
        box2dRef.current = box2d;
        setIsLoading(false);
        console.log("Box2D initialized successfully!");
      } catch (err) {
        console.error("Failed to initialize Box2D:", err);
        setError(`Box2D initialization failed: ${err instanceof Error ? err.message : String(err)}`);
        setIsLoading(false);
      }
    };
    
    init();
    
    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
      }
      if (worldRef.current) {
        try {
          worldRef.current.destroy();
        } catch (e) {
          console.error("Error destroying world:", e);
        }
      }
    };
  }, []);
  
  // Set up canvas and physics world
  useEffect(() => {
    if (isLoading || error || !canvasRef.current || !box2dRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    
    const box2d = box2dRef.current;
    const helpers = new Helpers(box2d);
    
    // Canvas setup
    const pixelsPerMeter = 32;
    const canvasOffset = {
      x: canvas.width / 2,
      y: canvas.height / 2
    };
    
    // Create debug draw
    const debugDraw = new CanvasDebugDraw(box2d, helpers, ctx, pixelsPerMeter).constructJSDraw();
    debugDraw.SetFlags(box2d.b2Draw.e_shapeBit);
    
    // Create world
    const world = new WorldFactory(box2d, helpers).create(debugDraw);
    worldRef.current = world;
    
    // Drawing function
    const drawCanvas = () => {
      // Black background
      ctx.fillStyle = 'rgb(0,0,0)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      ctx.save();
      ctx.translate(canvasOffset.x, canvasOffset.y);
      ctx.scale(pixelsPerMeter, -pixelsPerMeter);
      ctx.lineWidth /= pixelsPerMeter;
      
      // Draw world
      world.draw();
      
      ctx.restore();
    };
    
    // Start animation if running
    if (isRunning) {
      const animate = (prevMs: number) => {
        const nowMs = performance.now();
        const deltaMs = nowMs - prevMs;
        
        world.step(deltaMs);
        drawCanvas();
        
        animationRef.current = requestAnimationFrame(() => animate(nowMs));
      };
      
      animationRef.current = requestAnimationFrame(() => animate(performance.now()));
    } else {
      // Draw at least once even when not running
      drawCanvas();
    }
    
    return () => {
      if (animationRef.current !== null) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = null;
      }
    };
  }, [isLoading, error, isRunning]);
  
  // Toggle simulation running state
  const toggleSimulation = () => {
    setIsRunning(prev => !prev);
  };
  
  // Add a new box to the simulation
  const addBox = () => {
    if (!worldRef.current) return;
    worldRef.current.addBox();
  };
  
  return (
    <div className="physics-container">
      <h2>Box2D Physics Simulation</h2>
      
      {isLoading ? (
        <div>Loading Box2D WASM...</div>
      ) : error ? (
        <div className="error-message">
          <h3>Error:</h3>
          <pre>{error}</pre>
        </div>
      ) : (
        <>
          <div className="controls">
            <button 
              onClick={toggleSimulation}
              className={`button ${isRunning ? 'stop' : 'start'}`}
              disabled={!worldRef.current}
            >
              {isRunning ? 'Stop' : 'Start'}
            </button>
            
            <button 
              onClick={addBox}
              className="button add-box"
              disabled={!worldRef.current}
            >
              Add Box
            </button>
          </div>
          
          <canvas 
            ref={canvasRef} 
            width={800} 
            height={600} 
            className="simulation-canvas"
          />
          
          <div className="instructions">
            This is a Box2D physics simulation. Click "Start" to begin the simulation and "Add Box" to add more objects.
          </div>
        </>
      )}
      
      <style>
        {`
        .physics-container {
          font-family: Arial, sans-serif;
          max-width: 820px;
          margin: 0 auto;
          padding: 20px;
        }
        
        h2 {
          color: #333;
          margin-bottom: 20px;
        }
        
        .controls {
          margin-bottom: 15px;
        }
        
        .button {
          padding: 10px 20px;
          margin-right: 10px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 16px;
          font-weight: 600;
          color: white;
          transition: background-color 0.2s;
        }
        
        .button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .start {
          background-color: #4CAF50;
        }
        
        .stop {
          background-color: #f44336;
        }
        
        .add-box {
          background-color: #2196F3;
        }
        
        .simulation-canvas {
          border: 1px solid #333;
          background-color: #000;
          display: block;
          margin: 0 auto;
        }
        
        .instructions {
          margin-top: 15px;
          color: #666;
          font-size: 14px;
        }
        
        .error-message {
          padding: 15px;
          background-color: #ffebee;
          border: 1px solid #f44336;
          border-radius: 4px;
          margin-bottom: 20px;
        }
        
        .error-message h3 {
          color: #d32f2f;
          margin-top: 0;
        }
        
        pre {
          white-space: pre-wrap;
          word-break: break-word;
        }
        `}
      </style>
    </div>
  );
};

export default PhysicsSimulation;