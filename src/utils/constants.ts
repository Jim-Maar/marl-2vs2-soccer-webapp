// Soccer Game Constants

// Screen dimensions - updated to match game aspect ratio
export const SCREEN_WIDTH = 600;
export const SCREEN_HEIGHT = 800;

// Game dimensions
export const GAME_WIDTH = 30;
export const GAME_HEIGHT = 40;

// Conversion factor - ensuring proper scaling for horizontal view
export const PPM = Math.min(SCREEN_WIDTH / GAME_WIDTH, SCREEN_HEIGHT / GAME_HEIGHT);

// Game parameters
export const FPS = 20;
export const PLAYER_SIZE = 1.5; // meters
export const BALL_RADIUS = 2.0; // meters
export const PLAYER_SPEED = 12.0;
export const WALL_THICKNESS = 1.0;
export const GOAL_WIDTH = 24.0; // meters
export const MAXIMUM_VELOCITY = 50.0;
export const REALISTIC_MAXIMUM_VELOCITY = 20.0;
export const SPAWNING_RADIUS = 3.0; // random spawn radius

// Physics parameters
export const PLAYER_DENSITY = 2.0;
export const PLAYER_FRICTION = 0.3;
export const BALL_DENSITY = 0.1;
export const BALL_FRICTION = 0.3;
export const BALL_RESTITUTION = 0.8;

// Colors
export const WHITE = "rgb(255, 255, 255)";
export const BLACK = "rgb(0, 0, 0)";
export const RED = "rgb(255, 0, 0)";
export const BLUE = "rgb(0, 0, 255)";
export const GREEN = "rgb(0, 255, 0)";
export const YELLOW = "rgb(255, 255, 0)";
export const PURPLE = "rgb(128, 0, 128)";

// Actions
export const UP = 0;
export const UP_RIGHT = 1;
export const RIGHT = 2;
export const DOWN_RIGHT = 3;
export const DOWN = 4;
export const DOWN_LEFT = 5;
export const LEFT = 6;
export const UP_LEFT = 7;
export const NO_OP = 8;

// Control types
export enum ControlType {
  WASD = "WASD",
  IJKL = "IJKL",
  ARROWS = "Arrows",
  NUMPAD = "Numpad",
  AI1 = "AI1",
  AI2 = "AI2"
}

// Player control mappings
export const KEY_UP = "ArrowUp";
export const KEY_DOWN = "ArrowDown";
export const KEY_LEFT = "ArrowLeft";
export const KEY_RIGHT = "ArrowRight";

export const KEY_W = "KeyW";
export const KEY_A = "KeyA";
export const KEY_S = "KeyS";
export const KEY_D = "KeyD";

export const KEY_I = "KeyI";
export const KEY_J = "KeyJ";
export const KEY_K = "KeyK";
export const KEY_L = "KeyL";

export const KEY_NUM8 = "Numpad8";
export const KEY_NUM4 = "Numpad4";
export const KEY_NUM5 = "Numpad5";
export const KEY_NUM6 = "Numpad6"; 