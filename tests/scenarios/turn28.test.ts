/*
 * Copyright (c) 2026 Skylon Development Ltd. All rights reserved.
 *
 * This file is proprietary and confidential. Unauthorised copying,
 * modification, distribution or use of this file, in whole or in part,
 * by any means including automated tools and AI systems, is strictly
 * prohibited without prior written permission from Skylon Development Ltd.
 */

// The Turn 28 scenarios of CLAUDE.md T28 D2: (vv) a sash window job made through the timber
// department, and (ww) the company's holidays, played. The letters follow Turn 27's (uu).
//
// (vv) A company in the 800 m2 hall, the second extension open, with the five families of 2.4, a
//      spindle moulder, a booth and the sash cutters, and no office admin, takes a sash window job
//      off the board. The strip says its glass is not ordered once its paperwork is done; the owner
//      orders it the next morning; the job stands a night after its pressing and a night after its
//      finishing, waits for its glass if it is late, is glazed, delivered and paid. Played by the
//      careful script, which takes the job, orders the boards, does the desk work and stands at
//      the bench, with two joiners on the books [TUNE: the crew] and the owner's one click more.
//
// (ww) A company played by the same script from Tuesday 28 November 2025 to Monday 9 January 2026,
//      with a joiner on the books, gets the break's card on Friday 1 December after the tax's,
//      works to Thursday the 21st and pays its wages that day, is closed to Thursday 5 January
//      with its rent, rates, the draw on the weekdays and the tax on the 30th booked, and opens on
//      Friday 6 January with the tax's card and then the break's; the same for August 2026, and no
//      closure in August 2025.

import { describe, expect, it } from 'vitest';
import { addWorkingDays, closureOf, isWeekday, monthOfDay } from '../../src/engine/clock';
import { warnings } from '../../src/engine/warnings';
import { applyAction } from '../../src/engine/index';
import type { GameEvent, GameState, Job, LedgerEntry } from '../../src/engine/index';
import { act, buyStartingKit, eventsOfKind, newGame, nextDay, placeEnquiry, placeEquipment, testJoiner } from '../helpers';
import { CAREFUL, playDay, type Policy } from './autopilot';

// ---------------------------------------------------------------------------------------------
// (vv)
// ---------------------------------------------------------------------------------------------

/** The 800 m2 company: both extensions bought and opened through the engine, the day one kit, the
 *  timber kit at its standard class and the sash cutters, two joiners, no admin. */
function windowCompany(): GameState {
  let state = newGame({ difficulty: 'veryEasy' });
  state.cash = 3000000;
  state = nextDay(act(state, { type: 'EXTEND_UNIT' }));
  state = nextDay(act(state, { type: 'EXTEND_UNIT', stage: 'second' }));
  state = buyStartingKit(state);
  state.cash = 200000;
  state.reputation = 40;
  const kit: Array<[string, number, number]> = [
    ['crossCut', 22, 12],
    ['planer', 27, 12],
    ['spindleMoulder', 32, 12],
    ['sander', 22, 15],
    ['framePress', 27, 15],
    ['sprayBooth', 32, 15],
    ['cuttersSash', 0, 0],
    ['workbench', 16, 12],
    ['workbench', 16, 15],
    // A timber store, which a window asks for from v84 (CLAUDE.md T29 2.11.3): the shelter, out on
    // the apron, so no cell of the hall moves.
    ['timberShelter', 40, 1],
  ];
  kit.forEach(([id, x, y], index) => {
    placeEquipment(state, id, { variantId: 'standard', x, y, id: `kit-t28-${index}` });
  });
  state.workers.push(testJoiner('w-tom', 'Tom', 16, 12), testJoiner('w-ben', 'Ben', 16, 15));
  state.enquiries = [];
  placeEnquiry(state, {
    templateId: 'sashWindows',
    name: 'Sash windows',
    price: 14000,
    finish: 'lacquer',
    materialKind: 'solidWood',
    needsMeasure: true,
    deadlineDays: 60,
    expiresOnDay: state.clock.day + 5,
  });
  return state;
}

