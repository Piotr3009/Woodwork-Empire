// @vitest-environment jsdom
// The screen stops blinking. The page is rebuilt from the state every game minute, so until now
// the painted hall and the office room were thrown away and built again once a second, and their
// pictures had to be fetched and decoded before they could paint. These tests hold on to the
// actual elements and check they are the same objects after the clock has run.

import { beforeAll, describe, expect, it } from 'vitest';
import { advanceMinutes, currentState, mount, render } from '../../src/ui/app';
import { formatTime } from '../../src/engine/clock';

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

/** The app holds one game, so the file starts one and every test says which view it wants. The
 *  top bar button is a toggle, so it only offers the view the player is not on. */
function show(view: 'hall' | 'office'): void {
  const toggle = root().querySelector(`[data-do="setView"][data-view="${view}"]`);
  if (toggle === null) return;
  toggle.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

beforeAll(() => {
  document.body.innerHTML = '<div id="app"></div>';
  mount(root());
  click('[data-do="startGame"]');
  // The hall cannot be set out on a stopped clock (CLAUDE.md T7 3.10).
  click('[data-do="setSpeed"][data-speed="1"]');
  // The office starts empty: no desk, no laptop, and the catalogue on the floor. This file is
  // about the room surviving a render, so it furnishes it first (CLAUDE.md T7 3.8).
  show('office');
  click('[data-office="catalogue"]');
  for (const specId of ['desk', 'chair', 'laptop']) {
    click('[data-do="catalogueTab"][data-id="computers"]');
    click(`[data-do="openFolder"][data-id="${specId}"]`);
    click(`[data-do="buyEquipment"][data-id="${specId}"]`);
    click('[data-do="closeFolder"]');
  }
  click('[data-do="closeModal"]');
  // The lorry comes at 08:00 tomorrow, so the room is furnished a day later (CLAUDE.md T9 3.1).
  nextMorning();
});

/** Plays through to 08:00 tomorrow, answering whatever the day asks. */
function nextMorning(): void {
  const day = currentState()?.clock.day ?? 1;
  let guard = 0;
  while ((currentState()?.clock.day ?? 0) === day && guard < 200) {
    guard += 1;
    let events = 0;
    while (root().querySelector('[data-do="resolveEvent"]') !== null && events < 80) {
      click('[data-do="resolveEvent"]');
      events += 1;
    }
    advanceMinutes(30);
  }
}

function layers(): Element[] {
  return Array.from(root().querySelectorAll('[data-layer]'));
}

describe('the painted hall survives a render', () => {
  it('keeps the very same picture elements as the clock runs', () => {
    show('hall');
    const before = layers();
    // The art is delivered, so there is something to keep.
    expect(before.length).toBeGreaterThan(0);
    advanceMinutes(1);
    advanceMinutes(1);
    render();
    const after = layers();
    expect(after).toHaveLength(before.length);
    for (let index = 0; index < before.length; index += 1) {
      // The same object, not an equal one: nothing was fetched or decoded again.
      expect(after[index], `layer ${index}`).toBe(before[index]);
    }
  });

  it('keeps the scene element itself, and still writes the live part again', () => {
    show('hall');
    const scene = root().querySelector('.hall-view');
    expect(scene).not.toBeNull();
    const clockBefore = root().querySelector('.topbar .date')?.textContent ?? '';
    advanceMinutes(30);
    expect(root().querySelector('.hall-view')).toBe(scene);
    // The page around the scene did move on.
    expect(root().querySelector('.topbar .date')?.textContent).not.toBe(clockBefore);
    // And so did the inside of the scene: the figures are drawn from the state every render.
    expect(scene?.querySelector('[data-live]')).not.toBeNull();
  });

  it('builds a new scene when the view changes, and again when it comes back', () => {
    show('hall');
    const hall = root().querySelector('.hall-view');
    show('office');
    expect(root().querySelector('.hall-view')).toBeNull();
    const room = root().querySelector('.office-room');
    expect(room).not.toBeNull();
    advanceMinutes(5);
    // The room is kept across the minutes, pictures and all.
    expect(root().querySelector('.office-room')).toBe(room);
    show('hall');
    const backAgain = root().querySelector('.hall-view');
    expect(backAgain).not.toBeNull();
    expect(backAgain).not.toBe(hall);
  });
});

describe('the office room survives a render', () => {
  it('keeps the stack and its scale, and only writes the clock again', () => {
    show('office');
    const stack = root().querySelector('.office-stack');
    const images = layers();
    expect(stack).not.toBeNull();
    expect(images.length).toBe(3);
    const scaleBefore = stack?.getAttribute('style');
    const before = root().querySelector('[data-office-text="clock"]')?.textContent;
    advanceMinutes(65);
    expect(root().querySelector('.office-stack')).toBe(stack);
    for (let index = 0; index < images.length; index += 1) {
      expect(layers()[index], `layer ${index}`).toBe(images[index]);
    }
    // The scale the renderer wrote is untouched: nothing rewrites it behind the player's back.
    expect(root().querySelector('.office-stack')?.getAttribute('style')).toBe(scaleBefore);
    // The clock is live text, so it did move on, and it says what the engine says.
    const after = root().querySelector('[data-office-text="clock"]')?.textContent;
    expect(after).not.toBe(before);
    expect(after).toBe(formatTime(currentState()?.clock.minute ?? -1));
  });

  it('keeps the regions in the shell, so they are never rebuilt under the mouse', () => {
    show('office');
    const laptop = root().querySelector('[data-office="laptop"]');
    expect(laptop).not.toBeNull();
    advanceMinutes(10);
    expect(root().querySelector('[data-office="laptop"]')).toBe(laptop);
    // And it still opens its modal after all that.
    click('[data-office="laptop"]');
    expect(root().querySelector('.modal-layer .modal')?.getAttribute('data-modal')).toBe('laptop');
  });
});
