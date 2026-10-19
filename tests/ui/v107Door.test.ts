/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// @vitest-environment jsdom
// v107: the door line on the game's own screens [PIOTR, 18.10: "a door line, two times the windows;
// only the look of the line different"]. Its folder beside the window line's in the catalogue, its
// card and its upgrades, its running block, its books, and in the hall its four engineers and its
// pallet at the gate. From v108 its pictures are the art side's own of P3 [PIOTR, 18.10: "swap the
// door graphics"], its pallet and its forklift loaded with it among them, in place of the window
// line's in grey (flipped).

import { describe, expect, it } from 'vitest';
import { WINDOW_LINE_ORIGIN, lineModulesOf } from '../../src/engine/constants';
import type { GameState, Worker } from '../../src/engine/index';
import { lineState } from '../../src/engine/lineContract';
import { FORKLIFT_LOADED_BY_KIND, FORKLIFT_SHEETS } from '../../src/engine/constants';
import { forkliftNow, forkliftPoints, resetForklift, stepForklift, syncForklift } from '../../src/render/forklift';
import { renderHall } from '../../src/render/hall';
import { engineersArt } from '../../src/render/engineers';
import { renderAccounting } from '../../src/ui/accounting';
import { catalogueTabFrom, renderCatalogue } from '../../src/ui/catalogue';
import { renderContracts } from '../../src/ui/contracts';
import { renderMachine } from '../../src/ui/machine';
import { act, buyStartingKit, newGame, nextDay, placeEquipment, testJoiner, withAir } from '../helpers';

function bigUnit(): GameState {
  let state = newGame({ difficulty: 'veryEasy' });
  state.cash = 9000000;
  state = nextDay(act(state, { type: 'EXTEND_UNIT' }));
  state = nextDay(act(state, { type: 'EXTEND_UNIT', stage: 'second' }));
  state = withAir(buyStartingKit(state), 'industrial');
  state.cash = 45000000;
  state.reputation = 40;
  state.enquiries = [];
  for (const item of state.equipment) {
    if (item.specId === 'sheetRack') [item.anchorX, item.anchorY] = [11, 2];
    if (item.specId === 'workbench') [item.anchorX, item.anchorY] = [14, 3];
  }
  return state;
}

function withLine(state: GameState, line: number, kind: 'window' | 'door', at: { x: number; y: number }): GameState {
  lineModulesOf(kind).forEach((id, index) =>
    placeEquipment(state, id, { x: at.x + 6 * index, y: at.y, id: `kit-line-${line}-${index + 1}` }),
  );
  for (const item of state.equipment) {
    if (item.id.startsWith(`kit-line-${line}-`)) item.line = line;
  }
  lineState(state, line);
  return state;
}

/** A window line 1 and a door line 2 with their six engineers. */
function windowAndDoor(): GameState {
  const state = withLine(withLine(bigUnit(), 1, 'window', WINDOW_LINE_ORIGIN), 2, 'door', { x: 2, y: 7 });
  for (let n = 1; n <= 6; n += 1) {
    const engineer: Worker = { ...testJoiner(`eng-${n}`, `Eng ${n}`), role: 'lineEngineer', tier: null, rate: 0, monthlyWage: 15000 };
    state.workers.push(engineer);
  }
  return state;
}

function page(html: string): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  return holder;
}

