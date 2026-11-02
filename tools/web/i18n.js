// @ts-check
// DE/EN switch: the HTML holds one language, the page's dict the other, keyed by data-i18n

/** @typedef {"en" | "de"} Lang */
const KEY = "tools-lang"
const base = /** @type {Lang} */ (document.documentElement.lang)
/** @type {Lang} */
let current = navigator.language.startsWith("de") ? "de" : "en"
try {
  const saved = localStorage.getItem(KEY)
  if (saved === "de" || saved === "en") current = saved
} catch {
  // storage blocked: browser language
}

export const lang = () => current

/**
 * Translate [data-i18n] elements and wire the #lang button.
 * @param {Record<string, string>} dict texts of the language not in the HTML; static, may hold markup
 * @param {() => void} [onChange] re-render JS-made texts after a switch
 */
export function initLang(dict, onChange) {
  const els = /** @type {HTMLElement[]} */ ([...document.querySelectorAll("[data-i18n]")])
  const orig = new Map(els.map((e) => [e, e.innerHTML]))
  const btn = /** @type {HTMLButtonElement} */ (document.getElementById("lang"))
  const apply = () => {
    document.documentElement.lang = current
    for (const e of els) {
      const other = dict[e.dataset.i18n ?? ""]
      // innerHTML ok: only static dict or original HTML, never user text
      e.innerHTML = current === base || other === undefined ? (orig.get(e) ?? "") : other
    }
    btn.textContent = current.toUpperCase()
    btn.setAttribute(
      "aria-label",
      current === "en" ? "Auf Deutsch umschalten" : "Switch to English",
    )
  }
  btn.addEventListener("click", () => {
    current = current === "en" ? "de" : "en"
    try {
      localStorage.setItem(KEY, current)
    } catch {
      // storage blocked: toggle still works for this visit
    }
    apply()
    onChange?.()
  })
  apply()
}
