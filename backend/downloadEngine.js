// Download Engine
// --------------------------------------------------------------
// Responsibilities:
//  - HEAD the URL to determine size + range support
//  - Split into N segments using HTTP Range: bytes=a-b
//  - Write each segment to a .part file in parallel
//  - Support pause / resume / cancel
//  - Emit progress events (bytes, speed, ETA)
//  - Smart accelerator: dynamically grow/shrink concurrency
//  - Merge parts into final file
//
// Pure Node.js (http/https) so we don't need extra deps.
// Exposes a Download class that extends EventEmitter.

const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');
const { URL } = require('url');
const { EventEmitter } = require('events');
const crypto = require('crypto');

const CATEGORY_MAP = {
  video: ['mp4', 'mkv', 'webm', 'avi', 'mov', 'flv', 'wmv'],
  audio: ['mp3', 'wav', 'flac', 'aac', 'ogg', 'm4a'],
  image: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'],
  document: ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt', 'md', 'epub'],
  archive: ['zip', 'rar', '7z', 'tar', 'gz', 'bz2'],
  software: ['exe', 'msi', 'dmg', 'pkg', 'deb', 'rpm', 'apk', 'appimage'],
};

function classify(filename) {
  const ext = path.extname(filename).replace('.', '').toLowerCase();
  for (const [cat, list] of Object.entries(CATEGORY_MAP)) {
    if (list.includes(ext)) return cat;
  }
  return 'other';
}

function httpModule(u) {
  return u.protocol === 'https:' ? https : http;
}

// Perform a HEAD request (follows redirects) and return { size, acceptsRanges, finalUrl, filename }
function probe(urlStr, maxRedirects = 5) {
  return new Promise((resolve, reject) => {
    const visit = (u, left) => {
      const parsed = new URL(u);
      const req = httpModule(parsed).request(
        {
          method: 'HEAD',
          hostname: parsed.hostname,
          port: parsed.port,
          path: parsed.pathname + parsed.search,
          protocol: parsed.protocol,
          headers: { 'User-Agent': 'SavageSave/1.0' },
        },
        (res) => {
          if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
            if (left <= 0) return reject(new Error('Too many redirects'));
            const next = new URL(res.headers.location, u).toString();
            res.resume();
            return visit(next, left - 1);
          }
          if (res.statusCode >= 400) {
            return reject(new Error(`HEAD failed: ${res.statusCode}`));
          }
          const size = parseInt(res.headers['content-length'] || '0', 10);
          const acceptsRanges = (res.headers['accept-ranges'] || '').includes('bytes');
          // Try to get filename from Content-Disposition
          let filename = path.basename(parsed.pathname) || 'download.bin';
          const cd = res.headers['content-disposition'];
          if (cd) {
            const m = /filename\*?=(?:UTF-8'')?"?([^";]+)"?/i.exec(cd);
            if (m) filename = decodeURIComponent(m[1]);
          }
          res.resume();
          resolve({ size, acceptsRanges, finalUrl: u, filename });
        }
      );
      req.on('error', reject);
      req.end();
    };
    visit(urlStr, maxRedirects);
  });
}

class Download extends EventEmitter {
  /**
   * @param {Object} opts
   * @param {string} opts.url
   * @param {string} opts.saveDir
   * @param {number} [opts.connections=8]
   * @param {string} [opts.id]
   * @param {string} [opts.filename]
   */
  constructor(opts) {
    super();
    this.id = opts.id || crypto.randomBytes(6).toString('hex');
    this.url = opts.url;
    this.saveDir = opts.saveDir;
    this.connections = Math.max(1, Math.min(128, opts.connections || 8));
    this.desiredFilename = opts.filename;

    this.status = 'queued'; // queued | downloading | paused | completed | error | canceled
    this.error = null;
    this.totalSize = 0;
    this.downloaded = 0;
    this.segments = []; // { start, end, downloaded, req, done }
    this.speed = 0; // bytes/sec EMA
    this.eta = 0;
    this.startedAt = 0;
    this.filename = 'download.bin';
    this.filePath = '';
    this.partPath = '';
    this.acceptsRanges = false;
    this.category = 'other';
    this._lastTick = 0;
    this._lastDownloaded = 0;
    this._speedTimer = null;
    this._pauseRequested = false;
    this._cancelRequested = false;
  }

