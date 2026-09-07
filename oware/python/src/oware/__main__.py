"""
oware console entry point (uv run oware).

Python 3.14 idioms: annotations evaluate lazily by default (PEP 649), and
``except E1, E2:`` needs no parentheses (PEP 758).
"""

import argparse
import sys
from typing import TYPE_CHECKING

from oware.computer import ComputerMode, choose_move
from oware.models import (
    PITS_PER_SIDE,
    SEEDS_TOTAL,
    Board,
    GameState,
    GameStatus,
    Move,
    Player,
    Ruleset,
    play,
    tally,
)

_ERR_EDIT_TOTAL = "Total seeds cannot exceed 48"

if TYPE_CHECKING:
    from collections.abc import Iterable

_RULES_ARG = {
    "1": Ruleset.ANAN_ANAN,
    "2": Ruleset.ABAPA,
    "anan": Ruleset.ANAN_ANAN,
    "abapa": Ruleset.ABAPA,
}

_CELL_WIDTH = 2  # fixed, so a 2-digit seed count never resizes the board


def _clear_screen() -> None:
    """Clear the terminal so each turn renders a fresh board."""
    print("\033[2J\033[H", end="", flush=True)


_USE_COLOR = sys.stdout.isatty()
_REV_ON = "\033[7m"  # ANSI reverse video: marks the pit of the last move
_REV_OFF = "\033[0m"  # ANSI reset


def _ruleset_label(ruleset: Ruleset) -> str:
    """Human-readable ruleset name, e.g. ``Anan-Anan``."""
    return ruleset.value.replace("_", "-").title()


def _rule_line(left: str, join: str, right: str, width: int) -> str:
    """One horizontal board rule: ``PITS_PER_SIDE`` cells of ``width`` seeds."""
    cell = "─" * (width + 2)
    return f"{left}{join.join(cell for _ in range(PITS_PER_SIDE))}{right}"


def _label_row(labels: Iterable[int], width: int) -> str:
    """Pit numbers centered over the board cells below or above them."""
    return " " + " ".join(f"{label:^{width + 2}}" for label in labels) + " "


def _seed_row(
    state: GameState, rings: Iterable[int], width: int, last_pit: int | None
) -> str:
    """Render one seed row, reverse-highlighting the pit of the last move."""
    cells = []
    for ring in rings:
        content = f" {state.board.pits[ring]:>{width}} "
        if ring == last_pit and _USE_COLOR:
            content = f"{_REV_ON}{content}{_REV_OFF}"
        cells.append(content)
    return "│" + "│".join(cells) + "│"


def _board_layout(state: GameState, last_pit: int | None = None) -> str:
    """Render the boxed board: Player B on top (right-to-left), A below."""
    width = _CELL_WIDTH
    top_rings = range(PITS_PER_SIDE * 2 - 1, PITS_PER_SIDE - 1, -1)
    return "\n".join(
        (
            f"   Player B — score {state.captured[1]}",
            _label_row(range(PITS_PER_SIDE, 0, -1), width),
            _rule_line("┌", "┬", "┐", width),
            _seed_row(state, top_rings, width, last_pit),
            _rule_line("├", "┼", "┤", width),
            _seed_row(state, range(PITS_PER_SIDE), width, last_pit),
            _rule_line("└", "┴", "┘", width),
            _label_row(range(1, PITS_PER_SIDE + 1), width),
            f"   Player A — score {state.captured[0]}",
        )
    )


def _ui_pit(pit: int) -> int:
    """Convert a ring pit index to its 1-based per-side UI number."""
    return pit % PITS_PER_SIDE + 1


def _parse_pit(raw: str) -> int | None:
    """Parse a UI pit number 1..6, or ``None`` when invalid."""
    try:
        value = int(raw)
    except ValueError:
        return None
    if not 1 <= value <= PITS_PER_SIDE:
        return None
    return value


def _side_total(state: GameState, player: Player) -> int:
    """Total seeds on ``player``'s side of the board."""
    start = 0 if player is Player.A else PITS_PER_SIDE
    return sum(state.board.pits[start : start + PITS_PER_SIDE])


def _move_gains(state: GameState) -> list[tuple[int, int, int]]:
    """Report captures per valid pit (UI pit number, own gain, opponent gain)."""
    turn = state.turn
    gains = []
    for ui_pit in range(1, PITS_PER_SIDE + 1):
        pit = ui_pit - 1
        if turn is Player.B:
            pit += PITS_PER_SIDE
        if state.board.is_empty(pit):
            continue
        after = play(state, Move(pit=pit))
        gains.append(
            (
                ui_pit,
                after.captured_by(turn) - state.captured_by(turn),
                after.captured_by(turn.opponent) - state.captured_by(turn.opponent),
            )
        )
    return gains


def _value_row(values: Iterable[int | None], width: int, label: str = "") -> str:
    """One boxed value row; ``-`` marks an empty pit, ``label`` trails the row."""
    cells = ("-" * width if value is None else f"{value:>{width}}" for value in values)
    row = "│" + "│".join(f" {cell} " for cell in cells) + "│"
    return f"{row}  {label}" if label else row


