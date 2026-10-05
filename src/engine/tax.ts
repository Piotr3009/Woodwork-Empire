/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// The taxman (PIOTR, 03.10 and 04.10; CLAUDE.md T27 2.2, 2.3). Once a calendar year, when 30
// December opens, a quarter of the cash in the account goes, before anything else of the day is
// charged and whether the day is worked or not. It looks at the account and nothing else: not the
// profit, the stock, the machines, the loan or the deposits clients have paid for work not yet
// made. That is Piotr's rule as he gave it, and it is what makes December a decision: money spent
// on the workshop before the 30th is money the taxman does not see.
//
// On the first working day of December the player is told, with the figure as the account stands,
// and the warning strip says it every day after until the tax is booked. The books remember the
// year each was done for (`finance.taxPaidForYear`, `finance.taxWarnedForYear`), so neither is
// ever done twice for one year, and a save is only ever charged on a 30 December it plays through.

import { MONTH_NAMES, TAX_DAY_OF_MONTH, TAX_MONTH, TAX_RATE } from './constants';
import { calendarMonthIndex, calendarYearOf, dayOfMonth, monthOfDay } from './clock';
// The tax is booked with the one signed entry every pound goes through. The two modules import each
// other and use what they import inside their functions only, as finance.ts does, so the cycle is
// safe.
import { charge, formatMoney } from './economy';
import { queueEvent } from './events';
import { lastDayToSpendSentence } from './closures';
import type { GameState } from './types';

/** The day the taxman comes in words, `30 December`, the way every line of the tax says it. */
export function taxDayWords(): string {
  return `${TAX_DAY_OF_MONTH} ${MONTH_NAMES[TAX_MONTH]}`;
}

/** The share in words, `25%`. */
function shareWords(): string {
  return `${Math.round(TAX_RATE * 100)}%`;
}

/** True on any day of December. */
export function isTaxMonth(day: number): boolean {
  return calendarMonthIndex(monthOfDay(day)) === TAX_MONTH;
}

/** True on 30 December of any year. */
export function isTaxDay(day: number): boolean {
  return isTaxMonth(day) && dayOfMonth(day) === TAX_DAY_OF_MONTH;
}

/** What the taxman takes of this much in the account: a quarter of it to the pound, and nothing
 *  at all from an account at nought or under it (CLAUDE.md T27 2.2) [TUNE: Piotr has not said
 *  what an account under nought owes; nothing is taken from it]. */
export function taxOn(cash: number): number {
  return cash > 0 ? Math.round(cash * TAX_RATE) : 0;
}

/** The open of 30 December, the first thing of the day's money (`runDayCosts`), for a weekend day
 *  as for a working one: a quarter of the cash as it stands that moment, one ledger line, `Tax
 *  for 2025`, and the card that says it the first time the player is at the page. The year is
 *  settled whether or not there was anything to take, so the same day opened twice pays once;
 *  nothing is booked and nothing is said when the account is at nought or under. */
export function runTaxDay(state: GameState, day: number): void {
  if (!isTaxDay(day)) return;
  const year = calendarYearOf(day);
  if (state.finance.taxPaidForYear === year) return;
  state.finance.taxPaidForYear = year;
  const cash = state.cash;
  const amount = taxOn(cash);
  if (amount <= 0) return;
  charge(state, 'tax', `Tax for ${year}`, -amount, { unavoidable: true });
  queueEvent(state, {
    kind: 'taxPaid',
    title: `Tax for ${year}`,
    body:
      `The taxman took ${shareWords()} of the ${formatMoney(cash)} in the account: ` +
      `${formatMoney(amount)}.`,
    data: { year, cash: Math.round(cash), amount },
  });
}

/** The warning, raised at the open of a working day in December, once a year: on the first
 *  working day of the month, and on the next open of a save that came into December without it.
 *  Nothing is said once the year's tax is settled. The figure is the tax on the account as it
 *  stands at that open (CLAUDE.md T27 2.3). */
export function raiseTaxWarning(state: GameState): void {
  const day = state.clock.day;
  if (!isTaxMonth(day)) return;
  const year = calendarYearOf(day);
  if (state.finance.taxWarnedForYear === year || state.finance.taxPaidForYear === year) return;
  state.finance.taxWarnedForYear = year;
  const amount = taxOn(state.cash);
  const figure =
    amount > 0 ? `: ${formatMoney(amount)} as it stands today.` : '. Nothing as it stands today.';
  queueEvent(state, {
    kind: 'taxComing',
    title: 'Tax is coming',
    body:
      `On ${taxDayWords()} the taxman takes ${shareWords()} of whatever is in the account` +
      `${figure} Money spent on machines or on the workshop before then is not taxed. ` +
      // The workshop closes on the 22nd, so the last day money can be spent is the last working
      // day before it (CLAUDE.md T28 2.2, item 5).
      lastDayToSpendSentence(day) +
      'Invest, or pay.',
    data: { year, amount },
  });
}

/** The warning strip's line, from the warning to the tax and only while there is cash to tax, or
 *  null: `Tax on 30 December: 25% of the account, £12,000 as it stands` (CLAUDE.md T27 2.3). */
export function taxComingLine(state: GameState): string | null {
  const day = state.clock.day;
  if (!isTaxMonth(day)) return null;
  const year = calendarYearOf(day);
  if (state.finance.taxWarnedForYear !== year || state.finance.taxPaidForYear === year) return null;
  const amount = taxOn(state.cash);
  if (amount <= 0) return null;
  return (
    `Tax on ${taxDayWords()}: ${shareWords()} of the account, ${formatMoney(amount)} as it ` +
    'stands'
  );
}