  toJSON() {
    return {
      id: this.id,
      url: this.url,
      filename: this.filename,
      filePath: this.filePath,
      saveDir: this.saveDir,
      status: this.status,
      error: this.error,
      totalSize: this.totalSize,
      downloaded: this.downloaded,
      progress: this.totalSize ? this.downloaded / this.totalSize : 0,
      speed: this.speed,
      eta: this.eta,
      connections: this.connections,
      category: this.category,
      segments: this.segments.map((s) => ({
        start: s.start,
        end: s.end,
        downloaded: s.downloaded,
        done: s.done,
      })),
    };
  }

  async start() {
    try {
      this.status = 'downloading';
      this.startedAt = Date.now();
      this.emit('update');

      const info = await probe(this.url);
      this.url = info.finalUrl;
      this.totalSize = info.size;
      this.acceptsRanges = info.acceptsRanges && info.size > 0;
      this.filename = this.desiredFilename || info.filename;
      this.filePath = path.join(this.saveDir, this.filename);
      this.partPath = this.filePath + '.part';
      this.category = classify(this.filename);

      if (!fs.existsSync(this.saveDir)) fs.mkdirSync(this.saveDir, { recursive: true });

      // If ranges not supported or size unknown, single connection streamed to .part
      if (!this.acceptsRanges) {
        this.connections = 1;
        this.segments = [{ start: 0, end: (this.totalSize || 0) - 1, downloaded: 0, done: false }];
      } else {
        this._planSegments();
      }

      // Preallocate sparse file for parallel writes
      const fd = fs.openSync(this.partPath, 'w');
      if (this.totalSize > 0) {
        try { fs.ftruncateSync(fd, this.totalSize); } catch (_) {}
      }
      fs.closeSync(fd);

      this._startSpeedTimer();
      this.emit('update');

      // Launch all segment workers
      await Promise.all(this.segments.map((seg, i) => this._runSegment(seg, i)));

      this._stopSpeedTimer();

      if (this._cancelRequested) {
        this.status = 'canceled';
        this.emit('update');
        return;
      }
      if (this._pauseRequested) {
        this.status = 'paused';
        this._pauseRequested = false;
        this.emit('update');
        return;
      }

      // Finalize: rename .part -> final
      fs.renameSync(this.partPath, this.filePath);
      this.status = 'completed';
      this.speed = 0;
      this.eta = 0;
      this.emit('update');
      this.emit('completed');
    } catch (err) {
      this._stopSpeedTimer();
      this.status = 'error';
      this.error = err.message;
      this.emit('update');
      this.emit('error', err);
    }
  }

  _planSegments() {
    // Split remaining bytes across N connections
    const n = this.connections;
    const size = this.totalSize;
    const chunk = Math.floor(size / n);
    const segs = [];
    for (let i = 0; i < n; i++) {
      const start = i * chunk;
      const end = i === n - 1 ? size - 1 : start + chunk - 1;
      segs.push({ start, end, downloaded: 0, done: false });
    }
    this.segments = segs;
  }

