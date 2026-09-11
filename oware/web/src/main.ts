import "./style.css"
import type { AnimateHandle } from "./animate"
import { animateBoardNumbers } from "./animate"
import { chooseMove } from "./computer"
import type { GameState, Player, Ruleset } from "./models"
import { finishIfNoMoves, play, startState, tally } from "./models"
import { fetchGameCount, recordStartedGame } from "./stats"
import type { EditRead, SideMode } from "./ui"
import {
  collectBoardEdits,
  renderBoard,
  renderControls,
  renderEditButton,
  renderEditPanel,
  renderForecast,
  renderRulesModal,
  renderSimulationsModal,
  renderStatus,
} from "./ui"

let state: GameState = startState("anan_anan")
let ruleset: Ruleset = "anan_anan"
let modeA: SideMode = "human"
let modeB: SideMode = "random"
let animateMoves = true
let animating = false
let animHandle: AnimateHandle | null = null
let computerTimer = 0
let editing = false
let counted = false
let showingRules = false
let showingSim = false

// biome-ignore lint/style/noNonNullAssertion: elements exist in index.html
const controlsEl = document.getElementById("controls")!
// biome-ignore lint/style/noNonNullAssertion: elements exist in index.html
const boardEl = document.getElementById("board")!
// biome-ignore lint/style/noNonNullAssertion: elements exist in index.html
const statusEl = document.getElementById("status")!
// biome-ignore lint/style/noNonNullAssertion: elements exist in index.html
const forecastEl = document.getElementById("forecast")!
// biome-ignore lint/style/noNonNullAssertion: elements exist in index.html
const editEl = document.getElementById("edit")!
// biome-ignore lint/style/noNonNullAssertion: elements exist in index.html
const rulesEl = document.getElementById("rules")!
// biome-ignore lint/style/noNonNullAssertion: element exists in index.html
const gamesCountEl = document.getElementById("games-count")!

init()

function init(): void {
  controlsEl.appendChild(
    renderControls(
      ruleset,
      modeA,
      modeB,
      animateMoves,
      (r) => {
        ruleset = r
        resetGame()
      },
      (m) => {
        modeA = m
        resetGame()
      },
      (m) => {
        modeB = m
        resetGame()
      },
      onToggleAnimate,
      resetGame,
      openRules,
      openSim,
    ),
  )
  document.addEventListener("keydown", onKeyDown)
  render()
  refreshGameCount()
  scheduleComputer()
}

function refreshGameCount(): void {
  void fetchGameCount().then((count) => {
    if (count !== null) gamesCountEl.textContent = String(count)
  })
}

function onKeyDown(e: KeyboardEvent): void {
  if (e.key !== "Escape") return
  if (showingRules) closeRules()
  else if (showingSim) closeSim()
  else if (editing) cancelEdit()
}

function resetGame(): void {
  window.clearTimeout(computerTimer)
  cancelAnim()
  state = startState(ruleset)
  editing = false
  counted = false
  render()
  scheduleComputer()
}

function render(): void {
  boardEl.replaceChildren(renderBoard(state, onPitClick, editing))
  statusEl.replaceChildren(renderStatus(state, modeA, modeB))
  forecastEl.replaceChildren()
  if (editing) {
    editEl.replaceChildren(
      renderEditPanel(state.turn, () => collectBoardEdits(boardEl), submitEdit, cancelEdit),
    )
  } else {
    const forecast = renderForecast(state, isHumanTurn())
    if (forecast !== null) forecastEl.replaceChildren(forecast)
    const editBtn = renderEditButton(openEdit, state.status === "ongoing")
    if (editBtn !== null) editEl.replaceChildren(editBtn)
    else editEl.replaceChildren()
  }
  if (showingRules) {
    rulesEl.replaceChildren(renderRulesModal(ruleset, closeRules))
  } else if (showingSim) {
    rulesEl.replaceChildren(renderSimulationsModal(closeSim))
  } else {
    rulesEl.replaceChildren()
  }
}

