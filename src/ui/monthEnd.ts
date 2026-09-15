// The month end modal in the folder skin (CLAUDE.md T13 3.20): every line a sum from the ledger's
// dated lines for the month, the net, and the cash at open and close. The engine adds it up in
// `monthReport`; this prints it, every signed figure in the colour its sign gives it, and every
// line printed whether or not anything moved on it, so the report always has the same shape.

import { monthOfDay, monthReport } from '../engine/index';
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
  const unpaid =
    report.unpaid > 0
      ? `<p class="warn">${money(report.unpaid)} of bills went to the arrears instead of out of the ` +
        'bank, and is not in the lines.</p>'
      : '';
  return (
    `<div class="month-end" data-month="${report.month}">` +
    `<h3>Month ${report.month}</h3>` +
    head +
    report.lines.map(lineRow).join('') +
    totalRow('In', report.income) +
    totalRow('Out', -report.costs) +
    totalRow('Net for the month', report.net, 'month-net') +
    cashRow('Cash at the open', report.cashOpen, 'open') +
    cashRow('Cash at the close', report.cashClose, 'close') +
    unpaid +
    '</div>'
  );
}

export function renderMonthEnd(state: GameState, event: GameEvent): string {
  const month =
    typeof event.data.month === 'number' ? event.data.month : monthOfDay(state.clock.day) - 1;
  return (
    `<p class="event-body">${escapeHtml(event.body)}</p>` +
    renderMonthReport(monthReport(state, Math.max(1, month)))
  );
}
