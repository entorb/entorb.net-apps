import type { CoreState, Investment } from "./calc";

export const state: CoreState = {
  target: 5_038_000,
  gain: 0.5,
  amount: 20,
};

export const options: Investment[] = [
  { name: "Neural", gain: 1.58, cost: 87 },
  { name: "Deep", gain: 4.1, cost: 340 },
  { name: "Dark", gain: 10.1, cost: 776 },
  { name: "Singular", gain: 28.4, cost: 3400 },
  { name: "Hyper", gain: 94.8, cost: 11000 },
  { name: "Omega", gain: 189, cost: 24200 },
  { name: "Eternity", gain: 379, cost: 48500 },
];
