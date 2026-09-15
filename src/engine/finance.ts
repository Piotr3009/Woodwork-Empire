// The loan and the overdraft (CLAUDE.md T13 3.14). One loan at a time, up to the cap, at Piotr's
// yearly rate over sixty monthly instalments; the interest on what is still owed goes out with each
// instalment. The overdraft costs its yearly rate on the negative balance, accrued a day at a time
// and charged on the 1st, interest only: the balance stays negative until the player brings it up.

import {
  DAYS_PER_YEAR,
  LOAN_MAX,
  LOAN_MONTHS,
  LOAN_RATE_YEARLY,
  OVERDRAFT_RATE_YEARLY,
} from './constants';
import { monthOfDay } from './clock';
import { canAfford, charge } from './economy';
import type { GameState, LoanState } from './types';

export interface FinanceCheck {
  ok: boolean;
  reason: string;
}

const OK: FinanceCheck = { ok: true, reason: '' };

function pence(value: number): number {
  return Math.round(value * 100) / 100;
}

/** The capital part of one instalment: what is owed over the months still to run. */
export function loanInstalmentFor(principal: number, months = LOAN_MONTHS): number {
  return pence(principal / Math.max(1, months));
}

/** Why a loan of this much cannot be taken, or that it can: one at a time, whole pounds, up to
 *  the cap (CLAUDE.md T13 3.14). */
export function loanCheck(state: GameState, amount: number): FinanceCheck {
  if (state.finance.loan !== null) return { ok: false, reason: 'One loan at a time' };
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, reason: 'Nothing to borrow' };
  if (amount > LOAN_MAX) return { ok: false, reason: `The bank lends up to ${LOAN_MAX}` };
  return OK;
}

/** Takes the loan: the cash lands, the balance and the sixty months start (CLAUDE.md T13 3.14). */
export function takeLoan(state: GameState, amount: number): FinanceCheck {
  const check = loanCheck(state, amount);
  if (!check.ok) return check;
  const principal = Math.round(amount);
  const loan: LoanState = {
    principal,
    balance: principal,
    monthlyInstalment: loanInstalmentFor(principal),
    monthsLeft: LOAN_MONTHS,
    interestPaid: 0,
    startDay: state.clock.day,
  };
  state.finance.loan = loan;
  charge(state, 'loan', 'Loan drawn', principal);
  return OK;
}

/** Why this much cannot be repaid now, or that it can. */
export function repayCheck(state: GameState, amount: number | null): FinanceCheck {
  const loan = state.finance.loan;
  if (loan === null) return { ok: false, reason: 'No loan to repay' };
  const wanted = amount === null ? loan.balance : Math.min(loan.balance, amount);
  if (!Number.isFinite(wanted) || wanted <= 0) return { ok: false, reason: 'Nothing to repay' };
  if (!canAfford(state, wanted)) return { ok: false, reason: 'Not enough cash' };
  return OK;
}

/** Repays part or all of the balance early, at no penalty [TUNE] (CLAUDE.md T13 3.14). Paying it
 *  all closes the loan. Paying part of it keeps the term and lowers every instalment still to
 *  come, so the months left say what they said and the arithmetic of the month stays one rule. */
export function repayLoan(state: GameState, amount: number | null): FinanceCheck {
  const check = repayCheck(state, amount);
  const loan = state.finance.loan;
  if (!check.ok || loan === null) return check;
  const wanted = pence(amount === null ? loan.balance : Math.min(loan.balance, amount));
  charge(state, 'loan', 'Loan repaid early', -wanted);
  loan.balance = pence(loan.balance - wanted);
  if (loan.balance <= 0) {
    state.finance.loan = null;
    return OK;
  }
  loan.monthlyInstalment = loanInstalmentFor(loan.balance, loan.monthsLeft);
  return OK;
}

/** The month's interest on the balance, at the yearly rate over twelve. */
export function loanInterestForMonth(loan: LoanState): number {
  return pence((loan.balance * LOAN_RATE_YEARLY) / 12);
}

/** The capital part of the next instalment: the last one takes whatever is left, so a balance
 *  rounded to the penny cannot outlive its sixty months. */
export function loanCapitalForMonth(loan: LoanState): number {
  if (loan.monthsLeft <= 1) return loan.balance;
  return Math.min(loan.balance, loan.monthlyInstalment);
}

/** What the next 1st takes: capital and interest together. */
export function nextInstalmentFor(loan: LoanState): number {
  return pence(loanCapitalForMonth(loan) + loanInterestForMonth(loan));
}

/** Instalments the calendar says are due: one for every 1st that has passed since the loan was
 *  drawn, never more than the term. */
function instalmentsDue(state: GameState, loan: LoanState): number {
  const elapsed = monthOfDay(state.clock.day) - monthOfDay(loan.startDay);
  return Math.max(0, Math.min(LOAN_MONTHS, elapsed));
}

/** One instalment: the interest on what is owed, then the capital, both unavoidable. */
function chargeInstalment(state: GameState, loan: LoanState): void {
  const interest = loanInterestForMonth(loan);
  const capital = pence(loanCapitalForMonth(loan));
  const paid = LOAN_MONTHS - loan.monthsLeft + 1;
  charge(state, 'loanInterest', `Loan interest, month ${paid}`, -interest, { unavoidable: true });
  charge(state, 'loan', `Loan instalment ${paid} of ${LOAN_MONTHS}`, -capital, {
    unavoidable: true,
  });
  loan.interestPaid = pence(loan.interestPaid + interest);
  loan.balance = pence(loan.balance - capital);
  loan.monthsLeft = Math.max(0, loan.monthsLeft - 1);
}

/** The 1st: the instalment and the interest on what is left, and the overdraft's accrued interest
 *  (CLAUDE.md T13 3.14). The instalments are counted off the calendar, one for every 1st since
 *  the loan was drawn, so the month runs once however many times the day's hooks ask for it. */
export function runFinanceMonth(state: GameState): void {
  const loan = state.finance.loan;
  if (loan !== null) {
    const due = instalmentsDue(state, loan);
    let paid = LOAN_MONTHS - loan.monthsLeft;
    while (paid < due && loan.balance > 0) {
      chargeInstalment(state, loan);
      paid += 1;
    }
    if (loan.balance <= 0) state.finance.loan = null;
  }
  const accrued = pence(state.finance.overdraftInterestAccrued);
  if (accrued > 0) {
    charge(state, 'overdraftInterest', 'Overdraft interest', -accrued, { unavoidable: true });
  }
  state.finance.overdraftInterestAccrued = 0;
}

/** One calendar day's interest on a balance this far below zero. */
export function overdraftInterestForDay(cash: number): number {
  if (cash >= 0) return 0;
  return (-cash * OVERDRAFT_RATE_YEARLY) / DAYS_PER_YEAR;
}

/** Every calendar day the account is below zero, the day's share of the yearly rate accrues on
 *  the negative balance; it is charged monthly, interest only (CLAUDE.md T13 3.14). */
export function accrueOverdraftInterest(state: GameState): void {
  const today = overdraftInterestForDay(state.cash);
  if (today <= 0) return;
  state.finance.overdraftInterestAccrued =
    Math.round((state.finance.overdraftInterestAccrued + today) * 10000) / 10000;
}
