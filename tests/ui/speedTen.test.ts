// @vitest-environment jsdom
// Speed times ten (PIOTR, 13.09; CLAUDE.md T9 3.11). A fifth chip, and the one speed the game ever
// takes the clock to for the player is that chip. Speed times thirty beside it (PIOTR, 15.09;
// CLAUDE.md T14 2.4): a sixth chip off the same table, a working day in sixteen real seconds, and
// everything that stops the clock stops it there as it does at ten.

import { beforeAll, describe, expect, it } from 'vitest';
import {
  MINUTES_PER_WORKING_DAY,
  SITE_MEASURE_MINUTES,
  SKIP_SPEED,
  SPEEDS,
} from '../../src/engine/constants';
import { gameMinutesPerRealSecond } from '../../src/engine/clock';
import { skippedTask } from '../../src/engine/tasks';
import { speedFromString } from '../../src/ui/topbar';
import { advanceMinutes, currentState, mount, render } from '../../src/ui/app';
import type { GameEventKind } from '../../src/engine/index';
import { act, buyStartingKit, clearEvents, fillRack, newGame, runClock } from '../helpers';
import type { GameState, TaskInstance } from '../../src/engine/index';

function root(): HTMLElement {
  const element = document.querySelector('#app');
  if (!(element instanceof HTMLElement)) throw new Error('no root');
  return element;
}

function click(selector: string): void {
  const element = root().querySelector(selector);
  if (element === null) throw new Error(`nothing to click: ${selector}`);
  element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
}

/** A site measure on the list, which is one of the three things that take the owner out. */
function measuring(): GameState {
  const state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })));
  state.enquiries = [];
  const task: TaskInstance = {
    id: 'task-measure',
    kind: 'siteMeasure',
    category: 'admin',
    label: 'Site measure: Wardrobe',
    minutesTotal: SITE_MEASURE_MINUTES,
    minutesRemaining: SITE_MEASURE_MINUTES,
    jobId: null,
    equipmentId: null,
    deliveryId: null,
    orderIds: [],
    day: state.clock.day,
    done: false,
    doneDay: null,
    doneBy: null,
    orders: [],
  };
  state.tasks.push(task);
  return act(state, { type: 'START_TASK', taskId: task.id });
}

beforeAll(() => {
  document.body.innerHTML = '<div id="app"></div>';
  mount(root());
  click('[data-do="startGame"]');
});

/** Answers whatever the day has put up, the house card and the summary included. */
function dismissEvents(): void {
  let guard = 0;
  while (root().querySelector('[data-do="closeHouseCard"], [data-do="resolveEvent"]') !== null && guard < 50) {
    click('[data-do="closeHouseCard"], [data-do="resolveEvent"]');
    guard += 1;
  }
}

describe('the fifth chip', () => {
  it('is ten, and the top bar offers it', () => {
    expect([...SPEEDS]).toEqual([0, 1, 2, 4, 10, 30]);
    expect(speedFromString('10')).toBe(10);
    expect(root().querySelector('[data-do="setSpeed"][data-speed="10"]')).not.toBeNull();
    click('[data-do="setSpeed"][data-speed="10"]');
    expect(currentState()?.speed).toBe(10);
    expect(root().innerHTML).toContain('class="chip knob is-on" data-do="setSpeed" data-speed="10"');
  });

  it('runs a thousand minutes in a hundred real seconds, across the day boundaries', () => {
    const perSecond = gameMinutesPerRealSecond(10);
    expect(perSecond).toBe(10);
    expect(perSecond * 100).toBe(1000);
    // Two working days are 960 minutes of work, so a thousand is over the boundary and well into
    // the day after it.
    expect(1000).toBeGreaterThan(MINUTES_PER_WORKING_DAY * 2);
    const state = currentState();
    if (state === null) throw new Error('no game');
    const day = state.clock.day;
    let ran = 0;
    let guard = 0;
    while (ran < 1000 && guard < 400) {
      guard += 1;
      const step = advanceMinutes(Math.min(10, 1000 - ran));
      ran += step;
      // Whatever the day puts up stops the clock until it is answered (CLAUDE.md T7 3.10).
      const asking = root().querySelector('[data-do="closeHouseCard"], [data-do="resolveEvent"]');
      if (asking !== null) asking.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }
    expect(ran).toBe(1000);
    expect(currentState()?.clock.day ?? 0).toBeGreaterThan(day);
  });

  it('stops for an event the same as every other speed, at ten and at thirty', () => {
    for (const speed of [10, 30] as const) {
      const state = currentState();
      if (state === null) throw new Error('no game');
      state.speed = speed;
      state.activeEvent = {
        id: 'event-test',
        kind: 'lowStock',
        title: 'The rack is nearly empty',
        body: 'Order material.',
        choices: [{ id: 'ok', label: 'Right' }],
        data: {},
        day: state.clock.day,
        minute: state.clock.minute,
      };
      render();
      const before = state.clock.minute;
      // The frame loop runs no minutes at all while something is being asked (CLAUDE.md 6.1).
      expect(advanceMinutes(30), `at ${speed}`).toBe(0);
      expect(currentState()?.clock.minute, `at ${speed}`).toBe(before);
      click('[data-do="closeHouseCard"], [data-do="resolveEvent"]');
    }
  });
});

