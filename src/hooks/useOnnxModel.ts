import { useState, useEffect, useCallback, useRef } from 'react';
// @ts-ignore - onnxruntime-web doesn't have proper TypeScript definitions
import * as ort from 'onnxruntime-web';
import { Observation } from '../types';
import { AI_TEMPERATURE } from '../utils/constants';

// Add temperature constant
// const DEFAULT_TEMPERATURE = 1.0; // Default temperature (1.0 = standard softmax)

interface UseOnnxModelProps {
  modelPath1: string;
  modelPath2: string;
}

interface UseOnnxModelReturn {
  isLoading: boolean;
  error: string | null;
  getAction: (observation: Observation, modelNumber: 1 | 2) => Promise<number>;
  isReady: boolean;
}

export const useOnnxModel = ({ modelPath1, modelPath2 }: UseOnnxModelProps): UseOnnxModelReturn => {
  const [session1, setSession1] = useState<ort.InferenceSession | null>(null);
  const [session2, setSession2] = useState<ort.InferenceSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Use a ref to track if the models have started loading to prevent duplicate loading
  const isLoadingRef = useRef(false);

  // Load models on mount
  useEffect(() => {
    // Only load models once
    if (isLoadingRef.current) return;
    
    const loadModels = async () => {
      try {
        isLoadingRef.current = true;
        console.log('useOnnxModel: Starting to load ONNX models');
        setIsLoading(true);
        setError(null);

        // Load both models concurrently
        console.log('useOnnxModel: Loading model 1 from:', modelPath1);
        console.log('useOnnxModel: Loading model 2 from:', modelPath2);
        const [model1, model2] = await Promise.all([
          ort.InferenceSession.create(modelPath1),
          ort.InferenceSession.create(modelPath2)
        ]);

        setSession1(model1);
        setSession2(model2);
        
        console.log('useOnnxModel: ONNX models loaded successfully');
      } catch (err: any) {
        const errorMsg = err.message || 'Error loading ONNX models';
        console.error('useOnnxModel: Failed to load ONNX models:', err);
        setError(errorMsg);
      } finally {
        setIsLoading(false);
        console.log('useOnnxModel: Model loading process complete');
      }
    };

    loadModels();
  }, []); // Remove dependencies to prevent reloading

  // Function to get action from AI model
  const getAction = useCallback(async (observation: Observation, modelNumber: 1 | 2 = 1): Promise<number> => {
    const session = modelNumber === 1 ? session1 : session2;
    
    if (!session) {
      throw new Error(`Model ${modelNumber} not loaded`);
    }
    
    try {
      // Create input tensor
      const tensor = new ort.Tensor('float32', new Float32Array(observation), [1, observation.length]);
      
      // Prepare feeds object with the correct input name
      const feeds: Record<string, ort.Tensor> = {};
      feeds[session.inputNames[0]] = tensor;
      
      // Run inference
      const results = await session.run(feeds);
      
      // Get output tensor
      const output = results[session.outputNames[0]];
      const outputData = output.data as Float32Array;
      
      // Get action with highest probability
      // return Array.from(outputData).indexOf(Math.max(...Array.from(outputData)));
      return softmaxSampling(Array.from(outputData), AI_TEMPERATURE);
    } catch (err) {
      console.error('Error running inference:', err);
      return 8; // NO_OP as fallback
    }
  }, [session1, session2]);

  // Softmax sampling implementation with temperature parameter
  const softmaxSampling = (logits: number[], temperature: number = AI_TEMPERATURE): number => {
    // Apply softmax to convert logits to probabilities with temperature
    const probabilities = softmax(logits, temperature);
    
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
  
  // Softmax function with temperature parameter
  const softmax = (logits: number[], temperature: number = AI_TEMPERATURE): number[] => {
    // Find max for numerical stability
    const maxLogit = Math.max(...logits);
    
    // Apply temperature scaling and subtract max for numerical stability
    // Lower temperature makes distribution more peaked (less random)
    // Higher temperature makes distribution more uniform (more random)
    const expValues = logits.map(logit => Math.exp((logit - maxLogit) / temperature));
    
    // Sum of all exp values
    const sumExp = expValues.reduce((sum, val) => sum + val, 0);
    
    // Normalize to get probabilities
    return expValues.map(expVal => expVal / sumExp);
  }

  return {
    isLoading,
    error,
    getAction,
    isReady: !!session1 && !!session2
  };
}; 