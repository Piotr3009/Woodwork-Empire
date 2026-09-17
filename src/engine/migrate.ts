// A saved game from the builds before this one, lifted into the shape the engine runs on now.
//
// The loader used to refuse every save that was not this build's, and a company was lost at every
// delivery. From Turn 12 a save one bump behind is opened: the fields the bump added are zeroed,
// the fields it took away are dropped, and nothing about the game is guessed. Anything older is
// refused as it always was (CLAUDE.md T12 2.3). Written against the plain JSON a save is and not
// against the types, because the whole point is that the file does not match them yet.

import {
  CANTEEN_SLOT_LAYOUT,
  LOCKER_SLOT_LAYOUT,
  STATE_VERSION,
  WEBSITE_START_LEVEL,
} from './constants';
import type { GameState } from './types';

/** The oldest save this build opens: Turn 11's v18, which is state version 12. */
export const OLDEST_SAVE_VERSION = 12;

/** True for a save this build can open as it is or lift into its own shape. */
export function canOpenVersion(version: number): boolean {
  return version >= OLDEST_SAVE_VERSION && version <= STATE_VERSION;
}

type Raw = Record<string, unknown>;

function isRecord(value: unknown): value is Raw {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function records(value: unknown): Raw[] {
  return Array.isArray(value) ? value.filter(isRecord) : [];
}

/** Version 12 to 13: the bags came off the machines and onto the extractor (CLAUDE.md T12 2.3).
 *  The hall's store starts empty, the day and every summary start with no dust made, and a machine
 *  carries no bag of its own any more. */
function liftToVersion13(state: Raw): void {
  state.bagFillM3 = 0;
  if (isRecord(state.dayStats)) state.dayStats.dustM3 = 0;
  for (const day of records(state.days)) day.dustMadeM3 = 0;
  for (const item of records(state.equipment)) {
    delete item.minutesUsed;
    delete item.bagFull;
  }
  // The bag change of one machine is gone. An open one is dropped, and whoever was holding it is
  // free; a finished one stays on the record under the name the chore has now.
  const dropped = new Set<string>();
  state.tasks = records(state.tasks).filter((task) => {
    if (task.kind !== 'bagChange') return true;
    if (task.done === true) {
      task.kind = 'emptyBags';
      task.equipmentId = null;
      return true;
    }
    if (typeof task.id === 'string') dropped.add(task.id);
    return false;
  });
  if (isRecord(state.owner)) {
    const owner = state.owner;
    if (typeof owner.currentTaskId === 'string' && dropped.has(owner.currentTaskId)) {
      owner.currentTaskId = null;
    }
    if (typeof owner.resumeTaskId === 'string' && dropped.has(owner.resumeTaskId)) {
      owner.resumeTaskId = null;
    }
  }
  for (const worker of records(state.workers)) {
    if (typeof worker.taskId === 'string' && dropped.has(worker.taskId)) worker.taskId = null;
  }
  // And the question that was asked about that bag: the store is empty now, so there is nothing
  // to ask. The next event in the queue opens on the first settle, as it always does.
  if (isRecord(state.activeEvent) && state.activeEvent.kind === 'bagFull') state.activeEvent = null;
  state.eventQueue = records(state.eventQueue).filter((event) => event.kind !== 'bagFull');
  state.version = 13;
}

/** The empty efficiency tally a day opens with (CLAUDE.md T13 3.5). */
function emptyEfficiency(): Raw {
  return { possible: 0, worked: 0, lost: { noPeople: 0, noMachine: 0, noMaterial: 0, ownerAway: 0 } };
}

/** Version 13 to 14: the workshop grows up (CLAUDE.md T13 section 4). Every v19 save loads:
 *  finance empty, no covers, security 0, website 1, no contracts, draw tier 1 at 200 a day, no
 *  pipes, gates none, tips on, second shift off; the per project question is gone off every job,
 *  the per job material order is the material take off, and the living cost is the owner's draw. */
function liftToVersion14(state: Raw): void {
  if (isRecord(state.finance)) {
    state.finance.loan = null;
    state.finance.overdraftInterestAccrued = 0;
  }
  state.insurance = { property: false, liability: false, insuredValue: 0, payouts: [] };
  state.security = { level: 0, lastBurglaryDay: null };
  state.website = { level: WEBSITE_START_LEVEL, lastUpkeepDay: null };
  state.contracts = [];
  state.ownerDraw = { tier: 0 };
  state.pipes = [];
  state.gates = [];
  state.settings = { tips: true };
  state.tips = { seen: [] };
  state.shift = { second: false };
  state.monthEndShownFor = 0;
  if (isRecord(state.software)) {
    state.software.joineryCore = false;
    state.software.joineryCoreExtensions = 0;
  }
  if (isRecord(state.owner)) state.owner.holidayDaysRemaining = 0;
  if (isRecord(state.dayStats)) {
    state.dayStats.efficiency = emptyEfficiency();
    state.dayStats.nightMinutes = 0;
  }
  for (const day of records(state.days)) {
    day.efficiency = emptyEfficiency();
    day.nightMinutes = 0;
  }
  for (const worker of records(state.workers)) {
    worker.shift = 'day';
    worker.dayLog = [];
  }
  for (const enquiry of records(state.enquiries)) {
    enquiry.kind = 'residential';
    enquiry.budget = typeof enquiry.price === 'number' ? enquiry.price : 0;
    enquiry.offer = null;
  }
  for (const job of records(state.jobs)) {
    delete job.materialMode;
    job.kind = 'residential';
    job.budget = typeof job.price === 'number' ? job.price : 0;
    // Nothing was held for a job before tonight: what it needs it reserves at the next restock.
    job.sheetsReserved = 0;
    job.nightMinutes = 0;
    job.needsSpindle = false;
  }
  for (const task of records(state.tasks)) {
    if (task.kind === 'materialOrder') {
      task.kind = 'materialTakeOff';
      if (typeof task.label === 'string') task.label = task.label.replace('Material order', 'Material take off');
    }
  }
  for (const entry of records(state.ledger)) {
    if (entry.category === 'living') entry.category = 'ownerDraw';
    if (entry.category === 'ducting') entry.category = 'pipes';
  }
  state.version = 14;
}

/** Version 14 to 15: the workshop earns by the hour (CLAUDE.md T17 section 4). Every v24 save
 *  loads: no job has a second man on it, no day has counted the hours it paid for, nothing is
 *  queued on the laptop, and the seats and the lockers come off the hall floor and stand inside
 *  the canteen on the slots the layout gives them, in the order they were bought. */
function liftToVersion15(state: Raw): void {
  for (const job of records(state.jobs)) job.secondAssignee = null;
  state.taskQueue = [];
  if (isRecord(state.dayStats)) {
    state.dayStats.paidHours = 0;
    state.dayStats.expressUplift = 0;
  }
  for (const day of records(state.days)) {
    day.paidHours = 0;
    day.expressUplift = 0;
    day.hallFactor = 1;
  }
  // Nobody has a month behind him on the new fields, and no machine has a week on its own clock.
  if (isRecord(state.owner)) {
    state.owner.monthMinutes = 0;
    state.owner.monthDaysOff = 0;
  }
  for (const worker of records(state.workers)) {
    worker.monthMinutes = 0;
    worker.monthDaysOff = 0;
  }
  for (const item of records(state.equipment)) {
    item.hoursThisWeek = 0;
    item.hoursThisMonth = 0;
  }
  // A running contract holds nothing on the rack yet: it takes its sheets from the next piece on.
  for (const contract of records(state.contracts)) {
    contract.sheetsReserved = 0;
    contract.sheetsUsed = 0;
  }
  // Joinery Core was paid for at the click and again at the first month end before tonight. What
  // is owned now runs from this month on, and nothing is given back (CLAUDE.md T17 2.21).
  if (isRecord(state.software)) {
    const software = state.software;
    software.joineryCoreFromMonth = software.joineryCore === true ? 0 : null;
    const bought = typeof software.joineryCoreExtensions === 'number' ? software.joineryCoreExtensions : 0;
    software.joineryCoreExtensionMonths = new Array<number>(Math.max(0, bought)).fill(0);
  }
  let seats = 0;
  let lockers = 0;
  const welfare = new Set<string>();
  for (const item of records(state.equipment)) {
    if (item.specId === 'canteenSeat' || item.specId === 'locker') {
      if (typeof item.id === 'string') welfare.add(item.id);
    }
    if (item.soldOnDay !== null && item.soldOnDay !== undefined) continue;
    if (item.specId === 'canteenSeat') {
      const slot = CANTEEN_SLOT_LAYOUT[Math.min(seats, CANTEEN_SLOT_LAYOUT.length - 1)];
      seats += 1;
      if (slot) {
        item.anchorX = slot.x;
        item.anchorY = slot.y;
      }
    } else if (item.specId === 'locker') {
      const slot = LOCKER_SLOT_LAYOUT[Math.min(lockers, LOCKER_SLOT_LAYOUT.length - 1)];
      lockers += 1;
      if (slot) {
        item.anchorX = slot.x;
        item.anchorY = slot.y;
      }
    }
  }
  // A seat or a locker the player was half way through shifting is not a move any more: the kit
  // is in the canteen and the hall never had it, so nothing is owed for shifting it.
  state.movedItems = records(state.movedItems).filter(
    (moved) => typeof moved.itemId !== 'string' || !welfare.has(moved.itemId),
  );
  state.version = 15;
}

/** One lift per bump, keyed by the version it lifts from. */
const LIFTS: Record<number, (state: Raw) => void> = {
  12: liftToVersion13,
  13: liftToVersion14,
  14: liftToVersion15,
};

/** The state a save holds, lifted bump by bump into this build's shape, or null when the save is
 *  older than anything this build can lift or is not a state at all. The save itself is left as
 *  it was: the lifts work on a copy. */
export function migrateState(raw: unknown, version: number): GameState | null {
  if (!canOpenVersion(version) || !isRecord(raw)) return null;
  const state = JSON.parse(JSON.stringify(raw)) as Raw;
  for (let at = version; at < STATE_VERSION; at += 1) {
    const lift = LIFTS[at];
    if (lift === undefined) return null;
    lift(state);
  }
  return state as unknown as GameState;
}
