// @vitest-environment jsdom
// v71 (PIOTR, 03.10), two things he asked for on the hall's picture.
//
// A walk is real seconds, and a day at x30 and x100 is a few of them, so the men were on their way
// all day and never stood at a machine. From v71 nobody walks to his dinner or home: at twelve the
// hall is gone from where it stood and at one it is back at its machines, at five the hired men
// are gone, and in the morning everybody is at his place. The walk between two machines is drawn
// as it was at x1, x4 and x10; from x30 a man is put where he is going.
//
// The spray booth is the one machine a man walks into. He stands inside it, half a cell past its
// doorway, facing the filter wall, in a white suit and a respirator for as long as he is in there.

import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { BREAK_START_MINUTE, DAY_END_MINUTE, WALK_SKIPPED_FROM_SPEED } from '../../src/engine/constants';
import {
  STATION_BENCH,
  STATION_IDLE,
  boothPlaces,
  machineStation,
  placeCellsAt,
  standingCell,
} from '../../src/engine/stations';
import type { GameState } from '../../src/engine/index';
import {
  animationForStation,
  characterKey,
  playableAnimation,
  setWalkPace,
  walksAreSkipped,
} from '../../src/render/characters';
import { resetDoors } from '../../src/render/doors';
import { renderHall, stationCell } from '../../src/render/hall';
import { standsBehind } from '../../src/render/iso';
import { resetWalkers, stepWalkers, syncWalkers, walkerOf } from '../../src/render/walkers';
import { buyNow, buyStartingKit, fillRack, hireNow, newGame, placeEquipment } from '../helpers';

type Cell = { x: number; y: number };

/** The path finder a test hands the walker: both ends and nothing between. */
const straight = (from: Cell, to: Cell): Cell[] => [from, to];

function page(state: GameState): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = `<svg>${renderHall(state)}</svg>`;
  return holder;
}

/** The day one hall with what a joiner is hired on, and a joiner who started today: the hall of
 *  tests/render/walkers.test.ts. */
function hall(): GameState {
  let state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' }), { sawVariant: 'budget' }), 40);
  for (const specId of ['workbench', 'locker', 'toolCabinet', 'handToolSet']) {
    state = buyNow(state, specId, specId === 'workbench' ? 'budget' : undefined);
  }
  const hired = hireNow(state, 'joiner', 'novice');
  for (const worker of hired.workers) worker.startDay = hired.clock.day;
  if (hired.workers.length === 0) throw new Error('nobody was hired');
  return hired;
}

/** One figure on a page of its own, the way the hall writes one. */
function loneFigure(cell: Cell): { root: HTMLElement; node: Element } {
  const root = document.createElement('div');
  root.innerHTML =
    `<svg><g class="figure" data-figure="worker-a" data-cell="${cell.x},${cell.y}" ` +
    'data-station="bench" data-rest="idle" data-facing-rest="sw"></g></svg>';
  const node = root.querySelector('[data-figure]');
  if (node === null) throw new Error('no figure');
  return { root, node };
}

function sendTo(node: Element, cell: Cell, station: string, inside: Cell | null = null): void {
  node.setAttribute('data-cell', `${cell.x},${cell.y}`);
  node.setAttribute('data-station', station);
  if (inside === null) node.removeAttribute('data-inside');
  else node.setAttribute('data-inside', `${inside.x},${inside.y}`);
}

beforeEach(() => {
  resetWalkers();
  resetDoors();
  setWalkPace(1);
});

afterEach(() => {
  setWalkPace(1);
});

