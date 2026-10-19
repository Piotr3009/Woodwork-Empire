/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// @vitest-environment jsdom
// Turn 29, 2.8 to 2.10: the production line [PIOTR, 04.10: "a production line through the whole
// hall, no spraying, in five stages from 1.5 million to 5 million; it is extended, not replaced";
// 05.10: "work it out and propose"], its engineers, and what it costs to own (CLAUDE.md T29 2.8,
// 2.9, 2.10, section 7). Flipped in v89 to the line of Turn 30: six modules bought and sold whole
// for 10 million, spraying and glazing [PIOTR, 10.10 and 11.10: "one whole", "the whole cost 10
// million"] (CLAUDE.md T30 2.3, 2.5). Every figure is [TUNE: chat] unless Piotr's.

import { describe, expect, it } from 'vitest';
import {
  BUILT_TO_ORDER,
  CNC5_STAGE_FACTOR,
  DUST_OUTPUT_M3_PER_HOUR,
  EXTRACTION_DEMAND,
  LINE_BOARD_SAVING,
  LINE_FACTOR,
  LINE_MODULES,
  LINE_MODULE_SHARES,
  LINE_PRICE,
  MACHINE_CAPACITY,
  MACHINE_SHORT_WORDS,
  TIMBER_FAMILIES,
} from '../../src/engine/constants';
import type { GameEvent, GameState, StagedJob, Worker } from '../../src/engine/index';
import { lockReasonFor, template } from '../../src/engine/catalog';
import { buyEquipment, cancelOrder, canBuy, canSell, placeEquipmentOrder, sellMachine } from '../../src/engine/game';
import { insuredValue, propertyPremiumYearly } from '../../src/engine/insurance';
import { stagedJob } from '../../src/engine/jobs';
import { canPlace, lineFits, lineNoRoom } from '../../src/engine/layout';
import {
  findSpec,
  hallPace,
  hallPlaces,
  insuranceForClass,
  isServiced,
  lineLevel,
  lineModules,
  lineSalePrice,
  machineSavings,
  outputBreakdown,
  overdueBreakdownChance,
  paceLines,
  placeShortages,
  salePriceFor,
} from '../../src/engine/machines';
import { boardsForJob } from '../../src/engine/materials';
import { burglaryTargets, securitySubscriptionMonthly } from '../../src/engine/security';
import { hiringOptions } from '../../src/engine/staff';
import { stagePlanFor } from '../../src/engine/stages';
import { tradeUsage } from '../../src/engine/usage';
import { WARNING_ORDER, warnings } from '../../src/engine/warnings';
import { catalogueTabFrom, renderCatalogue } from '../../src/ui/catalogue';
import { machinesInTheHall } from '../../src/ui/machinesPage';
import { workerDoing } from '../../src/ui/personCard';
import { formulaLine } from '../../src/ui/security';
import { renderHall } from '../../src/render/hall';
import { renderBoard } from '../../src/ui/board';
import { SECURITY_LEVELS, unitCostFactor } from '../../src/engine/constants';
import { formatCalendarDay, formatMoney } from '../../src/engine/index';
import {
  act,
  acceptNow,
  buyStartingKit,
  newGame,
  nextDay,
  placeEnquiry,
  placeEquipment,
  testJoiner,
  withAir,
  placeGlassRack,
} from '../helpers';
import { lineState } from '../../src/engine/lineContract';

const PRICES = [2000000, 2500000, 1250000, 1250000, 1500000, 1500000];

/** A company in the 800 m2 unit with the day one kit, air enough for a CNC, and the timber
 *  machines of Turn 28 at their standard class but what is named, all off the line's cells. */
function bigUnit(without: string[] = []): GameState {
  let state = newGame({ difficulty: 'veryEasy' });
  state.cash = 9000000;
  state = nextDay(act(state, { type: 'EXTEND_UNIT' }));
  state = nextDay(act(state, { type: 'EXTEND_UNIT', stage: 'second' }));
  state = withAir(buyStartingKit(state), 'industrial');
  // Enough for the whole line of ten million from v89 (CLAUDE.md T30 2.3.1).
  state.cash = 12000000;
  state.reputation = 40;
  state.enquiries = [];
  const kit: Array<[string, number, number]> = [
    ['crossCut', 20, 2],
    ['planer', 26, 2],
    ['spindleMoulder', 32, 2],
    ['sander', 20, 6],
    ['framePress', 26, 6],
    ['sprayBooth', 32, 6],
    ['cnc5', 20, 9],
    ['cuttersSash', 0, 0],
    ['cuttersCasement', 0, 0],
    ['cuttersDoor', 0, 0],
    ['timberShelter', 40, 1],
  ];
  for (const [id, x, y] of kit) {
    if (without.includes(id)) continue;
    placeEquipment(state, id, { variantId: 'standard', x, y, id: `kit-${id}` });
  }
  // And a glass rack, which a window asks for from Turn 32 (CLAUDE.md T32 2.1).
  if (!without.includes('glassRack')) placeGlassRack(state);
  return state;
}

