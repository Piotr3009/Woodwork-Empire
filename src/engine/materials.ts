// Material ordering and deliveries. Material always arrives the next working day and always has to
// be unloaded before production can start (CLAUDE.md 8.9). From Turn 32 one store for every
// material: the sheets, the boards and the glass units are each on a counter of their own and on
// kit of their own, and bought, kept, held, ordered, unloaded and put in the paid store the same
// way, through the same functions taking the kind (PIOTR, 13.10: "identically to the sheets";
// CLAUDE.md T32 2.2 to 2.6).

import {
  BESPOKE_COST_UPLIFT,
  DELIVERY_WORKING_DAYS_BESPOKE,
  DELIVERY_WORKING_DAYS_STANDARD,
  GLASS_DELIVERY_WORKING_DAYS,
  GLASS_SHARE,
  LINE_BOARD_SAVING,
  LINE_GLASS_PER_WINDOW,
  LOW_STOCK_SHEETS,
  MATERIAL_FRACTION,
  SHEET_PRICE_LADDER,
  SHEET_VALUE,
  STOCK_KINDS,
  STOCK_LINE_NAME,
  STOCK_NUMBER_PREFIX,
  TEMP_STORAGE_COST,
} from './constants';
import { addWorkingDays } from './clock';
import { canAfford, pay } from './economy';
// The lines hold their week after the jobs, from the one road the jobs hold theirs by (CLAUDE.md T32
// 2.5); the line's module reads this one for the free stock, as contracts.ts does.
import { lineBoardsPerWindowCost, lineMaterialPerWindow, reserveEveryLinesMaterial } from './lineContract';
import {
  capacityOf,
  freeRoomFor,
  isSold,
  itemStandsInTheHall,
  jobsLine,
  lineModules,
  roomFor,
  stockKindOf,
  stockWords,
} from './machines';
import { keptWhilePinned } from './pinned';
import { makeId } from './rng';
import { createTask, unloadMinutes } from './tasks';
import { andList, plural } from './text';
import type { Delivery, GameState, Job, StockKind } from './types';

/** Sheets a job needs: one sheet is 200 of material value (PIOTR). */
export function sheetsForCost(cost: number): number {
  return Math.max(1, Math.ceil(cost / SHEET_VALUE));
}

/** The boards, or the sheets, a job of this material cost holds: the one count the board's tile
 *  and the job taken from it both read. A timber job's glass is not on it (CLAUDE.md T28 2.9), and
 *  a timber job taken while the line is N modules long is counted `LINE_BOARD_SAVING` fewer boards
 *  for each of them: the saving comes off the boards' cost to the penny before they are rounded up,
 *  never below one board, and what is saved is the boards that are not ordered (CLAUDE.md T29
 *  2.9.7) [TUNE: chat]. None for a job taken while the line works its own contract (CLAUDE.md T30
 *  2.5, 2.6). */
export function boardsForJob(state: GameState, materialCost: number, timber: boolean): number {
  const boards = boardsCostOf(materialCost, timber);
  if (!timber) return sheetsForCost(boards);
  const line = jobsLine(state);
  const modules = line === null ? 0 : lineModules(state, line);
  const kept = 1 - LINE_BOARD_SAVING * modules;
  return sheetsForCost(Math.round(boards * kept * 100) / 100);
}

/** What the shelving in the hall can hold: every rack in it, by its class. Two racks hold what
 *  the two of them hold (PIOTR, CLAUDE.md T7 3.6). A rack that is sold stands in the hall until the
 *  van comes, and it is no room: nothing is unloaded onto a rack that leaves in the morning
 *  (CLAUDE.md T20 2.10). The sheets' room, of the one sum (CLAUDE.md T32 2.2). */
export function rackCapacity(state: GameState): number {
  return roomFor(state, 'sheets');
}

/** What stands on this one rack, timber store or glass rack: its kind's stock put on that kind's
 *  kit in the order it was bought, each filled to what it holds, and anything past the last one's
 *  room on the last. A sold rack holds nothing. Every rack used to print the whole stock, so two
 *  racks showed it twice [PIOTR, 24.09: "28 and 28"] (v54). The one spread for the sheets, the
 *  boards and the glass (CLAUDE.md T29 2.11.2, T31 2.1, T32 2.1); nought on anything that keeps
 *  none. */
