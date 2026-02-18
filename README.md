# Do not Wish. Plan

DNWP is a local-first wish list and acquisition planner. You maintain needs and wants with prices and priorities; the app produces a month-by-month purchase plan within a configurable budget.


## Overview

### Features

- **Lists:** Needs and Wants; per-item title, price, currency, priority (rank or weight), optional labels.
- **Achieved:** Mark items as achieved (strikethrough); they are excluded from the plan.
- **Plan settings:** Start date, monthly budget, carryover, fairness ratio (needs vs wants), planning horizon.
- **Acquisition plan:** Month-by-month schedule using a weighted-fair interleaving of needs and wants (see [Planning algorithm](#planning-algorithm)).
- **Customization:** Optional monthly budget overrides; optional target month for specific items; optional labels and manual FX rates.
- **Persistence:** Local only (IndexedDB via LocalForage). Export/import full state as JSON backup.
- **UX:** Drag-and-drop reorder, light/dark/system theme, responsive layout.

### Limitations

- **Data:** Stored only in the browser (IndexedDB). Clearing site data removes everything; use Export to back up.
- **Currencies:** Base and item currencies are limited to: EUR, USD, GBP, CHF, RUB, UAH. Multi-currency planning requires manual FX rates (1 unit of foreign currency = X in base).
- **Planning:** Items in a currency without a valid FX rate are excluded from the plan until a rate is set or the item currency is changed to base.

### Planning algorithm

**Budgeted Weighted Fair Interleaving (BWFI):** build a purchase sequence by repeatedly picking the next affordable item from two pools (needs, wants), while keeping a target ratio (e.g. 2 needs : 1 want).

- **Desirability:** Rank mode: score = (maxRank + 1 − rank). Weight mode: score = weight, then `score / (price^α)` (α ≈ 0.35) so expensive items do not always block progress.
- **Fairness:** At each step, prefer the pool whose current share is below its target and has an affordable item; otherwise take from the other pool. Stop when neither has an affordable item.
- **Scope:** Only items in the **base currency** (or converted via manual FX rates) are planned; others appear as excluded until converted.

### Requirements

- **Runtime:** Modern browser with IndexedDB and ES2022 support.
- **Development:** Node.js 18+ (LTS recommended), npm.

No environment variables or backend are required. The app runs entirely in the browser.

## Tech stack

| Layer  | Choice |
|--------|--------|
| Build  | Vite 7, React 18, TypeScript 5 |
| UI     | Tailwind CSS, Radix UI (dialog, tabs, dropdown, etc.), Lucide icons, next-themes |
| State  | Zustand |
| Storage | LocalForage (IndexedDB) |
| Drag&Drop | @dnd-kit (sortable lists) |



## Install and run

```bash
npm install
npm run dev
```

Open the URL shown in the terminal (e.g. `http://localhost:5173`).

**Other scripts:**

- `npm run build` — production build (output in `dist/`)
- `npm run preview` — serve production build locally
- `npm run lint` / `npm run lint:fix` — ESLint

## Deployment

The app is a static SPA. Build once, then serve the `dist/` output. No env vars or server-side logic are required.

### Netlify

- **Build command:** `npm run build`
- **Publish directory:** `dist`
- Optional: add `netlify.toml` in the repo:

```toml
[build]
  command = "npm run build"
  publish = "dist"
```

Connect the repo in the Netlify dashboard or use the Netlify CLI.

### Vercel

- **Framework preset:** Vite (auto-detected when you import the repo).
- **Build command:** `npm run build`
- **Output directory:** `dist`

No config file required; override in the Vercel project settings if needed.

### DigitalOcean App Platform

- **Type:** Static Site.
- **Build command:** `npm run build`
- **Output directory:** `dist`
- **Run command:** leave empty (static only).

Alternatively use a **Static Site** droplet or Spaces with static site hosting and upload the contents of `dist/` after building locally.
