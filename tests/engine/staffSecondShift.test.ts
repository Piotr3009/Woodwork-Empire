// The second shift (PIOTR; CLAUDE.md T13 3.9): "a small firm runs a second shift out of
// necessity, not luxury, because it cannot make the deadline". Without a production manager there
// is no second shift; with him the night men work after the day, at the night rate, with the
// owner gone home. And the assigning is his, off the owner's day (3.9 point 2).

import { menAtPlaces } from '../../src/engine/machines';
import { describe, expect, it } from 'vitest';
import {
  ACCIDENT_CHANCE_PER_DAY,
  ACCIDENT_DAYS_OFF,
  DAY_END_MINUTE,
  DUST_MAX,
  NIGHT_ERROR_FACTOR,
  NIGHT_RATE,
  PRODUCTION_MANAGER_MONTHLY_WAGE,
  PRODUCTION_MANAGER_PACE,
  SECOND_SHIFT_MINUTES,
  WORKER_HOURS_PER_MONTH,
  WORKER_RATES,
} from '../../src/engine/constants';
import {
  availableJoiners,
  hurtWorker,
  isWorkingToday,
  nightCrew,
  nightPremiumFor,
  onTheBooksToday,
  rollNightAccident,
  runNightShift,
  secondShiftCheck,
  secondShiftRuns,
  shiftOf,
} from '../../src/engine/staff';
import { absenceFactor, nightShareOf } from '../../src/engine/owner';
import { hands, jobOf } from '../../src/engine/production';
import { formatCalendarDay, tick } from '../../src/engine/index';
import type { GameState, Worker } from '../../src/engine/index';
import { act, clearEvents, sixJoinersOnSheetWork } from '../helpers';

/** A production manager on the books from day one, the way a test wants him without the
 *  interview (CLAUDE.md T13 3.9). */
function manager(id = 'pm-1'): Worker {
  return {
    id,
    name: 'Frank',
    role: 'productionManager',
    // The grade a save's manager is given and the grade he was always paid for: the experienced
    // man costs the 3,400 a manager cost before Turn 23 gave him four (CLAUDE.md T23 2.4).
    tier: 'experienced',
    rate: 0,
    monthlyWage: PRODUCTION_MANAGER_MONTHLY_WAGE.experienced,
    leavesOnDay: null,
    startDay: 1,
    jobId: null,
    taskId: null,
    minutesWorked: 0,
    ordersToday: 0,
    overtimeMinutes: 0,
    overtimeMinutesWeek: 0,
    overtimeDays: 0,
    tiredOfOvertime: false,
    station: 'idle',
    productionMinutes: 0,
    absentDaysRemaining: 0,
    shift: 'day',
    dayLog: [],
    monthMinutes: 0,
    monthDaysOff: 0,
    idleMinutes: 0,
    idleByReason: { waitingForBoss: 0, noPlace: 0, noMaterial: 0, noCompressor: 0, hallStopped: 0 },
    working: false,
    noPlaceFor: '',
    accidents: 0,
    anchorX: 1,
    anchorY: 1,
  };
}

/** Six poor joiners each on a job, a manager on the books, the switch on, and the last two men
 *  put on nights. */
function nightHall(): GameState {
  const state = sixJoinersOnSheetWork();
  state.workers.push(manager());
  state.shift.second = true;
  for (const id of ['staff-5', 'staff-6']) {
    const worker = state.workers.find((entry) => entry.id === id);
    if (worker) worker.shift = 'night';
  }
  return state;
}

function workerOf(state: GameState, id: string): Worker {
  const worker = state.workers.find((entry) => entry.id === id);
  if (!worker) throw new Error(`no worker ${id}`);
  return worker;
}

