export function ringStep(from: number, to: number): number {
  return (to - from + 12) % 12
}

export interface AnimateHandle {
  done: Promise<void>
  cancel: () => void
}

type NumberTarget = { pit: number } | { store: 0 | 1 }

export interface NumberStep {
  time: number
  target: NumberTarget
  value: number
  pop: boolean
}

const TICK = 200
const POP_DURATION = 280
const STORE_MAX_MS = 420

export function buildNumberSteps(
  sourcePit: number,
  prevPits: readonly number[],
  nextPits: readonly number[],
  prevCaptured: readonly [number, number],
  nextCaptured: readonly [number, number],
): NumberStep[] {
  const steps: NumberStep[] = []
  const pitDeltas = nextPits.map((v, i) => v - (prevPits[i] ?? 0))
  const srcNow = prevPits[sourcePit] ?? 0
  const srcTarget = nextPits[sourcePit] ?? 0
  const drain = Math.max(0, srcNow - srcTarget)

  let lastStep = 0
  for (let i = 0; i < 12; i++) {
    const d = pitDeltas[i] ?? 0
    if (d === 0 || i === sourcePit) continue
    const step = ringStep(sourcePit, i)
    lastStep = Math.max(lastStep, step)
    steps.push({
      time: step * TICK,
      target: { pit: i },
      value: nextPits[i] ?? 0,
      pop: d > 0,
    })
  }

  for (let j = 1; j <= drain; j++) {
    steps.push({
      time: j * TICK,
      target: { pit: sourcePit },
      value: Math.max(srcNow - j, srcTarget),
      pop: false,
    })
  }

  const waveEnd = Math.max(lastStep, drain) * TICK
  if (srcTarget > srcNow) {
    steps.push({ time: waveEnd, target: { pit: sourcePit }, value: srcTarget, pop: true })
  }

  for (const p of [0, 1] as const) {
    const delta = nextCaptured[p] - prevCaptured[p]
    if (delta === 0) continue
    const unit = Math.max(20, Math.min(70, Math.floor(STORE_MAX_MS / Math.abs(delta))))
    const step = delta > 0 ? 1 : -1
    for (let k = 1; k < Math.abs(delta); k++) {
      steps.push({
        time: waveEnd + 60 + k * unit,
        target: { store: p },
        value: prevCaptured[p] + step * k,
        pop: false,
      })
    }
    steps.push({
      time: waveEnd + 60 + Math.abs(delta) * unit,
      target: { store: p },
      value: nextCaptured[p],
      pop: true,
    })
  }
  steps.sort((a, b) => a.time - b.time)
  return steps
}

export function animateBoardNumbers(
  root: ParentNode,
  sourcePit: number,
  prevPits: readonly number[],
  nextPits: readonly number[],
  prevCaptured: readonly [number, number],
  nextCaptured: readonly [number, number],
): AnimateHandle {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return immediateHandle()
  const pitEl = (i: number): HTMLElement | null =>
    root.querySelector(`.pit[data-pit="${i}"] .seed-count`)
  const storeEl = (p: 0 | 1): HTMLElement | null =>
    root.querySelector(p === 0 ? ".store-left .store-count" : ".store-right .store-count")
  const elementFor = (t: NumberTarget): HTMLElement | null =>
    "pit" in t ? pitEl(t.pit) : storeEl(t.store)
  if (pitEl(0) === null) return immediateHandle()

  const setCount = (el: HTMLElement | null, v: number): void => {
    if (el !== null) el.textContent = String(v)
  }
  const bump = (el: HTMLElement | null): void => {
    if (el === null) return
    el.animate(
      [
        { transform: "scale(1)", color: "#e8eef5" },
        { transform: "scale(1.45)", color: "#ffd98a" },
        { transform: "scale(1)", color: "#e8eef5" },
      ],
      { duration: POP_DURATION, easing: "ease-out" },
    )
  }

  const steps = buildNumberSteps(sourcePit, prevPits, nextPits, prevCaptured, nextCaptured)
  if (steps.length === 0) return immediateHandle()

  const timers: number[] = []
  let cancelled = false
  let finished = false
  let resolveDone: (() => void) | undefined
  const done = new Promise<void>((resolve) => {
    resolveDone = resolve
  })
  const clearTimers = (): void => {
    for (const id of timers) window.clearTimeout(id)
    timers.length = 0
  }
  const finish = (): void => {
    if (finished || cancelled) return
    finished = true
    clearTimers()
    resolveDone?.()
  }
  for (const step of steps) {
    timers.push(
      window.setTimeout(() => {
        if (finished || cancelled) return
        const el = elementFor(step.target)
        setCount(el, step.value)
        if (step.pop) bump(el)
      }, step.time),
    )
  }
  const lastTime = steps[steps.length - 1]?.time ?? 0
  timers.push(window.setTimeout(finish, lastTime))

  return {
    done,
    cancel: () => {
      if (cancelled || finished) return
      cancelled = true
      clearTimers()
      resolveDone?.()
    },
  }
}

function immediateHandle(): AnimateHandle {
  const done = Promise.resolve()
  return { done, cancel: () => {} }
}
