# SABOTAGE

## Current State
Single-player 3D raycasting game with crewmates/impostor role, 5 tasks, 3 bots, basic wandering AI, kill mechanic, and COD-style HUD. All logic in SabotageGame.tsx.

## Requested Changes (Diff)

### Add
- Emergency meeting button (press M or tap button) that pauses game and shows a voting overlay with all alive players listed; vote to eject someone; timed voting (30s), then result shown and ejected player removed
- Body report mechanic: when impostor kills a bot, a dead body stays on the map; any nearby player (or the player) can press R (or tap REPORT button) to trigger emergency meeting; body marker shown on minimap as skull/X
- Improved bot AI: bots now wander toward task locations, avoid walls more intelligently by bouncing off walls, move at varied speeds, and react to proximity (flee from impostor if player is impostor and close)
- Adjustable settings screen accessible from start screen: sliders/buttons for movement speed, kill cooldown duration, number of bots, and task count
- More tasks: add 5 additional tasks across the map (ALIGN TELESCOPE, UPLOAD LOGS, PATCH HULL, REROUTE POWER, CALIBRATE ENGINES) in new areas
- New map area labels: ENGINEERING, BRIDGE, STORAGE

### Modify
- Minimap: show dead bodies as red X markers; show bot direction arrows; improve contrast and add area labels
- HUD: add meeting button to bottom center; add report button near kill button; show player count / alive count in stats panel; add settings icon on start screen
- Game win/lose conditions: also end game if impostor is voted out (crewmates win), or if impostor kills enough that alive bots <= 1 and tasks not done

### Remove
- Nothing removed

## Implementation Plan
1. Add `DeadBody` interface and `deadBodiesRef` to track body positions
2. Add `VoteState` interface and overlay for emergency meeting/voting UI
3. Add `SettingsState` interface and settings screen accessible from start screen
4. Expand INITIAL_TASKS to 10 tasks across map
5. Improve bot AI: target nearest incomplete task, bounce off walls, vary speed, fleeing behavior
6. Add body reporting: press R or tap REPORT button; check distance to dead body
7. Add meeting button: press M or tap MEETING button
8. Implement voting overlay with React state (pointerEvents auto when meeting active)
9. Update minimap: dead body X markers, area labels overlay
10. Update HUD stats: alive bot count, meeting + report buttons
11. Update win conditions to include impostor ejection
