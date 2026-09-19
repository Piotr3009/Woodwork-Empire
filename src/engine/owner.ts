// The owner: his minute pool, what a day of overtime costs him tomorrow, absence and sick leave.
// His 480 minutes a day are the core resource of the game (CLAUDE.md 1.3).

import {
  BREAK_MINUTES,
  HOLIDAY_MAX_DAYS,
  HOUSE_WINDOW_DAYS,
  NIGHT_QUALITY_TIER_DROP,
  OWNER_AWAY_PENALTY,
  OWNER_AWAY_PENALTY_WITH_PM,
  OWNER_DRAW_TIERS,
  BREAK_SKIP_FACTOR,
  DAY_CATEGORIES,
  DAYS_PER_YEAR,
  LABOUR_FACTOR_FLOOR,
  MINUTES_PER_WORKING_DAY,
  OVERTIME_DEBT_PER_DAY,
  SICK_DAYS_MAX,
  SICK_DAYS_MIN,
} from './constants';
import {
  isMonday,
  isOvertime,
  isWorkingDay,
  nextWorkingDay,
  workedMinutesOfDay,
  yearOfDay,
} from './clock';
import { queueEvent } from './events';
import { int } from './rng';
import type { DayCategory, DayLogEntry, GameState, Job, OwnerIdleReason } from './types';

/** Round to four places, which is where every factor in the engine stops. */
function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}

/** What a morning's output is worth after last week's overtime and last night's dinner. An hour
 *  worked through costs 3% and a day with any overtime in it costs 10%, cumulative, floored
 *  (CLAUDE.md T6 3.4). */
export function labourFactorFor(overtimeDebt: number, breakSkipped: boolean): number {
  const factor = (1 - overtimeDebt) * (breakSkipped ? BREAK_SKIP_FACTOR : 1);
  return Math.max(LABOUR_FACTOR_FLOOR, round4(factor));
}

/** The overtime debt a morning opens with. Monday starts clean, whatever last week cost him
 *  (PIOTR: reset at the weekend). The one place that rule is written, so the evening summary
 *  cannot promise a morning something the morning will not do (CLAUDE.md T6 3.4). */
export function debtOnMorningOf(day: number, overtimeDebt: number): number {
  return isMonday(day) ? 0 : overtimeDebt;
}

/** The factor the next working day will open on, as the evening can already see it. */
export function nextDayLabourFactor(state: GameState): number {
  const owner = state.owner;
  return labourFactorFor(
    debtOnMorningOf(nextWorkingDay(state.clock.day), owner.overtimeDebt),
    owner.breakSkipped,
  );
}

/** Work done per clock minute the owner spends. An overtime minute is worth as much as any other:
 *  what overtime costs is tomorrow, not tonight. */
export function ownerEfficiency(state: GameState): number {
  return state.owner.labourFactor;
}

/** The minutes of work the day holds for him: his 480, and the hour of dinner as well when he has
 *  decided to work through it. */
export function ownerMinutesToday(state: GameState): number {
  return MINUTES_PER_WORKING_DAY + (state.owner.breakSkipped ? BREAK_MINUTES : 0);
}

/** Minutes of the normal working day still ahead. Overtime is not in the pool. */
export function ownerMinutesLeft(state: GameState): number {
  const worked = workedMinutesOfDay(state.clock.minute, state.owner.breakSkipped);
  return Math.max(0, ownerMinutesToday(state) - worked);
}

/** True while the owner can pick up work. */
export function ownerIsAvailable(state: GameState): boolean {
  return state.owner.present && !state.owner.wentHome;
}

/** What an absent owner costs the company: 30% off every staff minute, or 8% with a production
 *  manager on the books to cover him (PIOTR; CLAUDE.md 7.3, T13 3.9). */
export function absenceFactor(hasManager: boolean): number {
  return 1 - (hasManager ? OWNER_AWAY_PENALTY_WITH_PM : OWNER_AWAY_PENALTY);
}

/** True while a production manager is on the books and in today (CLAUDE.md T13 3.9). Written
 *  here and not in staff.ts, which imports this module. */
