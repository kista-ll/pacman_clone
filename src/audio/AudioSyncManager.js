const DEFAULT_BPM = 100;
const SECONDS_PER_MINUTE = 60;

function clamp01(value) {
  return Math.min(1, Math.max(0, value));
}

export class AudioSyncManager {
  constructor({ src, bpm = DEFAULT_BPM } = {}) {
    this.bpm = bpm;
    this.audio = new Audio(src ?? '');
    this.audio.loop = true;
    this.audio.preload = 'auto';

    this.audioContext = null;
    this.sourceNode = null;

    this.startedAt = null;
    this.isPlaying = false;
  }

  async start() {
    try {
      if (this.audioContext === null) {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (AudioContextClass) {
          this.audioContext = new AudioContextClass();
          this.sourceNode = this.audioContext.createMediaElementSource(this.audio);
          this.sourceNode.connect(this.audioContext.destination);
        }
      }

      if (this.audioContext && this.audioContext.state === 'suspended') {
        await this.audioContext.resume();
      }

      this.audio.currentTime = 0;
      this.startedAt = performance.now() / 1000;
      this.isPlaying = true;
      await this.audio.play();
      return true;
    } catch (error) {
      this.isPlaying = false;
      this.startedAt = null;
      console.warn('BGM play failed:', error);
      return false;
    }
  }

  stop() {
    this.audio.pause();
    this.audio.currentTime = 0;
    this.startedAt = null;
    this.isPlaying = false;
  }

  getElapsedSeconds() {
    if (!this.isPlaying || this.startedAt === null) {
      return 0;
    }
    return Math.max(0, performance.now() / 1000 - this.startedAt);
  }

  getBeat() {
    const beatsPerSecond = this.bpm / SECONDS_PER_MINUTE;
    return this.getElapsedSeconds() * beatsPerSecond;
  }

  getBeatProgress() {
    const beat = this.getBeat();
    return clamp01(beat - Math.floor(beat));
  }
}
