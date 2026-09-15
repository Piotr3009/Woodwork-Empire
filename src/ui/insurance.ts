// The Insurance tab of the laptop, under Admin (CLAUDE.md T13 3.15): each cover with its on and
// off control, the insured value and the yearly premium live, what the 1st takes, and, with the
// property cover held and no alarm, the line in red that the insurer pays nothing on a burglary.

import {
  BURGLARY_PAYOUT_DAYS,
  LIABILITY_BASE_YEARLY,
  LIABILITY_PER_EMPLOYEE_YEARLY,
  PROPERTY_INSURANCE_RATE_YEARLY,
  UNINSURED_CLAIM_MAX,
  UNINSURED_CLAIM_MIN,
} from '../engine/constants';
// T13-C1: export from index.ts
import {
  COVER_LABELS,
  coversHeld,
  firstPremiumFor,
  insuranceCheck,
  insuredMachinesValue,
  insuredStockValue,
  insuredValue,
  premiumMonthlyFor,
  premiumYearlyFor,
  propertyCoverVoid,
} from '../engine/insurance';
import type { InsuranceCover } from '../engine/insurance';
import type { GameState } from '../engine/index';
import { button, escapeHtml, lockedButton, money, plural, primaryButton, signedMoney } from './modal';

function figureRow(label: string, value: number): string {
  const tone = value < 0 ? ' bad' : value > 0 ? ' good' : '';
  return (
    `<div class="row"><span class="row-main">${escapeHtml(label)}</span>` +
    `<span class="row-figure${tone}">${signedMoney(value)}</span></div>`
  );
}

/** What the cover is written on, in words the player can check against the hall. */
function basisLine(state: GameState, cover: InsuranceCover): string {
  if (cover === 'property') {
    return (
      `Every machine at what it cost, ${money(insuredMachinesValue(state))}, and the stock at ` +
      `its value, ${money(insuredStockValue(state))}: ${money(insuredValue(state))} insured at ` +
      `${Math.round(PROPERTY_INSURANCE_RATE_YEARLY * 100)}% a year. It follows every purchase ` +
      'and every sheet.'
    );
  }
  return (
    `${money(LIABILITY_BASE_YEARLY)} a year, plus ${money(LIABILITY_PER_EMPLOYEE_YEARLY)} for each ` +
    `of the ${plural(state.workers.length, 'person', 'people')} on the books.`
  );
}

function control(state: GameState, cover: InsuranceCover): string {
  const held = state.insurance[cover];
  if (held) {
    return button('setInsurance', 'Drop the cover', `data-cover="${cover}" data-on="0"`);
  }
  const check = insuranceCheck(state, cover, true);
  const label = `Take the cover, ${money(firstPremiumFor(state, cover))} to the end of the month`;
  if (!check.ok) return lockedButton(label, check.reason);
  return primaryButton('setInsurance', label, `data-cover="${cover}" data-on="1"`);
}

function coverBlock(state: GameState, cover: InsuranceCover): string {
  const held = state.insurance[cover];
  const badge = held
    ? '<span class="badge good">Held</span>'
    : '<span class="badge badge-warn">Not held</span>';
  return (
    `<div class="insurance-line" data-cover="${cover}">` +
    `<h3>${escapeHtml(COVER_LABELS[cover])} ${badge}</h3>` +
    `<p class="hint">${escapeHtml(basisLine(state, cover))}</p>` +
    figureRow('Premium a year', -premiumYearlyFor(state, cover)) +
    figureRow('On the 1st, a twelfth', -premiumMonthlyFor(state, cover)) +
    `<div class="row"><span class="row-main"></span>` +
    `<span class="row-action">${control(state, cover)}</span></div>` +
    '</div>'
  );
}

function payoutRows(state: GameState): string {
  if (state.insurance.payouts.length === 0) return '';
  const rows = state.insurance.payouts
    .map(
      (payout) =>
        `<div class="row"><span class="row-main">${escapeHtml(payout.label)}, ` +
        `${plural(payout.daysLeft, 'day', 'days')} left</span>` +
        `<span class="row-figure good">${signedMoney(payout.perDay)} a day</span></div>`,
    )
    .join('');
  return `<h3>Payouts coming in</h3>${rows}`;
}

export function renderInsurance(state: GameState): string {
  const voidLine = propertyCoverVoid(state)
    ? '<p class="warn bad">With no alarm the insurer pays nothing on a burglary, whatever the ' +
      'premium. Buy at least the alarm on the Security tab.</p>'
    : '';
  const gate = coversHeld(state)
    ? '<p class="hint">Both covers held: commercial enquiries can be taken.</p>'
    : '<p class="hint">Commercial enquiries need both covers held. Without public liability an ' +
      `accident is a claim of ${money(UNINSURED_CLAIM_MIN)} to ${money(UNINSURED_CLAIM_MAX)}; ` +
      'without property cover a burglary takes the machines outright. With both, a burglary is ' +
      `paid out over ${plural(BURGLARY_PAYOUT_DAYS, 'day', 'days')}. Insurance never raises the ` +
      'reputation.</p>';
  return (
    coverBlock(state, 'property') +
    voidLine +
    coverBlock(state, 'liability') +
    gate +
    payoutRows(state)
  );
}
