/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// @vitest-environment jsdom
// v104: the page's side of the game made light again on a big company [PIOTR, 18.10: "every now
// and then the production lines disappear"; "do all these fixes here so it flies"]. The hall's
// drawables matched by what they are drawn for and moved, never turned into their neighbours; a
// drawable whose markup has not changed left alone inside; the engineers put among the drawables
// by the cell they are on; and the page of a minute written in the frame after the minute.

import { afterEach, describe, expect, it, vi } from 'vitest';
import { LINE_MODULES } from '../../src/engine/constants';
import type { GameState, Worker } from '../../src/engine/index';
import { lineState } from '../../src/engine/lineContract';
import { whilePinned } from '../../src/engine/pinned';
import { engineersArt, resetEngineers } from '../../src/render/engineers';
import { hallScene } from '../../src/render/hall';
import { currentState, mount, render } from '../../src/ui/app';
import { patchInto } from '../../src/ui/patch';
import { act, buyStartingKit, newGame, nextDay, placeEquipment, testJoiner, withAir } from '../helpers';

const SVG = 'http://www.w3.org/2000/svg';

/** An SVG group on the page, the shape of the hall's live layer. */
function layer(html: string): SVGGElement {
  const svg = document.createElementNS(SVG, 'svg');
  const group = document.createElementNS(SVG, 'g');
  svg.appendChild(group);
  document.body.appendChild(svg);
  patchInto(group, html);
  return group;
}

/** A piece of kit as the hall draws it: its picture inside it. */
function kit(id: string, extra = ''): string {
  return `<g data-kit="${id}"${extra}><image href="${id}.png" x="0" y="0"></image></g>`;
}

/** What the page did to the layer while `work` ran. */
function watched(target: Node, work: () => void): MutationRecord[] {
  const observer = new MutationObserver(() => undefined);
  observer.observe(target, { subtree: true, attributes: true, childList: true });
  work();
  const records = observer.takeRecords();
  observer.disconnect();
  return records;
}

