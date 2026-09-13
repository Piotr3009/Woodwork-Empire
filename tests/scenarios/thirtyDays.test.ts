// The scripted playthroughs of CLAUDE.md T1-13.

import { describe, expect, it } from 'vitest';
import {
  BIG_SAW,
  CAREFUL,
  IDLE,
  type Policy,
  DAY_ONE_KIT,
  SHORT_HANDED,
  playDay,
  playUntilDay,
} from './autopilot';
import {
  CREW,
  act,
  clearEvents,
  eventsOfKind,
  newGame,
  placeEnquiry,
  runClock,
  runToDay,
  sixJoinersOnSheetWork,
} from '../helpers';
import {
  BREAK_MINUTES,
  BREAK_SKIP_FACTOR,
  BREAK_START_MINUTE,
  DAY_END_MINUTE,
  DUCTING_RECONNECT_COST,
  LABOUR_FACTOR_FLOOR,
  LATE_ACCOUNTS_CHARGE,
  MINUTES_PER_WORKING_DAY,
  DEADLINE_DAYS_MIN,
  MOVE_MINUTES_PER_ITEM,
  MOVING_SPEED,
  OVERTIME_DEBT_PER_DAY,
  TOOL_CABINET,
  OVERTIME_END_MINUTE,
  POWER_BASE_DAILY,
  CLIENT_MEETING_MINUTES,
  MEETING_PRICE_THRESHOLD,
  RENT_PER_M2_MONTHLY,
  SHOPPING_MINUTES,
  SHOPPING_NEXT_MINUTES,
} from '../../src/engine/constants';
import {
  STATION_IDLE,
  STATION_NO_BENCH,
  bagIntervalFor,
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
} from '../../src/engine/index';
import { firstFreeCell, hallItems } from '../../src/engine/layout';
import { missingForHire } from '../../src/engine/staff';
import type { Equipment, GameEvent, GameState } from '../../src/engine/index';

function machineOf(state: GameState, specId: string): Equipment {
  const item = state.equipment.find((entry) => entry.specId === specId);
  if (!item) throw new Error(`no ${specId} in the hall`);
  return item;
}

const SEED = 20260911;

/** Day 1 to the start of day 31: thirty game days. */
function easyMonth(seen: GameEvent[] = []): GameState {
  return playUntilDay(newGame({ seed: SEED, difficulty: 'easy' }), 31, CAREFUL, seen);
}

