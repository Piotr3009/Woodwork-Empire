// @vitest-environment jsdom
// A figure is painted where his feet are (PIOTR; CLAUDE.md T20 2.11, REPORT-T19 "What was not done
// tonight"). The hall used to sort a man by the depth of the station he was walking TO, so for the
// whole of a walk he was painted in the order of where he was going: he passed behind a machine he
// should have been in front of and snapped into place on arrival. The order is now the cell his
// feet are on, checked every frame and changed only where it has crossed a neighbour.

import { beforeEach, describe, expect, it } from 'vitest';
import { STATION_BENCH } from '../../src/engine/stations';
import { depthKey } from '../../src/render/iso';
import { renderHall } from '../../src/render/hall';
import {
  FIGURE_DEPTH_OFFSET,
  figureDepth,
  resetWalkers,
  resortFigures,
  stepWalkers,
  syncWalkers,
  walkerOf,
} from '../../src/render/walkers';
import type { GameState } from '../../src/engine/index';
import { buyStartingKit, newGame } from '../helpers';

/** The fake clock: real milliseconds, a second a tick, which is a cell a tick at the walker's
 *  own pace. */
let clockMs = 0;
function tick(root: ParentNode): void {
  clockMs += 1000;
  stepWalkers(root, clockMs);
}

function page(state: GameState): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = `<svg>${renderHall(state)}</svg>`;
  return holder;
}

/** Where the owner's figure stands among its siblings, against the saw's own drawable. */
function order(root: ParentNode): { owner: number; saw: number } {
  const live = root.querySelector('[data-live="1"]');
  if (live === null) throw new Error('no live layer');
  const nodes = Array.from(live.children);
  const owner = nodes.findIndex((node) => node.getAttribute('data-figure') === 'owner');
  const saw = nodes.findIndex((node) => node.getAttribute('data-sprite') === 'tableSaw');
  return { owner, saw };
}

/** A hall with one saw standing in the middle of the floor, and the owner at his bench. */
function hallWithASaw(): GameState {
  const state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
  state.enquiries = [];
  const saw = state.equipment.find((item) => item.specId === 'tableSaw');
  if (saw === undefined) throw new Error('no saw');
  saw.anchorX = 8;
  saw.anchorY = 4;
  state.owner.station = STATION_BENCH;
  return state;
}

const straight = (from: { x: number; y: number }, to: { x: number; y: number }): Array<{ x: number; y: number }> => [
  from,
  to,
];

beforeEach(() => {
  resetWalkers();
  clockMs = 0;
});

describe('the depth key of a figure (CLAUDE.md T20 2.11)', () => {
  it('is the cell his feet are on, a step in front of it, and not the station he is going to', () => {
    const state = hallWithASaw();
    const root = page(state);
    syncWalkers(root, 0, straight);
    const walker = walkerOf('owner');
    if (walker === undefined) throw new Error('no walker');
    expect(figureDepth(walker)).toBe(depthKey(walker.at.x, walker.at.y) + FIGURE_DEPTH_OFFSET);
    // Half way between two cells he is half way between the two depths: the key follows his feet
    // and does not jump from one cell to the next.
    walker.at = { x: 4.5, y: 5 };
    expect(figureDepth(walker)).toBeGreaterThan(depthKey(4, 5) + FIGURE_DEPTH_OFFSET);
    expect(figureDepth(walker)).toBeLessThan(depthKey(5, 5) + FIGURE_DEPTH_OFFSET);
  });

  it('is written on every drawable of the scene, so a neighbour can be read', () => {
    const state = hallWithASaw();
    const root = page(state);
    const live = root.querySelector('[data-live="1"]');
    const kit = live?.querySelector('[data-sprite="tableSaw"]');
    expect(kit?.getAttribute('data-depth')).toBeDefined();
    expect(Number(kit?.getAttribute('data-depth'))).toBeCloseTo(depthKey(8, 4), 3);
  });
});

describe('a man walking past a machine', () => {
  it('changes his place in the order exactly once, as his feet cross it', () => {
    const state = hallWithASaw();
    // He sets off from behind the saw and walks to a cell in front of it.
    state.owner.station = STATION_BENCH;
    const behind = { x: 8, y: 2 };
    const front = { x: 8, y: 7 };
    const root = page(state);
    syncWalkers(root, 0, straight);
    const walker = walkerOf('owner');
    if (walker === undefined) throw new Error('no walker');
    walker.at = { ...behind };
    resortFigures(root);
    const start = order(root);
    expect(start.owner).toBeGreaterThanOrEqual(0);
    expect(start.saw).toBeGreaterThanOrEqual(0);
    // Behind the saw is painted before it.
    expect(start.owner).toBeLessThan(start.saw);
    // Now walk him through it, a cell a tick, and count the frames the order changed in.
    walker.path = [];
    walker.facings = [];
    for (let y = behind.y + 1; y <= front.y; y += 1) walker.path.push({ x: front.x, y });
    walker.facings = walker.path.map(() => 'se' as const);
    let changes = 0;
    let was = start.owner < start.saw;
    let moves = 0;
    for (let frame = 0; frame < 20 && walker.path.length > 0; frame += 1) {
      tick(root);
      const now = order(root);
      const isBefore = now.owner < now.saw;
      if (isBefore !== was) changes += 1;
      was = isBefore;
      moves += resortFigures(root) > 0 ? 1 : 0;
    }
    expect(changes).toBe(1);
    // And he ends in front of it: painted after it.
    const end = order(root);
    expect(end.owner).toBeGreaterThan(end.saw);
    // Nothing was moved again once he was past it: the re-sort is a swap and not a sort.
    expect(moves).toBe(0);
  });
});

describe('a hall in which nothing crosses', () => {
  it('moves no figure in sixty ticks, and the order is the same at the end as at the start', () => {
    const state = hallWithASaw();
    const root = page(state);
    syncWalkers(root, 0, straight);
    const walker = walkerOf('owner');
    if (walker === undefined) throw new Error('no walker');
    walker.path = [];
    resortFigures(root);
    const start = order(root);
    let moved = 0;
    for (let frame = 0; frame < 60; frame += 1) {
      tick(root);
      moved += resortFigures(root);
    }
    expect(moved).toBe(0);
    expect(order(root)).toEqual(start);
  });
});
