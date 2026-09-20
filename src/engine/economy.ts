// Cash, the cost cadences, the overdraft and bankruptcy.
// Every movement of money in the game goes through `pay` or `receive`, so the ledger is complete.
//
// From Turn 22 there is one track for money and not two: a cost the player did not choose is paid
// in full whatever the balance, and the account goes under the overdraft limit for it. The bank
// closes a company for being too deep or too long under, and nothing else closes one
// (PIOTR, 19.09; CLAUDE.md T22 2.1, 2.2).

import {
  BANKRUPTCY_DAYS_BELOW_LIMIT,
  BANKRUPTCY_LIMIT_FACTOR,
  DAYS_PER_MONTH,
  DUST_WASTE_MONTHLY,
  LATE_ACCOUNTS_CHARGE,
  LEDGER_MAX_ENTRIES,
  JOINERY_CORE_EXTENSION_PRICE_YEARLY,
  JOINERY_CORE_PRICE_YEARLY,
  PELLET_INCOME_MONTHLY_BASE,
  PELLET_INCOME_PER_1000_PRODUCTION_MINUTES,
  POWER_BASE_DAILY,
  SOFTWARE_SUBSCRIPTION_MONTHLY,
  WORKING_DAYS_PER_MONTH,
  unitDepositFor,
} from './constants';
import {
  isFirstOfMonth,
  isLastWorkingDayOfMonth,
  isWorkingDay,
  monthOfDay,
  previousWorkingDay,
  weekOfDay,
  weekday,
  yearOfDay,
} from './clock';
import { queueEvent } from './events';
// The loan, the overdraft and the covers run with the other monthly items, from the one place
// the 1st is run for every calendar day, weekends included (CLAUDE.md T13 3.14, 3.15). The two
// modules import `charge` from here and use it inside their functions only, so the cycle is safe.
import { runFinanceMonth } from './finance';
import { runInsuranceMonth } from './insurance';
import { runSecurityMonth } from './security';
import { has, hasCentralExtraction, machinePowerPerDay } from './machines';
import { ownerDrawPerDay } from './owner';
import { makeId } from './rng';
import { plural } from './text';
import { monthEfficiency } from './efficiency';
import type { MonthEfficiency } from './efficiency';
import { machineSavings } from './machines';
import type { MachineSavings } from './machines';
import { monthRate } from './rate';
import type { WorkshopRate } from './rate';
import type {
  BookedTotals,
  DaySummary,
  GameState,
  LedgerCategory,
  LedgerEntry,
  PeriodTotals,
} from './types';

/** What a period came to: money in less money out. */
/** Labour value produced against the people hours that produced it, over a span of days. The
 *  machines are in it, because the labour a minute puts in already has them in it, and the hours
 *  are the ones actually spent at a bench, not the ones the day held (CLAUDE.md T6 3.8). */
export function earnedRate(state: GameState, span: 'day' | 'week' | 'month'): number {
  let value = state.dayStats.labourValue;
  let minutes = state.dayStats.workMinutes;
  if (span !== 'day') {
    const inSpan = (day: number): boolean =>
      span === 'week' ? weekOfDay(day) === weekOfDay(state.clock.day) : monthOfDay(day) === monthOfDay(state.clock.day);
    for (const summary of state.days) {
      if (summary.day === state.clock.day || !inSpan(summary.day)) continue;
      value += summary.labourValue;
      minutes += summary.workMinutes;
    }
  }
  if (minutes <= 0) return 0;
  return Math.round(((value * 60) / minutes) * 100) / 100;
}

/** One row of the Days tab: what the ledger says the day came to (CLAUDE.md T6 3.9). */
export interface DayMoney {
  day: number;
  income: number;
  costs: number;
  net: number;
}

/** One month of the year as the ledger has it (CLAUDE.md T7 3.9). */
export interface MonthMoney {
  month: number;
  income: number;
  costs: number;
  net: number;
}

/** The days of a month the ledger still carries, oldest first. The rows are the ledger added
 *  up, so they cannot say anything the ledger does not. The month is this one unless the player
 *  has picked another off the selector (CLAUDE.md T6 3.9, T7 3.9). */
