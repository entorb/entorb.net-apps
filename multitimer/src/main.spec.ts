import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { beforeAll, describe, expect, it } from "vitest"

const q = <T extends Element>(selector: string) => document.querySelector(selector) as T

function enterTimer(name: string, time: string) {
  q<HTMLInputElement>("#input-name").value = name
  q<HTMLInputElement>("#input-time").value = time
  q<HTMLFormElement>("#form").dispatchEvent(new Event("submit", { cancelable: true }))
}

const storedNames = (): string[] =>
  JSON.parse(localStorage.getItem("eta_vue_mt_data") ?? "[]").map((t: { name: string }) => t.name)

describe("Multi-Timer page", () => {
  beforeAll(async () => {
    const html = readFileSync(resolve(import.meta.dirname, "../index.html"), "utf8")
    document.body.innerHTML = new DOMParser().parseFromString(html, "text/html").body.innerHTML
    await import("./main")
  })

  it("starts without table", () => {
    expect(q<HTMLTableElement>("table").hidden).toBe(true)
  })

  it("moves focus from name to time on enter", () => {
    q<HTMLInputElement>("#input-name").focus()
    q<HTMLInputElement>("#input-name").dispatchEvent(
      new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }),
    )
    expect(document.activeElement).toBe(q<HTMLInputElement>("#input-time"))
  })

  it("adds timers sorted by end, stores them and offers them as recent", () => {
    enterTimer("late", "2h")
    enterTimer("early", "10s")
    expect(storedNames()).toStrictEqual(["early", "late"])
    expect(q<HTMLTableElement>("table").hidden).toBe(false)
    expect([...document.querySelectorAll(".name")].map((e) => e.textContent)).toStrictEqual([
      "early",
      "late",
    ])
    expect(
      [...document.querySelectorAll(".chip button:first-child")].map((e) => e.textContent),
    ).toStrictEqual(["early:10s", "late:2h"])
  })

  it("ignores invalid time", () => {
    enterTimer("bad", "abc")
    expect(storedNames()).toStrictEqual(["early", "late"])
  })

  it("deletes one row, then all", () => {
    q<HTMLButtonElement>("#btn-del-row-0").click()
    expect(storedNames()).toStrictEqual(["late"])
    q<HTMLButtonElement>("#btn-deleteAll").click()
    expect(localStorage.getItem("eta_vue_mt_data")).toBeNull()
    expect(q<HTMLTableElement>("table").hidden).toBe(true)
  })
})
