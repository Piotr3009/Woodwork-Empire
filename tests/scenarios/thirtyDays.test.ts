// The scripted playthroughs of CLAUDE.md T1-13.
//
// Sixteen months are played in this file, and beside them the day one list, the replay and one day
// with a dinner hour in it. From Turn 22 there is one track for money: a cost the player did not
// choose is paid whatever the balance and the account goes under the overdraft limit for it, so
// there is nothing carried beside the cash any more (CLAUDE.md T22 2.1). Of the sixteen, exactly
// one goes under the limit, and it is the empty hall on Hard: it first closes a day under on day
// 11 and the bank shuts it on day 22 for the amount, with its count of days under the limit at 12
// of the 30 the other rule allows. Every other month here trades its thirty days with the account
// above the limit, the short handed one dipping furthest into the overdraft at -586 on day 31, and
// not one line of any of their ledgers goes unpaid. Measured on this build (T22-C2).

import { describe, expect, it } from 'vitest';
import {
  BIG_SAW,
  CAREFUL,
  IDLE,
  type Policy,
  DAY_ONE_CLASS,
  DAY_ONE_BUY_ORDER,
  LACQUER_NO_DRYER,
  SHORT_HANDED,
  SIX_JOINERS_TWO_SAWS,
  THICKNESSER_ONE_BAG,
  WITH_HELPER,
  TWO_MEN_BIG_FAN,
  TWO_MEN_ONE_FAN,
  playDay,
  playUntilDay,
} from './autopilot';
import {
  acceptNow,
  CREW,
  act,
  clearEvents,
  eventsOfKind,
  newGame,
  placeEnquiry,
  runClock,
  doTask,
  runToDay,
  sixJoinersOnSheetWork,
  withLicence,
} from '../helpers';
import {
  BREAK_MINUTES,
  BREAK_SKIP_FACTOR,
  BREAK_START_MINUTE,
  DAY_END_MINUTE,
  LABOUR_FACTOR_FLOOR,
  LATE_ACCOUNTS_CHARGE,
  MINUTES_PER_WORKING_DAY,
  DEADLINE_DAYS_MIN,
  EQUIPMENT_UNLOAD_MINUTES,
  MOVE_MINUTES_PER_ITEM,
  SKIP_SPEED,
  OVERTIME_DEBT_PER_DAY,
  TOOL_CABINET,
  OVERTIME_END_MINUTE,
  POWER_BASE_DAILY,
  CLIENT_MEETING_MINUTES,
  DROP_PROJECT_REPUTATION,
  DUSTY_JOB_RATING,
  MEETING_PRICE_THRESHOLD,
  RENT_PER_M2_MONTHLY,
} from '../../src/engine/constants';
import {
  DAY_CATEGORIES,
  HELPER_ONLY_KINDS,
  STATION_IDLE,
  STATION_NO_BENCH,
  addWorkingDays,
  bagStore,
  dayPercentages,
  dropReputationCost,
  helperOnDuty,
  homeCellOf,
  extractionCheck,
  madeInADustyWorkshop,
  workingDaysBetween,
  dailyPower,
  emailsForPrice,
  formatTime,
  gameMinutesPerRealSecond,
  hasBenchFor,
  isBreak,
  stageSpeed,
  stagedJob,
  minutesRemainingFor,
  movingMachines,
  ownerMinutesToday,
  startTaskCheck,
  tick,
  workPlan,
} from '../../src/engine/index';
import {
  DAY_ONE_KIT,
  DAY_ONE_SOFTWARE,
  DUST_OUTPUT_M3_PER_HOUR,
  EXTRACTOR_BAGS,
  NO_AIR_LINE,
  PRODUCT_TEMPLATES,
  SOLID_WOOD_EQUIPMENT,
} from '../../src/engine/constants';
import { jobProgress } from '../../src/engine/jobs';
import { kitBlockFor } from '../../src/engine/board';
import { familyForStage } from '../../src/engine/stages';
import { hallAirCheck, sprayingOnWetAir } from '../../src/engine/media';
import { firstFreeCell, hallItems } from '../../src/engine/layout';
import { deliveryDaysFor, salePriceFor } from '../../src/engine/machines';
import { missingForHire } from '../../src/engine/staff';
import { weeksOf } from '../../src/ui/company';
import type { Equipment, GameEvent, GameState } from '../../src/engine/index';

function templateOf(id: string): (typeof PRODUCT_TEMPLATES)[number] {
  const found = PRODUCT_TEMPLATES.find((entry) => entry.id === id);
  if (!found) throw new Error(`no template ${id}`);
  return found;
}

function machineOf(state: GameState, specId: string): Equipment {
  const item = state.equipment.find((entry) => entry.specId === specId);
  if (!item) throw new Error(`no ${specId} in the hall`);
  return item;
}

const SEED = 20260911;

/** The day an empty hall on Hard is closed by the bank, measured from the run itself: the account
 *  carries every bill from Turn 22, so it falls through the 5,000 limit and on to the -7,500 the
 *  bank allows (CLAUDE.md T22 2.1, 2.2). */
const CLOSED_ON_HARD = 22;

/** What the month's machines made, off every day record and the day in hand: the one figure the
 *  hall's store is fed from (CLAUDE.md T12 2.3, 3.4). */
function dustMade(state: GameState): number {
  return state.days.reduce((total, day) => total + day.dustMadeM3, 0) + state.dayStats.dustM3;
}

/** The same dust read off the machines' own clocks, at the family's figure an hour each, whatever
 *  class they are: a dearer saw makes no more (PIOTR, CLAUDE.md T12 2.1). The two sums are booked
 *  a minute at a time to six places, so over a month they agree to a few thousandths. */
function dustOffTheClocks(state: GameState): number {
  return state.equipment.reduce(
    (total, item) => total + (DUST_OUTPUT_M3_PER_HOUR[item.specId] ?? 0) * item.hoursUsed,
    0,
  );
}

/** Day 1 to the start of day 31: thirty game days. */
function easyMonth(seen: GameEvent[] = []): GameState {
  return playUntilDay(newGame({ seed: SEED, difficulty: 'easy' }), 31, CAREFUL, seen);
}

describe('the day one list the script buys', () => {
  it('is the engine s own list, in an order the prerequisites allow', () => {
    // The card at the top of the catalogue is the list (CLAUDE.md T11 3.6); this is only the
    // order it is worked down in, and the two may never drift apart.
    expect([...DAY_ONE_BUY_ORDER].sort()).toEqual(
      [...DAY_ONE_KIT].filter((id) => id !== DAY_ONE_SOFTWARE).sort(),
    );
  });
});

