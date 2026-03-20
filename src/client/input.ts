export type InputCallback = (dx: number) => void;

export class InputHandler {
  private keys: Set<string> = new Set();
  private callback: InputCallback;

  constructor(callback: InputCallback) {
    this.callback = callback;

    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
        e.preventDefault();
        this.keys.add(e.key);
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key);
    });
  }

  poll(): void {
    let dx = 0;
    if (this.keys.has('ArrowLeft')) dx -= 1;
    if (this.keys.has('ArrowRight')) dx += 1;
    if (dx !== 0) {
      this.callback(dx);
    }
  }
}
