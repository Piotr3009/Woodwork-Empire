// Cash, the cost cadences, debt, arrears, the bailiff and bankruptcy.
// Every movement of money in the game goes through `pay` or `receive`, so the ledger is complete.

import {
  ARREARS_INTEREST_THRESHOLD_MONTHS,
  ARREARS_MONTHLY_INTEREST,
  ARREARS_MONTHS_BAILIFF,
  ARREARS_MONTHS_FINAL_WARNING,
  ARREARS_MONTHS_WARNING,
  BAILIFF_SEIZURE_FRACTION,
  BANKRUPTCY_OVERDRAFT_MULTIPLIER,
  DAYS_PER_MONTH,
  DUST_WASTE_MONTHLY,
  LATE_ACCOUNTS_CHARGE,
  LEDGER_MAX_ENTRIES,
  LIVING_COST_PER_WORKING_DAY,
  OVERDRAFT_MONTHLY_INTEREST,
  PELLET_INCOME_MONTHLY_BASE,
  PELLET_INCOME_PER_1000_PRODUCTION_MINUTES,
  POWER_BASE_DAILY,
  POWER_PER_MACHINE_DAILY,
  SOFTWARE_SUBSCRIPTION_MONTHLY,
  WORKING_DAYS_PER_MONTH,
  unitDepositFor,
} from './constants';
import { isFirstOfMonth, isFriday, isWorkingDay, previousWorkingDay, weekday } from './clock';
import { queueEvent } from './events';
import { has, poweredMachines, seizableMachines } from './machines';
import { makeId } from './rng';
import { plural } from './text';
import type { BookedTotals, GameState, LedgerCategory, PeriodTotals } from './types';