/** Modules 1 to N standing on the line's own cells from (2, 14): six of them are the line bought
 *  whole, and fewer a line the engine is asked about at a level it is written for all the same. */
function withLine(state: GameState, count: number, skip: number[] = []): GameState {
  for (let n = 1; n <= count; n += 1) {
    if (skip.includes(n)) continue;
    placeEquipment(state, `windowLine${n}`, { x: 2 + 6 * (n - 1), y: 14, id: `kit-line-${n}` });
  }
  return state;
}

function engineer(id: string, name: string): Worker {
  return { ...testJoiner(id, name), role: 'lineEngineer', tier: null, rate: 0, monthlyWage: 15000 };
}

function withEngineers(state: GameState, count: number): GameState {
  for (let n = 1; n <= count; n += 1) state.workers.push(engineer(`eng-${n}`, `Engineer ${n}`));
  return state;
}

function windowJob(): StagedJob {
  return stagedJob(100, 'solidWood', false, 'lacquer', false, true);
}

function planOf(state: GameState): Record<string, { family: string | null; speed: number }> {
  const plan: Record<string, { family: string | null; speed: number }> = {};
  for (const stage of stagePlanFor(state, windowJob())) plan[stage.id] = { family: stage.family, speed: stage.speed };
  return plan;
}

