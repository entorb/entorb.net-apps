// @ts-check
import { foreach } from "./calc.js"
import { initLang, lang } from "./i18n.js"
import { recordUse, showCount } from "./stats.js"

const ORIGIN = "foreach"
/** @param {string} id */
const el = (id) => /** @type {HTMLTextAreaElement} */ (document.getElementById(id))

/** English lives in the HTML, keyed by data-i18n */
const DE = {
  title: "Foreach-Generator",
  intro: "Ersetzt %A% und %B% im Text durch jede Zeile der Listen.",
  cartesian: "Kartesisches Produkt",
  or: "oder",
  scalar: "Skalarprodukt",
  separate: "Sätze durch Leerzeilen trennen",
  output: "Erzeugter Text",
  home: "Startseite",
  contact: "Kontakt",
  uses: "Nutzungen",
}
/** calc.js returns English errors, some with numbers @type {[RegExp, string][]} */
const ERRORS_DE = [
  [/^Text too long$/, "Text zu lang"],
  [/^Too long item$/, "Eintrag zu lang"],
  [/^Output text too long$/, "Ausgabetext zu lang"],
  [/^Output is limited to (\d+) lines$/, "Ausgabe ist auf $1 Zeilen begrenzt"],
  [
    /^Scalar product needs equal length lists %A% and %B% \(here (\d+:\d+)\)$/,
    "Skalarprodukt braucht gleich lange Listen %A% und %B% (hier $1)",
  ],
]
let errMsg = ""
/** @param {string} msg */
function showError(msg) {
  errMsg = msg
  el("error").textContent =
    lang() === "de" ? ERRORS_DE.reduce((s, [re, de]) => s.replace(re, de), msg) : msg
}

el("form").addEventListener("submit", (ev) => {
  ev.preventDefault()
  const mode = /** @type {"cartesian" | "scalar"} */ (
    /** @type {HTMLButtonElement} */ (ev.submitter).value
  )
  const separate = /** @type {HTMLInputElement} */ (document.getElementById("separate")).checked
  const r = foreach(el("text").value, el("list-a").value, el("list-b").value, mode, separate)
  showError("error" in r ? r.error : "")
  el("output").value = "text" in r ? r.text : ""
  if ("text" in r) {
    el("output").rows = Math.min(r.text.split("\n").length, 40)
    void recordUse(ORIGIN)
  }
})

initLang(DE, () => showError(errMsg))
void showCount(ORIGIN)
