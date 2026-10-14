/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// Turn 30, 2.6 to 2.8: the line's own contract [PIOTR, 10.10: "about 1,500 pounds a window, a
// standing order, material 40, labour 20, the rest profit, one window every two hours"; 11.10: "1,
// 2, 5, 6: yes"], its windows, the pallet and the gate (CLAUDE.md T30 2.6, 2.7, 2.8, section 7). From
// Turn 32 its windows take their boards and glass from the stores (CLAUDE.md T32 2.5).

import { describe, expect, it } from 'vitest';
import {
  BREAK_START_MINUTE,
  DAY_END_MINUTE,
  LINE_MODULES,
  LINE_PALLET_WINDOWS,
  LINE_WINDOW_MINUTES,
  LINE_WINDOW_PRICE,
} from '../../src/engine/constants';
import type { GameEvent, GameState, Worker } from '../../src/engine/index';
import { applyAction, runMinutes } from '../../src/engine/index';
import { contractsFull, drawContract } from '../../src/engine/contracts';
import { sellMachine } from '../../src/engine/game';
import { lineMaterialPerWindow, lineWindowMinutes } from '../../src/engine/lineContract';
import { lineFactor, lineLevel } from '../../src/engine/machines';
import { boardsForJob } from '../../src/engine/materials';
import { movingMachines } from '../../src/engine/tasks';
import { act, buyStartingKit, newGame, nextDay, placeEquipment, placeGlassRack, testJoiner, withAir } from '../helpers';
import { lineState } from '../../src/engine/lineContract';

/** A company in the 800 m² unit with the day one kit, air enough for a CNC, and money. */
function bigUnit(): GameState {
  let state = newGame({ difficulty: 'veryEasy' });
  state.cash = 9000000;
  state = nextDay(act(state, { type: 'EXTEND_UNIT' }));
  state = nextDay(act(state, { type: 'EXTEND_UNIT', stage: 'second' }));
  state = withAir(buyStartingKit(state), 'industrial');
  state.cash = 500000;
  state.reputation = 40;
  state.enquiries = [];
  return state;
}

function engineer(id: string): Worker {
  return { ...testJoiner(id, id), role: 'lineEngineer', tier: null, rate: 0, monthlyWage: 15000 };
}

/** The whole line standing from (2, 14), with this many engineers on the books. From Turn 31 a
 *  window wants its two boards and its glass (CLAUDE.md T31 2.1): forty boards and twenty glass units
 *  stand on the stores, as the lift gives a running line's batch. Flipped in v96: on a timber
 *  shelter and a large glass rack, the company's stock and not the line's (CLAUDE.md T32 2.1, 2.5). */
function withLine(state: GameState, engineers = 2): GameState {
  LINE_MODULES.forEach((id, index) => placeEquipment(state, id, { x: 2 + 6 * index, y: 14, id: `kit-line-${index + 1}` }));
  for (let n = 1; n <= engineers; n += 1) state.workers.push(engineer(`eng-${n}`));
  placeEquipment(state, 'timberShelter', { variantId: 'standard', x: 30, y: 2, id: 'kit-store' });
  placeGlassRack(state, 'glassRackLarge');
  // Its record written, as the open of a working day writes it for every line that stands.
  lineState(state, 1);
  state.stock.boards += 40;
  state.stock.glass += 20;
  return state;
}

/** Plays minutes of the clock, answering every card with the choice the answer gives it. */
function play(state: GameState, minutes: number, answer: (event: GameEvent) => string = (event) => event.choices[0]?.id ?? 'ok'): GameState {
  let next = state;
  let left = minutes;
  let guard = 0;
  while (left > 0 && guard < 400) {
    guard += 1;
    if (next.activeEvent !== null) {
      next = applyAction(next, { type: 'RESOLVE_EVENT', choiceId: answer(next.activeEvent) });
      continue;
    }
    const result = runMinutes(next, left);
    next = result.state;
    left -= result.minutesRun;
    if (result.minutesRun === 0 && next.activeEvent === null) break;
  }
  return next;
}

