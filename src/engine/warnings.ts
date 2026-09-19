// The warning strip (CLAUDE.md T13 3.22): one engine function returns the list of problems the
// game sees, the most urgent first, and the strip under the top bar shows the first of them, one
// line, one problem at a time.
//
// The order is by how soon the problem costs the player something, and how much of the hall it
// stops. Bags full stops every machine in the hall this minute. A started job nobody is on has its
// clock running with no work going in. A deadline at risk is a reputation hit that is still
// avoidable. A commercial enquiry the company cannot take for want of insurance is money not
// earned, not money lost. The crew at the floor limit is a wall the player will meet at the next
// hire, and nothing until then.
//
// Turn 18 adds the two money lines and the first steps line (CLAUDE.md T18 2.6, 2.7). The money
// lines read the ledger, the closed days and the workshop rate, and change none of them: the game
// used to say nothing at all about the money until the month end, and a player could be four weeks
// into a hole before the game mentioned it.
//
// Turn 21 adds the line above them all but the bags: the account has passed what the bank allows,
// which is the last thing said before the bank closes the company (PIOTR, 18.09; CLAUDE.md T21 2.1).

import {
  FIRST_STEPS_LAST_DAY,
  NO_INSURANCE_REASON,
  RATE_WEEK_DAYS,
  SPEND_WARNING_CATEGORIES,
  SPEND_WARNING_FROM_CLOSED_DAYS,
} from './constants';
import { bankruptcyFloor, formatMoney } from './economy';
import { overdraftInterestForDay } from './finance';
import { bagStore } from './machines';
import { workPlan } from './plan';
import { ratedDays, weekRate } from './rate';
import { crewFull, crewLine } from './staff';
import type { GameState, LedgerCategory } from './types';

export type WarningKey =
  | 'bagsFull'
  /** The account is past what the bank will carry, and the next look closes the company
   *  (PIOTR, 18.09; CLAUDE.md T21 2.1). */
  | 'pastTheLimit'
  | 'nobodyAssigned'
  | 'deadlineAtRisk'
  | 'noInsurance'
  /** The money speaks before the month end (PIOTR accepted, 17.09; CLAUDE.md T18 2.6). */
  | 'belowZero'
  | 'spendingOverEarning'
  | 'crewFull'
  /** The first days say what to do (PIOTR accepted, 17.09; CLAUDE.md T18 2.7). */
  | 'firstSteps';

export interface Warning {
  key: WarningKey;
  text: string;
}

/** The order of urgency: the strip shows the first key in this list that has a problem behind it.
 *  The two money lines sit above the crew line and under the deadlines: an account under zero is
 *  costing the company money every day it stands there, and a week that spends more than it earns
 *  is the month end arriving early, where the crew at the floor limit is a wall the player will
 *  only meet at his next hire. The first steps line is last of all: it is said only when there is
 *  nothing at all to warn about (CLAUDE.md T18 2.6, 2.7). */
export const WARNING_ORDER: readonly WarningKey[] = [
  'bagsFull',
  // Second of all, above everything but the bags: the bags stop every machine in the hall this
  // minute, and this stops the company for good at the next look (CLAUDE.md T21 2.1).
  'pastTheLimit',
  'nobodyAssigned',
  'deadlineAtRisk',
  'noInsurance',
  'belowZero',
  'spendingOverEarning',
  'crewFull',
  'firstSteps',
];

function bagsFullWarning(state: GameState): Warning | null {
  if (!bagStore(state).full) return null;
  return {
    key: 'bagsFull',
    text: 'The bags are full: nothing that makes dust runs until they are emptied',
  };
}

/** The account has passed what the bank allows, which is the last thing the strip says before the
 *  company is closed (PIOTR, 18.09; CLAUDE.md T21 2.1; docs/mockups/t21/debt.html part 1).
 *
 *  It fires on the figure the bank reads, the cash against `bankruptcyFloor`, and on nothing softer
 *  [TUNE]: the sentence says the company is already past the line, and a line that said that while
 *  it was not true would be a lie the other way about. The day's look at the money is what closes
 *  the company (`checkBankruptcy`). The two figures are the engine's own, so the strip and the
 *  close cannot disagree. */
function pastTheLimitWarning(state: GameState): Warning | null {
  const allowed = bankruptcyFloor(state);
  if (state.cash > allowed) return null;
  return {
    key: 'pastTheLimit',
    text:
      `Account ${formatMoney(state.cash)} has passed the ${formatMoney(allowed)} the bank ` +
      'allows: the next look closes you.',
  };
}

function nobodyAssignedWarning(state: GameState): Warning | null {
  const started = state.jobs.find(
    (job) => job.stage === 'inProduction' && job.assignees.length === 0,
  );
  if (started === undefined) return null;
  return { key: 'nobodyAssigned', text: `${started.name} is started and nobody is on it` };
}

/** A deadline at risk, off the work plan: a job whose projected end has walked past its deadline,
 *  or one not yet started whose last day to start has gone (CLAUDE.md T9 3.6, T11 3.3). A piece
 *  already made is the gate's business, not this line's. */
function deadlineWarning(state: GameState): Warning | null {
  const unfinished = new Set(
    state.jobs.filter((job) => job.finishedDay === null).map((job) => job.id),
  );
  const row = workPlan(state).rows.find(
    (entry) => unfinished.has(entry.jobId) && (entry.overdue || entry.late),
  );
  if (row === undefined) return null;
  return {
    key: 'deadlineAtRisk',
    text: row.overdue
      ? `${row.name} will miss its deadline at this rate`
      : `${row.name} has to start now to make its deadline`,
  };
}

