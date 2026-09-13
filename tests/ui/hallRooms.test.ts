// @vitest-environment jsdom
// Walking into a room from the hall. The block a room is painted as is 2.7 m high, so the cells it
// stands on are nowhere near what the player aims at (CLAUDE.md T6 3.1).
import { afterAll, beforeAll, beforeEach, expect, it } from 'vitest';
import { currentState, mount, render } from '../../src/ui/app';
import { roomById } from '../../src/engine/constants';
import { tileToScreen } from '../../src/render/iso';
import { buyStartingKit } from '../helpers';

function required<T>(value: T | null | undefined): T {
  if (value === null || value === undefined) throw new Error('Missing test fixture');
  return value;
}

/** The browser CTM carries the uniform scale and the centred margins of the letterboxed scene. */
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
  mount(required(document.querySelector<HTMLElement>('#app')));
  const root = required(document.querySelector<HTMLElement>('#app'));
  required(root.querySelector<HTMLButtonElement>('[data-do="startGame"]')).click();
  const state = required(currentState());
  Object.assign(state, buyStartingKit(state));
  render();
  stubCtm();
});

/** Back in the hall, whatever the last test walked into. */
function startHall(): HTMLElement {
  const root = required(document.querySelector<HTMLElement>('#app'));
  const back = root.querySelector<HTMLButtonElement>('[data-do="setView"][data-view="hall"]');
  if (back !== null) back.click();
  return root;
}

beforeEach(() => {
  startHall();
});

/** A click at a point of the scene, dispatched on the hall itself: the painting is three images
 *  and would otherwise be the target of every click in the hall. */
function clickScene(root: HTMLElement, at: { x: number; y: number }): void {
  const svg = required(root.querySelector('.hall-view'));
  svg.dispatchEvent(
    new MouseEvent('click', {
      bubbles: true,
      clientX: (at.x + 150) * 2,
      clientY: (at.y + 60) * 2,
    }),
  );
}

function frontFaceCentre(id: 'wc' | 'office' | 'canteen'): { x: number; y: number } {
  const room = roomById(id);
  return tileToScreen(room.x + room.width / 2, room.y + room.depth, room.height / 2);
}

/** The line the hall writes under itself when the player looks into a room. The tooltips inside
 *  the scene carry the same words, so the note is read from its own element. */
function notes(root: HTMLElement): string {
  return Array.from(root.querySelectorAll('.view-note'))
    .map((element) => element.textContent ?? '')
    .join(' ');
}

it('opens the canteen, not the office, where the canteen is painted', () => {
  const root = startHall();
  clickScene(root, frontFaceCentre('canteen'));
  expect(root.querySelector('.hall-view')).not.toBeNull();
  expect(notes(root)).toContain(roomById('canteen').tooltip);
});

it('walks into the office where the office is painted', () => {
  const root = startHall();
  clickScene(root, frontFaceCentre('office'));
  expect(root.querySelector('.hall-view')).toBeNull();
  expect(root.querySelector('.office-layer')).not.toBeNull();
});

it('leaves the floor alone', () => {
  const root = startHall();
  clickScene(root, frontFaceCentre('canteen'));
  clickScene(root, tileToScreen(12, 8));
  expect(root.querySelector('.hall-view')).not.toBeNull();
  // The note the canteen left stands: an empty floor is not a room and answers nothing.
  expect(notes(root)).toContain(roomById('canteen').tooltip);
});
