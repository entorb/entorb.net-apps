// @ts-check
import { passwords } from "./calc.js"
import { recordUse } from "./stats.js"

const ORIGIN = "passgen"
/** @param {string} id */
const input = (id) => /** @type {HTMLInputElement} */ (document.getElementById(id))

/** Integer value of number input id, its default when invalid or out of min/max. @param {string} id */
function intOf(id) {
  const el = input(id)
  const n = Number(el.value)
  const ok = Number.isInteger(n) && n >= Number(el.min) && n <= Number(el.max)
  if (!ok) el.value = el.defaultValue
  return Number(el.value)
}

function generate() {
  const pws = passwords(intOf("len"), intOf("range"), input("special").checked, intOf("count"))
  const out = /** @type {HTMLElement} */ (document.getElementById("out"))
  out.replaceChildren(
    ...pws.map((pw) => {
      const div = document.createElement("div")
      div.textContent = pw
      return div
    }),
  )
  void recordUse(ORIGIN)
}

input("form").addEventListener("submit", (ev) => {
  ev.preventDefault()
  generate()
})

generate()
