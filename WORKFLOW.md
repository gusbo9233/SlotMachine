# Casino Slots — Workflow

This document describes two kinds of workflows for the project:

1. **Developer workflow** — how to set up, run, and ship the app.
2. **Runtime workflow** — what happens inside the app when the user plays.

---

## 1. Developer Workflow

### 1.1 Prerequisites

- [Node.js](https://nodejs.org) 18+ (ships with `npm`)
- A modern browser (Chrome, Firefox, Safari, Edge)

### 1.2 One-Time Setup

```bash
git clone <repo-url>
cd casionoslot
npm install
```

`npm install` reads `package.json` and downloads React, Vite, and the React plugin into `node_modules/`.

### 1.3 Day-to-Day Loop

```bash
npm run dev
```

- Vite starts a dev server (usually at `http://localhost:5173`).
- Hot Module Replacement: save a file and the browser updates without a full reload.
- React `StrictMode` double-invokes effects in dev to surface bugs early.

**Edit cycle:**

1. Open `src/App.jsx` (logic) or `src/styles.css` (look & feel).
2. Save — browser auto-updates.
3. Check behavior and the browser console for warnings.
4. Repeat.

### 1.4 Production Build

```bash
npm run build      # outputs static files to dist/
npm run preview    # serves dist/ locally to sanity-check
```

The `dist/` folder is what you deploy — any static host (Netlify, Vercel, GitHub Pages, S3) will do.

### 1.5 File Responsibilities

| File | Role |
|---|---|
| `index.html` | Single HTML shell; loads `main.jsx` |
| `src/main.jsx` | Mounts `<App />` into `#root` |
| `src/App.jsx` | Slot-machine component and game logic |
| `src/styles.css` | Layout, reel animation, win glow |
| `logo.png` | Jackpot symbol asset |
| `vite.config.js` | Build config (enables React plugin) |
| `package.json` | Dependencies and npm scripts |

---

## 2. Runtime Workflow (A Single Spin)

### 2.1 App Boot

```
index.html  →  main.jsx  →  ReactDOM.createRoot().render(<App />)
```

`App` initializes state with `useState`, builds the reel data once with `useMemo`, and registers a cleanup effect via `useEffect`.

### 2.2 The Spin Lifecycle

```
┌──────────────────────────────────────────────────────────────┐
│ 1. User clicks SPIN                                          │
│    → handleSpin() runs                                       │
├──────────────────────────────────────────────────────────────┤
│ 2. Guards                                                    │
│    - Are we already spinning? Enough credits?                │
│    - If not, show a message and abort.                       │
├──────────────────────────────────────────────────────────────┤
│ 3. Prepare                                                   │
│    - clearTimers() cancels any lingering work                │
│    - Pick a random target index for each reel                │
│    - setCredits(c => c - bet)                                │
│    - setSpinning(true), setSettledReels([false,false,false]) │
├──────────────────────────────────────────────────────────────┤
│ 4. Animate                                                   │
│    - scheduleSpinAnimation(targets) loops via                │
│      requestAnimationFrame, updating centerIndices           │
│      every frame until SPIN_DURATION elapses.                │
├──────────────────────────────────────────────────────────────┤
│ 5. Stagger stops                                             │
│    - setTimeout per reel: mark that reel "settled"           │
│      (offset by STOP_STAGGER)                                │
├──────────────────────────────────────────────────────────────┤
│ 6. Finish                                                    │
│    - setTimeout → finishSpin(targets)                        │
│    - getLineWin() checks the center row                      │
│    - If win: credit payout, set message, highlight reels     │
│    - setSpinning(false), increment spinCount                 │
└──────────────────────────────────────────────────────────────┘
```

### 2.3 State ↔ UI Mapping

| State | Drives |
|---|---|
| `centerIndices` | Which symbol each reel shows |
| `spinning` | Disables buttons, triggers CSS animation |
| `settledReels` | Per-reel "has it stopped yet?" |
| `credits`, `bet`, `spinCount` | Status deck numbers |
| `lastWin` | Payout panel + `win-state` glow class |
| `message` | Status text under the cabinet |

### 2.4 Cleanup

When the component unmounts (e.g. page navigates away), the `useEffect` cleanup walks `timersRef.current` and cancels every pending `setTimeout` and `requestAnimationFrame`. No ghosts left behind.

---

## 3. Common Tasks

| I want to… | Edit |
|---|---|
| Change starting credits | `STARTING_CREDITS` in `App.jsx` |
| Add or remove a symbol | `SYMBOLS` array in `App.jsx` |
| Make spins faster/slower | `SPIN_DURATION`, `STOP_STAGGER` |
| Change payout multipliers | `payout` line in `finishSpin` |
| Restyle the cabinet | `src/styles.css` |
| Swap the jackpot logo | Replace `logo.png` |

---

## 4. Troubleshooting

- **Blank page:** check the browser console; usually a JSX syntax error shown by Vite.
- **Port in use:** `npm run dev -- --port 3000`.
- **Stale install:** `rm -rf node_modules package-lock.json && npm install`.
- **Build fails:** run `npm run build` locally and read the first error — later ones are usually cascades.
