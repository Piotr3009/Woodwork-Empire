// A saved game from the builds before this one, lifted into the shape the engine runs on now.
//
// The loader used to refuse every save that was not this build's, and a company was lost at every
// delivery. From Turn 12 a save one bump behind is opened: the fields the bump added are zeroed,
// the fields it took away are dropped, and nothing about the game is guessed. Anything older is
// refused as it always was (CLAUDE.md T12 2.3). Written against the plain JSON a save is and not
// against the types, because the whole point is that the file does not match them yet.

import {
  CABINET_SLOT_LAYOUT,
  EQUIPMENT_SPECS,
  HIRING_SPECS,
  LOCKER_SLOT_LAYOUT,
  PRODUCTION_STAGES,
  SOUND_VOLUME_DEFAULT,
  STATE_VERSION,
  UNIT_WIDTH_CELLS,
  WEBSITE_START_LEVEL,
  WORKER_RATES,
} from './constants';
import { receive } from './economy';
import { planPlaces } from './production';
import type { GameState, WorkerTier } from './types';

/** The weeks in a month that the Turn 20 build converted a monthly wage with, thirty days over
 *  seven. Turn 21 deleted `WEEKS_PER_MONTH` from the constants because nothing in the game converts
 *  a week into a month any more, and the lift out of v16 still has to do the arithmetic that build
 *  did, so the figure is written here and only here (CLAUDE.md T21 2.10, section 7). */
const WEEKS_PER_MONTH_V17 = 30 / 7;

/** Where a canteen seat stood inside the canteen block in the builds that sold one: the door
 *  column, the first seat just inside the door. Turn 23 took the seat out of the game, so the live
 *  layout table is gone with it; the lift out of v15 still has to stand an old save's seats where
 *  that build stood them, and a seat lifted to a cell it never occupied would be a seat the player
 *  never put there. The figures are the historical ones and are written here and only here
 *  (CLAUDE.md T23 2.11, T17 2.2). */
const CANTEEN_SLOT_LAYOUT_V17: Array<{ x: number; y: number }> = [
  { x: 4, y: 3 },
  { x: 4, y: 2 },
  { x: 4, y: 1 },
  { x: 4, y: 0 },
];

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
      const slot = CANTEEN_SLOT_LAYOUT_V17[Math.min(seats, CANTEEN_SLOT_LAYOUT_V17.length - 1)];
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
    state.owner.idleByReason = {
      noMachine: 0,
      noMaterial: 0,
      noCompressor: 0,
      nothingAssigned: 0,
      officeEmpty: 0,
    };
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

/** Version 18 to 19: the arrears are gone from the game, a turn is a number and not a boolean, and
 *  the tool cabinet is a family of five (CLAUDE.md T22 section 4).
 *
 *  **The arrears into the account.** Turn 21 let a bill the company could not pay become a debt
 *  beside the bank balance; Turn 22 pays every such cost in full through the overdraft limit
 *  instead, so there is no second pot of money any more (PIOTR, 19.09; CLAUDE.md T22 2.1). A save
 *  carrying an unpaid balance has it taken out of the cash, which is where it would have come from
 *  had it been paid on the day, and one ledger line says so, so the player can see what happened
 *  to his money rather than finding it missing. The three arrears fields go with it.
 *
 *  **The turn.** `rotated: true` is orientation 1 and `rotated: false` is 0, on every placed item,
 *  every reservation and every item on the moved list (CLAUDE.md T22 2.11).
 *
 *  **The cabinet's class.** Every cabinet in a save was bought when the family had one class, and
 *  that class is the standard one, whatever `variantId` the save happens to carry
 *  (CLAUDE.md T22 2.12). */
