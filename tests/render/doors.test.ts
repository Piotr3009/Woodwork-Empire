// @vitest-environment jsdom
// The doors, as Airline Tycoon does them (PIOTR, 18.09; CLAUDE.md T20 2.12): a door is drawn
// closed, always, and a man whose leg ends on a door cell goes through it and off the hall's
// drawing. The swing of Turn 19 is gone, and with it the sound this file used to play: a man going
// through is one knock the hall reports and the ui layer plays (CLAUDE.md T20 2.13).

import { beforeEach, describe, expect, it } from 'vitest';
import { roomDoorCell } from '../../src/engine/constants';
import { STATION_BENCH, STATION_OFFICE, isDoorwayCell } from '../../src/engine/stations';
import { renderHall } from '../../src/render/hall';
import { hallOneShots } from '../../src/render/hall';
import {
  figureIsThroughADoor,
  figuresThroughDoors,
  resetDoors,
  stepDoors,
  syncDoors,
  takeDoorGoings,
} from '../../src/render/doors';
import { resetWalkers, syncWalkers, stepWalkers, walkerOf } from '../../src/render/walkers';
import type { GameState } from '../../src/engine/index';
import { buyStartingKit, newGame } from '../helpers';

function page(state: GameState): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = `<svg>${renderHall(state)}</svg>`;
  return holder;
}

/** The path finder the page hands the walker: a straight line, which is all a test wants. */
const straight = (from: { x: number; y: number }, to: { x: number; y: number }): Array<{ x: number; y: number }> => [
  from,
  to,
];

beforeEach(() => {
  resetDoors();
  resetWalkers();
});

/** Walks whoever is on his feet to the end of his path: the walker covers a cell a frame at most,
 *  so a leg is as many frames as it is cells. */
function walkOn(root: ParentNode, from: number): number {
  let at = from;
  for (let guard = 0; guard < 200 && (walkerOf('owner')?.path.length ?? 0) > 0; guard += 1) {
    at += 1000;
    stepWalkers(root, at);
  }
  return at;
}

/** Plays the way in: he is at his bench, the engine sends him to the office, and the walker puts
 *  him through the door. The page that still had him on it is handed back. */
function walkHimIn(state: GameState): HTMLElement {
  state.owner.station = STATION_BENCH;
  syncWalkers(page(state), 0, straight);
  state.owner.station = STATION_OFFICE;
  const walking = page(state);
  syncWalkers(walking, 100, straight);
  walkOn(walking, 100);
  return walking;
}

describe('a door is drawn closed, always (CLAUDE.md T20 2.12)', () => {
  it('has one leaf, no want and no swing, whoever is in the office', () => {
    const state = buyStartingKit(newGame());
    for (const station of [STATION_BENCH, STATION_OFFICE]) {
      state.owner.station = station;
      const svg = renderHall(state);
      expect(svg, station).toContain('data-door-room="office" data-door-state="closed"');
      expect(svg, station).not.toContain('data-door-want');
      expect((svg.match(/class="door-leaf"/g) ?? []).length, station).toBe(2);
    }
  });
});

