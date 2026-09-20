// Accounting in four tabs: the month day by day, the totals with the earned labour rate, the
// months the company has closed, and the bank (CLAUDE.md 10.1, T6 3.9, T23 2.14). Nothing arrives
// as a letter, it is all here.

import {
  booksBehind,
  dailyPower,
  dailyRates,
  dailyRent,
  daysOfMonth,
  earnedRate,
  formatCalendarDay,
  ledgerOfDay,
  monthName,
  monthOfDay,
  monthsOfYear,
  netOf,
  nextDueDays,
  summaryOfDay,
  visibleTotals,
  monthlyWageBill,
  yearTotals,
} from '../engine/index';
import type { GameState, LedgerCategory, LedgerEntry, PeriodTotals } from '../engine/index';
import { monthlyPremiums, nextInstalmentFor } from '../engine/index';
import { renderFinance } from './finance';
import { button, escapeHtml, money, tabBar, whyLink } from './modal';

/** The three ways of looking at the books (CLAUDE.md T6 3.9), and the loan and the overdraft
 *  (CLAUDE.md T13 3.14). The running ledger had a screen of its own until Turn 23: Piotr read it
 *  and said it was made for an accountant and not for a player, so the months the company has
 *  closed stand there instead. The ledger itself stays in the engine as the record it is, and the
 *  Days tab, the Summary tab and the bank all read it [PIOTR, 20.09] (CLAUDE.md T23 2.14). */
export type AccountingTab = 'days' | 'summary' | 'reports' | 'finance';
const TABS: Array<[AccountingTab, string]> = [
  ['days', 'Days'],
  ['summary', 'Summary'],
  ['reports', 'Monthly reports'],
  ['finance', 'Finance'],
];

export function accountingTabFrom(value: string | undefined): AccountingTab {
  const found = TABS.find(([id]) => id === value);
  return found ? found[0] : 'days';
}

