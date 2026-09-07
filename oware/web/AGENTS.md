# Web Implementation

No-backend web app. TypeScript + Vite, plays in the browser. Static output.

## Layout

- `web/`: `index.html`, `package.json`, `pnpm-workspace.yaml`, `tsconfig.json`, `vite.config.ts`, `.gitignore`
  - `web/src/`: `main.ts` (app entry + game loop), `models.ts` (port of `models.py`), `computer.ts` (port of `computer.py`), `rules.ts` (rule text for display), `ui.ts` (DOM rendering), `style.css`
  - `web/tests/`: vitest unit tests for the data model and the forecast (`models.test.ts`, `anan.test.ts`, `abapa.test.ts`, `moveGains.test.ts`)

## Architecture

- `models.ts`: faithful TypeScript port of `models.py`; `Player`/`Ruleset`/`GameStatus` are string unions, `Board`/`Move`/`GameState` are plain readonly interfaces. Keep in sync with the shared [rules-this-game.md](../rules-this-game.md) spec.
- `main.ts` runs the game loop — a click on a movable pit calls `play()`, then a timer triggers the computer side via `chooseMove()` unless it's a human turn. Supports human vs human, human vs computer, and computer vs computer.
- `rules.ts` parses the rule text from `../rules-this-game.md` shown in the UI per `Ruleset`; it has no game logic.

## Checks

Run from the repo root — the web subset of the shared scripts:

- `scripts/chk_js_types.sh` — `tsc --noEmit`
- `scripts/chk_js_test.sh` — vitest (`pnpm exec vitest --watch=false --silent=passed-only`)
- `scripts/chk_js_format.sh` — biome check (format + lint; try `--write --unsafe` on failure)
- `scripts/chk_js_dead.sh` — knip (dead code)
- `scripts/chk_js_package_audit.sh` — `pnpm audit`, auto-fix via `pnpm-workspace.yaml` overrides

The full run is `scripts/run_checks.sh`; the shared verification policy lives in the root `AGENTS.md`.

## TypeScript notes

- `verbatimModuleSyntax` on: import types with `import type { ... }`.
- `noUncheckedIndexedAccess` on: array reads are `T | undefined`; use non-null `!` where an index is provably in range (e.g. `pits[index]!`).