describe('the six modules of the line (CLAUDE.md T30 2.3.1, 2.3.7)', () => {
  it('are six families of one class each, at their shares of the ten million, a month on order, sixty a day', () => {
    expect([...LINE_MODULES]).toEqual(['windowLine1', 'windowLine2', 'windowLine3', 'windowLine4', 'windowLine5', 'windowLine6']);
    let soFar = 0;
    LINE_MODULES.forEach((id, index) => {
      const spec = findSpec(id);
      const n = index + 1;
      expect(spec, id).toMatchObject({
        name: `Window line, module ${n}`,
        // The window line's folder by its name, so the door line's reads apart from it (flipped in
        // v107).
        folder: 'Window production line',
        tab: 'line',
        category: 'machine',
        price: PRICES[index],
        deliveryDays: 30,
        width: 6,
        depth: 3,
        height: 3,
        zoneWidth: 6,
        zoneDepth: 3,
        minUnitM2: 800,
        requires: [],
      });
      expect(spec?.variants.map((variant) => variant.id), id).toEqual(['standard']);
      expect(spec?.variants[0]?.powerPerDay, id).toBe(60);
      expect(spec?.variants[0]?.height, id).toBe(3);
      expect(MACHINE_SHORT_WORDS[id], id).toBe('line module');
      expect(TIMBER_FAMILIES, id).toContain(id);
      expect(DUST_OUTPUT_M3_PER_HOUR[id], id).toBe(0);
      expect(EXTRACTION_DEMAND[id], id).toBeUndefined();
      expect(BUILT_TO_ORDER, id).toContain(id);
      expect(MACHINE_CAPACITY[id], id).toEqual({ standard: 33 });
      soFar += spec?.price ?? 0;
    });
    // The whole line is the ten million, written as the sum of the shares.
    expect(soFar).toBe(10000000);
    expect(LINE_PRICE).toBe(10000000);
    expect(Object.values(LINE_MODULE_SHARES).reduce((total, share) => total + share, 0)).toBe(LINE_PRICE);
    // Module 1 is drawn with its saw now, and says so (CLAUDE.md T30 2.3.1).
    expect(findSpec('windowLine1')?.variants[0]?.description).toContain('cross cut saw');
  });

  it('is refused in its order: the unit, the cash, the half shifted kit, then a clear 36 m by 3 m with its ground', () => {
    const small = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    small.cash = 12000000;
    expect(canBuy(small, 'windowLine1')).toEqual({ ok: false, reason: 'Needs the 800 m² unit' });
    for (const id of LINE_MODULES.slice(1)) expect(canBuy(small, id), id).toEqual({ ok: false, reason: 'It comes with the line' });
    // Nothing beside it is asked: no five axis CNC and no press (CLAUDE.md T30 2.3.2).
    expect(canBuy(bigUnit(['cnc5', 'framePress']), 'windowLine1')).toEqual({ ok: true, reason: '' });
    const state = bigUnit();
    for (const id of LINE_MODULES.slice(1)) expect(canBuy(state, id), id).toEqual({ ok: false, reason: 'It comes with the line' });
    expect(placeEquipmentOrder(state, 'windowLine1').ok).toBe(true);
    // A second line is bought as the first was, for the same price, wherever the hall has seven
    // metres for it (PIOTR, 12.10; v93): this hall has none behind the first, its kit in the way.
    state.cash = 12000000;
    expect(canBuy(state, 'windowLine1')).toEqual({ ok: false, reason: lineNoRoom('window') });
    const poor = bigUnit();
    poor.cash = 1000;
    expect(canBuy(poor, 'windowLine1')).toEqual({ ok: false, reason: 'Not enough cash' });
    const shifted = bigUnit();
    shifted.movedItems = [{ itemId: 'kit-planer', fromX: 26, fromY: 2, fromOrientation: 0 }];
    expect(canBuy(shifted, 'windowLine1')).toEqual({ ok: false, reason: 'The kit is half shifted. Finish the move first' });
    // A planer in every row of the middle of the hall: no 36 m by 3 m is clear anywhere.
    const full = bigUnit();
    for (let y = 0; y < full.unit.depthCells; y += 1) {
      placeEquipment(full, 'planer', { variantId: 'standard', x: 18, y, id: `kit-wall-${y}` });
    }
    // From Turn 31 the line's lane is asked with it (CLAUDE.md T31 2.6).
    expect(canBuy(full, 'windowLine1')).toEqual({ ok: false, reason: lineNoRoom('window') });
    // And in that order when more than one fails.
    const poorAndSmall = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    poorAndSmall.cash = 1000;
    expect(canBuy(poorAndSmall, 'windowLine1')).toEqual({ ok: false, reason: 'Needs the 800 m² unit' });
    const heldAndPoor = bigUnit();
    expect(placeEquipmentOrder(heldAndPoor, 'windowLine1').ok).toBe(true);
    heldAndPoor.cash = 1000;
    expect(canBuy(heldAndPoor, 'windowLine1')).toEqual({ ok: false, reason: 'Not enough cash' });
    const poorAndShifted = bigUnit();
    poorAndShifted.cash = 1000;
    poorAndShifted.movedItems = [{ itemId: 'kit-planer', fromX: 26, fromY: 2, fromOrientation: 0 }];
    expect(canBuy(poorAndShifted, 'windowLine1')).toEqual({ ok: false, reason: 'Not enough cash' });
    full.movedItems = [{ itemId: 'kit-planer', fromX: 26, fromY: 2, fromOrientation: 0 }];
    expect(canBuy(full, 'windowLine1')).toEqual({ ok: false, reason: 'The kit is half shifted. Finish the move first' });
  });

  it('takes the first clear 36 m by 3 m from x 2, y 14, and names nothing that stands on its first place', () => {
    // From Turn 31 a place wants its lane clear too, and from v93 the seven metres of its ground,
    // so this hall leaves the five axis CNC and the booth out to have a second place for the line
    // (CLAUDE.md T31 2.6).
    const state = bigUnit(['cnc5', 'sprayBooth']);
    placeEquipment(state, 'planer', { variantId: 'standard', x: 5, y: 16, id: 'kit-planer-2' });
    expect(canBuy(state, 'windowLine1')).toEqual({ ok: true, reason: '' });
    // The first clear run in the order a machine's place is found: row by row from the top, cell by
    // cell along each row, asked of the whole 36 m by 3 m and its lane.
    let expected: { x: number; y: number } | null = null;
    for (let y = 0; y + 3 <= state.unit.depthCells && expected === null; y += 1) {
      for (let x = 0; x + 36 <= state.unit.widthCells; x += 1) {
        if (lineFits(state, { x, y }, 'window', new Set())) {
          expected = { x, y };
          break;
        }
      }
    }
    if (expected === null) throw new Error('the hall has a clear 36 m by 3 m');
    expect(expected).not.toEqual({ x: 2, y: 14 });
    expect(placeEquipmentOrder(state, 'windowLine1').ok).toBe(true);
    const at = expected;
    const orders = state.onOrder.filter((item) => LINE_MODULES.includes(item.specId));
    expect(orders.map((item) => [item.anchorX, item.anchorY])).toEqual(LINE_MODULES.map((_, index) => [at.x + 6 * index, at.y]));
  });

  it('is ordered whole in one click, the cash down once, stands on its cells on one morning, moved only as one and never turned', () => {
    const state = bigUnit();
    const cash = state.cash;
    const ledger = state.ledger.length;
    expect(placeEquipmentOrder(state, 'windowLine1').ok).toBe(true);
    expect(state.cash).toBe(cash - LINE_PRICE);
    const booked = state.ledger.slice(ledger);
    expect(booked.map((entry) => [entry.label, entry.amount])).toEqual([['Window production line, line 1, ordered', -LINE_PRICE]]);
    const orders = state.onOrder.filter((item) => LINE_MODULES.includes(item.specId));
    expect(orders.map((item) => item.specId)).toEqual([...LINE_MODULES]);
    expect(new Set(orders.map((item) => item.dueDay)).size).toBe(1);
    expect(orders.map((item) => item.pricePaid)).toEqual(PRICES);
    expect(orders.map((item) => [item.anchorX, item.anchorY])).toEqual([
      [2, 14],
      [8, 14],
      [14, 14],
      [20, 14],
      [26, 14],
      [32, 14],
    ]);
    // An order for the line, as for a five axis CNC, is not called off.
    const first = orders[0];
    if (first === undefined) throw new Error('module 1 is on order');
    for (const order of orders) {
      expect(cancelOrder(state, order.id)).toEqual({ ok: false, reason: 'Built to order: it cannot be called off' });
    }
    // The outline of one on order is dragged only as the whole line, and never turned (CLAUDE.md
    // T30 2.4; tests/engine/t30Move.test.ts).
    expect(canPlace(state, first.id, 3, 14)).toEqual({ ok: true, reason: '' });
    expect(canPlace(state, first.id, 2, 14, 1)).toEqual({ ok: false, reason: 'The line is never turned' });
    // On its day it stands, built in, with nobody to unload it.
    for (const order of orders) order.dueDay = state.clock.day + 1;
    let next = state;
    while (next.onOrder.some((item) => LINE_MODULES.includes(item.specId))) next = nextDay(next);
    expect(lineModules(next, 1)).toBe(6);
    expect(next.tasks.some((task) => task.kind === 'unload' && !task.done)).toBe(false);
    const module = next.equipment.find((item) => item.specId === 'windowLine3');
    expect(module).toMatchObject({ anchorX: 14, anchorY: 14, orientation: 0, purchasePrice: 1250000 });
    if (module === undefined) throw new Error('module 3 stands');
    expect(canPlace(next, module.id, 15, 14)).toEqual({ ok: true, reason: '' });
    expect(canPlace(next, module.id, 14, 14, 1)).toEqual({ ok: false, reason: 'The line is never turned' });
  });

  it('stands the six at once for the same price when bought on the spot', () => {
    const state = bigUnit();
    const cash = state.cash;
    expect(buyEquipment(state, 'windowLine1').ok).toBe(true);
    expect(state.cash).toBe(cash - LINE_PRICE);
    const modules = state.equipment.filter((item) => LINE_MODULES.includes(item.specId));
    expect(modules.map((item) => [item.specId, item.anchorX, item.anchorY])).toEqual(
      LINE_MODULES.map((id, index) => [id, 2 + 6 * index, 14]),
    );
    expect(lineModules(state, 1)).toBe(6);
    expect(buyEquipment(state, 'windowLine2')).toEqual({ ok: false, reason: 'It comes with the line' });
  });

  it('is sold whole from any module, for half of what the six cost, on one line and one card', () => {
    const state = withLine(bigUnit(), 6);
    expect(canSell(state, 'kit-line-2')).toEqual({ ok: true, reason: '' });
    const third = state.equipment.find((item) => item.id === 'kit-line-3');
    if (third === undefined) throw new Error('module 3 stands');
    expect(salePriceFor(third)).toBe(625000);
    expect(lineSalePrice(state, 1)).toBe(5000000);
    expect(sellMachine(state, 'kit-line-2').ok).toBe(true);
    const sold = state.equipment.filter((item) => LINE_MODULES.includes(item.specId));
    expect(sold).toHaveLength(6);
    for (const item of sold) expect(item.soldOnDay, item.id).not.toBeNull();
    expect(canSell(state, 'kit-line-5')).toEqual({ ok: false, reason: 'Sold, collection tomorrow' });
    const cash = state.cash;
    const events: GameEvent[] = [];
    const next = nextDay(state, events);
    expect(next.equipment.some((item) => LINE_MODULES.includes(item.specId))).toBe(false);
    const lines = next.ledger.filter((entry) => entry.label.startsWith('Sold: '));
    expect(lines.map((entry) => [entry.label, entry.amount])).toEqual([['Sold: Window production line, line 1', 5000000]]);
    expect(next.cash).toBeGreaterThan(cash);
    const cards = [...events, ...(next.activeEvent === null ? [] : [next.activeEvent]), ...next.eventQueue].filter(
      (event) => event.kind === 'machineCollected',
    );
    expect(cards.map((event) => event.title)).toEqual(['Window production line, line 1 collected']);
  });

  it('is refused for sale while a man stands at any of the six', () => {
    const state = withEngineers(withLine(bigUnit(), 6), 2);
    state.workers.push({ ...testJoiner('w-at-3', 'Tom'), working: true, station: 'machine:windowLine3' });
    expect(canSell(state, 'kit-line-1')).toEqual({ ok: false, reason: 'Somebody is standing at it' });
    expect(canSell(state, 'kit-line-6')).toEqual({ ok: false, reason: 'Somebody is standing at it' });
  });
});