export function daysOfMonth(state: GameState, wanted?: number): DayMoney[] {
  const month = wanted ?? monthOfDay(state.clock.day);
  const byDay = new Map<number, DayMoney>();
  for (const entry of state.ledger) {
    if (monthOfDay(entry.day) !== month) continue;
    const row = byDay.get(entry.day) ?? { day: entry.day, income: 0, costs: 0, net: 0 };
    if (entry.amount >= 0) row.income += entry.amount;
    else row.costs += -entry.amount;
    row.net = Math.round((row.income - row.costs) * 100) / 100;
    byDay.set(entry.day, row);
  }
  return Array.from(byDay.values()).sort((left, right) => left.day - right.day);
}

/** The months of a year the ledger still carries, oldest first (CLAUDE.md T7 3.9). */
export function monthsOfYear(state: GameState, wanted?: number): MonthMoney[] {
  const year = wanted ?? yearOfDay(state.clock.day);
  const byMonth = new Map<number, MonthMoney>();
  for (const entry of state.ledger) {
    if (yearOfDay(entry.day) !== year) continue;
    const month = monthOfDay(entry.day);
    const row = byMonth.get(month) ?? { month, income: 0, costs: 0, net: 0 };
    if (entry.amount >= 0) row.income += entry.amount;
    else row.costs += -entry.amount;
    row.net = Math.round((row.income - row.costs) * 100) / 100;
    byMonth.set(month, row);
  }
  return Array.from(byMonth.values()).sort((left, right) => left.month - right.month);
}

/** What a run of ledger lines came to, by category: the one place a span of the books is added
 *  up out of the lines themselves (CLAUDE.md T7 3.9). */
export function totalsOfEntries(entries: readonly LedgerEntry[]): PeriodTotals {
  const totals = emptyTotals();
  for (const entry of entries) addToTotals(totals, entry.category, entry.amount);
  return totals;
}

/** The year so far, out of the ledger the state still carries (CLAUDE.md T7 3.9). */
export function yearTotals(state: GameState, wanted?: number): PeriodTotals {
  const year = wanted ?? yearOfDay(state.clock.day);
  return totalsOfEntries(state.ledger.filter((entry) => yearOfDay(entry.day) === year));
}

/** The lines of one day, newest last, the way the ledger holds them. */
export function ledgerOfDay(state: GameState, day: number): LedgerEntry[] {
  return state.ledger.filter((entry) => entry.day === day);
}

/** The summary of a day the state still carries, or null once it has fallen off the back. */
export function summaryOfDay(state: GameState, day: number): DaySummary | null {
  return state.days.find((summary) => summary.day === day) ?? null;
}

export function netOf(totals: PeriodTotals): number {
  return totals.income - totals.costs;
}

/** Money as the player reads it: a comma for the thousands and no decimals (CLAUDE.md 10.4). */
export function formatMoney(value: number): string {
  const rounded = Math.round(value);
  const text = Math.abs(rounded).toLocaleString('en-GB');
  return `${rounded < 0 ? '-' : ''}\u00a3${text}`;
}

export function emptyTotals(): PeriodTotals {
  return { income: 0, costs: 0, byCategory: {} };
}

export function emptyBooked(): BookedTotals {
  return { day: emptyTotals(), week: emptyTotals(), month: emptyTotals() };
}

/** True while the last working day that has gone by was never written up (CLAUDE.md T2 3.5). */
export function booksBehind(state: GameState): boolean {
  const last = previousWorkingDay(state.clock.day);
  if (last <= 0) return false;
  return state.booksUpToDay < last;
}

/** The figures the player is allowed to see: the live ones, or the last ones he wrote up. */
export function visibleTotals(state: GameState): BookedTotals {
  if (!booksBehind(state)) {
    return { day: state.finance.day, week: state.finance.week, month: state.finance.month };
  }
  return state.finance.booked;
}

/** The bookkeeping task is done: the books catch up on every day at once. */
export function writeUpBooks(state: GameState): void {
  state.booksUpToDay = state.clock.day;
  state.finance.booked = {
    day: JSON.parse(JSON.stringify(state.finance.day)) as PeriodTotals,
    week: JSON.parse(JSON.stringify(state.finance.week)) as PeriodTotals,
    month: JSON.parse(JSON.stringify(state.finance.month)) as PeriodTotals,
  };
}

