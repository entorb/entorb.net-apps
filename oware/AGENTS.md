# Oware Game Simulator

Three independent implementations of the same rules:

- `python/` — Python 3.14 + uv, no runtime deps (stdlib only), src layout, hatchling backend. Terminal CLI.
- `web/` — no-backend web app. TypeScript + Vite, plays in the browser. Static output.
- `go/` — Go, stdlib only. Anan-Anan Monte Carlo simulator (game count + first-player win ratio).

Per-language detail lives in `python/AGENTS.md`, `web/AGENTS.md`, and `go/AGENTS.md` — read the relevant one before editing that tree.

Do not scan the repo at the start of a new session — wait for an explicit task instead. In particular, run no directory listings (`ls`, the directory `Read`) and no global `Glob`/`Grep` passes before a task is given; they only burn tokens. `Glob`/`Grep` are fine once a task names a target.

Ask the user whenever the requirements are unclear

## Verification

All check scripts run from the repo root. After each task run `scripts/chk_py_lint.sh` and fix all findings. If findings: improve `AGENTS.md` to prevent same issue in future.

After a new feature is added run all checks via `scripts/run_checks.sh` and fix all findings. It loops over every `scripts/chk_*.sh` (go + python + web + pre-commit). For a single-language edit the matching subset is `scripts/chk_go_*.sh`, `scripts/chk_py_*.sh`, or `scripts/chk_js_*.sh`. `scripts/chk_pre-commit.sh` sorts the `cspell-words.txt`, so just append missing words and run the script to sort.

## File layout

- `scripts/`: shared check scripts (`run_checks.sh`, `chk_py_*.sh`, `chk_js_*.sh`, `chk_go_*.sh`, `chk_pre-commit.sh`) and generator launchers `gen_opening_moves.sh` -> `sim-opening-moves.md` and `gen_model_ranking.sh` -> `sim-model-ranking.md`
- `python/`, `web/`, and `go/` layouts: see the respective `AGENTS.md`.

## Architecture

- Rules: [rules-this-game.md](rules-this-game.md) is the spec; [rules-online.md](rules-online.md) is the second-hand reference it adapts.
- Simulation-ready: pure functions returning a new `GameState` (`play(state, move) -> GameState`), no mutation.
- Ring indexing: pits 0..5 = Player.A, 6..11 = Player.B; counter-clockwise for both players = `+1 mod 12`.
- Deterministic AI must stay byte-for-byte equivalent across the two engines (python ↔ web). Verify after changing engine code by running matching auto-games through both and diffing final captured totals + move traces.
