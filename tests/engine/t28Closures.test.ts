/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// The company's holidays (PIOTR, 05.10: "two weeks around Christmas, to 5 January (the costs run,
// only the people do not work), and two weeks in the summer, but that only in the second year";
// CLAUDE.md T28 2.2, 2.2.1, 2.2.2 and section 7). A closed day is a day nobody works and every
// bill is paid: one long weekend, with the owner's draw on its weekdays, a card before it and a
// card on the first day back.
//
// The calendar: thirty day months, day 1 is Mon 1 March 2025. Fri 1 December 2025 is day 271,
// Mon 11 December 281 and Thu 21 December 291; closed 292 to 305 (Fri 22 December to Thu
// 5 January 2026), Sat 30 December, the tax's day, is 300 and the 1st of January 301; Fri
// 6 January is 306 and Thu 12 January 312. 1 to 14 August 2025 are days 151 to 164 and stay
// open. Fri 1 July 2026 is 481, Fri 29 July 509; closed 511 to 524 (Sun 1 to Sat 14 August
// 2026); Mon 16 August is 526. Christmas 2026 is 652 to 665, Wed 10 December 2026 is 640, Mon
// 6 January 2027 is 666, and August 2027 is 871 to 884.

import { describe, expect, it } from 'vitest';
import {
  DAY_END_MINUTE,
  HOUSE_WINDOW_DAYS,
  LEDGER_MAX_ENTRIES,
  MINUTES_PER_WORKING_DAY,
  STATE_VERSION,
} from '../../src/engine/constants';
import { scheduleCalls } from '../../src/engine/calls';
import { takeLoan } from '../../src/engine/finance';
import { serviceMachine } from '../../src/engine/machines';
import { canHire, hire } from '../../src/engine/staff';
import { enquiriesDueToday } from '../../src/engine/board';
import {
  addWorkingDays,
  closureAhead,
  closureBefore,
  closureOf,
  closureSpan,
  dayMonthWords,
  dayOfWorkingIndex,
  formatCalendarDay,
  isLastWorkingDayOfMonth,
  isWeekday,
  isWorkingDay,
  weekday,
  workingDayIndex,
  workingDaysBetween,
} from '../../src/engine/clock';
import { drawContract, weekWanted } from '../../src/engine/contracts';
import { formatMoney, monthlyWageBill, runDayCosts } from '../../src/engine/economy';
import { deliverJob, orderTransport } from '../../src/engine/jobs';
import { migrateState } from '../../src/engine/migrate';
import {
  debtOnMorningOf,
  houseTierFor,
  labourFactorFor,
  nextDayLabourFactor,
  ownerDrawPerDay,
} from '../../src/engine/owner';
import { workPlan } from '../../src/engine/plan';
import { taxOn } from '../../src/engine/tax';
import { WARNING_ORDER, warnings } from '../../src/engine/warnings';
import type { GameEvent, GameState, Job, LedgerEntry } from '../../src/engine/index';
import {
  act,
  acceptNow,
  benchPlacesFor,
  buyStartingKit,
  clearEvents,
  eventsOfKind,
  firstJob,
  newGame,
  placeEnquiry,
  placeEquipment,
  testJoiner,
} from '../helpers';

const CHRISTMAS_2025 = { from: 292, to: 305 };
const SUMMER_2026 = { from: 511, to: 524 };
const CHRISTMAS_2026 = { from: 652, to: 665 };
const SUMMER_2027 = { from: 871, to: 884 };

/** The break's card in December 2025, every date in it the engine's own (CLAUDE.md T28 2.2.1). */
const CHRISTMAS_2025_CARD =
  'The workshop is closed from 22 December to 5 January. Nobody works; wages, rent and the bills are ' +
  'paid as always. The last working day is Thu 21 December and the first day back is Fri 6 January. ' +
  "A client's deadline does not count the closed days.";

/** And in December 2026, when the 22nd is a Monday. */
const CHRISTMAS_2026_CARD =
  'The workshop is closed from 22 December to 5 January. Nobody works; wages, rent and the bills are ' +
  'paid as always. The last working day is Fri 19 December and the first day back is Mon 6 January. ' +
  "A client's deadline does not count the closed days.";

/** And in July 2026, the first summer. */
const SUMMER_2026_CARD =
  'The workshop is closed from 1 August to 14 August. Nobody works; wages, rent and the bills are ' +
  'paid as always. The last working day is Fri 29 July and the first day back is Mon 16 August. ' +
  "A client's deadline does not count the closed days.";

/** The sentence a company under nought is told on top. */
const OVERDRAWN = " The account is overdrawn, and the bank's clock does not stop for the break.";