describe('30 days on Easy, working the board', () => {
  const seen: GameEvent[] = [];
  const state = easyMonth(seen);

  it('reaches day 31 without going under', () => {
    expect(state.gameOver).toBeNull();
    expect(state.clock.day).toBe(31);
    expect(state.cash).toBeGreaterThan(0);
    expect(state.ledger.some((entry) => entry.unpaid)).toBe(false);
    // One track for money, read off the ledger's own running balance: every pound the month moved
    // moved out of the account, and no line of it was written with the account anywhere near the
    // bank's limit. The lowest balance of the month is its last line, 2,829 on day 31, so the
    // count of days below the limit never started (CLAUDE.md T22 2.1, 2.2). It was 2,789 until
    // tonight: the canteen seat is out of the game, so the forty pounds the scripted player spent
    // on one stays in the account (CLAUDE.md T23 2.11).
    for (const entry of state.ledger) {
      expect(entry.balance, `${entry.day} ${entry.label}`).toBeGreaterThan(
        state.finance.overdraftLimit,
      );
    }
    expect(Math.round(Math.min(...state.ledger.map((entry) => entry.balance)))).toBe(2829);
    expect(state.finance.daysBelowOverdraft).toBe(0);
  });

  it('ends above the reputation it started on, on seven jobs out of the door', () => {
    // Turn 6 works the deadline out from the work in the job, and a one man shop that takes the
    // next job the day the last one goes out delivers some of them late. Counting the deadline in
    // working days gives every job the weekends back (T10 3.5), and the board is a quarter
    // express at 0.6 of the standard deadline (T10 3.7), which takes some of that back again.
    // Turn 13 brings one enquiry a day and takes the client's number (T13 3.4, 3.24): the script
    // takes what the post brings, none of it express in this seed, and delivers seven on time
    // where Turn 12 delivered five with some of them late. Measured, not tuned.
    expect(state.reputation).toBeGreaterThan(0);
    expect(state.reputation).toBeCloseTo(21, 6);
    expect(state.jobs.filter((job) => job.stage === 'completed')).toHaveLength(7);
  });

  it('took bookcases and finished most of them', () => {
    const done = state.jobs.filter((job) => job.stage === 'completed');
    expect(done.length).toBeGreaterThanOrEqual(3);
    const taken = new Set(state.jobs.map((job) => job.templateId));
    expect(taken.has('bookcase')).toBe(true);
    // Turn 7 said a TV unit was out of reach all month, at a reputation the late deliveries kept
    // him under. The hall fills a day later now, so the month rolls differently and the score
    // does reach 5 part way through it: the assertion was about that one roll, not about a rule,
    // and it is gone (REPORT-T8).
    // Nothing dearer was touched: the script only takes what it is told to take.
    expect(taken.has('wardrobe')).toBe(false);
    expect(taken.has('oakDiningTable')).toBe(false);
  });

  it('hired nobody, so every one of those jobs was made by the owner', () => {
    expect(state.workers).toHaveLength(0);
    const paid = state.ledger.filter((entry) => entry.category === 'jobBalance');
    expect(paid.length).toBeGreaterThanOrEqual(3);
  });

  it('runs on the Turn 2 balance and the Turn 2 clock', () => {
    // 12 per m2 for the 200 m2 painted hall, one month of it held as the deposit.
    expect(state.unit.rentMonthly).toBe(2400);
    expect(state.unit.depositHeld).toBe(2400);
    expect(state.finance.overdraftLimit).toBe(-10000);
    // One game minute per real second at 1x, so a working day is 8 real minutes.
    expect(gameMinutesPerRealSecond(1)).toBe(1);
    // Nothing was paid on completion: every delivered job went out on a courier first.
    const delivered = state.jobs.filter((job) => job.stage === 'completed');
    const transport = state.ledger.filter((entry) => entry.category === 'transport');
    expect(transport.length).toBeGreaterThanOrEqual(delivered.length);
  });

  it('bought the saw the catalogue offers first, which is the used one at 1800', () => {
    const saw = machineOf(state, 'tableSaw');
    expect(saw.variantId).toBe('used');
    expect(saw.purchasePrice).toBe(1800);
    // Five per cent slower than a new one on the cutting (CLAUDE.md T3 3.5, T7 3.1).
    expect(stageSpeed(state, stagedJob(1, 'sheet', false), 'cutting').speed).toBeCloseTo(0.95, 10);
    // And it wore its hours down as the month went on.
    expect(saw.hoursUsed).toBeGreaterThan(0);
    expect(saw.enduranceHours).toBe(750);
  });

  it('fed the hall s one bag store at the family s figure, and never filled it off one saw', () => {
    // The bag is the extractor's and not the saw's: the used fan holds one, and what is in it is
    // the saw's and the bander's hours at their families' figures (CLAUDE.md T12 2.1, 2.3).
    const store = bagStore(state);
    expect(store).toMatchObject({ exists: true, bags: 1, capacityM3: 1, full: false });
    expect(store.fillM3).toBeGreaterThan(0);
    expect(store.fillM3).toBeCloseTo(dustOffTheClocks(state), 2);
    // Nothing was emptied, so the month's dust is what is in the bag, and every day wrote its own
    // figure down (CLAUDE.md T12 3.4).
    expect(state.tasks.filter((task) => task.kind === 'emptyBags')).toHaveLength(0);
    expect(dustMade(state)).toBeCloseTo(store.fillM3, 6);
    expect(state.days.length).toBeGreaterThan(0);
    expect(state.days.some((day) => day.dustMadeM3 > 0)).toBe(true);
  });

  it('had the whole of day 1 delivered on the morning of day 2', () => {
    // Nothing comes back in the owner's hands any more: every one of the eleven is ordered and
    // every one of them waits a working day (CLAUDE.md T9 3.1).
    for (const specId of DAY_ONE_BUY_ORDER) {
      expect(deliveryDaysFor(specId, DAY_ONE_CLASS[specId]), specId).toBe(1);
    }
    // By the end of the month every one of them has landed and nothing is still on the road.
    expect(state.onOrder).toHaveLength(0);
    for (const specId of DAY_ONE_BUY_ORDER) {
      expect(state.equipment.some((item) => item.specId === specId), specId).toBe(true);
    }
    // One van, one unloading: the heavy ones on it are two hours each on one task at the gate on
    // the morning of day 2 (CLAUDE.md T9 3.1).
    const gate = state.tasks.filter((task) => task.kind === 'unload' && task.orderIds.length > 0);
    expect(gate).toHaveLength(1);
    const load = gate[0];
    // Two heavy things on it: the used saw and the used extractor. The compressor the day 1
    // shopping buys is the used class now, and a used or budget compressor is light enough for
    // two men to carry (CLAUDE.md T8 3.4, T10 3.4), so it needs nobody at the gate. That is the
    // Turn 8 open question about a small compressor being a two hour lorry job, answered by the
    // class ladder rather than by a list.
    expect(load?.orderIds.length).toBe(2);
    expect(load?.minutesTotal).toBe(EQUIPMENT_UNLOAD_MINUTES * (load?.orderIds.length ?? 0));
    expect(load?.day).toBe(2);
  });

  it('spent no minutes of day 1 on the ordering, and paid for all of it at the click', () => {
    // Ordering costs the owner nothing: he never leaves the workshop for it (CLAUDE.md T9 3.1).
    expect(state.tasks.some((task) => task.orders.length > 0 && task.kind !== 'hiring')).toBe(false);
    // And what he ordered on day 1 is standing in the hall, paid for, from day 2 (T8 3.2).
    expect(state.equipment.length).toBeGreaterThanOrEqual(DAY_ONE_BUY_ORDER.length);
  });

  it('wrote down every stage of every job it finished, in the order of the whiteboard', () => {
    // Production is stages now, each on its own machine, and each one writes down when it began
    // and when it was over, which is what the Gantt draws (CLAUDE.md T7 3.1, 3.2).
    const finished = state.jobs.filter((job) => job.stage === 'completed');
    expect(finished.length).toBeGreaterThanOrEqual(3);
    for (const job of finished) {
      const stages = job.stageRuns.map((run) => run.stage);
      // Sheet work with a laminate finish: four of the five, and delivery carries no labour.
      expect(stages, job.name).toEqual(['cutting', 'machining', 'assembly', 'finishing']);
      for (const run of job.stageRuns) {
        expect(run.endDay, job.name).not.toBeNull();
      }
    }
  });

  it('sent one email per small job, not one per call', () => {
    expect(emailsForPrice(900)).toBe(1);
    for (const job of state.jobs) {
      const emails = state.tasks.filter(
        (task) => task.kind === 'emails' && task.jobId === job.id,
      ).length;
      // The emails of a delivered job are cleared when the client takes it.
      if (emails === 0) continue;
      expect(emails, job.name).toBe(emailsForPrice(job.price));
    }
  });

  it('was paid for every job it delivered', () => {
    for (const job of state.jobs.filter((entry) => entry.stage === 'completed')) {
      expect(job.depositPaid).toBeGreaterThan(0);
      expect(job.rating).not.toBeNull();
    }
  });

  it('took the client calls as they came, and not one of them held a bench up', () => {
    // The clock stopped for the phone, and the careful owner answered every time (T4 3.3).
    const calls = eventsOfKind(seen, 'clientCall');
    expect(calls.length).toBeGreaterThanOrEqual(3);
    for (const call of calls) {
      expect(call.title).toContain('Client calling:');
      expect(call.choices.map((choice) => choice.id)).toEqual(['answer', 'ignore']);
    }
    // Every job carries its diary, nothing carries a call as a job of work, and nothing was
    // ever missed, so no rating was docked for the phone.
    for (const job of state.jobs) {
      expect(job.calls.length, job.name).toBeGreaterThan(0);
      expect(job.callsMissed, job.name).toBe(0);
    }
    expect(state.tasks.some((task) => task.kind === 'clientCall' && !task.done)).toBe(false);
    // Nothing on the books was ever stopped by a call or by a missing bench.
    for (const job of state.jobs) expect(job.blockedBy, job.name).not.toBe('no bench');
  });

  it('bought the owner his tool cabinet and worked to the short deadlines', () => {
    // One cabinet: the owner's. Nobody was taken on, so nobody else wanted one (T6 3.5).
    expect(state.equipment.filter((item) => item.specId === TOOL_CABINET)).toHaveLength(1);
    // And the hand edgebander he bought behind it holds no cell of the floor.
    expect(state.equipment.some((item) => item.specId === 'edgebander')).toBe(true);
    expect(hallItems(state).some((item) => item.specId === 'edgebander')).toBe(false);
    // Every deadline came off the work in the job, and the small ones came off short (T6 3.7).
    // The client counts the days the workshop is open and no others, so the span is measured in
    // those and not in calendar days (PIOTR; CLAUDE.md T10 3.5).
    for (const job of state.jobs) {
      const given = workingDaysBetween(job.acceptedDay, job.dueDay);
      expect(given, job.name).toBeGreaterThanOrEqual(DEADLINE_DAYS_MIN);
      if (job.basePrice <= 600) expect(given, job.name).toBeLessThanOrEqual(5);
    }
  });

  it('kept the nailer in air all month, because day 1 bought a compressor', () => {
    // A bench is a pneumatic tool from Turn 11: with no compressor in the hall the assembly is
    // screwed together by hand at 0.67 (PIOTR, 15.09; CLAUDE.md T11 3.8). The day 1 list buys
    // one, so this month never sees it, and the hall never said the line.
    expect(state.equipment.some((item) => item.specId === 'compressor')).toBe(true);
    expect(hallAirCheck(state).lines).not.toContain(NO_AIR_LINE);
    expect(hallAirCheck(state).lowAir).toEqual([]);
    // And the day the owner spends is on the record, band by band (CLAUDE.md T11 3.1).
    const logged = state.days.filter((day) => day.dayLog.length > 0);
    expect(logged.length).toBeGreaterThan(0);
    for (const day of logged) {
      expect(dayPercentages(day.dayLog).reduce((sum, share) => sum + share.percent, 0)).toBe(100);
    }
  });

  it('kept a bench under the owner all month', () => {
    expect(state.equipment.filter((item) => item.specId === 'workbench').length)
      .toBeGreaterThanOrEqual(1);
    // Whatever he is standing at on the last day has a bench under it. Asking for a spare bench
    // instead would only say whether the month happened to stop between two jobs.
    const onTheBench = state.jobs.find((job) => job.stage === 'inProduction') ?? null;
    expect(hasBenchFor(state, onTheBench === null ? null : onTheBench.id)).toBe(true);
  });
});

