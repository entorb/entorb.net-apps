// @ts-check
import { convertDoping, parseNum } from "./calc.js"
import { recordUse, showCount } from "./stats.js"

const ORIGIN = "dopingconverter"
/** @param {string} id */
const input = (id) => /** @type {HTMLInputElement} */ (document.getElementById(id))
const form = /** @type {HTMLFormElement} */ (document.getElementById("form"))
const error = /** @type {HTMLElement} */ (document.getElementById("error"))

form.addEventListener("submit", (ev) => {
  ev.preventDefault()
  const from = /** @type {"wt" | "mol" | "mr"} */ (
    /** @type {HTMLButtonElement} */ (ev.submitter).value
  )
  const mmh = parseNum(input("mmh").value)
  const mmd = parseNum(input("mmd").value)
  const value = parseNum(input(from).value)
  error.textContent =
    mmh === 0 || mmd === 0 ? "Enter Molar Mass!" : value === 0 ? "Enter Value!" : ""
  if (error.textContent) return

  const r = convertDoping(from, value, mmh, mmd)
  // e.g. 100 wt% divides by zero
  if (![r.wt, r.mol, r.mr].every((x) => Number.isFinite(x) && x >= 0)) {
    error.textContent = "Value out of range!"
    return
  }
  input("wt").value = r.wt.toFixed(2)
  input("mol").value = r.mol.toFixed(2)
  input("mr").value = r.mr.toFixed(5)
  void recordUse(ORIGIN)
})

void showCount(ORIGIN)
