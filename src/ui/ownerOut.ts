// The one line under the top bar while the owner is out of the workshop, and the one button that
// runs the clock through the rest of it (PIOTR, 13.09; CLAUDE.md T8 3.3). A holiday is the same
// line without the button: there is nothing to skip ahead to, the manager has the hall
// (CLAUDE.md T13 3.9).

import { ownerIsAvailable, ownerOutTask, skippedTask } from '../engine/index';
import type { GameState } from '../engine/index';
import { onHoliday } from '../engine/index';
import { escapeHtml, plural } from './modal';

/** The line while the owner is on holiday: how long for, today included, and who has the hall. */
function holidayLine(current: GameState): string {
  const left = current.owner.holidayDaysRemaining;
  return (
    '<div class="owner-out holiday">' +
    `<span>Owner is away: on holiday, ${plural(left, 'working day', 'working days')} left, ` +
    'today included. The production manager has the hall.</span></div>'
  );
}

/** The line under the top bar while the owner is out: what he is doing, how far through it he
 *  is, and the one button that runs the clock through the rest of it (CLAUDE.md T8 3.3). */
export function renderOwnerOut(current: GameState): string {
  if (onHoliday(current)) return holidayLine(current);
  const skipping = skippedTask(current);
  const task = ownerOutTask(current) ?? skipping;
  if (task === null) return '';
  const spent = Math.round(task.minutesTotal - task.minutesRemaining);
  const total = Math.round(task.minutesTotal);
  // A trip the clock ran out of day on is picked up in the morning, and the counter carries on
  // from where it stopped (CLAUDE.md T8 3.3).
  const tomorrow = ownerIsAvailable(current) ? '' : ' He is back on it in the morning.';
  const action =
    skipping !== null
      ? '<span class="reason">Skipping ahead</span>'
      : '<button class="btn" data-do="skipAhead">Skip ahead</button>';
  return (
    '<div class="owner-out">' +
    `<span>Owner is out: ${escapeHtml(task.label)}, ${spent} of ${total} min.` +
    `${escapeHtml(tomorrow)}</span>${action}</div>`
  );
}
