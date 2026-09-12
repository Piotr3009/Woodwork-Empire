// The team board: who can be hired, what is missing before they can start, and the crew
// (CLAUDE.md 9.3).

import { hiringOptions } from '../engine/index';
import type { GameState, HiringOption } from '../engine/index';
import {
  emptyLine,
  escapeHtml,
  minutes,
  money,
  primaryButton,
  reasonLabel,
} from './modal';

function optionRow(option: HiringOption): string {
  const wage =
    option.weeklyWage > 0
      ? `${money(option.weeklyWage)} a week`
      : `${money(option.monthlyWage)} a month`;
  const rate = option.rate > 0 ? ` · ${(option.rate * 100).toFixed(0)}% of your speed` : '';
  const missing =
    option.missing.length === 0
      ? ''
      : `<p class="lock">To make this hire possible: ${escapeHtml(option.missing.join(', '))}` +
        ` · ${money(option.missingCost)}</p>`;
  const action = option.available
    ? primaryButton(
        'hire',
        'Hire',
        `data-role="${option.role}" data-tier="${option.tier ?? ''}"`,
      )
    : reasonLabel(option.blockReason);
  return (
    `<div class="card${option.available ? '' : ' is-locked'}">` +
    `<div class="card-main"><h3>${escapeHtml(option.label)}</h3>` +
    `<p class="figures">${escapeHtml(wage)}${escapeHtml(rate)}</p>` +
    (option.available ? '' : `<p class="lock">${escapeHtml(option.blockReason)}</p>`) +
    missing +
    `</div><div class="card-action">${action}</div></div>`
  );
}

export function renderHiring(state: GameState): string {
  const crew = state.workers
    .map((worker) => {
      const job = worker.jobId === null ? null : state.jobs.find((entry) => entry.id === worker.jobId);
      const doing =
        worker.absentDaysRemaining > 0
          ? `off for ${worker.absentDaysRemaining} more days`
          : worker.startDay > state.clock.day
            ? `starts day ${worker.startDay}`
            : worker.taskId !== null
              ? 'on a job of work'
              : job
                ? `on ${job.name}`
                : 'free';
      const wage =
        worker.weeklyWage > 0
          ? `${money(worker.weeklyWage)} a week`
          : `${money(worker.monthlyWage)} a month`;
      return (
        `<div class="row"><span class="row-main">${escapeHtml(worker.name)}, ` +
        `${escapeHtml(worker.role)}${worker.tier === null ? '' : ` (${worker.tier})`}</span>` +
        `<span class="row-figure">${escapeHtml(doing)}</span>` +
        `<span class="row-figure">${escapeHtml(wage)}</span></div>`
      );
    })
    .join('');
  const management = state.workers.filter((worker) => worker.role === 'joiner').length * 10;
  return (
    '<h3>The crew</h3>' +
    (crew === '' ? emptyLine('Nobody yet. Every hour is your own hour.') : crew) +
    (management > 0
      ? `<p class="hint">Managing them costs you ${minutes(management)} a day.</p>`
      : '') +
    '<h3>Taking somebody on</h3>' +
    hiringOptions(state).map(optionRow).join('')
  );
}
