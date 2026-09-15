// What is bought, paid for and not here yet (CLAUDE.md T8 3.2).
//
// A purchase is three separate things and none of them waits for another: the cash, which leaves
// at the click; the trip, which is the owner's own minutes; and the delivery, which is days by
// class. This module owns the third of them. The queries are pure; the two writes that need the
// rest of the world, standing the thing in the hall and giving the money back, live in game.ts.

import { DAY_ONE_KIT, DAY_ONE_SOFTWARE } from './constants';
import { addWorkingDays } from './clock';
import { deliveryDaysFor, findSpec, findVariant, itemStandsInTheHall } from './machines';
import { makeId } from './rng';
import type { GameState, OnOrderItem } from './types';

/** The working day an order placed today lands on, at 08:00. */
export function dueDayFor(state: GameState, specId: string, variantId: string): number {
  return addWorkingDays(state.clock.day, deliveryDaysFor(specId, variantId));
}

/** Books the delivery. The cash left at the click, so nothing is paid here: the price is carried
 *  so a cancellation can hand back exactly what was taken (CLAUDE.md T8 3.5). */
export function createOnOrder(
  state: GameState,
  order: {
    specId: string;
    variantId: string;
    pricePaid: number;
    anchorX: number;
    anchorY: number;
  },
): OnOrderItem {
  const item: OnOrderItem = {
    id: makeId(state, 'order'),
    specId: order.specId,
    variantId: order.variantId,
    pricePaid: order.pricePaid,
    orderedDay: state.clock.day,
    dueDay: dueDayFor(state, order.specId, order.variantId),
    anchorX: order.anchorX,
    anchorY: order.anchorY,
    arrived: false,
    rotated: false,
  };
  state.onOrder.push(item);
  return item;
}

export function findOnOrder(state: GameState, orderId: string): OnOrderItem | null {
  return state.onOrder.find((item) => item.id === orderId) ?? null;
}

export function removeOnOrder(state: GameState, orderId: string): void {
  state.onOrder = state.onOrder.filter((item) => item.id !== orderId);
}

/** What this class is called on the shopping list and in the ledger: the name of the class, not
 *  of the family, because that is what the player paid for. */
export function orderName(item: { specId: string; variantId: string }): string {
  return findVariant(item.specId, item.variantId)?.name ?? findSpec(item.specId)?.name ?? item.specId;
}

/** Everything still on its way, whatever it is. */
export function ordersOnTheWay(state: GameState): OnOrderItem[] {
  return state.onOrder.filter((item) => !item.arrived);
}

/** How many of this family are ordered and not here, so the next one of them is not promised the
 *  same tile (CLAUDE.md T8 3.2). */
export function onOrderCount(state: GameState, specId: string): number {
  return state.onOrder.filter((item) => item.specId === specId).length;
}

/** How many of these the company has counting what is bought and still on its way: what the
 *  hiring asks, because the man starts the next working day and his bench lands at 08:00 that
 *  morning (CLAUDE.md T8 3.2, 9.3). */
export function countOwnedOrOnOrder(state: GameState, specId: string): number {
  return state.equipment.filter((item) => item.specId === specId).length + onOrderCount(state, specId);
}

/** True when the workshop either has one of these standing in the hall or has bought and paid for
 *  one that is still on its way. What the board asks before it locks a job: a company that has
 *  ordered a saw is a company that can take sheet work, and the job will be days in the drawing
 *  and the material before anybody cuts anything (CLAUDE.md T8 3.2, REPORT-T8). */
export function hasOrOnOrder(state: GameState, specId: string): boolean {
  return countOwnedOrOnOrder(state, specId) > 0;
}

/** One line of the day one list: what it is, what it is called and whether it is ticked. */
export interface DayOneItem {
  id: string;
  label: string;
  /** Bought, or bought and still on the road: both count (CLAUDE.md T11 3.6). */
  done: boolean;
  /** True for the management licence, which is not a machine and has no folder of its own. */
  software: boolean;
}

/** The day one kit with a tick against everything the workshop has or has on order. The one
 *  selector: the card draws it and the test reads it (CLAUDE.md T11 3.6). */
export function dayOneKit(state: GameState): DayOneItem[] {
  return DAY_ONE_KIT.map((id) => {
    if (id === DAY_ONE_SOFTWARE) {
      return {
        id,
        label: 'Software licence',
        done: state.software.mode !== 'none',
        software: true,
      };
    }
    return {
      id,
      label: findSpec(id)?.name ?? id,
      done: hasOrOnOrder(state, id),
      software: false,
    };
  });
}

