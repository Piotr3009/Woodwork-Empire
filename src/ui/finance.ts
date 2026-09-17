// The Finance tab of the accounting binder: the loan and the overdraft (CLAUDE.md T13 3.14). The
// engine says what is owed and what the next 1st takes; this prints it, every signed figure in
// the colour its sign gives it.

import { LOAN_MAX, LOAN_MONTHS, LOAN_RATE_YEARLY, OVERDRAFT_RATE_YEARLY } from '../engine/constants';
import {
  formatCalendarDay,
  loanCapitalForMonth,
  loanCheck,
  loanInterestForMonth,
  nextInstalmentFor,
  repayCheck,
} from '../engine/index';
import type { GameState } from '../engine/index';
import { button, escapeHtml, lockedButton, money, plural, primaryButton, signedMoney } from './modal';

function percent(rate: number): string {
  return `${Math.round(rate * 100)}%`;
}

/** A row of the tab: the words on the left, the figure on the right in its sign's colour. */
function line(label: string, value: number, extra = ''): string {
  const tone = value < 0 ? ' bad' : value > 0 ? ' good' : '';
  return (
    `<div class="row"><span class="row-main">${escapeHtml(label)}</span>` +
    `<span class="row-figure${tone}">${signedMoney(value)}</span>` +
    `${extra === '' ? '' : `<span class="row-action">${extra}</span>`}</div>`
  );
}

function amountField(typed: string, after: string): string {
  return (
    '<input type="text" inputmode="numeric" pattern="[0-9]*" class="num" data-field="loanAmount" ' +
    `value="${escapeHtml(typed)}" /> ${escapeHtml(after)}`
  );
}

/** Nothing borrowed: the terms and the one control that borrows. */
function offerBlock(state: GameState, typed: string): string {
  const wanted = Math.round(Number(typed) || 0);
  const check = loanCheck(state, wanted);
  const control = check.ok
    ? primaryButton('takeLoan', 'Take the loan', `data-amount="${wanted}"`)
    : lockedButton('Take the loan', check.reason);
  return (
    `<p class="hint">Up to ${money(LOAN_MAX)} at ${percent(LOAN_RATE_YEARLY)} a year, ` +
    `${LOAN_MONTHS} monthly instalments on the 1st, the interest on what is still owed with each ` +
    'one. Repaid early at no penalty.</p>' +
    `<div class="row"><span class="row-main">${amountField(typed, 'to borrow')}</span>` +
    `<span class="row-action">${control}</span></div>`
  );
}

/** A loan on the books: what is owed, what the next 1st takes, and the way out of it early. */
function loanBlock(state: GameState, typed: string): string {
  const loan = state.finance.loan;
  if (loan === null) return offerBlock(state, typed);
  const wanted = Math.round(Number(typed) || 0);
  const part = repayCheck(state, wanted);
  const all = repayCheck(state, null);
  const partButton = part.ok
    ? button('repayLoan', 'Repay', `data-amount="${wanted}"`)
    : lockedButton('Repay', part.reason);
  const allButton = all.ok
    ? primaryButton('repayLoan', 'Repay it all', 'data-amount="all"')
    : lockedButton('Repay it all', all.reason);
  return (
    `<p class="hint">${money(loan.principal)} borrowed on ${formatCalendarDay(loan.startDay)} at ` +
    `${percent(LOAN_RATE_YEARLY)} a year.</p>` +
    line('Balance owed', -loan.balance) +
    line(
      `Next instalment, capital ${money(loanCapitalForMonth(loan))} and interest ` +
        `${money(loanInterestForMonth(loan))}`,
      -nextInstalmentFor(loan),
    ) +
    line('Interest paid so far', -loan.interestPaid) +
    `<div class="row"><span class="row-main">Months left</span>` +
    `<span class="row-figure">${plural(loan.monthsLeft, 'month', 'months')}</span></div>` +
    `<div class="row"><span class="row-main">${amountField(typed, 'to repay early')}</span>` +
    `<span class="row-action">${partButton}${allButton}</span></div>`
  );
}

function overdraftBlock(state: GameState): string {
  const below = state.cash < 0;
  const running = below
    ? `<p class="warn">The account is ${money(-state.cash)} below zero. Interest is running on ` +
      'it every day, and it stays below zero until you bring it up.</p>'
    : '';
  return (
    `<p class="hint">Below zero the bank charges ${percent(OVERDRAFT_RATE_YEARLY)} a year on the ` +
    'balance, accrued every day and charged on the 1st, interest only.</p>' +
    `<div class="row"><span class="row-main">Overdraft limit</span>` +
    `<span class="row-figure">${money(state.finance.overdraftLimit)}</span></div>` +
    line('Interest accrued this month', -state.finance.overdraftInterestAccrued) +
    running
  );
}

export function renderFinance(state: GameState, loanTyped = '10000'): string {
  return (
    `<div class="finance-loan"><h3>Loan</h3>${loanBlock(state, loanTyped)}</div>` +
    `<div class="finance-overdraft"><h3>Overdraft</h3>${overdraftBlock(state)}</div>`
  );
}
