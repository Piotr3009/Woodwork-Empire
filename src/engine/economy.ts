// Cash, the cost cadences, debt, arrears, the bailiff and bankruptcy.
// Every movement of money in the game goes through `pay` or `receive`, so the ledger is complete.

import {
  ARREARS_MONTHS_BAILIFF,
  ARREARS_MONTHS_FINAL_WARNING,
  ARREARS_MONTHS_WARNING,
  BAILIFF_SEIZURE_FRACTION,
  BANKRUPTCY_OVERDRAFT,
  DAYS_PER_MONTH,
  DUST_WASTE_MONTHLY,
  LEDGER_MAX_ENTRIES,
  LIVING_COST_PER_WORKING_DAY,
  OVERDRAFT_MONTHLY_INTEREST,
  PELLET_INCOME_MONTHLY_BASE,
  PELLET_INCOME_PER_1000_PRODUCTION_MINUTES,
  POWER_BASE_DAILY,
  POWER_PER_MACHINE_DAILY,
  SOFTWARE_SUBSCRIPTION_MONTHLY,
  UNIT_DEPOSIT,
} from './constants';
import { isFirstOfMonth, isFriday, isWorkingDay, weekday } from './clock';
import { queueEvent } from './events';
import { has, poweredMachines, seizableMachines } from './machines';
import { makeId } from './rng';
import type { GameState, LedgerCategory, PeriodTotals } from './types';

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

function runMonthlyItems(state: GameState): void {
  const before = state.cash;
  const entriesBefore = state.ledger.length;
  if (state.cash < 0) {
    const interest = -state.cash * OVERDRAFT_MONTHLY_INTEREST;
    chargeUnavoidable(state, 'interest', 'Overdraft interest', interest);
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

/** Three months of arrears: the dearest machine goes, credited at half its purchase price. */
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

export function checkBankruptcy(state: GameState): void {
  if (state.gameOver) return;
  if (state.cash <= BANKRUPTCY_OVERDRAFT) {
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
    chargeUnavoidable(state, 'unitDeposit', 'Unit deposit', UNIT_DEPOSIT);
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
