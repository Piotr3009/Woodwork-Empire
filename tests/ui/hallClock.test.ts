// @vitest-environment jsdom
// Two things Piotr asked for after playing Turn 8: the clock the hall did not have, and the end of
// the transparent glow that blinked with it (PIOTR, 13.09; CLAUDE.md T9 3.4, 3.5).

import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { advanceMinutes, currentState, mount, render } from '../../src/ui/app';
import { formatTime } from '../../src/engine/clock';
import {
  HALL_CLOCK_SIZE,
  HALL_CLOCK_WALL,
  HALL_NAME_WALL,
  HALL_NAME_WIDTH,
  wallMatrix,
} from '../../src/render/hall';
import { TILE_RISE, tileToScreen } from '../../src/render/iso';
import { buyStartingKit } from '../helpers';

function root(): HTMLElement {
  const element = document.querySelector('#app');
  if (!(element instanceof HTMLElement)) throw new Error('no root');
  return element;
}

function click(selector: string): void {
  const element = root().querySelector(selector);
  if (element === null) throw new Error(`nothing to click: ${selector}`);
  element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

function inTheHall(): void {
  const back = root().querySelector('[data-do="setView"][data-view="hall"]');
  if (back !== null) click('[data-do="setView"][data-view="hall"]');
}

function inTheOffice(): void {
  const through = root().querySelector('[data-do="setView"][data-view="office"]');
  if (through !== null) click('[data-do="setView"][data-view="office"]');
}

function clockNode(): Element {
  const node = root().querySelector('.hall-clock');
  if (node === null) throw new Error('no clock on the hall wall');
  return node;
}

beforeAll(() => {
  document.body.innerHTML = '<div id="app"></div>';
  mount(root());
  click('[data-do="startGame"]');
  click('[data-do="setSpeed"][data-speed="1"]');
  const state = currentState();
  if (state === null) throw new Error('no game');
  Object.assign(state, buyStartingKit(state));
  render();
});

describe('the clock on the hall wall', () => {
  it('stands beside the company name, clear of its box, lettered into the wall', () => {
    // Right of the name and 1.6 m up, taken off the name's own box so the two cannot meet
    // (CLAUDE.md T9 3.5).
    const halfName = HALL_NAME_WIDTH / TILE_RISE / 2;
    expect(HALL_CLOCK_WALL.x).toBeGreaterThan(HALL_NAME_WALL.x + halfName);
    expect(HALL_CLOCK_WALL.z).toBe(1.6);
    inTheHall();
    const clock = clockNode();
    // The same matrix the name beside it is lettered with: the rear wall's own plane.
    expect(clock.getAttribute('transform')).toBe(
      wallMatrix(tileToScreen(HALL_CLOCK_WALL.x, 0, HALL_CLOCK_WALL.z)),
    );
    expect(clock.getAttribute('font-size')).toBe(String(HALL_CLOCK_SIZE));
  });

  it('shows the game time and keeps its own node as the minutes go by', () => {
    inTheHall();
    const clock = clockNode();
    const state = currentState();
    if (state === null) throw new Error('no game');
    expect(clock.textContent).toBe(formatTime(state.clock.minute));
    const before = clock.textContent;
    advanceMinutes(45);
    // The very same element, with the new time written into the text node it already had
    // (CLAUDE.md T9 3.8).
    expect(clockNode()).toBe(clock);
    expect(clock.textContent).not.toBe(before);
    expect(clock.textContent).toBe(formatTime(currentState()?.clock.minute ?? -1));
  });
});

describe('the outline on the things that can be clicked', () => {
  it('is in the stylesheet, as :hover with a 120 ms transition', () => {
    const css = readFileSync('src/ui/styles.css', 'utf8');
    expect(css).toContain('.office-region:hover');
    // The white box is gone: an orange outline and nothing else (PIOTR, 15.09; T11 3.5).
    expect(css).toContain('transition: outline-color 120ms ease;');
    expect(css).toContain('transition: fill 120ms ease;');
  });

  it('is nowhere in the markup the game writes', () => {
    inTheOffice();
    const page = root().innerHTML;
    // No hover class and no inline hover style anywhere on the room: the browser does it with
    // :hover and a 120 ms transition, and the game writes nothing about it (CLAUDE.md T9 3.4).
    expect(page).not.toContain('is-hover');
    expect(page).not.toContain('hover');
    for (const region of Array.from(root().querySelectorAll('[data-office]'))) {
      expect(region.getAttribute('style') ?? '').not.toContain('background');
    }
  });

  it('leaves every region exactly as it was 60 ticks later, node and markup alike', () => {
    inTheOffice();
    const regions = Array.from(root().querySelectorAll('[data-office]'));
    expect(regions.length).toBeGreaterThan(0);
    const before = regions.map((region) => region.outerHTML);
    for (let tick = 0; tick < 60; tick += 1) advanceMinutes(1);
    const after = Array.from(root().querySelectorAll('[data-office]'));
    // The same elements, byte for byte and node for node: nothing about them is written again, so
    // there is nothing for the glow to blink with (CLAUDE.md T9 3.4).
    expect(after.map((region) => region.outerHTML)).toEqual(before);
    after.forEach((region, index) => {
      expect(region).toBe(regions[index]);
    });
  });
});
