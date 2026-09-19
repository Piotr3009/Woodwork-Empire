// The decision modal. The clock is stopped while it is open (CLAUDE.md 6.2).
//
// One event has a card of its own in here: the bankruptcy, which is the last thing the company ever
// says (CLAUDE.md T21 2.2; docs/mockups/t21/debt.html part 3). It stays the event it always was, in
// the folder skin with the one cross, and the drawing's dark card is a card inside it.

import { MARGIN_GOOD, MARGIN_THIN } from '../engine/constants';
import { formatCalendarDay, workingDaysBetween } from '../engine/index';
import type { GameEvent, GameState } from '../engine/index';
import { button, escapeHtml, money, plural, primaryButton, whyLink } from './modal';

/** The real life note that belongs with each kind of decision (CLAUDE.md T2 3.12). */
const WHY_BY_EVENT: Partial<Record<GameEvent['kind'], string>> = {
  lateAccounts: 'lateAccounts',
  lowStock: 'lowStock',
  noMaterial: 'lowStock',
  serviceDue: 'service',
  jobAtGate: 'finishedGoods',
  monthlyBills: 'rates',
};

/** A machine that gave up is a service note, unless it is the extraction itself (T2 3.12). */
export function whyKeyForEvent(kind: GameEvent['kind'], specId = ''): string | null {
  if (kind === 'machineBroken') return specId === 'extractor' ? 'extractor' : 'service';
  return WHY_BY_EVENT[kind] ?? null;
}

/** The margin the client's number leaves, after the offer it is about: the game's green over
 *  `MARGIN_GOOD`, its red under `MARGIN_THIN`, the body colour between. The figure itself is the
 *  engine's, off `marginOfPrice`, and rides on the event; this only puts a colour on it
 *  (PIOTR accepted, 17.09; CLAUDE.md T18 2.9). */
function marginTail(event: GameEvent): string {
  if (event.kind !== 'clientOffer') return '';
  const margin = event.data.margin;
  if (typeof margin !== 'number') return '';
  const tone = margin > MARGIN_GOOD ? ' good' : margin < MARGIN_THIN ? ' bad' : '';
  const figure = `margin ${Math.round(margin * 100)}%`;
  return ` <span class="figure${tone}" data-margin="${Math.round(margin * 100)}">${escapeHtml(figure)}</span>`;
}

/** The three figures the engine was looking at when it closed the company, as a two column grid.
 *  They ride on the event (`declareBankruptcy`), so the card prints what the bank read and cannot
 *  work out a different sum a minute later. The third is not money: it is the run of days the
 *  account stood under the limit, against the run the bank allows, which is the other of the two
 *  rules that close a company (CLAUDE.md T21 2.2, T22 2.2). */
function bankFigures(event: GameEvent): string {
  const rows: Array<[string, string]> = [
    ['In the bank', money(numberOn(event, 'cash'))],
    ['The bank allowed', money(numberOn(event, 'allowed'))],
    [
      'Days below the limit',
      `${numberOn(event, 'daysBelow')} of ${numberOn(event, 'daysAllowed')}`,
    ],
  ];
  return (
    '<div class="bank-figs">' +
    rows
      .map(([label, value]) => `<span>${escapeHtml(label)}</span><b>${escapeHtml(value)}</b>`)
      .join('') +
    '</div>'
  );
}

/** A figure off the event, or nought: the data is a bag of JSON and the card asks it for numbers. */
function numberOn(event: GameEvent, key: string): number {
  const found = event.data[key];
  return typeof found === 'number' ? found : 0;
}

/** What the company did with the time it had: the working days it stood, the orders it took and how
 *  many of them it built. Read off the state the way the game over screen reads its own line: the
 *  jobs are the jobs on the books, and one that was dropped is off them (CLAUDE.md T21 2.2). */
function bankEpitaph(state: GameState, day: number): string {
  const kept = workingDaysBetween(0, day);
  const taken = state.jobs.reduce((total, job) => total + job.price, 0);
  const built = state.jobs.filter((job) => job.finishedDay !== null).length;
  return (
    `<p class="bank-kept">You kept the workshop ${plural(kept, 'working day', 'working days')}, ` +
    `took ${money(taken)} in orders and built ${built} of them.</p>`
  );
}

/** The end (CLAUDE.md T21 2.2; docs/mockups/t21/debt.html part 3). The head, the day it happened and
 *  the rule that closed the company, the figures, and what the company did with its time. */
export function renderBankruptcyCard(state: GameState, event: GameEvent): string {
  const day = numberOn(event, 'day') || state.clock.day;
  const month = numberOn(event, 'month');
  const reason = state.gameOver?.reason ?? event.body;
  return (
    '<div class="bank-card">' +
    '<h3>The bank has closed you</h3>' +
    `<p class="bank-when">${escapeHtml(formatCalendarDay(day))}, month ${month}. ` +
    `${escapeHtml(reason)}</p>` +
    bankFigures(event) +
    bankEpitaph(state, day) +
    // The picker behind "Load a save" is the browser's, and this is the input it opens: the same
    // field the Menu carries, so the one path that reads a save file reads this one too.
    '<input type="file" accept=".json" data-field="saveFile" aria-label="Load a save file" />' +
    '</div>'
  );
}

export function renderEvent(state: GameState, event: GameEvent): string {
  if (event.kind === 'bankruptcy') return renderBankruptcyCard(state, event);
  const equipmentId = event.data.equipmentId;
  const machine =
    typeof equipmentId === 'string'
      ? state.equipment.find((item) => item.id === equipmentId) ?? null
      : null;
  const key = whyKeyForEvent(event.kind, machine?.specId ?? '');
  const note = key === null ? '' : ` ${whyLink(state, key)}`;
  return `<p class="event-body">${escapeHtml(event.body)}${marginTail(event)}${note}</p>`;
}

export function renderEventFooter(event: GameEvent): string {
  // The two ways out of the end of the company, in the words of the drawing: a new company, or a
  // save from before it went wrong. Both are the actions the game already has, the Start screen's
  // and the Menu's (CLAUDE.md T21 2.2).
  if (event.kind === 'bankruptcy') {
    return (
      '<div class="choices">' +
      primaryButton('restart', 'Start again') +
      button('loadFromFile', 'Load a save') +
      '</div>'
    );
  }
  const choices = event.choices
    .map(
      (choice, index) =>
        `<button class="btn${index === 0 ? ' btn-primary' : ''}" data-do="resolveEvent" ` +
        `data-id="${choice.id}">${escapeHtml(choice.label)}</button>`,
    )
    .join('');
  return `<div class="choices">${choices}</div>`;
}
