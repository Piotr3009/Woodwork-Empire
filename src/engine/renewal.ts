/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// v105: a store behind the rear wall made twice the size where it stands, and a machine at the end
// of its life replaced by a new one of its class in the same place [PIOTR, 18.10: "for the same
// again, more shelves and twice the room in one shelter; the easiest, the colour just changes to
// red"; "when it is already red, a button to replace the equipment, and then we wait as long as it
// takes, we pay what it costs, but the old one disappears and the new one appears in exactly the
// same place"].
//
// The two are one module because they are the one thing done to a piece of kit that stands: it is
// made more of where it is, and nothing about where it is moves. The checks are pure; the writes
// pay, mark the item and, for a new machine, put it right on the morning it comes.

import { EXPANDABLE_STORES, LIFE_LOW_FRACTION } from './constants';
import { formatCalendarDay } from './clock';
import { canAfford, formatMoney, pay } from './economy';
import { queueEvent } from './events';
import { enduranceHoursFor, findSpec, isLineModule, isSold, variantFor } from './machines';
import { dueDayFor } from './orders';
import type { Equipment, GameState } from './types';

/** A refusal in the words the button prints, or nothing to refuse. */
export interface RenewalCheck {
  ok: boolean;
  reason: string;
}

const OK: RenewalCheck = { ok: true, reason: '' };

function refused(reason: string): RenewalCheck {
  return { ok: false, reason };
}

function itemById(state: GameState, equipmentId: string): Equipment | null {
  return state.equipment.find((entry) => entry.id === equipmentId) ?? null;
}

/** What the class this item is of costs new: the price of the store made bigger and of the new
 *  machine alike [PIOTR, 18.10: "for the same again", "we pay what it costs"]. */
function classPriceOf(item: Equipment): number {
  return variantFor(item)?.price ?? findSpec(item.specId)?.price ?? 0;
}

// ---------------------------------------------------------------------------
// The store made bigger
// ---------------------------------------------------------------------------

/** True for a store behind the rear wall that can be made bigger where it stands (v105). */
export function isExpandableStore(specId: string): boolean {
  return EXPANDABLE_STORES.includes(specId);
}

/** What making this store bigger costs: its class's price again [PIOTR, 18.10]. */
export function expansionPrice(item: Equipment): number {
  return classPriceOf(item);
}

/** Why this store cannot be made bigger now, or that it can: a store behind the wall, once, while
 *  it is the company's, for the price. The card's button and the action read the same refusals. */
export function expandStoreCheck(state: GameState, equipmentId: string): RenewalCheck {
  const item = itemById(state, equipmentId);
  if (item === null) return refused('No such store');
  if (!isExpandableStore(item.specId)) return refused('It cannot be made bigger');
  if (item.expanded === true) return refused('Made bigger already');
  if (isSold(item)) return refused('Sold');
  if (!canAfford(state, expansionPrice(item))) return refused('Not enough cash');
  return OK;
}

/** Makes the store bigger where it stands, at once [TUNE: chat: no wait, no men; the shelves are
 *  put up behind the wall]: paid on the equipment line, twice its class's room from this minute
 *  (`capacityOf` reads the mark), drawn red, and its price added to what it cost, so its sale
 *  and its insured value carry the shelves too [TUNE: chat]. */
export function expandStore(state: GameState, equipmentId: string): RenewalCheck {
  const check = expandStoreCheck(state, equipmentId);
  if (!check.ok) return check;
  const item = itemById(state, equipmentId);
  if (item === null) return refused('No such store');
  const price = expansionPrice(item);
  const name = findSpec(item.specId)?.name ?? item.specId;
  pay(state, 'equipment', `${name} made bigger`, price);
  item.expanded = true;
  item.purchasePrice += price;
  return OK;
}

// ---------------------------------------------------------------------------
// The machine replaced
// ---------------------------------------------------------------------------

/** True while there is less than a tenth of the life left, which is when the bar on the Machines
 *  page turns red [PIOTR, 18.09] and the machine can be replaced [PIOTR, 18.10]. A thing with no
 *  life to run out is never low. */
export function lifeIsLow(item: Equipment): boolean {
  if (item.enduranceHours <= 0) return false;
  const used = Math.min(1, item.hoursUsed / item.enduranceHours);
  return 1 - used < LIFE_LOW_FRACTION;
}

/** True for kit that has a life to run out and so can be replaced: the machines and the extraction
 *  kit, which are what the Machines page lists. A module of a line has no life (CLAUDE.md T29
 *  2.9.8), and nothing else stands on that page. */
export function isReplaceable(specId: string): boolean {
  const category = findSpec(specId)?.category;
  if (category !== 'machine' && category !== 'extraction') return false;
  return !isLineModule(specId);
}

/** What the new one costs: its class's price, the same as buying it [PIOTR, 18.10]. The old one
 *  goes back on the lorry and nothing is paid for it [TUNE: chat]. */