describe('how much of the line runs (CLAUDE.md T29 2.9.4, T30 2.3.6)', () => {
  it('is the unbroken run from module 1, kept by its engineers on duty', () => {
    expect(lineModules(withLine(bigUnit(), 4, [3]), 1)).toBe(2);
    const six = withLine(bigUnit(), 6);
    expect(lineModules(six, 1)).toBe(6);
    expect(lineLevel(six, 1)).toBe(0);
    expect(lineLevel(withEngineers(withLine(bigUnit(), 6), 1), 1)).toBe(3);
    expect(lineLevel(withEngineers(withLine(bigUnit(), 6), 2), 1)).toBe(6);
    expect(lineLevel(withEngineers(withLine(bigUnit(), 2), 1), 1)).toBe(2);
    // A man off is not on duty; one who starts tomorrow is not either.
    const off = withEngineers(withLine(bigUnit(), 6), 2);
    const first = off.workers.find((worker) => worker.id === 'eng-1');
    if (first === undefined) throw new Error('the engineer is wanted');
    first.absentDaysRemaining = 2;
    expect(lineLevel(off, 1)).toBe(3);
  });

  it('says on the strip, directly under nobodyAssigned, when modules stand that no engineer keeps', () => {
    expect(WARNING_ORDER.indexOf('lineNeedsEngineer')).toBe(WARNING_ORDER.indexOf('nobodyAssigned') + 1);
    const line = (state: GameState): string | undefined =>
      warnings(state).find((entry) => entry.key === 'lineNeedsEngineer')?.text;
    expect(line(bigUnit())).toBeUndefined();
    expect(line(withLine(bigUnit(), 6))).toBe('Line 1 stands still: no engineer on duty');
    expect(line(withEngineers(withLine(bigUnit(), 6), 1))).toBe('Line 1 runs as three modules: one engineer on duty');
    expect(line(withEngineers(withLine(bigUnit(), 3), 1))).toBeUndefined();
    expect(line(withEngineers(withLine(bigUnit(), 6), 2))).toBeUndefined();
  });
});

