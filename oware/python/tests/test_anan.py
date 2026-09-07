"""Tests for the Anan-Anan rules engine."""

import pytest

from oware.models import (
    Board,
    GameState,
    GameStatus,
    Move,
    Player,
    Ruleset,
    play,
    tally,
)


def _state(
    pits: tuple[int, ...],
    turn: Player = Player.A,
    captured: tuple[int, int] = (0, 0),
) -> GameState:
    """Build a game state with the given pit counts."""
    return GameState(
        board=Board(pits=pits),
        turn=turn,
        ruleset=Ruleset.ANAN_ANAN,
        captured=captured,
    )


def test_initial_move_sows_and_switches_turn() -> None:
    """Lifting a starting pit relays across the board and passes the turn."""
    state = GameState.start(Ruleset.ANAN_ANAN)
    nxt = play(state, Move(pit=0))
    assert nxt.board.pits == (2, 7, 1, 6, 1, 6, 6, 6, 0, 1, 6, 6)
    assert nxt.turn is Player.B
    assert nxt.captured == (0, 0)


def test_cannot_sow_opponent_pit() -> None:
    """Moving from a pit the player does not own is rejected."""
    state = GameState.start(Ruleset.ANAN_ANAN)
    move = Move(pit=6)
    with pytest.raises(ValueError, match="not owned"):
        play(state, move)


def test_cannot_sow_empty_pit() -> None:
    """Moving from an empty pit is rejected."""
    state = _state((0, 0, 0, 0, 0, 0, 4, 4, 4, 4, 4, 4))
    move = Move(pit=0)
    with pytest.raises(ValueError, match="empty"):
        play(state, move)


def test_cannot_play_when_finished() -> None:
    """Moves on a finished game are rejected."""
    finished = play(_state((4, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0)), Move(pit=0))
    move = Move(pit=1)
    with pytest.raises(ValueError, match="already finished"):
        play(finished, move)


def test_last_seed_capture_goes_to_turn_player() -> None:
    """The final seed making a four is captured by the player to move."""
    nxt = play(_state((4, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0)), Move(pit=0))
    assert nxt.captured == (7, 0)
    assert nxt.board.pits == (0,) * 12
    assert nxt.status is GameStatus.FINISHED
    assert nxt.winner is Player.A


def test_mid_move_capture_goes_to_pit_owner() -> None:
    """A pit reaching four mid-move is captured by its owner, even off-turn."""
    nxt = play(_state((7, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 10)), Move(pit=0))
    assert nxt.captured == (0, 4)
    assert nxt.status is GameStatus.ONGOING
    assert nxt.turn is Player.B


def test_relay_continues_after_non_empty_last_pit() -> None:
    """A last seed landing in a non-empty pit keeps the relay going."""
    nxt = play(_state((2, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 10)), Move(pit=0))
    assert nxt.board.pits == (0, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 10)
    assert nxt.captured == (0, 0)
    assert nxt.turn is Player.B


def test_game_ends_when_capture_exceeds_twenty_four() -> None:
    """A player past twenty-four captured seeds wins, even with seeds on the board."""
    nxt = play(
        _state((4, 2, 2, 2, 3, 2, 2, 2, 2, 2, 2, 1), captured=(22, 0)),
        Move(pit=0),
    )
    assert nxt.captured == (26, 0)
    assert nxt.status is GameStatus.FINISHED
    assert nxt.winner is Player.A


def test_infinite_relay_ends_in_draw() -> None:
    """A relay that never terminates ends the game with the capture leader winning."""
    nxt = play(_state((1, 0, 1, 2, 0, 1, 0, 2, 1, 0, 1, 0)), Move(pit=3))
    assert nxt.status is GameStatus.FINISHED
    assert nxt.winner is None


def test_six_moves_without_capture_end_the_game() -> None:
    """A captureless streak of six moves finishes the game by captured totals."""
    state = _state((0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1), captured=(7, 3), turn=Player.A)
    previous_total = sum(state.captured)
    for expected in range(1, 6):
        state = tally(state, previous_total)
        assert state.status is GameStatus.ONGOING, f"ended early at {expected} moves"
        assert state.moves_without_capture == expected
        assert previous_total == sum(state.captured)
    state = tally(state, previous_total)
    assert state.status is GameStatus.FINISHED
    assert state.winner is Player.A
    assert state.moves_without_capture == 6


def test_capture_resets_the_stall_counter() -> None:
    """A capture any moves along resets the count of captureless moves."""
    state = GameState(
        board=Board(pits=(0,) * 12),
        turn=Player.A,
        ruleset=Ruleset.ANAN_ANAN,
        captured=(7, 4),
        moves_without_capture=3,
    )
    after = tally(state, previous_total=9)
    assert after.moves_without_capture == 0