describe('the sixth chip', () => {
  it('is thirty, off the same table, in the same style as ten', () => {
    expect(speedFromString('30')).toBe(30);
    // A value that is not on the table is a stopped clock, whatever it says.
    expect(speedFromString('7')).toBe(0);
    expect(speedFromString('60')).toBe(0);
    const chips = Array.from(root().querySelectorAll('[data-do="setSpeed"]'));
    expect(chips.map((chip) => chip.getAttribute('data-speed'))).toEqual(
      SPEEDS.map((speed) => String(speed)),
    );
    // The same class as every other knob, and the label in the same words.
    click('[data-do="setSpeed"][data-speed="10"]');
    const thirty = root().querySelector('[data-do="setSpeed"][data-speed="30"]');
    expect(thirty?.className).toBe('chip knob');
    expect(thirty?.textContent).toBe('30x');
    click('[data-do="setSpeed"][data-speed="30"]');
    expect(currentState()?.speed).toBe(30);
    expect(root().innerHTML).toContain('class="chip knob is-on" data-do="setSpeed" data-speed="30"');
  });

  it('runs a working day of 480 minutes in sixteen real seconds', () => {
    expect(gameMinutesPerRealSecond(30)).toBe(30);
    expect(MINUTES_PER_WORKING_DAY / gameMinutesPerRealSecond(30)).toBe(16);
  });

  it('runs a full day at thirty: the day end summary comes up once, and the clock stops on it', () => {
    dismissEvents();
    const state = currentState();
    if (state === null) throw new Error('no game');
    state.speed = 30;
    render();
    const perSecond = gameMinutesPerRealSecond(30);
    // A frame at thirty is a real second of thirty minutes. First to a fresh morning, answering
    // whatever the rest of today puts up, so the day measured below is a whole one.
    const today = currentState()?.clock.day ?? 0;
    let guard = 0;
    while ((currentState()?.clock.day ?? 0) === today && guard < 60) {
      guard += 1;
      advanceMinutes(perSecond);
      dismissEvents();
    }
    const day = currentState()?.clock.day ?? 0;
    expect(day).toBeGreaterThan(today);
    expect(currentState()?.clock.minute).toBe(0);
    let summaries = 0;
    let frames = 0;
    const asked: GameEventKind[] = [];
    while ((currentState()?.clock.day ?? 0) === day && frames < 60) {
      frames += 1;
      advanceMinutes(perSecond);
      // Dinner, going home, the summary: answered as they come, one click at a time, the way
      // every speed meets them, and each one looked at before it is answered.
      let guard = 0;
      while ((currentState()?.activeEvent ?? null) !== null && guard < 10) {
        guard += 1;
        const event = currentState()?.activeEvent;
        if (event === undefined || event === null) break;
        asked.push(event.kind);
        if (event.kind === 'dayEnd') {
          summaries += 1;
          // The clock stops on the summary: no minute runs while it is up, at thirty as at ten.
          const before = currentState()?.clock.minute;
          expect(advanceMinutes(perSecond)).toBe(0);
          expect(currentState()?.clock.minute).toBe(before);
          expect(root().querySelector('.modal-layer [data-modal="event"]')).not.toBeNull();
          // The house card first, then the summary itself, then it is answered.
          click('[data-do="closeHouseCard"]');
          expect(currentState()?.activeEvent?.kind).toBe('dayEnd');
          expect(advanceMinutes(perSecond)).toBe(0);
        }
        click('[data-do="closeHouseCard"], [data-do="resolveEvent"]');
      }
    }
    expect(summaries).toBe(1);
    expect(asked.filter((kind) => kind === 'dayEnd')).toHaveLength(1);
    expect(currentState()?.clock.day).toBeGreaterThan(day);
    // Sixteen frames of work and two of dinner: the whole day in eighteen real seconds, plus one
    // for every question that cut a frame short, because a frame ends on the minute it is asked.
    expect(frames).toBeLessThanOrEqual(18 + asked.length);
    // And x30 comes home: a new day starts at x1 whatever last night was run at
    // (PIOTR, 16.09; CLAUDE.md T17 2.19).
    expect(currentState()?.speed).toBe(1);
  });
});

describe('the speed the game takes the clock to', () => {
  it('is the fastest chip there is, and it hands it back afterwards', () => {
    expect(SKIP_SPEED).toBe(10);
    let out = act(measuring(), { type: 'SET_SPEED', speed: 1 });
    out = act(out, { type: 'SKIP_AHEAD' });
    expect(out.speed).toBe(10);
    expect(skippedTask(out)?.kind).toBe('siteMeasure');
    out = clearEvents(runClock(out, SITE_MEASURE_MINUTES));
    expect(skippedTask(out)).toBeNull();
    expect(out.speed).toBe(1);
  });
});
