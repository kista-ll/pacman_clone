import { GHOST_START, MAP_LAYOUT, PLAYER_START } from '../data/map.js';

const DIRECTION_VECTORS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const GHOST_PATTERN = ['left', 'left', 'up', 'up', 'right', 'right', 'down', 'down'];

function cloneMap(layout) {
  return layout.map((row) => row.slice());
}

export class GameEngine {
  constructor() {
    this.reset();
  }

  reset() {
    this.map = cloneMap(MAP_LAYOUT);
    this.player = { ...PLAYER_START };
    this.playerDirection = null;
    this.ghost = { ...GHOST_START };
    this.ghostStep = 0;
    this.score = 0;
    this.gameOver = false;
  }

  setPlayerDirection(direction) {
    this.playerDirection = direction;
  }

  update() {
    if (this.gameOver) return;

    const previousPlayer = { ...this.player };
    const previousGhost = { ...this.ghost };

    this.updatePlayer();
    this.checkCollisions(previousPlayer, previousGhost);
    if (this.gameOver) return;

    this.updateGhost();
    this.collectDot();
    this.checkCollisions(previousPlayer, previousGhost);
  }

  updatePlayer() {
    if (!this.playerDirection) return;
    this.tryMoveEntity(this.player, this.playerDirection);
  }

  updateGhost() {
    const direction = GHOST_PATTERN[this.ghostStep % GHOST_PATTERN.length];
    const moved = this.tryMoveEntity(this.ghost, direction);

    if (!moved) {
      const fallbackDirection = GHOST_PATTERN[(this.ghostStep + 1) % GHOST_PATTERN.length];
      this.tryMoveEntity(this.ghost, fallbackDirection);
    }

    this.ghostStep += 1;
  }

  tryMoveEntity(entity, direction) {
    const vector = DIRECTION_VECTORS[direction];
    if (!vector) return false;

    const nx = entity.x + vector.x;
    const ny = entity.y + vector.y;

    if (!this.isWalkable(nx, ny)) {
      return false;
    }

    entity.x = nx;
    entity.y = ny;
    return true;
  }

  collectDot() {
    if (this.map[this.player.y][this.player.x] === 2) {
      this.map[this.player.y][this.player.x] = 0;
      this.score += 10;
    }
  }

  checkCollisions(previousPlayer = this.player, previousGhost = this.ghost) {
    const sameTileCollision = this.player.x === this.ghost.x && this.player.y === this.ghost.y;
    const swappedCollision =
      this.player.x === previousGhost.x &&
      this.player.y === previousGhost.y &&
      this.ghost.x === previousPlayer.x &&
      this.ghost.y === previousPlayer.y;

    if (sameTileCollision || swappedCollision) {
      this.gameOver = true;
    }
  }

  isWalkable(x, y) {
    if (y < 0 || y >= this.map.length) return false;
    if (x < 0 || x >= this.map[0].length) return false;
    return this.map[y][x] !== 1;
  }

  getState() {
    return {
      map: this.map,
      player: this.player,
      ghost: this.ghost,
      score: this.score,
      gameOver: this.gameOver,
    };
  }
}
