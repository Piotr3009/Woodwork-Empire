/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// @vitest-environment jsdom
// Set up hall's `Room for` (v119) [PIOTR, 19.10: "the player is always going to be confused without
// a guide or a picture"]: three buttons, one a kind of line, each lighting while its block is drawn
// on the floor; the same button again puts it away, and Done puts it away too.

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { currentState, mount, render } from '../../src/ui/app';
import { LINE_KIND_ORDER, LINE_KINDS } from '../../src/engine/constants';
import type { GameState } from '../../src/engine/index';
import { buyStartingKit } from '../helpers';

function required<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error('Missing test fixture');
  return value;
}

function app(): HTMLElement {
  return required(document.querySelector<HTMLElement>('#app'));
}

function game(): GameState {
  return required(currentState());
}

function press(selector: string): void {
  const button = required(app().querySelector<HTMLButtonElement>(selector));
  button.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
  button.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
  button.click();
}

function lit(kind: string): boolean {
  return required(app().querySelector(`[data-do="roomFor"][data-kind="${kind}"]`)).className.split(' ').includes('is-on');
}

beforeAll(() => {
  document.body.innerHTML = '<div id="app"></div>';
  mount(app());
  press('[data-do="startGame"]');
  press('[data-do="setSpeed"][data-speed="1"]');
  Object.assign(game(), buyStartingKit(game()));
  game().enquiries = [];
  render();
});

afterAll(() => {
  document.body.innerHTML = '';
});

describe('Room for in Set up hall (v119)', () => {
  it('offers one button a kind of line, none lit, and draws nothing until one is pressed', () => {
    press('[data-do="startSetup"]');
    const buttons = Array.from(app().querySelectorAll('[data-do="roomFor"]'));
    expect(buttons.map((button) => button.getAttribute('data-kind'))).toEqual([...LINE_KIND_ORDER]);
    expect(buttons.map((button) => button.textContent)).toEqual(LINE_KIND_ORDER.map((kind) => LINE_KINDS[kind].name));
    for (const kind of LINE_KIND_ORDER) expect(lit(kind)).toBe(false);
    expect(app().querySelector('[data-room-for]')).toBeNull();
    expect(app().textContent).toContain('half an hour a module of a line');
    expect(app().textContent).toContain('Room for draws where a line would go');
  });

  it('lights the button pressed and draws that kind s block on the floor; the day one unit is too small for any', () => {
    press('[data-do="roomFor"][data-kind="house"]');
    expect(lit('house')).toBe(true);
    expect(lit('window')).toBe(false);
    const room = required(app().querySelector('[data-room-for="house"]'));
    expect(room.getAttribute('data-room-fits')).toBe('none');
    expect(room.textContent).toContain('too small for a timber frame house factory');
    // The same words in the bar, readable at any zoom.
    expect(app().querySelector('[data-room-words]')?.textContent).toBe(room.textContent);
    // Another kind takes the first's place.
    press('[data-do="roomFor"][data-kind="window"]');
    expect(lit('house')).toBe(false);
    expect(lit('window')).toBe(true);
    expect(app().querySelector('[data-room-for="house"]')).toBeNull();
    expect(app().querySelector('[data-room-for="window"]')).not.toBeNull();
  });

  it('puts the block away on the same button again, and on Done', () => {
    press('[data-do="roomFor"][data-kind="window"]');
    expect(lit('window')).toBe(false);
    expect(app().querySelector('[data-room-for]')).toBeNull();
    expect(app().querySelector('[data-room-words]')).toBeNull();
    press('[data-do="roomFor"][data-kind="door"]');
    expect(app().querySelector('[data-room-for="door"]')).not.toBeNull();
    press('[data-do="endSetup"]');
    expect(app().querySelector('[data-room-for]')).toBeNull();
    expect(app().querySelector('[data-do="roomFor"]')).toBeNull();
    // Opened again, nothing is lit.
    press('[data-do="startSetup"]');
    for (const kind of LINE_KIND_ORDER) expect(lit(kind)).toBe(false);
    press('[data-do="endSetup"]');
  });
});