describe('a man goes through it (CLAUDE.md T20 2.12)', () => {
  it('knows the office doorway from every other cell', () => {
    const door = roomDoorCell('office');
    expect(isDoorwayCell(door)).toBe(true);
    expect(isDoorwayCell({ x: door.x, y: door.y + 1 })).toBe(false);
    // The canteen's is not one: a man with nothing to do stands about there, in the hall.
    expect(isDoorwayCell(roomDoorCell('canteen'))).toBe(false);
  });

  it('leaves him on the hall while he is still walking to the door, and takes him off at it', () => {
    const state = buyStartingKit(newGame());
    state.owner.station = STATION_BENCH;
    syncWalkers(page(state), 0, straight);
    const door = roomDoorCell('office');
    // The engine sends him to the office: he is still drawn, because his legs are still on him.
    state.owner.station = STATION_OFFICE;
    const walking = page(state);
    syncWalkers(walking, 100, straight);
    expect(walkerOf('owner')).toBeDefined();
    expect(figureIsThroughADoor('owner', door)).toBe(false);
    expect(renderHall(state)).toContain('data-figure="owner"');
    // He arrives: from that moment he is through the door and off the drawing.
    walkOn(walking, 100);
    expect(walkerOf('owner')?.path).toHaveLength(0);
    expect(figureIsThroughADoor('owner', door)).toBe(true);
    expect(renderHall(state)).not.toContain('data-figure="owner"');
  });

  it('keeps his walker at the door so that he walks out of it when he comes back', () => {
    const state = buyStartingKit(newGame());
    const door = roomDoorCell('office');
    const inside = walkHimIn(state);
    expect(walkerOf('owner')?.at).toEqual({ x: door.x, y: door.y });
    expect(inside.querySelector('[data-figure="owner"]')).not.toBeNull();
    // The page stops drawing him the moment he is through, and the walker waits on the doorway
    // cell rather than being forgotten: a man who comes out comes out of the door.
    const gone = page(state);
    expect(gone.querySelector('[data-figure="owner"]')).toBeNull();
    syncWalkers(gone, 61_000, straight);
    expect(walkerOf('owner')?.at).toEqual({ x: door.x, y: door.y });
    // And when the hall draws him again he sets off from the door, on his feet.
    state.owner.station = STATION_BENCH;
    const back = page(state);
    syncWalkers(back, 62_000, straight);
    expect(walkerOf('owner')?.at).toEqual({ x: door.x, y: door.y });
    expect(walkerOf('owner')?.path.length).toBeGreaterThan(0);
  });
});

describe('the knock is the ui layer s to play (CLAUDE.md T20 2.13)', () => {
  it('counts a man in and a man out, once each, and the asking clears it', () => {
    const state = buyStartingKit(newGame());
    state.owner.station = STATION_BENCH;
    const root = page(state);
    syncWalkers(root, 0, straight);
    stepDoors(root, 0);
    expect(takeDoorGoings()).toBe(0);
    // In.
    const going = walkHimIn(state);
    syncDoors(going, 60_000);
    expect(figuresThroughDoors()).toEqual(['owner']);
    expect(takeDoorGoings()).toBe(1);
    // And no second knock for standing there.
    stepDoors(going, 61_000);
    expect(takeDoorGoings()).toBe(0);
    // Out.
    state.owner.station = STATION_BENCH;
    const out = page(state);
    syncWalkers(out, 62_000, straight);
    stepDoors(out, 62_000);
    expect(figuresThroughDoors()).toEqual([]);
    expect(takeDoorGoings()).toBe(1);
  });

  it('is reported through hallOneShots, which is what the ui layer reads', () => {
    const state = buyStartingKit(newGame());
    state.owner.station = STATION_BENCH;
    const root = page(state);
    syncWalkers(root, 0, straight);
    stepDoors(root, 0);
    expect(Array.from(hallOneShots(state))).toEqual([]);
    const going = walkHimIn(state);
    stepDoors(going, 60_000);
    expect(Array.from(hallOneShots(state))).toEqual(['door']);
    // One passage, one knock, however many frames ask.
    expect(Array.from(hallOneShots(state))).toEqual([]);
  });

  it('forgets everything when the view is built from nothing', () => {
    const state = buyStartingKit(newGame());
    const root = walkHimIn(state);
    syncDoors(root, 60_000);
    expect(figuresThroughDoors()).toEqual(['owner']);
    resetDoors();
    expect(figuresThroughDoors()).toEqual([]);
    expect(takeDoorGoings()).toBe(0);
  });
});

describe('the render layer does not reach into the ui layer (CLAUDE.md T20 2.13)', () => {
  it('imports nothing from src/ui/sound anywhere under src/render', async () => {
    const { readFileSync, readdirSync, statSync } = await import('node:fs');
    const { join } = await import('node:path');
    const files: string[] = [];
    const walk = (directory: string): void => {
      for (const name of readdirSync(directory)) {
        const path = join(directory, name);
        if (statSync(path).isDirectory()) walk(path);
        else if (name.endsWith('.ts')) files.push(path);
      }
    };
    walk('src/render');
    expect(files.length).toBeGreaterThan(5);
    for (const path of files) {
      const source = readFileSync(path, 'utf8');
      expect(source, path).not.toContain("from '../ui/sound'");
      expect(source, path).not.toContain('from "../ui/sound"');
    }
  });
});
