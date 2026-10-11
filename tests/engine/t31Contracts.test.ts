/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// @vitest-environment jsdom
// Turn 31, 2.9: three things that can happen to a sheet contract [PIOTR, 11.10: "the profit from
// contracts should fall from time to time"; "yes" to chat's three]: a client goes elsewhere at a
// week's close, two or three quiet weeks follow, and a renewal asks for less. Every draw off a side
// stream of its own, seeded from the seed, the contract's id and the day (CLAUDE.md T31 2.9,
// section 7).

import { describe, expect, it } from 'vitest';
import {
  CONTRACT_CLIENT_LEAVES_CHANCE,
  CONTRACT_QUIET_DAYS_MAX,
  CONTRACT_QUIET_DAYS_MIN,
  CONTRACT_RENEWAL_CUT_CHANCE,
  CONTRACT_RENEWAL_CUT_MAX,
  CONTRACT_RENEWAL_CUT_MIN,
  CONTRACT_RENEW_FULL_WEEK,
  CONTRACT_WEEKLY_OFFER_REPUTATION,
  JOINER_MONTHLY_WAGE,
  LINE_MODULES,
  WORKER_RATES,
} from '../../src/engine/constants';
import {
  CONTRACT_CUT_SALT,
  CONTRACT_LOSS_SALT,
  acceptContract,
  activeContracts,
  assignContract,
  contractMarker,
  contractSideCarrier,
  contractsQuiet,
  drawContract,
  endContractNow,
  offerContract,
  offeredContract,
  renegotiatedPriceFor,
  renewContract,
  renewContractCheck,
  runContractDay,
} from '../../src/engine/contracts';
import { int, next } from '../../src/engine/rng';
import type { Contract, GameEvent, GameState, Worker } from '../../src/engine/index';
import { renderContracts } from '../../src/ui/contracts';
import { money, signedMoney } from '../../src/ui/modal';
import { act, buyStartingKit, fillRack, newGame, nextDay, placeEquipment, testJoiner, withAir, withExtraction } from '../helpers';

function joinerHall(): GameState {
  const state = withAir(withExtraction(fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 60)));
  placeEquipment(state, 'workbench', { variantId: 'budget', x: 6, y: 6 });
  state.enquiries = [];
  const ben: Worker = { ...testJoiner('staff-1', 'Ben'), tier: 'novice', rate: WORKER_RATES.novice, monthlyWage: JOINER_MONTHLY_WAGE.novice };
  state.workers.push(ben);
  state.clock.minute = 60;
  return state;
}

interface Dice {
  day: number;
  salt: number;
  probability: number;
  comesUp: boolean;
  /** The per cent drawn after the chance, when it must be this one. */
  cut?: number;
}

/** The first id of `contract-t31-N` whose draws come up (or do not) as asked, each on its day at
 *  its chance off its salt's side stream: what the dice will say is read off the same carrier the
 *  engine builds, so a test chooses the contract that shows what it is about. */
function idWith(state: GameState, dice: Dice[]): string {
  for (let n = 1; n < 100000; n += 1) {
    const id = `contract-t31-${n}`;
    const fits = dice.every((die) => {
      const carrier = contractSideCarrier({ ...state, clock: { ...state.clock, day: die.day } }, { id } as Contract, die.salt);
      if (next(carrier) < die.probability !== die.comesUp) return false;
      return die.cut === undefined || int(carrier, CONTRACT_RENEWAL_CUT_MIN, CONTRACT_RENEWAL_CUT_MAX) === die.cut;
    });
    if (fits) return id;
  }
  throw new Error('no such id');
}

function idThat(state: GameState, day: number, salt: number, probability: number, comesUp: boolean): string {
  return idWith(state, [{ day, salt, probability, comesUp }]);
}

/** A sheet contract running from day 1 under this id, Ben on it, a week of 60 wanted. */
function running(state: GameState, id: string, pieceId = 'cutSheetPack'): Contract {
  state.clock.day = 1;
  const contract = drawContract(state, structuredClone(state));
  contract.id = id;
  contract.pieceId = pieceId;
  contract.quantityPerWeek = 60;
  state.contracts.push(contract);
  expect(acceptContract(state, contract.id).ok).toBe(true);
  expect(assignContract(state, contract.id, 'staff-1', true).ok).toBe(true);
  return contract;
}

