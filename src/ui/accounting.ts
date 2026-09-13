// Accounting in three tabs: the month day by day, the totals with the earned labour rate, and the
// running ledger (CLAUDE.md 10.1, T6 3.9). Nothing arrives as a letter, it is all here.

import { LEDGER_VISIBLE_ENTRIES } from '../engine/constants';
import {
  arrearsCarryInterest,
  booksBehind,
  dailyPower,
  dailyRates,
  dailyRent,
  daysOfMonth,
  earnedRate,
  ledgerOfDay,
  netOf,
  nextDueDays,
  summaryOfDay,
  visibleTotals,
  weeklyWageBill,
} from '../engine/index';
import type { GameState, LedgerCategory, LedgerEntry, PeriodTotals } from '../engine/index';
import { button, escapeHtml, money, plural, primaryButton, whyLink } from './modal';

/** The three ways of looking at the books (CLAUDE.md T6 3.9). */
export type AccountingTab = 'days' | 'summary' | 'ledger';
const TABS: Array<[AccountingTab, string]> = [
  ['days', 'Days'],
  ['summary', 'Summary'],
  ['ledger', 'Ledger'],
];

export function accountingTabFrom(value: string | undefined): AccountingTab {
  const found = TABS.find(([id]) => id === value);
  return found ? found[0] : 'days';
}

function tabBar(tab: AccountingTab): string {
  const chips = TABS.map(
    ([id, label]) =>
      `<button class="chip${id === tab ? ' is-on' : ''}" data-do="accountingTab" ` +
      `data-id="${id}">${escapeHtml(label)}</button>`,
  ).join('');
  return `<div class="tabs">${chips}</div>`;
}

/** Plain English for every ledger category. The engine's own key is never printed (CLAUDE.md 3). */
const CATEGORY_LABELS: Record<LedgerCategory, string> = {
  rent: 'Rent',
  rates: 'Business rates',
  power: 'Power',
  living: 'Living costs',
  wages: 'Wages',
  salaries: 'Salaries',
  software: 'Software',
  waste: 'Waste collection',
  equipment: 'Equipment',
  material: 'Material',
  unitDeposit: 'Deposit on the unit',
  jobDeposit: 'Deposits from clients',
  jobBalance: 'Balances from clients',
  interest: 'Interest',
  repair: 'Repairs and service',
  ducting: 'Ducting reconnection',
  storage: 'Storage',
  taxi: 'Taxis',
  transport: 'Transport',
  accounts: 'Late accounts',
  pellets: 'Pellets sold',
  arrears: 'Arrears',
  seizure: 'Seized by the bailiff',
};

function categoryLabel(category: string): string {
  return CATEGORY_LABELS[category as LedgerCategory] ?? category;
}

/** The ledger categories that carry a real life note (CLAUDE.md T2 3.12). */
const WHY_BY_CATEGORY: Partial<Record<LedgerCategory, string>> = {
  unitDeposit: 'unitDeposit',
  rent: 'rent',
  rates: 'rates',
  jobDeposit: 'jobDeposit',
  jobBalance: 'finishedGoods',
  transport: 'finishedGoods',
  interest: 'arrearsInterest',
  accounts: 'lateAccounts',
  seizure: 'bailiff',
  repair: 'service',
};

function totalsBlock(state: GameState, title: string, totals: PeriodTotals): string {
  const lines = Object.entries(totals.byCategory)
    .filter(([, amount]) => amount !== 0)
    .sort((left, right) => left[1] - right[1])
    .map(
      ([category, amount]) =>
        `<div class="row"><span class="row-main">${escapeHtml(categoryLabel(category))}` +
        `${whyLink(state, WHY_BY_CATEGORY[category as LedgerCategory] ?? '')}</span>` +
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
    `Three months brings the bailiff.${interest}${whyLink(state, 'arrearsInterest')}</p>` +
    '<div class="row"><span class="row-main">' +
    '<input type="number" class="num" data-field="arrearsAmount" ' +
    `value="${escapeHtml(typed)}" min="1" /> to pay</span>` +
    `<span class="row-figure">${money(Math.min(wanted, finance.arrearsAmount))}</span>` +
    `<span class="row-action">${button('payArrears', 'Pay', `data-amount="${wanted}"`)}` +
    `${primaryButton('payArrears', 'Pay all', 'data-amount="all"')}</span></div>`
  );
}

function ledgerRow(entry: LedgerEntry): string {
  return (
    `<div class="row"><span class="row-main">day ${entry.day} ` +
    `${escapeHtml(entry.label)}${entry.unpaid ? ' (no cash moved)' : ''}</span>` +
    `<span class="row-figure ${entry.amount < 0 ? 'bad' : 'good'}">${money(entry.amount)}` +
    `</span><span class="row-figure dim">${money(entry.balance)}</span></div>`
  );
}

