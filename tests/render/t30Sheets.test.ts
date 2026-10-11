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
// animation pictures into the code"] (CLAUDE.md T30 2.11, 2.12, section 7), played from v91 at the
// speed it was drawn, one loop a game hour a module [PIOTR, 11.10: "at the speed it was drawn, but
// started now and then and not all the time"].

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
    sheets.forEach((node, index) => {
      const family = node.getAttribute('data-sheet') ?? '';
      expect(node.getAttribute('data-frame'), family).toBe('0');
      expect(node.getAttribute('data-frames'), family).toBe('12');
      // At the speed the art side drew it (PIOTR, 11.10: "at the speed it was drawn"; v91).
      expect(node.getAttribute('data-fps'), family).toBe('6');
      // One loop a game hour, module N at minute 10 (N - 1) of it (PIOTR, 11.10: "now and then"; v91).
      expect(node.getAttribute('data-every'), family).toBe('60');
      expect(node.getAttribute('data-at'), family).toBe(String(10 * index));
      expect(node.getAttribute('viewBox'), family).toBe('0 0 448 376');
      expect(node.querySelector('image')?.getAttribute('href'), family).toBe(`/sprites/${family}.standard.work.sheet.png`);
      // In the module's own drawable, in place of its picture.
      const kit = node.closest('[data-kit]');
      expect(kit?.querySelector(`image[href="/sprites/${family}.standard.png"]`), family).toBeNull();
    });
    expect(MACHINE_WORK_SHEETS.windowLine1).toEqual({
      frames: 12,
      fps: 6,
      frameWidth: 448,
      frameHeight: 376,
      anchorX: 296,
      anchorY: 368,
      loop: true,
      everyMinutes: 60,
      atMinute: 0,
    });
    expect(MACHINE_WORK_SHEETS.windowLine6?.atMinute).toBe(50);
    // The loop is the art side's two seconds (v91).
    const sheet = MACHINE_WORK_SHEETS.windowLine1;
    if (sheet === undefined) throw new Error('module 1 has its sheet');
    expect(sheet.frames / sheet.fps).toBe(2);
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

