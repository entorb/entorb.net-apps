"""
Oware data model — immutable value objects and enums.

Python 3.14 best practice:
- @dataclass(frozen=True, slots=True, kw_only=True) for memory-light immutable objects
- StrEnum for ruleset/player/status readability
- type aliases + Self for idiomatic typing
- deferred annotation evaluation (PEP 649) is the default
- Ring indexing (pit 0..11) so both players distribute +1 mod 12
- Validation at trust boundaries via __post_init__

Pure functions returning a new GameState are the intended simulation pattern
(play(state, move) -> GameState) — no in-place mutation.
"""

from dataclasses import dataclass, replace
from enum import StrEnum, auto
from typing import Self

type PitIndex = int  # ring order 0..11; counter-clockwise = +1 mod 12 for both players
type Seeds = int

BOARD_LENGTH = 12
PITS_PER_SIDE = 6
SEEDS_PER_PIT = 4
SEEDS_TOTAL = 48
CAPTURE_LIMIT = 24
CAPTURE_COUNT = 4  # a pit reaching this many seeds is captured
CAPTURE_TOTALS = (
    2,
    3,
)  # Abapa: a landing pit on the opponent's side holding 2 or 3 seeds is captured
RELAY_FLOOR = 2  # a last pit holding at least this many seeds continues the relay
ENDGAME_LIMIT = 8  # below this, the last capturer takes the remaining seeds
STALL_LIMIT = 6  # addon: this many moves without a capture ends the game

_ERR_BOARD_LEN = "Board must have exactly 12 pits"
_ERR_NEGATIVE = "Seed counts must be non-negative"
_ERR_TOTAL = "Total seeds cannot exceed 48"
_ERR_PIT_RANGE = f"Pit index must be 0..{BOARD_LENGTH - 1}"
_ERR_FINISHED = "Game is already finished"
_ERR_NOT_OWNER = "Pit is not owned by the player to move"
_ERR_EMPTY_PIT = "Pit is empty"


class Player(StrEnum):
    """Owning side of the board; A owns pits 0..5, B owns 6..11."""

    A = auto()
    B = auto()

    @property
    def opponent(self) -> Player:
        """The other player."""
        return Player.B if self is Player.A else Player.A


class Ruleset(StrEnum):
    """
    Supported rule sets.

    ANAN_ANAN: relay, capture-at-4.
    ABAPA: single pass, capture 2/3 on opponent side.
    """

    ANAN_ANAN = auto()
    ABAPA = auto()


class GameStatus(StrEnum):
    """Lifecycle status of a game."""

    ONGOING = auto()
    FINISHED = auto()


@dataclass(frozen=True, slots=True, kw_only=True)
class Board:
    """Immutable 12-pit board in ring order (counter-clockwise = +1 mod 12)."""

    pits: tuple[Seeds, ...]

    def __post_init__(self) -> None:
        """Validate pit count, seed counts, and total at construction."""
        if len(self.pits) != BOARD_LENGTH:
            raise ValueError(_ERR_BOARD_LEN)
        if any(s < 0 for s in self.pits):
            raise ValueError(_ERR_NEGATIVE)
        if sum(self.pits) > SEEDS_TOTAL:
            raise ValueError(_ERR_TOTAL)

    @classmethod
    def initial(cls) -> Self:
        """Build the starting board with four seeds in every pit."""
        return cls(pits=(SEEDS_PER_PIT,) * BOARD_LENGTH)

    def owner_of(self, index: PitIndex) -> Player:
        """Player who owns the pit at ``index``."""
        return Player.A if index < PITS_PER_SIDE else Player.B

    def is_empty(self, index: PitIndex) -> bool:
        """Whether the pit at ``index`` holds zero seeds."""
        return self.pits[index] == 0


@dataclass(frozen=True, slots=True, kw_only=True)
class Move:
    """A single move: the pit a player chooses to sow."""

    pit: PitIndex

    def __post_init__(self) -> None:
        """Validate the pit index is on the board."""
        if not 0 <= self.pit < BOARD_LENGTH:
            raise ValueError(_ERR_PIT_RANGE)


