/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// Turn 27's measurement (CLAUDE.md T27 2.6): where a new company stands after its first year, with
// the tax of 30 December inside it. The scripted player of tests/scenarios/autopilot.ts plays twelve
// months, 1 March 2025 to the end of February 2026, on each of the three difficulties, four times:
// the owner alone, with one joiner with no experience from day 1, with two, and with four
// experienced joiners and the machines a careful player would buy them. Nothing of the game is
// changed by it. It is not part of `npm test`: run it by hand and it writes its twelve tables into
// docs/balance-t27.md between the two marks there.
//
//   npx vite-node scripts/balance-t27.ts

import { readFileSync, writeFileSync } from 'node:fs';
import { PRODUCT_TEMPLATES, SALES_CATEGORIES } from '../src/engine/constants';
import {
  applyAction,
  findSpec,
  hiringOptions,
  isLastWorkingDayOfMonth,
  loanLimit,
  startTaskCheck,
} from '../src/engine/index';
import {
  calendarYearOf,
  formatCalendarDay,
  formatMoney,
  marginOfPrice,
  monthName,
  monthOfDay,
  monthReport,
} from '../src/engine/index';
import type { Difficulty, GameEvent, GameState, LedgerCategory, WorkerTier } from '../src/engine/index';
import { missingForHire } from '../src/engine/staff';
import {
  DAY_ONE_BUY_ORDER,
  DAY_ONE_CLASS,
  JOINER_KIT,
  type Policy,
  playDay,
} from '../tests/scenarios/autopilot';
import { newGame } from '../tests/helpers';

const SEED = 20260911;
/** Two more seeds each run is played with, for the one line under its table that says how much of
 *  it is the seed's [TUNE]. */
const OTHER_SEEDS = [20260912, 20260913];
const DAYS = 360;
const DOC = process.env.BALANCE_DOC ?? 'docs/balance-t27.md';
const START_MARK = '<!-- the twelve tables, written by scripts/balance-t27.ts -->';
const END_MARK = '<!-- end of the tables -->';

/** The work the script takes: every sheet job, dearest first, residential, when the client's
 *  number pays for the job's material and its labour, which is a margin over nought [TUNE]. The
 *  three month playthrough's fifth turned down a third of what a new company is offered on v81 (48
 *  of 135 offers in the year of the owner and one man), and a man standing idle is paid all the
 *  same. */
const SHEET_WORK = PRODUCT_TEMPLATES.filter((template) => template.material === 'sheet')
  .sort((left, right) => right.basePrice - left.basePrice)
  .map((template) => template.id);
const MARGIN_FLOOR = 0;

function acceptOffer(state: GameState, event: GameEvent): boolean {
  const enquiry = state.enquiries.find((entry) => entry.id === event.data.enquiryId);
  const offer = typeof event.data.offer === 'number' ? event.data.offer : 0;
  if (!enquiry || enquiry.kind !== 'residential' || offer <= 0) return false;
  return marginOfPrice(enquiry.basePrice, enquiry.bespokeMaterial, offer) > MARGIN_FLOOR;
}

/** The classes the day one kit is bought at, as the script's own day one list buys them (the
 *  budget bench, rack and hand bander, and the cheapest saw, fan and compressor). */
const DAY_ONE_CLASSES: Record<string, string | undefined> = {
  ...Object.fromEntries(DAY_ONE_BUY_ORDER.map((specId) => [specId, undefined])),
  ...DAY_ONE_CLASS,
};

/** True while the hall has one of this family standing in it or on its way. */
function hasOrComing(state: GameState, specId: string): boolean {
  return (
    state.equipment.some((item) => item.specId === specId && item.soldOnDay === null) ||
    state.onOrder.some((order) => order.specId === specId && !order.arrived)
  );
}

/** A careful owner puts back what the day one list gave him and the night took: every morning, a
 *  family of it with nothing in the hall and nothing on order is bought again at its day one class.
 *  Without it a burglary that takes the compressor stops every bench for the rest of the year, and
 *  the year measures the burglary [TUNE]. On a morning with no kit at all it is the day one list. */
