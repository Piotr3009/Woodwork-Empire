// The workshop rate: what the workshop earns for every hour it pays for (PIOTR, 17.09: "if the
// shop stands two days and the wages are paid, the rate drops by itself; if a joiner works four
// of the eight hours we pay him, it drops; a better saw, an express job, a clean hall all raise
// it. That is the measure"; CLAUDE.md T17 2.26).
//
//     workshop rate = labour earned on jobs and contracts / hours paid
//
// It is gross: no costs come off it and nothing sits beside it. The top is the labour value the
// engine books minute by minute as the work is done, plus what an express job pays over its base
// price, plus a contract piece's own labour. The bottom is eight hours for every man on the books
// and eight for the owner, every working day, worked or not, and the overtime the owner actually
// stayed for on top.
//
// The owner alone, at his work every minute of his eight hours, reads exactly OWNER_RATE_PER_HOUR:
// 40 an hour. Everything that slows him pulls it under; an express job and a better machine push
// it over. This is not `earnedRate` in economy.ts, which is the same labour over the minutes
// actually worked: that one says what an hour at a bench is worth, this one says what the whole
// week of wages bought.

import { isWorkingDay, monthOfDay } from './clock';
import { PAID_HOURS_PER_WORKING_DAY, RATE_WEEK_DAYS } from './constants';
import type { DaySummary, GameState } from './types';

export interface WorkshopRate {
  /** Labour earned over the hours paid, in pounds an hour. */
  rate: number;
  /** What the window earned in labour, and the hours it paid for. */
  labour: number;
  paidHours: number;
  /** The rate over the people on the books, the owner included, and how many those were. */
  perMan: number;
  people: number;
  /** Working days the window actually had a closed day for. */
  days: number;
}

const NOTHING: WorkshopRate = {
  rate: 0,
  labour: 0,
  paidHours: 0,
  perMan: 0,
  people: 0,
  days: 0,
};

function pence(value: number): number {
  return Math.round(value * 100) / 100;
}

/** The hours the company pays for today whether they are worked or not: eight for every man on
 *  the books and eight for the owner, plus the overtime the owner has stayed for so far. The one
 *  place the bottom of the rate is worked out: the day's close writes this into the day's stats
 *  and the day record carries it, so a week of it survives a save (CLAUDE.md T17 2.26, section 4).
 *
 *  A man on holiday or off sick is on the books and is paid, so he counts his eight: that is the
 *  point of the figure. The weekend pays nobody, and the clock never stands on one. */
export function paidHoursToday(state: GameState): number {
  if (!isWorkingDay(state.clock.day)) return 0;
  let heads = 1;
  for (const worker of state.workers) {
    if (worker.startDay <= state.clock.day) heads += 1;
  }
  return pence(heads * PAID_HOURS_PER_WORKING_DAY + state.owner.overtimeMinutes / 60);
}

/** What a closed day earned: the labour booked into the work of it, and what the express jobs in
 *  it paid over their base price for the same hours. */
export function labourEarnedOn(day: DaySummary): number {
  return pence(day.labourValue + day.expressUplift);
}

/** The figure over a run of closed days. Days that paid nobody are not in it: a save from before
 *  the hours were counted has none of them, and the rate starts from the days this build closed. */
export function workshopRateOf(days: readonly DaySummary[]): WorkshopRate {
  let labour = 0;
  let paidHours = 0;
  let manHours = 0;
  let counted = 0;
  for (const day of days) {
    if (day.paidHours <= 0) continue;
    labour += labourEarnedOn(day);
    paidHours += day.paidHours;
    // The heads the day paid for: its hours less the owner's evening, which is his alone.
    manHours += Math.max(0, day.paidHours - day.overtimeMinutes / 60);
    counted += 1;
  }
  if (paidHours <= 0 || counted === 0) return { ...NOTHING };
  const rate = pence(labour / paidHours);
  const people = manHours / (PAID_HOURS_PER_WORKING_DAY * counted);
  return {
    rate,
    labour: pence(labour),
    paidHours: pence(paidHours),
    perMan: people > 0 ? pence(rate / people) : rate,
    people: Math.round(people * 100) / 100,
    days: counted,
  };
}

/** The closed days the rate is read over, oldest first: every day this build has paid for. */
export function ratedDays(state: GameState): DaySummary[] {
  return state.days.filter((day) => day.paidHours > 0).sort((left, right) => left.day - right.day);
}

/** The week on the Company board: the last five working days the workshop closed. A rolling week
 *  and not the calendar's, so the figure means the same on a Monday morning as on a Friday
 *  afternoon, and the day in hand is not in it: a day that has paid for eight hours and had the
 *  chance to earn one of them is not a rate (CLAUDE.md T17 2.26). */
export function weekRate(state: GameState): WorkshopRate {
  const days = ratedDays(state);
  return workshopRateOf(days.slice(Math.max(0, days.length - RATE_WEEK_DAYS)));
}

/** The five working days before those, for the small figure beside it. */
export function lastWeekRate(state: GameState): WorkshopRate {
  const days = ratedDays(state);
  const to = Math.max(0, days.length - RATE_WEEK_DAYS);
  return workshopRateOf(days.slice(Math.max(0, to - RATE_WEEK_DAYS), to));
}

/** The same figure for a whole month, which is the first line of the month end. */
export function monthRate(state: GameState, month: number): WorkshopRate {
  return workshopRateOf(state.days.filter((day) => monthOfDay(day.day) === month));
}
