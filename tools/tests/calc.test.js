import assert from "node:assert/strict"
import { test } from "node:test"
import {
  convertDoping,
  convertLight,
  foreach,
  parseNum,
  passwords,
  round,
  spritkosten,
  teatime,
} from "../web/calc.js"

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

const EXCEL = {
  km: 250,
  verbrauch: 7,
  preis: 1.93,
  jahresKm: 6000,
  fix: /** @type {[number, number][]} */ ([
    [94, 1],
    [277, 1],
    [90, 2],
    [0, 2],
    [100, 1],
    [100, 5],
    [10, 0.5],
  ]),
  wertAnfang: 1250,
  wertEnde: 1200,
  zins: 1,
  co2Faktor: 2.33,
  bahnStrecke: 1000,
  bahnPreis: 180,
  bahnKm: 3000,
  bc50: 234,
  bc25: 57,
}

test("spritkosten matches Excel", () => {
  const r = spritkosten(EXCEL)
  assert.equal(round((r.fuel * EXCEL.km) / 100, 3), 33.775)
  assert.equal(round(r.fix, 3), 8.896)
  assert.equal(round(r.wert, 3), 1)
  assert.equal(round((r.total * EXCEL.km) / 100, 3), 58.515)
  assert.equal(round(r.co2, 2), 16.31)
  assert.equal(round(r.bahn, 2), 18)
  assert.equal(round(r.bahn50, 2), 16.8)
  assert.equal(round(r.bahn25, 2), 15.4)
})

test("spritkosten empty inputs give 0, not NaN", () => {
  const zero = Object.fromEntries(Object.keys(EXCEL).map((k) => [k, 0]))
  const r = spritkosten({ ...EXCEL, ...zero, fix: [[100, 0]] })
  assert.ok(Object.values(r).every((x) => x === 0))
})

test("teatime", () => {
  assert.deepEqual(teatime(300, 60, 80, 15), { hot: (300 * 45) / 65, cold: 300 - (300 * 45) / 65 })
  assert.deepEqual(teatime(200, 50, 90, 10), { hot: 100, cold: 100 })
  assert.ok("error" in teatime(200, 90, 80, 15))
  assert.ok("error" in teatime(200, 15, 15, 15))
})
