import { describe, expect, it } from 'vitest';
import {
  BOOKKEEPING_MINUTES,
  DAY_END_MINUTE,
  HIRING_SPECS,
  JOINER_PREREQUISITES,
  LABOUR_FRACTION,
  MINUTES_PER_WORKING_DAY,
  OWNER_LABOUR_PER_MINUTE,
  REPUTATION_MIN,
  TIERS,
  TIER_MIN_REPUTATION,
  TIER_WORDS,
  TOOL_CABINET,
  WORKER_RATES,
} from '../../src/engine/constants';
import {
  availableJoiners,
  canHire,
  hasWorkingDay,
  hiringOptions,
  isWorkingToday,
  joiners,
  missingForHire,
  shortfallForHire,
  staffMinutesLeft,
} from '../../src/engine/staff';
import { crewLimit } from '../../src/engine/layout';
import { waitingStation } from '../../src/engine/stations';
import { MATERIAL_TAKE_OFF_MINUTES } from '../../src/engine/constants';
import { createTask, estimatorCapacity } from '../../src/engine/tasks';
import { minutesRemainingFor, ownerJob } from '../../src/engine/jobs';
import { monthlyWageBill } from '../../src/engine/economy';
import { tick } from '../../src/engine/index';
import type { GameState, Worker } from '../../src/engine/index';
import {
  acceptNow,
  act,
  buyNow,
  buyStartingKit,
  withExtraction,
  clearEvents,
  fillRack,
  firstJob,
  hireNow,
  newGame,
  placeEnquiry,
  runClock,
  runToDay,
} from '../helpers';

/** Buys exactly what the engine says is missing for one more joiner. */
function withJoinerKit(state: GameState): GameState {
  let next = state;
  // A tool cabinet is wanted one deeper than the rest, the owner keeping his tools in one too,
  // so the list is bought out until nothing is short (CLAUDE.md T6 3.5).
  let guard = 0;
  while (missingForHire(next, 'joiner').length > 0 && guard < 20) {
    for (const specId of missingForHire(next, 'joiner')) {
      next = buyNow(next, specId);
    }
    guard += 1;
  }
  return next;
}

/** Kits out and hires `count` joiners of one tier. */
function withCrew(state: GameState, count: number, tier: Worker['tier']): GameState {
  let next = state;
  for (let index = 0; index < count; index += 1) {
    next = withJoinerKit(next);
    next = hireNow(next, 'joiner', tier);
  }
  return next;
}

