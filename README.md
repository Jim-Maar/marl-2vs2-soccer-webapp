# 2vs2 Soccer Game with AI Agents

A physics-based soccer simulation game where players can play as one of four soccer agents, either controlled by humans or AI.

## Features

- 2vs2 top-down soccer game with realistic physics using Box2D
- Multiple control options for players (WASD, IJKL, Arrow keys, Numpad)
- AI agents trained with reinforcement learning (using ONNX models)
- Real-time scoring and gameplay
- Interactive UI for selecting player controls

## Technology Stack

- React
- TypeScript
- Box2D (WebAssembly)
- ONNX Runtime Web

## Getting Started

### Prerequisites

- Node.js (version 14 or newer)
- npm (version 6 or newer)

### Installation

1. Clone the repository
2. Install dependencies:
   ```
   npm install
   ```
3. Start the development server:
   ```
   npm run dev
   ```

## How to Play

1. Select controls for each player using the dropdown menus
2. Click "Start Game" to begin playing
3. Control your player using the selected control scheme
4. Score by getting the ball into the opponent's goal

## Controls

- **WASD**: W (up), A (left), S (down), D (right)
- **IJKL**: I (up), J (left), K (down), L (right)
- **Arrows**: Arrow keys for movement
- **Numpad**: 8 (up), 4 (left), 5 (down), 6 (right)
- **AI Model**: Player controlled by AI

## License

MIT
