# Breakalot — Project Specification

## Overview

Breakalot is a competitive multiplayer Breakout game played in the browser. Two teams face off, each controlling paddles to bounce balls and break bricks. When a team breaks a brick on their side, a new brick is added to the opposing team's side. The game is built with a modular architecture to support future power-ups and gameplay additions.

---

## Tech Stack

| Layer      | Technology               |
| ---------- | ------------------------ |
| Frontend   | HTML5 Canvas, TypeScript |
| Backend    | Node.js, TypeScript      |
| Networking | Socket.IO                |
| Build      | TBD (esbuild / vite)     |

---

## Core Concepts

### Lobby

- A player visits the game URL and enters:
  - **Display name** (text input)
  - **Color** (color picker or preset palette)
- Players are placed in a lobby until a game starts.
- The server assigns players to one of two teams (Team A / Team B), balancing count as evenly as possible.

### Teams & Paddles

- Each team occupies one **half** of the screen (left vs right, or top vs bottom — see Layout).
- Every player on a team controls their **own paddle** within the team's zone.
- Paddles move **left and right** only.
- **Uneven teams rule:** If one team has fewer players than the other, each paddle on the smaller team is **twice as wide** as paddles on the larger team to compensate.

### Layout (per team half)

```
┌─────────────────────────┐
│  ░░ BRICKS ░░░░░░░░░░░  │  ← top of team zone
│                         │
│          ○ ball         │
│                         │
│   ▓▓▓ paddle(s) ▓▓▓    │  ← bottom of team zone
└─────────────────────────┘
```

- Bricks sit at the **top** of each team's zone.
- Paddles sit at the **bottom** of each team's zone.
- The ball starts in the middle of the zone and bounces within it.

### Ball Behaviour

- The ball bounces off walls (left, right, top) and paddles.
- If the ball reaches the **bottom** of a team's zone (misses all paddles), it **pauses for 1 second**, then respawns and continues bouncing from the centre of the zone.
- Standard angle-of-incidence reflection; paddle hit position can influence bounce angle.

### Brick Mechanics

- Each team starts with a grid of bricks.
- When a ball destroys a brick on Team A's side → a new brick is **added** to Team B's brick grid (and vice-versa).
- Bricks are uniform (1 hit to destroy) unless extended by a power-up module later.

### Win Condition

- TBD — potential options:
  1. First team to clear all their bricks wins.
  2. Timed rounds; team with fewer bricks remaining wins.
  3. Endless mode (no win, just score).

---

## Architecture

### Modular Design Principles

The codebase is structured so gameplay elements are **pluggable**:

```
src/
├── client/                  # Browser code
│   ├── index.html           # Entry HTML
│   ├── main.ts              # Client bootstrap
│   ├── renderer.ts          # Canvas rendering
│   ├── input.ts             # Keyboard / touch input
│   └── ui/                  # Lobby, scoreboard, HUD
│       └── lobby.ts
├── server/                  # Node.js server
│   ├── index.ts             # Server bootstrap & HTTP
│   ├── game.ts              # Game loop & state orchestration
│   ├── lobby.ts             # Lobby / matchmaking
│   └── physics.ts           # Ball, paddle, collision logic
├── shared/                  # Code shared between client & server
│   ├── types.ts             # Shared interfaces & enums
│   ├── constants.ts         # Tuning values (speeds, sizes, timings)
│   └── events.ts            # Socket.IO event name constants
├── modules/                 # Pluggable gameplay modules
│   ├── module.ts            # Base module interface
│   └── powerups/            # Future power-up implementations
└── package.json
```

### Module Interface (future extensibility)

```ts
export interface GameModule {
  id: string;
  onBallHitBrick?(ball: Ball, brick: Brick, state: GameState): void;
  onBallHitPaddle?(ball: Ball, paddle: Paddle, state: GameState): void;
  onBallReset?(ball: Ball, state: GameState): void;
  onTick?(dt: number, state: GameState): void;
}
```

Modules register with the game loop and receive callbacks at key moments, keeping the core loop clean.

---

## Networking

### Socket.IO Events