describe('the hiring pool', () => {
  it('opens up as the reputation rises', () => {
    const state = newGame();
    // The card says what is missing in the game's own words now: "excellent joiners come from
    // reputation 60" (PIOTR, 19.09; CLAUDE.md T21 2.9).
    const byLabel = (reputation: number): string[] =>
      hiringOptions({ ...state, reputation })
        .filter((option) => option.blockReason.includes('come from reputation'))
        .map((option) => option.label);
    expect(byLabel(-50)).toContain('Office admin');
    expect(byLabel(-50)).not.toContain('Joiner, no experience');
    expect(byLabel(-50)).not.toContain('Helper');
    // The tier comes with the standing the workshop has earned: a man with no experience always
    // answers, an experienced one from 15, a very experienced one from 35 and an excellent one
    // from 60 (CLAUDE.md T21 2.9).
    expect(byLabel(0)).toContain('Joiner, experienced');
    expect(byLabel(5)).not.toContain('Office admin');
    expect(byLabel(15)).not.toContain('Joiner, experienced');
    expect(byLabel(15)).toContain('Joiner, very experienced');
    expect(byLabel(15)).not.toContain('Salesman');
    expect(byLabel(35)).not.toContain('Joiner, very experienced');
    expect(byLabel(35)).toContain('Joiner, excellent');
    expect(byLabel(60)).toHaveLength(0);
  });

  it('names what has to be bought before a joiner can start, and how many of each', () => {
    const state = newGame();
    expect(missingForHire(state, 'joiner')).toEqual(JOINER_PREREQUISITES);
    // Two cabinets on the first hire, one for the new man and one for the owner, so the bill on
    // the card is two of them and buying to it leaves nothing still blocking (CLAUDE.md T6 3.5).
    expect(shortfallForHire(state, 'joiner')).toContainEqual({ specId: TOOL_CABINET, count: 2 });
    const option = hiringOptions(state).find((entry) => entry.tier === 'novice');
    expect(option?.available).toBe(false);
    // The bill is the cheapest way into each family, which for the bench is the used one at 120
    // (CLAUDE.md T7 3.6).
    expect(option?.missingCost).toBe(120 + 80 + 40 + 400 + 350 * 2);
    // Named, never the catalogue id: nothing of the engine's own reaches the card (CLAUDE.md 3).
    expect(option?.missing).toContain('Tool cabinet x 2');
    expect(option?.missing.join(' ')).not.toContain(TOOL_CABINET);
    expect(option?.blockReason).toContain('Workbench');
  });

  it('blocks the hire while the kit is missing and lets it through once it is there', () => {
    let state = buyStartingKit(newGame());
    expect(canHire(state, 'joiner', 'novice').ok).toBe(false);
    state = hireNow(state, 'joiner', 'novice');
    expect(state.workers).toHaveLength(0);
    state = withJoinerKit(state);
    expect(canHire(state, 'joiner', 'novice').ok).toBe(true);
    state = hireNow(state, 'joiner', 'novice');
    expect(state.workers).toHaveLength(1);
    expect(state.workers[0]?.rate).toBe(WORKER_RATES.novice);
    expect(state.workers[0]?.monthlyWage).toBe(1950);
  });

  it('pays a joiner 1,950, 2,600, 3,500 and 4,330 a month, tier by tier', () => {
    // Piotr's own four figures: the excellent man at about 1,000 a week, which is 4,330 a month,
    // and the experienced one at 2,600, with the other two scaled off him [TUNE]
    // (PIOTR, 19.09; CLAUDE.md T21 2.9, 2.10). Written out as the four figures and not off the
    // table that makes them, so a change to the ladder has to be meant.
    const rows = HIRING_SPECS.filter((spec) => spec.role === 'joiner');
    expect(rows.map((spec) => spec.tier)).toEqual(['novice', 'experienced', 'senior', 'master']);
    expect(rows.map((spec) => spec.monthlyWage)).toEqual([1950, 2600, 3500, 4330]);
    expect(rows.map((spec) => spec.minReputation)).toEqual([REPUTATION_MIN, 15, 35, 60]);
  });

  it('runs the four tiers on Piotr\u2019s own words, rates and standings', () => {
    // His four, of 19.09, and not the ladder Turn 20 wrote for him: no experience, experienced,
    // very experienced, excellent at 0.6, 0.8, 1.0 and 1.2 of the owner, with the excellent man
    // answering from reputation 60 (PIOTR, 19.09; CLAUDE.md T21 2.9). Written out as the figures
    // and the words themselves, so Turn 20's 0.8 / 1.0 / 1.2 / 1.4 cannot come back by accident.
    expect(TIERS).toEqual(['novice', 'experienced', 'senior', 'master']);
    expect(TIERS.map((tier) => TIER_WORDS[tier])).toEqual([
      'no experience',
      'experienced',
      'very experienced',
      'excellent',
    ]);
    expect(TIERS.map((tier) => WORKER_RATES[tier])).toEqual([0.6, 0.8, 1.0, 1.2]);
    expect(TIER_MIN_REPUTATION.master).toBe(60);
    // The very experienced man is the one who matches the owner, and nobody is above 1.2.
    expect(WORKER_RATES.senior).toBe(1);
    expect(Math.max(...TIERS.map((tier) => WORKER_RATES[tier]))).toBe(1.2);
  });

  it('needs a second set of everything for a second joiner', () => {
    let state = withCrew(buyStartingKit(newGame()), 1, 'novice');
    expect(canHire(state, 'joiner', 'novice').ok).toBe(false);
    expect(missingForHire(state, 'joiner')).toEqual(JOINER_PREREQUISITES);
    state = withJoinerKit(state);
    expect(canHire(state, 'joiner', 'novice').ok).toBe(true);
  });

  it('stops at the floor limit of the hall, before the bench slots of the unit', () => {
    // One person per so many square metres of free floor, the owner among them, so a 200 m2
    // hall with a normal set of kit holds the owner and four (PIOTR; CLAUDE.md T13 3.10).
    const state = withCrew(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 6, 'novice');
    expect(joiners(state)).toHaveLength(4);
    // Every man's bench and cabinets take floor of their own, so the limit came down with the
    // hiring: the crew is now over it and the next hire is refused with the reason.
    expect(crewLimit(state)).toBeLessThanOrEqual(joiners(state).length + 1);
    const option = hiringOptions(state).find((entry) => entry.tier === 'novice');
    expect(option?.blockReason).toContain('floor limited');
  });

  it('starts the new man the next working day and pays him monthly', () => {
    const state = withCrew(buyStartingKit(newGame()), 1, 'novice');
    expect(state.workers[0]?.startDay).toBe(2);
    expect(availableJoiners(state)).toHaveLength(0);
    const day2 = runToDay(state, 2).state;
    expect(availableJoiners(day2)).toHaveLength(1);
    expect(monthlyWageBill(day2)).toBe(1950);
  });

  it('gives everyone a different name', () => {
    const state = withCrew(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 4, 'novice');
    const names = state.workers.map((worker) => worker.name);
    expect(new Set(names).size).toBe(names.length);
  });

  it('hires office staff without any bench kit, behind the office admin', () => {
    let state = newGame();
    state.reputation = 15;
    // Nobody in the office before the one who runs it (PIOTR, CLAUDE.md T10 3.6).
    expect(canHire(state, 'salesman', null)).toEqual({
      ok: false,
      reason: 'Hire an office admin first',
    });
    state = hireNow(state, 'officeAdmin', null);
    state = hireNow(state, 'salesman', null);
    expect(state.workers[0]?.role).toBe('officeAdmin');
    expect(state.workers[1]?.role).toBe('salesman');
    // The salesman's 2,200 is his month, whole: the week Turn 20 cut it into is gone
    // (CLAUDE.md T21 2.10).
    expect(state.workers[1]?.monthlyWage).toBe(2200);
  });
});

