// A saved game from the builds before this one, lifted into the shape the engine runs on now.
//
// The loader used to refuse every save that was not this build's, and a company was lost at every
// delivery. From Turn 12 a save one bump behind is opened: the fields the bump added are zeroed,
// the fields it took away are dropped, and nothing about the game is guessed. Anything older is
// refused as it always was (CLAUDE.md T12 2.3). Written against the plain JSON a save is and not
// against the types, because the whole point is that the file does not match them yet.

import {
  CABINET_SLOT_LAYOUT,
  CANTEEN_SLOT_LAYOUT,
  EQUIPMENT_SPECS,
  LOCKER_SLOT_LAYOUT,
  SOUND_VOLUME_DEFAULT,
  STATE_VERSION,
  UNIT_WIDTH_CELLS,
  WEBSITE_START_LEVEL,
  WORKER_RATES,
} from './constants';
import type { GameState, WorkerTier } from './types';

/** The weeks in a month that the Turn 20 build converted a monthly wage with, thirty days over
 *  seven. Turn 21 deleted `WEEKS_PER_MONTH` from the constants because nothing in the game converts
 *  a week into a month any more, and the lift out of v16 still has to do the arithmetic that build
 *  did, so the figure is written here and only here (CLAUDE.md T21 2.10, section 7). */
