import "./style.css";
import { chooseMove } from "./computer";
import type { GameState, Player, Ruleset } from "./models";
import { finishIfNoMoves, play, startState, tally } from "./models";
import type { EditRead, SideMode } from "./ui";
import {
  collectBoardEdits,
  renderBoard,
  renderControls,
  renderEditButton,
  renderEditPanel,
  renderForecast,
  renderRulesModal,
  renderStatus,
} from "./ui";

let state: GameState = startState("anan_anan");
let ruleset: Ruleset = "anan_anan";
let modeA: SideMode = "human";
let modeB: SideMode = "random";
let computerTimer = 0;
let editing = false;
let showingRules = false;

// biome-ignore lint/style/noNonNullAssertion: elements exist in index.html
const controlsEl = document.getElementById("controls")!;
// biome-ignore lint/style/noNonNullAssertion: elements exist in index.html
const boardEl = document.getElementById("board")!;
// biome-ignore lint/style/noNonNullAssertion: elements exist in index.html
const statusEl = document.getElementById("status")!;
// biome-ignore lint/style/noNonNullAssertion: elements exist in index.html
const forecastEl = document.getElementById("forecast")!;
// biome-ignore lint/style/noNonNullAssertion: elements exist in index.html
const editEl = document.getElementById("edit")!;
// biome-ignore lint/style/noNonNullAssertion: elements exist in index.html
const rulesEl = document.getElementById("rules")!;

init();

function init(): void {
  controlsEl.appendChild(
    renderControls(
      ruleset,
      modeA,
      modeB,
      (r) => {
        ruleset = r;
        resetGame();
      },
      (m) => {
        modeA = m;
        resetGame();
      },
      (m) => {
        modeB = m;
        resetGame();
      },
      () => resetGame(),
      openRules,
    ),
  );
  document.addEventListener("keydown", onKeyDown);
  render();
  scheduleComputer();
}

function onKeyDown(e: KeyboardEvent): void {
  if (e.key !== "Escape") return;
  if (showingRules) closeRules();
  else if (editing) cancelEdit();
}

function resetGame(): void {
  window.clearTimeout(computerTimer);
  state = startState(ruleset);
  editing = false;
  render();
  scheduleComputer();
}

function render(): void {
  boardEl.replaceChildren(renderBoard(state, onPitClick, editing));
  statusEl.replaceChildren(renderStatus(state, modeA, modeB));
  forecastEl.replaceChildren();
  if (editing) {
    editEl.replaceChildren(
      renderEditPanel(
        state.turn,
        () => collectBoardEdits(boardEl),
        submitEdit,
        cancelEdit,
      ),
    );
  } else {
    const forecast = renderForecast(state, isHumanTurn());
    if (forecast !== null) forecastEl.replaceChildren(forecast);
    const editBtn = renderEditButton(openEdit, state.status === "ongoing");
    if (editBtn !== null) editEl.replaceChildren(editBtn);
    else editEl.replaceChildren();
  }
  if (showingRules) {
    rulesEl.replaceChildren(renderRulesModal(ruleset, closeRules));
  } else {
    rulesEl.replaceChildren();
  }
}

function submitEdit(edit: EditRead, turn: Player): void {
  applyEdit(edit.pits, edit.captured, turn);
}

function openEdit(): void {
  window.clearTimeout(computerTimer);
  editing = true;
  render();
  const first = boardEl.querySelector<HTMLInputElement>("input[data-pit]");
  first?.focus();
  first?.select();
}

function openRules(): void {
  window.clearTimeout(computerTimer);
  showingRules = true;
  render();
  const closeBtn = document.querySelector<HTMLButtonElement>("#rules-close");
  closeBtn?.focus();
}

function closeRules(): void {
  showingRules = false;
  render();
  scheduleComputer();
  document.getElementById("info-btn")?.focus();
}

function cancelEdit(): void {
  editing = false;
  render();
  scheduleComputer();
}

function applyEdit(
  pits: number[],
  captured: [number, number],
  turn: Player,
): void {
  editing = false;
  state = {
    ...state,
    board: { pits },
    captured,
    turn,
    status: "ongoing",
    winner: null,
    movesWithoutCapture: 0,
  };
  state = finishIfNoMoves(state);
  render();
  scheduleComputer();
}

function currentMode(): SideMode {
  return state.turn === "A" ? modeA : modeB;
}

function isHumanTurn(): boolean {
  return state.status === "ongoing" && currentMode() === "human";
}

function onPitClick(pit: number): void {
  if (editing || !isHumanTurn()) return;
  move(pit);
}

function move(pit: number): void {
  const previousTotal = state.captured[0] + state.captured[1];
  try {
    state = play(state, { pit });
  } catch {
    return;
  }
  state = tally(state, previousTotal);
  state = finishIfNoMoves(state);
  render();
  scheduleComputer();
}

function scheduleComputer(): void {
  window.clearTimeout(computerTimer);
  if (state.status === "ongoing" && currentMode() !== "human") {
    computerTimer = window.setTimeout(computerTurn, 400);
  }
}

function computerTurn(): void {
  const mode = currentMode();
  if (state.status !== "ongoing" || mode === "human") return;
  const chosen = chooseMove(state, mode);
  move(chosen.pit);
}
