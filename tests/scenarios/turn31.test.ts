/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// @vitest-environment jsdom
// The Turn 31 scenarios of CLAUDE.md T31 E2. The letters follow Turn 30's (ggg).
//
// (hhh) A company with the line's contract running and no office admin restocks the line's timber
//       and glass itself on the Materials page, is refused a third restock of glass with nothing
//       typed while the glass rack's room is on its way, sees both come on the next working day's
//       lorries and go onto the timber store and the glass rack, the contract holding its week of
//       them, makes windows that take two boards and one glass unit each, and stands with `no
//       timber` when it runs out; with an admin, who restocks both for it, the line never stands for
//       material over a played month once its first loads are in. Flipped in v96: the line's own
//       order buttons and its glass at module 6 are gone, and it takes its boards and glass from the
//       stores (CLAUDE.md T32 2.5).
// (iii) The Production line tab after that played month reads each row as 2.5 reckons it, the
//       turnover as the ledger has it, and the efficiency under 100 per cent on a day an engineer
//       was away.
// (jjj) The line's lane refuses a rack put on it; a save with a bench on the lane shows `laneBlocked`
//       and the line moved onto a place whose lane is blocked is refused, until the bench is moved.
// (kkk) The hall extended three times (600,000, 690,000, 793,500 from v116) is 70 by 20 m, its rent, rates,
//       power, insurance and security up with it, 56 lockers in its enlarged canteen, and the van
//       and the apron moved out each time.
// (lll) Over a played year of three sheet contracts, with the seed chosen to show it, one is lost
//       and let go off the tab, no contract is offered in the quiet days after, and a renewal comes
//       in lower; and the draws the scenarios pinned before tonight make never come up, so every
//       figure they pin is what it was.

import { describe, expect, it } from 'vitest';
import {
  DAYS_PER_MONTH,
  LINE_MODULES,
  LINE_MODULE_POWER_PER_DAY,
  LINE_WINDOW_PRICE,
  CONTRACT_CLIENT_LEAVES_CHANCE,
  CONTRACT_RENEWAL_CUT_CHANCE,
  unitCostFactor,
} from '../../src/engine/constants';
import { applyAction, monthOfDay, runMinutes, tick } from '../../src/engine/index';
import type { Contract, GameEvent, GameState, Worker } from '../../src/engine/index';
import { isOvertime, isWorkingDay } from '../../src/engine/clock';
import { CONTRACT_CUT_SALT, CONTRACT_LOSS_SALT, contractSideCarrier } from '../../src/engine/contracts';
import { standingPowerPerDay } from '../../src/engine/economy';
import { monthlyPremiums } from '../../src/engine/insurance';
import { canPlace, canPlaceSpec, canteenLockers, crewLimit } from '../../src/engine/layout';
import { lineBooks } from '../../src/engine/lineBooks';
import { lineMaterialPerWindow, lineShortOf, lineWindowsAWeek } from '../../src/engine/lineContract';
import { restockCheck, restockSplit, stockOnItem } from '../../src/engine/materials';
import { migrateState } from '../../src/engine/migrate';
import { next } from '../../src/engine/rng';
import { securitySubscriptionMonthly, securitySubscriptionParts } from '../../src/engine/security';
import { warnings } from '../../src/engine/warnings';
import { renderAccounting } from '../../src/ui/accounting';
import { renderContracts } from '../../src/ui/contracts';
import {
  act,
  buyNow,
  buyStartingKit,
  connectAll,
  fillRack,
  newGame,
  nextDay,
  placeEquipment,
  placeGlassRack,
  testJoiner,
  withAir,
  withExtraction,
} from '../helpers';
import { type Policy, playDay } from './autopilot';
import { lineState } from '../../src/engine/lineContract';

// ---------------------------------------------------------------------------------------------
// The plays
// ---------------------------------------------------------------------------------------------

/** The answer a script gives a card: the first choice, unless it says otherwise. */
type Answer = (event: GameEvent) => string | undefined;

/** The line's offer taken, every other card answered with its first choice. */
const TAKE: Answer = (event) => (event.kind === 'lineContractOffered' ? 'take' : undefined);

/** One hour of the clock, every card answered, home at five. */
function hour(state: GameState, answer: Answer, seen: GameEvent[]): GameState {
  let next = tick(state, 60);
  for (let guard = 0; guard < 500; guard += 1) {
    if (next.activeEvent === null) {
      if (isOvertime(next.clock.minute) && !next.owner.wentHome) {
        next = applyAction(next, { type: 'END_DAY' });
        continue;
      }
      break;
    }
    seen.push(next.activeEvent);
    next = applyAction(next, { type: 'RESOLVE_EVENT', choiceId: answer(next.activeEvent) ?? next.activeEvent.choices[0]?.id ?? 'ok' });
  }
  return next;
}

