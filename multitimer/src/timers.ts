export type Unit = "sec" | "min" | "hour" | "day"

export interface Timer {
  name: string
  dateStart: Date
  dateEnd: Date
}

// storage keys are kept from the Vue version, so existing user data stays readable
const KEY_DATA = "eta_vue_mt_data"
const KEY_RECENT = "eta_vue_mt_recent"

const UNIT_SECONDS: Record<Unit, number> = { sec: 1, min: 60, hour: 3600, day: 86_400 }
const SUFFIX_UNIT: Record<string, Unit> = { s: "sec", m: "min", h: "hour", d: "day" }

export const clearName = (name: string): string => name.replace(/[/|\\:"'{}[\]()]+/g, "").trim()

// "20" = 20min, "10s", "1,5h", "2d", "1:30" = 1min 30s (unit suffix applies to the mm part)
export function parseTimeInput(raw: string): { time: number; unit: Unit } | undefined {
  let input = raw.trim()
  const suffixUnit = SUFFIX_UNIT[input.slice(-1)]
  if (suffixUnit != null) input = input.slice(0, -1)

  const clock = /^(\d+):(\d{2})$/.exec(input)
  const time = clock
    ? Number(clock[1]) + Number(clock[2]) / 60
    : Number.parseFloat(input.replace(",", "."))
  return Number.isFinite(time) && time > 0 ? { time, unit: suffixUnit ?? "min" } : undefined
}

export function createTimer(name: string, time: number, unit: Unit, now = Date.now()): Timer {
  return {
    name,
    dateStart: new Date(now),
    dateEnd: new Date(now + time * 1000 * UNIT_SECONDS[unit]),
  }
}

export function resetTimer(timer: Timer, now: number) {
  const duration = timer.dateEnd.getTime() - timer.dateStart.getTime()
  timer.dateStart = new Date(now)
  timer.dateEnd = new Date(now + duration)
}

export function progress(timer: Timer, now: number): { remaining: number; percent: number } {
  const start = timer.dateStart.getTime()
  const end = timer.dateEnd.getTime()
  if (now >= end) return { remaining: 0, percent: 1 }
  return { remaining: (end - now) / 1000, percent: (now - start) / (end - start) }
}

// recent timers are stored as "name:123h"
export const timerLabel = (name: string, time: number, unit: Unit): string =>
  `${clearName(name)}:${time}${unit.charAt(0)}`

export function parseTimerLabel(label: string): { name: string; time: number; unit: Unit } {
  const [name = "", time = "0"] = label.slice(0, -1).split(":")
  return {
    name,
    time: Number.parseFloat(time),
    unit: SUFFIX_UNIT[label.slice(-1)] ?? "min",
  }
}

export function secondsToString(totalSeconds: number): string {
  const rounded = Math.round(totalSeconds)
  const days = Math.floor(rounded / 86_400)
  const hours = Math.floor((rounded % 86_400) / 3600)
  const minutes = Math.floor((rounded % 3600) / 60)
  const seconds = rounded % 60

  if (days > 0) return `${days}d ${hours}h ${minutes}m`
  if (hours > 0) return `${hours}h ${minutes}m`
  if (minutes >= 15) return `${minutes}m`
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

export const dateToString = (date: Date): string => date.toLocaleTimeString("de-DE")

function readJson<T>(key: string, fallback: T): T {
  try {
    const stored = localStorage.getItem(key)
    return stored == null ? fallback : JSON.parse(stored)
  } catch {
    return fallback
  }
}

export function loadTimers(): Timer[] {
  const stored = readJson<Array<{ name: string; dateStart: string; dateEnd: string }>>(KEY_DATA, [])
  return stored.map(({ name, dateStart, dateEnd }) => ({
    name,
    dateStart: new Date(dateStart),
    dateEnd: new Date(dateEnd),
  }))
}

export function saveTimers(timers: Timer[]) {
  if (timers.length === 0) localStorage.removeItem(KEY_DATA)
  else localStorage.setItem(KEY_DATA, JSON.stringify(timers))
}

export const loadRecent = (): string[] => readJson<string[]>(KEY_RECENT, [])

export const saveRecent = (labels: string[]) =>
  localStorage.setItem(KEY_RECENT, JSON.stringify(labels))
