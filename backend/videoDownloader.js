// Video platform downloader — wraps yt-dlp.
// Handles YouTube, Facebook, Instagram, TikTok, Twitter/X, Vimeo, Twitch,
// Reddit, Dailymotion, and 1000+ other sites supported by yt-dlp.
//
// yt-dlp binary is auto-downloaded from GitHub releases on first use.
// ffmpeg is NOT required: we request a pre-muxed mp4 format when possible.

const fs = require('fs');
const os = require('os');
const path = require('path');
const https = require('https');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { EventEmitter } = require('events');

// Bundled ffmpeg binary — required for high-quality merges and MP3 extraction.
let ffmpegPath = null;
try { ffmpegPath = require('ffmpeg-static'); } catch (_) { /* optional */ }

const BIN_DIR = path.join(os.homedir(), '.turbonest');
const BIN_NAME = process.platform === 'win32' ? 'yt-dlp.exe'
  : process.platform === 'darwin' ? 'yt-dlp_macos' : 'yt-dlp';
const BIN_PATH = path.join(BIN_DIR, BIN_NAME);

const DEFAULT_BROWSER =
  process.platform === 'win32' ? 'edge' :
  process.platform === 'darwin' ? 'safari' : 'firefox';

function getCookieBrowser(preference) {
  return preference || process.env.YTDLP_COOKIES_BROWSER || null;
}

const VIDEO_HOSTS = [
  'youtube.com', 'youtu.be', 'youtube-nocookie.com',
  'facebook.com', 'fb.watch', 'fb.com',
  'instagram.com', 'tiktok.com',
  'twitter.com', 'x.com', 't.co',
  'vimeo.com', 'dailymotion.com', 'twitch.tv',
  'reddit.com', 'redd.it', 'v.redd.it',
  'bilibili.com', 'soundcloud.com', 'streamable.com',
  'pinterest.com', 'linkedin.com', 'snapchat.com',
  'kick.com', 'rumble.com', 'odysee.com',
];

function isVideoUrl(url) {
  try {
    const h = new URL(url).hostname.toLowerCase().replace(/^www\./, '').replace(/^m\./, '');
    return VIDEO_HOSTS.some((v) => h === v || h.endsWith('.' + v));
  } catch { return false; }
}

// Download a URL (follows redirects) to a file.
function downloadFile(url, dest, redirects = 10) {
  return new Promise((resolve, reject) => {
    const req = https.get(url, { headers: { 'User-Agent': 'TurboNest/1.0' } }, (res) => {
      if ([301, 302, 303, 307, 308].includes(res.statusCode)) {
        if (redirects <= 0) return reject(new Error('Too many redirects'));
        res.resume();
        return downloadFile(res.headers.location, dest, redirects - 1).then(resolve, reject);
      }
      if (res.statusCode !== 200) return reject(new Error('HTTP ' + res.statusCode));
      const file = fs.createWriteStream(dest);
      res.pipe(file);
      file.on('finish', () => file.close(() => resolve()));
      file.on('error', reject);
    });
    req.on('error', reject);
  });
}

let ensurePromise = null;
const STAMP_PATH = path.join(BIN_DIR, '.yt-dlp-stamp');
const UPDATE_INTERVAL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function needsUpdate() {
  if (!fs.existsSync(BIN_PATH)) return true;
  try {
    const stamp = fs.existsSync(STAMP_PATH) ? parseInt(fs.readFileSync(STAMP_PATH, 'utf8').trim(), 10) : 0;
    return (Date.now() - stamp) > UPDATE_INTERVAL_MS;
  } catch { return true; }
}

