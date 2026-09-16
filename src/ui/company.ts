// The company board on the office wall: how the company is doing, week by week, and what the hall
// is turning out this minute (PIOTR, 13.09: "a company board on the office wall, week by week with
// plus and minus, and a column for the company's output, 0.7, and why"; CLAUDE.md T9 3.10).
//
// Two cream sheets pinned to the felt, straight, a ledger each (PIOTR, 16.09: "one clear column
// on the left and one on the right, every plus and minus in one column and the result at the top
// over a line, like Excel"; CLAUDE.md T15 2.1). Left, Reputation: the figure at the top, every
// rating newest first with its points, the carry over from last week, and the balance at the
// bottom. Right, Output: the figure at the top, the hall's own lines and their balance, then under
// a second rule the men and the machines, which act where they are and are not in the number.
// Nothing here is computed but the fold of the log into weeks: every figure is a rating's points
// or a field of the engine's breakdown.

import { DAY_CATEGORY_LABELS } from '../engine/constants';
import {
  dayPercentages,
  effectiveReputation,
  formatReputation,
  outputBreakdown,
  weekOfDay,
} from '../engine/index';
import type {
  DayLogEntry,
  GameState,
  OutputBreakdown,
  OutputLine,
  ReputationEntry,
} from '../engine/index';
import { emptyLine, escapeHtml, signClass } from './modal';

/** Points as the board writes them: a sign on every one of them, and never more than two places. */
export function points(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  const text = String(Math.abs(rounded));
  return `${rounded < 0 ? '−' : '+'}${text}`;
}

/** Output points as the ledger writes them: a sign and two places, like the figure at the top. */
function outputPoints(value: number): string {
  return `${value < 0 ? '−' : '+'}${Math.abs(value).toFixed(2)}`;
}

/** The class a figure's sign gives it on a sheet: green above zero, red below, dim at zero. */
function tone(value: number): string {
  const sign = signClass(value);
  return sign === '' ? 'dim' : sign;
}

export interface Week {
  week: number;
  fromDay: number;
  toDay: number;
  /** Newest first, as the sheet reads them. */
  entries: ReputationEntry[];
  /** The pluses of the week, the minuses of the week, and the two together. */
  plus: number;
  minus: number;
  total: number;
}

function twoPlaces(value: number): number {
  return Math.round(value * 100) / 100;
}

/** The log cut into weeks, newest first, the entries of a week newest first too. A week with
 *  nothing in it is not drawn: the board says what happened, not what did not. */
export function weeksOf(state: GameState): Week[] {
  const byWeek = new Map<number, Week>();
  for (const entry of state.reputationLog) {
    const week = weekOfDay(entry.day);
    const found = byWeek.get(week) ?? {
      week,
      fromDay: entry.day,
      toDay: entry.day,
      entries: [],
      plus: 0,
      minus: 0,
      total: 0,
    };
    found.fromDay = Math.min(found.fromDay, entry.day);
    found.toDay = Math.max(found.toDay, entry.day);
    found.entries.unshift(entry);
    if (entry.points > 0) found.plus = twoPlaces(found.plus + entry.points);
    if (entry.points < 0) found.minus = twoPlaces(found.minus + entry.points);
    found.total = twoPlaces(found.total + entry.points);
    byWeek.set(week, found);
  }
  return Array.from(byWeek.values()).sort((left, right) => right.week - left.week);
}

/** The week the clock is in, and what the reputation has done in it, off the same fold the sheet
 *  is drawn from: two counts of one week could never disagree. */
function thisWeek(state: GameState, weeks: readonly Week[]): Week {
  const week = weekOfDay(state.clock.day);
  return (
    weeks.find((entry) => entry.week === week) ?? {
      week,
      fromDay: state.clock.day,
      toDay: state.clock.day,
      entries: [],
      plus: 0,
      minus: 0,
      total: 0,
    }
  );
}

/** How the week went, in the same seven bands as the top bar and the evening's plate. The state
 *  carries the last seven days of the owner's own day (CLAUDE.md T11 3.1, 3.5). */
function weekShares(state: GameState): string {
  const segments: DayLogEntry[] = [];
  for (const day of state.dayLogs) segments.push(...day.segments);
  // The day in progress, unless the evening has already written it down: between the day closing
  // and the next morning emptying the log it is on both, and counting it twice would weight it
  // twice (CLAUDE.md T11 3.1).
  const closed = state.dayLogs.some((day) => day.day === state.clock.day);
  if (!closed) segments.push(...state.owner.dayLog);
  const shares = dayPercentages(segments);
  if (shares.length === 0) return '';
  return shares
    .map((share) => `${DAY_CATEGORY_LABELS[share.category]} ${share.percent}%`)
    .join(' · ');
}

function pin(): string {
  return '<span class="pin" aria-hidden="true"></span>';
}

/** The total line of a sheet: the words small and dim on the left, the figure big on the right,
 *  and the rule under both. */
function totalLine(label: string, figure: string, key: string): string {
  return (
    `<div class="ledger-total"><span class="ledger-total-label">${escapeHtml(label)}</span>` +
    `<span class="ledger-total-figure" data-figure="${key}">${escapeHtml(figure)}</span></div>`
  );
}

/** One line of a ledger: what it is, a small dim second line under it when there is one, and the
 *  points on the right in the colour of their sign. */
