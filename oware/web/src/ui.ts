import type { GameState, Player, Ruleset } from "./models";
import { moveGains, SEEDS_TOTAL } from "./models";
import { rulesFor } from "./rules";

const MODE_OPTIONS = [
  "human",
  "random",
  "greedy",
  "greedy_response",
  "minimax",
] as const;
export type SideMode = (typeof MODE_OPTIONS)[number];

export function renderControls(
  ruleset: Ruleset,
  modeA: SideMode,
  modeB: SideMode,
  onRuleset: (r: Ruleset) => void,
  onModeA: (m: SideMode) => void,
  onModeB: (m: SideMode) => void,
  onStart: () => void,
  onInfo: () => void,
): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "controls";

  const rulesetSel = select(
    ["anan_anan", "abapa"],
    (v) => (v === "anan_anan" ? "Anan-Anan" : "Abapa"),
    ruleset,
    (v) => onRuleset(v as Ruleset),
  );

  const modeASel = modeSelect(modeA, (m) => onModeA(m));
  const modeBSel = modeSelect(modeB, (m) => onModeB(m));

  const startBtn = document.createElement("button");
  startBtn.textContent = "New game";
  startBtn.id = "start-btn";
  startBtn.type = "button";
  startBtn.addEventListener("click", onStart);

  const infoBtn = document.createElement("button");
  infoBtn.textContent = "?";
  infoBtn.id = "info-btn";
  infoBtn.className = "info-btn";
  infoBtn.type = "button";
  infoBtn.title = "How to play";
  infoBtn.setAttribute("aria-label", "How to play");
  infoBtn.addEventListener("click", onInfo);

  wrap.append(
    field("Rules", rulesetSel),
    infoBtn,
    field("Player A", modeASel),
    field("Player B", modeBSel),
    startBtn,
  );
  return wrap;
}

export function renderEditButton(
  onEdit: () => void,
  enabled: boolean,
): HTMLElement | null {
  if (!enabled) return null;
  const btn = document.createElement("button");
  btn.textContent = "Edit board";
  btn.id = "edit-btn";
  btn.addEventListener("click", onEdit);
  return btn;
}

export interface EditRead {
  pits: number[];
  captured: [number, number];
}

export function collectBoardEdits(root: ParentNode): EditRead {
  const pits = Array<number>(12).fill(0);
  for (const input of root.querySelectorAll<HTMLInputElement>(
    "input[data-pit]",
  )) {
    pits[Number(input.dataset.pit)] = input.valueAsNumber;
  }
  const capturedValue = (p: Player): number => {
    const input = root.querySelector<HTMLInputElement>(
      `input[data-captured="${p}"]`,
    );
    return input ? input.valueAsNumber : 0;
  };
  return { pits, captured: [capturedValue("A"), capturedValue("B")] };
}

export function renderEditPanel(
  turn: Player,
  read: () => EditRead,
  onSubmit: (edit: EditRead, turn: Player) => void,
  onCancel: () => void,
): HTMLElement {
  const form = document.createElement("form");
  form.className = "edit-panel";

  const turnWrap = document.createElement("label");
  turnWrap.className = "edit-field";
  const turnLab = document.createElement("span");
  turnLab.textContent = "Turn";
  const turnSel = document.createElement("select");
  for (const p of ["A", "B"] as const) {
    const opt = document.createElement("option");
    opt.value = p;
    opt.textContent = `Player ${p}`;
    if (p === turn) opt.selected = true;
    turnSel.appendChild(opt);
  }
  turnWrap.append(turnLab, turnSel);

  const error = document.createElement("div");
  error.className = "modal-error";

  const buttons = document.createElement("div");
  buttons.className = "edit-buttons";
  const cancel = document.createElement("button");
  cancel.type = "button";
  cancel.textContent = "Cancel";
  cancel.addEventListener("click", onCancel);
  const ok = document.createElement("button");
  ok.type = "submit";
  ok.textContent = "Apply";
  buttons.append(cancel, ok);

  form.append(turnWrap, error, buttons);

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const { pits, captured } = read();
    const anyInvalid =
      pits.some((v) => !Number.isInteger(v) || v < 0) ||
      captured.some((v) => !Number.isInteger(v) || v < 0);
    if (anyInvalid) {
      error.textContent = "Enter non-negative whole numbers.";
      return;
    }
    const total = pits.reduce((s, v) => s + v, 0) + captured[0] + captured[1];
    if (total > SEEDS_TOTAL) {
      error.textContent = `Total seeds cannot exceed ${SEEDS_TOTAL} — current total ${total}.`;
      return;
    }
    onSubmit({ pits, captured }, turnSel.value as Player);
  });

  return form;
}

