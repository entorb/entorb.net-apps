# AGENTS.md

This repos hosts multiple tiny web apps, written in vanilla typescript.

- use pnpm instead of npm
- run `pnpm dlx @biomejs/biome check --write --reporter=concise .` after each change and fix findings.
- checks, deploy and dependency updates are driven from `scripts/`, all take an optional app name:
  `./scripts/run_checks.sh [app]`, `./scripts/deploy.sh [app]`, `./scripts/update.sh`
- `scripts/js/chk_*.sh <dir>` are the shared node checks, `<dir>` is the app's node project
  (`idle`, `multitimer`, `oware/web`); per-app copies do not exist.
