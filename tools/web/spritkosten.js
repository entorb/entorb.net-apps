// @ts-check
import { parseNum, spritkosten } from "./calc.js"
import { initLang, lang } from "./i18n.js"
import { recordUse, showCount } from "./stats.js"

const ORIGIN = "spritkosten"
/** @type {Record<string, [string, string, number, string]>} verbrauch, preis, kg CO2 per L/kWh, unit; prices ADAC/BDEW Oct 2026, CO2 UBA grid mix 2025 */
const ANTRIEB = {
  benzin: ["7", "2,08", 2.33, "L"],
  diesel: ["6", "2,29", 2.64, "L"],
  elektro: ["18", "0,37", 0.34, "kWh"],
}
/** German lives in the HTML, keyed by data-i18n */
const EN = {
  title: "Car Trip Cost Calculator",
  intro:
    "What does a car trip cost? Defaults: German average, as of October 2026. Fuel or electricity, running costs, depreciation, CO<sub>2</sub> and comparison with ride sharing, car sharing, taxi and train.",
  km: "Distance",
  antrieb: "Drive",
  benzin: "Petrol",
  elektro: "Electric",
  verbrauch: "Consumption",
  preis: "Price at the pump",
  personen: "Persons",
  anpassen: "Adjust",
  dialogTitle: "Adjust defaults",
  laufend: "Running costs",
  posten: "Item",
  betrag: "Amount €",
  jahre: "every X years",
  steuer: "Tax",
  versicherung: "Insurance",
  tuev: "Inspection (TÜV)",
  inspektionen: "Servicing",
  reparaturen: "Repairs/spare parts",
  reifen: "New tyres",
  waesche: "Car wash",
  jahresKm: "Yearly km (without this trip)",
  wertverlust: "Depreciation",
  wertAnfang: "Car value at start of year",
  wertEnde: "Car value at end of year",
  zins: "Interest rate (lost interest)",
  vergleich: "Comparison",
  mfg: "Ride sharing",
  carsharing: "Car sharing",
  carsharingNote: "€/100 km (station-based incl. fuel, without time fee)",
  taxiNote: "€/100 km (without base fare)",
  bahnStrecke: "Train: example distance",
  bahnPreis: "Train: normal price for it",
  bahnKm: "Train: yearly km",
  perYear: "€/year",
  schliessen: "Close",
  ergebnis: "Result",
  kosten: "Costs",
  strecke: "this trip",
  je100: "per 100 km (= ct/km)",
  gesamt: "Total",
  proPerson: "Total per person",
  alternative: "Alternative (all persons)",
  bahnNormal: "Train normal price",
  bahn50: "Train with BahnCard 50",
  bahn25: "Train with BahnCard 25",
  home: "Home",
  contact: "Contact",
  uses: "Calculations",
}
/** @param {string} id */
const el = (id) => /** @type {HTMLInputElement} */ (document.getElementById(id))
/** @param {string} id */
const num = (id) => parseNum(el(id).value)
/** @param {number} x */
const fmt = (x) =>
  x.toLocaleString(lang() === "de" ? "de-DE" : "en-GB", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
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
  el("fuel-label").textContent = (lang() === "de" ? ["Sprit", "Strom"] : ["Fuel", "Electricity"])[
    Number(el("antrieb").value === "elektro")
  ]
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

initLang(EN, calc)
calc()
void showCount(ORIGIN)
