# Idle Games — Time-to-target ledger

No-backend, no-framework web app. PNPM, TypeScript + Vite. Static output for browser.

## Layout

- `src/calc.ts` — pure math, no DOM. `evaluate()` scores each `Investment` against a no-purchase baseline and picks `bestOption` (lowest `totalSeconds` strictly below baseline); `formatMinutes`/`formatDeltaPlain` format for display.
- `src/const.ts` — default `state` (target / amount / gain) and hardcoded option list. Only source of defaults; no persistence.
- `src/main.ts` — DOM UI. Markup built from template strings; run `escapeHtml` on all user text.

## UI focus rule

`render()` rebuilds every row; `updateEval()` patches only the derived cells in place so editing a number input never steals focus. Keep new inputs off any path that re-renders on `input`.

## Commands

Package manager is pnpm; no test or lint script exists in `idle/`. Git repo root and all checks live in the parent dir (`..`).

- type check / build: `npm run build` (= `tsc && vite build`; tsconfig is `noEmit`), dev server: `npm run dev`
- format + lint: biome configured only at repo root (`biome.json`). `scripts/chk_js_format.sh`
- spelling: uses root `cspell-words.txt` (the `idle/cspell-words.txt` copy is stale); append unknown words at root, pre-commit sorts it

`idle/` does not fully pass biome today (pre-existing tsconfig formatting errors). Keep new code biome-clean; don't touch unrelated files unless asked.

## Behavior

Options are kept sorted ascending by `gain` (`sortOptions()`), re-sorted on add and on gain `change` (biome keeps gain/cost row heights aligned but rows reorder; name edits never re-sort).
