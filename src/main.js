import { GameEngine } from './game/GameEngine.js';
import { Renderer } from './game/Renderer.js';
import { InputManager } from './input/InputManager.js';
import { ReplayRecorder } from './replay/ReplayRecorder.js';
import { ReplayPlayer } from './replay/ReplayPlayer.js';
import { AudioSyncManager } from './audio/AudioSyncManager.js';
import { MAP_LAYOUT, TILE_SIZE } from './data/map.js';

const BGM_BPM = 100;

const canvas = document.getElementById('game');
canvas.width = MAP_LAYOUT[0].length * TILE_SIZE;
canvas.height = MAP_LAYOUT.length * TILE_SIZE + 16;

const engine = new GameEngine();
const renderer = new Renderer(canvas);
const input = new InputManager();
const recorder = new ReplayRecorder();
const audioSync = new AudioSyncManager({ src: './assets/bgm.mp3', bpm: BGM_BPM });
let replayPlayer = new ReplayPlayer([]);

let frame = 0;
let gameMode = 'title'; // title | playing | replay | gameover | stageclear

const replayInputState = {
  up: false,
  down: false,
  left: false,
  right: false,
};

function resetReplayInputState() {
  replayInputState.up = false;
  replayInputState.down = false;
  replayInputState.left = false;
  replayInputState.right = false;
}

function applyEventsToReplayInput(events) {
  for (const event of events) {
    const active = event.type === 'keydown';
    if (event.key === 'ArrowUp') replayInputState.up = active;
    if (event.key === 'ArrowDown') replayInputState.down = active;
    if (event.key === 'ArrowLeft') replayInputState.left = active;
    if (event.key === 'ArrowRight') replayInputState.right = active;
  }
}

function getReplayDirection() {
  if (replayInputState.up) return 'up';
  if (replayInputState.down) return 'down';
  if (replayInputState.left) return 'left';
  if (replayInputState.right) return 'right';
  return null;
}

function startPlaying() {
  engine.reset();
  recorder.reset();
  resetReplayInputState();
  frame = 0;
  gameMode = 'playing';
  audioSync.start();
}

function startReplay() {
  const log = recorder.getLog();
  if (log.length === 0) return;

  engine.reset();
  replayPlayer = new ReplayPlayer(log);
  resetReplayInputState();
  frame = 0;
  gameMode = 'replay';
  audioSync.start();
}

function onUserCommandKeyDown(event) {
  if (event.repeat) return;
  const key = event.key.toLowerCase();

  if (event.key === 'Enter') {
    if (gameMode === 'title' || gameMode === 'gameover' || gameMode === 'stageclear') {
      startPlaying();
    }
    return;
  }

  if (key === 'r' && (gameMode === 'title' || gameMode === 'gameover' || gameMode === 'stageclear')) {
    startReplay();
  }
}

function gameLoop() {
  const events = input.consumeEvents();

  // input
  if (gameMode === 'playing') {
    recorder.record(frame, events);
    engine.setNextPlayerDirection(input.getCurrentDirection());
  } else if (gameMode === 'replay') {
    const replayEvents = replayPlayer.getEventsForFrame(frame);
    applyEventsToReplayInput(replayEvents);
    engine.setNextPlayerDirection(getReplayDirection());
  } else {
    engine.setNextPlayerDirection(null);
  }

  // update + collision (inside engine)
  if (gameMode === 'playing' || gameMode === 'replay') {
    engine.update();
    const state = engine.getState();

    if (state.gameOver) {
      gameMode = 'gameover';
      audioSync.stop();
      console.log('Replay JSON:', recorder.exportJSON());
    }

    if (state.stageClear) {
      gameMode = 'stageclear';
      audioSync.stop();
    }

    if (gameMode === 'replay' && replayPlayer.isFinished() && !state.gameOver && !state.stageClear) {
      gameMode = 'title';
      audioSync.stop();
    }

    frame += 1;
  }

  // render
  renderer.render({
    ...engine.getState(),
    gameMode,
    beat: audioSync.getBeat(),
    beatProgress: audioSync.getBeatProgress(),
    bgmPlaying: audioSync.isPlaying,
  });

  requestAnimationFrame(gameLoop);
}

window.addEventListener('keydown', onUserCommandKeyDown);
input.attach();
gameLoop();
