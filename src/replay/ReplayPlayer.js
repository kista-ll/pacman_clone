export class ReplayPlayer {
  constructor(log = []) {
    this.load(log);
  }

  load(log) {
    this.log = Array.isArray(log) ? log.map((entry) => ({ ...entry })) : [];
    this.index = 0;
  }

  getEventsForFrame(frame) {
    const events = [];
    while (this.index < this.log.length && this.log[this.index].frame === frame) {
      events.push(this.log[this.index]);
      this.index += 1;
    }
    return events;
  }

  isFinished() {
    return this.index >= this.log.length;
  }
}
