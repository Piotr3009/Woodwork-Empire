// The end of day summary, and the game over screen (CLAUDE.md 10.1).

import { OVERTIME_DEBT_PER_DAY } from '../engine/constants';
import {
  deliveriesArrivingOn,
  dustBand,
  findJob,
  formatReputation,
  labourFactorFor,
  netOf,
  ownerMinutesToday,
  summaryTotals,
} from '../engine/index';
import type { GameState, SummaryCadence } from '../engine/index';
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

export function renderDayEnd(state: GameState): string {
  const used = state.owner.minutesByCategory;
  const jobs = state.dayStats.jobsCompleted
    .map((jobId) => findJob(state, jobId)?.name ?? jobId)
    .map((name) => escapeHtml(name))
    .join(', ');
  const advanced = state.dayStats.jobsAdvanced.length;
  const tomorrow = deliveriesArrivingOn(state, state.clock.day + 1)
    .map((delivery) => plural(delivery.sheets, 'sheet', 'sheets'))
    .join(', ');
  const totals = summaryTotals(state);
  const label = SPAN_LABELS[state.summaryCadence];
  const net = netOf(totals);
  return (
    '<div class="cols">' +
    '<div class="col"><h3>Your minutes today</h3>' +
    row('Admin', minutes(used.admin)) +
    row('Design', minutes(used.design)) +
    row('Workshop', minutes(used.workshop)) +
    row('Worked', `${minutes(state.owner.minutesWorked)} of ${minutes(ownerMinutesToday(state))}`) +
    (state.owner.overtimeMinutes > 0
      ? row('Overtime', minutes(state.owner.overtimeMinutes))
      : '') +
    '</div>' +
    `<div class="col"><h3>Money ${escapeHtml(label)}</h3>` +
    row('In', money(totals.income)) +
    row('Out', money(-totals.costs)) +
    row('Net', money(net)) +
    row('In the bank', money(state.cash)) +
    '</div>' +
    '<div class="col"><h3>The hall today</h3>' +
    row('Jobs moved on', String(advanced)) +
    row('Jobs finished', jobs === '' ? 'none' : jobs) +
    row(
      'Dust',
      `${dustBand(state.dust).label}, opened ${dustBand(state.dayStats.dustAtStart).label}`,
    ) +
    row('Tomorrow', tomorrow === '' ? 'no deliveries' : tomorrow) +
    '</div></div>' +
    tomorrowLine(state) +
    cadenceControl(state)
  );
}

/** What today has cost tomorrow: the overtime debt and the hour he worked through, as the one
 *  number they come to (CLAUDE.md T6 3.4). */
function tomorrowLine(state: GameState): string {
  const owner = state.owner;
  const debt = owner.overtimeDebt + (owner.overtimeMinutes > 0 ? OVERTIME_DEBT_PER_DAY : 0);
  const factor = labourFactorFor(debt, owner.breakSkipped);
  if (factor >= 1) return '';
  return (
    `<p class="warn">Tomorrow starts at ${factor.toFixed(2)} of your output: ` +
    `${owner.overtimeMinutes > 0 ? 'that overtime' : 'the overtime this week'}` +
    `${owner.breakSkipped ? ' and the dinner you worked through' : ''}.</p>`
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
