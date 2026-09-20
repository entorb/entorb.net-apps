import { beforeEach, describe, expect, it } from "vitest"

import {
  clearName,
  createTimer,
  loadRecent,
  loadTimers,
  parseTimeInput,
  parseTimerLabel,
  progress,
  resetTimer,
  saveRecent,
  saveTimers,
  secondsToString,
  timerLabel,
} from "./timers"

describe("parseTimeInput", () => {
  it.each([
    ["20", 20, "min"],
    ["2,5", 2.5, "min"],
    ["20m", 20, "min"],
    ["10s", 10, "sec"],
    ["1.2h", 1.2, "hour"],
    ["1,2d", 1.2, "day"],
    ["1:12m", 1.2, "min"],
    ["1:30", 1.5, "min"],
    [" 5 m ", 5, "min"],
  ])("%s", (input, time, unit) => {
    expect(parseTimeInput(input)).toStrictEqual({ time, unit })
  })

  it.each(["", "abc", "m", "0", "-5"])("rejects '%s'", (input) => {
    expect(parseTimeInput(input)).toBeUndefined()
  })
})

describe("createTimer", () => {
  it.each([
    ["sec", 10, 10],
    ["min", 20, 1200],
    ["hour", 3, 3 * 3600],
    ["day", 2, 2 * 24 * 3600],
  ] as const)("%s", (unit, time, seconds) => {
    const t = createTimer("x", time, unit, 1_000_000)
    expect(t.dateEnd.getTime() - t.dateStart.getTime()).toBe(seconds * 1000)
  })
})

describe("progress and reset", () => {
  const timer = createTimer("x", 100, "sec", 0)

  it("running", () => {
    expect(progress(timer, 25_000)).toStrictEqual({ remaining: 75, percent: 0.25 })
  })

  it("finished", () => {
    expect(progress(timer, 100_000)).toStrictEqual({ remaining: 0, percent: 1 })
  })

  it("reset keeps duration", () => {
    resetTimer(timer, 500_000)
    expect(timer.dateStart.getTime()).toBe(500_000)
    expect(timer.dateEnd.getTime()).toBe(600_000)
  })
})

describe("timer label", () => {
  it("timerLabel abc:123h", () => {
    expect(timerLabel(' a:b"c ', 123, "hour")).toBe("abc:123h")
  })

  it("parseTimerLabel abc:123h", () => {
    expect(parseTimerLabel("abc:123h")).toStrictEqual({ name: "abc", time: 123, unit: "hour" })
  })

  it("roundtrip", () => {
    expect(parseTimerLabel(timerLabel("t", 1.5, "day"))).toStrictEqual({
      name: "t",
      time: 1.5,
      unit: "day",
    })
  })
})

describe("clearName", () => {
  it.each([
    [" ab c ", "ab c"],
    ["a:b::c d", "abc d"],
    ["a//b||c\\\\d", "abcd"],
    ["a()b[]c{}d", "abcd"],
  ])("%s", (input, expected) => {
    expect(clearName(input)).toBe(expected)
  })
})

describe("secondsToString", () => {
  it.each([
    [5, "5s"],
    [125, "2m 5s"],
    [15 * 60, "15m"],
    [3 * 3600 + 5 * 60, "3h 5m"],
    [2 * 86_400 + 3600 + 60, "2d 1h 1m"],
  ])("%s", (seconds, expected) => {
    expect(secondsToString(seconds)).toBe(expected)
  })
})

describe("storage", () => {
  beforeEach(() => localStorage.clear())

  it("timers roundtrip, empty list removes key", () => {
    const timers = [createTimer("a", 1, "min", 0), createTimer("b", 2, "min", 0)]
    saveTimers(timers)
    expect(loadTimers()).toStrictEqual(timers)
    saveTimers([])
    expect(localStorage.getItem("eta_vue_mt_data")).toBeNull()
  })

  it("recent roundtrip", () => {
    saveRecent(["a:1m"])
    expect(loadRecent()).toStrictEqual(["a:1m"])
  })

  it("corrupt storage falls back to empty", () => {
    localStorage.setItem("eta_vue_mt_data", "{oops")
    expect(loadTimers()).toStrictEqual([])
  })
})
