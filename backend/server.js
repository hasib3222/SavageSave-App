// Express backend embedded inside Electron.
// Exposes REST endpoints and an SSE stream for live progress.

const express = require('express');
const cors = require('cors');
const os = require('os');
const path = require('path');
const { DownloadManager } = require('./downloadManager');
const { Scheduler } = require('./scheduler');
const { probe } = require('./downloadEngine');
const { isVideoUrl, probeVideo, ensureYtDlp } = require('./videoDownloader');

function startBackend() {
  return new Promise((resolve) => {
    const app = express();
    const manager = new DownloadManager();
    const scheduler = new Scheduler(manager);

    app.use(cors());
    app.use(express.json({ limit: '1mb' }));

    // --- Downloads ---
    app.get('/api/downloads', (_req, res) => res.json(manager.list()));

    app.post('/api/downloads', (req, res) => {
      const { url, saveDir, connections, filename, format, audioOnly, qualityLabel, cookieBrowser } = req.body || {};
      if (!url) return res.status(400).json({ error: 'url is required' });
      const dir = saveDir || path.join(os.homedir(), 'Downloads');
      const d = manager.add({ url, saveDir: dir, connections, filename, format, audioOnly, qualityLabel, cookieBrowser });
      res.json(d.toJSON());
    });

    app.post('/api/downloads/:id/pause', (req, res) =>
      res.json({ ok: manager.pause(req.params.id) }));
    app.post('/api/downloads/:id/resume', (req, res) =>
      res.json({ ok: manager.resume(req.params.id) }));
    app.post('/api/downloads/:id/cancel', (req, res) =>
      res.json({ ok: manager.cancel(req.params.id) }));
    app.delete('/api/downloads/:id', (req, res) =>
      res.json({ ok: manager.remove(req.params.id) }));

    // Probe a URL (used before creating a download).
    // Routes video-platform URLs through yt-dlp so we get the title etc.
    app.post('/api/probe', async (req, res) => {
      try {
        const { url, cookieBrowser } = req.body || {};
        const info = isVideoUrl(url) ? await probeVideo(url, cookieBrowser) : await probe(url);
        res.json(info);
      } catch (e) {
        res.status(400).json({ error: e.message });
      }
    });

    // Prefetch yt-dlp binary in the background so first video download is snappy.
    ensureYtDlp().catch((e) => console.warn('[SavageSave] yt-dlp prefetch failed:', e.message));

    // --- Scheduler ---
    app.get('/api/schedule', (_req, res) => res.json(scheduler.list()));
    app.post('/api/schedule', (req, res) => {
      const { downloadId, action, runAt } = req.body || {};
      if (!downloadId || !action || !runAt) return res.status(400).json({ error: 'missing fields' });
      const id = scheduler.schedule({ downloadId, action, runAt });
      res.json({ id });
    });
    app.delete('/api/schedule/:id', (req, res) =>
      res.json({ ok: scheduler.cancel(req.params.id) }));

    // --- Defaults ---
    app.get('/api/defaults', (_req, res) => {
      res.json({ saveDir: path.join(os.homedir(), 'Downloads') });
    });

    // --- Server-Sent Events for live updates ---
    app.get('/api/events', (req, res) => {
      res.set({
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      });
      res.flushHeaders();

      const send = (event, data) => {
        res.write(`event: ${event}\n`);
        res.write(`data: ${JSON.stringify(data)}\n\n`);
      };

      // Initial snapshot
      send('snapshot', manager.list());

      const onChange = (d) => send('change', d);
      const onCompleted = (d) => send('completed', d);
      const onFailed = (d) => send('failed', d);
      const onRemoved = (d) => send('removed', d);

      manager.on('change', onChange);
      manager.on('completed', onCompleted);
      manager.on('failed', onFailed);
      manager.on('removed', onRemoved);

      const keepAlive = setInterval(() => res.write(': ping\n\n'), 15000);

      req.on('close', () => {
        clearInterval(keepAlive);
        manager.off('change', onChange);
        manager.off('completed', onCompleted);
        manager.off('failed', onFailed);
        manager.off('removed', onRemoved);
      });
    });

    const server = app.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      // eslint-disable-next-line no-console
      console.log(`[SavageSave backend] listening on http://127.0.0.1:${port}`);
      resolve({ port, app, manager, scheduler });
    });
  });
}

module.exports = { startBackend };