function addLedger(
  state: GameState,
  category: LedgerCategory,
  label: string,
  amount: number,
  unpaid: boolean,
  when: { day: number; minute: number } = state.clock,
  merge = false,
): void {
  if (merge) {
    // A line that grows through the day instead of a line a piece: the standing contracts put
    // sixty pieces a week through the books and the ledger would drown in them otherwise
    // (CLAUDE.md T13 3.16). Same day, same category, same words, cash moved both times.
    for (let index = state.ledger.length - 1; index >= 0; index -= 1) {
      const open = state.ledger[index];
      if (!open || open.day !== when.day) break;
      if (open.category !== category || open.label !== label || open.unpaid) continue;
      open.amount = Math.round((open.amount + amount) * 100) / 100;
      open.balance = state.cash;
      open.minute = when.minute;
      // The line now carries this minute and this bank, so it belongs at the end of the ledger
      // and not back where the day's first piece put it. Left where it was, it held a later
      // balance than the entries written after it, the running balance down the ledger stopped
      // meaning anything, and a month whose last piece was booked after its last other entry
      // closed on the wrong figure: the month end report did not add up (found by the Turn 19
      // playthrough, and the bug is as old as the merge). Nothing about the money changes; the
      // line moves to where its own stamp says it was written.
      if (index !== state.ledger.length - 1) {
        state.ledger.splice(index, 1);
        state.ledger.push(open);
      }
      return;
    }
  }
  state.ledger.push({
    id: makeId(state, 'ledger'),
    day: when.day,
    minute: when.minute,
    category,
    label,
    amount,
    balance: state.cash,
    unpaid,
  });
  if (state.ledger.length > LEDGER_MAX_ENTRIES) {
    state.ledger.splice(0, state.ledger.length - LEDGER_MAX_ENTRIES);
  }
}

function addToTotals(totals: PeriodTotals, category: LedgerCategory, amount: number): void {
  if (amount >= 0) {
    totals.income += amount;
  } else {
    totals.costs += -amount;
  }
  totals.byCategory[category] = (totals.byCategory[category] ?? 0) + amount;
}

function record(state: GameState, category: LedgerCategory, amount: number): void {
  addToTotals(state.finance.day, category, amount);
  addToTotals(state.finance.week, category, amount);
  addToTotals(state.finance.month, category, amount);
}

/** The one signed entry every pound in or out of Turn 13 goes through: a positive amount is money
 *  in, a negative one is money out, dated `when`, which is the clock unless the caller says
 *  otherwise, as the night shift's wages booked at the end of the day do (CLAUDE.md T13 2.3,
 *  10.2). Money out that the player chose obeys the overdraft floor and is refused past it; a cost
 *  marked unavoidable is paid past it, like the rent, and the account goes under the limit for it
 *  (PIOTR, 19.09; CLAUDE.md T22 2.1). True when the money moved. */
export function charge(
  state: GameState,
  category: LedgerCategory,
  label: string,
  amount: number,
  options: {
    unavoidable?: boolean;
    when?: { day: number; minute: number };
    /** Adds to today's line of the same category and words instead of writing another: for
     *  the piece work of a standing contract, so the ledger holds a day and not a piece. */
    merge?: boolean;
  } = {},
): boolean {
  const when = options.when ?? state.clock;
  const merge = options.merge === true;
  if (amount === 0) return false;
  if (amount > 0) {
    state.cash += amount;
    record(state, category, amount);
    addLedger(state, category, label, amount, false, when, merge);
    return true;
  }
  const out = -amount;
  // The floor is the player's own spending and nothing else: a cost he did not choose is paid
  // whatever the balance, and the account goes under the limit for it (PIOTR, 19.09;
  // CLAUDE.md T22 2.1).
  if (options.unavoidable !== true && !canAfford(state, out)) return false;
  state.cash -= out;
  record(state, category, -out);
  addLedger(state, category, label, -out, false, when, merge);
  return true;
}

/** Money out that the player chose: purchases. Call `canAfford` first, because this does not: the
 *  one place a pound leaves the account is `charge`, and it is asked here for a cost whose floor
 *  the caller has already read. */
export function pay(state: GameState, category: LedgerCategory, label: string, amount: number): void {
  if (amount <= 0) return;
  charge(state, category, label, -amount, { unavoidable: true });
}