function liftToVersion19(state: Raw): void {
  carryArrearsIntoTheAccount(state);
  for (const item of records(state.equipment)) {
    item.orientation = item.rotated === true ? 1 : 0;
    delete item.rotated;
    if (item.specId === 'toolCabinet') item.variantId = 'standard';
  }
  for (const item of records(state.onOrder)) {
    item.orientation = item.rotated === true ? 1 : 0;
    delete item.rotated;
    if (item.specId === 'toolCabinet') item.variantId = 'standard';
  }
  for (const moved of records(state.movedItems)) {
    moved.fromOrientation = moved.fromRotated === true ? 1 : 0;
    delete moved.fromRotated;
  }
  state.version = 19;
}

/** The unpaid balance of a v18 save taken out of its cash, with one ledger line for it. Written
 *  against the plain JSON of a save, so the engine's own `charge` is not asked: the point is to
 *  leave the file in the shape this build runs on, and this build has no arrears to charge to. */
function carryArrearsIntoTheAccount(state: Raw): void {
  const finance = isRecord(state.finance) ? state.finance : null;
  const owed = typeof finance?.arrearsAmount === 'number' ? finance.arrearsAmount : 0;
  if (finance !== null) {
    // The three fields are off `FinanceState` in this build, so they are taken off the save and
    // not merely emptied: a lift leaves the file in the shape the build runs on.
    delete finance.arrearsAmount;
    delete finance.arrearsMonths;
    delete finance.firstArrearsDay;
  }
  // Every line an old ledger already holds under the two categories the word took with it, the
  // arrears themselves and the bailiff's seizure, is rewritten, so a played company's history
  // keeps its pounds on the books after the word has gone from the game.
  for (const entry of records(state.ledger)) {
    if (entry.category === 'arrears' || entry.category === 'seizure') entry.category = 'other';
  }
  if (owed <= 0) return;
  const cash = typeof state.cash === 'number' ? state.cash : 0;
  state.cash = Math.round((cash - owed) * 100) / 100;
  const clock = isRecord(state.clock) ? state.clock : null;
  const day = typeof clock?.day === 'number' ? clock.day : 1;
  const minute = typeof clock?.minute === 'number' ? clock.minute : 0;
  const ledger = Array.isArray(state.ledger) ? state.ledger : [];
  ledger.push({
    id: `lift-v19-arrears-${day}`,
    day,
    minute,
    category: 'other',
    label: 'Arrears carried into the account (v32)',
    amount: -Math.round(owed * 100) / 100,
    balance: state.cash,
    unpaid: false,
  });
  state.ledger = ledger;
}

/** Version 19 to 20: the months the company has closed are written down, the production manager
 *  has a grade, the cordless drill and the canteen seat are out of the game, a man's hand tool set
 *  is in a cabinet and not on the floor, and nobody is charged minutes for assigning
 *  (CLAUDE.md T23 section 4).
 *
 *  What the lift does, and why each one is the honest answer:
 *
 *  - **The monthly reports.** An empty list. The months a save has already closed were added up
 *    off a ledger that is still there, but the card the player was shown that evening is the one
 *    the report is meant to be, and a report worked out again tonight under tonight's rules would
 *    not be that card. A played company starts its list at its next month end (CLAUDE.md T23 2.14).
 *  - **The manager's grade.** `experienced`, because that is the man the save has: a manager was
 *    paid 3,400 a month in every build before this one, which is exactly what the experienced
 *    grade costs tonight, so nobody's wage moves and nobody is promoted for nothing
 *    (CLAUDE.md T23 2.4).
 *  - **The drill and the seat.** Both are gone from the catalogue, so a save's own go with no
 *    refund and one ledger line each says so: the player sees what happened to his kit rather than
 *    finding a hole in the hall. The line moves no money, so it is a note on the books and not a
 *    line of the month's money. The ones still on the lorry go too: a delivery of a thing the
 *    catalogue no longer holds would have nowhere to land (CLAUDE.md T23 2.5, 2.11).
 *  - **The hand tool set.** It keeps its id and its cabinet and loses the cell it stood on: from
 *    tonight a set is a thing in a cabinet and not a thing on the hall, so it has no position to
 *    carry (CLAUDE.md T23 2.6).
 *  - **The assigning.** Every staff management chore comes off the list, done or not. Nothing
 *    costs anybody minutes for assigning any more (CLAUDE.md T23 2.2).
 *  - **The men's day meters.** A man on the books carries the minutes he stood and their reasons
 *    from tonight, the way the owner has since Turn 21. A save made before them starts on nought
 *    (CLAUDE.md T23 2.1, 2.13). */
