const DIRECTIONS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight']);

const DIRECTION_ALIAS = {
  up: 'ArrowUp',
  down: 'ArrowDown',
  left: 'ArrowLeft',
  right: 'ArrowRight',
};

export class InputManager {
  constructor() {
    this.activeSourcesByDirection = new Map();
    for (const direction of DIRECTIONS) {
      this.activeSourcesByDirection.set(direction, new Set());
    }

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

  normalizeDirectionKey(direction) {
    if (DIRECTIONS.has(direction)) return direction;
    return DIRECTION_ALIAS[direction] ?? null;
  }

  pressDirection(direction, source = 'virtual') {
    const key = this.normalizeDirectionKey(direction);
    if (!key) return;

    const activeSources = this.activeSourcesByDirection.get(key);
    if (activeSources.has(source)) return;

    const wasActive = activeSources.size > 0;
    activeSources.add(source);

    if (!wasActive) {
      this.events.push({ type: 'keydown', key });
    }
  }

  releaseDirection(direction, source = 'virtual') {
    const key = this.normalizeDirectionKey(direction);
    if (!key) return;

    const activeSources = this.activeSourcesByDirection.get(key);
    if (!activeSources.has(source)) return;

    activeSources.delete(source);
    if (activeSources.size === 0) {
      this.events.push({ type: 'keyup', key });
    }
  }

  releaseAllDirections() {
    for (const [key, activeSources] of this.activeSourcesByDirection.entries()) {
      if (activeSources.size === 0) continue;
      activeSources.clear();
      this.events.push({ type: 'keyup', key });
    }
  }

  onKeyDown(event) {
    if (DIRECTIONS.has(event.key)) {
      event.preventDefault();
      this.pressDirection(event.key, 'keyboard');
    }

    if (event.key === 'Enter' || event.key.toLowerCase() === 'r') {
      this.events.push({ type: 'command', key: event.key });
    }
  }

  onKeyUp(event) {
    if (DIRECTIONS.has(event.key)) {
      event.preventDefault();
      this.releaseDirection(event.key, 'keyboard');
    }
  }

  getCurrentDirection() {
    if (this.activeSourcesByDirection.get('ArrowUp').size > 0) return 'up';
    if (this.activeSourcesByDirection.get('ArrowDown').size > 0) return 'down';
    if (this.activeSourcesByDirection.get('ArrowLeft').size > 0) return 'left';
    if (this.activeSourcesByDirection.get('ArrowRight').size > 0) return 'right';
    return null;
  }

  consumeEvents() {
    const events = this.events;
    this.events = [];
    return events;
  }
}
