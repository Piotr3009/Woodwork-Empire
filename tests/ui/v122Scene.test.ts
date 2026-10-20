/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// @vitest-environment jsdom
// v122 [PIOTR, 20.10: "the graphic disappears and comes back, maybe the house line, the same problem
// the other lines had: the program works it out again every moment"]: the scene the page carries
// from page to page stays in the page. Until v122 the patch told the hall's `<svg>` and the empty
// `<div data-scene-slot>` of the fresh markup apart by their tags, took the hall out at every page
// written, once a game minute, and `mountScene` put it back: every picture in it painted again from
// nothing, and the big ones blinked.

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { currentState, mount, render } from '../../src/ui/app';
import { patchInto } from '../../src/ui/patch';
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

/** The nodes the page took out of `<main>` while `work` ran. */
function removedFromMain(work: () => void): Node[] {
  const main = required(app().querySelector('main'));
  const observer = new MutationObserver(() => undefined);
  observer.observe(main, { childList: true });
  work();
  const records = observer.takeRecords();
  observer.disconnect();
  return records.flatMap((record) => Array.from(record.removedNodes));
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

describe('the scene in the page (v122)', () => {
  it('is matched to the slot of the fresh markup whatever its tag, and left alone inside', () => {
    const holder = document.createElement('div');
    holder.innerHTML = '<main><svg data-scene-slot="1" data-scene="hall"><g data-live="1"><text>kept</text></g></svg><p>a</p></main>';
    const svg = required(holder.querySelector('svg'));
    const text = required(holder.querySelector('text'));
    patchInto(holder, '<main><div data-scene-slot="1"></div><p>b</p></main>');
    expect(holder.querySelector('svg')).toBe(svg);
    expect(holder.querySelector('text')).toBe(text);
    expect(svg.getAttribute('data-scene')).toBe('hall');
    expect(holder.querySelector('p')?.textContent).toBe('b');
    // One marked and the other not are never the same thing.
    patchInto(holder, '<main><div class="other"></div><p>b</p></main>');
    expect(holder.querySelector('svg')).toBeNull();
    expect(holder.querySelector('.other')).not.toBeNull();
  });

  it('keeps the hall in the page through every page written, the same node, never taken out', () => {
    const hall = required(app().querySelector('.hall-view'));
    const removed = removedFromMain(() => {
      for (let page = 0; page < 5; page += 1) {
        game().clock.minute += 1;
        render();
      }
    });
    expect(removed).toEqual([]);
    expect(app().querySelector('.hall-view')).toBe(hall);
    expect(hall.isConnected).toBe(true);
  });

  it('keeps the office in the page the same way, and changes the scene only when the view does', () => {
    press('[data-do="setView"][data-view="office"]');
    const office = required(app().querySelector('main [data-scene-slot]'));
    expect(office.classList.contains('hall-view')).toBe(false);
    const removed = removedFromMain(() => {
      for (let page = 0; page < 3; page += 1) render();
    });
    expect(removed).toEqual([]);
    expect(app().querySelector('main [data-scene-slot]')).toBe(office);
    // Back to the hall: a scene of another key takes the office's place, once.
    const back = removedFromMain(() => press('[data-do="setView"][data-view="hall"]'));
    expect(back).toEqual([office]);
    expect(app().querySelector('.hall-view')).not.toBeNull();
  });
});
