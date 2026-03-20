// ---- Shared type definitions ----

export interface Player {
  id: string;
  name: string;
  color: string;
  teamId: string;
  ready: boolean;
}

export interface Team {
  id: string;
  players: Player[];
  bricks: Brick[];
  balls: Ball[];
  comboCount: number;
  score: number;
}

export type PowerUpType = 'multiball' | 'speedball' | null;

export interface Brick {
  id: string;
  row: number;
  col: number;
  x: number;
  y: number;
  width: number;
  height: number;
  alive: boolean;
  powerUp: PowerUpType;
}

export interface Ball {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  paused: boolean;
  pauseUntil: number; // timestamp when pause ends, 0 if not paused
  temporary: boolean; // true for power-up spawned balls
  expiresAt: number;  // timestamp when temporary ball despawns, 0 if permanent
  speedMultiplier: number; // 1 = normal, 2 = speedball
  speedResetAt: number;    // timestamp when speed resets, 0 if normal
}

export interface Paddle {
  playerId: string;
  teamId: string;
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
  running: boolean;
}

export interface LobbyState {
  players: Player[];
  teams: { id: string; playerIds: string[] }[];
}

// Socket payloads
export interface JoinPayload {
  name: string;
  color: string;
}

export interface InputPayload {
  dx: number;
}

export interface BrickBrokenPayload {
  teamId: string;
  brickId: string;
}

export interface BallResetPayload {
  teamId: string;
}

export interface GameOverPayload {
  winnerTeamId: string;
}
