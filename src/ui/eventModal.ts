// The decision modal. The clock is stopped while it is open (CLAUDE.md 6.2).

import type { GameEvent } from '../engine/index';
import { escapeHtml } from './modal';

export function renderEvent(event: GameEvent): string {
  return `<p class="event-body">${escapeHtml(event.body)}</p>`;
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