def _proposal(state: GameState) -> str:
    """Render the capture forecast as a board-shaped table aligned with the pits."""
    gains = _move_gains(state)
    own: list[int | None] = [None] * PITS_PER_SIDE
    opp: list[int | None] = [None] * PITS_PER_SIDE
    for ui_pit, own_gain, opp_gain in gains:
        own[ui_pit - 1] = own_gain
        opp[ui_pit - 1] = opp_gain
    width = _CELL_WIDTH
    return "\n".join(
        (
            "\nForecast — captures per pit:",
            _rule_line("┌", "┬", "┐", width),
            _value_row(own, width, f"{state.turn.name} gets"),
            _rule_line("├", "┼", "┤", width),
            _value_row(opp, width, f"{state.turn.opponent.name} gets"),
            _rule_line("└", "┴", "┘", width),
        )
    )


def _ruleset_arg(key: str) -> Ruleset:
    """Parse a ``--rules`` key, warning and defaulting when unknown."""
    ruleset = _RULES_ARG.get(key.strip().lower())
    if ruleset is None:
        print(f"Unknown rules {key!r} — use 1, 2, Anan, or Abapa.")
        return Ruleset.ANAN_ANAN
    return ruleset


def _resolve_mode(key: str) -> ComputerMode:
    """Map a mode key to a ComputerMode, warning and defaulting on bad input."""
    try:
        return ComputerMode(key)
    except ValueError:
        print(
            f"Unknown computer mode {key!r} — use Greedy, "
            "Greedy Response, Minimax, or Random."
        )
        return ComputerMode.GREEDY


def _build_parser() -> argparse.ArgumentParser:
    """Build the oware command-line parser."""
    parser = argparse.ArgumentParser(
        prog="oware",
        description=(
            "Play the Oware board game. --rules selects the ruleset "
            "(1=Anan-Anan, 2=Abapa); default is 1=Anan-Anan."
        ),
        epilog="e.g. uv run oware --rules=2 -A=greedy -B=random",
        allow_abbrev=False,
    )
    parser.add_argument(
        "--rules",
        type=_ruleset_arg,
        default="1",
        metavar="1|2|anan|abapa",
        help="Ruleset to play (default 1=Anan-Anan).",
    )
    parser.add_argument(
        "-a",
        "-A",
        type=_resolve_mode,
        metavar="MODE",
        dest="mode_a",
        help="Computer plays Player A (MODE required).",
    )
    parser.add_argument(
        "-b",
        "-B",
        type=_resolve_mode,
        metavar="MODE",
        dest="mode_b",
        help="Computer plays Player B (MODE required); set both for auto game.",
    )
    return parser


def _player_label(player: Player, mode: ComputerMode | None) -> str:
    """Label for ``player``: side name plus computer mode or ``(you)``."""
    if mode is not None:
        return f"{player.name} (computer · {mode.value})"
    return f"{player.name} (you)"


def _turn_header(
    state: GameState, mode_a: ComputerMode | None, mode_b: ComputerMode | None
) -> str:
    """One-line status: who moves, the ruleset, and the captured totals."""
    mode = mode_a if state.turn is Player.A else mode_b
    mover = _player_label(state.turn, mode)
    a, b = state.captured
    return f"{mover} to move — {_ruleset_label(state.ruleset)} · Score: A {a}, B {b}"


def _ask_int(prompt: str, default: int) -> int:
    """Prompt for an integer, returning ``default`` on a blank line."""
    while True:
        raw = input(f"{prompt} [{default}]: ")
        if raw.strip() == "":
            return default
        try:
            value = int(raw)
        except ValueError:
            print("WARN: Enter a whole number, or press Enter for the default.")
            continue
        if value < 0:
            print("WARN: Enter a non-negative number.")
            continue
        return value


def _edit_board(state: GameState) -> GameState | None:
    """
    Let the user edit pits, captures, and turn; rerun until the total is valid.

    Returns the edited state on success, or ``None`` on early quit (Ctrl-D).
    """
    pits = list(state.board.pits)
    captured = list(state.captured)
    turn = state.turn
    while True:
        try:
            for ring in range(PITS_PER_SIDE * 2 - 1, PITS_PER_SIDE - 1, -1):
                pits[ring] = _ask_int(
                    f"Seeds in {Player.B.name}{_ui_pit(ring)}", pits[ring]
                )
            for ring in range(PITS_PER_SIDE):
                pits[ring] = _ask_int(
                    f"Seeds in {Player.A.name}{_ui_pit(ring)}", pits[ring]
                )
            captured[0] = _ask_int(f"Seeds captured by {Player.A.name}", captured[0])
            captured[1] = _ask_int(f"Seeds captured by {Player.B.name}", captured[1])
            raw = input(f"Whose turn? ({Player.A.name}/{Player.B.name}) [{turn}]: ")
        except EOFError:
            print("\nEdit aborted.")
            return None
        raw = raw.strip().upper()
        if raw in ("", "A", "B"):
            turn = Player.A if raw in ("", "A") else Player.B
        else:
            print("WARN: Enter A or B.")
            continue
        if sum(pits) > SEEDS_TOTAL:
            print(f"WARN: {_ERR_EDIT_TOTAL} — current total {sum(pits)}; try again.")
            continue
        status = GameStatus.ONGOING
        return GameState(
            board=Board(pits=tuple(pits)),
            turn=turn,
            ruleset=state.ruleset,
            captured=(captured[0], captured[1]),
            status=status,
        )


