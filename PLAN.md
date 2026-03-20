# Breakalot — Implementation Plan

This document breaks each milestone from the spec into concrete, ordered implementation steps. Each step produces a working (or at least compilable) checkpoint so progress is always verifiable.

---

## Phase 1 · Project Scaffolding

> **Goal:** Run `npm run dev` and see "Hello Breakalot" served in the browser with a live Socket.IO connection logged in the terminal.

| #    | Task                                                                                               | Files touched             | Done |
| ---- | -------------------------------------------------------------------------------------------------- | ------------------------- | ---- |
| 1.1  | `npm init`, install deps (`express`, `socket.io`, `socket.io-client`, `typescript`, `vite`)        | `package.json`            | ☐    |
| 1.2  | Create `tsconfig.json` (strict, ESNext, shared paths)                                              | `tsconfig.json`           | ☐    |
| 1.3  | Create Vite config for the client (TS, dev server proxies `/socket.io` to Express)                 | `vite.config.ts`          | ☐    |
| 1.4  | Scaffold folder structure from spec (`src/client`, `src/server`, `src/shared`, `src/modules`)      | dirs only                 | ☐    |
| 1.5  | Create `src/shared/constants.ts` with all tuning values from spec                                  | `src/shared/constants.ts` | ☐    |
| 1.6  | Create `src/shared/types.ts` with all shared interfaces                                            | `src/shared/types.ts`     | ☐    |
| 1.7  | Create `src/shared/events.ts` with Socket.IO event name constants                                  | `src/shared/events.ts`    | ☐    |
| 1.8  | Create `src/server/index.ts` — Express + Socket.IO server, log connect/disconnect                  | `src/server/index.ts`     | ☐    |
| 1.9  | Create `src/client/index.html` — minimal HTML with `<canvas>` and a `<script type="module">` entry | `src/client/index.html`   | ☐    |
| 1.10 | Create `src/client/main.ts` — connect to Socket.IO, log connection                                 | `src/client/main.ts`      | ☐    |
| 1.11 | Add npm scripts: `dev` (run Vite + server concurrently), `build`, `start`                          | `package.json`            | ☐    |
| 1.12 | Verify: browser opens, console shows "connected", server logs connection                           | manual check              | ☐    |

---

## Phase 2 · Lobby

> **Goal:** Players can enter a name & colour, join a lobby, see other players listed, and trigger game start.

| #    | Task                                                                                                                  | Files touched                                | Done |
| ---- | --------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | ---- |
| 2.1  | Create `src/server/lobby.ts` — `Lobby` class: add/remove players, assign teams, broadcast state                       | `src/server/lobby.ts`                        | ☐    |
| 2.2  | Define `LobbyState` type in `src/shared/types.ts` (players list, team assignments, ready flags)                       | `src/shared/types.ts`                        | ☐    |
| 2.3  | Wire `player:join` and `player:ready` handlers in `src/server/index.ts`, delegate to Lobby                            | `src/server/index.ts`                        | ☐    |
| 2.4  | Create `src/client/ui/lobby.ts` — render lobby DOM: name input, colour picker, join button, player list, start button | `src/client/ui/lobby.ts`                     | ☐    |
| 2.5  | In `src/client/main.ts`, show lobby UI on load; emit `player:join` on submit                                          | `src/client/main.ts`                         | ☐    |
| 2.6  | Listen for `lobby:update` on the client; re-render player list with team labels and colours                           | `src/client/ui/lobby.ts`                     | ☐    |
| 2.7  | Implement team balancing logic in `Lobby` — assign to smaller team; rebalance on disconnect                           | `src/server/lobby.ts`                        | ☐    |
| 2.8  | Implement start trigger: when all players ready (min 2), server emits `game:start`                                    | `src/server/lobby.ts`, `src/server/index.ts` | ☐    |
| 2.9  | On `game:start`, client hides lobby UI and shows canvas                                                               | `src/client/main.ts`                         | ☐    |
| 2.10 | Verify: two browser tabs → join → see each other → start game → canvas shown                                          | manual check                                 | ☐    |

---

## Phase 3 · Core Gameplay (Single-Zone, Server-Side Physics)

> **Goal:** One team zone rendered on the canvas with a bouncing ball, paddle controlled by keyboard, and destructible bricks — all driven by the server.

### 3A — Server physics engine

| #    | Task                                                                                                           | Files touched           | Done |
| ---- | -------------------------------------------------------------------------------------------------------------- | ----------------------- | ---- |
| 3A.1 | Create `src/server/physics.ts` — `PhysicsEngine` class with a `tick(dt)` method                                | `src/server/physics.ts` | ☐    |
| 3A.2 | Implement ball movement: position += velocity × dt                                                             | `src/server/physics.ts` | ☐    |
| 3A.3 | Implement wall collision: reflect off left, right, top boundaries of a team zone                               | `src/server/physics.ts` | ☐    |
| 3A.4 | Implement paddle collision: detect ball-paddle overlap, reflect with angle based on hit position               | `src/server/physics.ts` | ☐    |
| 3A.5 | Implement brick collision: detect ball-brick overlap, mark brick `alive = false`, reflect ball                 | `src/server/physics.ts` | ☐    |
| 3A.6 | Implement ball reset: if ball.y > zone bottom → set `paused = true`, schedule unpause after `BALL_RESET_DELAY` | `src/server/physics.ts` | ☐    |
| 3A.7 | Implement paddle movement: apply `dx` from player input, clamp to zone boundaries                              | `src/server/physics.ts` | ☐    |