function jobReadyWith(price: number, tier: Worker['tier']): GameState {
  // The budget saw, whose factors are 1.0: these are the worker rates of CLAUDE.md 8.5. And a
  // fan big enough for it, so the rates are the rates and not the under extraction penalty
  // (CLAUDE.md T10 3.1).
  let state = withExtraction(
    buyStartingKit(newGame({ difficulty: 'veryEasy' }), { sawVariant: 'budget' }),
  );
  state.reputation = 40;
  state = withCrew(state, 1, tier);
  const enquiry = placeEnquiry(state, {
    templateId: 'wardrobe',
    name: 'Wardrobe',
    price,
    deadlineDays: 60,
  });
  state = fillRack(acceptNow(state, enquiry.id, false));
  firstJob(state).stage = 'ready';
  return state;
}

describe('joiners at the bench', () => {
  it('takes a joiner with no experience 13 days to make a 6400 wardrobe', () => {
    const state = jobReadyWith(6400, 'novice');
    const job = firstJob(state);
    expect(job.labourValue).toBe(6400 * LABOUR_FRACTION);
    const minutes = minutesRemainingFor(state, job, WORKER_RATES.novice);
    expect(minutes).toBeCloseTo(6400, 6);
    expect(minutes / 480).toBeCloseTo(13.3333, 3);
    // The same wardrobe is 8 days for the owner, and the very experienced joiner is the one who
    // matches him on Piotr's own ladder: the experienced man takes ten days over it
    // (CLAUDE.md 8.5, T21 2.9).
    expect(minutesRemainingFor(state, job, 1) / 480).toBeCloseTo(8, 6);
    expect(minutesRemainingFor(state, job, WORKER_RATES.senior) / 480).toBeCloseTo(8, 6);
    expect(minutesRemainingFor(state, job, WORKER_RATES.experienced) / 480).toBeCloseTo(10, 6);
  });

  it('picks up the oldest ready job on its own', () => {
    const state = runToDay(jobReadyWith(1600, 'novice'), 2).state;
    expect(state.workers[0]?.jobId).toBe(firstJob(state).id);
    expect(firstJob(state).stage).toBe('inProduction');
    const later = tick(state, 100);
    expect(firstJob(later).labourRemaining).toBeLessThan(firstJob(state).labourRemaining);
  });

  it('lets the player take the job off a joiner and put the owner on it', () => {
    let state = runToDay(jobReadyWith(1600, 'novice'), 2).state;
    const jobId = firstJob(state).id;
    state = act(state, { type: 'ASSIGN_JOB', jobId, workerId: 'owner' });
    expect(firstJob(state).assignees[0]).toBe('owner');
    expect(ownerJob(state)?.id).toBe(jobId);
    expect(state.workers[0]?.jobId).toBeNull();
  });

  it('produces at the tier rate', () => {
    const state = runToDay(jobReadyWith(1600, 'novice'), 2).state;
    const before = firstJob(state).labourRemaining;
    const after = firstJob(tick(state, 60)).labourRemaining;
    expect(before - after).toBeCloseTo(60 * OWNER_LABOUR_PER_MINUTE * WORKER_RATES.novice, 6);
  });

  it('drops the output of everyone the owner is not there to run', () => {
    let state = runToDay(jobReadyWith(1600, 'novice'), 2).state;
    state = act(state, { type: 'SKIP_DAY' });
    const before = firstJob(state).labourRemaining;
    const after = firstJob(tick(state, 60)).labourRemaining;
    expect(before - after).toBeCloseTo(60 * OWNER_LABOUR_PER_MINUTE * WORKER_RATES.novice * 0.7, 6);
  });
});

