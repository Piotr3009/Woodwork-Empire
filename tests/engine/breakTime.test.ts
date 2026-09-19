// The day has an hour of dinner in it. Nobody works through it unless the owner says he will, it
// costs him none of his 480 minutes, and the day runs on by its length instead: 08:00 to 17:00.

import { describe, expect, it } from 'vitest';
import {
  BREAK_MINUTES,
  BREAK_START_MINUTE,
  DAY_END_MINUTE,
  MINUTES_PER_WORKING_DAY,
} from '../../src/engine/constants';
import { formatTime, isBreak, tick } from '../../src/engine/index';
import type { GameState } from '../../src/engine/index';
import { createTask, findTask } from '../../src/engine/tasks';
import { STATION_IDLE } from '../../src/engine/stations';
import { renderTopbar } from '../../src/ui/topbar';
import {
  acceptNow,
  act,
  buyStartingKit,
  choose,
  clearEvents,
  fillRack,
  firstJob,
  newGame,
  placeEnquiry,
  twoMenOnSheetWork,
  withLicence,
} from '../helpers';

describe('nobody works through the break', () => {
  it('spends none of his day on it, and the task waits where it stood', () => {
    let state = withLicence(newGame());
    const design = createTask(state, { kind: 'design', label: 'Long drawing', minutes: 480 });
    state = act(state, { type: 'START_TASK', taskId: design.id });
    // Up to the minute the workshop stops, where the day asks him whether he is stopping too.
    state = tick(state, BREAK_START_MINUTE);
    state = tick(state, 1);
    expect(state.activeEvent?.kind).toBe('breakTime');
    state = choose(state, 'take');
    const atDinner = findTask(state, design.id)?.minutesRemaining;
    expect(atDinner).toBe(480 - BREAK_START_MINUTE);
    expect(state.owner.minutesWorked).toBe(BREAK_START_MINUTE);
    // Through the whole of it.
    state = tick(state, BREAK_MINUTES);
    expect(isBreak(BREAK_START_MINUTE + 1)).toBe(true);
    expect(findTask(state, design.id)?.minutesRemaining).toBe(atDinner);
    expect(state.owner.minutesWorked).toBe(BREAK_START_MINUTE);
    // And he picks it up again on the other side.
    state = tick(state, 10);
    expect(findTask(state, design.id)?.minutesRemaining).toBe((atDinner ?? 0) - 10);
    expect(state.owner.minutesWorked).toBe(BREAK_START_MINUTE + 10);
  });

  it('stops production too, and nothing is made while the hall is empty', () => {
    let state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })));
    state.enquiries = [];
    const enquiry = placeEnquiry(state, { price: 4000, deadlineDays: 60 });
    state = acceptNow(state, enquiry.id, false);
    firstJob(state).stage = 'ready';
    state = clearEvents(act(state, { type: 'WORK_HERE', jobId: null }));
    state = clearEvents(tick(clearEvents(tick(state, BREAK_START_MINUTE)), 1));
    const made = firstJob(state).labourRemaining;
    expect(made).toBeLessThan(firstJob(state).labourValue);
    state = clearEvents(tick(state, BREAK_MINUTES));
    // The piece is exactly where it was when they went for their dinner.
    expect(firstJob(state).labourRemaining).toBe(made);
    state = clearEvents(tick(state, 10));
    expect(firstJob(state).labourRemaining).toBeLessThan(made);
  });

  it('puts the whole workshop in the canteen, the owner with them', () => {
    let state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })));
    state.enquiries = [];
    const enquiry = placeEnquiry(state, { price: 4000, deadlineDays: 60 });
    state = acceptNow(state, enquiry.id, false);
    firstJob(state).stage = 'ready';
    state = clearEvents(act(state, { type: 'WORK_HERE', jobId: null }));
    state = clearEvents(tick(state, BREAK_START_MINUTE - 1));
    expect(state.owner.station).not.toBe(STATION_IDLE);
    state = clearEvents(tick(clearEvents(tick(state, 1)), 1));
    expect(isBreak(state.clock.minute)).toBe(true);
    expect(state.owner.station).toBe(STATION_IDLE);
  });
});

describe('the day is longer by the break, not shorter by it', () => {
  it('gives the owner all 480 minutes and ends the day at 17:00', () => {
    let state = withLicence(newGame());
    const design = createTask(state, { kind: 'design', label: 'A whole day', minutes: 480 });
    state = act(state, { type: 'START_TASK', taskId: design.id });
    state = clearEvents(tick(state, BREAK_START_MINUTE + 1));
    state = tick(state, DAY_END_MINUTE);
    // A drawing worth a full day is finished in a day, as it was before the break existed.
    expect(findTask(state, design.id)?.done).toBe(true);
    expect(state.owner.minutesWorked).toBe(MINUTES_PER_WORKING_DAY);
    expect(state.owner.overtimeMinutes).toBe(0);
    expect(formatTime(state.clock.minute)).toBe('17:00');
    // The clock does not throw him out at 17:00: it asks him, and going home is one of the two
    // answers, so his day ends with the summary and not with a walk out early.
    state = tick(state, 1);
    expect(state.activeEvent?.kind).toBe('goingHome');
    state = choose(state, 'home');
    expect(state.activeEvent?.kind).toBe('dayEnd');
  });

  it('starts the next day at 08:00 with a clean clock', () => {
    // Takes the hour at noon, then goes home when the day puts it to him at five.
    let state = clearEvents(tick(newGame(), BREAK_START_MINUTE + 1));
    state = clearEvents(tick(state, DAY_END_MINUTE));
    expect(state.clock.day).toBe(2);
    expect(state.clock.minute).toBe(0);
    expect(formatTime(state.clock.minute)).toBe('08:00');
    // And the second day has its dinner in the same place as the first.
    state = clearEvents(tick(state, BREAK_START_MINUTE + 1));
    expect(isBreak(state.clock.minute)).toBe(true);
  });
});

