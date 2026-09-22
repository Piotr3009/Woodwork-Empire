// The Turn 24 scenario of CLAUDE.md T24 2.10: (pp), the cheap start, a year of it.
//
// A year on Easy with the scripted player buying used machines only, taking one joiner on a
// quarter, and taking the first standing contract his crew can keep up with, against the ten
// thousand loan floor Piotr ruled on 20.09 [PIOTR, 20.09; CLAUDE.md T23 2.12].
//
// It asserts nothing about survival. What it does is play the twelve months and print them, so
// that the floor is ruled on with the figures in front of him and not from an argument: the cash,
// the reputation, the crew and the machines at every month end, and whether the bank closed the
// company. The hall is stood up by playing the days through the scripted player of autopilot.ts
// and never by writing the state out by hand; the one figure written on is the day the loan is
// taken, which is a click a real player makes.

import { describe, expect, it } from 'vitest';
import { type Policy, playDay } from './autopilot';
import { act, newGame } from '../helpers';
import { LOAN_FLOOR } from '../../src/engine/constants';
import { loanLimit, monthOfDay } from '../../src/engine/index';
import { joiners, missingForHire } from '../../src/engine/staff';
import type { GameEvent, GameState } from '../../src/engine/index';

const SEED = 20260911;
/** Twelve months of thirty days: the year the scenario plays (CLAUDE.md T13 3.20). */
const MONTHS = 12;
const DAYS = MONTHS * 30;
/** The rack the scripted player keeps under him while a contract runs, and what he tops it up by:
 *  the same [TUNE] figures the three month playthrough uses, so the two runs differ in the things
 *  this one is about and not in how its owner buys sheets. */
const RESTOCK_WHEN_UNDER = 6;
const RESTOCK_SHEETS = 20;
/** He asks for twenty five thousand on the first day he is under and takes what the bank will
 *  lend him, which on a company that has shown it nothing is the floor (CLAUDE.md T23 2.12). */
const LOAN_ASKED = 25000;
const LOAN_BY_DAY = 30;
/** One more joiner every quarter: day 91, 181 and 271 (CLAUDE.md T24 2.10). */
const HIRING_DAYS = [91, 181, 271];

/** The class of bench the cheap start buys: the cheapest that will hold the crew it means to end
 *  the year with, because a bench already standing cannot be swapped for a better one and the gate
 *  counts the owner's own place from tonight (CLAUDE.md T23 2.17, T24 2.2). */
function benchClass(state: GameState, specId: string): string | undefined {
  if (specId !== 'workbench') return undefined;
  return HIRING_DAYS.length + 2 > state.unit.benchSlots ? 'standard' : 'used';
}

/** The cheap start: the day one list in the cheapest class of every family, one joiner on day 1
 *  and one a quarter after that, the first contract the crew can keep up with, and the bank for
 *  the fitting out. */
const CHEAP_START: Policy = {
  maxOpenJobs: 3,
  buyKit: true,
  cleanAbove: 55,
  wanted: ['tvUnit', 'bookcase', 'garageShelves', 'wardrobe'],
  hireJoiner: true,
  joiners: 1,
  // Used machines only: the saw, the fan and the compressor are the cheapest class each family
  // has, and the bander is the hand one the day 1 list already buys.
  sawVariant: 'used',
  extractorVariant: 'used',
  compressorVariant: 'used',
  stockSheets: 0,
  takeContracts: true,
  onDay: (current, day) => {
    let next = current;
    if (day <= LOAN_BY_DAY && next.cash < 0 && next.finance.loan === null) {
      next = act(next, { type: 'TAKE_LOAN', amount: Math.min(LOAN_ASKED, loanLimit(next)) });
    }
    // A one off licence covers thirty jobs and then the drawings stop: a cheap start buys the
    // cheap licence and another one the morning it runs out, which is the click the Stock page's
    // own lock tells him to make (CLAUDE.md 9.2).
    if (next.software.mode === 'oneOff' && next.software.jobsRemaining <= 0) {
      next = act(next, { type: 'BUY_SOFTWARE', mode: 'oneOff' });
    }
    // A contract's material comes off the rack, so he keeps sheets under it while one runs.
    if (
      next.contracts.some((contract) => contract.status === 'active') &&
      next.stock.sheets < RESTOCK_WHEN_UNDER
    ) {
      next = act(next, { type: 'RESTOCK', sheets: RESTOCK_SHEETS });
    }
    // One more man a quarter, with the kit the gate asks for: the card's own refusal is what he
    // buys to, which from tonight counts his own place at a bench (CLAUDE.md T24 2.2). He asks
    // again on the days that follow until the man is on the books, because a hire wants a month
    // of his pay in the account and a cheap start does not always have it on the day.
    const quarter = HIRING_DAYS.find((first) => day >= first && day < first + 30);
    const wanted = quarter === undefined ? 0 : HIRING_DAYS.indexOf(quarter) + 2;
    if (wanted > 0 && joiners(next).length < wanted) {
      let guard = 0;
      while (missingForHire(next, 'joiner').length > 0 && guard < 12) {
        for (const specId of missingForHire(next, 'joiner')) {
          next = act(next, { type: 'BUY_EQUIPMENT', specId, variantId: benchClass(next, specId) });
        }
        guard += 1;
      }
      next = act(next, { type: 'HIRE', role: 'joiner', tier: 'novice' });
    }
    return next;
  },
};

