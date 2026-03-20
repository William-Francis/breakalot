import type { Server } from 'socket.io';
import type {
  Player,
  Team,
  Paddle,
  GameState,
  InputPayload,
  Brick,
  Ball,
} from '../shared/types.js';
import {
  GAME_STATE,
  GAME_BRICK_BROKEN,
  GAME_BALL_RESET,
  GAME_OVER,
  GAME_START,
} from '../shared/events.js';
import {
  TICK_MS,
  TICK_RATE,
  CANVAS_WIDTH,
  ZONE_HEIGHT,
  BRICK_COLS,
  BRICK_ROWS,
  BRICK_WIDTH,
  BRICK_HEIGHT,
  BALL_SPEED,
  BALL_RADIUS,
  PADDLE_WIDTH,
  PADDLE_HEIGHT,
  POWERUP_CHANCE,
  POWERUP_DURATION,
  MULTIBALL_SPAWN_COUNT,
  SPEEDBALL_MULTIPLIER,
  BRICK_SCORE,
  COMBO_LEVEL_1,
  COMBO_LEVEL_2,
  COMBO_LEVEL_3,
} from '../shared/constants.js';
import { PhysicsEngine } from './physics.js';
import type { GameModule } from '../modules/module.js';

const TEAM_A = 'team-a';
const TEAM_B = 'team-b';

export class Game {
  private io: Server;
  private teams: Team[] = [];
  private paddles: Paddle[] = [];
  private inputMap: Map<string, number> = new Map();
  private elapsed = 0;
  private interval: ReturnType<typeof setInterval> | null = null;
  private physics = new PhysicsEngine();
  private modules: GameModule[] = [];

  constructor(io: Server, players: Player[]) {
    this.io = io;
    this.initTeams(players);
    this.initPaddles(players);
  }

  registerModule(mod: GameModule): void {
    this.modules.push(mod);
  }

