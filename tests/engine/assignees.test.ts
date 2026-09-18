// @vitest-environment jsdom
// The men on a job, and there is no limit on how many (PIOTR, 17.09; CLAUDE.md T19 2.5). The two
// fields of Turn 17, the man it was assigned to and the second man, are one list now. Everybody on
// it books his own minutes into the job at his own rate, so twenty men do make it go faster; a
// stage at a machine still goes at one man's speed, because a machine takes one man at a time and
// the rest stand in the queue; and every man on it has a standing place of his own.

import { describe, expect, it } from 'vitest';
import {
  addToJob,
  isOnJob,
  jobMen,
  jobRate,
  leadAssignee,
  minutesRemainingFor,
  takeOffJob,
} from '../../src/engine/jobs';
import { hands, stationForProduction, stationPlaceAt, workMinute } from '../../src/engine/production';
import {
  STATION_BENCH,
  secondStation,
  standingCell,
  stationSecondAt,
  waitingStation,
} from '../../src/engine/stations';
import { animationForStation } from '../../src/render/characters';
import { renderWorkPlan } from '../../src/ui/workPlan';
import type { GameState, Job } from '../../src/engine/index';
import { migrateState } from '../../src/engine/migrate';
import { STATE_VERSION } from '../../src/engine/constants';
import { CREW, act, clearEvents, runClock, sixJoinersOnSheetWork } from '../helpers';

function parse(html: string): HTMLElement {
  const holder = document.createElement('div');
  holder.innerHTML = html;
  return holder;
}

/** The first joiner's job, which is the one the others are put on. */
function jobOfFirst(state: GameState): Job {
  const job = state.jobs.find((entry) => leadAssignee(entry) === 'staff-1');
  if (!job) throw new Error('the first joiner has no job');
  return job;
}

/** Six benches and a saw each, so the hall never queues for a machine: the question here is the
 *  men, not the saw. Each man put on the first job comes off his own. */
function menOnOne(count: number, saws = CREW): GameState {
  let state = sixJoinersOnSheetWork({ saws });
  const jobId = jobOfFirst(state).id;
  for (let man = 2; man <= count; man += 1) {
    state = act(state, { type: 'ADD_TO_JOB', jobId, workerId: `staff-${man}` });
  }
  return state;
}

/** The labour this job takes in so many minutes of production, with the job stood at the stage
 *  the share puts it at: a quarter of the way through is cutting, and two thirds is assembly.
 *  Only the men on this job are run, so the rest of the hall is not competing for the one saw. */
function labourIn(
  state: GameState,
  jobId: string,
  at: 'cutting' | 'assembly',
  minutes: number,
): number {
  const job = state.jobs.find((entry) => entry.id === jobId);
  if (!job) throw new Error('no job');
  job.labourRemaining = job.labourValue * (at === 'cutting' ? 0.95 : 0.45);
  const before = job.labourRemaining;
  for (let minute = 0; minute < minutes; minute += 1) {
    workMinute(
      state,
      hands(state).filter((hand) => hand.job.id === jobId),
    );
  }
  return before - job.labourRemaining;
}

