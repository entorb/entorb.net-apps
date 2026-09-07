const BOARD_LENGTH = 12;
export const PITS_PER_SIDE = 6;
export const SEEDS_TOTAL = 48;
const SEEDS_PER_PIT = 4;
const CAPTURE_LIMIT = 24;
const CAPTURE_COUNT = 4;
const CAPTURE_TOTALS: number[] = [2, 3];
const RELAY_FLOOR = 2;
const ENDGAME_LIMIT = 8;
const STALL_LIMIT = 6;

export type Player = "A" | "B";
export type Ruleset = "anan_anan" | "abapa";
type GameStatus = "ongoing" | "finished";

function opponent(player: Player): Player {
  return player === "A" ? "B" : "A";
}

interface Board {
  pits: readonly number[];
}

export interface Move {
  pit: number;
}

export interface GameState {
  board: Board;
  turn: Player;
  ruleset: Ruleset;
  captured: readonly [number, number];
  status: GameStatus;
  winner: Player | null;
  movesWithoutCapture: number;
}

function initialBoard(): Board {
  return { pits: Array<number>(BOARD_LENGTH).fill(SEEDS_PER_PIT) };
}

export function startState(ruleset: Ruleset, first: Player = "A"): GameState {
  return {
    board: initialBoard(),
    turn: first,
    ruleset,
    captured: [0, 0],
    status: "ongoing",
    winner: null,
    movesWithoutCapture: 0,
  };
}

function ownerOf(_board: Board, index: number): Player {
  return index < PITS_PER_SIDE ? "A" : "B";
}

function isPitEmpty(board: Board, index: number): boolean {
  return board.pits[index] === 0;
}

type CapturedMap = Record<Player, number>;

function sow(
  pits: number[],
  start: number,
  count: number,
  state: GameState,
  captured: CapturedMap,
): { index: number; lastCapturer: Player | null } {
  let index = start;
  let lastCapturer: Player | null = null;
  const isAnan = state.ruleset === "anan_anan";
  while (count > 0) {
    index = (index + 1) % BOARD_LENGTH;
    if (index === start) continue;
    // biome-ignore lint/style/noNonNullAssertion: index in range
    pits[index]! += 1;
    count -= 1;
    if (isAnan && pits[index] === CAPTURE_COUNT) {
      const capturer = count === 0 ? state.turn : ownerOf(state.board, index);
      captured[capturer] += CAPTURE_COUNT;
      pits[index] = 0;
      lastCapturer = capturer;
    }
  }
  return { index, lastCapturer };
}

function finish(
  pits: number[],
  captured: CapturedMap,
  lastCapturer: Player | null,
): { status: GameStatus; winner: Player | null } {
  for (const player of ["A", "B"] as const) {
    if (captured[player] > CAPTURE_LIMIT) {
      return { status: "finished", winner: player };
    }
  }
  let status: GameStatus = "ongoing";
  let winner: Player | null = null;
  const boardTotal = pits.reduce((sum, s) => sum + s, 0);
  if (boardTotal <= ENDGAME_LIMIT) {
    status = "finished";
    if (lastCapturer !== null) {
      captured[lastCapturer] += boardTotal;
      pits.fill(0);
    }
    const a = captured.A;
    const b = captured.B;
    if (a > b) winner = "A";
    else if (b > a) winner = "B";
  }
  return { status, winner };
}

function finishAbapa(captured: CapturedMap): {
  status: GameStatus;
  winner: Player | null;
} {
  for (const player of ["A", "B"] as const) {
    if (captured[player] > CAPTURE_LIMIT) {
      return { status: "finished", winner: player };
    }
  }
  if (captured.A === CAPTURE_LIMIT && captured.B === CAPTURE_LIMIT) {
    return { status: "finished", winner: null };
  }
  return { status: "ongoing", winner: null };
}

function finishInfinite(captured: CapturedMap): {
  status: GameStatus;
  winner: Player | null;
} {
  const { A: a, B: b } = captured;
  if (a > b) return { status: "finished", winner: "A" };
  if (b > a) return { status: "finished", winner: "B" };
  return { status: "finished", winner: null };
}

export function tally(state: GameState, previousTotal: number): GameState {
  if (state.ruleset !== "anan_anan") return state;
  const total = state.captured[0] + state.captured[1];
  const moves = total > previousTotal ? 0 : state.movesWithoutCapture + 1;
  if (moves >= STALL_LIMIT) {
    const { status, winner } = finishInfinite({
      A: state.captured[0],
      B: state.captured[1],
    });
    return { ...state, movesWithoutCapture: moves, status, winner };
  }
  return { ...state, movesWithoutCapture: moves };
}

