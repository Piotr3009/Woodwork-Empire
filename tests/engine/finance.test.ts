// The loan and the overdraft (CLAUDE.md T13 3.14): sixty instalments that add up to the principal
// with the interest the monthly balances imply, an overdraft that accrues a day at a time below
// zero and is charged on the 1st, interest only, and an early repayment that closes the loan.

import { describe, expect, it } from 'vitest';
import {
  DAYS_PER_MONTH,
  DAYS_PER_YEAR,
  LOAN_MAX,
  LOAN_MONTHS,
  LOAN_RATE_YEARLY,
  OVERDRAFT_RATE_YEARLY,
} from '../../src/engine/constants';
import {
  accrueOverdraftInterest,
  loanCheck,
  loanInstalmentFor,
  nextInstalmentFor,
  overdraftInterestForDay,
  repayCheck,
  repayLoan,
  runFinanceMonth,
  takeLoan,
} from '../../src/engine/finance';
import { daysOfMonth, ledgerOfDay } from '../../src/engine/index';
import type { GameState, LedgerCategory, LedgerEntry } from '../../src/engine/index';
import { act, newGame, runToDay } from '../helpers';

function linesOf(state: GameState, category: LedgerCategory): LedgerEntry[] {
  return state.ledger.filter((entry) => entry.category === category);
}

function sumOf(state: GameState, category: LedgerCategory): number {
  return linesOf(state, category).reduce((total, entry) => total + entry.amount, 0);
}

function pence(value: number): number {
  return Math.round(value * 100) / 100;
}

