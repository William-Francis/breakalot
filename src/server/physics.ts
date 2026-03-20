import type { Ball, Brick, Paddle, Team } from '../shared/types.js';
import {
  BALL_SPEED,
  BALL_RADIUS,
  BALL_RESET_DELAY,
  BALL_BOUNCE_ACCEL,
  PADDLE_SPEED,
  CANVAS_WIDTH,
  ZONE_HEIGHT,
  BRICK_WIDTH,
  BRICK_HEIGHT,
  TICK_MS,
} from '../shared/constants.js';

export interface CollisionEvent {
  type: 'brick-broken' | 'ball-reset';
  teamId: string;
  brickId?: string;
}

export class PhysicsEngine {
  tick(
    teams: Team[],
    paddles: Paddle[],
    inputMap: Map<string, number>,
    now: number
  ): CollisionEvent[] {
    const events: CollisionEvent[] = [];
    const dt = TICK_MS / 1000;

    // Apply paddle input
    for (const paddle of paddles) {
      const dx = inputMap.get(paddle.playerId) ?? 0;
      if (dx !== 0) {
        paddle.x += dx * PADDLE_SPEED * dt;
        // Clamp to zone
        paddle.x = Math.max(0, Math.min(CANVAS_WIDTH - paddle.width, paddle.x));
      }
    }

    // Process each team independently
    for (let ti = 0; ti < teams.length; ti++) {
      const team = teams[ti];
      const zoneTop = ti * ZONE_HEIGHT;
      const zoneBottom = zoneTop + ZONE_HEIGHT;
      const teamPaddles = paddles.filter((p) => p.teamId === team.id);

      for (const ball of team.balls) {
        // Skip paused balls
        if (ball.paused) {
          if (now >= ball.pauseUntil) {
            ball.paused = false;
            // Respawn at centre of zone — reset to base speed
            ball.x = CANVAS_WIDTH / 2;
            ball.y = zoneTop + ZONE_HEIGHT / 2;
            const speed = BALL_SPEED * ball.speedMultiplier;
            ball.vx = speed * (Math.random() > 0.5 ? 1 : -1) * 0.5;
            ball.vy = -speed;
          }
          continue;
        }

        // Move ball
        ball.x += ball.vx * dt;
        ball.y += ball.vy * dt;

        // Wall collisions (left/right)
        if (ball.x - ball.radius <= 0) {
          ball.x = ball.radius;
          ball.vx = Math.abs(ball.vx);
        } else if (ball.x + ball.radius >= CANVAS_WIDTH) {
          ball.x = CANVAS_WIDTH - ball.radius;
          ball.vx = -Math.abs(ball.vx);
        }

        // Top wall of zone
        if (ball.y - ball.radius <= zoneTop) {
          ball.y = zoneTop + ball.radius;
          ball.vy = Math.abs(ball.vy);
        }

        // Brick collisions
        for (const brick of team.bricks) {
          if (!brick.alive) continue;
          if (this.ballIntersectsBrick(ball, brick)) {
            brick.alive = false;
            ball.vy = -ball.vy;
            events.push({
              type: 'brick-broken',
              teamId: team.id,
              brickId: brick.id,
            });
          }
        }

        // Paddle collisions
        for (const paddle of teamPaddles) {
          if (this.ballIntersectsPaddle(ball, paddle)) {
            // Reflect upward
            ball.vy = -Math.abs(ball.vy);
            // Adjust angle based on hit position
            const hitPos = (ball.x - paddle.x) / paddle.width; // 0..1
            const angle = (hitPos - 0.5) * Math.PI * 0.6; // -54°..+54°
            const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy) * BALL_BOUNCE_ACCEL;
            ball.vx = speed * Math.sin(angle);
            ball.vy = -speed * Math.cos(angle);
            // Push ball above paddle
            ball.y = paddle.y - ball.radius;
          }
        }

        // Bottom of zone — ball missed
        if (ball.y + ball.radius >= zoneBottom) {
          if (ball.temporary) {
            // Temporary balls die on hitting bottom — mark for removal
            ball.paused = true;
            ball.pauseUntil = Infinity;
          } else {
            ball.paused = true;
            ball.pauseUntil = now + BALL_RESET_DELAY;
          }
          ball.vx = 0;
          ball.vy = 0;
          events.push({ type: 'ball-reset', teamId: team.id });
        }
      }
    }

    return events;
  }

  private ballIntersectsBrick(ball: Ball, brick: Brick): boolean {
    const closestX = Math.max(brick.x, Math.min(ball.x, brick.x + brick.width));
    const closestY = Math.max(brick.y, Math.min(ball.y, brick.y + brick.height));
    const dx = ball.x - closestX;
    const dy = ball.y - closestY;
    return dx * dx + dy * dy <= ball.radius * ball.radius;
  }

  private ballIntersectsPaddle(ball: Ball, paddle: Paddle): boolean {
    if (ball.vy < 0) return false; // ball moving up, skip
    const closestX = Math.max(paddle.x, Math.min(ball.x, paddle.x + paddle.width));
    const closestY = Math.max(paddle.y, Math.min(ball.y, paddle.y + paddle.height));
    const dx = ball.x - closestX;
    const dy = ball.y - closestY;
    return dx * dx + dy * dy <= ball.radius * ball.radius;
  }
}