/** True once every line of it is ticked: the card collapses to one line and stays collapsed. */
export function dayOneComplete(state: GameState): boolean {
  return dayOneKit(state).every((item) => item.done);
}

/** The first of this family that is bought and still on its way, the soonest lorry first. A
 *  machine on order is a drawing on the floor and nothing more: it cuts nothing, extracts nothing
 *  and compresses nothing, and the hall says so in the words of this order (CLAUDE.md T10 1,
 *  3.10). */
export function firstOnOrder(state: GameState, specId: string): OnOrderItem | null {
  let soonest: OnOrderItem | null = null;
  for (const item of state.onOrder) {
    if (item.specId !== specId) continue;
    if (soonest === null || item.dueDay < soonest.dueDay) soonest = item;
  }
  return soonest;
}

/** The orders whose lorry is due by this day and that nobody has taken off it yet. */
export function ordersDueOn(state: GameState, day: number): OnOrderItem[] {
  return state.onOrder.filter((item) => !item.arrived && item.dueDay <= day);
}

/** The cells held on the hall floor for what is coming. Nothing may be built on them, and setup
 *  mode drags the outline about like a machine (CLAUDE.md T8 3.2). */
export function reservedItems(state: GameState): OnOrderItem[] {
  return state.onOrder.filter((item) => itemStandsInTheHall(item));
}

/** How far along the wait is, from the day of the click to the day of the lorry: 0 on the day it
 *  was ordered and 1 once it is due. Whole days, because a delivery lands at 08:00. */
export function orderProgress(item: { orderedDay: number; dueDay: number }, day: number): number {
  const span = item.dueDay - item.orderedDay;
  if (span <= 0) return 1;
  return Math.max(0, Math.min(1, (day - item.orderedDay) / span));
}

/** One line of the shopping list: a machine on its way, or a load of sheets (CLAUDE.md T8 3.2).
 *  The one selector the panel, the pin board count and the Owned tiles all read. */
export interface OrderLine {
  id: string;
  kind: 'equipment' | 'material';
  /** The class the player bought, or what the load of sheets is for. */
  name: string;
  detail: string;
  pricePaid: number;
  orderedDay: number;
  dueDay: number;
  /** 0 on the day of the click, 1 on the day of the lorry. */
  progress: number;
  /** True from 08:00 of the due day: it is at the gate, not on the road. */
  arrived: boolean;
  /** Only a machine can be called off, and only before the lorry (CLAUDE.md T8 3.5). */
  canCancel: boolean;
}

/** The job a load of sheets was ordered for, by name, or 'a job' once it is off the books. */
function jobNameFor(state: GameState, jobId: string): string {
  return state.jobs.find((job) => job.id === jobId)?.name ?? 'a job';
}

/** Everything on order, whatever it is, shortest wait first (PIOTR: the shortest time first). */
export function shoppingList(state: GameState): OrderLine[] {
  const day = state.clock.day;
  const lines: OrderLine[] = state.onOrder.map((item) => ({
    id: item.id,
    kind: 'equipment' as const,
    name: orderName(item),
    detail: findSpec(item.specId)?.folder ?? '',
    pricePaid: item.pricePaid,
    orderedDay: item.orderedDay,
    dueDay: item.dueDay,
    progress: orderProgress(item, day),
    arrived: item.arrived,
    canCancel: !item.arrived,
  }));
  for (const delivery of state.deliveries) {
    if (delivery.unloaded) continue;
    lines.push({
      id: delivery.id,
      kind: 'material',
      name: `${delivery.sheets} sheets`,
      // For stock, or for the job it was ordered for by name (CLAUDE.md T13 3.2, 3.3).
      detail: delivery.jobId === null ? 'for stock' : `for ${jobNameFor(state, delivery.jobId)}`,
      pricePaid: delivery.pricePaid,
      orderedDay: delivery.orderedDay,
      dueDay: delivery.arriveDay,
      progress: orderProgress({ orderedDay: delivery.orderedDay, dueDay: delivery.arriveDay }, day),
      arrived: delivery.arrived,
      // A load of sheets can be called off until the morning it lands, in full, exactly as a
      // machine can (PIOTR, 15.09; CLAUDE.md T11 3.12).
      canCancel: !delivery.arrived,
    });
  }
  return lines.sort((left, right) =>
    left.dueDay === right.dueDay ? left.orderedDay - right.orderedDay : left.dueDay - right.dueDay,
  );
}