export function stockOnItem(state: GameState, item: { id: string }): number {
  // Every rack's share worked out once while the state is pinned: the hall asks it of every rack and
  // every rack asked it of the whole kit, a tenth of the hall's drawing on Piotr's save (v126).
  const spread = keptWhilePinned(state, 'stockSpread', () => stockSpread(state));
  if (spread !== null) return spread.get(item.id) ?? 0;
  const found = state.equipment.find((entry) => entry.id === item.id);
  const kind = found === undefined ? null : stockKindOf(found);
  if (kind === null) return 0;
  const kit = state.equipment.filter(
    (entry) => capacityOf(entry, kind) > 0 && !isSold(entry) && itemStandsInTheHall(entry),
  );
  let left = state.stock[kind];
  for (const [index, rack] of kit.entries()) {
    const here = index === kit.length - 1 ? left : Math.min(left, capacityOf(rack, kind));
    if (rack.id === item.id) return here;
    left -= here;
  }
  return 0;
}

/** What stands on every rack, timber store and glass rack, by its name: `stockOnItem`'s answer for
 *  each thing in the hall at once, the same spread of each kind over its kit (v126). */
function stockSpread(state: GameState): Map<string, number> {
  const byKind = new Map<StockKind, Map<string, number>>();
  for (const kind of STOCK_KINDS) {
    const kit = state.equipment.filter(
      (entry) => capacityOf(entry, kind) > 0 && !isSold(entry) && itemStandsInTheHall(entry),
    );
    const shares = new Map<string, number>();
    let left = state.stock[kind];
    for (const [index, rack] of kit.entries()) {
      const here = index === kit.length - 1 ? left : Math.min(left, capacityOf(rack, kind));
      if (!shares.has(rack.id)) shares.set(rack.id, here);
      left -= here;
    }
    byKind.set(kind, shares);
  }
  const spread = new Map<string, number>();
  for (const entry of state.equipment) {
    if (spread.has(entry.id)) continue;
    const kind = stockKindOf(entry);
    spread.set(entry.id, kind === null ? 0 : (byKind.get(kind)?.get(entry.id) ?? 0));
  }
  return spread;
}

/** Where each kind waits in the paid store for the night (CLAUDE.md T32 2.2). */
export const TEMP_STORAGE_KEY: Record<StockKind, 'tempStorageSheets' | 'tempStorageBoards' | 'tempStorageGlass'> = {
  sheets: 'tempStorageSheets',
  boards: 'tempStorageBoards',
  glass: 'tempStorageGlass',
};

/** Whether a load can come off its lorry: there has to be somewhere to put it, a sheet rack for
 *  sheets, a timber store for boards and a glass rack for glass units (CLAUDE.md T2 3.6, T32 2.6).
 *  What does not fit on that kit goes to the paid store, so a load waits at the gate only while its
 *  kind has no room at all. Asked without a load it is the racks' question, as it always was. */
export function canUnload(state: GameState, delivery?: Delivery): boolean {
  return roomFor(state, delivery?.material ?? 'sheets') > 0;
}

/** The kind a job's own material is kept as: a window's or a door's boards on the timber stores,
 *  and everything else, the oak table's timber among it, on the sheet racks as today (CLAUDE.md
 *  T29 2.11.2, T32 2.2). */
export function jobStockKind(job: { timber?: boolean }): StockKind {
  return job.timber === true ? 'boards' : 'sheets';
}

/** What of a kind is held and not yet used, by everything that holds it: a sheet job's and a sheet
 *  contract's sheets; a timber job's boards and a running line contract's; a timber job's glass and
 *  a running line contract's (CLAUDE.md T13 3.2, T17 2.22, T32 2.2). A contract holds what the week
 *  in hand wants, the way a job holds what it still has to cut; the contracts are read here rather
 *  than through contracts.ts, which asks this file for the free stock. */
export function reservedFor(state: GameState, kind: StockKind): number {
  let reserved = 0;
  for (const job of state.jobs) {
    if (job.stage === 'completed') continue;
    if (kind === 'glass') reserved += job.glassReserved;
    else if (jobStockKind(job) === kind) reserved += job.sheetsReserved;
  }
  if (kind === 'sheets') {
    for (const contract of state.contracts) {
      if (contract.status !== 'active') continue;
      reserved += contract.sheetsReserved;
    }
    return reserved;
  }
  for (const line of state.windowLines) {
    if (line.contract?.status !== 'active') continue;
    reserved += kind === 'boards' ? line.contract.boardsReserved : line.contract.glassReserved;
  }
  return reserved;
}

/** What of a kind nobody has a claim on: what a new job, a contract or the line can have
 *  (CLAUDE.md T13 3.2, T32 2.2). */
export function freeFor(state: GameState, kind: StockKind): number {
  return Math.max(0, state.stock[kind] - reservedFor(state, kind));
}

