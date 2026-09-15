// @vitest-environment jsdom
// Speed times ten (PIOTR, 13.09; CLAUDE.md T9 3.11). A fifth chip, and the one speed the game ever
// takes the clock to for the player is that chip.

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

describe('the fifth chip', () => {
  it('is ten, and the top bar offers it', () => {
    expect([...SPEEDS]).toEqual([0, 1, 2, 4, 10]);
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

  it('stops for an event the same as every other speed', () => {
    const state = currentState();
    if (state === null) throw new Error('no game');
    state.speed = 10;
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
    expect(advanceMinutes(30)).toBe(0);
    expect(currentState()?.clock.minute).toBe(before);
    click('[data-do="closeHouseCard"], [data-do="resolveEvent"]');
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