describe('the men on a job (CLAUDE.md T19 2.5)', () => {
  it('stands the second man at it beside the first, and he holds no other job', () => {
    const state = menOnOne(2);
    const job = jobOfFirst(state);
    expect(jobMen(job)).toEqual(['staff-1', 'staff-2']);
    expect(state.workers.find((worker) => worker.id === 'staff-2')?.jobId).toBe(job.id);
    // A man is on one job at a time: the one he was on is nobody's now.
    expect(state.jobs.filter((entry) => entry.id !== job.id && isOnJob(entry, 'staff-2'))).toEqual(
      [],
    );
  });

  it('takes as many as the player wants, with no limit at all', () => {
    const state = menOnOne(CREW);
    const job = jobOfFirst(state);
    expect(job.assignees).toHaveLength(CREW);
    const rates = job.assignees.map(
      (who) => state.workers.find((worker) => worker.id === who)?.rate ?? 1,
    );
    expect(jobRate(state, job)).toBeCloseTo(
      rates.reduce((total, rate) => total + rate, 0),
      4,
    );
  });

  it('halves the days for two of them, because both work at their own rate', () => {
    const alone = sixJoinersOnSheetWork();
    const one = jobOfFirst(alone);
    const two = menOnOne(2);
    const both = jobOfFirst(two);
    expect(jobRate(two, both)).toBeCloseTo(jobRate(alone, one) * 2, 4);
    const left = minutesRemainingFor(two, both, jobRate(two, both));
    expect(left).toBeCloseTo(minutesRemainingFor(alone, one, jobRate(alone, one)) / 2, 4);
  });

  it('puts twice the labour into it in the same hour, with a machine each', () => {
    const alone = clearEvents(runClock(sixJoinersOnSheetWork(), 60));
    const two = clearEvents(runClock(menOnOne(2), 60));
    const oneMan = jobOfFirst(alone);
    const twoMen = jobOfFirst(two);
    const done = (job: Job): number => job.labourValue - job.labourRemaining;
    expect(done(twoMen)).toBeGreaterThan(done(oneMan) * 1.5);
  });

  it('runs a cutting stage at one man’s speed with three men and one saw', () => {
    // The saw takes one man at a time: the other two stand in the queue and the stage goes no
    // faster than the man on it (CLAUDE.md T19 2.5).
    const one = menOnOne(1, 1);
    const three = menOnOne(3, 1);
    const alone = labourIn(one, jobOfFirst(one).id, 'cutting', 20);
    const crowd = labourIn(three, jobOfFirst(three).id, 'cutting', 20);
    expect(alone).toBeGreaterThan(0);
    expect(crowd).toBeCloseTo(alone, 4);
  });

  it('runs the assembly stage at three men’s speed with the same three men', () => {
    const one = menOnOne(1, 1);
    const three = menOnOne(3, 1);
    const alone = labourIn(one, jobOfFirst(one).id, 'assembly', 20);
    const crowd = labourIn(three, jobOfFirst(three).id, 'assembly', 20);
    expect(alone).toBeGreaterThan(0);
    expect(crowd).toBeGreaterThan(alone * 2.5);
  });

  it('sends the men past the first to the waiting cell and then along the same side', () => {
    const state = menOnOne(3, 1);
    const job = jobOfFirst(state);
    job.labourRemaining = job.labourValue * 0.95;
    workMinute(
      state,
      hands(state).filter((hand) => hand.job.id === job.id),
    );
    const stations = job.assignees.map((who) => stationForProduction(state, who, job));
    expect(new Set(stations).size).toBe(3);
    expect(stations.filter((station) => station.startsWith('machine:'))).toHaveLength(1);
    expect(stations).toContain(waitingStation('tableSaw'));
    const beyond = stations.map((station) => stationPlaceAt(station)).filter((place) => place);
    expect(beyond).toHaveLength(1);
    expect(beyond[0]?.place).toBe(2);
  });

  it('stands them at the bench’s own places, the second behind it and the third along it', () => {
    const state = menOnOne(3);
    const job = jobOfFirst(state);
    job.labourRemaining = job.labourValue * 0.45;
    workMinute(
      state,
      hands(state).filter((hand) => hand.job.id === job.id),
    );
    const bench = state.equipment.find((item) => item.takenBy === 'staff-1');
    if (!bench) throw new Error('the first man holds no bench');
    const stations = job.assignees.map((who) => stationForProduction(state, who, job));
    expect(stations[0]).toBe(STATION_BENCH);
    expect(stations[1]).toBe(secondStation(bench.id));
    expect(stationPlaceAt(stations[2] ?? '')).toEqual({ id: bench.id, place: 2 });
    // The second place of Turn 16, which is a cell of its own and not the operator's.
    expect(stationSecondAt(secondStation(bench.id))).toBe(bench.id);
    expect(standingCell(state, bench, 'second')).not.toEqual(standingCell(state, bench, 'operator'));
    expect(animationForStation(secondStation(bench.id))).toBe('bench');
    expect(animationForStation(STATION_BENCH)).toBe('bench');
  });

  it('draws them as chips on the work plan row, each with a cross of its own', () => {
    const state = menOnOne(2);
    const job = jobOfFirst(state);
    const row = parse(renderWorkPlan(state)).querySelector(`[data-plan="${job.id}"]`);
    const chips = Array.from(row?.querySelectorAll('.assign-chip') ?? []);
    expect(chips).toHaveLength(2);
    expect(chips.map((chip) => chip.textContent)).toEqual(['Joiner 1×', 'Joiner 2×']);
    const crosses = Array.from(row?.querySelectorAll('[data-do="assignOff"]') ?? []);
    expect(crosses.map((cross) => cross.getAttribute('data-worker'))).toEqual([
      'staff-1',
      'staff-2',
    ]);
    // The Turn 17 chips and the Second man line are gone, both of them.
    expect(row?.querySelector('[data-do="assignSecond"]')).toBeNull();
    expect(row?.textContent).not.toContain('Second man');
    expect(row?.querySelector('[data-do="openAssign"]')).not.toBeNull();
  });

  it('opens the list on the one job the player asked for, and on no other', () => {
    const state = menOnOne(2);
    const job = jobOfFirst(state);
    const shut = parse(renderWorkPlan(state, null, null));
    expect(shut.querySelector('.assign-list')).toBeNull();
    const open = parse(renderWorkPlan(state, null, job.id));
    const lists = Array.from(open.querySelectorAll('.assign-list'));
    expect(lists).toHaveLength(1);
    expect(open.querySelector(`[data-plan="${job.id}"] .assign-list`)).not.toBeNull();
  });

  it('greys the men it cannot take, and says why of each of them', () => {
    const state = menOnOne(2);
    const job = jobOfFirst(state);
    const other = state.jobs.find((entry) => leadAssignee(entry) === 'staff-3');
    if (!other) throw new Error('the third joiner has no job of his own');
    const list = parse(renderWorkPlan(state, null, job.id)).querySelector('.assign-list');
    const rowFor = (who: string): Element | null =>
      list?.querySelector(`[data-worker="${who}"]`)?.closest('.assign-row') ?? null;
    // The men already on this job: greyed, with no way to add them twice.
    const onIt = Array.from(list?.querySelectorAll('.assign-row.is-busy') ?? []).map(
      (row) => row.textContent ?? '',
    );
    expect(onIt.some((text) => text.includes('Joiner 1') && text.includes('already on this job')))
      .toBe(true);
    // A man on another job carries that job's name.
    expect(onIt.some((text) => text.includes('Joiner 3') && text.includes(other.name))).toBe(true);
    // The owner is free, so his row is the one that can be clicked, once.
    const owner = rowFor('owner');
    expect(owner?.className).not.toContain('is-busy');
    expect(owner?.querySelector('[data-do="assignAdd"]')).not.toBeNull();
    expect(list?.textContent).toContain('owner');
  });

  it('takes one man off by his own cross and leaves the rest of them on it', () => {
    const state = menOnOne(3);
    const job = jobOfFirst(state);
    const after = act(state, { type: 'REMOVE_FROM_JOB', jobId: job.id, workerId: 'staff-2' });
    const left = jobOfFirst(after);
    expect(jobMen(left)).toEqual(['staff-1', 'staff-3']);
    expect(left.stage).toBe('inProduction');
    expect(after.workers.find((worker) => worker.id === 'staff-2')?.jobId).not.toBe(job.id);
  });

  it('puts the job back on the list when the last man comes off it', () => {
    // Straight at the engine: through an action the hall would hand the free man the oldest job
    // waiting before the test could look, which is the automatic assignment of CLAUDE.md 9.4.
    const state = menOnOne(2);
    const job = jobOfFirst(state);
    expect(takeOffJob(state, job.id, 'staff-2')).toBe(true);
    expect(job.stage).toBe('inProduction');
    expect(takeOffJob(state, job.id, 'staff-1')).toBe(true);
    expect(job.assignees).toEqual([]);
    expect(job.stage).toBe('ready');
  });

  it('takes one man off his old job and nobody else, when he is put on another', () => {
    const state = menOnOne(3);
    const crowded = jobOfFirst(state);
    const empty = state.jobs.find((entry) => entry.assignees.length === 0);
    if (!empty) throw new Error('a job with nobody on it is wanted here');
    const after = act(state, { type: 'ADD_TO_JOB', jobId: empty.id, workerId: 'staff-2' });
    const before = after.jobs.find((entry) => entry.id === crowded.id);
    expect(before?.assignees).toEqual(['staff-1', 'staff-3']);
    expect(after.jobs.find((entry) => entry.id === empty.id)?.assignees).toEqual(['staff-2']);
  });

  it('refuses the helper and anybody who is not on the books, through the one gate', () => {
    const state = menOnOne(1);
    const job = jobOfFirst(state);
    const helper = state.workers[0];
    if (!helper) throw new Error('a worker is wanted here');
    const was = helper.role;
    helper.role = 'helper';
    expect(addToJob(state, job.id, helper.id)).toBe(false);
    helper.role = was;
    expect(addToJob(state, job.id, 'nobody-at-all')).toBe(false);
    expect(takeOffJob(state, job.id, 'nobody-at-all')).toBe(false);
  });
});

