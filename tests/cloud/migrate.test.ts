// A game saved by the build before this one opens: the bags came off the machines, and the save
// is lifted into the shape the engine runs on now rather than refused (CLAUDE.md T12 2.3).

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { decodeSaveFile, encodeSaveFile } from '../../src/cloud/file';
import { openSavedRow } from '../../src/cloud/saves';
import { peekSave } from '../../src/cloud/store';
import type { SaveStore } from '../../src/cloud/store';
import { OLDEST_SAVE_VERSION, canOpenVersion, migrateState } from '../../src/engine/migrate';
import { STATE_VERSION, bagStore, tick } from '../../src/engine/index';
import {
  CABINET_SLOT_LAYOUT,
  PRODUCTION_MANAGER_MONTHLY_WAGE,
  roomById,
} from '../../src/engine/constants';
import type { GameState } from '../../src/engine/index';
import { itemFootprint } from '../../src/engine/machines';
import { orientationsFor } from '../../src/engine/ports';
import { spriteFiles } from '../../src/render/sprites';
import { twoMenOnSheetWork } from '../helpers';

/** A game saved by v18 on the morning of day 2, with a full bag on the saw, the question about
 *  it open and the bag change on the list: everything the bump took away, in the shape it had.
 *  Written by the Turn 11 engine itself, before this turn touched it. */
const FIXTURE = 'tests/fixtures/save-v18.woodwork.json';
const text = readFileSync(FIXTURE, 'utf8');
const raw = JSON.parse(text) as { stateVersion: number; state: Record<string, unknown> };

function keysOf(value: unknown): string[] {
  return Object.keys(value as object);
}

describe('the v18 fixture', () => {
  it('is what it claims: a Turn 11 save with a bag full on a machine', () => {
    expect(raw.stateVersion).toBe(12);
    expect(OLDEST_SAVE_VERSION).toBe(12);
    const equipment = raw.state.equipment as Array<Record<string, unknown>>;
    const saw = equipment.find((item) => item.specId === 'tableSaw');
    expect(saw?.bagFull).toBe(true);
    expect(saw?.minutesUsed).toBe(1200);
    expect((raw.state.activeEvent as Record<string, unknown>).kind).toBe('bagFull');
    const tasks = raw.state.tasks as Array<Record<string, unknown>>;
    expect(tasks.some((task) => task.kind === 'bagChange' && task.done === false)).toBe(true);
    expect(raw.state).not.toHaveProperty('bagFillM3');
  });
});

describe('opening it in this build', () => {
  const opened = decodeSaveFile(text);
  const state = opened.state as GameState;

  it('loads, at this build’s version, with the note a good file gets', () => {
    expect(opened.state).not.toBeNull();
    expect(opened.note).toBe('Loaded from file.');
    expect(state.version).toBe(STATE_VERSION);
    expect(state.clock).toEqual({ day: 2, minute: 31 });
  });

  it('zeroes the new fields and drops the two old ones off every machine', () => {
    expect(state.bagFillM3).toBe(0);
    expect(state.dayStats.dustM3).toBe(0);
    expect(state.days.length).toBeGreaterThan(0);
    for (const day of state.days) expect(day.dustMadeM3).toBe(0);
    for (const item of state.equipment) {
      expect(keysOf(item), item.specId).not.toContain('bagFull');
      expect(keysOf(item), item.specId).not.toContain('minutesUsed');
    }
    // The saw keeps its hours: only the bag went.
    const saw = state.equipment.find((item) => item.specId === 'tableSaw');
    expect(saw?.hoursUsed ?? 0).toBeGreaterThan(8);
  });

  it('drops the bag change of one machine and the question about it, and frees whoever held it', () => {
    expect(state.tasks.some((task) => (task.kind as string) === 'bagChange')).toBe(false);
    expect(state.activeEvent?.kind ?? null).not.toBe('bagFull');
    expect(state.eventQueue.some((event) => (event.kind as string) === 'bagFull')).toBe(false);
    const ids = new Set(state.tasks.map((task) => task.id));
    if (state.owner.currentTaskId !== null) expect(ids.has(state.owner.currentTaskId)).toBe(true);
    for (const worker of state.workers) {
      if (worker.taskId !== null) expect(ids.has(worker.taskId)).toBe(true);
    }
    // The bags are empty, so nothing in the hall is stopped.
    expect(bagStore(state).full).toBe(false);
  });

  it('runs, and round trips through the one encoder like any other game', () => {
    const later = tick(state, 30);
    expect(later.clock.day).toBe(2);
    expect(later.clock.minute).toBeGreaterThan(31);
    const back = decodeSaveFile(encodeSaveFile(later));
    expect(back.state).toEqual(later);
  });

  it('is ready on the start screen and in the cloud row, not stale', () => {
    const store: SaveStore = { write: () => undefined, read: () => text, clear: () => undefined };
    expect(peekSave(store)).toEqual({ kind: 'ready', companyName: 'Woodwork Empire', day: 2 });
    expect(openSavedRow({ state: text, state_version: 12 }).state).not.toBeNull();
    expect(openSavedRow({ state: text, state_version: 12 }).note).toBe('Loaded.');
  });
});

describe('what is still refused', () => {
  it('is anything older than v18, and anything that is not a state', () => {
    expect(canOpenVersion(11)).toBe(false);
    expect(canOpenVersion(12)).toBe(true);
    expect(canOpenVersion(STATE_VERSION)).toBe(true);
    expect(canOpenVersion(STATE_VERSION + 1)).toBe(false);
    expect(migrateState(raw.state, 11)).toBeNull();
    expect(migrateState('not a state', 12)).toBeNull();
    const older = text.replace('"stateVersion":12', '"stateVersion":11');
    expect(decodeSaveFile(older).state).toBeNull();
    expect(decodeSaveFile(older).note).toContain('older build');
    // And the lift leaves the file it was given exactly as it was.
    const before = JSON.stringify(raw.state);
    migrateState(raw.state, 12);
    expect(JSON.stringify(raw.state)).toBe(before);
  });
});

// ---------------------------------------------------------------------------
// Turn 17: version 14 to 15 (CLAUDE.md T17 section 4)
// ---------------------------------------------------------------------------

/** A game saved by v24: state version 14, the shape the turn before this one ran on. */
const V24_FIXTURE = 'tests/fixtures/save-v20.woodwork.json';
const v24Text = readFileSync(V24_FIXTURE, 'utf8');

/** The same save with a canteen seat and a locker standing on the hall floor, where every welfare
 *  item stood before tonight: the front edge, clear of the gate lane. */
