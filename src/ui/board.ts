// The order board: the enquiries waiting, with what is greyed out and why (CLAUDE.md 10.1).

import { canAccept, has, template } from '../engine/index';
import type { Enquiry, GameState } from '../engine/index';
import {
  days,
  emptyLine,
  escapeHtml,
  filterField,
  minutes,
  money,
  primaryButton,
  reasonLabel,
} from './modal';
import { callsForPrice, clientCallMinutes, designMinutes } from '../engine/index';

function expiryLine(state: GameState, enquiry: Enquiry): string {
  const left = enquiry.expiresOnDay - state.clock.day;
  if (left <= 0) return 'expires today';
  if (left === 1) return 'expires tomorrow';
  return `expires in ${left} days`;
}

function row(state: GameState, enquiry: Enquiry): string {
  const entry = template(enquiry.templateId);
  const allowed = canAccept(state, enquiry);
  const locked = enquiry.lockReason !== null;
  const byHand = locked && enquiry.byHandAvailable;
  const badges = [
    enquiry.express ? '<span class="badge badge-warn">Express</span>' : '',
    enquiry.bespokeMaterial ? '<span class="badge">Bespoke material</span>' : '',
    enquiry.needsMeasure ? '<span class="badge">Site measure</span>' : '',
    byHand ? '<span class="badge badge-warn">By hand, plus 50% time</span>' : '',
  ].join('');
  const action = allowed.ok
    ? primaryButton(
        'acceptEnquiry',
        byHand ? 'Take it by hand' : 'Accept',
        `data-id="${enquiry.id}" data-byhand="${byHand ? '1' : '0'}"`,
      )
    : reasonLabel(allowed.reason);
  const lockLine =
    enquiry.lockReason === null
      ? ''
      : `<p class="lock">${escapeHtml(enquiry.lockReason)}</p>`;
  const calls = callsForPrice(enquiry.price);
  return (
    `<div class="card${locked ? ' is-locked' : ''}">` +
    `<div class="card-main"><h3>${escapeHtml(enquiry.name)}</h3>` +
    `<p class="figures"><strong>${money(enquiry.price)}</strong>` +
    ` · ${escapeHtml(enquiry.finish)}` +
    ` · deadline ${days(enquiry.deadlineDays)}` +
    ` · ${escapeHtml(expiryLine(state, enquiry))}</p>` +
    `<p class="figures dim">${calls} calls of ${minutes(clientCallMinutes(enquiry.price))}` +
    ` · drawing ${minutes(designMinutes(entry, enquiry.sizeMultiplier, state.software.tier))}` +
    ` · size ${enquiry.sizeMultiplier.toFixed(2)}</p>` +
    `<p class="badges">${badges}</p>${lockLine}</div>` +
    `<div class="card-action">${action}</div>` +
    '</div>'
  );
}

export function renderBoard(state: GameState, filter: string): string {
  // The laptop is what the enquiries come in on (CLAUDE.md 9.2).
  if (!has(state, 'laptop')) {
    return emptyLine('The enquiries come in by email. Buy a laptop from the catalogue first.');
  }
  const needle = filter.trim().toLowerCase();
  const shown = state.enquiries.filter(
    (enquiry) => needle === '' || enquiry.name.toLowerCase().includes(needle),
  );
  const list =
    shown.length === 0
      ? emptyLine(
          state.enquiries.length === 0
            ? 'Nothing on the board. A better reputation brings more work.'
            : 'Nothing matches that.',
        )
      : shown.map((enquiry) => row(state, enquiry)).join('');
  return (
    filterField('board', filter, 'Filter by name') +
    `<p class="hint">Reputation ${state.reputation.toFixed(2)}. ` +
    `${state.enquiries.length} enquiries waiting.</p>` +
    list
  );
}