function submitEdit(edit: EditRead, turn: Player): void {
  applyEdit(edit.pits, edit.captured, turn)
}

function openEdit(): void {
  window.clearTimeout(computerTimer)
  cancelAnim()
  editing = true
  render()
  const first = boardEl.querySelector<HTMLInputElement>("input[data-pit]")
  first?.focus()
  first?.select()
}

function openRules(): void {
  window.clearTimeout(computerTimer)
  cancelAnim()
  showingSim = false
  showingRules = true
  render()
  const closeBtn = document.querySelector<HTMLButtonElement>("#rules-close")
  closeBtn?.focus()
}

function closeRules(): void {
  showingRules = false
  render()
  scheduleComputer()
  document.getElementById("info-btn")?.focus()
}

function openSim(): void {
  window.clearTimeout(computerTimer)
  cancelAnim()
  showingRules = false
  showingSim = true
  render()
  const closeBtn = document.querySelector<HTMLButtonElement>("#sims-close")
  closeBtn?.focus()
}

function closeSim(): void {
  showingSim = false
  render()
  scheduleComputer()
  document.getElementById("sim-btn")?.focus()
}

function cancelEdit(): void {
  editing = false
  render()
  scheduleComputer()
}

function applyEdit(pits: number[], captured: [number, number], turn: Player): void {
  editing = false
  state = {
    ...state,
    board: { pits },
    captured,
    turn,
    status: "ongoing",
    winner: null,
    movesWithoutCapture: 0,
  }
  state = finishIfNoMoves(state)
  render()
  scheduleComputer()
}

function setAnimating(on: boolean): void {
  animating = on
  boardEl.classList.toggle("animating", on)
}

function cancelAnim(): void {
  if (animHandle !== null) {
    animHandle.cancel()
    animHandle = null
  }
  if (animating) setAnimating(false)
}

function onToggleAnimate(a: boolean): void {
  animateMoves = a
  if (!a && animating) {
    cancelAnim()
    render()
    scheduleComputer()
  }
}

function currentMode(): SideMode {
  return state.turn === "A" ? modeA : modeB
}

function isHumanTurn(): boolean {
  return state.status === "ongoing" && currentMode() === "human"
}

function onPitClick(pit: number): void {
  if (editing || animating || !isHumanTurn()) return
  move(pit)
}

function boardChanged(prev: GameState): boolean {
  if (prev.captured[0] !== state.captured[0] || prev.captured[1] !== state.captured[1]) {
    return true
  }
  for (let i = 0; i < 12; i++) {
    if (prev.board.pits[i] !== state.board.pits[i]) return true
  }
  return false
}

function move(pit: number): void {
  const previousTotal = state.captured[0] + state.captured[1]
  const prev = state
  try {
    state = play(state, { pit })
  } catch {
    return
  }
  if (!counted) {
    counted = true
    void recordStartedGame().then(() => refreshGameCount())
  }
  state = tally(state, previousTotal)
  state = finishIfNoMoves(state)
  if (!animateMoves || !boardChanged(prev)) {
    render()
    scheduleComputer()
    return
  }
  setAnimating(true)
  const handle = animateBoardNumbers(
    boardEl,
    pit,
    prev.board.pits,
    state.board.pits,
    prev.captured,
    state.captured,
  )
  animHandle = handle
  void handle.done.then(() => {
    if (animHandle !== handle) return
    animHandle = null
    setAnimating(false)
    render()
    scheduleComputer()
  })
}

function scheduleComputer(): void {
  window.clearTimeout(computerTimer)
  if (state.status === "ongoing" && currentMode() !== "human") {
    computerTimer = window.setTimeout(computerTurn, 400)
  }
}

function computerTurn(): void {
  const mode = currentMode()
  if (state.status !== "ongoing" || mode === "human") return
  const chosen = chooseMove(state, mode)
  move(chosen.pit)
}