/** The next morning with the offer taken off its card. */
function taken(state: GameState): GameState {
  const seen: GameEvent[] = [];
  const next = nextDay(state, seen);
  expect(seen.some((event) => event.kind === 'lineContractOffered')).toBe(true);
  return next;
}

describe('the offer (CLAUDE.md T30 2.6)', () => {
  it('comes by a card at the open of a working day once the six stand and two engineers are on the books', () => {
    const seen: GameEvent[] = [];
    const before = withLine(bigUnit());
    // The same company with the offer put off for a year: what the morning draws off the seeded
    // stream must be the same with the card as without it (flipped in E3: the old check read the
    // state before the play, which the play never changes).
    const quiet = structuredClone(before);
    lineState(quiet, 1).nextOfferDay = quiet.clock.day + 365;
    const offered = nextDay(before, seen);
    const without = nextDay(quiet);
    const card = seen.find((event) => event.kind === 'lineContractOffered');
    expect(card?.title).toBe('Windows off line 1');
    expect(card?.body).toBe(
      // Flipped in v96: the material is taken from the stores (CLAUDE.md T32 2.5).
      'A window company will take every window line 1 makes, at £1,500 a window. The timber and ' +
        'the glass cost £600 a window, taken from your timber stores and glass racks: restock them on ' +
        'the Materials page, or the office does. The line makes one every 2 hours, about 20 a week, and ' +
        'the client collects each pallet of ten the next working day. It runs until you end it.',
    );
    expect(card?.choices).toEqual([
      { id: 'take', label: 'Take it' },
      { id: 'notNow', label: 'Not now' },
    ]);
    expect(lineState(without, 1).contract).toBeNull();
    expect(offered.clock.day).toBe(without.clock.day);
    expect(offered.rng).toBe(without.rng);
    // The same enquiries drawn; only what they are locked for differs, since the line taken on its
    // contract stands in for nothing on the board (CLAUDE.md T30 2.6).
    const drawn = (state: GameState): unknown[] => state.enquiries.map((entry) => ({ ...entry, lockReason: null }));
    expect(drawn(offered)).toEqual(drawn(without));
  });

  it('is offered and taken with three standing contracts running, and is not counted against them', () => {
    const state = withLine(bigUnit());
    const like = drawContract(state, structuredClone(state));
    state.contracts = [1, 2, 3].map((n) => ({ ...structuredClone(like), id: `contract-${n}`, status: 'active' as const }));
    expect(contractsFull(state)).toBe(true);
    const seen: GameEvent[] = [];
    const next = nextDay(state, seen);
    expect(seen.some((event) => event.kind === 'lineContractOffered')).toBe(true);
    expect(lineState(next, 1).contract?.status).toBe('active');
    expect(next.contracts.filter((contract) => contract.status === 'active')).toHaveLength(3);
    expect(contractsFull(next)).toBe(true);
  });

  it('is not offered with one engineer, with no line, or with the line short of a module', () => {
    for (const state of [withLine(bigUnit(), 1), bigUnit()]) {
      const seen: GameEvent[] = [];
      const next = nextDay(state, seen);
      expect(seen.some((event) => event.kind === 'lineContractOffered')).toBe(false);
      expect(lineState(next, 1).contract).toBeNull();
    }
    const short = withLine(bigUnit());
    short.equipment = short.equipment.filter((item) => item.specId !== 'windowLine6');
    const seen: GameEvent[] = [];
    nextDay(short, seen);
    expect(seen.some((event) => event.kind === 'lineContractOffered')).toBe(false);
  });

  it('is a record of its own: not one of the standing contracts, nobody on it, and nothing drawn off the stream', () => {
    const state = taken(withLine(bigUnit()));
    expect(lineState(state, 1).contract?.status).toBe('active');
    expect(state.contracts.some((contract) => contract.name === 'Windows off line 1')).toBe(false);
    expect(state.workers.some((worker) => worker.jobId !== null && worker.jobId.includes('line'))).toBe(false);
  });

  it('turned down, comes back a week on and not before', () => {
    const offered = withOffer(withLine(bigUnit()));
    expect(lineState(offered, 1).contract?.status).toBe('offered');
    const declined = applyAction(offered, { type: 'RESOLVE_EVENT', choiceId: 'notNow' });
    expect(lineState(declined, 1).contract).toBeNull();
    expect(lineState(declined, 1).nextOfferDay).toBe(declined.clock.day + 7);
    const seen: GameEvent[] = [];
    let next = declined;
    while (next.clock.day < declined.clock.day + 6) next = nextDay(next, seen);
    expect(seen.some((event) => event.kind === 'lineContractOffered')).toBe(false);
    while (next.clock.day < declined.clock.day + 9) next = nextDay(next, seen);
    expect(seen.some((event) => event.kind === 'lineContractOffered')).toBe(true);
  });
});

