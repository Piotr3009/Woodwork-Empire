// Material ordering and deliveries. Material always arrives the next working day and always has to
// be unloaded before production can start (CLAUDE.md 8.9).

import {
  BESPOKE_COST_UPLIFT,
  DELIVERY_WORKING_DAYS_BESPOKE,
  DELIVERY_WORKING_DAYS_STANDARD,
  MATERIAL_FRACTION,
  SHEET_PRICE,
  SHEET_PRICE_STOCK,
  TEMP_STORAGE_COST,
} from './constants';
import { addWorkingDays } from './clock';
import { canAfford, pay } from './economy';
import { makeId } from './rng';
import { createTask, unloadMinutes } from './tasks';
import type { Delivery, GameState, Job, MaterialMode } from './types';

/** Sheets a job needs, from what its material costs [TUNE: one sheet is SHEET_PRICE]. */
export function sheetsForCost(cost: number): number {
  return Math.max(1, Math.ceil(cost / SHEET_PRICE));
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
    overflowResolved: true,
  };
  state.deliveries.push(delivery);
  return delivery;
}

/** The per job order: pay for the material and book the lorry (CLAUDE.md 8.9). */
export function orderMaterialForJob(state: GameState, job: Job): Delivery | null {
  if (job.materialMode !== 'perJob') return null;
  pay(state, 'material', `Material for ${job.name}`, job.materialCost);
  return createDelivery(state, job.id, job.sheets, job.bespokeMaterial);
}

export function findDelivery(state: GameState, deliveryId: string): Delivery | null {
  return state.deliveries.find((delivery) => delivery.id === deliveryId) ?? null;
}

export function deliveriesInYard(state: GameState): Delivery[] {
  return state.deliveries.filter((delivery) => delivery.arrived && !delivery.unloaded);
}

export function deliveriesDueTomorrow(state: GameState): Delivery[] {
  return state.deliveries.filter((delivery) => !delivery.arrived);
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
  return Math.max(0, state.stock.capacity - state.stock.sheets);
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
  delivery.overflowResolved = overflow === 0;
  return overflow;
}

/** 150 now, and somebody loses an hour fetching them in the morning (CLAUDE.md 8.9). */
export function moveOverflowToStorage(state: GameState, delivery: Delivery): void {
  if (delivery.overflowSheets <= 0) return;
  pay(state, 'storage', `Temporary storage for ${delivery.overflowSheets} sheets`, TEMP_STORAGE_COST);
  state.stock.tempStorageSheets += delivery.overflowSheets;
  delivery.overflowSheets = 0;
  delivery.overflowResolved = true;
}

/** Sheets left in the yard overnight are gone in the morning. */
export function writeOffSheetsLeftOutside(state: GameState): number {
  let lost = 0;
  for (const delivery of state.deliveries) {
    if (delivery.overflowSheets <= 0) continue;
    lost += delivery.overflowSheets;
    delivery.overflowSheets = 0;
    delivery.overflowResolved = true;
  }
  if (lost > 0) {
    // The cash went days ago: this line is the loss, not a payment.
    writeOffLedger(state, lost);
  }
  return lost;
}

function writeOffLedger(state: GameState, sheets: number): void {
  const value = stockCostFor(sheets);
  state.ledger.push({
    id: makeId(state, 'ledger'),
    day: state.clock.day,
    minute: state.clock.minute,
    category: 'material',
    label: `${sheets} sheets left outside, written off`,
    amount: -value,
    balance: state.cash,
    unpaid: true,
  });
}

/** The hour somebody loses in the morning bringing the stored sheets back. */
export function fetchFromStorage(state: GameState): void {
  state.stock.sheets += state.stock.tempStorageSheets;
  state.stock.tempStorageSheets = 0;
}
