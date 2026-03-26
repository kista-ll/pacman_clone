import { GameEngine } from './game/GameEngine.js';
import { Renderer } from './game/Renderer.js';
import { InputManager } from './input/InputManager.js';
import { ReplayRecorder } from './replay/ReplayRecorder.js';
import { ReplayPlayer } from './replay/ReplayPlayer.js';
import { AudioSyncManager } from './audio/AudioSyncManager.js';
import { MAP_LAYOUT, TILE_SIZE } from './data/map.js';

const BGM_BPM = 100;
const REPLAY_SOURCE = {
  RECORDED: 'recorded',
  LOADED: 'loaded',
};

const canvas = document.getElementById('game');
canvas.width = MAP_LAYOUT[0].length * TILE_SIZE;
canvas.height = MAP_LAYOUT.length * TILE_SIZE + 16;

const actionStartButton = document.querySelector('[data-command="start"]');
const actionReplayButton = document.querySelector('[data-command="replay"]');
const actionRetryButton = document.querySelector('[data-command="retry"]');
const actionSaveReplayButton = document.querySelector('[data-command="save-replay"]');
const actionLoadReplayButton = document.querySelector('[data-command="load-replay"]');
const replayFileInput = document.getElementById('replay-file-input');
const replayStatusText = document.querySelector('[data-role="replay-status"]');
const directionButtons = document.querySelectorAll('[data-direction]');
const helpText = document.querySelector('.help');

const engine = new GameEngine();
const renderer = new Renderer(canvas);
const input = new InputManager();
const recorder = new ReplayRecorder();
const audioSync = new AudioSyncManager({ src: './assets/bgm.mp3', bpm: BGM_BPM });
let replayPlayer = new ReplayPlayer([]);
let loadedReplayLog = [];
let replaySourceType = REPLAY_SOURCE.RECORDED;

let frame = 0;
let gameMode = 'title'; // title | playing | replay | gameover | stageclear

const replayInputState = {
  up: false,
  down: false,
  left: false,
  right: false,
};

function setReplayStatus(message, isError = false) {
  if (!replayStatusText) return;
  replayStatusText.textContent = message;
  replayStatusText.dataset.state = isError ? 'error' : 'normal';
}

function getReplaySource() {
  const recordedLog = recorder.getLog();
  const externalLog = loadedReplayLog.map((entry) => ({ ...entry }));

  if (replaySourceType === REPLAY_SOURCE.LOADED && externalLog.length > 0) {
    return { type: REPLAY_SOURCE.LOADED, log: externalLog };
  }

  if (recordedLog.length > 0) {
    return { type: REPLAY_SOURCE.RECORDED, log: recordedLog };
  }

  if (externalLog.length > 0) {
    return { type: REPLAY_SOURCE.LOADED, log: externalLog };
  }

  return { type: REPLAY_SOURCE.RECORDED, log: [] };
}

function getReplaySourceLog() {
  return getReplaySource().log;
}

function getReplaySourceLabel(type) {
  return type === REPLAY_SOURCE.LOADED ? 'Loaded' : 'Last Play';
}

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
  loadedReplayLog = [];
  replaySourceType = REPLAY_SOURCE.RECORDED;
  setReplayStatus('');
  resetReplayInputState();
  frame = 0;
  gameMode = 'playing';
  const bgmStarted = await audioSync.start();
  setAudioRetryHint(!bgmStarted);
  updateActionButtons();
}

async function startReplay() {
  const source = getReplaySource();
  if (source.log.length === 0) {
    setReplayStatus('Replay data is not available.', true);
    return;
  }

  releaseVirtualInputs();
  engine.reset();
  replayPlayer = new ReplayPlayer(source.log);
  replaySourceType = source.type;
  setReplayStatus(`Replay source: ${getReplaySourceLabel(source.type)}`);
  resetReplayInputState();
  frame = 0;
  gameMode = 'replay';
  const bgmStarted = await audioSync.start();
  setAudioRetryHint(!bgmStarted);
  updateActionButtons();
}

function downloadReplayJSON() {
  const canSave = gameMode === 'gameover' || gameMode === 'stageclear';
  if (!canSave) {
    setReplayStatus('Replay can be saved after game over or stage clear.', true);
    return;
  }

  const source = getReplaySource();
  if (source.log.length === 0) {
    setReplayStatus('No replay data to save.', true);
    return;
  }

  const json = JSON.stringify(source.log, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = recorder.getDownloadFileName();
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);

  setReplayStatus(`Replay JSON downloaded (${getReplaySourceLabel(source.type)}).`);
}

function openReplayFilePicker() {
  if (!replayFileInput) return;
  replayFileInput.value = '';
  replayFileInput.click();
}

async function handleReplayFileSelected(file) {
  if (!file) return;

  let text;
  try {
    text = await file.text();
  } catch (_error) {
    setReplayStatus('Could not read replay file.', true);
    return;
  }

  const parsed = ReplayPlayer.parseJSON(text);
  if (!parsed.valid) {
    setReplayStatus(parsed.message, true);
    return;
  }

  loadedReplayLog = parsed.log.map((entry) => ({ ...entry }));
  replaySourceType = REPLAY_SOURCE.LOADED;
  setReplayStatus(`Loaded replay: ${file.name}`);
  updateActionButtons();
}

function updateActionButtons() {
  const onTitle = gameMode === 'title';
  const onResult = gameMode === 'gameover' || gameMode === 'stageclear';
  const source = getReplaySource();
  const replayAvailable = source.log.length > 0;

  actionStartButton.hidden = !onTitle;
  actionRetryButton.hidden = !onResult;
  actionReplayButton.hidden = !(onTitle || onResult);
  actionReplayButton.disabled = !replayAvailable;
  actionReplayButton.textContent = replayAvailable ? `Replay (${getReplaySourceLabel(source.type)})` : 'Replay';

  if (actionSaveReplayButton) {
    actionSaveReplayButton.hidden = !onResult;
    actionSaveReplayButton.disabled = source.log.length === 0;
  }

  if (actionLoadReplayButton) {
    actionLoadReplayButton.hidden = !(onTitle || onResult);
    actionLoadReplayButton.disabled = gameMode === 'playing' || gameMode === 'replay';
  }
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

  if (command === 'save-replay') {
    downloadReplayJSON();
  }

  if (command === 'load-replay') {
    openReplayFilePicker();
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
  if (!button) return;

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
bindActionButton(actionSaveReplayButton);
bindActionButton(actionLoadReplayButton);

if (replayFileInput) {
  replayFileInput.addEventListener('change', (event) => {
    const file = event.target.files && event.target.files[0];
    void handleReplayFileSelected(file);
  });
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