function liftToVersion20(state: Raw): void {
  state.monthlyReports = [];
  for (const worker of records(state.workers)) {
    if (worker.role === 'productionManager') worker.tier = 'experienced';
    // The day meter a man on the books has from tonight: a save made before it starts the day it
    // is lifted on nought, the way the morning would have left it (CLAUDE.md T23 2.1).
    worker.idleMinutes = 0;
    worker.idleByReason = { waitingForBoss: 0, noMachine: 0, noMaterial: 0 };
    // Nothing counted his accidents before tonight, so a save's men start on nought and the
    // count runs from here (CLAUDE.md T23 2.13).
    worker.accidents = 0;
  }
  retireSpec(state, 'drill', 'Cordless drill retired (v36)');
  retireSpec(state, 'canteenSeat', 'Canteen seats retired (v36)');
  for (const item of records(state.equipment)) {
    if (item.specId !== 'handToolSet') continue;
    delete item.anchorX;
    delete item.anchorY;
  }
  state.tasks = records(state.tasks).filter((task) => task.kind !== 'staffManagement');
  state.version = 20;
}

/** Version 20 to 21: a job's labour is kept by stage, the bag of work (PIOTR, 20.09; v37). A save
 *  made under the one cursor of Turns 1 to 23 has one figure, the labour worked into the job, and
 *  the cursor stood at the first stage that figure did not fill. So the lift pours that figure
 *  into the stages in the plan's order, cutting first, until it runs out: exactly where the cursor
 *  said the job was. A job cut on a CNC put its minutes into the same first two shares, which is
 *  what the CNC's stage reads (`stageDone`), so the CNC plan lands in the same place. */
function liftToVersion21(state: Raw): void {
  for (const job of records(state.jobs)) {
    if (isRecord(job.stageLabour)) continue;
    const value = typeof job.labourValue === 'number' ? job.labourValue : 0;
    const remaining = typeof job.labourRemaining === 'number' ? job.labourRemaining : value;
    let done = Math.max(0, value - remaining);
    const stageLabour: Record<string, number> = {};
    for (const stage of PRODUCTION_STAGES) {
      const need = stage.share * value;
      const put = Math.min(done, need);
      if (put > 0) stageLabour[stage.id] = put;
      done -= put;
      if (done <= 0) break;
    }
    job.stageLabour = stageLabour;
  }
  state.version = 21;
}

/** Version 21 to 22: the four grades cost what v38 says they cost (PIOTR, 21.09). Every tiered man
 *  on the books is put on this build's wage for his role and grade, read off the one table the
 *  hire cards read, so a senior hired last month and one hired tomorrow are paid the same. A man
 *  whose role has no grade, the production manager with his own four and the untiered roles, is
 *  left alone. */
function liftToVersion22(state: Raw): void {
  for (const worker of records(state.workers)) {
    if (worker.role === 'productionManager') continue;
    const spec = HIRING_SPECS.find((entry) => entry.role === worker.role && entry.tier === worker.tier);
    if (spec !== undefined && typeof worker.tier === 'string') worker.monthlyWage = spec.monthlyWage;
  }
  state.version = 22;
}

/** Every item of one retired family taken off the books, standing in the hall or still on the
 *  lorry, with one ledger line when the save actually held any. No money comes back: the player
 *  bought them under the old rules and the game is not buying them off him. Written against the
 *  plain JSON of a save, like every other lift. */