/** Plain English for every ledger category. The engine's own key is never printed (CLAUDE.md 3). */
const CATEGORY_LABELS: Record<LedgerCategory, string> = {
  rent: 'Rent',
  rates: 'Business rates',
  power: 'Power',
  ownerDraw: 'Owner\u0027s draw',
  wages: 'Wages',
  wagesNight: 'Night shift wages',
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
  storage: 'Storage',
  taxi: 'Taxis',
  transport: 'Transport',
  accounts: 'Late accounts',
  pellets: 'Pellets sold',
  insurance: 'Insurance',
  security: 'Security',
  loan: 'Loan',
  loanInterest: 'Loan interest',
  overdraftInterest: 'Overdraft interest',
  contract: 'Contract work',
  website: 'Website',
  pipes: 'Extraction pipes',
  claim: 'Insurance claims and payouts',
  burglary: 'Burglary',
  other: 'Other',
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
  accounts: 'lateAccounts',
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

/** The months the company has closed, newest first, one row each. A click opens that month's card,
 *  drawn by the one function that draws it at the month end (src/ui/monthEnd.ts). The list is
 *  empty in a company that has not seen a month end yet, and in a v35 save lifted into this build
 *  [PIOTR, 20.09] (CLAUDE.md T23 2.14). */
function reportsTab(state: GameState): string {
  const months = [...state.monthlyReports].reverse();
  if (months.length === 0) {
    return '<h3>Monthly reports</h3><p class="empty">No month has closed yet.</p>';
  }
  const rows = months
    .map((entry) => {
      const net = entry.report.net;
      return (
        `<div class="row" data-report="${entry.month}">` +
        `<button class="day-toggle" data-do="openMonthlyReport" data-id="${entry.month}">` +
        `<span class="row-main">${escapeHtml(monthName(entry.month))}</span>` +
        `<span class="row-figure good">${money(entry.report.income)}</span>` +
        `<span class="row-figure bad">${money(-entry.report.costs)}</span>` +
        `<span class="row-figure ${net < 0 ? 'bad' : 'good'}">${money(net)}</span>` +
        '</button></div>'
      );
    })
    .join('');
  return `<h3>Monthly reports</h3>${rows}`;
}

function ledgerRow(entry: LedgerEntry): string {
  return (
    `<div class="row"><span class="row-main">${formatCalendarDay(entry.day)} ` +
    `${escapeHtml(entry.label)}${entry.unpaid ? ' (no cash moved)' : ''}</span>` +
    `<span class="row-figure ${entry.amount < 0 ? 'bad' : 'good'}">${money(entry.amount)}` +
    `</span><span class="row-figure dim">${money(entry.balance)}</span></div>`
  );
}

/** The month a day at a time: in, out, and what the day came to, out of the ledger itself so the
 *  two can never disagree. Every row opens on its own lines, and on the evening's summary when
 *  the state still carries it (CLAUDE.md T6 3.9).
 *
 *  Which rows are open is UI state and not a browser detail: the modal body is written again every
 *  game minute, and a `details` element would snap shut under the player every time (T3 3.4). */
/** The months of this year the books still carry, so a past one can be opened (T7 3.9). */
function monthChips(state: GameState, entries: LedgerEntry[], month: number): string {
  const months = monthsOfYear({ ...state, ledger: entries });
  if (months.length <= 1) return '';
  const chips = months
    .map(
      (row) =>
        `<button class="chip${row.month === month ? ' is-on' : ''}" ` +
        `data-do="accountingMonth" data-id="${row.month}">${monthName(row.month)}</button>`,
    )
    .join('');
  return `<div class="tabs">${chips}</div>`;
}

function daysTab(
  state: GameState,
  entries: LedgerEntry[],
  open: number[],
  month: number,
): string {
  const chips = monthChips(state, entries, month);
  const rows = daysOfMonth({ ...state, ledger: entries }, month);
  if (rows.length === 0) return `${chips}<p class="empty">Nothing has moved in ${monthName(month)}.</p>`;
  return chips + dayRows(state, entries, open, rows);
}

function dayRows(
  state: GameState,
  entries: LedgerEntry[],
  open: number[],
  rows: ReturnType<typeof daysOfMonth>,
): string {
  return rows
    .reverse()
    .map((row) => {
      const isOpen = open.includes(row.day);
      const lines = isOpen
        ? ledgerOfDay({ ...state, ledger: entries }, row.day).slice().reverse().map(ledgerRow).join('')
        : '';
      const summary =
        summaryOfDay(state, row.day) === null
          ? ''
          : button('openDaySummary', 'The day', `data-id="${row.day}"`);
      return (
        `<div class="day-row${isOpen ? ' is-open' : ''}" data-day="${row.day}">` +
        `<div class="row day-head"><button class="day-toggle" data-do="toggleDay" ` +
        `data-id="${row.day}" aria-expanded="${isOpen ? 'true' : 'false'}">` +
        `<span class="row-main">${isOpen ? '-' : '+'} ${formatCalendarDay(row.day)}</span>` +
        `<span class="row-figure good">${money(row.income)}</span>` +
        `<span class="row-figure bad">${money(-row.costs)}</span>` +
        `<span class="row-figure ${row.net < 0 ? 'bad' : 'good'}">${money(row.net)}</span>` +
        '</button>' +
        `<span class="row-action">${summary}</span></div>` +
        lines +
        '</div>'
      );
    })
    .join('');
}

/** What the 1st takes, in words: the standing items, and the loan and the covers when they are
 *  on the books (CLAUDE.md T13 3.14, 3.15). No salary line: everybody is paid by the week now and
 *  the Friday row above this one carries the whole payroll (CLAUDE.md T20 2.6). */
function monthlyBillsLine(state: GameState): string {
  const items = ['software', 'waste'];
  const loan = state.finance.loan;
  if (loan !== null) items.push(`loan instalment ${money(nextInstalmentFor(loan))}`);
  const premiums = monthlyPremiums(state);
  if (premiums > 0) items.push(`insurance ${money(premiums)}`);
  if (state.finance.overdraftInterestAccrued > 0) {
    items.push(`overdraft interest ${money(state.finance.overdraftInterestAccrued)}`);
  }
  return items.join(', ');
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
  tab: AccountingTab,
  openDays: number[] = [],
  month: number | null = null,
  loanTyped = '10000',
): string {
  const due = nextDueDays(state);
  const behind = booksBehind(state);
  const books = visibleTotals(state);
  const banner = behind
    ? `<p class="warn">Books not up to date since ${formatCalendarDay(Math.max(1, state.booksUpToDay))}. ` +
      'These are the last figures anybody wrote down. Do the bookkeeping to catch up.</p>'
    : '';
  const entries = behind
    ? state.ledger.filter((entry) => entry.day <= state.booksUpToDay)
    : state.ledger;
  const summaryTab =
    '<div class="cols">' +
    totalsBlock(state, 'Today', books.day) +
    totalsBlock(state, 'This week', books.week) +
    totalsBlock(state, 'This month', books.month) +
    // The year is added up out of the ledger the state still carries, which is what the Days tab
    // reads too, so the year and the months of it cannot disagree (CLAUDE.md T7 3.9).
    totalsBlock(state, 'This year', yearTotals({ ...state, ledger: entries })) +
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
    `<div class="row"><span class="row-main">Wages, ${formatCalendarDay(due.wages)}</span>` +
    `<span class="row-figure">${money(monthlyWageBill(state))}</span></div>` +
    `<div class="row"><span class="row-main">Monthly bills, ${formatCalendarDay(due.monthly)}</span>` +
    `<span class="row-figure">${escapeHtml(monthlyBillsLine(state))}</span></div>` +
    '';
  const body =
    tab === 'days'
      ? daysTab(state, entries, openDays, month ?? monthOfDay(state.clock.day))
      : tab === 'reports'
        ? reportsTab(state)
        : tab === 'finance'
          ? renderFinance(state, loanTyped)
          : summaryTab;
  return (
    `<p class="figures"><strong>${money(state.cash)}</strong> in the bank. ` +
    `Overdraft limit ${money(state.finance.overdraftLimit)}. ` +
    `Deposit held by the landlord ${money(state.unit.depositHeld)}` +
    `${whyLink(state, 'depositReturn')}</p>` +
    banner +
    tabBar('accountingTab', TABS, tab) +
    body +
    `<p class="hint">${button('copyState', 'Copy state as JSON')}</p>`
  );
}
