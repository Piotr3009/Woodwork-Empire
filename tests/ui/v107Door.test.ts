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
// only the look of the line different"; "windows in grey" until the art side draws its own]. Its
// folder beside the window line's in the catalogue, its card and its upgrades, its running block,
// its books, and in the hall the window line's pictures in a light grey, its four engineers and its
// pallet at the gate.

import { describe, expect, it } from 'vitest';
import { WINDOW_LINE_ORIGIN, lineModulesOf } from '../../src/engine/constants';
import type { GameState, Worker } from '../../src/engine/index';
import { lineState } from '../../src/engine/lineContract';
import { DOOR_LINE_FILTER, renderHall } from '../../src/render/hall';
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
    expect(Array.from(tab.querySelectorAll('.folder')).map((node) => node.getAttribute('data-folder'))).toEqual([
      'windowLine1',
      'doorLine1',
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
    // Until the art side draws it, the window line's module 1 in the door line's grey.
    const picture = card?.querySelector('.tile-picture img');
    expect(picture?.getAttribute('src')).toContain('windowLine1.standard');
    expect(picture?.getAttribute('style')).toContain('door-line-card');
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
  it('draws the door line from the window line s pictures in the door line s grey', () => {
    const state = windowAndDoor();
    const hall = page(renderHall(state));
    expect(hall.querySelector(`filter#${DOOR_LINE_FILTER}`)).not.toBeNull();
    const module3 = hall.querySelector('[data-kit="kit-line-2-3"]');
    expect(module3?.getAttribute('data-sprite')).toBe('doorLine3');
    expect(module3?.querySelector(`g[filter="url(#${DOOR_LINE_FILTER})"] image`)?.getAttribute('href')).toContain('windowLine3.standard');
    // The window line is drawn as it always was.
    expect(hall.querySelector('[data-kit="kit-line-1-3"]')?.querySelector(`g[filter="url(#${DOOR_LINE_FILTER})"]`)).toBeNull();
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
