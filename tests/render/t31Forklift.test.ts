/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// @vitest-environment jsdom
// Turn 31, 2.10: the line's forklift and the pallet standing alone (L3) [PIOTR, 11.10: "and the
// forklift driving"; that evening "won't we add it to this turn?"]: waiting at the line's end on its
// lane, a trip to the gate with the newest pallet and back, in real time at three cells a second,
// the renderer's alone, and the pallets at the gate drawn from the art side's picture (CLAUDE.md T31
// 2.10, section 7).

import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  FORKLIFT_CELLS_PER_SECOND,
  FORKLIFT_LOAD_AHEAD,
  FORKLIFT_SHEETS,
  LINE_MODULES,
  WALK_SKIPPED_FROM_SPEED,
} from '../../src/engine/constants';
import type { GameState } from '../../src/engine/index';
import { setWalkPace } from '../../src/render/characters';
import { forkliftNow, forkliftPoints, resetForklift, stepForklift, syncForklift } from '../../src/render/forklift';
import { renderHall } from '../../src/render/hall';
import { tileToScreen } from '../../src/render/iso';
import { spriteFiles } from '../../src/render/sprites';
import { currentState, mount, render } from '../../src/ui/app';
import { act, buyStartingKit, newGame, nextDay, placeEquipment, testJoiner, withAir } from '../helpers';

function bigUnit(): GameState {
  let state = newGame({ difficulty: 'veryEasy' });
  state.cash = 9000000;
  state = nextDay(act(state, { type: 'EXTEND_UNIT' }));
  state = nextDay(act(state, { type: 'EXTEND_UNIT', stage: 'second' }));
  state = withAir(buyStartingKit(state), 'industrial');
  state.enquiries = [];
  return state;
}

/** The line standing from this cell with its two engineers, its contract running, the clock at 1x. */
function withLine(at = { x: 2, y: 14 }): GameState {
  const state = bigUnit();
  LINE_MODULES.forEach((id, index) => placeEquipment(state, id, { x: at.x + 6 * index, y: at.y, id: `kit-line-${index + 1}` }));
  for (const id of ['eng-1', 'eng-2']) {
    state.workers.push({ ...testJoiner(id, id), role: 'lineEngineer', tier: null, rate: 0, monthlyWage: 15000 });
  }
  state.windowLine.contract = {
    status: 'active',
    startDay: state.clock.day,
    windowsThisWeek: 0,
    weekStartDay: state.clock.day,
    windowsMade: 0,
    revenue: 0,
    materialCost: 0,
  };
  state.speed = 1;
  state.activeEvent = null;
  state.eventQueue = [];
  return state;
}

/** The hall as the app writes it, with the forklift put back where it had got to. */
function page(state: GameState, nowMs: number): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = renderHall(state);
  syncForklift(holder, state, nowMs);
  return holder;
}

/** Steps the forklift from `fromMs` to `toMs` a tenth of a second at a time, as the frames do. */
function drive(holder: HTMLElement, state: GameState, fromMs: number, toMs: number): void {
  for (let at = fromMs + 100; at <= toMs; at += 100) stepForklift(holder, state, at);
}

beforeEach(() => {
  resetForklift();
  setWalkPace(1);
});

describe('where it waits (CLAUDE.md T31 2.10)', () => {
  it('waits on the front strip in front of module 6 s pallet, empty, facing nw, on frame 0 of its row', () => {
    const state = withLine();
    const holder = page(state, 1000);
    const node = holder.querySelector('[data-forklift]');
    expect(node?.getAttribute('data-forklift')).toBe('wait');
    expect(node?.getAttribute('pointer-events')).toBe('none');
    const art = node?.querySelector('[data-forklift-art]');
    expect(art?.getAttribute('data-row')).toBe(String(FORKLIFT_SHEETS.empty.rows.nw));
    expect(art?.getAttribute('data-frame')).toBe('0');
    expect(art?.querySelector('image')?.getAttribute('href')).toBe(`/sprites/${FORKLIFT_SHEETS.empty.file}`);
    expect(forkliftPoints(state)?.wait).toEqual({ x: 37, y: 19 });
    // Not a figure, not a machine's sheet, and drawn among the drawables by depth.
    expect(node?.hasAttribute('data-figure')).toBe(false);
    expect(node?.querySelector('[data-character], [data-sheet]')).toBeNull();
    expect(node?.hasAttribute('data-depth')).toBe(true);
  });

  it('is drawn only while the six stand and the line has its lane', () => {
    const tooNear = withLine({ x: 2, y: 15 });
    expect(page(tooNear, 0).querySelector('[data-forklift]')).toBeNull();
    const noLine = bigUnit();
    expect(page(noLine, 0).querySelector('[data-forklift]')).toBeNull();
    const sold = withLine();
    for (const item of sold.equipment) if (LINE_MODULES.includes(item.specId)) item.soldOnDay = sold.clock.day + 1;
    expect(page(sold, 0).querySelector('[data-forklift]')).toBeNull();
  });
});