/** Plays to the open of the next day. */
function day(state: GameState, answer: Answer = TAKE, seen: GameEvent[] = []): GameState {
  let next = state;
  const today = next.clock.day;
  for (let guard = 0; next.clock.day === today && next.gameOver === null && guard < 200; guard += 1) next = hour(next, answer, seen);
  return next;
}

/** Plays minutes of the clock, every card answered. */
function minutes(state: GameState, count: number, answer: Answer = TAKE): GameState {
  let next = state;
  let left = count;
  for (let guard = 0; left > 0 && guard < 400; guard += 1) {
    if (next.activeEvent !== null) {
      next = applyAction(next, { type: 'RESOLVE_EVENT', choiceId: answer(next.activeEvent) ?? next.activeEvent.choices[0]?.id ?? 'ok' });
      continue;
    }
    const result = runMinutes(next, left);
    next = result.state;
    left -= result.minutesRun;
    if (result.minutesRun === 0 && next.activeEvent === null) break;
  }
  return next;
}

function engineer(id: string): Worker {
  return { ...testJoiner(id, id), role: 'lineEngineer', tier: null, rate: 0, monthlyWage: 15000 };
}

/** A company in the 800 m² unit with the day one kit, its timber shelter bought (behind the rear
 *  wall, 2.8), the line standing whole at (2, 14), a glass rack on the floor clear of its lane, two
 *  engineers, two joiners and a labourer, and an office admin when asked for. From Turn 32 the line's
 *  glass is on a glass rack, and its boards and glass come on lorries for stock, two a morning at
 *  times: the labourer takes them in, so neither waits at the gate behind the other's card
 *  (CLAUDE.md T32 2.1, 2.6) [TUNE]. */
function lineCompany(withAdmin: boolean): GameState {
  let state = newGame({ difficulty: 'veryEasy' });
  state.cash = 9000000;
  state = nextDay(act(state, { type: 'EXTEND_UNIT' }));
  state = nextDay(act(state, { type: 'EXTEND_UNIT', stage: 'second' }));
  state = withAir(buyStartingKit(state), 'industrial');
  state.cash = 12000000;
  state.reputation = 40;
  state.enquiries = [];
  state = buyNow(state, 'timberShelter');
  LINE_MODULES.forEach((id, index) => placeEquipment(state, id, { x: 2 + 6 * index, y: 14, id: `kit-line-${index + 1}` }));
  placeGlassRack(state);
  state.workers.push(engineer('eng-1'), engineer('eng-2'), testJoiner('w-tom', 'Tom'), testJoiner('w-ben', 'Ben'));
  state.workers.push({ ...testJoiner('w-gus', 'Gus'), role: 'helper', tier: null, rate: 0 });
  if (withAdmin) state.workers.push({ ...testJoiner('adm-1', 'Anna'), role: 'officeAdmin', tier: null, rate: 0, monthlyWage: 2000 });
  return state;
}

/** Played to the morning the line's offer is taken, at its card. */
function taken(state: GameState): GameState {
  let next = state;
  for (let guard = 0; lineState(next, 1).contract?.status !== 'active' && guard < 10; guard += 1) next = day(next);
  if (lineState(next, 1).contract?.status !== 'active') throw new Error('the line s offer never came');
  return next;
}

function kitOf(state: GameState, specId: string): string {
  const kit = state.equipment.find((item) => item.specId === specId);
  if (kit === undefined) throw new Error(`the ${specId} is wanted`);
  return kit.id;
}

/** True while a load bought for stock is still on its lorry or at the gate. */
function stockOnTheWay(state: GameState): boolean {
  return state.deliveries.some((delivery) => delivery.jobId === null && !delivery.unloaded);
}

/** What the running contract holds of each kind is what the windows left in its week want, as far
 *  as the stores have it, every minute: it holds its week at the take, at every working open and
 *  after every unloading, and each window takes out of what it holds first (CLAUDE.md T32 2.5). */
function holdsItsWeek(state: GameState): void {
  const contract = lineState(state, 1).contract;
  const left = lineWindowsAWeek(state, 1) - (contract?.windowsThisWeek ?? 0);
  expect(contract?.boardsReserved).toBe(Math.min(2 * left, state.stock.boards));
  expect(contract?.glassReserved).toBe(Math.min(left, state.stock.glass));
}

function line(state: GameState, label: string): number[] {
  return state.ledger.filter((entry) => entry.label === label).map((entry) => entry.amount);
}

// ---------------------------------------------------------------------------------------------
// (hhh)
// ---------------------------------------------------------------------------------------------