function putBack(state: GameState): GameState {
  let next = state;
  for (const specId of DAY_ONE_BUY_ORDER) {
    if (hasOrComing(next, specId)) continue;
    next = applyAction(next, { type: 'BUY_EQUIPMENT', specId, variantId: DAY_ONE_CLASSES[specId] });
  }
  return next;
}

/** The management software, bought the morning there is a laptop to put it on. The autopilot buys
 *  it with its day one kit, and a crew that buys its kit by its own list has to buy it itself: the
 *  four men's first run, without it, made no drawing, ordered no sheet and earned nothing in April. */
function takeLicence(state: GameState, policy: Policy): GameState {
  if (state.software.mode !== 'none') return state;
  if (!state.equipment.some((item) => item.specId === 'laptop' && item.soldOnDay === null)) return state;
  return applyAction(state, { type: 'BUY_SOFTWARE', mode: policy.licence ?? 'subscription' });
}

/** The books, written up once a month, first thing on its last working day: an hour at the desk,
 *  and no `Late accounts` on the 1st, which is 100 for every month in a row the books are behind
 *  [TUNE]. The script of tests/scenarios/autopilot.ts leaves the bookkeeping to wait, and a year of
 *  it came to 6,600 of fines. */
function doTheBooks(state: GameState, day: number): GameState {
  if (!isLastWorkingDayOfMonth(day) || state.owner.currentTaskId !== null) return state;
  const books = state.tasks.find((task) => task.kind === 'bookkeeping' && !task.done);
  if (books === undefined || !startTaskCheck(state, books.id).ok) return state;
  return applyAction(state, { type: 'START_TASK', taskId: books.id });
}

/** The bank's one loan, all it will lend, the first morning the account would be under nought once
 *  the month's wages were paid out of it: what a careful owner does when he sees the money will not
 *  last, rather than let the wages day close him [TUNE]. Alone, with no wages, that is the first
 *  morning under nought. A new company is lent the floor, 10,000; one loan at a time, so once in the
 *  year. On Hard, where the company opens with nothing in the account, it is taken at the open of
 *  day 1 (`play` below). */
function borrow(state: GameState): GameState {
  const wages = state.workers.reduce((total, worker) => total + worker.monthlyWage, 0);
  if (state.finance.loan !== null || state.cash - wages >= 0) return state;
  if (state.ledger.some((entry) => entry.category === 'loan' && entry.amount > 0)) return state;
  return applyAction(state, { type: 'TAKE_LOAN', amount: loanLimit(state) });
}

function joinerCount(state: GameState): number {
  return state.workers.filter((worker) => worker.role === 'joiner').length;
}

/** The crew of the run, taken on as soon as the account allows: on day 1 where it does, and
 *  otherwise the first morning it holds the man's kit and a month of his pay, which is the card's
 *  own gate (CLAUDE.md T17 2.11). His bench, locker, cabinet and hand tools are bought at the day
 *  one classes, the bench a two place one when the crew will not fit on the one place kind, as the
 *  script of tests/scenarios/autopilot.ts buys them. */
function hireRest(state: GameState, wanted: number, tier: WorkerTier): GameState {
  let next = state;
  let guard = 0;
  while (joinerCount(next) < wanted && guard < wanted) {
    guard += 1;
    const option = hiringOptions(next).find((entry) => entry.role === 'joiner' && entry.tier === tier);
    if (option === undefined) return next;
    if (next.cash - option.missingCost < option.monthlyWage) return next;
    const bench = wanted + 1 > next.unit.benchSlots ? 'standard' : DAY_ONE_CLASS.workbench;
    // Whatever the card still says is short, until it says nothing: a bench of two places is one
    // purchase and two places, so the list is read again after each round.
    let rounds = 0;
    while (missingForHire(next, 'joiner').some((specId) => JOINER_KIT.includes(specId)) && rounds < 12) {
      rounds += 1;
      for (const specId of missingForHire(next, 'joiner')) {
        if (!JOINER_KIT.includes(specId)) continue;
        next = applyAction(next, {
          type: 'BUY_EQUIPMENT',
          specId,
          variantId: specId === 'workbench' ? bench : DAY_ONE_CLASS[specId],
        });
      }
    }
    const before = joinerCount(next);
    next = applyAction(next, { type: 'HIRE', role: 'joiner', tier });
    if (joinerCount(next) === before) return next;
  }
  return next;
}

