// @ts-ignore
import * as ort from 'onnxruntime-web';
import { OrtTensor, Observation } from '../types';

// Manages AI models and inference for the soccer game
export class AIController {
  private session1: ort.InferenceSession | null = null;
  private session2: ort.InferenceSession | null = null;
  private isLoading: boolean = false;
  private error: string | null = null;

  // Load models async
  async loadModels(): Promise<void> {
    if (this.isLoading) return;
    
    this.isLoading = true;
    this.error = null;
    
    try {
      // Load both models concurrently
      const [model1, model2] = await Promise.all([
        ort.InferenceSession.create('/models/actor1.onnx'),
        ort.InferenceSession.create('/models/actor2.onnx')
      ]);
      
      this.session1 = model1;
      this.session2 = model2;
      
      console.log('AI models loaded successfully');
    } catch (err: any) {
      this.error = err.message || 'Error loading AI models';
      console.error('Failed to load AI models:', err);
    } finally {
      this.isLoading = false;
    }
  }

  // Get action from AI model
  async getAction(observation: Observation, modelNumber: 1 | 2 = 1, useSoftmax: boolean = false): Promise<number> {
    const session = modelNumber === 1 ? this.session1 : this.session2;
    
    if (!session) {
      throw new Error(`Model ${modelNumber} not loaded`);
    }
    
    try {
      // Create input tensor
      const tensor = new ort.Tensor('float32', new Float32Array(observation), [1, 20]);
      
      // Prepare feeds object with the correct input name
      const feeds: Record<string, ort.Tensor> = {};
      feeds[session.inputNames[0]] = tensor;
      
      // Run inference
      const results = await session.run(feeds);
      
      // Get output tensor
      const output = results[session.outputNames[0]];
      const outputData = output.data as Float32Array;
      
      if (useSoftmax) {
        // Use softmax sampling
        return this.softmaxSampling(Array.from(outputData));
      } else {
        // Get action with highest probability (argmax)
        return Array.from(outputData).indexOf(Math.max(...Array.from(outputData)));
      }
    } catch (err) {
      console.error('Error running inference:', err);
      return 8; // NO_OP as fallback
    }
  }

  // Softmax sampling implementation
  private softmaxSampling(logits: number[]): number {
    // Apply softmax to convert logits to probabilities
    const probabilities = this.softmax(logits);
    
    // Sample from the probability distribution
    const randomValue = Math.random();
    let cumulativeProbability = 0;
    
    for (let i = 0; i < probabilities.length; i++) {
      cumulativeProbability += probabilities[i];
      if (randomValue <= cumulativeProbability) {
        return i;
      }
    }
    
    // Fallback to last action if something goes wrong
    return probabilities.length - 1;
  }
  
  // Softmax function to convert logits to probabilities
  private softmax(logits: number[]): number[] {
    // Find max for numerical stability
    const maxLogit = Math.max(...logits);
    
    // Subtract max and exponentiate
    const expValues = logits.map(logit => Math.exp(logit - maxLogit));
    
    // Sum of all exp values
    const sumExp = expValues.reduce((sum, val) => sum + val, 0);
    
    // Normalize to get probabilities
    return expValues.map(expVal => expVal / sumExp);
  }

  // Generate observation for the AI model
  generateObservation(
    playerIndex: number,
    playerPositions: {x: number, y: number}[], 
    playerVelocities: {x: number, y: number}[],
    ballPosition: {x: number, y: number},
    ballVelocity: {x: number, y: number},
    gameWidth: number,
    gameHeight: number
  ): Observation {
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
    const ownPos = this.getLocalPosition(
      [playerPositions[playerIndex].x, playerPositions[playerIndex].y],
      playerIndex,
      gameWidth,
      gameHeight,
      true
    );
    
    const ownVel = this.getLocalVelocity(
      [playerVelocities[playerIndex].x, playerVelocities[playerIndex].y],
      playerIndex,
      true
    );
    
    observation.push(...ownPos);
    observation.push(...ownVel);
    
    // Add teammate position and velocity
    for (const teammateIndex of teammateIndices) {
      const teammatePos = this.getLocalPosition(
        [playerPositions[teammateIndex].x, playerPositions[teammateIndex].y],
        playerIndex,
        gameWidth, 
        gameHeight,
        true
      );
      
      const teammateVel = this.getLocalVelocity(
        [playerVelocities[teammateIndex].x, playerVelocities[teammateIndex].y],
        playerIndex,
        true
      );
      
      observation.push(...teammatePos);
      observation.push(...teammateVel);
    }
    
    // Add enemy positions and velocities
    for (const enemyIndex of enemyIndices) {
      const enemyPos = this.getLocalPosition(
        [playerPositions[enemyIndex].x, playerPositions[enemyIndex].y],
        playerIndex,
        gameWidth,
        gameHeight,
        true
      );
      
      const enemyVel = this.getLocalVelocity(
        [playerVelocities[enemyIndex].x, playerVelocities[enemyIndex].y],
        playerIndex,
        true
      );
      
      observation.push(...enemyPos);
      observation.push(...enemyVel);
    }
    
    // Add ball position and velocity
    const ballPos = this.getLocalPosition(
      [ballPosition.x, ballPosition.y],
      playerIndex,
      gameWidth,
      gameHeight,
      true
    );
    
    const ballVel = this.getLocalVelocity(
      [ballVelocity.x, ballVelocity.y],
      playerIndex,
      true
    );
    
    observation.push(...ballPos);
    observation.push(...ballVel);
    
    return observation;
  }

  // Helper for coordinate transformation
  private getLocalPosition(pos: [number, number], agentId: number, gameWidth: number, gameHeight: number, normalize = false): [number, number] {
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

  private getLocalVelocity(vel: [number, number], agentId: number, normalize = false): [number, number] {
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
      newVel[0] = newVel[0] / 20.0; // Normalize by REALISTIC_MAXIMUM_VELOCITY
      newVel[1] = newVel[1] / 20.0;
    }
    
    return newVel;
  }

  isReady(): boolean {
    return this.session1 !== null && this.session2 !== null;
  }

  getError(): string | null {
    return this.error;
  }

  isLoadingModels(): boolean {
    return this.isLoading;
  }
} 