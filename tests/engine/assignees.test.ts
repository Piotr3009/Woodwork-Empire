// @vitest-environment jsdom
// The men on a job, and there is no limit on how many (PIOTR, 17.09; CLAUDE.md T19 2.5). The two
// fields of Turn 17, the man it was assigned to and the second man, are one list now. Everybody on
// it books his own minutes into the job at his own rate, so twenty men do make it go faster; a
// stage at a machine goes at the speed of as many men as the hall has places for at it, and the
// rest say they have no place (CLAUDE.md T25 2.3); and every man at work has a place of his own.

import { stagePlanFor } from '../../src/engine/stages';
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
import { hands, workMinute } from '../../src/engine/production';
import { stationCell } from '../../src/render/hall';
import { STATION_BENCH, STATION_HOME, machineStation } from '../../src/engine/stations';
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

/** Six benches and a saw each, so the hall never runs out of places at a machine: the question
 *  here is the men, not the saw. Each man put on the first job comes off his own. */
function menOnOne(count: number, saws = CREW, sawVariant = 'standard'): GameState {
  let state = sixJoinersOnSheetWork({ saws, sawVariant });
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
  // The labour by stage: at the cutting the machining and the assembly are already done, which
  // is how a job at its cutting has always been stood; at the assembly the cutting and the
  // machining are behind it. Every man on it works its current stage (CLAUDE.md T25 2.2).
  const plan = stagePlanFor(state, job);
  const share = (id: string): number => {
    const stage = plan.find((entry) => entry.id === id);
    return stage ? stage.to - stage.from : 0;
  };
  job.stageLabour =
    at === 'cutting'
      ? { cutting: share('cutting') * 0.2, machining: share('machining'), assembly: share('assembly') }
      : { cutting: share('cutting'), machining: share('machining'), assembly: share('assembly') * 0.25 };
  job.labourRemaining =
    job.labourValue - Object.values(job.stageLabour).reduce((sum, value) => sum + (value ?? 0), 0);
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

  it('runs a cutting stage at one man s speed with three men and a saw of one place', () => {
    // A budget saw has one place: the other two have none and the stage goes no faster than the
    // man at it (CLAUDE.md T25 2.1, 2.3).
    const one = menOnOne(1, 1, 'budget');
    const three = menOnOne(3, 1, 'budget');
    const alone = labourIn(one, jobOfFirst(one).id, 'cutting', 20);
    const crowd = labourIn(three, jobOfFirst(three).id, 'cutting', 20);
    expect(alone).toBeGreaterThan(0);
    expect(crowd).toBeCloseTo(alone, 4);
  });

  it('runs it at two men s speed with the same three men and a saw of two places', () => {
    const one = menOnOne(1, 1, 'standard');
    const three = menOnOne(3, 1, 'standard');
    const alone = labourIn(one, jobOfFirst(one).id, 'cutting', 20);
    const crowd = labourIn(three, jobOfFirst(three).id, 'cutting', 20);
    expect(alone).toBeGreaterThan(0);
    // Two of the three at the saw's two places, the three being all novices at one rate.
    expect(crowd).toBeCloseTo(alone * 2, 4);
  });

  it('runs the assembly stage at three men’s speed with the same three men', () => {
    const one = menOnOne(1, 1);
    const three = menOnOne(3, 1);
    const alone = labourIn(one, jobOfFirst(one).id, 'assembly', 20);
    const crowd = labourIn(three, jobOfFirst(three).id, 'assembly', 20);
    expect(alone).toBeGreaterThan(0);
    expect(crowd).toBeGreaterThan(alone * 2.5);
  });

  it('stands the men a one place saw has no place for at their home cells, and says why', () => {
    const state = menOnOne(3, 1, 'budget');
    const job = jobOfFirst(state);
    // The one job in the hall, so the places this test is about are the whole of the hall's work.
    // Nobody is moved between jobs and nobody to another stage (CLAUDE.md T22 2.6, T25 2.2).
    state.jobs = [job];
    labourIn(state, job.id, 'cutting', 0);
    workMinute(
      state,
      hands(state).filter((hand) => hand.job.id === job.id),
    );
    const men = job.assignees.map((who) => state.workers.find((worker) => worker.id === who));
    expect(men.map((man) => man?.station)).toEqual([machineStation('tableSaw'), STATION_HOME, STATION_HOME]);
    expect(men.map((man) => man?.noPlaceFor)).toEqual(['', 'tableSaw', 'tableSaw']);
  });

  it('stands them at the benches places, every man at a place of his own', () => {
    const state = menOnOne(3);
    const job = jobOfFirst(state);
    job.labourRemaining = job.labourValue * 0.45;
    workMinute(
      state,
      hands(state).filter((hand) => hand.job.id === job.id),
    );
    // The bench is a family with places like any other, filled in the order the benches were
    // bought (CLAUDE.md T25 2.2, 2.6).
    const stations = job.assignees.map(
      (who) => state.workers.find((worker) => worker.id === who)?.station ?? '',
    );
    expect(stations).toEqual([
      machineStation('workbench'),
      machineStation('workbench'),
      machineStation('workbench'),
    ]);
    expect(animationForStation(machineStation('workbench'))).toBe('bench');
    expect(animationForStation(STATION_BENCH)).toBe('bench');
    // The renderer gives each a cell of his own: three men, three cells, none of them shared. This
    // is the half the engine cannot check on its own (T19-C1g, T25 2.6).
    const cells = job.assignees.map((who, index) =>
      stationCell(state, stations[index] ?? '', { x: 0, y: 0 }, who),
    );
    const seen = new Set(cells.map((cell) => `${cell.x},${cell.y}`));
    expect(seen.size).toBe(3);
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
    const shut = parse(renderWorkPlan(state, 'jobs', null));
    expect(shut.querySelector('.assign-list')).toBeNull();
    const open = parse(renderWorkPlan(state, 'jobs', job.id));
    const lists = Array.from(open.querySelectorAll('.assign-list'));
    expect(lists).toHaveLength(1);
    expect(open.querySelector(`[data-plan="${job.id}"] .assign-list`)).not.toBeNull();
  });

  it('greys the men it cannot take, says why, and moves a man off another job in one click', () => {
    const state = menOnOne(2);
    const job = jobOfFirst(state);
    const other = state.jobs.find((entry) => leadAssignee(entry) === 'staff-3');
    if (!other) throw new Error('the third joiner has no job of his own');
    const list = parse(renderWorkPlan(state, 'jobs', job.id)).querySelector('.assign-list');
    const rowFor = (who: string): Element | null =>
      list?.querySelector(`[data-worker="${who}"]`)?.closest('.assign-row') ?? null;
    // The men already on this job: greyed, with no way to add them twice.
    const onIt = Array.from(list?.querySelectorAll('.assign-row.is-busy') ?? []).map(
      (row) => row.textContent ?? '',
    );
    expect(onIt.some((text) => text.includes('Joiner 1') && text.includes('already on this job')))
      .toBe(true);
    // A man on another job is not greyed: his row says where he is and moves him here in one
    // click, off that job and on to this one (PIOTR, 18.09).
    const third = rowFor('staff-3');
    expect(third?.className).not.toContain('is-busy');
    expect(third?.textContent).toContain(`leaves ${other.name}`);
    const move = third?.querySelector('[data-do="assignMove"]');
    expect(move?.getAttribute('data-from')).toBe(other.id);
    expect(move?.getAttribute('data-id')).toBe(job.id);
    // The cross every popover has (PIOTR, 18.09).
    expect(list?.querySelector('.modal-close[data-do="closeAssign"]')).not.toBeNull();
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
