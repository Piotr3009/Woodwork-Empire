// The decision modal. The clock is stopped while it is open (CLAUDE.md 6.2).

import { MARGIN_GOOD, MARGIN_THIN } from '../engine/constants';
import type { GameEvent, GameState } from '../engine/index';
import { escapeHtml, whyLink } from './modal';

/** The real life note that belongs with each kind of decision (CLAUDE.md T2 3.12). */
const WHY_BY_EVENT: Partial<Record<GameEvent['kind'], string>> = {
  arrearsWarning: 'arrearsInterest',
  arrearsFinalWarning: 'arrearsInterest',
  bailiff: 'bailiff',
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

export function renderEvent(state: GameState, event: GameEvent): string {
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
  const choices = event.choices
    .map(
      (choice, index) =>
        `<button class="btn${index === 0 ? ' btn-primary' : ''}" data-do="resolveEvent" ` +
        `data-id="${choice.id}">${escapeHtml(choice.label)}</button>`,
    )
    .join('');
  return `<div class="choices">${choices}</div>`;
}