export function receive(
  state: GameState,
  category: LedgerCategory,
  label: string,
  amount: number,
): void {
  if (amount <= 0) return;
  state.cash += amount;
  record(state, category, amount);
  addLedger(state, category, label, amount, false);
}

/** Money handed back for something that never came. Every bill left the bank when it arrived, so
 *  what comes back is cash again and nothing else (PIOTR, 19.09; CLAUDE.md T22 2.1). */
export function refund(
  state: GameState,
  category: LedgerCategory,
  label: string,
  amount: number,
): void {
  if (amount <= 0) return;
  receive(state, category, label, amount);
}

/** The overdraft is the floor for anything the player buys. */
export function canAfford(state: GameState, amount: number): boolean {
  return state.cash - amount >= state.finance.overdraftLimit;
}

/** A cost that arrives whether the player likes it or not: rent, wages, the power, a repair, or
 *  material already ordered. It is paid in full every time, the overdraft limit included, and the
 *  account goes under the limit for it: the bill cannot go anywhere else, because there is nowhere
 *  else for it to go. The overdraft limit is still the floor for everything the player buys, which
 *  is `canAfford` and `pay` (PIOTR, 19.09: "a cost he does not choose goes through the limit";
 *  CLAUDE.md T22 2.1). */
export function chargeUnavoidable(
  state: GameState,
  category: LedgerCategory,
  label: string,
  amount: number,
): void {
  if (amount <= 0) return;
  pay(state, category, label, amount);
}

export function dailyRent(state: GameState): number {
  return state.unit.rentMonthly / DAYS_PER_MONTH;
}

export function dailyRates(state: GameState): number {
  return state.unit.ratesMonthly / DAYS_PER_MONTH;
}

/** The base the unit draws plus what every machine in it pulls: a dearer class of machine costs
 *  more to run (CLAUDE.md T3 3.5). */
export function dailyPower(state: GameState): number {
  return POWER_BASE_DAILY + machinePowerPerDay(state);
}

/** One month of the costs that arrive whether or not a single job is made. */
export function monthlyFixedCosts(state: GameState): number {
  return (
    state.unit.rentMonthly +
    state.unit.ratesMonthly +
    dailyPower(state) * DAYS_PER_MONTH +
    ownerDrawPerDay(state) * WORKING_DAYS_PER_MONTH
  );
}

/** The month a thing bought this month starts being charged monthly: the one after the month end
 *  that follows it. The first month is paid at the click, so the first month end carries no line
 *  for it (PIOTR, 16.09; CLAUDE.md T17 2.21). */
function chargedFrom(boughtInMonth: number): number {
  return boughtInMonth + 1;
}

/** Stamps the month Joinery Core and each of its extensions were bought in, the first time the
 *  state settles after the click. The purchase itself is a line of its own, "first month", so the
 *  month it was bought in is the month it is already paid for (CLAUDE.md T17 2.21). */
export function stampSoftwareMonths(state: GameState): void {
  const software = state.software;
  const month = monthOfDay(state.clock.day);
  if (software.joineryCore && software.joineryCoreFromMonth === null) {
    software.joineryCoreFromMonth = month;
  }
  while (software.joineryCoreExtensionMonths.length < software.joineryCoreExtensions) {
    software.joineryCoreExtensionMonths.push(month);
  }
}

/** Joinery Core and its extensions, bought by the year and charged as a twelfth each month
 *  (CLAUDE.md T13 3.8). Nothing is charged for the month it was bought in, nor at the month end
 *  that closes it: that month went out of the account at the click (CLAUDE.md T17 2.21). */
export function joineryCoreMonthly(state: GameState): number {
  const software = state.software;
  if (!software.joineryCore) return 0;
  const month = monthOfDay(state.clock.day);
  const from = software.joineryCoreFromMonth;
  const core = from !== null && month > chargedFrom(from) ? JOINERY_CORE_PRICE_YEARLY : 0;
  const extensions = software.joineryCoreExtensionMonths.filter(
    (bought) => month > chargedFrom(bought),
  ).length;
  const yearly = core + extensions * JOINERY_CORE_EXTENSION_PRICE_YEARLY;
  if (yearly <= 0) return 0;
  return Math.round((yearly / 12) * 100) / 100;
}

