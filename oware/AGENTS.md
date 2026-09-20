# Oware Game Simulator

Three independent implementations of the same rules:

- `python/` — Python 3.14 + uv, no runtime deps (stdlib only), src layout, hatchling backend. Terminal CLI.
- `web/` — no-backend web app. TypeScript + Vite, plays in the browser. Static output.
- `go/` — Go, stdlib only. Anan-Anan Monte Carlo simulator (game count + first-player win ratio).

Per-language detail lives in `python/AGENTS.md`, `web/AGENTS.md`, and `go/AGENTS.md` — read the relevant one before editing that tree.

Do not scan the repo at the start of a new session — wait for an explicit task instead. In particular, run no directory listings (`ls`, the directory `Read`) and no global `Glob`/`Grep` passes before a task is given; they only burn tokens. `Glob`/`Grep` are fine once a task names a target.

Ask the user whenever the requirements are unclear

## File layout

- `scripts/`: oware specific scripts (`chk_py_*.sh`, `chk_go_*.sh`, `update.sh` for the python and go deps) and generator launchers `gen_opening_moves.sh` -> `sim-opening-moves.md` and `gen_model_ranking.sh` -> `sim-model-ranking.md`
- `python/`, `web/`, and `go/` layouts: see the respective `AGENTS.md`.

## Architecture

- Rules: [rules-this-game.md](rules-this-game.md) is the spec; [rules-online.md](rules-online.md) is the second-hand reference it adapts.
- Simulation-ready: pure functions returning a new `GameState` (`play(state, move) -> GameState`), no mutation.
- Ring indexing: pits 0..5 = Player.A, 6..11 = Player.B; counter-clockwise for both players = `+1 mod 12`.
- Deterministic AI must stay byte-for-byte equivalent across the two engines (python ↔ web). Verify after changing engine code by running matching auto-games through both and diffing final captured totals + move traces.
