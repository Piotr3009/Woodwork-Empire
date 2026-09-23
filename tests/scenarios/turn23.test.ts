// The Turn 23 scenarios of CLAUDE.md T23 3, phase C: (ll) three men and no manager, with the boss
// making his round every morning; (mm) the same crew with a novice manager over them; (nn) the
// ninth man under a novice; and (oo) a bench with nothing in the hose.
//
// All four are the one rule of the turn played out: from tonight nobody takes a job by himself
// without a production manager on duty, so a free man waits at his bench for the owner's click and
// the scripted player makes that click at the start of every day (CLAUDE.md T23 2.1, and
// `assignFreeMen` in tests/scenarios/autopilot.ts). The unit tests of the same rules are
// tests/engine/waitsForTheBoss.test.ts, tests/engine/managerGrades.test.ts,
// tests/engine/eightLockers.test.ts and the "no bench work without air" block of
// tests/engine/lacquerAirRotate.test.ts, each of which drives the rule off a position written into
// it. These four are the played halls those are not.
//
// The shape is the one Turns 13, 17, 19, 20, 21 and 22 used: the hall is stood up by playing the
// opening days through the scripted player of autopilot.ts and never by writing the state out by
// hand. Where a scenario writes one figure onto the state it says which figure it is and why the
// played route cannot reach it. Every figure in a comment was measured on this build.

import { describe, expect, it } from 'vitest';
import { type Policy, bossRound, playDay, playUntilDay } from './autopilot';
import { acceptNow, act, newGame, placeEnquiry } from '../helpers';
import {
  CANTEEN_LOCKERS,
  HIRE_START_DELAY_DAYS,
  PRODUCTION_MANAGER_CARRIES,
  PRODUCTION_MANAGER_PACE,
} from '../../src/engine/constants';
import { managerOnDuty, tick } from '../../src/engine/index';
import { clone } from '../../src/engine/game';
import { currentStage } from '../../src/engine/stages';
import { bubbleFor } from '../../src/engine/bubbles';
import { benchHasAir } from '../../src/engine/media';
import { canHire, hasManager, managerPaceFor, menCarried, waitsForTheBoss } from '../../src/engine/staff';
import type { GameState } from '../../src/engine/index';

const SEED = 20260911;

/** Three joiners with no experience, a saw apiece so nobody is short of a place, and sheets on
 *  the rack. The script takes nothing off the enquiry board: the work these months are played on
 *  is put there by hand, three jobs big enough to outlast the stretch, so that what is being
 *  measured is the men and never the board's own luck. */
const THREE_MEN: Policy = {
  maxOpenJobs: 0,
  buyKit: true,
  cleanAbove: 25,
  wanted: [],
  hireJoiner: true,
  joiners: 3,
  extraSaws: 2,
  stockSheets: 120,
};

/** The one figure these months write onto the state, and it is the account: three men, their kit
 *  and 120 sheets are more than a very easy opening balance carries, and a company closed by the
 *  bank halfway through would be measuring the overdraft and not the crew [TUNE: 200,000, which is
 *  enough that no bill of the stretch can reach the limit]. Everything else in the hall is bought,
 *  hired and worked through the game's own actions. */
const OPENING_ACCOUNT = 200000;

/** The work these months are played on: three fit outs of 14,000, deadlines far enough out that
 *  nothing is ever late, and each one big enough that no man finishes his inside the stretch. A
 *  job that came off the board in the middle of a day would be the board's timing under the
 *  measurement rather than the crew's (CLAUDE.md T23 2.1). */
const JOB_PRICE = 14000;
const JOBS = 3;

function labourDone(state: GameState): number {
  return state.jobs.reduce((total, job) => total + (job.labourValue - job.labourRemaining), 0);
}

function standingNow(state: GameState): number {
  return state.workers.filter((worker) => waitsForTheBoss(state, worker)).length;
}

