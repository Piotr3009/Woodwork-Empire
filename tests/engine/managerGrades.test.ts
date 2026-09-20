// The production manager in his four grades (PIOTR, 20.09; CLAUDE.md T23 2.4).
//
// His grade says three things and this proves all three: how many men he carries, the order he
// hands their work out in, and what he does to the pace of the men he carries. A man past his
// grade's number is a man without a manager, who waits for the boss as in 2.1, which is what
// makes a better grade worth buying.

import { describe, expect, it } from 'vitest';
import {
  BREAK_MINUTES,
  MANAGER_AHEAD_DAYS,
  MANAGER_BEHIND_DAYS,
  MANAGER_REPLAN_MINUTES,
  PRODUCTION_MANAGER_CARRIES,
  PRODUCTION_MANAGER_MONTHLY_WAGE,
  MINUTES_PER_WORKING_DAY,
  PRODUCTION_MANAGER_PACE,
  TIERS,
  WORKER_RATES,
} from '../../src/engine/constants';
import {
  autoAssignJobs,
  hasManager,
  managerPaceFor,
  managerReplans,
  menCarried,
  waitsForTheBoss,
} from '../../src/engine/staff';
import { managerTier } from '../../src/engine/owner';
import { hands, machineWantedFor } from '../../src/engine/production';
import { outputBreakdown } from '../../src/engine/machines';
import { workPlan } from '../../src/engine/plan';
import type { GameState, Worker, WorkerTier } from '../../src/engine/index';
import { runClock, sixJoinersOnSheetWork } from '../helpers';

/** A production manager of this grade on the books from day one, the way a test wants him without
 *  the interview. */
function manager(tier: WorkerTier): Worker {
  return {
    id: 'pm-1',
    name: 'Frank',
    role: 'productionManager',
    tier,
    rate: 0,
    monthlyWage: PRODUCTION_MANAGER_MONTHLY_WAGE[tier],
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
    idleMinutes: 0,
    idleByReason: { waitingForBoss: 0, noMachine: 0, noMaterial: 0 },
    accidents: 0,
    anchorX: 1,
    anchorY: 1,
  };
}

/** Nine joiners under a novice, who carries eight: the ninth is a man without a manager and the
 *  one the cross check of section 7 asks about. The three extra men are copies of the first, put
 *  in front of the manager because he is last on the books and the order the men were hired in is
 *  what his grade counts down (CLAUDE.md T23 2.4). */
function nineUnderANovice(): GameState {
  const state = hallUnder('novice');
  for (let extra = 7; extra <= 9; extra += 1) {
    const copy = { ...state.workers[0], id: `staff-${extra}`, name: `Joiner ${extra}` } as Worker;
    copy.idleByReason = { waitingForBoss: 0, noMachine: 0, noMaterial: 0 };
    state.workers.splice(state.workers.length - 1, 0, copy);
  }
  return state;
}

/** Six joiners, every one of them free, and a manager of this grade over them. */
function hallUnder(tier: WorkerTier): GameState {
  const state = sixJoinersOnSheetWork();
  for (const worker of state.workers) worker.jobId = null;
  for (const job of state.jobs) job.assignees = [];
  state.workers.push(manager(tier));
  return state;
}

describe('how many men a grade carries', () => {
  it('carries his grade’s number, in the order they were hired, the owner not counted', () => {
    const state = hallUnder('novice');
    // Six joiners and the manager himself on the books: a novice carries eight, so all six are
    // his and the count is the men and not the cap.
    expect(PRODUCTION_MANAGER_CARRIES.novice).toBe(8);
    expect(menCarried(state).map((worker) => worker.id)).toEqual([
      'staff-1',
      'staff-2',
      'staff-3',
      'staff-4',
      'staff-5',
      'staff-6',
    ]);
    // And the manager does not carry himself.
    expect(menCarried(state).some((worker) => worker.role === 'productionManager')).toBe(false);
  });

  it('leaves the ninth man of a novice waiting for the boss', () => {
    const state = nineUnderANovice();
    const carried = menCarried(state).map((worker) => worker.id);
    expect(carried).toHaveLength(8);
    expect(carried).toContain('staff-8');
    expect(carried).not.toContain('staff-9');
    const ninth = state.workers.find((worker) => worker.id === 'staff-9');
    if (!ninth) throw new Error('a ninth man is wanted');
    expect(hasManager(state, ninth)).toBe(false);
    expect(waitsForTheBoss(state, ninth)).toBe(true);
    // And the eighth, who is carried, does not wait.
    const eighth = state.workers.find((worker) => worker.id === 'staff-8');
    if (!eighth) throw new Error('an eighth man is wanted');
    expect(waitsForTheBoss(state, eighth)).toBe(false);
  });

  it('books the ninth man a whole working day of waiting for the boss, and the eighth none', () => {
    // Section 7's own line: a novice with nine men, and the ninth has a full day of idle with
    // `waiting for the boss` on his meter. A full day is the working day less the dinner hour,
    // 420 minutes of 480, because a man at his lunch is not standing about waiting for anybody
    // and nothing is booked against him for it (CLAUDE.md T6 3.4). The eighth is inside the
    // novice's eight, so his manager puts him on something and nothing is booked against him at
    // all.
    const state = nineUnderANovice();
    const played = runClock(state, MINUTES_PER_WORKING_DAY);
    const ninth = played.workers.find((worker) => worker.id === 'staff-9');
    const eighth = played.workers.find((worker) => worker.id === 'staff-8');
    if (!ninth || !eighth) throw new Error('nine men are wanted');
    expect(ninth.idleByReason.waitingForBoss).toBe(MINUTES_PER_WORKING_DAY - BREAK_MINUTES);
    expect(eighth.idleByReason.waitingForBoss).toBe(0);
  });

  it('carries nobody at all when there is no manager on duty', () => {
    const state = sixJoinersOnSheetWork();
    // The fixture hands every man a job; this is about who would be given one from here.
    for (const worker of state.workers) worker.jobId = null;
    for (const job of state.jobs) job.assignees = [];
    expect(managerTier(state)).toBeNull();
    expect(menCarried(state)).toEqual([]);
    autoAssignJobs(state);
    expect(state.jobs.every((job) => job.assignees.length === 0)).toBe(true);
  });
});