function v24WithWelfareOnTheFloor(): Record<string, unknown> {
  const parsed = JSON.parse(v24Text) as { state: Record<string, unknown> };
  const equipment = parsed.state.equipment as Array<Record<string, unknown>>;
  const template = equipment[0] as Record<string, unknown>;
  equipment.push(
    { ...template, id: 'kit-seat', specId: 'canteenSeat', spriteKey: 'canteenSeat', anchorX: 7, anchorY: 9 },
    { ...template, id: 'kit-locker', specId: 'locker', spriteKey: 'locker', anchorX: 13, anchorY: 9 },
  );
  parsed.state.movedItems = [{ itemId: 'kit-seat', fromX: 8, fromY: 9, fromRotated: false }];
  return parsed.state;
}

describe('a v24 save in this build (CLAUDE.md T17 section 4)', () => {
  it('loads, and comes up at this build’s version with the fields the bump added zeroed', () => {
    const opened = decodeSaveFile(v24Text);
    expect(opened.state).not.toBeNull();
    const state = opened.state as GameState;
    expect(state.version).toBe(STATE_VERSION);
    expect(STATE_VERSION).toBe(29);
    expect(state.taskQueue).toEqual([]);
    expect(state.dayStats.paidHours).toBe(0);
    expect(state.dayStats.expressUplift).toBe(0);
    // v40: no sum behind the average output yet, and a closed day reads the hall's own factor.
    expect(state.dayStats.outputWorth).toBe(0);
    for (const day of state.days) {
      expect(day.paidHours).toBe(0);
      expect(day.expressUplift).toBe(0);
      expect(day.outputToday).toBe(day.hallFactor);
    }
    for (const item of state.equipment) expect(item.minutesSavedLastWeek).toBe(0);
    for (const job of state.jobs) expect(job.assignees[1] ?? null).toBeNull();
  });

  it('moves every locker off the hall floor and into the canteen, and retires the seats', () => {
    const lifted = migrateState(v24WithWelfareOnTheFloor(), 14);
    expect(lifted).not.toBeNull();
    const state = lifted as GameState;
    const canteen = roomById('canteen');
    const inside = (item: { anchorX: number; anchorY: number }): boolean =>
      item.anchorX >= canteen.x &&
      item.anchorX < canteen.x + canteen.width &&
      item.anchorY >= canteen.y &&
      item.anchorY < canteen.y + canteen.depth;
    const lockers = state.equipment.filter((item) => item.specId === 'locker');
    expect(lockers).toHaveLength(1);
    for (const item of lockers) expect(inside(item), item.specId).toBe(true);
    // The seat the v15 lift stood inside the canteen is taken off the books by the v20 lift,
    // because Turn 23 took the seat out of the game (CLAUDE.md T23 2.11).
    expect(state.equipment.some((item) => item.specId === 'canteenSeat')).toBe(false);
    expect(state.ledger.some((entry) => entry.label === 'Canteen seats retired (v36)')).toBe(true);
    // And a seat half way through a move is not a move any more: the hall never had it.
    expect(state.movedItems).toEqual([]);
  });

  it('runs on, and round trips through the one encoder', () => {
    const state = decodeSaveFile(v24Text).state as GameState;
    const later = tick(state, 30);
    const back = decodeSaveFile(encodeSaveFile(later));
    expect(back.state).toEqual(later);
  });
});

describe('the category rename of version 14 (CLAUDE.md T13 3.20)', () => {
  it('renames the running totals with the ledger, so no raw key reaches the Accounts page', () => {
    // Turn 13 renamed `living` to `ownerDraw` and `ducting` to `pipes` in the ledger and not in
    // `finance.day/week/month.byCategory`, which is keyed by the same names and is what the
    // Accounts summary draws its rows from. `categoryLabel` has no word for the old names and
    // falls back on the key, so a lifted save printed `living` at the player. Found by the Turn 19
    // review of the migration.
    const raw = {
      version: 13,
      jobs: [],
      equipment: [],
      ledger: [
        { category: 'living', amount: -200 },
        { category: 'ducting', amount: -75 },
      ],
      finance: {
        day: { income: 0, costs: 275, byCategory: { living: -200, ducting: -75 } },
        week: { income: 0, costs: 200, byCategory: { living: -200, ownerDraw: -50 } },
        month: { income: 0, costs: 0, byCategory: { rent: -80 } },
      },
      settings: { tips: true },
    };
    const lifted = migrateState(raw, 13) as unknown as {
      ledger: Array<{ category: string }>;
      finance: Record<string, { byCategory: Record<string, number> }>;
    } | null;
    if (lifted === null) throw new Error('the lift refused a version 13 state');
    expect(lifted.ledger.map((entry) => entry.category)).toEqual(['ownerDraw', 'pipes']);
    // The old keys are gone, and the day's two costs land on the names the page has words for.
    expect(lifted.finance.day?.byCategory).toEqual({ ownerDraw: -200, pipes: -75 });
    // A period that already carried the new name keeps it and the old one is added to it.
    expect(lifted.finance.week?.byCategory).toEqual({ ownerDraw: -250 });
    // A period with neither is left exactly as it was.
    expect(lifted.finance.month?.byCategory).toEqual({ rent: -80 });
  });
});
// ---------------------------------------------------------------------------
// Turn 20: version 16 to 17 (CLAUDE.md T20 section 4)
// ---------------------------------------------------------------------------

/** A v28 save, cut down to what the lift of tonight touches: a joiner at each of the three tiers
 *  there were, a sprayer and an office admin on a monthly wage, a machine with hours on it, a
 *  contract still running, and the owner half way through an interview for a joiner. The three
 *  fixture files under tests/fixtures carry no crew at all, so this is written out here, in the
 *  plain JSON a save is and not against the types, which is how every lift is tested. */
function v28Save(): Record<string, unknown> {
  return {
    version: 16,
    jobs: [],
    workers: [
      { id: 'w1', name: 'Bob', role: 'joiner', tier: 'poor', rate: 0.6, weeklyWage: 480, monthlyWage: 0 },
      { id: 'w2', name: 'Joe', role: 'joiner', tier: 'normal', rate: 0.8, weeklyWage: 640, monthlyWage: 0 },
      { id: 'w3', name: 'Sam', role: 'sprayer', tier: 'super', rate: 0.9, weeklyWage: 0, monthlyWage: 2700 },
      { id: 'w4', name: 'Ann', role: 'officeAdmin', tier: null, rate: 0, weeklyWage: 0, monthlyWage: 1900 },
    ],
    equipment: [
      { id: 'kit-saw', specId: 'tableSaw', hoursUsed: 120 },
      // Three tool cabinets laid out the way the old one cell row laid them out, shoulder to
      // shoulder. Two cells wide from Turn 21, they would stand on one another, so the lift puts
      // them back on the row the constants name now (CLAUDE.md T21 2.13).
      { id: 'kit-cab-1', specId: 'toolCabinet', anchorX: 5, anchorY: 3, rotated: false },
      { id: 'kit-cab-2', specId: 'toolCabinet', anchorX: 6, anchorY: 3, rotated: true },
      { id: 'kit-cab-3', specId: 'toolCabinet', anchorX: 7, anchorY: 3, rotated: false },
    ],
    // The two the Turn 21 bump adds fields to, so the lift is really asked the question.
    finance: { overdraftLimit: -10000, arrearsAmount: 0 },
    owner: { minutesWorked: 120, dayLog: [] },
    unit: { widthCells: 20, depthCells: 10 },
    contracts: [{ id: 'c1', status: 'active', assigned: ['w1'] }],
    tasks: [
      { id: 't1', kind: 'hiring', done: false, orders: [{ kind: 'hire', role: 'joiner', tier: 'normal' }] },
      { id: 't2', kind: 'cleaning', done: false, orders: [] },
    ],
  };
}