interface Stretch {
  state: GameState;
  /** Labour put into the jobs over the days played. */
  done: number;
  /** The most men seen standing with the red mark at any minute of the stretch. */
  mostStanding: number;
  /** The most minutes of `waiting for the boss` any man's day meter carried at any minute. */
  mostWaitingMinutes: number;
  /** Assigns the boss's round clicked over the stretch. */
  clicks: number;
}

/** Plays working days with the scripted player and watches every man through every minute of them. */
function stretch(start: GameState, days: number, policy: Policy = THREE_MEN): Stretch {
  let state = start;
  let mostStanding = 0;
  let mostWaitingMinutes = 0;
  const from = labourDone(state);
  bossRound.clicks = 0;
  for (let day = 0; day < days; day += 1) {
    state = playDay(state, policy, [], {
      watch: (seen) => {
        mostStanding = Math.max(mostStanding, standingNow(seen));
        for (const worker of seen.workers) {
          mostWaitingMinutes = Math.max(mostWaitingMinutes, worker.idleByReason.waitingForBoss);
        }
      },
    });
  }
  return {
    state,
    done: labourDone(state) - from,
    mostStanding,
    mostWaitingMinutes,
    clicks: bossRound.clicks,
  };
}

/** The hall both of the first two months are played in, stood up the same way for each of them:
 *  the day 1 kit, three men with a bench, a locker, a cabinet and a set of tools apiece, two more
 *  saws, 120 sheets on the rack, and the three fit outs taken on and designed. It is played to the
 *  morning after the last of the three has gone into production with a man on it, so that both
 *  months start from the same hall on the same minute with the same work done. */
function threeMenHall(): GameState {
  let state = newGame({ seed: SEED, difficulty: 'veryEasy' });
  state.cash = OPENING_ACCOUNT;
  state = playUntilDay(state, 3, THREE_MEN);
  for (let index = 0; index < JOBS; index += 1) {
    const enquiry = placeEnquiry(state, {
      name: `Fit out ${index + 1}`,
      price: JOB_PRICE,
      basePrice: JOB_PRICE,
      deadlineDays: 200,
    });
    state = acceptNow(state, enquiry.id, false);
  }
  let guard = 0;
  while (guard < 20 && state.jobs.some((job) => job.stage !== 'inProduction')) {
    guard += 1;
    state = playDay(state, THREE_MEN);
  }
  // The owner picks up an open job himself the minute his queue is empty (CLAUDE.md T23 2.3), so
  // one of the three is his by the time they are all in production. The player moves him off it in
  // the Work Plan, which is the same click as any other, and the next morning's round hands that
  // job to the man who was standing. From here on there is one job for each of the three men and
  // none for the owner.
  for (const job of state.jobs) {
    if (job.assignees.length > 0) state = act(state, { type: 'ASSIGN_JOB', jobId: job.id, workerId: null });
  }
  state = playDay(state, THREE_MEN);
  return state;
}

/** The novice manager, taken on through the hire card like anybody else. The click puts an
 *  interview on the owner's list and the man walks in on the working day after his hire, so both
 *  months play the same warm up day before the stretch opens and start it on the same minute with
 *  the same work behind them. He needs no locker of his own at the gate: the canteen's eight are
 *  counted against the men on the books and not bought one by one for the office
 *  (CLAUDE.md T23 2.10). */
function takeOnManager(state: GameState): GameState {
  const check = canHire(state, 'productionManager', 'novice');
  if (!check.ok) throw new Error(`the novice manager was refused: ${check.reason}`);
  return act(state, { type: 'HIRE', role: 'productionManager', tier: 'novice' });
}

const HALL = threeMenHall();

/** The same hall twice, warmed the same number of days: once with nobody over the men, once with a
 *  novice manager who comes on duty on the last of those days. */
