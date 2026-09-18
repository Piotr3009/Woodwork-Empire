// @vitest-environment jsdom
// The men walk the floor (CLAUDE.md T16 2.2): a fake clock steps real time, and the figure's
// transform moves along the network cell by cell, never a jump, with carry on the legs that
// carry material; ten sheets off the pallet are five loops on the walker's log; and a station
// change mid walk turns him from where he is.

import { beforeEach, describe, expect, it } from 'vitest';
import { WALK_CELLS_PER_SECOND, WALK_STRIDE_METRES } from '../../src/engine/constants';
import {
  STATION_BENCH,
  STATION_GATE,
  STATION_IDLE,
  STATION_NO_BENCH,
  STATION_OFFICE,
  STATION_PHONE,
  STATION_RACK,
  machineStation,
  secondStation,
  waitingStation,
} from '../../src/engine/stations';
import { createTask } from '../../src/engine/tasks';
import {
  ANIMATIONS,
  animationForStation,
  legCarries,
  playCharacters,
} from '../../src/render/characters';
import { walkPath } from '../../src/engine/walk';
import { renderHall, stationCell } from '../../src/render/hall';
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

describe("a man's pace (PIOTR, 17.09; CLAUDE.md T18 2.1)", () => {
  it('is one cell of the hall a second of real time, at x1 and at x30 alike', () => {
    // A man does not walk faster because the clock does: the walker steps in real seconds and
    // never reads the speed, so this one figure is his pace at every speed in the game.
    expect(WALK_CELLS_PER_SECOND).toBe(1.0);
  });
});

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
    // Real time, a man's pace: a frame of 100 ms is less than a cell. The cap on the loop reads
    // the constant too, so slowing him down (T18 2.1) lengthens the walk and never fails the
    // test: ten frames a cell at one cell a second, with a frame of slack per cell for the
    // fraction a floating point step leaves behind.
    const capFrames = Math.ceil((path.length / WALK_CELLS_PER_SECOND) * 11) + 10;
    let before = start;
    let now = 0;
    let frames = 0;
    while (frames < capFrames) {
      now += 100;
      frames += 1;
      stepWalkers(root, now);
      const after = transformOf(root, key);
      expect(Math.hypot(after.x - before.x, after.y - before.y), `frame ${frames}`).toBeLessThanOrEqual(
        A_CELL_ON_SCREEN,
      );
      before = after;
      // Stop when he has actually arrived and not when the rounded transform first reads as the
      // goal: a step of a tenth of a cell leaves a fraction of a cell behind it that rounds away
      // on the screen but is still a step of the walk (T18 2.1).
      if (walkerOf(key)?.path.length === 0) break;
    }
    expect(transformOf(root, key)).toEqual({ x: Math.round(goalPoint.x), y: Math.round(goalPoint.y) });
    // At the pace the constant says: as many frames as the path is long at the constant's cells a
    // second, which is one of them since T18 2.1.
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

  it('walks a machine off the lorry to the floor held for it and back, empty handed', () => {
    const state = hall();
    const pathFor = (from: { x: number; y: number }, to: { x: number; y: number }): Array<{ x: number; y: number }> =>
      walkPath(state, from, to);
    // A saw on the apron at the gate, with the floor held for it in the middle of the hall.
    state.onOrder.push({
      id: 'order-saw',
      specId: 'tableSaw',
      variantId: 'budget',
      pricePaid: 0,
      orderedDay: state.clock.day,
      dueDay: state.clock.day,
      anchorX: 10,
      anchorY: 6,
      arrived: true,
      rotated: false,
    });
    const task = createTask(state, {
      kind: 'unload',
      label: 'Unload the delivery: 1 machine',
      minutes: 120,
      orderIds: ['order-saw'],
    });
    const helper = state.workers[0];
    if (!helper) throw new Error('nobody in the hall');
    helper.taskId = task.id;
    helper.station = STATION_GATE;
    const key = `worker-${helper.id}`;
    const root = page(state);
    const loop = root.querySelector(`[data-figure="${key}"]`)?.getAttribute('data-loop') ?? '';
    // Both ends and the far end's station: the gate's standing cell, the cell held for the
    // machine, and no station at all when he gets there (CLAUDE.md T17 2.4).
    const gate = stationCell(state, STATION_GATE, { x: 2, y: 5 });
    expect(loop).toBe(`${gate.x},${gate.y};10,6;idle`);
    // Neither leg carries anything: it is a plain walk out and a plain walk back.
    expect(legCarries(STATION_GATE, STATION_IDLE)).toBe(false);
    expect(legCarries(STATION_IDLE, STATION_GATE)).toBe(false);
    syncWalkers(root, 0, pathFor);
    let now = 0;
    for (let frame = 0; frame < 900; frame += 1) {
      now += 100;
      stepWalkers(root, now);
      expect(walkerOf(key)?.path.length, `frame ${frame}`).toBeGreaterThan(0);
    }
    const walker = walkerOf(key);
    if (!walker) throw new Error('no walker');
    expect(walker.loops).toBeGreaterThanOrEqual(1);
    const stations = walker.arrivals.map((entry) => entry.station);
    expect(stations).toContain(STATION_IDLE);
    expect(stations).toContain(STATION_GATE);
    expect(stations).not.toContain(STATION_RACK);
    for (let index = 1; index < stations.length; index += 1) {
      expect(stations[index]).not.toBe(stations[index - 1]);
    }
  });
});