describe('(hhh) the line s timber and glass, bought by the player and by the office (CLAUDE.md T31 2.1 to 2.4, T32 2.5)', () => {
  const take = taken(lineCompany(false));
  const takeDay = take.clock.day;
  // The player's clicks on the Materials page, at the minute the contract was taken: forty boards
  // and twice twenty glass units, which is the glass rack's room (CLAUDE.md T32 2.3).
  let ordered = act(take, { type: 'RESTOCK', kind: 'boards', sheets: 40 });
  ordered = act(ordered, { type: 'RESTOCK', kind: 'glass', sheets: 20 });
  ordered = act(ordered, { type: 'RESTOCK', kind: 'glass', sheets: 20 });
  // And a third of the glass with nothing typed: what fills the free places less what is on its way.
  const third = act(ordered, { type: 'RESTOCK', kind: 'glass' });
  // Played on until both are off their lorries and on the stores.
  let stocked = ordered;
  for (let guard = 0; stockOnTheWay(stocked) && guard < 60; guard += 1) stocked = minutes(stocked, 30);
  // A whole working day of windows, and then on until the timber runs out.
  const before = { windows: lineState(stocked, 1).contract?.windowsMade ?? 0, boards: stocked.stock.boards, glass: stocked.stock.glass, sheets: stocked.stock.sheets };
  let after = day(stocked);
  while (!isWorkingDay(after.clock.day)) after = day(after);
  after = minutes(after, 300);
  let dry = after;
  for (let guard = 0; lineShortOf(dry, 1) === null && guard < 30; guard += 1) dry = minutes(dry, 120);
  dry = minutes(dry, 30);
  // On to a working hour with both engineers on duty, which is when the strip says it.
  let onDuty = dry;
  for (let guard = 0; !(isWorkingDay(onDuty.clock.day) && onDuty.clock.minute >= 60 && onDuty.clock.minute < 480) && guard < 100; guard += 1) {
    onDuty = minutes(onDuty, 30);
  }

  it('buys nothing by itself with no admin: the line stands for both from the take', () => {
    // Flipped in v96: nothing is bought for stock, and the contract holds nothing because the stores
    // are empty (CLAUDE.md T32 2.5).
    expect(take.stock.boards).toBe(0);
    expect(take.stock.glass).toBe(0);
    expect(take.deliveries.some((delivery) => delivery.jobId === null)).toBe(false);
    expect(take.ledger.some((entry) => / for stock/.test(entry.label))).toBe(false);
    expect(lineState(take, 1).contract?.boardsReserved).toBe(0);
    expect(lineState(take, 1).contract?.glassReserved).toBe(0);
    expect(lineShortOf(take, 1)).toBe('timber or glass');
  });

  it('pays for the player s restocks at the click, on the material line, and refuses a third with nothing typed while the rack s room is on its way', () => {
    // Flipped in v96: the boards on the sheets' ladder (180 a board at forty), the glass at 200 a
    // unit (CLAUDE.md T32 2.3).
    expect(line(ordered, '40 boards for stock')).toEqual([-7200]);
    expect(line(ordered, '20 glass units for stock')).toEqual([-4000, -4000]);
    // The glass rack's forty on their way: an empty field buys nothing and says so, in the sheets'
    // words for glass; a typed twenty would be bought whole and go to the paid store (CLAUDE.md T24
    // 2.8, T32 2.3).
    expect(restockCheck(ordered, 'glass')).toEqual({ ok: false, reason: '40 glass units are on the way', sheets: 0, cost: 0 });
    expect(restockSplit(ordered, 'glass', 20)).toEqual({ sheets: 20, onRack: 0, toStorage: 20, storageCost: 150 });
    expect(third.cash).toBe(ordered.cash);
    expect(third.deliveries).toHaveLength(ordered.deliveries.length);
  });

  it('brings the boards and the glass on the next working day s lorries, onto the timber store and the glass rack, and holds the week s', () => {
    const loads = ordered.deliveries.filter((delivery) => delivery.jobId === null);
    expect(loads.map((load) => [load.material, load.sheets])).toEqual([
      ['boards', 40],
      ['glass', 20],
      ['glass', 20],
    ]);
    let next = takeDay + 1;
    while (!isWorkingDay(next)) next += 1;
    for (const load of loads) expect(load.arriveDay).toBe(next);
    // Forty boards and forty units landed, less the first window: at an hour a window (v97) the line
    // makes it in the half hour the loads come in, where two hours made none.
    expect(stocked.stock.boards).toBe(38);
    expect(stocked.stock.glass).toBe(39);
    expect(stocked.stock.tempStorageBoards + stocked.stock.tempStorageGlass).toBe(0);
    expect(stockOnItem(stocked, { id: kitOf(stocked, 'timberShelter') })).toBe(38);
    expect(stockOnItem(stocked, { id: kitOf(stocked, 'glassRack') })).toBe(39);
    holdsItsWeek(stocked);
    expect(lineState(stocked, 1).contract?.boardsReserved).toBeGreaterThan(0);
  });

  it('makes windows that take two boards and one glass unit each, off the counters, out of what it holds first', () => {
    const made = (lineState(after, 1).contract?.windowsMade ?? 0) - before.windows;
    expect(made).toBeGreaterThan(0);
    expect(after.stock.boards).toBe(before.boards - 2 * made);
    expect(after.stock.glass).toBe(before.glass - made);
    // Flipped in v96: the boards have their own counter, and the sheets' is not touched (CLAUDE.md
    // T32 2.2).
    expect(after.stock.sheets).toBe(before.sheets);
    holdsItsWeek(after);
    // No material booked a window: it was paid when it was bought.
    expect(after.ledger.some((entry) => entry.label === 'Windows off line 1: timber and glass')).toBe(false);
  });

  it('stands with no timber when it runs out, and says so on the strip and the tab', () => {
    expect(lineShortOf(dry, 1)).toBe('timber');
    expect(dry.stock.boards).toBe(0);
    // Nineteen windows from the thirty eight boards left after the first (v97), then dry.
    expect(dry.stock.glass).toBe(20);
    expect((lineState(dry, 1).contract?.windowsMade ?? 0) - before.windows).toBe(19);
    expect(lineShortOf(onDuty, 1)).toBe('timber');
    expect(warnings(onDuty).find((warning) => warning.key === 'lineNeedsMaterial')?.text).toBe('Line 1 stands: no timber for its next window');
    const holder = document.createElement('div');
    holder.innerHTML = renderContracts(onDuty);
    // The row's label and its figure, in the two cells every figure row has.
    const still = Array.from(holder.querySelectorAll('.row')).find((row) => row.querySelector('.row-main')?.textContent === 'Standing still');
    expect(still?.querySelector('.row-figure')?.textContent).toBe('no timber');
  });
});

