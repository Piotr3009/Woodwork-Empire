// The order board: a full page of tiles, one per enquiry, with everything the owner needs to
// choose between them (CLAUDE.md T2 3.2).

import {
  boardsCostOf,
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
import { NO_INSURANCE_REASON } from '../engine/constants';
// Straight off its own module, not round the public API, which Turn 13 froze (REPORT-T13 10).
import { bigJobCheck, bigJobLine, isBigJob } from '../engine/agency';
import { wantedKit } from '../engine/catalog';
import { effectiveReputation } from '../engine/index';
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

/** What the workshop has to have to take this job on, in plain names: the machines, and a
 *  window's or a door's cutter set after them, which it needs exactly as it needs a machine
 *  (CLAUDE.md T28 2.6). The whole list, owned or not and whatever stands in (CLAUDE.md T29
 *  2.5.4). */
function toolsLine(enquiry: Enquiry): string {
  const entry = template(enquiry.templateId);
  const names = wantedKit(entry).map((specId) => findSpec(specId)?.name ?? specId);
  return names.length === 0 ? 'nothing special' : names.join(', ').toLowerCase();
}

/** Where the reason on a greyed tile takes the player: the page that would put it right
 *  (PIOTR, 13.09; CLAUDE.md T10 3.7). A reason nothing can be bought or hired for has no link. */
function blockLink(enquiry: Enquiry): string {
  if (enquiry.blockWhere === 'catalogue') {
    return button('openModal', 'Open the catalogue', 'data-modal="catalogue"');
  }
  // The team is a page of the laptop (CLAUDE.md T15 2.3).
  if (enquiry.blockWhere === 'team') {
    return button('laptopPage', 'Open the team', 'data-id="team"');
  }
  // The covers are bought on the laptop, under Admin (CLAUDE.md T13 3.15).
  if (enquiry.blockReason === NO_INSURANCE_REASON) {
    return button('openModal', 'Open the laptop', 'data-modal="laptop"');
  }
  return '';
}

function tile(state: GameState, enquiry: Enquiry): string {
  const allowed = canAccept(state, enquiry);
  const locked = enquiry.lockReason !== null;
  const byHand = !enquiry.unreachable && locked && enquiry.byHandAvailable;
  // The boards the job will hold: a window's glass comes from the glazier and is no sheet on the
  // rack, so its share is not counted (CLAUDE.md T28 2.9).
  const timber = template(enquiry.templateId).cutters !== null;
  const sheets = sheetsForCost(boardsCostOf(materialCostFor(enquiry.basePrice, enquiry.bespokeMaterial), timber));
  // Days of his own time with the machines standing in the hall now, which is the same number
  // the deadline is worked out from (CLAUDE.md T6 3.7).
  const ownerDays =
    Math.round(
      ownerDaysFor(
        state,
        labourValueFor(enquiry.basePrice),
        enquiry.materialKind,
        false,
        timber,
      ) * 10,
    ) / 10;
  // A rush is not a warning: Express is the accent orange at the top right (CLAUDE.md T15 2.2).
  const express = enquiry.express
    ? '<span class="badge badge-express tile-flag">Express</span>'
    : '';
  const badges = [
    // Commercial work says so on the tile, and it is the kind of the job, not a warning
    // (CLAUDE.md T13 3.15, T15 2.2).
    enquiry.kind === 'commercial' ? '<span class="badge badge-kind">Commercial</span>' : '',
    // The warnings, in the game's red so they can be read (PIOTR, 16.09; CLAUDE.md T15 2.2).
    enquiry.bespokeMaterial ? '<span class="badge">Bespoke material</span>' : '',
    enquiry.needsMeasure ? '<span class="badge">Site measure</span>' : '',
    byHand ? '<span class="badge">By hand, plus 50% time</span>' : '',
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
  // A big job of the agency's says what it wants of the crew, red until the hall has the free
  // joiners and green once it has (CLAUDE.md T26 2.13). The colour is on a span of its own: the
  // folder's paper inks every paragraph of a tile, so a colour on the paragraph never shows.
  const crewLine = isBigJob(enquiry)
    ? '<p class="tile-figures" data-big-job="crew">' +
      `<span class="${bigJobCheck(state, enquiry).ok ? 'good' : 'bad'}">${escapeHtml(bigJobLine(state, enquiry))}</span></p>`
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
    crewLine +
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
