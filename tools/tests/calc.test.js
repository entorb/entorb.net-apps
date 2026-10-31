import assert from "node:assert/strict"
import { test } from "node:test"
import { convertDoping, convertLight, foreach, parseNum, passwords, round } from "../web/calc.js"

test("parseNum", () => {
  assert.equal(parseNum("1,5"), 1.5)
  assert.equal(parseNum("-3 nm"), 3)
  assert.equal(parseNum(""), 0)
})

test("convertLight 500 nm", () => {
  const r = convertLight("nm", 500)
  assert.equal(round(r.eV, 4), 2.4797)
  assert.equal(round(r.cm, 0), 20000)
  assert.equal(round(r.THz, 2), 599.58)
  for (const unit of /** @type {const} */ (["eV", "cm", "THz"])) {
    assert.equal(round(convertLight(unit, r[unit]).nm, 6), 500)
  }
})

test("convertDoping round trip", () => {
  const r = convertDoping("wt", 10, 720.642, 276.149)
  assert.ok(Math.abs(convertDoping("mol", r.mol, 720.642, 276.149).wt - 10) < 1e-9)
  assert.ok(Math.abs(convertDoping("mr", r.mr, 720.642, 276.149).wt - 10) < 1e-9)
  // equal molar masses: wt% == mol%
  assert.ok(Math.abs(convertDoping("wt", 20, 100, 100).mol - 20) < 1e-9)
})

test("foreach cartesian", () => {
  assert.deepEqual(foreach("%A%-%B%", "a\n\nb", "1\r\n2", "cartesian", true), {
    text: "a-1\na-2\n\nb-1\nb-2",
  })
  assert.deepEqual(foreach("x%A%", "$&", "", "cartesian", false), { text: "x$&" })
})

test("foreach scalar", () => {
  assert.deepEqual(foreach("%A%=%B%", "a\nb", "1\n2", "scalar", false), { text: "a=1\nb=2" })
  assert.ok("error" in foreach("%A%=%B%", "a\nb", "1", "scalar", false))
})

test("passwords", () => {
  const pws = passwords(8, 3, true, 50)
  assert.equal(pws.length, 50)
  for (const pw of pws) {
    assert.ok(pw.length >= 8 && pw.length <= 10)
    assert.match(pw, /[a-z]/)
    assert.match(pw, /[A-Z]/)
    assert.match(pw, /\d/)
  }
  assert.ok(passwords(12, 0, false, 20).every((pw) => /^[a-zA-Z0-9]{12}$/.test(pw)))
})