describe('the second shift', () => {
  it('does not exist without a manager: no switch, no night men, no shift', () => {
    const state = sixJoinersOnSheetWork();
    expect(secondShiftCheck(state)).toEqual({
      ok: false,
      reason: 'Hire a production manager for a second shift',
    });
    // The action refuses the switch, and a man cannot be put on a shift that does not run.
    const off = act(state, { type: 'SET_SECOND_SHIFT', on: true });
    expect(off.shift.second).toBe(false);
    const put = act(off, { type: 'ASSIGN_SHIFT', workerId: 'staff-1', shift: 'night' });
    expect(workerOf(put, 'staff-1').shift).toBe('day');
    // Forced on with nobody to run it, it still does not run.
    state.shift.second = true;
    workerOf(state, 'staff-1').shift = 'night';
    expect(secondShiftRuns(state)).toBe(false);
    expect(shiftOf(state, workerOf(state, 'staff-1'))).toBe('day');
    state.owner.wentHome = true;
    expect(runNightShift(state).ran).toBe(false);
    // With a manager who has not started yet, the reason says when.
    const soon = sixJoinersOnSheetWork();
    soon.workers.push({ ...manager(), startDay: 3 });
    expect(secondShiftCheck(soon).reason).toBe(
      `The production manager starts on ${formatCalendarDay(3)}`,
    );
  });

  it('is switched on with a manager, and a joiner is put on it one click at a time', () => {
    const state = sixJoinersOnSheetWork();
    state.workers.push(manager());
    expect(secondShiftCheck(state).ok).toBe(true);
    const on = act(state, { type: 'SET_SECOND_SHIFT', on: true });
    expect(on.shift.second).toBe(true);
    const night = act(on, { type: 'ASSIGN_SHIFT', workerId: 'staff-1', shift: 'night' });
    expect(workerOf(night, 'staff-1').shift).toBe('night');
    expect(shiftOf(night, workerOf(night, 'staff-1'))).toBe('night');
    const back = act(night, { type: 'ASSIGN_SHIFT', workerId: 'staff-1', shift: 'day' });
    expect(workerOf(back, 'staff-1').shift).toBe('day');
    // Switched off again, a night man is a day man: nobody is on neither shift.
    const off = act(night, { type: 'SET_SECOND_SHIFT', on: false });
    expect(workerOf(off, 'staff-1').shift).toBe('night');
    expect(shiftOf(off, workerOf(off, 'staff-1'))).toBe('day');
  });

  it('a man on the night shift is not on the day shift', () => {
    const state = nightHall();
    const five = workerOf(state, 'staff-5');
    expect(onTheBooksToday(state, five)).toBe(true);
    expect(isWorkingToday(state, five)).toBe(false);
    expect(isWorkingToday(state, five, 'night')).toBe(true);
    expect(hands(state).map((hand) => hand.who)).toEqual(['staff-1', 'staff-2', 'staff-3', 'staff-4']);
    expect(hands(state, { shift: 'night' }).map((hand) => hand.who)).toEqual(['staff-5', 'staff-6']);
    expect(nightCrew(state).map((worker) => worker.id)).toEqual(['staff-5', 'staff-6']);
    expect(availableJoiners(state, 'night')).toHaveLength(0);
    // By day his job does not move, and he is not a seat the efficiency counts (CLAUDE.md 10.3).
    const before = jobOf(state, 'staff-5')?.labourRemaining ?? 0;
    const later = tick(state, 60);
    expect(jobOf(later, 'staff-5')?.labourRemaining).toBe(before);
    expect(jobOf(later, 'staff-1')?.labourRemaining).toBeLessThan(
      jobOf(state, 'staff-1')?.labourRemaining ?? 0,
    );
    // The owner and the four day men: five seats a minute.
    expect(later.dayStats.efficiency.possible).toBe(60 * 5);
  });

  it('works the night men’s minutes into their jobs, marks them as night ones, and books the premium', () => {
    const state = nightHall();
    // As the day end leaves him: gone home, the manager covering the hall.
    state.owner.wentHome = true;
    const cash = state.cash;
    const before = ['staff-5', 'staff-6'].map((id) => jobOf(state, id)?.labourRemaining ?? 0);
    const dayBefore = jobOf(state, 'staff-1')?.labourRemaining ?? 0;
    const report = runNightShift(state);
    expect(report.ran).toBe(true);
    expect(report.crew).toEqual(['staff-5', 'staff-6']);
    expect(report.minutes).toBeGreaterThan(0);
    const after = ['staff-5', 'staff-6'].map((id) => jobOf(state, id)?.labourRemaining ?? 0);
    expect(after[0]).toBeLessThan(before[0] ?? 0);
    expect(after[1]).toBeLessThan(before[1] ?? 0);
    // The day men's jobs did not move: they are at home.
    expect(jobOf(state, 'staff-1')?.labourRemaining).toBe(dayBefore);
    // Every minute of it is a night one on the piece, and on the day's count.
    const jobs = ['staff-5', 'staff-6'].map((id) => jobOf(state, id));
    for (const job of jobs) {
      expect(job?.nightMinutes).toBeGreaterThan(0);
      expect(job?.nightMinutes).toBe(job?.productionMinutes);
      expect(job && nightShareOf(job)).toBe(1);
    }
    expect(state.dayStats.nightMinutes).toBe(
      jobs.reduce((sum, job) => sum + (job?.nightMinutes ?? 0), 0),
    );
    // A joiner with no experience is on 1,950 a month, and a month of him is 171.43 hours: 11.375
    // an hour, eight hours of night, the quarter on top, which is 22.75 (CLAUDE.md T21 2.10).
    expect(nightPremiumFor(workerOf(state, 'staff-5'))).toBe(
      (1950 / WORKER_HOURS_PER_MONTH) * (SECOND_SHIFT_MINUTES / 60) * (NIGHT_RATE - 1),
    );
    expect(nightPremiumFor(workerOf(state, 'staff-5'))).toBe(22.75);
    expect(report.premium).toBe(45.5);
    expect(cash - state.cash).toBe(45.5);
    const line = state.ledger[state.ledger.length - 1];
    expect(line?.category).toBe('wagesNight');
    expect(line?.amount).toBe(-45.5);
    // Nobody is at a place overnight (CLAUDE.md T25 2.3).
    expect(menAtPlaces(state)).toEqual([]);
  });

  it('runs at the rate the manager’s cover leaves, with the owner gone home', () => {
    const state = nightHall();
    state.owner.wentHome = true;
    const rates = hands(state, { shift: 'night' }).map((hand) => hand.rate);
    // Three things on the minute and no more: the man's own rate, what the owner's absence takes
    // off it, and what the manager over him adds. The manager of this hall is the experienced
    // one, so his grade's pace is on the night the same as on the day: he runs the second shift
    // and the men on it are men he carries (CLAUDE.md T13 3.9, T23 2.4).
    const pace = PRODUCTION_MANAGER_PACE.experienced;
    expect(rates).toEqual([
      WORKER_RATES.novice * absenceFactor(true) * pace,
      WORKER_RATES.novice * absenceFactor(true) * pace,
    ]);
    expect(absenceFactor(true)).toBe(0.92);
    expect(pace).toBe(1.05);
  });

  it('is run by the day end, and the summary carries the night minutes', () => {
    let state = nightHall();
    state.clock.minute = DAY_END_MINUTE;
    state.owner.homeAsked = true;
    state = act(state, { type: 'END_DAY' });
    expect(state.activeEvent?.kind).toBe('dayEnd');
    const summary = state.days[state.days.length - 1];
    expect(summary?.day).toBe(1);
    expect(summary?.nightMinutes).toBeGreaterThan(0);
    expect(state.ledger.some((line) => line.category === 'wagesNight')).toBe(true);
    // And the night men are night men still in the morning, off the day's hands.
    const morning = clearEvents(state);
    expect(hands(morning).map((hand) => hand.who)).not.toContain('staff-5');
  });

  it('puts a hurt man through the one door, by day or by night', () => {
    const state = nightHall();
    const five = workerOf(state, 'staff-5');
    const job = jobOf(state, 'staff-5');
    hurtWorker(state, five, { night: true });
    expect(five.absentDaysRemaining).toBe(ACCIDENT_DAYS_OFF);
    expect(five.jobId).toBeNull();
    expect(job?.assignees[0] ?? null).toBeNull();
    const event = state.eventQueue.find((entry) => entry.kind === 'accident') ?? state.activeEvent;
    expect(event?.kind).toBe('accident');
    expect(event?.data.night).toBe(true);
    expect(isWorkingToday(state, five, 'night')).toBe(false);
  });

  it('doubles the accident chance at night, and rolls nothing in a clean hall', () => {
    const clean = nightHall();
    clean.dust = 0;
    expect(rollNightAccident(clean, nightCrew(clean))).toBeNull();
    const dangerous = nightHall();
    dangerous.dust = DUST_MAX;
    const crew = nightCrew(dangerous);
    let hurt = 0;
    const rolls = 4000;
    for (let roll = 0; roll < rolls; roll += 1) {
      if (rollNightAccident(dangerous, crew) !== null) hurt += 1;
      for (const worker of crew) worker.absentDaysRemaining = 0;
      dangerous.eventQueue = [];
      dangerous.activeEvent = null;
    }
    const wanted = ACCIDENT_CHANCE_PER_DAY * NIGHT_ERROR_FACTOR;
    expect(wanted).toBe(0.04);
    expect(hurt / rolls).toBeGreaterThan(wanted * 0.7);
    expect(hurt / rolls).toBeLessThan(wanted * 1.3);
  });
});

