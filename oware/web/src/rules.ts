import source from "../../rules-this-game.md?raw"
import type { Ruleset } from "./models"

interface Sections {
  shared: string[]
  anan: string[]
  abapa: string[]
}

export function rulesFor(ruleset: Ruleset): string[] {
  const { shared, anan, abapa } = parse(source)
  return ruleset === "anan_anan" ? [...shared, ...anan] : [...shared, ...abapa]
}

function parse(text: string): Sections {
  const sections: Sections = { shared: [], anan: [], abapa: [] }
  let section: keyof Sections | null = null
  for (const line of text.split("\n")) {
    const trimmed = line.trim()
    const heading = /^## (.+)$/.exec(trimmed)
    if (heading !== null) {
      section = keyOf(heading[1] ?? "")
      continue
    }
    if (section !== null && trimmed.startsWith("- ")) {
      sections[section].push(trimmed.slice(2))
    }
  }
  return sections
}

function keyOf(name: string): keyof Sections | null {
  switch (name) {
    case "Shared":
      return "shared"
    case "Anan-Anan":
      return "anan"
    case "Abapa":
      return "abapa"
    default:
      return null
  }
}
