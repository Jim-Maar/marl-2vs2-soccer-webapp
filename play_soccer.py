import pygame
import torch
import numpy as np
import argparse
import sys
import os
import Box2D
from torch.distributions.categorical import Categorical
from ppo.environments.soccer import Soccer, UP, DOWN, LEFT, RIGHT, UP_LEFT, UP_RIGHT, DOWN_LEFT, DOWN_RIGHT, NO_OP, FPS
from pathlib import Path

UP, DOWN = DOWN, UP
UP_LEFT, DOWN_LEFT = DOWN_LEFT, UP_LEFT
UP_RIGHT, DOWN_RIGHT = DOWN_RIGHT, UP_RIGHT

# Initialize pygame
# pygame.init()
# os.environ['SDL_VIDEODRIVER'] = 'windib'  # Try forcing the Windows video driver

# Constants
KEY_REPEAT_DELAY = 100  # ms
KEY_REPEAT_INTERVAL = 50  # ms

# Player control mappings (just the main direction keys)
PLAYER_CONTROLS = {
    0: {  # Red team - Player 0 (WASD)
        pygame.K_w: UP,
        pygame.K_d: RIGHT,
        pygame.K_s: DOWN,
        pygame.K_a: LEFT,
    },
    1: {  # Red team - Player 1 (IJKL)
        pygame.K_i: UP,
        pygame.K_l: RIGHT,
        pygame.K_k: DOWN,
        pygame.K_j: LEFT,
    },
    2: {  # Blue team - Player 2 (Arrow keys)
        pygame.K_UP: UP,
        pygame.K_RIGHT: RIGHT,
        pygame.K_DOWN: DOWN,
        pygame.K_LEFT: LEFT,
    },
    3: {  # Blue team - Player 3 (Numpad)
        pygame.K_KP8: UP,
        pygame.K_KP6: RIGHT,
        pygame.K_KP5: DOWN,
        pygame.K_KP4: LEFT,
    }
}

# Player descriptions
PLAYER_DESCRIPTIONS = {
    0: "Red Team - Left (WASD for movement, press two keys for diagonal movement)",
    1: "Red Team - Right (IJKL for movement, press two keys for diagonal movement)",
    2: "Blue Team - Left (Arrow keys for movement, press two keys for diagonal movement)",
    3: "Blue Team - Right (Numpad 8/4/5/6 for movement, press two keys for diagonal movement)"
}

def load_actor_model(model_path):
    """Load the actor model from the given path"""
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    try:
        # Set weights_only=False to load the entire model (compatible with models saved using torch.save(model))
        actor = torch.load(model_path, map_location=device, weights_only=False)
        actor.eval()
        print(f"Successfully loaded model from {model_path}")
        return actor
    except Exception as e:
        print(f"Error loading model: {e}")
        print("\nTry running with an older version of PyTorch or modify the model saving/loading mechanism.")
        sys.exit(1)

def get_ai_action(actor, observation):
    """Get the AI action given the observation"""
    with torch.inference_mode():
        observation_tensor = torch.tensor(observation, dtype=torch.float32).unsqueeze(0)
        logits = actor(observation_tensor)
        dist = Categorical(logits=logits)
        action = dist.sample().item()
    return action

