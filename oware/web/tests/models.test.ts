import { describe, expect, it } from "vitest";
import { startState } from "../src/models";

function seededBoard(): number[] {
  return [4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4, 4];
}

describe("startState", () => {
  it("builds the initial board with Player A to move", () => {
    const state = startState("anan_anan");
    expect(state.board.pits).toEqual(seededBoard());
    expect(state.turn).toBe("A");
    expect(state.captured).toEqual([0, 0]);
    expect(state.status).toBe("ongoing");
    expect(state.winner).toBeNull();
  });

  it("honours a custom first player", () => {
    const state = startState("anan_anan", "B");
    expect(state.turn).toBe("B");
  });

  it("seeds the same starting board for every ruleset", () => {
    for (const ruleset of ["anan_anan", "abapa"] as const) {
      const state = startState(ruleset);
      expect(state.board.pits).toEqual(seededBoard());
      expect(state.ruleset).toBe(ruleset);
    }
  });
});