// ---------------------------------------------------------------------------------------------
// (hhh) with an admin, and (iii)
// ---------------------------------------------------------------------------------------------

// The admin's company, played a month from the take, an engineer away for one working day of it.
const office = taken(lineCompany(true));
const officeTakeDay = office.clock.day;
let firstIn = office;
for (let guard = 0; (firstIn.stock.boards === 0 || firstIn.stock.glass === 0) && guard < 40; guard += 1) firstIn = minutes(firstIn, 30);
const inFrom = firstIn.clock.day;
let month = firstIn;
let awayDay = -1;
for (let guard = 0; month.clock.day < inFrom + 30 && guard < 40; guard += 1) {
  if (awayDay < 0 && month.clock.day >= inFrom + 9 && isWorkingDay(month.clock.day)) {
    awayDay = month.clock.day;
    const away = month.workers.find((worker) => worker.id === 'eng-1');
    if (away !== undefined) away.absentDaysRemaining = 1;
  }
  month = day(month);
}
month = minutes(month, 300);

describe('(hhh) with an office admin the line never stands for material (CLAUDE.md T31 2.3, T32 2.5)', () => {
  it('restocks both at the take and in time ever after, in his name: from the day after the first loads are in, no minute stands for material', () => {
    // Flipped in v96: his order is a restock of each kind with nothing typed, which fills the
    // stores' free places: the shelter's 400 boards and the glass rack's 40 units, each on its
    // lorry for stock, his name on the material line (CLAUDE.md T32 2.5).
    expect(office.deliveries.filter((delivery) => delivery.jobId === null).map((delivery) => [delivery.material, delivery.sheets])).toEqual([
      ['boards', 400],
      ['glass', 40],
    ]);
    expect(line(office, '400 boards for stock, ordered by Anna')).toHaveLength(1);
    expect(line(office, '40 glass units for stock, ordered by Anna')).toEqual([-8000]);
    expect(inFrom).toBeGreaterThan(officeTakeDay);
    // Only ever into the stores' free places: nothing he bought went to the paid store.
    expect(month.ledger.some((entry) => entry.category === 'storage')).toBe(false);
    expect(month.ledger.filter((entry) => / for stock, ordered by Anna$/.test(entry.label)).length).toBeGreaterThan(2);
    // The first loads come on the next working morning's lorries and are unloaded in the first
    // hours of it, which is the one wait for material the line has.
    const material = lineState(month, 1).days.filter((record) => record.day > inFrom);
    expect(material.length).toBeGreaterThan(25);
    for (const record of material) {
      expect(record.lost.timber + record.lost.glass + record.lost.timberAndGlass, `day ${record.day}`).toBe(0);
    }
    expect(lineState(month, 1).today.lost.timber + lineState(month, 1).today.lost.glass + lineState(month, 1).today.lost.timberAndGlass).toBe(0);
  });
});