const WEEKS_PER_MONTH_V17 = 30 / 7;

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
  // The running totals are keyed by the same category names, and renaming them in the ledger and
  // not here left a lifted save showing `living` and `ducting` as row labels in the Accounts
  // summary: `categoryLabel` has no word for either and falls back on the key. Found by the Turn
  // 19 review of the migration; the bug is as old as the rename.
  for (const period of ['day', 'week', 'month']) {
    const totals = state.finance;
    if (!isRecord(totals)) break;
    const slice = totals[period];
    if (!isRecord(slice) || !isRecord(slice.byCategory)) continue;
    const by = slice.byCategory;
    for (const [from, to] of [['living', 'ownerDraw'], ['ducting', 'pipes']]) {
      if (from === undefined || to === undefined) continue;
      if (!(from in by)) continue;
      const amount = by[from];
      delete by[from];
      if (typeof amount !== 'number') continue;
      const held = by[to];
      by[to] = (typeof held === 'number' ? held : 0) + amount;
    }
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

/** Version 15 to 16: a job carries everybody on it as one list, the settings carry the sound, and
 *  the state remembers that the hall has been set up (CLAUDE.md T19 section 4). Every v26 save
 *  loads: the two old fields become the list, in the order the two men stood in; the sound starts
 *  at the default volume, unmuted; and a hall with anything of the player's standing in it has
 *  been set up, because it could not have got there any other way. */
function liftToVersion16(state: Raw): void {
  for (const job of records(state.jobs)) {
    const assignees: string[] = [];
    if (typeof job.assignedTo === 'string') assignees.push(job.assignedTo);
    if (typeof job.secondAssignee === 'string' && !assignees.includes(job.secondAssignee)) {
      assignees.push(job.secondAssignee);
    }
    job.assignees = assignees;
    delete job.assignedTo;
    delete job.secondAssignee;
  }
  if (isRecord(state.settings)) {
    state.settings.sound = { volume: SOUND_VOLUME_DEFAULT, muted: false };
  } else {
    state.settings = { tips: true, sound: { volume: SOUND_VOLUME_DEFAULT, muted: false } };
  }
  // Anything of the player's standing in the hall means he has been through setup at least once.
  // A machine still on the lorry has no anchor on the floor, so it is not counted
  // (CLAUDE.md T19 2.13).
  state.hallSetUp = records(state.equipment).some(
    (item) => item.soldOnDay === null || item.soldOnDay === undefined,
  );
  state.version = 16;
}

/** What a v28 tier is called from tonight. Nobody is a master on a lifted save: the fourth tier
 *  is new and nobody was ever hired into it (CLAUDE.md T20 2.5). */
const TIER_LIFT: Record<string, string> = {
  poor: 'novice',
  normal: 'experienced',
  super: 'senior',
};

/** Version 16 to 17: the tiers are named again, everybody is paid by the week, a man can be let
 *  go, a machine counts its services, and a contract records who ended it (CLAUDE.md T20 section
 *  4). Every v28 save loads: his tier is renamed and his speed comes up to what that tier is
 *  worth tonight, because the rate is the tier's and not the man's and a lifted crew would
 *  otherwise be slower than the same men hired this morning; his own wage is left alone, because
 *  what he is paid is what he was taken on for, and it comes off his monthly one where he had no
 *  weekly; nobody is under notice; no machine has been serviced under the new rule or is away
 *  being serviced; and every contract is recorded as ended on its term, because a lifted save
 *  cannot tell a term that ran out from an end the player called himself, and both were on the
 *  books before tonight.
 *
 *  Two things the lift does not put right, both of them the price of the bump and neither of them
 *  a bug for phase C to find. The month the upgrade lands in pays the office twice: the men who
 *  were on a monthly wage had their whole month taken on the 1st under the old rule, and their
 *  weeks go out again on the Fridays that are left under the new one. Nothing is given back, as
 *  nothing was given back for Joinery Core in the lift before this one (CLAUDE.md T17 2.21).
 *  Every month after it is right. */
function liftToVersion17(state: Raw): void {
  for (const worker of records(state.workers)) {
    if (typeof worker.tier === 'string') {
      const lifted = TIER_LIFT[worker.tier];
      if (lifted !== undefined) {
        worker.tier = lifted;
        worker.rate = WORKER_RATES[lifted as WorkerTier];
      }
    }
    const weekly = typeof worker.weeklyWage === 'number' ? worker.weeklyWage : 0;
    const monthly = typeof worker.monthlyWage === 'number' ? worker.monthlyWage : 0;
    worker.weeklyWage = weekly > 0 ? weekly : Math.round(monthly / WEEKS_PER_MONTH_V17);
    delete worker.monthlyWage;
    worker.leavesOnDay = null;
  }
  for (const item of records(state.equipment)) {
    item.serviceCount = 0;
    item.inServiceUntilDay = null;
  }
  // An interview the owner was sitting in when the save was taken holds the tier he is
  // interviewing for, and the man is taken on when the hour is spent. That tier is renamed with
  // the rest: an order left reading an old id matches no spec at all, and the hour would be spent
  // for nobody (CLAUDE.md T20 2.5).
  for (const task of records(state.tasks)) {
    for (const order of records(task.orders)) {
      if (typeof order.tier === 'string') {
        const lifted = TIER_LIFT[order.tier];
        if (lifted !== undefined) order.tier = lifted;
      }
    }
  }
  for (const contract of records(state.contracts)) contract.endedBy = 'term';
  state.version = 17;
}

/** Version 17 to 18: everybody is paid by the month again and the week is gone, the four tiers
 *  carry Piotr's own rates, the state counts the days the cash has been under the overdraft limit,
 *  the owner's day counts the minutes he stood as well as the ones he worked, and a tool cabinet is
 *  two metres wide (CLAUDE.md T21 section 4). Every v29 save loads.
 *
 *  What the lift does, and why each one is the honest answer:
 *
 *  - **The wage.** `weeklyWage` becomes `monthlyWage` at `weeklyWage * 30 / 7`, which is the
 *    conversion the Turn 20 build itself printed beside every wage it showed, so a lifted man costs
 *    what the game told the player he cost. A man's own wage is not re-read off `HIRING_SPECS`:
 *    what he is paid is what he was taken on for, which is the rule the lift before this one set
 *    (CLAUDE.md T20 section 4).
 *  - **The rate.** It is recomputed from the tier, because the rate is the tier's and not the
 *    man's: Turn 21 moved every tier down a step (0.8 becomes 0.6 and so on), and a crew lifted
 *    with Turn 20's rates would be faster than the same men hired this morning (CLAUDE.md T21 2.9).
 *    The tier ids do not change, so nobody is renamed.
 *  - **The days below the limit.** Nought, not a count worked back out of the ledger: a save cannot
 *    say whether yesterday ended under the limit, and starting the count today is the reading that
 *    cannot close a company for something it was never warned about (CLAUDE.md T21 2.2).
 *  - **The owner's idle minutes.** Nought for the day the save was taken in. The minutes he stood
 *    before the save were never written down, and inventing them would put a grey segment on the
 *    bar that no reason can be given for (CLAUDE.md T21 2.8).
 *  - **The tool cabinet.** Every cabinet standing in the hall is two cells wide now where it was
 *    one, so a row of them laid out one cell apart overlaps itself. Each is put back on the cabinet
 *    row's own slots, which are two cells apart from tonight, in the order the save holds them.
 *    A cabinet past the row's seventh place, or one that will not fit a hall narrower than the row
 *    was drawn for, goes to the yard, which is the game's own word for a thing that has nowhere to
 *    stand: `hallItems` counts an item at or past `unit.widthCells` as out of the hall, the player
 *    drags it back in in setup mode, and nothing else in the game has to learn a new word for it.
 *    This is the Turn 17 welfare kit lift's own shape (CLAUDE.md T21 2.13, T17 section 4).
 *
 *  One thing the lift does not put right, and it is the price of the bump rather than a bug. The
 *  month the upgrade lands in pays the crew twice over: the Fridays before the save went out under
 *  Turn 20's weekly rule, and the last working day of this month takes a whole month's wages under
 *  the new one. Nothing is given back, as nothing was given back for the mirror of this in the lift
 *  before it (CLAUDE.md T20 section 4, T17 2.21). Every month after it is right. */
function liftToVersion18(state: Raw): void {
  for (const worker of records(state.workers)) {
    const weekly = typeof worker.weeklyWage === 'number' ? worker.weeklyWage : 0;
    const monthly = typeof worker.monthlyWage === 'number' ? worker.monthlyWage : 0;
    worker.monthlyWage = monthly > 0 ? monthly : Math.round(weekly * WEEKS_PER_MONTH_V17);
    delete worker.weeklyWage;
    if (typeof worker.tier === 'string' && worker.tier in WORKER_RATES) {
      worker.rate = WORKER_RATES[worker.tier as WorkerTier];
    }
  }
  if (isRecord(state.finance)) state.finance.daysBelowOverdraft = 0;
  if (isRecord(state.owner)) {
    state.owner.idleMinutes = 0;
    state.owner.idleByReason = { noMachine: 0, noMaterial: 0, nothingAssigned: 0, officeEmpty: 0 };
  }
  liftCabinets(state);
  state.version = 18;
}

/** Every tool cabinet in the hall put back on the widened cabinet row (CLAUDE.md T21 2.13). Written
 *  against the plain JSON of a save, so the hall's own `canPlaceSpec` is not asked: the cells this
 *  walks are the cells the constants name, and the width it needs is the catalogue's own. */
function liftCabinets(state: Raw): void {
  const cells = EQUIPMENT_SPECS.find((spec) => spec.id === 'toolCabinet')?.width ?? 2;
  const unit = isRecord(state.unit) ? state.unit : null;
  const width = typeof unit?.widthCells === 'number' ? unit.widthCells : UNIT_WIDTH_CELLS;
  let placed = 0;
  for (const item of records(state.equipment)) {
    if (item.specId !== 'toolCabinet') continue;
    if (item.soldOnDay !== null && item.soldOnDay !== undefined) continue;
    const slot = CABINET_SLOT_LAYOUT[placed];
    placed += 1;
    if (slot !== undefined && slot.x + cells <= width) {
      item.anchorX = slot.x;
      item.anchorY = slot.y;
      // Unturned, whichever way the save had it: a cabinet turned is one cell wide and two deep, and
      // the row it goes back on is one cell deep with the workbenches under it.
      item.rotated = false;
      continue;
    }
    // Nowhere on the row for it: out to the yard, where the player picks it up in setup mode.
    item.anchorX = width;
    item.anchorY = 0;
    item.rotated = false;
  }
}

/** One lift per bump, keyed by the version it lifts from. */
const LIFTS: Record<number, (state: Raw) => void> = {
  12: liftToVersion13,
  13: liftToVersion14,
  14: liftToVersion15,
  15: liftToVersion16,
  16: liftToVersion17,
  17: liftToVersion18,
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
