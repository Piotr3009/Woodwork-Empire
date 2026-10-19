/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// @vitest-environment jsdom
// v93: more production lines than one [PIOTR, 12.10: "I want to see the next line, and that is
// all: 1 metre for the engineers, 2 for the forklift, and add one more metre of free space; the next
// line costs 10 million as always"]. Each line is bought whole for the same price, stands seven
// metres deep with its own lane, has its own two engineers (line 1 staffed first), its own contract,
// timber, glass, pallet, forklift, upgrades and books, is named by its number everywhere, and is sold
// and moved on its own. The line a save held becomes line 1. From Turn 32 no line has timber or glass
// of its own: every line takes its boards and glass from the one store, each contract holding its
// own week of it, line 1 first (CLAUDE.md T32 2.5).

import { describe, expect, it } from 'vitest';
import { LINE_MODULES, LINE_PRICE, WINDOW_LINE_ORIGIN } from '../../src/engine/constants';
import type { GameEvent, GameState, Worker } from '../../src/engine/index';
import { applyAction, runMinutes } from '../../src/engine/index';
import { canBuy, placeEquipmentOrder, sellMachine } from '../../src/engine/game';
import { canPlace, canPlaceSpec, claimedGround, lineLanes, lineNoRoom, lineSite } from '../../src/engine/layout';
import { allLinesBooks, lineBooks, linesWithBooks } from '../../src/engine/lineBooks';
import {
  answerLineOffer,
  endLineContract,
  lineState,
  palletsAtTheGate,
  reserveEveryLinesMaterial,
  runningLineContract,
} from '../../src/engine/lineContract';
import { freeFor, reservedFor } from '../../src/engine/materials';
import {
  itemName,
  jobsLine,
  lineEngineersOnDuty,
  lineItems,
  lineLevel,
  lineNumbers,
  lineOf,
  nextLineNumber,
  standingLines,
} from '../../src/engine/machines';
import { migrateState } from '../../src/engine/migrate';
import { engineersKeepLine, hiringOptions, lineEngineersWanted } from '../../src/engine/staff';
import { warnings } from '../../src/engine/warnings';
import { forkliftPoints } from '../../src/render/forklift';
import { renderHall } from '../../src/render/hall';
import { renderAccounting } from '../../src/ui/accounting';
import { ownedTile } from '../../src/ui/catalogue';
import { renderContracts } from '../../src/ui/contracts';
import { renderMachine } from '../../src/ui/machine';
import { findSpec } from '../../src/engine/machines';
import { act, buyStartingKit, newGame, nextDay, placeEquipment, testJoiner, withAir } from '../helpers';

/** A company in the 800 m² unit with the day one kit, its rear rows clear enough for two lines. */
function bigUnit(): GameState {
  let state = newGame({ difficulty: 'veryEasy' });
  state.cash = 9000000;
  state = nextDay(act(state, { type: 'EXTEND_UNIT' }));
  state = nextDay(act(state, { type: 'EXTEND_UNIT', stage: 'second' }));
  state = withAir(buyStartingKit(state), 'industrial');
  state.cash = 25000000;
  state.reputation = 40;
  state.enquiries = [];
  placeEquipment(state, 'timberRack', { variantId: 'standard', x: 36, y: 0, id: 'kit-timber-rack' });
  // And a glass rack beside it for the lines' glass (CLAUDE.md T32 2.1).
  placeEquipment(state, 'glassRack', { variantId: 'standard', x: 33, y: 0, id: 'kit-glass-rack' });
  // The day one rack and bench out of the rows the second line and its ground take.
  for (const item of state.equipment) {
    if (item.specId === 'sheetRack') [item.anchorX, item.anchorY] = [11, 2];
    if (item.specId === 'workbench') [item.anchorX, item.anchorY] = [14, 3];
  }
  return state;
}

function engineer(id: string): Worker {
  return { ...testJoiner(id, id), role: 'lineEngineer', tier: null, rate: 0, monthlyWage: 15000 };
}

