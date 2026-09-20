// @vitest-environment jsdom
// What the canteen's regions do on the page: the block on the hall walks into the room, the door
// walks back out of it, and the lockers open the team page, because the lockers are the men's
// (PIOTR, 20.09; CLAUDE.md T23 2.9). The rectangles themselves are held to the art side's
// measurement by tests/engine/canteenRegions.test.ts and drawn by
// tests/render/canteenRoom.test.ts; this file is the click.

import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { currentState, mount, render } from '../../src/ui/app';
import { roomById } from '../../src/engine/constants';
import { tileToScreen } from '../../src/render/iso';
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

function openModalId(): string | null {
  return root().querySelector('.modal-layer .modal')?.getAttribute('data-modal') ?? null;
}

/** The browser CTM carries the uniform scale and the centred margins of the letterboxed scene,
 *  the same stub tests/ui/hallRooms.test.ts aims its clicks through. */
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

afterAll(() => {
  delete (SVGSVGElement.prototype as unknown as Record<string, unknown>).getScreenCTM;
  delete (SVGSVGElement.prototype as unknown as Record<string, unknown>).createSVGPoint;
});

beforeAll(() => {
  document.body.innerHTML = '<div id="app"></div>';
  mount(root());
  click('[data-do="startGame"]');
  const state = currentState();
  if (state === null) throw new Error('no game');
  Object.assign(state, buyStartingKit(state));
  render();
  stubCtm();
});

/** In the hall, at the fit, with nothing standing over it, whatever the last test left. */
beforeEach(() => {
  const close = root().querySelector('.modal-layer [data-do="closeModal"]');
  if (close !== null) close.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  const back = root().querySelector('[data-do="setView"][data-view="hall"]');
  if (back !== null) back.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  const fit = root().querySelector('[data-do="zoomFit"]');
  if (fit !== null) fit.dispatchEvent(new MouseEvent('click', { bubbles: true }));
});

/** Walks into the canteen the one way there is: a click on the block the canteen is painted as,
 *  which the hall resolves from the room footprints (CLAUDE.md T6 3.1, T23 2.9). */
function walkIn(): void {
  const hall = root().querySelector('.hall-view');
  if (hall === null) throw new Error('not in the hall');
  const room = roomById('canteen');
  const at = tileToScreen(room.x + room.width / 2, room.y + room.depth, room.height / 2);
  hall.dispatchEvent(
    new MouseEvent('click', {
      bubbles: true,
      clientX: (at.x + 150) * 2,
      clientY: (at.y + 60) * 2,
    }),
  );
}

describe('walking into the canteen and out of it', () => {
  it('opens the room on the block, and leaves the hall behind', () => {
    expect(root().querySelector('[data-room-view="canteen"]')).toBeNull();
    walkIn();
    expect(root().querySelector('.hall-view')).toBeNull();
    expect(root().querySelector('[data-room-view="canteen"]')).not.toBeNull();
    // The room the player is in is the canteen and not the office: two rooms, one shell.
    expect(root().querySelector('[data-room-view="office"]')).toBeNull();
    expect(root().querySelectorAll('[data-canteen-plate]')).toHaveLength(8);
    expect(root().querySelector('[data-canteen-text="counter"]')?.textContent).toContain(
      'of 8 lockers in use',
    );
  });

  it('takes the door back to the hall, exactly as the office door does', () => {
    walkIn();
    click('[data-office="door"]');
    expect(root().querySelector('.hall-view')).not.toBeNull();
    expect(root().querySelector('[data-room-view="canteen"]')).toBeNull();
  });

  it('opens the team page on the lockers, and leaves the player in the room behind it', () => {
    walkIn();
    click('[data-office="lockers"]');
    expect(openModalId()).toBe('laptop');
    expect(root().querySelector('.screen-page-title')?.textContent).toContain('Team');
    // The modal stands over the canteen: shutting it puts the player back in the room he was in.
    click('.modal-layer [data-do="closeModal"]');
    expect(openModalId()).toBeNull();
    expect(root().querySelector('[data-room-view="canteen"]')).not.toBeNull();
  });

  it('does nothing at all on the kitchenette and the table', () => {
    walkIn();
    for (const id of ['kitchen', 'table']) {
      const quiet = root().querySelector(`[data-office="${id}"]`);
      expect(quiet, id).not.toBeNull();
      expect(quiet?.getAttribute('data-do'), id).toBeNull();
      quiet?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(openModalId(), id).toBeNull();
      expect(root().querySelector('[data-room-view="canteen"]'), id).not.toBeNull();
    }
  });

  it('keeps the top bar right: one button, and it says Hall from inside the canteen', () => {
    walkIn();
    const buttons = Array.from(root().querySelectorAll('[data-do="setView"]'));
    expect(buttons).toHaveLength(1);
    expect(buttons[0]?.getAttribute('data-view')).toBe('hall');
    expect(buttons[0]?.textContent).toContain('Hall');
  });
});