describe('the catalogue (v107)', () => {
  it('holds a folder a kind of line, the door line s from its own price', () => {
    const tab = page(renderCatalogue(bigUnit(), '', catalogueTabFrom('line')));
    // And the house factory's after them from v114 (flipped).
    expect(Array.from(tab.querySelectorAll('.folder')).map((node) => node.getAttribute('data-folder'))).toEqual([
      'windowLine1',
      'doorLine1',
      'houseLine1',
    ]);
    const door = tab.querySelector('[data-folder="doorLine1"]')?.textContent ?? '';
    expect(door).toContain('Door production line');
    expect(door).toContain('from £20,000,000');
    expect(door).toContain('Makes door sets from the board to the pallet: six modules in one line, 36 m long.');
  });

  it('opens on the door line s card and its four upgrades, in its own words and figures', () => {
    const state = windowAndDoor();
    const folder = page(renderMachine(state, 'doorLine1'));
    const card = folder.querySelector('.tile[data-line]');
    expect(card?.querySelector('.tile-name')?.textContent).toContain('Door production line');
    const text = card?.textContent ?? '';
    for (const row of [
      'Module 1: cross cutting and planing',
      'Module 5: the Finishing, sprayed and hung on the overhead rail',
      'Module 6: the Glazing, hung in its frame, then wrapped and stacked on a pallet',
      'With four engineers it makes a door every 1 hour on a contract of its own',
      'Sold whole, for half its price; the upgrades go with it',
      '£20,000,000',
      'Power £720 a day',
    ]) {
      expect(text, row).toContain(row);
    }
    expect(text).not.toContain('timber work goes');
    // The art side's own door line module 1 (flipped in v108: the window line's in grey before).
    const picture = card?.querySelector('.tile-picture img');
    expect(picture?.getAttribute('src')).toContain('doorLine1.standard');
    expect(picture?.hasAttribute('style')).toBe(false);
    const upgrades = Array.from(folder.querySelectorAll('[data-upgrade]'));
    expect(upgrades.map((node) => node.getAttribute('data-upgrade'))).toEqual(['doorTooling', 'doorSoftware', 'doorPress', 'doorSprayRobot']);
    expect(upgrades[0]?.textContent).toContain('£800,000');
    expect(upgrades[0]?.textContent).toContain("Takes 10 minutes off each door of the line's contract");
    // One Buy, for the door line: the window line is not a door line's to upgrade.
    expect(Array.from(upgrades[0]?.querySelectorAll('[data-do="buyLineUpgrade"]') ?? []).map((node) => node.getAttribute('data-line'))).toEqual(['2']);
  });
});

describe('the running block and the books (v107)', () => {
  it('names the door line s contract and counts its doors', () => {
    const state = windowAndDoor();
    lineState(state, 2).contract = {
      status: 'active',
      startDay: state.clock.day,
      windowsThisWeek: 3,
      weekStartDay: state.clock.day,
      windowsMade: 12,
      revenue: 36000,
      materialCost: 14400,
      boardsReserved: 16,
      glassReserved: 8,
    };
    lineState(state, 2).onPallet = 2;
    state.stock.boards = 100;
    state.stock.glass = 100;
    const block = page(renderContracts(state)).querySelector('[data-line-contract="2"]')?.textContent ?? '';
    expect(block).toContain('Doors off line 2');
    expect(block).toContain('This week: 3 doors. In all: 12');
    expect(block).toContain('£3,000 a door; the timber and the glass £1,200 a door, from the stores');
    expect(block).toContain('One door every 1 hour');
    expect(block).toContain('2 of 10');
    expect(block).toContain('16 boards, for 4 doors');
    expect(block).toContain('for 4 doors');
  });

  it('counts each line s units in its own word, and both kinds under all the lines', () => {
    const state = windowAndDoor();
    lineState(state, 1).since.firstDay = state.clock.day;
    lineState(state, 2).since.firstDay = state.clock.day;
    const tab = page(renderAccounting(state, 'line'));
    expect(tab.querySelector('[data-line-books="1"] .col')?.textContent).toContain('Windows made');
    expect(tab.querySelector('[data-line-books="2"] .col')?.textContent).toContain('Doors made');
    const all = tab.querySelector('[data-line-books="all"] .col')?.textContent ?? '';
    expect(all).toContain('Windows made');
    expect(all).toContain('Doors made');
  });
});

