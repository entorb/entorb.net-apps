# Go Implementation

Go 1.25+, stdlib only (no external deps).

## Layout

- `go/go.mod` — module `oware`
  - `go/oware/oware.go` — package `oware`: faithful Go port of the Anan-Anan path of `python/src/oware/models.py`
  - `go/oware/computer.go` — full Go port of python's greedy mode (`GreedyMove`)
  - `go/simulate/main.go` — Monte Carlo simulator

## Architecture

- `oware.go`: pure functions. `Start(first Player)` (mirrors python `GameState.start`), `Play(state, pit) (State, error)`, `Tally(state, previous) State`, `MovablePits(state)`, and player `String()`; nothing mutates the input. Ring indexing, relay, capture-at-4, endgame sweep, infinite-relay cut-off, and the stall addon mirror the Python model.
- `computer.go`: `GreedyMove(state) (int, error)` — one-ply capture move: own capture desc, opponent capture asc, lowest pit. Matches python's greedy (confirmed byte-for-byte on a greedy-vs-greedy game).
- `main.go`: simulates `-n` games of Anan-Anan, parallelized over `-workers` (each worker its own `math/rand/v2` source). `--starting=A|B` (default A) chooses who moves first, mirroring python's `GameState.start(first=...)`; `-A`/`-B` pick each side's computer mode (`random`, `greedy` — python's mode names, a MODE value is required) and default to random. Reports the beginning player's wins, opponent wins, draws, and win ratio. `-seed` makes a run reproducible; `-trace` plays one deterministic lowest-pit game and prints `moves A B` (modes ignored); `-openings` runs `-n` rollouts per first move of the starting side (post-opening play follows the `-A`/`-B` modes, both random by default) and ranks the six opening pits by win rate (a playing-tip generator, not a strong-player analysis).

Run from `go/`:

```sh
go run ./simulate                       # 1,000,000 games, both sides random
go run ./simulate -n 100000000 -seed 42 # reproducible run
go run ./simulate -A=greedy             # Player A greedy vs random B
go run ./simulate -starting=B -B=greedy # B opens, B greedy, A random
go run ./simulate -openings             # rank the six first moves by win rate
go run ./simulate -openings -B=greedy   # best opening vs a greedy opponent
```

Parity against the Python engine: `go run ./simulate -trace` must equal
`PYTHONPATH=python/src uv run --project python python tmp/parity.py`
(byte-for-byte `moves A B`).

## Checks

Run from the repo root:

- `scripts/chk_go_vet.sh` — gofmt, go vet, go build
- `scripts/chk_go_lint.sh` — staticcheck (`go run honnef.co/go/tools/cmd/staticcheck@latest`)
- `scripts/chk_go_dead.sh` — unreachable function check (`go run golang.org/x/tools/cmd/deadcode@latest`)

All picked up by `scripts/run_checks.sh`.