describe('the trip (CLAUDE.md T31 2.10)', () => {
  it('takes the newest pallet loaded nw then ne at three cells a second, sets it down, and comes back empty sw then se', () => {
    const state = withLine();
    const holder = page(state, 0);
    state.windowLine.palletsAtGate = 1;
    stepForklift(holder, state, 100);
    expect(forkliftNow()?.leg).toBe('out');
    // The pallet is on the forks, so not drawn at the gate.
    const written = page(state, 100);
    expect(written.querySelector('[data-line-pallet="0"]')?.getAttribute('visibility')).toBe('hidden');
    const points = forkliftPoints(state);
    if (points === null) throw new Error('the forklift is wanted');
    const along = points.wait.x - points.corner.x;
    const up = points.corner.y - points.drop.y;
    expect(points.drop.y).toBeCloseTo(10.5 + FORKLIFT_LOAD_AHEAD, 6);
    // Two seconds out: six cells along the front strip, loaded, facing nw, frames playing.
    drive(written, state, 100, 2100);
    const now = forkliftNow();
    expect(now?.at.x).toBeCloseTo(points.wait.x - 2 * FORKLIFT_CELLS_PER_SECOND, 1);
    expect(now?.facing).toBe('nw');
    const art = written.querySelector('[data-forklift-art]');
    expect(art?.querySelector('image')?.getAttribute('href')).toBe(`/sprites/${FORKLIFT_SHEETS.loaded.file}`);
    expect(art?.getAttribute('data-row')).toBe(String(FORKLIFT_SHEETS.loaded.rows.nw));
    // Round the corner and up the left strip, facing ne.
    const toCorner = (along / FORKLIFT_CELLS_PER_SECOND) * 1000;
    drive(written, state, 2100, 100 + toCorner + 1000);
    expect(forkliftNow()?.facing).toBe('ne');
    expect(forkliftNow()?.leg).toBe('out');
    // Set down: the pallet is drawn at the gate and the forklift is empty, on its way back.
    const out = toCorner + (up / FORKLIFT_CELLS_PER_SECOND) * 1000;
    drive(written, state, 100 + toCorner + 1000, 100 + out + 300);
    expect(forkliftNow()?.leg).toBe('back');
    expect(forkliftNow()?.facing).toBe('sw');
    expect(written.querySelector('[data-line-pallet="0"]')?.hasAttribute('visibility')).toBe(false);
    expect(written.querySelector('[data-forklift-art] image')?.getAttribute('href')).toBe(`/sprites/${FORKLIFT_SHEETS.empty.file}`);
    // Down the left strip, along the front, and waiting again facing nw on frame 0.
    drive(written, state, 100 + out + 300, 100 + out + (up / FORKLIFT_CELLS_PER_SECOND) * 1000 + 500);
    expect(forkliftNow()?.facing).toBe('se');
    drive(written, state, 100 + out + (up / FORKLIFT_CELLS_PER_SECOND) * 1000 + 500, 100 + 2 * out + 1000);
    expect(forkliftNow()?.leg).toBe('wait');
    expect(forkliftNow()?.facing).toBe('nw');
    expect(written.querySelector('[data-forklift-art]')?.getAttribute('data-frame')).toBe('0');
    // About thirty seconds there and back with the line at (2, 14) in the 800 m2 hall.
    expect((2 * (along + up)) / FORKLIFT_CELLS_PER_SECOND).toBeGreaterThan(25);
    expect((2 * (along + up)) / FORKLIFT_CELLS_PER_SECOND).toBeLessThan(35);
  });

  it('goes on while the clock is paused, and a page written mid trip leaves it where it is', () => {
    const state = withLine();
    state.speed = 0;
    setWalkPace(0);
    const holder = page(state, 0);
    state.windowLine.palletsAtGate = 1;
    drive(holder, state, 0, 3000);
    const there = forkliftNow()?.at;
    const again = page(state, 3000);
    const node = again.querySelector('[data-forklift]');
    expect(node?.getAttribute('data-forklift')).toBe('out');
    expect(forkliftNow()?.at).toEqual(there);
    const wait = forkliftPoints(state)?.wait ?? { x: 0, y: 0 };
    const waiting = tileToScreen(wait.x, wait.y);
    expect(node?.getAttribute('transform')).not.toBe(`translate(${waiting.x.toFixed(2)},${waiting.y.toFixed(2)})`);
  });

  it('draws a pallet sent while it is out at the gate at once, and starts no second trip', () => {
    const state = withLine();
    const holder = page(state, 0);
    state.windowLine.palletsAtGate = 1;
    drive(holder, state, 0, 1000);
    state.windowLine.palletsAtGate = 2;
    const written = page(state, 1000);
    expect(written.querySelector('[data-line-pallet="0"]')?.getAttribute('visibility')).toBe('hidden');
    expect(written.querySelector('[data-line-pallet="1"]')?.hasAttribute('visibility')).toBe(false);
    expect(forkliftNow()?.onTheForks).toBe(0);
  });

  it('draws no trip from 30x, and forgets one at a move, a sale, a load and a new morning', () => {
    const fast = withLine();
    const holder = page(fast, 0);
    setWalkPace(WALK_SKIPPED_FROM_SPEED);
    fast.windowLine.palletsAtGate = 1;
    stepForklift(holder, fast, 100);
    expect(forkliftNow()?.leg).toBe('wait');
    expect(page(fast, 100).querySelector('[data-line-pallet="0"]')?.hasAttribute('visibility')).toBe(false);
    setWalkPace(1);
    // A move: the line elsewhere, the trip forgotten.
    const state = withLine();
    const moving = page(state, 0);
    state.windowLine.palletsAtGate = 1;
    drive(moving, state, 0, 1000);
    expect(forkliftNow()?.leg).toBe('out');
    for (const item of state.equipment) if (LINE_MODULES.includes(item.specId)) item.anchorY = 11;
    stepForklift(moving, state, 1100);
    expect(forkliftNow()?.leg).toBe('wait');
    // A sale: no forklift at all.
    for (const item of state.equipment) if (LINE_MODULES.includes(item.specId)) item.soldOnDay = state.clock.day + 1;
    stepForklift(moving, state, 1200);
    expect(forkliftNow()).toBeNull();
    // A load or a new morning is the app's `resetForklift`.
    resetForklift();
    expect(forkliftNow()).toBeNull();
  });

  it('changes nothing of the game', () => {
    const state = withLine();
    const before = JSON.stringify(state);
    const holder = page(state, 0);
    drive(holder, state, 0, 2000);
    expect(JSON.stringify(state)).toBe(before);
  });
});