describe('The movement (CLAUDE.md T19 2.1, PIOTR: "like robots, shaking like a leaf")', () => {
  beforeEach(() => resetWalkers());

  /** A figure of the hall with a path put straight into him: the path finder gives an L on open
   *  floor, so a straight run and a staircase both have to be handed to the walker to be watched
   *  (the report's "The movement" says so with the numbers). */
  function walking(cells: (at: { x: number; y: number }) => Array<{ x: number; y: number }>): {
    root: ParentNode;
    key: string;
  } {
    const state = hall();
    const joiner = state.workers[0];
    if (!joiner) throw new Error('no joiner');
    const key = `worker-${joiner.id}`;
    joiner.station = STATION_BENCH;
    let root: ParentNode = page(state);
    syncWalkers(root, 0, (from) => [from]);
    const at = cellAttr(root, key);
    joiner.station = machineStation('tableSaw');
    root = page(state);
    syncWalkers(root, 0, () => cells(at));
    return { root, key };
  }

  function facingOf(root: ParentNode, key: string): string {
    return (
      root.querySelector(`[data-figure="${key}"] [data-character]`)?.getAttribute('data-facing') ??
      ''
    );
  }

  it('moves the same amount every frame, with no zero step between nonzero ones', () => {
    // Sixty frames of a straight leg at sixty frames a second: one second of walking, which is
    // one cell at the pace of T18 2.1. Rounded to whole pixels this used to be 0 px, 0 px, 1 px:
    // 144 frames of 240 with no movement in x at all (the report's before log).
    const { root, key } = walking((at) => [
      at,
      { x: at.x + 1, y: at.y },
      { x: at.x + 2, y: at.y },
      { x: at.x + 3, y: at.y },
    ]);
    let before = transformOf(root, key);
    let now = 0;
    const dxs: number[] = [];
    const dys: number[] = [];
    for (let frame = 0; frame < 60; frame += 1) {
      now += 1000 / 60;
      stepWalkers(root, now);
      const after = transformOf(root, key);
      dxs.push(after.x - before.x);
      dys.push(after.y - before.y);
      before = after;
    }
    expect(walkerOf(key)?.path.length).toBeGreaterThan(0);
    for (let frame = 0; frame < dxs.length; frame += 1) {
      expect(Math.abs(dxs[frame] ?? 0), `x on frame ${frame}`).toBeGreaterThan(0);
      expect(Math.abs(dys[frame] ?? 0), `y on frame ${frame}`).toBeGreaterThan(0);
    }
    // Near constant: the only wobble left is the hundredth of a pixel the two decimals round to.
    for (const steps of [dxs, dys]) {
      const sizes = steps.map((step) => Math.abs(step));
      expect(Math.max(...sizes) / Math.min(...sizes)).toBeLessThanOrEqual(1.1);
    }
  });

  it('does not change facing on a straight diagonal leg', () => {
    // A staircase of twelve cells: the facing used to flip se/sw on every one of them, because it
    // was read off the cell and not off the leg.
    const { root, key } = walking((at) => {
      const cells = [at];
      let cell = at;
      for (let step = 0; step < 6; step += 1) {
        cell = { x: cell.x + 1, y: cell.y };
        cells.push(cell);
        cell = { x: cell.x, y: cell.y + 1 };
        cells.push(cell);
      }
      return cells;
    });
    const walker = walkerOf(key);
    if (!walker) throw new Error('no walker');
    expect(walker.path.length).toBe(12);
    let now = 0;
    const facings: string[] = [];
    while (walker.path.length > 0 && now < 30000) {
      now += 1000 / 60;
      stepWalkers(root, now);
      if (walker.path.length > 0) facings.push(facingOf(root, key));
    }
    expect(facings.length).toBeGreaterThan(600);
    expect(new Set(facings).size, `facings seen: ${Array.from(new Set(facings)).join(',')}`).toBe(1);
    // And the mirror never flips with it, which is what the eye actually catches.
    expect(
      root.querySelector(`[data-figure="${key}"] .figure-flip`)?.getAttribute('transform'),
    ).toBe('scale(1,1)');
  });

  it('turns once at a real corner and not at a wobble', () => {
    // Four cells one way and four the other is the L the path finder gives on open floor: one
    // turn, where the path really turns.
    const { root, key } = walking((at) => [
      at,
      { x: at.x + 1, y: at.y },
      { x: at.x + 2, y: at.y },
      { x: at.x + 3, y: at.y },
      { x: at.x + 4, y: at.y },
      { x: at.x + 4, y: at.y + 1 },
      { x: at.x + 4, y: at.y + 2 },
      { x: at.x + 4, y: at.y + 3 },
      { x: at.x + 4, y: at.y + 4 },
    ]);
    const walker = walkerOf(key);
    if (!walker) throw new Error('no walker');
    let now = 0;
    const facings: string[] = [];
    while (walker.path.length > 0 && now < 30000) {
      now += 1000 / 60;
      stepWalkers(root, now);
      if (walker.path.length > 0) facings.push(facingOf(root, key));
    }
    const turns = facings.filter((facing, index) => index > 0 && facing !== facings[index - 1]);
    expect(turns).toHaveLength(1);
    expect(facings[0]).toBe('se');
    expect(turns[0]).toBe('sw');
  });

  it('plays the walk at the pace of the floor and not at the sheet own fps', () => {
    // Eight frames to a stride of WALK_STRIDE_METRES at WALK_CELLS_PER_SECOND: the feet plant
    // where the floor moves. The sheets were delivered at 3.4286 fps, which dragged them 1.67
    // times past it.
    const { root, key } = walking((at) => [at, { x: at.x + 1, y: at.y }, { x: at.x + 2, y: at.y }]);
    stepWalkers(root, 100);
    const art = root.querySelector(`[data-figure="${key}"] [data-character]`);
    expect(art?.getAttribute('data-anim')).toBe('walk');
    const frames = Number(art?.getAttribute('data-frames') ?? '0');
    expect(Number(art?.getAttribute('data-fps'))).toBeCloseTo(
      (frames * WALK_CELLS_PER_SECOND) / WALK_STRIDE_METRES,
      6,
    );
  });

  it('is not put back to his station face or to frame 0 by a page written mid leg', () => {
    // The render runs inside the same frame as the walker, so what a render leaves behind is what
    // the browser paints. It used to leave a mirrored man restarting his walk.
    const state = hall();
    const joiner = state.workers[0];
    if (!joiner) throw new Error('no joiner');
    const key = `worker-${joiner.id}`;
    const pathFor = (from: { x: number; y: number }, to: { x: number; y: number }) =>
      walkPath(state, from, to);
    joiner.station = STATION_BENCH;
    let root = page(state);
    syncWalkers(root, 0, pathFor);
    joiner.station = machineStation('tableSaw');
    root = page(state);
    syncWalkers(root, 0, pathFor);
    let now = 0;
    for (let frame = 0; frame < 30; frame += 1) {
      now += 1000 / 60;
      stepWalkers(root, now);
      playCharacters(root, now);
    }
    const art = root.querySelector(`[data-figure="${key}"] [data-character]`);
    const was = {
      facing: art?.getAttribute('data-facing'),
      frame: art?.getAttribute('data-frame'),
      flip: root.querySelector(`[data-figure="${key}"] .figure-flip`)?.getAttribute('transform'),
      at: transformOf(root, key),
    };
    expect(was.frame).not.toBe('0');
    // The page written again from the state, which is what a whole game minute does.
    const fresh = page(state);
    syncWalkers(fresh, now, pathFor);
    const after = fresh.querySelector(`[data-figure="${key}"] [data-character]`);
    expect(after?.getAttribute('data-facing')).toBe(was.facing);
    expect(after?.getAttribute('data-frame')).toBe(was.frame);
    expect(after?.getAttribute('data-anim')).toBe('walk');
    expect(
      fresh.querySelector(`[data-figure="${key}"] .figure-flip`)?.getAttribute('transform'),
    ).toBe(was.flip);
    expect(transformOf(fresh, key)).toEqual(was.at);
  });
});

