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

const actionStartButton = document.querySelector('[data-command="start"]');
const actionReplayButton = document.querySelector('[data-command="replay"]');
const actionRetryButton = document.querySelector('[data-command="retry"]');
const directionButtons = document.querySelectorAll('[data-direction]');
const helpText = document.querySelector('.help');

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

function setAudioRetryHint(shouldShow) {
  if (!helpText) return;
  if (shouldShow) {
    helpText.textContent = '音声を有効化するには、もう一度 Start をタップしてください。';
    return;
  }
  helpText.textContent = 'Enter: Start / R: Replay / Arrow Keys or D-Pad: Move';
}

async function startPlaying() {
  releaseVirtualInputs();
  engine.reset();
  recorder.reset();
  resetReplayInputState();
  frame = 0;
  gameMode = 'playing';
  const bgmStarted = await audioSync.start();
  setAudioRetryHint(!bgmStarted);
  updateActionButtons();
}

async function startReplay() {
  const log = recorder.getLog();
  if (log.length === 0) return;

  releaseVirtualInputs();
  engine.reset();
  replayPlayer = new ReplayPlayer(log);
  resetReplayInputState();
  frame = 0;
  gameMode = 'replay';
  const bgmStarted = await audioSync.start();
  setAudioRetryHint(!bgmStarted);
  updateActionButtons();
}

function updateActionButtons() {
  const onTitle = gameMode === 'title';
  const onResult = gameMode === 'gameover' || gameMode === 'stageclear';
  const replayAvailable = recorder.getLog().length > 0;

  actionStartButton.hidden = !onTitle;
  actionRetryButton.hidden = !onResult;
  actionReplayButton.hidden = !(onTitle || onResult);
  actionReplayButton.disabled = !replayAvailable;
}

async function handleCommand(command) {
  if (command === 'start' || command === 'retry') {
    if (gameMode === 'title' || gameMode === 'gameover' || gameMode === 'stageclear') {
      await startPlaying();
    }
  }

  if (command === 'replay' && (gameMode === 'title' || gameMode === 'gameover' || gameMode === 'stageclear')) {
    await startReplay();
  }
}

function onUserCommandKeyDown(event) {
  if (event.repeat) return;
  const key = event.key.toLowerCase();

  if (event.key === 'Enter') {
    void handleCommand('start');
    return;
  }

  if (key === 'r') {
    void handleCommand('replay');
  }
}

function bindDirectionButton(button) {
  const direction = button.dataset.direction;
  const source = `virtual:${direction}`;
  let activePointerId = null;
  const preventDoubleTapSelection = (event) => {
    event.preventDefault();
  };

  const press = (event) => {
    if (!event.isPrimary) return;
    event.preventDefault();
    activePointerId = event.pointerId;
    if (button.setPointerCapture) {
      button.setPointerCapture(event.pointerId);
    }
    input.pressDirection(direction, source);
    button.classList.add('is-pressed');
  };

  const release = (event) => {
    if (!event.isPrimary && event.type !== 'lostpointercapture') return;
    if (activePointerId === null) return;
    if (activePointerId !== null && event.pointerId !== activePointerId) return;
    event.preventDefault();
    input.releaseDirection(direction, source);
    button.classList.remove('is-pressed');
    activePointerId = null;
  };

  button.addEventListener('pointerdown', press);
  button.addEventListener('pointerup', release);
  button.addEventListener('pointercancel', release);
  button.addEventListener('lostpointercapture', release);
  button.addEventListener('dblclick', preventDoubleTapSelection);
}

function bindActionButton(button) {
  const command = button.dataset.command;

  const runCommand = (event) => {
    if (!event.isPrimary) return;
    event.preventDefault();
    void handleCommand(command);
  };

  button.addEventListener('pointerdown', runCommand);
}

function releaseVirtualInputs() {
  input.releaseAllDirections();
  for (const button of directionButtons) {
    button.classList.remove('is-pressed');
  }
}

for (const button of directionButtons) {
  bindDirectionButton(button);
}

bindActionButton(actionStartButton);
bindActionButton(actionReplayButton);
bindActionButton(actionRetryButton);

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
      updateActionButtons();
    }

    if (state.stageClear) {
      gameMode = 'stageclear';
      audioSync.stop();
      updateActionButtons();
    }

    if (gameMode === 'replay' && replayPlayer.isFinished() && !state.gameOver && !state.stageClear) {
      gameMode = 'title';
      audioSync.stop();
      updateActionButtons();
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
window.addEventListener('blur', releaseVirtualInputs);
input.attach();
updateActionButtons();
gameLoop();
