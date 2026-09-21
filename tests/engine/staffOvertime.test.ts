// The end of the day (PIOTR, 17.09; CLAUDE.md T17 2.12). The men go home at five, always, and the
// evening is the owner's alone: what moves after five is what he takes on himself, by a click on
// the row, and the man has his job back in the morning where the evening left it. The two hours of
// staff overtime of Turn 8 are gone, and the wage line that paid for them with them. The pay day
// they are looked for on is the last working day of the month, which is the one there is
// (CLAUDE.md T21 2.10).

import { describe, expect, it } from 'vitest';
import { DAY_END_MINUTE } from '../../src/engine/constants';
import { isLastWorkingDayOfMonth } from '../../src/engine/clock';
import { crewHasGoneHome } from '../../src/engine/staff';
import { ownerTookOver } from '../../src/engine/jobs';
import type { GameState, Job } from '../../src/engine/index';
import { act, clearEvents, runClock, runToDay, twoMenOnSheetWork } from '../helpers';

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
  const job = state.jobs.find((entry) => entry.assignees[0] === 'staff-1');
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
    expect(mansJob(taken).assignees[0]).toBe('staff-1');
    expect(mansJob(taken).assignees[1]).toBe('owner');
    const worked = clearEvents(runClock(taken, 60));
    expect(mansJob(worked).labourRemaining).toBeLessThan(before);
    expect(worked.owner.tookOverJobId).toBe(job.id);
    expect(ownerTookOver(worked, mansJob(worked))).toBe(true);
    // The morning: the evening is over and given back, the man carries on with his job as its
    // lead, and the take-over is forgotten. Whether the owner stands beside him at 8:00 is the
    // morning's own rule (v41: an empty office sends him to the soonest deadline) and not the
    // evening's.
    const tomorrow = clearEvents(act(worked, { type: 'END_DAY' }));
    expect(tomorrow.clock.day).toBeGreaterThan(state.clock.day);
    const morning = mansJob(tomorrow);
    expect(morning.assignees[0]).toBe('staff-1');
    expect(tomorrow.owner.tookOverJobId).toBe(null);
    expect(ownerTookOver(tomorrow, morning)).toBe(false);
    expect(tomorrow.workers.find((worker) => worker.id === 'staff-1')?.jobId).toBe(morning.id);
  });

  it('keeps the owner on a job he joined by day: dusk gives back the evening and nothing else (v44)', () => {
    // Until v44 dusk took the owner off every job he was not the lead of, which since v41 is every
    // job he joined as a second pair of hands, so he was thrown off his own work every night
    // (PIOTR, 21.09: "it throws me off the job I was assigned to the next day").
    const state = twoMenOnSheetWork();
    const job = mansJob(state);
    const joined = act(state, { type: 'ADD_TO_JOB', jobId: job.id, workerId: 'owner' });
    expect(mansJob(joined).assignees).toEqual(['staff-1', 'owner']);
    expect(joined.owner.tookOverJobId).toBe(null);
    expect(ownerTookOver(joined, mansJob(joined))).toBe(false);
    let evening = joined;
    evening.clock.minute = DAY_END_MINUTE;
    evening.owner.homeAsked = true;
    evening = clearEvents(act(evening, { type: 'END_DAY' }));
    expect(evening.clock.day).toBeGreaterThan(state.clock.day);
    expect(mansJob(evening).assignees).toEqual(['staff-1', 'owner']);
  });

  it('is the only time a job can be taken over: by day the job stays the mans', () => {
    const state = twoMenOnSheetWork();
    const job = mansJob(state);
    const tried = act(state, { type: 'TAKE_OVER_JOB', jobId: job.id });
    expect(mansJob(tried).assignees[1] ?? null).toBe(null);
  });
});

describe('the wages', () => {
  it('carry no overtime line any more: nobody is paid for an evening', () => {
    let state = atFive();
    state = clearEvents(runClock(state, 60));
    // On to the pay day, which is the last working day of the month and the one there is. A day's
    // costs run on its own morning, so the wage line is in the ledger the minute the clock turns
    // to it (CLAUDE.md T21 2.10).
    let payDay = state.clock.day + 1;
    while (!isLastWorkingDayOfMonth(payDay)) payDay += 1;
    state = runToDay(state, payDay).state;
    expect(state.clock.day).toBe(payDay);
    expect(state.ledger.some((entry) => entry.label === 'Overtime')).toBe(false);
    expect(state.ledger.some((entry) => entry.label === 'Monthly wages')).toBe(true);
    // And never the week's line, which went with Turn 20's cadence.
    expect(state.ledger.some((entry) => entry.label === 'Weekly wages')).toBe(false);
  });
});