export function managerOnDuty(state: GameState): boolean {
  return state.workers.some(
    (worker) =>
      worker.role === 'productionManager' &&
      worker.startDay <= state.clock.day &&
      worker.absentDaysRemaining === 0,
  );
}

/** Staff output when the owner is not in the workshop (CLAUDE.md 7.3, T13 3.9). The manager adds
 *  nothing while the owner is in: the factor is one either way then. */
export function staffOutputFactor(state: GameState): number {
  if (ownerIsAvailable(state)) return 1;
  return absenceFactor(managerOnDuty(state));
}

/** The share of a piece that was made on the second shift, 0 to 1 (CLAUDE.md T13 3.9). */
export function nightShareOf(job: Job): number {
  if (job.productionMinutes <= 0 || job.nightMinutes <= 0) return 0;
  return Math.min(1, Math.round((job.nightMinutes / job.productionMinutes) * 10000) / 10000);
}

/** What the night takes off the client's verdict: a tier for a piece made wholly at night, and
 *  the share of a tier for the share of it that was (PIOTR: "quality drops one tier for work done
 *  at night"; CLAUDE.md T13 3.9). A tier is one point of rating, as the dusty hall's is. Written
 *  here, the module with no engine imports of its own, so reputation.ts can read it in
 *  `applyRating` without a cycle. */
export function nightQualityPenalty(job: Job): number {
  return Math.round(NIGHT_QUALITY_TIER_DROP * nightShareOf(job) * 100) / 100;
}

/** What the owner pays himself a day, at the tier he chose (CLAUDE.md T13 3.18). */
export function ownerDrawPerDay(state: GameState): number {
  return OWNER_DRAW_TIERS[state.ownerDraw.tier] ?? OWNER_DRAW_TIERS[0] ?? 0;
}

/** What the owner has actually paid himself over the last thirty calendar days, off the ledger
 *  (CLAUDE.md T13 3.18). */
export function ownerDrawPaidInWindow(state: GameState): number {
  const from = state.clock.day - HOUSE_WINDOW_DAYS + 1;
  let paid = 0;
  for (const entry of state.ledger) {
    if (entry.category !== 'ownerDraw' || entry.unpaid || entry.day < from) continue;
    paid += -entry.amount;
  }
  return Math.round(paid * 100) / 100;
}

/** The working days a thirty calendar day window holds: what the draw is charged on, so the
 *  thirty day sum of a tier is its daily figure over these (CLAUDE.md T13 3.18). */
export function workingDaysInHouseWindow(): number {
  return Math.round((HOUSE_WINDOW_DAYS * 5) / 7);
}

/** The thirty day sum a tier wants to have been paid: its draw over the working days of the
 *  window. Index 0 is the first tier. */
export function houseSumFor(tierIndex: number): number {
  return (OWNER_DRAW_TIERS[tierIndex] ?? OWNER_DRAW_TIERS[0] ?? 0) * workingDaysInHouseWindow();
}

/** The house tier, 1 to 8: the highest threshold whose thirty day sum the owner has actually paid
 *  himself, off the ledger and never off the setting, so a raised draw shows the new house only
 *  once the money has really gone (CLAUDE.md T13 3.18). A fresh game reads tier 1 until the first
 *  threshold's thirty days have been paid, and reads tier 1 then too: there is nothing below the
 *  first threshold to be. */
export function houseTierFor(state: GameState): number {
  const paid = ownerDrawPaidInWindow(state);
  let tier = 1;
  OWNER_DRAW_TIERS.forEach((_draw, index) => {
    if (paid >= houseSumFor(index) - 0.01) tier = index + 1;
  });
  return tier;
}

/** True while the owner is away on holiday, today included (CLAUDE.md T13 3.9). */
export function onHoliday(state: GameState): boolean {
  return state.owner.holidayDaysRemaining > 0;
}

/** Why the owner cannot take this holiday, or that he can: the one reason the button is greyed
 *  with and the action refuses on (CLAUDE.md T13 3.9). */