describe('30 days on Hard, doing nothing', () => {
  it('is closed by the bank on the day the account passes what it allows', () => {
    // From Turn 22 the account itself carries every bill the company cannot pay, so it falls
    // through the 5,000 overdraft limit of Hard and on through the -7,500 the bank allows. Doing
    // nothing used to drift to the end of the month and past it, with the top bar saying nothing
    // at all: "you cannot pay your debts, you are bankrupt, and the game should end"
    // (PIOTR, 18.09, 19.09; CLAUDE.md T21 2.2, T22 2.1, 2.2). The day is measured, not tuned.
    const state = playUntilDay(newGame({ seed: SEED, difficulty: 'hard' }), 31, IDLE);
    expect(state.gameOver).not.toBeNull();
    expect(state.clock.day).toBe(CLOSED_ON_HARD);
    expect(state.gameOver?.day).toBe(CLOSED_ON_HARD);
    expect(state.gameOver?.reason).toContain('cannot pay');
    // The line it passed, read the one way the engine reads it, and not a penny left unpaid
    // anywhere else. The account is -7,778 against the -7,500 the bank allows on Hard, and the
    // other rule's count stood at 12 of its 30 when the amount got there first: that is the whole
    // of the answer to item 23 of REPORT-T21.md, where the count could not leave nought at all
    // (CLAUDE.md T22 2.1, 2.2).
    expect(state.cash).toBeLessThanOrEqual(state.finance.overdraftLimit * 1.5);
    expect(Math.round(state.cash)).toBe(-7778);
    expect(state.finance.daysBelowOverdraft).toBe(12);
    expect(state.ledger.some((entry) => entry.unpaid)).toBe(false);
  });

  it('goes under the limit before it passes the line, and the strip says so', () => {
    // The two rules in order: the account goes under the 5,000 limit first and keeps going, and
    // the bank closes it when it has passed 1.5 times the limit (CLAUDE.md T22 2.1, 2.2). Day 11
    // is the first morning the account closes under the limit, at -5,289 with the count on 1, and
    // day 15 is four days later and a week before the close, at -6,085 with the count on 5: the
    // standing costs take 299 a day out of an account that has nothing left to take it from.
    const first = runToDay(newGame({ seed: SEED, difficulty: 'hard' }), 11);
    expect(Math.round(first.state.cash)).toBe(-5289);
    expect(first.state.cash).toBeLessThan(first.state.finance.overdraftLimit);
    expect(first.state.finance.daysBelowOverdraft).toBe(1);
    const run = runToDay(newGame({ seed: SEED, difficulty: 'hard' }), 15);
    expect(run.state.gameOver).toBeNull();
    expect(run.state.cash).toBeLessThan(run.state.finance.overdraftLimit);
    expect(Math.round(run.state.cash)).toBe(-6085);
    expect(run.state.finance.daysBelowOverdraft).toBe(5);
  });
});

describe('replay', () => {
  it('gives byte for byte the same month from the same seed and the same decisions', () => {
    expect(JSON.stringify(easyMonth())).toBe(JSON.stringify(easyMonth()));
  });

  it('gives a different month from a different seed', () => {
    const other = playUntilDay(newGame({ seed: SEED + 1, difficulty: 'easy' }), 31, CAREFUL);
    expect(JSON.stringify(other)).not.toBe(JSON.stringify(easyMonth()));
  });
});

describe('30 days on Very easy behind the best saw money can buy', () => {
  const state = playUntilDay(newGame({ seed: SEED, difficulty: 'veryEasy' }), 31, BIG_SAW);

  it('stood an industrial saw in the hall on day 1 and paid 25000 for it', () => {
    const saw = machineOf(state, 'tableSaw');
    expect(saw.variantId).toBe('industrial');
    expect(saw.purchasePrice).toBe(25000);
    expect(
      state.ledger.some(
        (entry) => entry.category === 'equipment' && entry.amount === -25000,
      ),
    ).toBe(true);
  });

  it('gets 30% more out of every minute of the cutting, and of no other stage', () => {
    const taken = state.jobs[0];
    if (!taken) throw new Error('no jobs in the month');
    // Measured on the whole job, because the month finished the ones it started.
    const job = { ...taken, labourRemaining: taken.labourValue };
    expect(job.labourValue).toBeGreaterThan(0);
    expect(stageSpeed(state, job, 'cutting').speed).toBeCloseTo(1.3, 10);
    expect(stageSpeed(state, job, 'assembly').speed).toBeCloseTo(1, 10);
    const minutes = minutesRemainingFor(state, job, 1);
    // The same hall with a saw of standard speed in it: only the cutting quarter moves, so the
    // whole job is 6% quicker and not 30% (CLAUDE.md T7 3.1).
    const budget = {
      ...state,
      equipment: state.equipment.map((item) =>
        item.specId === 'tableSaw' ? { ...item, variantId: 'budget' } : item,
      ),
    };
    expect(minutesRemainingFor(budget, job, 1) / minutes).toBeCloseTo(1 / (0.25 / 1.3 + 0.75), 6);
  });

  it('has twice the hours in it and draws more off the meter', () => {
    const saw = machineOf(state, 'tableSaw');
    expect(saw.enduranceHours).toBe(6000);
    // Seven a day for the industrial saw where the used one draws three (CLAUDE.md T3 3.5).
    const machines = state.equipment.filter((item) => item.id !== saw.id);
    const others = dailyPower({ ...state, equipment: machines }) - POWER_BASE_DAILY;
    expect(dailyPower(state) - POWER_BASE_DAILY - others).toBe(7);
  });

  it('makes no more dust an hour than the used one: the store is fed at the family s figure', () => {
    // A dearer saw does not make more dust; the material does (PIOTR, CLAUDE.md T12 2.1). The
    // fan is the day 1 one, so the store is the same one bag the used saw month has.
    const store = bagStore(state);
    expect(store).toMatchObject({ exists: true, bags: 1, capacityM3: 1 });
    expect(store.fillM3).toBeLessThanOrEqual(store.capacityM3);
    expect(dustMade(state)).toBeCloseTo(dustOffTheClocks(state), 2);
  });

  it('still trades at the end of the month after spending that much on day 1', () => {
    expect(state.gameOver).toBeNull();
    expect(state.clock.day).toBe(31);
    // Two jobs where Turns 7 to 9 finished three. The board is a quarter express now, at a
    // deadline of 0.6 of the standard one, and a one man shop that takes them the way the script
    // does delivers some of them late (PIOTR: more express jobs; CLAUDE.md T10 3.7). Measured,
    // not tuned: the month is about the company still trading after a 25,000 saw.
    expect(state.jobs.filter((job) => job.stage === 'completed').length).toBeGreaterThanOrEqual(2);
  });
});

describe('a month short handed, with a joiner and one small rack', () => {
  const seen: GameEvent[] = [];
  const state = playUntilDay(newGame({ seed: SEED, difficulty: 'easy' }), 32, SHORT_HANDED, seen);

  it('reaches the end of the month still trading', () => {
    expect(state.gameOver).toBeNull();
    expect(state.clock.day).toBe(32);
    // Under zero and inside the overdraft: every sheet the eight in stock could not hold for a
    // job was bought for it at the ad hoc price, and whole sheets at 200 cost more than the 0.40
    // of the price they used to (CLAUDE.md T13 3.3). Measured, not tuned.
    expect(state.cash).toBeGreaterThan(state.finance.overdraftLimit);
    // This is the month that goes furthest into the overdraft of the fifteen that stay inside it,
    // and it still never reaches the limit: the count of days below the limit never starts, and
    // nothing is left unpaid, because from Turn 22 there is nowhere for a bill to go but the
    // account (CLAUDE.md T22 2.1).
    //
    // It was -466 before tonight and three rules of this turn moved it. 2.11 took the two canteen
    // seats this script kitted its two men out with, which is eighty pounds it no longer spends;
    // 2.16 put the sheets on a ladder priced by the size of the order, and this script restocks
    // eight at a time, which is the top band at 200 a sheet where it used to pay 175 whatever it
    // bought; and 2.1 stopped a man taking a job by himself, so the scripted owner makes the
    // boss's round once, at the start of the day, and a job that comes ready at eleven o'clock is
    // picked up the next morning instead of the same minute. Measured on the merged tree, not
    // tuned (CLAUDE.md T23 2.1, 2.11, 2.16).
    expect(Math.round(Math.min(...state.ledger.map((entry) => entry.balance)))).toBe(-639);
    expect(state.finance.daysBelowOverdraft).toBe(0);
    expect(state.ledger.some((entry) => entry.unpaid)).toBe(false);
  });

  it('took a joiner with no experience on and bought the shelving', () => {
    expect(state.workers).toHaveLength(1);
    expect(state.workers[0]?.role).toBe('joiner');
    expect(state.workers[0]?.tier).toBe('novice');
    expect(state.equipment.some((item) => item.specId === 'sheetRack')).toBe(true);
  });

  it('never ran the rack dry, because a job only starts with its sheets held for it', () => {
    // The stock question is gone: a job holds its sheets from the free stock when it is taken,
    // and what the rack cannot hold is red on the card until it is ordered for the job. Nobody
    // stands at a bench with nothing to cut (CLAUDE.md T13 3.3, 3.6).
    expect(eventsOfKind(seen, 'noMaterial')).toHaveLength(0);
    const held = state.jobs.reduce((total, job) => total + job.sheetsReserved, 0);
    expect(held).toBeLessThanOrEqual(state.stock.sheets);
    expect(state.ledger.filter((entry) => entry.label.startsWith('Material for')).length)
      .toBeGreaterThan(0);
  });

  it('ordered transport more than twice and was paid for what went out', () => {
    const transport = state.ledger.filter((entry) => entry.category === 'transport');
    expect(transport.length).toBeGreaterThanOrEqual(2);
    const delivered = state.jobs.filter((job) => job.stage === 'completed');
    expect(delivered.length).toBeGreaterThanOrEqual(2);
    for (const job of delivered) expect(job.balancePaid).toBeGreaterThanOrEqual(0);
    expect(state.ledger.some((entry) => entry.category === 'jobBalance')).toBe(true);
  });

  it('gave the joiner a bench of his own, so nobody stood at the canteen door', () => {
    // The joiner kit buys a second bench, and the hiring rule will not let him start without it.
    expect(state.equipment.filter((item) => item.specId === 'workbench').length)
      .toBeGreaterThanOrEqual(2);
    for (const job of state.jobs) expect(job.blockedBy, job.name).not.toBe('no bench');
    expect(state.workers.every((worker) => worker.station !== STATION_NO_BENCH)).toBe(true);
  });

  it('gave the joiner a cabinet of his own, and wants a third for the next man', () => {
    // One for the owner and one for the joiner: a hire is short until there is a free one.
    expect(state.equipment.filter((item) => item.specId === TOOL_CABINET).length)
      .toBeGreaterThanOrEqual(2);
    expect(missingForHire(state, 'joiner')).toContain(TOOL_CABINET);
  });

  it('ends with the books behind and the accountant paid for it', () => {
    expect(state.booksUpToDay).toBe(0);
    const charges = state.ledger.filter((entry) => entry.category === 'accounts');
    expect(charges).toHaveLength(1);
    expect(charges[0]?.amount).toBe(-LATE_ACCOUNTS_CHARGE);
    expect(eventsOfKind(seen, 'lateAccounts')).toHaveLength(1);
    expect(state.lateAccountsMonths).toBe(1);
  });
});

