import { describe, expect, it } from "vitest";
import type { GameState, Player, Ruleset } from "../src/models";
import { moveGains, play, startState } from "../src/models";

function state(
  pits: number[],
  turn: Player = "A",
  ruleset: Ruleset = "anan_anan",
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
  };
}

describe("moveGains forecast", () => {
  it("reports zero gains for every pit on the initial board", () => {
    const forecast = moveGains(startState("anan_anan"));
    expect(forecast).toEqual([
      { uiPit: 1, ownGain: 0, oppGain: 0 },
      { uiPit: 2, ownGain: 0, oppGain: 0 },
      { uiPit: 3, ownGain: 0, oppGain: 0 },
      { uiPit: 4, ownGain: 0, oppGain: 0 },
      { uiPit: 5, ownGain: 0, oppGain: 0 },
      { uiPit: 6, ownGain: 0, oppGain: 0 },
    ]);
  });

  it("skips pits the mover cannot play", () => {
    const forecast = moveGains(state([0, 1, 2, 0, 0, 0, 0, 0, 0, 0, 0, 0]));
    expect(forecast).toEqual([
      { uiPit: 2, ownGain: 0, oppGain: 0 },
      { uiPit: 3, ownGain: 0, oppGain: 0 },
    ]);
  });

  it("matches the gain of a move that hands the opponent a capture", () => {
    const game = state([7, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 10]);
    const after = play(game, { pit: 0 });
    const ownGain = after.captured[0] - game.captured[0];
    const oppGain = after.captured[1] - game.captured[1];
    expect(moveGains(game)).toEqual([{ uiPit: 1, ownGain, oppGain }]);
    expect(oppGain).toBe(4);
  });

  it("reports own captures under Abapa", () => {
    const game = state([6, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0], "A", "abapa");
    expect(moveGains(game)).toEqual([{ uiPit: 1, ownGain: 2, oppGain: 0 }]);
  });

  it("maps a B-side pit behind its UI number", () => {
    const game = state([1, 0, 0, 0, 0, 0, 6, 0, 0, 0, 0, 0], "B", "abapa");
    expect(moveGains(game)).toEqual([{ uiPit: 1, ownGain: 2, oppGain: 0 }]);
  });

  it("tracks own and opponent gains for every playable pit", () => {
    const forecast = moveGains(state([1, 3, 0, 5, 3, 0, 3, 0, 0, 0, 0, 0]));
    expect(forecast).toEqual([
      { uiPit: 1, ownGain: 4, oppGain: 0 },
      { uiPit: 2, ownGain: 4, oppGain: 0 },
      { uiPit: 4, ownGain: 4, oppGain: 11 },
      { uiPit: 5, ownGain: 0, oppGain: 4 },
    ]);
  });
});
