import { TILE_SIZE } from '../data/map.js';

function getPulseStrength(beatProgress, enabled) {
  if (!enabled) return 0;
  const wave = Math.sin(beatProgress * Math.PI * 2);
  return (wave + 1) / 2;
}

function getFloorColor(beatProgress, enabled) {
  const pulse = getPulseStrength(beatProgress, enabled);
  const min = 8;
  const max = 22;
  const value = Math.round(min + (max - min) * pulse);
  return `rgb(${value}, ${value}, ${value})`;
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
  }

  render(viewModel) {
    const { ctx, canvas } = this;
    const { map, player, ghost, score, gameMode, beatProgress = 0, bgmPlaying = false } = viewModel;
    const floorColor = getFloorColor(beatProgress, bgmPlaying);

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (let y = 0; y < map.length; y += 1) {
      for (let x = 0; x < map[y].length; x += 1) {
        const tile = map[y][x];
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;

        if (tile === 1) {
          ctx.fillStyle = '#1b3c96';
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        } else {
          ctx.fillStyle = floorColor;
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          if (tile === 2) {
            ctx.fillStyle = '#ffd54f';
            ctx.beginPath();
            ctx.arc(px + TILE_SIZE / 2, py + TILE_SIZE / 2, 4, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }

    ctx.fillStyle = '#ffeb3b';
    ctx.beginPath();
    ctx.arc(player.x * TILE_SIZE + TILE_SIZE / 2, player.y * TILE_SIZE + TILE_SIZE / 2, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#e91e63';
    ctx.beginPath();
    ctx.arc(ghost.x * TILE_SIZE + TILE_SIZE / 2, ghost.y * TILE_SIZE + TILE_SIZE / 2, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.font = '16px sans-serif';
    ctx.fillText(`Score: ${score}`, 8, canvas.height - 8);

    if (gameMode === 'title') {
      this.drawOverlay('Press Enter to Start');
    }
    if (gameMode === 'replay') {
      this.drawOverlay('Replay Playing');
    }
    if (gameMode === 'gameover') {
      this.drawOverlay('Game Over - Press Enter');
    }
    if (gameMode === 'stageclear') {
      this.drawOverlay('Stage Clear - Press Enter');
    }
  }

  drawOverlay(text) {
    const { ctx, canvas } = this;
    ctx.fillStyle = 'rgba(0,0,0,0.6)';
    ctx.fillRect(0, canvas.height / 2 - 24, canvas.width, 48);
    ctx.fillStyle = '#fff';
    ctx.font = '20px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2 + 7);
    ctx.textAlign = 'start';
  }
}