export function holidayCheck(state: GameState, days: number): { ok: boolean; reason: string } {
  if (!managerOnDuty(state)) return { ok: false, reason: 'No production manager to cover' };
  if (onHoliday(state)) return { ok: false, reason: 'Already on holiday' };
  if (state.owner.sickDaysRemaining > 0) return { ok: false, reason: 'Off sick already' };
  if (days <= 0) return { ok: false, reason: 'No days asked for' };
  if (days > HOLIDAY_MAX_DAYS) return { ok: false, reason: `At most ${HOLIDAY_MAX_DAYS} days` };
  return { ok: true, reason: '' };
}

/** A holiday: the owner is away for so many working days, today the first of them, living costs
 *  continue, the absence penalty applies and the manager softens it (CLAUDE.md T13 3.9). Only
 *  with a production manager. Whatever he was holding goes down, as it does when he stays home. */
export function startHoliday(state: GameState, days: number): { ok: boolean; reason: string } {
  const check = holidayCheck(state, days);
  if (!check.ok) return check;
  const owner = state.owner;
  const held = owner.currentTaskId === null ? null : state.tasks.find((task) => task.id === owner.currentTaskId);
  if (held && !held.done) held.doneBy = null;
  owner.currentTaskId = null;
  owner.resumeTaskId = null;
  owner.holidayDaysRemaining = days;
  owner.present = false;
  owner.stayHome = true;
  return { ok: true, reason: '' };
}

/** Writes one minute onto the end of a day log, joined to the run before it when it is the same
 *  thing. The log is the day in the order it happened, so a morning of drawing is one segment
 *  (CLAUDE.md T11 3.1). */
export function logDayMinute(log: DayLogEntry[], category: DayCategory): void {
  const last = log[log.length - 1];
  if (last !== undefined && last.category === category) {
    last.minutes += 1;
    return;
  }
  log.push({ category, minutes: 1 });
}

/** An owner's idle minute store with nothing in it. The morning empties it and the state factory
 *  starts from it (CLAUDE.md T21 2.8). */
export function emptyOwnerIdle(): Record<OwnerIdleReason, number> {
  return { noMachine: 0, noMaterial: 0, nothingAssigned: 0, officeEmpty: 0 };
}

/** Books one clock minute the owner stood still, and why. The day meter's grey segment is the sum
 *  of these and its hover is the four reasons one by one. A minute is either worked or stood, never
 *  both: `spendOwnerMinute` is the other half of this pair (PIOTR, 19.09: "my time runs two to
 *  three times slower than the clock"; CLAUDE.md T21 2.8). */
export function spendOwnerIdleMinute(state: GameState, reason: OwnerIdleReason): void {
  const owner = state.owner;
  owner.idleMinutes += 1;
  owner.idleByReason[reason] += 1;
}

/** Books one worked clock minute against the pool, and onto the day the top bar draws. The three
 *  way category is the minute pool's; the seven way one is what the player reads (T11 3.1). */
export function spendOwnerMinute(
  state: GameState,
  category: 'admin' | 'design' | 'workshop',
  dayCategory: DayCategory,
): void {
  const owner = state.owner;
  owner.minutesWorked += 1;
  // The hours of his month, which the Our team page reads off him (CLAUDE.md T17 2.9).
  owner.monthMinutes += 1;
  owner.minutesByCategory[category] += 1;
  logDayMinute(owner.dayLog, dayCategory);
}

/** The minutes of a day log added up per band. Bands with no minutes in them are not in the
 *  answer: an empty band is not a zero on the plate, it is nothing at all. */
export function dayMinutesByCategory(
  logs: readonly DayLogEntry[],
): Array<{ category: DayCategory; minutes: number }> {
  const totals = new Map<DayCategory, number>();
  for (const entry of logs) {
    totals.set(entry.category, (totals.get(entry.category) ?? 0) + entry.minutes);
  }
  const answer: Array<{ category: DayCategory; minutes: number }> = [];
  for (const category of DAY_CATEGORIES) {
    const minutes = totals.get(category);
    if (minutes !== undefined && minutes > 0) answer.push({ category, minutes });
  }
  return answer;
}

/** The same figures as percentages of the minutes that were worked, which is what the day end
 *  plate and the company board show. They add up to exactly 100: the rounding is shared out by
 *  largest remainder, so nobody reads a day that comes to 99 (CLAUDE.md T11 3.1). */