describe('a client goes elsewhere (CLAUDE.md T31 2.9)', () => {
  it('ends a running sheet contract at a week s close, as the client ends one, with no second week and no other term', () => {
    const state = joinerHall();
    const contract = running(state, idThat(joinerHall(), 8, CONTRACT_LOSS_SALT, CONTRACT_CLIENT_LEAVES_CHANCE, true));
    contract.piecesThisWeek = 60;
    const reputation = state.reputation;
    const rng = state.rng;
    state.clock.day = 8;
    runContractDay(state);
    expect(contract.status).toBe('ended');
    expect(contract.endedBy).toBe('lost');
    // The week already closed by this morning's close, and no second, empty one with its point.
    expect(contract.weeks).toEqual([{ week: 1, wanted: 60, made: 60 }]);
    expect(state.reputation).toBe(reputation);
    expect(contract.endDay).toBe(8);
    expect(contract.weekStartDay).toBeNull();
    expect(contract.renegotiatedPrice).toBeNull();
    // The men on it are free.
    expect(contract.assigned).toEqual([]);
    expect(state.workers.find((worker) => worker.id === 'staff-1')?.jobId).not.toBe(contractMarker(contract.id));
    // Nothing off the main stream.
    expect(state.rng).toBe(rng);
    const card = state.eventQueue.find((event) => event.kind === 'contractEnded');
    expect(card?.title).toBe(`${contract.name}: the client went elsewhere`);
    expect(card?.body.endsWith('The client has found another supplier: there is no other term.')).toBe(true);
    expect(card?.body).not.toContain('Renew');
    expect(card?.data.offered).toBeNull();
  });

  it('is drawn only at a week s close, off the contract s own stream, never for a window or a door', () => {
    const state = joinerHall();
    // An id whose dice come up on a Tuesday: no week closes, so nothing is drawn.
    const tuesday = running(state, idThat(joinerHall(), 9, CONTRACT_LOSS_SALT, CONTRACT_CLIENT_LEAVES_CHANCE, true));
    tuesday.weekStartDay = 8;
    state.clock.day = 9;
    runContractDay(state);
    expect(tuesday.status).toBe('active');
    // The same dice on a Monday for a timber piece: a window on a contract is never lost.
    const timber = joinerHall();
    const window = running(timber, idThat(joinerHall(), 8, CONTRACT_LOSS_SALT, CONTRACT_CLIENT_LEAVES_CHANCE, true), 'casementWindow');
    timber.clock.day = 8;
    runContractDay(timber);
    expect(window.status).toBe('active');
    expect(window.weeks).toHaveLength(1);
    const doors = joinerHall();
    const door = running(doors, idThat(joinerHall(), 8, CONTRACT_LOSS_SALT, CONTRACT_CLIENT_LEAVES_CHANCE, true), 'frenchDoor');
    doors.clock.day = 8;
    runContractDay(doors);
    expect(door.status).toBe('active');
  });

  it('never takes a term at its last close: that week ends as the term and is offered another', () => {
    const state = joinerHall();
    const contract = running(state, idThat(joinerHall(), 8, CONTRACT_LOSS_SALT, CONTRACT_CLIENT_LEAVES_CHANCE, true));
    contract.endDay = 7;
    contract.piecesThisWeek = 60;
    state.clock.day = 8;
    runContractDay(state);
    expect(contract.endedBy).toBe('term');
    expect(contract.renegotiatedPrice).not.toBeNull();
    expect(state.contractQuietUntilDay).toBeNull();
  });

  it('is let go off the tab with one button, and offers no term to renew', () => {
    const state = joinerHall();
    const contract = running(state, idThat(joinerHall(), 8, CONTRACT_LOSS_SALT, CONTRACT_CLIENT_LEAVES_CHANCE, true));
    contract.piecesThisWeek = 60;
    state.clock.day = 8;
    runContractDay(state);
    const holder = document.createElement('div');
    holder.innerHTML = renderContracts(state);
    const block = holder.querySelector(`.contract-ended[data-contract="${contract.id}"]`);
    expect(block?.querySelector('h3')?.textContent).toBe(`${contract.name}: the client went elsewhere`);
    expect(block?.querySelector('p.figures')?.textContent).toBe('1 full weeks, 0 short.');
    const buttons = Array.from(block?.querySelectorAll('[data-do="renewContract"]') ?? []);
    expect(buttons.map((button) => [button.textContent, button.getAttribute('data-accept')])).toEqual([['Let it go', '0']]);
    expect(block?.textContent).not.toContain('Renew');
    expect(renewContractCheck(state, contract.id, true)).toEqual({ ok: false, reason: 'The client has found another supplier' });
    expect(renewContract(state, contract.id, true)).toEqual({ ok: false, reason: 'The client has found another supplier' });
    expect(state.contracts).toHaveLength(1);
    expect(renewContract(state, contract.id, false)).toEqual({ ok: true, reason: '' });
    expect(state.contracts).toHaveLength(0);
  });
});

