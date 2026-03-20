// ----- Tuning constants (adjust during playtesting) -----

export const TICK_RATE = 60;
export const TICK_MS = 1000 / TICK_RATE;

// Ball
export const BALL_SPEED = 300; // px/sec
export const BALL_RADIUS = 6;
export const BALL_RESET_DELAY = 1000; // ms
export const BALL_BOUNCE_ACCEL = 1.05; // 5% faster each paddle bounce

// Paddle
export const PADDLE_SPEED = 400; // px/sec
export const PADDLE_WIDTH = 80;
export const PADDLE_HEIGHT = 12;

// Bricks
export const BRICK_COLS = 8;
export const BRICK_ROWS = 4;
export const BRICK_HEIGHT = 20;

// Canvas
export const CANVAS_WIDTH = 1600;
export const CANVAS_HEIGHT = 1200;
export const ZONE_HEIGHT = CANVAS_HEIGHT / 2;

// Power-ups
export const POWERUP_CHANCE = 0.2; // 20% of bricks are power-up bricks
export const POWERUP_DURATION = 15000; // 15 seconds
export const MULTIBALL_SPAWN_COUNT = 1;
export const SPEEDBALL_MULTIPLIER = 2;

// Derived
export const BRICK_WIDTH = CANVAS_WIDTH / BRICK_COLS;

// Scoring & Combo
export const BRICK_SCORE = 100;
export const COMBO_LEVEL_1 = 1;   // 1× multiplier
export const COMBO_LEVEL_2 = 5;   // 2× multiplier
export const COMBO_LEVEL_3 = 10;  // 3× multiplier