function retireSpec(state: Raw, specId: string, label: string): void {
  const standing = records(state.equipment).filter((item) => item.specId === specId);
  const onOrder = records(state.onOrder).filter((item) => item.specId === specId);
  if (standing.length === 0 && onOrder.length === 0) return;
  state.equipment = records(state.equipment).filter((item) => item.specId !== specId);
  state.onOrder = records(state.onOrder).filter((item) => item.specId !== specId);
  const clock = isRecord(state.clock) ? state.clock : null;
  const day = typeof clock?.day === 'number' ? clock.day : 1;
  const minute = typeof clock?.minute === 'number' ? clock.minute : 0;
  const ledger = Array.isArray(state.ledger) ? state.ledger : [];
  ledger.push({
    id: `lift-v20-${specId}-${day}`,
    day,
    minute,
    category: 'other',
    label,
    amount: 0,
    balance: typeof state.cash === 'number' ? state.cash : 0,
    unpaid: true,
  });
  state.ledger = ledger;
}

/** One lift per bump, keyed by the version it lifts from. */
/** v23 (v40, PIOTR 21.09): every machine writes down on the Monday what its class saved last week,
 *  so the Machines sheet can say last week beside this week; a saved machine has no last week
 *  yet, so its figure is nothing; the day's stats carry the sum behind the workshop's average
 *  output, and every closed day the average it had, which a v22 save cannot know, so a closed
 *  day is given the hall's own factor it wrote down, which is what the average reads before the
 *  first minute. */
function liftToVersion23(state: Raw): void {
  for (const item of records(state.equipment)) item.minutesSavedLastWeek = 0;
  if (isRecord(state.dayStats)) state.dayStats.outputWorth = 0;
  for (const day of records(state.days)) {
    day.outputToday = typeof day.hallFactor === 'number' ? day.hallFactor : 1;
  }
  state.version = 23;
}

/** v24 (v42, PIOTR 21.09): a man on a contract is the contract's and vanishes from the jobs, so a
 *  save made under Turn 20's split day, where he stood on a contract and a job at once, comes in
 *  with him off every job. The job he leaves keeps whoever else was on it; a job he was the last
 *  man on goes back on the list, ready, for the boss to give to somebody else. His `jobId` is the
 *  contract's marker, which the first minute of the day would write anyway. */
function liftToVersion24(state: Raw): void {
  const onContracts = new Set<string>();
  for (const contract of records(state.contracts)) {
    if (contract.status !== 'active') continue;
    const marker = `contract:${String(contract.id)}`;
    for (const id of Array.isArray(contract.assigned) ? contract.assigned : []) {
      if (typeof id !== 'string') continue;
      onContracts.add(id);
      for (const worker of records(state.workers)) {
        if (worker.id === id) worker.jobId = marker;
      }
    }
  }
  if (onContracts.size > 0) {
    for (const job of records(state.jobs)) {
      const assignees = Array.isArray(job.assignees) ? job.assignees : [];
      const kept = assignees.filter((id) => typeof id !== 'string' || !onContracts.has(id));
      if (kept.length === assignees.length) continue;
      job.assignees = kept;
      if (kept.length === 0 && job.stage === 'inProduction') job.stage = 'ready';
    }
  }
  state.version = 24;
}

/** v25 (v44, PIOTR 21.09): the owner's evening take-over is remembered by the job's id, so that
 *  dusk gives back that one job and not every job he stands second on. A save has no evening in
 *  hand when it is opened in the morning, so it comes in with none. */
function liftToVersion25(state: Raw): void {
  if (isRecord(state.owner)) state.owner.tookOverJobId = null;
  state.version = 25;
}

/** v26 (v50, PIOTR 22.09): the Output sheet says who made today's number, so the day's stats keep
 *  the minutes and the worth of every man who has put a production minute in. A save was made in
 *  the middle of a day this build did not count that way, so it opens with nobody booked: the
 *  block is empty until the next minute is worked, and the total above it is untouched, because
 *  `outputWorth` and `workMinutes` are the save's own (CLAUDE.md T24 2.1, section 4). */
