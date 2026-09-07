# Python Implementation

Python 3.14 + uv, stdlib only.

Entry point: `uv run oware` (console script → `oware.__main__:main`). Run from `python/` or via `--project python` from the repo root.

## Layout

- `python/`: `.python-version`, `model-ranking.md`, `pyproject.toml`, `ruff.toml`, `uv.lock`
  - `python/src/oware/`: `__init__.py`, `__main__.py` (CLI), `computer.py` (modes), `models.py` (value objects)
  - `python/tests/`: `test_abapa.py`, `test_anan.py`, `test_auto.py`, `test_cli.py`, `test_computer.py`, `test_models.py`

## Architecture

- `models.py`: immutable value objects — `@dataclass(frozen=True, slots=True, kw_only=True)`, `StrEnum` (`Player`, `Ruleset`, `GameStatus`), `Board`, `Move`, `GameState`. Validation in `__post_init__` (trust boundary).
- CLI: `uv run oware [--rules=1|2|anan|abapa] [-A=MODE] [-B=MODE]`; a side flag makes that player a computer (`-A`/`-B` require a MODE value), both set → auto game. Ruleset defaults to `1` (Anan-Anan). Parsing lives in `_parse_sides` and `_parse_rules` (`__main__.py`).

## Checks

Run from the repo root: `scripts/chk_py_*.sh` (lint = `ruff format` + `ruff check`, plus test, types/pyright, dead code, package audit). The shared verification policy lives in the root `AGENTS.md`.

`scripts/gen_model_ranking.py` (regenerates `model-ranking.md`; deterministic round-robin, RANDOM excluded) is run via `uv run --project python scripts/gen_model_ranking.py`.

## Ruff pitfalls (`select = ["ALL"]` rules that commonly bite)

- ruff format drops unused imports.
- ruff: `select = ["ALL"]`, line-length 88, auto-fix.
- Docstrings required (D rules)
- `raise` must use pre-assigned message constants
- not literals/f-strings (EM101/EM102/TRY003).
- Signatures: keep ≤5 params (PLR0913/PLR0917). Boolean args must be keyword-only (`*, flag: bool = False`, FBT001/2). No mutable default args — use `None` or `field(default_factory=...)` (B006). No call in defaults (B008).
- Keep functions small: ≤50 statements (PLR0915), ≤12 branches (PLR0912), ≤6 returns (PLR0911), complexity ≤10 (C901). Extract helpers instead of growing a function.
- Annotate every arg and return with concrete types (ANN); `Any` is flagged (ANN401). Methods that ignore `self` must be plain functions (PLR6301).
- No magic numbers in comparisons (PLR2004) — hoist to named constants like `CAPTURE_COUNT`, `RELAY_FLOOR`.
- Unused args/variables: prefix with `_` (ARG001/F841). Never touch protected members from outside the class (SLF001).
- Imports only at top of module (PLC0415), modern typing only (`collections.abc`, `Self`; UP035). Exceptions named `*Error` (N818).
- `random` module triggers S311 — annotate with `# noqa: S311 — game, not crypto`; empty sequence from `choice` raises `IndexError`, so guard with the standard `_ERR_NO_MOVES` ValueError.
- Prefer early `return` over `elif` after a return (RET505). Don't add `# noqa` unless a specific rule fires (RUF100).