describe('what the line does to a window (CLAUDE.md T29 2.9.5, 2.9.6; T30 2.5)', () => {
  it('does each stage on its module from its level, at an industrial machine s pace times the factor', () => {
    const industrial = 1.12;
    for (let level = 1; level <= 6; level += 1) {
      const state = withEngineers(withLine(bigUnit(), level), level > 3 ? 2 : 1);
      expect(lineLevel(state, 1), String(level)).toBe(level);
      const plan = planOf(state);
      const factor = LINE_FACTOR[level] ?? 1;
      expect(plan.crossCutting, `${level}`).toEqual({ family: 'windowLine1', speed: factor * industrial });
      expect(plan.planing?.family, `${level}`).toBe('windowLine1');
      expect(plan.moulding, `${level}`).toEqual(
        level >= 2
          ? { family: 'windowLine2', speed: factor * CNC5_STAGE_FACTOR * industrial }
          : { family: 'cnc5', speed: factor * CNC5_STAGE_FACTOR * hallPace(state, 'cnc5') },
      );
      expect(plan.sanding?.family, `${level}`).toBe(level >= 3 ? 'windowLine3' : 'sander');
      expect(plan.sanding?.speed, `${level}`).toBeCloseTo(factor * (level >= 3 ? industrial : hallPace(state, 'sander')), 10);
      expect(plan.pressing?.family, `${level}`).toBe(level >= 4 ? 'windowLine4' : 'framePress');
      // The Finishing on module 5 from 5, at the factor; below it at the booth and never the
      // factor, as on v88 (CLAUDE.md T30 2.5).
      if (level >= 5) {
        expect(plan.finishing?.family, `${level}`).toBe('windowLine5');
        expect(plan.finishing?.speed, `${level}`).toBeCloseTo(factor * industrial, 10);
      } else {
        expect(plan.finishing, `${level}`).toEqual({ family: 'sprayBooth', speed: hallPace(state, 'sprayBooth') });
      }
      // The Glazing, a timber job's assembly, on module 6 at 6, and at the benches below it, at the
      // factor either way.
      expect(plan.assembly?.family, `${level}`).toBe(level >= 6 ? 'windowLine6' : 'workbench');
      expect(plan.assembly?.speed, `${level}`).toBeCloseTo(factor * (level >= 6 ? industrial : hallPace(state, 'workbench')), 10);
    }
    expect(LINE_FACTOR).toEqual([1, 1.4, 1.6, 1.8, 2.1, 2.4, 2.4]);
  });

  it('goes back to the machines below its level, and a line that stands still is the hall without it', () => {
    const three = withEngineers(withLine(bigUnit(), 6), 1);
    expect(planOf(three).pressing?.family).toBe('framePress');
    expect(planOf(three).finishing?.family).toBe('sprayBooth');
    expect(planOf(withLine(bigUnit(), 6))).toEqual(planOf(bigUnit()));
    // A sheet job is where it is today, family for family, whatever stands, its assembly at the
    // bench among them.
    for (const finish of ['laminate', 'lacquer'] as const) {
      const job = stagedJob(100, 'sheet', false, finish, true, false);
      const plain = stagePlanFor(bigUnit(), job).map((stage) => [stage.id, stage.family, stage.speed]);
      const lined = stagePlanFor(withEngineers(withLine(bigUnit(), 6), 2), job).map((stage) => [stage.id, stage.family, stage.speed]);
      expect(lined, finish).toEqual(plain);
    }
  });

  it('keeps thirty three a module, so no hall is ever short of the line', () => {
    const state = withEngineers(withLine(bigUnit(), 6), 2);
    for (const id of LINE_MODULES) expect(hallPlaces(state, id), id).toBe(33);
    const short = placeShortages(state, 'day', (family) => (LINE_MODULES.includes(family) ? 33 : 0));
    expect(short.filter((entry) => LINE_MODULES.includes(entry.family))).toEqual([]);
  });

  it('stands in on the board for the machines whose stages it does while it stands whole, and never for the booth', () => {
    const sash = template('sashWindows');
    const state = withLine(bigUnit(['crossCut', 'planer', 'spindleMoulder', 'sander', 'framePress', 'cnc5']), 6);
    expect(lockReasonFor(state, sash)).toBeNull();
    // A line short of a module stands in for nothing, in the words the press always had.
    const five = withLine(bigUnit(['framePress']), 5);
    expect(lockReasonFor(five, sash)).toBe('Needs frame press');
    expect(lockReasonFor(withLine(bigUnit(['framePress']), 6), sash)).toBeNull();
    // A window is lacquered, and the booth is always asked, whatever module 5 does (CLAUDE.md T30
    // 2.5).
    const noBooth = withEngineers(withLine(bigUnit(['sprayBooth']), 6), 2);
    expect(lineLevel(noBooth, 1)).toBe(6);
    expect(lockReasonFor(noBooth, sash)).toBe('Needs spray booth');
  });
});