describe('(iii) the Production line tab after a played month (CLAUDE.md T31 2.5)', () => {
  const books = lineBooks(month, 1);
  const thisMonth = monthOfDay(month.clock.day);
  const records = [...lineState(month, 1).days, lineState(month, 1).today].filter((record) => monthOfDay(record.day) === thisMonth);

  it('reads each row of this month as 2.5 reckons it, and the turnover as the ledger has it', () => {
    const column = books.month;
    expect(column.windows).toBe(records.reduce((total, record) => total + record.windows, 0));
    expect(column.turnover).toBe(column.windows * LINE_WINDOW_PRICE);
    const ledger = month.ledger
      .filter((entry) => entry.label === 'Windows off line 1: windows' && monthOfDay(entry.day) === thisMonth)
      .reduce((total, entry) => total + entry.amount, 0);
    expect(column.turnover).toBe(ledger);
    expect(column.material).toBe(column.windows * lineMaterialPerWindow());
    expect(column.engineers).toBeCloseTo(records.length * 2 * (15000 / DAYS_PER_MONTH), 6);
    expect(column.power).toBe(records.length * LINE_MODULES.length * LINE_MODULE_POWER_PER_DAY);
    expect(column.cover).toBe(0);
    expect(column.net).toBeCloseTo(column.turnover - column.material - column.engineers - column.power - column.cover, 6);
    const holder = document.createElement('div');
    holder.innerHTML = renderAccounting(month, 'line');
    expect(holder.querySelector('[data-do="accountingTab"][data-id="line"]')?.textContent).toBe('Production line');
    expect(holder.textContent).toContain('Windows made');
    expect(holder.textContent).toContain('Paid back:');
  });

  it('has the efficiency under 100 per cent on the day an engineer was away, and says what it lost', () => {
    const away = [...lineState(month, 1).days, lineState(month, 1).today].find((record) => record.day === awayDay);
    expect(away).toBeDefined();
    expect(away?.lost.engineer).toBeGreaterThan(0);
    expect(away?.windows ?? 0).toBeLessThan(away?.possibleWindows ?? 0);
    const others = lineState(month, 1).days.filter((record) => record.day >= inFrom && record.day !== awayDay && record.possibleWindows > 0);
    expect(others.length).toBeGreaterThan(10);
    if (monthOfDay(awayDay) === thisMonth) {
      const holder = document.createElement('div');
      holder.innerHTML = renderAccounting(month, 'line');
      expect(holder.textContent).toMatch(/Lost this month: .*for want of an engineer/);
    }
  });
});

// ---------------------------------------------------------------------------------------------
// (jjj)
// ---------------------------------------------------------------------------------------------

describe('(jjj) the line s lane (CLAUDE.md T31 2.6)', () => {
  it('refuses a rack put on it, in setup mode and at the catalogue s search', () => {
    const state = lineCompany(false);
    expect(canPlaceSpec(state, 'sheetRack', 20, 18, null)).toEqual({ ok: false, reason: "That is the forklift's lane" });
    const rack = state.equipment.find((item) => item.specId === 'sheetRack');
    if (rack === undefined) throw new Error('the rack is wanted');
    const moved = act(state, { type: 'MOVE_ITEM', itemId: rack.id, x: 20, y: 18 });
    expect(moved.equipment.find((item) => item.id === rack.id)).toMatchObject({ anchorX: rack.anchorX, anchorY: rack.anchorY });
  });

  it('opens a save with a bench on the lane, names it on the strip, refuses the line a place whose lane it blocks, and lets it go once the bench is moved', () => {
    const company = lineCompany(false);
    placeEquipment(company, 'workbench', { variantId: 'standard', x: 10, y: 18, id: 'kit-bench-on-the-lane' });
    const raw = JSON.parse(JSON.stringify(company)) as Record<string, unknown> & {
      windowLine: Record<string, unknown>;
      windowLines: Record<string, unknown>[];
      unit: Record<string, unknown>;
      equipment: Record<string, unknown>[];
    };
    raw.version = 43;
    // A v43 save holds the one record `windowLine`, with no number, and its modules carry no line
    // (v93).
    raw.windowLine = { ...(raw.windowLines[0] ?? {}) };
    delete raw.windowLine.number;
    delete (raw as { windowLines?: unknown }).windowLines;
    for (const item of raw.equipment) delete item.line;
    for (const key of ['boards', 'glass', 'glassOnTheWay', 'today', 'days', 'since']) delete raw.windowLine[key];
    delete raw.unit.longExtensions;
    delete raw.unit.longExtension;
    delete raw.contractQuietUntilDay;
    const opened = migrateState(raw, 43);
    if (opened === null) throw new Error('the save opens');
    expect(opened.equipment.find((item) => item.id === 'kit-bench-on-the-lane')).toMatchObject({ anchorX: 10, anchorY: 18 });
    expect(warnings(opened).find((warning) => warning.key === 'laneBlocked')?.text).toBe("Kit stands in line 1's way: the workbench");
    // From v93 a line's lane is its own, two metres in front of its engineers' metre: the bench at
    // y 18 is on the lane of the line's place at y 14 and of its place at y 13, not of y 11's.
    expect(canPlace(opened, 'kit-line-1', 2, 13)).toEqual({ ok: false, reason: 'The line needs a clear 36 m by 3 m, its lane and a metre each side' });
    const refused = act(opened, { type: 'MOVE_ITEM', itemId: 'kit-line-1', x: 2, y: 13 });
    expect(refused.equipment.find((item) => item.id === 'kit-line-1')?.anchorY).toBe(14);
    const cleared = act(opened, { type: 'MOVE_ITEM', itemId: 'kit-bench-on-the-lane', x: 24, y: 6 });
    expect(cleared.equipment.find((item) => item.id === 'kit-bench-on-the-lane')).toMatchObject({ anchorX: 24, anchorY: 6 });
    expect(warnings(cleared).some((warning) => warning.key === 'laneBlocked')).toBe(false);
    expect(canPlace(cleared, 'kit-line-1', 2, 13)).toEqual({ ok: true, reason: '' });
  });
});