function ensureYtDlp() {
  if (ensurePromise) return ensurePromise;
  ensurePromise = (async () => {
    const shouldUpdate = needsUpdate();
    if (!shouldUpdate && fs.existsSync(BIN_PATH)) return BIN_PATH;

    fs.mkdirSync(BIN_DIR, { recursive: true });
    const url = `https://github.com/yt-dlp/yt-dlp/releases/latest/download/${BIN_NAME}`;
    if (shouldUpdate) {
      // eslint-disable-next-line no-console
      console.log('[TurboNest] updating yt-dlp from', url);
    } else {
      // eslint-disable-next-line no-console
      console.log('[TurboNest] downloading yt-dlp from', url);
    }
    const tmp = BIN_PATH + '.part';
    await downloadFile(url, tmp);
    fs.renameSync(tmp, BIN_PATH);
    if (process.platform !== 'win32') fs.chmodSync(BIN_PATH, 0o755);
    fs.writeFileSync(STAMP_PATH, String(Date.now()));
    return BIN_PATH;
  })().catch((e) => { ensurePromise = null; throw e; });
  return ensurePromise;
}

// Friendly error sanitization — never expose raw DPAPI / stack traces to users.
// Two categories:
//   - "Authentication needed..." → frontend shows retry panel with browser selector
//   - Everything else → generic error (no retry panel)
function classifyError(raw) {
  const msg = String(raw).toLowerCase();
  // Technical cookie failures (DB locked, DPAPI, permission denied)
  if (msg.includes('dpapi') || msg.includes('decrypt') || msg.includes('keyring')
      || msg.includes('could not copy') || msg.includes('database is locked')
      || msg.includes('cookie') && msg.includes('unavailable')
      || msg.includes('permission denied')) {
    return 'Browser session unavailable. Close the browser completely and retry, or choose a different browser.';
  }
  // Content restrictions → trigger auth retry UI
  if (msg.includes('sign in to confirm') || msg.includes('not a bot')
      || msg.includes('login required') || msg.includes('members only')
      || msg.includes('subscriber') || msg.includes('geo blocked')
      || msg.includes('geo-blocked') || msg.includes('unavailable in your country')) {
    return 'Authentication needed. This content may require browser cookies. Sign into the video platform in your browser, then retry.';
  }
  if (msg.includes('age-restricted') || msg.includes('age restricted') || msg.includes('confirm your age')) {
    return 'Authentication needed. This video is age-restricted and may require browser cookies.';
  }
  if (msg.includes('private video') || msg.includes('video unavailable') || msg.includes('removed')) {
    return 'This video is unavailable or private.';
  }
  // Default: truncate, keep it clean
  return String(raw).slice(0, 200);
}

// Fetch video metadata (title, thumbnail, formats) without downloading.
// Returns a curated `qualities` list ready for UI selection.
async function probeVideo(url, cookieBrowser) {
  const bin = await ensureYtDlp();
  const browser = getCookieBrowser(cookieBrowser);
  return new Promise((resolve, reject) => {
    const args = ['--dump-single-json', '--no-warnings', '--no-playlist'];
    if (browser) args.push('--cookies-from-browser', browser);
    args.push(url);
    const p = spawn(bin, args);
    let out = '', err = '';
    p.stdout.on('data', (c) => (out += c.toString()));
    p.stderr.on('data', (c) => (err += c.toString()));
    p.on('error', reject);
    p.on('close', (code) => {
      if (code !== 0) return reject(new Error(classifyError(err.trim() || `yt-dlp exited ${code}`)));
      try {
        const info = JSON.parse(out);
        resolve({
          size: info.filesize || info.filesize_approx || 0,
          acceptsRanges: false,
          finalUrl: url,
          filename: sanitize(info.title || 'video'),
          isVideo: true,
          title: info.title,
          duration: info.duration,
          thumbnail: info.thumbnail,
          uploader: info.uploader || info.channel,
          qualities: buildQualities(info),
          hasFfmpeg: !!ffmpegPath,
        });
      } catch (e) { reject(new Error('Failed to parse yt-dlp output: ' + e.message)); }
    });
  });
}