/** 0, 1, 2 ... one past the last place the cabinet row holds. */
function oneMoreThanTheRowHolds(): number[] {
  const indexes: number[] = [];
  for (let at = 0; at <= CABINET_SLOT_LAYOUT.length; at += 1) indexes.push(at);
  return indexes;
}

type LiftedSave = {
  version: number;
  workers: Array<Record<string, unknown>>;
  equipment: Array<Record<string, unknown> & { specId?: string; soldOnDay?: number | null }>;
  contracts: Array<Record<string, unknown>>;
  tasks: Array<{ orders: Array<Record<string, unknown>> }>;
  finance: { daysBelowOverdraft: number };
  owner: { idleMinutes: number; idleByReason: Record<string, number> };
};

describe('a v28 save in this build (CLAUDE.md T20 section 4, T21 section 4)', () => {
  // A version 16 state lifted in this build runs the whole ladder, 16 to 17 to 18, so what comes out
  // is what Turn 21 runs on and not what Turn 20 did. Both bumps are asserted here, in the order
  // they happen.
  const lifted = migrateState(v28Save(), 16) as unknown as LiftedSave | null;
  if (lifted === null) throw new Error('the lift refused a version 16 state');

  it('renames every tier and brings the man up to what that tier is worth tonight', () => {
    expect(lifted.version).toBe(29);
    expect(lifted.workers.map((worker) => worker.tier)).toEqual([
      'novice',
      'experienced',
      'senior',
      null,
    ]);
    // The rates are Turn 21's, not Turn 20's: the rate is the tier's and not the man's, so a lifted
    // crew is worth what the same men hired this morning are worth (CLAUDE.md T21 2.9).
    expect(lifted.workers.map((worker) => worker.rate)).toEqual([0.6, 0.8, 1, 0]);
    // Nobody is a master on a lifted save: the fourth tier is new.
    expect(lifted.workers.some((worker) => worker.tier === 'master')).toBe(false);
  });

  it('pays everybody by the month at the end of the ladder, and the week is gone', () => {
    // Turn 20 took the monthly wage away and paid the week; Turn 21 gives the month back. A save
    // that goes through both comes out on the month, and a figure that went down one conversion and
    // up the other comes back within a pound of itself: the sprayer's 2,700 is exactly 2,700 again
    // and the admin's 1,900 is 1,899, because 1,900 over 4.2857 was rounded to a whole 443 on the
    // way down (CLAUDE.md T20 2.6, T21 2.10).
    // And from v38 every graded man comes out on this build's wage for his grade, whatever his
    // conversions came to (PIOTR, 21.09); the admin has no grade and keeps his 1,899.
    expect(lifted.workers.map((worker) => worker.monthlyWage)).toEqual([1950, 2470, 3055, 1899]);
    for (const worker of lifted.workers) {
      expect(Object.keys(worker), String(worker.name)).not.toContain('weeklyWage');
      expect(worker.leavesOnDay, String(worker.name)).toBeNull();
    }
  });

  it('lays every tool cabinet out again, two cells apart and square to the walls', () => {
    // Three cabinets one cell apart on the old row would overlap the moment each became two cells
    // wide, so the lift puts them on the first three places of the row the constants name now, and
    // unturns the one the save had turned: a cabinet turned is one cell wide and two deep, and the
    // row it goes back on has the workbenches under it (CLAUDE.md T21 2.13).
    const cabinets = lifted.equipment.filter((item) => item.specId === 'toolCabinet');
    expect(cabinets.map((item) => [item.anchorX, item.anchorY])).toEqual([
      [8, 3],
      [10, 3],
      [12, 3],
    ]);
    // Square to the walls, and the boolean is a number from tonight: the v19 lift turns the turn
    // into an orientation and the cabinets the v18 lift unturned come out at 0
    // (CLAUDE.md T22 2.11).
    for (const cabinet of cabinets) {
      expect(cabinet.rotated).toBeUndefined();
      expect(cabinet.orientation).toBe(0);
      // And every cabinet in a save is the standard class, because that is the one the family had
      // when it was bought (CLAUDE.md T22 2.12).
      expect(cabinet.variantId).toBe('standard');
    }
  });

  it('starts the days below the limit and the owner\u0027s idle minutes at nought', () => {
    // Neither can be worked back out of a save: it cannot say whether yesterday ended under the
    // overdraft limit, and the minutes the owner stood were never written down. Starting them today
    // is the reading that cannot close a company for something it was never warned about
    // (CLAUDE.md T21 2.2, 2.8).
    expect(lifted.finance.daysBelowOverdraft).toBe(0);
    expect(lifted.owner.idleMinutes).toBe(0);
    expect(lifted.owner.idleByReason).toEqual({
      noPlace: 0,
      noMaterial: 0,
      noCompressor: 0,
      hallStopped: 0,
      nothingAssigned: 0,
      officeEmpty: 0,
    });
  });

  it('renames the tier inside an interview the owner is sitting in, so the hour is not spent for nobody', () => {
    // The order is what the interview books when its hour is up, and it carries the tier. Left
    // reading `normal` it would match no hiring spec at all and nobody would be taken on
    // (CLAUDE.md T20 2.5).
    expect(lifted.tasks[0]?.orders[0]?.tier).toBe('experienced');
    expect(lifted.tasks[1]?.orders).toEqual([]);
    const tiers = lifted.tasks.flatMap((task) => task.orders.map((order) => order.tier));
    expect(tiers).not.toContain('poor');
    expect(tiers).not.toContain('normal');
    expect(tiers).not.toContain('super');
  });

  it('has serviced no machine under the new rule, and sent none away', () => {
    expect(lifted.equipment[0]?.serviceCount).toBe(0);
    expect(lifted.equipment[0]?.inServiceUntilDay).toBeNull();
    // The hours it has done are its own and are left alone.
    expect(lifted.equipment[0]?.hoursUsed).toBe(120);
  });

  it('records every contract as ended on its term, which is all a lifted save can tell', () => {
    expect(lifted.contracts[0]?.endedBy).toBe('term');
  });
});

// ---------------------------------------------------------------------------
// Turn 21: version 17 to 18 (CLAUDE.md T21 section 4)
// ---------------------------------------------------------------------------

