// Simulate runs --n Monte Carlo games of Anan-Anan and reports how often the
// --starting player wins. Each side plays its --A/--B computer mode (random or
// greedy), named after python's computer.py modes.
//
// Usage: go run ./simulate [-n N] [-seed S] [-workers W] [-starting A|B]
//
//	[-A=random|greedy] [-B=random|greedy] [-trace] [-openings]
package main

import (
	"flag"
	"fmt"
	"math/rand/v2"
	"os"
	"runtime"
	"strings"
	"sync"
	"sync/atomic"

	"oware/oware"
)

var (
	games       = flag.Int("n", 1_000_000, "number of games to simulate (per opening move with -openings)")
	seed        = flag.Uint64("seed", 0, "random seed (0 = fresh per run)")
	workers     = flag.Int("workers", runtime.GOMAXPROCS(0), "parallel game workers")
	showTrace   = flag.Bool("trace", false, "play one deterministic game (lowest pit) and print moves, captures")
	showOpening = flag.Bool("openings", false, "rank the six first moves by beginning-player win rate over -n rollouts each")
	starting    = flag.String("starting", "A", "beginning player, whose first move opens (A or B)")
	modeA       = flag.String("A", "random", "Player A computer mode; value required (random or greedy)")
	modeB       = flag.String("B", "random", "Player B computer mode; value required (random or greedy)")
)

func main() {
	flag.Parse()
	starter, err := parsePlayer(*starting)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(2)
	}
	greedyA, err := parseMode(*modeA)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(2)
	}
	greedyB, err := parseMode(*modeB)
	if err != nil {
		fmt.Fprintln(os.Stderr, err)
		os.Exit(2)
	}
	if *showTrace {
		traceGame(starter)
		return
	}
	if *showOpening {
		openingRanking(starter, greedyA, greedyB)
		return
	}
	runSim(starter, greedyA, greedyB)
}

func parsePlayer(raw string) (oware.Player, error) {
	switch strings.ToUpper(strings.TrimSpace(raw)) {
	case "A":
		return oware.A, nil
	case "B":
		return oware.B, nil
	}
	return 0, fmt.Errorf("starting player must be A or B, got %q", raw)
}

func parseMode(raw string) (bool, error) {
	switch strings.ToLower(strings.TrimSpace(raw)) {
	case "random":
		return false, nil
	case "greedy":
		return true, nil
	}
	return false, fmt.Errorf("computer mode must be random or greedy, got %q", raw)
}

// modeLabel names a mode for output, matching python's ComputerMode values.
func modeLabel(greedy bool) string {
	if greedy {
		return "greedy"
	}
	return "random"
}

// runSim plays -n games from the --starting player's first move with the two
// chosen side modes and reports the beginning player's win ratio.
func runSim(starter oware.Player, greedyA, greedyB bool) {
	baseSeed := *seed
	if baseSeed == 0 {
		baseSeed = rand.Uint64()
	}
	var winsS, winsO, draws atomic.Uint64
	var wg sync.WaitGroup
	for w := 0; w < *workers; w++ {
		wg.Add(1)
		go func(w int) {
			defer wg.Done()
			r := rand.New(rand.NewPCG(baseSeed, uint64(w+1)))
			start, end := *games*w / *workers, *games*(w+1) / *workers
			for i := start; i < end; i++ {
				state := simGame(r, oware.Start(starter), greedyA, greedyB)
				switch winnerRel(state, starter) {
				case 1:
					winsS.Add(1)
				case -1:
					winsO.Add(1)
				default:
					draws.Add(1)
				}
			}
		}(w)
	}
	wg.Wait()

	total := winsS.Load() + winsO.Load() + draws.Load()
	fmt.Printf("games simulated:      %d\n", total)
	fmt.Printf("sides: A=%s, B=%s\n", modeLabel(greedyA), modeLabel(greedyB))
	fmt.Printf("first player (%s) wins %d (%.2f%%)\n", starter, winsS.Load(), ratio(winsS.Load(), total))
	fmt.Printf("second player (%s) wins %d (%.2f%%)\n", starter.Opponent(), winsO.Load(), ratio(winsO.Load(), total))
	fmt.Printf("draws:                %d (%.2f%%)\n", draws.Load(), ratio(draws.Load(), total))
	fmt.Printf("first-player win ratio: %.6f\n", float64(winsS.Load())/float64(total))
}

func ratio(part, total uint64) float64 {
	return 100 * float64(part) / float64(total)
}

func ruleLine() string {
	return strings.Repeat("-", 52)
}