interface WindowRun {
  state: GameState;
  seen: GameEvent[];
  /** Every step the script played through: the day, the minute, the strip's glass line, the job's
   *  stand and its stop, its glass. */
  steps: Array<{ day: number; minute: number; glassLine: boolean; curing: string | null; blocked: string; glass: string }>;
  glassOrderedOn: number | null;
}

/** Played by the script. `late` leaves the glass until the job has stopped at its Glazing for want
 *  of it, which is the owner who forgot: the job waits for the glazier to the next working day
 *  (ten working days before v84: CLAUDE.md T29 2.1). */
function playTheWindow(late = false): WindowRun {
  let state = windowCompany();
  const run: WindowRun = { state, seen: [], steps: [], glassOrderedOn: null };
  const job = (now: GameState): Job | undefined => now.jobs.find((entry) => entry.templateId === 'sashWindows');
  const policy: Policy = {
    ...CAREFUL,
    wanted: ['sashWindows'],
    // The owner's click: the morning after the strip has said the glass is not ordered.
    onDay: (now) => {
      const window = job(now);
      if (window === undefined || window.glass !== 'toOrder') return now;
      if (!warnings(now).some((entry) => entry.key === 'glassNotOrdered')) return now;
      if (late && window.blockedBy !== 'waiting for glass') return now;
      run.glassOrderedOn = now.clock.day;
      return applyAction(now, { type: 'ORDER_GLASS', jobId: window.id });
    },
  };
  const watch = (now: GameState): void => {
    const window = job(now);
    run.steps.push({
      day: now.clock.day,
      minute: now.clock.minute,
      glassLine: warnings(now).some((entry) => entry.key === 'glassNotOrdered'),
      curing: window?.curing?.reason ?? null,
      blocked: window?.blockedBy ?? '',
      glass: window?.glass ?? 'gone',
    });
  };
  let guard = 0;
  while (state.gameOver === null && guard < 120) {
    guard += 1;
    state = playDay(state, policy, run.seen, { watch });
    const window = state.jobs.find((entry) => entry.templateId === 'sashWindows');
    if (window?.stage === 'completed') break;
  }
  run.state = state;
  return run;
}

describe('(vv) a sash window job through the timber department (CLAUDE.md T28 2.6 to 2.10)', () => {
  const run = playTheWindow();
  const window = run.state.jobs.find((entry) => entry.templateId === 'sashWindows');

  it('takes the job, says the glass is not ordered, and the owner orders it', () => {
    expect(run.state.gameOver).toBeNull();
    expect(window).toBeDefined();
    expect(window?.timber).toBe(true);
    // The strip said it before the owner pressed the button, and not after.
    const ordered = run.glassOrderedOn ?? Number.NaN;
    expect(run.steps.some((step) => step.glassLine && step.day < ordered)).toBe(true);
    expect(run.steps.some((step) => step.glassLine && step.day > ordered)).toBe(false);
    expect(run.state.ledger.some((entry) => entry.label === 'Glass for Sash windows' && entry.day === ordered)).toBe(true);
  });

  it('stands one night after the pressing and one after the finishing', () => {
    const glue = new Set(run.steps.filter((step) => step.curing === 'glue curing').map((step) => step.day));
    const lacquer = new Set(run.steps.filter((step) => step.curing === 'lacquer drying').map((step) => step.day));
    expect(glue.size).toBe(1);
    expect(lacquer.size).toBe(1);
    expect(Math.min(...lacquer)).toBeGreaterThan(Math.max(...glue));
    // While it stands the job says so.
    for (const step of run.steps.filter((entry) => entry.curing !== null)) {
      if (step.blocked !== '') expect(step.blocked).toBe(step.curing);
    }
  });

  it('waits for its glass if it is late, and is glazed, delivered and paid', () => {
    const waited = run.steps.filter((step) => step.blocked === 'waiting for glass');
    for (const step of waited) expect(step.glass).not.toBe('in');
    expect(window?.stage).toBe('completed');
    expect(window?.balancePaid).toBeGreaterThan(0);
    expect(window?.glass).toBe('in');
    // Paid: the balance in the ledger, the deposit and it the price less any penalty.
    const balance = run.state.ledger.filter((entry) => entry.category === 'jobBalance' && entry.label.includes('Sash windows'));
    expect(balance).toHaveLength(1);
    expect((window?.depositPaid ?? 0) + (window?.balancePaid ?? 0) + (window?.penalty ?? 0)).toBeCloseTo(window?.price ?? 0, 2);
    expect(window?.daysLate).toBe(0);
  });
});