// Build a UX-friendly list of qualities from yt-dlp's formats array.
// Each entry carries a yt-dlp `format` selector we pass back on download.
function estimateBytes(f, durationSec) {
  if (!f) return 0;
  // yt-dlp sometimes provides exact or approximate filesize per format
  if (f.filesize && Number.isFinite(f.filesize)) return Math.round(f.filesize);
  if (f.filesize_approx && Number.isFinite(f.filesize_approx)) return Math.round(f.filesize_approx);
  // Fallback: bitrate-based estimate (tbr/abr in kbps → bytes)
  const br = f.tbr || f.vbr || f.abr || 0;
  if (br && durationSec) return Math.round(br * 125 * durationSec);
  return 0;
}

function buildQualities(info) {
  const formats = Array.isArray(info.formats) ? info.formats : [];
  const duration = info.duration || 0;
  const hasFfmpeg = !!ffmpegPath;

  // Find the best pre-muxed (has both video+audio) stream per height
  const muxedByHeight = new Map();
  // And best video-only (for merging) per height
  const videoByHeight = new Map();
  // Audio-only bitrate (for size estimates)
  let bestAudio = null;

  for (const f of formats) {
    const hasV = f.vcodec && f.vcodec !== 'none';
    const hasA = f.acodec && f.acodec !== 'none';
    if (hasV && hasA && f.height) {
      const cur = muxedByHeight.get(f.height);
      if (!cur || (f.tbr || 0) > (cur.tbr || 0)) muxedByHeight.set(f.height, f);
    } else if (hasV && !hasA && f.height) {
      const cur = videoByHeight.get(f.height);
      if (!cur || (f.tbr || 0) > (cur.tbr || 0)) videoByHeight.set(f.height, f);
    } else if (!hasV && hasA) {
      if (!bestAudio || (f.abr || 0) > (bestAudio.abr || 0)) bestAudio = f;
    }
  }

  const heightsAvailable = new Set([
    ...muxedByHeight.keys(),
    ...(hasFfmpeg ? videoByHeight.keys() : []),
  ]);

  const TARGETS = [
    { h: 2160, label: '4K · 2160p' },
    { h: 1440, label: '2K · 1440p' },
    { h: 1080, label: 'Full HD · 1080p' },
    { h: 720,  label: 'HD · 720p' },
    { h: 480,  label: '480p' },
    { h: 360,  label: '360p' },
    { h: 240,  label: '240p' },
  ];

  const list = [];
  const sortedAvail = [...heightsAvailable].sort((a, b) => b - a);

  for (const t of TARGETS) {
    // Find the closest available height at or below target
    const actual = sortedAvail.find((h) => h <= t.h && h >= t.h - 120) ||
                   sortedAvail.find((h) => h === t.h);
    if (!actual) continue;

    const muxed = muxedByHeight.get(actual);
    const vOnly = videoByHeight.get(actual);
    let format, size, kind;

    if (muxed) {
      format = `${muxed.format_id}`;
      size = estimateBytes(muxed, duration);
      kind = 'muxed';
    } else if (vOnly && hasFfmpeg) {
      format = `${vOnly.format_id}+bestaudio[ext=m4a]/${vOnly.format_id}+bestaudio`;
      size = estimateBytes(vOnly, duration) + estimateBytes(bestAudio, duration);
      kind = 'merge';
    } else continue;

    // De-dupe (avoid listing the same actual height twice for two targets)
    if (list.some((q) => q.height === actual)) continue;

    list.push({
      id: `v${actual}`,
      label: t.label,
      height: actual,
      ext: 'mp4',
      kind,
      size,
      format,
    });
  }

  // Audio-only (MP3) — requires ffmpeg for the mp3 encoder
  if (bestAudio && hasFfmpeg) {
    list.push({
      id: 'audio-mp3',
      label: 'Audio · MP3',
      ext: 'mp3',
      kind: 'audio',
      size: estimateBytes(bestAudio, duration),
      format: 'bestaudio/best',
    });
  }

  // "Best available" fallback — estimate from best muxed or best video+audio
  const bestMuxed = [...muxedByHeight.values()].sort((a, b) => (b.tbr || 0) - (a.tbr || 0))[0];
  const bestVideo = [...videoByHeight.values()].sort((a, b) => (b.tbr || 0) - (a.tbr || 0))[0];
  let bestSize = 0;
  if (bestMuxed) bestSize = estimateBytes(bestMuxed, duration);
  else if (bestVideo && hasFfmpeg) bestSize = estimateBytes(bestVideo, duration) + estimateBytes(bestAudio, duration);

  list.push({
    id: 'best',
    label: 'Best available',
    kind: hasFfmpeg ? 'merge' : 'muxed',
    size: bestSize,
    format: hasFfmpeg ? 'bv*+ba/b' : 'best[ext=mp4]/best',
  });

  return list;
}

