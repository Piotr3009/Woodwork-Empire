/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// @vitest-environment jsdom
// v94: the line engineers in red shirts walking along their line [PIOTR, 11.10: "the engineers in
// red shirts walk along the line all the time"; 12.10: "the same picture, only the shirts red, no
// sense waiting for a new picture"]: the joiner's sheets with the shirt red, as many walking as are
// on duty for the line, along the metre in front of it and back at a man's pace, on a working day
// until the crew goes home, the renderer's alone.

import { readFileSync } from 'node:fs';
import { beforeEach, describe, expect, it } from 'vitest';
import { DAY_END_MINUTE, LINE_MODULES, WALK_CELLS_PER_SECOND, WINDOW_LINE_ORIGIN } from '../../src/engine/constants';
import type { GameState, Worker } from '../../src/engine/index';
import { lineState } from '../../src/engine/lineContract';
import { setWalkPace } from '../../src/render/characters';
import {
  ENGINEER_ROLE,
  engineerPath,
  engineerWalk,
  engineersArt,
  engineersWalking,
  resetEngineers,
  stepEngineers,
  syncEngineers,
} from '../../src/render/engineers';
import { renderHall } from '../../src/render/hall';
import { tileToScreen } from '../../src/render/iso';
import { spriteFiles } from '../../src/render/sprites';
import { act, buyStartingKit, newGame, nextDay, placeEquipment, testJoiner, withAir } from '../helpers';

function bigUnit(): GameState {
  let state = newGame({ difficulty: 'veryEasy' });
  state.cash = 9000000;
  state = nextDay(act(state, { type: 'EXTEND_UNIT' }));
  state = nextDay(act(state, { type: 'EXTEND_UNIT', stage: 'second' }));
  state = withAir(buyStartingKit(state), 'industrial');
  state.enquiries = [];
  for (const item of state.equipment) {
    if (item.specId === 'sheetRack') [item.anchorX, item.anchorY] = [11, 2];
    if (item.specId === 'workbench') [item.anchorX, item.anchorY] = [14, 3];
  }
  state.speed = 1;
  state.activeEvent = null;
  state.eventQueue = [];
  return state;
}

function engineer(id: string): Worker {
  return { ...testJoiner(id, id), role: 'lineEngineer', tier: null, rate: 0, monthlyWage: 15000 };
}

/** Lines standing at these places, with this many engineers on the books and on duty. */
function withLines(places: { x: number; y: number }[], engineers: number): GameState {
  const state = bigUnit();
  places.forEach((at, n) => {
    const line = n + 1;
    LINE_MODULES.forEach((id, index) => placeEquipment(state, id, { x: at.x + 6 * index, y: at.y, id: `kit-line-${line}-${index + 1}` }));
    for (const item of state.equipment) if (item.id.startsWith(`kit-line-${line}-`)) item.line = line;
    lineState(state, line);
  });
  for (let n = 1; n <= engineers; n += 1) state.workers.push(engineer(`eng-${n}`));
  return state;
}

/** The hall as the app writes it, with the engineers put back where their walks had got to. */
function page(state: GameState, nowMs: number): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = renderHall(state);
  syncEngineers(holder, state, nowMs);
  return holder;
}

/** Steps the walks from `fromMs` to `toMs` a tenth of a second at a time, as the frames do. */
function walk(holder: HTMLElement, state: GameState, fromMs: number, toMs: number): void {
  for (let at = fromMs + 100; at <= toMs; at += 100) stepEngineers(holder, state, at);
}

beforeEach(() => {
  resetEngineers();
  setWalkPace(1);
});

describe('the red shirts (v94)', () => {
  it('are the joiner s idle and walk sheets with the shirt red, the same cells, anchors, rows and frames', () => {
    const files = spriteFiles();
    expect(files).toContain('character.lineEngineer.walk.sheet.png');
    expect(files).toContain('character.lineEngineer.idle.sheet.png');
    const characters = JSON.parse(readFileSync('public/sprites/characters.json', 'utf8')) as Record<string, Record<string, unknown>>;
    for (const animation of ['walk', 'idle']) {
      const joiner = characters[`character.joiner.${animation}`];
      const engineer = characters[`character.lineEngineer.${animation}`];
      expect(engineer, animation).toBeDefined();
      for (const field of ['cellWidth', 'cellHeight', 'anchorX', 'anchorY', 'frames', 'rows']) {
        expect(engineer?.[field], `${animation} ${field}`).toEqual(joiner?.[field]);
      }
    }
    expect(readFileSync('scripts/engineer-shirt.py', 'utf8')).toContain("TARGET = 'character.lineEngineer'");
  });
});

