/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// The purchase manager (v128) [PIOTR, 26.10: "we have a problem with ordering the goods: a new post,
// somebody who orders the goods every day, a purchase manager, because I always forget; he would
// order every day at noon and it would be off my head"; "all the materials, for the standing work
// and for the door, window, yacht and house lines"; "all of them, daily"; "set to 2 days, a week, to
// full: best set on him by the player"].
//
// At noon every working day he is at work he buys each of the three materials once: the sheets,
// the timber boards and the glass. He buys what every line on its contract and every standing
// contract will take in the days his card is set to, less what the company has of it for them: on
// its kit and not held by a job, and on its way for stock. Or, set to full stores, whatever fills
// the kit of every kind something takes. Never past the free places on the kit, so nothing of his
// goes to the paid store, and nothing the cash cannot pay for. Each is one load for stock, in at
// the next working day's open, with his name on its line of the books. The jobs' own material he
// orders the moment their drawings are done, as the office admin did (`MATERIAL_ORDER_ROLES`); while
// he is at work the admin buys nothing for the lines (`officeOrdersLineMaterial`).

import { PURCHASE_COVER_DAYS, PURCHASE_ORDER_MINUTE, STOCK_KINDS, WORKING_DAYS_PER_WEEK } from './constants';
import { isWorkingDay } from './clock';
import { contractPiece, sheetsForPieces } from './contracts';
import { PURCHASE_ROLES } from './jobs';
import { lineMaterialForDays, linesOnContract } from './lineContract';
import { buyStock, heldByJobs, pendingStockSheets, restockCheck, restockSheets } from './materials';
import { firstOnDutyOf } from './tasks';
import type { GameState, PurchaseCover, StockKind, Worker } from './types';

/** How far ahead he buys, in the order his card offers them. */
export const PURCHASE_COVERS: readonly PurchaseCover[] = ['twoDays', 'week', 'full'];

/** What his card is set to: two working days in a game from before there was a purchase manager. */
export function purchaseCoverOf(state: GameState): PurchaseCover {
  return state.settings.purchaseCover ?? 'twoDays';
}

/** The setting in the player's words: `two days`, `a week`, `full stores` [TUNE: the words]. */
export function purchaseCoverWords(cover: PurchaseCover): string {
  if (cover === 'week') return 'a week';
  if (cover === 'full') return 'full stores';
  return 'two days';
}

/** The purchase manager at work today, or null. */
export function purchaseManagerAtWork(state: GameState): Worker | null {
  return firstOnDutyOf(state, PURCHASE_ROLES);
}

/** What the lines on their contracts, for the boards and the glass, or the standing contracts, for
 *  the sheets, take of a kind in so many working days. A contract on the client's own timber and
 *  glass takes none of the stores'. */
export function purchaseNeed(state: GameState, kind: StockKind, days: number): number {
  if (kind !== 'sheets') {
    let need = 0;
    for (const line of linesOnContract(state)) need += lineMaterialForDays(state, line, kind, days);
    return need;
  }
  let need = 0;
  for (const contract of state.contracts) {
    if (contract.status !== 'active') continue;
    const pieces = Math.ceil((contract.quantityPerWeek * days) / WORKING_DAYS_PER_WEEK - 1e-9);
    need += sheetsForPieces(contractPiece(contract), pieces);
  }
  return need;
}

/** What the company has of a kind for the lines and the contracts: on its kit less what the jobs
 *  hold, and what of it is on its way for stock. */
function inHandFor(state: GameState, kind: StockKind): number {
  return Math.max(0, state.stock[kind] - heldByJobs(state, kind)) + pendingStockSheets(state, kind);
}

/** What he buys of a kind at noon, set as his card is: what the days ahead take less what is in
 *  hand, or with full stores whatever fills the kit; nought for a kind nothing takes, and never more
 *  than the free places on its kit less what is on its way, which is what Restock with nothing
 *  typed buys. */
export function purchaseOrderFor(state: GameState, kind: StockKind, cover: PurchaseCover = purchaseCoverOf(state)): number {
  const room = restockSheets(state, kind);
  if (room <= 0) return 0;
  const days = cover === 'full' ? PURCHASE_COVER_DAYS.twoDays : PURCHASE_COVER_DAYS[cover];
  const need = purchaseNeed(state, kind, days);
  if (need <= 0) return 0;
  if (cover === 'full') return room;
  return Math.min(room, Math.max(0, Math.ceil(need - inHandFor(state, kind))));
}

/** Noon of a working day with the purchase manager at work: each kind he has to buy, bought, his
 *  name on its line of the books. */
export function purchaseAtNoon(state: GameState): void {
  if (state.clock.minute !== PURCHASE_ORDER_MINUTE || !isWorkingDay(state.clock.day)) return;
  const manager = purchaseManagerAtWork(state);
  if (manager === null) return;
  for (const kind of STOCK_KINDS) {
    const count = purchaseOrderFor(state, kind);
    if (count <= 0 || !restockCheck(state, kind, count).ok) continue;
    buyStock(state, kind, count, manager.name);
  }
}

/** What he buys for: the lines on their contracts and the standing contracts that take sheets. */
export function boughtFor(state: GameState): { lines: number; contracts: number } {
  const contracts = state.contracts.filter(
    (contract) => contract.status === 'active' && contractPiece(contract).sheets > 0,
  ).length;
  return { lines: linesOnContract(state).length, contracts };
}