describe('the hall (v107)', () => {
  it('draws the door line from the art side s own pictures, and the window line as it always was', () => {
    const state = windowAndDoor();
    const hall = page(renderHall(state));
    const module3 = hall.querySelector('[data-kit="kit-line-2-3"]');
    expect(module3?.getAttribute('data-sprite')).toBe('doorLine3');
    expect(module3?.querySelector('image')?.getAttribute('href')).toContain('doorLine3.standard');
    expect(hall.querySelector('[data-kit="kit-line-1-3"] image')?.getAttribute('href')).toContain('windowLine3.standard');
    // No grey of the window line's pictures left anywhere (flipped in v108).
    expect(hall.querySelector('filter#door-line, [filter="url(#door-line)"]')).toBeNull();
  });

  it('stacks the doors on module 6 s pallet from the art side s overlays', () => {
    const state = windowAndDoor();
    lineState(state, 2).onPallet = 6;
    const stack = page(renderHall(state)).querySelector('[data-kit="kit-line-2-6"] .pallet-stack');
    expect(stack?.getAttribute('data-stack')).toBe('6');
    expect(stack?.getAttribute('href')).toContain('doorLine6.standard.stack06');
  });

  it('walks the door line s four engineers along it and the window line s two', () => {
    const state = windowAndDoor();
    state.clock.minute = 120;
    const walking = engineersArt(state).map((drawn) => /data-engineer="(\d+):\d+"/.exec(drawn.svg)?.[1]);
    expect(walking.filter((line) => line === '1')).toHaveLength(2);
    expect(walking.filter((line) => line === '2')).toHaveLength(4);
  });

  it('puts the doors pallets at the gate after the windows and names both kinds', () => {
    const state = windowAndDoor();
    lineState(state, 2).palletsAtGate = 1;
    const doorsOnly = page(renderHall(state));
    expect(doorsOnly.querySelector('[data-line-pallet="0"]')?.getAttribute('data-pallet-kind')).toBe('door');
    expect(doorsOnly.querySelector('[data-line-pallet="0"] image')?.getAttribute('href')).toContain('doorPallet.standard');
    expect(doorsOnly.textContent).toContain('Doors for collection: 1 pallet');
    lineState(state, 1).palletsAtGate = 1;
    const both = page(renderHall(state));
    expect(Array.from(both.querySelectorAll('[data-line-pallet]')).map((node) => node.getAttribute('data-pallet-kind'))).toEqual([
      'window',
      'door',
    ]);
    expect(both.textContent).toContain('For collection: 1 pallet of windows and 1 of doors');
  });
});

describe('the door line s forklift (v108)', () => {
  it('drives the door pallet to the gate in its own sheet, a metre ahead of it, and leaves that pallet out of the gate', () => {
    resetForklift();
    const state = windowAndDoor();
    state.speed = 1;
    state.activeEvent = null;
    state.eventQueue = [];
    const points = forkliftPoints(state, 2);
    if (points === null) throw new Error('the door line s forklift is wanted');
    // The pallets' row is at y 10 to 11; the door line's lane comes to it from below, so it stops a
    // metre short of the middle on that side.
    expect(Math.abs(points.drop.y - 10.5)).toBeCloseTo(FORKLIFT_LOADED_BY_KIND.door?.ahead ?? 0, 6);
    expect(FORKLIFT_LOADED_BY_KIND.door?.ahead).toBe(1);
    // A window pallet already waits at the gate when the forklifts are first seen; then the door line
    // sends one and its forklift takes it.
    lineState(state, 1).palletsAtGate = 1;
    const holder = page(renderHall(state));
    syncForklift(holder, state, 0);
    expect(forkliftNow(1)?.leg).toBe('wait');
    lineState(state, 2).palletsAtGate = 1;
    stepForklift(holder, state, 100);
    expect(forkliftNow(2)?.leg).toBe('out');
    const written = page(renderHall(state));
    syncForklift(written, state, 100);
    for (let at = 200; at <= 600; at += 100) stepForklift(written, state, at);
    const art = written.querySelector('[data-forklift-line="2"] [data-forklift-art]');
    expect(art?.querySelector('image')?.getAttribute('href')).toBe(`/sprites/${FORKLIFT_SHEETS.loadedDoor.file}`);
    // The door pallet is the second drawn, after the window pallet, and it is the one on the forks.
    expect(written.querySelector('[data-line-pallet="1"]')?.getAttribute('data-pallet-kind')).toBe('door');
    expect(written.querySelector('[data-line-pallet="1"]')?.getAttribute('visibility')).toBe('hidden');
    expect(written.querySelector('[data-line-pallet="0"]')?.hasAttribute('visibility')).toBe(false);
  });
});