  start(): void {
    const state = this.getState();
    this.io.emit(GAME_START, state);

    this.interval = setInterval(() => {
      this.tick();
    }, TICK_MS);
  }

  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }

  handleInput(playerId: string, payload: InputPayload): void {
    // Validate: clamp dx to -1..1
    const dx = Math.max(-1, Math.min(1, payload.dx));
    this.inputMap.set(playerId, dx);
  }

  handleDisconnect(playerId: string): void {
    // Remove paddle
    this.paddles = this.paddles.filter((p) => p.playerId !== playerId);

    // Remove from team
    for (const team of this.teams) {
      team.players = team.players.filter((p) => p.id !== playerId);
    }

    // Recalculate paddle widths for uneven teams
    this.recalcPaddleWidths();

    // If a team is empty, end the game
    for (const team of this.teams) {
      if (team.players.length === 0) {
        const winner = this.teams.find((t) => t.id !== team.id);
        if (winner) {
          this.io.emit(GAME_OVER, { winnerTeamId: winner.id });
          this.stop();
        }
      }
    }
  }

  private tick(): void {
    const now = Date.now();
    const dt = TICK_MS / 1000;
    this.elapsed += TICK_MS;

    // Module onTick
    for (const mod of this.modules) {
      mod.onTick?.(dt, this.getState());
    }

    // Clean up expired temporary balls and reset speed
    this.cleanUpTemporaryBalls(now);
    this.resetExpiredSpeedBalls(now);

    const events = this.physics.tick(this.teams, this.paddles, this.inputMap, now);

    // Clear inputs
    this.inputMap.clear();

    // Process events
    for (const event of events) {
      if (event.type === 'brick-broken') {
        this.io.emit(GAME_BRICK_BROKEN, {
          teamId: event.teamId,
          brickId: event.brickId,
        });

        // Update combo and score for the breaking team
        const scoringTeam = this.teams.find((t) => t.id === event.teamId);
        if (scoringTeam) {
          scoringTeam.comboCount++;
          const multiplier = this.getComboMultiplier(scoringTeam.comboCount);
          scoringTeam.score += BRICK_SCORE * multiplier;
        }

        // Handle power-up effect
        const brokenBrick = this.findBrick(event.teamId, event.brickId!);
        if (brokenBrick?.powerUp) {
          this.activatePowerUp(brokenBrick, event.teamId, now);
        }

        // Add brick to opposing team
        const opposingTeam = this.teams.find((t) => t.id !== event.teamId);
        if (opposingTeam) {
          this.addBrickToTeam(opposingTeam);

          // Lose condition: if bricks reach the paddle zone, that team loses
          if (this.bricksReachedFloor(opposingTeam)) {
            const winner = this.teams.find((t) => t.id !== opposingTeam.id);
            if (winner) {
              this.io.emit(GAME_OVER, { winnerTeamId: winner.id });
              this.stop();
              return;
            }
          }
        }

        // Module hook
        const brick = this.findBrick(event.teamId, event.brickId!);
        const ball = this.teams.find((t) => t.id === event.teamId)?.balls[0];
        if (brick && ball) {
          for (const mod of this.modules) {
            mod.onBallHitBrick?.(ball, brick, this.getState());
          }
        }

        // Check win condition: did breaking team clear all their bricks?
        const breakingTeam = this.teams.find((t) => t.id === event.teamId);
        if (breakingTeam && breakingTeam.bricks.every((b) => !b.alive)) {
          this.io.emit(GAME_OVER, { winnerTeamId: breakingTeam.id });
          this.stop();
          return;
        }
      } else if (event.type === 'ball-reset') {
        this.io.emit(GAME_BALL_RESET, { teamId: event.teamId });

        // Reset combo for the team whose ball escaped
        const resetTeam = this.teams.find((t) => t.id === event.teamId);
        if (resetTeam) resetTeam.comboCount = 0;

        const ball = this.teams.find((t) => t.id === event.teamId)?.balls[0];
        if (ball) {
          for (const mod of this.modules) {
            mod.onBallReset?.(ball, this.getState());
          }
        }
      }
    }

    // Broadcast state
    this.io.emit(GAME_STATE, this.getState());
  }

  private getState(): GameState {
    return {
      teams: this.teams,
      paddles: this.paddles,
      tickRate: TICK_RATE,
      elapsed: this.elapsed,
      running: this.interval !== null,
    };
  }

  private initTeams(players: Player[]): void {
    const teamAPlayers = players.filter((p) => p.teamId === TEAM_A);
    const teamBPlayers = players.filter((p) => p.teamId === TEAM_B);

    this.teams = [
      {
        id: TEAM_A,
        players: teamAPlayers,
        bricks: this.createBrickGrid(0),
        balls: [this.createBall(0)],
        comboCount: 0,
        score: 0,
      },
      {
        id: TEAM_B,
        players: teamBPlayers,
        bricks: this.createBrickGrid(1),
        balls: [this.createBall(1)],
        comboCount: 0,
        score: 0,
      },
    ];
  }

  private createBrickGrid(zoneIndex: number): Brick[] {
    const bricks: Brick[] = [];
    const zoneTop = zoneIndex * ZONE_HEIGHT;
    for (let row = 0; row < BRICK_ROWS; row++) {
      for (let col = 0; col < BRICK_COLS; col++) {
        const powerUp = Math.random() < POWERUP_CHANCE
          ? (Math.random() < 0.5 ? 'multiball' as const : 'speedball' as const)
          : null;
        bricks.push({
          id: `brick-${zoneIndex}-${row}-${col}`,
          row,
          col,
          x: col * BRICK_WIDTH,
          y: zoneTop + row * BRICK_HEIGHT,
          width: BRICK_WIDTH,
          height: BRICK_HEIGHT,
          alive: true,
          powerUp,
        });
      }
    }
    return bricks;
  }

  private createBall(zoneIndex: number): Ball {
    const zoneTop = zoneIndex * ZONE_HEIGHT;
    return {
      id: `ball-${zoneIndex}-${Date.now()}`,
      x: CANVAS_WIDTH / 2,
      y: zoneTop + ZONE_HEIGHT / 2,
      vx: BALL_SPEED * (Math.random() > 0.5 ? 1 : -1) * 0.5,
      vy: -BALL_SPEED,
      radius: BALL_RADIUS,
      paused: false,
      pauseUntil: 0,
      temporary: false,
      expiresAt: 0,
      speedMultiplier: 1,
      speedResetAt: 0,
    };
  }

  private initPaddles(players: Player[]): void {
    const teamAPlayers = players.filter((p) => p.teamId === TEAM_A);
    const teamBPlayers = players.filter((p) => p.teamId === TEAM_B);

    this.paddles = [];
    this.createPaddlesForTeam(TEAM_A, teamAPlayers, 0);
    this.createPaddlesForTeam(TEAM_B, teamBPlayers, 1);
    this.recalcPaddleWidths();
  }

  private createPaddlesForTeam(
    teamId: string,
    players: Player[],
    zoneIndex: number
  ): void {
    const zoneTop = zoneIndex * ZONE_HEIGHT;
    const paddleY = zoneTop + ZONE_HEIGHT - PADDLE_HEIGHT - 4;
    const count = players.length || 1;
    const spacing = CANVAS_WIDTH / count;

    for (let i = 0; i < players.length; i++) {
      this.paddles.push({
        playerId: players[i].id,
        teamId,
        x: spacing * i + (spacing - PADDLE_WIDTH) / 2,
        y: paddleY,
        width: PADDLE_WIDTH,
        height: PADDLE_HEIGHT,
      });
    }
  }

  private recalcPaddleWidths(): void {
    const teamA = this.teams.find((t) => t.id === TEAM_A);
    const teamB = this.teams.find((t) => t.id === TEAM_B);
    if (!teamA || !teamB) return;

    const countA = teamA.players.length;
    const countB = teamB.players.length;

    for (const paddle of this.paddles) {
      if (paddle.teamId === TEAM_A) {
        paddle.width = countA < countB ? PADDLE_WIDTH * 2 : PADDLE_WIDTH;
      } else {
        paddle.width = countB < countA ? PADDLE_WIDTH * 2 : PADDLE_WIDTH;
      }
    }
  }

  private addBrickToTeam(team: Team): void {
    // Revive a random dead brick
    const deadBricks = team.bricks.filter((b) => !b.alive);
    if (deadBricks.length > 0) {
      const pick = deadBricks[Math.floor(Math.random() * deadBricks.length)];
      pick.alive = true;
      pick.powerUp = this.randomPowerUp();
      return;
    }

    // All bricks alive — add one brick on a new row at a random column
    const maxRow = Math.max(...team.bricks.map((b) => b.row), -1);
    const newRow = maxRow + 1;
    const zoneIndex = this.teams.indexOf(team);
    const zoneTop = zoneIndex * ZONE_HEIGHT;
    const col = Math.floor(Math.random() * BRICK_COLS);

    team.bricks.push({
      id: `brick-${zoneIndex}-${newRow}-${col}-${Date.now()}`,
      row: newRow,
      col,
      x: col * BRICK_WIDTH,
      y: zoneTop + newRow * BRICK_HEIGHT,
      width: BRICK_WIDTH,
      height: BRICK_HEIGHT,
      alive: true,
      powerUp: this.randomPowerUp(),
    });
  }

  private bricksReachedFloor(team: Team): boolean {
    const zoneIndex = this.teams.indexOf(team);
    const zoneBottom = (zoneIndex + 1) * ZONE_HEIGHT;
    const floorLine = zoneBottom - PADDLE_HEIGHT - 4; // paddle zone starts here
    return team.bricks.some(
      (b) => b.alive && b.y + b.height >= floorLine
    );
  }

  private activatePowerUp(brick: Brick, teamId: string, now: number): void {
    const team = this.teams.find((t) => t.id === teamId);
    if (!team) return;
    const zoneIndex = this.teams.indexOf(team);
    const zoneTop = zoneIndex * ZONE_HEIGHT;

    if (brick.powerUp === 'multiball') {
      for (let i = 0; i < MULTIBALL_SPAWN_COUNT; i++) {
        const angle = ((i + 1) / (MULTIBALL_SPAWN_COUNT + 1)) * Math.PI - Math.PI / 2;
        team.balls.push({
          id: `ball-${zoneIndex}-mb-${Date.now()}-${i}`,
          x: CANVAS_WIDTH / 2,
          y: zoneTop + ZONE_HEIGHT / 2,
          vx: BALL_SPEED * Math.sin(angle),
          vy: -BALL_SPEED * Math.cos(angle),
          radius: BALL_RADIUS,
          paused: false,
          pauseUntil: 0,
          temporary: true,
          expiresAt: now + POWERUP_DURATION,
          speedMultiplier: 1,
          speedResetAt: 0,
        });
      }
    } else if (brick.powerUp === 'speedball') {
      // Speed up the ball that hit the brick
      for (const ball of team.balls) {
        if (!ball.temporary && ball.speedMultiplier === 1) {
          ball.speedMultiplier = SPEEDBALL_MULTIPLIER;
          ball.speedResetAt = now + POWERUP_DURATION;
          ball.vx *= SPEEDBALL_MULTIPLIER;
          ball.vy *= SPEEDBALL_MULTIPLIER;
          break; // only affect one ball
        }
      }
    }
  }

  private cleanUpTemporaryBalls(now: number): void {
    for (const team of this.teams) {
      // Remove temporary balls that are paused (hit the bottom)
      team.balls = team.balls.filter(
        (b) => !b.temporary || !b.paused
      );
      // Ensure at least one ball exists
      if (team.balls.length === 0) {
        const zoneIndex = this.teams.indexOf(team);
        team.balls.push(this.createBall(zoneIndex));
      }
    }
  }

  private resetExpiredSpeedBalls(now: number): void {
    for (const team of this.teams) {
      for (const ball of team.balls) {
        if (ball.speedResetAt > 0 && now >= ball.speedResetAt) {
          ball.vx /= ball.speedMultiplier;
          ball.vy /= ball.speedMultiplier;
          ball.speedMultiplier = 1;
          ball.speedResetAt = 0;
        }
      }
    }
  }

  private getComboMultiplier(comboCount: number): number {
    if (comboCount >= COMBO_LEVEL_3) return 3;
    if (comboCount >= COMBO_LEVEL_2) return 2;
    if (comboCount >= COMBO_LEVEL_1) return 1;
    return 1;
  }

  private randomPowerUp(): 'multiball' | 'speedball' | null {
    if (Math.random() >= POWERUP_CHANCE) return null;
    return Math.random() < 0.5 ? 'multiball' : 'speedball';
  }

  private findBrick(teamId: string, brickId: string): Brick | undefined {
    const team = this.teams.find((t) => t.id === teamId);
    return team?.bricks.find((b) => b.id === brickId);
  }
}
