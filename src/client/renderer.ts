import type { GameState, Paddle, Team, Ball, Brick } from '@shared/types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, ZONE_HEIGHT, BALL_SPEED } from '@shared/constants';

export class Renderer {
  private ctx: CanvasRenderingContext2D;

  constructor(canvas: HTMLCanvasElement) {
    this.ctx = canvas.getContext('2d')!;
  }

  draw(state: GameState, playerColors: Map<string, string>, playerNames: Map<string, string>): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Background per zone
    ctx.fillStyle = '#0f3460';
    ctx.fillRect(0, 0, CANVAS_WIDTH, ZONE_HEIGHT);
    ctx.fillStyle = '#16213e';
    ctx.fillRect(0, ZONE_HEIGHT, CANVAS_WIDTH, ZONE_HEIGHT);

    // Divider
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, ZONE_HEIGHT);
    ctx.lineTo(CANVAS_WIDTH, ZONE_HEIGHT);
    ctx.stroke();

    // Draw bricks
    for (const team of state.teams) {
      this.drawBricks(team);
    }

    // Draw paddles
    for (const paddle of state.paddles) {
      const color = playerColors.get(paddle.playerId) ?? '#e94560';
      this.drawPaddle(paddle, color);
      this.drawPaddleName(paddle, playerNames.get(paddle.playerId) ?? '');
    }

    // Draw balls
    for (const team of state.teams) {
      for (const ball of team.balls) {
        this.drawBall(ball);
      }
    }
  }

  private drawBricks(team: Team): void {
    const ctx = this.ctx;
    const teamColor = team.id === 'team-a' ? '#e94560' : '#0ea5e9';

    for (const brick of team.bricks) {
      if (!brick.alive) continue;

      const bx = brick.x + 1;
      const by = brick.y + 1;
      const bw = brick.width - 2;
      const bh = brick.height - 2;

      if (brick.powerUp === 'multiball') {
        // Gold brick with star icon
        ctx.fillStyle = '#fbbf24';
        ctx.fillRect(bx, by, bw, bh);
        ctx.strokeStyle = '#f59e0b';
        ctx.lineWidth = 2;
        ctx.strokeRect(bx, by, bw, bh);
        // Star symbol
        ctx.fillStyle = '#fff';
        ctx.font = `${bh - 4}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('✦', bx + bw / 2, by + bh / 2 + 1);
      } else if (brick.powerUp === 'speedball') {
        // Purple brick with lightning icon
        ctx.fillStyle = '#a855f7';
        ctx.fillRect(bx, by, bw, bh);
        ctx.strokeStyle = '#7c3aed';
        ctx.lineWidth = 2;
        ctx.strokeRect(bx, by, bw, bh);
        // Lightning symbol
        ctx.fillStyle = '#fff';
        ctx.font = `${bh - 4}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('⚡', bx + bw / 2, by + bh / 2 + 1);
      } else {
        ctx.fillStyle = teamColor;
        ctx.fillRect(bx, by, bw, bh);
        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 1;
        ctx.strokeRect(bx, by, bw, bh);
      }
    }
  }

  private drawPaddle(paddle: Paddle, color: string): void {
    const ctx = this.ctx;
    ctx.fillStyle = color;
    ctx.beginPath();
    const r = paddle.height / 2;
    ctx.roundRect(paddle.x, paddle.y, paddle.width, paddle.height, r);
    ctx.fill();
  }

  private drawPaddleName(paddle: Paddle, name: string): void {
    if (!name) return;
    const ctx = this.ctx;
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(name, paddle.x + paddle.width / 2, paddle.y + paddle.height + 3);
  }

  private drawBall(ball: Ball): void {
    if (ball.paused) return;
    const ctx = this.ctx;

    const speed = Math.sqrt(ball.vx * ball.vx + ball.vy * ball.vy);

    // Fire trail — length scales with speed
    if (speed > 0) {
      const trailLength = Math.min((speed / BALL_SPEED) * 20, 60);
      const nx = -ball.vx / speed;
      const ny = -ball.vy / speed;
      const gradient = ctx.createLinearGradient(
        ball.x, ball.y,
        ball.x + nx * trailLength, ball.y + ny * trailLength,
      );
      gradient.addColorStop(0, 'rgba(255,160,40,0.7)');
      gradient.addColorStop(0.4, 'rgba(255,80,20,0.3)');
      gradient.addColorStop(1, 'rgba(255,40,0,0)');

      ctx.save();
      if (ball.temporary) ctx.globalAlpha = 0.5;
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.moveTo(ball.x - ny * ball.radius * 0.6, ball.y + nx * ball.radius * 0.6);
      ctx.lineTo(ball.x + ny * ball.radius * 0.6, ball.y - nx * ball.radius * 0.6);
      ctx.lineTo(ball.x + nx * trailLength, ball.y + ny * trailLength);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // Temporary balls: semi-transparent
    if (ball.temporary) {
      ctx.globalAlpha = 0.6;
    }

    // Speed-boosted balls: orange glow
    if (ball.speedMultiplier > 1) {
      ctx.fillStyle = '#fb923c';
      ctx.shadowColor = '#f97316';
      ctx.shadowBlur = 10;
    } else {
      ctx.fillStyle = '#fff';
    }

    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.radius, 0, Math.PI * 2);
    ctx.fill();

    // Reset
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }
}