export function replacementPrice(item: Equipment): number {
  return classPriceOf(item);
}

/** The working day the new one would stand in the hall at 08:00 if it were ordered now: the class's
 *  own delivery, as buying it would be [PIOTR, 18.10: "we wait as long as it takes"]. */
export function replacementDueDay(state: GameState, item: Equipment): number {
  return dueDayFor(state, item.specId, item.variantId);
}

/** Why this machine cannot be replaced now, or that it can: kit with a life, the company's, with
 *  less than a tenth of its life left, no new one already on its way, and the cash for one. */
export function replaceCheck(state: GameState, equipmentId: string): RenewalCheck {
  const item = itemById(state, equipmentId);
  if (item === null) return refused('No such machine');
  if (!isReplaceable(item.specId)) return refused('It is not replaced');
  if (isSold(item)) return refused('Sold');
  if (item.replacementDay !== undefined && item.replacementDay !== null) return refused('A new one is on its way');
  if (!lifeIsLow(item)) return refused('It has life left in it');
  if (!canAfford(state, replacementPrice(item))) return refused('Not enough cash');
  return OK;
}

/** Orders the new one: paid at the click on the equipment line, as any purchase is, and the day
 *  it comes written on the old one, which works until that morning [TUNE: chat]. */
export function replaceMachine(state: GameState, equipmentId: string): RenewalCheck {
  const check = replaceCheck(state, equipmentId);
  if (!check.ok) return check;
  const item = itemById(state, equipmentId);
  if (item === null) return refused('No such machine');
  const name = variantFor(item)?.name ?? findSpec(item.specId)?.name ?? item.specId;
  pay(state, 'equipment', `${name}, a new one for the old`, replacementPrice(item));
  item.replacementDay = replacementDueDay(state, item);
  return OK;
}

/** 08:00 on the day it comes: the new machine stands where the old one stood, turned the same
 *  way, on the same pipe, gate and air, and the old one goes back on the lorry [PIOTR, 18.10]. It
 *  is the old record made new [TUNE: chat: no unloading, the fitters swap them]: its whole life,
 *  no services, six months to its first, not broken, not out, and what it cost. What the old one
 *  was waiting for, a repair or a service, goes with it, and nobody is left at it. */
export function arriveReplacements(state: GameState): Equipment[] {
  const renewed: Equipment[] = [];
  for (const item of state.equipment) {
    if (item.replacementDay === undefined || item.replacementDay === null) continue;
    if (item.replacementDay > state.clock.day) continue;
    delete item.replacementDay;
    item.enduranceHours = enduranceHoursFor(item.specId, item.variantId);
    item.hoursUsed = 0;
    item.serviceCount = 0;
    item.servicedDay = state.clock.day;
    item.inServiceUntilDay = null;
    item.broken = false;
    item.milesDriven = 0;
    item.purchasePrice = replacementPrice(item);
    forgetOpenTasksOf(state, item.id);
    renewed.push(item);
    const name = findSpec(item.specId)?.name ?? item.specId;
    queueEvent(state, {
      kind: 'machineReplaced',
      title: `New ${name.toLowerCase()} in`,
      body:
        `The new one stands where the old one stood, with its whole life in it. The old one went ` +
        `back on the lorry this morning.`,
      choices: [{ id: 'ok', label: 'Right' }],
      data: { equipmentId: item.id, specId: item.specId },
    });
  }
  return renewed;
}

/** The words of the wait on the machine's row and its card: `New one on order, due Tue 4 Mar`. */
export function replacementWords(item: Equipment): string {
  if (item.replacementDay === undefined || item.replacementDay === null) return '';
  return `New one on order, due ${formatCalendarDay(item.replacementDay)}`;
}

/** What the Replace button says it buys, for its title: the class's price and the day it comes. */
export function replacementLine(state: GameState, item: Equipment): string {
  return (
    `A new one of its class in the same place, ${formatMoney(replacementPrice(item))}, ` +
    `here on ${formatCalendarDay(replacementDueDay(state, item))} at 08:00`
  );
}

/** Every task still open for this piece of kit off the list, and nobody left at one: the one path
 *  for kit that goes, sold or swapped. */
export function forgetOpenTasksOf(state: GameState, equipmentId: string): void {
  const orphaned = new Set(
    state.tasks.filter((task) => task.equipmentId === equipmentId && !task.done).map((task) => task.id),
  );
  if (orphaned.size === 0) return;
  state.tasks = state.tasks.filter((task) => !orphaned.has(task.id));
  if (state.owner.currentTaskId !== null && orphaned.has(state.owner.currentTaskId)) {
    state.owner.currentTaskId = null;
  }
  for (const worker of state.workers) {
    if (worker.taskId !== null && orphaned.has(worker.taskId)) worker.taskId = null;
  }
}
