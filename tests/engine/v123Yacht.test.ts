/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// @vitest-environment jsdom
// v123: the yacht line [PIOTR, 20.10: "now code the production, graphics only, of the yacht building",
// on the art side's pack of the yacht line, its pictures alone]. A fourth kind of line: twelve stations
// of 14 m by 10 m by 12 m, a ten metre lane along it, every money figure the window line's ten times
// over and a yacht the window's minutes sixteen times over (the house factory's figures twice over,
// its twelve stations the house factory's six twice over), a yacht at £400,000 by the house's rule of
// v115, ten engineers, the robots doing the work [TUNE: chat: all of it, for Piotr's word]. Flipped in
// v129: a yacht at £600,000 [PIOTR, 26.10: "b"]; flipped again in v130: £1,088,000, the clear profit
// twice as big [PIOTR, 26.10].

import { describe, expect, it } from 'vitest';
import {
  BUILT_TO_ORDER,
  LINE_KIND_ORDER,
  LINE_KINDS,
  LINE_UPGRADES,
  MACHINE_WORK_SHEETS,
  SHEET_VALUE,
  YACHT_LINE_UPGRADES,
  lineMaterialPerUnitOf,
  lineModulesKept,
  lineModulesOf,
  linePriceOf,
  lineUnitPriceOf,
} from '../../src/engine/constants';
import type { GameState } from '../../src/engine/index';
import { addWorkingDays, isWorkingDay } from '../../src/engine/clock';
import { canBuy, placeEquipmentOrder } from '../../src/engine/game';
import { lineBlockWords, lineBox, lineDepthCells, lineGround, lineNoRoom, lineSite } from '../../src/engine/layout';
import {
  answerLineOffer,
  lineOfferBody,
  linePowerPerDay,
  lineState,
  lineWindowMinutes,
  lineWindowsAWeek,
  runningLineContract,
} from '../../src/engine/lineContract';
import { glassUnitPrice } from '../../src/engine/materials';
import { findSpec, lineKindOf } from '../../src/engine/machines';
import { renderHall } from '../../src/render/hall';
import { catalogueTabFrom, renderCatalogue } from '../../src/ui/catalogue';
import { renderContracts } from '../../src/ui/contracts';
import { act, clearEvents, newGame, nextDay, runClock } from '../helpers';
import { yachtHall, yachtLine } from '../yachtLine';

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

describe('the yacht line in the table (v123)', () => {
  it('is the window line ten times over in money and sixteen in minutes, a yacht at £1,088,000', () => {
    const yacht = LINE_KINDS.yacht;
    expect(LINE_KIND_ORDER).toEqual(['window', 'door', 'house', 'yacht']);
    expect(yacht.name).toBe('Yacht production line');
    expect([yacht.factor, yacht.minutesFactor]).toEqual([10, 16]);
    expect(linePriceOf('yacht')).toBe(100000000);
    expect(Object.values(yacht.shares)).toEqual([10, 10, 12.5, 12.5, 6.25, 6.25, 6.25, 6.25, 7.5, 7.5, 7.5, 7.5].map((m) => m * 1000000));
    // Its material still the factors' own; its price Piotr's of v130, in place of the house's rule.
    expect(lineUnitPriceOf('yacht')).toBe(1088000);
    expect(lineMaterialPerUnitOf('yacht')).toBe(96000);
    expect(yacht.boards * SHEET_VALUE + yacht.glass * glassUnitPrice()).toBe(96000);
    expect([yacht.boards, yacht.glass, yacht.palletUnits, yacht.engineers, yacht.laneCells]).toEqual([320, 160, 1, 10, 10]);
    expect([yacht.collection, yacht.palletSprite, yacht.stationFrames, yacht.servesJobs]).toEqual(['lane', 'yachtWaiting', 16, false]);
    expect(yacht.wait).toEqual({ fromEnd: 1, gap: 1, width: 13, depth: 6, height: 4, drawn: 3 });
    expect(YACHT_LINE_UPGRADES.map((upgrade) => upgrade.price)).toEqual(LINE_UPGRADES.map((upgrade) => upgrade.price * 10));
    expect(YACHT_LINE_UPGRADES.map((upgrade) => upgrade.name)).toEqual([
      'Heated moulds',
      'Yard software',
      'Second laminating robot',
      'Second finishing robot',
    ]);
    // Each station draws a window module's power ten times over: twelve of them.
    expect(linePowerPerDay('yacht')).toBe(7200);
    expect([yacht.contractName, yacht.client, yacht.unit, yacht.units]).toEqual(['Yachts off line', 'A yacht dealer', 'yacht', 'yachts']);
  });

  it('keeps its twelve stations with its ten engineers, a share of the crew a share of the stations', () => {
    expect(Array.from({ length: 11 }, (_, onDuty) => lineModulesKept('yacht', onDuty))).toEqual([0, 1, 2, 3, 4, 6, 7, 8, 9, 10, 12]);
  });

  it('has twelve stations of 14 m by 10 m by 12 m in a folder of their own, built to order in ninety working days, no work sheet', () => {
    expect(lineModulesOf('yacht')).toEqual(Array.from({ length: 12 }, (_, index) => `yachtLine${index + 1}`));
    for (const id of lineModulesOf('yacht')) {
      const spec = findSpec(id);
      expect(spec, id).toMatchObject({ folder: 'Yacht production line', tab: 'line', deliveryDays: 90, category: 'machine' });
      expect([spec?.width, spec?.depth, spec?.height], id).toEqual([14, 10, 12]);
      expect(BUILT_TO_ORDER, id).toContain(id);
      expect(MACHINE_WORK_SHEETS[id], id).toBeUndefined();
    }
    expect(findSpec('yachtLine1')?.effect).toBe('Makes yachts from the hull mould to the handover: twelve stations in one line, 168 m long.');
    expect(findSpec('yachtLine9')?.effect).toBe('Module 9 of the yacht line: the deck and the superstructure, lifted on by the gantry crane.');
  });
});