/** A whole line standing with module 1 at this cell, under this number, and a batch of boards and
 *  glass put on the stores for it. Flipped in v96: the company's stock, on the counters of their
 *  kinds, and no line's own (CLAUDE.md T32 2.2, 2.5). */
function withLine(state: GameState, line: number, at: { x: number; y: number }): GameState {
  LINE_MODULES.forEach((id, index) =>
    placeEquipment(state, id, { x: at.x + 6 * index, y: at.y, id: `kit-line-${line}-${index + 1}` }),
  );
  for (const item of state.equipment) {
    if (item.id.startsWith(`kit-line-${line}-`)) item.line = line;
  }
  // Its record written, as the open of a working day writes it for every line that stands.
  lineState(state, line);
  state.stock.boards += 40;
  state.stock.glass += 20;
  return state;
}

/** Two lines standing one behind the other in the 800 m² hall, with this many engineers. */
function twoLines(engineers = 4): GameState {
  const state = withLine(withLine(bigUnit(), 1, WINDOW_LINE_ORIGIN), 2, { x: 2, y: 7 });
  for (let n = 1; n <= engineers; n += 1) state.workers.push(engineer(`eng-${n}`));
  return state;
}

/** A contract running on this line from this minute. */
function running(state: GameState, line: number): GameState {
  lineState(state, line).contract = {
    status: 'active',
    startDay: state.clock.day,
    windowsThisWeek: 0,
    weekStartDay: state.clock.day,
    windowsMade: 0,
    revenue: 0,
    materialCost: 0,
    boardsReserved: 0,
    glassReserved: 0,
  };
  return state;
}

/** Plays minutes of the clock, answering every card with its first choice. */
function play(state: GameState, minutes: number): GameState {
  let next = state;
  let left = minutes;
  let guard = 0;
  while (left > 0 && guard < 400) {
    guard += 1;
    if (next.activeEvent !== null) {
      next = applyAction(next, { type: 'RESOLVE_EVENT', choiceId: next.activeEvent.choices[0]?.id ?? 'ok' });
      continue;
    }
    const result = runMinutes(next, left);
    next = result.state;
    left -= result.minutesRun;
    if (result.minutesRun === 0 && next.activeEvent === null) break;
  }
  return next;
}

function page(html: string): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  return holder;
}

