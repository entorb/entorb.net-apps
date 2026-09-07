// Package oware is a faithful Go port of the Anan-Anan ruleset of the
// Python model (python/src/oware/models.py). Pure functions: Play and Tally
// return a new State; nothing is mutated in place.
//
// Ring indexing: pits 0..5 belong to Player A, 6..11 to Player B;
// counter-clockwise sowing is +1 mod 12 for both players.
package oware

import "errors"

const (
	BoardLength int = 12
	PitsPerSide int = 6
	SeedsPerPit int = 4
	SeedsTotal  int = 48
	// CaptureLimit: capturing more than this many seeds wins the game.
	CaptureLimit int = 24
	// CaptureCount: under Anan-Anan a pit reaching this many seeds is captured.
	CaptureCount int = 4
	// RelayFloor: a last pit holding at least this many seeds continues the relay.
	RelayFloor int = 2
	// EndgameLimit: below this many seeds the last capturer takes the board.
	EndgameLimit int = 8
	// StallLimit: this many moves without a capture ends the game (addon).
	StallLimit int = 6
)

// Player is the owning side; A owns pits 0..5, B owns 6..11.
type Player uint8

const (
	A Player = iota + 1
	B
)

// Opponent returns the other player.
func (p Player) Opponent() Player {
	if p == A {
		return B
	}
	return A
}

// String returns the player's one-letter label for output.
func (p Player) String() string {
	if p == A {
		return "A"
	}
	return "B"
}

// Status is the lifecycle status of a game.
type Status uint8

const (
	Ongoing Status = iota + 1
	Finished
)

// Board is the 12 pits in ring order (counter-clockwise = +1 mod 12).
type Board [BoardLength]int

// State is an immutable snapshot of a game.
type State struct {
	Board               Board
	Turn                Player
	Captured            [2]int // Captured[0]=A, Captured[1]=B
	Status              Status
	Winner              Player // 0 = draw or ongoing
	MovesWithoutCapture int
}

// Start builds a fresh game: 4 seeds per pit, with first to move (mirrors
// python's GameState.start(ruleset, first=Player.A)).
func Start(first Player) State {
	return State{
		Board:  Board{SeedsPerPit, SeedsPerPit, SeedsPerPit, SeedsPerPit, SeedsPerPit, SeedsPerPit, SeedsPerPit, SeedsPerPit, SeedsPerPit, SeedsPerPit, SeedsPerPit, SeedsPerPit},
		Turn:   first,
		Status: Ongoing,
	}
}

// CapturedBy returns the seeds captured by player p.
func (s State) CapturedBy(p Player) int {
	return s.Captured[playerIndex(p)]
}

// SideTotal returns the total seeds in player p's own pits.
func (s State) SideTotal(p Player) int {
	start := pitRangeOffset(p)
	total := 0
	for i := start; i < start+PitsPerSide; i++ {
		total += s.Board[i]
	}
	return total
}

func playerIndex(p Player) int {
	if p == A {
		return 0
	}
	return 1
}

func pitRangeOffset(p Player) int {
	if p == A {
		return 0
	}
	return PitsPerSide
}

func ownerOf(index int) Player {
	if index < PitsPerSide {
		return A
	}
	return B
}

// MovablePits returns the mover's non-empty pit indices in ascending ring
// order; the list is never empty when SideTotal(Turn) > 0.
func MovablePits(state State) []int {
	start := pitRangeOffset(state.Turn)
	pits := make([]int, 0, PitsPerSide)
	for i := start; i < start+PitsPerSide; i++ {
		if state.Board[i] > 0 {
			pits = append(pits, i)
		}
	}
	return pits
}

