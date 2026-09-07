"""Tests for the Oware value objects and validation."""

import pytest

from oware.models import (
    BOARD_LENGTH,
    SEEDS_PER_PIT,
    Board,
    GameState,
    GameStatus,
    Move,
    Player,
    Ruleset,
)


def test_board_initial_holds_four_seeds_per_pit() -> None:
    """The starting board distributes all seeds equally."""
    assert Board.initial().pits == (SEEDS_PER_PIT,) * BOARD_LENGTH


def test_board_rejects_wrong_length() -> None:
    """A board must have exactly twelve pits."""
    with pytest.raises(ValueError, match="12 pits"):
        Board(pits=(1, 2, 3))


def test_board_rejects_negative_seeds() -> None:
    """Seed counts must not be negative."""
    with pytest.raises(ValueError, match="non-negative"):
        Board(pits=(-1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0))


def test_board_rejects_too_many_seeds() -> None:
    """The board cannot hold more than the forty-eight seeds in play."""
    with pytest.raises(ValueError, match="cannot exceed 48"):
        Board(pits=(49, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0))


def test_owner_of_splits_sides() -> None:
    """Player A owns pits 0..5 and Player B pits 6..11."""
    board = Board.initial()
    assert board.owner_of(0) is Player.A
    assert board.owner_of(5) is Player.A
    assert board.owner_of(6) is Player.B
    assert board.owner_of(11) is Player.B


def test_is_empty() -> None:
    """An empty pit reports as such."""
    board = Board(pits=(0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0))
    assert board.is_empty(0)
    assert not board.is_empty(1)


@pytest.mark.parametrize("pit", [BOARD_LENGTH, -1])
def test_move_rejects_out_of_range_pit(pit: int) -> None:
    """A move must reference a pit on the board."""
    with pytest.raises(ValueError, match=r"0\.\.11"):
        Move(pit=pit)


def test_player_opponent() -> None:
    """Each player's opponent is the other."""
    assert Player.A.opponent is Player.B
    assert Player.B.opponent is Player.A


def test_game_state_start() -> None:
    """A fresh game has the initial board, Player A to move, no captures."""
    state = GameState.start(Ruleset.ANAN_ANAN)
    assert state.board.pits == (SEEDS_PER_PIT,) * BOARD_LENGTH
    assert state.turn is Player.A
    assert state.captured == (0, 0)
    assert state.status is GameStatus.ONGOING
    assert state.winner is None


def test_game_state_start_first_player() -> None:
    """``start`` honours a custom first player."""
    state = GameState.start(Ruleset.ANAN_ANAN, first=Player.B)
    assert state.turn is Player.B