describe('the places inside a spray booth', () => {
  it('run along its open side from the second cell, one for every man its class keeps busy', () => {
    // A bare hall, so nothing of the day one kit stands in the doorway.
    const state = newGame({ difficulty: 'veryEasy' });
    const booth = placeEquipment(state, 'sprayBooth', { variantId: 'industrial', x: 10, y: 2, id: 'kit-booth' });
    // Six by four, open on the camera side: the doorway is the row past its last, y 6.
    const places = boothPlaces(booth);
    expect(places.map((place) => place.cell)).toEqual([
      { x: 11, y: 6 },
      { x: 12, y: 6 },
      { x: 13, y: 6 },
      { x: 14, y: 6 },
    ]);
    // Half a cell in from the doorway, his back to the hall.
    expect(places[0]?.inside).toEqual({ x: 11, y: 5.5 });
    expect(places.every((place) => place.facing === 'ne')).toBe(true);
    // They are the booth's own places, in their order, for everybody who asks where its men stand.
    expect(placeCellsAt(state, booth, 2)).toEqual([places[0]?.cell, places[1]?.cell]);
    expect(standingCell(state, booth)).toEqual(places[0]?.cell);
    expect(stationCell(state, machineStation('sprayBooth'), { x: 2, y: 5 })).toEqual({
      x: 11,
      y: 6,
      facing: 'ne',
      inside: { x: 11, y: 5.5 },
    });
  });

  it('are on its right hand side when it is turned, and one in the smallest booth', () => {
    const state = newGame({ difficulty: 'veryEasy' });
    const booth = placeEquipment(state, 'sprayBooth', { variantId: 'industrial', x: 10, y: 1, id: 'kit-booth', orientation: 1 });
    // Four by six now, open to the right: the doorway is the column past its last, x 14.
    const places = boothPlaces(booth);
    expect(places.map((place) => place.cell)).toEqual([
      { x: 14, y: 2 },
      { x: 14, y: 3 },
      { x: 14, y: 4 },
      { x: 14, y: 5 },
    ]);
    expect(places[0]?.inside).toEqual({ x: 13.5, y: 2 });
    expect(places.every((place) => place.facing === 'nw')).toBe(true);
    const small = placeEquipment(state, 'sprayBooth', { variantId: 'used', x: 22, y: 2, id: 'kit-small' });
    expect(boothPlaces(small)).toHaveLength(1);
    // And nothing that is not a booth has any.
    const saw = placeEquipment(state, 'tableSaw', { variantId: 'budget', x: 30, y: 6, id: 'kit-saw' });
    expect(boothPlaces(saw)).toEqual([]);
  });

  it('paint the man over the booth he is in, and behind it when he is behind it', () => {
    // The booth of the first test as it is drawn: half a cell into its zone.
    const box = { x: 10.5, y: 2.5, width: 6, depth: 4 };
    expect(standsBehind({ x: 11.5, y: 6 }, box)).toBe(false);
    expect(standsBehind({ x: 9.5, y: 3.5 }, box)).toBe(true);
    expect(standsBehind({ x: 11.5, y: 7.5 }, box)).toBe(false);
  });
});

describe('the suit', () => {
  it('is what a man plays at a booth, off one sheet whoever he is', () => {
    expect(animationForStation(machineStation('sprayBooth'))).toBe('spray');
    expect(animationForStation(machineStation('tableSaw'))).toBe('bench');
    expect(characterKey('owner', 'spray')).toBe('character.suit.spray');
    expect(characterKey('joiner', 'spray')).toBe('character.suit.spray');
    expect(characterKey('joiner', 'bench')).toBe('character.joiner.bench');
    expect(playableAnimation('joiner', 'spray')).toEqual({ animation: 'spray', frozen: false });
    expect(playableAnimation('owner', 'spray')).toEqual({ animation: 'spray', frozen: false });
  });
});

