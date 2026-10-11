/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// @vitest-environment jsdom
// Turn 30, 2.11 and 2.12: the six modules' working motion and the windows on module 6's pallet
// [PIOTR, 10.10: "a view of the windows moving along the line, of the arms working"; 11.10: "put the
// animation pictures into the code"] (CLAUDE.md T30 2.11, 2.12, section 7).

import { afterEach, describe, expect, it, vi } from 'vitest';
import { LINE_MODULES, MACHINE_WORK_SHEETS } from '../../src/engine/constants';
import type { GameState } from '../../src/engine/index';
import { moduleWorks, renderHall } from '../../src/render/hall';
import { playSheets } from '../../src/render/sprites';
import { currentState, mount, render } from '../../src/ui/app';
import { machineInUse } from '../../src/engine/game';
import { drawnInUse } from '../../src/engine/drawn';
import { act, buyStartingKit, newGame, nextDay, placeEquipment, testJoiner, withAir } from '../helpers';

// The men drawn at the machines are the hall's own reading of the day plan; the one test of a man
// drawn at a module stands one there through it (CLAUDE.md T30 2.11).
vi.mock('../../src/engine/drawn', async (importOriginal) => {
  const real = (await importOriginal()) as { drawnInUse: (...args: never[]) => Set<string> };
  return { ...real, drawnInUse: vi.fn(real.drawnInUse) };
});

/** A company in the 800 m² unit with the whole line standing, two engineers, and the line's
 *  contract running at nine in the morning of a working day, the clock at 1x. */
function working(): GameState {
  let state = newGame({ difficulty: 'veryEasy' });
  state.cash = 9000000;
  state = nextDay(act(state, { type: 'EXTEND_UNIT' }));
  state = nextDay(act(state, { type: 'EXTEND_UNIT', stage: 'second' }));
  state = withAir(buyStartingKit(state), 'industrial');
  LINE_MODULES.forEach((id, index) => placeEquipment(state, id, { x: 2 + 6 * index, y: 14, id: `kit-line-${index + 1}` }));
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
  state.clock.minute = 60;
  state.speed = 1;
  state.activeEvent = null;
  state.eventQueue = [];
  return state;
}

function hall(state: GameState): HTMLElement {
  const page = document.createElement('div');
  page.innerHTML = renderHall(state);
  return page;
}

describe('the modules at work (CLAUDE.md T30 2.11)', () => {
  it('draws the six from their sheets while the contract makes windows and the clock runs', () => {
    const state = working();
    const page = hall(state);
    const sheets = Array.from(page.querySelectorAll('[data-sheet]'));
    expect(sheets.map((node) => node.getAttribute('data-sheet'))).toEqual([...LINE_MODULES]);
    for (const node of sheets) {
      const family = node.getAttribute('data-sheet') ?? '';
      expect(node.getAttribute('data-frame'), family).toBe('0');
      expect(node.getAttribute('data-frames'), family).toBe('12');
      // Four times slower than the art side drew it from v90 (PIOTR, 11.10).
      expect(node.getAttribute('data-fps'), family).toBe('1.5');
      expect(node.getAttribute('viewBox'), family).toBe('0 0 448 376');
      expect(node.querySelector('image')?.getAttribute('href'), family).toBe(`/sprites/${family}.standard.work.sheet.png`);
      // In the module's own drawable, in place of its picture.
      const kit = node.closest('[data-kit]');
      expect(kit?.querySelector(`image[href="/sprites/${family}.standard.png"]`), family).toBeNull();
    }
    expect(MACHINE_WORK_SHEETS.windowLine1).toEqual({
      frames: 12,
      fps: 1.5,
      frameWidth: 448,
      frameHeight: 376,
      anchorX: 296,
      anchorY: 368,
      loop: true,
    });
    // The loop is eight seconds: the art side's two, four times slower (PIOTR, 11.10; v90).
    const sheet = MACHINE_WORK_SHEETS.windowLine1;
    if (sheet === undefined) throw new Error('module 1 has its sheet');
    expect(sheet.frames / sheet.fps).toBe(8);
  });

  it('draws them from their pictures once the clock stands, a card is open, or the line makes no window', () => {
    const paused = working();
    paused.speed = 0;
    const carded = working();
    carded.activeEvent = { id: 'event-x', kind: 'monthEnd', title: 'x', body: 'x', choices: [{ id: 'ok', label: 'Right' }], data: {}, day: 1, minute: 0 };
    const dinner = working();
    dinner.clock.minute = 250;
    const short = working();
    short.workers = short.workers.filter((worker) => worker.id !== 'eng-2');
    for (const state of [paused, carded, dinner, short]) {
      const page = hall(state);
      expect(page.querySelector('[data-sheet]')).toBeNull();
      for (const id of LINE_MODULES) {
        expect(page.querySelector(`image[href="/sprites/${id}.standard.png"]`), id).not.toBeNull();
      }
      for (const item of state.equipment.filter((entry) => LINE_MODULES.includes(entry.specId))) {
        expect(moduleWorks(state, item), item.id).toBe(false);
      }
    }
  });

  it('without the contract, plays a module only while the hall reads it in use', () => {
    const state = working();
    state.windowLine.contract = null;
    const page = hall(state);
    // Nobody is drawn at any module here, so none plays.
    expect(page.querySelector('[data-sheet]')).toBeNull();
    // A man drawn at module 3 this minute: module 3 plays, and only it.
    vi.mocked(drawnInUse).mockReturnValue(new Set(['kit-line-3']));
    const module3 = state.equipment.find((item) => item.id === 'kit-line-3');
    if (module3 === undefined) throw new Error('module 3 stands');
    expect(machineInUse(state, module3)).toBe(true);
    const drawn = Array.from(hall(state).querySelectorAll('[data-sheet]')).map((node) => node.getAttribute('data-sheet'));
    expect(drawn).toEqual(['windowLine3']);
    vi.mocked(drawnInUse).mockRestore();
  });
});

