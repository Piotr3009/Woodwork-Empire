// The site survey is the draftsman's from Turn 26, and the owner's when there is none: the salesman
// and the man who counted the sheets came off it (PIOTR, 02.10; CLAUDE.md T26 2.8). Nobody waits for
// the owner to have time for it (PIOTR, 19.09: "they wait until I have time; stupid"; CLAUDE.md
// T21 2.5.1), and the day's travel minutes come off the draftsman's own 480 and not the owner's
// (CLAUDE.md T20 2.3). His grade is his speed at it, and at the client meeting.

import { describe, expect, it } from 'vitest';
import {
  CLIENT_MEETING_MINUTES,
  DRAFTSMAN_RATE,
  DRAFTSMAN_TIERS,
  SITE_MEASURE_MINUTES,
} from '../../src/engine/constants';
import { rolesForTask, startTaskCheck } from '../../src/engine/tasks';
import type { GameState, Worker } from '../../src/engine/index';
import {
  acceptNow,
  buyStartingKit,
  clearEvents,
  newGame,
  placeEnquiry,
  runClock,
} from '../helpers';

/** A man of this trade on the books this morning. He wants no bench and no kit. */
function officeManOn(
  state: GameState,
  role: Worker['role'],
  id: string,
  name: string,
): Worker {
  const worker: Worker = {
    id,
    name,
    role,
    tier: role === 'draftsman' ? 'experienced' : null,
    rate: 1,
    monthlyWage: 2600,
    startDay: 1,
    leavesOnDay: null,
    jobId: null,
    taskId: null,
    minutesWorked: 0,
    overtimeMinutes: 0,
    overtimeMinutesWeek: 0,
    overtimeDays: 0,
    tiredOfOvertime: false,
    ordersToday: 0,
    station: 'idle',
    productionMinutes: 0,
    absentDaysRemaining: 0,
    anchorX: 1,
    anchorY: 1,
    shift: 'day',
    dayLog: [],
    monthMinutes: 0,
    monthDaysOff: 0,
    idleMinutes: 0,
    idleByReason: { waitingForBoss: 0, noPlace: 0, noMaterial: 0, noCompressor: 0, hallStopped: 0 },
    working: false,
    noPlaceFor: '',
    accidents: 0,
  };
  state.workers.push(worker);
  return worker;
}

/** A draftsman of this grade on the books this morning, through the one builder. */
function draftsmanOn(state: GameState, tier: Worker['tier'] = 'experienced'): Worker {
  const worker = officeManOn(state, 'draftsman', 'd1', 'Dan');
  worker.tier = tier;
  return worker;
}

/** A job on the books whose site has to be measured. */
function withAMeasure(): GameState {
  let state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
  state.enquiries = [];
  state.reputation = 15;
  const enquiry = placeEnquiry(state, { price: 4000, deadlineDays: 60, needsMeasure: true });
  state = acceptNow(state, enquiry.id, false);
  return state;
}

