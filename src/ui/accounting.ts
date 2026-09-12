// Accounting: today, this week, this month, what is due next, and the running ledger
// (CLAUDE.md 10.1). Nothing arrives as a letter, it is all here.

import { LEDGER_VISIBLE_ENTRIES } from '../engine/constants';
import {
  arrearsCarryInterest,
  dailyPower,
  dailyRates,
  dailyRent,
  netOf,
  nextDueDays,
  weeklyWageBill,
} from '../engine/index';
import type { GameState, PeriodTotals } from '../engine/index';
import { button, escapeHtml, money, plural, primaryButton } from './modal';

function totalsBlock(title: string, totals: PeriodTotals): string {
  const lines = Object.entries(totals.byCategory)
    .filter(([, amount]) => amount !== 0)
    .sort((left, right) => left[1] - right[1])
    .map(
      ([category, amount]) =>
        `<div class="row"><span class="row-main">${escapeHtml(category)}</span>` +
        `<span class="row-figure ${amount < 0 ? 'bad' : 'good'}">${money(amount)}</span></div>`,
    )
    .join('');
  const net = netOf(totals);
  return (
    `<div class="col"><h3>${escapeHtml(title)}</h3>` +
    `<div class="row"><span class="row-main">In</span>` +
    `<span class="row-figure good">${money(totals.income)}</span></div>` +
    `<div class="row"><span class="row-main">Out</span>` +
    `<span class="row-figure bad">${money(-totals.costs)}</span></div>` +
    `<div class="row is-total"><span class="row-main">Net</span>` +
    `<span class="row-figure ${net < 0 ? 'bad' : 'good'}">${money(net)}</span></div>` +
    lines +
    '</div>'
  );
}

/** Paying the arrears off is the one way out of the ladder to the bailiff (CLAUDE.md T2 3.4). */
function arrearsBlock(state: GameState, typed: string): string {
  const finance = state.finance;
  if (finance.arrearsAmount <= 0) return '';
  const months = plural(finance.arrearsMonths, 'month', 'months');
  const interest = arrearsCarryInterest(state)
    ? ' They are large enough to carry 1% interest a month.'
    : '';
  const wanted = Number(typed) || 0;
  return (
    `<p class="warn">Arrears ${money(finance.arrearsAmount)}, ${months}. ` +
    `Three months brings the bailiff.${interest}</p>` +
    '<div class="row"><span class="row-main">' +
    '<input type="number" class="num" data-field="arrearsAmount" data-focus-key="arrearsAmount" ' +
    `value="${escapeHtml(typed)}" min="1" /> to pay</span>` +
    `<span class="row-figure">${money(Math.min(wanted, finance.arrearsAmount))}</span>` +
    `<span class="row-action">${button('payArrears', 'Pay', `data-amount="${wanted}"`)}` +
    `${primaryButton('payArrears', 'Pay all', 'data-amount="all"')}</span></div>`
  );
}

export function renderAccounting(state: GameState, arrearsTyped: string): string {
  const due = nextDueDays(state);
  const arrears = arrearsBlock(state, arrearsTyped);
  const ledger = state.ledger
    .slice(-LEDGER_VISIBLE_ENTRIES)
    .reverse()
    .map(
      (entry) =>
        `<div class="row"><span class="row-main">day ${entry.day} ` +
        `${escapeHtml(entry.label)}${entry.unpaid ? ' (no cash moved)' : ''}</span>` +
        `<span class="row-figure ${entry.amount < 0 ? 'bad' : 'good'}">${money(entry.amount)}` +
        `</span><span class="row-figure dim">${money(entry.balance)}</span></div>`,
    )
    .join('');
  return (
    `<p class="figures"><strong>${money(state.cash)}</strong> in the bank. ` +
    `Overdraft limit ${money(state.finance.overdraftLimit)}.</p>` +
    arrears +
    '<div class="cols">' +
    totalsBlock('Today', state.finance.day) +
    totalsBlock('This week', state.finance.week) +
    totalsBlock('This month', state.finance.month) +
    '</div>' +
    '<h3>What is coming</h3>' +
    `<div class="row"><span class="row-main">Rent, every day</span>` +
    `<span class="row-figure">${money(dailyRent(state))}</span></div>` +
    `<div class="row"><span class="row-main">Business rates, every day</span>` +
    `<span class="row-figure">${money(dailyRates(state))}</span></div>` +
    `<div class="row"><span class="row-main">Power, every day</span>` +
    `<span class="row-figure">${money(dailyPower(state))}</span></div>` +
    `<div class="row"><span class="row-main">Wages, day ${due.wages}</span>` +
    `<span class="row-figure">${money(weeklyWageBill(state))}</span></div>` +
    `<div class="row"><span class="row-main">Monthly bills, day ${due.monthly}</span>` +
    '<span class="row-figure">salaries, software, waste</span></div>' +
    `<h3>Ledger, last ${LEDGER_VISIBLE_ENTRIES}</h3>` +
    ledger +
    `<p class="hint">${button('copyState', 'Copy state as JSON')}</p>`
  );
}