describe('playSheets (CLAUDE.md T30 2.11; v91)', () => {
  /** Two modules' sheets as the hall writes them: module 1 starts its loop at the hour, module 2 ten
   *  minutes after it. */
  function sheetPage(): HTMLElement {
    const page = document.createElement('div');
    page.innerHTML =
      '<svg><svg class="machine-sheet" data-sheet="windowLine1" data-frame="0" data-frames="12" data-fps="6" data-every="60" data-at="0" viewBox="0 0 448 376"></svg>' +
      '<svg class="machine-sheet" data-sheet="windowLine2" data-frame="0" data-frames="12" data-fps="6" data-every="60" data-at="10" viewBox="0 0 448 376"></svg></svg>';
    return page;
  }

  function frameOf(page: HTMLElement, family: string): string | null {
    return page.querySelector(`[data-sheet="${family}"]`)?.getAttribute('data-frame') ?? null;
  }

  /** Every call at which a module showed anything but its picture, as `call:frame`. */
  function played(seen: ReadonlyArray<Record<string, string | null>>, family: string): string[] {
    return seen.flatMap((frames, call) => (frames[family] === '0' ? [] : [`${call}:${frames[family]}`]));
  }

  it('holds each sheet on its picture until its minute of the hour, plays one loop of two seconds at 6 frames a second, and stands again', () => {
    const page = sheetPage();
    // At 1x, every half second from 8:55 to 10:02: a game minute a real second.
    const seen = Array.from({ length: 136 }, (_, call) => {
      playSheets(page, 100000 + 500 * call, { day: 501, minute: 55 + Math.floor(call / 2) });
      return { windowLine1: frameOf(page, 'windowLine1'), windowLine2: frameOf(page, 'windowLine2') };
    });
    // Module 1 at 9:00 (call 10) and again at 10:00 (call 130); module 2 at 9:10 (call 30). Each loop
    // is two seconds, frames 0 to 11, and between two loops the module stands on frame 0.
    expect(played(seen, 'windowLine1')).toEqual(['11:3', '12:6', '13:9', '131:3', '132:6', '133:9']);
    expect(played(seen, 'windowLine2')).toEqual(['31:3', '32:6', '33:9']);
    expect(page.querySelector('[data-sheet="windowLine1"]')?.getAttribute('viewBox')).toBe('0 0 448 376');
  });

  it('writes only the frame and the view box, only when the frame changes, and holds every sheet while the clock stands', () => {
    const page = sheetPage();
    // Seen first on its own minute, 9:00, module 1 plays at once; module 2 waits for 9:10.
    playSheets(page, 200000, { day: 502, minute: 60 });
    playSheets(page, 200500, { day: 502, minute: 60 });
    const first = page.querySelector('[data-sheet="windowLine1"]');
    if (first === null) throw new Error('module 1 has its sheet');
    expect(first.getAttribute('data-frame')).toBe('3');
    expect(first.getAttribute('viewBox')).toBe(`${3 * 448} 0 448 376`);
    expect(frameOf(page, 'windowLine2')).toBe('0');
    const writes = vi.spyOn(first, 'setAttribute');
    // Still frame 3 a tenth of a second on: nothing written.
    playSheets(page, 200600, { day: 502, minute: 60 });
    expect(writes).not.toHaveBeenCalled();
    // Frame 4: the frame and the view box, and nothing else.
    playSheets(page, 200700, { day: 502, minute: 60 });
    expect(writes.mock.calls.map(([name]) => name)).toEqual(['data-frame', 'viewBox']);
    writes.mockRestore();
    // The clock stands: every sheet holds where it is.
    playSheets(page, 201700, null);
    expect(first.getAttribute('data-frame')).toBe('4');
  });

  it('at a fast clock lets the next loop follow on at the end of the one playing, with no stop', () => {
    const page = sheetPage();
    // At 100x, every tenth of a second: ten game minutes, so module 1's minute comes every 0.6 s.
    const seen = Array.from({ length: 61 }, (_, call) => {
      playSheets(page, 300000 + 100 * call, { day: 503, minute: 55 + 10 * call });
      return frameOf(page, 'windowLine1');
    });
    // Its first loop starts at call 1 (10:05, past 9:00) and the loops run on from there.
    expect(seen.slice(1)).toEqual(seen.slice(1).map((_, call) => String(Math.floor((((100 * call) % 2000) * 6) / 1000))));
  });

  it('back after standing, a sheet waits for its next minute, so the six never all start together', () => {
    const page = sheetPage();
    playSheets(page, 400000, { day: 504, minute: 230 });
    playSheets(page, 400500, { day: 504, minute: 230 });
    // The dinner hour: the line stands and its sheets are off the page for a minute of real time.
    // Back at 13:10, module 2's minute, module 2 plays; module 1's 13:00 went by while it stood.
    playSheets(page, 461000, { day: 504, minute: 310 });
    playSheets(page, 461500, { day: 504, minute: 310 });
    expect(frameOf(page, 'windowLine1')).toBe('0');
    expect(frameOf(page, 'windowLine2')).toBe('3');
    // A new morning: module 1's minute is 8:00, and module 2 stands until 8:10.
    playSheets(page, 462000, { day: 505, minute: 0 });
    playSheets(page, 462500, { day: 505, minute: 0 });
    expect(frameOf(page, 'windowLine1')).toBe('3');
    expect(frameOf(page, 'windowLine2')).toBe('0');
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

  it('keeps the frame the loop is at, and never flashes the six back to frame 0', () => {
    document.body.innerHTML = '<div id="app"></div>';
    const root = document.querySelector<HTMLElement>('#app');
    if (root === null) throw new Error('the app root is wanted');
    mount(root);
    root.querySelector<HTMLButtonElement>('[data-do="startGame"]')?.click();
    const state = currentState();
    if (state === null) throw new Error('a game is wanted');
    Object.assign(state, working());
    // 8:59: the six stand on their pictures.
    state.clock.minute = 59;
    const now = vi.spyOn(performance, 'now').mockReturnValue(5000);
    render();
    // 9:00, module 1's minute: its loop starts (v91).
    state.clock.minute = 60;
    now.mockReturnValue(5100);
    render();
    // A second and a half into it, through pages written afresh three quarters of a second apart:
    // frame 9 at 6 frames a second.
    now.mockReturnValue(5850);
    render();
    now.mockReturnValue(6600);
    render();
    const sheets = Array.from(root.querySelectorAll('[data-sheet]'));
    expect(sheets.map((node) => node.getAttribute('data-frame'))).toEqual(['9', '0', '0', '0', '0', '0']);
    expect(sheets[0]?.getAttribute('viewBox')).toBe(`${9 * 448} 0 448 376`);
  });
});

describe('the frame loop (CLAUDE.md T30 2.11)', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('moves a module on through its loop in the frame loop itself, before any page is written', () => {
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
    state.clock.minute = 59;
    render();
    const frames = (): Array<string | null> => Array.from(root.querySelectorAll('[data-sheet]')).map((node) => node.getAttribute('data-frame'));
    expect(frames()).toEqual(['0', '0', '0', '0', '0', '0']);
    const next = loop as FrameRequestCallback | null;
    if (next === null) throw new Error('the loop asked for a frame');
    // 9:00, module 1's minute: its loop starts in the loop's own frame.
    state.clock.minute = 60;
    next(100);
    expect(frames()).toEqual(['0', '0', '0', '0', '0', '0']);
    // Six tenths of a second on at 1x: no game minute is due, so no page is written, and the loop
    // alone moves module 1 on, to frame 3 at 6 frames a second; the other five wait for their minute
    // (v91).
    next(700);
    expect(frames()).toEqual(['3', '0', '0', '0', '0', '0']);
  });
});