// ---------------------------------------------------------------------------------------------
// (kkk)
// ---------------------------------------------------------------------------------------------

describe('(kkk) the hall extended three times (CLAUDE.md T31 2.7)', () => {
  let state = newGame({ difficulty: 'veryEasy' });
  state.cash = 9000000;
  state = nextDay(act(state, { type: 'EXTEND_UNIT' }));
  state = nextDay(act(state, { type: 'EXTEND_UNIT', stage: 'second' }));
  // The canteen enlarged while the floor beside it is clear, then the day one kit.
  state = act(state, { type: 'ENLARGE_CANTEEN' });
  state = buyStartingKit(state);
  placeEquipment(state, 'van', { x: state.unit.widthCells, y: 7, id: 'kit-van' });
  state.insurance.liability = true;
  state.security.level = 3;
  state.cash = 5000000;
  const eight = state;
  const vans: number[] = [];
  const widths: number[] = [];
  let grown = state;
  for (let n = 0; n < 3; n += 1) {
    grown = nextDay(act(grown, { type: 'EXTEND_UNIT', stage: 'long' }));
    vans.push(grown.equipment.find((item) => item.id === 'kit-van')?.anchorX ?? -1);
    widths.push(grown.unit.widthCells);
  }

  it('cost 600,000, 690,000 and 793,500, each the next working morning ten metres longer, the van moved out each time', () => {
    // The first extension was 200 m² too: the last three lines are the long ones.
    expect(line(grown, 'Extension of the unit, 200 m²').slice(-3)).toEqual([-600000, -690000, -793500]); // the growth 1.15 (PIOTR, 19.10; v116)
    expect(line(grown, 'Extension of the unit, 200 m²')).toHaveLength(4);
    expect(widths).toEqual([50, 60, 70]);
    expect(vans).toEqual([50, 60, 70]);
    expect(grown.unit).toMatchObject({ widthCells: 70, depthCells: 20, areaM2: 1400, longExtensions: 3, longExtension: 'none' });
  });

  it('has its rent, rates, power, insurance and security up with it, the joiners it takes, and 56 lockers', () => {
    expect([eight.unit.rentMonthly, grown.unit.rentMonthly]).toEqual([9600, 16800]);
    expect([eight.unit.ratesMonthly, grown.unit.ratesMonthly]).toEqual([1800, 3150]);
    expect([standingPowerPerDay(eight.unit), standingPowerPerDay(grown.unit)]).toEqual([16, 28]);
    expect([unitCostFactor(eight.unit), unitCostFactor(grown.unit)]).toEqual([2, 3.5]);
    // The insurer's factor stops at the 800 m2 unit's two from v101 [PIOTR, 17.10: "the insurance is
    // still too high"], so the longer hall's covers cost what the 800 m2 unit's do.
    expect(monthlyPremiums(grown)).toBe(monthlyPremiums(eight));
    expect(securitySubscriptionMonthly(grown, 3)).toBe(525);
    expect(securitySubscriptionParts(grown, 5).areaFactor).toBe(7);
    expect(crewLimit(grown)).toBe(56);
    expect(canteenLockers(grown)).toBe(56);
  });
});

// ---------------------------------------------------------------------------------------------
// (lll)
// ---------------------------------------------------------------------------------------------

