/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// The Turn 27 scenario of CLAUDE.md T27 C2: (uu), the taxman's December played (PIOTR, 03.10 and
// 04.10; CLAUDE.md T27 2.2, 2.3). The letter follows Turn 26's (tt).
//
// (uu) A company with cash, played by the careful script from Tuesday 28 November 2025 (day 268)
//      to Monday 2 January 2026 (day 302). It is told on Friday 1 December, the first working day
//      of the month, with the tax on that morning's account; the strip carries the line at every
//      step of every working day from that card to Friday 29 December and at none before or
//      after; the clock walks over Saturday 30 December and books a quarter of the account as it
//      stands that moment, before anything else of the day; the card that says so is the first
//      thing of Monday morning; and December's report, drawn that morning, carries its line.
//      The same company with the account under nought is told `Nothing as it stands today.`, has
//      no line on its strip and pays nothing. It takes no work (the script's idle player), so
//      the account stays under nought the whole month; a company that earned its way over nought
//      in December would be taxed on what it had on the 30th, and that is the first half.
//
// The company is the day one hall of the engine tests, bought on 28 November and not on day 1 so
// its machines' service dates are that day's [TUNE]; the clock is written to day 268 with
// October's report already shown, and the account to 48,000 [TUNE: the brief's figure] or to
// minus 3,000 [TUNE: the cross check's]. Very easy, whose overdraft runs to minus 10,000.

import { describe, expect, it } from 'vitest';
import { monthOfDay } from '../../src/engine/clock';
import { TAX_RATE } from '../../src/engine/constants';
import { formatMoney } from '../../src/engine/economy';
import { warnings } from '../../src/engine/warnings';
import { applyAction } from '../../src/engine/index';
import type { GameEvent, GameState, LedgerEntry } from '../../src/engine/index';
import { buyStartingKit, eventsOfKind, newGame } from '../helpers';
import { CAREFUL, IDLE, answer, playDay, type Policy } from './autopilot';

/** Tuesday 28 November 2025. */
const NOVEMBER_28 = 268;
/** Friday 1 December, the first working day of the month. */
const DECEMBER_1 = 271;
/** Friday 29 December, the last working day before the tax. */
const DECEMBER_29 = 299;
/** Saturday 30 December, the tax. */
const DECEMBER_30 = 300;
/** Monday 2 January 2026, the first working day of the year. */
const JANUARY_2 = 302;
/** December's month, counted from March 2025. */
const DECEMBER = 10;

interface December {
  state: GameState;
  seen: GameEvent[];
  /** Every state the script played through, by day: the account and the strip's tax line. */
  steps: Array<{ day: number; cash: number; line: string | undefined }>;
  /** The account on the morning of Friday 1 December, when the warning was raised. */
  warnedOn: number | null;
}

function taxLine(state: GameState): string | undefined {
  return warnings(state).find((warning) => warning.key === 'taxComing')?.text;
}

function companyAt(cash: number): GameState {
  const fresh = newGame({ difficulty: 'veryEasy' });
  fresh.clock.day = NOVEMBER_28;
  fresh.monthEndShownFor = monthOfDay(NOVEMBER_28);
  const state = buyStartingKit(fresh);
  state.cash = cash;
  return state;
}

function playDecember(cash: number, policy: Policy): December {
  let state = companyAt(cash);
  const run: December = { state, seen: [], steps: [], warnedOn: null };
  const watch = (now: GameState): void => {
    run.steps.push({ day: now.clock.day, cash: now.cash, line: taxLine(now) });
  };
  while (state.clock.day < JANUARY_2 && state.gameOver === null) {
    state = playDay(state, policy, run.seen, { watch });
    if (state.clock.day === DECEMBER_1) run.warnedOn = state.cash;
    watch(state);
  }
  // Monday morning's cards, met the way the script meets every card.
  while (state.activeEvent !== null) {
    run.seen.push(state.activeEvent);
    state = applyAction(state, { type: 'RESOLVE_EVENT', choiceId: answer(state, policy) });
  }
  run.state = state;
  return run;
}

function taxEntries(state: GameState): LedgerEntry[] {
  return state.ledger.filter((entry) => entry.category === 'tax');
}

