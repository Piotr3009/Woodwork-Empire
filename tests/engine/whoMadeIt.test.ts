// Who made today's Output number, and why (PIOTR, 22.09: "the player has no way of knowing what to
// fix"; CLAUDE.md T24 2.1). Three days of v40 to v49 read "Output 0.75" with nothing under it: a
// by hand job, a serviced extractor and a one man day all printed the same figure. The engine
// keeps the minutes and the worth a man at a time and writes the rows; the sheet prints them.

import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { BY_HAND_DURATION_FACTOR } from '../../src/engine/constants';
import {
  OWNER,
  dustBand,
  hallProductivityFactor,
  serviceMachine,
  workshopBreakdownToday,
  workshopOutputToday,
} from '../../src/engine/machines';
import { migrateState } from '../../src/engine/migrate';
import type { GameState } from '../../src/engine/index';
import {
  act,
  acceptNow,
  bossAssigns,
  buyStartingKit,
  clearEvents,
  fillRack,
  hireNow,
  newGame,
  placeEnquiry,
  placeEquipment,
  runClock,
} from '../helpers';

/** The day one hall with its saw and its fan, one job of sheet work on the books and the owner on
 *  it, for the rows that are about the hall and not about a by hand job. */
function sawHall(): GameState {
  let state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 200);
  const shelves = placeEnquiry(state, { name: 'Garage shelves', price: 900, deadlineDays: 30 });
  state = clearEvents(acceptNow(state, shelves.id));
  const job = state.jobs[0];
  if (!job) throw new Error('the shelves are wanted');
  job.stage = 'inProduction';
  job.assignees = [OWNER];
  return act(bossAssigns(state), { type: 'SET_SPEED', speed: 1 });
}

/** A hall with a bench for every man and no saw and no solid wood tools in it, three joiners and
 *  an oak table that can only be made by hand. The saw is taken off the floor after the hiring,
 *  because the gate asks for one before it lets a joiner through and this hall is about the job
 *  and not about the gate. */
function byHandHall(): GameState {
  let state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 200);
  // The three grades the mockup has on it. The gate reads reputation and the bank before it lets
  // a man through, and neither is what this test is about.
  state.reputation = 100;
  state.cash = 200000;
  // A three place bench beside the day one bench, so all four men have a place and nobody stands
  // for one (v47), and the locker, cabinet and tools the gate asks for before it lets a man
  // through. They go down before the hiring, because the gate counts them.
  placeEquipment(state, 'workbench', { variantId: 'industrial', x: 10, y: 6, id: 'kit-bench-2' });
  for (let man = 0; man < 3; man += 1) {
    placeEquipment(state, 'locker', { x: 6, y: 9, id: `kit-locker-${man}` });
    placeEquipment(state, 'handToolSet', { x: 12, y: 9, id: `kit-tools-${man}` });
    placeEquipment(state, 'toolCabinet', { x: 10, y: 9, id: `kit-cabinet-${man}` });
  }
  for (const tier of ['experienced', 'senior', 'master'] as const) {
    state = hireNow(state, 'joiner', tier);
  }
  expect(state.workers).toHaveLength(3);
  // Their notice is not what this test is about either: they start this morning.
  for (const worker of state.workers) worker.startDay = state.clock.day;
  // No saw, so every stage of the table falls back to a pair of hands.
  state.equipment = state.equipment.filter((item) => item.specId !== 'tableSaw');
  const table = placeEnquiry(state, {
    templateId: 'oakDiningTable',
    name: 'Oak dining table',
    price: 12000,
    materialKind: 'solidWood',
    deadlineDays: 50,
    lockReason: 'Needs solid wood tools',
    byHandAvailable: true,
  });
  state = clearEvents(acceptNow(state, table.id, true));
  const job = state.jobs.find((entry) => entry.name === 'Oak dining table');
  if (!job) throw new Error('the table is wanted');
  job.stage = 'inProduction';
  job.assignees = [OWNER, ...state.workers.map((worker) => worker.id)];
  for (const worker of state.workers) worker.jobId = job.id;
  return act(state, { type: 'SET_SPEED', speed: 1 });
}