describe('the loan', () => {
  it('lands the cash and starts sixty months', () => {
    const state = newGame();
    const before = state.cash;
    expect(takeLoan(state, 12000).ok).toBe(true);
    expect(state.cash).toBe(before + 12000);
    const loan = state.finance.loan;
    expect(loan).not.toBeNull();
    expect(loan?.balance).toBe(12000);
    expect(loan?.monthsLeft).toBe(LOAN_MONTHS);
    expect(loan?.monthlyInstalment).toBe(loanInstalmentFor(12000));
    const drawn = linesOf(state, 'loan');
    expect(drawn).toHaveLength(1);
    expect(drawn[0]?.amount).toBe(12000);
    expect(drawn[0]?.label).toBe('Loan drawn');
  });

  it('refuses a second loan, nothing at all, and more than the bank lends', () => {
    const state = newGame();
    expect(loanCheck(state, LOAN_MAX + 1)).toEqual({ ok: false, reason: `The bank lends up to ${LOAN_MAX}` });
    expect(loanCheck(state, 0).ok).toBe(false);
    expect(loanCheck(state, -5).ok).toBe(false);
    expect(takeLoan(state, LOAN_MAX).ok).toBe(true);
    expect(takeLoan(state, 1000)).toEqual({ ok: false, reason: 'One loan at a time' });
    expect(linesOf(state, 'loan')).toHaveLength(1);
  });

  it('sixty instalments repay the principal, with the interest the monthly balances imply', () => {
    const state = newGame();
    state.cash = 1000000;
    takeLoan(state, LOAN_MAX);
    // The same arithmetic, written out: each 1st takes a sixtieth of the principal and the
    // interest on what was still owed, at the yearly rate over twelve.
    const instalment = loanInstalmentFor(LOAN_MAX);
    let balance = LOAN_MAX;
    let expectedInterest = 0;
    for (let month = 1; month <= LOAN_MONTHS; month += 1) {
      expectedInterest += pence((balance * LOAN_RATE_YEARLY) / 12);
      balance = pence(balance - (month === LOAN_MONTHS ? balance : Math.min(balance, instalment)));
      state.clock.day = 1 + month * DAYS_PER_MONTH;
      runFinanceMonth(state);
    }
    expect(balance).toBe(0);
    expect(state.finance.loan).toBeNull();
    const repaid = linesOf(state, 'loan').filter((entry) => entry.amount < 0);
    expect(repaid).toHaveLength(LOAN_MONTHS);
    expect(pence(-repaid.reduce((total, entry) => total + entry.amount, 0))).toBe(LOAN_MAX);
    expect(linesOf(state, 'loanInterest')).toHaveLength(LOAN_MONTHS);
    expect(pence(-sumOf(state, 'loanInterest'))).toBe(pence(expectedInterest));
    // Fifteen percent over five years on a falling balance: a little under half the principal.
    expect(expectedInterest).toBeGreaterThan(LOAN_MAX * 0.35);
    expect(expectedInterest).toBeLessThan(LOAN_MAX * 0.4);
  });

  it('takes one instalment a month however many times the 1st is run, and none before it', () => {
    const state = newGame();
    state.clock.day = 5;
    takeLoan(state, 12000);
    runFinanceMonth(state);
    expect(linesOf(state, 'loanInterest')).toHaveLength(0);
    state.clock.day = 31;
    runFinanceMonth(state);
    runFinanceMonth(state);
    expect(linesOf(state, 'loanInterest')).toHaveLength(1);
    expect(state.finance.loan?.monthsLeft).toBe(LOAN_MONTHS - 1);
    expect(state.finance.loan?.balance).toBe(12000 - loanInstalmentFor(12000));
  });

  it('puts the instalment and its interest on the ledger dated the 1st, in plain English', () => {
    let state = newGame();
    state = act(state, { type: 'TAKE_LOAN', amount: 12000 });
    expect(state.finance.loan?.principal).toBe(12000);
    const next = runToDay(state, 31).state;
    const first = ledgerOfDay(next, 31);
    const capital = first.filter((entry) => entry.category === 'loan');
    const interest = first.filter((entry) => entry.category === 'loanInterest');
    expect(capital).toHaveLength(1);
    expect(interest).toHaveLength(1);
    expect(capital[0]?.amount).toBe(-loanInstalmentFor(12000));
    expect(interest[0]?.amount).toBe(-pence((12000 * LOAN_RATE_YEARLY) / 12));
    expect(capital[0]?.label).toBe(`Loan instalment 1 of ${LOAN_MONTHS}`);
    expect(interest[0]?.label).toBe('Loan interest, month 1');
    // The Days tab reads the same lines, so the 1st's costs carry both.
    const day = daysOfMonth(next, 2).find((row) => row.day === 31);
    expect(day).toBeDefined();
    expect(day?.costs).toBeGreaterThanOrEqual(loanInstalmentFor(12000) + 150);
    expect(next.finance.loan?.interestPaid).toBe(150);
    expect(next.finance.loan?.monthsLeft).toBe(LOAN_MONTHS - 1);
  });

  it('is repaid early at no penalty, and that closes it', () => {
    const state = newGame();
    const before = state.cash;
    takeLoan(state, 10000);
    expect(repayLoan(state, null).ok).toBe(true);
    expect(state.finance.loan).toBeNull();
    expect(state.cash).toBe(before);
    const lines = linesOf(state, 'loan');
    expect(lines.map((entry) => entry.amount)).toEqual([10000, -10000]);
    expect(lines[1]?.label).toBe('Loan repaid early');
    expect(repayCheck(state, null)).toEqual({ ok: false, reason: 'No loan to repay' });
  });

  it('a part repayment keeps the term and lowers every instalment still to come', () => {
    const state = newGame();
    takeLoan(state, 12000);
    expect(repayLoan(state, 6000).ok).toBe(true);
    const loan = state.finance.loan;
    expect(loan?.balance).toBe(6000);
    expect(loan?.monthsLeft).toBe(LOAN_MONTHS);
    expect(loan?.monthlyInstalment).toBe(loanInstalmentFor(6000));
    expect(loan ? nextInstalmentFor(loan) : 0).toBe(pence(loanInstalmentFor(6000) + (6000 * LOAN_RATE_YEARLY) / 12));
  });

  it('refuses a repayment the overdraft cannot cover', () => {
    const state = newGame();
    takeLoan(state, 10000);
    state.cash = state.finance.overdraftLimit + 100;
    expect(repayLoan(state, null)).toEqual({ ok: false, reason: 'Not enough cash' });
    expect(repayLoan(state, 5000)).toEqual({ ok: false, reason: 'Not enough cash' });
    expect(state.finance.loan?.balance).toBe(10000);
    expect(repayLoan(state, 100).ok).toBe(true);
    expect(state.finance.loan?.balance).toBe(9900);
  });

  it('closes on the sixtieth month even when the sixtieth of the principal does not divide', () => {
    const state = newGame();
    state.cash = 1000000;
    takeLoan(state, 1000);
    expect(loanInstalmentFor(1000)).toBe(16.67);
    for (let month = 1; month <= LOAN_MONTHS; month += 1) {
      state.clock.day = 1 + month * DAYS_PER_MONTH;
      runFinanceMonth(state);
    }
    expect(state.finance.loan).toBeNull();
    expect(pence(-linesOf(state, 'loan').filter((entry) => entry.amount < 0).reduce((total, entry) => total + entry.amount, 0))).toBe(1000);
  });
});

