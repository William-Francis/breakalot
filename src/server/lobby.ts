import type { Server } from 'socket.io';
import type { Player, LobbyState } from '../shared/types.js';
import { LOBBY_UPDATE, GAME_START } from '../shared/events.js';

const TEAM_A = 'team-a';
const TEAM_B = 'team-b';

export class Lobby {
  private players: Map<string, Player> = new Map();
  private io: Server;

  constructor(io: Server) {
    this.io = io;
  }

  addPlayer(id: string, name: string, color: string): void {
    const teamId = this.getSmallerTeamId();
    const player: Player = { id, name, color, teamId, ready: false };
    this.players.set(id, player);
    this.broadcast();
  }

  removePlayer(id: string): void {
    this.players.delete(id);
    this.rebalanceTeams();
    this.broadcast();
  }

  setReady(id: string): boolean {
    const player = this.players.get(id);
    if (player) {
      player.ready = true;
      this.broadcast();
    }
    return this.canStart();
  }

  getPlayers(): Player[] {
    return Array.from(this.players.values());
  }

  private canStart(): boolean {
    const players = this.getPlayers();
    if (players.length < 2) return false;
    return players.every((p) => p.ready);
  }

  private getSmallerTeamId(): string {
    const counts: Record<string, number> = { [TEAM_A]: 0, [TEAM_B]: 0 };
    for (const p of this.players.values()) {
      counts[p.teamId]++;
    }
    return counts[TEAM_A] <= counts[TEAM_B] ? TEAM_A : TEAM_B;
  }

  private rebalanceTeams(): void {
    const players = this.getPlayers();
    players.forEach((p, i) => {
      p.teamId = i % 2 === 0 ? TEAM_A : TEAM_B;
    });
  }

  private broadcast(): void {
    const state: LobbyState = {
      players: this.getPlayers(),
      teams: [
        {
          id: TEAM_A,
          playerIds: this.getPlayers()
            .filter((p) => p.teamId === TEAM_A)
            .map((p) => p.id),
        },
        {
          id: TEAM_B,
          playerIds: this.getPlayers()
            .filter((p) => p.teamId === TEAM_B)
            .map((p) => p.id),
        },
      ],
    };
    this.io.emit(LOBBY_UPDATE, state);
  }
}
