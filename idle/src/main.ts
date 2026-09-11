import "./style.css"
import {
  bestSequences,
  type Evaluation,
  evaluate,
  formatDeltaPlain,
  formatDurationLong,
  formatMinutesOnly,
  formatNumber,
  paybackSeconds,
} from "./calc"
import { options, state } from "./const"
import { fetchGameCount, recordStartedGame } from "./stats"
import { load, save } from "./storage"

function mustFind<T extends HTMLElement>(sel: string, root: ParentNode = document): T {
  const el = root.querySelector<T>(sel)
  if (!el) throw new Error(`Missing element: ${sel}`)
  return el
}

const app = mustFind<HTMLDivElement>("#app")

app.innerHTML = `
  <main class="ledger">
    <header class="ledger__head">
      <h1>Idle Time-to-target</h1>
      <div class="toolbar">
        <button type="button" id="scale-up" class="btn-scale">×1000</button>
        <button type="button" id="scale-down" class="btn-scale">÷1000</button>
      </div>
    </header>

    <section class="corebox" aria-label="Current standing">
      <label class="field">
        <span>Target amount</span>
        <input type="text" id="in-target" inputmode="decimal" autocomplete="off" spellcheck="false" tabindex="1" />
        <span class="baseline" id="baseline" aria-live="polite"></span>
      </label>
      <label class="field">
        <span>Current amount</span>
        <input type="text" id="in-amount" inputmode="decimal" autocomplete="off" spellcheck="false" tabindex="2" />
      </label>
      <label class="field">
        <span>Current gain / s</span>
        <input type="text" id="in-gain" inputmode="decimal" autocomplete="off" spellcheck="false" tabindex="3" />
        <span class="gain-rates" id="gain-rates"></span>
      </label>
    </section>

    <section class="options" aria-label="Investment options">
      <div class="options__head">
        <h2>Investment options</h2>
        <button type="button" id="add-option">+ add option</button>
      </div>
      <div class="table" role="table">
        <div class="row row--head" role="row">
<span role="columnheader">Option</span>
          <span role="columnheader">Gain / s</span>
          <span role="columnheader">Cost</span>
          <span role="columnheader">Payback</span>
          <span role="columnheader">Wait to afford</span>
          <span role="columnheader" class="head-ttt">
            <span>Time to target</span>
          </span>
        </div>
        <div id="rows"></div>
      </div>
    </section>

<section class="verdict" id="verdict" aria-live="polite"></section>

    <section class="sequences" id="sequences" aria-live="polite" hidden>
      <h2>Best purchase sequences</h2>
      <ol class="seq-list" id="seq-list"></ol>
    </section>
  </main>
`

const inTarget = mustFind<HTMLInputElement>("#in-target")
const inAmount = mustFind<HTMLInputElement>("#in-amount")
const inGain = mustFind<HTMLInputElement>("#in-gain")
const rowsEl = mustFind<HTMLDivElement>("#rows")
const baselineEl = mustFind<HTMLDivElement>("#baseline")
const verdictEl = mustFind<HTMLDivElement>("#verdict")
const sequencesEl = mustFind<HTMLDivElement>("#sequences")
const seqListEl = mustFind<HTMLOListElement>("#seq-list")
const gainRatesEl = mustFind<HTMLSpanElement>("#gain-rates")
const addBtn = mustFind<HTMLButtonElement>("#add-option")
const scaleUpBtn = mustFind<HTMLButtonElement>("#scale-up")
const scaleDownBtn = mustFind<HTMLButtonElement>("#scale-down")
const gamesCountEl = mustFind<HTMLSpanElement>("#games-count")

load()
inTarget.value = formatNumber(state.target)
inAmount.value = formatNumber(state.amount)
inGain.value = formatNumber(state.gain)

function sortOptions() {
  options.sort((a, b) => a.gain - b.gain)
}

function readCore() {
  state.target = parseNumber(inTarget.value)
  state.amount = parseNumber(inAmount.value)
  state.gain = parseNumber(inGain.value)
}

/** Accept "1,5" or "1.5" or "1 645"; returns 0 for empty/invalid. */
function parseNumber(s: string): number {
  const cleaned = s.replace(",", ".").replace(/\s/g, "")
  const n = parseFloat(cleaned)
  return Number.isFinite(n) ? n : 0
}

/** While typing, let "," separate decimals; switch it to "." in place. */
function normalizeComma(el: HTMLInputElement): void {
  if (!el.value.includes(",")) return
  const start = el.selectionStart ?? el.value.length
  const end = el.selectionEnd ?? start
  el.value = el.value.replace(/,/g, ".")
  el.setSelectionRange(start, end)
}