const TWO_MONTHS = (() => {
  let withManager = takeOnManager(clone(HALL));
  let warmUpDays = 0;
  while (!managerOnDuty(withManager) && warmUpDays < HIRE_START_DELAY_DAYS + 5) {
    warmUpDays += 1;
    withManager = playDay(withManager, THREE_MEN);
  }
  let withoutManager = clone(HALL);
  for (let day = 0; day < warmUpDays; day += 1) {
    withoutManager = playDay(withoutManager, THREE_MEN);
  }
  return { withManager, withoutManager, warmUpDays };
})();

/** The working days the hall is played between the manager's hire card and the stretch: one, which
 *  is the interview done on the owner's own list that day and the man in the hall on the morning
 *  after it, the working day `HIRE_START_DELAY_DAYS` puts him on [measured on this build]. */
const WARM_UP_DAYS = 1;

/** Ten working days of each month. Ten, because it is long enough for the pace to show over the
 *  rounding of a minute's labour and short enough that no job comes off the board inside it. */
const STRETCH_DAYS = 10;
const NO_MANAGER = stretch(clone(TWO_MONTHS.withoutManager), STRETCH_DAYS);
const NOVICE = stretch(clone(TWO_MONTHS.withManager), STRETCH_DAYS);

describe('(ll) three men, no manager, and the boss assigns each morning', () => {
  it('stands the hall up with three men, no manager, and a job apiece', () => {
    expect(HALL.workers).toHaveLength(3);
    expect(managerOnDuty(HALL)).toBe(false);
    expect(HALL.jobs.filter((job) => job.assignees.length === 1)).toHaveLength(JOBS);
    expect(HALL.jobs.every((job) => job.assignees[0] !== 'owner')).toBe(true);
  });

  it('leaves nobody standing for want of the boss, at any minute of any day', () => {
    // The claim of (ll), measured minute by minute over the ten days: not one man on the books
    // carries the red mark, and not one minute of `waiting for the boss` reaches anybody's day
    // meter. The boss's round is made before the clock runs a minute of the day, so a man is not
    // left standing even for the first minute of it.
    expect(NO_MANAGER.mostStanding).toBe(0);
    expect(NO_MANAGER.mostWaitingMinutes).toBe(0);
  });

  it('costs the boss no click at all once the men are on their jobs', () => {
    // Two things need no click (CLAUDE.md T23 2.1): a man who had a job yesterday carries on with
    // it in the morning, and a man on a job stays on it to its end. Ten days of the round therefore
    // click nothing: the three clicks that put these men on these jobs were made on the morning
    // before the stretch opened.
    expect(NO_MANAGER.clicks).toBe(0);
  });

  it('puts the whole of every man s day into the jobs, and finishes none of them', () => {
    // 4,091.97 of labour over the ten days [measured on this build]. It is quoted here so that
    // (mm) below is read against a figure and not against itself, and the three jobs are all still
    // on the bench at the end of it, so the figure is ten days of three men and nothing else.
    expect(NO_MANAGER.done).toBeCloseTo(4091.97, 2);
    expect(NO_MANAGER.state.jobs.every((job) => job.stage === 'inProduction')).toBe(true);
  });
});

