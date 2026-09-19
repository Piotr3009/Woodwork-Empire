// @vitest-environment jsdom
// Rotate works (PIOTR, 19.09: "it does nothing"; CLAUDE.md T22 2.10). The button armed `ui.rotate`
// and the pick up then overwrote it with the item's own orientation, so the only thing that ever
// turned anything was R with the mouse held down. The armed turn is its own flag now: the button
// lights while it is set, the pick up applies it once and clears it, and two presses cancel.
//
// The drag is driven through the real DOM, the way `tests/ui/hallZoom.test.ts` drives it: a
// mousedown on the item, a mouseup where it is to land, and the camera's own transform between the
// two so the cell under the pointer is the cell the player sees.

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { currentState, mount, render } from '../../src/ui/app';
import { tileToScreen } from '../../src/render/iso';
import { canPlace } from '../../src/engine/layout';
import { itemFootprint } from '../../src/engine/machines';
import type { Equipment, GameState } from '../../src/engine/index';
import { buyStartingKit } from '../helpers';

function required<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error('Missing test fixture');
  return value;
}

/** The browser CTM carries the uniform scale and the centred margins of the letterboxed scene. */
const CTM = { a: 0.5, d: 0.5, e: -150, f: -60 };

function stubCtm(): void {
  Object.defineProperty(SVGSVGElement.prototype, 'getScreenCTM', {
    configurable: true,
    value: () => ({ inverse: () => CTM }),
  });
  Object.defineProperty(SVGSVGElement.prototype, 'createSVGPoint', {
    configurable: true,
    value: () => ({
      x: 0,
      y: 0,
      matrixTransform(matrix: { a: number; d: number; e: number; f: number }) {
        return { x: this.x * matrix.a + matrix.e, y: this.y * matrix.d + matrix.f };
      },
    }),
  });
}

function app(): HTMLElement {
  return required(document.querySelector<HTMLElement>('#app'));
}

function game(): GameState {
  return required(currentState());
}

/** The camera on the page now, read off the group the browser transforms. */
function camera(): { scale: number; x: number; y: number } {
  const transform = required(app().querySelector('.hall-scene')).getAttribute('transform') ?? '';
  const hit = required(/translate\(([-\d.]+),([-\d.]+)\) scale\(([\d.]+)\)/.exec(transform));
  return { x: Number(hit[1]), y: Number(hit[2]), scale: Number(hit[3]) };
}

function client(at: { x: number; y: number }): { clientX: number; clientY: number } {
  return { clientX: (at.x - CTM.e) / CTM.a, clientY: (at.y - CTM.f) / CTM.d };
}

/** A press on a control, pointer down and up, the way a browser does it. */
function press(selector: string): void {
  const button = required(app().querySelector<HTMLButtonElement>(selector));
  button.dispatchEvent(new MouseEvent('mousedown', { bubbles: true }));
  button.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
  button.click();
}

/** A mouse event over a cell of the hall, through the camera the page is showing. */
function mouse(kind: string, cell: { x: number; y: number }): MouseEvent {
  const on = camera();
  const point = tileToScreen(cell.x + 0.25, cell.y + 0.25);
  return new MouseEvent(kind, {
    bubbles: true,
    ...client({ x: on.scale * point.x + on.x, y: on.scale * point.y + on.y }),
  });
}

/** Picks an item up and puts it down again, on its own cell or on another one. */
function drag(item: Equipment, to?: { x: number; y: number }): void {
  const target = to ?? { x: item.anchorX, y: item.anchorY };
  required(app().querySelector(`[data-kit="${item.id}"]`)).dispatchEvent(
    mouse('mousedown', { x: item.anchorX, y: item.anchorY }),
  );
  if (to !== undefined) window.dispatchEvent(mouse('mousemove', target));
  window.dispatchEvent(mouse('mouseup', target));
}

function keyDown(key: string): void {
  window.dispatchEvent(new KeyboardEvent('keydown', { key, bubbles: true }));
}

/** The standard tool cabinet, which is two metres wide and so plainly a different shape turned.
 *  The day one kit buys the cheapest class of the ladder, which is a metre square and looks the
 *  same either way round, so this test stands a standard one in its place
 *  (CLAUDE.md T22 2.12). */
function cabinet(): Equipment {
  const standing = required(game().equipment.find((item) => item.specId === 'toolCabinet'));
  standing.variantId = 'standard';
  return standing;
}

function orientationOf(id: string): number {
  return required(game().equipment.find((item) => item.id === id)).orientation;
}

beforeAll(() => {
  document.body.innerHTML = '<div id="app"></div>';
  mount(app());
  press('[data-do="startGame"]');
  // The hall cannot be set out on a stopped clock (CLAUDE.md T7 3.10).
  press('[data-do="setSpeed"][data-speed="1"]');
  Object.assign(game(), buyStartingKit(game()));
  game().enquiries = [];
  render();
  stubCtm();
});

afterAll(() => {
  delete (SVGSVGElement.prototype as unknown as Record<string, unknown>).getScreenCTM;
  delete (SVGSVGElement.prototype as unknown as Record<string, unknown>).createSVGPoint;
});