describe('where it stands (v123)', () => {
  it('takes 168 m by 10 m and a ten metre lane along it: a block of 168 m by 22 m', () => {
    expect(lineBox({ x: 0, y: 0 }, 'yacht')).toEqual({ x: 0, y: 0, width: 168, depth: 10 });
    expect(lineDepthCells('yacht')).toBe(22);
    expect(lineBlockWords('yacht')).toBe('168 m by 22 m');
    const state = yachtHall();
    expect([state.unit.widthCells, state.unit.depthCells]).toEqual([180, 27]);
    expect(lineSite(state, 'yacht')).toEqual({ x: 5, y: 0 });
    expect(lineGround(state, { x: 5, y: 0 }, 'yacht')).toEqual({
      behind: null,
      line: { x: 5, y: 0, width: 168, depth: 10 },
      path: { x: 5, y: 10, width: 168, depth: 1 },
      front: { x: 5, y: 11, width: 168, depth: 10 },
      left: null,
    });
  });

  it('is refused in a hall without the block, in the words that say the block', () => {
    let small = newGame({ difficulty: 'veryEasy' });
    small.cash = 900000000;
    small = nextDay(act(nextDay(act(small, { type: 'EXTEND_UNIT' })), { type: 'EXTEND_UNIT', stage: 'second' }));
    small.cash = 200000000;
    small.reputation = 40;
    expect(canBuy(small, 'yachtLine1')).toEqual({ ok: false, reason: lineNoRoom('yacht') });
  });

  it('is ordered whole for a hundred million under the next number, due in ninety working days', () => {
    const state = yachtHall();
    expect(canBuy(state, 'yachtLine1').ok).toBe(true);
    expect(canBuy(state, 'yachtLine7')).toEqual({ ok: false, reason: 'It comes with the line' });
    const cash = state.cash;
    expect(placeEquipmentOrder(state, 'yachtLine1').ok).toBe(true);
    expect(cash - state.cash).toBe(100000000);
    expect(state.ledger.at(-1)?.label).toBe('Yacht production line, line 1, ordered');
    expect(state.onOrder.map((item) => [item.specId, item.line, item.anchorX, item.anchorY])).toEqual(
      lineModulesOf('yacht').map((id, index) => [id, 1, 5 + 14 * index, 0]),
    );
    expect(state.onOrder.every((item) => item.dueDay === addWorkingDays(state.clock.day, 90))).toBe(true);
    expect(lineKindOf(state, 1)).toBe('yacht');
  });
});

describe('its contract (v123)', () => {
  it('is offered with its ten engineers, in a yacht dealer s words', () => {
    const offered = toWorkingMorning(yachtLine());
    expect(lineState(offered, 1).contract).not.toBeNull();
    expect(lineOfferBody(offered, 1)).toBe(
      'A yacht dealer will take every yacht line 1 makes, at £1,088,000 a yacht. The timber and the glass cost ' +
        '£96,000 a yacht, taken from your timber stores and glass racks: restock them on the Materials page, ' +
        'or the office does. The line makes one every 16 hours, about 2 a week, and the client collects each ' +
        "yacht from the line's lane the next working day. It runs until you end it.",
    );
    expect([lineWindowMinutes(offered, 1), lineWindowsAWeek(offered, 1)]).toEqual([960, 2]);
  });

  it('makes a yacht off 320 boards and 160 glass units at £1,088,000, which waits on its lane, drawn from its file', () => {
    let state = toWorkingMorning(yachtLine());
    state.stock.boards = 1000;
    state.stock.glass = 500;
    const record = lineState(state, 1);
    if (record.contract === null) throw new Error('the yacht line s contract is written');
    record.contract.status = 'offered';
    answerLineOffer(state, 1, 'take');
    if (runningLineContract(state, 1) === null) throw new Error('the contract runs');
    // Ten minutes short of a yacht.
    record.minutes = 950;
    const boards = state.stock.boards;
    const glass = state.stock.glass;
    state = runClock(state, 15);
    expect(runningLineContract(state, 1)?.windowsMade).toBe(1);
    expect([boards - state.stock.boards, glass - state.stock.glass]).toEqual([320, 160]);
    expect(state.ledger.find((entry) => entry.label === 'Yachts off line 1: yachts')?.amount).toBe(1088000);
    expect(lineState(state, 1).palletsAtGate).toBe(1);
    const hall = page(renderHall(state));
    const yacht = hall.querySelector('[data-house-waiting="0"]');
    expect(yacht?.getAttribute('data-house-line')).toBe('1');
    expect(yacht?.querySelector('title')?.textContent).toBe('Yachts for collection');
    expect(yacht?.querySelector('image')?.getAttribute('href')).toBe('/sprites/yachtWaiting.standard.png');
    expect(hall.textContent).toContain('Yachts for collection: 1');
    expect(page(renderContracts(state)).querySelector('[data-line-contract="1"]')?.textContent).toContain('On the lane for collection1 yacht');
  });

  it('holds the yacht line s folder in the catalogue from its own price', () => {
    const tab = page(renderCatalogue(yachtHall(), '', catalogueTabFrom('line')));
    expect(tab.textContent).toContain('Yacht production line');
    expect(tab.textContent).toContain('£100,000,000');
  });
});