export function renderRulesModal(
  ruleset: Ruleset,
  onClose: () => void,
): HTMLElement {
  const overlay = document.createElement("div");
  overlay.className = "modal-overlay";

  const box = document.createElement("div");
  box.className = "modal rules-modal";
  box.setAttribute("role", "dialog");
  box.setAttribute("aria-modal", "true");
  box.setAttribute("aria-labelledby", "rules-title");

  const title = document.createElement("h2");
  title.id = "rules-title";
  title.textContent =
    ruleset === "anan_anan" ? "Anan-Anan rules" : "Abapa rules";
  box.appendChild(title);

  const list = document.createElement("ul");
  list.className = "rules-list";
  for (const rule of rulesFor(ruleset)) {
    const item = document.createElement("li");
    item.textContent = rule;
    list.appendChild(item);
  }
  box.appendChild(list);

  const buttons = document.createElement("div");
  buttons.className = "modal-buttons";
  const close = document.createElement("button");
  close.type = "button";
  close.id = "rules-close";
  close.textContent = "Close";
  close.addEventListener("click", onClose);
  buttons.appendChild(close);
  box.appendChild(buttons);

  overlay.addEventListener("click", (e) => {
    if (e.target === overlay) onClose();
  });

  overlay.appendChild(box);
  return overlay;
}

export function renderBoard(
  state: GameState,
  onPitClick: (pit: number) => void,
  editing = false,
): HTMLElement {
  const wrap = document.createElement("div");
  wrap.className = "board";

  const storeA = renderCaptured("A", state.captured[0], "store-left", editing);
  const storeB = renderCaptured("B", state.captured[1], "store-right", editing);
  markStore(storeA, "A", state);
  markStore(storeB, "B", state);

  wrap.appendChild(storeA);
  wrap.appendChild(
    renderRow(11, 6, state, "B", onPitClick, "row-top", editing),
  );
  wrap.appendChild(
    renderRow(0, 5, state, "A", onPitClick, "row-bottom", editing),
  );
  wrap.appendChild(storeB);
  return wrap;
}

function markStore(el: HTMLElement, player: Player, state: GameState): void {
  if (state.status === "ongoing") {
    if (state.turn === player) el.classList.add("store-active");
  } else if (state.winner === player) {
    el.classList.add("store-winner");
  }
}

function renderRow(
  from: number,
  to: number,
  state: GameState,
  player: Player,
  onPitClick: (pit: number) => void,
  rowClass: string,
  editing: boolean,
): HTMLElement {
  const row = document.createElement("div");
  row.className = `board-row ${rowClass}`;
  const indices: number[] = [];
  if (from <= to) {
    for (let i = from; i <= to; i++) indices.push(i);
  } else {
    for (let i = from; i >= to; i--) indices.push(i);
  }
  for (const pit of indices) {
    const cell = document.createElement("div");
    cell.className = "pit";
    cell.dataset.pit = String(pit);
    cell.dataset.player = player;
    const seeds = state.board.pits[pit] ?? 0;
    if (editing) {
      const input = document.createElement("input");
      input.type = "number";
      input.min = "0";
      input.className = "seed-input";
      input.dataset.pit = String(pit);
      input.value = String(seeds);
      input.setAttribute(
        "aria-label",
        `Player ${player}, pit ${pit < 6 ? pit + 1 : pit - 5}, seeds`,
      );
      cell.appendChild(input);
    } else {
      const count = document.createElement("span");
      count.className = "seed-count";
      count.textContent = String(seeds);
      cell.appendChild(count);
      if (state.turn === player && state.status === "ongoing" && seeds > 0) {
        cell.classList.add("movable");
        cell.setAttribute(
          "aria-label",
          `Player ${player}, ${seeds} seeds, move`,
        );
        cell.setAttribute("role", "button");
        cell.tabIndex = 0;
        cell.addEventListener("click", () => onPitClick(pit));
        cell.addEventListener("keydown", (e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            onPitClick(pit);
          }
        });
      }
    }
    row.appendChild(cell);
  }
  return row;
}