@dataclass(frozen=True, slots=True, kw_only=True)
class GameState:
    """
    Immutable snapshot of a game.

    The intended simulation pattern is pure functions returning a new
    GameState per move (no in-place mutation).
    """

    board: Board
    turn: Player
    ruleset: Ruleset
    captured: tuple[Seeds, Seeds] = (0, 0)
    status: GameStatus = GameStatus.ONGOING
    winner: Player | None = None
    moves_without_capture: int = 0

    @classmethod
    def start(cls, ruleset: Ruleset, first: Player = Player.A) -> Self:
        """Fresh game: initial board, ``first`` player to move."""
        return cls(
            board=Board.initial(),
            turn=first,
            ruleset=ruleset,
        )

    def captured_by(self, player: Player) -> Seeds:
        """Seeds captured by ``player``."""
        return self.captured[0] if player is Player.A else self.captured[1]


def _sow(
    pits: list[Seeds],
    start: int,
    count: int,
    state: GameState,
    captured: dict[Player, int],
) -> tuple[int, Player | None]:
    """
    Drop ``count`` seeds counter-clockwise from ``start``, skipping it.

    Returns the last pit reached and the player of the most recent capture
    (if any). Under Anan-Anan a pit reaching four seeds is captured by its
    owner, or by the player to move on the final seed, and recorded into
    ``captured``.
    """
    index = start
    last_capturer: Player | None = None
    is_anan = state.ruleset is Ruleset.ANAN_ANAN
    while count > 0:
        index = (index + 1) % BOARD_LENGTH
        if index == start:
            continue
        pits[index] += 1
        count -= 1
        if is_anan and pits[index] == CAPTURE_COUNT:
            capturer = state.turn if count == 0 else state.board.owner_of(index)
            captured[capturer] += CAPTURE_COUNT
            pits[index] = 0
            last_capturer = capturer
    return index, last_capturer


def _finish(
    pits: list[Seeds],
    captured: dict[Player, int],
    last_capturer: Player | None,
) -> tuple[GameStatus, Player | None]:
    """
    Finalize status and winner on a capture lead, or once few seeds remain.

    The endgame sweep hands the last capturer every seed left on the board, so
    those pits are emptied; a capture-lead win leaves the unclaimed seeds in
    place.
    """
    for player in (Player.A, Player.B):
        if captured[player] > CAPTURE_LIMIT:
            return GameStatus.FINISHED, player
    status = GameStatus.ONGOING
    winner = None
    board_total = sum(pits)
    if board_total <= ENDGAME_LIMIT:
        status = GameStatus.FINISHED
        if last_capturer is not None:
            captured[last_capturer] += board_total
            for index in range(len(pits)):
                pits[index] = 0
        a, b = captured[Player.A], captured[Player.B]
        if a > b:
            winner = Player.A
        elif b > a:
            winner = Player.B
    return status, winner


def _finish_abapa(captured: dict[Player, int]) -> tuple[GameStatus, Player | None]:
    """End the game on a capture lead, or on an even 24-24 split."""
    for player in (Player.A, Player.B):
        if captured[player] > CAPTURE_LIMIT:
            return GameStatus.FINISHED, player
    if captured[Player.A] == CAPTURE_LIMIT and captured[Player.B] == CAPTURE_LIMIT:
        return GameStatus.FINISHED, None
    return GameStatus.ONGOING, None


def _finish_infinite(captured: dict[Player, int]) -> tuple[GameStatus, Player | None]:
    """End a non-terminating relay; the player holding the most seeds wins."""
    a, b = captured[Player.A], captured[Player.B]
    if a > b:
        return GameStatus.FINISHED, Player.A
    if b > a:
        return GameStatus.FINISHED, Player.B
    return GameStatus.FINISHED, None


