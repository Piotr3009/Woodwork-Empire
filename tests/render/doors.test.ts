// @vitest-environment jsdom
// The doors, as Airline Tycoon does them (PIOTR, 18.09; CLAUDE.md T20 2.12): a door is drawn
// closed, always, and a man whose leg ends on a door cell goes through it and off the hall's
// drawing. The swing of Turn 19 is gone, and with it the sound this file used to play: a man going
// through is one knock the hall reports and the ui layer plays (CLAUDE.md T20 2.13).

import { beforeEach, describe, expect, it } from 'vitest';
import { roomDoorCell } from '../../src/engine/constants';
import {
  STATION_BENCH,
  STATION_IDLE,
  STATION_LUNCH,
  STATION_NO_BENCH,
  STATION_OFFICE,
  STATION_PHONE,
  isBehindTheDoor,
  isDoorwayCell,
} from '../../src/engine/stations';
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
import { buyStartingKit, hireNow, newGame } from '../helpers';

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
  it('knows both doorways from every other cell, and the station tells the two men apart', () => {
    const office = roomDoorCell('office');
    const canteen = roomDoorCell('canteen');
    expect(isDoorwayCell(office)).toBe(true);
    expect(isDoorwayCell({ x: office.x, y: office.y + 1 })).toBe(false);
    // Turn 21: the canteen's is a doorway too, because the hall goes through it for its dinner
    // (PIOTR, 19.09; CLAUDE.md T21 2.12). Turn 20 asserted the opposite here, and its reason was that
    // a man with nothing to do stands about on that very cell: that reason is answered by the station
    // and not by the cell, which is what `isBehindTheDoor` asks.
    expect(isDoorwayCell(canteen)).toBe(true);
    expect(isBehindTheDoor(STATION_LUNCH, canteen)).toBe(true);
    expect(isBehindTheDoor(STATION_IDLE, canteen)).toBe(false);
    expect(isBehindTheDoor(STATION_NO_BENCH, canteen)).toBe(false);
    // And a station is only behind its own door: a man at his desk is not in the canteen.
    expect(isBehindTheDoor(STATION_OFFICE, office)).toBe(true);
    expect(isBehindTheDoor(STATION_PHONE, office)).toBe(true);
    expect(isBehindTheDoor(STATION_OFFICE, canteen)).toBe(false);
    expect(isBehindTheDoor(STATION_LUNCH, office)).toBe(false);
    expect(isBehindTheDoor(STATION_BENCH, office)).toBe(false);
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
    expect(figureIsThroughADoor('owner', door, STATION_OFFICE)).toBe(false);
    expect(renderHall(state)).toContain('data-figure="owner"');
    // He arrives: from that moment he is through the door and off the drawing.
    walkOn(walking, 100);
    expect(walkerOf('owner')?.path).toHaveLength(0);
    expect(figureIsThroughADoor('owner', door, STATION_OFFICE)).toBe(true);
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

describe('every man goes through the office door, not the owner alone (CLAUDE.md T21 2.11)', () => {
  it('takes the estimator off the hall at his take off, and gives him back when it is done', () => {
    // Turn 20 drew him standing in the doorway and this test asserted that, because the office view
    // draws the owner alone and a man on neither picture was a man the player had lost. Turn 21 sends
    // him through, and Turn 22 leaves nothing behind him: a man in a room has nothing wrong with him,
    // so he has no mark, and where he is, is the line under his name on the team page (PIOTR, 19.09;
    // CLAUDE.md T21 2.11, T22 2.5).
    const start = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    start.cash = 50_000;
    const hired = hireNow(start, 'estimator', 'novice');
    hired.enquiries = [];
    const estimator = hired.workers.find((worker) => worker.role === 'estimator');
    if (estimator === undefined) throw new Error('nobody was hired');
    estimator.startDay = hired.clock.day;
    // A take off, the books, a drawing or the phone are all desk work: the engine puts him on the
    // office station and his cell is the doorway.
    estimator.station = STATION_OFFICE;
    hired.owner.station = STATION_BENCH;
    const root = page(hired);
    syncWalkers(root, 0, straight);
    walkOn(root, 0);
    const drawn = renderHall(hired);
    expect(drawn).not.toContain(`data-worker="${estimator.id}"`);
    expect(figureIsThroughADoor(`worker-${estimator.id}`, roomDoorCell('office'), STATION_OFFICE)).toBe(
      true,
    );
    // And nothing of his is left at the door: the bubble of Turn 21 that used to stand there in the
    // dashed grey of a man off the hall is gone with the away class (CLAUDE.md T22 2.5).
    expect(drawn).not.toContain('data-away-door');
    expect(drawn).not.toContain('data-bubble="inTheOffice"');
    // And the office view is still the owner's alone: one box, measured for him (CLAUDE.md T19 2.2).
    expect(drawn).not.toContain('data-office-figure');
    // The take off is over and he is on the floor again.
    estimator.station = STATION_BENCH;
    expect(renderHall(hired)).toContain(`data-worker="${estimator.id}"`);
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
