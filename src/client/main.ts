import { io } from 'socket.io-client';
import {
  PLAYER_JOIN,
  PLAYER_READY,
  PLAYER_INPUT,
  LOBBY_UPDATE,
  GAME_START,
  GAME_STATE,
  GAME_OVER,
} from '@shared/events';
import type {
  GameState,
  LobbyState,
  GameOverPayload,
} from '@shared/types';
import { Renderer } from './renderer';
import { InputHandler } from './input';
import { setupLobby, renderLobby } from './ui/lobby';
import { updateHUD, showGameOver, initComboPanels } from './ui/hud';

const socket = io();

// ---- Elements ----
const lobbyEl = document.getElementById('lobby')!;
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
const gameRowEl = document.getElementById('game-row')!;
const hudEl = document.getElementById('hud')!;

// ---- State ----
let latestState: GameState | null = null;
const playerColors = new Map<string, string>();
const playerNames = new Map<string, string>();
let renderer: Renderer | null = null;
let input: InputHandler | null = null;

// ---- Lobby ----
setupLobby(
  (name, color) => {
    socket.emit(PLAYER_JOIN, { name, color });
  },
  () => {
    socket.emit(PLAYER_READY);
  }
);

socket.on(LOBBY_UPDATE, (state: LobbyState) => {
  renderLobby(state);
  // Cache player colours and names
  for (const p of state.players) {
    playerColors.set(p.id, p.color);
    playerNames.set(p.id, p.name);
  }
});

// ---- Game start ----
socket.on(GAME_START, (state: GameState) => {
  latestState = state;
  lobbyEl.style.display = 'none';
  gameRowEl.classList.add('active');
  hudEl.classList.add('active');

  initComboPanels();

  renderer = new Renderer(canvas);
  input = new InputHandler((dx) => {
    socket.emit(PLAYER_INPUT, { dx });
  });

  requestAnimationFrame(gameLoop);
});

// ---- Game state ----
socket.on(GAME_STATE, (state: GameState) => {
  latestState = state;
});

// ---- Game over ----
socket.on(GAME_OVER, (payload: GameOverPayload) => {
  showGameOver(payload.winnerTeamId, () => {
    // Reload to go back to lobby
    window.location.reload();
  });
});

// ---- Render loop ----
function gameLoop(): void {
  if (input) input.poll();

  if (latestState && renderer) {
    renderer.draw(latestState, playerColors, playerNames);
    updateHUD(latestState);
  }

  requestAnimationFrame(gameLoop);
}

// ---- Connection logging ----
socket.on('connect', () => console.log('Connected:', socket.id));
socket.on('disconnect', () => console.log('Disconnected'));