/** Wire comma handling plus show-raw-while-focused / group+recalc on commit.
 *  Recalc happens once, on Enter or leaving the field (the `change` event fires
 *  for both), never per keystroke. */
function bindNumeric(el: HTMLInputElement, onCommit: () => void): void {
  el.addEventListener("focus", () => {
    el.value = String(parseNumber(el.value))
    el.select()
  })
  el.addEventListener("input", () => {
    normalizeComma(el)
  })
  const formatCommitted = () => {
    el.value = formatNumber(parseNumber(el.value))
  }
  el.addEventListener("change", () => {
    formatCommitted()
    onCommit()
  })
  el.addEventListener("blur", formatCommitted)
}

function render() {
  const evalResult = evaluate(state, options)

  baselineEl.innerHTML = formatDurationLong(evalResult.baselineSeconds)

  gainRatesEl.innerHTML = `
    <span class="gain-rate">${formatNumber(state.gain * 60)} / min</span>
    <span class="gain-rate">${formatNumber(state.gain * 3600)} / h</span>
  `

  rowsEl.innerHTML = ""
  const n = options.length
  const minPayback = evalResult.results.reduce(
    (m, r) => Math.min(m, paybackSeconds(r.option)),
    Infinity,
  )
  for (const [i, r] of evalResult.results.entries()) {
    const isBest = evalResult.bestOption?.option === r.option
    const paysBackBeforeBaseline =
      minPayback !== Infinity && minPayback < evalResult.baselineSeconds
    const isBestPayback = paysBackBeforeBaseline && paybackSeconds(r.option) === minPayback
    const row = document.createElement("div")
    row.className = `row${isBest ? " row--best" : ""}`
    row.setAttribute("role", "row")
    row.innerHTML = `
      <span class="cell-name">
        <input type="text" class="opt-name" data-index="${i}" tabindex="${i + 4}" value="${escapeHtml(r.option.name)}" />
      </span>
      <span><input type="text" class="opt-gain" inputmode="decimal" autocomplete="off" spellcheck="false" data-index="${i}" tabindex="${n + i + 4}" value="${formatNumber(r.option.gain)}" /></span>
      <span><input type="text" class="opt-cost" inputmode="decimal" autocomplete="off" spellcheck="false" data-index="${i}" tabindex="${2 * n + i + 4}" value="${formatNumber(r.option.cost)}" /></span>
      <span class="cell-num${isBestPayback ? " payback--best" : ""}" data-label="Payback: ">${formatMinutesOnly(paybackSeconds(r.option))}</span>
      <span class="cell-num" data-label="Wait to afford: ">${formatMinutesOnly(r.waitSeconds)}</span>
      <span class="cell-num cell-target">
        <span class="target-delta delta ${r.deltaSeconds < 0 ? "delta--good" : r.deltaSeconds > 0 ? "delta--bad" : ""}" data-label="Vs. waiting: ">${formatDeltaPlain(r.deltaSeconds)}</span>
      </span>
    `
    rowsEl.appendChild(row)
  }

  updateVerdict(evalResult)
  updateSequences()
  attachRowListeners()
  save()
}

/** Patch derived cells and ranking in place so editing an input never rebuilds
 *  the row DOM (which would steal focus). Input values are left untouched. */
function updateEval() {
  const evalResult = evaluate(state, options)
  const resultByIndex = new Map(evalResult.results.map((r, i) => [i, r]))
  const minPayback = evalResult.results.reduce(
    (m, r) => Math.min(m, paybackSeconds(r.option)),
    Infinity,
  )

  rowsEl.querySelectorAll<HTMLDivElement>(".row").forEach((rowEl) => {
    if (rowEl.classList.contains("row--head")) return
    const indexEl = rowEl.querySelector<HTMLElement>("[data-index]")
    if (!indexEl) return
    const index = Number(indexEl.dataset.index)
    const r = resultByIndex.get(index)
    if (!r) return
    rowEl.classList.toggle("row--best", evalResult.bestOption?.option === r.option)
    const cells = rowEl.querySelectorAll<HTMLElement>(".cell-num")
    cells[0].textContent = formatMinutesOnly(paybackSeconds(r.option))
    const paysBackBeforeBaseline =
      minPayback !== Infinity && minPayback < evalResult.baselineSeconds
    cells[0].classList.toggle(
      "payback--best",
      paysBackBeforeBaseline && paybackSeconds(r.option) === minPayback,
    )
    cells[1].textContent = formatMinutesOnly(r.waitSeconds)
    const delta = mustFind<HTMLElement>(".target-delta", cells[2])
    delta.textContent = formatDeltaPlain(r.deltaSeconds)
    delta.classList.toggle("delta--good", r.deltaSeconds < 0)
    delta.classList.toggle("delta--bad", r.deltaSeconds > 0)
  })

  baselineEl.textContent = formatDurationLong(evalResult.baselineSeconds)
  gainRatesEl.innerHTML = `
    <span class="gain-rate">${formatNumber(state.gain * 60)} / min</span>
    <span class="gain-rate">${formatNumber(state.gain * 3600)} / h</span>
  `
  updateVerdict(evalResult)
  updateSequences()
  save()
}

