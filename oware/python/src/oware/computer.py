"""
Computer opponents — heuristic move selection against a GameState.

Pure functions only: given a GameState, return the Move to play.
Each strategy is split into three helpers:
- ``*_simulate`` — per movable pit, the measures the mode cares about;
- ``*_ranking`` — sort key for those candidates (lower is better);
- ``*_move`` — rank the simulated candidates and return the chosen Move.

``choose_move`` dispatches to the strategy named by the ``ComputerMode``.
"""

from enum import StrEnum, auto
from random import choice
from typing import TYPE_CHECKING

from oware.models import (
    PITS_PER_SIDE,
    GameState,
    GameStatus,
    Move,
    Player,
    play,
)

if TYPE_CHECKING:
    from collections.abc import Callable

_ERR_NO_MOVES = "Player has no seeds to move"
_ERR_UNKNOWN_MODE = "Unknown computer mode"


class ComputerMode(StrEnum):
    """Selectable computer opponent heuristics."""

    RANDOM = auto()
    GREEDY = auto()
    GREEDY_RESPONSE = auto()
    MINIMAX = auto()


def _side_start(player: Player) -> int:
    """Ring index of ``player``'s first pit."""
    return 0 if player is Player.A else PITS_PER_SIDE


def _movable_pits(state: GameState) -> list[int]:
    """Ring indices of the mover's non-empty pits."""
    start = _side_start(state.turn)
    return [
        pit
        for pit in range(start, start + PITS_PER_SIDE)
        if not state.board.is_empty(pit)
    ]


def _best_move[Candidate: tuple[int, ...]](
    candidates: list[Candidate],
    ranking: Callable[[Candidate], tuple[int, ...]],
) -> Move:
    """Return the lowest-ranked candidate's pit; lowest pit breaks ties."""
    if not candidates:
        raise ValueError(_ERR_NO_MOVES)
    return Move(pit=min(candidates, key=ranking)[0])


#
# Greedy — rank movable pits by one-ply capture deltas.
#


def _greedy_simulate(state: GameState) -> list[tuple[int, int, int]]:
    """Capture deltas per movable pit as (pit, own gain, opponent gain)."""
    turn = state.turn
    gains: list[tuple[int, int, int]] = []
    for pit in _movable_pits(state):
        after = play(state, Move(pit=pit))
        own_gain = after.captured_by(turn) - state.captured_by(turn)
        opp_gain = after.captured_by(turn.opponent) - state.captured_by(turn.opponent)
        gains.append((pit, own_gain, opp_gain))
    return gains


def _greedy_ranking(candidate: tuple[int, int, int]) -> tuple[int, int, int]:
    """
    Rank a one-ply gain.

    Own capture desc, then opponent capture asc, then lowest pit; a move
    handing the opponent no capture is preferred when nothing captures.
    """
    pit, own_gain, opp_gain = candidate
    return (-own_gain, opp_gain, pit)


def _greedy_move(state: GameState) -> Move:
    """Pick the pit ranked best for captures."""
    return _best_move(_greedy_simulate(state), _greedy_ranking)


#
# Greedy Response — greedy lookahead that assumes a greedy opponent.
#


def _greedy_response_simulate(state: GameState) -> list[tuple[int, int, int]]:
    """Two-ply capture deltas per movable pit as (pit, own gain, opponent gain)."""
    turn = state.turn
    opp = turn.opponent
    opp_start = _side_start(opp)
    deltas: list[tuple[int, int, int]] = []
    for pit in _movable_pits(state):
        after = play(state, Move(pit=pit))
        if after.status is GameStatus.ONGOING and any(
            not after.board.is_empty(index)
            for index in range(opp_start, opp_start + PITS_PER_SIDE)
        ):
            after = play(after, _greedy_move(after))
        own_delta = after.captured_by(turn) - state.captured_by(turn)
        opp_delta = after.captured_by(opp) - state.captured_by(opp)
        deltas.append((pit, own_delta, opp_delta))
    return deltas


def _greedy_response_ranking(candidate: tuple[int, int, int]) -> tuple[int, int]:
    """Rank a two-ply swing: best net gain, then lowest pit."""
    pit, own_delta, opp_delta = candidate
    return (-(own_delta - opp_delta), pit)


