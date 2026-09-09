const STATS_URL = "https://entorb.net/web-stats-json.php?origin=idle"

interface StatsResponse {
  accesscounts?: number
}

export async function fetchGameCount(): Promise<number | null> {
  try {
    const res = await fetch(`${STATS_URL}&action=read`, { cache: "no-store" })
    if (!res.ok) return null
    const data = (await res.json()) as StatsResponse
    return typeof data.accesscounts === "number" ? data.accesscounts : null
  } catch {
    return null
  }
}

export async function recordStartedGame(): Promise<void> {
  try {
    await fetch(`${STATS_URL}&action=write`, { cache: "no-store" })
  } catch {
    // offline or blocked: nothing to do
  }
}