describe('the order each grade assigns in', () => {
  /** Three jobs with three deadlines, in the order they were taken: the oldest is due last. */
  function threeDeadlines(tier: WorkerTier): GameState {
    const state = hallUnder(tier);
    state.jobs = state.jobs.slice(0, 3);
    for (const worker of state.workers) worker.jobId = null;
    const days = [40, 20, 30];
    state.jobs.forEach((job, index) => {
      job.stage = 'ready';
      job.assignees = [];
      job.dueDay = days[index] ?? 40;
    });
    state.workers = state.workers.filter(
      (worker) => worker.id === 'staff-1' || worker.role === 'productionManager',
    );
    return state;
  }

  it('gives the novice the oldest open job first', () => {
    const state = threeDeadlines('novice');
    autoAssignJobs(state);
    // The board's own order is the order the work was taken on, so the first job is the oldest,
    // whatever its deadline.
    expect(state.jobs[0]?.assignees).toEqual(['staff-1']);
    expect(state.jobs[1]?.assignees).toEqual([]);
  });

  it('gives every grade above him the soonest deadline first', () => {
    for (const tier of ['experienced', 'senior', 'master'] as const) {
      const state = threeDeadlines(tier);
      autoAssignJobs(state);
      // The second job is due on day 20, the soonest of the three.
      expect(state.jobs[1]?.assignees, tier).toEqual(['staff-1']);
      expect(state.jobs[0]?.assignees, tier).toEqual([]);
    }
  });
});

describe('the senior spreads his men over the machines', () => {
  /** One man already cutting, so the saw is spoken for; then one open job that wants the saw and
   *  is due soonest, and one open job whose stage is bench work and is due later. */
  function sawContended(tier: WorkerTier): GameState {
    const state = hallUnder(tier);
    const [cutting, alsoSaw, bench] = state.jobs;
    if (!cutting || !alsoSaw || !bench) throw new Error('three jobs are wanted');
    // The fixture's first two jobs are at the cutting and the third is past it, on the bench.
    expect(machineWantedFor(state, cutting)).toBe('tableSaw');
    expect(machineWantedFor(state, alsoSaw)).toBe('tableSaw');
    expect(machineWantedFor(state, bench)).toBeNull();
    cutting.stage = 'inProduction';
    cutting.assignees = ['staff-1'];
    const first = state.workers.find((worker) => worker.id === 'staff-1');
    if (first) first.jobId = cutting.id;
    alsoSaw.dueDay = 10;
    bench.dueDay = 20;
    // Only one man is free, and only these three jobs are on the board.
    state.jobs = [cutting, alsoSaw, bench];
    state.workers = state.workers.filter(
      (worker) =>
        worker.id === 'staff-1' || worker.id === 'staff-2' || worker.role === 'productionManager',
    );
    return state;
  }

  it('queues the experienced man’s second hand at the saw, deadline first and no further', () => {
    const state = sawContended('experienced');
    autoAssignJobs(state);
    // The soonest deadline wants the saw a man already has, and he takes it anyway.
    expect(state.jobs[1]?.assignees).toEqual(['staff-2']);
    expect(state.jobs[2]?.assignees).toEqual([]);
  });

  it('sends the senior’s second hand to the open bench work instead', () => {
    for (const tier of ['senior', 'master'] as const) {
      const state = sawContended(tier);
      autoAssignJobs(state);
      expect(state.jobs[2]?.assignees, tier).toEqual(['staff-2']);
      expect(state.jobs[1]?.assignees, tier).toEqual([]);
    }
  });

  it('lets the senior take the front runner when no bench work is open', () => {
    const state = sawContended('senior');
    // Take the bench job off the board: now the saw job is the only thing there is.
    state.jobs = state.jobs.slice(0, 2);
    autoAssignJobs(state);
    expect(state.jobs[1]?.assignees).toEqual(['staff-2']);
  });
});

