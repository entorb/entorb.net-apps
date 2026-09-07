package oware

import "errors"

// GreedyMove picks the mover's one-ply capture move: maximize the mover's own
// capture gain, then minimize the opponent's, then the lowest pit. Faithful
// port of python's greedy mode (computer.py _greedy_simulate/_greedy_ranking).
func GreedyMove(state State) (int, error) {
	best, bestOwn, bestOpp := -1, 0, 0
	for _, pit := range MovablePits(state) {
		after, err := Play(state, pit)
		if err != nil {
			continue
		}
		own, opp := deltas(state, after)
		better := best == -1 || own > bestOwn || (own == bestOwn && opp < bestOpp)
		if better {
			best, bestOwn, bestOpp = pit, own, opp
		}
	}
	if best == -1 {
		return 0, errors.New("player has no seeds to move")
	}
	return best, nil
}

// deltas returns the mover's and the opponent's capture gain from moving.
func deltas(before, after State) (own, opp int) {
	turn := playerIndex(before.Turn)
	opponent := playerIndex(before.Turn.Opponent())
	return after.Captured[turn] - before.Captured[turn],
		after.Captured[opponent] - before.Captured[opponent]
}
