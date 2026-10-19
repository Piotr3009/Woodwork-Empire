/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// @vitest-environment jsdom
// v119 [PIOTR, 19.10]: the player is shown where a line would go and told what it needs. The
// refusals say the block in metres and where its lane runs, naming the wall by its exit gate; Set
// up hall's `Room for` draws the block on the floor, green where it fits and red at the place with
// the fewest things in the way, each of them marked; a module of a line moves in half an hour, so
// a whole line is three hours; and the clock the game runs for the player is the 100x chip.

import { describe, expect, it } from 'vitest';
import { HOUSE_LINE_DELIVERY_DAYS, LINE_MODULE_MOVE_MINUTES, MOVE_MINUTES_PER_ITEM, SKIP_SPEED, lineModulesOf } from '../../src/engine/constants';
import { moveMinutesOf } from '../../src/engine/game';
import type { GameState } from '../../src/engine/index';
import {
  LINE_NO_ROOM,
  bestLineSite,
  lineBlockWords,
  lineNeedsRoom,
  lineNoRoom,
  lineSite,
} from '../../src/engine/layout';
import { renderHall } from '../../src/render/hall';
import { resetRoomFor } from '../../src/render/roomFor';
import { act, newGame, nextDay, placeEquipment } from '../helpers';

/** The 800 m² unit, forty by twenty, with nothing on its floor. */
function emptyUnit(): GameState {
  let state = newGame({ difficulty: 'veryEasy' });
  state.cash = 900000000;
  state = nextDay(act(state, { type: 'EXTEND_UNIT' }));
  state = nextDay(act(state, { type: 'EXTEND_UNIT', stage: 'second' }));
  state.equipment = [];
  state.onOrder = [];
  state.windowLines = [];
  state.cash = 90000000;
  state.reputation = 40;
  state.enquiries = [];
  return state;
}

/** The hall of the v114 tests, ninety by twenty seven, empty. */
function bigEmptyHall(): GameState {
  let state = emptyUnit();
  for (let stage = 0; stage < 5; stage += 1) {
    state.cash = 900000000;
    state = nextDay(act(state, { type: 'EXTEND_UNIT', stage: 'long' }));
  }
  state.cash = 900000000;
  state = nextDay(act(state, { type: 'EXTEND_UNIT', stage: 'wide' }));
  state.cash = 90000000;
  state.enquiries = [];
  return state;
}

/** A window line standing whole as line `number` with module 1 at this cell. */
function withWindowLine(state: GameState, number: number, at: { x: number; y: number }): GameState {
  lineModulesOf('window').forEach((id, index) =>
    placeEquipment(state, id, { x: at.x + 6 * index, y: at.y, id: `kit-line-${number}-${index + 1}` }),
  );
  for (const item of state.equipment) {
    if (item.id.startsWith(`kit-line-${number}-`)) item.line = number;
  }
  return state;
}

function page(html: string): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  return holder;
}

describe('the words of the refusals (v119)', () => {
  it('say the block in metres, what it is made of, and where the lane runs, by the wall with the exit gate', () => {
    expect(lineBlockWords('window')).toBe('36 m by 7 m');
    expect(lineBlockWords('door')).toBe('36 m by 7 m');
    expect(lineBlockWords('house')).toBe('84 m by 22 m');
    expect(lineNeedsRoom('window')).toBe(
      'The line needs a clear 36 m by 7 m: its 6 modules on 36 m by 3 m, a metre before and behind, and its 2 m lane running from the wall with the exit gate to its end',
    );
    expect(lineNeedsRoom('house')).toBe(
      'The line needs a clear 84 m by 22 m: its 6 modules on 84 m by 10 m, a metre before and behind, and its 10 m lane in front, which the lanes of other lines may cross',
    );
    expect(lineNoRoom('house')).toBe(
      `${LINE_NO_ROOM}: it needs a clear 84 m by 22 m (its 6 modules on 84 m by 10 m, a metre before and behind, and its 10 m lane in front, which the lanes of other lines may cross). ` +
        'Open Set up hall and press Room for: Timber frame house factory to see where it would go and what stands in the way',
    );
    expect(lineNoRoom('window')).toContain('Room for: Window production line');
    for (const text of [lineNeedsRoom('window'), lineNoRoom('house'), lineNoRoom('door')]) {
      expect(text).not.toContain('left wall');
    }
  });
});