def _greedy_response_move(state: GameState) -> Move:
    """
    Pick the move best after the opponent's greedy response.

    Each candidate is scored by the net capture swing over both plies; a move
    that opens a greedy response bigger than its own capture is rejected in
    favor of one that denies it.
    """
    return _best_move(_greedy_response_simulate(state), _greedy_response_ranking)


#
# Minimax — depth-limited negamax search with a capture-dominant evaluation.
#

_DEPTH = 3  # plies of lookahead
_INF = 1_000_000  # score above/below any reachable position
_CAPTURE_WEIGHT = 100  # one captured seed outweighs all positional terms
_SIDE_WEIGHT = 1  # seeds kept on the own side
_MOBILITY_WEIGHT = 1  # non-empty own pits minus non-empty opponent pits


def _evaluate(state: GameState, player: Player) -> int:
    """Score ``state`` from ``player``'s perspective; higher is better."""
    if state.status is not GameStatus.ONGOING:
        if state.winner is None:
            return 0
        return _INF if state.winner is player else -_INF
    own_start = _side_start(player)
    own = state.board.pits[own_start : own_start + PITS_PER_SIDE]
    opp = (
        state.board.pits[:PITS_PER_SIDE]
        if player is Player.B
        else state.board.pits[PITS_PER_SIDE:]
    )
    captured_diff = state.captured_by(player) - state.captured_by(player.opponent)
    side_diff = sum(own) - sum(opp)
    mobility_diff = sum(s > 0 for s in own) - sum(s > 0 for s in opp)
    return (
        _CAPTURE_WEIGHT * captured_diff
        + _SIDE_WEIGHT * side_diff
        + _MOBILITY_WEIGHT * mobility_diff
    )


def _negamax(state: GameState, depth: int, alpha: int, beta: int) -> int:
    """
    Depth-limited negamax with alpha-beta pruning from the mover's view.

    Returns the value of ``state`` from ``state.turn``'s perspective, so each
    recursion level negates: a child (opponent to move) has value ``-child``.
    A mover with no seeds is a terminal leaf: the auto loop stops there, so
    the search scores the position as-is instead of expanding.
    """
    if depth == 0 or state.status is not GameStatus.ONGOING:
        return _evaluate(state, state.turn)
    best = -_INF
    for pit in _movable_pits(state):
        after = play(state, Move(pit=pit))
        score = -_negamax(after, depth - 1, -beta, -alpha)
        best = max(best, score)
        alpha = max(alpha, best)
        if alpha >= beta:
            break
    return _evaluate(state, state.turn) if best == -_INF else best


def _minimax_simulate(state: GameState) -> list[tuple[int, int]]:
    """Negamax lookahead score per movable pit as (pit, score); higher is better."""
    scores: list[tuple[int, int]] = []
    for pit in _movable_pits(state):
        after = play(state, Move(pit=pit))
        scores.append((pit, -_negamax(after, _DEPTH - 1, -_INF, _INF)))
    return scores


def _minimax_ranking(candidate: tuple[int, int]) -> tuple[int, int]:
    """Rank a candidate: best score, then lowest pit."""
    pit, score = candidate
    return (-score, pit)


def _minimax_move(state: GameState) -> Move:
    """Pick the pit whose negamax lookahead scores best."""
    return _best_move(_minimax_simulate(state), _minimax_ranking)


#
# Random — uniformly pick any movable pit.
#


def _random_move(state: GameState) -> Move:
    """Pick a uniformly random movable pit."""
    pits = _movable_pits(state)
    if not pits:
        raise ValueError(_ERR_NO_MOVES)
    return Move(pit=choice(pits))  # noqa: S311 — game, not crypto


#
# Dispatch
#


def choose_move(state: GameState, mode: ComputerMode) -> Move:
    """Select the computer's move for the given mode."""
    match mode:
        case ComputerMode.GREEDY:
            return _greedy_move(state)
        case ComputerMode.GREEDY_RESPONSE:
            return _greedy_response_move(state)
        case ComputerMode.MINIMAX:
            return _minimax_move(state)
        case ComputerMode.RANDOM:
            return _random_move(state)
        case _:
            raise ValueError(_ERR_UNKNOWN_MODE)