describe('the site survey', () => {
  it('is the draftsman s and nobody else s, and nobody waits to be asked', () => {
    // The owner is not on the list at all, because he is not staff (CLAUDE.md T21 2.5.1).
    expect(rolesForTask('siteMeasure').eligible).toEqual(['draftsman']);
    expect(rolesForTask('siteMeasure').auto).toEqual(['draftsman']);
  });

  it('goes to the draftsman the minute the survey exists, and not to the salesman', () => {
    // A survey that comes onto the books at 11:00 is the draftsman's at 11:00 (CLAUDE.md T21
    // 2.5.1, 2.5.3), and the salesman, who went out with the tape until Turn 26, is passed by
    // (CLAUDE.md T26 2.8).
    let state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    state.enquiries = [];
    state.reputation = 15;
    const draftsman = draftsmanOn(state);
    const salesman = officeManOn(state, 'salesman', 's1', 'Sal');
    const enquiry = placeEnquiry(state, { price: 4000, deadlineDays: 60, needsMeasure: true });
    state = acceptNow(state, enquiry.id, false);
    const measure = state.tasks.find((task) => task.kind === 'siteMeasure');
    expect(measure?.doneBy).toBe(draftsman.id);
    expect(measure?.doneBy).not.toBe(salesman.id);
    // None of it is the owner's: his day meter shows not a minute of the survey (T21 2.5).
    expect(state.owner.currentTaskId).toBeNull();
    expect(state.owner.minutesWorked).toBe(0);
  });

  it('is never the salesman s, with no draftsman on the books', () => {
    let state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    state.enquiries = [];
    state.reputation = 15;
    officeManOn(state, 'salesman', 's1', 'Sal');
    const enquiry = placeEnquiry(state, { price: 4000, deadlineDays: 60, needsMeasure: true });
    state = acceptNow(state, enquiry.id, false);
    const measure = state.tasks.find((task) => task.kind === 'siteMeasure');
    expect(measure?.doneBy).toBeNull();
  });

  it('is the owner s when there is no draftsman', () => {
    const state = withAMeasure();
    const measure = state.tasks.find((task) => task.kind === 'siteMeasure');
    // Nobody has it: it sits on his list for him to start, exactly as it always did. The owner is
    // never handed a task behind his back, because he is the one who decides what he does next
    // (CLAUDE.md T4 3.2).
    expect(measure?.doneBy).toBeNull();
    const later = clearEvents(runClock(state, 20));
    expect(later.tasks.find((task) => task.kind === 'siteMeasure')?.doneBy).toBeNull();
  });

  it('lands on the draftsman, and the travel minutes come off his day and not the owner s', () => {
    const state = withAMeasure();
    const worker = draftsmanOn(state);
    const measure = state.tasks.find((task) => task.kind === 'siteMeasure');
    expect(measure?.minutesTotal).toBe(SITE_MEASURE_MINUTES);
    // The owner is at the bench: nothing of his is on the measure.
    expect(state.owner.currentTaskId).toBeNull();
    const ownerMinutes = state.owner.minutesWorked;
    const later = clearEvents(runClock(state, 20));
    const his = later.tasks.find((task) => task.kind === 'siteMeasure');
    expect(his?.doneBy).toBe(worker.id);
    const after = later.workers.find((entry) => entry.id === worker.id);
    // He is handed it in the first of the twenty minutes and spends the rest of them on it, so
    // the minutes on the task and the minutes of his day are the same figure.
    const spent = after?.minutesWorked ?? 0;
    expect(spent).toBe(19);
    expect(his?.minutesRemaining).toBeCloseTo(SITE_MEASURE_MINUTES - spent * DRAFTSMAN_RATE.experienced, 6);
    // And not one of them is the owner's: he was at the bench (CLAUDE.md T20 2.3).
    expect(later.owner.minutesWorked).toBe(ownerMinutes);
  });

  it('is surveyed at each grade s own speed, and the client meeting too', () => {
    // 0.8, 1.0 and 1.2 of the owner's own speed: twenty minutes of the clock, nineteen of them his,
    // put his grade's share of each into the survey (CLAUDE.md T26 2.8).
    for (const tier of DRAFTSMAN_TIERS) {
      const state = withAMeasure();
      const worker = draftsmanOn(state, tier);
      const later = clearEvents(runClock(state, 20));
      const his = later.tasks.find((task) => task.kind === 'siteMeasure');
      const spent = later.workers.find((entry) => entry.id === worker.id)?.minutesWorked ?? 0;
      expect(spent, tier).toBe(19);
      expect(his?.minutesRemaining, tier).toBeCloseTo(SITE_MEASURE_MINUTES - spent * DRAFTSMAN_RATE[tier], 6);
    }
    // The meeting a big job starts with is his first, at the same ladder.
    expect(rolesForTask('clientMeeting').auto).toEqual(['draftsman', 'salesman']);
    for (const tier of DRAFTSMAN_TIERS) {
      let state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
      state.enquiries = [];
      state.reputation = 15;
      const worker = draftsmanOn(state, tier);
      const enquiry = placeEnquiry(state, { price: 30000, deadlineDays: 90 });
      state = acceptNow(state, enquiry.id, false);
      const later = clearEvents(runClock(state, 20));
      const meeting = later.tasks.find((task) => task.kind === 'clientMeeting');
      expect(meeting?.doneBy, tier).toBe(worker.id);
      const spent = later.workers.find((entry) => entry.id === worker.id)?.minutesWorked ?? 0;
      expect(meeting?.minutesRemaining, tier).toBeCloseTo(CLIENT_MEETING_MINUTES - spent * DRAFTSMAN_RATE[tier], 6);
    }
  });

  it('comes before the drawing when the owner starts it himself, as it does for the draftsman', () => {
    // The one order of the brief's work, the meeting and the survey before the drawing, holds for
    // the owner's own click as it holds for the draftsman's day (CLAUDE.md T26 2.8).
    const state = withAMeasure();
    const design = state.tasks.find((task) => task.kind === 'design' && !task.done);
    const survey = state.tasks.find((task) => task.kind === 'siteMeasure' && !task.done);
    if (design === undefined || survey === undefined) throw new Error('a drawing and a survey are wanted');
    expect(startTaskCheck(state, design.id)).toMatchObject({ ok: false, reason: 'The site survey comes first' });
    survey.done = true;
    survey.minutesRemaining = 0;
    expect(startTaskCheck(state, design.id).ok).toBe(true);
  });
});
