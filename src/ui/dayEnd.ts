// The end of day summary, and the game over screen (CLAUDE.md 10.1).

import { MINUTES_PER_WORKING_DAY } from '../engine/constants';
import { deliveriesArrivingOn, dustBand, findJob, netOf } from '../engine/index';
import type { GameState } from '../engine/index';
import { escapeHtml, minutes, money } from './modal';

export function renderDayEnd(state: GameState): string {
  const used = state.owner.minutesByCategory;
  const jobs = state.dayStats.jobsCompleted
    .map((jobId) => findJob(state, jobId)?.name ?? jobId)
    .map((name) => escapeHtml(name))
    .join(', ');
  const advanced = state.dayStats.jobsAdvanced.length;
  const tomorrow = deliveriesArrivingOn(state, state.clock.day + 1)
    .map((delivery) => `${delivery.sheets} sheets`)
    .join(', ');
  const net = netOf(state.finance.day);
  return (
    '<div class="cols">' +
    '<div class="col"><h3>Your minutes</h3>' +
    row('Admin', minutes(used.admin)) +
    row('Design', minutes(used.design)) +
    row('Workshop', minutes(used.workshop)) +
    row('Worked', `${minutes(state.owner.minutesWorked)} of ${minutes(MINUTES_PER_WORKING_DAY)}`) +
    (state.owner.overtimeMinutes > 0
      ? row('Overtime', minutes(state.owner.overtimeMinutes))
      : '') +
    '</div>' +
    '<div class="col"><h3>Money</h3>' +
    row('In', money(state.finance.day.income)) +
    row('Out', money(-state.finance.day.costs)) +
    row('Net', money(net)) +
    row('In the bank', money(state.cash)) +
    '</div>' +
    '<div class="col"><h3>The hall</h3>' +
    row('Jobs moved on', String(advanced)) +
    row('Jobs finished', jobs === '' ? 'none' : jobs) +
    row(
      'Dust',
      `${dustBand(state.dust).label}, opened ${dustBand(state.dayStats.dustAtStart).label}`,
    ) +
    row('Tomorrow', tomorrow === '' ? 'no deliveries' : tomorrow) +
    '</div></div>' +
    (state.owner.fatigue > 0
      ? `<p class="warn">Tomorrow starts ${(state.owner.fatigue * 100).toFixed(0)}% down on ` +
        'efficiency after that overtime.</p>'
      : '')
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
    `<p class="figures">You lasted ${day} days and ended on ${money(state.cash)} ` +
    `with a reputation of ${state.reputation.toFixed(2)}.</p>` +
    '<button class="btn btn-primary btn-big" data-do="restart">Start again</button>' +
    '</div></div>'
  );
}