describe('the quiet weeks after a loss (CLAUDE.md T31 2.9)', () => {
  it('lasts 14 to 21 days from the loss, drawn once at it off the same stream', () => {
    const state = joinerHall();
    const id = idThat(joinerHall(), 8, CONTRACT_LOSS_SALT, CONTRACT_CLIENT_LEAVES_CHANCE, true);
    const contract = running(state, id);
    state.clock.day = 8;
    runContractDay(state);
    expect(contract.endedBy).toBe('lost');
    const carrier = contractSideCarrier(state, contract, CONTRACT_LOSS_SALT);
    next(carrier);
    const days = int(carrier, CONTRACT_QUIET_DAYS_MIN, CONTRACT_QUIET_DAYS_MAX);
    expect(state.contractQuietUntilDay).toBe(8 + days);
    expect(days).toBeGreaterThanOrEqual(14);
    expect(days).toBeLessThanOrEqual(21);
  });

  it('draws no offer before its last day, the weekly one owed among it, and the offer comes after it', () => {
    const state = newGame();
    state.reputation = CONTRACT_WEEKLY_OFFER_REPUTATION + 10;
    state.lastContractOfferDay = null;
    state.clock.day = 8;
    state.contractQuietUntilDay = 22;
    expect(contractsQuiet(state)).toBe(true);
    const rng = state.rng;
    offerContract(state);
    expect(offeredContract(state)).toBeNull();
    expect(state.rng).toBe(rng);
    // Day 19 is the last working day of it: 20 and 21 are the weekend.
    state.clock.day = 19;
    offerContract(state);
    expect(offeredContract(state)).toBeNull();
    state.clock.day = 22;
    expect(contractsQuiet(state)).toBe(false);
    offerContract(state);
    expect(offeredContract(state)?.offeredDay).toBe(22);
  });

  it('never stops the line s own contract, which is offered as before', () => {
    let state = newGame({ difficulty: 'veryEasy' });
    state.cash = 9000000;
    state = nextDay(act(state, { type: 'EXTEND_UNIT' }));
    state = nextDay(act(state, { type: 'EXTEND_UNIT', stage: 'second' }));
    state = withAir(buyStartingKit(state), 'industrial');
    state.cash = 500000;
    state.reputation = 40;
    state.enquiries = [];
    LINE_MODULES.forEach((id, index) => placeEquipment(state, id, { x: 2 + 6 * index, y: 14, id: `kit-line-${index + 1}` }));
    for (const id of ['eng-1', 'eng-2']) state.workers.push({ ...testJoiner(id, id), role: 'lineEngineer', tier: null, rate: 0, monthlyWage: 15000 });
    state.contracts = [];
    state.lastContractOfferDay = null;
    state.contractQuietUntilDay = state.clock.day + 20;
    const seen: GameEvent[] = [];
    const morning = nextDay(state, seen);
    expect(contractsQuiet(morning)).toBe(true);
    expect(seen.some((event) => event.kind === 'lineContractOffered')).toBe(true);
    expect(offeredContract(morning)).toBeNull();
  });

  it('never stops a renewal, and a second loss inside it never shortens it', () => {
    const state = joinerHall();
    const contract = running(state, idThat(joinerHall(), 8, CONTRACT_LOSS_SALT, CONTRACT_CLIENT_LEAVES_CHANCE, false));
    contract.endDay = 7;
    contract.piecesThisWeek = 60;
    state.clock.day = 8;
    runContractDay(state);
    state.contractQuietUntilDay = 30;
    expect(renewContract(state, contract.id, true).ok).toBe(true);
    expect(activeContracts(state)).toHaveLength(1);
    // A loss drawn now ends inside the quiet already running: the later day stands.
    const second = activeContracts(state)[0];
    if (second === undefined) throw new Error('the renewal is wanted');
    second.id = idThat(state, 15, CONTRACT_LOSS_SALT, CONTRACT_CLIENT_LEAVES_CHANCE, true);
    second.weekStartDay = 8;
    second.endDay = 100;
    state.contractQuietUntilDay = 60;
    state.clock.day = 15;
    runContractDay(state);
    expect(second.endedBy).toBe('lost');
    expect(state.contractQuietUntilDay).toBe(60);
  });
});