function liftToVersion26(state: Raw): void {
  if (isRecord(state.dayStats)) state.dayStats.byMan = {};
  state.version = 26;
}

/** v27 (v51, PIOTR 22.09): the service runs on the calendar. Every machine's six months start on
 *  the day the save is opened, whatever hours it had at its last service, which is the one figure
 *  the old rule kept and the new one has no use for; and the state remembers the last day a shop
 *  rang, read off the offers it has. */
function liftToVersion27(state: Raw): void {
  const today = isRecord(state.clock) && typeof state.clock.day === 'number' ? state.clock.day : 1;
  for (const item of records(state.equipment)) {
    item.servicedDay = today;
    delete item.serviceHours;
  }
  let last: number | null = null;
  for (const contract of records(state.contracts)) {
    if (typeof contract.offeredDay !== 'number') continue;
    if (last === null || contract.offeredDay > last) last = contract.offeredDay;
  }
  state.lastContractOfferDay = last;
  state.version = 27;
}

/** A tally of lost minutes or of a man's idle ones, lifted to the causes of v52: the queue's
 *  `noMachine` becomes `noPlace`, the one thing a machine can still stop a man for, and the causes
 *  that are new start on nought (CLAUDE.md T25 2.3). */
function liftCauses(tally: unknown, added: readonly string[]): void {
  if (!isRecord(tally)) return;
  if (typeof tally.noMachine === 'number') {
    tally.noPlace = tally.noMachine;
    delete tally.noMachine;
  }
  if (typeof tally.noPlace !== 'number') tally.noPlace = 0;
  for (const key of added) if (typeof tally[key] !== 'number') tally[key] = 0;
}

/** The waiting lines a closed month keeps, in the order and the words of `EFFICIENCY_CAUSES` of
 *  v52: the queue's line becomes "No place" and "Hall stopped" is added on nought, so a month card
 *  drawn from an old report reads the same lines as one drawn tonight (CLAUDE.md T25 2.3). */
function liftWaitingLines(lines: unknown): unknown {
  if (!Array.isArray(lines)) return lines;
  const out: Raw[] = [];
  for (const line of lines) {
    if (!isRecord(line)) continue;
    if (line.id === 'noMachine') out.push({ ...line, id: 'noPlace', label: 'No place' });
    else out.push(line);
    if (line.id === 'noMaterial') out.push({ id: 'hallStopped', label: 'Hall stopped', minutes: 0, percent: 0 });
  }
  return out;
}

/** v28 (v52, PIOTR 21.09): a machine is places and nobody takes one (CLAUDE.md T25 section 4).
 *  `takenBy` is cleared on every item and is never written again; every man and the owner get
 *  `working` and `noPlaceFor`, worked out by the day plan once the lift is done
 *  (`migrateState`), so an old save opens with the right men working; a job's row that said it
 *  was waiting for a machine or for a bench is cleared, and a man standing at a waiting cell or at
 *  a place of the old queue stands at his home cell. The lost minutes of the day, of every closed
 *  day and of every monthly report move from the queue's cause to `noPlace`. */
