/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// @vitest-environment jsdom
// v114: the timber frame house factory [PIOTR, 18.10: "5 tak zakoduj" to chat's layout A of the art
// side's P4-A, its stations drawn as boxes until the art side's files came (v117), and the finished house
// delivered on the gate's side]. A third kind of line: six stations of 14 m by 10 m by 10 m, a ten
// metre lane in front with no forklift, every money figure the window line's five times over and a
// house the window's minutes eight times over, so it pays back what a window line pays back.

import { describe, expect, it } from 'vitest';
import {
  ALL_LINE_MODULES,
  BUILT_TO_ORDER,
  HOUSE_LINE_UPGRADES,
  LINE_KINDS,
  LINE_MODULE_INDEX,
  LINE_UPGRADES,
  MACHINE_WORK_SHEETS,
  SHEET_VALUE,
  lineMaterialPerUnitOf,
  lineModulesKept,
  lineModulesOf,
  linePriceOf,
  lineUnitPriceOf,
} from '../../src/engine/constants';
import type { GameState, Worker } from '../../src/engine/index';
import { addWorkingDays, isWorkingDay } from '../../src/engine/clock';
import { canBuy, placeEquipmentOrder } from '../../src/engine/game';
import { canPlaceSpec, forkliftLane, lineBox, lineDepthCells, lineGround, lineSite } from '../../src/engine/layout';
import {
  answerLineOffer,
  lineOfferBody,
  linePowerPerDay,
  lineState,
  lineWindowMinutes,
  lineWindowsAWeek,
  palletsAtTheGate,
  runningLineContract,
} from '../../src/engine/lineContract';
import { glassUnitPrice } from '../../src/engine/materials';
import { findSpec, lineKindOf } from '../../src/engine/machines';
import { forkliftPoints } from '../../src/render/forklift';
import { renderHall } from '../../src/render/hall';
import { catalogueTabFrom, renderCatalogue } from '../../src/ui/catalogue';
import { renderContracts } from '../../src/ui/contracts';
import { renderMachine } from '../../src/ui/machine';
import { act, clearEvents, newGame, nextDay, placeEquipment, runClock, testJoiner } from '../helpers';

/** The hall made ninety metres long and twenty seven deep: the 800 m² unit, five long extensions and
 *  a wide one, room for one house factory at the rear wall beside the rooms. */
function bigHall(): GameState {
  let state = newGame({ difficulty: 'veryEasy' });
  state.cash = 900000000;
  state = nextDay(act(state, { type: 'EXTEND_UNIT' }));
  state = nextDay(act(state, { type: 'EXTEND_UNIT', stage: 'second' }));
  for (let stage = 0; stage < 5; stage += 1) {
    state.cash = 900000000;
    state = nextDay(act(state, { type: 'EXTEND_UNIT', stage: 'long' }));
  }
  state.cash = 900000000;
  state = nextDay(act(state, { type: 'EXTEND_UNIT', stage: 'wide' }));
  state.cash = 90000000;
  state.reputation = 40;
  state.enquiries = [];
  return state;
}

/** A house factory standing whole as line 1 where the order puts it, with its ten engineers. */
function houseFactory(): GameState {
  const state = bigHall();
  lineModulesOf('house').forEach((id, index) =>
    placeEquipment(state, id, { x: 5 + 14 * index, y: 0, id: `kit-line-1-${index + 1}` }),
  );
  for (const item of state.equipment) {
    if (item.id.startsWith('kit-line-1-')) item.line = 1;
  }
  lineState(state, 1).kind = 'house';
  for (let n = 1; n <= 10; n += 1) {
    const engineer: Worker = { ...testJoiner(`eng-${n}`, `Eng ${n}`), role: 'lineEngineer', tier: null, rate: 0, monthlyWage: 15000 };
    state.workers.push(engineer);
  }
  return state;
}

/** The clock moved on to the open of the next working day, every card answered with its first
 *  choice: a house factory's offer is taken there. */
function toWorkingMorning(state: GameState): GameState {
  let next = nextDay(state);
  for (let guard = 0; guard < 5 && !isWorkingDay(next.clock.day); guard += 1) next = nextDay(next);
  return clearEvents(next);
}

function page(html: string): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  return holder;
}