describe('the queue at the saw', () => {
  /** Four joiners, each on a wardrobe of his own, every one of them at the cutting. */
  function fourAtTheCutting(): GameState {
    let state = withExtraction(
      buyStartingKit(newGame({ difficulty: 'veryEasy' }), { sawVariant: 'budget' }),
    );
    // An experienced man answers from 15 now (CLAUDE.md T20 2.5).
    state.reputation = 15;
    state = withCrew(state, 4, 'experienced');
    for (let index = 0; index < 4; index += 1) {
      const enquiry = placeEnquiry(state, {
        templateId: 'wardrobe',
        name: 'Wardrobe',
        price: 1600 + index * 10,
        deadlineDays: 60,
      });
      state = acceptNow(state, enquiry.id, false);
    }
    fillRack(state, 60);
    for (const job of state.jobs) job.stage = 'ready';
    return clearEvents(runToDay(state, 2).state);
  }

  it('lets one man cut and stands the other three at the saw', () => {
    const state = fourAtTheCutting();
    expect(state.jobs.filter((job) => job.stage === 'inProduction')).toHaveLength(4);
    const before = state.jobs.map((job) => job.labourRemaining);
    const worked = tick(state, 60);
    const done = before.map((value, index) => value - (worked.jobs[index]?.labourRemaining ?? 0));
    // One saw, one man on it: the ratio is not a multiplier on anybody's speed now, it is three
    // men standing and waiting (CLAUDE.md T7 3.1).
    const full = 60 * OWNER_LABOUR_PER_MINUTE * WORKER_RATES.experienced;
    expect(done.filter((value) => Math.abs(value - full) < 1e-6)).toHaveLength(1);
    expect(done.filter((value) => value === 0)).toHaveLength(3);
    expect(
      worked.workers.filter((worker) => worker.station === waitingStation('tableSaw')),
    ).toHaveLength(3);
    expect(worked.jobs.filter((job) => job.blockedBy === 'waiting for the saw')).toHaveLength(3);
  });

  it('puts a second man to work the moment a second saw is bought', () => {
    const state = buyNow(fourAtTheCutting(), 'tableSaw');
    const before = state.jobs.map((job) => job.labourRemaining);
    const worked = tick(state, 60);
    const done = before.map((value, index) => value - (worked.jobs[index]?.labourRemaining ?? 0));
    expect(done.filter((value) => value > 0)).toHaveLength(2);
    expect(
      worked.workers.filter((worker) => worker.station === waitingStation('tableSaw')),
    ).toHaveLength(2);
  });
});

describe('one path for putting a man on a job', () => {
  it('automatic assignment goes through the same door as the manual one', () => {
    const state = runToDay(jobReadyWith(1600, 'novice'), 2).state;
    const worker = state.workers[0];
    const job = firstJob(state);
    expect(worker?.jobId).toBe(job.id);
    expect(job.assignees[0]).toBe(worker?.id);
    expect(job.stage).toBe('inProduction');
    // And putting the owner on it takes the joiner off, whichever way it was assigned.
    const taken = act(state, { type: 'ASSIGN_JOB', jobId: job.id, workerId: 'owner' });
    expect(taken.workers[0]?.jobId).toBeNull();
    expect(firstJob(taken).assignees[0]).toBe('owner');
  });

  it('knows who is on the books today', () => {
    const state = withCrew(buyStartingKit(newGame()), 1, 'novice');
    const worker = state.workers[0];
    expect(worker).toBeDefined();
    if (!worker) return;
    expect(isWorkingToday(state, worker)).toBe(false);
    const day2 = runToDay(state, 2).state;
    const started = day2.workers[0];
    expect(started && isWorkingToday(day2, started)).toBe(true);
    if (started) started.absentDaysRemaining = 2;
    expect(started && isWorkingToday(day2, started)).toBe(false);
  });
});

