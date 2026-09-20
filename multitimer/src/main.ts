import "./style.css"

import {
  clearName,
  createTimer,
  dateToString,
  loadRecent,
  loadTimers,
  parseTimeInput,
  parseTimerLabel,
  progress,
  resetTimer,
  saveRecent,
  saveTimers,
  secondsToString,
  type Timer,
  timerLabel,
  type Unit,
} from "./timers"

const SOUND_URL = "audio/481151__matrixxx__cow-bells-01.mp3"
const STATS_URL = "https://entorb.net/web-stats-json.php?origin=eta-mt&action="
const ON_PROD = globalThis.location.hostname === "entorb.net"

const q = <T extends Element>(selector: string, root: ParentNode = document) =>
  root.querySelector(selector) as T

const form = q<HTMLFormElement>("#form")
const inputName = q<HTMLInputElement>("#input-name")
const inputTime = q<HTMLInputElement>("#input-time")
const recentBox = q<HTMLElement>("#recent")
const table = q<HTMLTableElement>("table")
const rows = q<HTMLTableSectionElement>("tbody")
const rowTemplate = q<HTMLTemplateElement>("#row-template")

let timers = loadTimers()
let recent = loadRecent()
// timers that already rang (or were already over when the page was opened)
const finished = new WeakSet<Timer>(timers.filter((t) => t.dateEnd.getTime() <= Date.now()))
let bars: Array<{ timer: Timer; left: HTMLElement; fill: HTMLElement }> = []

function button(text: string, onClick: () => void, ariaLabel?: string) {
  const btn = document.createElement("button")
  btn.type = "button"
  btn.textContent = text
  btn.onclick = onClick
  if (ariaLabel != null) btn.ariaLabel = ariaLabel
  return btn
}

function playSound() {
  void new Audio(SOUND_URL).play().catch(() => undefined)
}

function tick() {
  const now = Date.now()
  for (const { timer, left, fill } of bars) {
    const { remaining, percent } = progress(timer, now)
    left.textContent = secondsToString(remaining)
    fill.style.width = `${percent * 100}%`
    if (percent === 1 && !finished.has(timer)) {
      finished.add(timer)
      playSound()
    }
  }
}

function renderRow(timer: Timer, index: number) {
  const tr = q<HTMLTableRowElement>("tr", rowTemplate.content.cloneNode(true) as DocumentFragment)
  q(".name", tr).textContent = timer.name
  q(".end", tr).textContent = dateToString(timer.dateEnd)
  q<HTMLButtonElement>(".reset", tr).onclick = () => {
    resetTimer(timer, Date.now())
    finished.delete(timer)
    save()
  }
  const del = q<HTMLButtonElement>(".del", tr)
  del.id = `btn-del-row-${index}`
  del.onclick = () => {
    timers = timers.filter((t) => t !== timer)
    save()
  }
  bars.push({ timer, left: q(".left", tr), fill: q(".fill", tr) })
  return tr
}

function renderTable() {
  // end dates only change on add/reset, so sorting here is enough
  timers.sort((a, b) => a.dateEnd.getTime() - b.dateEnd.getTime())
  table.hidden = timers.length === 0
  bars = []
  rows.replaceChildren(...timers.map(renderRow))
  tick()
}

function save() {
  renderTable() // sorts
  saveTimers(timers)
}

function renderRecent() {
  recentBox.replaceChildren(
    ...recent.map((label) => {
      const chip = document.createElement("span")
      chip.className = "chip"
      chip.append(
        button(label, () => {
          const { name, time, unit } = parseTimerLabel(label)
          addTimer(name, time, unit)
        }),
        button(
          "×",
          () => {
            recent = recent.filter((l) => l !== label)
            saveRecent(recent)
            renderRecent()
          },
          `Remove ${label}`,
        ),
      )
      return chip
    }),
  )
}

function addTimer(name: string, time: number, unit: Unit) {
  timers.push(createTimer(name, time, unit))
  save()
  if (ON_PROD) void fetch(`${STATS_URL}write`).catch(() => undefined)
}

function addViaInput() {
  const parsed = parseTimeInput(inputTime.value)
  inputTime.value = ""
  if (parsed == null) return

  const name = clearName(inputName.value) || "Timer"
  inputName.value = ""
  addTimer(name, parsed.time, parsed.unit)

  const label = timerLabel(name, parsed.time, parsed.unit)
  if (!recent.includes(label)) {
    recent = [...recent, label].sort((a, b) => a.localeCompare(b))
    saveRecent(recent)
    renderRecent()
  }
}

async function showStats() {
  if (!ON_PROD) return
  const stats = await fetch(`${STATS_URL}read`)
    .then((r) => (r.ok ? r.json() : undefined))
    .catch(() => undefined)
  if (stats == null) return
  const el = q<HTMLElement>("#stats")
  el.textContent = `${stats.accesscounts7} timers in the last 7 days, ${stats.accesscounts} in total since ${stats.firstaccess}.`
  el.hidden = false
}

form.addEventListener("submit", (e) => {
  e.preventDefault()
  addViaInput()
})
inputName.addEventListener("keydown", (e) => {
  if (e.key !== "Enter") return
  e.preventDefault() // no submit, continue with time
  inputTime.focus()
})
inputTime.addEventListener("blur", addViaInput)
q<HTMLButtonElement>("#btn-resetAll").onclick = () => {
  for (const timer of timers) {
    resetTimer(timer, Date.now())
    finished.delete(timer)
  }
  save()
}
q<HTMLButtonElement>("#btn-deleteAll").onclick = () => {
  timers = []
  save()
}

renderRecent()
renderTable()
globalThis.setInterval(tick, 1000)
void showStats()
