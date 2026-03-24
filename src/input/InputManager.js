const DIRECTIONS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

export class InputManager {
  constructor() {
    this.pressedDirections = new Set();
    this.events = [];

    this.onKeyDown = this.onKeyDown.bind(this);
    this.onKeyUp = this.onKeyUp.bind(this);
  }

  attach() {
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  detach() {
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }

  onKeyDown(event) {
    if (DIRECTIONS.has(event.key)) {
      event.preventDefault();
      this.pressedDirections.add(event.key);
      this.events.push({ type: 'keydown', key: event.key });
    }

    if (event.key === 'Enter' || event.key.toLowerCase() === 'r') {
      this.events.push({ type: 'command', key: event.key });
    }
  }

  onKeyUp(event) {
    if (DIRECTIONS.has(event.key)) {
      event.preventDefault();
      this.pressedDirections.delete(event.key);
      this.events.push({ type: 'keyup', key: event.key });
    }
  }

  getCurrentDirection() {
    if (this.pressedDirections.has('ArrowUp')) return 'up';
    if (this.pressedDirections.has('ArrowDown')) return 'down';
    if (this.pressedDirections.has('ArrowLeft')) return 'left';
    if (this.pressedDirections.has('ArrowRight')) return 'right';
    return null;
  }

  consumeEvents() {
    const events = this.events;
    this.events = [];
    return events;
  }
}
