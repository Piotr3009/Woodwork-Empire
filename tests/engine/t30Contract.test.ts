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
// 2, 5, 6: yes"], its windows, the pallet and the gate (CLAUDE.md T30 2.6, 2.7, 2.8, section 7).

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
import { sellMachine } from '../../src/engine/game';
import { lineMaterialPerWindow, lineWindowMinutes } from '../../src/engine/lineContract';
import { lineFactor, lineLevel } from '../../src/engine/machines';
import { boardsForJob } from '../../src/engine/materials';
import { movingMachines } from '../../src/engine/tasks';
import { act, buyStartingKit, newGame, nextDay, placeEquipment, testJoiner, withAir } from '../helpers';

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

/** The whole line standing from (2, 14), with this many engineers on the books. */
function withLine(state: GameState, engineers = 2): GameState {
  LINE_MODULES.forEach((id, index) => placeEquipment(state, id, { x: 2 + 6 * index, y: 14, id: `kit-line-${index + 1}` }));
  for (let n = 1; n <= engineers; n += 1) state.workers.push(engineer(`eng-${n}`));
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
    const rng = before.rng;
    nextDay(before, seen);
    const card = seen.find((event) => event.kind === 'lineContractOffered');
    expect(card?.title).toBe('Windows off the line');
    expect(card?.body).toBe(
      'A window company will take every window your line makes, at £1,500 a window. The timber and ' +
        'the glass for each one are bought as it is made, £600 a window. The line makes one every 2 ' +
        'hours, about 20 a week, and the client collects each pallet of ten the next working day. It ' +
        'runs until you end it.',
    );
    expect(card?.choices).toEqual([
      { id: 'take', label: 'Take it' },
      { id: 'notNow', label: 'Not now' },
    ]);
    expect(before.rng).toBe(rng);
  });

  it('is not offered with one engineer, with no line, or with the line short of a module', () => {
    for (const state of [withLine(bigUnit(), 1), bigUnit()]) {
      const seen: GameEvent[] = [];
      const next = nextDay(state, seen);
      expect(seen.some((event) => event.kind === 'lineContractOffered')).toBe(false);
      expect(next.windowLine.contract).toBeNull();
    }
    const short = withLine(bigUnit());
    short.equipment = short.equipment.filter((item) => item.specId !== 'windowLine6');
    const seen: GameEvent[] = [];
    nextDay(short, seen);
    expect(seen.some((event) => event.kind === 'lineContractOffered')).toBe(false);
  });

  it('is a record of its own: not one of the standing contracts, nobody on it, and nothing drawn off the stream', () => {
    const state = taken(withLine(bigUnit()));
    expect(state.windowLine.contract?.status).toBe('active');
    expect(state.contracts.some((contract) => contract.name === 'Windows off the line')).toBe(false);
    expect(state.workers.some((worker) => worker.jobId !== null && worker.jobId.includes('line'))).toBe(false);
  });

  it('turned down, comes back a week on and not before', () => {
    const offered = withOffer(withLine(bigUnit()));
    expect(offered.windowLine.contract?.status).toBe('offered');
    const declined = applyAction(offered, { type: 'RESOLVE_EVENT', choiceId: 'notNow' });
    expect(declined.windowLine.contract).toBeNull();
    expect(declined.windowLine.nextOfferDay).toBe(declined.clock.day + 7);
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
  it('makes one every 120 minutes, four a working day, each 1,500 in and 600 out on one growing line a day', () => {
    const state = taken(withLine(bigUnit()));
    expect(lineWindowMinutes(state)).toBe(LINE_WINDOW_MINUTES);
    const morning = state.clock.day;
    const day = play(state, DAY_END_MINUTE + 60, (event) => (event.kind === 'goingHome' ? 'home' : event.choices[0]?.id ?? 'ok'));
    const contract = day.windowLine.contract;
    // The day it was taken: taken at its open, so the whole of its 480 working minutes.
    expect(contract?.windowsMade).toBe(4);
    const windows = day.ledger.filter((entry) => entry.label === 'Windows off the line: windows' && entry.day === morning);
    const material = day.ledger.filter((entry) => entry.label === 'Windows off the line: timber and glass' && entry.day === morning);
    expect(windows.map((entry) => [entry.category, entry.amount])).toEqual([['contract', 4 * LINE_WINDOW_PRICE]]);
    expect(material.map((entry) => [entry.category, entry.amount])).toEqual([['material', -4 * lineMaterialPerWindow()]]);
    expect(lineMaterialPerWindow()).toBe(600);
    expect(contract?.revenue).toBe(6000);
    expect(contract?.materialCost).toBe(2400);
    // No minute of any machine is booked for it.
    for (const item of day.equipment.filter((entry) => LINE_MODULES.includes(entry.specId))) {
      expect(item.hoursUsed, item.id).toBe(0);
    }
  });

  it('makes none in the dinner hour whether the owner takes it or works through it, and none after five', () => {
    const state = taken(withLine(bigUnit()));
    for (const noonBreak of ['take', 'skip'] as const) {
      const before = { ...state, settings: { ...state.settings, noonBreak } } as GameState;
      const toNoon = play(before, BREAK_START_MINUTE);
      const minutes = toNoon.windowLine.minutes;
      const made = toNoon.windowLine.contract?.windowsMade ?? 0;
      const afterDinner = play(toNoon, 60, (event) => (event.kind === 'breakTime' ? noonBreak : event.choices[0]?.id ?? 'ok'));
      expect(afterDinner.clock.minute, noonBreak).toBeGreaterThanOrEqual(BREAK_START_MINUTE + 60);
      expect(afterDinner.windowLine.contract?.windowsMade, noonBreak).toBe(made);
      expect(afterDinner.windowLine.minutes, noonBreak).toBe(minutes);
    }
    // Past five with the owner staying on: the line's day is over.
    const atFive = play(state, DAY_END_MINUTE, (event) => event.choices[0]?.id ?? 'ok');
    const stayed = play(atFive, 60, (event) => (event.kind === 'goingHome' ? 'overtime' : event.choices[0]?.id ?? 'ok'));
    expect(stayed.windowLine.contract?.windowsMade).toBe(atFive.windowLine.contract?.windowsMade);
  });

  it('makes none with one engineer on duty, and none while the line is being moved', () => {
    const state = taken(withLine(bigUnit()));
    const one = structuredClone(state);
    const first = one.workers.find((worker) => worker.id === 'eng-1');
    if (first === undefined) throw new Error('the engineer is wanted');
    first.absentDaysRemaining = 1;
    expect(lineLevel(one)).toBe(3);
    expect(play(one, 300).windowLine.contract?.windowsMade).toBe(0);
    // The line itself dragged three cells to the front and the move done: six hours of carrying.
    let moving = act({ ...state, speed: 0 } as GameState, { type: 'MOVE_ITEM', itemId: 'kit-line-1', x: 2, y: 17 });
    moving = act(moving, { type: 'END_SETUP', speed: 1 });
    expect(moving.activeEvent?.kind).toBe('moveConfirm');
    moving = act(moving, { type: 'RESOLVE_EVENT', choiceId: 'do' });
    expect(movingMachines(moving)).not.toBeNull();
    const before = { minutes: moving.windowLine.minutes, made: moving.windowLine.contract?.windowsMade };
    const moved = play(moving, 120, (event) => event.choices[0]?.id ?? 'ok');
    expect(movingMachines(moved)).not.toBeNull();
    expect(moved.windowLine.minutes).toBe(before.minutes);
    expect(moved.windowLine.contract?.windowsMade).toBe(before.made);
  });

  it('gives the jobs nothing while it runs, and the line back once it ends', () => {
    const state = taken(withLine(bigUnit()));
    expect(lineFactor(state)).toBe(1);
    expect(boardsForJob(state, 5600, true)).toBe(19);
    const ended = act(state, { type: 'END_LINE_CONTRACT' });
    expect(ended.windowLine.contract).toBeNull();
    expect(lineFactor(ended)).toBe(2.4);
    expect(boardsForJob(ended, 5600, true)).toBe(15);
    expect(ended.windowLine.nextOfferDay).toBe(ended.clock.day + 7);
  });
});

