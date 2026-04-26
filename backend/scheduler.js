// Simple in-memory scheduler for "start/pause at a specific time"
// Entries: { id, downloadId, action: 'start'|'pause'|'resume', runAt: epoch ms }

class Scheduler {
  constructor(manager) {
    this.manager = manager;
    this.jobs = new Map();
    this._timer = setInterval(() => this._tick(), 1000);
  }

  list() { return Array.from(this.jobs.values()); }

  schedule({ downloadId, action, runAt }) {
    const id = Math.random().toString(36).slice(2, 10);
    this.jobs.set(id, { id, downloadId, action, runAt });
    return id;
  }

  cancel(id) { return this.jobs.delete(id); }

  _tick() {
    const now = Date.now();
    for (const job of this.jobs.values()) {
      if (job.runAt <= now) {
        try {
          if (job.action === 'pause') this.manager.pause(job.downloadId);
          else if (job.action === 'resume' || job.action === 'start') this.manager.resume(job.downloadId);
        } catch (_) {}
        this.jobs.delete(job.id);
      }
    }
  }
}

module.exports = { Scheduler };
