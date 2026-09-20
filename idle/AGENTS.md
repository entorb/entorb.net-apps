# Idle Games — Time-to-target ledger

No-backend, no-framework web app. PNPM, TypeScript + Vite. Static output for browser.

## Layout

- `src/calc.ts` — pure math, no DOM. `evaluate()` scores each `Investment` against a no-purchase baseline and picks `bestOption` (lowest `totalSeconds` strictly below baseline); `formatMinutes`/`formatDeltaPlain` format for display.
- `src/const.ts` — default `state` (target / amount / gain) and hardcoded option list. Only source of defaults; no persistence.
- `src/main.ts` — DOM UI. Markup built from template strings; run `escapeHtml` on all user text.

## Code Checks

after each task run

- `pnpm dlx @biomejs/biome check --write --reporter=concise .`
- `pnpm exec tsc --noEmit`
- `pnpm dlx knip --reporter compact`

Fix errors and warnings and update `AGENTS.md` so they are prevented in future.

## Behavior

Options are kept sorted ascending by `gain` (`sortOptions()`), re-sorted on add and on gain `change` (biome keeps gain/cost row heights aligned but rows reorder; name edits never re-sort).

## UI focus rule

`render()` rebuilds every row; `updateEval()` patches only the derived cells in place so editing a number input never steals focus. Keep new inputs off any path that re-renders on `input`.
