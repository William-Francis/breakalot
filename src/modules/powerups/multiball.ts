import type { GameModule } from '../module.js';
import type { Ball, Brick, GameState } from '../../shared/types.js';
import { BALL_SPEED, BALL_RADIUS, CANVAS_WIDTH, ZONE_HEIGHT } from '../../shared/constants.js';

const MULTIBALL_CHANCE = 0.1; // 10% chance on brick break

export const multiBallModule: GameModule = {
  id: 'multiball',

  onBallHitBrick(ball: Ball, brick: Brick, state: GameState): void {
    if (Math.random() > MULTIBALL_CHANCE) return;

    // Find the team this ball belongs to
    for (let i = 0; i < state.teams.length; i++) {
      const team = state.teams[i];
      if (team.balls.includes(ball)) {
        const zoneTop = i * ZONE_HEIGHT;
        const newBall: Ball = {
          id: `ball-${i}-${Date.now()}-mb`,
          x: ball.x,
          y: ball.y,
          vx: -ball.vx, // opposite direction
          vy: ball.vy,
          radius: BALL_RADIUS,
          paused: false,
          pauseUntil: 0,
          temporary: true,
          expiresAt: Date.now() + 15000,
          speedMultiplier: 1,
          speedResetAt: 0,
        };
        team.balls.push(newBall);
        break;
      }
    }
  },
};
