/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// The taxman (PIOTR, 03.10 and 04.10; CLAUDE.md T27 2.2, 2.3, section 4): a quarter of the account
// at the open of 30 December, once a year, the warning on the first working day of December, and
// the strip's line between the two. The 2025 calendar: Friday 1 December is day 271, Thursday 21
// December day 291, the last working day before the Christmas break (CLAUDE.md T28 2.2), Saturday
// 30 December day 300 inside it and Friday 6 January 2026 day 306, the first day back; in 2026,
// Wednesday 10 December is day 640, Friday 19 December day 649 and Tuesday 30 December day 660,
// closed as every 30 December now is.

import { describe, expect, it } from 'vitest';
import {
  DAY_END_MINUTE,
  SALES_CATEGORIES,
  SPEND_WARNING_CATEGORIES,
  STATE_VERSION,
  TAX_RATE,
} from '../../src/engine/constants';
import { isWorkingDay } from '../../src/engine/clock';
import { dailyPower, formatMoney, monthReport, runDayCosts } from '../../src/engine/economy';
import { migrateState } from '../../src/engine/migrate';
import { isTaxDay, runTaxDay, taxOn } from '../../src/engine/tax';
import { WARNING_ORDER, warnings } from '../../src/engine/warnings';
import { decodeSaveFile, encodeSaveFile } from '../../src/cloud/file';
import type { GameEvent, GameState, LedgerEntry } from '../../src/engine/index';
import { act, buyNow, clearEvents, eventsOfKind, newGame } from '../helpers';

function taxLines(state: GameState): LedgerEntry[] {
  return state.ledger.filter((entry) => entry.category === 'tax');
}

/** Every card the queue holds and the one that is open, the way the player would meet them. */
function cards(state: GameState): GameEvent[] {
  return [...(state.activeEvent === null ? [] : [state.activeEvent]), ...state.eventQueue];
}

/** A company standing at five o'clock of this day with this much in the account. */
function eveningOf(day: number, cash: number): GameState {
  const state = clearEvents(newGame({ difficulty: 'veryEasy' }));
  state.clock.day = day;
  state.clock.minute = DAY_END_MINUTE;
  state.monthEndShownFor = Math.floor((day - 1) / 30) + 1;
  state.cash = cash;
  return state;
}

/** The account as the 30th opened it: the balance the ledger stood at before the tax's line. */
function openOfTheThirtieth(state: GameState): number {
  const line = taxLines(state)[0];
  if (line === undefined) throw new Error('no tax booked');
  return state.ledger[state.ledger.indexOf(line) - 1]?.balance ?? 0;
}

/** Home at five, and every card of the night and the morning answered: the next working day open. */
function nextMorning(state: GameState, seen: GameEvent[] = []): GameState {
  return clearEvents(act(clearEvents(state, seen), { type: 'END_DAY' }), seen);
}