// Play applies move (pit) to state per the Anan-Anan rules and returns the
// resulting state. The relay, capture-at-4, endgame sweep, and infinite-relay
// cut-off mirror models.py; the moves-without-capture counter is reset here
// and recomputed by Tally.
func Play(state State, pit int) (State, error) {
	if state.Status != Ongoing {
		return state, errors.New("game is already finished")
	}
	if ownerOf(pit) != state.Turn {
		return state, errors.New("pit is not owned by the player to move")
	}
	if state.Board[pit] == 0 {
		return state, errors.New("pit is empty")
	}

	var pits Board = state.Board
	captured := state.Captured
	var lastCapturer Player

	held := pits[pit]
	pits[pit] = 0
	index := pit
	seen := make(map[[BoardLength]int]int)
	for {
		relayKey := pits
		if prev, ok := seen[relayKey]; ok && prev == index {
			status, winner := finishInfinite(&captured)
			return result(state, pits, captured, status, winner), nil
		}
		seen[relayKey] = index
		var turnCaptured Player
		index, turnCaptured = sow(&pits, index, held, state.Turn, &captured)
		if turnCaptured != 0 {
			lastCapturer = turnCaptured
		}
		if pits[index] < RelayFloor {
			break
		}
		held = pits[index]
		pits[index] = 0
	}

	status, winner := finish(&pits, &captured, lastCapturer)
	return result(state, pits, captured, status, winner), nil
}

// sow drops count seeds counter-clockwise from start, skipping it, and returns
// the last pit reached plus the player of the most recent capture (0 if none).
// Under Anan-Anan a pit reaching four seeds is captured by its owner, or by the
// player to move on the final seed.
func sow(pits *Board, start, count int, turn Player, captured *[2]int) (int, Player) {
	index := start
	var lastCapturer Player
	for count > 0 {
		index = (index + 1) % BoardLength
		if index == start {
			continue
		}
		pits[index]++
		count--
		if pits[index] == CaptureCount {
			capturer := ownerOf(index)
			if count == 0 {
				capturer = turn
			}
			captured[playerIndex(capturer)] += CaptureCount
			pits[index] = 0
			lastCapturer = capturer
		}
	}
	return index, lastCapturer
}

// finish finalizes status and winner on a capture lead, or once few seeds
// remain: the endgame sweep hands the last capturer every seed left on the
// board and empties those pits; a capture-lead win leaves unclaimed seeds in
// place.
func finish(pits *Board, captured *[2]int, lastCapturer Player) (Status, Player) {
	for _, player := range []Player{A, B} {
		if captured[playerIndex(player)] > CaptureLimit {
			return Finished, player
		}
	}
	boardTotal := 0
	for _, seeds := range pits {
		boardTotal += seeds
	}
	if boardTotal <= EndgameLimit {
		if lastCapturer != 0 {
			captured[playerIndex(lastCapturer)] += boardTotal
			for i := range pits {
				pits[i] = 0
			}
		}
		a, b := captured[0], captured[1]
		if a > b {
			return Finished, A
		}
		if b > a {
			return Finished, B
		}
		return Finished, 0
	}
	return Ongoing, 0
}

// finishInfinite ends a non-terminating relay; the player holding the most
// captured seeds wins.
func finishInfinite(captured *[2]int) (Status, Player) {
	a, b := captured[0], captured[1]
	if a > b {
		return Finished, A
	}
	if b > a {
		return Finished, B
	}
	return Finished, 0
}

// Tally advances the moves-without-capture counter and ends the game on a
// stall. The counter resets to zero when a capture happened this move; a
// player with more captured seeds wins once it reaches StallLimit. Previous is
// the sum of captured seeds before the move was played.
func Tally(state State, previous int) State {
	if state.Captured[0]+state.Captured[1] > previous {
		state.MovesWithoutCapture = 0
	} else {
		state.MovesWithoutCapture++
	}
	if state.MovesWithoutCapture >= StallLimit {
		a, b := state.Captured[0], state.Captured[1]
		var winner Player
		if a > b {
			winner = A
		} else if b > a {
			winner = B
		}
		state.Status = Finished
		state.Winner = winner
	}
	return state
}

// result builds the next state: new board, flipped turn, updated captures.
func result(state State, pits Board, captured [2]int, status Status, winner Player) State {
	state.Board = pits
	state.Turn = state.Turn.Opponent()
	state.Captured = captured
	state.Status = status
	state.Winner = winner
	state.MovesWithoutCapture = 0
	return state
}
