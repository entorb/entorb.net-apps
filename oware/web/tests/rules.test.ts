import { describe, expect, it } from "vitest"
import { rulesFor } from "../src/rules"

const SHARED = [
  "The board has 12 pits holding 48 seeds, 4 per pit.",
  "Pits 1-6 belong to Player A, pits 7-12 to Player B.",
  "On your turn, pick a pit on your side and sow its seeds counter-clockwise, one per pit, skipping the pit you picked from.",
]

const EMPTY_SIDE_ADDON =
  "(Add-on) If your side is empty on your turn, the game ends and the player with more captured seeds wins."
const STALL_ADDON =
  "(Add-on) Six moves without a capture end the game, the player with more captured seeds winning."

describe("rules text", () => {
  it("opens with the shared rules for both rule sets", () => {
    expect(rulesFor("anan_anan").slice(0, SHARED.length)).toEqual(SHARED)
    expect(rulesFor("abapa").slice(0, SHARED.length)).toEqual(SHARED)
  })

  it("appends the empty-side add-on to both rule sets", () => {
    expect(rulesFor("anan_anan")).toContain(EMPTY_SIDE_ADDON)
    expect(rulesFor("abapa")).toContain(EMPTY_SIDE_ADDON)
  })

  it("adds the stall add-on to Anan-Anan only", () => {
    expect(rulesFor("anan_anan")).toContain(STALL_ADDON)
    expect(rulesFor("abapa")).not.toContain(STALL_ADDON)
  })
})
