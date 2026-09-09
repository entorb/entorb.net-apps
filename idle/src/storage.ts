import type { CoreState, Investment } from "./calc"
import { options, state } from "./const"

const KEY = "idle-ttt-ledger-v1"

function isNumber(n: unknown): n is number {
  return typeof n === "number" && Number.isFinite(n)
}

function isInvestment(o: unknown): o is Investment {
  return (
    typeof o === "object" &&
    o !== null &&
    typeof (o as Investment).name === "string" &&
    isNumber((o as Investment).gain) &&
    isNumber((o as Investment).cost)
  )
}

export function load(): void {
  let raw: string
  try {
    raw = localStorage.getItem(KEY) ?? ""
  } catch {
    return
  }
  if (!raw) return
  try {
    const parsed = JSON.parse(raw) as {
      state?: CoreState
      options?: Investment[]
    }
    if (
      parsed.state &&
      isNumber(parsed.state.target) &&
      isNumber(parsed.state.gain) &&
      isNumber(parsed.state.amount)
    ) {
      state.target = parsed.state.target
      state.gain = parsed.state.gain
      state.amount = parsed.state.amount
    }
    if (Array.isArray(parsed.options) && parsed.options.every(isInvestment)) {
      options.length = 0
      options.push(...parsed.options)
    }
  } catch {
    return
  }
}

export function save(): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ state, options }))
  } catch {
    return
  }
}