describe('the line on its own contract gives the jobs nothing (CLAUDE.md T30 2.5, 2.6)', () => {
  it('does no stage of a window, gives no factor, stands in for nothing and saves no boards while its contract runs', () => {
    const working = withEngineers(withLine(bigUnit(['crossCut', 'planer']), 6), 2);
    lineState(working, 1).contract = {
      status: 'active',
      startDay: working.clock.day,
      windowsThisWeek: 0,
      weekStartDay: working.clock.day,
      windowsMade: 0,
      revenue: 0,
      materialCost: 0,
      boardsReserved: 0,
      glassReserved: 0,
    };
    expect(lineLevel(working, 1)).toBe(6);
    const plan = planOf(working);
    for (const [id, stage] of Object.entries(plan)) {
      expect(stage.family ?? '', id).not.toMatch(/^windowLine/);
    }
    // The stage at a machine of the hall goes at that machine's pace, with no factor on it.
    expect(plan.sanding?.speed).toBeCloseTo(hallPace(working, 'sander'), 10);
    // The board wants the company's own machines again.
    expect(lockReasonFor(working, template('sashWindows'))).not.toBeNull();
    expect(boardsForJob(working, 5600, true)).toBe(19);
    expect(outputBreakdown(working).lines.find((line) => line.label.startsWith('Line 1'))).toEqual({
      label: 'Line 1, on its contract',
      points: 0,
      hall: false,
      where: 'timber work, the Finishing excepted',
    });
  });
});

describe('the boards the line saves (CLAUDE.md T29 2.9.7, T30 2.5)', () => {
  it('counts three per cent fewer boards a module, eighteen with the line, to the penny before the rounding', () => {
    expect(LINE_BOARD_SAVING).toBe(0.03);
    // Boards of 3,640: nineteen with no line, eighteen with one module, fifteen with the six.
    const cost = 5600;
    expect(boardsForJob(bigUnit(), cost, true)).toBe(19);
    expect(boardsForJob(withLine(bigUnit(), 1), cost, true)).toBe(18);
    expect(boardsForJob(withLine(bigUnit(), 6), cost, true)).toBe(15);
    // Never below one, and a sheet job is not touched.
    expect(boardsForJob(withLine(bigUnit(), 6), 10, true)).toBe(1);
    expect(boardsForJob(withLine(bigUnit(), 6), cost, false)).toBe(boardsForJob(bigUnit(), cost, false));
  });

  it('counts the same boards on the tile and on the job taken, with none, one and six modules', () => {
    for (const [modules, boards] of [
      [0, 19],
      [1, 18],
      [6, 15],
    ] as const) {
      const state = withLine(bigUnit(), modules);
      const enquiry = placeEnquiry(state, {
        templateId: 'sashWindows',
        name: 'Sash windows',
        price: 14000,
        basePrice: 14000,
        finish: 'lacquer',
        materialKind: 'solidWood',
        deadlineDays: 60,
      });
      const tile = document.createElement('div');
      tile.innerHTML = renderBoard(state, '');
      // Flipped in v96: a window's glass units beside its boards (CLAUDE.md T32 2.7).
      expect(tile.querySelector(`[data-enquiry="${enquiry.id}"]`)?.textContent, `${modules}`).toMatch(
        new RegExp(`${boards} boards and \\d+ glass units of material`),
      );
      const taken = acceptNow(state, enquiry.id);
      const job = taken.jobs.find((entry) => entry.templateId === 'sashWindows');
      expect(job?.sheets, `${modules}`).toBe(boards);
    }
  });
});

