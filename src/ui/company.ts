// The company board on the office wall: how the company is doing, week by week, and what the hall
// is turning out this minute (PIOTR, 13.09: "a company board on the office wall, week by week with
// plus and minus, and a column for the company's output, 0.7, and why"; CLAUDE.md T9 3.10).
//
// Two columns and nothing else. The left one is the reputation log read a week at a time, newest
// first; the right one is the output breakdown, plus in one column and minus in the other, with
// the line that adds them up.

import { DAY_CATEGORY_LABELS, REPUTATION_START } from '../engine/constants';
import { companyTotals, dayPercentages, outputBreakdown, weekOfDay } from '../engine/index';
import type { DayLogEntry, GameState, OutputLine, ReputationEntry } from '../engine/index';
import { emptyLine, escapeHtml } from './modal';

/** Points as the board writes them: a sign on every one of them, and never more than two places. */
export function points(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  const text = String(Math.abs(rounded));
  return `${rounded < 0 ? '−' : '+'}${text}`;
}

interface Week {
  week: number;
  fromDay: number;
  toDay: number;
  entries: ReputationEntry[];
  total: number;
}

/** The log cut into weeks, newest first. A week with nothing in it is not drawn: the board says
 *  what happened, not what did not. */
export function weeksOf(state: GameState): Week[] {
  const byWeek = new Map<number, Week>();
  for (const entry of state.reputationLog) {
    const week = weekOfDay(entry.day);
    const found = byWeek.get(week) ?? {
      week,
      fromDay: entry.day,
      toDay: entry.day,
      entries: [],
      total: 0,
    };
    found.fromDay = Math.min(found.fromDay, entry.day);
    found.toDay = Math.max(found.toDay, entry.day);
    found.entries.push(entry);
    found.total = Math.round((found.total + entry.points) * 100) / 100;
    byWeek.set(week, found);
  }
  return Array.from(byWeek.values()).sort((left, right) => right.week - left.week);
}

function weekHtml(week: Week): string {
  const rows = week.entries
    .map(
      (entry) =>
        '<div class="row board-line"><span class="row-main">' +
        `${escapeHtml(entry.reason)}</span>` +
        `<span class="row-figure">day ${entry.day}</span>` +
        `<span class="row-figure ${entry.points < 0 ? 'bad' : 'good'}">` +
        `${escapeHtml(points(entry.points))}</span></div>`,
    )
    .join('');
  return (
    `<div class="board-week"><h4>Week ${week.week}, day ${week.fromDay} to ${week.toDay}` +
    `<span class="${week.total < 0 ? 'bad' : 'good'}"> ${escapeHtml(points(week.total))}` +
    `</span></h4>${rows}</div>`
  );
}

function outputRow(line: OutputLine): string {
  const where = line.where === '' ? '' : `<span class="row-figure dim">${escapeHtml(line.where)}</span>`;
  return (
    '<div class="row board-line"><span class="row-main">' +
    `${escapeHtml(line.label)}</span>${where}` +
    `<span class="row-figure ${line.points < 0 ? 'bad' : 'good'}">` +
    `${escapeHtml(points(line.points))}</span></div>`
  );
}

/** The week the clock is in, and what the reputation has done in it. */
function thisWeek(state: GameState): { week: number; total: number } {
  const week = weekOfDay(state.clock.day);
  const total = state.reputationLog
    .filter((entry) => weekOfDay(entry.day) === week)
    .reduce((sum, entry) => Math.round((sum + entry.points) * 100) / 100, 0);
  return { week, total };
}

/** How the week went, in the same seven bands as the top bar and the evening's plate. The state
 *  carries the last seven days of the owner's own day (CLAUDE.md T11 3.1, 3.5). */
function weekShares(state: GameState): string {
  const segments: DayLogEntry[] = [];
  for (const day of state.dayLogs) segments.push(...day.segments);
  segments.push(...state.owner.dayLog);
  const shares = dayPercentages(segments);
  if (shares.length === 0) return '';
  return shares
    .map((share) => `${DAY_CATEGORY_LABELS[share.category]} ${share.percent}%`)
    .join(' · ');
}

export function renderCompany(state: GameState): string {
  const weeks = weeksOf(state);
  const breakdown = outputBreakdown(state);
  const hall = breakdown.lines.filter((line) => line.hall);
  const elsewhere = breakdown.lines.filter((line) => !line.hall);
  const sum =
    `${breakdown.base.toFixed(2)} base ${points(breakdown.plus)} ${points(breakdown.minus)} = ` +
    `${breakdown.total.toFixed(2)}`;
  const week = thisWeek(state);
  const shares = weekShares(state);
  const totals = companyTotals(state);
  // The picture is the modal (SPRITES.md 11): the company name and the week on the felt above the
  // sheet, the output and its two columns on the pinned sheet, and the two totals under both in
  // letters you can read across the room (PIOTR, 15.09; CLAUDE.md T11 3.5).
  return (
    '<div class="felt">' +
    '<div class="felt-head">' +
    `<span class="felt-name">${escapeHtml(state.companyName)}</span>` +
    `<span class="felt-week">Week ${week.week} · ${escapeHtml(points(week.total))}</span>` +
    (shares === '' ? '' : `<span class="felt-shares">${escapeHtml(shares)}</span>`) +
    '<div class="felt-weeks">' +
    (weeks.length === 0
      ? emptyLine('Nothing has moved the reputation yet.')
      : weeks.map(weekHtml).join('')) +
    '</div></div>' +
    '<div class="felt-sheet">' +
    '<h3>Company output</h3>' +
    `<p class="figures"><strong>${breakdown.total.toFixed(2)}</strong> of a hall with nothing ` +
    'wrong with it. Every minute of production is multiplied by it.</p>' +
    '<div class="board-columns">' +
    '<section class="board-column">' +
    hall.map(outputRow).join('') +
    `<p class="figures">${escapeHtml(sum)}</p>` +
    '</section>' +
    '<section class="board-column">' +
    '<h4>And what the men and the machines are worth</h4>' +
    '<p class="hint">These act where they are: on his minutes, or on the stage that machine ' +
    'does. They are not in the number above and are never counted twice.</p>' +
    (elsewhere.length === 0
      ? emptyLine('Nobody on the books and no machines in the hall.')
      : elsewhere.map(outputRow).join('')) +
    '</section></div>' +
    `<p class="hint">Reputation started at ${REPUTATION_START}.</p>` +
    '</div>' +
    '<div class="felt-totals">' +
    `<span class="felt-total" data-total="reputation">${escapeHtml(totals.reputation)}</span>` +
    `<span class="felt-total" data-total="output">${escapeHtml(totals.output)}</span>` +
    '</div></div>'
  );
}
