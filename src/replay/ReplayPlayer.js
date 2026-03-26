const ALLOWED_EVENT_TYPES = new Set(['keydown', 'keyup']);

function isValidReplayEntry(entry) {
  if (!entry || typeof entry !== 'object') return false;
  if (!Number.isInteger(entry.frame) || entry.frame < 0) return false;
  if (typeof entry.key !== 'string' || entry.key.length === 0) return false;
  if (typeof entry.type !== 'string' || !ALLOWED_EVENT_TYPES.has(entry.type)) return false;
  return true;
}

export class ReplayPlayer {
  constructor(log = []) {
    this.load(log);
  }

  static validateLog(log) {
    if (!Array.isArray(log)) {
      return { valid: false, message: 'Replay JSON must be an array.' };
    }

    for (let i = 0; i < log.length; i += 1) {
      if (!isValidReplayEntry(log[i])) {
        return {
          valid: false,
          message: `Invalid replay event at index ${i}.`,
        };
      }
    }

    return { valid: true, message: '' };
  }

  static parseJSON(jsonText) {
    let parsed;

    try {
      parsed = JSON.parse(jsonText);
    } catch (_error) {
      return { valid: false, message: 'Replay JSON parse failed.', log: [] };
    }

    const validation = ReplayPlayer.validateLog(parsed);
    if (!validation.valid) {
      return { valid: false, message: validation.message, log: [] };
    }

    return { valid: true, message: '', log: parsed };
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