interface MonthEnd {
  month: number;
  cash: number;
  reputation: number;
  crew: number;
  joiners: number;
  machines: number;
  delivered: number;
}

function machinesIn(state: GameState): number {
  return state.equipment.filter((item) => item.soldOnDay === null).length;
}

function play(): { state: GameState; months: MonthEnd[]; events: GameEvent[] } {
  const events: GameEvent[] = [];
  let state = newGame({ seed: SEED, difficulty: 'easy' });
  const months: MonthEnd[] = [];
  let logged = 0;
  let deliveredBefore = 0;
  while (state.clock.day <= DAYS && state.gameOver === null) {
    state = playDay(state, CHEAP_START, events);
    while (logged < monthOfDay(state.clock.day) - 1 && logged < MONTHS) {
      logged += 1;
      const delivered = state.jobs.filter((job) => job.stage === 'completed').length;
      months.push({
        month: logged,
        cash: Math.round(state.cash),
        reputation: state.reputation,
        crew: state.workers.length,
        joiners: joiners(state).length,
        machines: machinesIn(state),
        delivered: delivered - deliveredBefore,
      });
      deliveredBefore = delivered;
    }
  }
  return { state, months, events };
}

const run = play();

describe('(pp) the cheap start, a year of it (CLAUDE.md T24 2.10)', () => {
  it('borrows the floor and no more, because the bank has no books to read', () => {
    // The one rule this year is played against: a company that has shown the bank nothing gets
    // the floor of ten thousand, whatever it asks for (PIOTR, 20.09; CLAUDE.md T23 2.12).
    const loan = run.state.finance.loan;
    expect(loan?.principal ?? LOAN_FLOOR).toBe(LOAN_FLOOR);
    expect(LOAN_FLOOR).toBe(10000);
    expect(LOAN_ASKED).toBeGreaterThan(LOAN_FLOOR);
  });

  it('plays the twelve months out and prints them for Piotr to rule on', () => {
    // Nothing here is asserted about survival: the table is the point of the scenario, and the
    // only thing checked is that a year was actually played (CLAUDE.md T24 2.10).
    expect(run.months.length).toBeGreaterThan(0);
    const closed = run.state.gameOver;
    const reached = closed === null ? DAYS : closed.day;
    const rows = run.months.map(
      (month) =>
        `month ${String(month.month).padStart(2)} | cash ${String(month.cash).padStart(8)} | ` +
        `reputation ${String(month.reputation).padStart(3)} | crew ${month.crew} ` +
        `(${month.joiners} joiner${month.joiners === 1 ? '' : 's'}) | ` +
        `machines ${String(month.machines).padStart(2)} | delivered ${month.delivered}`,
    );
    console.log(
      '(pp) THE CHEAP START, A YEAR OF IT\n' +
        'Easy, used machines only, one joiner a quarter, the first contract the crew can keep ' +
        `up with, against the ${LOAN_FLOOR} loan floor.\n` +
        `${rows.join('\n')}\n` +
        (closed === null
          ? `the bank did not close the company: it reached day ${reached} still trading, ` +
            `cash ${Math.round(run.state.cash)}`
          : `the bank closed the company on day ${closed.day}: ${closed.reason}`),
    );
    // The year either ran to its end or was closed by the bank, and the run says which.
    expect(closed === null ? run.state.clock.day > DAYS : closed.day <= DAYS).toBe(true);
  });
});
