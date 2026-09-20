# Oware Web Implementation

No-backend, no-framework web app. PNPM, TypeScript + Vite. Static output for browser.

## Layout

- `web/`: `index.html`, `package.json`, `pnpm-workspace.yaml`, `tsconfig.json`, `vite.config.ts`, `.gitignore`
  - `web/src/`: `main.ts` (app entry + game loop), `models.ts` (port of `models.py`), `computer.ts` (port of `computer.py`), `rules.ts` (rule text for display), `ui.ts` (DOM rendering), `style.css`
  - `web/tests/`: vitest unit tests for the data model and the forecast (`models.test.ts`, `anan.test.ts`, `abapa.test.ts`, `moveGains.test.ts`)

## Architecture

- `models.ts`: faithful TypeScript port of `models.py`; `Player`/`Ruleset`/`GameStatus` are string unions, `Board`/`Move`/`GameState` are plain readonly interfaces. Keep in sync with the shared [rules-this-game.md](../rules-this-game.md) spec.
- `main.ts` runs the game loop — a click on a movable pit calls `play()`, then a timer triggers the computer side via `chooseMove()` unless it's a human turn. Supports human vs human, human vs computer, and computer vs computer.
- `rules.ts` parses the rule text from `../rules-this-game.md` shown in the UI per `Ruleset`; it has no game logic.

## Code Checks

after each task run

- `pnpm dlx @biomejs/biome check --write --reporter=concise .`
- `pnpm exec tsc --noEmit`
- `pnpm dlx knip --reporter compact`

Fix errors and warnings and update `AGENTS.md` so they are prevented in future.

## TypeScript notes

- `verbatimModuleSyntax` on: import types with `import type { ... }`.
- `noUncheckedIndexedAccess` on: array reads are `T | undefined`; use non-null `!` where an index is provably in range (e.g. `pits[index]!`).