describe('buying the next line (PIOTR, 12.10)', () => {
  it('is bought as the first was, for the same ten million, under the next number, seven metres behind the first', () => {
    const state = withLine(bigUnit(), 1, WINDOW_LINE_ORIGIN);
    expect(canBuy(state, 'windowLine1')).toEqual({ ok: true, reason: '' });
    expect(lineSite(state, 'window')).toEqual({ x: 2, y: 7 });
    const cash = state.cash;
    expect(placeEquipmentOrder(state, 'windowLine1').ok).toBe(true);
    expect(state.cash).toBe(cash - LINE_PRICE);
    expect(state.ledger.at(-1)?.label).toBe('Window production line, line 2, ordered');
    const orders = state.onOrder.filter((item) => LINE_MODULES.includes(item.specId));
    expect(orders.map((item) => [item.line, item.anchorX, item.anchorY])).toEqual(LINE_MODULES.map((_, index) => [2, 2 + 6 * index, 7]));
    expect(lineNumbers(state)).toEqual([1, 2]);
    expect(state.windowLines.map((record) => record.number)).toEqual([1, 2]);
    // A third has nowhere to stand in this hall.
    expect(canBuy(state, 'windowLine1')).toEqual({ ok: false, reason: lineNoRoom('window') });
  });

  it('never gives a number twice: a line sold and gone leaves its number, and the next takes the one after', () => {
    const state = running(twoLines(), 1);
    expect(nextLineNumber(state)).toBe(3);
    expect(sellMachine(state, 'kit-line-2-4').ok).toBe(true);
    state.equipment = state.equipment.filter((item) => lineOf(item) !== 2);
    expect(lineNumbers(state)).toEqual([1]);
    // Line 2 never ran a day: its record is unused, and the next line is still line 3 only when a
    // record stood; here it is 2 again.
    expect(nextLineNumber(state)).toBe(2);
    lineState(state, 2).since.firstDay = state.clock.day;
    expect(nextLineNumber(state)).toBe(3);
  });

  it('stands with its own lane two metres in front of its engineers metre, and claims the metre behind it', () => {
    const state = twoLines();
    expect(lineLanes(state)).toEqual([
      { line: 1, front: { x: 0, y: 18, width: 38, depth: 2 }, left: { x: 0, y: 10, width: 2, depth: 10 } },
      { line: 2, front: { x: 0, y: 11, width: 38, depth: 2 }, left: { x: 0, y: 10, width: 2, depth: 3 } },
    ]);
    const kinds = claimedGround(state).filter((ground) => ground.line === 2).map((ground) => [ground.kind, ground.box.y, ground.box.depth]);
    expect(kinds).toEqual([
      ['lane', 11, 2],
      ['lane', 10, 3],
      ['path', 10, 1],
      ['behind', 6, 1],
    ]);
    expect(canPlaceSpec(state, 'sheetRack', 20, 11, null)).toEqual({ ok: false, reason: "That is the forklift's lane" });
    expect(canPlaceSpec(state, 'toolCabinet', 20, 10, null)).toEqual({ ok: false, reason: "That is the engineers' path" });
    expect(canPlaceSpec(state, 'toolCabinet', 20, 6, null)).toEqual({ ok: false, reason: 'That is the metre behind the line' });
    expect(canPlaceSpec(state, 'toolCabinet', 20, 13, null)).toEqual({ ok: false, reason: 'That is the metre behind the line' });
    // The hall draws both lanes, each marked with its line.
    const lanes = Array.from(page(renderHall(state)).querySelectorAll('[data-lane]')).map((node) => node.getAttribute('data-lane'));
    expect(lanes).toEqual(['1', '2']);
  });

  it('is moved on its own, never into the other line s way', () => {
    const state = { ...twoLines(), speed: 0 } as GameState;
    expect(canPlace(state, 'kit-line-2-3', 14, 6)).toEqual({ ok: true, reason: '' });
    // Onto line 1's metre behind: in its way.
    expect(canPlace(state, 'kit-line-2-3', 14, 8)).toEqual({ ok: false, reason: "That is in another line's way" });
    const moved = act(state, { type: 'MOVE_ITEM', itemId: 'kit-line-2-3', x: 14, y: 6 });
    expect(moved.equipment.filter((item) => lineOf(item) === 2).map((item) => item.anchorY)).toEqual([6, 6, 6, 6, 6, 6]);
    expect(moved.equipment.filter((item) => lineOf(item) === 1).map((item) => item.anchorY)).toEqual([14, 14, 14, 14, 14, 14]);
  });
});

