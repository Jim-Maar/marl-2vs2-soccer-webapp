import { ControlType } from "../utils/constants";

// Box2D Type Definitions
export type EmscriptenModule = {
  _malloc: (size: number) => number;
  HEAPF32: Float32Array;
  destroy: (obj: any) => void;
  wrapPointer: <T>(ptr: number, type: any) => T;
  getPointer: (obj: any) => number;
  pointsToVec2Array: (points: Point[]) => [any, () => void];
  toFloatArray: (array: number[]) => [any, () => void];
};

export type Box2DType = typeof Box2D & EmscriptenModule;

export interface Point {
  x: number;
  y: number;
}

export interface Vec2 {
  x: number;
  y: number;
}

// Game state interfaces
export interface PlayerData {
  id: number;
  team: number;
  position: Vec2;
  velocity: Vec2;
  control: ControlType;
}

export interface BallData {
  position: Vec2;
  velocity: Vec2;
}

export interface GameState {
  players: PlayerData[];
  ball: BallData;
  score: [number, number];
  isRunning: boolean;
}

// Observation type for AI
export type Observation = number[];

// Player control mapping
export interface ControlMapping {
  [key: string]: number; // Maps key code to action
}

// Types for ONNX model
export interface OrtTensor {
  dims: number[];
  data: Float32Array | Int32Array | Int8Array | Uint8Array | any;
} 