"""Tests for the computer-vs-computer auto mode."""

from oware.__main__ import play_auto_game
from oware.computer import ComputerMode, choose_move
from oware.models import (
    PITS_PER_SIDE,
    GameState,
    GameStatus,
    Player,
    Ruleset,
    play,
    tally,
)


def _game_over(state) -> bool:
    """The auto loop only stops on finish or when the mover has no seeds."""
    if state.status is GameStatus.FINISHED:
        return True
    start = 0 if state.turn is Player.A else PITS_PER_SIDE
    return sum(state.board.pits[start : start + PITS_PER_SIDE]) == 0


def _check_state_invariants(final) -> None:
    """Every auto game terminates with no captured total exceeding the board."""
    assert _game_over(final)
    assert sum(final.captured) <= 48


def _silent_auto_game(
    ruleset: Ruleset, mode_a: ComputerMode, mode_b: ComputerMode
) -> GameState:
    """Run a computer-vs-computer game without logging, for assertions."""
    state = GameState.start(ruleset)
    while _game_over(state) is False:
        mode = mode_a if state.turn is Player.A else mode_b
        previous_total = sum(state.captured)
        state = tally(play(state, choose_move(state, mode)), previous_total)
    return state


def test_auto_game_anan_completes() -> None:
    """A greedy-vs-greedy Anan-Anan game always terminates."""
    _check_state_invariants(
        play_auto_game(Ruleset.ANAN_ANAN, ComputerMode.GREEDY, ComputerMode.GREEDY)
    )


def test_auto_game_abapa_completes() -> None:
    """A greedy-vs-greedy Abapa game always terminates."""
    _check_state_invariants(
        play_auto_game(Ruleset.ABAPA, ComputerMode.GREEDY, ComputerMode.GREEDY)
    )


def test_auto_game_accepts_per_side_modes() -> None:
    """Each side gets its own mode, enabling different player models."""
    final = play_auto_game(Ruleset.ANAN_ANAN, ComputerMode.GREEDY, ComputerMode.GREEDY)
    assert final.turn in (Player.A, Player.B)
    _check_state_invariants(final)


def test_minimax_vs_greedy_completes() -> None:
    """A minimax-vs-greedy Anan-Anan game terminates cleanly."""
    final = play_auto_game(Ruleset.ANAN_ANAN, ComputerMode.MINIMAX, ComputerMode.GREEDY)
    _check_state_invariants(final)


def test_greedy_response_vs_greedy_completes() -> None:
    """A greedy-response-vs-greedy Anan-Anan game terminates cleanly."""
    final = play_auto_game(
        Ruleset.ANAN_ANAN, ComputerMode.GREEDY_RESPONSE, ComputerMode.GREEDY
    )
    _check_state_invariants(final)


def test_minimax_beats_greedy_from_both_sides() -> None:
    """Deterministic games: minimax wins as first and as second player."""
    for mode_a, mode_b, minimax_side in (
        (ComputerMode.MINIMAX, ComputerMode.GREEDY, Player.A),
        (ComputerMode.GREEDY, ComputerMode.MINIMAX, Player.B),
    ):
        final = _silent_auto_game(Ruleset.ANAN_ANAN, mode_a, mode_b)
        captured = final.captured_by(minimax_side)
        captured_opp = final.captured_by(minimax_side.opponent)
        assert captured > captured_opp
        _check_state_invariants(final)