describe('the engineers, line 1 first (PIOTR, 12.10)', () => {
  it('shares the engineers on duty out two to a line in order, so line 2 runs once line 1 has its two', () => {
    expect(lineEngineersOnDuty(twoLines(1), 1)).toBe(1);
    expect(lineEngineersOnDuty(twoLines(1), 2)).toBe(0);
    const three = twoLines(3);
    expect(lineLevel(three, 1)).toBe(6);
    expect(lineLevel(three, 2)).toBe(3);
    expect(warnings(three).find((warning) => warning.key === 'lineNeedsEngineer')?.text).toBe('Line 2 runs as three modules: one engineer on duty');
    const four = twoLines(4);
    expect(lineLevel(four, 1)).toBe(6);
    expect(lineLevel(four, 2)).toBe(6);
    expect(warnings(four).some((warning) => warning.key === 'lineNeedsEngineer')).toBe(false);
    expect(warnings(twoLines(2)).find((warning) => warning.key === 'lineNeedsEngineer')?.text).toBe('Line 2 stands still: no engineer on duty');
  });

  it('lets two be hired for every line, and says so when they are all on the books', () => {
    expect(lineEngineersWanted(twoLines(0))).toBe(4);
    expect(engineersKeepLine(twoLines(0))).toBe('Four engineers keep the two lines');
    expect(engineersKeepLine(withLine(bigUnit(), 1, WINDOW_LINE_ORIGIN))).toBe('Two engineers keep the whole line');
    const option = (state: GameState) => hiringOptions(state).find((entry) => entry.role === 'lineEngineer');
    expect(option(twoLines(3))?.blockReason).toBe('');
    expect(option(twoLines(4))?.blockReason).toBe('Four engineers keep the two lines');
  });

  it('gives the jobs the first line that stands and is not on its contract', () => {
    const state = twoLines(4);
    expect(jobsLine(state)).toBe(1);
    running(state, 1);
    expect(jobsLine(state)).toBe(2);
    running(state, 2);
    expect(jobsLine(state)).toBeNull();
  });
});