/** Sheets, or a timber job's boards, this job still needs and has not got: red on the card until
 *  Restock or an order for this job clears it (CLAUDE.md T13 3.3, 3.6). What it holds on its own
 *  pallet counts: a job's own delivery is the job's whether it fitted on the rack or not, so one
 *  order is one order (PIOTR: "materials for a 50k job want ordering several times"; CLAUDE.md T20
 *  2.16). */
export function shortfallOf(job: Job): number {
  return Math.max(0, job.sheets - job.sheetsUsed - job.sheetsReserved);
}

/** The glass units a window or a door still needs and has not got, held or used (CLAUDE.md T32
 *  2.4). */
export function glassShortfallOf(job: Job): number {
  return Math.max(0, job.glassUnits - job.glassUsed - job.glassReserved);
}

/** Holds what its kind's free stock can spare for this job, up to what it needs: a sheet job's
 *  sheets off the sheet racks and a timber job's boards off the timber stores, as a sheet job's
 *  sheets always were (CLAUDE.md T32 2.4). Bespoke material never comes off the stores: it is
 *  ordered in, and so is the oak table's timber, solid wood and not a window (CLAUDE.md 8.9, T13
 *  3.3). Returns what was held. */
export function reserveSheetsFor(state: GameState, job: Job): number {
  if (job.bespokeMaterial || (job.materialKind !== 'sheet' && job.timber !== true)) return 0;
  const wanted = shortfallOf(job);
  const held = Math.min(wanted, freeFor(state, jobStockKind(job)));
  if (held <= 0) return 0;
  job.sheetsReserved += held;
  return held;
}

/** Holds what the glass racks can spare for a window or a door, up to its glass units: bespoke or
 *  not, its glass is the stores' glass (CLAUDE.md T32 2.4) [TUNE: chat]. Returns what was held. */
export function reserveGlassFor(state: GameState, job: Job): number {
  if (job.timber !== true) return 0;
  const held = Math.min(glassShortfallOf(job), freeFor(state, 'glass'));
  if (held <= 0) return 0;
  job.glassReserved += held;
  return held;
}

/** After a load lands, a fetch from the paid store or a restock: every job with a shortfall holds
 *  what it can of each kind, in the order the jobs were accepted, a job that is now whole is ready,
 *  and then every line on its contract holds its week (CLAUDE.md T13 3.3, T32 2.4, 2.5). */
export function reserveShortfalls(state: GameState): void {
  holdForJobs(state, () => true);
  reserveEveryLinesMaterial(state);
}

/** The windows alone hold what they can of their boards and glass, in the order they were taken:
 *  at the open of a working day, before every line holds its week, so a line never takes the boards
 *  or the glass a window is short of (CLAUDE.md T32 2.5). A sheet job is not asked here. */
export function reserveWindowsShortfalls(state: GameState): void {
  holdForJobs(state, (job) => job.timber === true);
}

function holdForJobs(state: GameState, which: (job: Job) => boolean): void {
  for (const job of state.jobs) {
    if (job.stage === 'completed' || job.stage === 'awaitingTransport' || !which(job)) continue;
    reserveSheetsFor(state, job);
    reserveGlassFor(state, job);
  }
}

/** Everything a job held goes back to the free stock: it was dropped, or it is over. */
export function releaseReservation(job: Job): void {
  job.sheetsReserved = 0;
  job.glassReserved = 0;
}

/** The stock number a line carries, generated once per kind off the seed and stable across saves
 *  (CLAUDE.md T13 3.2). The sheets' digits are what they always were. */
export function stockNumberFor(state: GameState, kind: StockKind): string {
  const prefix = STOCK_NUMBER_PREFIX[kind];
  const digits = String(((state.seed % 997) + STOCK_KINDS.indexOf(kind) + 1) % 1000).padStart(3, '0');
  return `${prefix}-${digits}`;
}

/** A kind whose free count is under the low figure wears the badge on its line (CLAUDE.md T13
 *  3.2, T32 2.3). Its kit has to exist for the question to mean anything. */
export function stockIsLow(state: GameState, kind: StockKind): boolean {
  if (roomFor(state, kind) <= 0) return false;
  return freeFor(state, kind) < LOW_STOCK_SHEETS;
}

/** One line of the stock page: the kind, its name and stock number, the free, reserved and total,
 *  what its kit holds, and whether the line is low (CLAUDE.md T13 3.2, T32 2.7). The one selector
 *  the page draws and the test reads; the figures on it are the engine's and not the page's. */
export interface StockLine {
  kind: StockKind;
  name: string;
  number: string;
  free: number;
  reserved: number;
  total: number;
  capacity: number;
  low: boolean;
  /** The figure the badge is worn under. */
  lowUnder: number;
}

/** True while a kind is shown on the Materials page: the sheets always, and the boards and the
 *  glass once their kind's kit stands or anything of their kind is on the counter, on its way or in
 *  the paid store (CLAUDE.md T32 2.7) [TUNE]. */
