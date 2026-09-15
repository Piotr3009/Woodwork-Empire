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
  websiteReputationBonus,
} from '../engine/index';
// T13-C1: export from index.ts
import { effectiveReputation } from '../engine/reputation';
import type { Enquiry, GameState } from '../engine/index';
import {
  button,
  days,
  emptyLine,
  escapeHtml,
  filterField,
  money,
  plural,
  signedFigure,
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

/** Where the reason on a greyed tile takes the player: the page that would put it right
 *  (PIOTR, 13.09; CLAUDE.md T10 3.7). A reason nothing can be bought or hired for has no link. */
function blockLink(enquiry: Enquiry): string {
  if (enquiry.blockWhere === 'catalogue') {
    return button('openModal', 'Open the catalogue', 'data-modal="catalogue"');
  }
  if (enquiry.blockWhere === 'team') {
    return button('openModal', 'Open the team', 'data-modal="team"');
  }
  return '';
}

function tile(state: GameState, enquiry: Enquiry): string {
  const allowed = canAccept(state, enquiry);
  const locked = enquiry.lockReason !== null;
  const byHand = !enquiry.unreachable && locked && enquiry.byHandAvailable;
  const sheets = sheetsForCost(materialCostFor(enquiry.basePrice, enquiry.bespokeMaterial));
  // Days of his own time with the machines standing in the hall now, which is the same number
  // the deadline is worked out from (CLAUDE.md T6 3.7).
  const ownerDays =
    Math.round(
      ownerDaysFor(state, labourValueFor(enquiry.basePrice), enquiry.materialKind) * 10,
    ) / 10;
  const express = enquiry.express ? '<span class="badge badge-warn tile-flag">Express</span>' : '';
  const badges = [
    enquiry.bespokeMaterial ? '<span class="badge">Bespoke material</span>' : '',
    enquiry.needsMeasure ? '<span class="badge">Site measure</span>' : '',
    byHand ? '<span class="badge badge-warn">By hand, plus 50% time</span>' : '',
  ].join('');
  // A job the company cannot take carries no Accept at all: it is on the board to be read
  // (PIOTR, 13.09; CLAUDE.md T10 3.7).
  const action = enquiry.unreachable
    ? blockLink(enquiry)
    : allowed.ok
      ? button(
          'acceptEnquiry',
          byHand ? 'Accept, by hand, plus 50% time' : 'Accept',
          `data-id="${enquiry.id}" data-byhand="${byHand ? '1' : '0'}"`,
        )
      : '';
  const lockLine = enquiry.unreachable
    ? `<p class="lock">Cannot take this: ${escapeHtml(enquiry.blockReason)}</p>`
    : enquiry.lockReason === null
      ? ''
      : `<p class="lock">${escapeHtml(enquiry.lockReason)}</p>`;
  // The figure on the tile is the client's budget; what he offers when the job is taken is a
  // number drawn inside the band, and that becomes the price (CLAUDE.md T13 3.24).
  return (
    `<div class="tile${locked || enquiry.unreachable ? ' is-locked' : ''}` +
    `${enquiry.unreachable ? ' is-out-of-reach' : ''}" data-enquiry="${enquiry.id}" ` +
    `data-kind="${enquiry.kind}">` +
    express +
    `<h3 class="tile-name">${escapeHtml(enquiry.name)}</h3>` +
    `<p class="tile-price">Budget ${money(enquiry.budget)}</p>` +
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
  const open = state.enquiries.filter((enquiry) => !enquiry.unreachable).length;
  const greyed = state.enquiries.length - open;
  // The reputation the board reads is the effective one, with the website's bonus in it while
  // the level is held (CLAUDE.md T13 3.7).
  const bonus = websiteReputationBonus(state);
  const website =
    bonus === 0 ? '' : ` The website holds ${signedFigure(`+${bonus}`, bonus)} of that.`;
  const head =
    `<p class="hint">Reputation ${formatReputation(effectiveReputation(state))} · ` +
    `${plural(open, 'enquiry', 'enquiries')} waiting` +
    `${greyed === 0 ? '' : `, and ${greyed} the workshop cannot take yet`}. ` +
    `The board is written again at 08:00 and at 13:00.${website}</p>`;
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