describe('each line s own contract, material, pallet and forklift', () => {
  it('is offered one card a line, each carrying its line, answered on its own', () => {
    const seen: GameEvent[] = [];
    const morning = nextDay(twoLines(4), seen);
    const cards = seen.filter((event) => event.kind === 'lineContractOffered');
    expect(cards.map((card) => [card.title, card.data.line])).toEqual([
      ['Windows off line 1', 1],
      ['Windows off line 2', 2],
    ]);
    expect(cards[1]?.body).toContain('every window line 2 makes');
    // Answered as the player would: the first card taken, the second put off.
    expect(lineState(morning, 1).contract?.status).toBe('active');
    expect(lineState(morning, 2).contract?.status).toBe('active');
    const state = twoLines(4);
    const offered = { status: 'offered' as const, startDay: 1, windowsThisWeek: 0, weekStartDay: 1, windowsMade: 0, revenue: 0, materialCost: 0 };
    lineState(state, 1).contract = { ...offered, boardsReserved: 0, glassReserved: 0 };
    lineState(state, 2).contract = { ...offered, boardsReserved: 0, glassReserved: 0 };
    answerLineOffer(state, 2, 'notNow');
    expect(lineState(state, 1).contract?.status).toBe('offered');
    expect(lineState(state, 2).contract).toBeNull();
  });

  it('makes windows on each line on its own contract, books them to its own name, and stacks its own pallet', () => {
    const state = running(running(twoLines(4), 1), 2);
    const played = play(state, 240);
    // Four each in four hours from v97 (an hour a window).
    expect(lineState(played, 1).contract?.windowsMade).toBe(4);
    expect(lineState(played, 2).contract?.windowsMade).toBe(4);
    expect(lineState(played, 1).onPallet).toBe(4);
    expect(lineState(played, 2).onPallet).toBe(4);
    const labels = played.ledger.filter((entry) => entry.category === 'contract').map((entry) => entry.label);
    expect(labels).toContain('Windows off line 1: windows');
    expect(labels).toContain('Windows off line 2: windows');
    // With only three engineers line 2 runs as three modules and makes nothing.
    const short = running(running(twoLines(3), 1), 2);
    const playedShort = play(short, 240);
    expect(lineState(playedShort, 1).contract?.windowsMade).toBe(4);
    expect(lineState(playedShort, 2).contract?.windowsMade).toBe(0);
  });

  it('holds its own week of the one store s boards and glass, line 1 first, each contract on its own', () => {
    // Flipped in v96: no line orders for itself; each running contract holds its week from the free
    // stock, in the order of the lines (CLAUDE.md T32 2.5).
    const state = running(running(twoLines(4), 1), 2);
    // A week is forty windows from v97: line 1 holds eighty boards and forty units, line 2 the rest.
    state.stock.boards = 100;
    state.stock.glass = 50;
    reserveEveryLinesMaterial(state);
    expect([lineState(state, 1).contract?.boardsReserved, lineState(state, 1).contract?.glassReserved]).toEqual([80, 40]);
    expect([lineState(state, 2).contract?.boardsReserved, lineState(state, 2).contract?.glassReserved]).toEqual([20, 10]);
    expect(reservedFor(state, 'boards')).toBe(100);
    expect(freeFor(state, 'glass')).toBe(0);
    // Line 2's contract ended, what it held is free again and line 1's hold is as it was.
    endLineContract(state, 2);
    expect(freeFor(state, 'boards')).toBe(20);
    expect(freeFor(state, 'glass')).toBe(10);
    expect(lineState(state, 1).contract?.boardsReserved).toBe(80);
  });

  it('ends one line s contract at its own End it and shows one block a line on the Contracts tab', () => {
    const state = running(running(twoLines(4), 1), 2);
    const tab = page(renderContracts(state));
    expect(Array.from(tab.querySelectorAll('[data-line-contract]')).map((node) => node.getAttribute('data-line-contract'))).toEqual(['1', '2']);
    expect(tab.querySelector('[data-line-contract="2"] h3')?.textContent).toBe('Windows off line 2');
    expect(tab.querySelector('[data-line-contract="2"] [data-do="endLineContract"]')?.getAttribute('data-line')).toBe('2');
    // Flipped in v96: no order buttons; each block reads what its own contract holds (CLAUDE.md T32
    // 2.5).
    expect(tab.querySelector('[data-line-contract="2"] [data-do="orderLineTimber"]')).toBeNull();
    expect(tab.querySelector('[data-line-contract="2"]')?.textContent).toContain('Timber held');
    const ended = act(state, { type: 'END_LINE_CONTRACT', line: 2 });
    expect(runningLineContract(ended, 1)).not.toBeNull();
    expect(runningLineContract(ended, 2)).toBeNull();
    endLineContract(state, 1);
    expect(runningLineContract(state, 1)).toBeNull();
  });

  it('has a forklift a line, each waiting at its own line s end and driving to the pallets at the gate', () => {
    const state = twoLines(4);
    expect(forkliftPoints(state, 1)).toMatchObject({ wait: { x: 37, y: 19 }, corner: { x: 1, y: 19 }, drop: { x: 1, y: 11.725 } });
    expect(forkliftPoints(state, 2)).toMatchObject({ wait: { x: 37, y: 12 }, corner: { x: 1, y: 12 }, drop: { x: 1, y: 11.725 } });
    const trucks = Array.from(page(renderHall(state)).querySelectorAll('[data-forklift]')).map((node) => node.getAttribute('data-forklift-line'));
    expect(trucks.sort()).toEqual(['1', '2']);
    lineState(state, 1).palletsAtGate = 1;
    lineState(state, 2).palletsAtGate = 2;
    expect(palletsAtTheGate(state)).toBe(3);
    expect(page(renderHall(state)).querySelectorAll('[data-line-pallet]')).toHaveLength(2);
  });
});

