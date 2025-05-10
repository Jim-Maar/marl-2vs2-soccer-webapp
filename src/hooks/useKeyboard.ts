import { useRef, useEffect, useCallback } from "react";
import {
  UP, DOWN, LEFT, RIGHT,
  UP_LEFT, UP_RIGHT, DOWN_LEFT, DOWN_RIGHT, NO_OP,
  KEY_W, KEY_A, KEY_S, KEY_D,
  KEY_I, KEY_J, KEY_K, KEY_L,
  KEY_UP, KEY_DOWN, KEY_LEFT, KEY_RIGHT,
  KEY_NUM8, KEY_NUM4, KEY_NUM5, KEY_NUM6
} from "../utils/constants";

export enum KeyboardControlType {
  WASD = "WASD",
  IJKL = "IJKL",
  ARROWS = "ARROWS",
  NUMPAD = "NUMPAD"
}

type KeyPressMap = Record<string, boolean>;

const getActionFromKeys = (keys: KeyPressMap | null, controlType: KeyboardControlType, playerIndex: number = 0): number => {
  // If keys is null or undefined, return NO_OP
  if (!keys) {
    return NO_OP;
  }

  // Different control schemes based on the type
  let upKey = "";
  let downKey = "";
  let leftKey = "";
  let rightKey = "";

  switch (controlType) {
    case KeyboardControlType.WASD:
      upKey = KEY_W;
      downKey = KEY_S;
      leftKey = KEY_A;
      rightKey = KEY_D;
      break;
    case KeyboardControlType.IJKL:
      upKey = KEY_I;
      downKey = KEY_K;
      leftKey = KEY_J;
      rightKey = KEY_L;
      break;
    case KeyboardControlType.ARROWS:
      upKey = KEY_UP;
      downKey = KEY_DOWN;
      leftKey = KEY_LEFT;
      rightKey = KEY_RIGHT;
      break;
    case KeyboardControlType.NUMPAD:
      upKey = KEY_NUM8;
      downKey = KEY_NUM5;
      leftKey = KEY_NUM4;
      rightKey = KEY_NUM6;
      break;
  }

  // Get the key presses
  let upPressed = keys[upKey];
  let downPressed = keys[downKey];
  let leftPressed = keys[leftKey];
  let rightPressed = keys[rightKey];

  // Swap controls based on player index/orientation
  if (playerIndex === 1 || playerIndex === 3) {
    // Swap left and right for players 1 and 3
    [leftPressed, rightPressed] = [rightPressed, leftPressed];
  }
  
  if (playerIndex === 2 || playerIndex === 3) {
    // Swap up and down for players 2 and 3
    [upPressed, downPressed] = [downPressed, upPressed];
  }

  // Check combined key presses for diagonal movement
  if (upPressed && rightPressed) {
    return UP_RIGHT;
  }
  if (upPressed && leftPressed) {
    return UP_LEFT;
  }
  if (downPressed && rightPressed) {
    return DOWN_RIGHT;
  }
  if (downPressed && leftPressed) {
    return DOWN_LEFT;
  }

  // Single key presses
  if (upPressed) {
    return UP;
  }
  if (rightPressed) {
    return RIGHT;
  }
  if (downPressed) {
    return DOWN;
  }
  if (leftPressed) {
    return LEFT;
  }

  return NO_OP;
};

// Hook for handling keyboard controls
export const useKeyboard = () => {
  // Use ref instead of state to avoid re-renders on key press
  const keyMapRef = useRef<KeyPressMap>({});

  // Set up key event listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      keyMapRef.current[e.code] = true;
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keyMapRef.current[e.code] = false;
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Use useCallback to ensure these functions have stable references
  const getWASDAction = useCallback((playerIndex: number = 0) => getActionFromKeys(keyMapRef.current, KeyboardControlType.WASD, playerIndex), []);
  const getIJKLAction = useCallback((playerIndex: number = 0) => getActionFromKeys(keyMapRef.current, KeyboardControlType.IJKL, playerIndex), []);
  const getArrowsAction = useCallback((playerIndex: number = 0) => getActionFromKeys(keyMapRef.current, KeyboardControlType.ARROWS, playerIndex), []);
  const getNumpadAction = useCallback((playerIndex: number = 0) => getActionFromKeys(keyMapRef.current, KeyboardControlType.NUMPAD, playerIndex), []);

  return {
    keyMap: keyMapRef.current, // For backwards compatibility
    getWASDAction,
    getIJKLAction,
    getArrowsAction,
    getNumpadAction
  };
}; 