describe('(mm) the same crew with a novice manager over them', () => {
  it('opens the stretch on the same hall as (ll), to the last penny of work done', () => {
    expect(TWO_MONTHS.warmUpDays).toBe(WARM_UP_DAYS);
    expect(managerOnDuty(TWO_MONTHS.withManager)).toBe(true);
    expect(labourDone(TWO_MONTHS.withManager)).toBe(labourDone(TWO_MONTHS.withoutManager));
  });

  it('carries all three men, at his grade s pace', () => {
    const state = TWO_MONTHS.withManager;
    const men = state.workers.filter((worker) => worker.role === 'joiner');
    expect(menCarried(state).map((worker) => worker.id)).toEqual(men.map((worker) => worker.id));
    expect(men.length).toBeLessThanOrEqual(PRODUCTION_MANAGER_CARRIES.novice);
    for (const man of men) {
      expect(hasManager(state, man)).toBe(true);
      expect(managerPaceFor(state, man)).toBe(PRODUCTION_MANAGER_PACE.novice);
    }
  });

  it('puts more into the jobs than (ll), because the pace reaches the day shift now', () => {
    // 2.4 says the grade's pace multiplies the production minutes of the men he carries, and a
    // novice's is 1.03. When this file was first written it did not: `managerPaceFor` was read by
    // `hands` in src/engine/production.ts, which is the NIGHT shift's hands, and the day's own
    // minute is `handsAtWork` in src/engine/game.ts, which pushed `rate: worker.rate * staffFactor`
    // with no manager in it. So the pace reached the second shift alone while the efficiency sheet
    // printed `Manager: +3%` over a day crew that was not getting it. The lead put the same factor
    // on the day's hands, which is the one path 2.4 asks for, and this is the month that measures
    // it: 4,091.97 without him, 4,261.25 with him [both measured on this build].
    //
    // **Four per cent, and not the three the grade says**, and the one per cent over is not the
    // manager either: it is the hall. Every one of the 14,400 hand minutes of the month carries
    // his 1.03: the rates of the day's hands add up to exactly three per cent more than (ll)'s,
    // measured. The rest is the dust swinging the hall factor: this hall is three saws and one
    // used fan with no helper behind it, and a month that lands on the good side of the
    // extraction's margin a few minutes more banks a little over the three per cent.
    //
    // From v40 to v49 this figure read 4,096.14, four pounds over (ll) and not the hundred and
    // twenty three, and the comment here blamed the dust for the hundred and nineteen given
    // back. It was not the dust: it was the service rule. Every saw on this hall passes 80 hours
    // inside the two months, the scripted player leaves the reminder alone, and in the manager's
    // month the overdue saw kit-137 rolled its 2% and gave up on the main stream's dice, and stayed
    // broken; the same rolls moved the extractor's, which broke twice as well (days 23 and 25).
    // (ll)'s saws were just as overdue and simply rolled no breakdown. With the service on the
    // calendar (PIOTR, 22.09; v51) nothing is overdue inside six months, nothing rolls, and the
    // month reads what the grade puts in it. Measured on this build: no repair line in either
    // month, every saw whole.
    expect(NOVICE.done).toBeGreaterThan(NO_MANAGER.done);
    expect(NOVICE.done).toBeCloseTo(4261.25, 2);
  });

  it('never sends the owner to the Work Plan', () => {
    // What the manager is bought for. Nobody in this hall carries the red mark at any minute of the
    // ten days, so the boss's round finds nobody to click for and clicks nothing at all: the men
    // are the manager's to place and the owner never opens the Work Plan.
    expect(NOVICE.clicks).toBe(0);
    expect(NOVICE.mostStanding).toBe(0);
    expect(NOVICE.mostWaitingMinutes).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// (nn) Nine men and a novice (PIOTR, 20.09; CLAUDE.md T23 3, 2.4, 2.10)
// ---------------------------------------------------------------------------

/** The fullest set of books this game can be played to: the three men, the novice manager over
 *  them, and office staff taken on one at a time through the hire card until the canteen refuses
 *  the next one. Office staff, because the floor gets to the men on the floor long before the
 *  canteen does: 200 m2 at 24 m2 a person, less what the benches and the cabinets stand on, and
 *  the gate refuses the sixth joiner on the floor (docs/notes-t23-b3.md 6). Nobody is written into
 *  the state: every one of them walks in through `HIRE` and the interview the click puts on the
 *  owner's list. */
const FULL_BOOKS = (() => {
  let state = clone(TWO_MONTHS.withManager);
  let guard = 0;
  while (state.workers.length < CANTEEN_LOCKERS && guard < 40) {
    guard += 1;
    if (canHire(state, 'officeAdmin', null).ok) {
      state = act(state, { type: 'HIRE', role: 'officeAdmin', tier: null });
    }
    state = playDay(state, THREE_MEN);
  }
  return { state, ninth: canHire(state, 'officeAdmin', null) };
})();

const FULL_BOOKS_PLAYED = stretch(clone(FULL_BOOKS.state), 5);

describe('(nn) nine men and a novice', () => {
  it('cannot be played at all, because the canteen stops the books at eight', () => {
    // The brief asks for nine men under a novice, with the ninth waiting every day until the
    // manager is experienced. This build cannot reach nine men, and the arithmetic is the turn's
    // own two figures against each other:
    //
    //   the canteen holds eight compartments, and every man on the books keeps his things in one,
    //   so `canHire` refuses the ninth man whatever his trade (CLAUDE.md T23 2.10);
    //   a manager does not manage himself (docs/notes-t23-b1.md 2.1), so the most men a manager
    //   can be asked to carry is the eight on the books less himself, which is seven;
    //   a novice carries eight, and seven is not more than eight.
    //
    // So no man in this game is ever past a novice's number, and the grade a shop has to buy to
    // take the red mark off a man is never reached. The rule itself is sound and is proved on a
    // position written into the state by tests/engine/managerGrades.test.ts, which puts nine
    // joiners and a manager on the books and watches the ninth wait. It becomes playable the day
    // the bigger canteen of CLAUDE.md T23 8 lands, and this test goes red when it does.
    expect(CANTEEN_LOCKERS - 1).toBeLessThanOrEqual(PRODUCTION_MANAGER_CARRIES.novice);
  });

  it('fills the books to eight through the hire card and refuses the ninth', () => {
    expect(FULL_BOOKS.state.workers).toHaveLength(CANTEEN_LOCKERS);
    expect(FULL_BOOKS.ninth.ok).toBe(false);
    expect(FULL_BOOKS.ninth.reason).toBe('No locker for him: the canteen holds eight');
  });

  it('leaves the novice carrying every one of them, with nobody waiting', () => {
    const state = FULL_BOOKS.state;
    const manager = state.workers.find((worker) => worker.role === 'productionManager');
    expect(manager?.tier).toBe('novice');
    expect(menCarried(state)).toHaveLength(CANTEEN_LOCKERS - 1);
    for (const worker of state.workers) {
      if (worker.id === manager?.id) continue;
      expect(hasManager(state, worker)).toBe(true);
    }
    expect(FULL_BOOKS_PLAYED.mostStanding).toBe(0);
    expect(FULL_BOOKS_PLAYED.mostWaitingMinutes).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// (oo) A bench and no compressor (PIOTR, 20.09; CLAUDE.md T23 2.7, 3)
// ---------------------------------------------------------------------------

/** The day 1 hall with the compressor left off the list, one man, and one job. Everything else is
 *  the usual opening: the saw, the fan, the bander, the bench, the rack and the sheets. The man
 *  cuts and bands his job on the machines and then walks to his bench, where there is nothing in
 *  the hose. */
const NO_COMPRESSOR: Policy = {
  maxOpenJobs: 0,
  buyKit: true,
  withoutKit: ['compressor'],
  cleanAbove: 25,
  wanted: [],
  hireJoiner: true,
  joiners: 1,
  stockSheets: 40,
};

const BENCH_HALL = (() => {
  let state = newGame({ seed: SEED, difficulty: 'veryEasy' });
  state.cash = OPENING_ACCOUNT;
  state = playUntilDay(state, 3, NO_COMPRESSOR);
  const enquiry = placeEnquiry(state, {
    name: 'Garage shelves for the Hedges',
    price: 4000,
    basePrice: 4000,
    deadlineDays: 90,
  });
  state = acceptNow(state, enquiry.id, false);
  let guard = 0;
  while (guard < 40 && state.jobs.every((job) => currentStage(state, job)?.id !== 'assembly')) {
    guard += 1;
    state = playDay(state, NO_COMPRESSOR);
  }
  // The owner took this job himself while the man was still being fed work (CLAUDE.md T23 2.3).
  // The player moves him off it in the Work Plan and the next morning's round hands it to the man,
  // whose bench this is: it is the man at the bench that 2.7 is about.
  for (const job of state.jobs) {
    if (job.assignees.length > 0) state = act(state, { type: 'ASSIGN_JOB', jobId: job.id, workerId: null });
  }
  state = playDay(state, NO_COMPRESSOR);
  return state;
})();

const BENCH_WEEK = (() => {
  let state = clone(BENCH_HALL);
  const job = state.jobs[0];
  if (job === undefined) throw new Error('a job is wanted here');
  const before = job.labourRemaining;
  const marks: string[] = [];
  for (let day = 0; day < 5; day += 1) {
    state = playDay(state, NO_COMPRESSOR, [], {
      watch: (seen) => {
        for (const worker of seen.workers) {
          const mark = bubbleFor(seen, worker.id);
          if (mark !== null) marks.push(`${mark.key}:${mark.text}`);
        }
      },
    });
  }
  const after = state.jobs[0]?.labourRemaining ?? -1;
  const man = state.workers[0];
  return { state, before, after, marks: [...new Set(marks)], man };
})();

describe('(oo) a bench and no compressor', () => {
  it('stands the man at a bench in a hall with no compressor in it', () => {
    expect(BENCH_HALL.equipment.some((item) => item.specId === 'compressor')).toBe(false);
    const job = BENCH_HALL.jobs[0];
    if (job === undefined) throw new Error('a job is wanted here');
    expect(job.stage).toBe('inProduction');
    expect(currentStage(BENCH_HALL, job)?.id).toBe('assembly');
    expect(job.assignees).toEqual([BENCH_HALL.workers[0]?.id]);
  });

  it('puts no bench minutes into the job at all, for a whole week', () => {
    // Not a decimal place of it: five working days of a man standing at his bench with the job in
    // front of him. Today's rule, where the bench drew what air there was and worked anyway, is
    // gone (CLAUDE.md T23 2.7).
    expect(BENCH_WEEK.after).toBe(BENCH_WEEK.before);
  });

  it('says why over his head, and nowhere else', () => {
    expect(BENCH_WEEK.marks).toEqual(['noCompressor:no compressor']);
  });

  it('books every minute he stood onto his day meter', () => {
    const man = BENCH_WEEK.man;
    if (man === undefined) throw new Error('a man is wanted here');
    // Nobody is waiting for the boss in this hall: he has his job and he is standing at it. Until
    // v52 his minutes went to the queue's `noMachine`; the day meter of a man on the books has the
    // owner's `noCompressor` from v52, because `noPlace` means one thing only (CLAUDE.md T25 2.3).
    expect(man.idleByReason.waitingForBoss).toBe(0);
    expect(man.idleByReason.noCompressor).toBeGreaterThan(0);
    expect(man.idleMinutes).toBe(man.idleByReason.noCompressor);
  });

  it('works the very next minute once a used compressor stands in the hall', () => {
    let state = act(clone(BENCH_WEEK.state), {
      type: 'BUY_EQUIPMENT',
      specId: 'compressor',
      variantId: 'used',
    });
    let firstMinuteWithAir: GameState | null = null;
    let guard = 0;
    while (firstMinuteWithAir === null && guard < 5) {
      guard += 1;
      state = playDay(state, NO_COMPRESSOR, [], {
        watch: (seen) => {
          if (firstMinuteWithAir === null && benchHasAir(seen)) firstMinuteWithAir = clone(seen);
        },
      });
    }
    if (firstMinuteWithAir === null) throw new Error('the compressor never reached the hall');
    const before = (firstMinuteWithAir as GameState).jobs[0]?.labourRemaining ?? 0;
    const after = tick(firstMinuteWithAir as GameState, 1).jobs[0]?.labourRemaining ?? 0;
    expect(after).toBeLessThan(before);
  });
});
