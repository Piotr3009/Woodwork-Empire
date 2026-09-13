// The company board on the office wall: how the company is doing, week by week, and what the hall
// is turning out this minute (PIOTR, 13.09: "a company board on the office wall, week by week with
// plus and minus, and a column for the company's output, 0.7, and why"; CLAUDE.md T9 3.10).
//
// Two columns and nothing else. The left one is the reputation log read a week at a time, newest
// first; the right one is the output breakdown, plus in one column and minus in the other, with
// the line that adds them up.

import { REPUTATION_START } from '../engine/constants';
import { formatReputation, outputBreakdown, weekOfDay } from '../engine/index';
import type { GameState, OutputLine, ReputationEntry } from '../engine/index';
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

export function renderCompany(state: GameState): string {
  const weeks = weeksOf(state);
  const breakdown = outputBreakdown(state);
  const hall = breakdown.lines.filter((line) => line.hall);
  const elsewhere = breakdown.lines.filter((line) => !line.hall);
  const sum =
    `${breakdown.base.toFixed(2)} base ${points(breakdown.plus)} ${points(breakdown.minus)} = ` +
    `${breakdown.total.toFixed(2)}`;
  return (
    '<div class="board-columns">' +
    '<section class="board-column"><h3>Week by week</h3>' +
    '<p class="hint">Every point of reputation the company has gained or lost, and what for.</p>' +
    (weeks.length === 0
      ? emptyLine('Nothing has moved the reputation yet.')
      : weeks.map(weekHtml).join('')) +
    `<p class="figures"><strong>Reputation now ${escapeHtml(formatReputation(state.reputation))}` +
    `</strong> (started at ${REPUTATION_START})</p>` +
    '</section>' +
    '<section class="board-column"><h3>Company output</h3>' +
    `<p class="figures"><strong>${breakdown.total.toFixed(2)}</strong> of a hall with nothing ` +
    'wrong with it. Every minute of production is multiplied by it.</p>' +
    hall.map(outputRow).join('') +
    `<p class="figures">${escapeHtml(sum)}</p>` +
    '<h4>And what the men and the machines are worth</h4>' +
    '<p class="hint">These act where they are: on his minutes, or on the stage that machine ' +
    'does. They are not in the number above and are never counted twice.</p>' +
    (elsewhere.length === 0
      ? emptyLine('Nobody on the books and no machines in the hall.')
      : elsewhere.map(outputRow).join('')) +
    '</section></div>'
  );
}
