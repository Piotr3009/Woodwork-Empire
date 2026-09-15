// The end of day summary, and the game over screen (CLAUDE.md 10.1).

import {
  DAY_CATEGORY_LABELS,
  cubicMetres,
  dayPercentages,
  daySummaryOf,
  dustBand,
  earnedRate,
  formatReputation,
  summaryOfDay,
} from '../engine/index';
import type { DaySummary, GameState, SummaryCadence } from '../engine/index';
import { days, escapeHtml, minutes, money, plural } from './modal';

/** The three cadences in the words the player reads, in the order they are offered. */
const CADENCES: Array<[SummaryCadence, string]> = [
  ['daily', 'every day'],
  ['weekly', 'every week'],
  ['monthly', 'every month'],
];

/** The one control for how often this summary is put in front of him. It lives here and in the
 *  Menu, which are two entries to the same preference (CLAUDE.md T4 3.6). */
export function cadenceControl(state: GameState): string {
  const chips = CADENCES.map(
    ([cadence, label]) =>
      `<button class="chip${state.summaryCadence === cadence ? ' is-on' : ''}" ` +
      `data-do="setCadence" data-id="${cadence}">${escapeHtml(label)}</button>`,
  ).join('');
  return `<p class="hint">Show this: ${chips}</p>`;
}

/** What the money column is headed. Which figures it carries is the engine's to say, not the
 *  UI's; the owner's minutes and the day's work are a day's figures whatever the cadence, and
 *  their headings say so, because the state keeps no weekly count of them (T4 3.6). */
const SPAN_LABELS: Record<SummaryCadence, string> = {
  daily: 'today',
  weekly: 'this week',
  monthly: 'this month',
};

/** The plate at the top of the summary: the day, what it went on, and what the day came to in
 *  minutes (CLAUDE.md T11 3.1). The shares are the same seven bands the top bar paints, and they
 *  always come to a hundred. */
function dayPlate(summary: DaySummary): string {
  const shares = dayPercentages(summary.dayLog);
  const line =
    shares.length === 0
      ? 'Nothing on the clock today'
      : shares
          .map((share) => `${DAY_CATEGORY_LABELS[share.category]} ${share.percent}%`)
          .join(' · ');
  return (
    '<div class="day-plate">' +
    `<h3>Day ${summary.day} done</h3>` +
    `<p class="day-shares">${escapeHtml(line)}</p>` +
    `<p class="day-figures">${summary.minutesWorked} of ${summary.minutesAvailable} min · ` +
    `overtime ${summary.overtimeMinutes}</p>` +
    '</div>'
  );
}

/** The one component the evening and the Days tab both put on the screen: the summary of a day,
 *  out of the record the engine wrote when that day closed (CLAUDE.md T6 3.9). */
export function renderDaySummary(
  summary: DaySummary,
  options: { earnedRate?: number; cadence?: string } = {},
): string {
  const used = summary.minutesByCategory;
  const jobs = summary.jobsCompleted.map((name) => escapeHtml(name)).join(', ');
  const tomorrow = summary.deliveriesTomorrow
    .map((sheets) => plural(sheets, 'sheet', 'sheets'))
    .join(', ');
  const label = SPAN_LABELS[summary.spanLabel as SummaryCadence] ?? 'today';
  const net = summary.income - summary.costs;
  const rate =
    options.earnedRate === undefined
      ? ''
      : row('Earned labour rate', `${money(options.earnedRate)} / h`);
  return (
    dayPlate(summary) +
    '<div class="cols">' +
    `<div class="col"><h3>Your minutes, day ${summary.day}</h3>` +
    row('Admin', minutes(used.admin)) +
    row('Design', minutes(used.design)) +
    row('Workshop', minutes(used.workshop)) +
    row('Worked', `${minutes(summary.minutesWorked)} of ${minutes(summary.minutesAvailable)}`) +
    (summary.overtimeMinutes > 0 ? row('Overtime', minutes(summary.overtimeMinutes)) : '') +
    rate +
    '</div>' +
    `<div class="col"><h3>Money ${escapeHtml(label)}</h3>` +
    row('In', money(summary.income)) +
    row('Out', money(-summary.costs)) +
    row('Net', money(net)) +
    row('In the bank', money(summary.cash)) +
    '</div>' +
    `<div class="col"><h3>The hall, day ${summary.day}</h3>` +
    row('Jobs moved on', String(summary.jobsAdvanced)) +
    row('Jobs finished', jobs === '' ? 'none' : jobs) +
    row(
      'Dust',
      `${dustBand(summary.dustAtEnd).label}, opened ${dustBand(summary.dustAtStart).label}`,
    ) +
    // What the machines made that day, in the one unit dust is written in (CLAUDE.md T12 3.4).
    row('Dust made today', cubicMetres(summary.dustMadeM3, 2)) +
    row('Next day', tomorrow === '' ? 'no deliveries' : tomorrow) +
    '</div></div>' +
    tomorrowLine(summary) +
    (options.cadence ?? '')
  );
}

/** The evening's own summary. It is the record the day wrote when it closed, the same one the
 *  Days tab opens later, so the two can never say different things (CLAUDE.md T6 3.9). The day
 *  as it stands is only used before there is a record, which is never in play. */
export function renderDayEnd(state: GameState): string {
  return renderDaySummary(summaryOfDay(state, state.clock.day) ?? daySummaryOf(state), {
    earnedRate: earnedRate(state, 'day'),
    cadence: cadenceControl(state),
  });
}

/** What the day cost the next one: the overtime debt and the hour he worked through, as the one
 *  number they come to (CLAUDE.md T6 3.4). */
function tomorrowLine(summary: DaySummary): string {
  if (summary.tomorrowFactor >= 1) return '';
  return (
    `<p class="warn">The next day starts at ${summary.tomorrowFactor.toFixed(2)} of your ` +
    `output: ${summary.overtimeMinutes > 0 ? 'that overtime' : 'the overtime this week'}` +
    `${summary.breakSkipped ? ' and the dinner you worked through' : ''}.</p>`
  );
}

function row(label: string, value: string): string {
  return (
    `<div class="row"><span class="row-main">${escapeHtml(label)}</span>` +
    `<span class="row-figure">${escapeHtml(value)}</span></div>`
  );
}

export function renderGameOver(state: GameState): string {
  const reason = state.gameOver?.reason ?? 'It is over.';
  const day = state.gameOver?.day ?? state.clock.day;
  return (
    '<div class="start"><div class="panel start-panel">' +
    '<h1>Finished</h1>' +
    `<p class="lead">${escapeHtml(reason)}</p>` +
    `<p class="figures">You lasted ${days(day)} and ended on ${money(state.cash)} ` +
    `with a reputation of ${formatReputation(state.reputation)}.</p>` +
    '<button class="btn btn-primary btn-big" data-do="restart">Start again</button>' +
    '</div></div>'
  );
}
