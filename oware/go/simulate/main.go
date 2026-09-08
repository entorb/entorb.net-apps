// Simulate runs --n Monte Carlo games of Anan-Anan and reports how often the
// --starting player wins. Each side plays its --A/--B computer mode (random or
// greedy), named after python's computer.py modes.
//
// Usage: go run ./simulate [-n N] [-seed S] [-workers W] [-starting A|B]
//
//	[-A=random|greedy] [-B=random|greedy] [-trace] [-openings] [-openings-md]
package main

import (
	"flag"
	"fmt"
	"math/rand/v2"
	"os"
	"path/filepath"
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
	openingsMD  = flag.Bool("openings-md", false, "with -openings, merge this run's ranking into ../sim-opening-moves.md")
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
	if *openingsMD && !*showOpening {
		fmt.Fprintln(os.Stderr, "-openings-md requires -openings")
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

// openingRow is one opening pit's rollout tally.
type openingRow struct {
	pit   int
	winsS uint64
	winsO uint64
	draws uint64
	total uint64
}

// opponentModes is the fixed section order of sim-opening-moves.md.
var opponentModes = []string{"greedy", "random"}

const openingMDName = "sim-opening-moves.md"

// openingRanking rolls out -n games per first move of the --starting side;
// play after the opening follows the -A/-B modes (default uniform random) and
// reports the beginning player's win rate per opening. UI pit numbers are 1..6,
// matching python/_ui_pit. With -openings-md the run is also merged into
// ../sim-opening-moves.md under its own "### Versus <B mode> opponent" section.
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
	rows := make([]openingRow, 0, oware.PitsPerSide)
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
		rows = append(rows, openingRow{pit: opener + 1, winsS: winsS.Load(), winsO: winsO.Load(), draws: draws.Load(), total: total})
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
	if *openingsMD {
		mode := modeLabel(greedyB)
		if err := writeOpeningMD(mode, openingSection(starter, mode, rows, best, bestRate, mean)); err != nil {
			fmt.Fprintf(os.Stderr, "writing %s: %v\n", openingMDName, err)
			os.Exit(1)
		}
		fmt.Printf("merged this run into ../%s\n", openingMDName)
	}
}

// openingSection renders this run's ranking as one markdown section body.
func openingSection(starter oware.Player, mode string, rows []openingRow, bestPit int, bestRate, mean float64) string {
	var b strings.Builder
	fmt.Fprintf(&b, "Post-opening play A=random, B=%s.\n\n", mode)
	fmt.Fprintf(&b, "| Pit | %s wins | %s wins | Draw |\n", starter, starter.Opponent())
	b.WriteString("|---|---|---|---|\n")
	for _, row := range rows {
		fmt.Fprintf(&b, "| %d | %.2f%% | %.2f%% | %.2f%% |\n",
			row.pit, ratio(row.winsS, row.total), ratio(row.winsO, row.total), ratio(row.draws, row.total))
	}
	fmt.Fprintf(&b, "\nBest opening: pit %d \u2014 %s wins %.2f%% (mean over openings %.2f%%, edge %+.2f pts).\n",
		bestPit+1, starter, 100*bestRate, 100*mean, 100*(bestRate-mean))
	return b.String()
}

// parseOpeningFile extracts each "### Versus <mode> opponent" section body,
// keyed by opponent mode, from an existing sim-opening-moves.md.
func parseOpeningFile(content string) map[string]string {
	sections := make(map[string]string)
	var mode string
	var body strings.Builder
	flush := func() {
		if mode != "" {
			sections[mode] = strings.TrimSpace(body.String())
		}
		mode = ""
		body.Reset()
	}
	for _, raw := range strings.Split(content, "\n") {
		line := strings.TrimRight(raw, "\r")
		if strings.HasPrefix(line, "### ") {
			flush()
			fields := strings.Fields(line)
			if len(fields) >= 3 && fields[1] == "versus" {
				mode = fields[2]
			}
			continue
		}
		if mode != "" {
			body.WriteString(line)
			body.WriteString("\n")
		}
	}
	flush()
	return sections
}

// composeOpeningMD assembles the full report from the per-mode sections,
// always in the fixed opponentModes order.
func composeOpeningMD(sections map[string]string) string {
	var b strings.Builder
	b.WriteString("# Simulation of opening moves\n\n")
	fmt.Fprintf(&b, "%s rollouts per opening move (seed %d).\n\n", grouped(*games), *seed)
	b.WriteString("## Anan-Anan\n\n")
	for _, mode := range opponentModes {
		body, ok := sections[mode]
		if !ok {
			continue
		}
		fmt.Fprintf(&b, "### Versus %s opponent\n\n", mode)
		b.WriteString(strings.TrimSpace(body))
		b.WriteString("\n\n")
	}
	return b.String()
}

// grouped inserts thousands separators into a non-negative integer.
func grouped(n int) string {
	s := fmt.Sprint(n)
	if n < 1000 {
		return s
	}
	return grouped(n/1000) + "," + fmt.Sprintf("%03d", n%1000)
}

// writeOpeningMD replaces this run's section in ../sim-opening-moves.md, keeping
// the other opponent mode's section and regenerating the preamble.
func writeOpeningMD(mode, section string) error {
	path := filepath.Join("..", openingMDName)
	sections := make(map[string]string)
	content, err := os.ReadFile(path)
	switch {
	case err == nil:
		sections = parseOpeningFile(string(content))
	case !os.IsNotExist(err):
		return err
	}
	sections[mode] = section
	return os.WriteFile(path, []byte(composeOpeningMD(sections)), 0o644)
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