/** What a careful owner buys four experienced men, in this order, each only while a month of the
 *  four men's wages stays in the account after it, the men he has still to take on counted with the
 *  ones he has, and never with the bank's money: what is left of a loan is kept back as well
 *  [TUNE]. A second saw, a better fan and compressor for it, a spindle moulder so nothing is
 *  moulded by hand, and a floor edgebander. */
const FOUR_MEN_KIT: Array<[string, string]> = [
  ['tableSaw', 'standard'],
  ['extractor', 'standard'],
  ['compressor', 'standard'],
  ['spindleMoulder', 'standard'],
  ['edgebander', 'standard'],
];

function equipFour(state: GameState): GameState {
  let next = state;
  const wage = hiringOptions(next).find((entry) => entry.role === 'joiner' && entry.tier === 'experienced')?.monthlyWage ?? 0;
  const reserve = 4 * wage + (next.finance.loan?.balance ?? 0);
  for (const [specId, variantId] of FOUR_MEN_KIT) {
    const have =
      next.equipment.some((item) => item.specId === specId && item.variantId === variantId && item.soldOnDay === null) ||
      next.onOrder.some((order) => order.specId === specId && order.variantId === variantId && !order.arrived);
    if (have) continue;
    const price = findSpec(specId)?.variants.find((variant) => variant.id === variantId)?.price ?? 0;
    if (next.cash - price < reserve) break;
    next = applyAction(next, { type: 'BUY_EQUIPMENT', specId, variantId });
  }
  return next;
}

/** The management software on the subscription, 150 a month, which never runs out [TUNE]. The one
 *  off licence is two years of it and is spent after thirty jobs; the script on the one off never
 *  bought it again, and from the thirty first job every drawing was refused with `No software
 *  licence` and the company earned nothing more. A player reads `0 jobs left` on the Drawings page;
 *  the script does not read pages. */
export const BASE: Policy = {
  maxOpenJobs: 2,
  buyKit: true,
  cleanAbove: 55,
  wanted: SHEET_WORK,
  hireJoiner: false,
  licence: 'subscription',
  stockSheets: 0,
  acceptOffer,
  onDay: (state, day) => doTheBooks(putBack(borrow(state)), day),
};

interface Crew {
  id: string;
  label: string;
  policy: Policy;
}

/** The four crews [TUNE: how many jobs each keeps open, two for every man at a bench and the owner
 *  alone two, so a man who finishes has the next job ready; and the fourth's standing and
 *  machines]. */
export const CREWS: Crew[] = [
  { id: 'alone', label: 'The owner alone', policy: { ...BASE, maxOpenJobs: 2 } },
  {
    id: 'one',
    label: 'One joiner with no experience from day 1',
    policy: {
      ...BASE,
      maxOpenJobs: 4,
      joiners: 1,
      onDay: (state, day) => doTheBooks(hireRest(putBack(borrow(state)), 1, 'novice'), day),
    },
  },
  {
    id: 'two',
    label: 'Two joiners with no experience from day 1',
    policy: {
      ...BASE,
      maxOpenJobs: 6,
      joiners: 2,
      onDay: (state, day) => doTheBooks(hireRest(putBack(borrow(state)), 2, 'novice'), day),
    },
  },
  {
    id: 'four',
    label: 'Four experienced joiners from day 1, and their machines',
    policy: {
      ...BASE,
      maxOpenJobs: 10,
      // The men first and the machines after them: the day one list and the four men's machines
      // bought on day 1 come to more than a hire leaves in the account on Easy, and a hire wants a
      // month of the man's pay there (CLAUDE.md T17 2.11). So the men and their benches are taken
      // on first, the day one list is bought after them, and the rest as the account allows.
      buyKit: false,
      joiners: 4,
      // An experienced man answers the card from a standing of 15 and a new company has none, so
      // the run is given the 15 on day 1, which also opens the board's work of that standing to it.
      reputation: 15,
      onDay: (state, day) =>
        doTheBooks(
          takeLicence(equipFour(putBack(hireRest(borrow(state), 4, 'experienced'))), BASE),
          day,
        ),
    },
  },
];