describe('who walks, and where (v94)', () => {
  it('walks as many engineers as are on duty for each line, line 1 first, and none with none', () => {
    const two = withLines([WINDOW_LINE_ORIGIN, { x: 2, y: 7 }], 3);
    expect(engineersWalking(two, 1)).toBe(2);
    expect(engineersWalking(two, 2)).toBe(1);
    const drawn = engineersArt(two);
    expect(drawn).toHaveLength(3);
    const holder = page(two, 0);
    expect(Array.from(holder.querySelectorAll('[data-engineer]')).map((node) => node.getAttribute('data-engineer')).sort()).toEqual([
      '1:0',
      '1:1',
      '2:0',
    ]);
    const art = holder.querySelector('[data-engineer="1:0"] [data-character]');
    expect(art?.getAttribute('data-character')).toBe(ENGINEER_ROLE);
    expect(art?.getAttribute('data-anim')).toBe('walk');
    expect(engineersArt(withLines([WINDOW_LINE_ORIGIN], 0))).toEqual([]);
    // One off today: one walks.
    const off = withLines([WINDOW_LINE_ORIGIN], 2);
    const first = off.workers.find((worker) => worker.id === 'eng-1');
    if (first === undefined) throw new Error('the engineer is wanted');
    first.absentDaysRemaining = 1;
    expect(engineersWalking(off, 1)).toBe(1);
  });

  it('walks nobody once the crew has gone home', () => {
    const state = withLines([WINDOW_LINE_ORIGIN], 2);
    state.clock.minute = DAY_END_MINUTE + 10;
    expect(engineersWalking(state, 1)).toBe(0);
    expect(page(state, 0).querySelectorAll('[data-engineer]')).toHaveLength(0);
  });

  it('walks the middle of the metre in front of the line, from half a metre in at module 1 s end to half a metre in at module 6 s', () => {
    const state = withLines([WINDOW_LINE_ORIGIN], 2);
    expect(engineerPath(state, 1)).toEqual({ from: { x: 2.5, y: 17.5 }, length: 35, key: '1:2,14' });
    // A line of Turn 30 with no lane has its metre all the same, and its engineers walk it.
    const near = withLines([{ x: 2, y: 15 }], 2);
    expect(engineerPath(near, 1)?.from).toEqual({ x: 2.5, y: 18.5 });
    expect(engineersArt(near)).toHaveLength(2);
  });
});

describe('the walk (v94)', () => {
  it('starts the first at module 1 s end facing down the line and the second at module 6 s facing up it, a little apart across the metre', () => {
    const state = withLines([WINDOW_LINE_ORIGIN], 2);
    const holder = page(state, 0);
    const first = holder.querySelector('[data-engineer="1:0"]');
    const second = holder.querySelector('[data-engineer="1:1"]');
    const at = (x: number, y: number): string => {
      const point = tileToScreen(x, y);
      return `translate(${point.x.toFixed(2)},${point.y.toFixed(2)})`;
    };
    expect(first?.getAttribute('transform')).toBe(at(2.5, 17.28));
    expect(second?.getAttribute('transform')).toBe(at(37.5, 17.72));
    expect(first?.querySelector('[data-character]')?.getAttribute('data-facing')).toBe('se');
    expect(second?.querySelector('[data-character]')?.getAttribute('data-facing')).toBe('nw');
  });

  it('walks at a man s pace in real time, turns at each end, and a page written mid walk leaves them where they are', () => {
    const state = withLines([WINDOW_LINE_ORIGIN], 2);
    const holder = page(state, 0);
    walk(holder, state, 0, 2000);
    expect(engineerWalk(1, 0)?.along).toBeCloseTo(2 * WALK_CELLS_PER_SECOND, 6);
    expect(engineerWalk(1, 1)?.along).toBeCloseTo(35 - 2 * WALK_CELLS_PER_SECOND, 6);
    // A page written: put back where they had got to.
    const again = page(state, 2000);
    const point = tileToScreen(2.5 + 2 * WALK_CELLS_PER_SECOND, 17.28);
    expect(again.querySelector('[data-engineer="1:0"]')?.getAttribute('transform')).toBe(
      `translate(${point.x.toFixed(2)},${point.y.toFixed(2)})`,
    );
    // Thirty seconds on, the first is past the far end and on his way back, facing up the line.
    walk(again, state, 2000, 26000);
    const first = engineerWalk(1, 0);
    expect(first?.direction).toBe(-1);
    expect(first?.along).toBeCloseTo(35 - (26 * WALK_CELLS_PER_SECOND - 35), 6);
    expect(again.querySelector('[data-engineer="1:0"] [data-character]')?.getAttribute('data-facing')).toBe('nw');
  });

  it('starts again at the ends when the line is moved, and is forgotten when its engineers go', () => {
    const state = withLines([WINDOW_LINE_ORIGIN], 2);
    const holder = page(state, 0);
    walk(holder, state, 0, 2000);
    for (const item of state.equipment) if (item.line === 1) item.anchorY -= 1;
    walk(holder, state, 2000, 2100);
    expect(engineerWalk(1, 0)?.key).toBe('1:2,13');
    expect(engineerWalk(1, 0)?.along).toBe(0);
    walk(holder, state, 2100, 2200);
    expect(engineerWalk(1, 0)?.along).toBeCloseTo(0.1 * WALK_CELLS_PER_SECOND, 6);
    state.workers = state.workers.filter((worker) => worker.role !== 'lineEngineer');
    walk(holder, state, 2200, 2300);
    expect(engineerWalk(1, 0)).toBeNull();
  });
});