// winnerRel returns 1 when starter wins, -1 when the opponent wins, 0 for a
// draw, judged by captured seeds.
func winnerRel(state oware.State, starter oware.Player) int {
	s, o := state.CapturedBy(starter), state.CapturedBy(starter.Opponent())
	switch {
	case s > o:
		return 1
	case o > s:
		return -1
	}
	return 0
}

// simGame plays one Anan-Anan game to the end from the given state, each side
// playing its mode (greedy one-ply, or uniform random among non-empty pits).
// The loop mirrors python's play_auto_game: the empty-side rule ends the game
// when the mover has no seeds on their side.
func simGame(r *rand.Rand, state oware.State, greedyA, greedyB bool) oware.State {
	for state.Status == oware.Ongoing {
		if state.SideTotal(state.Turn) == 0 {
			break
		}
		previous := state.Captured[0] + state.Captured[1]
		next, _ := oware.Play(state, pickMove(r, state, greedyA, greedyB))
		state = oware.Tally(next, previous)
	}
	return state
}

// pickMove chooses the mover's play: the greedy one-ply capture move when that
// side is greedy, otherwise a uniformly random movable pit.
func pickMove(r *rand.Rand, state oware.State, greedyA, greedyB bool) int {
	greedy := (state.Turn == oware.A && greedyA) || (state.Turn == oware.B && greedyB)
	if greedy {
		pit, _ := oware.GreedyMove(state)
		return pit
	}
	pits := oware.MovablePits(state)
	return pits[r.IntN(len(pits))]
}

// openingRanking rolls out -n games per first move of the --starting side;
// play after the opening follows the -A/-B modes (default uniform random) and
// reports the beginning player's win rate per opening. UI pit numbers are 1..6,
// matching python/_ui_pit.
func openingRanking(starter oware.Player, greedyA, greedyB bool) {
	baseSeed := *seed
	if baseSeed == 0 {
		baseSeed = rand.Uint64()
	}
	offset := 0
	if starter == oware.B {
		offset = oware.PitsPerSide
	}
	fmt.Println(ruleLine())
	fmt.Printf("opening ranking — %s (beginning player) wins per first move; post-opening play A=%s, B=%s\n",
		starter, modeLabel(greedyA), modeLabel(greedyB))
	fmt.Println(ruleLine())
	best := -1
	bestRate := -1.0
	var totalRate float64
	for opener := 0; opener < oware.PitsPerSide; opener++ {
		first, _ := oware.Play(oware.Start(starter), opener+offset)
		var winsS, winsO, draws atomic.Uint64
		var wg sync.WaitGroup
		for w := 0; w < *workers; w++ {
			wg.Add(1)
			go func(w int) {
				defer wg.Done()
				r := rand.New(rand.NewPCG(baseSeed, uint64(w+1)))
				start, end := *games*w / *workers, *games*(w+1) / *workers
				for i := start; i < end; i++ {
					state := simGame(r, oware.Tally(first, 0), greedyA, greedyB)
					switch winnerRel(state, starter) {
					case 1:
						winsS.Add(1)
					case -1:
						winsO.Add(1)
					default:
						draws.Add(1)
					}
				}
			}(w)
		}
		wg.Wait()
		total := winsS.Load() + winsO.Load() + draws.Load()
		rate := float64(winsS.Load()) / float64(total)
		fmt.Printf("opening pit %d: %s %.2f%% | %s %.2f%% | draw %.2f%%\n",
			opener+1, starter, ratio(winsS.Load(), total), starter.Opponent(), ratio(winsO.Load(), total), ratio(draws.Load(), total))
		totalRate += rate
		if rate > bestRate {
			best, bestRate = opener, rate
		}
	}
	mean := totalRate / float64(oware.PitsPerSide)
	fmt.Println(ruleLine())
	fmt.Printf("best opening: pit %d — %s wins %.2f%% (mean over openings %.2f%%, edge %+.2f pts)\n",
		best+1, starter, 100*bestRate, 100*mean, 100*(bestRate-mean))
	fmt.Printf("tip for the %s starting player: open from pit %d.\n", starter, best+1)
}

// traceGame plays one deterministic game (always the lowest movable pit,
// modes ignored) and prints “moves A_captured B_captured“ — the byte-for-byte
// cross-check target against the Python engine (tmp/parity.py, which runs
// from the default --starting=A).
func traceGame(starter oware.Player) {
	state := oware.Start(starter)
	moves := 0
	for state.Status == oware.Ongoing {
		if state.SideTotal(state.Turn) == 0 {
			break
		}
		pits := oware.MovablePits(state)
		previous := state.Captured[0] + state.Captured[1]
		next, _ := oware.Play(state, pits[0])
		state = oware.Tally(next, previous)
		moves++
	}
	fmt.Printf("%d %d %d\n", moves, state.Captured[0], state.Captured[1])
}