describe('the walk into a booth, and no walk at the fast speeds', () => {
  it('ends half a cell past his cell, inside the booth', () => {
    const { root, node } = loneFigure({ x: 3, y: 3 });
    syncWalkers(root, 0, straight);
    sendTo(node, { x: 11, y: 6 }, machineStation('sprayBooth'), { x: 11, y: 5.5 });
    syncWalkers(root, 100, straight);
    const walker = walkerOf('worker-a');
    // On his way, by his cell and then the step in.
    expect(walker?.path.slice(-2)).toEqual([
      { x: 11, y: 6 },
      { x: 11, y: 5.5 },
    ]);
    let at = 100;
    for (let guard = 0; guard < 200 && (walker?.path.length ?? 0) > 0; guard += 1) {
      at += 1000;
      stepWalkers(root, at);
    }
    expect(walker?.at).toEqual({ x: 11, y: 5.5 });
    // And he comes out by the same doorway: the walk back starts on a whole cell.
    sendTo(node, { x: 3, y: 3 }, STATION_BENCH);
    const asked: Cell[] = [];
    syncWalkers(root, at + 100, (from, to) => {
      asked.push(from);
      return [from, to];
    });
    expect(asked).toEqual([{ x: 11, y: 6 }]);
  });

  it('puts a man where he is going from x30, and walks him under it', () => {
    expect(WALK_SKIPPED_FROM_SPEED).toBe(30);
    for (const speed of [1, 4, 10]) {
      setWalkPace(speed);
      expect(walksAreSkipped(), `x${speed}`).toBe(false);
    }
    for (const speed of [30, 100]) {
      setWalkPace(speed);
      expect(walksAreSkipped(), `x${speed}`).toBe(true);
    }
    const { root, node } = loneFigure({ x: 3, y: 3 });
    setWalkPace(1);
    syncWalkers(root, 0, straight);
    // At x1 he sets off and is still where he was.
    sendTo(node, { x: 9, y: 3 }, machineStation('tableSaw'));
    syncWalkers(root, 100, straight);
    const walker = walkerOf('worker-a');
    expect(walker?.path.length).toBeGreaterThan(0);
    expect(walker?.at).toEqual({ x: 3, y: 3 });
    // The clock is put to x100 with him on his way: the leg is over on the next frame.
    setWalkPace(100);
    stepWalkers(root, 200);
    expect(walker?.path).toEqual([]);
    expect(walker?.at).toEqual({ x: 9, y: 3 });
    // And the next order is no walk at all, into a booth included.
    sendTo(node, { x: 11, y: 6 }, machineStation('sprayBooth'), { x: 11, y: 5.5 });
    syncWalkers(root, 300, straight);
    expect(walker?.path).toEqual([]);
    expect(walker?.at).toEqual({ x: 11, y: 5.5 });
  });
});

describe('nobody walks to his dinner or home', () => {
  it('takes the hall off the floor at twelve from where it stood, and has it back at one', () => {
    const state = hall();
    state.clock.minute = 100;
    state.owner.station = STATION_BENCH;
    for (const worker of state.workers) worker.station = STATION_BENCH;
    const morning = page(state);
    syncWalkers(morning, 0, straight);
    expect(morning.querySelectorAll('[data-figure]')).toHaveLength(2);
    // Twelve: the day loop writes the whole hall idle, which the hour reads as the canteen.
    state.clock.minute = BREAK_START_MINUTE;
    state.owner.station = STATION_IDLE;
    for (const worker of state.workers) worker.station = STATION_IDLE;
    const noon = page(state);
    expect(noon.querySelectorAll('[data-figure]')).toHaveLength(0);
    syncWalkers(noon, 100, straight);
    expect(walkerOf('owner')).toBeUndefined();
    // One: they are at their benches, with no walk back from the canteen door.
    state.clock.minute = BREAK_START_MINUTE + 60;
    state.owner.station = STATION_BENCH;
    for (const worker of state.workers) worker.station = STATION_BENCH;
    const afternoon = page(state);
    syncWalkers(afternoon, 200, straight);
    expect(afternoon.querySelectorAll('[data-figure]')).toHaveLength(2);
    expect(walkerOf('owner')?.path).toEqual([]);
  });

  it('has the hired men gone at five, and the owner still at his bench', () => {
    const state = hall();
    state.clock.minute = DAY_END_MINUTE;
    state.owner.station = STATION_BENCH;
    for (const worker of state.workers) worker.station = STATION_IDLE;
    const evening = page(state);
    expect(evening.querySelector('[data-figure="owner"]')).not.toBeNull();
    expect(evening.querySelectorAll('[data-worker]')).toHaveLength(0);
  });
});