def player_control(env, human_players, actor_model, mode):
    """Main game loop with player control"""
    # creen = pygame.display.set_mode((600, 800))
    # clock = pygame.time.Clock()
    running = True
    observations, _ = env.reset()
    score = [0, 0]
    
    # Set window title
    if mode == "1p":
        player_idx = human_players[0]
        title = f"Soccer - Single Player (Controlling Player {player_idx})"
    elif mode == "2p-team":
        team = "Red" if human_players[0] < 2 else "Blue"
        title = f"Soccer - Two Players on {team} Team"
    else:  # 2p-vs
        title = "Soccer - Two Players on Opposing Teams"
    
    # pygame.display.set_caption(title)
    
    # Set up key repeat for smoother controls
    pygame.key.set_repeat(KEY_REPEAT_DELAY, KEY_REPEAT_INTERVAL)
    
    # Display instructions
    print("\n=== Soccer Game Controls ===")
    print("Human-controlled players:")
    for idx in human_players:
        print(f"  Player {idx}: {PLAYER_DESCRIPTIONS[idx]}")
    print("\nAI-controlled players:")
    for idx in range(env.num_agents):
        if idx not in human_players:
            print(f"  Player {idx}: AI")
    print("\nPress ESC to quit")
    print("==========================\n")
    
    while running:
        # Initialize actions as NO_OP
        actions = [NO_OP] * env.num_agents
        
        # Process events
        for event in pygame.event.get():
            if event.type == pygame.QUIT:
                running = False
            elif event.type == pygame.KEYDOWN:
                if event.key == pygame.K_ESCAPE:
                    running = False
        
        # Get pressed keys and set player actions
        keys = pygame.key.get_pressed()
        
        # Process human player inputs
        for player_idx in human_players:
            # Default to NO_OP
            action = NO_OP
            
            # Process controls based on which player this is
            if player_idx == 0:  # Player 0 (WASD)
                if keys[pygame.K_w] and keys[pygame.K_d]:
                    action = UP_RIGHT
                elif keys[pygame.K_w] and keys[pygame.K_a]:
                    action = UP_LEFT
                elif keys[pygame.K_s] and keys[pygame.K_d]:
                    action = DOWN_RIGHT
                elif keys[pygame.K_s] and keys[pygame.K_a]:
                    action = DOWN_LEFT
                # Single key movement
                elif keys[pygame.K_w]:
                    action = UP
                elif keys[pygame.K_d]:
                    action = RIGHT
                elif keys[pygame.K_s]:
                    action = DOWN
                elif keys[pygame.K_a]:
                    action = LEFT
            
            elif player_idx == 1:  # Player 1 (IJKL)
                if keys[pygame.K_i] and keys[pygame.K_l]:
                    action = UP_RIGHT
                elif keys[pygame.K_i] and keys[pygame.K_j]:
                    action = UP_LEFT
                elif keys[pygame.K_k] and keys[pygame.K_l]:
                    action = DOWN_RIGHT
                elif keys[pygame.K_k] and keys[pygame.K_j]:
                    action = DOWN_LEFT
                # Single key movement
                elif keys[pygame.K_i]:
                    action = UP
                elif keys[pygame.K_l]:
                    action = RIGHT
                elif keys[pygame.K_k]:
                    action = DOWN
                elif keys[pygame.K_j]:
                    action = LEFT
            
            elif player_idx == 2:  # Player 2 (Arrow keys)
                if keys[pygame.K_UP] and keys[pygame.K_RIGHT]:
                    action = UP_RIGHT
                elif keys[pygame.K_UP] and keys[pygame.K_LEFT]:
                    action = UP_LEFT
                elif keys[pygame.K_DOWN] and keys[pygame.K_RIGHT]:
                    action = DOWN_RIGHT
                elif keys[pygame.K_DOWN] and keys[pygame.K_LEFT]:
                    action = DOWN_LEFT
                # Single key movement
                elif keys[pygame.K_UP]:
                    action = UP
                elif keys[pygame.K_RIGHT]:
                    action = RIGHT
                elif keys[pygame.K_DOWN]:
                    action = DOWN
                elif keys[pygame.K_LEFT]:
                    action = LEFT
            
            elif player_idx == 3:  # Player 3 (Numpad)
                if keys[pygame.K_KP8] and keys[pygame.K_KP6]:
                    action = UP_RIGHT
                elif keys[pygame.K_KP8] and keys[pygame.K_KP4]:
                    action = UP_LEFT
                elif keys[pygame.K_KP5] and keys[pygame.K_KP6]:
                    action = DOWN_RIGHT
                elif keys[pygame.K_KP5] and keys[pygame.K_KP4]:
                    action = DOWN_LEFT
                # Single key movement
                elif keys[pygame.K_KP8]:
                    action = UP
                elif keys[pygame.K_KP6]:
                    action = RIGHT
                elif keys[pygame.K_KP5]:
                    action = DOWN
                elif keys[pygame.K_KP4]:
                    action = LEFT
                        
            actions[player_idx] = action
        
        # Get AI actions for non-human players
        for player_idx in range(env.num_agents):
            if player_idx not in human_players:
                actions[player_idx] = get_ai_action(actor_model, observations[player_idx])
        
        # Take a step in the environment
        observations, _, terminated, truncated, _ = env.step(actions)
        
        # Render the environment - explicitly use human mode
        # screen.fill("purple")
        env.render(mode="human")
        
        # Ensure the display is updated
        # pygame.display.flip()
        
        # Update score display
        if env.score != score:
            score = env.score.copy()
            print(f"Score: Red {score[0]} - {score[1]} Blue")
        
        # Reset if the episode is done
        if terminated or truncated:
            observations, _ = env.reset()
            print("New game!")
        
        # Cap the frame rate
        # clock.tick(FPS)
    
    env.close()
    pygame.quit()

def main():
    parser = argparse.ArgumentParser(description="Play soccer with AI agents")
    parser.add_argument("--mode", type=str, default="1p", choices=["1p", "2p-team", "2p-vs"], 
                        help="Game mode: 1p (one player), 2p-team (two players on same team), 2p-vs (two players on opposing teams)")
    parser.add_argument("--player", type=int, default=0, choices=[0, 1, 2, 3], 
                        help="Which player to control in 1p mode (0=red left, 1=red right, 2=blue left, 3=blue right)")
    parser.add_argument("--model", type=str, default="models/actor.pth", 
                        help="Path to the actor model file")
    args = parser.parse_args()
    
    # Check if model exists
    model_path = args.model
    if not os.path.isabs(model_path):
        # Try relative to the script directory
        script_dir = os.path.dirname(os.path.abspath(__file__))
        model_path = os.path.join(script_dir, model_path)
    
    if not os.path.exists(model_path):
        print(f"Error: Model file not found at {model_path}")
        sys.exit(1)
    
    # Ensure pygame display is initialized
    '''try:
        pygame.display.init()
    except pygame.error:
        print("Warning: Could not initialize default pygame display. Trying alternative drivers...")
        os.environ['SDL_VIDEODRIVER'] = 'windib'  # Try Windows driver
        try:
            pygame.display.init()
        except pygame.error:
            print("Still failed. Trying dummy driver...")
            os.environ['SDL_VIDEODRIVER'] = 'dummy'
            pygame.display.init()'''
    
    # Set up the environment with explicit render mode
    env = Soccer(render_mode="human")
    
    # Determine which players are human-controlled
    human_players = []
    if args.mode == "1p":
        human_players = [args.player]
    elif args.mode == "2p-team":
        if args.player < 2:  # Red team
            human_players = [0, 1]
        else:  # Blue team
            human_players = [2, 3]
    elif args.mode == "2p-vs":
        if args.player in [0, 1]:  # First player on red team
            human_players = [args.player, 2]  # Second player is blue left
        else:  # First player on blue team
            human_players = [0, args.player]  # Second player is red left
    
    # Load the actor model
    actor_model = load_actor_model(model_path)
    
    # Start the game
    player_control(env, human_players, actor_model, args.mode)

if __name__ == "__main__":
    main()
