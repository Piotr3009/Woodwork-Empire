// The end of the day (PIOTR, 17.09; CLAUDE.md T17 2.12). The men go home at five, always, and the
// evening is the owner's alone: what moves after five is what he takes on himself, by a click on
// the row, and the man has his job back in the morning where the evening left it. The two hours of
// staff overtime of Turn 8 are gone, and the Friday line that paid for them with them.

import { describe, expect, it } from 'vitest';
import { DAY_END_MINUTE } from '../../src/engine/constants';
import { crewHasGoneHome } from '../../src/engine/staff';
import type { GameState, Job } from '../../src/engine/index';
import { act, clearEvents, runClock, twoMenOnSheetWork } from '../helpers';

/** The hall at five o'clock, the owner staying on, one poor joiner on a job of his own and the
 *  owner on nothing: the evening Piotr described. */
function atFive(): GameState {
  const state = twoMenOnSheetWork();
  const ownerJob = state.jobs[0];
  if (!ownerJob) throw new Error('two jobs are wanted here');
  // The owner puts his own job down, so the evening is about the man's job and not his.
  const free = act(state, { type: 'ASSIGN_JOB', jobId: ownerJob.id, workerId: null });
  free.clock.minute = DAY_END_MINUTE;
  // He has already said he is staying, so the question is not put again.
  free.owner.homeAsked = true;
  return free;
}

function mansJob(state: GameState): Job {
  const job = state.jobs.find((entry) => entry.assignedTo === 'staff-1');
  if (!job) throw new Error('the joiner has no job');
  return job;
}

describe('five in the afternoon', () => {
  it('sends the men home whatever the owner does', () => {
    const state = atFive();
    expect(crewHasGoneHome(state)).toBe(true);
    const before = mansJob(state).labourRemaining;
    const later = clearEvents(runClock(state, 60));
    // An hour of the owner's evening and the man's job has not moved a minute.
    expect(mansJob(later).labourRemaining).toBe(before);
    const man = later.workers.find((worker) => worker.id === 'staff-1');
    expect(man?.overtimeMinutes).toBe(0);
    expect(man?.overtimeMinutesWeek).toBe(0);
  });

  it('lets the owner take a job on, and the man has it back in the morning', () => {
    const state = atFive();
    const job = mansJob(state);
    const before = job.labourRemaining;
    const taken = act(state, { type: 'TAKE_OVER_JOB', jobId: job.id });
    // It is still the man's job: the owner is the second man on it for the evening.
    expect(mansJob(taken).assignedTo).toBe('staff-1');
    expect(mansJob(taken).secondAssignee).toBe('owner');
    const worked = clearEvents(runClock(taken, 60));
    expect(mansJob(worked).labourRemaining).toBeLessThan(before);
    // The morning: the evening is over, the owner is off it and the man carries on with it.
    const tomorrow = clearEvents(act(worked, { type: 'END_DAY' }));
    expect(tomorrow.clock.day).toBeGreaterThan(state.clock.day);
    const morning = mansJob(tomorrow);
    expect(morning.secondAssignee).toBe(null);
    expect(morning.assignedTo).toBe('staff-1');
    expect(tomorrow.workers.find((worker) => worker.id === 'staff-1')?.jobId).toBe(morning.id);
  });

  it('is the only time a job can be taken over: by day the job stays the mans', () => {
    const state = twoMenOnSheetWork();
    const job = mansJob(state);
    const tried = act(state, { type: 'TAKE_OVER_JOB', jobId: job.id });
    expect(mansJob(tried).secondAssignee).toBe(null);
  });
});

describe('the wages', () => {
  it('carry no overtime line any more: nobody is paid for an evening', () => {
    let state = atFive();
    state = clearEvents(runClock(state, 60));
    // On to Friday, which is day 5.
    let guard = 0;
    while (state.clock.day < 5 && guard < 60) {
      state = clearEvents(act(state, { type: 'END_DAY' }));
      state = clearEvents(runClock(state, 60));
      guard += 1;
    }
    expect(state.clock.day).toBe(5);
    expect(state.ledger.some((entry) => entry.label === 'Overtime')).toBe(false);
    expect(state.ledger.some((entry) => entry.label === 'Weekly wages')).toBe(true);
  });
});