describe('the house factory in the table (v114)', () => {
  it('is the window line five times over in money and eight times in minutes', () => {
    const house = LINE_KINDS.house;
    expect(house.name).toBe('Timber frame house factory');
    expect(linePriceOf('house')).toBe(50000000);
    expect(Object.values(house.shares)).toEqual([10000000, 12500000, 6250000, 6250000, 7500000, 7500000]);
    // Flipped in v115: 100,000 a house, its material still 24,000 (PIOTR, 19.10: the clear profit
    // twice as big).
    expect(lineUnitPriceOf('house')).toBe(100000);
    expect(lineMaterialPerUnitOf('house')).toBe(24000);
    expect(house.boards * SHEET_VALUE + house.glass * glassUnitPrice()).toBe(24000);
    expect([house.boards, house.glass, house.palletUnits, house.engineers, house.laneCells]).toEqual([80, 40, 1, 10, 10]);
    expect(house.collection).toBe('lane');
    expect(HOUSE_LINE_UPGRADES.map((upgrade) => upgrade.price)).toEqual(LINE_UPGRADES.map((upgrade) => upgrade.price * 5));
    expect(HOUSE_LINE_UPGRADES.map((upgrade) => upgrade.name)).toEqual([
      'Diamond tooling',
      'Factory software',
      'Second nailing bridge',
      'Second vacuum crane',
    ]);
    expect(linePowerPerDay('house')).toBe(5 * linePowerPerDay('window'));
    // A minute of a house was worth five minutes of a window, the rule of v107; from v115 it is worth
    // a third more (PIOTR, 19.10: the houses' clear profit twice as big), and a house keeps 76,000
    // of its 100,000 where it kept 36,000 of 60,000.
    expect(lineUnitPriceOf('house') / (60 * 8)).toBeCloseTo((5 * lineUnitPriceOf('window') / 60) * (100000 / 60000), 9);
    expect(lineUnitPriceOf('house') - lineMaterialPerUnitOf('house')).toBe(76000);
    expect(Array.from({ length: 11 }, (_, onDuty) => lineModulesKept('house', onDuty))).toEqual([0, 0, 1, 1, 2, 3, 3, 4, 4, 5, 6]);
  });

  it('has six stations of 14 m by 10 m by 10 m in a folder of their own, built to order in sixty working days', () => {
    lineModulesOf('house').forEach((id, index) => {
      expect(findSpec(id), id).toMatchObject({
        name: `House line, module ${index + 1}`,
        folder: 'Timber frame house factory',
        tab: 'line',
        deliveryDays: 60,
        width: 14,
        depth: 10,
        height: 10,
        minUnitM2: 800,
        price: LINE_KINDS.house.shares[id],
      });
      expect(findSpec(id)?.variants[0]?.powerPerDay, id).toBe(300);
      expect(BUILT_TO_ORDER, id).toContain(id);
      expect(LINE_MODULE_INDEX.get(id), id).toEqual({ kind: 'house', place: index + 1 });
      // No working motion until the art side draws one.
      expect(MACHINE_WORK_SHEETS[id], id).toBeUndefined();
    });
    expect(ALL_LINE_MODULES).toHaveLength(18);
  });
});

describe('where it stands (v114)', () => {
  it('takes 84 m by 10 m and a ten metre lane from x 0 with no left strip and no forklift', () => {
    const state = bigHall();
    expect(lineBox({ x: 0, y: 0 }, 'house')).toEqual({ x: 0, y: 0, width: 84, depth: 10 });
    expect(lineDepthCells('house')).toBe(22);
    expect(lineSite(state, 'house')).toEqual({ x: 5, y: 0 });
    expect(lineGround(state, { x: 5, y: 0 }, 'house')).toEqual({
      behind: null,
      line: { x: 5, y: 0, width: 84, depth: 10 },
      path: { x: 5, y: 10, width: 84, depth: 1 },
      front: { x: 0, y: 11, width: 89, depth: 10 },
      left: null,
    });
    expect(forkliftLane(state, { x: 5, y: 0 }, 'house')).toBeNull();
    // The 800 m² unit has no room for it.
    const small = newGame({ difficulty: 'veryEasy' });
    small.cash = 900000000;
    const opened = nextDay(act(nextDay(act(small, { type: 'EXTEND_UNIT' })), { type: 'EXTEND_UNIT', stage: 'second' }));
    opened.cash = 90000000;
    opened.reputation = 40;
    expect(canBuy(opened, 'houseLine1')).toEqual({ ok: false, reason: 'No room in the hall for the line and its lane' });
  });

  it('keeps its lane clear in its own words', () => {
    const state = houseFactory();
    expect(canPlaceSpec(state, 'sheetRack', 40, 14, null)).toEqual({ ok: false, reason: "That is the house factory's lane" });
    expect(forkliftPoints(state, 1)).toBeNull();
  });
});