/** What the crew costs for the month that is closing: everybody on the books, each at his one
 *  monthly wage (PIOTR, 19.09: "I wanted everyone monthly"; CLAUDE.md T21 2.10). */
export function monthlyWageBill(state: GameState): number {
  return state.workers
    .filter((worker) => worker.monthlyWage > 0 && worker.startDay <= state.clock.day)
    .reduce((total, worker) => total + worker.monthlyWage, 0);
}

/** The accountant charges for the mess on the 1st, and the longer it runs the dearer it gets
 *  (CLAUDE.md T2 3.5). */
function runLateAccounts(state: GameState): void {
  if (!booksBehind(state)) {
    state.lateAccountsMonths = 0;
    return;
  }
  state.lateAccountsMonths += 1;
  const charge = LATE_ACCOUNTS_CHARGE * state.lateAccountsMonths;
  chargeUnavoidable(state, 'accounts', 'Late accounts', charge);
  queueEvent(state, {
    kind: 'lateAccounts',
    title: 'Late accounts',
    body:
      'The books are not up to date, so somebody else has to put them right. ' +
      `${formatMoney(charge)} for ${plural(state.lateAccountsMonths, 'month', 'months')} of it.`,
    data: { months: state.lateAccountsMonths, charge: Math.round(charge) },
  });
}

function runMonthlyItems(state: GameState): void {
  const before = state.cash;
  const entriesBefore = state.ledger.length;
  runLateAccounts(state);
  // The office salary line is gone: everybody is paid by the week now, on the Fridays of the
  // month, so charging a month of the office here would be paying them twice (PIOTR, 18.09;
  // CLAUDE.md T20 2.6).
  if (state.software.mode === 'subscription') {
    chargeUnavoidable(state, 'software', 'Software subscription', SOFTWARE_SUBSCRIPTION_MONTHLY);
  }
  const joineryCore = joineryCoreMonthly(state);
  if (joineryCore > 0) chargeUnavoidable(state, 'software', 'Joinery Core', joineryCore);
  if (hasCentralExtraction(state) && !has(state, 'pelletiser')) {
    chargeUnavoidable(state, 'waste', 'Dust waste collection', DUST_WASTE_MONTHLY);
  }
  if (has(state, 'pelletiser')) {
    const bonus =
      (state.productionMinutesMonth / 1000) * PELLET_INCOME_PER_1000_PRODUCTION_MINUTES;
    receive(state, 'pellets', 'Pellet sales', PELLET_INCOME_MONTHLY_BASE + bonus);
  }
  // The loan's instalment with its interest, the overdraft's interest accrued day by day below
  // zero, and the twelfth of each cover held (CLAUDE.md T13 3.14, 3.15). They run here and not at
  // the day's open, because this runs for a 1st that falls on a weekend too, and because the day's
  // and the month's totals were emptied a moment ago, so the top bar's "today" counts them.
  runFinanceMonth(state);
  runInsuranceMonth(state);
  runSecurityMonth(state);
  if (state.ledger.length > entriesBefore) {
    queueEvent(state, {
      kind: 'monthlyBills',
      title: 'Monthly bills',
      body: 'The monthly items have gone through.',
      data: { amount: Math.round(before - state.cash) },
    });
  }
}

/** A loss with no cash movement: sheets left in the yard overnight. */
export function noteLoss(
  state: GameState,
  category: LedgerCategory,
  label: string,
  amount: number,
): void {
  if (amount <= 0) return;
  addLedger(state, category, label, -amount, true);
}

export function declareBankruptcy(state: GameState, reason: string): void {
  if (state.gameOver) return;
  state.gameOver = { reason, day: state.clock.day };
  queueEvent(state, {
    kind: 'bankruptcy',
    title: 'Bankrupt',
    body: `${reason} That is the end of the company.`,
    choices: [{ id: 'ok', label: 'That is that' }],
    // The figures the card prints are the ones the engine was looking at when it closed the
    // company, and they ride on the event so the card cannot work out a different sum a minute
    // later (CLAUDE.md T21 2.2; docs/mockups/t21/debt.html part 3).
    data: {
      day: state.clock.day,
      month: monthOfDay(state.clock.day),
      cash: Math.round(state.cash),
      allowed: Math.round(bankruptcyFloor(state)),
      // The other rule's own reading, so the card can say how long the company stood under the
      // limit whichever of the two closed it (CLAUDE.md T22 2.2).
      daysBelow: state.finance.daysBelowOverdraft,
      daysAllowed: BANKRUPTCY_DAYS_BELOW_LIMIT,
    },
  });
}