describe('a month that shifts two machines on day 3', () => {
  /** Drags one item of this kind to the first cell of the hall its working zone fits in, the way
   *  setup mode does. A tile down the hall is no longer a move that always lands: a class
   *  reserves the room around it (CLAUDE.md T7 3.3). */
  function drag(state: GameState, specId: string): GameState {
    const item = machineOf(state, specId);
    const to = firstFreeCell(state, item.specId, item.variantId);
    if (!to) throw new Error(`nowhere to drag the ${specId}`);
    return act(state, { type: 'MOVE_ITEM', itemId: item.id, x: to.x, y: to.y });
  }

  const day3 = clearEvents(playUntilDay(newGame({ seed: SEED, difficulty: 'easy' }), 3, CAREFUL));
  const cashBefore = day3.cash;
  // Two things dragged, of which one is a machine: the shelving is carried and costs nothing, so
  // only the saw is asked about and only the saw is charged (PIOTR, 13.09; CLAUDE.md T8 3.4).
  const asked = act(drag(drag(day3, 'tableSaw'), 'sheetRack'), {
    type: 'END_SETUP',
    speed: 1,
  });
  const shifted = act(asked, { type: 'RESOLVE_EVENT', choiceId: 'do' });

  it('asks before it books it, and only about the machine', () => {
    expect(day3.clock.day).toBe(3);
    expect(asked.activeEvent?.kind).toBe('moveConfirm');
    expect(asked.activeEvent?.body).toBe(
      'Moving 1 machine takes 1 h and the extraction pipe of 1 machine run again at the new ' +
        'length. Do it?',
    );
    expect(asked.movedItems).toHaveLength(1);
    expect(movingMachines(asked)).toBeNull();
  });

  it('starts on day 3 with an hour to shift it once he has said so', () => {
    expect(shifted.movedItems).toHaveLength(1);
    expect(movingMachines(shifted)?.minutesTotal).toBe(MOVE_MINUTES_PER_ITEM);
    expect(shifted.owner.currentTaskId).toBe(movingMachines(shifted)?.id);
  });

  it('runs the clock at 4x for the whole span, and will not let the player change it', () => {
    expect(shifted.speed).toBe(SKIP_SPEED);
    expect(act(shifted, { type: 'SET_SPEED', speed: 1 }).speed).toBe(SKIP_SPEED);
    const speeds = new Set<number>();
    const madeAtFirst = shifted.jobs.map((job) => job.labourRemaining);
    const deskBefore = shifted.owner.minutesByCategory.admin;
    let at = shifted;
    let minutes = 0;
    while (movingMachines(at) !== null && minutes < 600) {
      speeds.add(at.speed);
      // Minutes of work, so a move that ran over the dinner hour would still count 120 of them.
      if (!isBreak(at.clock.minute)) minutes += 1;
      at = clearEvents(tick(at, 1));
    }
    // Nothing but 4x for the whole of it, and the span is the 60 minutes the move was given
    // plus whatever the phone took out of him inside it, to the minute.
    expect(Array.from(speeds)).toEqual([SKIP_SPEED]);
    const onThePhone = at.owner.minutesByCategory.admin - deskBefore;
    expect(minutes).toBe(MOVE_MINUTES_PER_ITEM + onThePhone);
    // Every bench stood still while the kit was up in the air.
    expect(at.jobs.map((job) => job.labourRemaining)).toEqual(madeAtFirst);
    // And the clock is the player's again.
    expect(act(at, { type: 'SET_SPEED', speed: 1 }).speed).toBe(1);
  });

  it('runs the pipe again when the kit is back down, one line a ducted machine', () => {
    let at = shifted;
    let guard = 0;
    while (movingMachines(at) !== null && guard < 600) {
      at = clearEvents(tick(at, 1));
      guard += 1;
    }
    const before = shifted.ledger.filter((entry) => entry.category === 'pipes').length;
    const lines = at.ledger.filter((entry) => entry.category === 'pipes').slice(before);
    expect(lines).toHaveLength(1);
    expect(lines[0]?.label.startsWith('Extraction pipe: table saw')).toBe(true);
    // The pipe is the whole of what the move cost: no other money moved in those two hours
    // (CLAUDE.md T13 3.19).
    const cost = lines.reduce((total, entry) => total - entry.amount, 0);
    expect(cost).toBeGreaterThan(0);
    expect(cashBefore - at.cash).toBe(cost);
    expect(at.movedItems).toEqual([]);
  });

  it('finishes the month still trading, with the move paid for', () => {
    const month = playUntilDay(shifted, 31, CAREFUL);
    expect(month.gameOver).toBeNull();
    expect(month.clock.day).toBe(31);
    expect(month.cash).toBeGreaterThan(0);
    // The saw's pipe on the morning it landed, and again after the move.
    expect(month.ledger.filter((entry) => entry.category === 'pipes')).toHaveLength(2);
    expect(month.jobs.filter((job) => job.stage === 'completed').length).toBeGreaterThanOrEqual(2);
  });
});

describe('a day with a break, played by the script', () => {
  /** Day 2 of the careful month, watched minute by minute through the one scripted player: by
   *  then the kit is bought, the drawing is done and there is work in front of him. */
  function watchedDay(): { states: GameState[]; end: GameState } {
    const start = playUntilDay(newGame({ seed: SEED, difficulty: 'easy' }), 2, CAREFUL);
    const states: GameState[] = [];
    const end = playDay(start, CAREFUL, [], {
      step: 1,
      watch: (state) => {
        if (state.clock.day === 2) states.push(state);
      },
    });
    return { states, end };
  }

  const { states, end } = watchedDay();

  it('worked the day it was given, so there is something to measure', () => {
    expect(states.length).toBeGreaterThan(400);
    expect(end.clock.day).toBe(3);
    const last = states[states.length - 1];
    expect(last?.owner.minutesWorked ?? 0).toBeGreaterThan(0);
  });

  it('stops the whole workshop in the middle of the day and starts it again', () => {
    const dinner = states.filter((state) => isBreak(state.clock.minute));
    // Counted by the clock, not by the observations: the minute the day puts the question is
    // watched on both sides of the answer.
    expect(new Set(dinner.map((state) => state.clock.minute)).size).toBe(BREAK_MINUTES);
    // Nobody is at a bench or a machine for any of it, the owner included.
    for (const state of dinner) {
      expect(state.owner.station, formatTime(state.clock.minute)).toBe(STATION_IDLE);
      for (const worker of state.workers) expect(worker.station).toBe(STATION_IDLE);
    }
    // And not a minute of it came off anybody's day, or off the piece on the bench.
    const before = dinner[0];
    const after = states.find(
      (state) => state.clock.minute === BREAK_START_MINUTE + BREAK_MINUTES,
    );
    expect(after?.owner.minutesWorked).toBe(before?.owner.minutesWorked);
    expect(after?.jobs.map((job) => job.labourRemaining)).toEqual(
      before?.jobs.map((job) => job.labourRemaining),
    );
  });

  it('ends the day at 17:00 with all but seven of his 480 minutes behind him', () => {
    const last = states[states.length - 1];
    expect(formatTime(last?.clock.minute ?? -1)).toBe('17:00');
    // Day 2 is the morning at the gate and the afternoon at the bench, and it runs out of work
    // with the day still to go: one job at a time, and this one was finished (CLAUDE.md T9 3.1).
    // It was 473 while the small compressor was a two hour lorry job; the used class the day 1
    // shopping buys is light now, so two hours of the gate are gone (CLAUDE.md T10 3.4), and the
    // board he works from is drawn differently again (T10 3.7), and differently again with one
    // enquiry a day and the client's number (T13 3.4, 3.24). It was 332 while a drawing was read
    // off the product and its size; from Turn 19 it is read off the value of the job and this
    // day's small piece is drawn in the half hour the floor sets instead of the hours the
    // template asked for (CLAUDE.md T19 2.11). Measured, not tuned.
    expect(last?.owner.minutesWorked).toBe(300);
    expect(last?.owner.minutesWorked).toBeLessThanOrEqual(MINUTES_PER_WORKING_DAY);
    expect(last?.owner.overtimeMinutes).toBe(0);
    const idle = states.filter(
      (state) => state.clock.minute > 530 && state.owner.currentTaskId === null,
    );
    expect(idle.length).toBeGreaterThan(0);
  });

  it('rents the painted 200 square metre hall, at 12 a metre', () => {
    expect(end.unit.widthCells * end.unit.depthCells).toBe(200);
    expect(end.unit.areaM2).toBe(200);
    expect(end.unit.rentMonthly).toBe(200 * RENT_PER_M2_MONTHLY);
  });
});