afterEach(() => {
  document.body.innerHTML = '';
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('the hall s drawables under the patch (v104)', () => {
  it('are matched by what they are drawn for and moved when the order changes, their pictures never written again', () => {
    const group = layer(kit('a') + kit('b') + kit('c'));
    const [a, b, c] = Array.from(group.children);
    const records = watched(group, () => patchInto(group, kit('c') + kit('a') + kit('b')));
    expect(Array.from(group.children)).toEqual([c, a, b]);
    expect(records.filter((record) => record.type === 'attributes')).toEqual([]);
    expect(group.querySelector('[data-kit="a"] image')?.getAttribute('href')).toBe('a.png');
  });

  it('moves the one that moved and nothing else', () => {
    const ids = Array.from({ length: 50 }, (_, index) => `k${index}`);
    const group = layer(ids.map((id) => kit(id)).join(''));
    const before = Array.from(group.children);
    const order = ids.slice();
    order.splice(5, 0, ...order.splice(40, 1));
    const records = watched(group, () => patchInto(group, order.map((id) => kit(id)).join('')));
    expect(Array.from(group.children).map((node) => node.getAttribute('data-kit'))).toEqual(order);
    expect(Array.from(group.children).every((node) => before.includes(node))).toBe(true);
    const moved = records.filter((record) => record.type === 'childList');
    expect(moved.reduce((total, record) => total + record.addedNodes.length, 0)).toBe(1);
  });

  it('adds the new, drops the gone, matches two drawn for one thing in their order and what says nothing in its own', () => {
    const group = layer(
      '<text>one</text>' + kit('a') + '<g data-canteen-kit="x" data-part="1"></g><g data-canteen-kit="x" data-part="2"></g>' + kit('b'),
    );
    const [text, a, first, second] = Array.from(group.childNodes);
    patchInto(
      group,
      kit('b') + '<g data-canteen-kit="x" data-part="1"></g><g data-canteen-kit="x" data-part="2"></g><text>two</text>' + kit('n'),
    );
    const now = Array.from(group.childNodes);
    expect(now).toHaveLength(5);
    expect(now).not.toContain(a);
    expect(now[1]).toBe(first);
    expect(now[2]).toBe(second);
    expect(now[3]).toBe(text);
    expect(text?.textContent).toBe('two');
    expect((now[4] as Element).getAttribute('data-kit')).toBe('n');
  });

  it('leaves the inside of a drawable whose mark has not changed as the frame has moved it, and writes it again when it has', () => {
    const drawn = (mark: string, depth: number): string =>
      `<g data-depth="${depth}" data-sig="${mark}" data-kit="a"><svg class="machine-sheet" data-frame="0"></svg></g>`;
    const group = layer(drawn('one', 10));
    const sheet = group.querySelector('.machine-sheet');
    sheet?.setAttribute('data-frame', '4');
    patchInto(group, drawn('one', 12));
    expect(group.querySelector('.machine-sheet')).toBe(sheet);
    expect(sheet?.getAttribute('data-frame')).toBe('4');
    expect(group.querySelector('[data-kit="a"]')?.getAttribute('data-depth')).toBe('12');
    patchInto(group, drawn('two', 12));
    expect(group.querySelector('.machine-sheet')?.getAttribute('data-frame')).toBe('0');
  });
});

/** The 800 m2 hall with the whole line standing and two engineers on duty for it. */
function withLine(): GameState {
  let state = newGame({ difficulty: 'veryEasy' });
  state.cash = 9000000;
  state = nextDay(act(state, { type: 'EXTEND_UNIT' }));
  state = nextDay(act(state, { type: 'EXTEND_UNIT', stage: 'second' }));
  state = withAir(buyStartingKit(state), 'industrial');
  LINE_MODULES.forEach((id, index) => placeEquipment(state, id, { x: 2 + 6 * index, y: 14, id: `kit-line-${index + 1}` }));
  lineState(state, 1);
  for (const id of ['eng-1', 'eng-2']) {
    const engineer: Worker = { ...testJoiner(id, id), role: 'lineEngineer', tier: null, rate: 0, monthlyWage: 15000 };
    state.workers.push(engineer);
  }
  state.speed = 1;
  state.activeEvent = null;
  state.eventQueue = [];
  return state;
}

describe('the hall s live layer (v104)', () => {
  it('marks every drawable with its depth and the mark of its markup: the same hall the same marks, a machine moved a new one', () => {
    const state = withLine();
    const marks = (): Map<string, string> => {
      const group = layer(whilePinned(state, () => hallScene(state).live));
      const found = new Map<string, string>();
      for (const node of Array.from(group.children)) {
        if (!node.hasAttribute('data-depth')) continue;
        expect(node.getAttribute('data-sig')).toMatch(/^[0-9a-z]+$/);
        const kitId = node.getAttribute('data-kit');
        if (kitId !== null) found.set(kitId, node.getAttribute('data-sig') ?? '');
      }
      document.body.innerHTML = '';
      return found;
    };
    const first = marks();
    expect(first.size).toBeGreaterThan(6);
    expect(marks()).toEqual(first);
    const saw = state.equipment.find((item) => item.specId === 'tableSaw');
    if (saw === undefined) throw new Error('the saw is wanted');
    saw.anchorY += 1;
    const after = marks();
    expect(after.get(saw.id)).not.toBe(first.get(saw.id));
    expect(after.get('kit-line-1')).toBe(first.get('kit-line-1'));
  });

  it('puts an engineer among the drawables by the middle of the cell he is on', () => {
    resetEngineers();
    const drawn = engineersArt(withLine());
    expect(drawn).toHaveLength(2);
    for (const engineer of drawn) {
      expect(engineer.feet.x - Math.floor(engineer.feet.x)).toBe(0.5);
      expect(engineer.feet.y - Math.floor(engineer.feet.y)).toBe(0.5);
    }
  });
});

describe('the page of a minute (v104)', () => {
  it('is written in the frame after the one the minute ran in', () => {
    let loop: FrameRequestCallback | null = null;
    vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
      loop = callback;
      return 1;
    });
    vi.spyOn(performance, 'now').mockReturnValue(0);
    try {
      localStorage.clear();
    } catch {
      // No storage: nothing kept.
    }
    document.body.innerHTML = '<div id="app"></div>';
    const root = document.querySelector<HTMLElement>('#app');
    if (root === null) throw new Error('the app root is wanted');
    mount(root);
    root.querySelector<HTMLButtonElement>('[data-do="startGame"]')?.click();
    const state = currentState();
    if (state === null) throw new Error('a game is wanted');
    Object.assign(state, { speed: 10, activeEvent: null, eventQueue: [] });
    render();
    const clock = (): string => root.querySelector('.date')?.textContent ?? '';
    const before = clock();
    const next = loop as FrameRequestCallback | null;
    if (next === null) throw new Error('the loop asked for a frame');
    // A tenth of a second at 10x is a game minute: it runs in this frame, and its page waits.
    next(100);
    expect(currentState()?.clock.minute).toBe(state.clock.minute + 1);
    expect(clock()).toBe(before);
    // The next frame writes it.
    next(116);
    expect(clock()).not.toBe(before);
  });
});
