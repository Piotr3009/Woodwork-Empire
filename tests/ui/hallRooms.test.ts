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

/** Back in the hall, whatever the last test walked into, and at the fit. The hall opens a fifth
 *  past the fit from Turn 10 (CLAUDE.md T10 3.9), and these tests aim at points of the scene by
 *  hand, so they press Fit and aim at the scene as it is drawn at 1.0. */
function startHall(): HTMLElement {
  const root = required(document.querySelector<HTMLElement>('#app'));
  const back = root.querySelector<HTMLButtonElement>('[data-do="setView"][data-view="hall"]');
  if (back !== null) back.click();
  const fit = root.querySelector<HTMLButtonElement>('[data-do="zoomFit"]');
  if (fit !== null) fit.click();
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

/** A point high on a room's front face, clear of the door in the middle of it. The office door is
 *  a control of its own from Turn 10, and from Turn 14 it walks into the office like the block
 *  around it (CLAUDE.md T10 3.6, T14 2.3). */
function frontFaceAboveTheDoor(id: 'wc' | 'office' | 'canteen'): { x: number; y: number } {
  const room = roomById(id);
  return tileToScreen(room.x + room.width / 2, room.y + room.depth, room.height - 0.2);
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

it('walks into the office where the office is painted, clear of its door', () => {
  const root = startHall();
  clickScene(root, frontFaceAboveTheDoor('office'));
  expect(root.querySelector('.hall-view')).toBeNull();
  expect(root.querySelector('.office-layer')).not.toBeNull();
});

it('walks into the office on the office door itself, the same as the Office button', () => {
  // The door is a control of its own, and what is behind it is the office: Turn 10 put the Team
  // board there and Piotr reversed it (PIOTR, 15.09; CLAUDE.md T14 2.3).
  const root = startHall();
  const door = required(root.querySelector<SVGElement>('[data-door="office"]'));
  expect(door.querySelector('title')?.textContent).toBe('To the office');
  door.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  expect(root.querySelector('.hall-view')).toBeNull();
  expect(root.querySelector('.office-layer')).not.toBeNull();
  expect(root.querySelector('[data-modal="team"]')).toBeNull();
  // Exactly what the top bar's button does: back in the hall, the button lands in the same room.
  required(root.querySelector<HTMLButtonElement>('[data-do="setView"][data-view="hall"]')).click();
  expect(root.querySelector('.hall-view')).not.toBeNull();
  required(root.querySelector<HTMLButtonElement>('[data-do="setView"][data-view="office"]')).click();
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

it('opens the list of what is on order when the board by the door is clicked', () => {
  // The board hangs on the left wall beside the personnel door, and it is a control of its own,
  // not a click on the painting behind it (PIOTR, 13.09; CLAUDE.md T9 3.2).
  const root = startHall();
  const board = required(root.querySelector<SVGElement>('[data-pinboard="1"]'));
  board.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  expect(root.querySelector('[data-modal="shopping"]')).not.toBeNull();
  required(root.querySelector<HTMLButtonElement>('[data-modal="shopping"] [data-do="closeModal"]')).click();
});
