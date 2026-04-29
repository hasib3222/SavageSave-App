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

const MIN_FINAL_BYTES = 1024 * 1024;
const FINALIZE_TIMEOUT_MS = 30 * 1000;
const PROBE_TIMEOUT_MS = 35 * 1000;
const YTDLP_IDLE_TIMEOUT_MS = 60 * 1000;
const YTDLP_ANALYZE_MAX_MS = 25 * 1000;

// Bundled ffmpeg binary — required for high-quality merges and MP3 extraction.
// Supports both dev mode (node_modules) and packaged EXE mode (resourcesPath).
function resolveFfmpegPath() {
  // PACKAGED EXE: always check app.asar.unpacked FIRST.
  // In packaged mode, require('ffmpeg-static') returns a path *inside* the asar
  // virtual filesystem. fs.existsSync() returns true (Electron patches it) but
  // the binary CANNOT BE EXECUTED from inside .asar — only the unpacked copy can.
  if (process.resourcesPath) {
    const unpackedPaths = [
      path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', 'ffmpeg-static', 'ffmpeg.exe'),
      path.join(process.resourcesPath, 'app.asar.unpacked', 'node_modules', 'ffmpeg-static', 'ffmpeg'),
      path.join(process.resourcesPath, 'ffmpeg.exe'),
      path.join(process.resourcesPath, 'ffmpeg'),
    ];
    for (const p of unpackedPaths) {
      // Use native fs (bypass asar) to verify the file physically exists
      try {
        require('original-fs') ? require('original-fs').existsSync(p) : fs.existsSync(p);
      } catch (_) {}
      if (fs.existsSync(p)) return p;
    }
  }

  // DEV MODE: use ffmpeg-static from node_modules
  try {
    const devPath = require('ffmpeg-static');
    // Guard: make sure this is not an asar-virtual path
    if (devPath && !devPath.includes('.asar' + path.sep) && fs.existsSync(devPath)) return devPath;
    // If it IS an asar path, derive the real unpacked equivalent
    if (devPath && devPath.includes('.asar' + path.sep)) {
      const realPath = devPath.replace(
        '.asar' + path.sep, '.asar.unpacked' + path.sep
      );
      if (fs.existsSync(realPath)) return realPath;
    }
  } catch (_) {}

  // Final fallback: system ffmpeg on PATH
  return 'ffmpeg';
}

const ffmpegPath = resolveFfmpegPath();
const ffmpegExists = () => {
  if (ffmpegPath === 'ffmpeg') {
    try {
      require('child_process').execSync('ffmpeg -version', { stdio: 'pipe', timeout: 5000 });
      return true;
    } catch { return false; }
  }
  return fs.existsSync(ffmpegPath);
};

const BIN_DIR = path.join(os.homedir(), '.savagesave');
const BIN_NAME = process.platform === 'win32' ? 'yt-dlp.exe'
  : process.platform === 'darwin' ? 'yt-dlp_macos' : 'yt-dlp';
const BIN_PATH = path.join(BIN_DIR, BIN_NAME);