describe('the line s card and the sheets that list machines (CLAUDE.md T30 2.3.3, 2.5)', () => {
  function folder(state: GameState): HTMLElement {
    const holder = document.createElement('div');
    holder.innerHTML = renderCatalogue(state, '', catalogueTabFrom('line'));
    return holder;
  }
  function card(state: GameState, id = 'windowLine1'): HTMLElement {
    const holder = document.createElement('div');
    holder.innerHTML = renderCatalogue(state, '', catalogueTabFrom('line'), id);
    const tile = holder.querySelector<HTMLElement>('.tile[data-variant]');
    if (tile === null) throw new Error('the line s card is drawn');
    return tile;
  }

  it('is one folder on the tab, from the whole line s price', () => {
    const tab = folder(bigUnit());
    const folders = Array.from(tab.querySelectorAll('.folder')).map((node) => node.getAttribute('data-folder'));
    // The window line's folder, the door line's beside it from v107 and the house factory's from
    // v114 (flipped).
    expect(folders).toEqual(['windowLine1', 'doorLine1', 'houseLine1']);
    expect(tab.textContent).toContain('Window production line');
    expect(tab.textContent).toContain('from £10,000,000');
    expect(tab.textContent).toContain('Makes windows from the board to the pallet: six modules in one line, 36 m long.');
  });

  it('says what each module does and what the line gives, and none of a machine s own lines', () => {
    const state = bigUnit();
    const text = card(state).textContent ?? '';
    expect(card(state).querySelector('.tile-name')?.textContent).toContain('Window production line');
    for (const row of [
      'Module 1: cross cutting and planing',
      'Module 2: moulding',
      'Module 3: sanding',
      'Module 4: pressing',
      'Module 5: the Finishing, sprayed and hung on the overhead rail',
      'Module 6: the Glazing, then wrapped and stacked on a pallet',
      'With two engineers, timber work goes 2.4 times as fast',
      'Sold whole, for half its price; the upgrades go with it',
      '£10,000,000',
      'Delivered in 30 working days',
      'Power £360 a day',
      `Insurance ${formatMoney(insuranceForClass({ price: LINE_PRICE }) * unitCostFactor(state.unit))} a year`,
      'Takes 36 m by 3 m, works in 36 m by 3 m',
    ]) {
      expect(text, row).toContain(row);
    }
    for (const word of ['Output', 'Dust', 'Life', 'busy', 'Finishing excepted']) expect(text, word).not.toContain(word);
    expect(card(state).querySelector('[data-do="buyEquipment"]')?.getAttribute('data-id')).toBe('windowLine1');
    // Every module's family opens on the line's one card.
    expect(card(state, 'windowLine4').textContent).toBe(text);
  });

  it('is locked with the reason under it in a small unit and short of cash', () => {
    const small = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    small.cash = 12000000;
    expect(card(small).querySelector('.lock')?.textContent).toBe('Needs the 800 m² unit');
    const poor = bigUnit();
    poor.cash = 1000;
    expect(card(poor).querySelector('.lock')?.textContent).toBe('Not enough cash');
    expect(card(poor).querySelector('button[disabled]')?.textContent).toBe('Buy');
  });

  it('says when it is due while on order, and that the company has it once it stands', () => {
    const ordered = bigUnit();
    expect(placeEquipmentOrder(ordered, 'windowLine1').ok).toBe(true);
    const due = ordered.onOrder.find((item) => item.specId === 'windowLine1')?.dueDay ?? 0;
    expect(card(ordered).querySelector('.tile-waiting')?.textContent).toBe(`On order, due ${formatCalendarDay(due)}`);
    expect(card(ordered).querySelector('[data-do="buyEquipment"]')).toBeNull();
    const standing = withLine(bigUnit(), 6);
    // The next line is offered as the first was, and this hall has no room for it (v93).
    expect(card(standing).querySelector('.lock')?.textContent).toBe(lineNoRoom('window'));
    expect(card(standing).querySelector('.badge-owned')).not.toBeNull();
  });

  it('is one line on the Output sheet and the top bar s plate, off the Machines page and the machine hours', () => {
    const state = withEngineers(withLine(bigUnit(), 6), 1);
    const lines = outputBreakdown(state).lines;
    expect(lines.filter((line) => line.label.startsWith('Window line'))).toEqual([]);
    expect(lines.find((line) => line.label.startsWith('Line 1'))).toEqual({
      label: 'Line 1, 3 modules',
      points: 0.8,
      hall: false,
      where: 'timber work, the Finishing excepted',
    });
    const plate = paceLines(state);
    expect(plate.filter((line) => line.label.startsWith('Line module'))).toEqual([]);
    expect(plate.find((line) => line.family === 'line')).toEqual({ family: 'line', label: 'Line 1, 3 modules', percent: 80 });
    expect(machinesInTheHall(state).some((item) => LINE_MODULES.includes(item.specId))).toBe(false);
    expect(machineSavings(state, 'week').rows.some((row) => row.id.startsWith('kit-line'))).toBe(false);
    expect(paceLines(bigUnit()).some((line) => line.family === 'line')).toBe(false);
    // The whole line with two engineers sprays too, so its line acts on all timber work.
    const whole = withEngineers(withLine(bigUnit(), 6), 2);
    expect(outputBreakdown(whole).lines.find((line) => line.label.startsWith('Line 1'))).toEqual({
      label: 'Line 1, 6 modules',
      points: 1.4,
      hall: false,
      where: 'timber work',
    });
    // A line that stands still says so on the Output sheet at nought, and has no line on the plate.
    const still = withLine(bigUnit(), 6);
    expect(outputBreakdown(still).lines.find((line) => line.label.startsWith('Line 1'))).toEqual({
      label: 'Line 1, standing still',
      points: 0,
      hall: false,
      where: 'timber work, the Finishing excepted',
    });
    expect(paceLines(still).some((line) => line.family === 'line')).toBe(false);
  });
});

