import React from 'react';
import './App.css';
import PhysicsSimulation from './components/PhysicsSimulation';
// import OnnxModel from './components/OnnxModel';

function App() {
  return (
    <div className="App">
      <h1>React + TypeScript + Vite + Box2D + ONNX</h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
        <PhysicsSimulation />
        {/* <OnnxModel /> */}
      </div>
    </div>
  );
}

export default App;
