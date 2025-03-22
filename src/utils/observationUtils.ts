import { Vec2 } from "../types";
import { REALISTIC_MAXIMUM_VELOCITY } from "./constants";

/**
 * Get local position coordinates relative to an agent's perspective
 */
export const getLocalPosition = (
  pos: [number, number], 
  agentId: number, 
  gameWidth: number, 
  gameHeight: number, 
  normalize = false
): [number, number] => {
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
};

/**
 * Get local velocity coordinates relative to an agent's perspective
 */
export const getLocalVelocity = (
  vel: [number, number], 
  agentId: number, 
  normalize = false
): [number, number] => {
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
    newVel[0] = newVel[0] / REALISTIC_MAXIMUM_VELOCITY;
    newVel[1] = newVel[1] / REALISTIC_MAXIMUM_VELOCITY;
  }
  
  return newVel;
};

/**
 * Generate observation vector for AI model
 */
export const generateObservation = (
  playerIndex: number,
  playerPositions: Vec2[], 
  playerVelocities: Vec2[],
  ballPosition: Vec2,
  ballVelocity: Vec2,
  gameWidth: number,
  gameHeight: number
): number[] => {
  const observation: number[] = [];
  const teamIndex = Math.floor(playerIndex / 2);
  const teamStart = teamIndex * 2;
  const teamEnd = teamStart + 2;
  
  // Get teammate and enemy indices
  const teammateIndices = [];
  for (let i = teamStart; i < teamEnd; i++) {
    if (i !== playerIndex) teammateIndices.push(i);
  }
  
  const enemyIndices = [];
  for (let i = 0; i < 4; i++) {
    if (Math.floor(i / 2) !== teamIndex) {
      enemyIndices.push(i);
    }
  }
  
  // Add own position and velocity (normalized local coordinates)
  const ownPos = getLocalPosition(
    [playerPositions[playerIndex].x, playerPositions[playerIndex].y],
    playerIndex,
    gameWidth,
    gameHeight,
    true
  );
  
  const ownVel = getLocalVelocity(
    [playerVelocities[playerIndex].x, playerVelocities[playerIndex].y],
    playerIndex,
    true
  );
  
  observation.push(...ownPos);
  observation.push(...ownVel);
  
  // Add teammate position and velocity
  for (const teammateIndex of teammateIndices) {
    const teammatePos = getLocalPosition(
      [playerPositions[teammateIndex].x, playerPositions[teammateIndex].y],
      playerIndex,
      gameWidth, 
      gameHeight,
      true
    );
    
    const teammateVel = getLocalVelocity(
      [playerVelocities[teammateIndex].x, playerVelocities[teammateIndex].y],
      playerIndex,
      true
    );
    
    observation.push(...teammatePos);
    observation.push(...teammateVel);
  }
  
  // Add enemy positions and velocities
  for (const enemyIndex of enemyIndices) {
    const enemyPos = getLocalPosition(
      [playerPositions[enemyIndex].x, playerPositions[enemyIndex].y],
      playerIndex,
      gameWidth,
      gameHeight,
      true
    );
    
    const enemyVel = getLocalVelocity(
      [playerVelocities[enemyIndex].x, playerVelocities[enemyIndex].y],
      playerIndex,
      true
    );
    
    observation.push(...enemyPos);
    observation.push(...enemyVel);
  }
  
  // Add ball position and velocity
  const ballPos = getLocalPosition(
    [ballPosition.x, ballPosition.y],
    playerIndex,
    gameWidth,
    gameHeight,
    true
  );
  
  const ballVel = getLocalVelocity(
    [ballVelocity.x, ballVelocity.y],
    playerIndex,
    true
  );
  
  observation.push(...ballPos);
  observation.push(...ballVel);
  
  return observation;
}; 