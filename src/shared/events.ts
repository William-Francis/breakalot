// ---- Socket.IO event name constants ----

// Client → Server
export const PLAYER_JOIN = 'player:join';
export const PLAYER_READY = 'player:ready';
export const PLAYER_INPUT = 'player:input';

// Server → Client
export const LOBBY_UPDATE = 'lobby:update';
export const GAME_START = 'game:start';
export const GAME_STATE = 'game:state';
export const GAME_BRICK_BROKEN = 'game:brick-broken';
export const GAME_BALL_RESET = 'game:ball-reset';
export const GAME_OVER = 'game:over';