describe('what a grade does to a man’s minutes', () => {
  it('multiplies the production minutes of the men he carries, and nobody else’s', () => {
    for (const tier of TIERS) {
      const state = hallUnder(tier);
      state.jobs.forEach((job, index) => {
        job.stage = 'inProduction';
        job.assignees = [`staff-${index + 1}`];
      });
      state.workers.forEach((worker, index) => {
        if (worker.role === 'joiner') worker.jobId = state.jobs[index]?.id ?? null;
      });
      const first = state.workers[0];
      if (!first) throw new Error('a joiner is wanted');
      expect(managerPaceFor(state, first), tier).toBe(PRODUCTION_MANAGER_PACE[tier]);
      // And it is on the minute itself, on the one path every rate goes through.
      const hand = hands(state).find((entry) => entry.who === 'staff-1');
      expect(hand?.rate, tier).toBeCloseTo(WORKER_RATES.novice * PRODUCTION_MANAGER_PACE[tier], 9);
    }
  });

  it('leaves a man his manager does not carry at his own rate', () => {
    const state = hallUnder('novice');
    const outside = { ...state.workers[0], id: 'staff-99' } as Worker;
    expect(managerPaceFor(state, outside)).toBe(1);
  });

  it('is one line of the output breakdown and is never multiplied twice', () => {
    const plain = sixJoinersOnSheetWork();
    expect(outputBreakdown(plain).lines.some((line) => line.label === 'Manager')).toBe(false);
    const state = hallUnder('experienced');
    const line = outputBreakdown(state).lines.find((entry) => entry.label === 'Manager');
    expect(line).toBeDefined();
    // +5% for the experienced man, as the breakdown prints it, and it acts on the men and not on
    // the hall, so it is not part of the hall's own total.
    expect(line?.points).toBeCloseTo(PRODUCTION_MANAGER_PACE.experienced - 1, 9);
    expect(line?.points).toBeCloseTo(0.05, 9);
    expect(line?.hall).toBe(false);
    expect(line?.where).toBe('the minutes of the men he carries');
  });
});

describe('the master looks at the board again every hour', () => {
  /** Two jobs: the first comfortably ahead of its deadline with a man on it, the second a day
   *  past its own with nobody on it. */
  function aheadAndBehind(tier: WorkerTier): GameState {
    const state = hallUnder(tier);
    state.jobs = state.jobs.slice(0, 2);
    state.workers = state.workers.filter(
      (worker) => worker.id === 'staff-1' || worker.role === 'productionManager',
    );
    const [ahead, behind] = state.jobs;
    if (!ahead || !behind) throw new Error('two jobs are wanted');
    ahead.stage = 'inProduction';
    ahead.assignees = ['staff-1'];
    const man = state.workers[0];
    if (man) man.jobId = ahead.id;
    behind.stage = 'ready';
    behind.assignees = [];
    // The first is due a long way off, the second was due yesterday.
    ahead.dueDay = 90;
    behind.dueDay = 1;
    state.clock.minute = MANAGER_REPLAN_MINUTES;
    return state;
  }

  it('moves a man off a job that is a day ahead onto one that is a day behind', () => {
    const state = aheadAndBehind('master');
    const rows = workPlan(state).rows;
    const aheadRow = rows.find((row) => row.jobId === state.jobs[0]?.id);
    const behindRow = rows.find((row) => row.jobId === state.jobs[1]?.id);
    // The fixture really is a day ahead and a day behind, measured off the board itself.
    expect((aheadRow?.duePoint ?? 0) - (aheadRow?.to ?? 0)).toBeGreaterThanOrEqual(
      MANAGER_AHEAD_DAYS,
    );
    expect((behindRow?.to ?? 0) - (behindRow?.duePoint ?? 0)).toBeGreaterThanOrEqual(
      MANAGER_BEHIND_DAYS,
    );
    managerReplans(state);
    expect(state.jobs[1]?.assignees).toEqual(['staff-1']);
    expect(state.jobs[0]?.assignees).toEqual([]);
  });

  it('is the master’s alone: no other grade re plans', () => {
    for (const tier of ['novice', 'experienced', 'senior'] as const) {
      const state = aheadAndBehind(tier);
      managerReplans(state);
      expect(state.jobs[0]?.assignees, tier).toEqual(['staff-1']);
      expect(state.jobs[1]?.assignees, tier).toEqual([]);
    }
  });

  it('looks only on the hour', () => {
    const state = aheadAndBehind('master');
    state.clock.minute = MANAGER_REPLAN_MINUTES + 1;
    managerReplans(state);
    expect(state.jobs[0]?.assignees).toEqual(['staff-1']);
  });

  it('leaves a hall where nothing is behind alone', () => {
    const state = aheadAndBehind('master');
    const behind = state.jobs[1];
    if (!behind) throw new Error('two jobs are wanted');
    behind.dueDay = 90;
    managerReplans(state);
    expect(state.jobs[0]?.assignees).toEqual(['staff-1']);
  });
});