describe('the best site of a line (v119)', () => {
  it('is the order s own site where the line fits, with nothing in the way', () => {
    const state = bigEmptyHall();
    const site = bestLineSite(state, 'house');
    expect(site).toEqual({ at: lineSite(state, 'house') ?? { x: -1, y: -1 }, fits: true, items: [], lines: [] });
    expect(site?.at).toEqual({ x: 5, y: 0 });
  });

  it('is null where the block does not go into the hall at all', () => {
    // Forty by twenty: no 84 m anywhere.
    expect(bestLineSite(emptyUnit(), 'house')).toBeNull();
    expect(lineSite(emptyUnit(), 'house')).toBeNull();
  });

  it('names the kit and the lines in the way at the place with the fewest of them', () => {
    // Ninety by twenty seven with a window line across the only block: at (5, 0) the factory's
    // block is y 0 to 20; a window line at (2, 14) stands in it with its ground, and a rack at the
    // front wall does not.
    let state = bigEmptyHall();
    state = withWindowLine(state, 1, { x: 2, y: 14 });
    placeEquipment(state, 'sheetRack', { x: 30, y: 24, id: 'kit-rack-front' });
    expect(lineSite(state, 'house')).toBeNull();
    const site = bestLineSite(state, 'house');
    expect(site?.fits).toBe(false);
    expect(site?.at).toEqual({ x: 5, y: 0 });
    expect(site?.items.sort()).toEqual(lineModulesOf('window').map((_, index) => `kit-line-1-${index + 1}`).sort());
    expect(site?.lines).toEqual([1]);
  });
});

describe('Room for on the hall (v119)', () => {
  it('draws nothing outside Set up hall and nothing with no kind asked', () => {
    const state = bigEmptyHall();
    expect(page(renderHall(state, { roomFor: 'house' })).querySelector('[data-room-for]')).toBeNull();
    expect(page(renderHall(state, { setup: true })).querySelector('[data-room-for]')).toBeNull();
    expect(page(renderHall(state, { setup: true, roomFor: null })).querySelector('[data-room-for]')).toBeNull();
  });

  it('draws the block green where the line fits, with its line, its stations and its lane', () => {
    resetRoomFor();
    const hall = page(renderHall(bigEmptyHall(), { setup: true, roomFor: 'house' }));
    const room = hall.querySelector('[data-room-for="house"]');
    expect(room?.getAttribute('data-room-fits')).toBe('yes');
    expect(room?.getAttribute('data-room-at')).toBe('5,0');
    expect(room?.querySelector('[data-room-block]')?.getAttribute('stroke')).toBe('var(--good)');
    expect(room?.querySelectorAll('[data-room-station]')).toHaveLength(6);
    expect(room?.querySelector('[data-room-lane]')).not.toBeNull();
    expect(room?.querySelector('[data-room-line]')).not.toBeNull();
    expect(room?.querySelectorAll('[data-in-the-way]')).toHaveLength(0);
    expect(room?.textContent).toBe('Timber frame house factory: it would go here, 84 m by 22 m');
  });

  it('draws it red where it does not, marks what stands in the way and names it', () => {
    resetRoomFor();
    let state = bigEmptyHall();
    state = withWindowLine(state, 1, { x: 2, y: 14 });
    const hall = page(renderHall(state, { setup: true, roomFor: 'house' }));
    const room = hall.querySelector('[data-room-for="house"]');
    expect(room?.getAttribute('data-room-fits')).toBe('no');
    expect(room?.querySelector('[data-room-block]')?.getAttribute('stroke')).toBe('var(--bad)');
    expect(Array.from(room?.querySelectorAll('[data-in-the-way]') ?? []).map((node) => node.getAttribute('data-in-the-way')).sort()).toEqual(
      lineModulesOf('window').map((_, index) => `kit-line-1-${index + 1}`).sort(),
    );
    expect(room?.textContent).toBe(
      'Timber frame house factory needs a clear 84 m by 22 m. In the way here: 6 modules of line 1; the ground of line 1',
    );
  });

  it('says the hall is too small where the block goes nowhere', () => {
    resetRoomFor();
    const hall = page(renderHall(emptyUnit(), { setup: true, roomFor: 'house' }));
    const room = hall.querySelector('[data-room-for="house"]');
    expect(room?.getAttribute('data-room-fits')).toBe('none');
    expect(room?.textContent).toBe('The hall is too small for a timber frame house factory: it needs a clear 84 m by 22 m');
  });
});

describe('the move and the clock (v119)', () => {
  it('moves a module of a line in half an hour and a machine in an hour', () => {
    expect(LINE_MODULE_MOVE_MINUTES).toBe(30);
    expect(MOVE_MINUTES_PER_ITEM).toBe(60);
    let state = bigEmptyHall();
    state = withWindowLine(state, 1, { x: 2, y: 14 });
    placeEquipment(state, 'sheetRack', { x: 30, y: 24, id: 'kit-rack-front' });
    const modules = lineModulesOf('window').map((_, index) => ({ itemId: `kit-line-1-${index + 1}` }));
    expect(moveMinutesOf(state, modules)).toBe(180);
    expect(moveMinutesOf(state, [{ itemId: 'kit-rack-front' }])).toBe(60);
    expect(moveMinutesOf(state, [...modules, { itemId: 'kit-rack-front' }])).toBe(240);
  });

  it('runs the clock for the player at the 100x chip', () => {
    expect(SKIP_SPEED).toBe(100);
  });

  it('keeps the house factory s delivery as it was', () => {
    expect(HOUSE_LINE_DELIVERY_DAYS).toBe(60);
  });
});
