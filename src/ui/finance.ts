// The Finance tab of the accounting binder: the loan and the overdraft (CLAUDE.md T13 3.14).
// Phase A: a stub that renders the state; phase B1 builds the tab.

import { LOAN_MAX } from '../engine/constants';
import type { GameState } from '../engine/index';
import { button, escapeHtml, money } from './modal';

export function renderFinance(state: GameState, loanTyped = '10000'): string {
  const loan = state.finance.loan;
  const wanted = Number(loanTyped) || 0;
  const loanBlock =
    loan === null
      ? '<h3>Loan</h3>' +
        `<p class="hint">Up to ${money(LOAN_MAX)}, sixty monthly instalments.</p>` +
        '<div class="row"><span class="row-main">' +
        '<input type="text" inputmode="numeric" pattern="[0-9]*" class="num" ' +
        `data-field="loanAmount" value="${escapeHtml(loanTyped)}" /> to borrow</span>` +
        `<span class="row-action">${button('takeLoan', 'Take the loan', `data-amount="${wanted}"`)}</span></div>`
      : '<h3>Loan</h3>' +
        `<div class="row"><span class="row-main">Balance</span><span class="row-figure bad">${money(-loan.balance)}</span></div>` +
        `<div class="row"><span class="row-main">Months left</span><span class="row-figure">${loan.monthsLeft}</span></div>` +
        `<div class="row"><span class="row-main">Interest paid</span><span class="row-figure bad">${money(-loan.interestPaid)}</span></div>` +
        `<div class="row"><span class="row-action">${button('repayLoan', 'Repay it all', 'data-amount="all"')}</span></div>`;
  return (
    loanBlock +
    '<h3>Overdraft</h3>' +
    `<div class="row"><span class="row-main">Limit</span><span class="row-figure">${money(state.finance.overdraftLimit)}</span></div>` +
    `<div class="row"><span class="row-main">Interest accrued this month</span>` +
    `<span class="row-figure bad">${money(-state.finance.overdraftInterestAccrued)}</span></div>`
  );
}
