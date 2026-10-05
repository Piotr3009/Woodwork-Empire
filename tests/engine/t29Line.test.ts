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
// 2.9, 2.10, section 7). Every figure is [TUNE: chat] unless Piotr's.

import { describe, expect, it } from 'vitest';
import {
  BUILT_TO_ORDER,
  CNC5_STAGE_FACTOR,
  DUST_OUTPUT_M3_PER_HOUR,
  EXTRACTION_DEMAND,
  LINE_BOARD_SAVING,
  LINE_FACTOR,
  LINE_MODULES,
  MACHINE_CAPACITY,
  MACHINE_SHORT_WORDS,
  TIMBER_FAMILIES,
} from '../../src/engine/constants';
import type { GameState, StagedJob, Worker } from '../../src/engine/index';
import { lockReasonFor, template } from '../../src/engine/catalog';
import { cancelOrder, canBuy, canSell, placeEquipmentOrder } from '../../src/engine/game';
import { insuredValue, propertyPremiumYearly } from '../../src/engine/insurance';
import { stagedJob } from '../../src/engine/jobs';
import { canPlace } from '../../src/engine/layout';
import {
  findSpec,
  hallPace,
  hallPlaces,
  isServiced,
  lineLevel,
  lineModules,
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
import { SECURITY_LEVELS } from '../../src/engine/constants';
import { act, buyStartingKit, newGame, nextDay, placeEquipment, testJoiner, withAir } from '../helpers';

const PRICES = [1500000, 750000, 750000, 1000000, 1000000];

/** A company in the 800 m2 unit with the day one kit, air enough for a CNC, and the timber
 *  machines of Turn 28 at their standard class but what is named, all off the line's cells. */
function bigUnit(without: string[] = []): GameState {
  let state = newGame({ difficulty: 'veryEasy' });
  state.cash = 9000000;
  state = nextDay(act(state, { type: 'EXTEND_UNIT' }));
  state = nextDay(act(state, { type: 'EXTEND_UNIT', stage: 'second' }));
  state = withAir(buyStartingKit(state), 'industrial');
  state.cash = 9000000;
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
  return state;
}

/** Modules 1 to N standing on their own cells. */
function withLine(state: GameState, count: number, skip: number[] = []): GameState {
  for (let n = 1; n <= count; n += 1) {
    if (skip.includes(n)) continue;
    placeEquipment(state, `windowLine${n}`, { x: 5 + 6 * (n - 1), y: 14, id: `kit-line-${n}` });
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

describe('the five modules of the line (CLAUDE.md T29 2.9.1, 2.10)', () => {
  it('are five families of one class each, at the brief s prices, a month on order, sixty a day', () => {
    expect([...LINE_MODULES]).toEqual(['windowLine1', 'windowLine2', 'windowLine3', 'windowLine4', 'windowLine5']);
    let soFar = 0;
    LINE_MODULES.forEach((id, index) => {
      const spec = findSpec(id);
      const n = index + 1;
      expect(spec, id).toMatchObject({
        name: `Window line, module ${n}`,
        folder: `Line module ${n}`,
        tab: 'line',
        category: 'machine',
        price: PRICES[index],
        deliveryDays: 30,
        width: 6,
        depth: 3,
        height: 2.5,
        zoneWidth: 6,
        zoneDepth: 3,
        minUnitM2: 800,
        requires: n === 1 ? ['cnc5', 'framePress'] : [`windowLine${n - 1}`],
      });
      expect(spec?.variants.map((variant) => variant.id), id).toEqual(['standard']);
      expect(spec?.variants[0]?.powerPerDay, id).toBe(60);
      expect(MACHINE_SHORT_WORDS[id], id).toBe('line module');
      expect(TIMBER_FAMILIES, id).toContain(id);
      expect(DUST_OUTPUT_M3_PER_HOUR[id], id).toBe(0);
      expect(EXTRACTION_DEMAND[id], id).toBeUndefined();
      expect(BUILT_TO_ORDER, id).toContain(id);
      expect(MACHINE_CAPACITY[id], id).toEqual(n === 5 ? undefined : { standard: 33 });
      soFar += spec?.price ?? 0;
    });
    // The whole line is the five million.
    expect(soFar).toBe(5000000);
  });

  it('is refused in its order: the unit, what it requires, one of each, the cash, then its own floor', () => {
    const small = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    small.cash = 9000000;
    for (const id of LINE_MODULES) expect(canBuy(small, id), id).toEqual({ ok: false, reason: 'Needs the 800 m² unit' });
    const noCnc = bigUnit(['cnc5']);
    expect(canBuy(noCnc, 'windowLine1')).toEqual({ ok: false, reason: 'Needs Five axis CNC first' });
    const noPress = bigUnit(['framePress']);
    expect(canBuy(noPress, 'windowLine1')).toEqual({ ok: false, reason: 'Needs Frame press first' });
    const state = bigUnit();
    expect(canBuy(state, 'windowLine2')).toEqual({ ok: false, reason: 'Needs Window line, module 1 first' });
    expect(placeEquipmentOrder(state, 'windowLine1').ok).toBe(true);
    expect(canBuy(state, 'windowLine1')).toEqual({ ok: false, reason: 'The line has this module' });
    // An order meets a requires, so module 2 may be ordered behind module 1 on the road.
    const poor = bigUnit();
    poor.cash = 1000;
    placeEquipment(poor, 'planer', { variantId: 'standard', x: 5, y: 14, id: 'kit-in-the-way' });
    expect(canBuy(poor, 'windowLine1')).toEqual({ ok: false, reason: 'Not enough cash' });
  });

  it('asks its own floor clear, in the canteen s words, and never says No free 6 m by 3 m', () => {
    const state = bigUnit();
    placeEquipment(state, 'planer', { variantId: 'standard', x: 5, y: 14, id: 'kit-planer-2' });
    placeEquipment(state, 'sheetRack', { variantId: 'standard', x: 9, y: 15, id: 'kit-rack-2' });
    expect(canBuy(state, 'windowLine1')).toEqual({
      ok: false,
      reason: "Move the four sided planer and the sheet rack off the line's 6 m by 3 m",
    });
    const clear = bigUnit();
    clear.movedItems = [{ itemId: 'kit-planer', fromX: 26, fromY: 2, fromOrientation: 0 }];
    expect(canBuy(clear, 'windowLine1')).toEqual({ ok: false, reason: 'The kit is half shifted. Finish the move first' });
  });

  it('is ordered five in one morning, stands on its own cells on one morning, and is never moved or turned', () => {
    const state = bigUnit();
    for (const id of LINE_MODULES) expect(placeEquipmentOrder(state, id).ok, id).toBe(true);
    const orders = state.onOrder.filter((item) => LINE_MODULES.includes(item.specId));
    expect(new Set(orders.map((item) => item.dueDay)).size).toBe(1);
    expect(orders.map((item) => [item.anchorX, item.anchorY])).toEqual([
      [5, 14],
      [11, 14],
      [17, 14],
      [23, 14],
      [29, 14],
    ]);
    // An order for a module, as for a five axis CNC, is not called off.
    const first = orders[0];
    if (first === undefined) throw new Error('module 1 is on order');
    expect(cancelOrder(state, first.id)).toEqual({ ok: false, reason: 'Built to order: it cannot be called off' });
    // The outline of one on order is not dragged or turned.
    expect(canPlace(state, first.id, 6, 14)).toEqual({ ok: false, reason: 'The line stands where it is built' });
    // On its day it stands, built in, with nobody to unload it.
    for (const order of orders) order.dueDay = state.clock.day + 1;
    let next = state;
    while (next.onOrder.some((item) => LINE_MODULES.includes(item.specId))) next = nextDay(next);
    expect(lineModules(next)).toBe(5);
    expect(next.tasks.some((task) => task.kind === 'unload' && !task.done)).toBe(false);
    const module = next.equipment.find((item) => item.specId === 'windowLine3');
    expect(module).toMatchObject({ anchorX: 17, anchorY: 14, orientation: 0 });
    if (module === undefined) throw new Error('module 3 stands');
    expect(canPlace(next, module.id, 18, 14)).toEqual({ ok: false, reason: 'The line stands where it is built' });
    expect(canPlace(next, module.id, 17, 14, 1)).toEqual({ ok: false, reason: 'The line stands where it is built' });
  });

  it('is sold only from the end, for half its price', () => {
    const state = withLine(bigUnit(), 3);
    expect(canSell(state, 'kit-line-2')).toEqual({ ok: false, reason: 'Sell the module after it first' });
    expect(canSell(state, 'kit-line-3')).toEqual({ ok: true, reason: '' });
    const third = state.equipment.find((item) => item.id === 'kit-line-3');
    if (third === undefined) throw new Error('module 3 stands');
    expect(salePriceFor(third)).toBe(375000);
    // A later module on order holds it too.
    const ordered = withLine(bigUnit(), 2);
    expect(placeEquipmentOrder(ordered, 'windowLine3').ok).toBe(true);
    expect(canSell(ordered, 'kit-line-2')).toEqual({ ok: false, reason: 'Sell the module after it first' });
  });
});

describe('how much of the line runs (CLAUDE.md T29 2.9.4)', () => {
  it('is the unbroken run from module 1, kept by its engineers on duty', () => {
    expect(lineModules(withLine(bigUnit(), 4, [3]))).toBe(2);
    const five = withLine(bigUnit(), 5);
    expect(lineModules(five)).toBe(5);
    expect(lineLevel(five)).toBe(0);
    expect(lineLevel(withEngineers(withLine(bigUnit(), 5), 1))).toBe(3);
    expect(lineLevel(withEngineers(withLine(bigUnit(), 5), 2))).toBe(5);
    expect(lineLevel(withEngineers(withLine(bigUnit(), 2), 1))).toBe(2);
    // A man off is not on duty; one who starts tomorrow is not either.
    const off = withEngineers(withLine(bigUnit(), 5), 2);
    const first = off.workers.find((worker) => worker.id === 'eng-1');
    if (first === undefined) throw new Error('the engineer is wanted');
    first.absentDaysRemaining = 2;
    expect(lineLevel(off)).toBe(3);
  });

  it('says on the strip, directly under nobodyAssigned, when modules stand that no engineer keeps', () => {
    expect(WARNING_ORDER.indexOf('lineNeedsEngineer')).toBe(WARNING_ORDER.indexOf('nobodyAssigned') + 1);
    const line = (state: GameState): string | undefined =>
      warnings(state).find((entry) => entry.key === 'lineNeedsEngineer')?.text;
    expect(line(bigUnit())).toBeUndefined();
    expect(line(withLine(bigUnit(), 1))).toBe('The line stands still: no engineer on duty');
    expect(line(withEngineers(withLine(bigUnit(), 5), 1))).toBe('The line runs as three modules: one engineer on duty');
    expect(line(withEngineers(withLine(bigUnit(), 3), 1))).toBeUndefined();
    expect(line(withEngineers(withLine(bigUnit(), 5), 2))).toBeUndefined();
  });
});

describe('what the line does to a window (CLAUDE.md T29 2.9.5, 2.9.6)', () => {
  it('does each stage on its module from its level, at an industrial machine s pace times the factor', () => {
    const industrial = 1.12;
    for (let level = 1; level <= 5; level += 1) {
      const state = withEngineers(withLine(bigUnit(), level), level > 3 ? 2 : 1);
      expect(lineLevel(state), String(level)).toBe(level);
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
      // The booth always, and never the factor: the line does not spray.
      expect(plan.finishing, `${level}`).toEqual({ family: 'sprayBooth', speed: hallPace(state, 'sprayBooth') });
      // The benches always, at the factor.
      expect(plan.assembly?.family, `${level}`).toBe('workbench');
      expect(plan.assembly?.speed, `${level}`).toBeCloseTo(factor * hallPace(state, 'workbench'), 10);
    }
    expect(LINE_FACTOR).toEqual([1, 1.4, 1.6, 1.8, 2.1, 2.4]);
  });

  it('goes back to the machines below its level, and a line that stands still is the hall without it', () => {
    const three = withEngineers(withLine(bigUnit(), 5), 1);
    expect(planOf(three).pressing?.family).toBe('framePress');
    expect(planOf(withLine(bigUnit(), 5))).toEqual(planOf(bigUnit()));
    // A sheet job is where it is today, family for family, whatever stands.
    for (const finish of ['laminate', 'lacquer'] as const) {
      const job = stagedJob(100, 'sheet', false, finish, true, false);
      const plain = stagePlanFor(bigUnit(), job).map((stage) => [stage.id, stage.family, stage.speed]);
      const lined = stagePlanFor(withEngineers(withLine(bigUnit(), 5), 2), job).map((stage) => [stage.id, stage.family, stage.speed]);
      expect(lined, finish).toEqual(plain);
    }
  });

  it('keeps thirty three a module, so no hall is ever short of the line', () => {
    const state = withEngineers(withLine(bigUnit(), 5), 2);
    for (const id of LINE_MODULES.slice(0, 4)) expect(hallPlaces(state, id), id).toBe(33);
    const short = placeShortages(state, 'day', (family) => (LINE_MODULES.includes(family) ? 33 : 0));
    expect(short.filter((entry) => LINE_MODULES.includes(entry.family))).toEqual([]);
  });

  it('stands in on the board for the machines whose stages it does, even on an engineer s day off', () => {
    const sash = template('sashWindows');
    const state = withLine(bigUnit(['crossCut', 'planer', 'spindleMoulder', 'sander', 'framePress', 'cnc5']), 4);
    expect(lockReasonFor(state, sash)).toBeNull();
    // Without module 4 the press is missing, in the words it always had.
    const three = withLine(bigUnit(['crossCut', 'planer', 'spindleMoulder', 'sander', 'framePress', 'cnc5']), 3);
    expect(lockReasonFor(three, sash)).toBe('Needs frame press');
  });
});

describe('the boards the line saves (CLAUDE.md T29 2.9.7)', () => {
  it('counts three per cent fewer boards a module, to the penny before the rounding', () => {
    expect(LINE_BOARD_SAVING).toBe(0.03);
    // Boards of 3,640: nineteen with no line, eighteen with one module, sixteen with all five.
    const cost = 5600;
    expect(boardsForJob(bigUnit(), cost, true)).toBe(19);
    expect(boardsForJob(withLine(bigUnit(), 1), cost, true)).toBe(18);
    expect(boardsForJob(withLine(bigUnit(), 5), cost, true)).toBe(16);
    // Never below one, and a sheet job is not touched.
    expect(boardsForJob(withLine(bigUnit(), 5), 10, true)).toBe(1);
    expect(boardsForJob(withLine(bigUnit(), 5), cost, false)).toBe(boardsForJob(bigUnit(), cost, false));
  });
});

describe('the module s card and the sheets that list machines (CLAUDE.md T29 2.9.8)', () => {
  function card(state: GameState, id: string): string {
    const holder = document.createElement('div');
    holder.innerHTML = renderCatalogue(state, '', catalogueTabFrom('line'), id);
    return holder.querySelector('.tile[data-variant]')?.textContent ?? '';
  }

  it('says what each module covers and what the line gives, and none of a machine s own lines', () => {
    const state = bigUnit();
    const first = card(state, 'windowLine1');
    expect(first).toContain('Does the Cross cutting and the Planing of windows and doors');
    expect(first).toContain('With the line this long timber work goes 1.4 times as fast, the Finishing excepted');
    expect(first).toContain('Needs a five axis CNC and a frame press beside it');
    for (const word of ['Output', 'Dust', 'Life', 'busy']) expect(first, word).not.toContain(word);
    expect(first).toContain('£60 a day');
    expect(card(state, 'windowLine2')).toContain('Does the Moulding of windows and doors');
    expect(card(state, 'windowLine3')).toContain('Does the Sanding of windows and doors');
    expect(card(state, 'windowLine4')).toContain('Does the Pressing of windows and doors');
    const fifth = card(state, 'windowLine5');
    expect(fifth).toContain('Takes the finished frames off the line');
    expect(fifth).toContain('2.4 times as fast');
  });

  it('is one line on the Output sheet and the top bar s plate, off the Machines page and the machine hours', () => {
    const state = withEngineers(withLine(bigUnit(), 5), 1);
    const lines = outputBreakdown(state).lines;
    expect(lines.filter((line) => line.label.startsWith('Window line'))).toEqual([]);
    expect(lines.find((line) => line.label.startsWith('Production line'))).toEqual({
      label: 'Production line, 3 modules',
      points: 0.8,
      hall: false,
      where: 'timber work, the Finishing excepted',
    });
    const plate = paceLines(state);
    expect(plate.filter((line) => line.label.startsWith('Line module'))).toEqual([]);
    expect(plate.find((line) => line.family === 'line')).toEqual({ family: 'line', label: 'Production line, 3 modules', percent: 80 });
    expect(machinesInTheHall(state).some((item) => LINE_MODULES.includes(item.specId))).toBe(false);
    expect(machineSavings(state, 'week').rows.some((row) => row.id.startsWith('kit-line'))).toBe(false);
    expect(paceLines(bigUnit()).some((line) => line.family === 'line')).toBe(false);
  });
});

describe('what the line costs to own (CLAUDE.md T29 2.10)', () => {
  it('is never serviced and never breaks down, by day or on the second shift, two hundred days on', () => {
    const state = withLine(bigUnit(), 5);
    const later = state.clock.day + 200;
    for (const item of state.equipment.filter((entry) => LINE_MODULES.includes(entry.specId))) {
      expect(isServiced(item.specId), item.specId).toBe(false);
      expect(overdueBreakdownChance(item, later), item.specId).toBe(0);
    }
    // A bench is not serviced either, and the hall says nothing about a service under either.
    expect(isServiced('workbench')).toBe(false);
    const aged = withLine(bigUnit(), 5);
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
    const lined = withLine(bigUnit(), 5);
    expect(burglaryTargets(lined, 50).some((item) => LINE_MODULES.includes(item.specId))).toBe(false);
    for (const level of [3, 4, 5]) {
      expect(securitySubscriptionMonthly(lined, level), String(level)).toBe(securitySubscriptionMonthly(plain, level));
    }
    expect(insuredValue(lined)).toBe(insuredValue(plain) + 5000000);
    expect(propertyPremiumYearly(lined)).toBeGreaterThan(propertyPremiumYearly(plain));
    const scaled = SECURITY_LEVELS.find((spec) => spec.scaled);
    if (scaled === undefined) throw new Error('a scaled level is wanted');
    expect(formulaLine(lined, scaled)).toContain('insured, the production line is not in it, so');
    expect(formulaLine(plain, scaled)).not.toContain('production line');
  });
});

describe('the engineer at the line (CLAUDE.md T29 2.8)', () => {
  it('is hired with a module standing or on order, and never read as idle while one stands', () => {
    const state = withLine(bigUnit(), 5);
    expect(hiringOptions(state).find((option) => option.role === 'lineEngineer')?.blockReason).toBe('');
    withEngineers(state, 1);
    const kev = state.workers.find((worker) => worker.id === 'eng-1');
    if (kev === undefined) throw new Error('the engineer is wanted');
    expect(workerDoing(state, kev)).toBe('at the line');
    const tile = tradeUsage(state).find((entry) => entry.trade === 'lineEngineer');
    expect(tile?.words).toBe('The line runs as 3 of its 5 modules.');
    expect(tile?.words).not.toContain('Near full');
    // With no module standing he waits for it, and is never called free.
    const waiting = withEngineers(bigUnit(), 1);
    const raj = waiting.workers.find((worker) => worker.id === 'eng-1');
    if (raj === undefined) throw new Error('the engineer is wanted');
    expect(workerDoing(waiting, raj)).toBe('waiting for the line');
  });
});