export function stockKindShown(state: GameState, kind: StockKind): boolean {
  if (kind === 'sheets') return true;
  return (
    roomFor(state, kind) > 0 ||
    state.stock[kind] > 0 ||
    state.stock[TEMP_STORAGE_KEY[kind]] > 0 ||
    state.deliveries.some((delivery) => delivery.material === kind && !delivery.unloaded)
  );
}

export function stockLine(state: GameState, kind: StockKind): StockLine {
  return {
    kind,
    name: STOCK_LINE_NAME[kind],
    number: stockNumberFor(state, kind),
    free: freeFor(state, kind),
    reserved: reservedFor(state, kind),
    total: state.stock[kind],
    capacity: roomFor(state, kind),
    low: stockIsLow(state, kind),
    lowUnder: LOW_STOCK_SHEETS,
  };
}

/** The lines the page draws, in the order sheets, boards, glass, each while it is shown. */
export function stockLines(state: GameState): StockLine[] {
  return STOCK_KINDS.filter((kind) => stockKindShown(state, kind)).map((kind) => stockLine(state, kind));
}

/** What of a kind is bought for stock and not yet on its kit. A second Restock before the first
 *  lorry has landed would buy the same twice, so it counts as if it were here: one click is one
 *  order (CLAUDE.md T13 3.2, T32 2.3). */
export function pendingStockSheets(state: GameState, kind: StockKind): number {
  let pending = 0;
  for (const delivery of state.deliveries) {
    if (delivery.jobId === null && delivery.material === kind && !delivery.unloaded) pending += delivery.sheets;
  }
  return pending;
}

/** What Restock of a kind would buy: the number the player typed, whole, or, when he has typed
 *  none, what fills that kind's free places less what of it is already on its way for stock. The
 *  typed number was trimmed to the free places on the rack from v38, so a man who asked for sixty
 *  got forty and no word about the other twenty; from v58 he gets sixty, what fits goes on the kit
 *  and the rest goes into the temporary store on landing, which is the rule a job's own delivery
 *  has followed since Turn 20 [PIOTR, 22.09] (CLAUDE.md T13 3.2, T17 2.20, T20 2.16, T24 2.8). The
 *  page says the split and its fee before the click, so nothing about it is a surprise. The same
 *  for the boards and the glass (PIOTR, 13.10: "identically to the sheets"; CLAUDE.md T32 2.3). */
export function restockSheets(state: GameState, kind: StockKind, asked?: number): number {
  const room = freeRoomFor(state, kind) - pendingStockSheets(state, kind);
  if (asked === undefined) return Math.max(0, room);
  return Math.max(0, Math.floor(asked));
}

/** What a restock of this many does when it lands: what its kind's kit can hold of it, what goes
 *  into the temporary store, and what the store charges. The Materials page prints it before the
 *  click and the engine does it at the unload, off the same two numbers (CLAUDE.md T24 2.8, T32
 *  2.3). */
export function restockSplit(
  state: GameState,
  kind: StockKind,
  asked?: number,
): { sheets: number; onRack: number; toStorage: number; storageCost: number } {
  const sheets = restockSheets(state, kind, asked);
  const room = Math.max(0, freeRoomFor(state, kind) - pendingStockSheets(state, kind));
  const onRack = Math.min(sheets, room);
  const toStorage = sheets - onRack;
  return { sheets, onRack, toStorage, storageCost: toStorage > 0 ? TEMP_STORAGE_COST : 0 };
}

export interface RestockCheck {
  ok: boolean;
  reason: string;
  /** What the click would buy, and what it would cost. */
  sheets: number;
  cost: number;
}

/** The first refusal of a kind's Restock, in its own words: no kit of the kind at all (CLAUDE.md
 *  T13 3.2, T32 2.3) [TUNE: the boards' and the glass's]. */
const NO_KIT: Record<StockKind, string> = {
  sheets: 'No shelving yet',
  boards: 'No timber store',
  glass: 'No glass rack',
};

/** Nothing typed over a kind's full kit, with nothing on its way: the sheets' words as they were,
 *  and the other two's in theirs [TUNE]. */
const NO_ROOM: Record<StockKind, string> = {
  sheets: 'No room on the rack',
  boards: 'No room on the timber stores',
  glass: 'No room on the glass racks',
};

/** A count of a kind with its verb, for the refusal that says what is on its way: `12 sheets are`,
 *  `1 glass unit is`. */
function onTheWayWords(kind: StockKind, count: number): string {
  if (kind === 'sheets') return plural(count, 'sheet is', 'sheets are');
  if (kind === 'boards') return plural(count, 'board is', 'boards are');
  return plural(count, 'glass unit is', 'glass units are');
}