describe('playSheets (CLAUDE.md T30 2.11)', () => {
  function sheetPage(): HTMLElement {
    const page = document.createElement('div');
    page.innerHTML =
      '<svg><svg data-sheet="windowLine1" data-frame="0" data-frames="12" data-fps="6" viewBox="0 0 448 376"></svg>' +
      '<svg data-sheet="windowLine2" data-frame="0" data-frames="12" data-fps="6" viewBox="0 0 448 376"></svg></svg>';
    return page;
  }

  it('moves every sheet to the frame real time asks for, all in step, writing only the frame and the view box', () => {
    const page = sheetPage();
    playSheets(page, 500, true);
    for (const node of Array.from(page.querySelectorAll('[data-sheet]'))) {
      expect(node.getAttribute('data-frame')).toBe('3');
      expect(node.getAttribute('viewBox')).toBe(`${3 * 448} 0 448 376`);
    }
    // The loop is two seconds: 2.5 s is frame 3 again.
    playSheets(page, 2500, true);
    expect(page.querySelector('[data-sheet]')?.getAttribute('data-frame')).toBe('3');
  });

  it('writes nothing while the frame is the same, and holds every sheet while the clock stands', () => {
    const page = sheetPage();
    playSheets(page, 500, true);
    const first = page.querySelector('[data-sheet]');
    first?.setAttribute('viewBox', 'held');
    playSheets(page, 600, true);
    expect(first?.getAttribute('viewBox')).toBe('held');
    playSheets(page, 1700, false);
    expect(first?.getAttribute('data-frame')).toBe('3');
  });
});

describe('the windows on module 6 s pallet (CLAUDE.md T30 2.12)', () => {
  it('draws the one overlay of that many windows over module 6, playing or standing still, and none on an empty pallet', () => {
    for (const playing of [true, false]) {
      const state = working();
      if (!playing) state.speed = 0;
      state.windowLine.onPallet = 7;
      const page = hall(state);
      const stacks = Array.from(page.querySelectorAll('[data-stack]'));
      expect(stacks.map((node) => node.getAttribute('href')), String(playing)).toEqual(['/sprites/windowLine6.standard.stack07.png']);
      expect(stacks[0]?.closest('[data-kit]')?.getAttribute('data-kit'), String(playing)).toBe('kit-line-6');
    }
    const empty = working();
    empty.windowLine.onPallet = 0;
    expect(hall(empty).querySelector('[data-stack]')).toBeNull();
  });
});

describe('a page written mid loop (CLAUDE.md T30 2.11)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps the frame real time asks for, and never flashes the six back to frame 0', () => {
    document.body.innerHTML = '<div id="app"></div>';
    const root = document.querySelector<HTMLElement>('#app');
    if (root === null) throw new Error('the app root is wanted');
    mount(root);
    root.querySelector<HTMLButtonElement>('[data-do="startGame"]')?.click();
    const state = currentState();
    if (state === null) throw new Error('a game is wanted');
    Object.assign(state, working());
    // Six seconds into the loop: frame 9 at the game's 1.5 frames a second (v90).
    vi.spyOn(performance, 'now').mockReturnValue(6000);
    render();
    const sheets = Array.from(root.querySelectorAll('[data-sheet]'));
    expect(sheets).toHaveLength(6);
    for (const node of sheets) {
      expect(node.getAttribute('data-frame')).toBe('9');
      expect(node.getAttribute('viewBox')).toBe(`${9 * 448} 0 448 376`);
    }
  });
});

describe('the frame loop (CLAUDE.md T30 2.11)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('moves the six on to the frame real time asks for in the loop itself, before any page is written', () => {
    // The loop's next frame is caught instead of run, so the test runs it with the moment it likes.
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
    Object.assign(state, working());
    render();
    const frames = (): Array<string | null> => Array.from(root.querySelectorAll('[data-sheet]')).map((node) => node.getAttribute('data-frame'));
    expect(frames()).toEqual(['0', '0', '0', '0', '0', '0']);
    // Seven tenths of a second on at 1x: no game minute is due, so no page is written, and the loop
    // alone moves the sheets on, to frame 1 at the game's 1.5 frames a second (v90).
    const next = loop as FrameRequestCallback | null;
    if (next === null) throw new Error('the loop asked for a frame');
    next(700);
    expect(frames()).toEqual(['1', '1', '1', '1', '1', '1']);
  });
});
