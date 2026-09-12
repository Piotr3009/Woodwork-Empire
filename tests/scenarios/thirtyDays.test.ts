// The scripted playthroughs of CLAUDE.md T1-13.

import { describe, expect, it } from 'vitest';
import { BIG_SAW, CAREFUL, IDLE, SHORT_HANDED, playUntilDay } from './autopilot';
import { act, clearEvents, eventsOfKind, newGame, runToDay } from '../helpers';
import {
  DUCTING_RECONNECT_COST,
  LATE_ACCOUNTS_CHARGE,
  MOVE_MINUTES_PER_ITEM,
  MOVING_SPEED,
  POWER_BASE_DAILY,
} from '../../src/engine/constants';
import {
  STATION_NO_BENCH,
  bagIntervalFor,
  dailyPower,
  emailsForPrice,
  gameMinutesPerRealSecond,
  hasBenchFor,
  machineOutputFactor,
  minutesRemainingFor,
  movingMachines,
  tick,
} from '../../src/engine/index';
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

  it('ends well above the reputation it started on', () => {
    expect(state.reputation).toBeGreaterThan(10);
  });

  it('took bookcases and TV units, and finished most of them', () => {
    const done = state.jobs.filter((job) => job.stage === 'completed');
    expect(done.length).toBeGreaterThanOrEqual(3);
    const taken = new Set(state.jobs.map((job) => job.templateId));
    expect(taken.has('bookcase')).toBe(true);
    // A TV unit needs a reputation of 5, so it can only come after the first jobs landed.
    expect(taken.has('tvUnit')).toBe(true);
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
    // 12 per m2 for the 60 m2 unit, one month of it held as the deposit.
    expect(state.unit.rentMonthly).toBe(720);
    expect(state.unit.depositHeld).toBe(720);
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
    // Five per cent slower than a new one and the bag fills twice as often (CLAUDE.md T3 3.5).
    expect(machineOutputFactor(state, 'sheet')).toBeCloseTo(0.95, 10);
    expect(bagIntervalFor(saw)).toBe(1200);
    // And it wore its hours down as the month went on.
    expect(saw.hoursUsed).toBeGreaterThan(0);
    expect(saw.enduranceHours).toBe(750);
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

  it('kept a bench under the owner all month', () => {
    expect(state.equipment.filter((item) => item.specId === 'workbench').length)
      .toBeGreaterThanOrEqual(1);
    expect(hasBenchFor(state, null)).toBe(true);
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

  it('gets 30% more out of every minute at the bench', () => {
    expect(machineOutputFactor(state, 'sheet')).toBeCloseTo(1.3, 10);
    const taken = state.jobs[0];
    if (!taken) throw new Error('no jobs in the month');
    // Measured on the whole job, because the month finished the ones it started.
    const job = { ...taken, labourRemaining: taken.labourValue };
    expect(job.labourValue).toBeGreaterThan(0);
    const minutes = minutesRemainingFor(state, job, 1);
    // A workshop with no saw at all is the 1.0 baseline: this one is 1.3 times quicker.
    const bare = { ...state, equipment: [] };
    expect(minutesRemainingFor(bare, job, 1) / minutes).toBeCloseTo(1.3, 6);
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
  /** Drags one item of this kind one tile down the hall, the way setup mode does. */
  function drag(state: GameState, specId: string): GameState {
    const item = machineOf(state, specId);
    return act(state, {
      type: 'MOVE_ITEM',
      itemId: item.id,
      x: item.anchorX,
      y: item.anchorY + 1,
    });
  }

  const day3 = clearEvents(playUntilDay(newGame({ seed: SEED, difficulty: 'easy' }), 3, CAREFUL));
  const cashBefore = day3.cash;
  // The saw and the edgebander are both ducted into the extraction (CLAUDE.md T4 3.5).
  const shifted = act(drag(drag(day3, 'tableSaw'), 'edgebander'), {
    type: 'END_SETUP',
    speed: 1,
  });

  it('starts on day 3 with two machines on the move and an hour each to shift them', () => {
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
      at = clearEvents(tick(at, 1));
      minutes += 1;
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

  it('charges 1,600 of ducting when the kit is back down, one line a machine', () => {
    let at = shifted;
    let guard = 0;
    while (movingMachines(at) !== null && guard < 600) {
      at = clearEvents(tick(at, 1));
      guard += 1;
    }
    const lines = at.ledger.filter((entry) => entry.category === 'ducting');
    expect(lines).toHaveLength(2);
    expect(lines.map((entry) => entry.label)).toEqual([
      'Ducting reconnection: table saw',
      'Ducting reconnection: hand edgebander',
    ]);
    expect(lines.reduce((total, entry) => total - entry.amount, 0)).toBe(
      2 * DUCTING_RECONNECT_COST,
    );
    // The ducting is the whole of what the move cost: no other money moved in those two hours.
    expect(lines.reduce((total, entry) => total - entry.amount, 0)).toBe(
      2 * DUCTING_RECONNECT_COST,
    );
    expect(cashBefore - at.cash).toBe(2 * DUCTING_RECONNECT_COST);
    expect(at.movedItems).toEqual([]);
  });

  it('finishes the month still trading, with the move paid for', () => {
    const month = playUntilDay(shifted, 31, CAREFUL);
    expect(month.gameOver).toBeNull();
    expect(month.clock.day).toBe(31);
    expect(month.cash).toBeGreaterThan(0);
    expect(month.ledger.filter((entry) => entry.category === 'ducting')).toHaveLength(2);
    expect(month.jobs.filter((job) => job.stage === 'completed').length).toBeGreaterThanOrEqual(2);
  });
});
