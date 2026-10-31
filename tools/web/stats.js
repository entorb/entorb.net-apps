// @ts-check
const STATS_URL = "https://entorb.net/web-stats-json.php?origin="

/**
 * Show the usage count of origin in #use-count.
 * @param {string} origin
 */
export async function showCount(origin) {
  const el = document.getElementById("use-count")
  try {
    const res = await fetch(`${STATS_URL}${origin}&action=read`, { cache: "no-store" })
    if (!res.ok || !el) return
    const data = await res.json()
    if (typeof data.accesscounts === "number") el.textContent = String(data.accesscounts)
  } catch {
    // offline or blocked: leave empty
  }
}

/** @param {string} origin */
export async function recordUse(origin) {
  try {
    await fetch(`${STATS_URL}${origin}&action=write`, { cache: "no-store" })
  } catch {
    // offline or blocked: nothing to do
  }
  await showCount(origin)
}