const DIFFICULTIES: Array<{ id: Difficulty; label: string }> = [
  { id: 'veryEasy', label: 'Very easy' },
  { id: 'easy', label: 'Easy' },
  { id: 'hard', label: 'Hard' },
];

/** Where each pound of the ledger goes in a row [TUNE: the kit, the loan and the tax are columns of
 *  their own, so the fixed costs read as fixed and the money in is the clients' alone]. Every
 *  column is the sum of its entries, in and out, so the row adds up to the account's move. */
const COLUMN_OF: Partial<Record<LedgerCategory, string>> = {
  ...Object.fromEntries(SALES_CATEGORIES.map((category) => [category, 'sales'])),
  material: 'material',
  storage: 'material',
  transport: 'couriers',
  taxi: 'couriers',
  wages: 'wages',
  wagesNight: 'wages',
  salaries: 'wages',
  ownerDraw: 'draw',
  rent: 'rent',
  rates: 'rates',
  power: 'power',
  equipment: 'kit',
  pipes: 'kit',
  unitDeposit: 'kit',
  unitExtension: 'kit',
  loan: 'loan',
  loanInterest: 'loan',
  tax: 'tax',
};
const COLUMNS = [
  'sales',
  'material',
  'couriers',
  'wages',
  'draw',
  'rent',
  'rates',
  'power',
  'rest',
  'kit',
  'loan',
  'tax',
] as const;
type Column = (typeof COLUMNS)[number];

interface Row {
  month: number;
  name: string;
  cells: Record<Column, number>;
  net: number;
  account: number;
}

interface Run {
  crew: Crew;
  difficulty: { id: Difficulty; label: string };
  rows: Row[];
  closedOn: number | null;
  closedWhy: string;
  tax: number;
  burglaries: string[];
  joiners: string;
  loan: string;
  lastDay: number;
  /** The same run with the other seeds. */
  others: Run[];
}

function rowsOf(state: GameState): Row[] {
  const rows: Row[] = [];
  const last = Math.min(12, monthOfDay(state.clock.day));
  for (let month = 1; month <= last; month += 1) {
    const cells = Object.fromEntries(COLUMNS.map((key) => [key, 0])) as Row['cells'];
    for (const entry of state.ledger) {
      if (entry.unpaid || monthOfDay(entry.day) !== month) continue;
      const column = (COLUMN_OF[entry.category] ?? 'rest') as Column;
      cells[column] += entry.amount;
    }
    const net = COLUMNS.reduce((total, key) => total + cells[key], 0);
    const report = monthReport(state, month);
    // The row is the ledger, so it adds up to the bank's move or the script is wrong.
    if (Math.abs(report.cashClose - report.cashOpen - net) > 1) {
      throw new Error(`month ${month}: the row comes to ${net}, the bank moved ${report.cashClose - report.cashOpen}`);
    }
    rows.push({
      month,
      name: `${monthName(month)} ${calendarYearOf((month - 1) * 30 + 1)}`,
      cells,
      net,
      account: report.cashClose,
    });
  }
  return rows;
}

export function play(crew: Crew, difficulty: { id: Difficulty; label: string }, seed = SEED): Run {
  let state = newGame({ seed, difficulty: difficulty.id });
  // Hard opens with nothing in the account and an overdraft of 5,000, and the day one list is
  // more than that: the loan is the first thing of day 1 (see `borrow`).
  if (state.cash <= 0) state = applyAction(state, { type: 'TAKE_LOAN', amount: loanLimit(state) });
  const seen: GameEvent[] = [];
  let guard = 0;
  while (state.clock.day <= DAYS && state.gameOver === null && guard < DAYS * 3) {
    guard += 1;
    state = playDay(state, crew.policy, seen);
  }
  const tax = state.ledger.filter((entry) => entry.category === 'tax').reduce((total, entry) => total - entry.amount, 0);
  const tiers = state.workers
    .filter((worker) => worker.role === 'joiner')
    .map((worker) => `${worker.tier ?? ''} from ${formatCalendarDay(worker.startDay)}`);
  const burglaries = seen
    .filter((event) => event.kind === 'burglary')
    .map((event) => `${formatCalendarDay(event.day)} ${calendarYearOf(event.day)}`);
  const drawn = state.ledger.find((entry) => entry.category === 'loan' && entry.amount > 0);
  return {
    crew,
    difficulty,
    burglaries,
    loan:
      drawn === undefined
        ? 'none'
        : `${pounds(drawn.amount)} drawn on ${formatCalendarDay(drawn.day)} ${calendarYearOf(drawn.day)}`,
    rows: rowsOf(state),
    closedOn: state.gameOver?.day ?? null,
    closedWhy: state.gameOver?.reason ?? '',
    tax,
    joiners: tiers.length === 0 ? 'none' : tiers.join(', '),
    lastDay: state.clock.day,
    others: [],
  };
}