/** The month a day at a time: in, out, and what the day came to, out of the ledger itself so the
 *  two can never disagree. Every row opens on its own lines, and on the evening's summary when
 *  the state still carries it (CLAUDE.md T6 3.9). */
function daysTab(state: GameState, entries: LedgerEntry[]): string {
  const rows = daysOfMonth({ ...state, ledger: entries });
  if (rows.length === 0) return '<p class="empty">Nothing has moved this month yet.</p>';
  return rows
    .reverse()
    .map((row) => {
      const lines = ledgerOfDay({ ...state, ledger: entries }, row.day)
        .slice()
        .reverse()
        .map(ledgerRow)
        .join('');
      const summary =
        summaryOfDay(state, row.day) === null
          ? ''
          : button('openDaySummary', 'The day', `data-id="${row.day}"`);
      return (
        `<details class="day-row" data-day="${row.day}">` +
        `<summary><span class="row-main">Day ${row.day}</span>` +
        `<span class="row-figure good">${money(row.income)}</span>` +
        `<span class="row-figure bad">${money(-row.costs)}</span>` +
        `<span class="row-figure ${row.net < 0 ? 'bad' : 'good'}">${money(row.net)}</span>` +
        `<span class="row-action">${summary}</span></summary>` +
        lines +
        '</details>'
      );
    })
    .join('');
}

/** What the workshop earns for an hour of somebody's time, machines and all (CLAUDE.md T6 3.8). */
function earnedRateLine(state: GameState): string {
  return (
    '<p class="figures">Earned labour rate: today ' +
    `${money(earnedRate(state, 'day'))} / h, this week ${money(earnedRate(state, 'week'))} / h, ` +
    `this month ${money(earnedRate(state, 'month'))} / h</p>`
  );
}

export function renderAccounting(
  state: GameState,
  arrearsTyped: string,
  tab: AccountingTab,
): string {
  const due = nextDueDays(state);
  const arrears = arrearsBlock(state, arrearsTyped);
  const behind = booksBehind(state);
  const books = visibleTotals(state);
  const banner = behind
    ? `<p class="warn">Books not up to date since day ${Math.max(1, state.booksUpToDay)}. ` +
      'These are the last figures anybody wrote down. Do the bookkeeping to catch up.</p>'
    : '';
  const entries = behind
    ? state.ledger.filter((entry) => entry.day <= state.booksUpToDay)
    : state.ledger;
  const ledger = entries.slice(-LEDGER_VISIBLE_ENTRIES).reverse().map(ledgerRow).join('');
  const summaryTab =
    '<div class="cols">' +
    totalsBlock(state, 'Today', books.day) +
    totalsBlock(state, 'This week', books.week) +
    totalsBlock(state, 'This month', books.month) +
    '</div>' +
    earnedRateLine(state) +
    '<h3>What is coming</h3>' +
    `<div class="row"><span class="row-main">Rent, every day${whyLink(state, 'rent')}</span>` +
    `<span class="row-figure">${money(dailyRent(state))}</span></div>` +
    '<div class="row"><span class="row-main">Business rates, every day' +
    `${whyLink(state, 'rates')}</span>` +
    `<span class="row-figure">${money(dailyRates(state))}</span></div>` +
    `<div class="row"><span class="row-main">Power, every day</span>` +
    `<span class="row-figure">${money(dailyPower(state))}</span></div>` +
    `<div class="row"><span class="row-main">Wages, day ${due.wages}</span>` +
    `<span class="row-figure">${money(weeklyWageBill(state))}</span></div>` +
    `<div class="row"><span class="row-main">Monthly bills, day ${due.monthly}</span>` +
    '<span class="row-figure">salaries, software, waste</span></div>' +
    '';
  const ledgerTab = `<h3>Ledger, last ${LEDGER_VISIBLE_ENTRIES}</h3>` + ledger;
  const body =
    tab === 'days' ? daysTab(state, entries) : tab === 'ledger' ? ledgerTab : summaryTab;
  return (
    `<p class="figures"><strong>${money(state.cash)}</strong> in the bank. ` +
    `Overdraft limit ${money(state.finance.overdraftLimit)}. ` +
    `Deposit held by the landlord ${money(state.unit.depositHeld)}` +
    `${whyLink(state, 'depositReturn')}</p>` +
    banner +
    arrears +
    tabBar(tab) +
    body +
    `<p class="hint">${button('copyState', 'Copy state as JSON')}</p>`
  );
}
