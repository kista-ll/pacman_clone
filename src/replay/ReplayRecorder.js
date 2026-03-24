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
}
