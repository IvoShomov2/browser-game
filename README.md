# Garden Last Stand

Garden Last Stand is a browser-based lane-defense game inspired by classic plant-vs-zombie gameplay. It runs entirely in the browser with HTML, CSS, and vanilla JavaScript, using a canvas playfield, DOM-based sprite layering, sound effects, wave progression, and a finite state machine that drives zombie behavior.

## Features

- Static browser game with no build step or external dependencies
- Three plant types: `Peashooter`, `Sunflower`, and `Wallnut`
- Multiple difficulty modes: `Easy`, `Normal`, and `Hard`
- Wave-based progression with score, base health, sun economy, and lane pressure
- Canvas-rendered game board with animated DOM sprite overlays
- Finite state machine enemy behavior including spawn, walking, targeting, eating, rage, fleeing, death, and respawn
- Layered feedback with particles, lawnmowers, UI overlays, and audio cues

## Play Locally

This project does not require installation.

### Option 1: Open the game directly

Open [index.html](/C:/Users/User/Documents/GitHub/browser-game/index.html) in a modern browser.

### Option 2: Serve it locally

If you prefer running it from a local server:

```powershell
python -m http.server 8000
```

Then open `http://localhost:8000`.

## How To Play

Your goal is to stop zombies from crossing the lawn and reducing the house's base integrity to zero.

- Spend sun to place plants on the grid
- Use sunflowers to grow your economy
- Use peashooters to damage enemies in their lane
- Use wallnuts to stall heavy pressure
- Survive increasingly difficult waves and keep lanes from collapsing

The run ends in victory after surviving the late waves, or in defeat if too many zombies breach the left side of the board.

## Controls

- `Left Click`: place the selected plant
- `Right Click`: dig up a plant and refund part of its cost
- `1 / 2 / 3`: switch between seed types
- `Mouse Wheel`: cycle plants and adjust zoom
- `Middle Mouse`: trigger the scare effect to make weak zombies flee
- `Esc`: pause or resume
- `M`: toggle sound
- `R`: restart after game over

Sun is collected automatically when your cursor moves close to it.

## Project Structure

- [index.html](/C:/Users/User/Documents/GitHub/browser-game/index.html): game shell, HUD, overlays, and UI
- [css/style.css](/C:/Users/User/Documents/GitHub/browser-game/css/style.css): visual styling and layout
- [js/main.js](/C:/Users/User/Documents/GitHub/browser-game/js/main.js): game loop, rendering, input, spawning, HUD, and overall state
- [js/player.js](/C:/Users/User/Documents/GitHub/browser-game/js/player.js): plant, projectile, and sun token logic
- [js/enemy.js](/C:/Users/User/Documents/GitHub/browser-game/js/enemy.js): zombie behavior and animation
- [js/fsm.js](/C:/Users/User/Documents/GitHub/browser-game/js/fsm.js): reusable finite state machine implementation
- `assets/`: plant, zombie, and audio assets
- `docs/`: supporting documentation