describe('nobody walks on the spot (CLAUDE.md T17 1, section 7)', () => {
  it('rests every station at something that is not a walk and not a carry', () => {
    // The one place a resting figure's animation is chosen, over every station the game puts a
    // man at: the benches, the machines and their waiting cells, the bench's second place, the
    // rack, the gate, the office, the phone and standing idle. An unload rests at the gate or at
    // the rack, which are both on the list.
    const stations = [
      STATION_BENCH,
      STATION_RACK,
      STATION_GATE,
      STATION_IDLE,
      STATION_OFFICE,
      STATION_PHONE,
      STATION_NO_BENCH,
      machineStation('tableSaw'),
      waitingStation('tableSaw'),
      secondStation('kit-bench-1'),
    ];
    for (const station of stations) {
      const rest = animationForStation(station);
      expect(rest, station).not.toBe('walk');
      expect(rest, station).not.toBe('carry');
      expect(ANIMATIONS, station).toContain(rest);
    }
  });

  it('writes no walk and no carry onto a figure standing in the hall', () => {
    const state = hall();
    const root = page(state);
    const figures = Array.from(root.querySelectorAll('[data-figure]'));
    expect(figures.length).toBeGreaterThan(0);
    for (const figure of figures) {
      const rest = figure.getAttribute('data-rest');
      expect(rest, figure.getAttribute('data-figure') ?? '').not.toBe('walk');
      expect(rest, figure.getAttribute('data-figure') ?? '').not.toBe('carry');
    }
  });
});