function updateVerdict(evalResult: Evaluation) {
  const show = options.length > 0 && !evalResult.bestOption
  verdictEl.hidden = !show
  verdictEl.innerHTML = show
    ? `<p><strong>Wait.</strong> None of the options beat waiting.</p>`
    : ""
}

function updateSequences() {
  const sequences = bestSequences(state, options).slice(0, 3)
  sequencesEl.hidden = sequences.length === 0
  seqListEl.innerHTML = sequences
    .map(
      (s, i) => `
      <li class="seq-item">
        <span class="seq-rank">${i + 1}</span>
        <span class="seq-steps">${s.purchases
          .map(
            (step) =>
              `${escapeHtml(step.option.name)}<span class="seq-step-wait">${step.waitSeconds > 0 ? ` (+${formatMinutesOnly(step.waitSeconds)})` : " (now)"}</span>`,
          )
          .join('<span class="seq-arrow">→</span>')}</span>
        <span class="seq-time">${formatDurationLong(s.totalSeconds)}</span>
      </li>`,
    )
    .join("")
}

function attachRowListeners() {
  rowsEl.querySelectorAll<HTMLInputElement>(".opt-name").forEach((el) => {
    el.addEventListener("focus", () => el.select())
    el.addEventListener("input", () => {
      const opt = options[Number(el.dataset.index)]
      if (opt) {
        opt.name = el.value
        save()
      }
    })
    el.addEventListener("change", () => {
      if (options[Number(el.dataset.index)].name === "") {
        options.splice(Number(el.dataset.index), 1)
        render()
      }
    })
  })

  rowsEl.querySelectorAll<HTMLInputElement>(".opt-gain").forEach((el) => {
    bindNumeric(el, () => {
      const opt = options[Number(el.dataset.index)]
      if (opt) opt.gain = parseNumber(el.value)
      updateEval()
    })
    el.addEventListener("change", () => {
      sortOptions()
      render()
    })
  })

  rowsEl.querySelectorAll<HTMLInputElement>(".opt-cost").forEach((el) => {
    bindNumeric(el, () => {
      const opt = options[Number(el.dataset.index)]
      if (opt) opt.cost = parseNumber(el.value)
      updateEval()
    })
  })
}

function escapeHtml(s: string): string {
  const div = document.createElement("div")
  div.textContent = s
  return div.innerHTML
}

bindNumeric(inTarget, () => {
  readCore()
  render()
  void recordStartedGame().then(refreshGameCount)
})
;[inAmount, inGain].forEach((el) => {
  bindNumeric(el, () => {
    readCore()
    render()
  })
})

addBtn.addEventListener("click", () => {
  options.push({
    name: "X",
    gain: 1,
    cost: 100,
  })
  sortOptions()
  render()
})

function refreshGameCount(): void {
  void fetchGameCount().then((count) => {
    if (count !== null) gamesCountEl.textContent = String(count)
  })
}

/** Multiply every number (core inputs and option gain/cost) by `factor`. */
function scaleAll(factor: number): void {
  const round = (n: number): number => Number(n.toPrecision(12))
  state.target = round(state.target * factor)
  state.amount = round(state.amount * factor)
  state.gain = round(state.gain * factor)
  for (const opt of options) {
    opt.gain = round(opt.gain * factor)
    opt.cost = round(opt.cost * factor)
  }
  inTarget.value = formatNumber(state.target)
  inAmount.value = formatNumber(state.amount)
  inGain.value = formatNumber(state.gain)
  render()
}

scaleUpBtn.addEventListener("click", () => scaleAll(1000))
scaleDownBtn.addEventListener("click", () => scaleAll(1 / 1000))

readCore()
sortOptions()
render()
refreshGameCount()