/** The draws the tests and scenarios pinned before tonight make, as the suite of v91 made them: the
 *  seed, the contract and the day of each, recorded off the engine's own carrier (D1). None of them
 *  comes up, which is why no figure any of them pins has moved (CLAUDE.md T31 2.9). */
const PINNED_DRAWS: Array<['loss' | 'cut', number, string, number]> = [
  ['cut', 20260911, 'contract-1', 15],
  ['cut', 20260911, 'contract-1', 8],
  ['cut', 20260911, 'contract-1-r', 9],
  ['cut', 20260911, 'contract-3', 122],
  ['loss', 20260911, 'contract-1', 15],
  ['loss', 20260911, 'contract-1', 8],
  ['loss', 20260911, 'contract-3', 106],
  ['loss', 20260911, 'contract-3', 113],
  ['loss', 20260911, 'contract-3', 120],
  ['loss', 20260911, 'contract-3', 15],
  ['loss', 20260911, 'contract-3', 22],
  ['loss', 20260911, 'contract-3', 29],
  ['loss', 20260911, 'contract-3', 36],
  ['loss', 20260911, 'contract-3', 43],
  ['loss', 20260911, 'contract-3', 50],
  ['loss', 20260911, 'contract-3', 57],
  ['loss', 20260911, 'contract-3', 64],
  ['loss', 20260911, 'contract-3', 71],
  ['loss', 20260911, 'contract-3', 78],
  ['loss', 20260911, 'contract-3', 8],
  ['loss', 20260911, 'contract-3', 85],
  ['loss', 20260911, 'contract-3', 92],
  ['loss', 20260911, 'contract-3', 99],
  ['loss', 20260911, 'contract-53', 57],
  ['loss', 20260911, 'contract-month-cc', 15],
  ['loss', 20260911, 'contract-month-cc', 22],
  ['loss', 20260911, 'contract-month-v', 15],
  ['loss', 20260911, 'contract-month-v', 8],
  ['loss', 20260911, 'contract-month-y', 15],
  ['loss', 20260911, 'contract-month-y', 22],
  ['loss', 20260911, 'contract-month-y', 29],
  ['loss', 20260911, 'contract-month-y', 36],
  ['loss', 20260911, 'contract-month-y', 43],
  ['loss', 20260911, 'contract-month-y', 8],
];

/** The seed of the year, chosen to show what (lll) is about: a client who goes elsewhere and a
 *  renewal that asks for less (CLAUDE.md T31 2.9: "choose its seed so that it shows"). */
const YEAR_SEED = 20261012;

interface YearLog {
  /** Every standing offer seen on the board, by the day it was made. */
  offered: Set<number>;
  /** Each contract lost: its id, the day and the quiet's last day, and the day it was let go. */
  lost: Array<{ id: string; day: number; quietUntil: number; letGo: number | null }>;
  /** Each renewal taken: its price a piece and the one the term before it had. */
  renewed: Array<{ id: string; before: number; after: number }>;
  cutCards: GameEvent[];
}

/** The scripted player's three contracts: up to three at a time, two joiners on each; a lost one let
 *  go off the tab, a term that ends renewed at whatever the client offers, any other end let go. */
function contractManager(log: YearLog): (state: GameState, day: number) => GameState {
  return (state, day) => {
    let current = state;
    if (current.stock.sheets < 40) current = act(current, { type: 'RESTOCK', kind: 'sheets', sheets: 60 });
    for (const contract of current.contracts.filter((entry) => entry.status === 'offered')) log.offered.add(contract.offeredDay);
    for (const contract of current.contracts.filter((entry) => entry.status === 'ended')) {
      if (contract.endedBy === 'lost') {
        const record = log.lost.find((entry) => entry.id === contract.id);
        if (record !== undefined) record.letGo = day;
        current = act(current, { type: 'RENEW_CONTRACT', contractId: contract.id, accept: false });
      } else if (contract.endedBy === 'term') {
        log.renewed.push({ id: `${contract.id}-r`, before: contract.pricePerPiece, after: contract.renegotiatedPrice ?? contract.pricePerPiece });
        current = act(current, { type: 'RENEW_CONTRACT', contractId: contract.id, accept: true });
      } else {
        current = act(current, { type: 'RENEW_CONTRACT', contractId: contract.id, accept: false });
      }
    }
    const offered = current.contracts.find((entry) => entry.status === 'offered');
    if (offered !== undefined && current.contracts.filter((entry) => entry.status === 'active').length < 3) {
      current = act(current, { type: 'ACCEPT_CONTRACT', contractId: offered.id });
    }
    for (const contract of current.contracts.filter((entry) => entry.status === 'active' && entry.assigned.length < 2)) {
      const busy = new Set(current.contracts.flatMap((entry) => (entry.status === 'active' ? entry.assigned : [])));
      for (const worker of current.workers.filter((entry) => entry.role === 'joiner' && !busy.has(entry.id))) {
        const next = current.contracts.find((entry) => entry.id === contract.id);
        if (next === undefined || next.assigned.length >= 2) break;
        current = act(current, { type: 'ASSIGN_CONTRACT', contractId: contract.id, workerId: worker.id, on: true });
        busy.add(worker.id);
      }
    }
    return current;
  };
}