export function dayPercentages(
  logs: readonly DayLogEntry[],
): Array<{ category: DayCategory; minutes: number; percent: number }> {
  const parts = dayMinutesByCategory(logs);
  const total = parts.reduce((sum, part) => sum + part.minutes, 0);
  if (total <= 0) return [];
  const shares = parts.map((part) => {
    const exact = (part.minutes / total) * 100;
    const floor = Math.floor(exact);
    return { ...part, percent: floor, remainder: exact - floor };
  });
  let left = 100 - shares.reduce((sum, share) => sum + share.percent, 0);
  const order = shares
    .map((share, index) => ({ index, remainder: share.remainder }))
    .sort((a, b) => b.remainder - a.remainder || a.index - b.index);
  for (const entry of order) {
    if (left <= 0) break;
    const share = shares[entry.index];
    if (share === undefined) continue;
    share.percent += 1;
    left -= 1;
  }
  return shares.map((share) => ({
    category: share.category,
    minutes: share.minutes,
    percent: share.percent,
  }));
}

/** Books one minute of standing in the workshop past 17:00. Staying is the overtime, not what he
 *  fills it with: a day with any of it costs him tomorrow (CLAUDE.md T6 3.4). */
export function countOvertimeMinute(state: GameState): void {
  if (!isOvertime(state.clock.minute) || !ownerIsAvailable(state)) return;
  state.owner.overtimeMinutes += 1;
}

/** Called when the day closes: a day with any overtime in it, one minute or two hours, adds its
 *  0.10 to the debt (CLAUDE.md T6 3.4). */
export function chargeOvertimeDebt(state: GameState): void {
  if (state.owner.overtimeMinutes <= 0) return;
  state.owner.overtimeDebt = round4(state.owner.overtimeDebt + OVERTIME_DEBT_PER_DAY);
}

/** Sick leave lands once per game year, on a random working day (CLAUDE.md 7.3). */
export function scheduleSickLeave(state: GameState): void {
  const owner = state.owner;
  const year = yearOfDay(state.clock.day);
  if (owner.sickStartDay !== null) {
    if (owner.sickStartDay >= state.clock.day) return;
    if (yearOfDay(owner.sickStartDay) === year) return;
  }
  const firstDay = Math.max((year - 1) * DAYS_PER_YEAR + 1, state.clock.day + 1);
  const lastDay = year * DAYS_PER_YEAR;
  if (firstDay > lastDay) return;
  let day = int(state, firstDay, lastDay);
  while (!isWorkingDay(day) && day < lastDay) day += 1;
  owner.sickStartDay = day;
}

/** Runs at the start of every working day, before the player does anything. */
export function runOwnerDayStart(state: GameState): void {
  const owner = state.owner;
  owner.overtimeMinutes = 0;
  owner.overtimeDebt = debtOnMorningOf(state.clock.day, owner.overtimeDebt);
  owner.labourFactor = labourFactorFor(owner.overtimeDebt, owner.breakSkipped);
  owner.breakSkipped = false;
  owner.breakAsked = false;
  owner.homeAsked = false;
  if (owner.sickDaysRemaining > 0) {
    owner.sickDaysRemaining -= 1;
    owner.present = false;
    return;
  }
  // On holiday: yesterday is counted off, and while days are left he is away today too, with the
  // penalty the manager softens. Five days asked for on a Monday is Monday to Friday, and the
  // next Monday he is back (CLAUDE.md T13 3.9).
  if (owner.holidayDaysRemaining > 0) {
    owner.holidayDaysRemaining -= 1;
    if (owner.holidayDaysRemaining > 0) {
      owner.present = false;
      owner.stayHome = true;
      return;
    }
  }
  if (owner.sickStartDay === state.clock.day) {
    owner.sickDaysRemaining = int(state, SICK_DAYS_MIN, SICK_DAYS_MAX) - 1;
    owner.present = false;
    queueEvent(state, {
      kind: 'ownerSick',
      title: 'You are sick',
      body:
        'Flat on your back. The workshop runs without you for a few days and it shows in the ' +
        'output.',
      data: { days: owner.sickDaysRemaining + 1 },
    });
    return;
  }
  scheduleSickLeave(state);
}
