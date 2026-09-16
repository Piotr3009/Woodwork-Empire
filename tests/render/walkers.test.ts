// @vitest-environment jsdom
// The men walk the floor (CLAUDE.md T16 2.2): a fake clock steps real time, and the figure's
// transform moves along the network cell by cell, never a jump, with carry on the legs that
// carry material; ten sheets off the pallet are five loops on the walker's log; and a station
// change mid walk turns him from where he is.

import { beforeEach, describe, expect, it } from 'vitest';
import { WALK_CELLS_PER_SECOND } from '../../src/engine/constants';
import { STATION_BENCH, STATION_GATE, STATION_RACK, machineStation } from '../../src/engine/stations';
import { walkPath } from '../../src/engine/walk';
import { renderHall } from '../../src/render/hall';
import { centreOf } from '../../src/render/iso';
import { resetWalkers, stepWalkers, syncWalkers, walkerOf } from '../../src/render/walkers';
import type { GameState } from '../../src/engine/index';
import { buyNow, buyStartingKit, fillRack, hireNow, newGame } from '../helpers';

/** The day 1 kit with a joiner in today, on the books and on the floor: a bench, a locker and a
 *  seat, which is what hiring him takes (CLAUDE.md T4 3.4). */
function hall(): GameState {
  let state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' }), { sawVariant: 'budget' }), 40);
  for (const specId of ['workbench', 'locker', 'canteenSeat', 'toolCabinet', 'handToolSet']) {
    state = buyNow(state, specId, specId === 'workbench' ? 'budget' : undefined);
  }
  const hired = hireNow(state, 'joiner', 'poor');
  for (const worker of hired.workers) worker.startDay = hired.clock.day;
  if (hired.workers.length === 0) throw new Error('nobody was hired');
  return hired;
}

function page(state: GameState): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = `<svg>${renderHall(state)}</svg>`;
  return holder;
}

function transformOf(root: ParentNode, key: string): { x: number; y: number } {
  const node = root.querySelector(`[data-figure="${key}"]`);
  const found = /translate\((-?[\d.]+),(-?[\d.]+)\)/.exec(node?.getAttribute('transform') ?? '');
  return { x: Number(found?.[1]), y: Number(found?.[2]) };
}

function cellAttr(root: ParentNode, key: string): { x: number; y: number } {
  const raw = root.querySelector(`[data-figure="${key}"]`)?.getAttribute('data-cell') ?? '';
  const [x, y] = raw.split(',').map(Number);
  return { x: x ?? 0, y: y ?? 0 };
}

const A_CELL_ON_SCREEN = Math.hypot(24, 12) + 0.01;

