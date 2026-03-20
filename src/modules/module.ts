import type { Ball, Brick, Paddle, GameState } from '../shared/types.js';

export interface GameModule {
  id: string;
  onBallHitBrick?(ball: Ball, brick: Brick, state: GameState): void;
  onBallHitPaddle?(ball: Ball, paddle: Paddle, state: GameState): void;
  onBallReset?(ball: Ball, state: GameState): void;
  onTick?(dt: number, state: GameState): void;
}

export class ModuleRegistry {
  private modules: GameModule[] = [];

  register(mod: GameModule): void {
    this.modules.push(mod);
  }

  getAll(): GameModule[] {
    return this.modules;
  }
}