/** What a period came to: money in less money out. */
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
): void {
  state.ledger.push({
    id: makeId(state, 'ledger'),
    day: state.clock.day,
    minute: state.clock.minute,
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

/** Money out that the player chose: purchases. Call `canAfford` first. */
export function pay(state: GameState, category: LedgerCategory, label: string, amount: number): void {
  if (amount <= 0) return;
  state.cash -= amount;
  record(state, category, -amount);
  addLedger(state, category, label, -amount, false);
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

/** The overdraft is the floor for anything the player buys. */
export function canAfford(state: GameState, amount: number): boolean {
  return state.cash - amount >= state.finance.overdraftLimit;
}

/** A cost that arrives whether the player likes it or not: rent, wages, or material already
 *  ordered. It obeys the overdraft floor and becomes arrears when there is no room left. */
export function chargeUnavoidable(
  state: GameState,
  category: LedgerCategory,
  label: string,
  amount: number,
): void {
  if (amount <= 0) return;
  if (canAfford(state, amount)) {
    pay(state, category, label, amount);
    return;
  }
  state.finance.arrearsAmount += amount;
  addLedger(state, category, `${label} (unpaid)`, -amount, true);
  if (state.finance.firstArrearsDay === null) {
    state.finance.firstArrearsDay = state.clock.day;
    state.finance.arrearsMonths = ARREARS_MONTHS_WARNING;
    queueEvent(state, {
      kind: 'arrearsWarning',
      title: 'Arrears warning',
      body:
        'A bill went unpaid. The landlord and the council both write. One month of arrears is on ' +
        'the books.',
      data: { arrears: Math.round(state.finance.arrearsAmount) },
    });
  }
}

export function dailyRent(state: GameState): number {
  return state.unit.rentMonthly / DAYS_PER_MONTH;
}

export function dailyRates(state: GameState): number {
  return state.unit.ratesMonthly / DAYS_PER_MONTH;
}

export function dailyPower(state: GameState): number {
  return POWER_BASE_DAILY + POWER_PER_MACHINE_DAILY * poweredMachines(state).length;
}

/** One month of the costs that arrive whether or not a single job is made. The arrears interest
 *  threshold is measured against this [TUNE]. */
export function monthlyFixedCosts(state: GameState): number {
  return (
    state.unit.rentMonthly +
    state.unit.ratesMonthly +
    dailyPower(state) * DAYS_PER_MONTH +
    LIVING_COST_PER_WORKING_DAY * WORKING_DAYS_PER_MONTH
  );
}

/** Arrears carry interest only while they are large (CLAUDE.md T2 3.4). */
export function arrearsCarryInterest(state: GameState): boolean {
  return (
    state.finance.arrearsAmount >
    monthlyFixedCosts(state) * ARREARS_INTEREST_THRESHOLD_MONTHS
  );
}

/** The player pays what he owes, all of it or a typed amount. Nothing goes past the overdraft
 *  floor, and clearing the debt resets the ladder (CLAUDE.md T2 3.4). */
export function payArrears(state: GameState, amount: number | null): number {
  const finance = state.finance;
  if (finance.arrearsAmount <= 0) return 0;
  const wanted = amount === null ? finance.arrearsAmount : Math.min(finance.arrearsAmount, amount);
  const room = state.cash - finance.overdraftLimit;
  const paid = Math.round(Math.min(wanted, Math.max(0, room)) * 100) / 100;
  if (paid <= 0) return 0;
  pay(state, 'arrears', 'Arrears paid off', paid);
  finance.arrearsAmount = Math.round((finance.arrearsAmount - paid) * 100) / 100;
  if (finance.arrearsAmount <= 0) {
    finance.arrearsAmount = 0;
    finance.arrearsMonths = 0;
    finance.firstArrearsDay = null;
  }
  return paid;
}

export function weeklyWageBill(state: GameState): number {
  return state.workers
    .filter((worker) => worker.weeklyWage > 0 && worker.startDay <= state.clock.day)
    .reduce((total, worker) => total + worker.weeklyWage, 0);
}

export function monthlySalaryBill(state: GameState): number {
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
  if (state.cash < 0) {
    const interest = -state.cash * OVERDRAFT_MONTHLY_INTEREST;
    chargeUnavoidable(state, 'interest', 'Overdraft interest', interest);
  }
  if (arrearsCarryInterest(state)) {
    const interest = state.finance.arrearsAmount * ARREARS_MONTHLY_INTEREST;
    chargeUnavoidable(state, 'interest', 'Interest on the arrears', interest);
  }
  const salaries = monthlySalaryBill(state);
  if (salaries > 0) chargeUnavoidable(state, 'salaries', 'Office salaries', salaries);
  if (state.software.mode === 'subscription') {
    chargeUnavoidable(state, 'software', 'Software subscription', SOFTWARE_SUBSCRIPTION_MONTHLY);
  }
  if (has(state, 'dustSystem') && !has(state, 'pelletiser')) {
    chargeUnavoidable(state, 'waste', 'Dust waste collection', DUST_WASTE_MONTHLY);
  }
  if (has(state, 'pelletiser')) {
    const bonus =
      (state.productionMinutesMonth / 1000) * PELLET_INCOME_PER_1000_PRODUCTION_MINUTES;
    receive(state, 'pellets', 'Pellet sales', PELLET_INCOME_MONTHLY_BASE + bonus);
  }
  if (state.ledger.length > entriesBefore) {
    queueEvent(state, {
      kind: 'monthlyBills',
      title: 'Monthly bills',
      body: 'The monthly items have gone through.',
      data: { amount: Math.round(before - state.cash) },
    });
  }
}

/** Months of arrears, counted from the day the first bill went unpaid (CLAUDE.md 8.3). Runs every
 *  day, because a month of arrears can come due on any day. */
function runArrearsEscalation(state: GameState, day: number): void {
  const finance = state.finance;
  if (finance.arrearsAmount <= 0 || finance.firstArrearsDay === null) return;
  const months = 1 + Math.floor((day - finance.firstArrearsDay) / DAYS_PER_MONTH);
  if (months <= finance.arrearsMonths) return;
  finance.arrearsMonths = months;
  if (finance.arrearsMonths === ARREARS_MONTHS_FINAL_WARNING) {
    queueEvent(state, {
      kind: 'arrearsFinalWarning',
      title: 'Final warning',
      body: 'Two months of arrears. The next letter comes with a bailiff.',
      data: { arrears: Math.round(finance.arrearsAmount) },
    });
    return;
  }
  if (finance.arrearsMonths >= ARREARS_MONTHS_BAILIFF) {
    runBailiff(state);
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

/** Three months of arrears: the cheapest machine goes, credited at half its purchase price.
 *  Everything slows down, but the company carries on (PIOTR, Turn 2). */
export function runBailiff(state: GameState): void {
  const target = seizableMachines(state)[0];
  if (!target) {
    declareBankruptcy(state, 'Three months of arrears and nothing left to seize.');
    return;
  }
  const credit = target.purchasePrice * BAILIFF_SEIZURE_FRACTION;
  state.equipment = state.equipment.filter((item) => item.id !== target.id);
  state.finance.arrearsAmount -= credit;
  addLedger(state, 'seizure', `Seized ${target.specId}, credited against arrears`, credit, true);
  if (state.finance.arrearsAmount <= 0) {
    state.finance.arrearsAmount = 0;
    state.finance.arrearsMonths = 0;
    state.finance.firstArrearsDay = null;
  } else {
    // The debt is still there, so the ladder starts again from one month of arrears.
    state.finance.arrearsMonths = ARREARS_MONTHS_WARNING;
    state.finance.firstArrearsDay = state.clock.day;
  }
  queueEvent(state, {
    kind: 'bailiff',
    title: 'Bailiff',
    body:
      `The bailiff took the ${target.specId} and credited ${formatMoney(credit)}, ` +
      'half of what it cost, against the arrears.',
    data: { specId: target.specId, credit: Math.round(credit) },
  });
}

export function declareBankruptcy(state: GameState, reason: string): void {
  if (state.gameOver) return;
  state.gameOver = { reason, day: state.clock.day };
  queueEvent(state, {
    kind: 'bankruptcy',
    title: 'Bankrupt',
    body: `${reason} That is the end of the company.`,
    choices: [{ id: 'ok', label: 'That is that' }],
    data: { day: state.clock.day },
  });
}

/** Twice the overdraft limit, whatever the difficulty set it to [TUNE]. */
export function bankruptcyFloor(state: GameState): number {
  return state.finance.overdraftLimit * BANKRUPTCY_OVERDRAFT_MULTIPLIER;
}

export function checkBankruptcy(state: GameState): void {
  if (state.gameOver) return;
  if (state.cash <= bankruptcyFloor(state)) {
    declareBankruptcy(state, 'The bank pulled the overdraft.');
  }
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
  runArrearsEscalation(state, day);
  if (day === 1) {
    const deposit = unitDepositFor(state.unit.rentMonthly);
    state.unit.depositHeld = deposit;
    chargeUnavoidable(state, 'unitDeposit', 'Unit deposit, one month of rent', deposit);
  }
  chargeUnavoidable(state, 'rent', 'Rent', dailyRent(state));
  chargeUnavoidable(state, 'rates', 'Business rates', dailyRates(state));
  chargeUnavoidable(state, 'power', 'Power', dailyPower(state));
  if (isWorkingDay(day)) {
    chargeUnavoidable(state, 'living', 'Living costs', LIVING_COST_PER_WORKING_DAY);
  }
  if (isFriday(day)) {
    const wages = weeklyWageBill(state);
    if (wages > 0) {
      chargeUnavoidable(state, 'wages', 'Weekly wages', wages);
      queueEvent(state, {
        kind: 'wagesPaid',
        title: 'Wages',
        body: 'Friday. The weekly wages have gone out.',
        data: { amount: Math.round(wages) },
      });
    }
  }
  checkBankruptcy(state);
}

/** Next dates the player should know about, for the accounting modal. Rent, rates and power run
 *  every calendar day, so they have no next date to show. */
export function nextDueDays(state: GameState): { wages: number; monthly: number } {
  // Today's bills have already run, so both searches start tomorrow.
  let wages = state.clock.day + 1;
  while (!isFriday(wages)) wages += 1;
  let monthly = state.clock.day + 1;
  while (!isFirstOfMonth(monthly)) monthly += 1;
  return { wages, monthly };
}