describe('a house factory bought (v114)', () => {
  it('is ordered whole for fifty million under the next number, due in sixty working days', () => {
    const state = bigHall();
    expect(canBuy(state, 'houseLine1').ok).toBe(true);
    expect(canBuy(state, 'houseLine4')).toEqual({ ok: false, reason: 'It comes with the line' });
    const cash = state.cash;
    expect(placeEquipmentOrder(state, 'houseLine1').ok).toBe(true);
    expect(cash - state.cash).toBe(50000000);
    expect(state.ledger.at(-1)?.label).toBe('Timber frame house factory, line 1, ordered');
    expect(state.onOrder.map((item) => [item.specId, item.line, item.anchorX, item.anchorY])).toEqual(
      lineModulesOf('house').map((id, index) => [id, 1, 5 + 14 * index, 0]),
    );
    expect(state.onOrder.every((item) => item.dueDay === addWorkingDays(state.clock.day, 60))).toBe(true);
    expect(lineKindOf(state, 1)).toBe('house');
  });
});

describe('its contract (v114)', () => {
  it('is offered with its ten engineers, in a housebuilder s words', () => {
    const state = houseFactory();
    const offered = toWorkingMorning(state);
    expect(lineState(offered, 1).contract).not.toBeNull();
    expect(lineOfferBody(offered, 1)).toBe(
      'A housebuilder will take every house line 1 makes, at £100,000 a house. The timber and the glass cost ' +
        '£24,000 a house, taken from your timber stores and glass racks: restock them on the Materials page, ' +
        'or the office does. The line makes one every 8 hours, about 5 a week, and the client collects each ' +
        "house from the line's lane the next working day. It runs until you end it.",
    );
    expect([lineWindowMinutes(offered, 1), lineWindowsAWeek(offered, 1)]).toEqual([480, 5]);
  });

  it('makes a house off 80 boards and 40 glass units at £100,000, which waits on its lane until the next working day', () => {
    let state = toWorkingMorning(houseFactory());
    state.stock.boards = 400;
    state.stock.glass = 200;
    const record = lineState(state, 1);
    if (record.contract === null) throw new Error('the house factory s contract is written');
    record.contract.status = 'offered';
    answerLineOffer(state, 1, 'take');
    // Ten minutes short of a house.
    record.minutes = 470;
    const boards = state.stock.boards;
    const glass = state.stock.glass;
    state = runClock(state, 15);
    expect(runningLineContract(state, 1)?.windowsMade).toBe(1);
    expect([boards - state.stock.boards, glass - state.stock.glass]).toEqual([80, 40]);
    expect(state.ledger.find((entry) => entry.label === 'Houses off line 1: houses')?.amount).toBe(100000);
    expect([lineState(state, 1).onPallet, lineState(state, 1).palletsAtGate, palletsAtTheGate(state)]).toEqual([0, 1, 0]);
    // The hall draws it at the gate end of the line's lane, and nothing at the gate.
    const hall = page(renderHall(state));
    const house = hall.querySelector('[data-house-waiting="0"]');
    expect(house?.getAttribute('data-house-line')).toBe('1');
    expect(house?.querySelector('title')?.textContent).toBe('Houses for collection');
    expect(hall.textContent).toContain('Houses for collection: 1');
    expect(hall.querySelector('[data-line-pallet]')).toBeNull();
    expect(hall.querySelector('[data-lane="1"]')).not.toBeNull();
    expect(page(renderContracts(state)).querySelector('[data-line-contract="1"]')?.textContent).toContain(
      'On the lane for collection1 house',
    );
    const morning = toWorkingMorning(state);
    expect(lineState(morning, 1).palletsAtGate).toBe(0);
  });
});

describe('the catalogue (v114)', () => {
  it('holds the house factory s folder from its own price, and its card in its own words', () => {
    const state = houseFactory();
    const tab = page(renderCatalogue(state, '', catalogueTabFrom('line')));
    expect(Array.from(tab.querySelectorAll('.folder')).map((node) => node.getAttribute('data-folder'))).toEqual([
      'windowLine1',
      'doorLine1',
      'houseLine1',
    ]);
    expect(tab.querySelector('[data-folder="houseLine1"]')?.textContent).toContain('from £50,000,000');
    const card = page(renderMachine(state, 'houseLine1')).querySelector('.tile[data-line]');
    const text = card?.textContent ?? '';
    for (const row of [
      'Timber frame house factory',
      "Module 1: the floor: the joists, the insulation and the decking on the house's transporter",
      'Module 6: the inspection and the handover, then out to the lane',
      'With ten engineers it makes a house every 8 hours on a contract of its own',
      '£50,000,000',
      'Power £1,800 a day',
      'Takes 84 m by 10 m',
    ]) {
      expect(text, row).toContain(row);
    }
  });
});
