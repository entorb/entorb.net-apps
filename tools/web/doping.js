// @ts-check
import { convertDoping, parseNum } from "./calc.js"
import { initLang, lang } from "./i18n.js"
import { recordUse, showCount } from "./stats.js"

const ORIGIN = "dopingconverter"
/** @param {string} id */
const input = (id) => /** @type {HTMLInputElement} */ (document.getElementById(id))
const form = /** @type {HTMLFormElement} */ (document.getElementById("form"))
const error = /** @type {HTMLElement} */ (document.getElementById("error"))

/** English lives in the HTML, keyed by data-i18n */
const DE = {
  title: "Dotierungs-Umrechner",
  intro: "Dotanden-Konzentration zwischen Gewichts-%, Mol-% und Molverhältnis umrechnen.",
  mmh: "Molmasse Matrix",
  mmd: "Molmasse Dotand",
  wt: "Gewichts-% (wt%)",
  mol: "Mol-% (mol%)",
  mr: "Molverhältnis (MR)",
  convert: "Umrechnen",
  materials: "Einige am IAPP verwendete Materialien",
  molarMass: "Molmasse",
  home: "Startseite",
  contact: "Kontakt",
  uses: "Umrechnungen",
}
const ERRORS_DE = {
  "Enter Molar Mass!": "Molmasse eingeben!",
  "Enter Value!": "Wert eingeben!",
  "Value out of range!": "Wert außerhalb des Bereichs!",
}
/** @type {keyof typeof ERRORS_DE | ""} */
let errMsg = ""
/** @param {keyof typeof ERRORS_DE | ""} msg */
function showError(msg) {
  errMsg = msg
  error.textContent = msg && lang() === "de" ? ERRORS_DE[msg] : msg
}

form.addEventListener("submit", (ev) => {
  ev.preventDefault()
  const from = /** @type {"wt" | "mol" | "mr"} */ (
    /** @type {HTMLButtonElement} */ (ev.submitter).value
  )
  const mmh = parseNum(input("mmh").value)
  const mmd = parseNum(input("mmd").value)
  const value = parseNum(input(from).value)
  showError(mmh === 0 || mmd === 0 ? "Enter Molar Mass!" : value === 0 ? "Enter Value!" : "")
  if (errMsg) return

  const r = convertDoping(from, value, mmh, mmd)
  // e.g. 100 wt% divides by zero
  if (![r.wt, r.mol, r.mr].every((x) => Number.isFinite(x) && x >= 0)) {
    showError("Value out of range!")
    return
  }
  input("wt").value = r.wt.toFixed(2)
  input("mol").value = r.mol.toFixed(2)
  input("mr").value = r.mr.toFixed(5)
  void recordUse(ORIGIN)
})

initLang(DE, () => showError(errMsg))
void showCount(ORIGIN)
