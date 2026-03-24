import { GHOST_START, MAP_LAYOUT, PLAYER_START } from '../data/map.js';

const DIRECTION_VECTORS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

const DIRECTION_ORDER = ['up', 'left', 'down', 'right'];
const OPPOSITE_DIRECTION = {
  up: 'down',
  down: 'up',
  left: 'right',
  right: 'left',
};

const PLAYER_SPEED_TILES_PER_FRAME = 1 / 8;
const GHOST_SPEED_TILES_PER_FRAME = 1 / 10;
const CENTER_EPSILON = 1e-6;
const COLLISION_EPSILON = 1e-6;

function cloneMap(layout) {
  return layout.map((row) => row.slice());
}

function isClose(a, b, epsilon = CENTER_EPSILON) {
  return Math.abs(a - b) <= epsilon;
}

function isSamePosition(a, b, epsilon = COLLISION_EPSILON) {
  return isClose(a.x, b.x, epsilon) && isClose(a.y, b.y, epsilon);
}

function createPlayer() {
  return {
    x: PLAYER_START.x,
    y: PLAYER_START.y,
    currentDirection: null,
    nextDirection: null,
    speed: PLAYER_SPEED_TILES_PER_FRAME,
  };
}

function createGhost() {
  return {
    x: GHOST_START.x,
    y: GHOST_START.y,
    currentDirection: 'left',
    nextDirection: null,
    speed: GHOST_SPEED_TILES_PER_FRAME,
  };
}

export class GameEngine {
  constructor() {
    this.reset();
  }

  reset() {
    this.map = cloneMap(MAP_LAYOUT);
    this.player = createPlayer();
    this.ghost = createGhost();
    this.ghostDecisionStep = 0;
    this.score = 0;
    this.gameOver = false;
  }

  setNextPlayerDirection(direction) {
    this.player.nextDirection = direction;
  }

  update() {
    if (this.gameOver) return;

    const previousPlayer = { x: this.player.x, y: this.player.y };
    const previousGhost = { x: this.ghost.x, y: this.ghost.y };

    this.updatePlayer();
    this.checkCollisions(previousPlayer, previousGhost);
    if (this.gameOver) return;

    this.updateGhost();
    this.collectDot();
    this.checkCollisions(previousPlayer, previousGhost);
  }

  updatePlayer() {
    this.moveEntity(this.player, true);
  }

  updateGhost() {
    if (this.isAtTileCenter(this.ghost)) {
      this.ghost.currentDirection = this.chooseGhostDirection();
    }
    this.moveEntity(this.ghost, false);
  }

  moveEntity(entity, allowTurnByNextDirection) {
    if (this.isAtTileCenter(entity)) {
      this.snapToTileCenter(entity);

      if (allowTurnByNextDirection && entity.nextDirection && this.canMove(entity, entity.nextDirection)) {
        entity.currentDirection = entity.nextDirection;
      }

      if (!entity.currentDirection || !this.canMove(entity, entity.currentDirection)) {
        entity.currentDirection = null;
        return;
      }
    }

    if (!entity.currentDirection) {
      return;
    }

    const vector = DIRECTION_VECTORS[entity.currentDirection];
    entity.x += vector.x * entity.speed;
    entity.y += vector.y * entity.speed;
  }

  chooseGhostDirection() {
    const base = this.ghostDecisionStep % DIRECTION_ORDER.length;
    const prioritized = [
      DIRECTION_ORDER[base],
      DIRECTION_ORDER[(base + 1) % DIRECTION_ORDER.length],
      DIRECTION_ORDER[(base + 2) % DIRECTION_ORDER.length],
      DIRECTION_ORDER[(base + 3) % DIRECTION_ORDER.length],
    ];

    const reverse = this.ghost.currentDirection ? OPPOSITE_DIRECTION[this.ghost.currentDirection] : null;

    let selected = null;
    for (const direction of prioritized) {
      if (reverse && direction === reverse) continue;
      if (this.canMove(this.ghost, direction)) {
        selected = direction;
        break;
      }
    }

    if (!selected && reverse && this.canMove(this.ghost, reverse)) {
      selected = reverse;
    }

    this.ghostDecisionStep += 1;
    return selected;
  }

  collectDot() {
    if (!this.isAtTileCenter(this.player)) return;

    const tileX = Math.round(this.player.x);
    const tileY = Math.round(this.player.y);
    if (this.map[tileY][tileX] === 2) {
      this.map[tileY][tileX] = 0;
      this.score += 10;
    }
  }

  checkCollisions(previousPlayer = this.player, previousGhost = this.ghost) {
    const currentPlayer = { x: this.player.x, y: this.player.y };
    const currentGhost = { x: this.ghost.x, y: this.ghost.y };

    const samePositionCollision = isSamePosition(currentPlayer, currentGhost);
    const swappedCollision =
      isSamePosition(currentPlayer, previousGhost) && isSamePosition(currentGhost, previousPlayer);

    if (samePositionCollision || swappedCollision) {
      this.gameOver = true;
    }
  }

  isAtTileCenter(entity) {
    return isClose(entity.x, Math.round(entity.x)) && isClose(entity.y, Math.round(entity.y));
  }

  snapToTileCenter(entity) {
    entity.x = Math.round(entity.x);
    entity.y = Math.round(entity.y);
  }

  canMove(entity, direction) {
    const vector = DIRECTION_VECTORS[direction];
    if (!vector) return false;

    const fromX = Math.round(entity.x);
    const fromY = Math.round(entity.y);
    const toX = fromX + vector.x;
    const toY = fromY + vector.y;
    return this.isWalkable(toX, toY);
  }

  isWalkable(x, y) {
    if (y < 0 || y >= this.map.length) return false;
    if (x < 0 || x >= this.map[0].length) return false;
    return this.map[y][x] !== 1;
  }

  getState() {
    return {
      map: this.map,
      player: { x: this.player.x, y: this.player.y },
      ghost: { x: this.ghost.x, y: this.ghost.y },
      score: this.score,
      gameOver: this.gameOver,
    };
  }
}