describe('each line sold on its own (PIOTR, 12.10)', () => {
  it('sells one line from any of its modules, for half of what its six cost, and leaves the other running', () => {
    const state = running(running(twoLines(4), 1), 2);
    reserveEveryLinesMaterial(state);
    const boards = state.stock.boards;
    const spec = findSpec('windowLine3');
    const module = state.equipment.find((item) => item.id === 'kit-line-2-3');
    if (spec === null || module === undefined) throw new Error('module 3 of line 2 stands');
    const tile = page(ownedTile(state, module, spec, null));
    expect(tile.querySelector('.tile-name')?.textContent).toContain('Line 2, module 3');
    expect(tile.querySelector('[data-do="sellMachine"]')?.textContent).toBe('Sell line 2 for £5,000,000');
    expect(itemName(module)).toBe('Line 2, module 3');
    expect(sellMachine(state, 'kit-line-2-3').ok).toBe(true);
    expect(lineItems(state, 2).every((item) => item.soldOnDay !== null)).toBe(true);
    expect(lineItems(state, 1).every((item) => item.soldOnDay === null)).toBe(true);
    expect(runningLineContract(state, 1)).not.toBeNull();
    expect(runningLineContract(state, 2)).toBeNull();
    // Flipped in v96: nothing written off and nothing taken off the counter; what line 2 held is free
    // again, and line 1 holds what it held (CLAUDE.md T32 2.5).
    expect(state.stock.boards).toBe(boards);
    // Eighty from v97: the week's forty windows at two boards each.
    expect(lineState(state, 1).contract?.boardsReserved).toBe(80);
    expect(reservedFor(state, 'boards')).toBe(80);
    expect(freeFor(state, 'boards')).toBe(boards - 80);
    expect(state.ledger.some((entry) => entry.label.startsWith('Material written off'))).toBe(false);
    const seen: GameEvent[] = [];
    const morning = nextDay(state, seen);
    expect(seen.find((event) => event.kind === 'machineCollected')?.title).toBe('Window production line, line 2 collected');
    expect(standingLines(morning)).toEqual([1]);
    expect(morning.ledger.some((entry) => entry.label === 'Sold: Window production line, line 2' && entry.amount === 5000000)).toBe(true);
  });
});

describe('the upgrades and the books, a line each', () => {
  it('offers each upgrade for each line on its card, and buys it for the one line', () => {
    const state = twoLines(4);
    const folder = page(renderMachine(state, 'windowLine1'));
    const buttons = Array.from(folder.querySelectorAll('[data-upgrade="lineTooling"] [data-do="buyLineUpgrade"]'));
    expect(buttons.map((node) => [node.getAttribute('data-line'), node.textContent])).toEqual([
      ['1', 'Buy for line 1'],
      ['2', 'Buy for line 2'],
    ]);
    const bought = act(state, { type: 'BUY_LINE_UPGRADE', line: 2, upgradeId: 'lineTooling' });
    expect(lineState(bought, 2).upgrades.map((upgrade) => upgrade.id)).toEqual(['lineTooling']);
    expect(lineState(bought, 1).upgrades).toEqual([]);
    expect(bought.ledger.at(-1)?.label).toBe('Line 2 upgrade: Diamond tooling');
    // The line's own card says it is owned twice, and offers another.
    expect(folder.querySelector('[data-line="1"] .badge-owned')?.textContent).toBe('Owned 2');
    // No room for a third in this hall: the button is locked, and still says another.
    const another = folder.querySelector('[data-line="1"] .tile-action button');
    expect(another?.textContent).toBe('Buy another');
    expect(another?.getAttribute('title')).toBe(lineNoRoom('window'));
  });

  it('keeps one day book a line, shows a block a line and all the lines added up on the tab', () => {
    const state = running(running(twoLines(4), 1), 2);
    const played = play(nextDay(state), 480);
    expect(linesWithBooks(played)).toEqual([1, 2]);
    const one = lineBooks(played, 1);
    const two = lineBooks(played, 2);
    const all = allLinesBooks(played);
    expect(one.today.windows).toBeGreaterThan(0);
    expect(all.today.windows).toBe(one.today.windows + two.today.windows);
    expect(all.today.turnover).toBe(one.today.turnover + two.today.turnover);
    expect(all.today.engineers).toBeCloseTo(one.today.engineers + two.today.engineers, 6);
    // Each line pays for its own pair of engineers.
    expect(one.today.engineers).toBeCloseTo(2 * 15000 / 30, 6);
    expect(two.today.engineers).toBeCloseTo(2 * 15000 / 30, 6);
    const tab = page(renderAccounting(played, 'line'));
    expect(Array.from(tab.querySelectorAll('[data-line-books]')).map((node) => node.getAttribute('data-line-books'))).toEqual(['1', '2', 'all']);
    expect(tab.querySelector('[data-line-books="2"] h3')?.textContent).toBe('Line 2');
    expect(tab.querySelector('[data-line-books="all"] h3')?.textContent).toBe('All lines');
  });
});