describe('who made it today', () => {
  it('gives four men on a by hand job a row each, every one by hand, summing to the Output number', () => {
    const state = runClock(byHandHall(), 14);
    const made = workshopBreakdownToday(state);
    expect(made.men).toHaveLength(4);
    // The owner first, then the crew in the order of state.workers.
    expect(made.men.map((row) => row.who)).toEqual([OWNER, ...state.workers.map((man) => man.id)]);
    for (const row of made.men) {
      expect(row.minutes, row.main).toBe(14);
      expect(row.words, row.main).toContain('by hand');
      expect(row.words, row.main).toContain(`times ${(1 / BY_HAND_DURATION_FACTOR).toFixed(2)}`);
    }
    // The head counts the day's own minutes, and the sum is the figure the top bar shows.
    expect(made.minutes).toBe(state.dayStats.workMinutes);
    expect(made.total).toBe(workshopOutputToday(state));
    // The rows are the sum: every man's worth a minute over the minutes he put in.
    const worth = made.men.reduce((sum, row) => sum + row.figure * row.minutes, 0);
    expect(worth / made.minutes).toBeCloseTo(made.total, 2);
  });

  it('names the tools the job was locked on, once, and says nothing about slow men', () => {
    const made = workshopBreakdownToday(runClock(byHandHall(), 14));
    expect(made.note).toBe(
      'Oak dining table was taken by hand: no solid wood tools in the hall, so every stage of it ' +
        'runs at 0.67, the saw included.',
    );
  });

  it('says the saw s family and the hall s best class, whichever saw the man is at', () => {
    // An industrial saw bought beside the budget one: the owner may stand at either, and the hall
    // cuts at 1.12 because the shop cuts on the good saw (CLAUDE.md T25 2.4).
    const state = sawHall();
    placeEquipment(state, 'tableSaw', { variantId: 'industrial', x: 12, y: 1, id: 'kit-saw-good' });
    const made = workshopBreakdownToday(runClock(state, 5));
    expect(made.men[0]?.words).toMatch(/^saw, industrial, \d+ min: your [\d.]+ times 1\.12$/);
  });

  it('says what the hall was, in the words the sheet already has for it', () => {
    const made = workshopBreakdownToday(runClock(byHandHall(), 14));
    expect(made.hall?.main).toBe('Hall');
    expect(made.hall?.words).toBe('clean, extraction working');
    expect(made.hall?.figure).toBe(Math.round(hallProductivityFactor(runClock(byHandHall(), 14)) * 100) / 100);
  });

  it('says the extractor is on service on the hall row, and names it in the note', () => {
    // A hall with a saw in it, so the fan has something to pull for and its absence is felt.
    let state = sawHall();
    const fan = state.equipment.find((item) => item.specId === 'extractor');
    if (!fan) throw new Error('the fan is wanted');
    serviceMachine(state, fan.id);
    state = runClock(state, 14);
    const made = workshopBreakdownToday(state);
    expect(made.hall?.words).toContain('extractor on service');
    // The hall is under 1.00 with the fan away, and the sentence under the block names it.
    expect(made.hall?.figure ?? 1).toBeLessThan(1);
    expect(made.note).toMatch(/^The hall ran at \d\.\d\d today: /);
    expect(made.note).toContain('extractor on service');
  });

  it('draws nothing at all before the first production minute of the day', () => {
    const made = workshopBreakdownToday(byHandHall());
    expect(made.men).toEqual([]);
    expect(made.hall).toBe(null);
    expect(made.note).toBe('');
  });

  it('gives the hall under 1.00 its own sentence when no job was taken by hand', () => {
    const state = sawHall();
    // A day with minutes in it and a dirty hall: the sentence is the hall's, not a man's.
    state.dayStats.byMan = { [OWNER]: { minutes: 10, worth: 7 } };
    state.dayStats.workMinutes = 10;
    state.dayStats.outputWorth = 7;
    state.dust = 100;
    const made = workshopBreakdownToday(state);
    expect(made.men).toHaveLength(1);
    expect(made.note).toMatch(/^The hall ran at \d\.\d\d today: /);
    // The dust band's own word, off the breakdown's own line: clean, messy, dirty, dangerous.
    expect(made.note).toContain(dustBand(state.dust).label);
  });
});

describe('the day fixtures Piotr sent, one minute in', () => {
  function load(path: string): GameState {
    const raw = JSON.parse(readFileSync(path, 'utf8')) as {
      state: Record<string, unknown> & { version: number };
    };
    const state = migrateState(raw.state, raw.state.version);
    if (state === null) throw new Error(`${path} did not open`);
    return state;
  }

  it('gives the day 128 hall one row, the owner s at the saw s one place, and the figure the top bar carries', () => {
    // Four men on the kitchen at its cutting and a budget saw of one place: the owner cuts and the
    // three joiners have no place at it, so they made nothing today and have no row (CLAUDE.md
    // T25 2.3). Until v52 the bag of work sent them to the machining and the assembly.
    const state = runClock(load('tests/fixtures/day128-v25.woodwork.json'), 1);
    const made = workshopBreakdownToday(state);
    expect(made.men).toHaveLength(1);
    expect(made.men.map((row) => row.main)).toEqual(['Piotr, cutting Small kitchen (6 units), commercial']);
    // The why is the family and the class that sets the hall's pace for it, in place of the
    // machine he stood at, and the figure after it is that pace: the budget class's 1.00 and the
    // gate the save's saw carries, 2% on top (CLAUDE.md T13 3.11, T25 2.4).
    expect(made.men[0]?.words).toMatch(/^saw, budget, \d+ min: your [\d.]+ times 1\.02$/);
    expect(made.total).toBe(workshopOutputToday(state));
    expect(made.hall?.words).toBe('clean, extraction working');
    expect(made.note).toBe('');
  });

  it('gives the day 149 hall its by hand sentence and every row its own arithmetic', () => {
    const state = runClock(load('tests/fixtures/day149-v25.woodwork.json'), 1);
    const made = workshopBreakdownToday(state);
    expect(made.men).toHaveLength(4);
    expect(made.note).toBe(
      'Oak dining table, commercial was taken by hand: no solid wood tools in the hall, so every ' +
        'stage of it runs at 0.67, the saw included.',
    );
    // Every row's two figures multiply out to the one beside them, to the pence.
    for (const row of made.men) {
      const figures = row.words.match(/([\d.]+) times ([\d.]+)$/);
      if (figures === null) throw new Error(`no arithmetic in ${row.words}`);
      // Both figures are printed to two places, so the product can sit a penny off the average.
      expect(Math.abs(Number(figures[1]) * Number(figures[2]) - row.figure), row.main).toBeLessThan(0.011);
    }
    expect(made.total).toBe(workshopOutputToday(state));
  });
});
