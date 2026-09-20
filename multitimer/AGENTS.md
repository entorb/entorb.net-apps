# Multi-Timer

No-framework web app. PNPM, TypeScript + Vite. Static output for browser.

## Layout

- `index.html` — static markup, incl. `<template id="row-template">` cloned per timer row.
- `src/timers.ts` — pure logic and `localStorage` access, no DOM. Storage keys `eta_vue_mt_*` are kept from the Vue version so existing user data stays readable.
- `src/main.ts` — DOM wiring, 1s `tick()` updates bars and rings the bell once per timer.
- `public/audio/` — bell sound.

## Commands

- `scripts/run_checks.sh` (runs every `scripts/chk_*.sh`); run after each feature
- `scripts/chk_js_format.sh` (biome `check --write`, configured at `../biome.json`); run after each task
- `scripts/chk_js_types.sh` (`pnpm exec tsc --noEmit`)
- `scripts/chk_js_test.sh` (vitest, jsdom)
- `scripts/chk_js_dead.sh` (`knip`)
- `scripts/chk_spelling.sh` (`cspell`, uses `cspell-words.txt`)
- `scripts/chk_js_package_audit.sh` (`pnpm audit`)
- `scripts/chk_pre-commit.sh` (prek run `--all-files`)

When biome or type errors appear: Fix them and update `AGENTS.md` so they are prevented in future.
