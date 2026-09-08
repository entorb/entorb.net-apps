"""
Generate sim-model-ranking.md from round-robin computer-vs-computer games.

Each ruleset (mode 1 = Anan-Anan, mode 2 = Abapa) is played for every pairing
of the deterministic computer models. Games are deterministic (pure ``play``
and ``choose_move``), so one game per matchup is the full result. RANDOM is
excluded — it is not deterministic and would not rank meaningfully.
"""

from pathlib import Path

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

REPORT = Path(__file__).resolve().parent.parent / "sim-model-ranking.md"

MODES = tuple(m for m in ComputerMode if m is not ComputerMode.RANDOM)

RULESETS = (
    (Ruleset.ANAN_ANAN, "1"),
    (Ruleset.ABAPA, "2"),
)

type Pairings = dict[tuple[ComputerMode, ComputerMode], GameState]


def _mode_label(mode: ComputerMode) -> str:
    """Human-readable mode name for table headers."""
    return mode.value.replace("_", " ").title()


def _ruleset_label(ruleset: Ruleset) -> str:
    """Human-readable ruleset name."""
    return ruleset.value.replace("_", "-").title()


def _side_total(state: GameState, player: Player) -> int:
    """Total seeds on ``player``'s side of the board."""
    start = 0 if player is Player.A else PITS_PER_SIDE
    return sum(state.board.pits[start : start + PITS_PER_SIDE])


def _auto_game(
    ruleset: Ruleset, mode_a: ComputerMode, mode_b: ComputerMode
) -> GameState:
    """Play one deterministic game to its end and return the final state."""
    state = GameState.start(ruleset)
    while state.status is GameStatus.ONGOING:
        if _side_total(state, state.turn) == 0:
            break
        mode = mode_a if state.turn is Player.A else mode_b
        previous_total = sum(state.captured)
        state = tally(play(state, choose_move(state, mode)), previous_total)
    return state


def _all_games(ruleset: Ruleset) -> Pairings:
    """Return the final state for every A/B model pairing under ``ruleset``."""
    return {
        (mode_a, mode_b): _auto_game(ruleset, mode_a, mode_b)
        for mode_a in MODES
        for mode_b in MODES
    }


def _outcome(state: GameState) -> str:
    """Winner and captured totals, e.g. ``A 24-20``."""
    a, b = state.captured
    if a > b:
        return f"A {a}-{b}"
    if b > a:
        return f"B {a}-{b}"
    return f"draw {a}-{b}"


def _matrix(games: Pairings) -> str:
    """Markdown matrix of every A/B model pairing result."""
    labels = [_mode_label(mode) for mode in MODES]
    lines = ["| A\\\\B | " + " | ".join(labels) + " |"]
    lines.append("|" + "---|" * (len(MODES) + 1))
    for mode_a in MODES:
        cells = [_outcome(games[mode_a, mode_b]) for mode_b in MODES]
        lines.append("| " + _mode_label(mode_a) + " | " + " | ".join(cells) + " |")
    return "\n".join(lines)


def _report() -> str:
    """Compose the full markdown report."""
    parts = [
        "# Simulation of computer player model ranking",
        "",
    ]
    for ruleset, _mode_key in RULESETS:
        games = _all_games(ruleset)
        parts.append(f"## {_ruleset_label(ruleset)}")
        parts.append("")
        parts.append(_matrix(games))
        parts.append("")
    return "\n".join(parts).rstrip() + "\n"


def main() -> None:
    """Write the model-ranking report to ``sim-model-ranking.md``."""
    REPORT.write_text(_report())


if __name__ == "__main__":
    main()