/** How far under the company may go before the bank closes it: one and a half times the overdraft
 *  limit, whatever the difficulty set that to (PIOTR, 18.09; CLAUDE.md T21 2.2, T22 2.2). */
export function bankruptcyFloor(state: GameState): number {
  return state.finance.overdraftLimit * BANKRUPTCY_LIMIT_FACTOR;
}

/** The bank closes a company for being too deep or too long under, and nothing else closes one
 *  (PIOTR, 19.09; CLAUDE.md T22 2.2). It reads the cash alone, because from Turn 22 the cash is
 *  the whole of the company's position: every bill is paid out of the account, the limit included.
 *
 *  1. The cash has passed what the bank allows: one and a half times the overdraft limit.
 *  2. Or thirty calendar days in a row have closed with the cash below the overdraft limit itself,
 *     whatever the amount it is below by. The day the count reaches thirty is the day it ends.
 *
 *  Both are read once a calendar day, where Turn 13 read the one it had: at the point the day's
 *  money is settled, which is `runDayCosts`. */
export function checkBankruptcy(state: GameState): void {
  if (state.gameOver) return;
  if (state.cash <= bankruptcyFloor(state)) {
    declareBankruptcy(state, 'You cannot pay what you owe and the bank has pulled the overdraft.');
    return;
  }
  if (state.finance.daysBelowOverdraft >= BANKRUPTCY_DAYS_BELOW_LIMIT) {
    declareBankruptcy(
      state,
      `${plural(BANKRUPTCY_DAYS_BELOW_LIMIT, 'day', 'days')} in a row past the overdraft limit, ` +
        'and the bank has pulled it.',
    );
  }
}

/** The run of days past the limit, counted at the close of the day's money and nowhere else: a day
 *  that ends below the overdraft limit adds one, a day that ends at or above it puts the count back
 *  to nought (PIOTR, 18.09: "thirty days below the limit"; CLAUDE.md T21 2.2). */
function countDayBelowOverdraft(state: GameState): void {
  if (state.cash < state.finance.overdraftLimit) {
    state.finance.daysBelowOverdraft += 1;
    return;
  }
  state.finance.daysBelowOverdraft = 0;
}

/** Everything the given calendar day owes. Runs for weekend days too (CLAUDE.md 8.1). */
export function runDayCosts(state: GameState, day: number): void {
  state.finance.day = emptyTotals();
  if (weekday(day) === 0) state.finance.week = emptyTotals();
  if (isFirstOfMonth(day)) {
    state.finance.month = emptyTotals();
    // The pellet bonus reads the month that has just gone, so the counter resets after it.
    runMonthlyItems(state);
    state.productionMinutesMonth = 0;
  }
  if (day === 1) {
    const deposit = unitDepositFor(state.unit.rentMonthly);
    state.unit.depositHeld = deposit;
    chargeUnavoidable(state, 'unitDeposit', 'Unit deposit, one month of rent', deposit);
  }
  chargeUnavoidable(state, 'rent', 'Rent', dailyRent(state));
  chargeUnavoidable(state, 'rates', 'Business rates', dailyRates(state));
  chargeUnavoidable(state, 'power', 'Power', dailyPower(state));
  if (isWorkingDay(day)) {
    // What he pays himself, every working day, at the tier he chose (CLAUDE.md T13 3.18).
    chargeUnavoidable(state, 'ownerDraw', 'Owner\u0027s draw', ownerDrawPerDay(state));
  }
  if (isLastWorkingDayOfMonth(day)) {
    // The monthly wages, everybody on one cadence, on the last working day of the month, and
    // nothing on top of them: the crew go home at five, so there is no overtime line to pay them
    // any more (PIOTR, 19.09: "I wanted everyone monthly"; CLAUDE.md T21 2.10, T17 2.12).
    const wages = monthlyWageBill(state);
    if (wages > 0) {
      chargeUnavoidable(state, 'wages', 'Monthly wages', wages);
      queueEvent(state, {
        kind: 'wagesPaid',
        title: 'Wages',
        body: 'The last working day of the month. The monthly wages have gone out.',
        data: { amount: Math.round(wages), overtime: 0 },
      });
    }
  }
  // The day's money is settled, so this is where the run of days past the limit is counted and
  // where the bank looks at the company (CLAUDE.md T21 2.2).
  countDayBelowOverdraft(state);
  checkBankruptcy(state);
}