describe('a month on Easy that works through its dinner and stays late', () => {
  /** Two dinners worked through and three evenings in the workshop, which is the path the labour
   *  factor is built to describe (CLAUDE.md T6 3.4). */
  const HARD_WORKER: Policy = {
    ...CAREFUL,
    skipBreakOn: [1, 2],
    overtimeOn: [1, 2, 3],
    overtimeMinutes: 60,
  };

  /** The morning of each of the first days of the month, and what the day before cost it. */
  function mornings(): Array<{ day: number; factor: number; debt: number }> {
    let state = newGame({ seed: SEED, difficulty: 'easy' });
    const seen: Array<{ day: number; factor: number; debt: number }> = [];
    for (let round = 0; round < 5; round += 1) {
      state = playDay(state, HARD_WORKER);
      seen.push({
        day: state.clock.day,
        factor: state.owner.labourFactor,
        debt: Math.round(state.owner.overtimeDebt * 100) / 100,
      });
    }
    return seen;
  }

  const seen = mornings();

  it('takes 3% for the dinner and a tenth for the evening, and both at once', () => {
    // Day 1: dinner worked through and an hour of overtime. Day 2 starts at 0.9 times 0.97.
    expect(seen[0]?.day).toBe(2);
    expect(seen[0]?.debt).toBe(OVERTIME_DEBT_PER_DAY);
    expect(seen[0]?.factor).toBeCloseTo((1 - OVERTIME_DEBT_PER_DAY) * BREAK_SKIP_FACTOR, 6);
    // Day 2 the same again: the debt is cumulative and the 3% is not.
    expect(seen[1]?.day).toBe(3);
    expect(seen[1]?.debt).toBeCloseTo(2 * OVERTIME_DEBT_PER_DAY, 6);
    expect(seen[1]?.factor).toBeCloseTo((1 - 2 * OVERTIME_DEBT_PER_DAY) * BREAK_SKIP_FACTOR, 6);
    // Day 3 he takes his dinner and still stays on: the 3% goes, the tenth stays.
    expect(seen[2]?.day).toBe(4);
    expect(seen[2]?.debt).toBeCloseTo(3 * OVERTIME_DEBT_PER_DAY, 6);
    expect(seen[2]?.factor).toBeCloseTo(0.7, 6);
  });

  it('keeps the debt until the weekend and wipes it on Monday morning', () => {
    // Day 4 is a normal day: the debt does not grow and it does not shrink either.
    expect(seen[3]?.day).toBe(5);
    expect(seen[3]?.debt).toBeCloseTo(3 * OVERTIME_DEBT_PER_DAY, 6);
    expect(seen[3]?.factor).toBeCloseTo(0.7, 6);
    // Day 5 is the Friday, and the next morning is the Monday of the next week.
    expect(seen[4]?.day).toBe(8);
    expect(seen[4]?.debt).toBe(0);
    expect(seen[4]?.factor).toBe(1);
    expect(seen.every((morning) => morning.factor >= LABOUR_FACTOR_FLOOR)).toBe(true);
  });

  it('gives him the hour he worked through, and never runs the clock past seven', () => {
    let state = newGame({ seed: SEED, difficulty: 'easy' });
    const clocks: number[] = [];
    const pools = new Map<number, number>();
    for (let round = 0; round < 3; round += 1) {
      const day = state.clock.day;
      state = playDay(state, HARD_WORKER, [], {
        step: 5,
        watch: (at) => {
          if (at.clock.day !== day) return;
          clocks.push(at.clock.minute);
          if (at.clock.minute >= DAY_END_MINUTE) pools.set(day, ownerMinutesToday(at));
        },
      });
    }
    expect(Math.max(...clocks)).toBeLessThanOrEqual(OVERTIME_END_MINUTE);
    // Days 1 and 2 gave him the dinner hour on top of his 480; day 3 did not.
    expect(pools.get(1)).toBe(MINUTES_PER_WORKING_DAY + BREAK_MINUTES);
    expect(pools.get(2)).toBe(MINUTES_PER_WORKING_DAY + BREAK_MINUTES);
    expect(pools.get(3)).toBe(MINUTES_PER_WORKING_DAY);
  });

  it('finishes the month still trading, with the overtime behind it', () => {
    const month = playUntilDay(newGame({ seed: SEED, difficulty: 'easy' }), 31, HARD_WORKER);
    expect(month.gameOver).toBeNull();
    expect(month.clock.day).toBe(31);
    expect(month.owner.labourFactor).toBeGreaterThanOrEqual(LABOUR_FACTOR_FLOOR);
    expect(month.owner.labourFactor).toBeLessThanOrEqual(1);
  });
});


describe('a month with a job worth twenty five thousand on the books', () => {
  /** A board with one job on it, big enough that the client wants sitting down with first. */
  function bigJobMonth(days: number): GameState {
    const start = newGame({ seed: SEED, difficulty: 'veryEasy' });
    start.enquiries = [];
    placeEnquiry(start, { price: 25000, deadlineDays: 60 });
    return playUntilDay(start, days, {
      ...CAREFUL,
      wanted: ['garageShelves'],
      maxOpenJobs: 1,
      hireJoiner: false,
    });
  }

  it('sits the client down for four hours before anybody draws anything', () => {
    // A job over 20,000 starts at the client's, and the drawing waits on it (CLAUDE.md T7 3.11).
    // The desk kit is stood in the room here rather than ordered: the delivery has its own
    // months, and this one is about the meeting (CLAUDE.md T9 3.1).
    const start = withLicence(newGame({ seed: SEED, difficulty: 'veryEasy' }));
    start.enquiries = [];
    const enquiry = placeEnquiry(start, { price: 25000, deadlineDays: 60 });
    const taken = acceptNow(start, enquiry.id, false);
    const job = taken.jobs[0];
    expect(job?.price).toBeGreaterThan(MEETING_PRICE_THRESHOLD);
    const meeting = taken.tasks.find((task) => task.kind === 'clientMeeting');
    expect(meeting?.minutesTotal).toBe(CLIENT_MEETING_MINUTES);
    expect(CLIENT_MEETING_MINUTES).toBe(240);
    const design = taken.tasks.find((task) => task.kind === 'design');
    // The drawing is on the desk and it cannot be started until the meeting has been held.
    expect(design).toBeDefined();
    expect(meeting?.done).toBe(false);
    expect(startTaskCheck(taken, design?.id ?? '').ok).toBe(false);
    const held = doTask(taken, 'clientMeeting');
    expect(held.tasks.find((task) => task.kind === 'clientMeeting')?.done).toBe(true);
    expect(startTaskCheck(held, design?.id ?? '').ok).toBe(true);
  });

  it('gets the job into production once the meeting is behind it', () => {
    const month = bigJobMonth(12);
    const meeting = month.tasks.find((task) => task.kind === 'clientMeeting');
    expect(meeting?.done).toBe(true);
    expect(meeting?.doneBy).toBe('owner');
    expect(month.jobs[0]?.stage).not.toBe('accepted');
  });
});

/** The longest anybody may stand at a taken machine in the two saw month (CLAUDE.md T7 3.1). */
const CREW_MAX_GAP = 10;

/** Sheets on the rack every morning of the crew month. The rack is never the thing that stops
 *  them there: the month is about the queue at the saw and about nothing else. */
const CREW_RACK = 400;

interface CrewMonth {
  /** Minutes of somebody's day spent standing at a machine that was taken. */
  waiting: number;
  /** The longest run of them one man had in a row. */
  longest: number;
  state: GameState;
}

/** A month of six joiners behind the saws the hall has, minute by minute. Piotr's claim in one
 *  run: a machine serves one man at a time, so the crew behind one saw stands at it and the crew
 *  behind two does not (CLAUDE.md T7 3.1). */
function crewMonth(saws: number): CrewMonth {
  let state = sixJoinersOnSheetWork({ saws });
  let waiting = 0;
  let longest = 0;
  const standing = new Map<string, number>();
  let guard = 0;
  while (state.clock.day < 31 && state.gameOver === null && guard < 30000) {
    guard += 1;
    state.stock.sheets = CREW_RACK;
    state = clearEvents(runClock(state, 1));
    for (const worker of state.workers) {
      if (!String(worker.station).startsWith('waiting')) {
        standing.set(worker.id, 0);
        continue;
      }
      waiting += 1;
      const run = (standing.get(worker.id) ?? 0) + 1;
      standing.set(worker.id, run);
      if (run > longest) longest = run;
    }
  }
  return { waiting, longest, state };
}

describe('a month of six joiners behind two saws', () => {
  const two = crewMonth(2);
  const one = crewMonth(1);

  it('has six men at six benches, each on his own job of sheet work', () => {
    expect(two.state.workers).toHaveLength(CREW);
    expect(two.state.equipment.filter((item) => item.specId === 'workbench')).toHaveLength(CREW);
    expect(two.state.equipment.filter((item) => item.specId === 'tableSaw')).toHaveLength(2);
    expect(one.state.equipment.filter((item) => item.specId === 'tableSaw')).toHaveLength(1);
  });

  it('keeps the crew cutting, with no gap longer than ten minutes in the month', () => {
    // Piotr: with six joiners you need two saws or they stand (CLAUDE.md T7 3.1). Nobody in this
    // month stands at a taken saw for more than ten minutes together.
    expect(two.longest).toBeLessThanOrEqual(CREW_MAX_GAP);
    expect(two.waiting).toBeLessThan(one.waiting / 4);
  });

  it('gets more work out of the same six men, and ends the month with more money', () => {
    const done = (month: CrewMonth): number =>
      month.state.jobs.filter((job) => job.stage === 'completed').length;
    const lastDay = (month: CrewMonth): number =>
      month.state.jobs.reduce((latest, job) => Math.max(latest, job.finishedDay ?? 99), 0);
    // Re-measured in Turn 21: the crew are back at 0.6 of the owner, which is what a man with no
    // experience is worth on Piotr's own ladder (CLAUDE.md T21 2.9), a step slower than Turn 20
    // read them. So the one saw month no longer gets the whole book out inside the thirty days and
    // the second saw buys jobs again as well as days: six delivered against five, the sixth of
    // them finished on day 25, and the one saw month's last job still on the bench when the month
    // ends, which is what the 99 in `lastDay` stands for.
    expect(done(two)).toBe(6);
    expect(done(one)).toBe(5);
    expect(done(two)).toBeGreaterThan(done(one));
    expect(lastDay(two)).toBeLessThan(lastDay(one));
    // The second saw is 1800, and on tonight's figures it pays for itself inside the month and
    // then some: the two saw month ends 3,246 ahead of the one saw month, having spent the 1,800
    // on the machine, because the extra job out of the door is worth more than the saw
    // (CLAUDE.md T7 3.1, T21 2.9).
    expect(two.state.cash - one.state.cash).toBeGreaterThan(1800);
  });

  it('stands the one saw crew at the saw for hours at a time, and says which machine', () => {
    // The station carries the family, which is what the hall draws and the Gantt greys out
    // (CLAUDE.md T7 3.1, 3.2).
    expect(one.waiting).toBeGreaterThan(0);
    expect(one.longest).toBeGreaterThan(CREW_MAX_GAP);
  });

  it('keeps one store for the hall, the two fans added up, fed by both saws', () => {
    // The crew hall stands the industrial fan beside the day 1 one, and a hall is one duct run:
    // eleven bags in one store, which six men cutting do not fill inside a month, and nobody's
    // saw carries a bag of its own any more (CLAUDE.md T12 2.3).
    const store = bagStore(two.state);
    expect(store.bags).toBe((EXTRACTOR_BAGS.used ?? 0) + (EXTRACTOR_BAGS.industrial ?? 0));
    expect(store.full).toBe(false);
    expect(store.fillM3).toBeGreaterThan(0);
    expect(store.fillM3).toBeCloseTo(dustOffTheClocks(two.state), 2);
    expect(dustMade(two.state)).toBeCloseTo(store.fillM3, 6);
    expect(two.state.tasks.filter((task) => task.kind === 'emptyBags')).toHaveLength(0);
  });
});