describe('the office working day', () => {
  function officeWorker(id: string, role: 'officeAdmin' | 'purchasingClerk' | 'estimator'): Worker {
    return {
      id,
      name: id,
      role,
      tier: null,
      rate: 0,
      monthlyWage: 0,
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
      anchorX: 1,
      anchorY: 1,
    };
  }

  it('gives the three office roles 480 minutes of their own, and nobody else', () => {
    expect(hasWorkingDay('officeAdmin')).toBe(true);
    expect(hasWorkingDay('purchasingClerk')).toBe(true);
    expect(hasWorkingDay('salesman')).toBe(true);
    expect(hasWorkingDay('helper')).toBe(false);
    expect(hasWorkingDay('joiner')).toBe(false);
    expect(staffMinutesLeft(officeWorker('a1', 'officeAdmin'))).toBe(MINUTES_PER_WORKING_DAY);
  });

  it('leaves what the admin could not finish for tomorrow, and lets the owner take it on', () => {
    let state = newGame();
    state.workers.push(officeWorker('a1', 'officeAdmin'));
    state = clearEvents(runToDay(state, 2).state);
    const taken = state.tasks.find((task) => task.kind === 'bookkeeping');
    expect(taken?.doneBy).toBe('a1');
    // Ten minutes of his day left, and the bookkeeping is an hour.
    const admin = state.workers[0];
    if (admin) admin.minutesWorked = MINUTES_PER_WORKING_DAY - 10;
    state = clearEvents(tick(state, 20));
    const left = state.tasks.find((task) => task.kind === 'bookkeeping');
    expect(left?.done).toBe(false);
    expect(left?.doneBy).toBeNull();
    expect(left?.minutesRemaining).toBe(BOOKKEEPING_MINUTES - 10);
    expect(staffMinutesLeft(state.workers[0] as Worker)).toBe(0);
    // The owner picks up what is left of it.
    state = act(state, { type: 'START_TASK', taskId: left?.id ?? '' });
    expect(state.owner.currentTaskId).toBe(left?.id);
  });

  it('takes a task off the man who was holding it when the owner takes it on', () => {
    let state = newGame();
    state.workers.push(officeWorker('a1', 'officeAdmin'));
    state = clearEvents(runToDay(state, 2).state);
    const books = state.tasks.find((task) => task.kind === 'bookkeeping');
    expect(state.workers[0]?.taskId).toBe(books?.id);
    state = act(state, { type: 'START_TASK', taskId: books?.id ?? '' });
    // She moves on to the next thing on her list, and the books are the owner's.
    expect(state.workers[0]?.taskId).not.toBe(books?.id);
    expect(state.tasks.find((task) => task.kind === 'bookkeeping')?.doneBy).toBe('owner');
  });

  it('lets the estimator do as many take offs as his minutes allow, not five', () => {
    // The count of jobs a day is gone: a take off is half an hour of his desk, so an experienced
    // man gets sixteen of them out of his 480 minutes (PIOTR, 18.09; CLAUDE.md T20 2.3).
    let state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    state.enquiries = [];
    state.workers.push(officeWorker('e1', 'estimator'));
    const enquiry = placeEnquiry(state, { price: 400, deadlineDays: 90 });
    state = acceptNow(state, enquiry.id, false);
    const first = firstJob(state);
    for (let index = 1; index < 20; index += 1) {
      state.jobs.push({ ...first, id: `job-clone-${index}` });
    }
    state.tasks = state.tasks.filter((task) => task.jobId === null);
    for (const job of state.jobs) {
      job.stage = 'materialPending';
      createTask(state, {
        kind: 'materialTakeOff',
        label: `Material take off: ${job.name}`,
        minutes: MATERIAL_TAKE_OFF_MINUTES,
        jobId: job.id,
      });
    }
    // One action to settle the state, so the estimator is holding his first list at 08:00.
    const morning = act(clearEvents(state), { type: 'SET_SPEED', speed: 1 });
    // His day is the 480 minutes of work, and the clock takes the dinner hour on top of them.
    const day = clearEvents(runClock(morning, DAY_END_MINUTE));
    const done = day.tasks.filter((task) => task.kind === 'materialTakeOff' && task.done).length;
    expect(done).toBe(estimatorCapacity(day));
    // Twelve, not the sixteen of Turn 20: an experienced man is 0.8 of the owner on Piotr's
    // ladder, so a half hour take off is 37.5 minutes of his day (CLAUDE.md T21 2.9).
    expect(done).toBe(12);
    // And the cap is his minutes now: the day is spent, not a counter run out.
    expect(staffMinutesLeft(day.workers[0] as Worker)).toBeLessThan(MATERIAL_TAKE_OFF_MINUTES);
  });
});