describe('what the line costs to own (CLAUDE.md T29 2.10, T30 2.3.7)', () => {
  it('is never serviced and never breaks down, by day or on the second shift, two hundred days on', () => {
    const state = withLine(bigUnit(), 6);
    const later = state.clock.day + 200;
    for (const item of state.equipment.filter((entry) => LINE_MODULES.includes(entry.specId))) {
      expect(isServiced(item.specId), item.specId).toBe(false);
      expect(overdueBreakdownChance(item, later), item.specId).toBe(0);
    }
    // A bench is not serviced either, and the hall says nothing about a service under either.
    expect(isServiced('workbench')).toBe(false);
    const aged = withLine(bigUnit(), 6);
    for (const item of aged.equipment) {
      const old = LINE_MODULES.includes(item.specId) || !isServiced(item.specId);
      item.servicedDay = old ? aged.clock.day - 200 : aged.clock.day;
    }
    expect(aged.equipment.some((item) => item.specId === 'workbench')).toBe(true);
    expect(renderHall(aged)).not.toContain('(service due)');
    // And a machine that is serviced still says so when it is due.
    const saw = aged.equipment.find((item) => item.specId === 'tableSaw');
    if (saw === undefined) throw new Error('the day one saw is wanted');
    saw.servicedDay = aged.clock.day - 200;
    expect(renderHall(aged)).toContain('(service due)');
  });

  it('is never a burglar s target and not in the security firm s price, and is insured like everything', () => {
    const plain = bigUnit();
    const lined = withLine(bigUnit(), 6);
    expect(burglaryTargets(lined, 50).some((item) => LINE_MODULES.includes(item.specId))).toBe(false);
    for (const level of [3, 4, 5]) {
      expect(securitySubscriptionMonthly(lined, level), String(level)).toBe(securitySubscriptionMonthly(plain, level));
    }
    expect(insuredValue(lined)).toBe(insuredValue(plain) + 10000000);
    expect(propertyPremiumYearly(lined)).toBeGreaterThan(propertyPremiumYearly(plain));
    const scaled = SECURITY_LEVELS.find((spec) => spec.scaled);
    if (scaled === undefined) throw new Error('a scaled level is wanted');
    expect(formulaLine(lined, scaled)).toContain('insured, the production line is not in it, so');
    expect(formulaLine(plain, scaled)).not.toContain('production line');
  });
});

describe('the engineer at the line (CLAUDE.md T29 2.8)', () => {
  it('is hired with a module standing or on order, and never read as idle while one stands', () => {
    const state = withLine(bigUnit(), 6);
    expect(hiringOptions(state).find((option) => option.role === 'lineEngineer')?.blockReason).toBe('');
    withEngineers(state, 1);
    const kev = state.workers.find((worker) => worker.id === 'eng-1');
    if (kev === undefined) throw new Error('the engineer is wanted');
    expect(workerDoing(state, kev)).toBe('at the line');
    const tile = tradeUsage(state).find((entry) => entry.trade === 'lineEngineer');
    expect(tile?.words).toBe('Line 1 runs as 3 of its 6 modules.');
    expect(tile?.words).not.toContain('Near full');
    // With no module standing he waits for it, and is never called free.
    const waiting = withEngineers(bigUnit(), 1);
    const raj = waiting.workers.find((worker) => worker.id === 'eng-1');
    if (raj === undefined) throw new Error('the engineer is wanted');
    expect(workerDoing(waiting, raj)).toBe('waiting for the line');
  });
});