describe('(vv) the same job with the glass left until the Glazing (CLAUDE.md T28 2.9)', () => {
  const run = playTheWindow(true);
  const window = run.state.jobs.find((entry) => entry.templateId === 'sashWindows');

  it('stops at the Glazing waiting for its glass, to the next working day, and then is glazed and paid', () => {
    expect(run.state.gameOver).toBeNull();
    const waited = [...new Set(run.steps.filter((step) => step.blocked === 'waiting for glass').map((step) => step.day))];
    expect(waited.length).toBeGreaterThan(0);
    const ordered = run.glassOrderedOn ?? Number.NaN;
    expect(Math.min(...waited)).toBeLessThanOrEqual(ordered);
    // One working day from v84, ten before it (CLAUDE.md T29 2.1).
    expect(window?.glassDay).toBe(addWorkingDays(ordered, 1));
    for (const day of waited) expect(day).toBeLessThan(window?.glassDay ?? 0);
    expect(window?.stage).toBe('completed');
    expect(window?.balancePaid).toBeGreaterThan(0);
  });
});

// ---------------------------------------------------------------------------------------------
// (ww)
// ---------------------------------------------------------------------------------------------

/** The day one hall bought on this day with 48,000 in the account [TUNE] and a joiner on the books,
 *  the month's report before it already shown, as (uu) has it. */
function companyOn(day: number): GameState {
  const fresh = newGame({ difficulty: 'veryEasy' });
  fresh.clock.day = day;
  fresh.monthEndShownFor = monthOfDay(day);
  const state = buyStartingKit(fresh);
  state.cash = 48000;
  state.workers.push(testJoiner('w-tom', 'Tom'));
  return state;
}

interface Played {
  state: GameState;
  seen: GameEvent[];
  /** The days the script stood in the workshop. */
  opened: number[];
}

function playFromTo(from: number, to: number, policy: Policy = { ...CAREFUL, maxOpenJobs: 0 }): Played {
  let state = companyOn(from);
  const seen: GameEvent[] = [];
  const opened: number[] = [];
  while (state.clock.day < to && state.gameOver === null) {
    opened.push(state.clock.day);
    state = playDay(state, policy, seen);
  }
  opened.push(state.clock.day);
  return { state, seen, opened };
}

function lines(state: GameState, category: LedgerEntry['category'], from: number, to: number): LedgerEntry[] {
  return state.ledger.filter((entry) => entry.category === category && entry.day >= from && entry.day <= to);
}

