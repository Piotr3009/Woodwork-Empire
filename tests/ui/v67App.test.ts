// @vitest-environment jsdom
// v67 (PIOTR, 03.10) on the page itself: the Premises tile of the laptop, the Extend click, the
// hall the morning after, the Enlarge click once the floor beside the canteen is clear, and the
// canteen room with its sixteen lockers (eight at a time until v80). What each rule is, is held by
// tests/engine/v67.test.ts and tests/ui/v67.test.ts; this file is the clicks.

import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { currentState, mount, render } from '../../src/ui/app';
import { roomById } from '../../src/engine/constants';
import type { GameState } from '../../src/engine/index';
import { tileToScreen } from '../../src/render/iso';
import { buyStartingKit, nextDay } from '../helpers';

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

function dismissEvents(): void {
  let guard = 0;
  while (root().querySelector('[data-do="closeHouseCard"], [data-do="resolveEvent"]') !== null && guard < 50) {
    click('[data-do="closeHouseCard"], [data-do="resolveEvent"]');
    guard += 1;
  }
}

function closeModals(): void {
  let guard = 0;
  while (root().querySelector('.modal-layer [data-do="closeModal"]') !== null && guard < 10) {
    click('.modal-layer [data-do="closeModal"]');
    guard += 1;
  }
}

/** In the hall, at the fit: a click is aimed by the cell, and the camera is not part of the aim. */
function toTheHall(): void {
  closeModals();
  if (root().querySelector('[data-do="setView"][data-view="hall"]') !== null) {
    click('[data-do="setView"][data-view="hall"]');
  }
  if (root().querySelector('[data-do="zoomFit"]') !== null) click('[data-do="zoomFit"]');
}

/** The Premises page, from wherever the player is: the office, the laptop, its tile. */
function openPremises(): void {
  closeModals();
  if (root().querySelector('[data-do="setView"][data-view="office"]') !== null) {
    click('[data-do="setView"][data-view="office"]');
  }
  click('[data-office="laptop"]');
  click('[data-modal="laptop"] [data-tile="premises"]');
}

function card(id: string): Element {
  const found = root().querySelector(`[data-modal="laptop"] [data-premises="${id}"]`);
  if (found === null) throw new Error(`no ${id} card`);
  return found;
}

function counter(): string {
  return root().querySelector('[data-canteen-text="counter"]')?.textContent ?? '';
}

/** The browser CTM carries the uniform scale and the centred margins of the letterboxed scene,
 *  the same stub tests/ui/canteenRegions.test.ts aims its clicks through. */
function stubCtm(): void {
  Object.defineProperty(SVGSVGElement.prototype, 'getScreenCTM', {
    configurable: true,
    value: () => ({ inverse: () => ({ a: 0.5, d: 0.5, e: -150, f: -60 }) }),
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

/** A click on the hall at a point of the world, the way the hall resolves a room from it. */
function clickTheHallAt(x: number, y: number, z: number): void {
  const hall = root().querySelector('.hall-view');
  if (hall === null) throw new Error('not in the hall');
  const at = tileToScreen(x, y, z);
  hall.dispatchEvent(
    new MouseEvent('click', { bubbles: true, clientX: (at.x + 150) * 2, clientY: (at.y + 60) * 2 }),
  );
}

afterAll(() => {
  delete (SVGSVGElement.prototype as unknown as Record<string, unknown>).getScreenCTM;
  delete (SVGSVGElement.prototype as unknown as Record<string, unknown>).createSVGPoint;
});

beforeAll(() => {
  document.body.innerHTML = '<div id="app"></div>';
  mount(root());
  click('[data-do="startGame"]');
  click('[data-do="setSpeed"][data-speed="1"]');
  dismissEvents();
  // The day 1 kit in the hall, the laptop among it, and the money for a builder.
  Object.assign(game(), buyStartingKit(game()));
  game().cash = 300000;
  render();
  stubCtm();
});

describe('the Premises page, clicked', () => {
  it('opens behind its tile and pays for the extension on Extend', () => {
    openPremises();
    expect(root().querySelector('.screen-page-title')?.textContent).toBe('Premises');
    const before = game().cash;
    click('[data-do="extendUnit"]');
    expect(game().unit.extension).toBe('building');
    // The builder's 250,000 from Turn 27 and the landlord's 2,400 (CLAUDE.md T27 2.4).
    expect(game().cash).toBe(before - 252400);
    // The page says so, and the button is gone: it cannot be paid for twice.
    expect(card('extend').textContent).toContain('Being built');
    expect(root().querySelector('[data-do="extendUnit"]')).toBeNull();
    expect(card('canteen').querySelector('.reason')?.textContent).toBe('The extension opens in the morning');
  });

  it('has the hall at forty metres the next morning, painted on its longer canvas', () => {
    closeModals();
    Object.assign(game(), nextDay(game()));
    render();
    dismissEvents();
    expect(game().unit.extension).toBe('open');
    expect(game().unit.widthCells).toBe(40);
    toTheHall();
    const hall = root().querySelector('.hall-view');
    expect(hall?.getAttribute('viewBox')).toBe('-300 -144 1320 804');
    expect(hall?.querySelector('[data-layer="hallBackgroundWide"]')).not.toBeNull();
  });

  it('greys Enlarge while the saw stands beside the canteen, and enlarges it once the saw is moved', () => {
    openPremises();
    expect(card('extend').textContent).toContain('Extended');
    // The day one saw stands at (5, 0), on the two by four metres the canteen grows onto.
    expect(root().querySelector('[data-do="enlargeCanteen"]')).toBeNull();
    expect(card('canteen').querySelector('.reason')?.textContent).toBe(
      'Move the table saw off the 2 × 4 m beside it',
    );
    const saw = game().equipment.find((item) => item.specId === 'tableSaw');
    if (saw === undefined) throw new Error('no saw');
    saw.anchorX = 25;
    render();
    click('[data-do="enlargeCanteen"]');
    expect(game().unit.canteenWide).toBe(true);
    expect(card('canteen').textContent).toContain('Enlarged');
    expect(root().querySelector('[data-do="enlargeCanteen"]')).toBeNull();
  });
});

describe('the enlarged canteen, clicked', () => {
  it('is drawn enlarged on the hall, and a click on its new half walks into it', () => {
    toTheHall();
    expect(root().querySelector('.hall-view [data-layer="hallCanteenWide"]')).not.toBeNull();
    // A metre up the front face of the new half, which was open hall before.
    const built = roomById('canteen');
    clickTheHallAt(built.x + built.width + 1, built.y + built.depth, 1);
    expect(root().querySelector('[data-room-view="canteen"]')).not.toBeNull();
  });

  it('shows its sixteen lockers at once, with no line that turns a page', () => {
    // Eight at a time until v80, when the enlarged room got a picture of its own (PIOTR, 03.10).
    expect(root().querySelectorAll('[data-canteen-plate]')).toHaveLength(16);
    expect(counter()).toBe('0 of 16 lockers in use');
    expect(root().querySelector('[data-office="lockerPage"]')).toBeNull();
  });

  it('goes back to the hall by its door and is walked into again', () => {
    click('[data-office="door"]');
    expect(root().querySelector('.hall-view')).not.toBeNull();
    toTheHall();
    const built = roomById('canteen');
    clickTheHallAt(built.x + built.width / 2, built.y + built.depth, built.height / 2);
    expect(root().querySelector('[data-room-view="canteen"]')).not.toBeNull();
    expect(counter()).toBe('0 of 16 lockers in use');
  });
});