/** A v29 save, in the shape the Turn 20 build wrote: the four tiers already carry the ids they carry
 *  tonight, every man is paid by the week, and the rates are Turn 20's own 0.8 / 1.0 / 1.2 / 1.4,
 *  which were Claude's reading of Piotr and one step too high all the way up. Cut down to what the
 *  lift of tonight touches, so each question is asked on its own (CLAUDE.md T21 2.9, 2.10). */
function v29Save(): Record<string, unknown> {
  return {
    version: 17,
    jobs: [],
    workers: [
      { id: 'w1', name: 'Bob', role: 'joiner', tier: 'novice', rate: 0.8, weeklyWage: 450 },
      { id: 'w2', name: 'Joe', role: 'joiner', tier: 'experienced', rate: 1.0, weeklyWage: 600 },
      { id: 'w3', name: 'Sam', role: 'joiner', tier: 'senior', rate: 1.2, weeklyWage: 800 },
      { id: 'w4', name: 'Kit', role: 'joiner', tier: 'master', rate: 1.4, weeklyWage: 1000 },
      { id: 'w5', name: 'Ann', role: 'officeAdmin', tier: null, rate: 0, weeklyWage: 445 },
    ],
    equipment: [],
    finance: { overdraftLimit: -10000, arrearsAmount: 0 },
    owner: { minutesWorked: 203, dayLog: [] },
    unit: { widthCells: 20, depthCells: 10 },
    contracts: [],
    tasks: [],
  };
}

describe('a v29 save in this build (CLAUDE.md T21 section 4)', () => {
  const lifted = migrateState(v29Save(), 17) as unknown as LiftedSave | null;
  if (lifted === null) throw new Error('the lift refused a version 17 state');

  it('pays every man by the month at the conversion the Turn 20 build printed', () => {
    expect(lifted.version).toBe(29);
    // Turn 20's four weekly wages for a joiner were 450, 600, 800 and 1,000, and the build printed
    // the month beside each of them at thirty days over seven. A lifted man costs what the game
    // told the player he cost (CLAUDE.md T21 2.10). From v38 that holds until the v22 lift, which
    // does re-read every graded man off the hiring specs, because the ladder itself was wrong and
    // Piotr's own senior was the case that showed it (PIOTR, 21.09).
    expect(lifted.workers.map((worker) => worker.monthlyWage)).toEqual([1950, 2470, 2940, 3350, 1907]);
    for (const worker of lifted.workers) {
      expect(Object.keys(worker), String(worker.name)).not.toContain('weeklyWage');
    }
  });

  it('brings the very experienced man out at 1.0 and not at Turn 20\u0027s 1.2', () => {
    // The rate is the tier's and not the man's, so it is recomputed on load: Turn 21 moved every
    // tier down a step to Piotr's own four figures, and a crew lifted with Turn 20's rates would be
    // faster than the same men hired this morning (PIOTR, 19.09; CLAUDE.md T21 2.9).
    expect(lifted.workers.map((worker) => worker.rate)).toEqual([0.6, 0.8, 1, 1.2, 0]);
    const senior = lifted.workers.find((worker) => worker.tier === 'senior');
    expect(senior?.rate).toBe(1);
    expect(lifted.workers.some((worker) => worker.rate === 1.4)).toBe(false);
    // The tier ids themselves do not change in this bump, so nobody is renamed.
    expect(lifted.workers.map((worker) => worker.tier)).toEqual([
      'novice',
      'experienced',
      'senior',
      'master',
      null,
    ]);
  });

  it('starts the days below the limit and the owner\u0027s idle minutes at nought', () => {
    expect(lifted.finance.daysBelowOverdraft).toBe(0);
    expect(lifted.owner.idleMinutes).toBe(0);
    expect(lifted.owner.idleByReason).toEqual({
      noPlace: 0,
      noMaterial: 0,
      noCompressor: 0,
      hallStopped: 0,
      nothingAssigned: 0,
      officeEmpty: 0,
    });
  });

  it('puts the cabinets the row has no room for out in the yard (CLAUDE.md T21 2.13)', () => {
    // A hall that had more cabinets than the widened row holds: they were one cell things and seven
    // of them fitted where six two cell ones do. The first six go back on the row and the seventh is
    // put in the yard, where the player picks it up in setup mode, which is how Turn 17 handled the
    // welfare kit that no longer fitted.
    const save = v28Save() as unknown as Record<string, unknown>;
    save.equipment = [
      { id: 'kit-saw', specId: 'tableSaw', hoursUsed: 120 },
      ...oneMoreThanTheRowHolds().map((index) => ({
        id: `kit-cab-${index + 1}`,
        specId: 'toolCabinet',
        anchorX: 5 + index,
        anchorY: 3,
        rotated: false,
      })),
      // And one that was sold: it is nowhere in the hall and the row is not to hold a place for it.
      { id: 'kit-cab-sold', specId: 'toolCabinet', anchorX: 12, anchorY: 3, soldOnDay: 4 },
    ];
    const out = migrateState(save, 16) as unknown as LiftedSave | null;
    if (out === null) throw new Error('the lift refused the hall with too many cabinets');
    const cabinets = out.equipment.filter((item) => item.specId === 'toolCabinet');
    expect(cabinets).toHaveLength(CABINET_SLOT_LAYOUT.length + 2);
    const standing = cabinets.filter((item) => item.soldOnDay === undefined);
    expect(standing.slice(0, CABINET_SLOT_LAYOUT.length).map((item) => [item.anchorX, item.anchorY]))
      .toEqual(CABINET_SLOT_LAYOUT.map((slot) => [slot.x, slot.y]));
    // The one over: out in the yard, which is the first cell past the hall's own width.
    const spare = standing[CABINET_SLOT_LAYOUT.length];
    expect([spare?.anchorX, spare?.anchorY]).toEqual([20, 0]);
    // Nothing on the row stands on anything else on it.
    const boxes = standing
      .slice(0, CABINET_SLOT_LAYOUT.length)
      .map((item) => Number(item.anchorX));
    for (let one = 0; one < boxes.length; one += 1) {
      for (let two = one + 1; two < boxes.length; two += 1) {
        expect(Math.abs((boxes[one] ?? 0) - (boxes[two] ?? 0)), `${one} against ${two}`)
          .toBeGreaterThanOrEqual(2);
      }
    }
    // The sold one is left exactly where it was: it is not in the hall to be laid out.
    const sold = cabinets.find((item) => item.id === 'kit-cab-sold');
    expect([sold?.anchorX, sold?.anchorY]).toEqual([12, 3]);
  });

  it('opens a whole v29 game, runs it on and round trips through the one encoder', () => {
    // Not a cut down fixture this time but a real hall with men in it, put back into the shape the
    // Turn 20 build saved it in and opened again: every v29 save loads (CLAUDE.md T21 section 4).
    const played = twoMenOnSheetWork();
    const raw = JSON.parse(JSON.stringify(played)) as Record<string, unknown>;
    raw.version = 17;
    const back: Record<string, number> = { novice: 0.8, experienced: 1.0, senior: 1.2, master: 1.4 };
    for (const worker of raw.workers as Array<Record<string, unknown>>) {
      const monthly = worker.monthlyWage as number;
      delete worker.monthlyWage;
      worker.weeklyWage = Math.round((monthly * 7) / 30);
      if (typeof worker.tier === 'string') worker.rate = back[worker.tier] ?? worker.rate;
    }
    delete (raw.finance as Record<string, unknown>).daysBelowOverdraft;
    delete (raw.owner as Record<string, unknown>).idleMinutes;
    delete (raw.owner as Record<string, unknown>).idleByReason;
    const opened = migrateState(raw, 17);
    if (opened === null) throw new Error('the lift refused a whole v29 game');
    expect(opened.version).toBe(STATE_VERSION);
    const joiner = opened.workers.find((worker) => worker.role === 'joiner');
    expect(joiner?.monthlyWage).toBeGreaterThan(0);
    expect(joiner?.rate).toBe(0.6);
    const later = tick(opened, 60);
    expect(later.clock.minute).toBeGreaterThan(opened.clock.minute);
    const round = decodeSaveFile(encodeSaveFile(later));
    expect(round.state).toEqual(later);
  });

  it('opens a whole v31 game, and a turned cabinet comes up at orientation 1', () => {
    // Every v30 and v31 save loads (CLAUDE.md T22 section 4). A v31 save is state version 18, so
    // only tonight's lift runs on it: the boolean becomes the number, and a cabinet the player had
    // standing across its cells stays across them rather than being squared up, because the row
    // was laid out again by the Turn 21 lift and not by this one (CLAUDE.md T22 2.11).
    const played = twoMenOnSheetWork();
    const raw = JSON.parse(JSON.stringify(played)) as Record<string, unknown>;
    raw.version = 18;
    const equipment = raw.equipment as Array<Record<string, unknown>>;
    for (const item of equipment) {
      item.rotated = item.specId === 'toolCabinet';
      delete item.orientation;
    }
    const opened = migrateState(raw, 18);
    if (opened === null) throw new Error('the lift refused a whole v31 game');
    expect(opened.version).toBe(STATE_VERSION);
    for (const item of opened.equipment) {
      expect(item.orientation, item.specId).toBe(item.specId === 'toolCabinet' ? 1 : 0);
      expect(Object.keys(item), item.specId).not.toContain('rotated');
    }
    const cabinet = opened.equipment.find((item) => item.specId === 'toolCabinet');
    if (cabinet === undefined) throw new Error('the day one kit has a cabinet in it');
    // Turned, and the standard class, which is the class every cabinet in a save was bought as
    // (CLAUDE.md T22 2.12).
    expect(cabinet.variantId).toBe('standard');
    expect(itemFootprint(cabinet)).toEqual({ width: 1, depth: 2, height: 1 });
    // And Rotate walks all four from there, because the art side has drawn all four
    // (CLAUDE.md T22 2.11).
    expect(orientationsFor(spriteFiles(), 'toolCabinet', cabinet.variantId)).toEqual([0, 1, 2, 3]);
    const later = tick(opened, 60);
    expect(later.clock.minute).toBeGreaterThan(opened.clock.minute);
  });
});

