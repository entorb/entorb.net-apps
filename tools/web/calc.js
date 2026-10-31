// @ts-check
// pure logic of all tools, no DOM

/**
 * Parse user number input like the old PHP: comma as decimal point, drop all else.
 * @param {string} s
 */
export function parseNum(s) {
  const n = Number.parseFloat(s.replaceAll(",", ".").replace(/[^.\d]+/g, ""))
  return Number.isNaN(n) ? 0 : n
}

/**
 * @param {number} x
 * @param {number} digits
 */
export function round(x, digits) {
  const f = 10 ** digits
  return Math.round(x * f) / f
}

// --- doping converter ---

/**
 * Convert a dopant concentration, given as wt%, mol% or molar ratio.
 * @param {"wt" | "mol" | "mr"} from
 * @param {number} value wt and mol in %
 * @param {number} mmHost molar mass of host
 * @param {number} mmDopant molar mass of dopant
 * @returns {{wt: number, mol: number, mr: number}} wt and mol in %
 */
export function convertDoping(from, value, mmHost, mmDopant) {
  let mr = value
  if (from === "wt") mr = 1 / ((mmDopant / mmHost) * (100 / value - 1))
  if (from === "mol") mr = value / 100 / (1 - value / 100)
  return {
    wt: 100 / (1 + mmHost / mmDopant / mr),
    mol: (100 * mr) / (1 + mr),
    mr,
  }
}

// --- nm eV converter ---

const C = 299792458
const E = 1.60217733e-19
const H = 6.6260755e-34

/** @typedef {"nm" | "eV" | "cm" | "THz"} LightUnit */

/**
 * @param {LightUnit} unit
 * @param {number} value > 0
 * @returns {Record<LightUnit, number>}
 */
export function convertLight(unit, value) {
  /** nm to eV and eV to nm is the same formula @param {number} x */
  const nmEv = (x) => (C * H) / E / (x * 1e-9)
  let eV = value
  if (unit === "nm") eV = nmEv(value)
  if (unit === "cm") eV = nmEv(1e7 / value)
  if (unit === "THz") eV = (value * H) / E / 1e-12
  const nm = nmEv(eV)
  return { nm, eV, cm: 1e7 / nm, THz: ((eV * E) / H) * 1e-12 }
}

// --- foreach generator ---

export const FOREACH_MAX_LINES = 100000
export const FOREACH_MAX_CHARS = 10000

/**
 * Fill %A% and %B% of template with all combinations (cartesian) or pairwise (scalar).
 * @param {string} template
 * @param {string} listA newline separated
 * @param {string} listB newline separated
 * @param {"cartesian" | "scalar"} mode
 * @param {boolean} separate empty line between sets
 * @returns {{text: string} | {error: string}}
 */
export function foreach(template, listA, listB, mode, separate) {
  /** @param {string} s */
  const items = (s) => s.split(/\r?\n/).filter((l) => l.trim() !== "")
  const a = template.includes("%A%") ? items(listA) : ["1"]
  const b = template.includes("%B%") ? items(listB) : ["1"]

  if (template.length > FOREACH_MAX_CHARS) return { error: "Text too long" }
  if ([...a, ...b].some((x) => x.length > FOREACH_MAX_CHARS)) return { error: "Too long item" }

  // function replacement: items containing "$&" etc. must stay literal
  /** @param {string} x @param {string} y */
  const fill = (x, y) => template.replaceAll("%A%", () => x).replaceAll("%B%", () => y)

  /** @type {string[]} */
  const out = []
  if (mode === "cartesian") {
    if (a.length * b.length > FOREACH_MAX_LINES) {
      return { error: `Output is limited to ${FOREACH_MAX_LINES} lines` }
    }
    for (const x of a) {
      for (const y of b) out.push(fill(x, y))
      if (separate) out.push("")
    }
  } else {
    if (a.length !== b.length) {
      return {
        error: `Scalar product needs equal length lists %A% and %B% (here ${a.length}:${b.length})`,
      }
    }
    if (a.length > FOREACH_MAX_LINES) {
      return { error: `Output is limited to ${FOREACH_MAX_LINES} lines` }
    }
    a.forEach((x, i) => {
      out.push(fill(x, b[i]))
    })
    if (separate) out.push("")
  }
  if (out.some((l) => l.length > FOREACH_MAX_CHARS)) return { error: "Output text too long" }
  if (separate) out.pop()
  return { text: out.join("\n") }
}

// --- password generator ---

const ALNUM = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
const SPECIAL = "()[]{}.,!?:;+-*/=$@%&#"

/**
 * Unbiased random int in [0, n) from the crypto RNG.
 * @param {number} n
 */
function randInt(n) {
  const limit = 2 ** 32 - (2 ** 32 % n)
  const buf = new Uint32Array(1)
  do crypto.getRandomValues(buf)
  while (buf[0] >= limit)
  return buf[0] % n
}

/**
 * Passwords of length len + [0, range), each containing a-z, A-Z and 0-9.
 * @param {number} len
 * @param {number} range
 * @param {boolean} special
 * @param {number} count
 */
export function passwords(len, range, special, count) {
  const chars = special ? ALNUM + SPECIAL : ALNUM
  return Array.from({ length: count }, () => {
    const n = len + (range > 0 ? randInt(range) : 0)
    let pw = ""
    while (!/[a-z]/.test(pw) || !/[A-Z]/.test(pw) || !/\d/.test(pw)) {
      pw = Array.from({ length: n }, () => chars[randInt(chars.length)]).join("")
    }
    return pw
  })
}
