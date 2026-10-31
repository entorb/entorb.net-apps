// @ts-check
import { parseNum, teatime } from "./calc.js"
import { recordUse, showCount } from "./stats.js"

const ORIGIN = "teatime"
/** @param {string} id */
const el = (id) => /** @type {HTMLInputElement} */ (document.getElementById(id))
/** @param {string} id */
const num = (id) => parseNum(el(id).value)
let recorded = false

/** @typedef {"en" | "de"} Lang */
/** English lives in the HTML, keyed by data-i18n */
const DE = {
  title: "Teezeit-Rechner",
  intro:
    "Wie viel kaltes Wasser in heißen Tee (nach x\u00a0min Ziehzeit), um Trinktemperatur und Tassengröße zu erreichen?",
  amount: "Tassengröße",
  target: "Trinktemperatur",
  hot: "Heißer Tee",
  cold: "Kaltes Wasser",
  result: "Ergebnis",
  coldShort: "Kalt",
  hotShort: "Heiß",
  home: "Startseite",
  contact: "Kontakt",
  calcs: "Tees serviert",
}
/** calc.js returns English errors */
const ERRORS_DE = {
  "Hot water must be warmer than cold water": "Heißer Tee muss wärmer als kaltes Wasser sein",
  "Target temperature must be between cold and hot":
    "Zieltemperatur muss zwischen kalt und heiß liegen",
}
/** @type {Lang} */
let lang = "en"
try {
  const saved = localStorage.getItem("teatime-lang")
  lang =
    saved === "de" || saved === "en" ? saved : navigator.language.startsWith("de") ? "de" : "en"
} catch {
  lang = navigator.language.startsWith("de") ? "de" : "en"
}

const i18nEls = /** @type {HTMLElement[]} */ ([...document.querySelectorAll("[data-i18n]")])
// English text from the HTML, captured before the first switch
const EN = new Map(i18nEls.map((e) => [e, e.textContent]))

function applyLang() {
  document.documentElement.lang = lang
  for (const e of i18nEls) {
    const key = /** @type {keyof typeof DE} */ (e.dataset.i18n)
    e.textContent = lang === "de" ? DE[key] : (EN.get(e) ?? "")
  }
  el("lang").textContent = lang.toUpperCase()
  el("lang").setAttribute(
    "aria-label",
    lang === "en" ? "Auf Deutsch umschalten" : "Switch to English",
  )
}

function calc() {
  for (const id of ["amount", "target", "hot", "cold"]) el(`${id}-out`).textContent = el(id).value
  const r = teatime(num("amount"), num("target"), num("hot"), num("cold"))
  const err = "error" in r
  el("error").hidden = !err
  el("result").hidden = err
  if (err) {
    const msg = /** @type {keyof typeof ERRORS_DE} */ (r.error)
    el("error").textContent = lang === "de" ? ERRORS_DE[msg] : msg
  } else {
    const total = r.hot + r.cold
    // round only hot to 25 ml, cold is the rest, so the sum stays the target
    const hotMl = Math.min(total, Math.round(r.hot / 25) * 25)
    // % from the exact split, not from the rounded ml; same trick: cold % is the rest of 100
    const hotPct = total ? (100 * r.hot) / total : 0
    const hotPct5 = Math.round(hotPct / 5) * 5
    for (const [k, pct, pct5, ml] of /** @type {const} */ ([
      ["hot", hotPct, hotPct5, hotMl],
      ["cold", 100 - hotPct, 100 - hotPct5, total - hotMl],
    ])) {
      el(`${k}-label`).textContent = `${Math.round(ml)} ml`
      el(`${k}-pct`).textContent = `${pct5} %`
      el(`${k}-bar`).style.height = `${pct}%`
    }
  }
}

el("form").addEventListener("input", () => {
  calc()
  if (!recorded) void recordUse(ORIGIN)
  recorded = true
})
el("lang").addEventListener("click", () => {
  lang = lang === "en" ? "de" : "en"
  try {
    localStorage.setItem("teatime-lang", lang)
  } catch {
    // storage blocked: toggle still works for this visit
  }
  applyLang()
  calc()
})
el("form").addEventListener("submit", (ev) => ev.preventDefault())

applyLang()
calc()
void showCount(ORIGIN)
