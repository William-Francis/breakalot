import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { Lobby } from './lobby.js';
import { Game } from './game.js';
import {
  PLAYER_JOIN,
  PLAYER_READY,
  PLAYER_INPUT,
  GAME_START,
} from '../shared/events.js';
import type { JoinPayload, InputPayload } from '../shared/types.js';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: { origin: '*' },
});

const lobby = new Lobby(io);
let game: Game | null = null;

io.on('connection', (socket) => {
  console.log(`[connect] ${socket.id}`);

  socket.on(PLAYER_JOIN, (payload: JoinPayload) => {
    lobby.addPlayer(socket.id, payload.name, payload.color);
  });

  socket.on(PLAYER_READY, () => {
    const started = lobby.setReady(socket.id);
    if (started) {
      game = new Game(io, lobby.getPlayers());
      game.start();
    }
  });

  socket.on(PLAYER_INPUT, (payload: InputPayload) => {
    game?.handleInput(socket.id, payload);
  });

  socket.on('disconnect', () => {
    console.log(`[disconnect] ${socket.id}`);
    lobby.removePlayer(socket.id);
    if (game) {
      game.handleDisconnect(socket.id);
    }
  });
});

const PORT = process.env.PORT || 3001;
httpServer.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Server listening on http://0.0.0.0:${PORT}`);
});