// The v26 save, lifted (CLAUDE.md T19 section 4). The two fields of Turn 17 become the one list,
// in the order the two men stood in, and neither of the old keys is left on the record.
describe('a v26 save opens in this build', () => {
  it('turns the man it was assigned to and the second man into the one list', () => {
    const raw = {
      version: 15,
      settings: { tips: true },
      equipment: [{ id: 'kit-1', soldOnDay: null }],
      jobs: [
        { id: 'job-1', assignedTo: 'staff-1', secondAssignee: 'staff-2' },
        { id: 'job-2', assignedTo: 'owner', secondAssignee: null },
        { id: 'job-3', assignedTo: null, secondAssignee: null },
        { id: 'job-4', assignedTo: 'staff-3', secondAssignee: 'staff-3' },
      ],
    };
    const lifted = migrateState(raw, 15);
    expect(lifted).not.toBeNull();
    const jobs = (lifted?.jobs ?? []) as unknown as Array<Record<string, unknown>>;
    expect(jobs.map((job) => job.assignees)).toEqual([
      ['staff-1', 'staff-2'],
      ['owner'],
      [],
      ['staff-3'],
    ]);
    for (const job of jobs) {
      expect(Object.keys(job)).not.toContain('assignedTo');
      expect(Object.keys(job)).not.toContain('secondAssignee');
    }
    expect(lifted?.version).toBe(STATE_VERSION);
  });
});
