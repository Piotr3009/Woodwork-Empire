/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// v109: a standing contract's price rises at fifteen renewals at most [PIOTR, 18.10: "no more than
// 15 negotiations of one contract, or it grows for ever"]. The count read off the id, the offer held
// at the price from then on while short weeks still lower it, sheet and timber contracts alike, and
// the closing card's sentence [PIOTR, 18.10: "yes"].

import { describe, expect, it } from 'vitest';
import {
  CONTRACT_PRICE_RISES_MAX,
  CONTRACT_RENEW_FULL_WEEK,
  JOINER_MONTHLY_WAGE,
  WORKER_RATES,
} from '../../src/engine/constants';
import {
  acceptContract,
  activeContracts,
  assignContract,
  drawContract,
  renegotiatedPriceFor,
  renewContract,
  renewalsOf,
  runContractDay,
} from '../../src/engine/contracts';
import type { Contract, GameState, Worker } from '../../src/engine/index';
import { buyStartingKit, fillRack, newGame, placeEquipment, testJoiner, withAir, withExtraction } from '../helpers';

const NO_HIGHER = `The client has raised his price ${CONTRACT_PRICE_RISES_MAX} times and will go no higher.`;

/** The id of a contract renewed so many times. */
function renewed(times: number): string {
  return `contract-40${'-r'.repeat(times)}`;
}

/** A contract's figures for its offer alone: its id, its price and its weeks, full or short. */
function closed(id: string, pieceId: string, price: number, full: number, short: number): Contract {
  const weeks = [
    ...Array.from({ length: full }, (_, week) => ({ week, wanted: 10, made: 10 })),
    ...Array.from({ length: short }, (_, week) => ({ week: full + week, wanted: 10, made: 5 })),
  ];
  return { id, pieceId, pricePerPiece: price, weeks } as unknown as Contract;
}

function joinerHall(): GameState {
  const state = withAir(withExtraction(fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 60)));
  placeEquipment(state, 'workbench', { variantId: 'budget', x: 6, y: 6 });
  state.enquiries = [];
  const ben: Worker = { ...testJoiner('staff-1', 'Ben'), tier: 'novice', rate: WORKER_RATES.novice, monthlyWage: JOINER_MONTHLY_WAGE.novice };
  state.workers.push(ben);
  state.clock.minute = 60;
  return state;
}

/** A contract for windows (no cut is drawn for one) running from day 1 under this id, its term
 *  over on day 7 with its one week delivered in full, closed on day 8. */
function windowsEndedOnDay8(id: string, price: number): { state: GameState; contract: Contract } {
  const state = joinerHall();
  state.clock.day = 1;
  const contract = drawContract(state, structuredClone(state));
  contract.id = id;
  contract.pieceId = 'casementWindow';
  contract.quantityPerWeek = 60;
  state.contracts.push(contract);
  expect(acceptContract(state, contract.id).ok).toBe(true);
  expect(assignContract(state, contract.id, 'staff-1', true).ok).toBe(true);
  contract.pricePerPiece = price;
  contract.endDay = 7;
  contract.piecesThisWeek = contract.quantityPerWeek;
  state.clock.day = 8;
  runContractDay(state);
  expect(contract.endedBy).toBe('term');
  return { state, contract };
}

describe('the price of a standing contract rises at fifteen renewals at most (v109)', () => {
  it('counts the renewals off the id, as every save already has them', () => {
    expect(CONTRACT_PRICE_RISES_MAX).toBe(15);
    expect(renewalsOf({ id: 'contract-40' } as Contract)).toBe(0);
    expect(renewalsOf({ id: renewed(1) } as Contract)).toBe(1);
    expect(renewalsOf({ id: renewed(27) } as Contract)).toBe(27);
  });

  it('rises at the fifteenth renewal and never after, and short weeks still lower it', () => {
    const rise = Math.round(1000 * (1 + 13 * CONTRACT_RENEW_FULL_WEEK));
    expect(renegotiatedPriceFor(closed(renewed(14), 'wardrobeFront', 1000, 13, 0))).toBe(rise);
    expect(renegotiatedPriceFor(closed(renewed(15), 'wardrobeFront', 1000, 13, 0))).toBe(1000);
    // One full week and two short: 1 + 1% - 4%, so the client offers less, as he always did.
    expect(renegotiatedPriceFor(closed(renewed(15), 'wardrobeFront', 1000, 1, 2))).toBe(970);
    // Windows and doors with the client's own timber alike: Piotr's sash windows renewed 27 times.
    expect(renegotiatedPriceFor(closed(renewed(27), 'sashWindow', 6240, 26, 0))).toBe(6240);
    expect(renegotiatedPriceFor(closed(renewed(15), 'frenchDoor', 4417, 26, 0))).toBe(4417);
  });

  it('says so on the closing card, and the next term runs at the same price', () => {
    const before = windowsEndedOnDay8(renewed(14), 6240);
    expect(before.contract.renegotiatedPrice).toBe(Math.round(6240 * (1 + CONTRACT_RENEW_FULL_WEEK)));
    expect(before.state.eventQueue.find((event) => event.kind === 'contractEnded')?.body).not.toContain(NO_HIGHER);

    const { state, contract } = windowsEndedOnDay8(renewed(15), 6240);
    expect(contract.renegotiatedPrice).toBe(6240);
    const card = state.eventQueue.find((event) => event.kind === 'contractEnded');
    expect(card?.body).toContain(`The client offers £6,240 a piece for another term. ${NO_HIGHER} Renew or let it go`);
    expect(renewContract(state, contract.id, true).ok).toBe(true);
    const next = activeContracts(state)[0];
    expect(next?.pricePerPiece).toBe(6240);
    expect(next === undefined ? null : renewalsOf(next)).toBe(16);
  });
});