export function renderForecast(
  state: GameState,
  isHumanTurn: boolean,
): HTMLElement | null {
  if (!isHumanTurn || state.status !== "ongoing") return null;
  const gains = moveGains(state);
  const own: Array<number | null> = Array(6).fill(null);
  const opp: Array<number | null> = Array(6).fill(null);
  for (const { uiPit, ownGain, oppGain } of gains) {
    own[uiPit - 1] = ownGain;
    opp[uiPit - 1] = oppGain;
  }

  const wrap = document.createElement("div");
  wrap.className = "forecast";
  const title = document.createElement("div");
  title.className = "forecast-title";
  title.textContent = "Forecast — captures per pit";
  wrap.appendChild(title);

  const row = document.createElement("div");
  row.className = "forecast-row";
  const order = state.turn === "B" ? [5, 4, 3, 2, 1, 0] : [0, 1, 2, 3, 4, 5];
  for (const i of order) {
    const cell = document.createElement("div");
    cell.className = "forecast-cell";
    if (own[i] !== null || opp[i] !== null) {
      const ownSpan = document.createElement("span");
      ownSpan.className = "fc-val fc-own";
      // biome-ignore lint/style/noNonNullAssertion: guarded by !== null
      if (own[i] !== null && own[i]! > 0) ownSpan.classList.add("green");
      ownSpan.textContent = String(own[i] ?? 0);
      const oppSpan = document.createElement("span");
      oppSpan.className = "fc-val fc-opp";
      // biome-ignore lint/style/noNonNullAssertion: guarded by !== null
      if (opp[i] !== null && opp[i]! > 0) oppSpan.classList.add("red");
      oppSpan.textContent = String(opp[i] ?? 0);
      cell.append(ownSpan, oppSpan);
    }
    row.appendChild(cell);
  }
  wrap.appendChild(row);
  return wrap;
}

function renderCaptured(
  player: Player,
  count: number,
  cls: string,
  editing: boolean,
): HTMLElement {
  const store = document.createElement("div");
  store.className = `captured ${cls}`;
  const label = document.createElement("div");
  label.className = "store-label";
  label.textContent = player;
  if (editing) {
    const input = document.createElement("input");
    input.type = "number";
    input.min = "0";
    input.className = "store-input";
    input.dataset.captured = player;
    input.value = String(count);
    input.setAttribute("aria-label", `Player ${player} captured`);
    store.append(label, input);
  } else {
    const value = document.createElement("span");
    value.className = "store-count";
    value.textContent = String(count);
    store.append(label, value);
  }
  return store;
}

export function renderStatus(
  state: GameState,
  modeA: SideMode,
  modeB: SideMode,
): HTMLElement {
  const el = document.createElement("div");
  el.className = "status";
  if (state.status === "finished") {
    const a = state.captured[0];
    const b = state.captured[1];
    if (a === b) el.textContent = `Draw ${a}-${b}`;
    else el.textContent = `Winner: Player ${a > b ? "A" : "B"} ${a}-${b}`;
  } else {
    const who = state.turn === "A" ? "A" : "B";
    const mode = who === "A" ? modeA : modeB;
    const suffix = mode === "human" ? " (you)" : ` (${mode})`;
    el.textContent = `Turn: Player ${who}${suffix}`;
  }
  return el;
}

function modeSelect(
  current: SideMode,
  onChange: (m: SideMode) => void,
): HTMLSelectElement {
  const labels: Record<SideMode, string> = {
    human: "Human",
    random: "Random",
    greedy: "Greedy",
    greedy_response: "Greedy response",
    minimax: "Minimax",
  };
  const sel = select(
    MODE_OPTIONS as unknown as string[],
    (v) => labels[v as SideMode],
    current,
    (v) => onChange(v as SideMode),
  );
  return sel;
}

function select(
  values: readonly string[],
  label: (v: string) => string,
  current: string,
  onChange: (v: string) => void,
): HTMLSelectElement {
  const sel = document.createElement("select");
  for (const v of values) {
    const opt = document.createElement("option");
    opt.value = v;
    opt.textContent = label(v);
    if (v === current) opt.selected = true;
    sel.appendChild(opt);
  }
  sel.addEventListener("change", () => onChange(sel.value));
  return sel;
}

function field(labelText: string, control: HTMLElement): HTMLElement {
  const wrap = document.createElement("label");
  wrap.className = "field";
  const lbl = document.createElement("span");
  lbl.textContent = labelText;
  wrap.append(lbl, control);
  return wrap;
}
