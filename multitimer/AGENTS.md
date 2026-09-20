# Multi-Timer

No-framework web app. PNPM, TypeScript + Vite. Static output for browser.

## Layout

- `index.html` — static markup, incl. `<template id="row-template">` cloned per timer row.
- `src/timers.ts` — pure logic and `localStorage` access, no DOM. Storage keys `eta_vue_mt_*` are kept from the Vue version so existing user data stays readable.
- `src/main.ts` — DOM wiring, 1s `tick()` updates bars and rings the bell once per timer.
- `public/audio/` — bell sound.

## Code Checks

after each task run

- `pnpm dlx @biomejs/biome check --write --reporter=concise .`
- `pnpm exec tsc --noEmit`
- `pnpm dlx knip --reporter compact`

Fix errors and warnings and update `AGENTS.md` so they are prevented in future.
