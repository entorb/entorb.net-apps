# AGENTS.md

This repos hosts multiple tiny web apps, written in vanilla typescript.

- use pnpm instead of npm
- run `pnpm dlx @biomejs/biome check --write --reporter=concise .` after each change and fix findings.
- checks, deploy and dependency updates are driven from `scripts/`, all take an optional app name:
  `./scripts/run_checks.sh [app]`, `./scripts/deploy.sh [app]`, `./scripts/update.sh`
- `scripts/js/chk_*.sh <dir>` are the shared node checks, `<dir>` is the app's node project
  (`idle`, `oware/web`); per-app copies do not exist.
- `tools` is plain JS without node project or build: node checks are skipped, `tools/web/` is deployed as-is.

## Deployment

- target: `entorb8@mab.uberspace.de:/var/www/virtual/entorb8/html/<app>/` via rsync (`--delete`).
- `./scripts/deploy.sh [app]` runs checks + spelling, builds node apps (`dist/`), syncs each app,
  then asks before overwriting `index.php` and `web-stats-json.php` in the server root.
- `./tools/scripts/deploy.sh` deploys only `tools/web/`, without the root files.
- new app or tool with usage counter: add its origin to the whitelist in `entorb.net/web-stats-json.php`
  and a link in `entorb.net/index.php`.

## entorb.net/

- local mirror of the webserver root, gitignored, not committed.
- updated by `./download-entorb.net.sh` (rsync server → local with `--delete`):
  deploy local edits to `entorb.net/` first, a download overwrites them.
- `entorb.net/<app>/` are deployed copies: edit the app sources, not the mirror.
