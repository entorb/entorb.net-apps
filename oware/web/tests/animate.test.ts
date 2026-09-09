import { describe, expect, it } from "vitest"
import { buildNumberSteps, ringStep } from "../src/animate"
import type { GameState, Player, Ruleset } from "../src/models"
import { finishIfNoMoves, play, startState, tally } from "../src/models"

function state(
  pits: number[],
  turn: Player,
  ruleset: Ruleset,
  captured: [number, number] = [0, 0],
): GameState {
  return {
    board: { pits },
    turn,
    ruleset,
    captured,
    status: "ongoing",
    winner: null,
    movesWithoutCapture: 0,
  }
}

function applyMove(
  pits: number[],
  turn: Player,
  ruleset: Ruleset,
  pit: number,
  captured: [number, number] = [0, 0],
): { prev: GameState; next: GameState } {
  const prev = state(pits, turn, ruleset, captured)
  const total = prev.captured[0] + prev.captured[1]
  let next = play(prev, { pit })
  next = tally(next, total)
  next = finishIfNoMoves(next)
  return { prev, next }
}

function replay(prev: GameState, next: GameState, pit: number) {
  const steps = buildNumberSteps(
    pit,
    prev.board.pits,
    next.board.pits,
    prev.captured,
    next.captured,
  )
  const pits = [...prev.board.pits]
  const cap = [...prev.captured]
  for (const step of steps) {
    if ("pit" in step.target) pits[step.target.pit] = step.value
    else cap[step.target.store] = step.value
  }
  return { steps, pits, cap }
}

describe("ringStep", () => {
  it("returns 0 for the pit itself", () => {
    expect(ringStep(3, 3)).toBe(0)
  })

  it("counts counter-clockwise (+1 mod 12)", () => {
    expect(ringStep(0, 1)).toBe(1)
    expect(ringStep(0, 5)).toBe(5)
    expect(ringStep(5, 6)).toBe(1)
  })

  it("wraps past the end of the ring", () => {
    expect(ringStep(0, 11)).toBe(11)
    expect(ringStep(11, 0)).toBe(1)
    expect(ringStep(10, 2)).toBe(4)
  })
})

describe("buildNumberSteps", () => {
  it("replays to the final board for a plain anan sow", () => {
    const { prev, next } = applyMove([4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4], "A", "anan_anan", 0)
    const { pits, cap, steps } = replay(prev, next, 0)
    expect(pits).toEqual([...next.board.pits])
    expect(cap).toEqual([...next.captured])
    expect(steps.every((s) => s.time >= 0)).toBe(true)
  })

  it("replays to the final board for a long drain that finishes the game", () => {
    const pits = [8, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
    const { prev, next } = applyMove(pits, "A", "anan_anan", 0)
    const { pits: rPits, cap } = replay(prev, next, 0)
    expect(rPits).toEqual([...next.board.pits])
    expect(cap).toEqual([...next.captured])
  })

  it("replays to the final board for an abapa capture sweep", () => {
    const pits = [0, 0, 0, 0, 0, 2, 1, 2, 0, 0, 0, 0]
    const { prev, next } = applyMove(pits, "A", "abapa", 5)
    expect(next.captured[0]).toBe(5)
    const { pits: rPits, cap } = replay(prev, next, 5)
    expect(rPits).toEqual([...next.board.pits])
    expect(cap).toEqual([...next.captured])
  })

  it("produces strictly ordered steps", () => {
    const { prev, next } = applyMove([4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4], "A", "anan_anan", 0)
    const { steps } = replay(prev, next, 0)
    for (let i = 1; i < steps.length; i++) {
      expect(steps[i]!.time).toBeGreaterThanOrEqual(steps[i - 1]!.time)
    }
  })

  it("works from the real starting state", () => {
    const prev = startState("abapa")
    const next = play(prev, { pit: 3 })
    const { pits: rPits, cap } = replay(prev, next, 3)
    expect(rPits).toEqual([...next.board.pits])
    expect(cap).toEqual([...next.captured])
  })
})
