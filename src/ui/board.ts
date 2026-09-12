// The order board: a full page of tiles, one per enquiry, with everything the owner needs to
// choose between them (CLAUDE.md T2 3.2).

import {
  canAccept,
  findSpec,
  formatReputation,
  has,
  labourValueFor,
  materialCostFor,
  ownerDaysFor,
  sheetsForCost,
  template,
} from '../engine/index';
import type { Enquiry, GameState } from '../engine/index';
import {
  button,
  days,
  emptyLine,
  escapeHtml,
  filterField,
  money,
  plural,
} from './modal';

function expiryLine(state: GameState, enquiry: Enquiry): string {
  const left = enquiry.expiresOnDay - state.clock.day;
  if (left <= 0) return 'expires today';
  if (left === 1) return 'expires tomorrow';
  return `expires in ${days(left)}`;
}

/** What the workshop has to have to take this job on, in plain names. */
function toolsLine(enquiry: Enquiry): string {
  const names = template(enquiry.templateId).requiredEquipment.map(
    (specId) => findSpec(specId)?.name ?? specId,
  );
  return names.length === 0 ? 'nothing special' : names.join(', ').toLowerCase();
}

function tile(state: GameState, enquiry: Enquiry): string {
  const allowed = canAccept(state, enquiry);
  const locked = enquiry.lockReason !== null;
  const byHand = locked && enquiry.byHandAvailable;
  const sheets = sheetsForCost(materialCostFor(enquiry.basePrice, enquiry.bespokeMaterial));
  const ownerDays = ownerDaysFor(labourValueFor(enquiry.basePrice));
  const express = enquiry.express ? '<span class="badge badge-warn tile-flag">Express</span>' : '';
  const badges = [
    enquiry.bespokeMaterial ? '<span class="badge">Bespoke material</span>' : '',
    enquiry.needsMeasure ? '<span class="badge">Site measure</span>' : '',
    byHand ? '<span class="badge badge-warn">By hand, plus 50% time</span>' : '',
  ].join('');
  const action = allowed.ok
    ? button(
        'acceptEnquiry',
        byHand ? 'Accept, by hand, plus 50% time' : 'Accept',
        `data-id="${enquiry.id}" data-byhand="${byHand ? '1' : '0'}"`,
      )
    : '';
  const lockLine =
    enquiry.lockReason === null ? '' : `<p class="lock">${escapeHtml(enquiry.lockReason)}</p>`;
  return (
    `<div class="tile${locked ? ' is-locked' : ''}" data-enquiry="${enquiry.id}">` +
    express +
    `<h3 class="tile-name">${escapeHtml(enquiry.name)}</h3>` +
    `<p class="tile-price">${money(enquiry.price)}</p>` +
    `<p class="tile-figures">${escapeHtml(enquiry.finish)} · deadline ` +
    `${days(enquiry.deadlineDays)} · ${escapeHtml(expiryLine(state, enquiry))}</p>` +
    `<p class="tile-figures">${plural(sheets, 'sheet', 'sheets')} of material · about ` +
    `${plural(ownerDays, 'owner day', 'owner days')}</p>` +
    `<p class="tile-figures">Needs ${escapeHtml(toolsLine(enquiry))}</p>` +
    `<p class="badges">${badges}</p>` +
    lockLine +
    `<div class="tile-action">${action}</div>` +
    '</div>'
  );
}

export function renderBoard(state: GameState, filter: string): string {
  // The laptop is what the enquiries come in on (CLAUDE.md 9.2).
  if (!has(state, 'laptop')) {
    return emptyLine('The enquiries come in by email. Buy a laptop from the catalogue first.');
  }
  const head =
    `<p class="hint">Reputation ${formatReputation(state.reputation)} · ` +
    `${plural(state.enquiries.length, 'enquiry', 'enquiries')} waiting.</p>`;
  if (state.enquiries.length === 0) {
    return head + emptyLine('Nothing on the board. Reputation brings enquiries.');
  }
  const needle = filter.trim().toLowerCase();
  const shown = state.enquiries.filter(
    (enquiry) => needle === '' || enquiry.name.toLowerCase().includes(needle),
  );
  const grid =
    shown.length === 0
      ? emptyLine('Nothing matches that.')
      : `<div class="tile-grid">${shown.map((enquiry) => tile(state, enquiry)).join('')}</div>`;
  return head + filterField('board', filter, 'Filter by name') + grid;
}