describe('the walker', () => {
  beforeEach(() => resetWalkers());

  it('carries a figure to a new station cell by cell, never more than a cell a frame, and stops there', () => {
    const state = hall();
    const joiner = state.workers[0];
    if (!joiner) throw new Error('no joiner');
    const key = `worker-${joiner.id}`;
    joiner.station = STATION_BENCH;
    let root = page(state);
    const pathFor = (from: { x: number; y: number }, to: { x: number; y: number }): Array<{ x: number; y: number }> =>
      walkPath(state, from, to);
    syncWalkers(root, 0, pathFor);
    const start = transformOf(root, key);
    const startCell = cellAttr(root, key);
    // The engine sends him to the saw: the page is built with him there, the walker puts him back.
    joiner.station = machineStation('tableSaw');
    root = page(state);
    syncWalkers(root, 0, pathFor);
    expect(transformOf(root, key)).toEqual(start);
    const goal = cellAttr(root, key);
    expect(goal).not.toEqual(startCell);
    const goalPoint = centreOf(goal.x, goal.y, 1, 1);
    const path = walkPath(state, startCell, goal);
    // Real time, a man's pace: a frame of 100 ms is less than a cell.
    let before = start;
    let now = 0;
    let frames = 0;
    while (frames < 400) {
      now += 100;
      frames += 1;
      stepWalkers(root, now);
      const after = transformOf(root, key);
      expect(Math.hypot(after.x - before.x, after.y - before.y), `frame ${frames}`).toBeLessThanOrEqual(
        A_CELL_ON_SCREEN,
      );
      before = after;
      if (after.x === Math.round(goalPoint.x) && after.y === Math.round(goalPoint.y)) break;
    }
    expect(transformOf(root, key)).toEqual({ x: Math.round(goalPoint.x), y: Math.round(goalPoint.y) });
    // At the pace the constant says: as many frames as the path is long at 1.6 cells a second.
    const cellsWalked = path.length - 1;
    expect(frames).toBeGreaterThanOrEqual(Math.floor((cellsWalked / WALK_CELLS_PER_SECOND) * 10));
    expect(walkerOf(key)?.arrivals.map((entry) => entry.station)).toEqual([machineStation('tableSaw')]);
    // Standing still now: more time moves nothing.
    stepWalkers(root, now + 5000);
    expect(transformOf(root, key)).toEqual({ x: Math.round(goalPoint.x), y: Math.round(goalPoint.y) });
  });

  it('turns from where he is when the engine sends him somewhere else mid walk', () => {
    const state = hall();
    const joiner = state.workers[0];
    if (!joiner) throw new Error('no joiner');
    const key = `worker-${joiner.id}`;
    const pathFor = (from: { x: number; y: number }, to: { x: number; y: number }): Array<{ x: number; y: number }> =>
      walkPath(state, from, to);
    joiner.station = STATION_BENCH;
    let root = page(state);
    syncWalkers(root, 0, pathFor);
    joiner.station = machineStation('tableSaw');
    root = page(state);
    syncWalkers(root, 0, pathFor);
    stepWalkers(root, 600);
    const midway = transformOf(root, key);
    joiner.station = STATION_RACK;
    root = page(state);
    syncWalkers(root, 600, pathFor);
    // No jump: he is exactly where he had got to, and the next frame moves him at most a cell.
    expect(transformOf(root, key)).toEqual(midway);
    stepWalkers(root, 700);
    const after = transformOf(root, key);
    expect(Math.hypot(after.x - midway.x, after.y - midway.y)).toBeLessThanOrEqual(A_CELL_ON_SCREEN);
    expect(walkerOf(key)?.station).toBe(STATION_RACK);
  });

  it('never stands on the unloading loop: touches the pallet, goes, touches the rack, comes back, then finishes the leg and goes on', () => {
    const state = hall();
    const pathFor = (from: { x: number; y: number }, to: { x: number; y: number }): Array<{ x: number; y: number }> =>
      walkPath(state, from, to);
    state.deliveries.push({
      id: 'delivery-1',
      jobId: null,
      sheets: 10,
      orderedDay: 1,
      pricePaid: 0,
      arriveDay: state.clock.day,
      arrived: true,
      unloaded: false,
      bespoke: false,
      overflowSheets: 0,
    });
    // The owner unloads by hand: the page puts the loop on him, both ends of it.
    state.owner.station = STATION_GATE;
    let root = page(state);
    const loop = root.querySelector('[data-owner="1"]')?.getAttribute('data-loop') ?? '';
    expect(loop).toMatch(/^\d+,\d+;\d+,\d+$/);
    syncWalkers(root, 0, pathFor);
    let now = 0;
    // A minute of real time on the loop, the engine flipping his station as it likes: he is
    // never standing, and he alternates the two ends.
    for (let frame = 0; frame < 600; frame += 1) {
      now += 100;
      if (frame % 50 === 0) {
        state.owner.station = frame % 100 === 0 ? STATION_RACK : STATION_GATE;
        root = page(state);
        syncWalkers(root, now, pathFor);
      }
      stepWalkers(root, now);
      expect(walkerOf('owner')?.path.length, `frame ${frame}`).toBeGreaterThan(0);
    }
    const walker = walkerOf('owner');
    if (!walker) throw new Error('no walker');
    expect(walker.loops).toBeGreaterThanOrEqual(2);
    const stations = walker.arrivals.map((entry) => entry.station);
    for (let index = 1; index < stations.length; index += 1) {
      expect(stations[index]).not.toBe(stations[index - 1]);
    }
    // The unloading is over and the engine sends him to his bench: he finishes the leg he is on
    // and then goes, and stands there.
    const delivery = state.deliveries[0];
    if (!delivery) throw new Error('no delivery');
    delivery.unloaded = true;
    state.owner.station = STATION_BENCH;
    root = page(state);
    expect(root.querySelector('[data-owner="1"]')?.getAttribute('data-loop')).toBeNull();
    syncWalkers(root, now, pathFor);
    const legGoal = walker.station;
    expect([STATION_GATE, STATION_RACK]).toContain(legGoal);
    for (let frame = 0; frame < 1000; frame += 1) {
      now += 100;
      stepWalkers(root, now);
      if (walker.path.length === 0 && walker.after === null) break;
    }
    const after = walker.arrivals.map((entry) => entry.station);
    expect(after[after.length - 2]).toBe(legGoal);
    expect(after[after.length - 1]).toBe(STATION_BENCH);
    expect(walker.path).toHaveLength(0);
    stepWalkers(root, now + 5000);
    expect(walker.path).toHaveLength(0);
  });
});