describe('the pallet at the gate (CLAUDE.md T31 2.10)', () => {
  it('is drawn from its picture, two at the most, the second beside the first along x, with its label', () => {
    const state = withLine();
    state.windowLine.palletsAtGate = 3;
    const holder = page(state, 0);
    const pallets = Array.from(holder.querySelectorAll('[data-line-pallet]'));
    expect(pallets).toHaveLength(2);
    for (const pallet of pallets) {
      expect(pallet.querySelector('image')?.getAttribute('href')).toBe('/sprites/windowPallet.standard.png');
    }
    expect(holder.textContent).toContain('Windows for collection: 3 pallets');
  });
});

describe('the three pictures of L3 (CLAUDE.md T31 2.10)', () => {
  it('are in public/sprites byte for byte the art side s, in the manifest, and docs/pictures-l3 is gone', () => {
    const sums = readFileSync('docs/art/pack-l3-1110/checksums.sha256', 'utf8');
    const owed: Array<[string, string]> = [
      ['windowPallet.standard.png', 'sprites-2x/0/windowPallet.standard.png'],
      ['vehicle.forklift.drive.sheet.png', 'sheets/vehicle.forklift.drive.sheet.png'],
      ['vehicle.forklift.driveLoaded.sheet.png', 'sheets/vehicle.forklift.driveLoaded.sheet.png'],
    ];
    for (const [file, delivered] of owed) {
      const hash = createHash('sha256').update(readFileSync(`public/sprites/${file}`)).digest('hex');
      expect(sums, file).toContain(`${hash}  ${delivered}`);
      expect(spriteFiles(), file).toContain(file);
    }
    expect(readdirSync('docs')).not.toContain('pictures-l3');
    const pallet = readFileSync('public/sprites/windowPallet.standard.png');
    expect([pallet.readUInt32BE(16), pallet.readUInt32BE(20)]).toEqual([160, 172]);
    const sheet = readFileSync('public/sprites/vehicle.forklift.drive.sheet.png');
    expect([sheet.readUInt32BE(16), sheet.readUInt32BE(20)]).toEqual([6 * 272, 4 * 256]);
  });

  it('writes the sheets figures once, from the two JSONs of the pack', () => {
    for (const load of ['empty', 'loaded'] as const) {
      const sheet = FORKLIFT_SHEETS[load];
      const json = JSON.parse(readFileSync(`docs/art/pack-l3-1110/sheets/${sheet.file.replace('.png', '.json')}`, 'utf8')) as Record<string, unknown>;
      expect(json).toEqual({
        cellWidth: sheet.cellWidth,
        cellHeight: sheet.cellHeight,
        anchorX: sheet.anchorX,
        anchorY: sheet.anchorY,
        frames: sheet.frames,
        fps: sheet.fps,
        rows: sheet.rows,
        loop: sheet.loop,
      });
    }
  });
});

describe('in the app (CLAUDE.md T31 2.10)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('hides the pallet on the forks at the page written after it left module 6, and drives in the frame loop itself', () => {
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
    Object.assign(state, withLine());
    render();
    expect(root.querySelector('[data-forklift]')?.getAttribute('data-forklift')).toBe('wait');
    state.windowLine.palletsAtGate = 1;
    render();
    expect(root.querySelector('[data-line-pallet="0"]')?.getAttribute('visibility')).toBe('hidden');
    expect(root.querySelector('[data-forklift]')?.getAttribute('data-forklift')).toBe('out');
    const before = root.querySelector('[data-forklift]')?.getAttribute('transform');
    const next = loop as FrameRequestCallback | null;
    if (next === null) throw new Error('the loop asked for a frame');
    next(100);
    next(600);
    expect(root.querySelector('[data-forklift]')?.getAttribute('transform')).not.toBe(before);
  });
});