describe('(uu) the taxman s December, played (CLAUDE.md T27 2.2, 2.3)', () => {
  it('warns on 1 December, keeps the line to the 29th, takes a quarter on the 30th and reports it', () => {
    const run = playDecember(48000, CAREFUL);
    const { state, seen } = run;
    expect(state.gameOver).toBeNull();
    expect(state.clock.day).toBe(JANUARY_2);

    // The warning: once, on the first working day of December, with the tax on that morning's
    // account in it.
    const coming = eventsOfKind(seen, 'taxComing');
    expect(coming).toHaveLength(1);
    expect(coming[0]?.day).toBe(DECEMBER_1);
    const morning = run.warnedOn ?? Number.NaN;
    expect(morning).toBeGreaterThan(0);
    const figure = Math.round(morning * TAX_RATE);
    expect(coming[0]?.data.amount).toBe(figure);
    expect(coming[0]?.body).toBe(
      `On 30 December the taxman takes 25% of whatever is in the account: ${formatMoney(figure)} as ` +
        'it stands today. Money spent on machines or on the workshop before then is not taxed. ' +
        'Invest, or pay.',
    );

    // The strip: the line at every step of every working day from the card to the 29th, with the
    // tax on the account of that step, and at no step before the card or after the tax.
    const december = run.steps.filter((step) => step.day >= DECEMBER_1 && step.day <= DECEMBER_29);
    expect(new Set(december.map((step) => step.day)).size).toBe(21);
    for (const step of december) {
      expect(step.cash, String(step.day)).toBeGreaterThan(0);
      expect(step.line, String(step.day)).toBe(
        `Tax on 30 December: 25% of the account, ${formatMoney(Math.round(step.cash * TAX_RATE))} as it stands`,
      );
    }
    const outside = run.steps.filter((step) => step.day < DECEMBER_1 || step.day > DECEMBER_29);
    expect(outside.some((step) => step.day === NOVEMBER_28)).toBe(true);
    expect(outside.some((step) => step.day === JANUARY_2)).toBe(true);
    for (const step of outside) expect(step.line, String(step.day)).toBeUndefined();

    // The tax: one line, on Saturday 30 December, a quarter of the account that moment, the first
    // thing of the day.
    const taxes = taxEntries(state);
    expect(taxes).toHaveLength(1);
    const tax = taxes[0];
    if (tax === undefined) throw new Error('no tax was booked');
    expect(tax.day).toBe(DECEMBER_30);
    expect(tax.label).toBe('Tax for 2025');
    const before = tax.balance - tax.amount;
    const at = state.ledger.indexOf(tax);
    expect(state.ledger[at - 1]?.balance).toBe(before);
    expect(state.ledger[at - 1]?.day).toBeLessThan(DECEMBER_30);
    expect(tax.amount).toBe(-Math.round(before * TAX_RATE));
    expect(state.finance.taxPaidForYear).toBe(2025);

    // The card that says so, before December's report on the Monday morning.
    const paid = eventsOfKind(seen, 'taxPaid');
    expect(paid).toHaveLength(1);
    expect(paid[0]?.title).toBe('Tax for 2025');
    expect(paid[0]?.body).toBe(
      `The taxman took 25% of the ${formatMoney(before)} in the account: ${formatMoney(-tax.amount)}.`,
    );
    expect(seen.find((event) => event.day > DECEMBER_29)).toBe(paid[0]);
    const report = eventsOfKind(seen, 'monthEnd').find((event) => event.data.month === DECEMBER);
    expect(report?.day).toBe(JANUARY_2);
    expect(seen.indexOf(paid[0] as GameEvent)).toBeLessThan(seen.indexOf(report as GameEvent));

    // December's report, as the card draws it, with its Tax line.
    const stored = state.monthlyReports.find((entry) => entry.month === DECEMBER);
    expect(stored?.report.lines.find((line) => line.id === 'tax')).toMatchObject({
      label: 'Tax',
      costs: -tax.amount,
      net: tax.amount,
    });
  });

  it('under nought: the warning says nothing as it stands, no strip line and no tax', () => {
    const run = playDecember(-3000, IDLE);
    const { state, seen } = run;
    expect(state.gameOver).toBeNull();
    expect(state.clock.day).toBe(JANUARY_2);
    const coming = eventsOfKind(seen, 'taxComing');
    expect(coming).toHaveLength(1);
    expect(coming[0]?.day).toBe(DECEMBER_1);
    expect(coming[0]?.body).toBe(
      'On 30 December the taxman takes 25% of whatever is in the account. Nothing as it stands ' +
        'today. Money spent on machines or on the workshop before then is not taxed. Invest, or pay.',
    );
    // Under nought at every step of the month, so no line on the strip at any of them.
    for (const step of run.steps) {
      expect(step.cash, String(step.day)).toBeLessThan(0);
      expect(step.line, String(step.day)).toBeUndefined();
    }
    expect(taxEntries(state)).toEqual([]);
    expect(eventsOfKind(seen, 'taxPaid')).toEqual([]);
    // The year is settled all the same: nothing is owed for it later.
    expect(state.finance.taxPaidForYear).toBe(2025);
    const stored = state.monthlyReports.find((entry) => entry.month === DECEMBER);
    expect(stored?.report.lines.find((line) => line.id === 'tax')?.costs ?? 0).toBe(0);
  });
});
