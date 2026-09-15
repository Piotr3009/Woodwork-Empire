// Material ordering and deliveries. Material always arrives the next working day and always has to
// be unloaded before production can start (CLAUDE.md 8.9).

import {
  BESPOKE_COST_UPLIFT,
  DELIVERY_WORKING_DAYS_BESPOKE,
  DELIVERY_WORKING_DAYS_STANDARD,
  LOW_STOCK_SHEETS,
  MATERIAL_FRACTION,
  RESTOCK_TO_SHEETS,
  SHEET_PRICE_AD_HOC,
  SHEET_PRICE_STOCK,
  SHEET_VALUE,
  STOCK_NUMBER_PREFIX,
  TEMP_STORAGE_COST,
  STOCK_LINE_NAME,
  STOCK_LINE_KINDS,
} from './constants';
import { addWorkingDays } from './clock';
import { canAfford, noteLoss, pay } from './economy';
import { sheetCapacityOf } from './machines';
import { makeId } from './rng';
import { createTask, unloadMinutes } from './tasks';
import { plural } from './text';
import type { Delivery, GameState, Job, MaterialKind } from './types';

/** Sheets a job needs: one sheet is 200 of material value (PIOTR). */
export function sheetsForCost(cost: number): number {
  return Math.max(1, Math.ceil(cost / SHEET_VALUE));
}

/** What the shelving in the hall can hold: every rack in it, by its class. Two racks hold what
 *  the two of them hold (PIOTR, CLAUDE.md T7 3.6). */
export function rackCapacity(state: GameState): number {
  let capacity = 0;
  for (const item of state.equipment) capacity += sheetCapacityOf(item);
  return capacity;
}

/** Nothing comes off a lorry until there is somewhere to put it (CLAUDE.md T2 3.6). */
export function canUnload(state: GameState): boolean {
  return rackCapacity(state) > 0;
}

/** Sheets on the rack held for accepted jobs and not yet cut (CLAUDE.md T13 3.2). */
export function reservedSheets(state: GameState): number {
  let reserved = 0;
  for (const job of state.jobs) {
    if (job.stage === 'completed') continue;
    reserved += job.sheetsReserved;
  }
  return reserved;
}

/** Sheets on the rack nobody has a claim on: what a new job can have (CLAUDE.md T13 3.2). */
export function freeSheets(state: GameState): number {
  return Math.max(0, state.stock.sheets - reservedSheets(state));
}

/** Sheets this job still needs and has not got: red on the card until Restock or an order for
 *  this job clears it (CLAUDE.md T13 3.3, 3.6). */
export function shortfallOf(job: Job): number {
  return Math.max(0, job.sheets - job.sheetsUsed - job.sheetsReserved);
}

/** Holds what the rack can spare for this job, up to what it needs. Bespoke material never comes
 *  off the rack: it is ordered in (CLAUDE.md 8.9, T13 3.3). Returns what was held. */
export function reserveSheetsFor(state: GameState, job: Job): number {
  if (job.materialKind !== 'sheet' || job.bespokeMaterial) return 0;
  const wanted = shortfallOf(job);
  const held = Math.min(wanted, freeSheets(state));
  if (held <= 0) return 0;
  job.sheetsReserved += held;
  return held;
}

/** After a restock lands: every job with a shortfall holds what it can, in the order the jobs
 *  were accepted, and a job that is now whole is ready (CLAUDE.md T13 3.3). */
export function reserveShortfalls(state: GameState): void {
  for (const job of state.jobs) {
    if (job.stage === 'completed' || job.stage === 'awaitingTransport') continue;
    reserveSheetsFor(state, job);
  }
}

/** Every sheet a job held goes back to the free stock: it was dropped, or it is over. */
export function releaseReservation(job: Job): void {
  job.sheetsReserved = 0;
}

/** The stock number a line carries, generated once per material kind off the seed and stable
 *  across saves (CLAUDE.md T13 3.2). */
export function stockNumberFor(state: GameState, kind: MaterialKind): string {
  const prefix = STOCK_NUMBER_PREFIX[kind];
  const digits = String(((state.seed % 997) + (kind === 'sheet' ? 1 : 2)) % 1000).padStart(3, '0');
  return `${prefix}-${digits}`;
}

/** A line whose free count is under the low figure wears the badge (CLAUDE.md T13 3.2). The rack
 *  has to exist for the question to mean anything. */
export function stockIsLow(state: GameState): boolean {
  if (rackCapacity(state) <= 0) return false;
  return freeSheets(state) < LOW_STOCK_SHEETS;
}

/** One line of the stock page: the kind, its name and stock number, the free, reserved and total
 *  sheets, what the rack holds, and whether the line is low (CLAUDE.md T13 3.2). The one selector
 *  the page draws and the test reads; the figures on it are the engine's and not the page's. */