// ---------------------------------------------------------------------------
// Turn 22: version 18 to 19, the arrears into the account (CLAUDE.md T22 2.1, section 4)
// ---------------------------------------------------------------------------

/** A v31 save of a company that missed its bills: the unpaid balance stands beside the bank the way
 *  Turn 21 kept it, with a month of it counted and two ledger lines already written under the two
 *  categories the word took with it. Cut down to what this one lift touches. */
function v31SaveInArrears(): Record<string, unknown> {
  return {
    version: 18,
    cash: -4998,
    clock: { day: 22, minute: 480 },
    jobs: [],
    workers: [],
    equipment: [],
    finance: {
      overdraftLimit: -5000,
      daysBelowOverdraft: 0,
      arrearsAmount: 2780,
      arrearsMonths: 1,
      firstArrearsDay: 11,
    },
    ledger: [
      {
        id: 'l1',
        day: 11,
        minute: 480,
        category: 'rent',
        label: 'Rent (unpaid)',
        amount: -80,
        balance: -4998,
        unpaid: true,
      },
      {
        id: 'l2',
        day: 12,
        minute: 480,
        category: 'arrears',
        label: 'Arrears paid off',
        amount: -100,
        balance: -4998,
        unpaid: false,
      },
      {
        id: 'l3',
        day: 13,
        minute: 480,
        category: 'seizure',
        label: 'Seized tableSaw, credited against arrears',
        amount: 900,
        balance: -4998,
        unpaid: true,
      },
    ],
    owner: { minutesWorked: 0, dayLog: [] },
    unit: { widthCells: 20, depthCells: 10 },
    contracts: [],
    tasks: [],
  };
}

describe('a v31 save with an unpaid balance on it (CLAUDE.md T22 2.1)', () => {
  const lifted = migrateState(v31SaveInArrears(), 18);
  if (lifted === null) throw new Error('the lift refused a version 18 state');
  const finance = lifted.finance as unknown as Record<string, unknown>;

  it('takes what was owed out of the cash, where it would have come from on the day', () => {
    // There is one track for money from tonight: a cost the player did not choose is paid out of
    // the account whatever the balance, so a save that was carrying 2,780 it never paid has it
    // taken out of the account now (PIOTR, 19.09; CLAUDE.md T22 2.1, section 4).
    expect(lifted.version).toBe(29);
    expect(lifted.cash).toBe(-4998 - 2780);
  });

  it('writes the one line that says what happened to the money', () => {
    const line = lifted.ledger.find((entry) => entry.label === 'Arrears carried into the account (v32)');
    expect(line).not.toBeUndefined();
    expect(line?.amount).toBe(-2780);
    expect(line?.category).toBe('other');
    expect(line?.unpaid).toBe(false);
    expect(line?.balance).toBe(lifted.cash);
    expect(line?.day).toBe(22);
  });

  it('takes the three fields off the save, because the type no longer has them', () => {
    expect(Object.keys(finance)).not.toContain('arrearsAmount');
    expect(Object.keys(finance)).not.toContain('arrearsMonths');
    expect(Object.keys(finance)).not.toContain('firstArrearsDay');
    // What the bank does keep is the run of days under the limit, which 2.2 reads.
    expect(finance.daysBelowOverdraft).toBe(0);
  });

  it('keeps every pound of a played company s history on the books', () => {
    // The two categories the word took with it are rewritten, so the lines are still there and
    // still carry their own labels and figures: nothing is lost with the word.
    const categories = lifted.ledger.map((entry) => entry.category as string);
    expect(categories).not.toContain('arrears');
    expect(categories).not.toContain('seizure');
    expect(lifted.ledger.find((entry) => entry.id === 'l2')?.category).toBe('other');
    expect(lifted.ledger.find((entry) => entry.id === 'l2')?.amount).toBe(-100);
    expect(lifted.ledger.find((entry) => entry.id === 'l3')?.category).toBe('other');
    expect(lifted.ledger.find((entry) => entry.id === 'l3')?.amount).toBe(900);
    // The line that went unpaid on the day keeps its flag: it is a record of a day that has been
    // and gone, and the lift does not rewrite history it cannot re-play.
    expect(lifted.ledger.find((entry) => entry.id === 'l1')?.unpaid).toBe(true);
  });

  it('leaves a save that owed nothing exactly where it was', () => {
    const clear = v31SaveInArrears();
    const money = clear.finance as Record<string, unknown>;
    money.arrearsAmount = 0;
    money.arrearsMonths = 0;
    money.firstArrearsDay = null;
    const opened = migrateState(clear, 18);
    if (opened === null) throw new Error('the lift refused a clear v31 state');
    expect(opened.cash).toBe(-4998);
    expect(opened.ledger.some((entry) => entry.label.includes('carried into the account'))).toBe(
      false,
    );
  });
});