describe('a renewal that asks for less (CLAUDE.md T31 2.9)', () => {
  it('offers 5 to 15 per cent under the price a piece it had, and the card says so last', () => {
    const state = joinerHall();
    const contract = running(state, idThat(joinerHall(), 8, CONTRACT_CUT_SALT, CONTRACT_RENEWAL_CUT_CHANCE, true));
    contract.endDay = 7;
    contract.piecesThisWeek = 60;
    contract.pricePerPiece = 95;
    state.clock.day = 8;
    runContractDay(state);
    expect(contract.endedBy).toBe('term');
    const carrier = contractSideCarrier(state, contract, CONTRACT_CUT_SALT);
    next(carrier);
    const cut = int(carrier, CONTRACT_RENEWAL_CUT_MIN, CONTRACT_RENEWAL_CUT_MAX);
    const offered = Math.round(95 * (1 - cut / 100));
    expect(contract.renegotiatedPrice).toBe(offered);
    expect(offered).toBeGreaterThanOrEqual(95 * 0.85);
    expect(offered).toBeLessThanOrEqual(95 * 0.95);
    // In place of what the history gives: a full week would have put a per cent on it.
    expect(renegotiatedPriceFor(contract)).toBe(Math.round(95 * (1 + CONTRACT_RENEW_FULL_WEEK)));
    const card = state.eventQueue.find((event) => event.kind === 'contractEnded');
    expect(card?.body.endsWith(`The client offers ${money(offered)} a piece for another term, ${cut}% less than now: the market has turned.`)).toBe(true);
    expect(card?.data.offered).toBe(offered);
    // The ended block reads the cut as it reads any offer, and it can be renewed at it.
    const holder = document.createElement('div');
    holder.innerHTML = renderContracts(state);
    const block = holder.querySelector(`.contract-ended[data-contract="${contract.id}"]`);
    expect(block?.textContent).toContain(`${signedMoney(offered - 95)} on ${money(95)}`);
    expect(block?.querySelector('[data-accept="1"]')?.textContent).toBe(`Renew at ${money(offered)}`);
    expect(renewContract(state, contract.id, true).ok).toBe(true);
    expect(activeContracts(state)[0]?.pricePerPiece).toBe(offered);
  });

  it('keeps the price inside the band where the rounding would take it out: 5 per cent of £90 is £85', () => {
    const state = joinerHall();
    const contract = running(state, idWith(joinerHall(), [{ day: 8, salt: CONTRACT_CUT_SALT, probability: CONTRACT_RENEWAL_CUT_CHANCE, comesUp: true, cut: CONTRACT_RENEWAL_CUT_MIN }]));
    contract.endDay = 7;
    contract.piecesThisWeek = 60;
    contract.pricePerPiece = 90;
    state.clock.day = 8;
    runContractDay(state);
    expect(contract.renegotiatedPrice).toBe(85);
    expect(state.eventQueue.find((event) => event.kind === 'contractEnded')?.body).toContain('£85 a piece for another term, 5% less than now');
  });

  it('is drawn only at a sheet term s end: never when the player or the client ended it, never for a window', () => {
    const id = idThat(joinerHall(), 40, CONTRACT_CUT_SALT, CONTRACT_RENEWAL_CUT_CHANCE, true);
    const player = joinerHall();
    const ended = running(player, id);
    player.clock.day = 40;
    expect(endContractNow(player, ended.id).ok).toBe(true);
    expect(ended.renegotiatedPrice).toBe(renegotiatedPriceFor(ended));
    // Two short weeks and the client ends it on the second close, a day the cut would come up.
    const client = joinerHall();
    const short = running(
      client,
      idWith(joinerHall(), [
        { day: 8, salt: CONTRACT_LOSS_SALT, probability: CONTRACT_CLIENT_LEAVES_CHANCE, comesUp: false },
        { day: 15, salt: CONTRACT_CUT_SALT, probability: CONTRACT_RENEWAL_CUT_CHANCE, comesUp: true },
      ]),
    );
    client.clock.day = 8;
    runContractDay(client);
    client.clock.day = 15;
    runContractDay(client);
    expect(short.endedBy).toBe('client');
    expect(short.renegotiatedPrice).toBe(renegotiatedPriceFor(short));
    const timber = joinerHall();
    const window = running(timber, idThat(joinerHall(), 8, CONTRACT_CUT_SALT, CONTRACT_RENEWAL_CUT_CHANCE, true), 'casementWindow');
    window.endDay = 7;
    window.piecesThisWeek = window.quantityPerWeek;
    timber.clock.day = 8;
    runContractDay(timber);
    expect(window.endedBy).toBe('term');
    expect(window.renegotiatedPrice).toBe(renegotiatedPriceFor(window));
  });

  it('keeps what the history gives where the dice say no, to the pound', () => {
    const state = joinerHall();
    const contract = running(state, idThat(joinerHall(), 8, CONTRACT_CUT_SALT, CONTRACT_RENEWAL_CUT_CHANCE, false));
    contract.endDay = 7;
    contract.piecesThisWeek = 60;
    state.clock.day = 8;
    runContractDay(state);
    expect(contract.renegotiatedPrice).toBe(renegotiatedPriceFor(contract));
    expect(state.eventQueue.find((event) => event.kind === 'contractEnded')?.body).toContain('Renew or let it go on the Contracts tab.');
  });
});