describe('30 days on Easy, working the board', () => {
  const seen: GameEvent[] = [];
  const state = easyMonth(seen);

  it('reaches day 31 without going under', () => {
    expect(state.gameOver).toBeNull();
    expect(state.clock.day).toBe(31);
    expect(state.cash).toBeGreaterThan(0);
    expect(state.finance.arrearsAmount).toBe(0);
  });

  it('ends above the reputation it started on, but nothing like as far above', () => {
    // Turn 6 works the deadline out from the work in the job, and a one man shop that takes the
    // next job the day the last one goes out delivers some of them late. The month used to end
    // above ten and ends at a third of that: REPORT-T6 section 5 says so rather than tuning the
    // owner's own numbers away.
    expect(state.reputation).toBeGreaterThan(0);
    expect(state.reputation).toBeLessThan(10);
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
    // Five per cent slower than a new one on the cutting, and the bag fills twice as often
    // (CLAUDE.md T3 3.5, T7 3.1).
    expect(stageSpeed(state, stagedJob(1, 'sheet', false), 'cutting').speed).toBeCloseTo(0.95, 10);
    expect(bagIntervalFor(saw)).toBe(1200);
    // And it wore its hours down as the month went on.
    expect(saw.hoursUsed).toBeGreaterThan(0);
    expect(saw.enduranceHours).toBe(750);
  });

  it('spent the morning of day 1 at the shops, and paid for none of it until it was over', () => {
    // Nothing is bought in stopped time and nothing is bought on the spot: one trip, an hour for
    // the first thing and a quarter of an hour for each of the other eleven (CLAUDE.md T7 3.10).
    const trips = state.tasks.filter((task) => task.kind === 'shopping');
    expect(trips).toHaveLength(1);
    const wanted = SHOPPING_MINUTES + SHOPPING_NEXT_MINUTES * DAY_ONE_KIT.length;
    expect(trips[0]?.minutesTotal).toBe(wanted);
    expect(wanted).toBe(225);
    expect(trips[0]?.done).toBe(true);
    expect(trips[0]?.day).toBe(1);
    // And what he went out for is standing in the hall, paid for.
    expect(state.equipment.length).toBeGreaterThanOrEqual(DAY_ONE_KIT.length);
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
    for (const job of state.jobs) {
      const given = job.dueDay - job.acceptedDay;
      expect(given, job.name).toBeGreaterThanOrEqual(DEADLINE_DAYS_MIN);
      if (job.basePrice <= 600) expect(given, job.name).toBeLessThanOrEqual(5);
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
  it('is flat on the 5000 overdraft with the arrears already running', () => {
    // The Turn 2 overdraft limit of 5000 brings the first missed bill forward to day 23.
    const state = playUntilDay(newGame({ seed: SEED, difficulty: 'hard' }), 31, IDLE);
    expect(state.clock.day).toBe(31);
    expect(state.cash).toBeLessThan(-4900);
    expect(state.finance.arrearsAmount).toBeGreaterThan(0);
    expect(state.gameOver).toBeNull();
  });

  it('gets its arrears warning once the overdraft is full', () => {
    const run = runToDay(newGame({ seed: SEED, difficulty: 'hard' }), 40);
    expect(run.events.filter((event) => event.kind === 'arrearsWarning')).toHaveLength(1);
    expect(run.state.finance.arrearsMonths).toBe(1);
  });

  it('warns inside the month once the owner has bought his tools', () => {
    const state = playUntilDay(newGame({ seed: SEED, difficulty: 'hard' }), 31, {
      ...IDLE,
      buyKit: true,
    });
    expect(state.finance.arrearsAmount).toBeGreaterThan(0);
    expect(state.finance.arrearsMonths).toBeGreaterThanOrEqual(1);
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

  it('empties the bag half as often and draws more off the meter', () => {
    const saw = machineOf(state, 'tableSaw');
    expect(bagIntervalFor(saw)).toBe(4800);
    expect(saw.enduranceHours).toBe(6000);
    // Seven a day for the industrial saw where the used one draws three (CLAUDE.md T3 3.5).
    const machines = state.equipment.filter((item) => item.id !== saw.id);
    const others = dailyPower({ ...state, equipment: machines }) - POWER_BASE_DAILY;
    expect(dailyPower(state) - POWER_BASE_DAILY - others).toBe(7);
  });

  it('still trades at the end of the month after spending that much on day 1', () => {
    expect(state.gameOver).toBeNull();
    expect(state.clock.day).toBe(31);
    expect(state.jobs.filter((job) => job.stage === 'completed').length).toBeGreaterThanOrEqual(3);
  });
});

describe('a month short handed, with a joiner and one small rack', () => {
  const seen: GameEvent[] = [];
  const state = playUntilDay(newGame({ seed: SEED, difficulty: 'easy' }), 32, SHORT_HANDED, seen);

  it('reaches the end of the month still trading', () => {
    expect(state.gameOver).toBeNull();
    expect(state.clock.day).toBe(32);
    expect(state.cash).toBeGreaterThan(0);
  });

  it('took a poor joiner on and bought the shelving', () => {
    expect(state.workers).toHaveLength(1);
    expect(state.workers[0]?.role).toBe('joiner');
    expect(state.workers[0]?.tier).toBe('poor');
    expect(state.equipment.some((item) => item.specId === 'sheetRack')).toBe(true);
  });

  it('ran the rack dry and the joiners stood around laughing', () => {
    const laughing = eventsOfKind(seen, 'noMaterial');
    expect(laughing.length).toBeGreaterThanOrEqual(1);
    expect(laughing[0]?.body).toContain('standing around laughing');
    // Once a day and no more, so it cannot outnumber the days that were played.
    expect(laughing.length).toBeLessThanOrEqual(eventsOfKind(seen, 'dayEnd').length);
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
  // Two things on the move, of which one is ducted into the extraction: the hand edgebander is
  // in a tool cabinet now, so the shelving is the second thing the owner shifts (T4 3.5, T6 3.5).
  const shifted = act(drag(drag(day3, 'tableSaw'), 'sheetRack'), {
    type: 'END_SETUP',
    speed: 1,
  });

  it('starts on day 3 with two things on the move and an hour each to shift them', () => {
    expect(day3.clock.day).toBe(3);
    expect(shifted.movedItems).toHaveLength(2);
    expect(movingMachines(shifted)?.minutesTotal).toBe(2 * MOVE_MINUTES_PER_ITEM);
    expect(shifted.owner.currentTaskId).toBe(movingMachines(shifted)?.id);
  });

  it('runs the clock at 4x for the whole span, and will not let the player change it', () => {
    expect(shifted.speed).toBe(MOVING_SPEED);
    expect(act(shifted, { type: 'SET_SPEED', speed: 1 }).speed).toBe(MOVING_SPEED);
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
    // Nothing but 4x for the whole of it, and the span is the 120 minutes the move was given
    // plus whatever the phone took out of him inside it, to the minute.
    expect(Array.from(speeds)).toEqual([MOVING_SPEED]);
    const onThePhone = at.owner.minutesByCategory.admin - deskBefore;
    expect(minutes).toBe(2 * MOVE_MINUTES_PER_ITEM + onThePhone);
    // Every bench stood still while the kit was up in the air.
    expect(at.jobs.map((job) => job.labourRemaining)).toEqual(madeAtFirst);
    // And the clock is the player's again.
    expect(act(at, { type: 'SET_SPEED', speed: 1 }).speed).toBe(1);
  });

  it('charges the ducting when the kit is back down, one line a ducted machine', () => {
    let at = shifted;
    let guard = 0;
    while (movingMachines(at) !== null && guard < 600) {
      at = clearEvents(tick(at, 1));
      guard += 1;
    }
    const lines = at.ledger.filter((entry) => entry.category === 'ducting');
    expect(lines).toHaveLength(1);
    expect(lines.map((entry) => entry.label)).toEqual(['Ducting reconnection: table saw']);
    // The ducting is the whole of what the move cost: no other money moved in those two hours.
    expect(lines.reduce((total, entry) => total - entry.amount, 0)).toBe(DUCTING_RECONNECT_COST);
    expect(cashBefore - at.cash).toBe(DUCTING_RECONNECT_COST);
    expect(at.movedItems).toEqual([]);
  });

  it('finishes the month still trading, with the move paid for', () => {
    const month = playUntilDay(shifted, 31, CAREFUL);
    expect(month.gameOver).toBeNull();
    expect(month.clock.day).toBe(31);
    expect(month.cash).toBeGreaterThan(0);
    expect(month.ledger.filter((entry) => entry.category === 'ducting')).toHaveLength(1);
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

  it('ends the day at 17:00 with his whole 480 minutes behind him', () => {
    const last = states[states.length - 1];
    expect(formatTime(last?.clock.minute ?? -1)).toBe('17:00');
    expect(last?.owner.minutesWorked).toBe(MINUTES_PER_WORKING_DAY);
    expect(last?.owner.overtimeMinutes).toBe(0);
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
    const early = bigJobMonth(2);
    const job = early.jobs[0];
    expect(job?.price).toBeGreaterThan(MEETING_PRICE_THRESHOLD);
    const meeting = early.tasks.find((task) => task.kind === 'clientMeeting');
    expect(meeting?.minutesTotal).toBe(CLIENT_MEETING_MINUTES);
    expect(CLIENT_MEETING_MINUTES).toBe(240);
    const design = early.tasks.find((task) => task.kind === 'design');
    // The drawing is on the desk and it cannot be started until the meeting has been held.
    expect(design).toBeDefined();
    expect(startTaskCheck(early, design?.id ?? '').ok).toBe(meeting?.done === true);
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
    expect(done(two)).toBeGreaterThan(done(one));
    // The second saw is 1800 and it has paid for itself inside the month (CLAUDE.md T7 3.1).
    expect(two.state.cash).toBeGreaterThan(one.state.cash);
  });

  it('stands the one saw crew at the saw for hours at a time, and says which machine', () => {
    // The station carries the family, which is what the hall draws and the Gantt greys out
    // (CLAUDE.md T7 3.1, 3.2).
    expect(one.waiting).toBeGreaterThan(0);
    expect(one.longest).toBeGreaterThan(CREW_MAX_GAP);
  });
});
