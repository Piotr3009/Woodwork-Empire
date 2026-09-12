// The scripted playthroughs of CLAUDE.md T1-13.

import { describe, expect, it } from 'vitest';
import { CAREFUL, IDLE, SHORT_HANDED, playUntilDay } from './autopilot';
import { eventsOfKind, newGame, runToDay } from '../helpers';
import { LATE_ACCOUNTS_CHARGE } from '../../src/engine/constants';
import { gameMinutesPerRealSecond } from '../../src/engine/index';
import type { GameEvent, GameState } from '../../src/engine/index';

const SEED = 20260911;

/** Day 1 to the start of day 31: thirty game days. */
function easyMonth(): GameState {
  return playUntilDay(newGame({ seed: SEED, difficulty: 'easy' }), 31, CAREFUL);
}

describe('30 days on Easy, working the board', () => {
  const state = easyMonth();

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

  it('was paid for every job it delivered', () => {
    for (const job of state.jobs.filter((entry) => entry.stage === 'completed')) {
      expect(job.depositPaid).toBeGreaterThan(0);
      expect(job.rating).not.toBeNull();
    }
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

  it('ends with the books behind and the accountant paid for it', () => {
    expect(state.booksUpToDay).toBe(0);
    const charges = state.ledger.filter((entry) => entry.category === 'accounts');
    expect(charges).toHaveLength(1);
    expect(charges[0]?.amount).toBe(-LATE_ACCOUNTS_CHARGE);
    expect(eventsOfKind(seen, 'lateAccounts')).toHaveLength(1);
    expect(state.lateAccountsMonths).toBe(1);
  });
});