function pounds(value: number): string {
  return formatMoney(value);
}

/** One run in a few words, for the line about the other seeds. */
function outcome(run: Run): string {
  const end = run.rows[run.rows.length - 1]?.account ?? 0;
  const black = run.rows.find((row) => row.net - row.cells.loan > 0);
  return (
    (run.closedOn === null ? `not closed, ${pounds(end)} at the end` : `closed on day ${run.closedOn}`) +
    `, tax ${run.tax > 0 ? pounds(run.tax) : 'none'}` +
    `, in the black ${black === undefined ? 'never' : `first in ${black.name}`}`
  );
}

function table(run: Run): string {
  const head =
    '| month | money in | material | couriers | wages | draw | rent | rates | power | the rest | kit | loan | tax | net | account at the end |\n' +
    '| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |\n';
  const lines = run.rows
    .map(
      (row) =>
        `| ${row.name} | ` +
        COLUMNS.map((key) => (Math.round(row.cells[key]) === 0 ? '' : pounds(row.cells[key]))).join(' | ') +
        ` | ${pounds(row.net)} | ${pounds(row.account)} |`,
    )
    .join('\n');
  // In the black: the month put money in the account by its own trade, the loan left out of it.
  const black = run.rows.find((row) => row.net - row.cells.loan > 0);
  const notes = [
    `First month in the black: ${black === undefined ? 'none' : black.name}.`,
    run.closedOn === null
      ? 'The bank did not close it.'
      : `The bank closed it on ${formatCalendarDay(run.closedOn)} ${calendarYearOf(run.closedOn)} (day ${run.closedOn}): ${run.closedWhy}`,
    `Tax paid: ${run.tax > 0 ? pounds(run.tax) : 'none'}.`,
    `Joiners on the books at the end: ${run.joiners}.`,
    `Loan: ${run.loan}.`,
    `With the other two seeds: ${run.others.map(outcome).join('; ')}.`,
    `Burglaries: ${run.burglaries.length === 0 ? 'none' : run.burglaries.join(', ')}.`,
  ];
  return `### ${run.difficulty.label}, ${run.crew.label.toLowerCase()}\n\n${head}${lines}\n\n${notes.join(' ')}\n`;
}

/** Plays the twelve and writes their tables; a probe that imports this file to look inside one run
 *  sets BALANCE_PROBE and plays it itself. */
function main(): void {
  const runs: Run[] = [];
  for (const difficulty of DIFFICULTIES) {
    for (const crew of CREWS) {
      const started = Date.now();
      const run = play(crew, difficulty);
      run.others = OTHER_SEEDS.map((seed) => play(crew, difficulty, seed));
      runs.push(run);
      process.stdout.write(
        `${difficulty.label}, ${crew.id}: ${run.rows.length} months, closed ${run.closedOn ?? 'no'}, ` +
          `tax ${run.tax}, end ${run.rows[run.rows.length - 1]?.account ?? 0} (${Math.round((Date.now() - started) / 1000)} s)\n`,
      );
    }
  }

  const tables = runs.map(table).join('\n');
  const doc = readFileSync(DOC, 'utf8');
  const start = doc.indexOf(START_MARK);
  const end = doc.indexOf(END_MARK);
  if (start < 0 || end < start) throw new Error(`${DOC} has no marks for the tables`);
  writeFileSync(DOC, `${doc.slice(0, start + START_MARK.length)}\n\n${tables}\n${doc.slice(end)}`);
  process.stdout.write(`wrote ${runs.length} tables into ${DOC}\n`);
}

if (process.env.BALANCE_PROBE === undefined) main();
