// @vitest-environment jsdom
// Chips over tips (PIOTR, 17.09; CLAUDE.md T18 2.4). Under the hall the first use tip is the last
// thing, at the very bottom, and the chips of T17 2.5 sit above it and never over it: the two are
// one column, both in its flow, so nothing overlaps whatever the tip's length.

import { readFileSync } from 'node:fs';
import { beforeAll, describe, expect, it } from 'vitest';
import { TIPS } from '../../src/engine/constants';
import { currentState, mount, render } from '../../src/ui/app';
import { buyStartingKit, fillBags, fillRack, newGame } from '../helpers';

const CSS = readFileSync('src/ui/styles.css', 'utf8');

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

function dismissEvents(): void {
  let guard = 0;
  while (
    root().querySelector('[data-do="closeHouseCard"], [data-do="resolveEvent"]') !== null &&
    guard < 50
  ) {
    click('[data-do="closeHouseCard"], [data-do="resolveEvent"]');
    guard += 1;
  }
}

function column(): Element {
  const node = root().querySelector('.view .hall-bottom');
  if (node === null) throw new Error('no column under the hall');
  return node;
}

/** A hall with the day 1 kit, a full rack and the bags full, so there is a problem chip to stand
 *  over the tip as well as the setting out chip. */
function busyHall(): void {
  const state = currentState();
  if (state === null) throw new Error('no game');
  Object.assign(state, fillBags(fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 20)));
  render();
}

beforeAll(() => {
  document.body.innerHTML = `<style>${CSS}</style><div id="app"></div>`;
  mount(root());
  click('[data-do="startGame"]');
  click('[data-do="setSpeed"][data-speed="1"]');
  dismissEvents();
  busyHall();
});

describe('what stands under the hall', () => {
  it('is one column, chips first and the tip last, with nothing floating over anything', () => {
    const node = column();
    const children = Array.from(node.children).map((child) => child.className);
    expect(children[0]).toBe('hall-chips');
    expect(children).toHaveLength(2);
    expect(node.lastElementChild?.className).toContain('tip-bubble');
    // Both are in the flow of that column: only the column itself is placed on the view.
    expect(getComputedStyle(node).position).toBe('absolute');
    expect(getComputedStyle(node).flexDirection).toBe('column');
    for (const child of Array.from(node.children)) {
      expect(getComputedStyle(child).position, child.className).toMatch(/^(static|relative|)$/);
    }
    // More than one chip, so the stack is a real stack and the tip is under all of it.
    expect(node.querySelectorAll('.hall-chip').length).toBeGreaterThan(1);
  });

  it('keeps that order whatever the tip says, however long it is', () => {
    const state = currentState();
    if (state === null) throw new Error('no game');
    const long = `${TIPS.hallCamera ?? ''} ${'and again '.repeat(40)}`;
    const original = TIPS.hallCamera;
    try {
      (TIPS as Record<string, string>).hallCamera = long;
      render();
      const node = column();
      expect(node.lastElementChild?.className).toContain('tip-bubble');
      expect(node.lastElementChild?.textContent).toContain('and again');
      expect(node.firstElementChild?.className).toBe('hall-chips');
    } finally {
      (TIPS as Record<string, string>).hallCamera = original ?? '';
      render();
    }
  });

  it('leaves the camera its own corner, and the tip stops short of it', () => {
    expect(root().querySelector('.view .hall-zoom')).not.toBeNull();
    expect(column().querySelector('.hall-zoom')).toBeNull();
    // The column is given the width of the view less the camera's corner, so a long tip cannot
    // run under the three camera chips either.
    const rule = CSS.slice(CSS.indexOf('.hall-bottom {'));
    expect(rule.slice(0, rule.indexOf('}'))).toContain('right: 76px;');
  });

  it('is gone from the office, where there is no hall to stand under', () => {
    click('[data-do="setView"][data-view="office"]');
    dismissEvents();
    expect(root().querySelector('.view .hall-bottom')).toBeNull();
    expect(root().querySelector('.view .tip-bubble')).toBeNull();
    click('[data-do="setView"][data-view="hall"]');
    dismissEvents();
    expect(root().querySelector('.view .hall-bottom')).not.toBeNull();
  });
});
