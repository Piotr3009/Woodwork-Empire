// The loan and the overdraft (CLAUDE.md T13 3.14). Phase A: the shape and the entry points, all
// stubbed; phase B1 fills them.

import { LOAN_MAX, LOAN_MONTHS, LOAN_RATE_YEARLY, OVERDRAFT_RATE_YEARLY, DAYS_PER_YEAR } from './constants';
import { charge } from './economy';
import type { GameState, LoanState } from './types';

export interface FinanceCheck {
  ok: boolean;
  reason: string;
}

const OK: FinanceCheck = { ok: true, reason: '' };

/** The capital part of one instalment: the principal over the sixty months. */
export function loanInstalmentFor(principal: number): number {
  return Math.round((principal / LOAN_MONTHS) * 100) / 100;
}

/** Why a loan of this much cannot be taken, or that it can: one at a time, up to the cap. */
export function loanCheck(state: GameState, amount: number): FinanceCheck {
  if (state.finance.loan !== null) return { ok: false, reason: 'One loan at a time' };
  if (amount <= 0) return { ok: false, reason: 'Nothing to borrow' };
  if (amount > LOAN_MAX) return { ok: false, reason: `The bank lends up to ${LOAN_MAX}` };
  return OK;
}

/** Takes the loan: the cash lands, the balance and the sixty months start (CLAUDE.md T13 3.14). */
export function takeLoan(state: GameState, amount: number): FinanceCheck {
  const check = loanCheck(state, amount);
  if (!check.ok) return check;
  const loan: LoanState = {
    principal: amount,
    balance: amount,
    monthlyInstalment: loanInstalmentFor(amount),
    monthsLeft: LOAN_MONTHS,
    interestPaid: 0,
    startDay: state.clock.day,
  };
  state.finance.loan = loan;
  charge(state, 'loan', 'Loan drawn', amount);
  return OK;
}

/** Repays part or all of the balance early, at no penalty [TUNE] (CLAUDE.md T13 3.14). */
export function repayLoan(state: GameState, amount: number | null): FinanceCheck {
  const loan = state.finance.loan;
  if (loan === null) return { ok: false, reason: 'No loan to repay' };
  const wanted = amount === null ? loan.balance : Math.min(loan.balance, amount);
  if (wanted <= 0) return { ok: false, reason: 'Nothing to repay' };
  if (state.cash - wanted < state.finance.overdraftLimit) {
    return { ok: false, reason: 'Not enough cash' };
  }
  charge(state, 'loan', 'Loan repaid', -wanted);
  loan.balance = Math.round((loan.balance - wanted) * 100) / 100;
  if (loan.balance <= 0) state.finance.loan = null;
  return OK;
}

/** The month's interest on the balance, at the yearly rate over twelve. */
export function loanInterestForMonth(loan: LoanState): number {
  return Math.round(((loan.balance * LOAN_RATE_YEARLY) / 12) * 100) / 100;
}

/** The 1st: the instalment and the interest on what is left, and the overdraft's accrued interest
 *  (CLAUDE.md T13 3.14). Phase B1 owns the arithmetic; phase A charges the simplest reading. */
export function runFinanceMonth(state: GameState): void {
  const loan = state.finance.loan;
  if (loan !== null) {
    const interest = loanInterestForMonth(loan);
    const capital = Math.min(loan.balance, loan.monthlyInstalment);
    charge(state, 'loanInterest', 'Loan interest', -interest, { unavoidable: true });
    charge(state, 'loan', 'Loan instalment', -capital, { unavoidable: true });
    loan.interestPaid = Math.round((loan.interestPaid + interest) * 100) / 100;
    loan.balance = Math.round((loan.balance - capital) * 100) / 100;
    loan.monthsLeft = Math.max(0, loan.monthsLeft - 1);
    if (loan.balance <= 0) state.finance.loan = null;
  }
  const accrued = Math.round(state.finance.overdraftInterestAccrued * 100) / 100;
  if (accrued > 0) {
    charge(state, 'overdraftInterest', 'Overdraft interest', -accrued, { unavoidable: true });
  }
  state.finance.overdraftInterestAccrued = 0;
}

/** Every calendar day the account is below zero, the day's share of the yearly rate accrues on
 *  the negative balance; it is charged monthly, interest only (CLAUDE.md T13 3.14). */
export function accrueOverdraftInterest(state: GameState): void {
  if (state.cash >= 0) return;
  const today = (-state.cash * OVERDRAFT_RATE_YEARLY) / DAYS_PER_YEAR;
  state.finance.overdraftInterestAccrued =
    Math.round((state.finance.overdraftInterestAccrued + today) * 10000) / 10000;
}