/** Whether Restock of a kind can be pressed, and why not when it cannot: the one answer its button
 *  prints and the office asks, refused in the same order for all three (CLAUDE.md T13 3.2, T32
 *  2.3). It is asked of the number the player typed, so the button says what that number would
 *  really buy (CLAUDE.md T17 2.20). */
export function restockCheck(state: GameState, kind: StockKind, asked?: number): RestockCheck {
  const refused = (reason: string): RestockCheck => ({ ok: false, reason, sheets: 0, cost: 0 });
  if (roomFor(state, kind) <= 0) return refused(NO_KIT[kind]);
  const sheets = restockSheets(state, kind, asked);
  const pending = pendingStockSheets(state, kind);
  if (sheets <= 0 && pending > 0) return refused(`${onTheWayWords(kind, pending)} on the way`);
  // A full rack is no longer a refusal: the player may buy past it and the overflow goes into the
  // store, which the page quotes him first (CLAUDE.md T24 2.8). Nought is still nothing to do,
  // which is what an empty field over a full rack asks for.
  if (sheets <= 0) return refused(NO_ROOM[kind]);
  const cost = stockCostFor(kind, sheets);
  if (!canAfford(state, cost)) return { ok: false, reason: 'Not enough cash', sheets, cost };
  return { ok: true, reason: '', sheets, cost };
}

/** What one glass unit costs: the glass of one window at what the line's own figures make it, the
 *  line's window's material less its two boards at what a board is worth, over the units a window
 *  takes: 200 [PIOTR, 13.10: "the prices and the quantity of glass are already set by the existing
 *  code for the production line"] (CLAUDE.md T32 2.3). One price, no ladder. */
export function glassUnitPrice(): number {
  return (lineMaterialPerWindow() - lineBoardsPerWindowCost()) / LINE_GLASS_PER_WINDOW;
}

/** The glass units a window or a door takes: its glass share of its material over a unit's price,
 *  rounded up, nought for a job that is not timber; a 9,000 casement window job has 3,600 of
 *  material, 1,260 of it glass, so 7 (CLAUDE.md T32 2.4) [TUNE: chat]. The board's tile and the job
 *  taken from it read this one count. */
export function glassForJob(materialCost: number, timber: boolean): number {
  if (!timber) return 0;
  const units = glassCostOf({ materialCost }) / glassUnitPrice();
  return Math.ceil(Math.round(units * 1e6) / 1e6);
}

/** What one of a kind costs on an order of this many: the sheets and the boards on Piotr's ladder,
 *  the glass at its one price (CLAUDE.md T23 2.16, T32 2.3) [TUNE: chat: the boards' ladder]. */
export function unitPriceFor(kind: StockKind, count: number): number {
  return kind === 'glass' ? glassUnitPrice() : sheetPriceFor(count);
}

/** What the order for one job's shortfall costs: its sheets, or a window's boards, at the ladder's
 *  price for the number on that order with the bespoke uplift where the material is bespoke
 *  (CLAUDE.md T13 3.3, T23 2.16), and a window's glass at a unit's price, the two together (CLAUDE.md
 *  T32 2.4). A take off of six sheets is a small order and pays the top of the ladder for it, which
 *  is what the old flat ad hoc price of 200 was. */
export function orderForJobCost(job: Job): number {
  return Math.round((shortOrderCost(job) + glassShortfallOf(job) * glassUnitPrice()) * 100) / 100;
}

/** The sheets' or the boards' half of a job's order, its bespoke uplift on it. */
function shortOrderCost(job: Job): number {
  const sheets = shortfallOf(job);
  const base = sheets * sheetPriceFor(sheets);
  return Math.round((job.bespokeMaterial ? base * (1 + BESPOKE_COST_UPLIFT) : base) * 100) / 100;
}

/** Whole sheets the job should have taken off the rack by the progress it has reached. A job on
 *  the bench always holds at least one sheet (CLAUDE.md T2 3.6). */
export function sheetsDueFor(job: Job, progress: number): number {
  if (job.sheets <= 0) return 0;
  return Math.min(job.sheets, Math.max(1, Math.ceil(job.sheets * progress)));
}

/** Sheets the next slice of work still has to come off the rack for. */
function sheetsOwedBy(job: Job, progress: number): number {
  return sheetsDueFor(job, progress) - job.sheetsUsed;
}

/** Asks its kind's counter without taking anything, so a job card can say what is in the way
 *  before the player presses anything (CLAUDE.md T3 3.1): the sheets for a sheet job, the boards
 *  for a window (CLAUDE.md T32 2.2). */