describe('the tax on 30 December (CLAUDE.md T27 2.2)', () => {
  it('falls on 30 December alone, of every year', () => {
    expect(isTaxDay(300)).toBe(true);
    expect(isTaxDay(660)).toBe(true);
    for (const day of [270, 271, 299, 301, 302, 330, 659, 661]) expect(isTaxDay(day), String(day)).toBe(false);
  });

  it('takes a quarter of the account at the open of the 30th, once, under tax, for 2025', () => {
    const seen: GameEvent[] = [];
    // Thursday 21 December at five, the last working day, the account at 48,000; the 30th is in
    // the Christmas break and the clock walks over it to Friday 6 January, charging it on the way
    // (re-dated from Friday 29 December in v83, which is closed now: CLAUDE.md T28 2.2). The eight
    // days of the break before the 30th have their rent, rates, power and draw, so the quarter is
    // of what is left of the 48,000 that morning and not of the whole of it.
    const after = nextMorning(eveningOf(291, 48000), seen);
    expect(after.clock.day).toBe(306);
    const lines = taxLines(after);
    expect(lines).toHaveLength(1);
    expect(lines[0]?.day).toBe(300);
    expect(lines[0]?.label).toBe('Tax for 2025');
    const open = openOfTheThirtieth(after);
    expect(open).toBeLessThan(48000);
    expect(lines[0]?.amount).toBe(-taxOn(open));
    // Before anything else of the day: the rent, the rates and the power of the 30th come after it.
    const ofTheDay = after.ledger.filter((entry) => entry.day === 300);
    expect(ofTheDay[0]?.category).toBe('tax');
    expect(after.finance.taxPaidForYear).toBe(2025);
    // The card, once, in the tax's own words.
    const paid = eventsOfKind(seen, 'taxPaid');
    expect(paid).toHaveLength(1);
    expect(paid[0]?.title).toBe('Tax for 2025');
    expect(paid[0]?.body).toBe(
      `The taxman took 25% of the ${formatMoney(open)} in the account: ${formatMoney(taxOn(open))}.`,
    );
    expect(paid[0]?.choices).toEqual([{ id: 'ok', label: 'Right' }]);
    expect(TAX_RATE).toBe(0.25);
    expect(taxOn(48000)).toBe(12000);
  });

  it('pays once for the same day opened twice, across a save and a load', () => {
    const after = nextMorning(eveningOf(291, 48000));
    const loaded = decodeSaveFile(encodeSaveFile(after)).state;
    if (loaded === null) throw new Error('the save did not load');
    expect(loaded.finance.taxPaidForYear).toBe(2025);
    const cash = loaded.cash;
    runTaxDay(loaded, 300);
    expect(taxLines(loaded)).toHaveLength(1);
    expect(loaded.cash).toBe(cash);
    expect(cards(loaded).filter((event) => event.kind === 'taxPaid')).toHaveLength(0);
  });

  it('takes nothing from an account at nought or under it, and says nothing', () => {
    for (const cash of [0, -3000]) {
      const seen: GameEvent[] = [];
      const after = nextMorning(eveningOf(291, cash), seen);
      expect(taxLines(after), String(cash)).toEqual([]);
      expect(eventsOfKind(seen, 'taxPaid'), String(cash)).toEqual([]);
      // The year is settled all the same, so a later pound in the account owes it nothing.
      expect(after.finance.taxPaidForYear).toBe(2025);
    }
  });

  it('does not see a machine bought on the 21st, the last day to spend: its price is out of what is taxed', () => {
    // Re-dated from the 29th in v83: the 21st is the last working day before the break (CLAUDE.md
    // T28 2.2). The saw's own power runs through the eight days to the 30th as well.
    const state = eveningOf(291, 48000);
    const bought = buyNow(state, 'tableSaw', 'standard');
    const machine = bought.ledger.filter((entry) => entry.day === 291 && entry.category === 'equipment');
    expect(machine).toHaveLength(1);
    const price = -(machine[0]?.amount ?? 0);
    expect(price).toBe(7000);
    const after = nextMorning(bought);
    const without = nextMorning(eveningOf(291, 48000));
    const sawPower = dailyPower(bought) - dailyPower(state);
    expect(openOfTheThirtieth(without) - openOfTheThirtieth(after)).toBeCloseTo(price + 8 * sawPower, 2);
    expect(taxLines(after)[0]?.amount).toBe(-Math.round(openOfTheThirtieth(after) * TAX_RATE));
  });

  it('is booked on a closed 30th every year: no working 30 December is left', () => {
    // Flipped in v83: the 30th falls in the Christmas break from 2025 on, so the tax is always
    // booked in the clock's walk over the closed days, as it was on 2025's Saturday (CLAUDE.md T28
    // 2.2). In 2026 the 30th is a Tuesday and closed; from Friday 19 December the morning is
    // Monday 6 January 2027 and the line stands on day 660.
    for (const day of [300, 660, 1020]) {
      expect(isTaxDay(day), String(day)).toBe(true);
      expect(isWorkingDay(day), String(day)).toBe(false);
    }
    const after = nextMorning(eveningOf(649, 40000));
    expect(after.clock.day).toBe(666);
    expect(taxLines(after).map((entry) => [entry.day, entry.label])).toEqual([[660, 'Tax for 2026']]);
    expect(taxLines(after)[0]?.amount).toBe(-taxOn(openOfTheThirtieth(after)));
  });

  it('is never charged for a year the save has left', () => {
    // A save in January 2026 that never saw a 30 December: nothing is owed for 2025.
    const january = eveningOf(306, 48000);
    runDayCosts(january, 307);
    expect(taxLines(january)).toEqual([]);
    expect(january.finance.taxPaidForYear).toBeNull();
  });

  it('carries its own line on December s report, drawn on the first working day of January', () => {
    const seen: GameEvent[] = [];
    const after = nextMorning(eveningOf(291, 48000), seen);
    const report = monthReport(after, 10);
    const tax = taxOn(openOfTheThirtieth(after));
    expect(report.lines.find((line) => line.id === 'tax')).toMatchObject({
      label: 'Tax',
      costs: tax,
      net: -tax,
    });
    const card = eventsOfKind(seen, 'monthEnd').find((event) => event.data.month === 10);
    expect(card?.day).toBe(306);
  });

  it('is no spending warning, no fixed cost and no sale', () => {
    expect(SPEND_WARNING_CATEGORIES as readonly string[]).not.toContain('tax');
    expect(SALES_CATEGORIES as readonly string[]).not.toContain('tax');
  });
});

