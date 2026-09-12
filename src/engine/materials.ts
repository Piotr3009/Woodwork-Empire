// Material ordering and deliveries. Material always arrives the next working day and always has to
// be unloaded before production can start (CLAUDE.md 8.9).

import {
  BESPOKE_COST_UPLIFT,
  DELIVERY_WORKING_DAYS_BESPOKE,
  DELIVERY_WORKING_DAYS_STANDARD,
  LOW_STOCK_FRACTION,
  MATERIAL_FRACTION,
  SHEET_PRICE_STOCK,
  SHEET_VALUE,
  TEMP_STORAGE_COST,
} from './constants';
import { addWorkingDays } from './clock';
import { canAfford, chargeUnavoidable, noteLoss, pay } from './economy';
import { findSpec } from './machines';
import { makeId } from './rng';
import { createTask, unloadMinutes } from './tasks';
import type { Delivery, GameState, Job, MaterialMode } from './types';

/** Sheets a job needs: one sheet is 200 of material value (PIOTR). */
export function sheetsForCost(cost: number): number {
  return Math.max(1, Math.ceil(cost / SHEET_VALUE));
}

/** What the shelving in the hall can hold. No shelving, no room for a delivery (PIOTR). */
export function rackCapacity(state: GameState): number {
  let capacity = 0;
  for (const item of state.equipment) {
    const spec = findSpec(item.specId);
    if (spec && spec.sheetCapacity > capacity) capacity = spec.sheetCapacity;
  }
  return capacity;
}

/** Nothing comes off a lorry until there is somewhere to put it (CLAUDE.md T2 3.6). */
export function canUnload(state: GameState): boolean {
  return rackCapacity(state) > 0;
}

/** The rack is nearly empty and the joiners are about to run out (CLAUDE.md T2 3.6). */
export function stockIsLow(state: GameState): boolean {
  const capacity = rackCapacity(state);
  if (capacity <= 0) return false;
  return state.stock.sheets < capacity * LOW_STOCK_FRACTION;
}

/** Whole sheets the job should have taken off the rack by the progress it has reached. A job on
 *  the bench always holds at least one sheet (CLAUDE.md T2 3.6). */
export function sheetsDueFor(job: Job, progress: number): number {
  if (job.sheets <= 0) return 0;
  return Math.min(job.sheets, Math.max(1, Math.ceil(job.sheets * progress)));
}

/** Takes what the next slice of work needs off the rack. False when the rack cannot supply it,
 *  which stops the job where it stands. */
export function drawSheetsFor(state: GameState, job: Job, progress: number): boolean {
  const due = sheetsDueFor(job, progress) - job.sheetsUsed;
  if (due <= 0) return true;
  if (state.stock.sheets < due) return false;
  state.stock.sheets -= due;
  job.sheetsUsed += due;
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
): Delivery {
  const delivery: Delivery = {
    id: makeId(state, 'del'),
    jobId,
    sheets,
    arriveDay: deliveryDay(state, bespoke),
    arrived: false,
    unloaded: false,
    bespoke,
    overflowSheets: 0,
  };
  state.deliveries.push(delivery);
  return delivery;
}

/** The per job order: pay for the material and book the lorry (CLAUDE.md 8.9). */
export function orderMaterialForJob(state: GameState, job: Job): Delivery | null {
  if (job.materialMode !== 'perJob') return null;
  // The lorry is booked and the supplier will be paid, overdraft or not (CLAUDE.md 8.3).
  chargeUnavoidable(state, 'material', `Material for ${job.name}`, job.materialCost);
  return createDelivery(state, job.id, job.sheets, job.bespokeMaterial);
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
      label: `Unload ${delivery.sheets} sheets`,
      minutes: unloadMinutes(state),
      deliveryId: delivery.id,
      jobId: delivery.jobId,
    });
  }
  return arriving;
}

export function materialModeLabel(mode: MaterialMode): string {
  return mode === 'stock' ? 'from stock' : 'ordered per job';
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
  createDelivery(state, null, sheets, false);
  return true;
}

/** Sheets come off the lorry. What does not fit on the rack needs a decision (CLAUDE.md 8.9). */
export function unloadIntoStock(state: GameState, delivery: Delivery): number {
  const room = stockFree(state);
  const fitted = Math.min(delivery.sheets, room);
  state.stock.sheets += fitted;
  const overflow = delivery.sheets - fitted;
  delivery.overflowSheets = overflow;
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
