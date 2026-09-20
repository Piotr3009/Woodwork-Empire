// The month end modal in the folder skin (CLAUDE.md T13 3.20): every line a sum from the ledger's
// dated lines for the month, the net, and the cash at open and close. The engine adds it up in
// `monthReport`; this prints it, every signed figure in the colour its sign gives it, and every
// line printed whether or not anything moved on it, so the report always has the same shape.
//
// From Turn 22 there is no row under the cash for the bills that went unpaid, because no bill goes
// unpaid: a cost the player did not choose comes out of the account whatever the balance, so it is
// on a line of the report like every other pound (CLAUDE.md T22 2.1, 2.4).

import { monthName, monthOfDay, monthlyReportFor } from '../engine/index';
import type { MonthlyReport } from '../engine/index';
import type { MonthEfficiency } from '../engine/efficiency';
import type { MachineSavings } from '../engine/machines';
import type { WorkshopRate } from '../engine/rate';
import { plural } from '../engine/text';
import type { GameEvent, GameState, MonthLine, MonthReport } from '../engine/index';
import { escapeHtml, money, signClass, signedMoney } from './modal';

function figure(value: number, tone: string): string {
  return `<span class="row-figure${tone === '' ? '' : ` ${tone}`}">${signedMoney(value)}</span>`;
}

function lineRow(line: MonthLine): string {
  return (
    `<div class="row month-line" data-line="${line.id}">` +
    `<span class="row-main">${escapeHtml(line.label)}</span>` +
    figure(line.income, line.income > 0 ? 'good' : '') +
    figure(-line.costs, line.costs > 0 ? 'bad' : '') +
    figure(line.net, signClass(line.net)) +
    '</div>'
  );
}

function totalRow(label: string, value: number, extra = ''): string {
  return (
    `<div class="row is-total month-total${extra === '' ? '' : ` ${extra}`}">` +
    `<span class="row-main">${escapeHtml(label)}</span>` +
    figure(value, signClass(value)) +
    '</div>'
  );
}

function cashRow(label: string, value: number, key: string): string {
  return (
    `<div class="row month-cash" data-cash="${key}"><span class="row-main">${escapeHtml(label)}</span>` +
    `<span class="row-figure${value < 0 ? ' bad' : ''}">${money(value)}</span></div>`
  );
}

/** The report the engine adds up, printed. */
export function renderMonthReport(report: MonthReport): string {
  const head =
    '<div class="row month-head"><span class="row-main"></span>' +
    '<span class="row-figure">In</span><span class="row-figure">Out</span>' +
    '<span class="row-figure">Net</span></div>';
  return (
    `<div class="month-end" data-month="${report.month}">` +
    `<h3>${monthName(report.month)}</h3>` +
    head +
    report.lines.map(lineRow).join('') +
    totalRow('In', report.income) +
    totalRow('Out', -report.costs) +
    totalRow('Net for the month', report.net, 'month-net') +
    cashRow('Cash at the open', report.cashOpen, 'open') +
    cashRow('Cash at the close', report.cashClose, 'close') +
    '</div>'
  );
}

/** Hours as the report writes them. */
function hours(value: number): string {
  return `${Math.round(value * 10) / 10} h`;
}

/** One line of the efficiency section: what it is, what it is made of under it, and the figure. */
function efficiencyRow(key: string, label: string, under: string, figure: string): string {
  return (
    `<div class="row month-efficiency-line" data-efficiency="${key}">` +
    `<span class="row-main">${escapeHtml(label)}` +
    (under === '' ? '' : `<small>${escapeHtml(under)}</small>`) +
    '</span>' +
    `<span class="row-figure">${escapeHtml(figure)}</span></div>`
  );
}

/** The first line of the month end: what the workshop earned for every hour it paid for, over
 *  the month (CLAUDE.md T17 2.26). The same function the Company board prints. */
export function renderRateLine(rate: WorkshopRate): string {
  const beside: string[] = [];
  if (rate.days > 0) {
    beside.push(`per man ${money(rate.perMan)}`);
    beside.push(`${plural(Math.round(rate.paidHours), 'hour', 'hours')} paid for`);
  }
  const big =
    rate.days === 0
      ? 'The workshop earned nothing an hour'
      : `Workshop earned ${money(rate.rate)} an hour`;
  return (
    '<div class="rate-figure">' +
    `<span class="rate-big">${escapeHtml(big)}</span>` +
    (beside.length === 0 ? '' : `<span class="rate-side">${escapeHtml(beside.join(' · '))}</span>`) +
    '</div>'
  );
}

/** Total efficiency: the machines, the people, the hall and the waiting of the month, and the one
 *  line that is the month's real work over the hours it paid for (CLAUDE.md T17 2.25). */
export function renderMonthEfficiency(month: MonthEfficiency, machines: MachineSavings): string {
  const top = machines.rows
    .filter((row) => row.minutesSaved > 0)
    .slice(0, 3)
    .map((row) => row.name);
  const waiting = month.waiting
    .filter((line) => line.minutes > 0)
    .map((line) => `${line.label} ${line.percent}%`)
    .join(' · ');
  return (
    '<div class="month-efficiency">' +
    '<h3>Total efficiency</h3>' +
    efficiencyRow(
      'machines',
      'Machines',
      top.length === 0 ? 'nobody stood at one this month' : top.join(' · '),
      `ran ${hours(machines.hours)}, saved ${hours(machines.hoursSaved)}`,
    ) +
    efficiencyRow(
      'people',
      'People',
      `${money(month.labour)} of labour, each at his own rate`,
      `${hours(month.workedHours)} of real work out of ${hours(month.paidHours)} paid for`,
    ) +
    efficiencyRow(
      'hall',
      'The hall',
      'dust, the gate, the extraction and who was in, averaged over the month',
      month.hallFactor.toFixed(2),
    ) +
    efficiencyRow(
      'waiting',
      'Waiting',
      waiting === '' ? 'nothing was waited on' : waiting,
      `${Math.round(month.waitingMinutes)} minutes lost`,
    ) +
    '<div class="row is-total month-total" data-efficiency="total">' +
    '<span class="row-main">Total efficiency</span>' +
    `<span class="row-figure">${month.percent}% = real work over paid hours</span></div>` +
    '</div>'
  );
}

/** One month's card, drawn from the figures the month was written down in. The one function: the
 *  modal the month end raises and a month opened from Accounting's Monthly reports tab a year
 *  later are the same drawing of the same data, which is the whole point of storing it
 *  [PIOTR, 20.09] (CLAUDE.md T23 2.14). The line under the rate is the event's own words at the
 *  month end and nothing at all when a stored report is opened, because there is no event then. */
export function renderMonthlyReport(entry: MonthlyReport, body = ''): string {
  return (
    renderRateLine(entry.rate) +
    (body === '' ? '' : `<p class="event-body">${escapeHtml(body)}</p>`) +
    renderMonthReport(entry.report) +
    renderMonthEfficiency(entry.efficiency, entry.savings)
  );
}

export function renderMonthEnd(state: GameState, event: GameEvent): string {
  const asked =
    typeof event.data.month === 'number' ? event.data.month : monthOfDay(state.clock.day) - 1;
  const month = Math.max(1, asked);
  // The month the card is raised for is the month that was just written down, so the card is
  // drawn from the stored report where there is one and worked out on the spot where there is
  // not, which is a v35 save lifted into this build (CLAUDE.md T23 2.14, section 4).
  const stored = state.monthlyReports.find((entry) => entry.month === month) ?? null;
  return renderMonthlyReport(stored ?? monthlyReportFor(state, month), event.body);
}
