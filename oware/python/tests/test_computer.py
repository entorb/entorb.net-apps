"""Tests for the greedy, greedy-response, minimax, and random opponents."""

import pytest

from oware.computer import ComputerMode, choose_move
from oware.models import Board, GameState, Move, Player, Ruleset


def _state(pits: tuple[int, ...], turn: Player = Player.A) -> GameState:
    """Build a game state with the given pit counts."""
    return GameState(board=Board(pits=pits), turn=turn, ruleset=Ruleset.ANAN_ANAN)


def test_lowest_pit_among_equal_captures() -> None:
    """When several pits capture equally, the lowest pit is chosen."""
    move = choose_move(
        _state((1, 3, 0, 1, 3, 0, 0, 0, 0, 0, 0, 0)), ComputerMode.GREEDY
    )
    assert move == Move(pit=0)


def test_prefers_move_without_opponent_capture() -> None:
    """A capture-free-for-opponent move beats an equal capture handing one over."""
    move = choose_move(
        _state((1, 3, 0, 5, 3, 0, 3, 0, 0, 0, 0, 0)), ComputerMode.GREEDY
    )
    assert move == Move(pit=0)


def test_fallback_to_lowest_pit_without_capture() -> None:
    """With no capture available, the lowest pit is chosen."""
    move = choose_move(
        _state((1, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0)), ComputerMode.GREEDY
    )
    assert move == Move(pit=0)


def test_greedy_string_matches_enum() -> None:
    """The greedy mode and its lowercase string resolve identically."""
    state = _state((1, 3, 0, 1, 3, 0, 0, 0, 0, 0, 0, 0))
    assert choose_move(state, ComputerMode.GREEDY) == choose_move(
        state, ComputerMode("greedy")
    )


def test_greedy_response_avoids_handing_capture_to_opponent() -> None:
    """Response mode skips a capture that lets the opponent capture more."""
    state = _state((0, 0, 0, 0, 4, 3, 4, 3, 0, 0, 0, 0))
    assert choose_move(state, ComputerMode.GREEDY) == Move(pit=4)
    assert choose_move(state, ComputerMode.GREEDY_RESPONSE) == Move(pit=5)


def test_greedy_response_rejects_empty_own_side() -> None:
    """Response mode refuses to move with no seeds on the mover's side."""
    state = _state((0, 0, 0, 0, 0, 0, 4, 4, 4, 4, 4, 4))
    with pytest.raises(ValueError, match="no seeds"):
        choose_move(state, ComputerMode.GREEDY_RESPONSE)


def test_greedy_response_accepts_lowercase_mode_string() -> None:
    """The CLI maps mode strings onto the greedy response strategy."""
    state = _state((0, 0, 0, 0, 4, 3, 4, 3, 0, 0, 0, 0))
    move = choose_move(state, ComputerMode("greedy_response"))
    assert move == Move(pit=5)


def test_rejects_empty_own_side() -> None:
    """Choosing a move with no seeds on the mover's side raises."""
    state = _state((0, 0, 0, 0, 0, 0, 4, 4, 4, 4, 4, 4))
    with pytest.raises(ValueError, match="no seeds"):
        choose_move(state, ComputerMode.GREEDY)


def test_minimax_takes_available_capture() -> None:
    """Minimax grabs the immediate winning capture when offered."""
    state = _state((0, 1, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0))
    move = choose_move(state, ComputerMode.MINIMAX)
    assert move == Move(pit=1)


def test_minimax_fallback_to_lowest_pit() -> None:
    """With no capture available, minimax settles on the lowest pit."""
    state = _state((1, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0))
    move = choose_move(state, ComputerMode.MINIMAX)
    assert move == Move(pit=0)


def test_minimax_rejects_empty_own_side() -> None:
    """Minimax also refuses to move with no seeds on the mover's side."""
    state = _state((0, 0, 0, 0, 0, 0, 4, 4, 4, 4, 4, 4))
    with pytest.raises(ValueError, match="no seeds"):
        choose_move(state, ComputerMode.MINIMAX)


def test_minimax_accepts_lowercase_mode_string() -> None:
    """The CLI maps mode strings onto the minimax strategy."""
    state = _state((0, 1, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0))
    move = choose_move(state, ComputerMode("minimax"))
    assert move == Move(pit=1)


def test_random_uses_choice(monkeypatch) -> None:
    """Random mode delegates pit selection to ``random.choice``."""
    state = _state((1, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0))
    monkeypatch.setattr("oware.computer.choice", lambda pits: pits[-1])
    assert choose_move(state, ComputerMode.RANDOM) == Move(pit=2)


def test_random_accepts_lowercase_mode_string(monkeypatch) -> None:
    """The CLI maps mode strings onto the random strategy."""
    state = _state((0, 1, 3, 0, 0, 0, 0, 0, 0, 0, 0, 0))
    monkeypatch.setattr("oware.computer.choice", lambda pits: pits[0])
    assert choose_move(state, ComputerMode("random")) == Move(pit=1)


def test_random_rejects_empty_own_side() -> None:
    """Random mode also refuses to move with no seeds on the mover's side."""
    state = _state((0, 0, 0, 0, 0, 0, 4, 4, 4, 4, 4, 4))
    with pytest.raises(ValueError, match="no seeds"):
        choose_move(state, ComputerMode.RANDOM)
