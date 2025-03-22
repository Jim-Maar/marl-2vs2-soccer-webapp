import { useState, useEffect } from "react";
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

const getActionFromKeys = (keys: KeyPressMap, controlType: KeyboardControlType): number => {
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

  // Check combined key presses for diagonal movement
  if (keys[upKey] && keys[rightKey]) {
    return UP_RIGHT;
  }
  if (keys[upKey] && keys[leftKey]) {
    return UP_LEFT;
  }
  if (keys[downKey] && keys[rightKey]) {
    return DOWN_RIGHT;
  }
  if (keys[downKey] && keys[leftKey]) {
    return DOWN_LEFT;
  }

  // Single key presses
  if (keys[upKey]) {
    return UP;
  }
  if (keys[rightKey]) {
    return RIGHT;
  }
  if (keys[downKey]) {
    return DOWN;
  }
  if (keys[leftKey]) {
    return LEFT;
  }

  return NO_OP;
};

// Hook for handling keyboard controls
export const useKeyboard = () => {
  const [keyMap, setKeyMap] = useState<KeyPressMap>({});

  // Set up key event listeners
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      setKeyMap((prev) => ({ ...prev, [e.code]: true }));
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      setKeyMap((prev) => ({ ...prev, [e.code]: false }));
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Get actions for different control schemes
  const getWASDAction = () => getActionFromKeys(keyMap, KeyboardControlType.WASD);
  const getIJKLAction = () => getActionFromKeys(keyMap, KeyboardControlType.IJKL);
  const getArrowsAction = () => getActionFromKeys(keyMap, KeyboardControlType.ARROWS);
  const getNumpadAction = () => getActionFromKeys(keyMap, KeyboardControlType.NUMPAD);

  return {
    keyMap,
    getWASDAction,
    getIJKLAction,
    getArrowsAction,
    getNumpadAction
  };
}; 