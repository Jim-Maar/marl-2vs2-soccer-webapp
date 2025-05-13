import React, { useState, useCallback } from 'react';
// Import with type reference
// @ts-ignore
import * as ort from 'onnxruntime-web';

interface OutputData {
  name: string;
  shape: number[];
  data: number[];
}

// Interface for tensor type
interface OrtTensor {
  dims: number[];
  data: Float32Array | Int32Array | Int8Array | Uint8Array | any;
}

const OnnxModel: React.FC = () => {
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [outputs, setOutputs] = useState<OutputData[]>([]);
  const [inputData, setInputData] = useState<Float32Array | null>(null);
  
  // Create random input data for the model
  const createInput = useCallback(() => {
    const data = new Float32Array(20);
    for (let i = 0; i < 20; i++) {
      data[i] = Math.random() * 2 - 1; // Random values between -1 and 1
    }
    return data;
  }, []);

  // Run the ONNX model
  const runModel = useCallback(async () => {
    setLoading(true);
    setError(null);
    setOutputs([]);
    
    try {
      // Create session
      const session = await ort.InferenceSession.create('models/actor1.onnx');
      
      // Create input tensor
      const input = createInput();
      setInputData(input);
      
      const tensor = new ort.Tensor('float32', input, [1, 20]);
      
      // Get input name from model and create feeds object
      const feeds: Record<string, ort.Tensor> = {};
      feeds[session.inputNames[0]] = tensor;
      
      // Run inference
      const results = await session.run(feeds);
      
      // Process results
      const processedOutputs: OutputData[] = [];
      
      for (const [outputName, tensor] of Object.entries(results)) {
        const ortTensor = tensor as unknown as OrtTensor;
        processedOutputs.push({
          name: outputName,
          shape: ortTensor.dims,
          data: Array.from(ortTensor.data as Float32Array)
        });
      }
      
      setOutputs(processedOutputs);
    } catch (err: any) {
      setError(err.message || 'An error occurred while running the model');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [createInput]);

  return (
    <div className="onnx-model">
      <h2>ONNX Model Demo</h2>
      <p>This component loads and runs the actor1.onnx model from the MARL 2vs2 Soccer project.</p>
      
      <button 
        onClick={runModel} 
        disabled={loading}
        style={{
          padding: '8px 16px',
          backgroundColor: '#4CAF50',
          color: 'white',
          border: 'none',
          cursor: loading ? 'not-allowed' : 'pointer',
          opacity: loading ? 0.7 : 1
        }}
      >
        {loading ? 'Running...' : 'Run Model'}
      </button>
      
      <div className="output-container" style={{ marginTop: '20px' }}>
        {loading && <p>Loading and running model...</p>}
        
        {error && (
          <div style={{ color: 'red' }}>
            <p>Error: {error}</p>
            {(error.includes('Access-Control-Allow-Origin') || 
              error.includes('Cross-Origin') || 
              error.includes('file://')) && (
              <p>
                This is likely a browser security restriction when loading local files.
                Try serving your application with a local web server.
              </p>
            )}
          </div>
        )}
        
        {inputData && (
          <div style={{ marginTop: '10px' }}>
            <strong>Input values:</strong>{' '}
            <span style={{ fontFamily: 'monospace' }}>
              {Array.from(inputData).slice(0, 5).join(', ')}...
            </span>
          </div>
        )}
        
        {outputs.length > 0 && (
          <div style={{ marginTop: '10px' }}>
            <p style={{ color: 'green', fontWeight: 'bold' }}>Model executed successfully!</p>
            
            {outputs.map((output, index) => (
              <div 
                key={index} 
                style={{ 
                  backgroundColor: '#f5f5f5',
                  border: '1px solid #ddd',
                  padding: '10px',
                  marginTop: '10px',
                  whiteSpace: 'pre-wrap',
                  fontFamily: 'monospace'
                }}
              >
                <strong>Output "{output.name}":</strong>
                <div>Shape: [{output.shape.join(', ')}]</div>
                <div>
                  Values: 
                  {output.data.length <= 20 
                    ? JSON.stringify(output.data)
                    : JSON.stringify(output.data.slice(0, 20)) + '... (truncated)'}
                </div>
              </div>
            ))}
          </div>
        )}
        
        {!loading && !error && outputs.length === 0 && (
          <p>Click "Run Model" to execute the ONNX model</p>
        )}
      </div>
    </div>
  );
};

export default OnnxModel; 