/** The state on the morning the card is open, unanswered. */
function withOffer(state: GameState): GameState {
  let next = state;
  let guard = 0;
  const day = state.clock.day;
  while (guard < 3000) {
    guard += 1;
    if (next.activeEvent?.kind === 'lineContractOffered') return next;
    if (next.activeEvent !== null) {
      next = applyAction(next, { type: 'RESOLVE_EVENT', choiceId: next.activeEvent.choices[0]?.id ?? 'ok' });
      continue;
    }
    next = runMinutes(next, 30).state;
    if (next.clock.day > day + 3) break;
  }
  throw new Error('the offer card never opened');
}

describe('the windows (CLAUDE.md T30 2.7)', () => {
  it('makes one every 120 minutes, four a working day, each 1,500 in on one growing line a day and its timber and glass taken off what its contract holds', () => {
    const state = taken(withLine(bigUnit()));
    expect(lineWindowMinutes(state, 1)).toBe(LINE_WINDOW_MINUTES);
    const morning = state.clock.day;
    const sheets = state.stock.sheets;
    const day = play(state, DAY_END_MINUTE + 60, (event) => (event.kind === 'goingHome' ? 'home' : event.choices[0]?.id ?? 'ok'));
    const contract = lineState(day, 1).contract;
    // The day it was taken: taken at its open, so the whole of its 480 working minutes.
    expect(contract?.windowsMade).toBe(4);
    const windows = day.ledger.filter((entry) => entry.label === 'Windows off line 1: windows' && entry.day === morning);
    expect(windows.map((entry) => [entry.category, entry.amount])).toEqual([['contract', 4 * LINE_WINDOW_PRICE]]);
    // From Turn 31 the material was paid when it was bought and nothing of it is booked as a window
    // is made (CLAUDE.md T31 2.1). Flipped in v96: two boards off the timber stores and one glass
    // unit off the glass racks a window, out of what the contract holds, and no sheet (CLAUDE.md T32
    // 2.5).
    expect(day.ledger.some((entry) => entry.label === 'Windows off line 1: timber and glass')).toBe(false);
    expect(day.stock.boards).toBe(40 - 4 * 2);
    expect(day.stock.glass).toBe(20 - 4);
    expect(day.stock.sheets).toBe(sheets);
    expect([contract?.boardsReserved, contract?.glassReserved]).toEqual([40 - 4 * 2, 20 - 4]);
    expect(lineMaterialPerWindow()).toBe(600);
    expect(contract?.revenue).toBe(6000);
    expect(contract?.materialCost).toBe(2400);
    // No minute of any machine is booked for it.
    for (const item of day.equipment.filter((entry) => LINE_MODULES.includes(entry.specId))) {
      expect(item.hoursUsed, item.id).toBe(0);
    }
  });

  it('makes none on the second shift, orders and unloads nothing, and books no man a minute', () => {
    const state = taken(withLine(bigUnit()));
    state.shift.second = true;
    // The same day with no contract: what the men did must be what they did beside it.
    const quiet = structuredClone(state);
    lineState(quiet, 1).contract = null;
    lineState(quiet, 1).nextOfferDay = quiet.clock.day + 365;
    const home = (event: GameEvent): string => (event.kind === 'goingHome' ? 'home' : event.choices[0]?.id ?? 'ok');
    const morning = state.clock.day;
    const day = play(state, DAY_END_MINUTE + 60, home);
    const plain = play(quiet, DAY_END_MINUTE + 60, home);
    // The day's four, and none in the night that followed it.
    const windows = day.ledger.filter((entry) => entry.label === 'Windows off line 1: windows' && entry.day === morning);
    expect(windows.map((entry) => entry.amount)).toEqual([4 * LINE_WINDOW_PRICE]);
    expect(day.onOrder).toEqual(plain.onOrder);
    expect(day.deliveries).toEqual(plain.deliveries);
    expect(day.tasks.filter((task) => task.kind === 'unload')).toEqual(plain.tasks.filter((task) => task.kind === 'unload'));
    expect(day.workers.map((worker) => [worker.id, worker.minutesWorked])).toEqual(plain.workers.map((worker) => [worker.id, worker.minutesWorked]));
    expect(day.owner.minutesWorked).toBe(plain.owner.minutesWorked);
  });

  it('makes its window past the overdraft floor, its timber and glass paid when they were bought', () => {
    const state = taken(withLine(bigUnit()));
    state.cash = state.finance.overdraftLimit - 1000;
    const cash = state.cash;
    const after = play(state, LINE_WINDOW_MINUTES, (event) => event.choices[0]?.id ?? 'ok');
    expect(lineState(after, 1).contract?.windowsMade).toBe(1);
    // From Turn 31 a window made books no material: it was paid when it was bought (CLAUDE.md T31
    // 2.1, T32 2.5).
    expect(after.ledger.some((entry) => entry.label === 'Windows off line 1: timber and glass')).toBe(false);
    expect(after.cash).toBe(cash + LINE_WINDOW_PRICE);
  });

  it('makes none in the dinner hour whether the owner takes it or works through it, and none after five', () => {
    const state = taken(withLine(bigUnit()));
    for (const noonBreak of ['take', 'skip'] as const) {
      const before = { ...state, settings: { ...state.settings, noonBreak } } as GameState;
      const toNoon = play(before, BREAK_START_MINUTE);
      const minutes = lineState(toNoon, 1).minutes;
      const made = lineState(toNoon, 1).contract?.windowsMade ?? 0;
      const afterDinner = play(toNoon, 60, (event) => (event.kind === 'breakTime' ? noonBreak : event.choices[0]?.id ?? 'ok'));
      expect(afterDinner.clock.minute, noonBreak).toBeGreaterThanOrEqual(BREAK_START_MINUTE + 60);
      expect(lineState(afterDinner, 1).contract?.windowsMade, noonBreak).toBe(made);
      expect(lineState(afterDinner, 1).minutes, noonBreak).toBe(minutes);
    }
    // Past five with the owner staying on: the line's day is over.
    const atFive = play(state, DAY_END_MINUTE, (event) => event.choices[0]?.id ?? 'ok');
    const stayed = play(atFive, 60, (event) => (event.kind === 'goingHome' ? 'overtime' : event.choices[0]?.id ?? 'ok'));
    expect(lineState(stayed, 1).contract?.windowsMade).toBe(lineState(atFive, 1).contract?.windowsMade);
  });

  it('makes none with one engineer on duty, and none while the line is being moved', () => {
    const state = taken(withLine(bigUnit()));
    const one = structuredClone(state);
    const first = one.workers.find((worker) => worker.id === 'eng-1');
    if (first === undefined) throw new Error('the engineer is wanted');
    first.absentDaysRemaining = 1;
    expect(lineLevel(one, 1)).toBe(3);
    expect(lineState(play(one, 300), 1).contract?.windowsMade).toBe(0);
    // The line itself dragged three cells back and the move done: six hours of carrying (from Turn
    // 31 back, its lane keeping it off the front wall, CLAUDE.md T31 2.6).
    let moving = act({ ...state, speed: 0 } as GameState, { type: 'MOVE_ITEM', itemId: 'kit-line-1', x: 2, y: 11 });
    moving = act(moving, { type: 'END_SETUP', speed: 1 });
    expect(moving.activeEvent?.kind).toBe('moveConfirm');
    moving = act(moving, { type: 'RESOLVE_EVENT', choiceId: 'do' });
    expect(movingMachines(moving)).not.toBeNull();
    const before = { minutes: lineState(moving, 1).minutes, made: lineState(moving, 1).contract?.windowsMade };
    const moved = play(moving, 120, (event) => event.choices[0]?.id ?? 'ok');
    expect(movingMachines(moved)).not.toBeNull();
    expect(lineState(moved, 1).minutes).toBe(before.minutes);
    expect(lineState(moved, 1).contract?.windowsMade).toBe(before.made);
  });

  it('gives the jobs nothing while it runs, and the line back once it ends', () => {
    const state = taken(withLine(bigUnit()));
    expect(lineFactor(state)).toBe(1);
    expect(boardsForJob(state, 5600, true)).toBe(19);
    const ended = act(state, { type: 'END_LINE_CONTRACT', line: 1 });
    expect(lineState(ended, 1).contract).toBeNull();
    expect(lineFactor(ended)).toBe(2.4);
    expect(boardsForJob(ended, 5600, true)).toBe(15);
    expect(lineState(ended, 1).nextOfferDay).toBe(ended.clock.day + 7);
  });
});

