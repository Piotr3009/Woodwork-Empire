// The month end modal in the folder skin (CLAUDE.md T13 3.20). Phase A: a stub; phase B1 builds
// the report over the ledger.

import type { GameEvent, GameState } from '../engine/index';
import { escapeHtml } from './modal';

export function renderMonthEnd(state: GameState, event: GameEvent): string {
  void state;
  return `<p class="event-body">${escapeHtml(event.body)}</p>`;
}
