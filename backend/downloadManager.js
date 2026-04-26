// DownloadManager: holds and orchestrates all Download instances.
// Emits 'change' on any state update so the server can push to clients.

const { EventEmitter } = require('events');
const { Download } = require('./downloadEngine');
const { isVideoUrl, VideoDownload } = require('./videoDownloader');

class DownloadManager extends EventEmitter {
  constructor() {
    super();
    /** @type {Map<string, Download>} */
    this.downloads = new Map();
  }

  list() {
    return Array.from(this.downloads.values()).map((d) => d.toJSON());
  }

  get(id) {
    return this.downloads.get(id);
  }

  add(opts) {
    // Route video-platform URLs through yt-dlp; everything else via the
    // fast multi-connection HTTP Range engine.
    const d = isVideoUrl(opts.url) ? new VideoDownload(opts) : new Download(opts);
    this.downloads.set(d.id, d);
    d.on('update', () => this.emit('change', d.toJSON()));
    d.on('completed', () => this.emit('completed', d.toJSON()));
    d.on('error', () => this.emit('failed', d.toJSON()));
    // Kick off (async, non-blocking)
    d.start();
    return d;
  }

  pause(id) { const d = this.get(id); if (d) d.pause(); return !!d; }
  resume(id) { const d = this.get(id); if (d) d.resume(); return !!d; }
  cancel(id) { const d = this.get(id); if (d) d.cancel(); return !!d; }
  remove(id) {
    const d = this.get(id);
    if (!d) return false;
    if (d.status === 'downloading') d.cancel();
    this.downloads.delete(id);
    this.emit('removed', { id });
    return true;
  }
}

module.exports = { DownloadManager };
