// @vitest-environment jsdom
// The strip under the hall is gone (PIOTR, 16.09, docs/mockups/t17/hall-strip-C.html, variant C;
// CLAUDE.md T17 2.5): what has to be done floats over the floor as dark chips in the hand, bottom
// left, one chip a thing and nothing else, and the camera is three small chips bottom right. A
// clean hall with nothing waiting shows no chip but the setting out.

import { beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { CLEANING_MINUTES, SERVICE_INTERVAL_HOURS } from '../../src/engine/constants';
import { currentState, mount, render } from '../../src/ui/app';
import type { GameState } from '../../src/engine/index';
import { buyStartingKit, fillBags, newGame } from '../helpers';

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

function game(): GameState {
  const state = currentState();
  if (state === null) throw new Error('no game');
  return state;
}

/** The chips over the floor, in the order they are stacked. */
function chips(): string[] {
  return Array.from(root().querySelectorAll('.hall-chip')).map(
    (element) => (element.textContent ?? '').trim(),
  );
}

/** A hall with the day 1 kit in it, on the hall view, with nothing wrong with it. */
function quietHall(): void {
  Object.assign(game(), buyStartingKit(newGame({ difficulty: 'veryEasy' })));
  game().enquiries = [];
  // The hall is the view the game opens on; the button on the bar is the way back to it.
  if (root().querySelector('[data-do="setView"][data-view="hall"]') !== null) {
    click('[data-do="setView"][data-view="hall"]');
  }
  render();
}

beforeAll(() => {
  document.body.innerHTML = '<div id="app"></div>';
  mount(root());
  click('[data-do="startGame"]');
});

beforeEach(() => quietHall());

describe('the chips over the floor', () => {
  it('shows nothing but the setting out in a clean hall with nothing waiting', () => {
    expect(root().querySelector('.hall-chips')).not.toBeNull();
    expect(chips()).toEqual(['Set up hall']);
    // And none of the bare lines the old strip carried.
    const page = root().innerHTML;
    expect(page).not.toContain('Hall: clean');
    expect(page).not.toContain('The rack is nearly empty');
    expect(page).not.toContain('No job has its material in the hall yet');
  });

  it('puts the Clean up button on the dirty hall’s own chip', () => {
    game().dust = 75;
    render();
    const dirty = chips().find((text) => text.includes('The hall is dirty'));
    expect(dirty).toBeDefined();
    expect(dirty).toContain(`Clean up · ${CLEANING_MINUTES} min`);
    expect(root().querySelector('.hall-chip [data-do="startCleaning"]')).not.toBeNull();
  });

  it('puts Empty bags on the full store’s chip', () => {
    Object.assign(game(), fillBags(game()));
    render();
    const bags = chips().find((text) => text.includes('The bags are full'));
    expect(bags).toBeDefined();
    expect(bags).toContain('Empty bags');
    expect(root().querySelector('.hall-chip [data-do="emptyBags"]')).not.toBeNull();
  });

  it('names the machine that is due a service, with the button that does it', () => {
    const saw = game().equipment.find((item) => item.specId === 'tableSaw');
    if (saw === undefined) throw new Error('no saw in the hall');
    // Long past its service interval, with the hours on its own clock.
    saw.hoursUsed = SERVICE_INTERVAL_HOURS * 2;
    saw.serviceHours = 0;
    render();
    const due = chips().find((text) => text.includes('due a service'));
    expect(due).toBeDefined();
    expect(due).toContain('table saw');
    expect(
      root().querySelector(`.hall-chip [data-do="serviceMachine"][data-id="${saw.id}"]`),
    ).not.toBeNull();
  });

  it('keeps the camera to three small chips, and the wheel to a tip said once', () => {
    const zoom = root().querySelector('.hall-zoom');
    expect(zoom).not.toBeNull();
    expect(Array.from(zoom?.querySelectorAll('button') ?? []).map((button) => button.textContent))
      .toEqual(['Fit', '+', '-']);
    expect(root().innerHTML).not.toContain('Wheel to zoom, drag the floor to move. Now at');
    // The sentence is the first use bubble on the hall, and it goes when it is dismissed.
    const bubble = root().querySelector('[data-tip="hallCamera"]');
    expect(bubble?.textContent ?? '').toContain('wheel zooms the hall');
    click('[data-do="dismissTip"][data-id="hallCamera"]');
    expect(root().querySelector('[data-tip="hallCamera"]')).toBeNull();
  });
});