function sanitize(s) { return String(s).replace(/[\\/:*?"<>|]/g, '_').trim().slice(0, 180); }

class VideoDownload extends EventEmitter {
  constructor({ url, saveDir, id, filename, format, audioOnly, qualityLabel, cookieBrowser }) {
    super();
    this.id = id || crypto.randomBytes(6).toString('hex');
    this.url = url;
    this.saveDir = saveDir;
    this.desiredFilename = filename;
    this.format = format || (ffmpegPath ? 'bv*+ba/b' : 'best[ext=mp4]/best');
    this.audioOnly = !!audioOnly;
    this.qualityLabel = qualityLabel || '';
    this.status = 'queued';
    this.error = null;
    this.totalSize = 0;
    this.downloaded = 0;
    this.speed = 0;
    this.eta = 0;
    this.filename = 'video';
    this.filePath = '';
    this.category = 'video';
    this.connections = 1;
    this.segments = [];
    this.proc = null;
    this._cancel = false;
    this.engine = 'yt-dlp';
    this.cookieBrowser = cookieBrowser;
  }

  toJSON() {
    return {
      id: this.id, url: this.url, filename: this.filename, filePath: this.filePath,
      saveDir: this.saveDir, status: this.status, error: this.error,
      totalSize: this.totalSize, downloaded: this.downloaded,
      progress: this.totalSize ? this.downloaded / this.totalSize :
        (this.status === 'completed' ? 1 : 0),
      speed: this.speed, eta: this.eta, connections: 1,
      category: 'video', segments: [], engine: this.engine,
    };
  }

  async start() {
    try {
      this.status = 'downloading';
      this.emit('update');
      const bin = await ensureYtDlp();
      if (!fs.existsSync(this.saveDir)) fs.mkdirSync(this.saveDir, { recursive: true });

      // Output template. If user supplied a filename, use it; otherwise use video title.
      // Strip any existing extension so yt-dlp's %(ext)s doesn't duplicate it (e.g. .mp4.mp4).
      const baseName = this.desiredFilename && this.desiredFilename !== 'watch' && this.desiredFilename !== 'video'
        ? sanitize(path.parse(this.desiredFilename).name || this.desiredFilename)
        : '%(title).180s';
      const outTpl = path.join(this.saveDir, baseName + '.%(ext)s');

      // Build yt-dlp args — cookies only if explicitly requested
      const args = [
        this.url,
        '-f', this.format,
        '-o', outTpl,
        '--newline',
        '--no-playlist',
        '--no-warnings',
        '--no-part',
        '--restrict-filenames',
        '--progress',
        '--print', 'after_move:FINAL_PATH=%(filepath)s',
      ];
      const browser = getCookieBrowser(this.cookieBrowser);
      if (browser) args.push('--cookies-from-browser', browser);
      if (ffmpegPath) args.push('--ffmpeg-location', ffmpegPath);
      if (this.audioOnly) {
        args.push('--extract-audio', '--audio-format', 'mp3', '--audio-quality', '0');
      } else if (ffmpegPath) {
        // Force final container to mp4 when merging, for broad compatibility.
        args.push('--merge-output-format', 'mp4');
      }
      // eslint-disable-next-line no-console
      console.log('[TurboNest] yt-dlp', args.join(' '));
      this.proc = spawn(bin, args, { windowsHide: true });

      this.proc.stdout.on('data', (c) => this._parse(c.toString()));
      this.proc.stderr.on('data', (c) => this._parse(c.toString()));
      this.proc.on('error', (e) => {
        this.status = 'error'; this.error = e.message;
        this.emit('update'); this.emit('error', e);
      });
      this.proc.on('close', (code) => {
        if (this._cancel) {
          this.status = 'canceled'; this.emit('update'); return;
        }
        if (code === 0) {
          this.status = 'completed';
          this.speed = 0; this.eta = 0;
          if (this.totalSize && !this.downloaded) this.downloaded = this.totalSize;
          if (!this.totalSize && this.downloaded) this.totalSize = this.downloaded;
          this.emit('update'); this.emit('completed');
        } else {
          this.status = 'error';
          this.error = this.error || `yt-dlp exited with code ${code}`;
          this.emit('update'); this.emit('error', new Error(this.error));
        }
      });
    } catch (e) {
      this.status = 'error'; this.error = e.message;
      this.emit('update'); this.emit('error', e);
    }
  }

  _parse(text) {
    const lines = text.split(/\r?\n|\r/);
    for (const line of lines) {
      if (!line.trim()) continue;

      const fp = /FINAL_PATH=(.+)/.exec(line);
      if (fp) {
        this.filePath = fp[1].trim();
        this.filename = path.basename(this.filePath);
        this.emit('update');
        continue;
      }

      // Typical yt-dlp progress line:
      // [download]  12.3% of ~123.45MiB at 1.23MiB/s ETA 00:12
      const m = /\[download\]\s+([\d.]+)%\s+of\s+~?\s*([\d.]+)(\w+)(?:\s+at\s+([\d.]+)(\w+)\/s)?(?:\s+ETA\s+(\S+))?/.exec(line);
      if (m) {
        const pct = parseFloat(m[1]);
        const total = parseFloat(m[2]) * unitToBytes(m[3]);
        const speed = m[4] ? parseFloat(m[4]) * unitToBytes(m[5]) : this.speed;
        this.totalSize = Math.round(total);
        this.downloaded = Math.round((total * pct) / 100);
        this.speed = speed;
        this.eta = etaToSeconds(m[6]);
        this.emit('update');
        continue;
      }

      const d = /\[download\]\s+Destination:\s+(.+)/.exec(line);
      if (d) {
        this.filePath = d[1].trim();
        this.filename = path.basename(this.filePath);
        this.emit('update');
        continue;
      }

      if (/^ERROR:/i.test(line)) {
        this.error = classifyError(line.replace(/^ERROR:\s*/i, ''));
      }
    }
  }

  pause() {
    // yt-dlp has no native pause — emulate by killing & treating as paused.
    if (this.status !== 'downloading') return;
    this._cancel = false;
    try { this.proc && this.proc.kill('SIGTERM'); } catch (_) {}
    this.status = 'paused';
    this.speed = 0; this.eta = 0;
    this.emit('update');
  }

  resume() {
    if (this.status !== 'paused' && this.status !== 'error') return;
    this._cancel = false;
    this.downloaded = 0; // yt-dlp will restart; with --no-part it overwrites
    this.speed = 0; this.eta = 0;
    this.status = 'queued';
    this.emit('update');
    this.start();
  }

  cancel() {
    this._cancel = true;
    try { this.proc && this.proc.kill('SIGKILL'); } catch (_) {}
    this.status = 'canceled';
    this.speed = 0; this.eta = 0;
    this.emit('update');
  }
}

function unitToBytes(u) {
  const map = {
    B: 1, KiB: 1024, MiB: 1024 ** 2, GiB: 1024 ** 3, TiB: 1024 ** 4,
    KB: 1000, MB: 1000 ** 2, GB: 1000 ** 3, TB: 1000 ** 4,
    K: 1024, M: 1024 ** 2, G: 1024 ** 3,
  };
  return map[u] || 1;
}
function etaToSeconds(s) {
  if (!s || s === 'Unknown' || s === 'NA') return 0;
  const parts = s.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return Number(parts[0]) || 0;
}

module.exports = { isVideoUrl, probeVideo, VideoDownload, ensureYtDlp };
