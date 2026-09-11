import type { CoreState, Investment } from "./calc"

export const state: CoreState = {
  target: 1100,
  gain: 0.1,
  amount: 20,
}

export const options: Investment[] = [
  { name: "Cursor", gain: 0.1, cost: 15 },
  { name: "Grandma", gain: 1, cost: 100 },
  { name: "Farm", gain: 8, cost: 1100 },
]
