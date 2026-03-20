import type { LobbyState, Player } from '@shared/types';

export function setupLobby(
  onJoin: (name: string, color: string) => void,
  onReady: () => void
): void {
  const joinBtn = document.getElementById('join-btn') as HTMLButtonElement;
  const readyBtn = document.getElementById('ready-btn') as HTMLButtonElement;
  const nameInput = document.getElementById('name-input') as HTMLInputElement;
  const colorInput = document.getElementById('color-input') as HTMLInputElement;

  joinBtn.addEventListener('click', () => {
    const name = nameInput.value.trim();
    if (!name) return;
    onJoin(name, colorInput.value);
    joinBtn.disabled = true;
    nameInput.disabled = true;
    colorInput.disabled = true;
    readyBtn.style.display = 'block';
  });

  readyBtn.addEventListener('click', () => {
    onReady();
    readyBtn.disabled = true;
    readyBtn.textContent = 'Waiting...';
  });
}

export function renderLobby(state: LobbyState): void {
  const container = document.getElementById('player-list')!;
  const teamA = state.players.filter((p) => p.teamId === 'team-a');
  const teamB = state.players.filter((p) => p.teamId === 'team-b');

  container.innerHTML = `
    <div class="team-section">
      <h3>Team A</h3>
      ${teamA.map(playerHTML).join('')}
    </div>
    <div class="team-section">
      <h3>Team B</h3>
      ${teamB.map(playerHTML).join('')}
    </div>
  `;
}

function playerHTML(p: Player): string {
  const name = escapeHtml(p.name);
  const readyMark = p.ready ? ' ✓' : '';
  return `<div class="player-entry">
    <span class="color-dot" style="background:${escapeHtml(p.color)}"></span>
    <span>${name}${readyMark}</span>
  </div>`;
}

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