describe('the pallet and the gate (CLAUDE.md T30 2.8)', () => {
  it('sends the tenth window to the gate, starts the next pallet with the eleventh, and the client takes it the next working morning for nothing', () => {
    let state = taken(withLine(bigUnit()));
    // Two working days and a half: ten windows and two more.
    lineState(state, 1).minutes = 0;
    state = play(state, 60 * 24 * 3, (event) => (event.kind === 'goingHome' ? 'home' : event.choices[0]?.id ?? 'ok'));
    const made = lineState(state, 1).contract?.windowsMade ?? 0;
    expect(made).toBeGreaterThanOrEqual(LINE_PALLET_WINDOWS + 1);
    expect(lineState(state, 1).onPallet).toBe(made % LINE_PALLET_WINDOWS);
    // Every pallet sent before this morning has been taken; nothing was booked for it.
    expect(state.ledger.some((entry) => entry.label.includes('pallet'))).toBe(false);
  });

  it('holds a full pallet at the gate until the open of the next working day', () => {
    const state = taken(withLine(bigUnit()));
    lineState(state, 1).onPallet = LINE_PALLET_WINDOWS - 1;
    lineState(state, 1).minutes = LINE_WINDOW_MINUTES - 1;
    const one = play(state, 1);
    expect(lineState(one, 1).palletsAtGate).toBe(1);
    expect(lineState(one, 1).onPallet).toBe(0);
    const tomorrow = nextDay(one);
    expect(lineState(tomorrow, 1).palletsAtGate).toBe(0);
  });

  it('sends a part pallet to the gate when the contract ends, by End it or by the sale of the line', () => {
    const state = taken(withLine(bigUnit()));
    lineState(state, 1).onPallet = 7;
    const ended = act(state, { type: 'END_LINE_CONTRACT', line: 1 });
    expect(lineState(ended, 1).palletsAtGate).toBe(1);
    expect(lineState(ended, 1).onPallet).toBe(0);
    const sold = structuredClone(state);
    expect(sellMachine(sold, 'kit-line-4').ok).toBe(true);
    expect(lineState(sold, 1).contract).toBeNull();
    expect(lineState(sold, 1).palletsAtGate).toBe(1);
  });
});