| Event (client → server) | Payload                           | Description             |
| ----------------------- | --------------------------------- | ----------------------- |
| `player:join`           | `{ name: string, color: string }` | Player enters the lobby |
| `player:ready`          | `{}`                              | Player signals ready    |
| `player:input`          | `{ dx: number }`                  | Paddle movement delta   |

| Event (server → client) | Payload               | Description                              |
| ----------------------- | --------------------- | ---------------------------------------- |
| `lobby:update`          | `LobbyState`          | Current lobby player list & teams        |
| `game:start`            | `InitialGameState`    | Game is starting; full initial state     |
| `game:state`            | `GameState`           | Authoritative state tick (sent at ~60Hz) |
| `game:brick-broken`     | `{ teamId, brickId }` | Brick destroyed (for effects/sounds)     |
| `game:ball-reset`       | `{ teamId }`          | Ball missed paddles; resetting           |
| `game:over`             | `{ winnerTeamId }`    | Game ended                               |

### Authority Model

- **Server-authoritative**: the server runs the physics simulation and broadcasts state.
- Clients send input only; the server validates and applies it.
- Clients perform local interpolation/prediction for smooth rendering.

---

## Shared Types (draft)

```ts
export interface Player {
  id: string;
  name: string;
  color: string;
  teamId: string;
}

export interface Team {
  id: string;
  players: Player[];
  bricks: Brick[];
  balls: Ball[];
}

export interface Brick {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  alive: boolean;
}

export interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  paused: boolean;
}

export interface Paddle {
  playerId: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface GameState {
  teams: Team[];
  paddles: Paddle[];
  tickRate: number;
  elapsed: number;
}
```

---

## Constants (starting values — tune during playtesting)

| Constant           | Value   | Notes                           |
| ------------------ | ------- | ------------------------------- |
| `TICK_RATE`        | 60      | Server ticks per second         |
| `BALL_SPEED`       | 300     | Pixels/sec                      |
| `PADDLE_SPEED`     | 400     | Pixels/sec                      |
| `PADDLE_WIDTH`     | 80      | Default px; doubled when uneven |
| `PADDLE_HEIGHT`    | 12      | px                              |
| `BRICK_COLS`       | 8       | Bricks per row                  |
| `BRICK_ROWS`       | 4       | Starting rows of bricks         |
| `BRICK_WIDTH`      | derived | Canvas width / BRICK_COLS       |
| `BRICK_HEIGHT`     | 20      | px                              |
| `BALL_RESET_DELAY` | 1000    | ms pause when ball hits bottom  |
| `BALL_RADIUS`      | 6       | px                              |
| `CANVAS_WIDTH`     | 800     | px                              |
| `CANVAS_HEIGHT`    | 600     | px (300 per team zone)          |

---

## Development Milestones

### M1 — Project Scaffolding

- Initialise Node.js + TypeScript project.
- Set up build pipeline (compile TS, serve static client).
- Basic Express server serving `index.html`.
- Socket.IO wired up (connect / disconnect logging).

### M2 — Lobby

- Join screen: name input, colour picker, join button.
- Server assigns players to teams.
- Lobby state broadcast; show player list in UI.
- "Start Game" trigger (manual or auto when ≥ 2 players).

### M3 — Core Gameplay (Single Team, Local)

- Render canvas with bricks, paddle, ball.
- Ball physics: bouncing off walls, paddle, bricks.
- Brick destruction on hit.
- Ball reset after hitting bottom (1 s delay).

### M4 — Two-Team Competitive Mode

- Split canvas into two team zones.
- Brick-break → add brick to opposing team.
- Multiple paddles per team (one per player).
- Uneven-team paddle width adjustment.

### M5 — Networking & Sync

- Server-authoritative game loop.
- Client input → server → state broadcast.
- Client-side interpolation for smooth display.

### M6 — Polish & Modules

- Sound effects, particle/brick-break animations.
- Scoreboard / HUD.
- Module loader for power-ups.
- First sample power-up (e.g., multi-ball, wider paddle).

---

## Open Questions

1. **Layout orientation** — teams top/bottom (vertically stacked) or left/right? Vertical stacking (as specced above) is simpler for the "bricks at top, paddle at bottom" mental model.
2. **Win condition** — which option? Or configurable per-lobby?
3. **Max players per team?**
4. **Mobile support** — touch controls needed?
5. **Deployment target** — where will this be hosted?
