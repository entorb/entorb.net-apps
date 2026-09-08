# Oware game

Rule sets:

1. Anan-Anan
2. Abapa

This repository has three independent implementations of the same rules:

- [`python/`](python/) — terminal CLI (Python 3.14, stdlib only)
- [`web/`](web/) — no-backend web app (TypeScript + Vite, plays in the browser)
- [`go/`](go/) — Anan-Anan Monte Carlo simulator with greedy play (Go, stdlib only)

Both follow the shared spec in [rules-this-game.md](rules-this-game.md); [rules-online.md](rules-online.md) is the source those rules adapt.

## Computer payer modes

The python CLI and web app share four computer opponents (all but Random are
deterministic); the go simulator has Greedy and Random so far:

- **Random** — uniformly picks any movable pit.
- **Greedy** — one-ply lookahead: ranks each movable pit by its capture delta. Prefers a move that captures the most seeds, then one that hands the opponent the fewest captures; lowest pit breaks ties.
- **Greedy Response** — two-ply lookahead: assumes the opponent answers with Greedy. Ranks moves by the net capture swing over both plies, so a move whose own capture is nullified by a stronger greedy response loses to one that denies it.
- **Minimax** — three-ply negamax search with alpha-beta pruning over an evaluation that weights captured seeds highest, then seeds kept on the own side, then mobility (non-empty own pits minus non-empty opponent pits).

Computer model ranking: `scripts/gen_model_ranking.sh` regenerates [`sim-model-ranking.md`](sim-model-ranking.md) from deterministic round-robin games (RANDOM excluded).

## Python CLI

Run from the repo root (or `cd python` and drop `--project python`):

```sh
# human vs human, Anan-Anan (default)
uv run --project python oware

# human vs human, Abapa rule set
uv run --project python oware --rules=abapa

# play against computer (Player A or B; -A/-B require a mode)
uv run --project python oware -B=random
uv run --project python oware -B=greedy
uv run --project python oware -B=greedy_response
uv run --project python oware -B=minimax
uv run --project python oware -A=greedy

# automated computer vs computer (both side flags set = auto game)
uv run --project python oware -A=greedy -B=random
```

## Web app

A static single-page app. No backend, no build-time server — `pnpm build` emits plain static files hosted at [entorb.net/oware/](https://entorb.net/oware/).

```sh
cd web
pnpm install
pnpm dev       # local dev server
pnpm build     # static output in web/dist/
```

Features:

- All three game modes: human vs human, human vs computer, computer vs computer
- All four AI difficulties: Random, Greedy, Greedy Response, Minimax

## Go simulator

Monte Carlo Anan-Anan games; reports the total game count and the beginning
player's win ratio. Each side is a computer (`-A`/`-B`), playing random or
greedy; `--starting` picks who moves first; `-openings` ranks the six first
moves as a playing tip. Run from `go/`:

```sh
go run ./simulate                         # 1,000,000 games
go run ./simulate -n 100000000 -seed 4242 # reproducible
go run ./simulate -A=greedy -B=random     # symmetric modes
go run ./simulate -starting=B -B=greedy # B opens, B greedy
go run ./simulate -openings               # best opening-move tip
go run ./simulate -openings -B=greedy     # best opening vs a greedy opponent
go run ./simulate -openings -B=greedy -openings-md  # merge ranking into ../sim-opening-moves.md
```

`scripts/gen_opening_moves.sh` regenerates [`sim-opening-moves.md`](sim-opening-moves.md) (root level,
rendered by the web app) from the greedy and random opponent rankings.