export function rackCanSupply(state: GameState, job: Job, progress: number): boolean {
  const due = sheetsOwedBy(job, progress);
  return due <= 0 || state.stock[jobStockKind(job)] >= due;
}

/** Takes what the next slice of work needs off its kind's counter. False when it cannot supply it,
 *  which stops the job where it stands. */
export function drawSheetsFor(state: GameState, job: Job, progress: number): boolean {
  const due = sheetsOwedBy(job, progress);
  if (due <= 0) return true;
  if (!rackCanSupply(state, job, progress)) return false;
  state.stock[jobStockKind(job)] -= due;
  job.sheetsUsed += due;
  // What it cuts comes out of what was held for it first (CLAUDE.md T13 3.3).
  job.sheetsReserved = Math.max(0, job.sheetsReserved - due);
  return true;
}

/** True while the glass racks can give a window at its Glazing the whole of its glass, what it holds
 *  first and then free glass, or it has taken it already (CLAUDE.md T32 2.4). The glass has to be on
 *  the racks, as a sheet has to be on the rack to be cut: what it holds in the paid store comes
 *  back with the morning's fetch. */
export function glassAtHand(state: GameState, job: Job): boolean {
  const owed = job.glassUnits - job.glassUsed;
  return owed <= 0 || (job.glassReserved + freeFor(state, 'glass') >= owed && state.stock.glass >= owed);
}

/** A window takes its whole glass off the racks the minute its Glazing starts: what it holds
 *  first, then free glass. False when the racks cannot give it all, and the window stands at its
 *  Glazing for it (CLAUDE.md T32 2.4). */
export function drawGlassFor(state: GameState, job: Job): boolean {
  const owed = job.glassUnits - job.glassUsed;
  if (owed <= 0) return true;
  if (!glassAtHand(state, job)) return false;
  state.stock.glass -= owed;
  job.glassReserved = Math.max(0, job.glassReserved - owed);
  job.glassUsed = job.glassUnits;
  return true;
}

/** What one sheet costs on an order of this many, off Piotr's ladder: the price of the last band
 *  the order reaches. The one function, and a job's take off and a restock both read it, because
 *  they are the same order at the same merchant's counter [PIOTR, 20.09] (CLAUDE.md T23 2.16). An
 *  order of nothing at all takes the dearest band, which is what a single sheet costs. */
export function sheetPriceFor(sheets: number): number {
  let price = SHEET_PRICE_LADDER[0]?.price ?? 0;
  for (const band of SHEET_PRICE_LADDER) {
    if (sheets >= band.from) price = band.price;
  }
  return price;
}

/** 0.40 of the price per job, 15% more when the material is bespoke (CLAUDE.md 8.4, 8.9). */
export function materialCostFor(price: number, bespoke: boolean): number {
  const base = price * MATERIAL_FRACTION;
  return Math.round((bespoke ? base * (1 + BESPOKE_COST_UPLIFT) : base) * 100) / 100;
}

/** What a restock of this many of a kind costs: the sheets and the boards off the same ladder the
 *  take off reads, buying a lot at once being what makes one cheap, and the glass at its one price
 *  (CLAUDE.md T23 2.16, T32 2.3). */
export function stockCostFor(kind: StockKind, count: number): number {
  return Math.round(count * unitPriceFor(kind, count) * 100) / 100;
}

/** The working day a load ordered today is in: the next for a standard load and for glass, three on
 *  for bespoke material (CLAUDE.md 8.9, T32 2.6). Glass is never bespoke. */
export function deliveryDay(state: GameState, bespoke: boolean, material: StockKind = 'sheets'): number {
  const days =
    material === 'glass'
      ? GLASS_DELIVERY_WORKING_DAYS
      : bespoke
        ? DELIVERY_WORKING_DAYS_BESPOKE
        : DELIVERY_WORKING_DAYS_STANDARD;
  return addWorkingDays(state.clock.day, days);
}

export function createDelivery(
  state: GameState,
  jobId: string | null,
  sheets: number,
  bespoke: boolean,
  pricePaid: number,
  material: StockKind,
): Delivery {
  const delivery: Delivery = {
    id: makeId(state, 'del'),
    jobId,
    sheets,
    orderedDay: state.clock.day,
    pricePaid,
    arriveDay: deliveryDay(state, bespoke, material),
    arrived: false,
    unloaded: false,
    bespoke,
    overflowSheets: 0,
    // What the load is, which kit it goes on (CLAUDE.md T32 2.6).
    material,
  };
  state.deliveries.push(delivery);
  return delivery;
}