/** A cell the cabinet fits on square to the walls and turned alike. The row the game lays the
 *  cabinets out on will not take a turned one: it is one cell deep with the workbench row directly
 *  under it, so a cabinet turned would stand on a bench and `canPlace` rightly refuses it
 *  (CLAUDE.md T21 2.13). The tests want a cell where both orientations are legal, so they ask the
 *  engine for one rather than naming one and hoping. */
function roomToTurn(item: Equipment): { x: number; y: number } {
  for (let y = 0; y < 8; y += 1) {
    for (let x = 3; x < 18; x += 1) {
      if (!canPlace(game(), item.id, x, y, 0).ok) continue;
      if (!canPlace(game(), item.id, x, y, 1).ok) continue;
      return { x, y };
    }
  }
  throw new Error('nowhere in the hall takes a cabinet both ways round');
}

beforeEach(() => {
  // Every test starts on the floor with the grid out, nothing armed, and the cabinet square to the
  // walls on a cell it can be turned on.
  if (app().querySelector('[data-do="startSetup"]') !== null) press('[data-do="startSetup"]');
  const armed = app().querySelector('[data-do="rotateGhost"]');
  if (armed !== null && armed.className.split(' ').includes('is-on')) {
    press('[data-do="rotateGhost"]');
  }
  const standing = cabinet();
  standing.orientation = 0;
  const spot = roomToTurn(standing);
  standing.anchorX = spot.x;
  standing.anchorY = spot.y;
  game().movedItems = [];
  render();
});

describe('Rotate with nothing in hand (CLAUDE.md T22 2.10)', () => {
  it('arms the turn, lights the button, and stands the next thing picked up at ninety degrees', () => {
    const before = cabinet();
    expect(before.orientation).toBe(0);
    expect(itemFootprint(before)).toEqual({ width: 2, depth: 1, height: 1 });
    press('[data-do="rotateGhost"]');
    // The button says the turn is armed, which is the whole of what Piotr could not see.
    expect(
      required(app().querySelector('[data-do="rotateGhost"]')).className.split(' '),
    ).toContain('is-on');
    drag(before);
    expect(orientationOf(before.id)).toBe(1);
    const turned = cabinet();
    expect(itemFootprint(turned)).toEqual({ width: 1, depth: 2, height: 1 });
    // And the arming is spent: the next thing he lifts comes up the way it is standing.
    expect(
      required(app().querySelector('[data-do="rotateGhost"]')).className.split(' '),
    ).not.toContain('is-on');
    drag(turned);
    expect(orientationOf(turned.id)).toBe(1);
  });

  it('cancels on a second press, which is what a toggle is for', () => {
    press('[data-do="rotateGhost"]');
    press('[data-do="rotateGhost"]');
    expect(
      required(app().querySelector('[data-do="rotateGhost"]')).className.split(' '),
    ).not.toContain('is-on');
    const standing = cabinet();
    drag(standing);
    expect(orientationOf(standing.id)).toBe(0);
  });

  it('arms on the R key as well, with nothing in hand', () => {
    keyDown('r');
    expect(
      required(app().querySelector('[data-do="rotateGhost"]')).className.split(' '),
    ).toContain('is-on');
    const standing = cabinet();
    drag(standing);
    expect(orientationOf(standing.id)).toBe(1);
  });
});

describe('Rotate with the item in hand (CLAUDE.md T22 2.10)', () => {
  it('turns what is in hand on the R key, which is the one thing that worked before tonight', () => {
    const standing = cabinet();
    required(app().querySelector(`[data-kit="${standing.id}"]`)).dispatchEvent(
      mouse('mousedown', { x: standing.anchorX, y: standing.anchorY }),
    );
    keyDown('r');
    window.dispatchEvent(mouse('mouseup', { x: standing.anchorX, y: standing.anchorY }));
    expect(orientationOf(standing.id)).toBe(1);
  });

  it('cannot be reached with the button, because a mouse up anywhere is the drop', () => {
    // Not a gap: it is what a real mouse does. A press on the Rotate button is a mouse up, and a
    // mouse up anywhere is the item going down, so the button can only ever be pressed with
    // nothing in hand. R is the one thing that turns what is held, which is exactly what the
    // brief says worked before tonight (CLAUDE.md T22 2.10).
    const standing = cabinet();
    required(app().querySelector(`[data-kit="${standing.id}"]`)).dispatchEvent(
      mouse('mousedown', { x: standing.anchorX, y: standing.anchorY }),
    );
    press('[data-do="rotateGhost"]');
    expect(orientationOf(standing.id)).toBe(0);
    // And the press that ended the drag armed the turn for the next thing picked up, which is the
    // button doing its own job with nothing in hand any more.
    expect(
      required(app().querySelector('[data-do="rotateGhost"]')).className.split(' '),
    ).toContain('is-on');
  });

  it('leaves a click that neither moved nor turned as exactly the click it was', () => {
    const standing = cabinet();
    drag(standing);
    expect(orientationOf(standing.id)).toBe(0);
    expect(game().movedItems).toEqual([]);
  });
});
