import type { GameState, Move } from "./models"
import { PITS_PER_SIDE, play } from "./models"

export type ComputerMode = "random" | "greedy" | "greedy_response" | "minimax"

const DEPTH = 3
const INF = 1_000_000
const CAPTURE_WEIGHT = 100
const SIDE_WEIGHT = 1
const MOBILITY_WEIGHT = 1

function sideStart(player: "A" | "B"): number {
  return player === "A" ? 0 : PITS_PER_SIDE
}

function movablePits(state: GameState): number[] {
  const start = sideStart(state.turn)
  const pits: number[] = []
  for (let pit = start; pit < start + PITS_PER_SIDE; pit++) {
    if (!(state.board.pits[pit] === 0)) pits.push(pit)
  }
  return pits
}

function bestMove<T extends [number, ...unknown[]]>(
  candidates: T[],
  ranking: (candidate: T) => number[] | number,
): Move {
  if (candidates.length === 0) {
    throw new Error("Player has no seeds to move")
  }
  // biome-ignore lint/style/noNonNullAssertion: candidates.length checked above
  let best = candidates[0]!
  let bestRank = ranking(best)
  for (const candidate of candidates) {
    const rank = ranking(candidate)
    if (compareRanks(rank, bestRank) < 0) {
      best = candidate
      bestRank = rank
    }
  }
  return { pit: best[0] }
}

function compareRanks(a: number[] | number, b: number[] | number): number {
  const ai = Array.isArray(a) ? a : [a]
  const bi = Array.isArray(b) ? b : [b]
  for (let i = 0; i < ai.length; i++) {
    const diff = (ai[i] ?? 0) - (bi[i] ?? 0)
    if (diff !== 0) return diff
  }
  return 0
}

function greedySimulate(state: GameState): Array<[number, number, number]> {
  const turn = state.turn
  const gains: Array<[number, number, number]> = []
  for (const pit of movablePits(state)) {
    const after = play(state, { pit })
    gains.push([
      pit,
      capturedBy(after, turn) - capturedBy(state, turn),
      capturedBy(after, turn === "A" ? "B" : "A") - capturedBy(state, turn === "A" ? "B" : "A"),
    ])
  }
  return gains
}

function greedyRanking(candidate: [number, number, number]): number[] {
  const [pit, ownGain, oppGain] = candidate
  return [-ownGain, oppGain, pit]
}

function greedyMove(state: GameState): Move {
  return bestMove(greedySimulate(state), greedyRanking)
}

function greedyResponseSimulate(state: GameState): Array<[number, number, number]> {
  const turn = state.turn
  const opp = turn === "A" ? "B" : "A"
  const oppStart = sideStart(opp)
  const deltas: Array<[number, number, number]> = []
  for (const pit of movablePits(state)) {
    let after = play(state, { pit })
    if (after.status === "ongoing" && movableForSide(after, oppStart)) {
      after = play(after, greedyMove(after))
    }
    const ownDelta = capturedBy(after, turn) - capturedBy(state, turn)
    const oppDelta = capturedBy(after, opp) - capturedBy(state, opp)
    deltas.push([pit, ownDelta, oppDelta])
  }
  return deltas
}

function movableForSide(state: GameState, start: number): boolean {
  for (let pit = start; pit < start + PITS_PER_SIDE; pit++) {
    if (!(state.board.pits[pit] === 0)) return true
  }
  return false
}

function greedyResponseRanking(candidate: [number, number, number]): number[] {
  const [pit, ownDelta, oppDelta] = candidate
  return [-(ownDelta - oppDelta), pit]
}

function greedyResponseMove(state: GameState): Move {
  return bestMove(greedyResponseSimulate(state), greedyResponseRanking)
}

function evaluate(state: GameState, player: "A" | "B"): number {
  if (state.status !== "ongoing") {
    if (state.winner === null) return 0
    return state.winner === player ? INF : -INF
  }
  const ownStart = sideStart(player)
  const own = state.board.pits.slice(ownStart, ownStart + PITS_PER_SIDE)
  const opp =
    player === "B"
      ? state.board.pits.slice(0, PITS_PER_SIDE)
      : state.board.pits.slice(PITS_PER_SIDE)
  const capturedDiff = capturedBy(state, player) - capturedBy(state, player === "A" ? "B" : "A")
  const sideDiff = own.reduce((s, v) => s + v, 0) - opp.reduce((s, v) => s + v, 0)
  const mobilityDiff = own.filter((v) => v > 0).length - opp.filter((v) => v > 0).length
  return CAPTURE_WEIGHT * capturedDiff + SIDE_WEIGHT * sideDiff + MOBILITY_WEIGHT * mobilityDiff
}

function capturedBy(state: GameState, player: "A" | "B"): number {
  return player === "A" ? state.captured[0] : state.captured[1]
}

function negamax(state: GameState, depth: number, alpha: number, beta: number): number {
  if (depth === 0 || state.status !== "ongoing") {
    return evaluate(state, state.turn)
  }
  let best = -INF
  for (const pit of movablePits(state)) {
    const after = play(state, { pit })
    const score = -negamax(after, depth - 1, -beta, -alpha)
    if (score > best) best = score
    if (best > alpha) alpha = best
    if (alpha >= beta) break
  }
  return best === -INF ? evaluate(state, state.turn) : best
}

function minimaxSimulate(state: GameState): Array<[number, number]> {
  const scores: Array<[number, number]> = []
  for (const pit of movablePits(state)) {
    const after = play(state, { pit })
    scores.push([pit, -negamax(after, DEPTH - 1, -INF, INF)])
  }
  return scores
}

function minimaxRanking(candidate: [number, number]): number[] {
  const [pit, score] = candidate
  return [-score, pit]
}

function minimaxMove(state: GameState): Move {
  return bestMove(minimaxSimulate(state), minimaxRanking)
}

function randomMove(state: GameState): Move {
  const pits = movablePits(state)
  if (pits.length === 0) {
    throw new Error("Player has no seeds to move")
  }
  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  // biome-ignore lint/style/noNonNullAssertion: pits.length checked above
  return { pit: pits[Math.floor(Math.random() * pits.length)]! }
}

export function chooseMove(state: GameState, mode: ComputerMode): Move {
  switch (mode) {
    case "greedy":
      return greedyMove(state)
    case "greedy_response":
      return greedyResponseMove(state)
    case "minimax":
      return minimaxMove(state)
    case "random":
      return randomMove(state)
    default:
      throw new Error("Unknown computer mode")
  }
}