describe('the pallet and the gate (CLAUDE.md T30 2.8)', () => {
  it('sends the tenth window to the gate, starts the next pallet with the eleventh, and the client takes it the next working morning for nothing', () => {
    let state = taken(withLine(bigUnit()));
    // Two working days and a half: ten windows and two more.
    state.windowLine.minutes = 0;
    state = play(state, 60 * 24 * 3, (event) => (event.kind === 'goingHome' ? 'home' : event.choices[0]?.id ?? 'ok'));
    const made = state.windowLine.contract?.windowsMade ?? 0;
    expect(made).toBeGreaterThanOrEqual(LINE_PALLET_WINDOWS + 1);
    expect(state.windowLine.onPallet).toBe(made % LINE_PALLET_WINDOWS);
    // Every pallet sent before this morning has been taken; nothing was booked for it.
    expect(state.ledger.some((entry) => entry.label.includes('pallet'))).toBe(false);
  });

  it('holds a full pallet at the gate until the open of the next working day', () => {
    const state = taken(withLine(bigUnit()));
    state.windowLine.onPallet = LINE_PALLET_WINDOWS - 1;
    state.windowLine.minutes = LINE_WINDOW_MINUTES - 1;
    const one = play(state, 1);
    expect(one.windowLine.palletsAtGate).toBe(1);
    expect(one.windowLine.onPallet).toBe(0);
    const tomorrow = nextDay(one);
    expect(tomorrow.windowLine.palletsAtGate).toBe(0);
  });

  it('sends a part pallet to the gate when the contract ends, by End it or by the sale of the line', () => {
    const state = taken(withLine(bigUnit()));
    state.windowLine.onPallet = 7;
    const ended = act(state, { type: 'END_LINE_CONTRACT' });
    expect(ended.windowLine.palletsAtGate).toBe(1);
    expect(ended.windowLine.onPallet).toBe(0);
    const sold = structuredClone(state);
    expect(sellMachine(sold, 'kit-line-4').ok).toBe(true);
    expect(sold.windowLine.contract).toBeNull();
    expect(sold.windowLine.palletsAtGate).toBe(1);
  });
});
