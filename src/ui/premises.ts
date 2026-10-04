// The Premises page of the laptop (PIOTR, 03.10; v67): the unit the company rents, in one line,
// and the things that can be done to it, each a card in the skin the advertising agency's card
// wears. Extend the unit: the builder's price and the landlord's deposit, what it adds and what
// every running cost becomes, and the one button. Once that extension is open, a second card of
// the same kind under it for the 400 m2 along the front (PIOTR, 04.10; v82). Enlarge the canteen:
// no charge, what it is and what it becomes, and the button greyed with the reason beside it
// until the extension is open and the floor beside the canteen is clear.
//
// Every figure on the page is the engine's (`src/engine/premises.ts`): the page holds none.

import { crewLimit } from '../engine/layout';
import {
  type ExtensionTerms,
  canteenTerms,
  enlargeCanteenCheck,
  extendUnitCheck,
  extensionStatus,
  extensionTerms,
} from '../engine/premises';
import type { ExtensionStage, GameState } from '../engine/index';
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

/** What a running cost becomes, where the extension moves it: ` Insurance £90 → £180 a month.`,
 *  and nothing for a cost the company does not pay or the extension leaves alone. */
function moved(name: string, now: number, then: number): string {
  return then > now ? ` ${name} ${money(now)} → ${money(then)} a month.` : '';
}

/** The card of the first extension, offered: what the mockup of 03.10 says, word for word. */
function firstOffer(terms: ExtensionTerms): string {
  return (
    `Adds ${terms.addsM2} m² to the right of the hall: ` +
    `${bySides(terms.widthCells, terms.depthCells)}, ready the next morning. Room for ` +
    `${terms.joiners} joiners and ${terms.benches} benches. Rent ${money(terms.rentNow)} → ` +
    `${money(terms.rentThen)} a month, rates ${money(terms.ratesNow)} → ` +
    `${money(terms.ratesThen)}, standing power ${money(terms.powerNow)} → ` +
    `${money(terms.powerThen)} a day.` +
    // A security firm charges by the area, so its month goes up with the floor: said only to a
    // company that has one.
    moved('The security firm charges by the area:', terms.securityNow, terms.securityThen)
  );
}

/** The card of the second, offered: the same figures, the lockers the bigger unit's canteen
 *  holds, and the two costs this extension doubles that the first left alone (v82). */
function secondOffer(terms: ExtensionTerms): string {
  return (
    `Adds ${terms.addsM2} m² along the front of the hall: ` +
    `${bySides(terms.widthCells, terms.depthCells)}, ready the next morning. Room for ` +
    `${terms.joiners} joiners and ${terms.benches} benches, and ${terms.lockers} lockers in ` +
    `the enlarged canteen. Rent ${money(terms.rentNow)} → ${money(terms.rentThen)} a month, ` +
    `rates ${money(terms.ratesNow)} → ${money(terms.ratesThen)}, standing power ` +
    `${money(terms.powerNow)} → ${money(terms.powerThen)} a day.` +
    moved('Insurance', terms.insuranceNow, terms.insuranceThen) +
    moved('Security', terms.securityNow, terms.securityThen)
  );
}

/** One extension's card: offered with its price, being built, or done. The second names the unit
 *  it makes, so the two cards are told apart at a glance. */
function extendCard(state: GameState, stage: ExtensionStage): string {
  const unit = state.unit;
  const status = extensionStatus(unit, stage);
  const id = stage === 'first' ? 'extend' : 'extendSecond';
  // An open stage has no terms: the unit is what it is.
  const area = status === 'open' ? unit.areaM2 : extensionTerms(state, stage).areaM2;
  const title = stage === 'first' ? 'Extend the unit' : `Extend the unit to ${area} m²`;
  if (status === 'open') {
    // The unit as it stands is said once, on the card of the last extension it has had.
    const last = stage === 'second' || extensionStatus(unit, 'second') !== 'open';
    const text = last
      ? `${unit.areaM2} m², ${unitRoomLine(state)}.`
      : 'The first extension, to the right of the hall.';
    return card(id, title, 'Extended', '', text, DONE);
  }
  const terms = extensionTerms(state, stage);
  if (status === 'building') {
    return card(
      id,
      title,
      'Being built',
      ' · paid for. It opens the next working morning.',
      `${terms.areaM2} m², ${bySides(terms.widthCells, terms.depthCells)}, room for ` +
        `${terms.joiners} joiners and ${terms.benches} benches.`,
      '<span class="badge badge-held">Paid</span>',
    );
  }
  const check = extendUnitCheck(state, stage);
  const deposit = terms.deposit > 0 ? `and ${money(terms.deposit)} more deposit. ` : '';
  return card(
    id,
    title,
    money(terms.price),
    ` · ${deposit}Needs ${money(terms.total)} in the account.`,
    stage === 'first' ? firstOffer(terms) : secondOffer(terms),
    check.ok
      ? button('extendUnit', 'Extend', stage === 'second' ? 'data-stage="second"' : '')
      : greyed('Extend', check.reason),
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
    extendCard(state, 'first') +
    // The second is along the front of an extended unit, so it is offered once the first is open.
    (unit.extension === 'open' ? extendCard(state, 'second') : '') +
    '<h3>Canteen</h3>' +
    canteenCard(state)
  );
}
