// @ts-check
import { foreach } from "./calc.js"
import { recordUse, showCount } from "./stats.js"

const ORIGIN = "foreach"
/** @param {string} id */
const el = (id) => /** @type {HTMLTextAreaElement} */ (document.getElementById(id))

el("form").addEventListener("submit", (ev) => {
  ev.preventDefault()
  const mode = /** @type {"cartesian" | "scalar"} */ (
    /** @type {HTMLButtonElement} */ (ev.submitter).value
  )
  const separate = /** @type {HTMLInputElement} */ (document.getElementById("separate")).checked
  const r = foreach(el("text").value, el("list-a").value, el("list-b").value, mode, separate)
  el("error").textContent = "error" in r ? r.error : ""
  el("output").value = "text" in r ? r.text : ""
  if ("text" in r) {
    el("output").rows = Math.min(r.text.split("\n").length, 40)
    void recordUse(ORIGIN)
  }
})

void showCount(ORIGIN)
