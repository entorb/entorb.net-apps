"""Tests for the Abapa rules engine."""

from oware.models import Board, GameState, GameStatus, Move, Player, Ruleset, play


def _state(
    pits: tuple[int, ...],
    turn: Player = Player.A,
    captured: tuple[int, int] = (0, 0),
) -> GameState:
    """Build an Abapa game state with the given pit counts."""
    return GameState(
        board=Board(pits=pits),
        turn=turn,
        ruleset=Ruleset.ABAPA,
        captured=captured,
    )


def test_initial_move_sows_single_pass() -> None:
    """Lifting a starting pit sows once with no relay and passes the turn."""
    nxt = play(GameState.start(Ruleset.ABAPA), Move(pit=0))
    assert nxt.board.pits == (0, 5, 5, 5, 5, 4, 4, 4, 4, 4, 4, 4)
    assert nxt.turn is Player.B
    assert nxt.captured == (0, 0)
    assert nxt.status is GameStatus.ONGOING


def test_no_relay_from_non_empty_landing_pit() -> None:
    """Abapa never lifts again, even when the last seed lands in a non-empty pit."""
    nxt = play(_state((3, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0)), Move(pit=0))
    assert nxt.board.pits == (0, 1, 1, 3, 0, 0, 0, 0, 0, 0, 0, 0)
    assert nxt.captured == (0, 0)
    assert nxt.turn is Player.B


def test_captures_two_on_opponent_side() -> None:
    """A last seed making two on the opponent's side is captured."""
    nxt = play(_state((6, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0)), Move(pit=0))
    assert nxt.board.pits == (0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0)
    assert nxt.captured == (2, 0)
    assert nxt.turn is Player.B


def test_captures_three_on_opponent_side() -> None:
    """A last seed making three on the opponent's side is captured."""
    nxt = play(_state((6, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0)), Move(pit=0))
    assert nxt.board.pits == (0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0)
    assert nxt.captured == (3, 0)


def test_no_capture_on_own_side() -> None:
    """A last seed making two or three on the mover's own side is not captured."""
    nxt = play(_state((3, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0)), Move(pit=0))
    assert nxt.board.pits == (0, 1, 1, 2, 0, 0, 0, 0, 0, 0, 0, 0)
    assert nxt.captured == (0, 0)


def test_no_capture_on_four_seeds() -> None:
    """A last seed making four on the opponent's side stays on the board."""
    nxt = play(_state((6, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0)), Move(pit=0))
    assert nxt.board.pits == (0, 1, 1, 1, 1, 1, 4, 0, 0, 0, 0, 0)
    assert nxt.captured == (0, 0)


def test_game_ends_when_capture_exceeds_twenty_four() -> None:
    """The first player past twenty-four captured seeds wins immediately."""
    nxt = play(
        _state((0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2), turn=Player.B, captured=(0, 23)),
        Move(pit=11),
    )
    assert nxt.captured == (0, 25)
    assert nxt.status is GameStatus.FINISHED
    assert nxt.winner is Player.B


def test_chain_captures_preceding_two_and_three() -> None:
    """Pits preceding the landing pit holding two or three are captured too."""
    nxt = play(_state((7, 0, 0, 0, 0, 0, 2, 2, 0, 0, 0, 0)), Move(pit=0))
    assert nxt.board.pits == (0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0)
    assert nxt.captured == (6, 0)


def test_chain_capture_stops_at_own_side() -> None:
    """The chain sweep does not cross onto the mover's own side."""
    nxt = play(_state((7, 0, 0, 0, 0, 3, 2, 2, 0, 0, 0, 0)), Move(pit=0))
    assert nxt.board.pits == (0, 1, 1, 1, 1, 4, 0, 0, 0, 0, 0, 0)
    assert nxt.captured == (6, 0)


def test_game_continues_at_exactly_twenty_four() -> None:
    """Reaching exactly twenty-four captured seeds does not end the game."""
    nxt = play(
        _state((0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2), turn=Player.B, captured=(0, 22)),
        Move(pit=11),
    )
    assert nxt.captured == (0, 24)
    assert nxt.status is GameStatus.ONGOING
    assert nxt.winner is None


def test_draw_when_both_reach_twenty_four() -> None:
    """A 24-24 split ends the game as a draw with no winner."""
    nxt = play(
        _state((0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0), captured=(22, 24)),
        Move(pit=5),
    )
    assert nxt.captured == (24, 24)
    assert nxt.status is GameStatus.FINISHED
    assert nxt.winner is None