/** A year of the scripted player of autopilot.ts (the cleaning, the tasks, the cards, home at five):
 *  the day one kit, three saws and three benches, six joiners, a rack of sixty, a name of forty, no
 *  jobs of work, and up to three standing contracts. */
function playYear(): { state: GameState; log: YearLog } {
  const log: YearLog = { offered: new Set(), lost: [], renewed: [], cutCards: [] };
  const policy: Policy = {
    maxOpenJobs: 0,
    buyKit: false,
    cleanAbove: 55,
    wanted: [],
    hireJoiner: false,
    stockSheets: 0,
    onDay: contractManager(log),
  };
  let state = withExtraction(withAir(fillRack(buyStartingKit(newGame({ seed: YEAR_SEED, difficulty: 'veryEasy' })), 60)));
  for (const x of [10, 14]) placeEquipment(state, 'tableSaw', { variantId: 'standard', x, y: 2, id: `kit-saw-${x}` });
  for (const x of [6, 9, 12]) placeEquipment(state, 'workbench', { variantId: 'standard', x, y: 6, id: `kit-bench-${x}` });
  for (let n = 1; n <= 6; n += 1) state.workers.push(testJoiner(`w-${n}`, `Joiner ${n}`));
  state = connectAll(state);
  state.cash = 600000;
  state.reputation = 40;
  state.enquiries = [];
  const seen: GameEvent[] = [];
  for (let guard = 0; state.clock.day <= 360 && state.gameOver === null && guard < 400; guard += 1) {
    const before = new Set(state.contracts.filter((entry) => entry.status === 'active').map((entry) => entry.id));
    state = playDay(state, policy, seen);
    for (const contract of state.contracts) {
      if (contract.endedBy === 'lost' && before.has(contract.id) && !log.lost.some((entry) => entry.id === contract.id)) {
        log.lost.push({ id: contract.id, day: contract.endDay ?? -1, quietUntil: state.contractQuietUntilDay ?? -1, letGo: null });
      }
    }
  }
  log.cutCards = seen.filter((event) => event.kind === 'contractEnded' && event.body.endsWith('the market has turned.'));
  return { state, log };
}

describe('(lll) a year of three sheet contracts (CLAUDE.md T31 2.9)', () => {
  const { state: year, log } = playYear();

  it('loses a contract to another supplier now and then, and lets it go off the tab', () => {
    expect(year.gameOver).toBeNull();
    expect(log.lost.length).toBeGreaterThan(0);
    for (const lost of log.lost) {
      expect(lost.letGo, lost.id).not.toBeNull();
      expect(year.contracts.some((contract) => contract.id === lost.id)).toBe(false);
      // Quiet for 14 to 21 days from the loss.
      expect(lost.quietUntil - lost.day).toBeGreaterThanOrEqual(14);
      expect(lost.quietUntil - lost.day).toBeLessThanOrEqual(21);
    }
  });

  it('offers no standing contract in the quiet days after a loss', () => {
    for (const lost of log.lost) {
      const inQuiet = [...log.offered].filter((offeredDay) => offeredDay > lost.day && offeredDay < lost.quietUntil);
      expect(inQuiet, lost.id).toEqual([]);
    }
  });

  it('has a renewal come in lower now and then, 5 to 15 per cent under the price a piece it had', () => {
    const lower = log.renewed.filter((entry) => entry.after < entry.before);
    expect(lower.length).toBeGreaterThan(0);
    for (const entry of lower) {
      expect(entry.after).toBeGreaterThanOrEqual(entry.before * 0.85);
      expect(entry.after).toBeLessThanOrEqual(entry.before * 0.95);
    }
    expect(log.cutCards.length).toBe(lower.length);
  });

  it('never comes up on the 34 draws the scenarios pinned before tonight make', () => {
    expect(PINNED_DRAWS).toHaveLength(34);
    for (const [kind, seed, id, day] of PINNED_DRAWS) {
      const carrier = contractSideCarrier({ seed, clock: { day } } as GameState, { id } as Contract, kind === 'loss' ? CONTRACT_LOSS_SALT : CONTRACT_CUT_SALT);
      expect(next(carrier) < (kind === 'loss' ? CONTRACT_CLIENT_LEAVES_CHANCE : CONTRACT_RENEWAL_CUT_CHANCE), `${kind} ${id} ${day}`).toBe(false);
    }
  });
});
