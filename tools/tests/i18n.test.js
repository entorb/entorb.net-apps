import assert from "node:assert/strict"
import { readdirSync, readFileSync } from "node:fs"
import { test } from "node:test"

const WEB = new URL("../web/", import.meta.url)

for (const html of readdirSync(WEB).filter((f) => f.endsWith(".html"))) {
  test(`i18n keys of ${html} are in its dict`, () => {
    const page = readFileSync(new URL(html, WEB), "utf8")
    const js = readFileSync(new URL(html.replace(".html", ".js"), WEB), "utf8")
    const keys = [...page.matchAll(/data-i18n="(\w+)"/g)].map((m) => m[1])
    assert.ok(keys.length > 0, "page not translated")
    for (const k of keys) assert.match(js, new RegExp(`^\\s+${k}:`, "m"), k)
  })
}
