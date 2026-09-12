# Idle Games — Time-to-target ledger

No-backend, no-framework web app. PNPM, TypeScript + Vite. Static output for browser.

## Layout

- `src/calc.ts` — pure math, no DOM. `evaluate()` scores each `Investment` against a no-purchase baseline and picks `bestOption` (lowest `totalSeconds` strictly below baseline); `formatMinutes`/`formatDeltaPlain` format for display.
- `src/const.ts` — default `state` (target / amount / gain) and hardcoded option list. Only source of defaults; no persistence.
- `src/main.ts` — DOM UI. Markup built from template strings; run `escapeHtml` on all user text.

## Commands

- `scripts/run_checks.sh` (runs every `scripts/chk_*.sh`); run after each feature
- `scripts/chk_js_format.sh` (biome `check --write`, configured at `../biome.json`); run after each task
- `scripts/chk_js_types.sh` (`pnpm exec tsc --noEmit`)
- `scripts/chk_js_dead.sh` (`knip`)
- `scripts/chk_spelling.sh` (`cspell`, uses `cspell-words.txt`)
- `scripts/chk_js_package_audit.sh` (`pnpm audit`)
- `scripts/chk_pre-commit.sh` (prek run `--all-files`)

When biome or type errors appear: Fix them and update `AGENTS.md` so they are prevented in future.

## Behavior

Options are kept sorted ascending by `gain` (`sortOptions()`), re-sorted on add and on gain `change` (biome keeps gain/cost row heights aligned but rows reorder; name edits never re-sort).

## UI focus rule

`render()` rebuilds every row; `updateEval()` patches only the derived cells in place so editing a number input never steals focus. Keep new inputs off any path that re-renders on `input`.