describe('the overdraft', () => {
  it('accrues a day of the yearly rate below zero and nothing above it', () => {
    const state = newGame();
    state.cash = -2000;
    accrueOverdraftInterest(state);
    const oneDay = (2000 * OVERDRAFT_RATE_YEARLY) / DAYS_PER_YEAR;
    expect(state.finance.overdraftInterestAccrued).toBeCloseTo(oneDay, 3);
    expect(overdraftInterestForDay(-2000)).toBeCloseTo(oneDay, 6);
    accrueOverdraftInterest(state);
    expect(state.finance.overdraftInterestAccrued).toBeCloseTo(oneDay * 2, 3);
    state.cash = 100;
    accrueOverdraftInterest(state);
    expect(state.finance.overdraftInterestAccrued).toBeCloseTo(oneDay * 2, 3);
    expect(overdraftInterestForDay(0)).toBe(0);
    expect(overdraftInterestForDay(500)).toBe(0);
  });

  it('is charged on the 1st as one line, interest only, and the balance stays below zero', () => {
    const state = newGame();
    state.cash = -2000;
    const next = runToDay(state, 31).state;
    const charged = linesOf(next, 'overdraftInterest');
    expect(charged).toHaveLength(1);
    expect(charged[0]?.day).toBe(31);
    expect(charged[0]?.label).toBe('Overdraft interest');
    // At least the opening balance's own interest over the days to the 1st, and no capital.
    const floor = (2000 * OVERDRAFT_RATE_YEARLY * 29) / DAYS_PER_YEAR;
    expect(-(charged[0]?.amount ?? 0)).toBeGreaterThanOrEqual(floor);
    expect(-(charged[0]?.amount ?? 0)).toBeLessThan(200);
    expect(next.cash).toBeLessThan(0);
    // Reset when charged, then the 1st's own day accrues again after it.
    expect(next.finance.overdraftInterestAccrued).toBeLessThan(floor);
  });

  it('runs with the monthly items, so a 1st that falls on a weekend is charged too', () => {
    // Day 91 is the 1st of month 4 and a Sunday: the day's costs run over the weekend and the
    // overdraft interest with them (CLAUDE.md T13 3.14).
    const state = newGame();
    state.cash = -2000;
    // Three months of fixed costs with nothing coming in is 15,000, which passes the one and a half
    // times the overdraft the bank now allows, so the company would be closed before the third 1st
    // (CLAUDE.md T21 2.2). The cadence of the charge is what this asserts, so the bank gives it the
    // room to reach the third one.
    state.finance.overdraftLimit = -40000;
    const next = runToDay(state, 92).state;
    expect(next.gameOver).toBeNull();
    const charged = linesOf(next, 'overdraftInterest').map((entry) => entry.day);
    expect(charged).toEqual([31, 61, 91]);
  });
});
