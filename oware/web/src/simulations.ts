import ranking from "../../sim-model-ranking.md?raw"
import openings from "../../sim-opening-moves.md?raw"

export function simulationsFor(): HTMLElement[] {
  const out: HTMLElement[] = []
  appendSection(out, ranking)
  out.push(divider())
  appendSection(out, openings)
  return out
}

function appendSection(out: HTMLElement[], text: string): void {
  const lines = text.split("\n")
  for (let i = 0; i < lines.length; i++) {
    const trimmed = (lines[i] ?? "").trim()
    if (trimmed.startsWith("# ")) {
      out.push(heading("h2", unescapeBackslashes(trimmed.slice(2))))
      continue
    }
    if (trimmed.startsWith("## ")) {
      out.push(heading("h3", unescapeBackslashes(trimmed.slice(3))))
      continue
    }
    if (trimmed.startsWith("### ")) {
      out.push(heading("h4", unescapeBackslashes(trimmed.slice(4))))
      continue
    }
    if (trimmed.startsWith("|")) {
      const rows: string[][] = []
      while (i < lines.length && (lines[i] ?? "").trim().startsWith("|")) {
        rows.push(cellsOf(lines[i] ?? ""))
        i += 1
      }
      i -= 1
      out.push(table(rows))
      continue
    }
    if (trimmed.length > 0) {
      const p = document.createElement("p")
      p.textContent = unescapeBackslashes(trimmed)
      out.push(p)
    }
  }
}

function cellsOf(line: string): string[] {
  return line
    .trim()
    .slice(1, -1)
    .split("|")
    .map((c) => unescapeBackslashes(c.trim()))
}

function table(rows: string[][]): HTMLElement {
  const wrap = document.createElement("div")
  wrap.className = "sim-table-wrap"
  const tbl = document.createElement("table")
  tbl.className = "sim-table"
  let isHeader = true
  for (const row of rows) {
    if (row.every((cell) => /^-+$/.test(cell))) continue
    const tr = document.createElement("tr")
    for (const cell of row) {
      const el = document.createElement(isHeader ? "th" : "td")
      el.textContent = cell
      tr.appendChild(el)
    }
    tbl.appendChild(tr)
    isHeader = false
  }
  wrap.appendChild(tbl)
  return wrap
}

function heading(tag: "h2" | "h3" | "h4", text: string): HTMLElement {
  const el = document.createElement(tag)
  el.textContent = text
  return el
}

function divider(): HTMLElement {
  const el = document.createElement("hr")
  el.className = "sim-divider"
  return el
}

function unescapeBackslashes(s: string): string {
  return s.replaceAll("\\\\", "\\")
}
