import { describe, expect, it } from "vitest";
import type { GameState, Player } from "../src/models";
import { play, tally } from "../src/models";

function state(
  pits: number[],
  turn: Player = "A",
  captured: [number, number] = [0, 0],
): GameState {
  return {
    board: { pits },
    turn,
    ruleset: "anan_anan",
    captured,
    status: "ongoing",
    winner: null,
    movesWithoutCapture: 0,
  };
}

describe("Anan-Anan rules", () => {
  it("sows and switches turn from the initial board", () => {
    const nxt = play(state([4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4]), { pit: 0 });
    expect(nxt.board.pits).toEqual([2, 7, 1, 6, 1, 6, 6, 6, 0, 1, 6, 6]);
    expect(nxt.turn).toBe("B");
    expect(nxt.captured).toEqual([0, 0]);
  });

  it("rejects sowing from an opponent pit", () => {
    const game = state([4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4]);
    expect(() => play(game, { pit: 6 })).toThrow(
      "Pit is not owned by the player to move",
    );
  });

  it("rejects sowing from an empty pit", () => {
    const game = state([0, 0, 0, 0, 0, 0, 4, 4, 4, 4, 4, 4]);
    expect(() => play(game, { pit: 0 })).toThrow("Pit is empty");
  });

  it("rejects a move on a finished game", () => {
    const finished = play(state([4, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0]), {
      pit: 0,
    });
    expect(finished.status).toBe("finished");
    expect(() => play(finished, { pit: 1 })).toThrow(
      "Game is already finished",
    );
  });

  it("captures the final seed for the player to move", () => {
    const nxt = play(state([4, 0, 0, 0, 3, 0, 0, 0, 0, 0, 0, 0]), { pit: 0 });
    expect(nxt.captured).toEqual([7, 0]);
    expect(nxt.board.pits).toEqual(Array(12).fill(0));
    expect(nxt.status).toBe("finished");
    expect(nxt.winner).toBe("A");
  });

  it("captures a mid-move four for the pit owner", () => {
    const nxt = play(state([7, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0, 10]), { pit: 0 });
    expect(nxt.captured).toEqual([0, 4]);
    expect(nxt.status).toBe("ongoing");
    expect(nxt.turn).toBe("B");
  });

  it("relays on from a non-empty last pit", () => {
    const nxt = play(state([2, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 10]), { pit: 0 });
    expect(nxt.board.pits).toEqual([0, 1, 0, 1, 1, 0, 0, 0, 0, 0, 0, 10]);
    expect(nxt.captured).toEqual([0, 0]);
    expect(nxt.turn).toBe("B");
  });

  it("ends the game when a capture passes twenty-four", () => {
    const nxt = play(
      state([4, 2, 2, 2, 3, 2, 2, 2, 2, 2, 2, 1], "A", [22, 0]),
      { pit: 0 },
    );
    expect(nxt.captured).toEqual([26, 0]);
    expect(nxt.status).toBe("finished");
    expect(nxt.winner).toBe("A");
  });

  it("ends an endless relay as a draw", () => {
    const nxt = play(state([1, 0, 1, 2, 0, 1, 0, 2, 1, 0, 1, 0]), { pit: 3 });
    expect(nxt.status).toBe("finished");
    expect(nxt.winner).toBeNull();
  });

  it("ends the game after six moves without a capture", () => {
    let s: GameState = {
      board: { pits: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1] },
      turn: "A",
      ruleset: "anan_anan",
      captured: [7, 3],
      status: "ongoing",
      winner: null,
      movesWithoutCapture: 0,
    };
    const previousTotal = s.captured[0] + s.captured[1];
    for (let move = 1; move < 6; move++) {
      s = tally(s, previousTotal);
      expect(s.status).toBe("ongoing");
      expect(s.movesWithoutCapture).toBe(move);
    }
    s = tally(s, previousTotal);
    expect(s.status).toBe("finished");
    expect(s.winner).toBe("A");
    expect(s.movesWithoutCapture).toBe(6);
  });

  it("resets the stall counter on a capture", () => {
    const s = tally(
      {
        board: { pits: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
        turn: "A",
        ruleset: "anan_anan",
        captured: [7, 4],
        status: "ongoing",
        winner: null,
        movesWithoutCapture: 3,
      },
      9,
    );
    expect(s.movesWithoutCapture).toBe(0);
  });
});
