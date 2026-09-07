import { describe, expect, it } from "vitest";
import type { GameState, Player } from "../src/models";
import { play, startState } from "../src/models";

function state(
  pits: number[],
  turn: Player = "A",
  captured: [number, number] = [0, 0],
): GameState {
  return {
    board: { pits },
    turn,
    ruleset: "abapa",
    captured,
    status: "ongoing",
    winner: null,
    movesWithoutCapture: 0,
  };
}

describe("Abapa rules", () => {
  it("sows a single pass and switches turn from the initial board", () => {
    const nxt = play(startState("abapa"), { pit: 0 });
    expect(nxt.board.pits).toEqual([0, 5, 5, 5, 5, 4, 4, 4, 4, 4, 4, 4]);
    expect(nxt.turn).toBe("B");
    expect(nxt.captured).toEqual([0, 0]);
    expect(nxt.status).toBe("ongoing");
  });

  it("does not relay from a non-empty landing pit", () => {
    const nxt = play(state([3, 0, 0, 2, 0, 0, 0, 0, 0, 0, 0, 0]), { pit: 0 });
    expect(nxt.board.pits).toEqual([0, 1, 1, 3, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(nxt.captured).toEqual([0, 0]);
    expect(nxt.turn).toBe("B");
  });

  it("captures two on the opponent side", () => {
    const nxt = play(state([6, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0]), { pit: 0 });
    expect(nxt.board.pits).toEqual([0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0]);
    expect(nxt.captured).toEqual([2, 0]);
    expect(nxt.turn).toBe("B");
  });

  it("captures three on the opponent side", () => {
    const nxt = play(state([6, 0, 0, 0, 0, 0, 2, 0, 0, 0, 0, 0]), { pit: 0 });
    expect(nxt.board.pits).toEqual([0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0]);
    expect(nxt.captured).toEqual([3, 0]);
  });

  it("never captures on the mover own side", () => {
    const nxt = play(state([3, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0]), { pit: 0 });
    expect(nxt.board.pits).toEqual([0, 1, 1, 2, 0, 0, 0, 0, 0, 0, 0, 0]);
    expect(nxt.captured).toEqual([0, 0]);
  });

  it("does not capture a landing pit of four", () => {
    const nxt = play(state([6, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 0]), { pit: 0 });
    expect(nxt.board.pits).toEqual([0, 1, 1, 1, 1, 1, 4, 0, 0, 0, 0, 0]);
    expect(nxt.captured).toEqual([0, 0]);
  });

  it("ends the game when a capture passes twenty-four", () => {
    const nxt = play(
      state([0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2], "B", [0, 23]),
      {
        pit: 11,
      },
    );
    expect(nxt.captured).toEqual([0, 25]);
    expect(nxt.status).toBe("finished");
    expect(nxt.winner).toBe("B");
  });

  it("sweeps the chain of preceding twos and threes", () => {
    const nxt = play(state([7, 0, 0, 0, 0, 0, 2, 2, 0, 0, 0, 0]), { pit: 0 });
    expect(nxt.board.pits).toEqual([0, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0]);
    expect(nxt.captured).toEqual([6, 0]);
  });

  it("stops the chain sweep at the mover own side", () => {
    const nxt = play(state([7, 0, 0, 0, 0, 3, 2, 2, 0, 0, 0, 0]), { pit: 0 });
    expect(nxt.board.pits).toEqual([0, 1, 1, 1, 1, 4, 0, 0, 0, 0, 0, 0]);
    expect(nxt.captured).toEqual([6, 0]);
  });

  it("continues at exactly twenty-four captured", () => {
    const nxt = play(
      state([0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2], "B", [0, 22]),
      {
        pit: 11,
      },
    );
    expect(nxt.captured).toEqual([0, 24]);
    expect(nxt.status).toBe("ongoing");
    expect(nxt.winner).toBeNull();
  });

  it("ends a twenty-four all as a draw", () => {
    const nxt = play(
      state([0, 0, 0, 0, 0, 1, 1, 0, 0, 0, 0, 0], "A", [22, 24]),
      {
        pit: 5,
      },
    );
    expect(nxt.captured).toEqual([24, 24]);
    expect(nxt.status).toBe("finished");
    expect(nxt.winner).toBeNull();
  });
});
