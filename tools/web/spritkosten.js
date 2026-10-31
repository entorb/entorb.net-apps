// @ts-check
import { parseNum, spritkosten } from "./calc.js"
import { recordUse, showCount } from "./stats.js"

const ORIGIN = "spritkosten"
/** @type {Record<string, [string, string, number, string]>} verbrauch, preis, kg CO2 per L/kWh, unit; prices ADAC/BDEW Oct 2026, CO2 UBA grid mix 2025 */
const ANTRIEB = {
  benzin: ["7", "2,08", 2.33, "L"],
  diesel: ["6", "2,29", 2.64, "L"],
  elektro: ["18", "0,37", 0.34, "kWh"],
}
/** @param {string} id */
const el = (id) => /** @type {HTMLInputElement} */ (document.getElementById(id))
/** @param {string} id */
const num = (id) => parseNum(el(id).value)
/** @param {number} x */
const fmt = (x) => x.toLocaleString("de-DE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })
let recorded = false

function calc() {
  const km = num("km")
  const personen = Number(el("personen").value)
  const fix = /** @type {[number, number][]} */ (
    [...document.querySelectorAll("#fix tr")].map((tr) =>
      [...tr.querySelectorAll("input")].map((i) => parseNum(i.value)),
    )
  )
  const r = spritkosten({
    km,
    verbrauch: num("verbrauch"),
    preis: num("preis"),
    jahresKm: num("jahresKm"),
    fix,
    wertAnfang: num("wertAnfang"),
    wertEnde: num("wertEnde"),
    zins: num("zins"),
    co2Faktor: ANTRIEB[el("antrieb").value][2],
    bahnStrecke: num("bahnStrecke"),
    bahnPreis: num("bahnPreis"),
    bahnKm: num("bahnKm"),
    bc50: num("bc50"),
    bc25: num("bc25"),
  })
  /** @type {[string, number, string][]} id, per 100 km, unit */
  const rows = [
    ["fuel", r.fuel, " €"],
    ["fix", r.fix, " €"],
    ["wert", r.wert, " €"],
    ["total", r.total, " €"],
    ["person", r.total / personen, " €"],
    ["co2", r.co2, " kg"],
    // per seat, while CarSharing and Taxi are per vehicle
    ["mfg", num("mfg") * personen, " €"],
    ["carsharing", num("carsharing"), " €"],
    ["taxi", num("taxi"), " €"],
    ["bahn", r.bahn * personen, " €"],
    ["bahn50", r.bahn50 * personen, " €"],
    ["bahn25", r.bahn25 * personen, " €"],
  ]
  for (const [id, h, unit] of rows) {
    el(`${id}-t`).textContent = fmt((h * km) / 100) + unit
    el(`${id}-h`).textContent = fmt(h) + unit
  }
  el("person-row").hidden = personen === 1
  el("fuel-label").textContent = el("antrieb").value === "elektro" ? "Strom" : "Sprit"
}

el("antrieb").addEventListener("change", () => {
  const [verbrauch, preis, , unit] = ANTRIEB[el("antrieb").value]
  el("verbrauch").value = verbrauch
  el("preis").value = preis
  for (const e of document.querySelectorAll(".einheit")) e.textContent = unit
  calc()
})
el("form").addEventListener("input", () => {
  calc()
  if (!recorded) void recordUse(ORIGIN)
  recorded = true
})
el("form").addEventListener("submit", (ev) => ev.preventDefault())
const dialog = /** @type {HTMLDialogElement} */ (document.getElementById("dialog"))
el("anpassen").addEventListener("click", () => dialog.showModal())
el("schliessen").addEventListener("click", () => dialog.close())

calc()
void showCount(ORIGIN)