/** The order for this job: its shortfall bought on a lorry for this job, a window's boards on one
 *  and its glass on another, both paid at the click and in at the next working day's open
 *  (CLAUDE.md T13 3.3, T32 2.4). The cash leaves at the click, so it is refused past the overdraft,
 *  the two together. Returns the loads it made, none when there is nothing to order, a load of the
 *  job is still to unload, or the money is not there.
 *
 *  `orderedBy` is the name of the man who placed it without being asked: the office admin, the
 *  minute the drawings are done (CLAUDE.md T21 2.5.2, T26 2.9). A `LedgerEntry` has no field for who
 *  did a thing, so the name goes in the label, which is what the player reads on the Accounting
 *  page; an order the owner placed himself names nobody, as it always did. A sheet job's line is
 *  `Material for ...` as it always was, a window's `Material for ...: boards` and `...: glass`
 *  [TUNE]. */
export function orderForJob(state: GameState, job: Job, orderedBy: string | null = null): Delivery[] {
  const sheets = shortfallOf(job);
  const glass = glassShortfallOf(job);
  if (sheets <= 0 && glass <= 0) return [];
  if (state.deliveries.some((delivery) => delivery.jobId === job.id && !delivery.unloaded)) return [];
  if (!canAfford(state, orderForJobCost(job))) return [];
  const label = (what: string): string => {
    const base = job.timber === true ? `Material for ${job.name}: ${what}` : `Material for ${job.name}`;
    return orderedBy === null ? base : `${base}, ordered by ${orderedBy}`;
  };
  const loads: Delivery[] = [];
  if (sheets > 0) {
    const cost = shortOrderCost(job);
    pay(state, 'material', label('boards'), cost);
    loads.push(createDelivery(state, job.id, sheets, job.bespokeMaterial, cost, jobStockKind(job)));
  }
  if (glass > 0) {
    const cost = Math.round(glass * glassUnitPrice() * 100) / 100;
    pay(state, 'material', label('glass'), cost);
    loads.push(createDelivery(state, job.id, glass, false, cost, 'glass'));
  }
  return loads;
}

/** What a timber job's glass and ironmongery cost: `GLASS_SHARE` of its material, to the penny
 *  (CLAUDE.md T28 2.9). */
export function glassCostOf(job: { materialCost: number }): number {
  return Math.round(job.materialCost * GLASS_SHARE * 100) / 100;
}

/** The boards of a timber job's material: what is left of it once the glass is taken out, so the
 *  two add up to the whole to the penny. A job with no glass is all boards (CLAUDE.md T28 2.9). */
export function boardsCostOf(materialCost: number, timber: boolean): number {
  if (!timber) return materialCost;
  return Math.round((materialCost - glassCostOf({ materialCost })) * 100) / 100;
}

export function findDelivery(state: GameState, deliveryId: string): Delivery | null {
  return state.deliveries.find((delivery) => delivery.id === deliveryId) ?? null;
}

export function deliveriesInYard(state: GameState): Delivery[] {
  return state.deliveries.filter((delivery) => delivery.arrived && !delivery.unloaded);
}

/** Everything ordered and not yet at the gate. */
export function deliveriesOnTheWay(state: GameState): Delivery[] {
  return state.deliveries.filter((delivery) => !delivery.arrived);
}

/** What the next morning brings, for the end of day summary. */
export function deliveriesArrivingOn(state: GameState, day: number): Delivery[] {
  return state.deliveries.filter((delivery) => !delivery.arrived && delivery.arriveDay <= day);
}

/** Marks today's lorries as here and puts the unloading on the task list, a load of any kind in
 *  its own words: `Unload 7 glass units` (CLAUDE.md T32 2.6). */
export function arriveDeliveries(state: GameState): Delivery[] {
  const arriving = state.deliveries.filter(
    (delivery) => !delivery.arrived && delivery.arriveDay <= state.clock.day,
  );
  for (const delivery of arriving) {
    delivery.arrived = true;
    createTask(state, {
      kind: 'unload',
      label: `Unload ${loadWords(delivery)}`,
      // By the size of the load: the first hundred and every hundred past them, whatever it is
      // (v75; CLAUDE.md T32 2.6) [TUNE].
      minutes: unloadMinutes(state, delivery.sheets),
      deliveryId: delivery.id,
      jobId: delivery.jobId,
    });
  }
  return arriving;
}

/** A load in the words the player reads it in: `12 sheets`, `19 boards`, `7 glass units`
 *  (CLAUDE.md T29 2.11.2, T32 2.6). */
export function loadWords(delivery: Delivery): string {
  return stockWords(delivery.material, delivery.sheets);
}