function noInsuranceWarning(state: GameState): Warning | null {
  const commercial = state.enquiries.find(
    (enquiry) => enquiry.kind === 'commercial' && enquiry.blockReason === NO_INSURANCE_REASON,
  );
  if (commercial === undefined) return null;
  return {
    key: 'noInsurance',
    text: `${commercial.name} is commercial work and the company has no insurance for it`,
  };
}

function crewFullWarning(state: GameState): Warning | null {
  if (!crewFull(state, 'joiner')) return null;
  return { key: 'crewFull', text: `${crewLine(state)}: no floor for another person` };
}

/** What a charge a day costs, in the words the strip wants it: the pound, or the pence while it is
 *  under a pound, because "£0 a day" is not a warning (CLAUDE.md T18 2.6). */
function perDay(cost: number): string {
  if (cost < 1) return `\u00a3${cost.toFixed(2)}`;
  return formatMoney(cost);
}

/** The account is under zero and the overdraft is charging for it, today and every day it stands
 *  there. The figure is the one the engine itself accrues with, `overdraftInterestForDay`, so the
 *  line and the charge cannot disagree; nothing here touches the ledger (CLAUDE.md T18 2.6). */
function belowZeroWarning(state: GameState): Warning | null {
  if (state.cash >= 0) return null;
  const cost = overdraftInterestForDay(state.cash);
  return {
    key: 'belowZero',
    text: `Account below zero: the overdraft costs ${perDay(cost)} a day`,
  };
}

const SPEND_SET: ReadonlySet<LedgerCategory> = new Set(
  SPEND_WARNING_CATEGORIES as readonly LedgerCategory[],
);

/** What went out on wages, the draw and the fixed charges over a run of days, off the ledger. */
export function fixedSpendOver(state: GameState, days: ReadonlySet<number>): number {
  let out = 0;
  for (const entry of state.ledger) {
    if (!days.has(entry.day)) continue;
    if (!SPEND_SET.has(entry.category)) continue;
    if (entry.amount < 0) out -= entry.amount;
  }
  return Math.round(out * 100) / 100;
}

/** The week's money in one sentence: what the workshop spent on standing still against what its
 *  labour earned over the same five closed days. The top of the workshop rate is the "in", so the
 *  Company board's figure and this line are the same arithmetic (CLAUDE.md T17 2.26, T18 2.6). */
function spendingOverEarningWarning(state: GameState): Warning | null {
  const closed = ratedDays(state);
  if (closed.length < SPEND_WARNING_FROM_CLOSED_DAYS) return null;
  const window = closed.slice(Math.max(0, closed.length - RATE_WEEK_DAYS));
  const out = fixedSpendOver(state, new Set(window.map((day) => day.day)));
  const earned = weekRate(state).labour;
  if (out <= earned) return null;
  return {
    key: 'spendingOverEarning',
    text: `You spend more than you earn: ${formatMoney(out)} out, ${formatMoney(earned)} in this week`,
  };
}

/** A job with production behind it: the three stages a piece can only reach by being started. */
function productionStarted(state: GameState): boolean {
  return state.jobs.some(
    (job) =>
      job.stage === 'inProduction' ||
      job.stage === 'awaitingTransport' ||
      job.stage === 'completed',
  );
}

/** The first three days say what to do, one step at a time, in the strip's own last place: it is
 *  said only when the game has nothing to warn about. After the third step, or from the day after
 *  `FIRST_STEPS_LAST_DAY`, it is gone for good, and the tips setting turns it off with the tips
 *  (PIOTR accepted, 17.09; CLAUDE.md T18 2.7). */
function firstStepsWarning(state: GameState): Warning | null {
  if (!state.settings.tips) return null;
  if (state.clock.day > FIRST_STEPS_LAST_DAY) return null;
  // Whether the hall has been set up is a flag the engine writes the first time setup mode is
  // left with anything of the player's standing in it (`endSetup`, game.ts). Turn 18 had to go
  // looking for a workbench on the floor for want of one, which said the hall was set up the
  // moment the day 1 kit was delivered, before the player had put a thing down (CLAUDE.md T19
  // 2.13; see REPORT-T18.md's blocker).
  if (!state.hallSetUp) return { key: 'firstSteps', text: 'Set up the hall' };
  if (state.jobs.length === 0) {
    return { key: 'firstSteps', text: 'Accept an enquiry on the board' };
  }
  if (!productionStarted(state)) {
    return { key: 'firstSteps', text: 'Press Start production on the work plan' };
  }
  return null;
}

const CHECKS: Record<WarningKey, (state: GameState) => Warning | null> = {
  bagsFull: bagsFullWarning,
  pastTheLimit: pastTheLimitWarning,
  nobodyAssigned: nobodyAssignedWarning,
  deadlineAtRisk: deadlineWarning,
  noInsurance: noInsuranceWarning,
  belowZero: belowZeroWarning,
  spendingOverEarning: spendingOverEarningWarning,
  crewFull: crewFullWarning,
  firstSteps: firstStepsWarning,
};

/** Every problem the game sees right now, the most urgent first. Empty when nothing is wrong. */
export function warnings(state: GameState): Warning[] {
  const found: Warning[] = [];
  for (const key of WARNING_ORDER) {
    const warning = CHECKS[key](state);
    if (warning !== null) found.push(warning);
  }
  return found;
}