describe('the top bar says what is happening', () => {
  it('says Break while it is on, and nothing of the kind before or after', () => {
    let state = newGame();
    expect(renderTopbar(state, 'hall')).not.toContain('Break');
    state = clearEvents(tick(clearEvents(tick(state, BREAK_START_MINUTE)), 1));
    const bar = renderTopbar(state, 'hall');
    expect(bar).toContain('Break');
    // The speeds stay on the bar: the player can run the clock through his dinner.
    expect(bar).toContain('data-do="setSpeed" data-speed="4"');
    state = clearEvents(tick(state, BREAK_MINUTES));
    expect(renderTopbar(state, 'hall')).not.toContain('Break');
  });
});

describe('the day puts its two questions and the top bar shows what they cost', () => {
  it('offers the hour at noon and the two hours at five', () => {
    const noon = tick(newGame(), BREAK_START_MINUTE + 1);
    expect(noon.activeEvent?.kind).toBe('breakTime');
    expect(noon.activeEvent?.choices.map((choice) => choice.id)).toEqual(['take', 'skip']);
    const five = tick(choose(noon, 'take'), DAY_END_MINUTE);
    expect(five.activeEvent?.kind).toBe('goingHome');
    expect(five.activeEvent?.choices.map((choice) => choice.id)).toEqual(['home', 'overtime']);
  });

  it('shows the output only when the owner is paying for something', () => {
    const state = newGame();
    expect(renderTopbar(state, 'hall')).not.toContain('Output');
    state.owner.labourFactor = 0.87;
    expect(renderTopbar(state, 'hall')).toContain('Output 0.87');
    // And the hour he worked through is an hour more on the bar.
    state.owner.breakSkipped = true;
    expect(renderTopbar(state, 'hall')).toContain(
      `0 / ${MINUTES_PER_WORKING_DAY + BREAK_MINUTES} min`,
    );
  });
});

describe('the helper has his dinner too', () => {
  it('leaves a bag change on the list until the break is over', () => {
    let state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })));
    state.workers.push({
      id: 'help-1',
      name: 'Sam',
      role: 'helper',
      tier: null,
      rate: 0,
      monthlyWage: 1800,
      leavesOnDay: null,
      startDay: 1,
      jobId: null,
      taskId: null,
      minutesWorked: 0,
      ordersToday: 0,
    overtimeMinutes: 0,
    overtimeMinutesWeek: 0,
    overtimeDays: 0,
    tiredOfOvertime: false,
      station: 'idle',
      productionMinutes: 0,
      absentDaysRemaining: 0,
      shift: 'day',
      dayLog: [],
      monthMinutes: 0,
      monthDaysOff: 0,
      anchorX: 0,
      anchorY: 0,
    });
    state = clearEvents(tick(clearEvents(tick(state, BREAK_START_MINUTE)), 1));
    expect(isBreak(state.clock.minute)).toBe(true);
    // The bags fill as they sit down. Nobody is sent at them in the middle of his dinner: the
    // list waits for him (CLAUDE.md T17 2.3).
    const task = createTask(state, {
      kind: 'emptyBags',
      label: 'Empty the bags (1 bag, 15 min)',
      minutes: 15,
    });
    state = clearEvents(tick(state, 5));
    expect(findTask(state, task.id)?.done).toBe(false);
    expect(findTask(state, task.id)?.doneBy).toBeNull();
    // And he picks it up the minute they are back at it, and works the quarter of an hour off.
    state = clearEvents(tick(state, BREAK_MINUTES));
    expect(findTask(state, task.id)?.doneBy).toBe('help-1');
    state = clearEvents(tick(state, 20));
    expect(findTask(state, task.id)?.done).toBe(true);
    expect(findTask(state, task.id)?.doneBy).toBe('help-1');
  });
});

describe('the staff always take the hour, even when the owner does not', () => {
  it('leaves the joiner idle through the dinner the owner works through', () => {
    // Two men at the benches, so there is somebody to watch as well as the owner.
    let state = twoMenOnSheetWork();
    let guard = 0;
    while (state.activeEvent?.kind !== 'breakTime' && guard < 400) {
      guard += 1;
      state = state.activeEvent === null ? tick(state, 1) : choose(state, 'ok');
    }
    expect(state.activeEvent?.kind).toBe('breakTime');
    state = choose(state, 'skip');
    const joiner = (game: GameState): number => game.workers[0]?.productionMinutes ?? -1;
    const before = { owner: state.owner.productionMinutes, joiner: joiner(state) };
    const jobOfTheJoiner = state.workers[0]?.jobId;
    const leftBefore = state.jobs.find((job) => job.id === jobOfTheJoiner)?.labourRemaining ?? 0;
    // Half way through it, with the owner still cutting, the joiner is sitting down.
    const halfWay = clearEvents(tick(state, BREAK_MINUTES / 2));
    expect(halfWay.workers[0]?.station).toBe(STATION_IDLE);
    const eating = clearEvents(tick(halfWay, BREAK_MINUTES / 2));
    // The owner worked the hour he skipped; the joiner sat through all of it and his job did not
    // move a penny (CLAUDE.md T6 3.4).
    expect(eating.owner.productionMinutes).toBe(before.owner + BREAK_MINUTES);
    expect(joiner(eating)).toBe(before.joiner);
    expect(eating.jobs.find((job) => job.id === jobOfTheJoiner)?.labourRemaining).toBe(leftBefore);
    // And he is back on it the minute the hour is over.
    const after = clearEvents(tick(eating, 5));
    expect(joiner(after)).toBe(before.joiner + 5);
  });
});
