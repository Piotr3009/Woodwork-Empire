// The Premises page of the laptop (PIOTR, 03.10; v67): the unit the company rents, in one line,
// and the two things that can be done to it, each a card in the skin the advertising agency's
// card wears. Extend the unit: the builder's price and the landlord's deposit, what it adds and
// what every running cost becomes, and the one button. Enlarge the canteen: no charge, what it is
// and what it becomes, and the button greyed with the reason beside it until the extension is
// open and the floor beside the canteen is clear.
//
// Every figure on the page is the engine's (`src/engine/premises.ts`): the page holds none.

import { crewLimit } from '../engine/layout';
import {
  canteenTerms,
  enlargeCanteenCheck,
  extendUnitCheck,
  extensionTerms,
} from '../engine/premises';
import type { GameState } from '../engine/index';
import { button, escapeHtml, lockedButton, money, reasonLabel } from './modal';

/** A floor by its two sides, the way the page writes one: `40 × 10 m`. */
function bySides(width: number, depth: number): string {
  return `${width} × ${depth} m`;
}

/** One card: its name, the price line with what follows the price, the line under it in the dim
 *  ink, and the control on the right. */
function card(
  id: string,
  title: string,
  price: string,
  after: string,
  text: string,
  control: string,
): string {
  return (
    `<div class="card agency-card" data-premises="${id}"><div class="card-main">` +
    `<h3>${escapeHtml(title)}</h3>` +
    `<p class="figures"><strong>${escapeHtml(price)}</strong>${escapeHtml(after)}</p>` +
    `<p class="figures dim">${escapeHtml(text)}</p>` +
    `</div><div class="card-action">${control}</div></div>`
  );
}

/** A button greyed with its reason written beside it: the page says why in words, not in a
 *  tooltip the player has to find. */
function greyed(label: string, reason: string): string {
  return `${lockedButton(label, reason)} ${reasonLabel(reason)}`;
}

const DONE = '<span class="badge badge-held">Done</span>';

/** The unit as it stands, with the crew and the benches it has room for. */
function unitRoomLine(state: GameState): string {
  return `room for ${crewLimit(state)} joiners and ${state.unit.benchSlots} benches`;
}

function extendCard(state: GameState): string {
  const unit = state.unit;
  if (unit.extension === 'open') {
    return card('extend', 'Extend the unit', 'Extended', '', `${unit.areaM2} m², ${unitRoomLine(state)}.`, DONE);
  }
  const terms = extensionTerms(state);
  const becomes =
    `${terms.areaM2} m², ${bySides(terms.widthCells, terms.depthCells)}, room for ` +
    `${terms.joiners} joiners and ${terms.benches} benches.`;
  if (unit.extension === 'building') {
    return card(
      'extend',
      'Extend the unit',
      'Being built',
      ' · paid for. It opens the next working morning.',
      becomes,
      '<span class="badge badge-held">Paid</span>',
    );
  }
  const check = extendUnitCheck(state);
  const deposit = terms.deposit > 0 ? `and ${money(terms.deposit)} more deposit. ` : '';
  // A security firm charges by the area, so its month goes up with the floor: said only to a
  // company that has one.
  const security =
    terms.securityThen > terms.securityNow
      ? ` The security firm charges by the area: ${money(terms.securityNow)} → ` +
        `${money(terms.securityThen)} a month.`
      : '';
  return card(
    'extend',
    'Extend the unit',
    money(terms.price),
    ` · ${deposit}Needs ${money(terms.total)} in the account.`,
    `Adds ${terms.addsM2} m² to the right of the hall: ` +
      `${bySides(terms.widthCells, terms.depthCells)}, ready the next morning. Room for ` +
      `${terms.joiners} joiners and ${terms.benches} benches. Rent ${money(terms.rentNow)} → ` +
      `${money(terms.rentThen)} a month, rates ${money(terms.ratesNow)} → ` +
      `${money(terms.ratesThen)}, standing power ${money(terms.powerNow)} → ` +
      `${money(terms.powerThen)} a day.${security}`,
    check.ok ? button('extendUnit', 'Extend') : greyed('Extend', check.reason),
  );
}

function canteenCard(state: GameState): string {
  const terms = canteenTerms(state);
  if (state.unit.canteenWide) {
    return card(
      'canteen',
      'Enlarge the canteen',
      'Enlarged',
      '',
      `${terms.areaNow} m², ${terms.lockersNow} lockers.`,
      DONE,
    );
  }
  const check = enlargeCanteenCheck(state);
  return card(
    'canteen',
    'Enlarge the canteen',
    'No charge',
    ' · comes with the extension',
    `${terms.areaNow} m² and ${terms.lockersNow} lockers today. Enlarged, it is ` +
      `${terms.areaThen} m² and holds ${terms.lockersThen} lockers. It grows ${terms.grows} m ` +
      `along the rear wall, so the ${bySides(terms.clear.width, terms.clear.depth)} beside it has ` +
      'to be clear first.',
    check.ok ? button('enlargeCanteen', 'Enlarge') : greyed('Enlarge', check.reason),
  );
}

export function renderPremises(state: GameState): string {
  const unit = state.unit;
  return (
    `<p class="hint">The unit you rent: ${unit.areaM2} m², ` +
    `${escapeHtml(bySides(unit.widthCells, unit.depthCells))}. Rent ${money(unit.rentMonthly)} a ` +
    `month, rates ${money(unit.ratesMonthly)} a month.</p>` +
    '<h3>Unit</h3>' +
    extendCard(state) +
    '<h3>Canteen</h3>' +
    canteenCard(state)
  );
}