// ---------------------------------------------------------------------------
// Turn 23: version 19 to 20, the months written down, the manager's grade, and the three things
// that left the game (CLAUDE.md T23 section 4)
// ---------------------------------------------------------------------------

/** A v35 save of a company with a manager, a drill and a seat standing in the hall, another drill
 *  still on the lorry, a man's tool set on a cell, and the day's staff management chore on the
 *  list. Cut down to what this one lift touches, the way the lift before it was. */
function v35Save(): Record<string, unknown> {
  return {
    version: 19,
    cash: 4200,
    clock: { day: 40, minute: 300 },
    workers: [
      { id: 'pm-1', role: 'productionManager', tier: null, monthlyWage: 3400 },
      { id: 'j-1', role: 'joiner', tier: 'novice', monthlyWage: 1950 },
    ],
    equipment: [
      { id: 'kit-drill', specId: 'drill', variantId: 'budget', anchorX: 19, anchorY: 6 },
      { id: 'kit-seat', specId: 'canteenSeat', variantId: 'standard', anchorX: 4, anchorY: 3 },
      { id: 'kit-set', specId: 'handToolSet', variantId: 'standard', anchorX: 19, anchorY: 7 },
      { id: 'kit-saw', specId: 'tableSaw', variantId: 'standard', anchorX: 5, anchorY: 0 },
    ],
    onOrder: [{ id: 'order-drill', specId: 'drill', variantId: 'pro', anchorX: 18, anchorY: 6 }],
    tasks: [
      { id: 'task-assign', kind: 'staffManagement', label: 'Staff management', minutes: 20 },
      { id: 'task-books', kind: 'bookkeeping', label: 'Bookkeeping', minutes: 30 },
    ],
    ledger: [],
  };
}

