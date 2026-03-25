export class ReplayRecorder {
  constructor() {
    this.reset();
  }

  reset() {
    this.log = [];
  }

  record(frame, events) {
    for (const event of events) {
      if (event.type === 'keydown' || event.type === 'keyup') {
        this.log.push({ frame, type: event.type, key: event.key });
      }
    }
  }

  getLog() {
    return this.log.map((entry) => ({ ...entry }));
  }

  exportJSON() {
    return JSON.stringify(this.log, null, 2);
  }

  getDownloadFileName(date = new Date()) {
    const pad = (value) => String(value).padStart(2, '0');
    const yyyy = date.getFullYear();
    const mm = pad(date.getMonth() + 1);
    const dd = pad(date.getDate());
    const hh = pad(date.getHours());
    const min = pad(date.getMinutes());
    const ss = pad(date.getSeconds());
    return `pacman-replay-${yyyy}${mm}${dd}-${hh}${min}${ss}.json`;
  }
}