/** Next dates the player should know about, for the accounting modal. Rent, rates and power run
 *  every calendar day, so they have no next date to show. */
export function nextDueDays(state: GameState): { wages: number; monthly: number } {
  // Today's bills have already run, so both searches start tomorrow.
  let wages = state.clock.day + 1;
  while (!isLastWorkingDayOfMonth(wages)) wages += 1;
  let monthly = state.clock.day + 1;
  while (!isFirstOfMonth(monthly)) monthly += 1;
  return { wages, monthly };
}

// ---------------------------------------------------------------------------
// The month end (CLAUDE.md T13 3.20): every line a sum of the ledger's dated lines for the month,
// nothing stored. One table puts every ledger category on exactly one line, so a pound cannot be
// counted twice or not at all.
// ---------------------------------------------------------------------------

export type MonthLineId =
  | 'revenue'
  | 'material'
  | 'transport'
  | 'salariesDay'
  | 'salariesNight'
  | 'ownerDraw'
  | 'rentAndRates'
  | 'power'
  | 'insurance'
  | 'security'
  | 'loan'
  | 'interest'
  | 'contract'
  | 'waste'
  | 'equipment'
  | 'software'
  | 'other';

/** The lines in the order the folder prints them. */
export const MONTH_LINES: ReadonlyArray<{ id: MonthLineId; label: string }> = [
  { id: 'revenue', label: 'Revenue from jobs' },
  { id: 'material', label: 'Material' },
  { id: 'transport', label: 'Transport and trips' },
  { id: 'salariesDay', label: 'Wages and salaries, day' },
  { id: 'salariesNight', label: 'Wages, night shift' },
  { id: 'ownerDraw', label: "Owner's draw" },
  { id: 'rentAndRates', label: 'Rent and rates' },
  { id: 'power', label: 'Power' },
  { id: 'insurance', label: 'Insurance, premiums and payouts' },
  { id: 'security', label: 'Security' },
  { id: 'loan', label: 'Loan, drawn and repaid' },
  { id: 'interest', label: 'Loan and overdraft interest' },
  { id: 'contract', label: 'Contract work, revenue and material' },
  { id: 'waste', label: 'Waste collection' },
  { id: 'equipment', label: 'Equipment, pipes and repairs' },
  { id: 'software', label: 'Software and website' },
  { id: 'other', label: 'Everything else' },
];

/** Every ledger category on exactly one line (CLAUDE.md T13 3.20). */
export const MONTH_LINE_OF: Record<LedgerCategory, MonthLineId> = {
  jobDeposit: 'revenue',
  jobBalance: 'revenue',
  material: 'material',
  storage: 'material',
  taxi: 'transport',
  transport: 'transport',
  wages: 'salariesDay',
  salaries: 'salariesDay',
  wagesNight: 'salariesNight',
  ownerDraw: 'ownerDraw',
  rent: 'rentAndRates',
  rates: 'rentAndRates',
  unitDeposit: 'rentAndRates',
  power: 'power',
  insurance: 'insurance',
  claim: 'insurance',
  security: 'security',
  burglary: 'security',
  loan: 'loan',
  interest: 'interest',
  loanInterest: 'interest',
  overdraftInterest: 'interest',
  contract: 'contract',
  waste: 'waste',
  equipment: 'equipment',
  pipes: 'equipment',
  repair: 'equipment',
  software: 'software',
  website: 'software',
  accounts: 'other',
  pellets: 'other',
  other: 'other',
};

export interface MonthLine {
  id: MonthLineId;
  label: string;
  income: number;
  costs: number;
  net: number;
}

export interface MonthReport {
  month: number;
  lines: MonthLine[];
  income: number;
  costs: number;
  net: number;
  /** The bank at the first line of the month and at the last. */
  cashOpen: number;
  cashClose: number;
}