export interface StockLine {
  kind: MaterialKind;
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

export function stockLines(state: GameState): StockLine[] {
  return STOCK_LINE_KINDS.map((kind) => ({
    kind,
    name: STOCK_LINE_NAME[kind],
    number: stockNumberFor(state, kind),
    free: freeSheets(state),
    reserved: reservedSheets(state),
    total: state.stock.sheets,
    capacity: rackCapacity(state),
    low: stockIsLow(state),
    lowUnder: LOW_STOCK_SHEETS,
  }));
}

/** Sheets bought for stock and not yet on the rack. A second Restock before the first lorry has
 *  landed would buy the same sheets twice, so they count as if they were here: one click is one
 *  order (CLAUDE.md T13 3.2). */
export function pendingStockSheets(state: GameState): number {
  let pending = 0;
  for (const delivery of state.deliveries) {
    if (delivery.jobId === null && !delivery.unloaded) pending += delivery.sheets;
  }
  return pending;
}

/** What Restock would buy: every low line brought back up to the restock figure, which tonight is
 *  the one line of sheets, less what is already on the road for stock, and never more than the
 *  rack has room for, because a lorry that cannot be unloaded is the overflow question of Turn 2
 *  and a button should not walk the player into it (CLAUDE.md T13 3.2). Zero when nothing is low. */
export function restockSheets(state: GameState): number {
  if (!stockIsLow(state)) return 0;
  const pending = pendingStockSheets(state);
  const wanted = RESTOCK_TO_SHEETS - freeSheets(state) - pending;
  const room = stockFree(state) - pending;
  return Math.max(0, Math.min(wanted, room));
}

export interface RestockCheck {
  ok: boolean;
  reason: string;
  /** What the click would buy, and what it would cost at the stock price. */
  sheets: number;
  cost: number;
  /** The figure every low line is brought back to. */
  target: number;
}

/** Whether Restock can be pressed, and why not when it cannot: the one answer the button prints
 *  (CLAUDE.md T13 3.2). */
export function restockCheck(state: GameState): RestockCheck {
  const target = RESTOCK_TO_SHEETS;
  const refused = (reason: string): RestockCheck => ({ ok: false, reason, sheets: 0, cost: 0, target });
  if (rackCapacity(state) <= 0) return refused('No shelving yet');
  if (!stockIsLow(state)) return refused('Nothing is low');
  const sheets = restockSheets(state);
  const pending = pendingStockSheets(state);
  if (sheets <= 0 && pending > 0) {
    return refused(`${plural(pending, 'sheet is', 'sheets are')} on the way`);
  }
  if (sheets <= 0) return refused('No room on the rack');
  const cost = stockCostFor(sheets);
  if (!canAfford(state, cost)) return { ok: false, reason: 'Not enough cash', sheets, cost, target };
  return { ok: true, reason: '', sheets, cost, target };
}

/** What buying the shortfall of one job ad hoc costs: the ad hoc price, and the bespoke uplift
 *  where the material is bespoke (CLAUDE.md T13 3.3). */
export function orderForJobCost(job: Job): number {
  const base = shortfallOf(job) * SHEET_PRICE_AD_HOC;
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

/** Asks the rack without taking anything, so a job card can say what is in the way before the
 *  player presses anything (CLAUDE.md T3 3.1). */
export function rackCanSupply(state: GameState, job: Job, progress: number): boolean {
  const due = sheetsOwedBy(job, progress);
  return due <= 0 || state.stock.sheets >= due;
}

/** Takes what the next slice of work needs off the rack. False when the rack cannot supply it,
 *  which stops the job where it stands. */
export function drawSheetsFor(state: GameState, job: Job, progress: number): boolean {
  const due = sheetsOwedBy(job, progress);
  if (due <= 0) return true;
  if (!rackCanSupply(state, job, progress)) return false;
  state.stock.sheets -= due;
  job.sheetsUsed += due;
  // What it cuts comes out of what was held for it first (CLAUDE.md T13 3.3).
  job.sheetsReserved = Math.max(0, job.sheetsReserved - due);
  return true;
}

/** 0.40 of the price per job, 15% more when the material is bespoke (CLAUDE.md 8.4, 8.9). */
export function materialCostFor(price: number, bespoke: boolean): number {
  const base = price * MATERIAL_FRACTION;
  return Math.round((bespoke ? base * (1 + BESPOKE_COST_UPLIFT) : base) * 100) / 100;
}

/** Sheets bought in advance are cheaper, which is the 0.34 P of CLAUDE.md 8.9. */
export function stockCostFor(sheets: number): number {
  return Math.round(sheets * SHEET_PRICE_STOCK * 100) / 100;
}

export function deliveryDay(state: GameState, bespoke: boolean): number {
  const days = bespoke ? DELIVERY_WORKING_DAYS_BESPOKE : DELIVERY_WORKING_DAYS_STANDARD;
  return addWorkingDays(state.clock.day, days);
}

export function createDelivery(
  state: GameState,
  jobId: string | null,
  sheets: number,
  bespoke: boolean,
  pricePaid = 0,
): Delivery {
  const delivery: Delivery = {
    id: makeId(state, 'del'),
    jobId,
    sheets,
    orderedDay: state.clock.day,
    pricePaid,
    arriveDay: deliveryDay(state, bespoke),
    arrived: false,
    unloaded: false,
    bespoke,
    overflowSheets: 0,
  };
  state.deliveries.push(delivery);
  return delivery;
}

/** The order for this job: the shortfall bought at the ad hoc price, on a lorry for this job
 *  (CLAUDE.md T13 3.3). The cash leaves at the click, so it is refused past the overdraft. */
export function orderForJob(state: GameState, job: Job): Delivery | null {
  const sheets = shortfallOf(job);
  if (sheets <= 0) return null;
  if (state.deliveries.some((delivery) => delivery.jobId === job.id && !delivery.unloaded)) {
    return null;
  }
  const cost = orderForJobCost(job);
  if (!canAfford(state, cost)) return null;
  pay(state, 'material', `Material for ${job.name}`, cost);
  return createDelivery(state, job.id, sheets, job.bespokeMaterial, cost);
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

/** Marks today's lorries as here and puts the unloading on the task list. */
export function arriveDeliveries(state: GameState): Delivery[] {
  const arriving = state.deliveries.filter(
    (delivery) => !delivery.arrived && delivery.arriveDay <= state.clock.day,
  );
  for (const delivery of arriving) {
    delivery.arrived = true;
    createTask(state, {
      kind: 'unload',
      label: `Unload ${plural(delivery.sheets, 'sheet', 'sheets')}`,
      minutes: unloadMinutes(state),
      deliveryId: delivery.id,
      jobId: delivery.jobId,
    });
  }
  return arriving;
}

/** Room left on the sheet rack. */
export function stockFree(state: GameState): number {
  return Math.max(0, rackCapacity(state) - state.stock.sheets);
}

/** Buying sheets in advance: cheaper per job, but it ties up cash and rack space. */
export function buyStock(state: GameState, sheets: number): boolean {
  if (sheets <= 0) return false;
  const cost = stockCostFor(sheets);
  if (!canAfford(state, cost)) return false;
  pay(state, 'material', `${sheets} sheets for stock`, cost);
  createDelivery(state, null, sheets, false, cost);
  return true;
}

/** Sheets come off the lorry. What does not fit on the rack needs a decision (CLAUDE.md 8.9).
 *  A load for one job is held for that job first; whatever else lands is free for every job with
 *  a shortfall, in the order they were accepted (CLAUDE.md T13 3.3). */
export function unloadIntoStock(state: GameState, delivery: Delivery): number {
  const room = stockFree(state);
  const fitted = Math.min(delivery.sheets, room);
  state.stock.sheets += fitted;
  const overflow = delivery.sheets - fitted;
  delivery.overflowSheets = overflow;
  const job = delivery.jobId === null ? null : state.jobs.find((entry) => entry.id === delivery.jobId);
  if (job) {
    // The job's own sheets come off its own lorry: reserved for it, bespoke or not.
    const held = Math.min(fitted, job.sheets - job.sheetsUsed - job.sheetsReserved);
    if (held > 0) job.sheetsReserved += held;
  }
  reserveShortfalls(state);
  return overflow;
}

/** 150 now, and somebody loses an hour fetching them in the morning (CLAUDE.md 8.9). */
export function moveOverflowToStorage(state: GameState, delivery: Delivery): void {
  if (delivery.overflowSheets <= 0) return;
  pay(state, 'storage', `Temporary storage for ${delivery.overflowSheets} sheets`, TEMP_STORAGE_COST);
  state.stock.tempStorageSheets += delivery.overflowSheets;
  delivery.overflowSheets = 0;
}

/** Sheets left in the yard overnight are gone in the morning. */
export function writeOffSheetsLeftOutside(state: GameState): number {
  let lost = 0;
  for (const delivery of state.deliveries) {
    if (delivery.overflowSheets <= 0) continue;
    lost += delivery.overflowSheets;
    delivery.overflowSheets = 0;
  }
  if (lost > 0) {
    // The cash went days ago: this line is the loss, not a payment.
    noteLoss(state, 'material', `${lost} sheets left outside, written off`, stockCostFor(lost));
  }
  return lost;
}

/** The hour somebody loses in the morning bringing the stored sheets back. */
export function fetchFromStorage(state: GameState): void {
  state.stock.sheets += state.stock.tempStorageSheets;
  state.stock.tempStorageSheets = 0;
}
