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
import { CANTEEN_SLOT_LAYOUT, roomById } from '../../src/engine/constants';
import type { GameState } from '../../src/engine/index';

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
    expect(STATE_VERSION).toBe(17);
    expect(state.taskQueue).toEqual([]);
    expect(state.dayStats.paidHours).toBe(0);
    expect(state.dayStats.expressUplift).toBe(0);
    for (const day of state.days) {
      expect(day.paidHours).toBe(0);
      expect(day.expressUplift).toBe(0);
    }
    for (const job of state.jobs) expect(job.assignees[1] ?? null).toBeNull();
  });

  it('moves every seat and locker off the hall floor and into the canteen', () => {
    const lifted = migrateState(v24WithWelfareOnTheFloor(), 14);
    expect(lifted).not.toBeNull();
    const state = lifted as GameState;
    const canteen = roomById('canteen');
    const inside = (item: { anchorX: number; anchorY: number }): boolean =>
      item.anchorX >= canteen.x &&
      item.anchorX < canteen.x + canteen.width &&
      item.anchorY >= canteen.y &&
      item.anchorY < canteen.y + canteen.depth;
    const welfare = state.equipment.filter(
      (item) => item.specId === 'canteenSeat' || item.specId === 'locker',
    );
    expect(welfare).toHaveLength(2);
    for (const item of welfare) expect(inside(item), item.specId).toBe(true);
    // The first seat is the cell just inside the door.
    const seat = welfare.find((item) => item.specId === 'canteenSeat');
    expect({ x: seat?.anchorX, y: seat?.anchorY }).toEqual(CANTEEN_SLOT_LAYOUT[0]);
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
    equipment: [{ id: 'kit-saw', specId: 'tableSaw', hoursUsed: 120 }],
    contracts: [{ id: 'c1', status: 'active', assigned: ['w1'] }],
    tasks: [
      { id: 't1', kind: 'hiring', done: false, orders: [{ kind: 'hire', role: 'joiner', tier: 'normal' }] },
      { id: 't2', kind: 'cleaning', done: false, orders: [] },
    ],
  };
}

type LiftedSave = {
  version: number;
  workers: Array<Record<string, unknown>>;
  equipment: Array<Record<string, unknown>>;
  contracts: Array<Record<string, unknown>>;
  tasks: Array<{ orders: Array<Record<string, unknown>> }>;
};

describe('a v28 save in this build (CLAUDE.md T20 section 4)', () => {
  const lifted = migrateState(v28Save(), 16) as unknown as LiftedSave | null;
  if (lifted === null) throw new Error('the lift refused a version 16 state');

  it('renames every tier and brings the man up to what that tier is worth tonight', () => {
    expect(lifted.version).toBe(17);
    expect(lifted.workers.map((worker) => worker.tier)).toEqual([
      'novice',
      'experienced',
      'senior',
      null,
    ]);
    expect(lifted.workers.map((worker) => worker.rate)).toEqual([0.8, 1, 1.2, 0]);
    // Nobody is a master on a lifted save: the fourth tier is new.
    expect(lifted.workers.some((worker) => worker.tier === 'master')).toBe(false);
  });

  it('pays everybody by the week, off his monthly wage where he had none, and drops the field', () => {
    // The two joiners keep what they were taken on for; the sprayer's 2,700 a month and the
    // admin's 1,900 come off WEEKS_PER_MONTH, which is 4.2857 (CLAUDE.md T20 2.6).
    expect(lifted.workers.map((worker) => worker.weeklyWage)).toEqual([480, 640, 630, 443]);
    for (const worker of lifted.workers) {
      expect(Object.keys(worker), String(worker.name)).not.toContain('monthlyWage');
      expect(worker.leavesOnDay, String(worker.name)).toBeNull();
    }
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