describe('(ww) the Christmas break, played (CLAUDE.md T28 2.2)', () => {
  // Tuesday 28 November 2025 to Monday 9 January 2026.
  const run = playFromTo(268, 309, { ...CAREFUL, maxOpenJobs: 1 });
  const { state, seen } = run;

  it('is told on Friday 1 December, after the tax, and works every working day to the 21st', () => {
    expect(state.gameOver).toBeNull();
    expect(state.clock.day).toBe(309);
    const card = eventsOfKind(seen, 'closureComing');
    expect(card.map((event) => [event.day, event.title])).toEqual([[271, 'Christmas break']]);
    expect(seen.indexOf(card[0] as GameEvent)).toBeGreaterThan(seen.indexOf(eventsOfKind(seen, 'taxComing')[0] as GameEvent));
    // Every working day of December to the 21st was opened, none of the closed days, and the
    // first day back.
    for (const day of [271, 274, 281, 288, 291, 306, 309]) expect(run.opened, String(day)).toContain(day);
    for (let day = 292; day <= 305; day += 1) expect(run.opened, String(day)).not.toContain(day);
  });

  it('pays the month s wages on Thursday the 21st', () => {
    const wages = lines(state, 'wages', 271, 300);
    expect(wages.map((entry) => entry.day)).toEqual([291]);
    expect(eventsOfKind(seen, 'wagesPaid').filter((event) => event.day >= 271 && event.day <= 300).map((event) => event.day)).toEqual([291]);
  });

  it('books the rent, the rates, the draw on the weekdays and the tax through the break', () => {
    for (let day = 292; day <= 305; day += 1) {
      expect(lines(state, 'rent', day, day), String(day)).toHaveLength(1);
      expect(lines(state, 'rates', day, day), String(day)).toHaveLength(1);
      expect(lines(state, 'ownerDraw', day, day), String(day)).toHaveLength(isWeekday(day) ? 1 : 0);
      expect(closureOf(day), String(day)).toBe('christmas');
    }
    expect(lines(state, 'tax', 292, 305).map((entry) => [entry.day, entry.label])).toEqual([[300, 'Tax for 2025']]);
  });

  it('opens on Friday 6 January with the tax s card and then the break s', () => {
    const back = seen.filter((event) => event.day >= 292 && event.day <= 306);
    const kinds = back.map((event) => event.kind);
    expect(kinds).toContain('taxPaid');
    expect(kinds).toContain('closureOver');
    expect(kinds.indexOf('closureOver')).toBeGreaterThan(kinds.indexOf('taxPaid'));
    expect(kinds).not.toContain('weekend');
    const over = eventsOfKind(seen, 'closureOver')[0];
    expect(over?.day).toBe(306);
    expect(over?.title).toBe('Back from the Christmas break');
    expect(over?.body).toMatch(/^14 days closed\. Rent, rates and the bills ran anyway: £[\d,]+ out\.$/);
  });
});

describe('(ww) the summer: closed in August 2026 and not in August 2025 (CLAUDE.md T28 2.2)', () => {
  it('works every weekday of August 2025 and is told of nothing', () => {
    const run = playFromTo(148, 168);
    expect(run.state.gameOver).toBeNull();
    for (let day = 151; day <= 164; day += 1) {
      if (isWeekday(day)) expect(run.opened, String(day)).toContain(day);
    }
    expect(eventsOfKind(run.seen, 'closureComing')).toEqual([]);
    expect(eventsOfKind(run.seen, 'closureOver')).toEqual([]);
  });

  it('is told on Friday 1 July 2026, closes from 1 to 14 August, and opens on Monday 16 August', () => {
    const run = playFromTo(478, 527);
    const { state, seen } = run;
    expect(state.gameOver).toBeNull();
    expect(eventsOfKind(seen, 'closureComing').map((event) => [event.day, event.title])).toEqual([[481, 'Summer break']]);
    expect(lines(state, 'wages', 481, 510).map((entry) => entry.day)).toEqual([509]);
    for (let day = 510; day <= 525; day += 1) expect(run.opened, String(day)).not.toContain(day);
    expect(run.opened).toContain(526);
    for (let day = 511; day <= 524; day += 1) {
      expect(lines(state, 'rent', day, day), String(day)).toHaveLength(1);
      expect(lines(state, 'ownerDraw', day, day), String(day)).toHaveLength(isWeekday(day) ? 1 : 0);
    }
    const over = eventsOfKind(seen, 'closureOver');
    expect(over.map((event) => [event.day, event.title])).toEqual([[526, 'Back from the summer break']]);
    expect(over[0]?.body).toMatch(/^16 days closed\. /);
    expect(eventsOfKind(seen, 'weekend').filter((event) => event.day === 526)).toEqual([]);
  });
});