function capturedMap(state: GameState): CapturedMap {
  return { A: state.captured[0], B: state.captured[1] };
}

function result(
  state: GameState,
  pits: number[],
  captured: CapturedMap,
  status: GameStatus,
  winner: Player | null,
): GameState {
  return {
    board: { pits },
    turn: opponent(state.turn),
    ruleset: state.ruleset,
    captured: [captured.A, captured.B],
    status,
    winner,
    movesWithoutCapture: state.movesWithoutCapture,
  };
}

function playAbapa(state: GameState, move: Move): GameState {
  const pits = [...state.board.pits];
  const captured = capturedMap(state);

  const held = pits[move.pit] ?? 0;
  pits[move.pit] = 0;
  let { index } = sow(pits, move.pit, held, state, captured);

  while (
    CAPTURE_TOTALS.includes(pits[index] ?? 0) &&
    ownerOf(state.board, index) === opponent(state.turn)
  ) {
    captured[state.turn] += pits[index] ?? 0;
    pits[index] = 0;
    index = (index - 1 + BOARD_LENGTH) % BOARD_LENGTH;
  }

  const { status, winner } = finishAbapa(captured);
  return result(state, pits, captured, status, winner);
}

function playAnan(state: GameState, move: Move): GameState {
  const pits = [...state.board.pits];
  const captured = capturedMap(state);
  let lastCapturer: Player | null = null;

  let held = pits[move.pit] ?? 0;
  pits[move.pit] = 0;
  let index = move.pit;
  const seen = new Set<string>();
  while (true) {
    const relayKey = `${pits.join(",")}|${index}`;
    if (seen.has(relayKey)) {
      const { status, winner } = finishInfinite(captured);
      return result(state, pits, captured, status, winner);
    }
    seen.add(relayKey);
    const next = sow(pits, index, held, state, captured);
    index = next.index;
    if (next.lastCapturer !== null) {
      lastCapturer = next.lastCapturer;
    }
    if ((pits[index] ?? 0) < RELAY_FLOOR) break;
    held = pits[index] ?? 0;
    pits[index] = 0;
  }

  const { status, winner } = finish(pits, captured, lastCapturer);
  return result(state, pits, captured, status, winner);
}

function sideTotal(state: GameState, player: Player): number {
  const start = player === "A" ? 0 : PITS_PER_SIDE;
  let total = 0;
  for (let i = start; i < start + PITS_PER_SIDE; i++) {
    // biome-ignore lint/style/noNonNullAssertion: index in range
    total += state.board.pits[i]!;
  }
  return total;
}

export function finishIfNoMoves(state: GameState): GameState {
  if (state.status !== "ongoing") return state;
  if (sideTotal(state, state.turn) > 0) return state;
  const a = state.captured[0];
  const b = state.captured[1];
  const winner = a > b ? "A" : b > a ? "B" : null;
  return { ...state, status: "finished", winner };
}

function capturedBy(state: GameState, player: Player): number {
  return player === "A" ? state.captured[0] : state.captured[1];
}

export interface GainEntry {
  uiPit: number;
  ownGain: number;
  oppGain: number;
}

export function moveGains(state: GameState): GainEntry[] {
  const turn = state.turn;
  const gains: GainEntry[] = [];
  for (let uiPit = 1; uiPit <= PITS_PER_SIDE; uiPit++) {
    let pit = uiPit - 1;
    if (turn === "B") pit += PITS_PER_SIDE;
    if (state.board.pits[pit] === 0) continue;
    const after = play(state, { pit });
    const opp = opponent(turn);
    gains.push({
      uiPit,
      ownGain: capturedBy(after, turn) - capturedBy(state, turn),
      oppGain: capturedBy(after, opp) - capturedBy(state, opp),
    });
  }
  return gains;
}

export function play(state: GameState, move: Move): GameState {
  if (state.status !== "ongoing") {
    throw new Error("Game is already finished");
  }
  if (move.pit < 0 || move.pit >= BOARD_LENGTH) {
    throw new Error("Pit is out of range");
  }
  if (ownerOf(state.board, move.pit) !== state.turn) {
    throw new Error("Pit is not owned by the player to move");
  }
  if (isPitEmpty(state.board, move.pit)) {
    throw new Error("Pit is empty");
  }
  if (state.ruleset === "abapa") {
    return playAbapa(state, move);
  }
  return playAnan(state, move);
}
