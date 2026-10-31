// @ts-check
import { convertLight, parseNum, round } from "./calc.js"
import { recordUse, showCount } from "./stats.js"

const ORIGIN = "nm2eV"
/** @type {[import("./calc.js").LightUnit, string, number][]} unit, label, decimals */
const UNITS = [
  ["nm", "nm", 2],
  ["eV", "eV", 4],
  ["cm", "cm<sup>-1</sup>", 0],
  ["THz", "THz", 2],
]
/** @param {string} id */
const el = (id) => /** @type {HTMLInputElement} */ (document.getElementById(id))

el("form").addEventListener("submit", (ev) => {
  ev.preventDefault()
  const unit = /** @type {import("./calc.js").LightUnit} */ (el("unit").value)
  const p1 = parseNum(el("pnt1").value)
  const p2 = parseNum(el("pnt2").value)
  el("pnt1").value = String(p1)
  el("pnt2").value = String(p2)
  const r1 = p1 > 0 ? convertLight(unit, p1) : null
  const r2 = p2 > 0 ? convertLight(unit, p2) : null

  // only numbers and fixed labels go into the html
  el("rows").innerHTML = UNITS.map(([u, label, d]) => {
    const v1 = r1 ? r1[u] : 0
    const v2 = r2 ? r2[u] : 0
    const diff = r1 && r2 ? v2 - v1 : 0
    const cells = [v1, v2, diff].map((v) => `<td class="num">${round(v, d)}</td>`).join("")
    return `<tr>${cells}<th>${label}</th></tr>`
  }).join("")
  el("result").hidden = false
  void recordUse(ORIGIN)
})

void showCount(ORIGIN)