def _play_turn(
    state: GameState,
    mode_a: ComputerMode | None,
    mode_b: ComputerMode | None,
    note: str | None,
    last_pit: int | None,
) -> tuple[GameState | None, str | None, int | None]:
    """
    Play one turn; returns (next state, note for next render, last move pit).

    ``None`` state means the player quit; ``None`` note means no announcement.
    """
    mode = mode_a if state.turn is Player.A else mode_b
    _clear_screen()
    if note is not None:
        print(note)
    print(_turn_header(state, mode_a, mode_b))
    print(_board_layout(state, last_pit))
    if mode is not None:
        move = choose_move(state, mode)
        ui_pit = _ui_pit(move.pit)
        note = f"Computer ({state.turn.name}) plays pit {ui_pit}"
        return play(state, move), note, move.pit
    print(_proposal(state))
    try:
        raw = input(f"\nPlayer {state.turn.name}, pick a pit (1-6, e to edit): ")
    except EOFError:
        print("\nQuit.")
        return None, None, None
    is_edit = raw.strip().lower() == "e"
    if is_edit:
        edited = _edit_board(state)
        if edited is not None:
            return edited, "Board edited.", None
    ui_pit = _parse_pit(raw)
    if ui_pit is None:
        print("WARN: Edit aborted." if is_edit else "WARN: Enter a number 1-6.")
        return state, None, last_pit
    pit = ui_pit - 1
    if state.turn is Player.B:
        pit += PITS_PER_SIDE
    try:
        return play(state, Move(pit=pit)), None, pit
    except ValueError as exc:
        print(f"WARN: {exc}")
        return state, None, last_pit


def _winner(state: GameState) -> Player | None:
    """Return the player with more captured seeds, or ``None`` for a draw."""
    a, b = state.captured
    if a > b:
        return Player.A
    if b > a:
        return Player.B
    return None


def _print_result(state: GameState) -> None:
    """Print the final board and winner announcement."""
    winner = _winner(state)
    if winner is None:
        print("Game over — it's a draw.")
    else:
        print(f"Game over — Player {winner.name} wins.")


def _choose_starter() -> Player:
    """Ask the user which player moves first."""
    while True:
        raw = input("Which player begins? (A/B): ").strip().upper()
        if raw in ("", "A", "B"):
            return Player.A if raw in {"A", ""} else Player.B
        print("Enter A or B.")


def play_game(
    ruleset: Ruleset,
    mode_a: ComputerMode | None = None,
    mode_b: ComputerMode | None = None,
) -> None:
    """Run a game of ``ruleset``; a mode set for a side makes it a computer."""
    state = GameState.start(ruleset, _choose_starter())
    note: str | None = None
    last_pit: int | None = None
    while state.status is GameStatus.ONGOING:
        if _side_total(state, state.turn) == 0:
            break
        next_state, note, last_pit = _play_turn(state, mode_a, mode_b, note, last_pit)
        if next_state is None:
            return
        previous_total = sum(state.captured)
        state = tally(next_state, previous_total)
    print(_board_layout(state, last_pit))
    _print_result(state)


def play_auto_game(
    ruleset: Ruleset, mode_a: ComputerMode, mode_b: ComputerMode
) -> GameState:
    """Run a computer-vs-computer game of ``ruleset``, logging each move."""
    state = GameState.start(ruleset)
    last_pit: int | None = None
    moves = 0
    while state.status is GameStatus.ONGOING:
        if _side_total(state, state.turn) == 0:
            break
        mode = mode_a if state.turn is Player.A else mode_b
        move = choose_move(state, mode)
        print(f"{state.turn.name} ({mode.name}) plays pit {_ui_pit(move.pit)}")
        previous_total = sum(state.captured)
        state = tally(play(state, move), previous_total)
        last_pit = move.pit
        moves += 1
    print(_board_layout(state, last_pit))
    print(f"{moves} moves played.")
    _print_result(state)
    return state


def main() -> None:
    """Start an interactive game of the chosen ruleset."""
    args = _build_parser().parse_args()
    try:
        if args.mode_a is not None and args.mode_b is not None:
            play_auto_game(args.rules, args.mode_a, args.mode_b)
        else:
            play_game(args.rules, args.mode_a, args.mode_b)
    except EOFError, KeyboardInterrupt:
        print("\nQuit.")


if __name__ == "__main__":
    main()