### 3B — Server game loop

| #    | Task                                                                                                | Files touched                               | Done |
| ---- | --------------------------------------------------------------------------------------------------- | ------------------------------------------- | ---- |
| 3B.1 | Create `src/server/game.ts` — `Game` class: initialise state (one team's bricks, one ball, paddles) | `src/server/game.ts`                        | ☐    |
| 3B.2 | Run a fixed-timestep loop (`setInterval` at `TICK_RATE`), call `physics.tick(dt)` each frame        | `src/server/game.ts`                        | ☐    |
| 3B.3 | After each tick, broadcast `game:state` to all connected clients                                    | `src/server/game.ts`                        | ☐    |
| 3B.4 | Handle `player:input` — validate & queue paddle dx for the next tick                                | `src/server/game.ts`, `src/server/index.ts` | ☐    |

### 3C — Client rendering

| #    | Task                                                                                                                              | Files touched            | Done |
| ---- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------ | ---- |
| 3C.1 | Create `src/client/renderer.ts` — `Renderer` class: takes canvas context, draws bricks, ball, paddles                             | `src/client/renderer.ts` | ☐    |
| 3C.2 | Draw bricks as coloured rectangles; skip bricks where `alive === false`                                                           | `src/client/renderer.ts` | ☐    |
| 3C.3 | Draw ball as a filled circle                                                                                                      | `src/client/renderer.ts` | ☐    |
| 3C.4 | Draw paddles as rectangles in each player's chosen colour                                                                         | `src/client/renderer.ts` | ☐    |
| 3C.5 | In `main.ts`, listen for `game:state`, store latest state, run `requestAnimationFrame` render loop calling `renderer.draw(state)` | `src/client/main.ts`     | ☐    |

### 3D — Client input

| #    | Task                                                                                                     | Files touched         | Done |
| ---- | -------------------------------------------------------------------------------------------------------- | --------------------- | ---- |
| 3D.1 | Create `src/client/input.ts` — listen for `keydown`/`keyup` (ArrowLeft, ArrowRight), track pressed state | `src/client/input.ts` | ☐    |
| 3D.2 | Each frame, compute `dx` from pressed keys, emit `player:input` to server                                | `src/client/input.ts` | ☐    |
| 3D.3 | Verify: arrow keys move paddle, ball bounces, bricks break                                               | manual check          | ☐    |

---

## Phase 4 · Two-Team Competitive Mode

> **Goal:** Canvas split into two zones; breaking a brick on your side adds one to the opposing side; multiple paddles per team with uneven-width rule.

| #   | Task                                                                                                                                                                 | Files touched                                 | Done |
| --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ---- |
| 4.1 | Update `Game` to initialise **two** teams with independent brick grids, balls, and zones                                                                             | `src/server/game.ts`                          | ☐    |
| 4.2 | Update `PhysicsEngine.tick` to loop over both team zones independently                                                                                               | `src/server/physics.ts`                       | ☐    |
| 4.3 | Implement "brick transfer" — when a brick is destroyed on Team A, call `addBrick(teamB)` (find first empty slot or append a row)                                     | `src/server/game.ts`                          | ☐    |
| 4.4 | Emit `game:brick-broken` event alongside the state update for client-side effects                                                                                    | `src/server/game.ts`                          | ☐    |
| 4.5 | Handle multiple paddles per team: distribute paddle positions evenly across the zone bottom                                                                          | `src/server/game.ts`, `src/server/physics.ts` | ☐    |
| 4.6 | Implement uneven-team paddle width: if `teamA.players.length < teamB.players.length`, set Team A paddle width = `PADDLE_WIDTH * 2`; recalculate on player join/leave | `src/server/game.ts`                          | ☐    |
| 4.7 | Update `Renderer` to draw two zones (Team A top half, Team B bottom half) with a dividing line                                                                       | `src/client/renderer.ts`                      | ☐    |
| 4.8 | Colour-code brick grids per team for visual clarity                                                                                                                  | `src/client/renderer.ts`                      | ☐    |
| 4.9 | Verify: two tabs, one per team → both see two zones → bricks transfer on break → paddles resize when a player disconnects                                            | manual check                                  | ☐    |

---

## Phase 5 · Networking Polish & Client Prediction

> **Goal:** Smooth, lag-tolerant gameplay — paddle feels instant, ball movement is smooth.

| #   | Task                                                                                                                              | Files touched                               | Done |
| --- | --------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | ---- |
| 5.1 | Implement client-side paddle prediction: apply `dx` locally before server confirms                                                | `src/client/main.ts`, `src/client/input.ts` | ☐    |
| 5.2 | Implement state interpolation: buffer two latest `game:state` frames, lerp ball/brick positions between them for smooth rendering | `src/client/renderer.ts`                    | ☐    |
| 5.3 | Add server-side input validation: clamp `dx` magnitude, reject invalid packets                                                    | `src/server/game.ts`                        | ☐    |
| 5.4 | Rate-limit `player:input` events (e.g., max once per tick)                                                                        | `src/server/game.ts`                        | ☐    |
| 5.5 | Emit `game:ball-reset` event so client can show a countdown/flash                                                                 | `src/server/game.ts`                        | ☐    |
| 5.6 | Handle player disconnect mid-game: remove paddle, rebalance widths, broadcast updated state                                       | `src/server/game.ts`, `src/server/lobby.ts` | ☐    |
| 5.7 | Verify: add artificial latency (Chrome DevTools throttle) → game still feels playable                                             | manual check                                | ☐    |

---

## Phase 6 · Game Over, HUD & Polish

> **Goal:** There's a clear winner, scores are visible, and the game feels complete.

| #   | Task                                                                                                          | Files touched                                | Done |
| --- | ------------------------------------------------------------------------------------------------------------- | -------------------------------------------- | ---- |
| 6.1 | Implement win condition: first team to clear all bricks wins; server emits `game:over`                        | `src/server/game.ts`                         | ☐    |
| 6.2 | Create `src/client/ui/hud.ts` — render team names, brick counts, elapsed time as an overlay on the canvas     | `src/client/ui/hud.ts`                       | ☐    |
| 6.3 | Create game-over screen: show winner team, player stats, "Play Again" button that returns to lobby            | `src/client/ui/hud.ts`, `src/client/main.ts` | ☐    |
| 6.4 | Add brick-break particle effect (small coloured squares scatter on destroy)                                   | `src/client/renderer.ts`                     | ☐    |
| 6.5 | Add basic sound effects (ball hit, brick break, ball reset, game over) — web Audio API or preloaded `<audio>` | `src/client/audio.ts`                        | ☐    |
| 6.6 | Visual polish: smooth canvas scaling for different window sizes, background gradient, team zone shading       | `src/client/renderer.ts`                     | ☐    |
| 6.7 | Verify: full game loop — lobby → play → win → results → lobby                                                 | manual check                                 | ☐    |

---

## Phase 7 · Module System & Sample Power-Up

> **Goal:** Demonstrate the modular architecture by implementing one power-up using the `GameModule` interface, without touching core game code.

| #   | Task                                                                                                                                 | Files touched                       | Done |
| --- | ------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------- | ---- |
| 7.1 | Create `src/modules/module.ts` — `GameModule` interface, `ModuleRegistry` class (register, invoke hooks)                             | `src/modules/module.ts`             | ☐    |
| 7.2 | Integrate `ModuleRegistry` into `Game.tick`: call `onTick`, `onBallHitBrick`, `onBallHitPaddle`, `onBallReset` at appropriate points | `src/server/game.ts`                | ☐    |
| 7.3 | Create `src/modules/powerups/multiball.ts` — "Multi-Ball" power-up: on brick break, 10 % chance to spawn a second ball for that team | `src/modules/powerups/multiball.ts` | ☐    |
| 7.4 | Register the module in `Game` constructor (or via config)                                                                            | `src/server/game.ts`                | ☐    |
| 7.5 | Update renderer to handle multiple balls per team                                                                                    | `src/client/renderer.ts`            | ☐    |
| 7.6 | Verify: play game → brick breaks → occasionally a second ball appears → both balls bounce independently                              | manual check                        | ☐    |

---

## Dependency Graph

```
Phase 1 ──► Phase 2 ──► Phase 3A ──► Phase 3B ──► Phase 3C ──► Phase 3D
                                                        │
                                                        ▼
                                                   Phase 4 ──► Phase 5 ──► Phase 6 ──► Phase 7
```

Phases 3A–3D are sequential (physics → loop → render → input), but within each phase the numbered steps can sometimes be parallelised (e.g., 3C.2–3C.4 are independent rendering tasks).

---

## Testing Strategy

| Layer          | Approach                                                                  |
| -------------- | ------------------------------------------------------------------------- |
| Physics engine | Unit tests with known input positions/velocities → assert expected output |
| Game state     | Unit tests: break brick → verify opposing team gets a new brick           |
| Lobby          | Unit tests: add players → verify team balancing                           |
| Integration    | Automated Socket.IO client scripts simulating two players                 |
| Manual QA      | Two browser tabs on every phase checkpoint                                |

---

## Risk & Mitigation

| Risk                                    | Mitigation                                                                   |
| --------------------------------------- | ---------------------------------------------------------------------------- |
| Physics glitches (tunnelling)           | Cap ball speed; use swept collision or sub-stepping at high speed            |
| Desync between server and client        | Server is authoritative; client only interpolates, never simulates           |
| High bandwidth from 60 Hz state updates | Delta compression — only send changed fields; reduce tick to 30 Hz if needed |
| Paddle overlap with many players        | Divide zone width evenly; cap max players per team                           |
