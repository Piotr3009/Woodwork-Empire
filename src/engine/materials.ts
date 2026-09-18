// Material ordering and deliveries. Material always arrives the next working day and always has to
// be unloaded before production can start (CLAUDE.md 8.9).

import {
  BESPOKE_COST_UPLIFT,
  DELIVERY_WORKING_DAYS_BESPOKE,
  DELIVERY_WORKING_DAYS_STANDARD,
  LOW_STOCK_SHEETS,
  MATERIAL_FRACTION,
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
import { isSold, itemStandsInTheHall, sheetCapacityOf } from './machines';
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
  // A rack that is sold stands in the hall until the van comes, and it is no room: nothing is
  // unloaded onto a rack that leaves in the morning (CLAUDE.md T20 2.10).
  for (const item of state.equipment) {
    if (isSold(item) || !itemStandsInTheHall(item)) continue;
    capacity += sheetCapacityOf(item);
  }
  return capacity;
}

/** Nothing comes off a lorry until there is somewhere to put it (CLAUDE.md T2 3.6). */
export function canUnload(state: GameState): boolean {
  return rackCapacity(state) > 0;
}

/** Sheets on the rack held for accepted jobs and running contracts and not yet cut
 *  (CLAUDE.md T13 3.2, T17 2.22). A contract holds what the week in hand wants, the way a job
 *  holds what it still has to cut; the contracts are read here rather than through contracts.ts,
 *  which asks this file for the free stock. */
export function reservedSheets(state: GameState): number {
  let reserved = 0;
  for (const job of state.jobs) {
    if (job.stage === 'completed') continue;
    // What a job holds on its own pallet is the job's, but it is not on the rack, and the rack's
    // free count is the rack's (CLAUDE.md T20 2.16).
    reserved += Math.max(0, job.sheetsReserved - jobSheetsOnPallet(state, job.id));
  }
  for (const contract of state.contracts) {
    if (contract.status !== 'active') continue;
    reserved += contract.sheetsReserved;
  }
  return reserved;
}

/** Sheets on the rack nobody has a claim on: what a new job can have (CLAUDE.md T13 3.2). */
export function freeSheets(state: GameState): number {
  return Math.max(0, state.stock.sheets - reservedSheets(state));
}

/** Sheets this job still needs and has not got: red on the card until Restock or an order for
 *  this job clears it (CLAUDE.md T13 3.3, 3.6). What it holds on its own pallet counts: a job's
 *  own delivery is the job's whether it fitted on the rack or not, so one order is one order
 *  (PIOTR: "materials for a 50k job want ordering several times"; CLAUDE.md T20 2.16). */
export function shortfallOf(job: Job): number {
  return Math.max(0, job.sheets - job.sheetsUsed - job.sheetsReserved);
}

/** Sheets of this job's own deliveries that are its own and not on the rack: they would not fit
 *  when the lorry landed and they stand on their pallet until the rack has room. They are counted
 *  in the job's reservation, so its card is not short, and they are never left outside
 *  (CLAUDE.md T20 2.16). */
export function jobSheetsOnPallet(state: GameState, jobId: string): number {
  let sheets = 0;
  for (const delivery of state.deliveries) {
    if (delivery.jobId !== jobId || !delivery.unloaded) continue;
    sheets += delivery.overflowSheets;
  }
  return sheets;
}

/** Every pallet held for a job comes onto the rack the moment the cutting has made room for it.
 *  Hands back how many sheets went on (CLAUDE.md T20 2.16). */
export function landPalletSheets(state: GameState): number {
  let landed = 0;
  for (const delivery of state.deliveries) {
    if (delivery.jobId === null || !delivery.unloaded || delivery.overflowSheets <= 0) continue;
    const room = stockFree(state);
    if (room <= 0) break;
    const onto = Math.min(room, delivery.overflowSheets);
    state.stock.sheets += onto;
    delivery.overflowSheets -= onto;
    landed += onto;
  }
  return landed;
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

/** What Restock would buy: the number the player typed, or, when he has typed none, what fills the
 *  rack. Either way it is capped at the free places on the rack less what is already on the road
 *  for stock, because a lorry that cannot be unloaded is the overflow question of Turn 2 and a
 *  button should not walk the player into it (PIOTR, 16.09; CLAUDE.md T13 3.2, T17 2.20). */
export function restockSheets(state: GameState, asked?: number): number {
  const pending = pendingStockSheets(state);
  const room = stockFree(state) - pending;
  const wanted = asked === undefined ? room : Math.floor(asked);
  return Math.max(0, Math.min(wanted, room));
}

export interface RestockCheck {
  ok: boolean;
  reason: string;
  /** What the click would buy, and what it would cost at the stock price. */
  sheets: number;
  cost: number;
}

/** Whether Restock can be pressed, and why not when it cannot: the one answer the button prints
 *  (CLAUDE.md T13 3.2). It is asked of the number the player typed, so the button says what that
 *  number would really buy (CLAUDE.md T17 2.20). */
export function restockCheck(state: GameState, asked?: number): RestockCheck {
  const refused = (reason: string): RestockCheck => ({ ok: false, reason, sheets: 0, cost: 0 });
  if (rackCapacity(state) <= 0) return refused('No shelving yet');
  const sheets = restockSheets(state, asked);
  const pending = pendingStockSheets(state);
  if (sheets <= 0 && pending > 0) {
    return refused(`${plural(pending, 'sheet is', 'sheets are')} on the way`);
  }
  if (sheets <= 0) return refused('No room on the rack');
  const cost = stockCostFor(sheets);
  if (!canAfford(state, cost)) return { ok: false, reason: 'Not enough cash', sheets, cost };
  return { ok: true, reason: '', sheets, cost };
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
  // What a job's own lorry could not fit on the rack goes on it as soon as the cutting has made
  // the room (CLAUDE.md T20 2.16).
  landPalletSheets(state);
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
    // A job's own delivery is the job's whether it fits or not: what the rack took is held for it
    // and what would not go on it stands on its own pallet, held for it just the same, so a
    // bespoke load bigger than the rack does not leave the job short and its card does not ask
    // for a second order (PIOTR; CLAUDE.md T20 2.16).
    const held = Math.min(delivery.sheets, job.sheets - job.sheetsUsed - job.sheetsReserved);
    if (held > 0) job.sheetsReserved += held;
    reserveShortfalls(state);
    // Nothing of it is at risk and nothing is to be decided: the pallet waits for room on the
    // rack and is never written off.
    return 0;
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
    // A job's own pallet is not left outside: it is the job's, and it waits for room on the rack
    // (CLAUDE.md T20 2.16).
    if (delivery.jobId !== null) continue;
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