describe('a v44 save in this build (v93 section 4)', () => {
  it('opens with its line as line 1, its modules carrying the number, its record first of the list, and its material on the counters', () => {
    const state = running(withLine(bigUnit(), 1, WINDOW_LINE_ORIGIN), 1);
    state.workers.push(engineer('eng-1'), engineer('eng-2'));
    const raw = JSON.parse(JSON.stringify(state)) as Record<string, unknown> & {
      windowLines: Record<string, unknown>[];
      equipment: Record<string, unknown>[];
      deliveries: Record<string, unknown>[];
      stock: Record<string, unknown>;
    };
    raw.version = 44;
    // The save of v92 as it was: one counter of sheets and boards, the line's own forty boards and
    // its glass for twenty windows, and a batch of its timber on the road (CLAUDE.md T31 2.1, 2.2).
    // Flipped in v96: built by hand, the line's own orders being gone (CLAUDE.md T32 section 4).
    const sheets = Number(raw.stock.sheets);
    raw.stock = { sheets: sheets + 40, tempStorageSheets: 0 };
    const record: Record<string, unknown> = { ...(raw.windowLines[0] ?? {}), boards: 40, glass: 20, glassOnTheWay: [] };
    delete record.number;
    const contract = record.contract as Record<string, unknown>;
    delete contract.boardsReserved;
    delete contract.glassReserved;
    raw.windowLine = record;
    delete (raw as { windowLines?: unknown }).windowLines;
    for (const item of raw.equipment) delete item.line;
    raw.deliveries = [
      {
        id: 'del-line',
        jobId: null,
        sheets: 40,
        orderedDay: state.clock.day,
        pricePaid: 8000,
        arriveDay: state.clock.day + 1,
        arrived: false,
        unloaded: false,
        bespoke: false,
        overflowSheets: 0,
        boards: true,
        line: true,
      },
    ];
    const opened = migrateState(raw, 44);
    if (opened === null) throw new Error('the save opens');
    // Flipped in v96: STATE_VERSION 48 (CLAUDE.md T32 section 4); 52 from v111, 53 from v113.
    expect(opened.version).toBe(53);
    expect(opened.windowLines.map((record) => record.number)).toEqual([1]);
    expect(opened.windowLines[0]?.contract?.status).toBe('active');
    // Flipped in v96: the line's forty boards and twenty glass units are free stock on the counters,
    // and its load on the road a load of boards for stock (CLAUDE.md T32 section 4).
    expect(opened.windowLines[0]).not.toHaveProperty('boards');
    expect(opened.stock).toMatchObject({ sheets, boards: 40, glass: 20 });
    expect(opened.equipment.filter((item) => LINE_MODULES.includes(item.specId)).map((item) => item.line)).toEqual([1, 1, 1, 1, 1, 1]);
    expect(opened.deliveries.map((delivery) => [delivery.material, delivery.jobId, delivery.sheets])).toEqual([['boards', null, 40]]);
    expect(opened.deliveries[0]).not.toHaveProperty('line');
    expect(runningLineContract(opened, 1)).not.toBeNull();
    expect(lineLevel(opened, 1)).toBe(6);
  });

  it('opens a save that never had a line with no record of one', () => {
    const raw = JSON.parse(JSON.stringify(bigUnit())) as Record<string, unknown>;
    raw.version = 44;
    raw.windowLine = { contract: null, nextOfferDay: null, minutes: 0, onPallet: 0, palletsAtGate: 0, upgrades: [], boards: 0, glass: 0, glassOnTheWay: [] };
    delete raw.windowLines;
    const opened = migrateState(raw, 44);
    expect(opened?.windowLines).toEqual([]);
    expect(opened === null ? null : canBuy(opened, 'windowLine1')).toEqual({ ok: true, reason: '' });
  });
});
