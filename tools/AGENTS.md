# Tools

Vanilla JS, no build, no node project. `web/` is deployed as-is to `entorb.net/tools/`.

## Layout

- `web/calc.js` — pure logic of all tools, no DOM. Tested by `tests/calc.test.js` (`node --test`).
- `web/stats.js` — usage counter via `web-stats-json.php`, origins are the ones of the old PHP/Perl tools.
- `web/<page>.html` + `web/<page>.js` — one page per tool, DOM wiring only.
- `web/.htaccess` — 301 redirects from the old `.php`/`.pl`/`.cgi` URLs.

## Rules

- Type safety via `// @ts-check` + JSDoc, editor only.
- Never put user text into `innerHTML`, use `textContent`.
- Random values only via `crypto.getRandomValues`.

## Code Checks

after each task run

- `pnpm dlx @biomejs/biome check --write --reporter=concise .`
- `node --test`