def tally(state: GameState, previous_total: Seeds) -> GameState:
    """
    Advance the moves-without-capture counter and end the game on a stall.

    The counter resets to zero whenever a capture happened this move;
    otherwise it grows and the game ends once it reaches ``STALL_LIMIT``, the
    capture leader winning. Addon rule — applies to Anan-Anan only; Abapa has
    no stall.
    """
    if state.ruleset is not Ruleset.ANAN_ANAN:
        return state
    if sum(state.captured) > previous_total:
        moves = 0
    else:
        moves = state.moves_without_capture + 1
    if moves >= STALL_LIMIT:
        a, b = state.captured
        winner = Player.A if a > b else Player.B if b > a else None
        return replace(
            state,
            status=GameStatus.FINISHED,
            winner=winner,
            moves_without_capture=moves,
        )
    return replace(state, moves_without_capture=moves)


def _captured_map(state: GameState) -> dict[Player, int]:
    """Copy the captured totals into a mutable per-player map for sowing."""
    return {Player.A: state.captured[0], Player.B: state.captured[1]}


def _result(
    state: GameState,
    pits: list[Seeds],
    captured: dict[Player, int],
    status: GameStatus,
    winner: Player | None,
) -> GameState:
    """Build the next state: new board, flipped turn, updated captures."""
    return GameState(
        board=Board(pits=tuple(pits)),
        turn=state.turn.opponent,
        ruleset=state.ruleset,
        captured=(captured[Player.A], captured[Player.B]),
        status=status,
        winner=winner,
    )


def _play_abapa(state: GameState, move: Move) -> GameState:
    """
    Apply ``move`` to ``state`` per the Abapa rules.

    Sow the lifted pit once counter-clockwise with no relay. Capture the
    landing pit's seeds when the last seed falls on the opponent's side making
    it two or three, then sweep back through preceding two-or-three seed pits
    on the opponent's side.
    """
    pits = list(state.board.pits)
    captured = _captured_map(state)

    held = pits[move.pit]
    pits[move.pit] = 0
    index, _ = _sow(pits, move.pit, held, state, captured)

    while (
        pits[index] in CAPTURE_TOTALS
        and state.board.owner_of(index) is state.turn.opponent
    ):
        captured[state.turn] += pits[index]
        pits[index] = 0
        index = (index - 1) % BOARD_LENGTH

    status, winner = _finish_abapa(captured)
    return _result(state, pits, captured, status, winner)


def _play_anan(state: GameState, move: Move) -> GameState:
    """
    Apply ``move`` to ``state`` per the Anan-Anan rules.

    Lift the chosen pit, sow counter-clockwise (+1 mod 12) skipping the lifted
    pit, and keep lifting while the last seed lands in a non-empty pit. A pit
    reaching four seeds is captured by its owner (or by the player to move on
    the final seed). A relay that revisits a prior board configuration never
    terminates, so it is cut short and the capture leader wins.
    """
    pits = list(state.board.pits)
    captured = _captured_map(state)
    last_capturer: Player | None = None

    held = pits[move.pit]
    pits[move.pit] = 0
    index = move.pit
    seen: set[tuple[tuple[int, ...], int]] = set()
    while True:
        relay_key = (tuple(pits), index)
        if relay_key in seen:
            status, winner = _finish_infinite(captured)
            return _result(state, pits, captured, status, winner)
        seen.add(relay_key)
        index, turn_captured = _sow(pits, index, held, state, captured)
        if turn_captured is not None:
            last_capturer = turn_captured
        if pits[index] < RELAY_FLOOR:
            break
        held = pits[index]
        pits[index] = 0

    status, winner = _finish(pits, captured, last_capturer)
    return _result(state, pits, captured, status, winner)


def play(state: GameState, move: Move) -> GameState:
    """
    Apply ``move`` to ``state`` and return the resulting state.

    Validates the move against rules shared by every ruleset, then dispatches
    to the ruleset-specific logic.
    """
    if state.status is not GameStatus.ONGOING:
        raise ValueError(_ERR_FINISHED)
    if state.board.owner_of(move.pit) is not state.turn:
        raise ValueError(_ERR_NOT_OWNER)
    if state.board.is_empty(move.pit):
        raise ValueError(_ERR_EMPTY_PIT)
    if state.ruleset is Ruleset.ABAPA:
        return _play_abapa(state, move)
    return _play_anan(state, move)
