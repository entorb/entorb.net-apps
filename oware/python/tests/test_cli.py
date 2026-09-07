"""Tests for the per-side computer flags and --rules in the console entry point."""

import builtins

import pytest

from oware.__main__ import _build_parser, _edit_board
from oware.computer import ComputerMode
from oware.models import GameState, Player, Ruleset


def test_bare_a_requires_value() -> None:
    """``-A`` alone errors; a mode value is required."""
    with pytest.raises(SystemExit) as exc:
        _build_parser().parse_args(["--rules=1", "-A"])
    assert exc.value.code == 2


def test_b_mode_with_value() -> None:
    """``-B=random`` sets Player B's mode and leaves A human."""
    args = _build_parser().parse_args(["--rules=2", "-B=random"])
    assert args.rules is Ruleset.ABAPA
    assert args.mode_a is None
    assert args.mode_b is ComputerMode.RANDOM


def test_both_set_means_auto() -> None:
    """Both flags set yields two computer modes for the auto game."""
    args = _build_parser().parse_args(["-A=greedy", "-B=random"])
    assert args.mode_a is ComputerMode.GREEDY
    assert args.mode_b is ComputerMode.RANDOM


def test_unknown_mode_falls_back_to_greedy() -> None:
    """An invalid mode warns and defaults to Greedy."""
    args = _build_parser().parse_args(["-A=bogus"])
    assert args.mode_a is ComputerMode.GREEDY
    assert args.mode_b is None


def test_lowercase_side_accepted() -> None:
    """``-a=minimax`` works like ``-A=minimax``."""
    args = _build_parser().parse_args(["-a=minimax"])
    assert args.mode_a is ComputerMode.MINIMAX
    assert args.mode_b is None


def test_help_exits_zero() -> None:
    """``--help`` is handled by argparse and exits cleanly."""
    with pytest.raises(SystemExit) as exc:
        _build_parser().parse_args(["--help"])
    assert exc.value.code == 0


def test_default_rules_is_anan() -> None:
    """No ``--rules`` flag defaults to Anan-Anan."""
    args = _build_parser().parse_args([])
    assert args.rules is Ruleset.ANAN_ANAN
    assert args.mode_a is None
    assert args.mode_b is None


def test_rules_equals_form() -> None:
    """``--rules=2`` selects Abapa."""
    args = _build_parser().parse_args(["--rules=2"])
    assert args.rules is Ruleset.ABAPA


def test_rules_space_form() -> None:
    """``--rules abapa`` selects Abapa."""
    args = _build_parser().parse_args(["--rules", "abapa"])
    assert args.rules is Ruleset.ABAPA


def test_rules_name_accepted() -> None:
    """``--rules=anan`` selects Anan-Anan like ``--rules=1``."""
    args = _build_parser().parse_args(["--rules=anan"])
    assert args.rules is Ruleset.ANAN_ANAN


def test_unknown_rules_defaults_to_anan() -> None:
    """An unknown ``--rules`` value warns and keeps the default."""
    args = _build_parser().parse_args(["--rules=bogus"])
    assert args.rules is Ruleset.ANAN_ANAN


def test_rules_combined_with_side_flags() -> None:
    """``--rules`` and per-side flags combine for the auto game."""
    args = _build_parser().parse_args(["--rules=2", "-A=greedy"])
    assert args.rules is Ruleset.ABAPA
    assert args.mode_a is ComputerMode.GREEDY
    assert args.mode_b is None


def test_edit_board_updates_captured_and_turn(monkeypatch: pytest.MonkeyPatch) -> None:
    """Blank pit prompts keep the board; edits apply to captures and turn."""
    state = GameState.start(Ruleset.ANAN_ANAN)
    inputs = iter([""] * 12 + ["5", "3", "B"])
    monkeypatch.setattr(builtins, "input", lambda _prompt="": next(inputs))
    edited = _edit_board(state)
    assert edited is not None
    assert edited.board.pits == state.board.pits
    assert edited.captured == (5, 3)
    assert edited.turn is Player.B


def test_edit_board_reruns_and_reuses_values(monkeypatch: pytest.MonkeyPatch) -> None:
    """An over-budget total reruns the loop with prior values as defaults."""
    state = GameState.start(Ruleset.ANAN_ANAN)
    seq = ["5"] + [""] * 14 + ["3"] + [""] * 14
    prompts: list[str] = []
    iterator = iter(seq)

    def fake_input(prompt: str = "") -> str:
        prompts.append(prompt)
        return next(iterator)

    monkeypatch.setattr(builtins, "input", fake_input)
    edited = _edit_board(state)
    assert edited is not None
    assert edited.board.pits[11] == 3
    assert sum(edited.board.pits) == 47
    assert "[5]" in prompts[15]  # second pass reuses the previously entered B1 value
