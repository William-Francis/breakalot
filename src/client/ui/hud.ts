import type { GameState } from '@shared/types';

// ---- Combo helpers ----

const COMBO_NAMES = ['', 'Baller', 'Balltacular', 'Ballionair'];

function getComboLevel(count: number): number {
  if (count >= 10) return 3;
  if (count >= 5)  return 2;
  if (count >= 1)  return 1;
  return 0;
}

// Per-team state tracked across frames
const prevLevel: Record<string, number> = { 'team-a': 0, 'team-b': 0 };

// ---- One-time setup of animationend listeners ----

export function initComboPanels(): void {
  for (const panelId of ['combo-panel-a', 'combo-panel-b']) {
    const badge = document.querySelector<HTMLElement>(`#${panelId} .combo-badge`);
    if (!badge) continue;
    badge.addEventListener('animationend', (e: AnimationEvent) => {
      if (e.animationName === 'comboShake') {
        badge.classList.remove('shake');
      }
      if (e.animationName === 'comboFadeDown') {
        badge.classList.remove('fade-out', 'visible');
      }
    });
  }
}

// ---- Per-frame combo panel update ----

function updateComboPanel(
  panelId: string,
  teamId: string,
  comboCount: number,
  score: number,
): void {
  const panel = document.getElementById(panelId);
  if (!panel) return;

  const badge   = panel.querySelector<HTMLElement>('.combo-badge')!;
  const scoreEl = panel.querySelector<HTMLElement>('.combo-score-value')!;
  const nameEl  = panel.querySelector<HTMLElement>('.combo-name')!;
  const multEl  = panel.querySelector<HTMLElement>('.combo-mult')!;
  const hitEl   = panel.querySelector<HTMLElement>('.combo-hit')!;

  scoreEl.textContent = score.toLocaleString();

  const current = getComboLevel(comboCount);
  const prev    = prevLevel[teamId];

  if (current > 0) {
    badge.dataset.level  = String(current);
    nameEl.textContent   = COMBO_NAMES[current];
    multEl.textContent   = `${current}\u00d7`;
    hitEl.textContent    = `${comboCount} hit streak`;

    badge.classList.remove('fade-out');
    badge.classList.add('visible');

    if (current > prev) {
      // Level increased — rapid shudder
      badge.classList.remove('shake');
      void badge.offsetWidth; // force reflow to restart animation
      badge.classList.add('shake');
    }
  } else if (prev > 0) {
    // Combo lost — fade out and slide down
    badge.classList.remove('shake');
    badge.classList.add('fade-out');
  }

  prevLevel[teamId] = current;
}

// ---- Main HUD update (called every frame) ----

export function updateHUD(state: GameState): void {
  const teamA = state.teams.find((t) => t.id === 'team-a');
  const teamB = state.teams.find((t) => t.id === 'team-b');

  const bricksA = teamA ? teamA.bricks.filter((b) => b.alive).length : 0;
  const bricksB = teamB ? teamB.bricks.filter((b) => b.alive).length : 0;

  const secs = Math.floor(state.elapsed / 1000);
  const mins = Math.floor(secs / 60);
  const remainSecs = secs % 60;

  document.getElementById('hud-team-a')!.textContent = `Team A: ${bricksA} bricks`;
  document.getElementById('hud-team-b')!.textContent = `Team B: ${bricksB} bricks`;
  document.getElementById('hud-time')!.textContent =
    `${mins}:${remainSecs.toString().padStart(2, '0')}`;

  updateComboPanel('combo-panel-a', 'team-a', teamA?.comboCount ?? 0, teamA?.score ?? 0);
  updateComboPanel('combo-panel-b', 'team-b', teamB?.comboCount ?? 0, teamB?.score ?? 0);
}

export function showGameOver(winnerTeamId: string, onPlayAgain: () => void): void {
  const overlay = document.getElementById('game-over')!;
  const text = document.getElementById('game-over-text')!;
  const teamLabel = winnerTeamId === 'team-a' ? 'Team A' : 'Team B';
  text.textContent = `${teamLabel} Wins!`;
  overlay.classList.add('active');

  document.getElementById('play-again-btn')!.addEventListener(
    'click',
    () => {
      overlay.classList.remove('active');
      onPlayAgain();
    },
    { once: true }
  );
}