function range(from: number, to: number): number[] {
  return Array.from({ length: to - from + 1 }, (_, index) => from + index);
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

/** Home at five, and every card of the night and the morning answered: the next working day open. */
function nextMorning(state: GameState, seen: GameEvent[] = []): GameState {
  state.clock.minute = DAY_END_MINUTE;
  return clearEvents(act(clearEvents(state, seen), { type: 'END_DAY' }), seen);
}

function linesOn(state: GameState, day: number, category: LedgerEntry['category']): LedgerEntry[] {
  return state.ledger.filter((entry) => entry.day === day && entry.category === category);
}

/** Thu 21 December 2025 at five, with the thirty days before it run through the engine's own day
 *  costs, so the house reads a whole window of the draw: 1,500 a day, the public liability cover
 *  and the software on subscription, so the 1st of January has bills to take. */
function closingCompany(): GameState {
  const state = eveningOf(291, 500000);
  state.ownerDraw.tier = 3;
  state.insurance.liability = true;
  state.software.mode = 'subscription';
  for (let day = 291 - HOUSE_WINDOW_DAYS + 1; day <= 291; day += 1) {
    state.clock.day = day;
    runDayCosts(state, day);
  }
  state.clock.day = 291;
  state.eventQueue = [];
  return state;
}

/** What left the account on these days, the tax apart: the sum the break's card says. */
function spentOn(state: GameState, from: number, to: number): number {
  const out = state.ledger
    .filter((entry) => entry.day >= from && entry.day <= to && entry.category !== 'tax' && !entry.unpaid)
    .reduce((sum, entry) => sum + entry.amount, 0);
  return -out;
}

/** The job as the courier hands it over on this day, on a copy of the state. */
function deliveredOn(state: GameState, day: number): Job {
  const copy = JSON.parse(JSON.stringify(state)) as GameState;
  copy.clock.day = day;
  const job = firstJob(copy);
  job.stage = 'awaitingTransport';
  deliverJob(copy, job);
  return job;
}

describe('the closed days (CLAUDE.md T28 2.2)', () => {
  it('closes 22 December to 5 January from 2025 and 1 to 14 August from 2026, and no other day', () => {
    // Pins `closureOf`, the one function the calendar is asked of.
    for (const day of range(CHRISTMAS_2025.from, CHRISTMAS_2025.to)) expect(closureOf(day), String(day)).toBe('christmas');
    for (const day of range(SUMMER_2026.from, SUMMER_2026.to)) expect(closureOf(day), String(day)).toBe('summer');
    for (const day of range(CHRISTMAS_2026.from, CHRISTMAS_2026.to)) expect(closureOf(day), String(day)).toBe('christmas');
    for (const day of range(SUMMER_2027.from, SUMMER_2027.to)) expect(closureOf(day), String(day)).toBe('summer');
    for (const day of [291, 306, 510, 525, 651, 666, 870, 885]) expect(closureOf(day), String(day)).toBeNull();
    // The company's first August is worked: the summer closes from the second year.
    for (const day of range(151, 164)) expect(closureOf(day), String(day)).toBeNull();
    // And over the first three years those four fortnights are every closed day there is.
    const closures = [CHRISTMAS_2025, SUMMER_2026, CHRISTMAS_2026, SUMMER_2027];
    for (const day of range(1, 900)) {
      const inside = closures.some((span) => day >= span.from && day <= span.to);
      expect(closureOf(day) !== null, String(day)).toBe(inside);
    }
  });

  it('is no working day while closed, and the days either side of a closure are', () => {
    // Pins `isWorkingDay` on the closures, and `isWeekday` as the week alone.
    const closures = [CHRISTMAS_2025, SUMMER_2026, CHRISTMAS_2026, SUMMER_2027];
    for (const span of closures) {
      for (const day of range(span.from, span.to)) expect(isWorkingDay(day), String(day)).toBe(false);
    }
    // Thu 21 December 2025, Fri 6 January 2026, Mon 16 August 2026, Mon 6 January 2027.
    for (const day of [291, 306, 526, 666]) expect(isWorkingDay(day), String(day)).toBe(true);
    // A weekday is Monday to Friday by the week, closed or open.
    for (const day of range(1, 900)) expect(isWeekday(day), String(day)).toBe(weekday(day) < 5);
    expect(isWeekday(292)).toBe(true);
    expect(isWeekday(293)).toBe(false);
    // Off a closure, a working day is a weekday as it always was.
    for (const day of range(1, 900)) {
      if (closureOf(day) !== null) continue;
      expect(isWorkingDay(day), String(day)).toBe(isWeekday(day));
    }
  });

  it('knows the span of a closure, the one ahead in its warning month and the one just behind', () => {
    // Pins `closureSpan`, `closureAhead`, `closureBefore` and `dayMonthWords`.
    expect(closureSpan(300)).toEqual({ closure: 'christmas', from: 292, to: 305 });
    expect(closureSpan(292)).toEqual({ closure: 'christmas', from: 292, to: 305 });
    expect(closureSpan(515)).toEqual({ closure: 'summer', from: 511, to: 524 });
    expect(closureSpan(660)).toEqual({ closure: 'christmas', from: 652, to: 665 });
    for (const day of [291, 306, 160]) expect(closureSpan(day), String(day)).toBeNull();
    // December warns of Christmas until the 22nd; July of the summer from 2026 on.
    for (const day of range(271, 291)) expect(closureAhead(day), String(day)).toEqual({ closure: 'christmas', from: 292, to: 305 });
    for (const day of range(481, 510)) expect(closureAhead(day), String(day)).toEqual({ closure: 'summer', from: 511, to: 524 });
    for (const day of range(631, 651)) expect(closureAhead(day), String(day)).toEqual({ closure: 'christmas', from: 652, to: 665 });
    // Not in November, not once it has begun, not after it, and not in July 2025.
    for (const day of [270, 292, 300, 306, 480, 511, 526]) expect(closureAhead(day), String(day)).toBeNull();
    for (const day of range(121, 150)) expect(closureAhead(day), String(day)).toBeNull();
    // The first day back has the closure behind it; a Monday after a plain weekend has none.
    expect(closureBefore(306)).toBe('christmas');
    expect(closureBefore(526)).toBe('summer');
    expect(closureBefore(666)).toBe('christmas');
    for (const day of [274, 291, 309, 165]) expect(closureBefore(day), String(day)).toBeNull();
    expect(dayMonthWords(292)).toBe('22 December');
    expect(dayMonthWords(305)).toBe('5 January');
    expect(dayMonthWords(511)).toBe('1 August');
    expect(dayMonthWords(524)).toBe('14 August');
  });

  it('counts a deadline in open days: five from Thu 21 December is Thu 12 January, on time that day', () => {
    // Pins the due day (`addWorkingDays` in `takeEnquiry`) and the lateness (`workingDaysBetween`
    // in `deliverJob`) over a closure: a closed day is never a day late.
    // Fri 6, Mon 9, Tue 10, Wed 11 and Thu 12 January.
    expect(addWorkingDays(291, 5)).toBe(312);
    let state = eveningOf(291, 48000);
    state.clock.minute = 0;
    const enquiry = placeEnquiry(state, { deadlineDays: 5 });
    state = acceptNow(state, enquiry.id);
    const job = firstJob(state);
    expect(job.acceptedDay).toBe(291);
    expect(job.dueDay).toBe(312);
    expect(workingDaysBetween(job.dueDay, 312)).toBe(0);
    expect(deliveredOn(state, 312).daysLate).toBe(0);
    expect(deliveredOn(state, 306).daysLate).toBe(0);
    // Fri 13 January is one day late, and not fifteen.
    expect(deliveredOn(state, 313).daysLate).toBe(1);
    // A job due on the 21st and handed over on the first day back is one day late.
    expect(workingDaysBetween(291, 306)).toBe(1);
  });

  it('wants nothing of a standing contract in a wholly closed week, and the open days of the rest', () => {
    // Pins `weekWanted` pro rata by the open days (CLAUDE.md T28 2.2): no reputation is lost over a
    // week nobody could work.
    const contract = { ...drawContract(newGame()), quantityPerWeek: 40, startDay: 200, endDay: 400 };
    // Mon 18 to Sun 24 December: four days open before the break.
    expect(weekWanted(contract, 292)).toBe(Math.round((40 * 4) / 5));
    // Mon 25 December to Sun 1 January: all closed.
    expect(weekWanted(contract, 297)).toBe(0);
    // Mon 2 to Sun 8 January: Friday the 6th alone.
    expect(weekWanted(contract, 304)).toBe(Math.round((40 * 1) / 5));
    expect(weekWanted(contract, 309)).toBe(40);
  });
});

describe('a closure is one long weekend: the bills run and nobody works (CLAUDE.md T28 2.2)', () => {
  it('runs rent, rates, power, the draw on weekdays, the tax and the 1st through the break', () => {
    // Pins that every bill is paid on a closed day, and item 1: the owner's draw on Monday to
    // Friday, open or closed, and never on a Saturday or Sunday. His house does not drop.
    const before = closingCompany();
    expect(houseTierFor(before)).toBe(before.ownerDraw.tier + 1);
    const seen: GameEvent[] = [];
    const after = nextMorning(before, seen);
    expect(after.clock.day).toBe(306);
    for (const day of range(292, 305)) {
      expect(linesOn(after, day, 'rent'), String(day)).toHaveLength(1);
      expect(linesOn(after, day, 'rates'), String(day)).toHaveLength(1);
      expect(linesOn(after, day, 'power'), String(day)).toHaveLength(1);
      const draw = linesOn(after, day, 'ownerDraw');
      expect(draw, String(day)).toHaveLength(isWeekday(day) ? 1 : 0);
      for (const line of draw) expect(line.amount).toBe(-ownerDrawPerDay(after));
    }
    // The ten weekdays of the break by name, and the four days of the two weekends in it.
    const drawn = range(292, 305).filter((day) => linesOn(after, day, 'ownerDraw').length > 0);
    expect(drawn).toEqual([292, 295, 296, 297, 298, 299, 302, 303, 304, 305]);
    for (const day of [293, 294, 300, 301]) expect(linesOn(after, day, 'ownerDraw'), String(day)).toEqual([]);
    // The tax on Sat 30 December, first thing of the day, on the account as the day opened it.
    const tax = after.ledger.filter((entry) => entry.category === 'tax');
    expect(tax.map((entry) => [entry.day, entry.label])).toEqual([[300, 'Tax for 2025']]);
    const taxLine = tax[0];
    const lineBefore = taxLine === undefined ? undefined : after.ledger[after.ledger.indexOf(taxLine) - 1];
    expect(lineBefore?.day).toBe(299);
    expect(taxLine?.amount).toBe(-taxOn(lineBefore?.balance ?? 0));
    // The month's paper on Sun 1 January, closed: the subscription and the cover, and their card.
    expect(linesOn(after, 301, 'software').map((entry) => entry.label)).toEqual(['Software subscription']);
    expect(linesOn(after, 301, 'insurance')).toHaveLength(1);
    expect(eventsOfKind(seen, 'monthlyBills').map((event) => event.day)).toEqual([301]);
    // The house the day before the break and the day after it.
    expect(houseTierFor(after)).toBe(houseTierFor(before));
  });

  it("pays December's wages on Thu 21 December, the last working day before the break, and no other day", () => {
    // Pins that the month's wages go out on the last working day of the month, which in December
    // is the last one before the 22nd.
    for (const day of range(271, 300)) expect(isLastWorkingDayOfMonth(day), String(day)).toBe(day === 291);
    const state = eveningOf(290, 48000);
    state.workers.push(testJoiner('w-tom', 'Tom'));
    const seen: GameEvent[] = [];
    const thursday = nextMorning(state, seen);
    expect(thursday.clock.day).toBe(291);
    const after = nextMorning(thursday, seen);
    expect(after.clock.day).toBe(306);
    const december = after.ledger.filter((entry) => entry.category === 'wages' && entry.day >= 271 && entry.day <= 300);
    expect(december.map((entry) => [entry.day, entry.amount])).toEqual([[291, -monthlyWageBill(after)]]);
    expect(eventsOfKind(seen, 'wagesPaid').map((event) => event.day)).toEqual([291]);
  });

  it('opens no closed day: no enquiry, no delivery, no card but the bills, and no Weekend card', () => {
    // Pins that nobody works, nothing is made and nothing arrives in the break: a sheet order of
    // Thu 21 December comes on Fri 6 January, the first working day after it.
    const evening = act(eveningOf(291, 48000), { type: 'BUY_STOCK', sheets: 10 });
    const order = evening.deliveries.find((delivery) => delivery.orderedDay === 291);
    expect(order?.arriveDay).toBe(306);
    const seen: GameEvent[] = [];
    const after = nextMorning(evening, seen);
    expect(after.clock.day).toBe(306);
    expect(after.deliveries.find((delivery) => delivery.id === order?.id)?.arrived).toBe(true);
    for (const event of eventsOfKind(seen, 'deliveryArrived')) expect(event.day).toBe(306);
    // No enquiry was drawn on a closed day, and none would have been.
    expect(after.enquiries.filter((enquiry) => enquiry.createdDay > 291 && enquiry.createdDay < 306)).toEqual([]);
    for (const day of range(292, 305)) {
      const probe = JSON.parse(JSON.stringify(after)) as GameState;
      probe.clock.day = day;
      expect(enquiriesDueToday(probe), String(day)).toBe(0);
    }
    // The only cards of the closed days are the bills'.
    const ofTheBreak = seen.filter((event) => event.day >= 292 && event.day <= 305);
    expect(ofTheBreak.length).toBeGreaterThan(0);
    for (const event of ofTheBreak) {
      expect(['taxPaid', 'monthlyBills', 'lateAccounts'], `${event.day} ${event.kind}`).toContain(event.kind);
    }
    expect(eventsOfKind(seen, 'weekend')).toEqual([]);
    // No closed day was a day of work: the day records go from the 21st to the 6th.
    const next = nextMorning(after);
    expect(next.days.map((entry) => entry.day).filter((day) => day >= 291 && day <= 306)).toEqual([291, 306]);
  });

  it('clears the overtime debt on the first day back, as on a Monday', () => {
    // Pins item 4: `debtOnMorningOf` reads a closure behind the morning as it reads a weekend.
    expect(debtOnMorningOf(306, 0.2)).toBe(0);
    expect(debtOnMorningOf(526, 0.2)).toBe(0);
    // A Thursday after a Wednesday keeps it.
    expect(debtOnMorningOf(291, 0.2)).toBe(0.2);
    const tired = eveningOf(291, 48000);
    tired.owner.overtimeDebt = 0.2;
    expect(nextDayLabourFactor(tired)).toBe(labourFactorFor(0, false));
    const back = nextMorning(tired);
    expect(back.clock.day).toBe(306);
    expect(back.owner.overtimeDebt).toBe(0);
    expect(back.owner.labourFactor).toBe(labourFactorFor(0, false));
    // The same debt over a plain night is carried.
    const wednesday = eveningOf(290, 48000);
    wednesday.owner.overtimeDebt = 0.2;
    const thursday = nextMorning(wednesday);
    expect(thursday.clock.day).toBe(291);
    expect(thursday.owner.overtimeDebt).toBe(0.2);
  });
});

describe("the Work Plan's axis over a closure (CLAUDE.md T28 2.2 item 2)", () => {
  it('counts the working days and nothing else: a closed day is no column, as a Saturday is not', () => {
    // Pins `workingDayIndex` as the count of the days `isWorkingDay` is true of, and
    // `dayOfWorkingIndex` as its inverse on every working day.
    let count = 0;
    for (const day of range(1, 900)) {
      if (isWorkingDay(day)) count += 1;
      expect(workingDayIndex(day), String(day)).toBe(count);
      if (isWorkingDay(day)) expect(dayOfWorkingIndex(workingDayIndex(day)), String(day)).toBe(day);
    }
    // Fri 6 January is the column after Thu 21 December; Mon 16 August the one after Fri 29 July.
    expect(workingDayIndex(306)).toBe(workingDayIndex(291) + 1);
    expect(workingDayIndex(526)).toBe(workingDayIndex(509) + 1);
    // A closed day reads as the last day before it that was open, as a Saturday reads as Friday.
    expect(workingDayIndex(300)).toBe(workingDayIndex(291));
  });

  it('draws no closed day, and puts each due point on its own day either side of the break', () => {
    // Pins the board: columns, due points and the latest start count no closed day.
    let state = eveningOf(288, 48000);
    state.clock.minute = 0;
    const soon = placeEnquiry(state, { deadlineDays: 1, expiresOnDay: 300 });
    state = acceptNow(state, soon.id);
    // Days of work for one man, due after the break: its latest start is counted back over it.
    const later = placeEnquiry(state, { deadlineDays: 8, price: 6000, expiresOnDay: 300 });
    state = acceptNow(state, later.id);
    expect(state.jobs.map((job) => job.dueDay).sort((left, right) => left - right)).toEqual([289, 312]);
    const plan = workPlan(state);
    expect(plan.days.length).toBeGreaterThan(0);
    for (const column of plan.days) {
      expect(isWorkingDay(column.day), String(column.day)).toBe(true);
      expect(closureOf(column.day), String(column.day)).toBeNull();
      expect(column.point).toBe(workingDayIndex(column.day));
    }
    // One column a day, with no gap where the break was.
    for (let index = 1; index < plan.days.length; index += 1) {
      expect(plan.days[index]?.point, String(plan.days[index]?.day)).toBe((plan.days[index - 1]?.point ?? 0) + 1);
    }
    const days = plan.days.map((column) => column.day);
    expect(days[days.indexOf(291) + 1]).toBe(306);
    for (const row of plan.rows) {
      expect(row.duePoint).toBe(workingDayIndex(row.dueDay));
      expect(plan.days.find((column) => column.day === row.dueDay)?.point, row.jobId).toBe(row.duePoint);
    }
    // The long job's latest start falls on a working day before the break, not in it.
    const long = plan.rows.find((row) => row.dueDay === 312);
    expect(Math.ceil((long?.minutesTotal ?? 0) / MINUTES_PER_WORKING_DAY)).toBeGreaterThan(5);
    const latest = long?.latestStart ?? 0;
    expect(isWorkingDay(Math.floor(latest)), String(latest)).toBe(true);
    expect(latest).toBeLessThan(CHRISTMAS_2025.from);
    expect(Math.floor(latest)).toBe(dayOfWorkingIndex(Math.floor(long?.latestStartPoint ?? 0)));
  });
});

describe('told before (CLAUDE.md T28 2.2.1)', () => {
  it('raises the Christmas card on Fri 1 December, once, after the tax card', () => {
    // Pins the card's day, its words and its place behind `Tax is coming`.
    const seen: GameEvent[] = [];
    let state = nextMorning(eveningOf(270, 48000), seen);
    expect(state.clock.day).toBe(271);
    const kinds = seen.map((event) => event.kind);
    expect(kinds.indexOf('taxComing')).toBeGreaterThanOrEqual(0);
    expect(kinds.indexOf('closureComing')).toBeGreaterThan(kinds.indexOf('taxComing'));
    const card = eventsOfKind(seen, 'closureComing');
    expect(card).toHaveLength(1);
    expect(card[0]?.day).toBe(271);
    expect(card[0]?.title).toBe('Christmas break');
    expect(card[0]?.body).toBe(CHRISTMAS_2025_CARD);
    expect(card[0]?.choices).toEqual([{ id: 'ok', label: 'Right' }]);
    expect(state.closureWarnedFor).toBe(292);
    // And not again before the break, nor on the way back from it.
    while (state.clock.day < 306) state = nextMorning(state, seen);
    expect(state.clock.day).toBe(306);
    expect(eventsOfKind(seen, 'closureComing')).toHaveLength(1);
  });

  it('tells a company under nought that the bank does not stop for the break', () => {
    // Pins the one sentence more of 2.2.1 for an overdrawn account.
    const seen: GameEvent[] = [];
    const state = nextMorning(eveningOf(270, -3000), seen);
    expect(state.cash).toBeLessThan(0);
    expect(eventsOfKind(seen, 'closureComing')[0]?.body).toBe(CHRISTMAS_2025_CARD + OVERDRAWN);
  });

  it('says nothing in the summer of 2025, and opens every weekday of that August', () => {
    // Pins that the summer closes from the second year: no card in July 2025, no closure after it.
    const seen: GameEvent[] = [];
    let state = nextMorning(eveningOf(120, 48000), seen);
    expect(state.clock.day).toBe(121);
    const opened: number[] = [];
    while (state.clock.day <= 165) {
      opened.push(state.clock.day);
      expect(warnings(state).some((warning) => warning.key === 'closureComing'), String(state.clock.day)).toBe(false);
      state = nextMorning(state, seen);
    }
    expect(eventsOfKind(seen, 'closureComing')).toEqual([]);
    expect(eventsOfKind(seen, 'closureOver')).toEqual([]);
    expect(state.closureWarnedFor).toBeNull();
    for (const day of range(151, 164)) expect(opened.includes(day), String(day)).toBe(isWeekday(day));
  });

  it('raises the summer card on Fri 1 July 2026, once', () => {
    // Pins the July warning of the second year, its dates computed.
    const seen: GameEvent[] = [];
    const state = nextMorning(eveningOf(480, 48000), seen);
    expect(state.clock.day).toBe(481);
    const card = eventsOfKind(seen, 'closureComing');
    expect(card).toHaveLength(1);
    expect(card[0]?.title).toBe('Summer break');
    expect(card[0]?.body).toBe(SUMMER_2026_CARD);
    expect(state.closureWarnedFor).toBe(511);
    expect(formatCalendarDay(509)).toBe('Fri 29 July');
    expect(formatCalendarDay(526)).toBe('Mon 16 August');
  });

  it('is said on the next open to a save that came into the month without it', () => {
    // Pins section 4's promise: a save loaded between the card's day and the closure gets the card
    // on its next open, and not never.
    const seen: GameEvent[] = [];
    const unwarned = eveningOf(281, 48000);
    expect(unwarned.closureWarnedFor).toBeNull();
    const tuesday = nextMorning(unwarned, seen);
    expect(tuesday.clock.day).toBe(282);
    expect(eventsOfKind(seen, 'closureComing').map((event) => event.day)).toEqual([282]);
    expect(tuesday.closureWarnedFor).toBe(292);
    // A v40 save of Wed 10 December 2026, from before the holidays were in the game.
    const save = eveningOf(640, 30000);
    save.clock.minute = 300;
    const raw = JSON.parse(JSON.stringify(save)) as Record<string, unknown>;
    delete raw.closureWarnedFor;
    raw.version = 40;
    const lifted = migrateState(raw, 40);
    if (lifted === null) throw new Error('the v40 save did not load');
    expect(lifted.version).toBe(STATE_VERSION);
    expect(lifted.closureWarnedFor).toBeNull();
    const after: GameEvent[] = [];
    const thursday = nextMorning(lifted, after);
    expect(thursday.clock.day).toBe(641);
    const kinds = after.map((event) => event.kind);
    expect(kinds.indexOf('closureComing')).toBeGreaterThan(kinds.indexOf('taxComing'));
    const card = eventsOfKind(after, 'closureComing');
    expect(card).toHaveLength(1);
    expect(card[0]?.body).toBe(CHRISTMAS_2026_CARD);
    expect(thursday.closureWarnedFor).toBe(652);
  });

  it('keeps the strip line from the card to Thu 21 December, today counted, and not a day after', () => {
    // Pins `closureComing` on the strip: its words, its count, its days and its place under the
    // tax's line.
    expect(WARNING_ORDER.indexOf('closureComing')).toBe(WARNING_ORDER.indexOf('taxComing') + 1);
    const line = (state: GameState): string | undefined =>
      warnings(state).find((warning) => warning.key === 'closureComing')?.text;
    expect(line(eveningOf(270, 48000))).toBeUndefined();
    // Not before the card is raised, even in the window.
    const unwarned = eveningOf(281, 48000);
    unwarned.clock.minute = 0;
    expect(line(unwarned)).toBeUndefined();
    const seen: GameEvent[] = [];
    let state = nextMorning(eveningOf(270, 48000), seen);
    const said = new Map<number, string | undefined>();
    while (state.clock.day <= 291) {
      const day = state.clock.day;
      const left = workingDaysBetween(day, 291) + 1;
      said.set(day, line(state));
      expect(line(state), String(day)).toBe(
        `Closed from 22 December: ${left} ${left === 1 ? 'working day' : 'working days'} left`,
      );
      state = nextMorning(state, seen);
    }
    expect([...said.keys()]).toEqual([271, 274, 275, 276, 277, 278, 281, 282, 283, 284, 285, 288, 289, 290, 291]);
    expect(said.get(271)).toBe('Closed from 22 December: 15 working days left');
    expect(said.get(281)).toBe('Closed from 22 December: 9 working days left');
    expect(said.get(291)).toBe('Closed from 22 December: 1 working day left');
    expect(state.clock.day).toBe(306);
    expect(line(state)).toBeUndefined();
  });

  it('says the summer on the strip from Fri 1 July to Fri 29 July 2026', () => {
    // Pins the strip line in July, the month it is the line the strip shows.
    const line = (state: GameState): string | undefined =>
      warnings(state).find((warning) => warning.key === 'closureComing')?.text;
    const state = nextMorning(eveningOf(480, 48000));
    expect(line(state)).toBe('Closed from 1 August: 21 working days left');
    state.clock.day = 509;
    expect(line(state)).toBe('Closed from 1 August: 1 working day left');
    state.clock.day = 526;
    expect(line(state)).toBeUndefined();
  });

  it('puts the last day to spend on the tax card in 2026, the day computed', () => {
    // Pins item 5 when the 22nd is a Monday: the last day is the Friday before it. The 2025 card's
    // whole body is pinned by tests/engine/tax.test.ts.
    const later: GameEvent[] = [];
    const monday = nextMorning(eveningOf(628, 48000), later);
    expect(monday.clock.day).toBe(631);
    expect(eventsOfKind(later, 'taxComing')[0]?.body).toBe(
      `On 30 December the taxman takes 25% of whatever is in the account: ${formatMoney(taxOn(monday.cash))} as it stands today. ` +
        'Money spent on machines or on the workshop before then is not taxed. ' +
        'The workshop is closed from 22 December, so the last day to spend is Fri 19 December. Invest, or pay.',
    );
    expect(eventsOfKind(later, 'closureComing')[0]?.body).toBe(CHRISTMAS_2026_CARD);
  });
});

describe('told on the first day back (CLAUDE.md T28 2.2.2)', () => {
  it("raises the break's card on Fri 6 January in place of the Weekend card, after the tax's", () => {
    // Pins the `closureOver` card: its words, its days, its money without the tax, and its place.
    const seen: GameEvent[] = [];
    const after = nextMorning(closingCompany(), seen);
    expect(after.clock.day).toBe(306);
    expect(eventsOfKind(seen, 'weekend')).toEqual([]);
    const kinds = seen.map((event) => event.kind);
    expect(kinds.indexOf('taxPaid')).toBeGreaterThanOrEqual(0);
    expect(kinds.indexOf('closureOver')).toBeGreaterThan(kinds.indexOf('taxPaid'));
    expect(eventsOfKind(seen, 'taxPaid')[0]?.day).toBe(300);
    const card = eventsOfKind(seen, 'closureOver');
    expect(card).toHaveLength(1);
    const out = spentOn(after, 292, 305);
    expect(card[0]?.title).toBe('Back from the Christmas break');
    expect(card[0]?.body).toBe(`14 days closed. Rent, rates and the bills ran anyway: ${formatMoney(out)} out.`);
    expect(card[0]?.choices).toEqual([{ id: 'ok', label: 'Back to work' }]);
    expect(card[0]?.data.closure).toBe('christmas');
    expect(card[0]?.data.days).toBe(14);
    expect(Math.abs(Number(card[0]?.data.costs) - out)).toBeLessThanOrEqual(0.5);
    // The tax is a card of its own and is not in the sum: the account fell by the two together.
    const tax = after.ledger.find((entry) => entry.category === 'tax');
    expect(tax?.day).toBe(300);
    const balanceOn = (day: number): number =>
      [...after.ledger].reverse().find((entry) => entry.day <= day)?.balance ?? 0;
    expect(balanceOn(291) - balanceOn(305)).toBeCloseTo(out - (tax?.amount ?? 0), 2);
  });

  it('says the summer the same way on Mon 16 August 2026, the weekends either side counted', () => {
    // Pins the summer card: Fri 29 July at five to Mon 16 August is sixteen days stepped over.
    const seen: GameEvent[] = [];
    const after = nextMorning(eveningOf(509, 48000), seen);
    expect(after.clock.day).toBe(526);
    expect(eventsOfKind(seen, 'weekend')).toEqual([]);
    const card = eventsOfKind(seen, 'closureOver');
    expect(card).toHaveLength(1);
    const out = spentOn(after, 510, 525);
    expect(card[0]?.title).toBe('Back from the summer break');
    expect(card[0]?.body).toBe(`16 days closed. Rent, rates and the bills ran anyway: ${formatMoney(out)} out.`);
    expect(card[0]?.data.closure).toBe('summer');
    expect(card[0]?.data.days).toBe(16);
    // And the Monday after a plain weekend has its Weekend card as ever.
    const plain: GameEvent[] = [];
    const monday = nextMorning(eveningOf(271, 48000), plain);
    expect(monday.clock.day).toBe(274);
    expect(eventsOfKind(plain, 'weekend')).toHaveLength(1);
    expect(eventsOfKind(plain, 'closureOver')).toEqual([]);
  });

  it('leaves the tax out of the card when the ledger is full, reading the days and not the ledger', () => {
    // The ledger keeps its last lines only: a full one loses its oldest as the break's are written,
    // and the card's figure must not depend on where the tax's line ended up.
    const state = closingCompany();
    const old = state.ledger[0];
    if (old === undefined) throw new Error('no ledger');
    while (state.ledger.length < LEDGER_MAX_ENTRIES) state.ledger.unshift({ ...old, day: 1 });
    const seen: GameEvent[] = [];
    const after = nextMorning(state, seen);
    expect(after.ledger.length).toBe(LEDGER_MAX_ENTRIES);
    const card = eventsOfKind(seen, 'closureOver')[0];
    const out = spentOn(after, 292, 305);
    expect(card?.body).toBe(`14 days closed. Rent, rates and the bills ran anyway: ${formatMoney(out)} out.`);
    expect(after.ledger.some((entry) => entry.category === 'tax' && entry.day === 300)).toBe(true);
  });

  it('lets a save standing on a day now closed finish it, and the closure takes the days after', () => {
    // Pins section 2.2's last paragraph: a save on Mon 25 December 2025 opens next on Fri 6 January.
    const seen: GameEvent[] = [];
    const after = nextMorning(eveningOf(295, 48000), seen);
    expect(after.clock.day).toBe(306);
    expect(eventsOfKind(seen, 'weekend')).toEqual([]);
    const card = eventsOfKind(seen, 'closureOver');
    expect(card).toHaveLength(1);
    expect(card[0]?.data.days).toBe(10);
  });
});

describe('what is counted in working days steps over the break (CLAUDE.md T28 2.2)', () => {
  it('sends the courier, brings the machine back from its service and starts a new man on Fri 6 January', () => {
    // A booked courier, a machine's return from its service and a new man's first day are counted
    // in working days, so each of them asked for on Thu 21 December is Fri 6 January.
    let state = eveningOf(291, 48000);
    state.clock.minute = 0;
    const enquiry = placeEnquiry(state, { deadlineDays: 5 });
    state = acceptNow(state, enquiry.id);
    const job = firstJob(state);
    job.stage = 'awaitingTransport';
    job.finishedDay = 291;
    expect(orderTransport(state, job.id)).toBe(true);
    expect(job.deliverOnDay).toBe(306);
    const machine = placeEquipment(state, 'tableSaw', { variantId: 'standard', x: 5, y: 0 });
    expect(serviceMachine(state, machine.id)?.inServiceUntilDay).toBe(306);
    const kitted = benchPlacesFor(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 1);
    placeEquipment(kitted, 'locker');
    placeEquipment(kitted, 'toolCabinet', { variantId: 'budget', x: 2, y: 8 });
    placeEquipment(kitted, 'handToolSet');
    kitted.clock.day = 291;
    expect(canHire(kitted, 'joiner', 'novice')).toEqual({ ok: true, reason: '' });
    expect(hire(kitted, 'joiner', 'novice')?.startDay).toBe(306);
  });

  it('puts no client call on a closed day', () => {
    // The client rings on the days the workshop is open: none of a job's calls falls in the break.
    let state = eveningOf(289, 48000);
    state.clock.minute = 0;
    const enquiry = placeEnquiry(state, { deadlineDays: 10, price: 6000 });
    state = acceptNow(state, enquiry.id);
    const job = firstJob(state);
    job.calls = [];
    scheduleCalls(state, job);
    expect(job.calls.length).toBeGreaterThan(0);
    for (const call of job.calls) expect(isWorkingDay(call.day), String(call.day)).toBe(true);
    expect(job.calls.some((call) => call.day > 305)).toBe(true);
  });

  it('takes the loan and the security on the closed 1st of January', () => {
    // The month's paper is taken on a 1st that is closed, as on a Saturday 1st.
    const state = closingCompany();
    state.security.level = 3;
    state.clock.day = 291;
    expect(takeLoan(state, 10000).ok).toBe(true);
    const after = nextMorning(state);
    expect(after.clock.day).toBe(306);
    expect(linesOn(after, 301, 'security')).toHaveLength(1);
    expect(after.ledger.some((entry) => entry.day === 301 && (entry.category === 'loan' || entry.category === 'loanInterest'))).toBe(true);
  });
});

describe('each closure is warned of once (CLAUDE.md T28 2.2.1, section 7)', () => {
  it('raises the break s card once for Christmas 2026 and for the summer of 2027, and its back card once', () => {
    // Fri 28 November 2026 at five to Mon 6 January 2027; Fri 28 June 2027 at five to Wed 15 August 2027.
    const spans: Array<[number, number, string, string]> = [
      [628, 666, 'Christmas break', 'Back from the Christmas break'],
      [838, 885, 'Summer break', 'Back from the summer break'],
    ];
    for (const [evening, back, title, overTitle] of spans) {
      const seen: GameEvent[] = [];
      let state = nextMorning(eveningOf(evening, 48000), seen);
      while (state.clock.day < back) state = nextMorning(state, seen);
      expect(state.clock.day, title).toBe(back);
      expect(eventsOfKind(seen, 'closureComing').map((event) => event.title), title).toEqual([title]);
      expect(eventsOfKind(seen, 'closureOver').map((event) => [event.day, event.title]), title).toEqual([[back, overTitle]]);
    }
  });
});