// Removed DEFAULT_BROWSER - never auto-use cookies.
// Cookies only used when explicitly requested by user.
function getCookieBrowser(preference) {
  // Only return browser if explicitly requested (preference passed)
  // Never fall back to environment variable or default browser
  return preference || null;
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
    const req = https.get(url, { headers: { 'User-Agent': 'SavageSave/1.0' } }, (res) => {
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
      console.log('[SavageSave] updating yt-dlp from', url);
    } else {
      // eslint-disable-next-line no-console
      console.log('[SavageSave] downloading yt-dlp from', url);
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
// STRICT RULE: Only show auth retry UI for confirmed content restriction messages.
// Transient network errors, anti-bot warnings, and rate-limits NEVER trigger auth UI.
function classifyError(raw) {
  const msg = String(raw).toLowerCase();

  // ── Step 1: Bail out early for transient / network errors ─────────────────
  // These must be checked FIRST so they never fall through to restricted logic.
  const isTransient =
    msg.includes('http error 429') ||          // Rate limited — try again later
    msg.includes('429') ||
    msg.includes('unable to download webpage') ||
    msg.includes('network') ||
    msg.includes('connection') ||
    msg.includes('timed out') ||
    msg.includes('timeout') ||
    msg.includes('retrying') ||
    msg.includes('fragment') ||
    msg.includes('temporary') ||
    msg.includes('try again') ||
    msg.includes('please wait') ||
    (msg.includes('bot') && (
      msg.includes('not a bot') ||             // "confirm you're not a bot"
      msg.includes("you're not a bot") ||
      msg.includes('confirm you') ||
      msg.includes('automated')
    ));

  if (isTransient) {
    return 'Temporarily unable to reach this video. Please try again in a moment.';
  }

  // ── Step 2: Geo-restriction (not an auth issue) ───────────────────────────
  if (msg.includes('not available in your country') || msg.includes('geo restricted') ||
      msg.includes('not available in your region')) {
    return 'This content is not available in your region.';
  }

  // ── Step 3: True content restriction — EXACT phrases only ─────────────────
  // "sign in to confirm" must be paired with age/account context.
  // This prevents matching "sign in to confirm you're not a bot".
  const isAgeRestricted =
    msg.includes('age-restricted') ||
    msg.includes('confirm your age') ||
    (msg.includes('sign in to confirm') && (msg.includes('age') || msg.includes('18')));

  if (isAgeRestricted) {
    return 'Age-restricted video. May require browser cookies if regional restrictions apply.';
  }

  const isContentRestricted =
    msg.includes('sign in to view') ||
    msg.includes('login required') ||
    msg.includes('members only') ||
    msg.includes('member only') ||
    msg.includes('subscription required') ||
    msg.includes('this video is private') ||
    msg.includes('private video') ||
    (msg.includes('video unavailable') && msg.includes('deleted'));

  if (isContentRestricted) {
    return 'This content is restricted. Sign into the video platform in your browser, then retry with cookies.';
  }

  // ── Step 4: Technical cookie/browser session failures ─────────────────────
  if (msg.includes('dpapi') || msg.includes('decrypt') || msg.includes('keyring') ||
      msg.includes('could not copy') || msg.includes('database is locked') ||
      (msg.includes('cookie') && msg.includes('unavailable'))) {
    return 'Browser session unavailable. Close the browser completely and retry.';
  }

  // ── Step 5: Generic unavailable ───────────────────────────────────────────
  if (msg.includes('unavailable') || msg.includes('not exist') || msg.includes('removed')) {
    return 'This video is unavailable or has been removed.';
  }

  // ── Default: clean message, no stack traces ────────────────────────────────
  if (msg.length > 100) {
    return 'Unable to access this content. Please check the URL and try again.';
  }
  return String(raw).slice(0, 100);
}


// Fetch video metadata (title, thumbnail, formats) without downloading.
// Returns a curated `qualities` list ready for UI selection.
async function probeVideo(url, cookieBrowser) {
  const bin = await ensureYtDlp();
  const browser = getCookieBrowser(cookieBrowser);
  // eslint-disable-next-line no-console
  console.log('[SavageSave] Probing video:', url);
  return new Promise((resolve, reject) => {
    const args = [
      '--dump-single-json',
      '--no-warnings',
      '--no-playlist',
      '--no-check-certificates',
      '--no-call-home',
      '--socket-timeout', '15',
      '--retries', '1',
      '--extractor-retries', '1',
    ];
    if (browser) args.push('--cookies-from-browser', browser);
    args.push(url);
    const p = spawn(bin, args, { windowsHide: true });
    let out = '', err = '';
    let done = false;
    const timer = setTimeout(() => {
      if (done) return;
      done = true;
      try { p.kill('SIGKILL'); } catch (_) {}
      // eslint-disable-next-line no-console
      console.warn('[SavageSave] Probe timed out for:', url);
      reject(new Error('Video analysis timed out. Please retry or use the Probe button again.'));
    }, PROBE_TIMEOUT_MS);

    const finishError = (message) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      // eslint-disable-next-line no-console
      console.error('[SavageSave] Probe error:', message);
      reject(new Error(message));
    };

    const finishSuccess = (payload) => {
      if (done) return;
      done = true;
      clearTimeout(timer);
      // eslint-disable-next-line no-console
      console.log('[SavageSave] Probe success for:', url);
      resolve(payload);
    };

    p.stdout.on('data', (c) => (out += c.toString()));
    p.stderr.on('data', (c) => (err += c.toString()));
    p.on('error', (e) => finishError(e.message || 'Failed to analyze video.'));
    p.on('close', (code) => {
      if (code !== 0) {
        return finishError(classifyError(err.trim() || `yt-dlp exited ${code}`));
      }
      try {
        const info = JSON.parse(out);
        finishSuccess({
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
          hasFfmpeg: ffmpegExists(),
        });
      } catch (e) {
        finishError('Failed to parse video info. Please retry.');
      }
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
  const hasFfmpeg = ffmpegExists();

  // IDM-STYLE: Categorize by delivery method, not internal technical detail
  // direct = progressive stream (video+audio in one file) — FAST, no merge
  // merge  = DASH stream (separate video+audio) — ffmpeg merges silently
  const directByHeight = new Map();  // pre-muxed MP4 with both V+A
  const mergeByHeight = new Map();   // video-only, needs audio merge
  let bestAudio = null;

  for (const f of formats) {
    const hasV = f.vcodec && f.vcodec !== 'none';
    const hasA = f.acodec && f.acodec !== 'none';
    if (hasV && hasA && f.height) {
      // Progressive/direct stream — video + audio together
      const cur = directByHeight.get(f.height);
      if (!cur || (f.tbr || 0) > (cur.tbr || 0)) directByHeight.set(f.height, f);
    } else if (hasV && !hasA && f.height) {
      // DASH video-only — needs merge
      const cur = mergeByHeight.get(f.height);
      if (!cur || (f.tbr || 0) > (cur.tbr || 0)) mergeByHeight.set(f.height, f);
    } else if (!hasV && hasA) {
      if (!bestAudio || (f.abr || 0) > (bestAudio.abr || 0)) bestAudio = f;
    }
  }

  // Heights available: direct (preferred) + merge (fallback with ffmpeg)
  const heightsAvailable = new Set([
    ...directByHeight.keys(),
    ...(hasFfmpeg ? mergeByHeight.keys() : []),
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
    const actual = sortedAvail.find((h) => h <= t.h && h >= t.h - 120) ||
                   sortedAvail.find((h) => h === t.h);
    if (!actual) continue;

    const direct = directByHeight.get(actual);
    const merge = mergeByHeight.get(actual);
    let format, size, kind, badge;

    if (direct) {
      // DIRECT: One-file download, no merge needed — FAST
      format = `${direct.format_id}`;
      size = estimateBytes(direct, duration);
      kind = 'direct';
      badge = 'Direct';
    } else if (merge && hasFfmpeg) {
      // MERGE: DASH stream — ffmpeg merges silently in background
      // Use specific audio format ID if available for reliable merging
      const audioFormatId = bestAudio ? bestAudio.format_id : 'bestaudio';
      format = `${merge.format_id}+${audioFormatId}`;
      size = estimateBytes(merge, duration) + estimateBytes(bestAudio, duration);
      kind = 'merge';
      badge = 'HD';
    } else continue;

    if (list.some((q) => q.height === actual)) continue;

    list.push({
      id: `v${actual}`,
      label: t.label,
      height: actual,
      ext: 'mp4',
      kind,
      badge,
      size,
      format,
    });
  }

  // Audio-only (MP3)
  if (bestAudio && hasFfmpeg) {
    list.push({
      id: 'audio-mp3',
      label: 'Audio · MP3',
      ext: 'mp3',
      kind: 'audio',
      badge: 'Audio',
      size: estimateBytes(bestAudio, duration),
      format: bestAudio.format_id, // Use specific audio format ID
    });
  }

  // "Best available" — smart format tries direct first, then DASH
  const bestDirect = [...directByHeight.values()].sort((a, b) => (b.tbr || 0) - (a.tbr || 0))[0];
  const bestMerge = [...mergeByHeight.values()].sort((a, b) => (b.tbr || 0) - (a.tbr || 0))[0];
  let bestSize = 0;
  let bestFormat = '';
  if (bestDirect) {
    bestSize = estimateBytes(bestDirect, duration);
    bestFormat = `${bestDirect.format_id}`;
  } else if (bestMerge && hasFfmpeg && bestAudio) {
    bestSize = estimateBytes(bestMerge, duration) + estimateBytes(bestAudio, duration);
    // Use specific audio format for reliable merge
    bestFormat = `${bestMerge.format_id}+${bestAudio.format_id}`;
  }

  // IDM-style: progressive single-file MP4 first, DASH merge only as last resort.
  // Fixed: removed problematic /best fallback that could select wrong format
  const autoFormat = hasFfmpeg && bestAudio
    ? `best[ext=mp4][vcodec!=none][acodec!=none]/bestvideo[ext=mp4]+${bestAudio.format_id}/bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio`
    : 'best[ext=mp4][vcodec!=none][acodec!=none]/best[ext=mp4]/best';

  list.push({
    id: 'best',
    label: 'Best available',
    kind: bestDirect ? 'direct' : (hasFfmpeg ? 'merge' : 'direct'),
    badge: bestDirect ? 'Auto' : (hasFfmpeg ? 'HD' : 'Auto'),
    size: bestSize,
    format: bestFormat || autoFormat,
  });

  return list;
}

function sanitize(s) { return String(s).replace(/[\\/:*?"<>|]/g, '_').trim().slice(0, 180); }

function defaultDownloadsDir() {
  try {
    const electron = require('electron');
    const app = electron.app || electron.remote?.app;
    const p = app?.getPath?.('downloads');
    if (p) return p;
  } catch (_) {}
  return path.join(os.homedir(), 'Downloads');
}

function defaultTempRoot() {
  try {
    const electron = require('electron');
    const app = electron.app || electron.remote?.app;
    const p = app?.getPath?.('temp');
    if (p) return path.join(p, 'SavageSave');
  } catch (_) {}
  return path.join(os.tmpdir(), 'SavageSave');
}

class VideoDownload extends EventEmitter {
  constructor({ url, saveDir, id, filename, format, audioOnly, qualityLabel, cookieBrowser, connections }) {
    super();
    this.id = id || crypto.randomBytes(6).toString('hex');
    this.url = url;
    this.saveDir = saveDir || defaultDownloadsDir();
    this.desiredFilename = filename;
    this.format = format || (ffmpegExists()
      ? 'best[ext=mp4][vcodec!=none][acodec!=none]/best[ext=mp4]/bestvideo*+bestaudio/best'
      : 'best[ext=mp4]/best');
    this.audioOnly = !!audioOnly;
    this.qualityLabel = qualityLabel || '';
    this.status = 'queued';
    this.stage = 'Queued';
    this.error = null;
    this.totalSize = 0;
    this.downloaded = 0;
    this.speed = 0;
    this.eta = 0;
    this.filename = 'video';
    this.filePath = '';
    this.category = 'video';
    this.connections = Math.max(1, Math.min(128, connections || 1));
    this.segments = [];
    this.proc = null;
    this._cancel = false;
    this.engine = 'yt-dlp';
    this.cookieBrowser = cookieBrowser;
    this.tempDir = path.join(defaultTempRoot(), this.id);
    this.logs = [];
  }

  toJSON() {
    return {
      id: this.id, url: this.url, filename: this.filename, filePath: this.filePath,
      saveDir: this.saveDir, status: this.status, stage: this.stage, error: this.error,
      totalSize: this.totalSize, downloaded: this.downloaded,
      progress: this.totalSize ? this.downloaded / this.totalSize :
        (this.status === 'completed' ? 1 : 0),
      speed: this.speed, eta: this.eta, connections: 1,
      category: 'video', segments: [], engine: this.engine,
    };
  }

  async start() {
    try {
      // ── Diagnostics ──────────────────────────────────────────────────────
      this._log(`[diag] ffmpegPath  = ${ffmpegPath}`);
      this._log(`[diag] ffmpegReady = ${ffmpegExists()}`);
      this._log(`[diag] saveDir     = ${this.saveDir}`);
      this._log(`[diag] resources   = ${process.resourcesPath || 'N/A'}`);

      // ── Prepare output folder ────────────────────────────────────────────
      fs.mkdirSync(this.saveDir, { recursive: true });

      this.stage = 'Analyzing...';
      this.emit('update');

      const bin = await ensureYtDlp();
      const finalExt = this.audioOnly ? 'mp3' : 'mp4';

      // Format selector: single-file progressive MP4 first, DASH merge fallback.
      // If no ffmpeg, restrict to progressive only so no merge is needed.
      const hasFfmpeg = ffmpegExists();
      const formatSelector = this.audioOnly
        ? 'bestaudio/best'
        : (this.format
            ? this.format
            : (hasFfmpeg
                ? 'best[ext=mp4][vcodec!=none][acodec!=none]/bestvideo[ext=mp4]+bestaudio[ext=m4a]/bestvideo+bestaudio/best'
                : 'best[ext=mp4][vcodec!=none][acodec!=none]/best[vcodec!=none][acodec!=none]/best'));

      // ── Output template ──────────────────────────────────────────────────
      // Write directly to saveDir — no temp folder, no rename step needed.
      // %(title).150s keeps filenames safe on Windows (< 200 chars total).
      const outTpl = path.join(this.saveDir, '%(title).150s.%(ext)s');

      this.status = 'downloading';
      this.stage = 'Downloading...';
      this.emit('update');

      // Snapshot of files in saveDir BEFORE download (to detect new file after)
      const before = new Set(
        fs.existsSync(this.saveDir) ? fs.readdirSync(this.saveDir) : []
      );

      const args = [
        this.url,
        '-f', formatSelector,
        '-o', outTpl,
        '--newline',
        '--no-playlist',
        '--no-warnings',
        '--progress',
        '--progress-delta', '0.1',
        '--concurrent-fragments', String(this.connections),
        '--socket-timeout', '20',
        '--retries', '3',
        '--fragment-retries', '3',
        '--print', 'after_move:FINAL_PATH=%(filepath)s',
      ];

      const browser = getCookieBrowser(this.cookieBrowser);
      if (browser) args.push('--cookies-from-browser', browser);

      if (hasFfmpeg && ffmpegPath !== 'ffmpeg') {
        args.push('--ffmpeg-location', path.dirname(ffmpegPath));
      }

      if (this.audioOnly) {
        args.push('--extract-audio', '--audio-format', 'mp3', '--audio-quality', '0');
      } else {
        // merge-output-format: yt-dlp uses its own bundled/located ffmpeg to merge
        if (hasFfmpeg) args.push('--merge-output-format', 'mp4');
      }

      const code = await this._runYtDlp(bin, args);
      if (this._cancel) return;
      if (code !== 0) throw new Error(this.error || 'Download failed.');

      this.stage = 'Finalizing...';
      this.emit('update');

      // ── Find the output file ─────────────────────────────────────────────
      // Priority 1: FINAL_PATH printed by yt-dlp (most reliable)
      let finalPath = null;
      if (this.filePath && fs.existsSync(this.filePath)) {
        const st = fs.statSync(this.filePath);
        if (st.isFile() && st.size >= MIN_FINAL_BYTES) {
          finalPath = this.filePath;
          this._log(`[finalize] found via FINAL_PATH: ${finalPath}`);
        }
      }

      // Priority 2: newest file added to saveDir during this download
      if (!finalPath) {
        const VIDEO_EXTS = /\.(mp4|mp3|webm|mkv|m4a|m4v|mov|avi|flv)$/i;
        const TEMP_EXTS  = /\.(part|ytdl|tmp|temp)$/i;
        const FRAG_PAT   = /\.f\d+\.\w+$/i;

        const after = fs.existsSync(this.saveDir) ? fs.readdirSync(this.saveDir) : [];
        const newFiles = after
          .filter(f => !before.has(f) && !TEMP_EXTS.test(f) && !FRAG_PAT.test(f) && VIDEO_EXTS.test(f))
          .map(f => path.join(this.saveDir, f))
          .filter(fp => { try { return fs.statSync(fp).size >= MIN_FINAL_BYTES; } catch { return false; } })
          .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);

        if (newFiles.length > 0) {
          finalPath = newFiles[0];
          this._log(`[finalize] found via dir-diff: ${finalPath}`);
        }
      }

      if (!finalPath) {
        this._log('[finalize] FAILED — no valid output file found in saveDir');
        this._log(`[finalize] saveDir contents: ${fs.readdirSync(this.saveDir).join(', ')}`);
        throw new Error('Could not create final media file.');
      }

      // ── Cleanup leftover DASH fragments ──────────────────────────────────
      try {
        const FRAG_PAT = /\.f\d+\.\w+$/i;
        for (const f of fs.readdirSync(this.saveDir)) {
          if (FRAG_PAT.test(f)) {
            try { fs.unlinkSync(path.join(this.saveDir, f)); } catch (_) {}
          }
        }
      } catch (_) {}

      // ── Silent merge fallback: if yt-dlp didn't merge, do it manually ──────
      if (!finalPath || !fs.existsSync(finalPath) || fs.statSync(finalPath).size < MIN_FINAL_BYTES) {
        try {
          const tempFiles = this._findTempFiles();
          if (tempFiles.length >= 2 && ffmpegExists()) {
            this._log(`[finalize] attempting silent merge for ${tempFiles.length} temp files`);
            this.stage = 'Merging audio + video...';
            this.emit('update');
            const mergedPath = await this._silentMerge(tempFiles);
            if (mergedPath && fs.existsSync(mergedPath)) {
              finalPath = mergedPath;
              this._log(`[finalize] silent merge succeeded: ${finalPath}`);
            }
          }
        } catch (mergeErr) {
          this._log(`[finalize] silent merge failed: ${mergeErr.message}`);
        }
      }

      // ── Complete ─────────────────────────────────────────────────────────
      this.filePath = finalPath;
      this.filename = path.basename(finalPath);
      this.status = 'completed';
      this.stage = 'Completed';
      this.speed = 0;
      this.eta = 0;
      this.downloaded = fs.statSync(finalPath).size;
      this.totalSize = this.downloaded;
      this.emit('update');
      this.emit('completed');

    } catch (e) {
      if (this._cancel) return;
      this.status = 'error';
      this.stage = 'Failed';
      this.error = classifyError(e.message);
      this._log(`[error] ${e.message}`);
      this.emit('update');
      this.emit('error', e);
    }
  }


  _parse(text) {
    const lines = text.split(/\r?\n|\r/);
    for (const line of lines) {
      if (!line.trim()) continue;
      this._log(line);

      // IDM-STYLE: Only 4 user-visible stages. Never expose technical internals.
      if (line.includes('Downloading webpage') || line.includes('Extracting URL')) {
        this.stage = 'Analyzing...';
      }
      // During actual download bytes, keep showing "Downloading..."
      // (progress line handler below will emit update)
      // Merge/FFmpeg operations are hidden — user sees "Finalizing..." in close handler

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
        this.stage = 'Downloading...';
        this.emit('update');
        continue;
      }

      const d = /\[download\]\s+Destination:\s+(.+)/.exec(line);
      if (d) {
        // Ignore temp fragment files (.f###) — only track final output
        const dest = d[1].trim();
        if (!/\.f\d+\.\w+$/.test(dest)) {
          this.filePath = dest;
          this.filename = path.basename(dest);
          this.emit('update');
        }
        continue;
      }

      if (/^ERROR:/i.test(line)) {
        this.error = classifyError(line.replace(/^ERROR:\s*/i, ''));
      }
    }
  }

  _log(line) {
    this.logs.push(String(line).slice(0, 500));
    if (this.logs.length > 120) this.logs.shift();
  }

  _runYtDlp(bin, args) {
    return new Promise((resolve, reject) => {
      this.proc = spawn(bin, args, { windowsHide: true });
      let done = false;
      let lastActivity = Date.now();
      const analyzingSince = Date.now();

      const markActivity = () => { lastActivity = Date.now(); };
      const heartbeat = setInterval(() => {
        if (done) return;
        const stillAnalyzing = this.stage === 'Analyzing...' && (this.downloaded || 0) <= 0;
        if (stillAnalyzing && (Date.now() - analyzingSince > YTDLP_ANALYZE_MAX_MS)) {
          done = true;
          clearInterval(heartbeat);
          try { this.proc && this.proc.kill('SIGKILL'); } catch (_) {}
          reject(new Error('Video analysis took too long. Please retry.'));
          return;
        }
        if (Date.now() - lastActivity > YTDLP_IDLE_TIMEOUT_MS) {
          done = true;
          clearInterval(heartbeat);
          try { this.proc && this.proc.kill('SIGKILL'); } catch (_) {}
          reject(new Error('Download is taking too long with no progress. Please retry.'));
        }
      }, 2000);

      this.proc.stdout.on('data', (c) => {
        markActivity();
        this._parse(c.toString());
      });
      this.proc.stderr.on('data', (c) => {
        markActivity();
        this._parse(c.toString());
      });

      this.proc.on('error', (e) => {
        if (done) return;
        done = true;
        clearInterval(heartbeat);
        reject(e);
      });

      this.proc.on('close', (code) => {
        if (done) return;
        done = true;
        clearInterval(heartbeat);
        resolve(code);
      });
    });
  }

  _resolveCandidateFile(finalExt) {
    // Priority 1: trust FINAL_PATH reported by yt-dlp (after_move hook).
    if (this.filePath && fs.existsSync(this.filePath)) {
      const st = fs.statSync(this.filePath);
      if (st.isFile() && st.size > 0 &&
          path.extname(this.filePath).slice(1).toLowerCase() === finalExt) {
        this._log(`[resolve] FINAL_PATH hit: ${this.filePath}`);
        return this.filePath;
      }
    }

    if (!fs.existsSync(this.tempDir)) {
      this._log(`[resolve] tempDir missing: ${this.tempDir}`);
      return null;
    }

    const files = fs.readdirSync(this.tempDir);
    this._log(`[resolve] tempDir contents: ${files.join(', ')}`);

    // Priority 2: exact extension match in tempDir (skip fragments + temp artifacts).
    const SKIP = /\.(part|ytdl|tmp|temp)$/i;
    const FRAG = /\.f\d+\.\w+$/;
    const exact = [], any = [];
    for (const f of files) {
      const fp = path.join(this.tempDir, f);
      if (!fs.statSync(fp).isFile()) continue;
      if (SKIP.test(f) || FRAG.test(f)) continue;
      if (new RegExp(`\.${finalExt}$`, 'i').test(f)) exact.push(fp);
      // Priority 3: any video file as fallback (will be converted)
      else if (/\.(webm|mkv|mp4|m4v|avi|mov)$/i.test(f)) any.push(fp);
    }
    const pick = (arr) => arr.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs)[0];
    const result = pick(exact) || pick(any) || null;
    this._log(`[resolve] candidate = ${result}`);
    return result;
  }

  async _finalizeCandidate(candidate, finalPathTpl, finalExt) {
    const candidateExt = path.extname(candidate).slice(1).toLowerCase();
    // Build final output path with sanitized title
    const baseName = sanitize(path.parse(candidate).name) || `video_${Date.now()}`;
    const resolvedFinal = finalPathTpl.includes('%(')
      ? path.join(this.saveDir, baseName + `.${finalExt}`)
      : finalPathTpl;
    const finalPath = this._uniquePath(resolvedFinal);

    this._log(`[finalize] candidate=${candidate} ext=${candidateExt}`);
    this._log(`[finalize] finalPath=${finalPath}`);

    if (path.resolve(candidate) === path.resolve(finalPath)) return finalPath;
    fs.mkdirSync(path.dirname(finalPath), { recursive: true });

    // Case A: candidate is already the right format — just move it.
    if (candidateExt === finalExt) {
      try {
        fs.renameSync(candidate, finalPath);
        this._log('[finalize] renamed OK');
      } catch (_) {
        // Cross-device (e.g. temp on different drive) — fall back to copy
        fs.copyFileSync(candidate, finalPath);
        this._log('[finalize] copied OK (cross-device)');
      }
      return finalPath;
    }

    // Case B: candidate is a different container (webm/mkv) — convert with ffmpeg.
    this._log(`[finalize] converting ${candidateExt} → ${finalExt} via ffmpeg`);
    this.stage = 'Converting...';
    this.emit('update');

    // Try stream-copy first (fast, lossless — works if codecs are MP4-compatible)
    try {
      await this._runFfmpeg(['-y', '-i', candidate, '-c', 'copy', '-movflags', '+faststart', finalPath]);
      this._log('[finalize] stream-copy OK');
      return finalPath;
    } catch (e) {
      this._log(`[finalize] stream-copy failed: ${e.message} — retrying with transcode`);
    }

    // Transcode fallback (always works, slower)
    await this._runFfmpeg([
      '-y', '-i', candidate,
      '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
      '-c:a', 'aac', '-b:a', '192k',
      '-movflags', '+faststart',
      finalPath,
    ]);
    this._log('[finalize] transcode OK');
    return finalPath;
  }

  _runFfmpeg(args) {
    return new Promise((resolve, reject) => {
      const proc = spawn(ffmpegPath === 'ffmpeg' ? 'ffmpeg' : ffmpegPath, args, { windowsHide: true });
      let output = '';
      let done = false;
      const timer = setTimeout(() => {
        if (done) return;
        try { proc.kill('SIGKILL'); } catch (_) {}
        reject(new Error('Could not create final media file.'));
      }, FINALIZE_TIMEOUT_MS);
      proc.stderr.on('data', (c) => {
        output += c.toString();
        this._log(c.toString());
      });
      proc.on('error', (e) => {
        done = true;
        clearTimeout(timer);
        reject(e);
      });
      proc.on('close', (code) => {
        done = true;
        clearTimeout(timer);
        if (code === 0) resolve();
        else reject(new Error(output || 'Could not create final media file.'));
      });
    });
  }

  _validateFinalFile(finalPath, finalExt) {
    if (!finalPath || !fs.existsSync(finalPath)) throw new Error('Could not create final media file.');
    const st = fs.statSync(finalPath);
    if (!st.isFile() || st.size < MIN_FINAL_BYTES) throw new Error('Could not create final media file.');
    if (path.extname(finalPath).toLowerCase() !== `.${finalExt}`) throw new Error('Could not create final media file.');
  }

  _looksPlayableCandidate(candidate, finalExt) {
    if (!candidate || !fs.existsSync(candidate)) return false;
    if (path.extname(candidate).replace('.', '').toLowerCase() !== finalExt) return false;
    return fs.statSync(candidate).size >= MIN_FINAL_BYTES;
  }

  _uniquePath(target) {
    if (!fs.existsSync(target)) return target;
    const dir = path.dirname(target);
    const ext = path.extname(target);
    const name = path.basename(target, ext);
    for (let i = 2; i < 1000; i += 1) {
      const p = path.join(dir, `${name} (${i})${ext}`);
      if (!fs.existsSync(p)) return p;
    }
    return path.join(dir, `${name}-${Date.now()}${ext}`);
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

  // MASTER FIX: Find temp files (.f### format IDs) left by yt-dlp
  _findTempFiles() {
    try {
      const dir = this.saveDir;
      if (!fs.existsSync(dir)) return [];
      const files = fs.readdirSync(dir);
      const tempFiles = [];
      
      for (const f of files) {
        // Match yt-dlp temp file patterns: Title.f244.webm, Title.f140.m4a, etc.
        if (/\.f\d+\.(webm|m4a|mp4|mkv|avi|mov)$/i.test(f)) {
          tempFiles.push(path.join(dir, f));
        }
      }
      return tempFiles;
    } catch (e) {
      return [];
    }
  }

  // IDM-STYLE: Silent ffmpeg merge — user never sees this happening
  // Runs after yt-dlp exits if temp files weren't auto-merged
  async _silentMerge(tempFiles) {
    return new Promise((resolve, reject) => {
      if (!ffmpegExists() || tempFiles.length < 2) {
        return reject(new Error('Not enough temp files or ffmpeg missing'));
      }

      // Video file: any video ext that's not an audio-only file
      const videoFile = tempFiles.find(f => /\.(webm|mp4|mkv|avi|mov)$/i.test(f) && !/\.(m4a|mp3|aac|wav|flac|ogg)$/i.test(f));
      // Audio file: common audio formats yt-dlp uses for DASH audio
      const audioFile = tempFiles.find(f => /\.(m4a|mp3|aac|wav|flac|ogg|opus|webm)$/i.test(f) && f !== videoFile);
      
      if (!videoFile || !audioFile) {
        return reject(new Error('Could not identify video and audio temp files'));
      }

      const baseName = path.parse(videoFile).name.replace(/\.f\d+$/, '');
      const outFile = path.join(path.dirname(videoFile), baseName + '.mp4');

      // H264+AAC for universal playback
      const ffmpegArgs = [
        '-y', '-i', videoFile, '-i', audioFile,
        '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
        '-c:a', 'aac', '-b:a', '192k',
        '-movflags', '+faststart',
        '-shortest',
        outFile
      ];

      const proc = spawn(ffmpegPath === 'ffmpeg' ? 'ffmpeg' : ffmpegPath, ffmpegArgs, { windowsHide: true });
      let errOut = '';
      proc.stderr.on('data', (c) => { errOut += c.toString(); });
      
      proc.on('close', async (code) => {
        if (code === 0 && fs.existsSync(outFile) && fs.statSync(outFile).size > 0) {
          resolve(outFile);
        } else {
          // MKV fallback: just copy streams, no transcoding
          const mkvFile = outFile.replace(/\.mp4$/i, '.mkv');
          if (mkvFile !== outFile) {
            const mkvArgs = ['-y', '-i', videoFile, '-i', audioFile, '-c', 'copy', mkvFile];
            const mkvProc = spawn(ffmpegPath === 'ffmpeg' ? 'ffmpeg' : ffmpegPath, mkvArgs, { windowsHide: true });
            let mkvErr = '';
            mkvProc.stderr.on('data', (c) => { mkvErr += c.toString(); });
            mkvProc.on('close', (mkvCode) => {
              if (mkvCode === 0 && fs.existsSync(mkvFile) && fs.statSync(mkvFile).size > 0) {
                resolve(mkvFile);
              } else {
                reject(new Error(`Silent merge failed: ${errOut.slice(0, 200)}`));
              }
            });
          } else {
            reject(new Error(`Silent merge failed: ${errOut.slice(0, 200)}`));
          }
        }
      });
      
      proc.on('error', (e) => reject(e));
    });
  }

  // Clean up the entire tempDir after download completes or fails.
  async _cleanupTempFiles() {
    try {
      if (!fs.existsSync(this.tempDir)) return;
      for (const f of fs.readdirSync(this.tempDir)) {
        const fp = path.join(this.tempDir, f);
        // Never delete the final file if it somehow landed in tempDir.
        if (fp === this.filePath) continue;
        try { fs.unlinkSync(fp); } catch (_) {}
      }
      // Remove the now-empty tempDir folder itself.
      try { fs.rmdirSync(this.tempDir); } catch (_) {}
    } catch (e) {
      console.error('[SavageSave] Cleanup error:', e.message);
    }
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