describe('the warning a month before (CLAUDE.md T27 2.3)', () => {
  it('says it on the first working day of December, once, with the tax on the account that morning', () => {
    const seen: GameEvent[] = [];
    // Thursday 30 November at five: Friday 1 December is the first working day of the month.
    let state = nextMorning(eveningOf(270, 48000), seen);
    expect(state.clock.day).toBe(271);
    const coming = eventsOfKind(seen, 'taxComing');
    expect(coming).toHaveLength(1);
    expect(coming[0]?.title).toBe('Tax is coming');
    // The account that morning is the 48,000 less the day's rent, rates, power and draw.
    const figure = taxOn(state.cash);
    expect(state.cash).toBeLessThan(48000);
    expect(coming[0]?.data.amount).toBe(figure);
    expect(coming[0]?.body).toBe(
      `On 30 December the taxman takes 25% of whatever is in the account: £${figure.toLocaleString('en-GB')} as it stands today. ` +
        'Money spent on machines or on the workshop before then is not taxed. ' +
        // The workshop closes on the 22nd: the last day to spend, computed (CLAUDE.md T28 2.2).
        'The workshop is closed from 22 December, so the last day to spend is Thu 21 December. Invest, or pay.',
    );
    expect(coming[0]?.choices).toEqual([{ id: 'ok', label: 'Right' }]);
    expect(state.finance.taxWarnedForYear).toBe(2025);
    // And not again that year.
    state.clock.minute = DAY_END_MINUTE;
    state = nextMorning(state, seen);
    expect(state.clock.day).toBe(274);
    expect(eventsOfKind(seen, 'taxComing')).toHaveLength(1);
  });

  it('reads nothing as it stands with the account at nought or under', () => {
    const seen: GameEvent[] = [];
    nextMorning(eveningOf(270, -3000), seen);
    expect(eventsOfKind(seen, 'taxComing')[0]?.body).toBe(
      'On 30 December the taxman takes 25% of whatever is in the account. Nothing as it stands ' +
        'today. Money spent on machines or on the workshop before then is not taxed. The workshop ' +
        'is closed from 22 December, so the last day to spend is Thu 21 December. Invest, or pay.',
    );
  });

  it('is said on the next open to a save that came into December without it', () => {
    // A v39 save of Wednesday 10 December 2026, from before the tax was in the game.
    const state = eveningOf(640, 30000);
    state.clock.minute = 300;
    const raw = JSON.parse(JSON.stringify(state)) as Record<string, unknown>;
    const finance = raw.finance as Record<string, unknown>;
    delete finance.taxPaidForYear;
    delete finance.taxWarnedForYear;
    raw.version = 39;
    const lifted = migrateState(raw, 39);
    if (lifted === null) throw new Error('the v39 save did not load');
    expect(lifted.version).toBe(STATE_VERSION);
    expect(lifted.finance.taxPaidForYear).toBeNull();
    expect(lifted.finance.taxWarnedForYear).toBeNull();
    const seen: GameEvent[] = [];
    lifted.clock.minute = DAY_END_MINUTE;
    const next = nextMorning(lifted, seen);
    expect(next.clock.day).toBe(641);
    expect(eventsOfKind(seen, 'taxComing')).toHaveLength(1);
    expect(next.finance.taxWarnedForYear).toBe(2026);
  });

  it('keeps the strip line from the warning to the tax and not a day after', () => {
    expect(WARNING_ORDER.indexOf('taxComing')).toBe(WARNING_ORDER.indexOf('spendingOverEarning') + 1);
    // The closure's line stands between the tax's and the crew's from v83 (CLAUDE.md T28 2.2.1).
    expect(WARNING_ORDER.indexOf('closureComing')).toBe(WARNING_ORDER.indexOf('taxComing') + 1);
    expect(WARNING_ORDER.indexOf('crewFull')).toBe(WARNING_ORDER.indexOf('closureComing') + 1);
    const line = (state: GameState): string | undefined =>
      warnings(state).find((warning) => warning.key === 'taxComing')?.text;
    // Before the warning there is none.
    const november = eveningOf(270, 48000);
    expect(line(november)).toBeUndefined();
    // From the warning's morning, every working day of December, while there is cash to tax.
    let state = nextMorning(eveningOf(270, 48000));
    expect(line(state)).toBe(`Tax on 30 December: 25% of the account, £${taxOn(state.cash).toLocaleString('en-GB')} as it stands`);
    state.cash = 48000;
    expect(line(state)).toBe('Tax on 30 December: 25% of the account, £12,000 as it stands');
    for (const day of [281, 290, 291]) {
      state.clock.day = day;
      expect(line(state), String(day)).toBe('Tax on 30 December: 25% of the account, £12,000 as it stands');
    }
    state.cash = 0;
    expect(line(state)).toBeUndefined();
    state.cash = 48000;
    state.clock.minute = DAY_END_MINUTE;
    state = nextMorning(state);
    expect(state.clock.day).toBe(306);
    expect(line(state)).toBeUndefined();
    // In 2026 too: from the last working day the line is gone on the first day back, the tax booked
    // inside the break (flipped in v83 from a working 30th, which there is none of now).
    const before = eveningOf(649, 40000);
    before.finance.taxWarnedForYear = 2026;
    expect(line(before)).toBe('Tax on 30 December: 25% of the account, £10,000 as it stands');
    const back = nextMorning(before);
    expect(back.clock.day).toBe(666);
    expect(line(back)).toBeUndefined();
  });
});