describe('a month of a full crew behind two saws on the day 1 fan alone', () => {
  const seen: GameEvent[] = [];
  const state = playUntilDay(
    newGame({ seed: SEED, difficulty: 'veryEasy' }),
    31,
    SIX_JOINERS_TWO_SAWS,
    seen,
  );

  it('is three joiners and not six, because the floor has no room for more', () => {
    // The script asks for six and the hall says no: two saws, their zones and every man's bench
    // and cabinets leave floor for the owner and three (PIOTR; CLAUDE.md T13 3.10).
    //
    // It was three until Turn 21, two through Turn 21, and three again tonight, and the one cell
    // that moves it each time is the tool cabinet's. Turn 21 made a cabinet two metres wide, so
    // each of the four in this hall took a cell more of the floor the crew limit is measured
    // against and the hall lost a man; Turn 22 makes the cabinet a family of five and the cheapest
    // class, which is the one the script buys, is a metre square again, so the cell comes back and
    // the man with it (CLAUDE.md T22 2.12). The limit is
    // `Math.floor(freeFloorM2 / M2_PER_PERSON)` with `M2_PER_PERSON` 24, so four cells is the whole
    // difference between a fifth man and a fourth. Nothing about the crew rule itself has moved in
    // either turn.
    expect(state.workers.filter((worker) => worker.role === 'joiner')).toHaveLength(3);
    expect(missingForHire(state, 'joiner')).toEqual([]);
    const blocked = state.workers.length;
    expect(blocked).toBeLessThan(6);
  });

  it('fills the one bag in the month, and the owner empties it himself each time', () => {
    // No helper in this hall, so the question comes to the owner, once a fill and never once a
    // machine, and the careful owner takes it (CLAUDE.md T12 2.3). One bag, both saws feeding it.
    const store = bagStore(state);
    expect(store).toMatchObject({ exists: true, bags: 1, capacityM3: 1 });
    expect(store.fillM3).toBeLessThanOrEqual(store.capacityM3);
    const fills = seen.filter((event) => event.kind === 'bagsFull');
    expect(fills.length).toBeGreaterThanOrEqual(1);
    for (const event of fills) expect(event.title).toBe('Bags full in the workshop');
    const emptied = state.tasks.filter((task) => task.kind === 'emptyBags');
    expect(emptied).toHaveLength(fills.length);
    for (const task of emptied) {
      expect(task.done).toBe(true);
      expect(task.doneBy).toBe('owner');
      expect(task.label).toBe('Empty the bags (1 bag, 15 min)');
      expect(task.equipmentId).toBeNull();
    }
    expect(dustMade(state)).toBeGreaterThan(fills.length * store.capacityM3);
    expect(dustMade(state)).toBeCloseTo(dustOffTheClocks(state), 2);
  });
});

describe('a month that orders a CNC on day 1 and calls it off on day 10', () => {
  // Month (l) of CLAUDE.md T8 T8-09. A very easy start has the fifty thousand a CNC and the
  // extraction it wants come to; nothing else is bought, because the month is about the money
  // going out at the click and coming back in full (CLAUDE.md T8 3.2, 3.5).
  const seen: GameEvent[] = [];
  const start = act(newGame({ seed: SEED, difficulty: 'veryEasy' }), { type: 'SET_SPEED', speed: 1 });
  const cashAtFirst = start.cash;
  // The standard CNC: the family has its five classes from Turn 13 (CLAUDE.md T13 3.12).
  const ordered = act(
    act(start, { type: 'BUY_EQUIPMENT', specId: 'extractor' }),
    { type: 'BUY_EQUIPMENT', specId: 'cnc', variantId: 'standard' },
  );
  const day10 = playUntilDay(ordered, 10, IDLE, seen);

  it('pays for it at the counter on day 1 and stands nothing in the hall', () => {
    // The extractor the catalogue offers first is the used class at 400 (CLAUDE.md T10 3.4).
    expect(cashAtFirst - ordered.cash).toBe(400 + 45000);
    expect(ordered.equipment.some((item) => item.specId === 'cnc')).toBe(false);
  });

  it('is still nine weeks away on day 10, holding its floor and nothing else', () => {
    expect(day10.clock.day).toBe(10);
    const cnc = day10.onOrder.find((item) => item.specId === 'cnc');
    expect(cnc).toBeDefined();
    expect(cnc?.dueDay).toBe(addWorkingDays(1, 45));
    expect(day10.equipment.some((item) => item.specId === 'cnc')).toBe(false);
    // The extractor waited a day and has been in the hall since day 2.
    expect(day10.equipment.some((item) => item.specId === 'extractor')).toBe(true);
  });

  it('hands back every penny of the 45,000 the moment it is called off', () => {
    const cnc = day10.onOrder.find((item) => item.specId === 'cnc');
    if (!cnc) throw new Error('no CNC on order');
    const before = day10.cash;
    const cancelled = act(day10, { type: 'CANCEL_ORDER', orderId: cnc.id });
    expect(cancelled.cash - before).toBe(45000);
    expect(cancelled.onOrder).toHaveLength(0);
    const line = cancelled.ledger[cancelled.ledger.length - 1];
    expect(line?.label).toBe('Order cancelled: Standard CNC');
    expect(line?.amount).toBe(45000);
    // And the floor it was holding is free for anything else.
    expect(firstFreeCell(cancelled, 'cnc', 'standard')).not.toBeNull();
    // The month that follows is a month with the money back in the bank.
    const month = playUntilDay(cancelled, 31, IDLE);
    expect(month.clock.day).toBe(31);
    expect(month.cash).toBeGreaterThan(month.finance.overdraftLimit);
  });
});

describe('a month that sells the used saw on day 5 after buying a standard one', () => {
  // Month (m) of CLAUDE.md T8 T8-09. The used saw cost 1800 and the buyer pays the used class
  // fraction of it, which is 630 and not the 900 the task line names: the contract of 3.5 is
  // 50% and 35% for a used one, and the two do not agree. The contract wins and the deviation is
  // in REPORT-T8 (CLAUDE.md T8 3.5).
  const seen: GameEvent[] = [];
  const day5 = playUntilDay(newGame({ seed: SEED, difficulty: 'veryEasy' }), 5, CAREFUL, seen);

  /** Takes the owner off whatever he is at, so the saw under him is free to sell. */
  function offTheBench(state: GameState): GameState {
    let next = act(state, { type: 'PAUSE_TASK' });
    for (const job of next.jobs.filter((entry) => entry.assignees[0] === 'owner')) {
      next = act(next, { type: 'ASSIGN_JOB', jobId: job.id, workerId: null });
    }
    return next;
  }

  // He orders it and it is on a lorry from the click: no trip, no minutes (CLAUDE.md T9 3.1).
  const replaced = offTheBench(
    act(clearEvents(day5), {
      type: 'BUY_EQUIPMENT',
      specId: 'tableSaw',
      variantId: 'standard',
    }),
  );
  const used = replaced.equipment.find(
    (item) => item.specId === 'tableSaw' && item.variantId === 'used',
  );
  const sold = act(replaced, { type: 'SELL_MACHINE', equipmentId: used?.id ?? '' });

  it('has the used saw in the hall and a standard one on its way', () => {
    expect(day5.clock.day).toBe(5);
    expect(used).toBeDefined();
    expect(used?.purchasePrice).toBe(1800);
    const coming = replaced.onOrder.find((item) => item.specId === 'tableSaw');
    expect(coming?.variantId).toBe('standard');
    expect(coming?.dueDay).toBe(addWorkingDays(5, 5));
  });

  it('marks the old one sold and stops it working the same minute', () => {
    expect(sold.equipment.find((item) => item.id === used?.id)?.soldOnDay).toBe(
      addWorkingDays(5, 1),
    );
    expect(salePriceFor(used ?? ({} as Equipment))).toBe(630);
    // It is still standing there, and nobody may stand at it.
    expect(sold.equipment.some((item) => item.id === used?.id)).toBe(true);
    expect(sold.equipment.find((item) => item.id === used?.id)?.takenBy).toBeNull();
  });

  it('takes it away the next morning and puts the money in the bank', () => {
    const collected: GameEvent[] = [];
    const morning = playUntilDay(sold, addWorkingDays(5, 1), CAREFUL, collected);
    expect(morning.clock.day).toBe(addWorkingDays(5, 1));
    expect(morning.equipment.some((item) => item.id === used?.id)).toBe(false);
    const said = [...collected, morning.activeEvent, ...morning.eventQueue];
    expect(said.some((event) => event?.kind === 'machineCollected')).toBe(true);
    const line = morning.ledger.find((entry) => entry.label === 'Sold: Table saw');
    expect(line?.amount).toBe(630);
    // And the month that follows still trades, on the saw that took its place.
    const month = playUntilDay(morning, 31, CAREFUL);
    expect(month.gameOver).toBeNull();
    expect(month.equipment.filter((item) => item.specId === 'tableSaw')).toHaveLength(1);
    expect(month.equipment.find((item) => item.specId === 'tableSaw')?.variantId).toBe('standard');
  });
});