function ledgerRow(main: string, second: string, figure: string, value: number, extra = ''): string {
  const small = second === '' ? '' : `<small>${escapeHtml(second)}</small>`;
  return (
    `<div class="ledger-row"${extra === '' ? '' : ` ${extra}`}>` +
    `<span class="ledger-main">${escapeHtml(main)}${small}</span>` +
    `<span class="ledger-points ${tone(value)}">${escapeHtml(figure)}</span></div>`
  );
}

/** The balance at the bottom of a sheet, right aligned like a spreadsheet's. */
function sumLine(plus: string, minus: string, total: string): string {
  return (
    `<div class="ledger-sum"><span data-sum="plus">${escapeHtml(plus)}</span>` +
    `<span data-sum="minus">${escapeHtml(minus)}</span>` +
    `<span data-sum="total">= ${escapeHtml(total)}</span></div>`
  );
}

/** A rating as a row: the job and the verdict, the day under it, the points on the right. A
 *  rating carries no client and no job on the log (types.ts), so the day is the whole of the
 *  second line. */
function ratingRow(entry: ReputationEntry, index: number): string {
  return ledgerRow(
    entry.reason,
    `day ${entry.day}`,
    points(entry.points),
    entry.points,
    `data-rating="${index}"`,
  );
}

/** The left sheet: the reputation now, every rating newest first, a thin label between the
 *  weeks, the carry over from last week as the last row of this one, and the balance of this
 *  week at the bottom (CLAUDE.md T15 2.1). */
function reputationSheet(state: GameState, weeks: readonly Week[]): string {
  const now = effectiveReputation(state);
  const week = thisWeek(state, weeks);
  // What the week started from: the reputation now less what this week's rows did to it, so the
  // rows add up to the figure at the top. The website's standing, while it is held, is in it.
  const carried = twoPlaces(now - week.total);
  const carryRow = ledgerRow(
    'Start of the week',
    'carried over',
    points(carried),
    carried,
    'data-carry="1"',
  );
  let index = 0;
  const groups = (weeks.some((entry) => entry.week === week.week) ? weeks : [week, ...weeks])
    .map((entry) => {
      const rows = entry.entries.map((rating) => ratingRow(rating, index++)).join('');
      return (
        `<div class="ledger-week" data-week="${entry.week}">Week ${entry.week}</div>` +
        rows +
        (entry.week === week.week ? carryRow : '')
      );
    })
    .join('');
  const plus = twoPlaces(week.plus + Math.max(carried, 0));
  const minus = twoPlaces(week.minus + Math.min(carried, 0));
  return (
    '<section class="sheet" data-sheet="reputation">' +
    pin() +
    '<h3>Reputation</h3>' +
    totalLine('this week', formatReputation(now), 'reputation') +
    '<div class="ledger-head"><span>Who said what</span><span>points</span></div>' +
    `<div class="ledger-list">${groups}</div>` +
    sumLine(points(plus), points(minus), formatReputation(now)) +
    '</section>'
  );
}

/** A line of the breakdown as a row: the hall's own carry no second line tonight, because no tip
 *  or warning of the game has matching wording for them (CLAUDE.md T15 2.1); the rest say where
 *  they act. */
function outputRow(line: OutputLine, index: number): string {
  return ledgerRow(
    line.label,
    line.where,
    outputPoints(line.points),
    line.points,
    `data-line="${line.hall ? 'hall' : 'elsewhere'}" data-index="${index}"`,
  );
}

/** The right sheet: the number every minute of production is multiplied by, the hall's lines that
 *  make it with their balance, and under a second rule the men and the machines, which act where
 *  they are and are not in the number above. The engine's breakdown is printed and nothing is
 *  computed from it (CLAUDE.md T15 0, 2.1). */
function outputSheet(breakdown: OutputBreakdown): string {
  const hall = breakdown.lines.filter((line) => line.hall);
  const elsewhere = breakdown.lines.filter((line) => !line.hall);
  const base = ledgerRow('Base', '', breakdown.base.toFixed(2), 0, 'data-line="base"');
  return (
    '<section class="sheet" data-sheet="output">' +
    pin() +
    '<h3>Output</h3>' +
    totalLine('every minute of production is multiplied by it', breakdown.total.toFixed(2), 'output') +
    '<div class="ledger-head"><span>What moves it</span><span>points</span></div>' +
    '<div class="ledger-list">' +
    base +
    hall.map(outputRow).join('') +
    sumLine(outputPoints(breakdown.plus), outputPoints(breakdown.minus), breakdown.total.toFixed(2)) +
    '<hr class="ledger-rule" />' +
    '<div class="ledger-head ledger-elsewhere">Act where they are, not in the number above</div>' +
    (elsewhere.length === 0
      ? emptyLine('Nobody on the books and no machines in the hall.')
      : elsewhere.map(outputRow).join('')) +
    '</div>' +
    '</section>'
  );
}

export function renderCompany(state: GameState): string {
  const weeks = weeksOf(state);
  const week = thisWeek(state, weeks);
  const shares = weekShares(state);
  // The felt above the sheets: the company name and the week line (CLAUDE.md T11 3.5, T15 2.1).
  return (
    '<div class="felt">' +
    '<div class="felt-head">' +
    `<span class="felt-name">${escapeHtml(state.companyName)}</span>` +
    '<span class="felt-line">' +
    `<span class="felt-week">Week ${week.week} · ${escapeHtml(points(week.total))}</span>` +
    (shares === '' ? '' : ` · <span class="felt-shares">${escapeHtml(shares)}</span>`) +
    '</span></div>' +
    `<div class="sheets">${reputationSheet(state, weeks)}${outputSheet(outputBreakdown(state))}</div>` +
    '</div>'
  );
}
