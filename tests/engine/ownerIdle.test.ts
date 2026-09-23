// The owner's day has two halves: the minutes he worked and the minutes he stood (PIOTR, 19.09: "my
// time runs two to three times slower than the clock"; CLAUDE.md T21 2.8). It was not the clock: the
// meter counted `owner.minutesWorked` and said nothing at all about the rest of the day, so a day he
// spent half of standing about read as a day half over.
//
// A minute is either worked or stood and never both, and what the two come to can never be more than
// the minutes of the day that have run, dinner taken out of them. That is the invariant every test
// here ends on.

import { describe, expect, it } from 'vitest';
import { BREAK_START_MINUTE, MINUTES_PER_WORKING_DAY } from '../../src/engine/constants';
import { workedMinutesOfDay } from '../../src/engine/clock';
import { bookOwnerIdleMinute, ownerIdleReason } from '../../src/engine/production';
import { createTask } from '../../src/engine/tasks';
import type { GameState } from '../../src/engine/index';
import {
  acceptNow,
  buyStartingKit,
  clearEvents,
  fillRack,
  firstJob,
  newGame,
  nextDay,
  placeEnquiry,
  runClock,
  twoMenOnSheetWork,
} from '../helpers';

/** The minutes of today that have run, which is all there is to divide between worked and stood. */
function ranToday(state: GameState): number {
  return workedMinutesOfDay(state.clock.minute, state.owner.breakSkipped);
}

/** A hall with the day one kit in it and nothing for the owner to do. */
function quietHall(): GameState {
  const state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })));
  state.enquiries = [];
  return state;
}

/** The owner at a bench on a job of his own, with the rack behind it. */
function ownerAtABench(): GameState {
  const state = quietHall();
  const enquiry = placeEnquiry(state, { price: 6000, deadlineDays: 40 });
  let next = clearEvents(acceptNow(state, enquiry.id));
  const job = firstJob(next);
  job.stage = 'inProduction';
  job.assignees = ['owner'];
  next = clearEvents(next);
  return next;
}

describe('the minutes the owner stood', () => {
  it('counts every minute of a morning he had nothing to do, and says why', () => {
    const state = runClock(quietHall(), 100);
    expect(state.owner.minutesWorked).toBe(0);
    expect(state.owner.idleMinutes).toBe(100);
    // The hall's list has the morning's jobs of work on it and nobody has taken one, so there is work
    // about that he is not on: that is what the meter calls nothing assigned.
    expect(state.owner.idleByReason.nothingAssigned).toBe(100);
    expect(state.owner.idleByReason.noPlace).toBe(0);
    // And the two halves are the whole of the day that has run.
    expect(state.owner.minutesWorked + state.owner.idleMinutes).toBe(ranToday(state));
  });

  it('counts none of a morning he worked all of', () => {
    const state = runClock(twoMenOnSheetWork({ saws: 1 }), 100);
    expect(state.owner.minutesWorked).toBe(100);
    expect(state.owner.idleMinutes).toBe(0);
    expect(state.owner.minutesWorked + state.owner.idleMinutes).toBe(ranToday(state));
  });

  it('never books more than the day has run, minute by minute, through the dinner hour', () => {
    let state = quietHall();
    for (let minute = 0; minute < BREAK_START_MINUTE + 120; minute += 1) {
      state = clearEvents(runClock(state, 1));
      const owner = state.owner;
      expect(owner.minutesWorked + owner.idleMinutes, `minute ${state.clock.minute}`).toBeLessThanOrEqual(
        ranToday(state),
      );
    }
    // The hour in the canteen is neither worked nor stood: the day that has run leaves it out, and so
    // does the meter.
    expect(state.owner.idleMinutes).toBe(ranToday(state));
    expect(state.owner.idleMinutes).toBeLessThan(state.clock.minute);
  });

  it('starts every morning at nought', () => {
    const state = runClock(quietHall(), 100);
    expect(state.owner.idleMinutes).toBe(100);
    const tomorrow = clearEvents(nextDay(state));
    expect(tomorrow.owner.idleMinutes).toBe(0);
    expect(tomorrow.owner.idleByReason.nothingAssigned).toBe(0);
  });
});

describe('why he stood', () => {
  it('is the rack when he is at a bench and there is nothing on it', () => {
    const state = ownerAtABench();
    state.stock.sheets = 0;
    const job = firstJob(state);
    job.sheetsUsed = 0;
    job.sheetsReserved = 0;
    expect(ownerIdleReason(state)).toBe('noMaterial');
  });

  it('is no place when the day plan has none for him', () => {
    const state = ownerAtABench();
    // What the plan writes on him when the machine his stage wants has no place left
    // (CLAUDE.md T25 2.3).
    state.owner.noPlaceFor = 'tableSaw';
    expect(ownerIdleReason(state)).toBe('noPlace');
  });

  it('is the empty office when the hall has nothing on its list at all', () => {
    const state = quietHall();
    state.tasks = [];
    state.jobs = [];
    expect(ownerIdleReason(state)).toBe('officeEmpty');
    // And it is nothing assigned the moment there is a job of work nobody has taken.
    createTask(state, { kind: 'emails', label: 'An email', minutes: 10 });
    expect(ownerIdleReason(state)).toBe('nothingAssigned');
  });

  it('is nothing at all while he is holding a job of work, at dinner, or not in', () => {
    const state = quietHall();
    state.tasks = [];
    state.jobs = [];
    const task = createTask(state, { kind: 'emails', label: 'An email', minutes: 10 });
    state.owner.currentTaskId = task.id;
    expect(ownerIdleReason(state)).toBeNull();
    state.owner.currentTaskId = null;
    state.clock.minute = BREAK_START_MINUTE + 10;
    expect(ownerIdleReason(state)).toBeNull();
    // Unless he said he would work through it, and then the hour is his like any other: the email he
    // put down is on the list and nobody has it, so the hour he stands through is nothing assigned.
    state.owner.breakSkipped = true;
    expect(ownerIdleReason(state)).toBe('nothingAssigned');
    state.owner.breakSkipped = false;
    state.clock.minute = 60;
    state.owner.present = false;
    expect(ownerIdleReason(state)).toBeNull();
  });

  it('books nothing twice, whatever asks it to', () => {
    // The state settles many times in a minute, so the booking is capped by the day that has run and
    // not by how often it is called (CLAUDE.md T21 2.8).
    const state = quietHall();
    state.clock.minute = 10;
    state.owner.minutesWorked = 4;
    for (let attempt = 0; attempt < 20; attempt += 1) bookOwnerIdleMinute(state);
    expect(state.owner.idleMinutes).toBe(6);
    expect(state.owner.minutesWorked + state.owner.idleMinutes).toBe(10);
    expect(MINUTES_PER_WORKING_DAY).toBeGreaterThan(10);
  });
});