function liftToVersion28(state: Raw): void {
  for (const item of records(state.equipment)) item.takenBy = null;
  const men = [state.owner, ...records(state.workers)];
  for (const man of men) {
    if (!isRecord(man)) continue;
    man.working = false;
    man.noPlaceFor = '';
    const station = typeof man.station === 'string' ? man.station : '';
    if (station.startsWith('waiting:') || station.startsWith('place:') || station.startsWith('second:')) {
      man.station = 'home';
    }
    if (station === 'noBench') man.station = 'door';
  }
  if (isRecord(state.owner)) liftCauses(state.owner.idleByReason, ['hallStopped']);
  for (const worker of records(state.workers)) liftCauses(worker.idleByReason, ['noCompressor', 'hallStopped']);
  for (const job of records(state.jobs)) {
    const blocked = typeof job.blockedBy === 'string' ? job.blockedBy : '';
    if (blocked.startsWith('waiting for the ') || blocked === 'no bench') job.blockedBy = '';
  }
  if (isRecord(state.dayStats) && isRecord(state.dayStats.efficiency)) {
    liftCauses(state.dayStats.efficiency.lost, ['hallStopped']);
  }
  for (const day of records(state.days)) {
    if (isRecord(day.efficiency)) liftCauses(day.efficiency.lost, ['hallStopped']);
  }
  for (const report of records(state.monthlyReports)) {
    if (isRecord(report.efficiency)) report.efficiency.waiting = liftWaitingLines(report.efficiency.waiting);
  }
  state.version = 28;
}

/** v29 (v53, PIOTR 24.09): no job waits for a stage and nobody for a machine. The job card's
 *  switch for waiting on the CNC is gone from every job. The timber tool set leaves the game in
 *  `takeTheTimberToolsBack`, once the lift is done, because paying it back goes through the books. */
function liftToVersion29(state: Raw): void {
  for (const job of records(state.jobs)) delete job.sawFallback;
  state.version = 29;
}

/** The family the game no longer sells (PIOTR, 24.09: "the spindle moulder and the thicknesser are
 *  all a furniture shop needs"; v53). */
const GONE_TIMBER_TOOLS = 'solidWoodTools';

/** Every timber tool set in the hall and on the lorry goes, and the money it cost comes back on one
 *  line of the books: the player bought it in good faith, and nothing of the game may be lost by a
 *  rule changing under him (PIOTR, 24.09; v53). */
function takeTheTimberToolsBack(state: GameState): void {
  const owned = state.equipment.filter((item) => item.specId === GONE_TIMBER_TOOLS);
  const ordered = state.onOrder.filter((item) => item.specId === GONE_TIMBER_TOOLS);
  if (owned.length === 0 && ordered.length === 0) return;
  const back =
    owned.reduce((total, item) => total + item.purchasePrice, 0) +
    ordered.reduce((total, item) => total + item.pricePaid, 0);
  state.equipment = state.equipment.filter((item) => item.specId !== GONE_TIMBER_TOOLS);
  state.onOrder = state.onOrder.filter((item) => item.specId !== GONE_TIMBER_TOOLS);
  receive(state, 'equipment', 'Timber tool set taken back: it is no longer in the game', back);
}

const LIFTS: Record<number, (state: Raw) => void> = {
  12: liftToVersion13,
  13: liftToVersion14,
  14: liftToVersion15,
  15: liftToVersion16,
  16: liftToVersion17,
  17: liftToVersion18,
  18: liftToVersion19,
  19: liftToVersion20,
  20: liftToVersion21,
  21: liftToVersion22,
  22: liftToVersion23,
  23: liftToVersion24,
  24: liftToVersion25,
  25: liftToVersion26,
  26: liftToVersion27,
  27: liftToVersion28,
  28: liftToVersion29,
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
  const lifted = state as unknown as GameState;
  if (version < 29 && Array.isArray(lifted.equipment) && Array.isArray(lifted.onOrder)) {
    try {
      takeTheTimberToolsBack(lifted);
    } catch {
      // Not a whole hall, with no books to pay it back through: its first minute has no tool set
      // to work at either, because the catalogue has none.
    }
  }
  // Who has a place, worked out the moment the save is open rather than left for the first
  // minute: an old save opens with the right men working (CLAUDE.md T25 section 4). A fragment of
  // a state that is not a whole hall cannot be planned, and is lifted as it is: its first minute
  // plans it, as every minute does.
  if (version < 29) {
    try {
      planPlaces(lifted);
    } catch {
      // Not a whole hall: nothing to plan.
    }
  }
  return lifted;
}