/** Buying a kind for stock: cheaper a piece than a job's own small order, but it ties up cash and
 *  room. One lorry for stock, in at the next working day's open, its line on the material line:
 *  `40 sheets for stock`, `40 boards for stock`, `20 glass units for stock`, with the name of the
 *  admin who placed it without being asked (CLAUDE.md T32 2.3, 2.5). */
export function buyStock(state: GameState, kind: StockKind, sheets: number, orderedBy: string | null = null): boolean {
  if (sheets <= 0) return false;
  const cost = stockCostFor(kind, sheets);
  if (!canAfford(state, cost)) return false;
  const label = `${stockWords(kind, sheets)} for stock`;
  pay(state, 'material', orderedBy === null ? label : `${label}, ordered by ${orderedBy}`, cost);
  createDelivery(state, null, sheets, false, cost, kind);
  return true;
}

/** A load comes off the lorry onto its kind's kit, by one path for all three (CLAUDE.md T32 2.6):
 *  what fits on that kind's free places goes on its counter and what does not goes to that kind's
 *  paid store, one fee for the load and the fetch chore in the morning (CLAUDE.md 8.9, T24 2.8). A
 *  load for one job is held for that job first; then every job with a shortfall holds what it can,
 *  in the order they were accepted, and every line its week (CLAUDE.md T13 3.3, T32 2.4, 2.5).
 *
 *  A job's own delivery is the job's whether it fits or not, so a bespoke load bigger than the
 *  rack does not leave the job short and its card does not ask for a second order (PIOTR, 18.09: a
 *  50,000 job ordered three times over; CLAUDE.md T20 2.16). What the rack took is held for it and
 *  what would not go on it goes straight to temporary storage for it, which is the path 2.16 names.
 *  This is Piotr's own fix of the same line, made on main while Turn 20 ran (commit a0a7d37), and the
 *  pallet that waits in the yard for room on the rack is in REPORT-T20.md if he wants it back. A load
 *  for stock takes the same path: the player asked for more than the kit holds, the page told him
 *  what the store would cost him, and being asked the question a second time at the lorry is asking
 *  him something he has already answered [PIOTR, 22.09] (CLAUDE.md T20 2.16, T24 2.8). */
export function unloadIntoStock(state: GameState, delivery: Delivery): void {
  const kind = delivery.material;
  const fitted = Math.min(delivery.sheets, freeRoomFor(state, kind));
  state.stock[kind] += fitted;
  delivery.overflowSheets = delivery.sheets - fitted;
  const job = delivery.jobId === null ? null : state.jobs.find((entry) => entry.id === delivery.jobId);
  if (job) {
    if (kind === 'glass') {
      const held = Math.min(delivery.sheets, glassShortfallOf(job));
      if (held > 0) job.glassReserved += held;
    } else {
      const held = Math.min(delivery.sheets, shortfallOf(job));
      if (held > 0) job.sheetsReserved += held;
    }
  }
  if (delivery.overflowSheets > 0) moveOverflowToStorage(state, delivery);
  reserveShortfalls(state);
}

/** 150 now for the load, and somebody loses an hour fetching it in the morning (CLAUDE.md 8.9):
 *  `Temporary storage for 12 boards` (CLAUDE.md T32 2.6). */
export function moveOverflowToStorage(state: GameState, delivery: Delivery): void {
  if (delivery.overflowSheets <= 0) return;
  pay(state, 'storage', `Temporary storage for ${stockWords(delivery.material, delivery.overflowSheets)}`, TEMP_STORAGE_COST);
  state.stock[TEMP_STORAGE_KEY[delivery.material]] += delivery.overflowSheets;
  delivery.overflowSheets = 0;
}

/** What of each kind is in the paid store, in its words and joined as the game joins them, the
 *  kinds with none left out: `12 sheets, 30 boards and 5 glass units`; empty with nothing there
 *  (CLAUDE.md T32 2.6) [TUNE]. The fetch chore's label and the Materials page's hint read it. */
export function storedWords(state: GameState): string {
  return andList(
    STOCK_KINDS.filter((kind) => state.stock[TEMP_STORAGE_KEY[kind]] > 0).map((kind) =>
      stockWords(kind, state.stock[TEMP_STORAGE_KEY[kind]]),
    ),
  );
}

/** The hour somebody loses in the morning bringing back what is in the paid store, every kind at
 *  one fetch. What comes back is held by the jobs that were short, in the order they were accepted,
 *  and then by the lines (CLAUDE.md T32 2.6). */
export function fetchFromStorage(state: GameState): void {
  for (const kind of STOCK_KINDS) {
    state.stock[kind] += state.stock[TEMP_STORAGE_KEY[kind]];
    state.stock[TEMP_STORAGE_KEY[kind]] = 0;
  }
  reserveShortfalls(state);
}