describe('a month that drops a job on day 15', () => {
  // Month (n) of CLAUDE.md T9 T9-13. A careful month, and then the owner changes his mind about
  // the job on the books: the client has his deposit back, the plan is empty and the company is
  // ten points of reputation worse off (CLAUDE.md T9 3.9). It was day 8 through Turn 9; the board
  // is drawn differently in Turn 10, with the express uplift and the greyed enquiries in the same
  // seeded stream, and the second job of this month is on the books on the Monday of week 3.
  const seen: GameEvent[] = [];
  let day8 = playUntilDay(newGame({ seed: SEED, difficulty: 'veryEasy' }), 15, CAREFUL, seen);
  // One enquiry a day now, and the careful script takes one job at a time, so the books can be
  // bare on the fifteenth: the month plays on to the first morning with a job on them (T13 3.4).
  while (!day8.jobs.some((entry) => entry.stage !== 'completed') && day8.clock.day < 30) {
    day8 = playDay(day8, CAREFUL, seen);
  }
  const job = day8.jobs.find((entry) => entry.stage !== 'completed');
  const cashBefore = day8.cash;
  const reputationBefore = day8.reputation;
  const dropped = job === undefined ? day8 : act(day8, { type: 'DROP_JOB', jobId: job.id });

  it('has a job on the books in the second half of the month with a deposit paid on it', () => {
    expect(day8.clock.day).toBeGreaterThanOrEqual(15);
    expect(job).toBeDefined();
    expect(job?.depositPaid ?? 0).toBeGreaterThan(0);
  });

  it('gives the client his deposit back, to the penny', () => {
    expect(cashBefore - dropped.cash).toBe(job?.depositPaid ?? 0);
    const line = dropped.ledger.find(
      (entry) => entry.label === `Deposit returned: ${job?.name}`,
    );
    expect(line?.amount).toBe(-(job?.depositPaid ?? 0));
    // The material was ordered in for this job, so it is written off beside it: a line in the
    // books and not a payment, because the cash went when it was ordered (CLAUDE.md T9 3.9).
    const loss = dropped.ledger.find(
      (entry) => entry.label === `Material written off: ${job?.name}`,
    );
    expect(loss?.unpaid).toBe(true);
  });

  it('takes the job off the plan and everything on its list with it', () => {
    expect(dropped.jobs.some((entry) => entry.id === job?.id)).toBe(false);
    expect(dropped.tasks.some((task) => task.jobId === job?.id)).toBe(false);
    expect(workPlan(dropped).rows.some((row) => row.jobId === job?.id)).toBe(false);
  });

  it('takes the price\u0027s worth of reputation at once, with a line on the company board', () => {
    // Turn 21: what a drop costs follows the price of the job, ten points and a point for every
    // thousand over five thousand, so the figure this scenario asserts is the scale's and not a
    // flat ten (PIOTR, 19.09; CLAUDE.md T21 2.4). The floor is still the ten Turn 9 charged.
    const cost = job === undefined ? 0 : dropReputationCost(job);
    expect(cost).toBeGreaterThanOrEqual(DROP_PROJECT_REPUTATION);
    expect(dropped.reputation).toBe(reputationBefore - cost);
    const logged = dropped.reputationLog[dropped.reputationLog.length - 1];
    expect(logged?.reason).toBe(`Dropped: ${job?.name}`);
    expect(logged?.points).toBe(-cost);
    expect(logged?.day).toBe(day8.clock.day);
    // And the board reads it back under the week it happened in.
    const week = weeksOf(dropped)[0];
    expect(week?.entries.some((entry) => entry.reason === `Dropped: ${job?.name}`)).toBe(true);
  });

  it('still trades to the end of the month, on the work that comes after it', () => {
    const month = playUntilDay(dropped, 31, CAREFUL);
    expect(month.clock.day).toBe(31);
    expect(month.gameOver).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Months (o) and (p) of CLAUDE.md T10 T10-13: the same two men, the same saw and the same floor
// edgebander, on a fan that is too small for them and then on one that is not.
// ---------------------------------------------------------------------------

/** A month of two joiners behind a standard saw and a floor edgebander, on the named fan. */
function fanMonth(policy: Policy): { state: GameState; events: GameEvent[] } {
  const events: GameEvent[] = [];
  const state = playUntilDay(newGame({ seed: SEED, difficulty: 'veryEasy' }), 31, policy, events);
  return { state, events };
}

describe('a month of two men on a fan too small for them', () => {
  const short = fanMonth(TWO_MEN_ONE_FAN);
  const fine = fanMonth(TWO_MEN_BIG_FAN);

  it('has the same two men and the same machines in both halls, and one fan apart', () => {
    for (const month of [short, fine]) {
      expect(month.state.clock.day).toBe(31);
      expect(month.state.gameOver).toBeNull();
      expect(month.state.workers.filter((worker) => worker.role === 'joiner')).toHaveLength(2);
      expect(machineOf(month.state, 'tableSaw').variantId).toBe('standard');
      expect(machineOf(month.state, 'edgebander').variantId).toBe('standard');
    }
    expect(machineOf(short.state, 'extractor').variantId).toBe('standard');
    expect(machineOf(fine.state, 'extractor').variantId).toBe('pro');
  });

  it('is short of air the moment the saw and the bander are both running', () => {
    // Piotr's own example: 2,500 of 1,660 (CLAUDE.md T10 3.1).
    const running = (state: GameState): GameState => {
      const next = { ...state, equipment: state.equipment.map((item) => ({ ...item })) };
      for (const item of next.equipment) {
        if (item.specId === 'tableSaw' || item.specId === 'edgebander') item.takenBy = 'owner';
      }
      return next;
    };
    const tight = extractionCheck(running(short.state));
    expect(tight.demand).toBe(2500);
    expect(tight.allowed).toBe(1660);
    expect(tight.line).toBe('Extraction short: 2,500 of 1,660 usable');
    const roomy = extractionCheck(running(fine.state));
    expect(roomy.demand).toBe(2500);
    expect(roomy.allowed).toBe(2988);
    expect(roomy.short).toBe(false);
  });

  it('counts the dusty minutes onto the pieces made in it, and none in the other hall', () => {
    const dusty = short.state.jobs.reduce((total, job) => total + job.dustyMinutes, 0);
    const worked = short.state.jobs.reduce((total, job) => total + job.productionMinutes, 0);
    expect(worked).toBeGreaterThan(0);
    expect(dusty).toBeGreaterThan(0);
    // And the hall with the bigger fan never had one, bar the minutes between a machine coming
    // off the lorry and the click that puts it on the extraction: an unconnected machine is not
    // served, and the script clicks once a step (CLAUDE.md T13 3.19).
    expect(fine.state.jobs.reduce((total, job) => total + job.dustyMinutes, 0))
      .toBeLessThanOrEqual(30);
    expect(fine.state.jobs.reduce((total, job) => total + job.productionMinutes, 0))
      .toBeGreaterThan(0);
  });

  it('loses a point of rating on the pieces the client can see the dust on', () => {
    const delivered = short.state.jobs.filter((job) => job.stage === 'completed');
    expect(delivered.length).toBeGreaterThan(0);
    const marked = delivered.filter((job) => madeInADustyWorkshop(job));
    expect(marked.length).toBeGreaterThan(0);
    const lines = short.state.reputationLog.filter((entry) =>
      entry.reason.endsWith(': dusty workshop'),
    );
    expect(lines.length).toBe(marked.length);
    for (const line of lines) expect(line.points).toBe(-DUSTY_JOB_RATING);
    // The hall with the fan it wanted loses none of them.
    expect(fine.state.jobs.filter((job) => madeInADustyWorkshop(job))).toHaveLength(0);
    expect(
      fine.state.reputationLog.some((entry) => entry.reason.endsWith(': dusty workshop')),
    ).toBe(false);
  });

  it('turns out less for it, and the hall is dirtier', () => {
    // Everything in an under extracted hall is 30% slower and the dust rises three times as fast
    // (PIOTR; CLAUDE.md T10 3.1). Measured over the month, not asserted as a ratio: the two halls
    // took different work off the same board.
    const done = (state: GameState): number =>
      state.jobs.filter((job) => job.stage === 'completed').length;
    expect(done(fine.state)).toBeGreaterThanOrEqual(done(short.state));
    expect(fine.state.reputation).toBeGreaterThanOrEqual(short.state.reputation);
  });
});

// ---------------------------------------------------------------------------
// (q) A month with a helper on the books (PIOTR, 14.09; CLAUDE.md T11 3.4)
// ---------------------------------------------------------------------------

describe('a month with a helper, where the owner never unloads', () => {
  const seen: GameEvent[] = [];
  const state = playUntilDay(
    newGame({ seed: SEED, difficulty: 'veryEasy' }),
    31,
    WITH_HELPER,
    seen,
  );

  it('reaches day 31 with the helper on the books and in the hall', () => {
    expect(state.gameOver).toBeNull();
    expect(state.clock.day).toBe(31);
    const helper = state.workers.find((worker) => worker.role === 'helper');
    expect(helper).toBeDefined();
    expect(helperOnDuty(state)).toBe(true);
    // He is on the painted floor and out of the office block (CLAUDE.md T11 3.4).
    const home = helper === undefined ? { x: -1, y: -1 } : homeCellOf(state, helper);
    expect(home.x).toBeGreaterThanOrEqual(0);
    expect(home.y).toBeLessThan(state.unit.depthCells);
  });

  it('never put the owner on an unload, a bag or the cleaning all month', () => {
    const helper = state.workers.find((worker) => worker.role === 'helper');
    const chores = state.tasks.filter((task) => HELPER_ONLY_KINDS.includes(task.kind));
    expect(chores.length).toBeGreaterThan(0);
    // Both of the labourer's own jobs of work came up in the month and both were his: measured,
    // twelve loads off the lorry and nineteen sweeps of the hall (CLAUDE.md T17 2.3, section 7).
    expect(chores.filter((task) => task.kind === 'unload').length).toBeGreaterThan(0);
    expect(chores.filter((task) => task.kind === 'cleaning').length).toBeGreaterThan(0);
    for (const task of chores) {
      expect(task.doneBy, `${task.kind} ${task.label}`).not.toBe('owner');
      if (task.doneBy !== null) expect(task.doneBy, task.kind).toBe(helper?.id);
    }
    // And not a minute of his day went on any of them, on any day of the month: the spanner
    // minutes in his log are the repair of the extractor, which is nobody's but his.
    const fixing = state.days
      .flatMap((day) => day.dayLog)
      .filter((entry) => entry.category === 'fixing')
      .reduce((total, entry) => total + entry.minutes, 0);
    const spanner = state.tasks
      .filter((task) => task.doneBy === 'owner' && (task.kind === 'repair' || task.kind === 'service'))
      .reduce((total, task) => total + task.minutesTotal, 0);
    expect(fixing).toBe(spanner);
  });

  it('never put the van in front of him at all, because it was dealt with first', () => {
    // A helper clears his workshop jobs on the spot (CLAUDE.md T2 3.8), and the morning gives him
    // the lorry before anybody is asked about it: the question simply does not come
    // (CLAUDE.md T11 3.4). The same month without a helper is asked twice in the first three days.
    expect(seen.filter((event) => event.kind === 'deliveryArrived')).toHaveLength(0);
    const alone: GameEvent[] = [];
    playUntilDay(newGame({ seed: SEED, difficulty: 'veryEasy' }), 4, CAREFUL, alone);
    expect(
      alone.filter((event) => event.kind === 'deliveryArrived').length,
    ).toBeGreaterThan(0);
  });

  it('spent the day he got back on the work, and the log says where it went', () => {
    // Every day of the month is on the log, in the seven bands the top bar paints, and the
    // percentages of every one of them come to a hundred (CLAUDE.md T11 3.1).
    expect(state.days.length).toBeGreaterThan(0);
    for (const day of state.days) {
      const shares = dayPercentages(day.dayLog);
      if (shares.length === 0) continue;
      expect(shares.reduce((sum, share) => sum + share.percent, 0), `day ${day.day}`).toBe(100);
      for (const share of shares) expect(DAY_CATEGORIES, `day ${day.day}`).toContain(share.category);
    }
    // And the week the company board adds up is the last seven of them, newest last.
    expect(state.dayLogs.length).toBeLessThanOrEqual(7);
    const days = state.dayLogs.map((entry) => entry.day);
    expect([...days].sort((left, right) => left - right)).toEqual(days);
  });
});

// ---------------------------------------------------------------------------
// (r) A lacquered wardrobe with a booth and no dryer (CLAUDE.md T11 3.7)
// ---------------------------------------------------------------------------

describe('a month that sprays a wardrobe on wet air', () => {
  const seen: GameEvent[] = [];
  // The booth is twenty working days on the road, so this one runs to day 46 rather than day 31.
  const state = playUntilDay(
    newGame({ seed: SEED, difficulty: 'veryEasy' }),
    46,
    LACQUER_NO_DRYER,
    seen,
  );

  it('ordered the booth on day 1 and stood it in the hall twenty working days later', () => {
    expect(state.gameOver).toBeNull();
    const booth = state.equipment.find((item) => item.specId === 'sprayBooth');
    expect(booth).toBeDefined();
    expect(booth?.purchasePrice).toBe(18000);
    // And no dryer was ever bought, so the air in the booth is wet (CLAUDE.md T10 3.3).
    expect(state.equipment.some((item) => item.specId === 'airDryer')).toBe(false);
    if (booth !== undefined) expect(sprayingOnWetAir(state, booth)).toBe(true);
  });

  it('greys the sprayed wardrobe for a workshop that has not bought a booth', () => {
    // A month that never orders one: the reason stands all the way through it (T11 3.7).
    const never = playUntilDay(newGame({ seed: SEED, difficulty: 'veryEasy' }), 10, CAREFUL, []);
    never.reputation = 40;
    expect(never.equipment.some((item) => item.specId === 'sprayBooth')).toBe(false);
    expect(kitBlockFor(never, templateOf('lacqueredWardrobe'))?.reason).toBe(
      'needs a spray booth',
    );
    expect(never.jobs.some((job) => job.templateId === 'lacqueredWardrobe')).toBe(false);
    // A booth on the road is enough for the board, as a saw on the road is: the job is days of
    // drawing and material before anybody sprays anything (CLAUDE.md T8 3.2, T10 3.7).
    const early = playUntilDay(
      newGame({ seed: SEED, difficulty: 'veryEasy' }),
      5,
      LACQUER_NO_DRYER,
      [],
    );
    expect(early.equipment.some((item) => item.specId === 'sprayBooth')).toBe(false);
    expect(early.onOrder.some((item) => item.specId === 'sprayBooth')).toBe(true);
    expect(kitBlockFor(early, templateOf('lacqueredWardrobe'))).toBeNull();
  });

  it('takes the sprayed work once the booth stands in the hall', () => {
    expect(kitBlockFor(state, templateOf('lacqueredWardrobe'))).toBeNull();
    const lacquered = state.jobs.filter((job) => job.templateId === 'lacqueredWardrobe');
    expect(lacquered.length).toBeGreaterThan(0);
    for (const job of lacquered) expect(job.finish).toBe('lacquer');
  });

  it('does the finish at the booth and marks every piece that went through it', () => {
    const lacquered = state.jobs.filter((job) => job.templateId === 'lacqueredWardrobe');
    const job = lacquered[0];
    if (job === undefined) throw new Error('no sprayed job on the books');
    // The Finishing of a lacquered job is done at the booth and nowhere else.
    expect(familyForStage(job, 'finishing')).toBe('sprayBooth');
    // Every job that reached the Finishing came out of a booth running on wet air, so every one
    // of them is marked: the mark is not a thing that happens to some of them (T10 3.3).
    const finished = lacquered.filter(
      (entry) => entry.stage === 'completed' || jobProgress(entry) > 0.85,
    );
    expect(finished.length).toBeGreaterThan(0);
    for (const entry of finished) expect(entry.wetFinish, entry.name).toBe(true);
    // And every one of them that went out lost its point of rating for it.
    const marked = state.reputationLog.filter((entry) => entry.reason.endsWith(': finish defects'));
    expect(marked.length).toBe(
      lacquered.filter((entry) => entry.stage === 'completed' && entry.wetFinish).length,
    );
    expect(marked.length).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------
// (s) A thicknesser on a single bag, with a helper to empty it (CLAUDE.md T12 T12-07)
// ---------------------------------------------------------------------------

describe('a month with a thicknesser on a single bag and a helper', () => {
  const seen: GameEvent[] = [];
  const state = playUntilDay(
    newGame({ seed: SEED, difficulty: 'veryEasy' }),
    31,
    THICKNESSER_ONE_BAG,
    seen,
  );

  it('stands the thicknesser and the tools behind the one bag fan, with the oak table on the books', () => {
    expect(state.gameOver).toBeNull();
    expect(state.clock.day).toBe(31);
    for (const specId of SOLID_WOOD_EQUIPMENT) {
      expect(state.equipment.some((item) => item.specId === specId), specId).toBe(true);
    }
    expect(bagStore(state)).toMatchObject({ exists: true, bags: 1, capacityM3: 1 });
    expect(helperOnDuty(state)).toBe(true);
    const tables = state.jobs.filter((job) => job.templateId === 'oakDiningTable');
    expect(tables.length).toBeGreaterThan(0);
    expect(tables.some((job) => job.assignees[0] === 'owner' || job.stage === 'completed')).toBe(true);
  });

  it('never stood a man at the thicknesser, so its two bags a day never reached the store', () => {
    // The blocker at the top of REPORT-T12.md: the machining of timber is done with the solid
    // wood tools, and no stage of any job stands a man at the thicknesser, so a played month
    // cannot fill a bag off it. What the store was fed is the saw's and the bander's, at their
    // figures, and one saw does not fill a bag in a month (CLAUDE.md T12 2.1, 2.3).
    const table = state.jobs.find((job) => job.templateId === 'oakDiningTable');
    if (table === undefined) throw new Error('no oak table on the books');
    expect(familyForStage(table, 'machining')).toBe('solidWoodTools');
    expect(machineOf(state, 'thicknesser').hoursUsed).toBe(0);
    expect(DUST_OUTPUT_M3_PER_HOUR.thicknesser).toBe(0.25);
    const store = bagStore(state);
    expect(store.fillM3).toBeGreaterThan(0);
    expect(store.fillM3).toBeCloseTo(dustOffTheClocks(state), 2);
    expect(store.full).toBe(false);
    expect(seen.filter((event) => event.kind === 'bagsFull')).toHaveLength(0);
    expect(state.tasks.filter((task) => task.kind === 'emptyBags')).toHaveLength(0);
  });

  it.todo(
    'has the helper empty the bag more than once a day, once a stage of some job stands a man at ' +
      'the thicknesser (the blocker at the top of REPORT-T12.md)',
  );
});