describe('a v35 save in this build (CLAUDE.md T23 section 4)', () => {
  const lifted = migrateState(v35Save(), 19);
  if (lifted === null) throw new Error('the lift refused a version 19 state');

  it('comes up at this build s version with an empty list of months behind it', () => {
    // A played company starts its list at its next month end: the card the player was shown that
    // evening is the report, and one worked out again tonight would not be that card
    // (CLAUDE.md T23 2.14).
    expect(lifted.version).toBe(29);
    expect(lifted.monthlyReports).toEqual([]);
  });

  it('gives the manager the grade he was always paid for, and leaves everybody else alone', () => {
    const manager = lifted.workers.find((worker) => worker.role === 'productionManager');
    expect(manager?.tier).toBe('experienced');
    expect(manager?.monthlyWage).toBe(PRODUCTION_MANAGER_MONTHLY_WAGE.experienced);
    expect(lifted.workers.find((worker) => worker.role === 'joiner')?.tier).toBe('novice');
  });

  it('takes the drill and the seat off the books, standing or on the lorry, with a line each', () => {
    expect(lifted.equipment.map((item) => item.specId)).toEqual(['handToolSet', 'tableSaw']);
    expect(lifted.onOrder).toEqual([]);
    const lines = lifted.ledger.filter((entry) => entry.label.endsWith('retired (v36)'));
    expect(lines.map((entry) => entry.label)).toEqual([
      'Cordless drill retired (v36)',
      'Canteen seats retired (v36)',
    ]);
    for (const line of lines) {
      // No refund, so no money moved: a note on the books and not a line of the month's money.
      expect(line.amount).toBe(0);
      expect(line.unpaid).toBe(true);
      expect(line.category).toBe('other');
      expect(line.balance).toBe(lifted.cash);
      expect(line.day).toBe(40);
    }
    expect(lifted.cash).toBe(4200);
  });

  it('takes the cell off a man s hand tool set and leaves the set itself alone', () => {
    const set = lifted.equipment.find((item) => item.specId === 'handToolSet');
    expect(set?.id).toBe('kit-set');
    expect(Object.keys(set as unknown as Record<string, unknown>)).not.toContain('anchorX');
    expect(Object.keys(set as unknown as Record<string, unknown>)).not.toContain('anchorY');
  });

  it('drops the staff management chore and nothing else off the list', () => {
    expect(lifted.tasks.map((task) => task.kind)).toEqual(['bookkeeping']);
  });

  it('gives every machine no last week (v40)', () => {
    // A v22 save has no minutes saved last week on any machine: the v23 lift gives every one
    // nothing for last week. The day's own sum and the closed days are the v24 fixture's test.
    const saw = lifted.equipment.find((item) => item.specId === 'tableSaw');
    expect(saw?.minutesSavedLastWeek).toBe(0);
  });

  it('writes no line at all for a save that held neither', () => {
    const clean = v35Save();
    clean.equipment = (clean.equipment as Array<Record<string, unknown>>).filter(
      (item) => item.specId !== 'drill' && item.specId !== 'canteenSeat',
    );
    clean.onOrder = [];
    const opened = migrateState(clean, 19);
    if (opened === null) throw new Error('the lift refused a clean version 19 state');
    expect(opened.ledger).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// v23 to v24: a man on a contract comes off the jobs he was also standing on
// (PIOTR, 21.09; v42)
// ---------------------------------------------------------------------------

/** A v23 save made under Turn 20's split day: one man on a contract and on a job of his own, one
 *  man on a contract sharing a job with a mate, and one man on nothing but a job. Cut down to what
 *  this one lift touches. */
function v41Save(): Record<string, unknown> {
  return {
    version: 23,
    cash: 4200,
    clock: { day: 40, minute: 300 },
    workers: [
      { id: 'j-1', role: 'joiner', jobId: 'job-1' },
      { id: 'j-2', role: 'joiner', jobId: 'job-2' },
      { id: 'j-3', role: 'joiner', jobId: 'job-2' },
    ],
    contracts: [
      { id: 'c-1', status: 'active', assigned: ['j-1', 'j-2'] },
      { id: 'c-old', status: 'ended', assigned: ['j-3'] },
    ],
    jobs: [
      { id: 'job-1', stage: 'inProduction', assignees: ['j-1'] },
      { id: 'job-2', stage: 'inProduction', assignees: ['j-2', 'j-3'] },
    ],
    equipment: [],
    ledger: [],
  };
}

describe('a v23 save made under the split day (PIOTR, 21.09; v42)', () => {
  const lifted = migrateState(v41Save(), 23);
  if (lifted === null) throw new Error('the lift refused a version 23 state');

  it('comes up at this build s version', () => {
    expect(lifted.version).toBe(29);
  });

  it('takes every man on a running contract off the jobs he was standing on', () => {
    // The rule the lift is for: a man on a contract vanishes from the jobs (PIOTR, 21.09).
    const one = lifted.jobs.find((job) => job.id === 'job-1');
    const two = lifted.jobs.find((job) => job.id === 'job-2');
    expect(one?.assignees).toEqual([]);
    expect(two?.assignees).toEqual(['j-3']);
    expect(lifted.workers.find((worker) => worker.id === 'j-1')?.jobId).toBe('contract:c-1');
    expect(lifted.workers.find((worker) => worker.id === 'j-2')?.jobId).toBe('contract:c-1');
  });

  it('puts a job it emptied back on the list and leaves one that kept a man in production', () => {
    expect(lifted.jobs.find((job) => job.id === 'job-1')?.stage).toBe('ready');
    expect(lifted.jobs.find((job) => job.id === 'job-2')?.stage).toBe('inProduction');
  });

  it('leaves a man off a contract that has ended where he was', () => {
    expect(lifted.workers.find((worker) => worker.id === 'j-3')?.jobId).toBe('job-2');
  });
});

describe('a v24 save in this build (v44)', () => {
  it('comes in with no evening take-over in hand', () => {
    const lifted = migrateState({ version: 24, owner: { wentHome: false } }, 24);
    if (lifted === null) throw new Error('the lift refused a version 24 state');
    expect(lifted.version).toBe(29);
    expect(lifted.owner.tookOverJobId).toBe(null);
  });
});

describe('a v25 save in this build (CLAUDE.md T24 section 4)', () => {
  it('comes in with nobody booked against the day, and its own total untouched', () => {
    const lifted = migrateState(
      { version: 25, dayStats: { workMinutes: 12, outputWorth: 9, byMan: undefined } },
      25,
    );
    if (lifted === null) throw new Error('the lift refused a version 25 state');
    expect(lifted.version).toBe(29);
    expect(lifted.dayStats.byMan).toEqual({});
    // The figure the sheet prints above the block is the save's own and is not guessed at.
    expect(lifted.dayStats.workMinutes).toBe(12);
    expect(lifted.dayStats.outputWorth).toBe(9);
  });

  it('opens both of the day fixtures Piotr sent', () => {
    for (const path of ['tests/fixtures/day128-v25.woodwork.json', 'tests/fixtures/day149-v25.woodwork.json']) {
      const raw = JSON.parse(readFileSync(path, 'utf8')) as {
        state: Record<string, unknown> & { version: number };
      };
      const lifted = migrateState(raw.state, raw.state.version);
      if (lifted === null) throw new Error(`${path} did not open`);
      expect(lifted.version).toBe(29);
      expect(lifted.dayStats.byMan).toEqual({});
    }
  });
});

describe('a v25 save in this build (PIOTR, 22.09; v51)', () => {
  // Piotr's own day 115 hall: the old saw with 421 hours and five services on it, the compressor
  // with eleven, two contracts offered on days 99 and 108 (one ended, one running) and one on
  // offer on day 108's heels. The service goes on the calendar tonight, so every machine's six
  // months start on the day the save is opened, whatever hours it had; and the last day a shop
  // rang is read off the offers.
  const raw = JSON.parse(readFileSync('tests/fixtures/day115-v25.woodwork.json', 'utf8')) as {
    state: Record<string, unknown> & { version: number; clock: { day: number } };
  };
  const lifted = migrateState(raw.state, raw.state.version);
  if (lifted === null) throw new Error('the lift refused a version 25 state');

  it('comes up at this build s version, through v26 on the way', () => {
    expect(lifted.version).toBe(29);
    expect(lifted.version).toBe(STATE_VERSION);
    expect(lifted.dayStats.byMan).toEqual({});
  });

  it('starts every machine s six months on the day the save is opened, and drops the hours at the last service', () => {
    expect(lifted.equipment.length).toBeGreaterThan(0);
    for (const item of lifted.equipment) {
      expect(item.servicedDay, item.id).toBe(raw.state.clock.day);
      expect('serviceHours' in item, item.id).toBe(false);
    }
    // The saw that was in for its fifth service that day keeps the count and the life it bought.
    const oldSaw = lifted.equipment.find((item) => item.id === 'kit-52');
    expect(oldSaw?.serviceCount).toBe(5);
    expect(oldSaw?.inServiceUntilDay).toBe(116);
  });

  it('remembers the last day a shop rang, off the offers the save holds', () => {
    const days = lifted.contracts.map((contract) => contract.offeredDay);
    expect(lifted.lastContractOfferDay).toBe(Math.max(...days));
  });

  it('remembers nothing when the save never had an offer, and lifts a v26 save the same way', () => {
    const bare = migrateState({ version: 25, clock: { day: 40, minute: 0 }, equipment: [], contracts: [] }, 25);
    if (bare === null) throw new Error('the lift refused a bare version 25 state');
    expect(bare.lastContractOfferDay).toBe(null);
    const fromT24 = migrateState(
      { version: 26, clock: { day: 40, minute: 0 }, equipment: [{ id: 'kit-1', serviceHours: 50 }], contracts: [], dayStats: { byMan: {} } },
      26,
    );
    if (fromT24 === null) throw new Error('the lift refused a version 26 state');
    expect(fromT24.version).toBe(29);
    expect(fromT24.equipment[0]?.servicedDay).toBe(40);
  });
});

describe('a v27 save in this build (CLAUDE.md T25 section 4)', () => {
  /** Piotr's three day fixtures, the saves the brief names (day 53 is not in the repository). */
  const FIXTURES = [
    'tests/fixtures/day115-v25.woodwork.json',
    'tests/fixtures/day128-v25.woodwork.json',
    'tests/fixtures/day149-v25.woodwork.json',
  ];

  function lifted27(): GameState {
    const raw = {
      version: 27,
      clock: { day: 40, minute: 60 },
      owner: {
        station: 'waiting:tableSaw',
        idleByReason: { noMachine: 7, noMaterial: 1, noCompressor: 0, nothingAssigned: 0, officeEmpty: 0 },
      },
      workers: [
        { id: 'staff-1', station: 'place:kit-19:2', idleByReason: { waitingForBoss: 0, noMachine: 3, noMaterial: 0 } },
        { id: 'staff-2', station: 'noBench', idleByReason: { waitingForBoss: 2, noMachine: 0, noMaterial: 0 } },
        { id: 'staff-3', station: 'second:kit-bench-2', idleByReason: { waitingForBoss: 0, noMachine: 0, noMaterial: 0 } },
      ],
      equipment: [
        { id: 'kit-19', specId: 'tableSaw', takenBy: 'staff-1' },
        { id: 'kit-20', specId: 'workbench', takenBy: null },
      ],
      jobs: [
        { id: 'job-1', blockedBy: 'waiting for the saw' },
        { id: 'job-2', blockedBy: 'no bench' },
        { id: 'job-3', blockedBy: 'bags full' },
      ],
      dayStats: { efficiency: { possible: 10, worked: 5, lost: { noPeople: 1, noMachine: 4, noMaterial: 0, ownerAway: 0 } } },
      days: [{ day: 39, efficiency: { possible: 10, worked: 5, lost: { noPeople: 0, noMachine: 5, noMaterial: 0, ownerAway: 0 } } }],
      monthlyReports: [
        {
          month: 1,
          efficiency: {
            waiting: [
              { id: 'noPeople', label: 'No people', minutes: 1, percent: 20 },
              { id: 'noMachine', label: 'No machine free', minutes: 4, percent: 80 },
              { id: 'noMaterial', label: 'No material', minutes: 0, percent: 0 },
              { id: 'ownerAway', label: 'Owner away', minutes: 0, percent: 0 },
            ],
          },
        },
      ],
    };
    const lifted = migrateState(raw, 27);
    if (lifted === null) throw new Error('the lift refused a version 27 state');
    return lifted;
  }

  it('clears every claim on a machine and never writes one again', () => {
    const lifted = lifted27();
    expect(lifted.version).toBe(29);
    for (const item of lifted.equipment) expect(item.takenBy, item.id).toBeNull();
  });

  it('gives every man and the owner the two fields of the day plan', () => {
    const lifted = lifted27();
    for (const man of [lifted.owner, ...lifted.workers]) {
      expect(man.working).toBe(false);
      expect(man.noPlaceFor).toBe('');
    }
  });

  it('stands a man at a waiting cell or a place of the queue at his home cell', () => {
    const lifted = lifted27();
    expect(lifted.owner.station).toBe('home');
    expect(lifted.workers.map((worker) => worker.station)).toEqual(['home', 'door', 'home']);
  });

  it('clears a job s row that waited for a machine or a bench, and nothing else', () => {
    const lifted = lifted27();
    expect(lifted.jobs.map((job) => job.blockedBy)).toEqual(['', '', 'bags full']);
  });

  it('moves the queue s lost minutes to no place, today, every closed day and every monthly report', () => {
    const lifted = lifted27();
    expect(lifted.owner.idleByReason).toEqual({
      noPlace: 7,
      noMaterial: 1,
      noCompressor: 0,
      hallStopped: 0,
      nothingAssigned: 0,
      officeEmpty: 0,
    });
    expect(lifted.workers[0]?.idleByReason).toEqual({
      waitingForBoss: 0,
      noPlace: 3,
      noMaterial: 0,
      noCompressor: 0,
      hallStopped: 0,
    });
    expect(lifted.dayStats.efficiency.lost).toEqual({
      noPeople: 1,
      noPlace: 4,
      noMaterial: 0,
      ownerAway: 0,
      hallStopped: 0,
    });
    expect(lifted.days[0]?.efficiency.lost.noPlace).toBe(5);
    expect(lifted.monthlyReports[0]?.efficiency.waiting.map((line) => [line.id, line.label])).toEqual([
      ['noPeople', 'No people'],
      ['noPlace', 'No place'],
      ['noMaterial', 'No material'],
      ['hallStopped', 'Hall stopped'],
      ['ownerAway', 'Owner away'],
    ]);
  });

  it('opens every one of Piotr s fixtures with the day plan worked out on the men', () => {
    for (const path of FIXTURES) {
      const raw = JSON.parse(readFileSync(path, 'utf8')) as {
        state: Record<string, unknown> & { version: number };
      };
      const lifted = migrateState(raw.state, raw.state.version);
      if (lifted === null) throw new Error(`${path} did not open`);
      expect(lifted.version, path).toBe(STATE_VERSION);
      for (const item of lifted.equipment) expect(item.takenBy ?? null, `${path} ${item.id}`).toBeNull();
      for (const man of [lifted.owner, ...lifted.workers]) {
        expect(typeof man.working, path).toBe('boolean');
        expect(typeof man.noPlaceFor, path).toBe('string');
        expect(man.station.startsWith('waiting:'), `${path} ${man.station}`).toBe(false);
      }
      // Somebody on a job in production is at work the moment the save is open.
      expect([lifted.owner, ...lifted.workers].some((man) => man.working), path).toBe(true);
    }
  });
});

describe('a v28 save in this build (PIOTR, 24.09; v53)', () => {
  /** A whole hall saved on v52: a job with the old switch for waiting on the CNC, a timber tool set
   *  standing in the hall and a second one on the lorry. */
  function lifted28(): { before: GameState; after: GameState } {
    const before = twoMenOnSheetWork();
    const raw = JSON.parse(JSON.stringify(before)) as Record<string, unknown> & {
      version: number;
      jobs: Array<Record<string, unknown>>;
      equipment: Array<Record<string, unknown>>;
      onOrder: Array<Record<string, unknown>>;
    };
    raw.version = 28;
    for (const job of raw.jobs) job.sawFallback = true;
    const bench = raw.equipment[0];
    if (bench === undefined) throw new Error('the hall has no equipment to copy');
    raw.equipment.push({ ...bench, id: 'kit-timber', specId: 'solidWoodTools', variantId: 'budget', purchasePrice: 2200 });
    raw.onOrder.push({
      id: 'order-timber',
      specId: 'solidWoodTools',
      variantId: 'used',
      pricePaid: 800,
      orderedDay: 1,
      dueDay: 5,
      anchorX: 12,
      anchorY: 0,
      arrived: false,
      orientation: 0,
    });
    const after = migrateState(raw, 28);
    if (after === null) throw new Error('the lift refused a version 28 state');
    return { before, after };
  }

  it('comes up at this build s version with no job waiting on the CNC', () => {
    const { after } = lifted28();
    expect(after.version).toBe(29);
    for (const job of after.jobs) expect('sawFallback' in job, job.id).toBe(false);
  });

  it('takes every timber tool set back, in the hall and on the lorry, and pays what it cost', () => {
    const { before, after } = lifted28();
    expect(after.equipment.some((item) => item.specId === 'solidWoodTools')).toBe(false);
    expect(after.onOrder.some((item) => item.specId === 'solidWoodTools')).toBe(false);
    // 2,200 for the one in the hall and 800 for the one on the lorry.
    expect(after.cash).toBe(before.cash + 3000);
  });
});