/** A month the company has closed, written down at the month end in the figures its card was
 *  drawn from: the money, the efficiency, what the machines saved and the rate the workshop
 *  worked at (CLAUDE.md T23 2.14). Four shapes that already have names, composed and not restated,
 *  so a report and the card the player saw that evening can never say different things. The month
 *  number sits on the top of it because the list of reports is read by month and nothing should
 *  have to reach inside a sum to find out which one it is. */
export interface MonthlyReport {
  month: number;
  report: MonthReport;
  efficiency: MonthEfficiency;
  savings: MachineSavings;
  rate: WorkshopRate;
}

/** This month written down, in the four shapes the month end card draws itself from. Called once,
 *  at the month end, before the machines' own month clocks start again, because the machine
 *  savings are read off those clocks and there is nothing left of the month once they are zeroed
 *  (CLAUDE.md T17 2.24, T23 2.14). It is the same four calls the card makes, so a report opened
 *  from Accounting a year later and the card the player saw that evening are the same figures. */
export function monthlyReportFor(state: GameState, month: number): MonthlyReport {
  return {
    month,
    report: monthReport(state, month),
    efficiency: monthEfficiency(state, month),
    savings: machineSavings(state, 'month'),
    rate: monthRate(state, month),
  };
}

/** The month's report, read off the ledger the state still carries (CLAUDE.md T13 3.20). The lines
 *  are the cash that moved, so they add up to the bank at the close less the bank at the open. From
 *  Turn 22 every bill is cash that moved, because a cost the player did not choose is paid out of
 *  the account whatever the balance: the figure the report used to carry beside the net for the
 *  bills that went unpaid is gone with them (CLAUDE.md T22 2.1, 2.4). What is left with no cash
 *  behind it is a loss noted on the books, like sheets ruined in the yard (`noteLoss`), and a note
 *  is not a line of the month's money. */
export function monthReport(state: GameState, month: number): MonthReport {
  // Two orders, and they are not the same one. `balance` on an entry is the bank after that entry
  // was written, so it only means anything in the order the entries were written in; a job's own
  // costs are booked at the minute they happened and land in the ledger after a piece of the day
  // that happened later on the clock, so the month's entries are not in minute order as written.
  // The bank at the open and at the close are read off the written order, and the lines, which
  // the player reads down the page, off the clock. Reading the bank off the sorted list took the
  // balance of the wrong entry and the report did not add up (found in the Turn 19 playthrough).
  const inLedgerOrder = state.ledger.filter((entry) => monthOfDay(entry.day) === month);
  const entries = inLedgerOrder
    .map((entry, index) => ({ entry, index }))
    .sort(
      (left, right) =>
        left.entry.day - right.entry.day ||
        left.entry.minute - right.entry.minute ||
        left.index - right.index,
    )
    .map(({ entry }) => entry);
  const lines: MonthLine[] = MONTH_LINES.map((line) => ({ ...line, income: 0, costs: 0, net: 0 }));
  const byId = new Map(lines.map((line) => [line.id, line]));
  for (const entry of entries) {
    // A line with no cash behind it is not the month's money: `noteLoss` and nothing else writes
    // one now (CLAUDE.md T22 2.4).
    if (entry.unpaid) continue;
    const line = byId.get(MONTH_LINE_OF[entry.category]);
    if (!line) continue;
    if (entry.amount >= 0) line.income += entry.amount;
    else line.costs += -entry.amount;
  }
  let income = 0;
  let costs = 0;
  for (const line of lines) {
    line.income = Math.round(line.income * 100) / 100;
    line.costs = Math.round(line.costs * 100) / 100;
    line.net = Math.round((line.income - line.costs) * 100) / 100;
    income += line.income;
    costs += line.costs;
  }
  const first = inLedgerOrder[0];
  const last = inLedgerOrder[inLedgerOrder.length - 1];
  const cashOpen = first
    ? first.unpaid
      ? first.balance
      : first.balance - first.amount
    : state.cash;
  const cashClose = last ? last.balance : state.cash;
  return {
    month,
    lines,
    income: Math.round(income * 100) / 100,
    costs: Math.round(costs * 100) / 100,
    net: Math.round((income - costs) * 100) / 100,
    cashOpen: Math.round(cashOpen * 100) / 100,
    cashClose: Math.round(cashClose * 100) / 100,
  };
}
