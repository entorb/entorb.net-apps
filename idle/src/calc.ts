export interface Investment {
  name: string;
  gain: number; // amount/second this investment adds
  cost: number; // one-time cost to buy it
}

export interface CoreState {
  target: number;
  gain: number; // current total gain/second
  amount: number; // current total amount
}

/** Seconds needed to go from `amount` to `target` at a constant `gain`/s.
 *  Returns 0 if already there, Infinity if it can never be reached. */
function secondsToTarget(target: number, amount: number, gain: number): number {
  if (amount >= target) return 0;
  if (gain <= 0) return Infinity;
  return (target - amount) / gain;
}

interface OptionResult {
  option: Investment;
  /** seconds until the option can be bought (0 if affordable now) */
  waitSeconds: number;
  /** total seconds from now until target, including any wait to afford it */
  totalSeconds: number;
  /** totalSeconds minus the no-purchase baseline; negative = time saved */
  deltaSeconds: number;
}

export interface Evaluation {
  baselineSeconds: number;
  results: OptionResult[];
  bestOption: OptionResult | null; // null when waiting beats every option
}

/** Evaluate every investment option against the baseline of not buying anything. */
export function evaluate(state: CoreState, options: Investment[]): Evaluation {
  const baselineSeconds = secondsToTarget(
    state.target,
    state.amount,
    state.gain,
  );

  const results: OptionResult[] = options.map((option) => {
    let waitSeconds: number;
    let amountAtPurchase: number;

    if (state.amount >= option.cost) {
      waitSeconds = 0;
      amountAtPurchase = state.amount - option.cost;
    } else {
      waitSeconds = secondsToTarget(option.cost, state.amount, state.gain);
      amountAtPurchase = 0; // spent every last unit to just afford it
    }

    const newGain = state.gain + option.gain;
    const afterPurchase = secondsToTarget(
      state.target,
      amountAtPurchase,
      newGain,
    );
    const totalSeconds =
      waitSeconds === Infinity || afterPurchase === Infinity
        ? Infinity
        : waitSeconds + afterPurchase;

    return {
      option,
      waitSeconds,
      totalSeconds,
      deltaSeconds:
        totalSeconds === Infinity || baselineSeconds === Infinity
          ? totalSeconds === baselineSeconds
            ? 0
            : totalSeconds - baselineSeconds
          : totalSeconds - baselineSeconds,
    };
  });

  let bestOption: OptionResult | null = null;
  for (const r of results) {
    if (r.totalSeconds < baselineSeconds) {
      if (!bestOption || r.totalSeconds < bestOption.totalSeconds)
        bestOption = r;
    }
  }

  return { baselineSeconds, results, bestOption };
}

/** Seconds for an option to pay for itself with its own added gain. */
export function paybackSeconds(option: Investment): number {
  return option.gain > 0 ? option.cost / option.gain : Infinity;
}

export function formatMinutes(seconds: number): string {
  if (seconds === Infinity) return "never (no gain)";
  if (seconds === 0) return "already reached";
  const minutes = seconds / 60;
  if (minutes < 1) return `${seconds.toFixed(1)} s`;
  return `${minutes.toFixed(1)} min`;
}

/** Insert a space between groups of thousands: 12345.6 -> "12 345.6". */
function groupThousands(s: string): string {
  const dot = s.indexOf(".");
  const int = dot === -1 ? s : s.slice(0, dot);
  const frac = dot === -1 ? "" : s.slice(dot);
  return `${int.replace(/\B(?=(\d{3})+(?!\d))/g, " ")}${frac}`;
}

/** Thousands-grouped number for display; no grouping while editing. */
export function formatNumber(n: number): string {
  return groupThousands(String(n));
}

/** Compact minutes-only form for the options table; never shows hours/days. */
export function formatMinutesOnly(seconds: number): string {
  if (seconds === Infinity) return "never (no gain)";
  if (seconds === 0) return "0";
  const minutes = seconds / 60;
  return groupThousands(minutes.toFixed(1));
}

/** Delta without a unit, for the options table. */
export function formatDeltaPlain(seconds: number): string {
  if (seconds === 0) return "±0";
  const sign = seconds < 0 ? "-" : "+";
  const abs = Math.abs(seconds);
  if (abs === Infinity) return `${sign}∞`;
  return `${sign}${groupThousands((abs / 60).toFixed(1))}`;
}
