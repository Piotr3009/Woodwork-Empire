// The decision modal. The clock is stopped while it is open (CLAUDE.md 6.2).

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

export function renderEvent(state: GameState, event: GameEvent): string {
  const equipmentId = event.data.equipmentId;
  const machine =
    typeof equipmentId === 'string'
      ? state.equipment.find((item) => item.id === equipmentId) ?? null
      : null;
  const key = whyKeyForEvent(event.kind, machine?.specId ?? '');
  const note = key === null ? '' : ` ${whyLink(state, key)}`;
  return `<p class="event-body">${escapeHtml(event.body)}${note}</p>`;
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