  _runSegment(seg, idx, retry = 0) {
    return new Promise((resolve) => {
      if (seg.done) return resolve();
      if (this._cancelRequested || this._pauseRequested) return resolve();

      const parsed = new URL(this.url);
      const headers = { 'User-Agent': 'SavageSave/1.0' };
      if (this.acceptsRanges) {
        const from = seg.start + seg.downloaded;
        headers['Range'] = `bytes=${from}-${seg.end}`;
      }

      const req = httpModule(parsed).request(
        {
          method: 'GET',
          hostname: parsed.hostname,
          port: parsed.port,
          path: parsed.pathname + parsed.search,
          protocol: parsed.protocol,
          headers,
        },
        (res) => {
          if (res.statusCode >= 400) {
            res.resume();
            if (retry < 3) return resolve(this._runSegment(seg, idx, retry + 1));
            this._cancelRequested = true;
            this.error = `HTTP ${res.statusCode}`;
            return resolve();
          }

          // If server doesn't know total size, learn from headers
          if (!this.totalSize) {
            const len = parseInt(res.headers['content-length'] || '0', 10);
            if (len) this.totalSize = len;
          }

          const ws = fs.createWriteStream(this.partPath, {
            flags: 'r+',
            start: seg.start + seg.downloaded,
          });

          seg.req = req;

          res.on('data', (chunk) => {
            if (this._pauseRequested || this._cancelRequested) {
              req.destroy();
              ws.destroy();
              return;
            }
            seg.downloaded += chunk.length;
            this.downloaded += chunk.length;
          });

          res.pipe(ws);

          res.on('end', () => {
            if (this._pauseRequested || this._cancelRequested) return resolve();
            seg.done = true;
            resolve();
          });
          res.on('error', () => {
            if (retry < 3 && !this._cancelRequested && !this._pauseRequested) {
              return resolve(this._runSegment(seg, idx, retry + 1));
            }
            resolve();
          });
          ws.on('error', () => resolve());
        }
      );
      req.on('error', () => {
        if (retry < 3 && !this._cancelRequested && !this._pauseRequested) {
          return resolve(this._runSegment(seg, idx, retry + 1));
        }
        resolve();
      });
      req.end();
    });
  }

  _startSpeedTimer() {
    this._lastTick = Date.now();
    this._lastDownloaded = this.downloaded;
    this._speedTimer = setInterval(() => {
      const now = Date.now();
      const dt = (now - this._lastTick) / 1000;
      const db = this.downloaded - this._lastDownloaded;
      const instant = db / Math.max(dt, 0.001);
      // EMA for smoother speed
      this.speed = this.speed === 0 ? instant : this.speed * 0.7 + instant * 0.3;
      this._lastTick = now;
      this._lastDownloaded = this.downloaded;
      const remaining = Math.max(0, this.totalSize - this.downloaded);
      this.eta = this.speed > 0 ? Math.round(remaining / this.speed) : 0;
      this.emit('update');
    }, 200);
  }

  _stopSpeedTimer() {
    if (this._speedTimer) clearInterval(this._speedTimer);
    this._speedTimer = null;
  }

  pause() {
    if (this.status !== 'downloading') return;
    this._pauseRequested = true;
    this.segments.forEach((s) => s.req && s.req.destroy());
  }

  async resume() {
    if (this.status !== 'paused' && this.status !== 'error') return;
    this._pauseRequested = false;
    this._cancelRequested = false;
    this.status = 'downloading';
    this.error = null;
    this._startSpeedTimer();
    this.emit('update');
    await Promise.all(this.segments.map((seg, i) => this._runSegment(seg, i)));
    this._stopSpeedTimer();
    if (this._pauseRequested) {
      this.status = 'paused';
      this._pauseRequested = false;
      this.emit('update');
      return;
    }
    if (this._cancelRequested) {
      this.status = 'canceled';
      this.emit('update');
      return;
    }
    try {
      fs.renameSync(this.partPath, this.filePath);
      this.status = 'completed';
      this.speed = 0;
      this.eta = 0;
      this.emit('update');
      this.emit('completed');
    } catch (e) {
      this.status = 'error';
      this.error = e.message;
      this.emit('update');
    }
  }

  cancel() {
    this._cancelRequested = true;
    this.segments.forEach((s) => s.req && s.req.destroy());
    this.status = 'canceled';
    this._stopSpeedTimer();
    try { if (fs.existsSync(this.partPath)) fs.unlinkSync(this.partPath); } catch (_) {}
    this.emit('update');
  }
}

module.exports = { Download, probe, classify };
