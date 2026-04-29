# ⚡ SavageSave

A world-class premium desktop download manager built for speed. Dark cyber UI with glassmorphism, multi-connection HTTP Range acceleration, video quality picker, smart scheduler, and more.
Built with **Electron + React + Tailwind + Node.js/Express**, featuring real multi-connection
HTTP Range downloads, a built-in terminal, an AI assistant, scheduler, clipboard monitoring,
and more.

![preview](docs/preview.png)

## ✨ Features

### Core
1. Download from any URL
2. Multi-connection downloading (split via HTTP `Range` requests)
3. Pause / Resume / Cancel
4. Real-time speed, progress bar, ETA (EMA-smoothed)
5. Auto file merging after download (writes into a sparse `.part` file, renames on completion)
6. Large-file support (streaming to disk, never held in RAM)

### Advanced
7. Smart download accelerator (dynamic chunk size / per-segment retries)
8. Clipboard monitoring — auto-detects copied links
9. Browser integration — MV3 extension under `/browser-extension`
10. Scheduler — start / pause at a specific time
11. File categorization (video, audio, image, document, archive, software)
12. Dark / Light theme toggle

### Unique
13. **In-app terminal** — commands: `download <url> [n]`, `pause <id>`, `resume`, `cancel`, `list`, `open`, `theme`, `clear`, `help`
14. **AI assistant panel** with rule-based smart suggestions (resume failed, boost connections, etc.)
15. Beautiful glassmorphism + cyber UI, animated gradients, scanlines, glow
16. Animated progress (shimmer) + per-connection segmented bars
17. In-app toast + native OS notifications

### System
18. Native file-system access (Electron)
19. User-selectable save directory
20. OS notifications via Electron `Notification`

## 🗂 Project Structure

```
download manager project/
├── electron/                 Electron main process + preload
│   ├── main.js
│   └── preload.js
├── backend/                  Express backend + download engine
│   ├── server.js
│   ├── downloadManager.js
│   ├── downloadEngine.js     ← multi-connection HTTP Range engine
│   └── scheduler.js
├── frontend/                 React renderer (Vite)
│   ├── index.html
│   └── src/
│       ├── main.jsx
│       ├── App.jsx
│       ├── index.css
│       ├── api.js
│       ├── utils.js
│       ├── hooks/useDownloads.js
│       └── components/
│           ├── Sidebar.jsx
│           ├── Dashboard.jsx
│           ├── DownloadCard.jsx
│           ├── Terminal.jsx
│           ├── AIAssistant.jsx
│           ├── AddDownloadModal.jsx
│           ├── Settings.jsx
│           ├── Scheduler.jsx
│           └── Notifications.jsx
├── browser-extension/        Optional MV3 "Send to SavageSave"
├── vite.config.mjs
├── tailwind.config.cjs
├── postcss.config.cjs
└── package.json
```

## 🚀 Setup

Requires Node.js 18+.

```bash
npm install
npm run dev
```

This runs Vite (renderer on `http://localhost:5173`) and Electron in parallel. The Electron main
process boots the embedded Express backend on a random local port and passes it to the renderer
via `?apiPort=<port>`.

### Production build

```bash
npm run build     # builds the React app into frontend/dist
npm start         # launches Electron against the built assets
```

## 🧪 Sample test URLs

Use these to exercise multi-connection + range support:

```
https://speed.hetzner.de/100MB.bin
https://speed.hetzner.de/1GB.bin
https://proof.ovh.net/files/100Mb.dat
https://proof.ovh.net/files/1Gb.dat
```

Open the app, click **+ New Download**, paste a URL, choose a folder, and watch the
per-connection segmented bars animate.

## ⌨️ Terminal commands

```
help                      show help
download <url> [n]        start download with n connections (default 8)
list                      list downloads
pause <id|name>           pause
resume <id|name>          resume
cancel <id|name>          cancel
remove <id|name>          remove from list
open <id|name>            open completed file
theme <dark|light>        toggle theme
clear                     clear screen
```

Shortcuts:
- `Ctrl+N` — new download modal
- Arrow Up / Down in terminal — command history

## 🧩 Browser extension (optional)

1. Open `chrome://extensions`, enable **Developer mode**.
2. **Load unpacked** → select `browser-extension/`.
3. Right-click any link → **Send to SavageSave**. The app must be running.

(Replace `browser-extension/icon.png` with your own 128×128 icon before publishing.)

## 🛠 Architecture Notes

- **Download engine (`backend/downloadEngine.js`)** preallocates a sparse file and spawns N
  parallel HTTP Range requests that write to their own byte offsets in the same `.part` file.
  On completion the `.part` is renamed to the final filename.
- If the server does not advertise `Accept-Ranges: bytes`, the engine falls back to a single
  stream. Pause/resume are only fully reliable when ranges are supported.
- **Live updates** are streamed to the renderer over **Server-Sent Events** (`/api/events`),
  so the UI never polls.
- **IPC** (`electron/preload.js`) bridges native features: folder dialog, clipboard read,
  `shell.openPath`, OS notifications.
- **Scheduler** is an in-memory tick-based runner — good enough for personal use. Persist jobs
  to disk if you need durability across restarts.

## 📦 Dependencies

- Runtime: `express`, `cors`
- Renderer: `react`, `react-dom`, `tailwindcss`
- Desktop: `electron`
- Tooling: `vite`, `@vitejs/plugin-react`, `concurrently`, `wait-on`, `cross-env`

No external download libraries — the engine is pure Node `http`/`https`.

## License

MIT
