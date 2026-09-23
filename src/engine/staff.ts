// Hiring and the workforce. A joiner cannot start until he has a bench, a locker and a set of
// tools, exactly as in life (CLAUDE.md 9.3). The seat was on that list until Turn 23, when the
// canteen became a room with a table and two stools of its own and nobody buys a seat any more
// (PIOTR, 20.09; CLAUDE.md T23 2.11). The second shift lives here too: the men on it work after
// the day, at the night rate, with the owner gone home (CLAUDE.md T13 3.9).

import {
  ACCIDENT_CHANCE_PER_DAY,
  ACCIDENT_DAYS_OFF,
  CANTEEN_LOCKERS,
  DAY_END_MINUTE,
  HELPER_HOME_CELL,
  HIRE_START_DELAY_DAYS,
  MINUTES_PER_WORKING_DAY,
  NIGHT_ERROR_FACTOR,
  NIGHT_RATE,
  SECOND_SHIFT_MINUTES,
  HIRING_SPECS,
  HAND_TOOL_SET,
  JOINER_PREREQUISITES,
  LET_GO_NOTICE_DAYS,
  MANAGER_AHEAD_DAYS,
  MANAGER_BEHIND_DAYS,
  MANAGER_REPLAN_MINUTES,
  PRODUCING_ROLES,
  PRODUCTION_MANAGER_CARRIES,
  PRODUCTION_MANAGER_PACE,
  TIER_WORDS,
  TOOL_CABINET,
  WORKER_IDLE_REASONS,
  WORKER_HOURS_PER_MONTH,
  WORKER_NAMES,
  WORKER_RATES,
} from './constants';
import {
  addWorkingDays,
  breakMinutesBefore,
  formatCalendarDay,
  isOvertime,
  isWorkingDay,
  monthOfDay,
  workedMinutesOfDay,
} from './clock';
import { charge, formatMoney } from './economy';
import { queueEvent } from './events';
import { onAccident } from './insurance';
import { addToJob, assignJob, findJob, takeOffJob } from './jobs';
// The work plan is where a job's projected end is worked out, and the master's re plan is read
// off it rather than off a second projection of its own (CLAUDE.md T23 2.4). plan.ts reads this
// module back for the men in today, which is the same two way pair production.ts and this module
// have carried since Turn 13: neither touches the other while it is being loaded.
import { workPlan } from './plan';
import { crewLimit } from './layout';
import { plural } from './text';
import {
  benchOf,
  SPRAY_BOOTH,
  accidentRisk,
  breakMachine,
  findSpec,
  isSold,
  itemStandsInTheHall,
  overdueBreakdownChance,
  BENCH,
  benchAtPlace,
  benchPlacesOwnedOrOnOrder,
  toolSlotsOf,
} from './machines';
import { countOwnedOrOnOrder } from './orders';
import { managerOnDuty, managerOnDutyNow, managerTier } from './owner';
import { effectiveReputation } from './reputation';
import { hands, machineWantedFor, planPlaces, workMinute } from './production';
import { chance, int, makeId } from './rng';
import { STATION_IDLE } from './stations';
import type {
  Equipment,
  GameState,
  HiringOption,
  Job,
  OwnerState,
  Shift,
  WeekCategory,
  WeekMeters,
  Worker,
  WorkerIdleReason,
  WorkerRole,
  WorkerTier,
} from './types';

/** What a trade is called, one man of it and several. The one table: the crew rows, Our team, the
 *  job's Assign list and the hire card's refusal all read it, so a sprayer is called a sprayer
 *  wherever he is named (CLAUDE.md T19 2.5, 2.6). It sits here and not in the UI because the
 *  refusal the hire card prints is written in this module: "excellent joiners come from
 *  reputation 60" (PIOTR; CLAUDE.md T20 2.5, T21 2.9, the words his own of 19.09).
 *  `src/ui/team.ts` hands `ROLE_WORDS` on. */
export const ROLE_WORDS: Record<WorkerRole, string> = {
  joiner: 'joiner',
  helper: 'helper',
  officeAdmin: 'office admin',
  purchasingClerk: 'purchasing clerk',
  salesman: 'salesman',
  draftsman: 'draftsman',
  estimator: 'estimator',
  productionManager: 'production manager',
  sprayer: 'sprayer',
};

/** The same trades, several of them: the plural is written out because a salesman is not a
 *  "salesmans" (CLAUDE.md 3: plain English, never the engine key). */
export const ROLE_WORDS_MANY: Record<WorkerRole, string> = {
  joiner: 'joiners',
  helper: 'helpers',
  officeAdmin: 'office admins',
  purchasingClerk: 'purchasing clerks',
  salesman: 'salesmen',
  draftsman: 'draftsmen',
  estimator: 'estimators',
  productionManager: 'production managers',
  sprayer: 'sprayers',
};

/** True for a man who produces. The one rule, asked by the board (CLAUDE.md T20 2.3). */
export function produces(role: WorkerRole): boolean {
  return PRODUCING_ROLES.includes(role);
}

/** The roles that have a working day of their own, the way the owner does (CLAUDE.md T2 3.8).
 *  A helper still clears his workshop jobs at no cost, as in Turn 1. */
const OFFICE_ROLES: WorkerRole[] = [
  'officeAdmin',
  'purchasingClerk',
  'salesman',
  'draftsman',
  'estimator',
  'productionManager',
];

/** The desks that sit in the office block behind the one who runs it: nobody at them before the
 *  office admin (PIOTR, CLAUDE.md T10 3.6). The estimator and the production manager are not on
 *  this list: the playthrough of CLAUDE.md T13 10.4 hires both without an admin, the estimator
 *  reads drawings and the manager runs the hall, and neither is the admin's specialist work. */
const BEHIND_THE_ADMIN: WorkerRole[] = ['purchasingClerk', 'salesman', 'draftsman'];

/** The roles that stand on the hall floor and so count against it: the crew the floor limits
 *  (CLAUDE.md T13 3.10). The office is in the office block. The production manager stands on the
 *  floor, because the floor is what he runs, and so does the sprayer, who is at the booth
 *  (CLAUDE.md T19 2.6). */
const FLOOR_ROLES: WorkerRole[] = ['joiner', 'helper', 'productionManager', 'sprayer'];

/** The crew on the floor, the owner among them (CLAUDE.md T13 3.10). */
export function crewCount(state: GameState): number {
  return 1 + state.workers.filter((worker) => FLOOR_ROLES.includes(worker.role)).length;
}

/** True when the floor has no room for one more of this role (CLAUDE.md T13 3.10). */
export function crewFull(state: GameState, role: WorkerRole): boolean {
  if (!FLOOR_ROLES.includes(role)) return false;
  return crewCount(state) + 1 > crewLimit(state);
}

/** "Crew 4 / 8, the unit takes eight": what the team page says (CLAUDE.md T13 3.10; v37). */
export function crewLine(state: GameState): string {
  const limit = crewLimit(state);
  return `Crew ${crewCount(state)} / ${limit}, the unit takes ${plural(limit, 'person', 'people')}`;
}

/** The office role every other one is hired behind. She is the base office person: emails,
 *  bookkeeping, the daily ordering, and every specialist's work at double time until he is taken
 *  on (PIOTR, CLAUDE.md T10 3.6, T7 3.12). */
export const BASE_OFFICE_ROLE: WorkerRole = 'officeAdmin';

/** True while the company has somebody on the books, or starting, who does the office. */
export function hasOfficeAdmin(state: GameState): boolean {
  return state.workers.some((worker) => worker.role === BASE_OFFICE_ROLE);
}

export function hasWorkingDay(role: WorkerRole): boolean {
  return OFFICE_ROLES.includes(role);
}

/** True for a man who works a job of work off minute by minute, the way the owner does: the
 *  office, and the helper with them (PIOTR, 16.09; CLAUDE.md T17 2.3). The helper used to clear
 *  an unload or a cleaning on the spot for nothing, in the same minute it was raised, so nobody
 *  ever saw him do it. He spends the minutes now. His day is the clock's and not a meter of his
 *  own: he is on the floor and he takes his dinner with the workshop, so only the office has the
 *  480 of `hasWorkingDay`. He goes home at five with the rest of them (CLAUDE.md T17 2.12). */
export function booksTaskMinutes(role: WorkerRole): boolean {
  return hasWorkingDay(role) || role === 'helper';
}

/** Minutes of his own day this man has left. */
export function staffMinutesLeft(worker: Worker): number {
  return Math.max(0, MINUTES_PER_WORKING_DAY - worker.minutesWorked);
}

/** What a man costs in a month, which from Turn 21 is simply what he is paid: everybody is on a
 *  monthly wage and nothing converts a week into one, so this is the field and no arithmetic
 *  (PIOTR, 19.09: "I wanted everyone monthly"; CLAUDE.md T21 2.10). Kept as the one reader the
 *  Our team row, the hiring gate and the Company board all go through, so the day a second pay
 *  cadence arrives there is one line to change (CLAUDE.md T17 2.9, 2.11). */
export function monthlyWageOf(pay: { monthlyWage: number }): number {
  return pay.monthlyWage;
}

/** One minute of this man's month, wherever he worked it: at the desk, at the bench or on the
 *  night shift. The Our team page reads his hours off it (CLAUDE.md T17 2.9). */
export function bookMonthMinute(worker: Worker): void {
  worker.monthMinutes += 1;
}

/** The month's meters on the owner and on every man, started again on the first working day of a
 *  new month: the hours worked and the days off are a month's figures (CLAUDE.md T17 2.9). The
 *  day that closed last says which month the workshop was in yesterday, so a month that turns
 *  over a weekend turns on the Monday. */
export function startMonthMeters(state: GameState): void {
  const last = state.days[state.days.length - 1];
  if (last !== undefined && monthOfDay(last.day) === monthOfDay(state.clock.day)) return;
  state.owner.monthMinutes = 0;
  state.owner.monthDaysOff = 0;
  for (const worker of state.workers) {
    worker.monthMinutes = 0;
    worker.monthDaysOff = 0;
  }
}

/** The days off of the month, counted the morning they are taken: the owner sick, away or at
 *  home, and a man off with an accident (CLAUDE.md T17 2.9). Called once a morning, after the
 *  absences of the day are known. */
export function countMonthDaysOff(state: GameState): void {
  if (!state.owner.present) state.owner.monthDaysOff += 1;
  for (const worker of state.workers) {
    if (worker.startDay > state.clock.day) continue;
    if (worker.absentDaysRemaining > 0) worker.monthDaysOff += 1;
  }
}

export function officeStaff(state: GameState): Worker[] {
  return state.workers.filter((worker) => hasWorkingDay(worker.role));
}

export function joiners(state: GameState): Worker[] {
  return state.workers.filter((worker) => worker.role === 'joiner');
}

export function helpers(state: GameState): Worker[] {
  return state.workers.filter((worker) => worker.role === 'helper');
}

/** A helper on the books and in the hall today. The unloading, the bags and the cleaning are his
 *  and nobody else's while this is true (PIOTR, 14.09; CLAUDE.md T11 3.4). */
export function helperOnDuty(state: GameState): boolean {
  return helpers(state).some((worker) => isWorkingToday(state, worker));
}

/** Where a man stands when the hall has nothing else for him. A joiner has his own bench; the
 *  helper stands at the fan when there is one and in the gate lane when there is not, because the
 *  bags and the van are his. Both are on the painted floor: (1, 1), where every man who is not a
 *  joiner used to be put, is inside the office block (CLAUDE.md T11 3.4). */
export function homeCellOf(state: GameState, worker: Worker): { x: number; y: number } {
  // A joiner's home is the bench he has now, asked of the benches as they stand, and not the one
  // written down the day he was hired: benches are bought, sold and moved, and from Turn 23 one
  // holds two or three men, so the anchor of the hiring day drew Eddie beside a rack where a bench
  // used to be (PIOTR, 21.09; v38). The anchor stays the fallback for a hall with no bench.
  if (worker.role === 'joiner') {
    const bench = benchOf(state, worker.id);
    if (bench !== null) return { x: bench.anchorX, y: bench.anchorY };
  }
  if (worker.role !== 'helper') return { x: worker.anchorX, y: worker.anchorY };
  const fan = state.equipment.find(
    (item) => item.specId === 'extractor' && itemStandsInTheHall(item),
  );
  if (fan) return { x: fan.anchorX, y: fan.anchorY };
  return { ...HELPER_HOME_CELL };
}

export function workerById(state: GameState, workerId: string): Worker | null {
  return state.workers.find((worker) => worker.id === workerId) ?? null;
}

// ---------------------------------------------------------------------------
// The two shifts (CLAUDE.md T13 3.9). A man is on the day shift or the night one, never both: he
// is in the hall by day or he is in it after the owner has gone home. One predicate says which,
// and everything that asks "who is here" asks it.
// ---------------------------------------------------------------------------

/** True while the second shift can run tonight: it is switched on and a production manager is on
 *  the books to run it. Without him there is no second shift (PIOTR; CLAUDE.md T13 3.9). */
export function secondShiftRuns(state: GameState): boolean {
  return state.shift.second && managerOnDuty(state);
}

/** Why the second shift cannot be switched on, or that it can: the one reason the team page
 *  prints and the action refuses on (CLAUDE.md T13 3.9). */
export function secondShiftCheck(state: GameState): { ok: boolean; reason: string } {
  if (managerOnDuty(state)) return { ok: true, reason: '' };
  const hired = state.workers.find((worker) => worker.role === 'productionManager');
  if (hired) {
    return {
      ok: false,
      reason: `The production manager starts on ${formatCalendarDay(hired.startDay)}`,
    };
  }
  return { ok: false, reason: 'Hire a production manager for a second shift' };
}

/** The shift this man actually works: the night one only while the second shift can run, or he
 *  would be on neither. Everybody who is not a joiner is on the day (CLAUDE.md T13 3.9). */
export function shiftOf(state: GameState, worker: Worker): Shift {
  if (worker.role !== 'joiner') return 'day';
  return secondShiftRuns(state) ? worker.shift : 'day';
}

/** On the books today and fit to work, whichever shift he is on. */
export function onTheBooksToday(state: GameState, worker: Worker): boolean {
  return worker.startDay <= state.clock.day && worker.absentDaysRemaining === 0;
}

/** On the books today, fit to work, and on this shift. The one predicate for it: the day asks
 *  it of everybody with no shift named, the night names its own, and a joiner on the second
 *  shift is never in the hall by day (CLAUDE.md T13 3.9, 10.3). */
export function isWorkingToday(state: GameState, worker: Worker, shift: Shift = 'day'): boolean {
  return onTheBooksToday(state, worker) && shiftOf(state, worker) === shift;
}

/** The men on the second shift tonight: the joiners put on it who are on the books and fit. */
export function nightCrew(state: GameState): Worker[] {
  return joiners(state).filter((worker) => isWorkingToday(state, worker, 'night'));
}

// ---------------------------------------------------------------------------
// The end of the day (PIOTR, 17.09; CLAUDE.md T17 2.12). The men go home at five, always. The
// evening is the owner's alone: he stays if he wants it, and he takes a job on by a click on the
// row, never automatically. The two hours of staff overtime of Turn 8 are gone with the rule, and
// with them the Friday overtime line and the man who had had enough of the evenings.
// ---------------------------------------------------------------------------

/** True once the hired men have gone home, which is five o'clock whatever the owner does. The one
 *  predicate for it: production, the standing contracts and the efficiency seats all ask it
 *  (PIOTR, 17.09; CLAUDE.md T17 2.12). */
export function crewHasGoneHome(state: GameState): boolean {
  return isOvertime(state.clock.minute);
}

/** The joiners of this shift who are in today and on no job. */
export function availableJoiners(state: GameState, shift: Shift = 'day'): Worker[] {
  return joiners(state).filter(
    (worker) => isWorkingToday(state, worker, shift) && worker.jobId === null,
  );
}

/** How many men's hand tool sets the cabinets standing in the hall will hold: the sum of their
 *  classes' capacities, one for a used one and eight for the industrial one
 *  [PIOTR, 19.09; CLAUDE.md T22 2.12]. A cabinet that is sold is no room at all: it stands in the
 *  hall until the buyer's van comes. */
export function toolSlots(state: GameState): number {
  return state.equipment
    .filter((item) => !isSold(item))
    .reduce((total, item) => total + toolSlotsOf(item), 0);
}

/** The same sum with everything on the lorry counted as well, which is what the hiring gate asks:
 *  a cabinet bought this morning is in by 08:00 tomorrow and the man starts then (T8 3.2). */
export function toolSlotsOwnedOrOnOrder(state: GameState): number {
  return (
    toolSlots(state) +
    state.onOrder.reduce((total, item) => total + toolSlotsOf(item), 0)
  );
}

/** Slots with somebody's tools in them: every hand tool set bought, and the owner's own set, which
 *  takes a slot like anybody's [PIOTR: "one for every worker and one for you"]. The owner's set is
 *  not an item in the hall and never was: his tools are his, and the cabinet they live in is the
 *  `+ 1` the hiring gate has counted since Turn 6 (CLAUDE.md T6 3.5, T22 2.12). */
export function toolSlotsInUse(state: GameState): number {
  const sets = state.equipment.filter(
    (item) => item.specId === HAND_TOOL_SET && !isSold(item),
  ).length;
  return sets + 1;
}

/** Slots nobody's tools are in: what the hand tool set and the hiring gate count
 *  (CLAUDE.md T22 2.12). Never below nought. */
export function freeToolSlots(state: GameState): number {
  return Math.max(0, toolSlots(state) - toolSlotsInUse(state));
}

/** How many of this cabinet's own slots are in use. The game does not write down whose tools are
 *  in which cabinet, so they fill in the order the cabinets were bought [TUNE: Claude's rule, and
 *  the only one that needs no new field]: the first cabinet takes the owner's set and then the
 *  crew's, and what is left over goes into the next one. It is what the card of a cabinet on the
 *  hall prints beside its capacity (CLAUDE.md T22 2.13). */
export function slotsInUseIn(state: GameState, item: Equipment): number {
  let left = toolSlotsInUse(state);
  for (const cabinet of state.equipment.filter((entry) => toolSlotsOf(entry) > 0 && !isSold(entry))) {
    const held = Math.min(left, toolSlotsOf(cabinet));
    if (cabinet.id === item.id) return held;
    left -= held;
  }
  return 0;
}

/** How many slots the workshop owes: one for every joiner and one for the owner, and one more when
 *  somebody is about to be taken on (CLAUDE.md T6 3.5). It counted cabinets until Turn 22, when a
 *  cabinet became one, two, four or eight of them (CLAUDE.md T22 2.12). */
export function toolSlotsNeeded(state: GameState, hiring = 0): number {
  return joiners(state).length + hiring + 1;
}

/** How many places at a bench the workshop owes: one for every joiner, one for the owner, and one
 *  more when somebody is about to be taken on. The owner is one of the men who stands at a bench
 *  and the gate never counted his place, so a shop could hire its way into a hall where the boss
 *  stood all day with nowhere to put a carcass down; Piotr's own day 128 save is that hall
 *  [PIOTR, 22.09] (CLAUDE.md T24 2.2). It is the cabinet's own rule, `toolSlotsNeeded`, in
 *  places. */
export function benchPlacesNeeded(state: GameState, hiring = 0): number {
  return joiners(state).length + hiring + 1;
}

/** Kit the workshop is short of before this hire can start, and how many of each: the first hire
 *  needs two cabinets and two places at a bench, one of each for the new man and one for the
 *  owner (CLAUDE.md T6 3.5, T24 2.2). The one count the block, the bill and the words on the card
 *  are all read off. */
export function shortfallForHire(
  state: GameState,
  role: WorkerRole,
): Array<{ specId: string; count: number }> {
  if (role !== 'joiner') return [];
  const needed = joiners(state).length + 1;
  const short: Array<{ specId: string; count: number }> = [];
  for (const specId of JOINER_PREREQUISITES) {
    // A bench that is bought and on the lorry is a bench: the man starts the next working day and
    // it lands at 08:00 that morning (CLAUDE.md T8 3.2). The cabinet is counted in slots and not in
    // cabinets from Turn 22: the shortfall is the slots the hall is short, which is the number of
    // used cabinets at a pound ninety that would put it right, and any dearer class covers more of
    // it at once (CLAUDE.md T22 2.12).
    // The bench is counted in places and not in benches from Turn 23, the way the cabinet is
    // counted in slots: a class holds one, two or three men, so the shortfall is the places the
    // hall is short, which is the number of used benches at a hundred and twenty that would put
    // it right, and any dearer class covers more of it at once (CLAUDE.md T23 2.17).
    const wanted =
      specId === TOOL_CABINET
        ? toolSlotsNeeded(state, 1)
        : specId === BENCH
          ? benchPlacesNeeded(state, 1)
          : needed;
    const has =
      specId === TOOL_CABINET
        ? toolSlotsOwnedOrOnOrder(state)
        : specId === BENCH
          ? benchPlacesOwnedOrOnOrder(state)
          : countOwnedOrOnOrder(state, specId);
    const count = wanted - has;
    if (count > 0) short.push({ specId, count });
  }
  return short;
}

/** The catalogue ids the hire is waiting on, one entry each however many are short. */
export function missingForHire(state: GameState, role: WorkerRole): string[] {
  return shortfallForHire(state, role).map((entry) => entry.specId);
}

/** What buying the shortfall comes to, every unit of it counted. */
export function missingCost(state: GameState, role: WorkerRole): number {
  return shortfallForHire(state, role).reduce(
    (total, entry) => total + entry.count * (findSpec(entry.specId)?.price ?? 0),
    0,
  );
}

/** The shortfall in plain English, so no catalogue id ever reaches the card (CLAUDE.md 3). */
export function missingLabelsForHire(state: GameState, role: WorkerRole): string[] {
  return shortfallForHire(state, role).map((entry) => {
    const name = findSpec(entry.specId)?.name ?? entry.specId;
    return entry.count > 1 ? `${name} x ${entry.count}` : name;
  });
}

/** What the card says when the workshop is not known enough for this man: who applies depends on
 *  the standing the workshop has earned, and the card says what is missing, in the game's own
 *  words (PIOTR: "excellent joiners come from reputation 60"; CLAUDE.md T20 2.5, T21 2.9). A
 *  role with no classes to it says the same thing about the trade itself. */
export function standingWanted(
  role: WorkerRole,
  tier: WorkerTier | null,
  minReputation: number,
): string {
  const who =
    tier === null ? ROLE_WORDS_MANY[role] : `${TIER_WORDS[tier]} ${ROLE_WORDS_MANY[role]}`;
  return `${who} come from reputation ${minReputation}`;
}

/** Everything the hiring modal needs, one row per role and tier. */
export function hiringOptions(state: GameState): HiringOption[] {
  return HIRING_SPECS.map((spec) => {
    const missing = missingLabelsForHire(state, spec.role);
    const benchSlotsUsed = spec.role === 'joiner' ? joiners(state).length + 1 : 0;
    let blockReason = '';
    // The figure the player reads on the board, website bonus and all: `effectiveReputation` is
    // the one function the tier tables go through, and who answers an advert is a tier table
    // (CLAUDE.md T13 3.7, T20 2.5).
    if (effectiveReputation(state) < spec.minReputation) {
      blockReason = standingWanted(spec.role, spec.tier, spec.minReputation);
    } else if (BEHIND_THE_ADMIN.includes(spec.role) && !hasOfficeAdmin(state)) {
      // Nobody in the office before the one who runs it (PIOTR, CLAUDE.md T10 3.6).
      blockReason = 'Hire an office admin first';
    } else if (spec.role === 'joiner' && benchSlotsUsed > state.unit.benchSlots) {
      blockReason = 'No free bench slot in this unit';
    } else if (crewFull(state, spec.role)) {
      // The floor limits the crew: one person per so many square metres of free floor
      // (PIOTR; CLAUDE.md T13 3.10).
      blockReason = crewLine(state);
    } else if (state.workers.length >= CANTEEN_LOCKERS) {
      // And so does the canteen: it was built with eight compartments, every man on the books
      // keeps his things in one of them, and the owner needs none. This comes before the
      // shortfall below, because a ninth locker cannot be bought either and "Buy first: Locker"
      // would send the player to a greyed line (PIOTR, 20.09; CLAUDE.md T23 2.10).
      blockReason = 'No locker for him: the canteen holds eight';
    } else if (missing.length > 0) {
      // A bench holds one, two or three men by its class from Turn 23, so a hall that has benches
      // and no room left at them is short of a place and not of a bench, and says so in those
      // words. A hall that is short of other things as well is told what to buy, as it always was
      // [PIOTR, 20.09] (CLAUDE.md T23 2.17). One rule either way: both readings are the same
      // shortfall, counted in places by `shortfallForHire`. From tonight the count is the places
      // for the joiners, for the man at the door and for the owner, who has stood at a bench since
      // the first morning and was never counted [PIOTR, 22.09] (CLAUDE.md T24 2.2).
      const short = missingForHire(state, spec.role);
      blockReason =
        short.length === 1 && short[0] === BENCH
          ? 'No place at a bench for him: the owner needs one too'
          : `Buy first: ${missing.join(', ')}`;
    } else if (state.cash < spec.monthlyWage) {
      // Last of the refusals, because it is the only one that changes by the minute: who answers
      // the advert, what the office wants first, the bench and the kit are all standing facts,
      // and the bank balance is what an owner looks at once the rest of it is ready. A man is not
      // taken on without a month of his pay in the account (PIOTR, 17.09; CLAUDE.md T17 2.11).
      blockReason = `Not enough in the bank: needs ${formatMoney(spec.monthlyWage)}`;
    }
    return {
      role: spec.role,
      tier: spec.tier,
      label: spec.label,
      rate: spec.tier ? WORKER_RATES[spec.tier] : 0,
      monthlyWage: spec.monthlyWage,
      minReputation: spec.minReputation,
      // The sentence the card prints, off the spec and off nothing else: the card kept a second
      // table of its own until tonight, and a manager of four grades needs four sentences that
      // only the spec knows (CLAUDE.md T23 2.4).
      duties: spec.duties,
      available: blockReason === '',
      blockReason,
      missing,
      missingCost: missingCost(state, spec.role),
    };
  });
}

export function canHire(
  state: GameState,
  role: WorkerRole,
  tier: WorkerTier | null,
): { ok: boolean; reason: string } {
  const option = hiringOptions(state).find(
    (entry) => entry.role === role && entry.tier === tier,
  );
  if (!option) return { ok: false, reason: 'No such job' };
  return { ok: option.available, reason: option.blockReason };
}

function nameFor(state: GameState): string {
  const taken = new Set(state.workers.map((worker) => worker.name));
  const free = WORKER_NAMES.filter((name) => !taken.has(name));
  const pool = free.length > 0 ? free : WORKER_NAMES;
  return pool[int(state, 0, pool.length - 1)] ?? 'Sam';
}

function benchAnchor(state: GameState, role: WorkerRole): { x: number; y: number } {
  // The helper's own corner of the hall, and the office door for everybody else (T11 3.4).
  if (role === 'helper') return { ...HELPER_HOME_CELL };
  // The sprayer's place is the booth, if the hall has one: he is a floor man and (1, 1) is
  // inside the office block (CLAUDE.md T19 2.6, T11 3.4).
  if (role === 'sprayer') {
    const booth = state.equipment.find(
      (item) => item.specId === SPRAY_BOOTH && itemStandsInTheHall(item),
    );
    return booth ? { x: booth.anchorX, y: booth.anchorY } : { x: 0, y: 4 };
  }
  if (role !== 'joiner') return { x: 1, y: 1 };
  // His home bench is the first with a place free. A class holds one, two or three men, so the
  // second man at a standard bench stands at the same bench as the first and is drawn there
  // (PIOTR, 20.09; CLAUDE.md T23 2.17). The crew fill the benches in the order they were hired
  // and the owner takes what is left, so the place this man gets is the one after the men already
  // on the books, and it is the answer `benchOf` will give for him every morning after.
  const bench = benchAtPlace(state, joiners(state).length);
  if (bench) return { x: bench.anchorX, y: bench.anchorY };
  return { x: 0, y: 4 };
}

/** Takes somebody on. He starts the next working day (CLAUDE.md 9.3). */
export function hire(state: GameState, role: WorkerRole, tier: WorkerTier | null): Worker | null {
  const allowed = canHire(state, role, tier);
  if (!allowed.ok) return null;
  const spec = HIRING_SPECS.find((entry) => entry.role === role && entry.tier === tier);
  if (!spec) return null;
  const anchor = benchAnchor(state, role);
  const worker: Worker = {
    id: makeId(state, 'staff'),
    name: nameFor(state),
    role,
    tier,
    rate: tier ? WORKER_RATES[tier] : 0,
    monthlyWage: spec.monthlyWage,
    startDay: addWorkingDays(state.clock.day, HIRE_START_DELAY_DAYS),
    leavesOnDay: null,
    jobId: null,
    taskId: null,
    minutesWorked: 0,
    overtimeMinutes: 0,
    overtimeMinutesWeek: 0,
    overtimeDays: 0,
    tiredOfOvertime: false,
    ordersToday: 0,
    station: STATION_IDLE,
    working: false,
    noPlaceFor: '',
    productionMinutes: 0,
    absentDaysRemaining: 0,
    anchorX: anchor.x,
    anchorY: anchor.y,
    shift: 'day',
    dayLog: [],
    idleMinutes: 0,
    idleByReason: emptyWorkerIdle(),
    accidents: 0,
    monthMinutes: 0,
    monthDaysOff: 0,
  };
  state.workers.push(worker);
  return worker;
}

/** One person's day so far, in the three runs the tile and the card paint it in: the minutes he
 *  worked, the minutes he stood, and the dinner hour he has taken, against the whole clock day
 *  they are measured out of (PIOTR, 20.09, docs/mockups/t23/team-cards.png; CLAUDE.md T23 2.13).
 *  The day meter of Turn 21's 2.8 and nothing else: nothing here counts a minute, it divides the
 *  ones already counted.
 *
 *  The owner keeps his own two counters and they are read straight. A man on the books keeps only
 *  the minutes he stood, so his worked minutes are what is left of the day that has run once the
 *  dinner hour and the standing are taken out of it. That is the same invariant the owner's own
 *  booking holds to: a minute is either worked or stood, and there are only so many of them. */
export interface DayMeter {
  worked: number;
  idle: number;
  /** The dinner hour, as much of it as has gone. */
  breakMinutes: number;
  /** The clock's whole working day, dinner included: what the bar is drawn out of. */
  total: number;
}

export function dayMeterOf(state: GameState, holder: Worker | OwnerState): DayMeter {
  const total = DAY_END_MINUTE;
  const breakMinutes = breakMinutesBefore(Math.min(state.clock.minute, total));
  if (!('role' in holder)) {
    return {
      worked: Math.max(0, holder.minutesWorked),
      idle: Math.max(0, holder.idleMinutes),
      breakMinutes: holder.breakSkipped ? 0 : breakMinutes,
      total,
    };
  }
  if (!isWorkingToday(state, holder)) return { worked: 0, idle: 0, breakMinutes: 0, total };
  const ran = workedMinutesOfDay(Math.min(state.clock.minute, total));
  const idle = Math.max(0, holder.idleMinutes);
  return { worked: Math.max(0, ran - idle), idle, breakMinutes, total };
}

// ---------------------------------------------------------------------------
// The production manager, in his four grades (PIOTR, 20.09; CLAUDE.md T23 2.4). His grade says
// three things: how many men he carries, the order he hands their work out in, and what he does
// to the pace of the men he carries. The three tables are `PRODUCTION_MANAGER_CARRIES`,
// `PRODUCTION_MANAGER_ORDER_WORDS` and `PRODUCTION_MANAGER_PACE` in the constants, and nothing
// here writes a figure of its own.
// ---------------------------------------------------------------------------

/** The men this manager carries: the men on the books in the order they were hired, as many of
 *  them as his grade's number, and nobody else. A man past that number is a man without a
 *  manager, who waits for the boss as in 2.1, which is what makes a better grade worth buying
 *  (PIOTR, 20.09; CLAUDE.md T23 2.4).
 *
 *  The owner is not counted, because 2.4 says so, and neither is the manager himself: a manager
 *  does not manage himself, and counting him would make a novice with nine joiners leave two of
 *  them standing where the brief says the ninth is the one who waits. `state.workers` is in the
 *  order the men were taken on, so the array's own order is the hiring order. */
export function menCarried(state: GameState): Worker[] {
  const manager = managerOnDutyNow(state);
  if (manager === null || manager.tier === null) return [];
  const under = state.workers.filter((worker) => worker.id !== manager.id);
  return under.slice(0, PRODUCTION_MANAGER_CARRIES[manager.tier]);
}

/** True while this man has a manager over him: he is one of the men his grade carries. */
export function hasManager(state: GameState, worker: Worker): boolean {
  return menCarried(state).some((carried) => carried.id === worker.id);
}

/** What the manager does to this man's production minutes: his grade's pace factor, or 1 for a
 *  man he does not carry and for every man in a workshop with no manager. It multiplies the
 *  minute the way a tier's rate does, on the one path in `hands`, and it is what the efficiency
 *  breakdown prints as `Manager: +5%` (CLAUDE.md T23 2.4). */
export function managerPaceFor(state: GameState, worker: Worker): number {
  const manager = managerOnDutyNow(state);
  if (manager === null || manager.tier === null) return 1;
  return hasManager(state, worker) ? PRODUCTION_MANAGER_PACE[manager.tier] : 1;
}

/** The open jobs in the order this grade hands them out. The novice takes the board's own order,
 *  which is the order the work was taken on, so the oldest open job is first; every grade above
 *  him sorts by the day it is due and keeps the board's order between two jobs due the same day
 *  (CLAUDE.md T23 2.4). */
function jobsInManagerOrder(state: GameState, tier: WorkerTier): Job[] {
  const open = state.jobs.filter(
    (job) => (job.stage === 'ready' || job.stage === 'inProduction') && job.assignees.length === 0,
  );
  if (tier === 'novice') return open;
  return open
    .map((job, index) => ({ job, index }))
    .sort((a, b) => a.job.dueDay - b.job.dueDay || a.index - b.index)
    .map((entry) => entry.job);
}

/** The next job for the next man, out of the ones still open, in this grade's way.
 *
 *  The novice and the experienced man take the first of their own order and think no further. The
 *  senior and the master will not send a second man to a machine family another job already wants
 *  a place at while another job's bench work is standing open: they look past the front runner for
 *  a job whose current stage needs no machine at all, and take that instead [PIOTR's rule, 20.09;
 *  the places of CLAUDE.md T25 2.1]. */
function pickJobForManager(
  state: GameState,
  open: readonly Job[],
  tier: WorkerTier,
  wanted: ReadonlySet<string>,
): Job | null {
  const first = open[0] ?? null;
  if (first === null || tier === 'novice' || tier === 'experienced') return first;
  const family = machineWantedFor(state, first);
  if (family === null || !wanted.has(family)) return first;
  return open.find((job) => machineWantedFor(state, job) === null) ?? first;
}

/** The machine families the jobs already on the go want a place at: one entry per job with a man
 *  on it whose current stage wants a machine. What the senior's rule is read against. */
function machinesAlreadyWanted(state: GameState): Set<string> {
  const wanted = new Set<string>();
  for (const job of state.jobs) {
    if (job.assignees.length === 0) continue;
    const family = machineWantedFor(state, job);
    if (family !== null) wanted.add(family);
  }
  return wanted;
}

/** A free joiner of this shift takes a job only while a production manager is on duty to put him
 *  on it, and only while he is one of the men that manager's grade carries (PIOTR, 20.09: "a man
 *  works when the boss puts him on a job"; CLAUDE.md T23 2.1, 2.4). Without a manager, and for a
 *  man past his number, nothing happens here at all: he waits at his bench for the owner's click
 *  in the Work Plan, which is the `ASSIGN_JOB` action and costs nobody a minute.
 *
 *  The order the jobs are handed out in is the manager's grade's, and the assignment itself goes
 *  through the one path in jobs.ts. The day asks for the day men; the night asks for its own, so
 *  the work plan gives a night man his job the way it gives a day man his (CLAUDE.md T13 3.9). */
export function autoAssignJobs(state: GameState, shift: Shift = 'day'): void {
  const tier = managerTier(state);
  if (tier === null) return;
  const carried = new Set(menCarried(state).map((worker) => worker.id));
  let open = jobsInManagerOrder(state, tier);
  const wanted = machinesAlreadyWanted(state);
  for (const worker of availableJoiners(state, shift)) {
    if (!carried.has(worker.id)) continue;
    const job = pickJobForManager(state, open, tier, wanted);
    if (job === null) return;
    assignJob(state, job.id, worker.id);
    open = open.filter((entry) => entry.id !== job.id);
    const family = machineWantedFor(state, job);
    if (family !== null) wanted.add(family);
  }
}

/** The master's re plan, and no other grade's: at every hour he looks at the board again and
 *  moves a man off a job that is comfortably ahead of its deadline onto one that is behind
 *  (PIOTR, 20.09; CLAUDE.md T23 2.4). The two gaps are `MANAGER_AHEAD_DAYS` and
 *  `MANAGER_BEHIND_DAYS`, in working days of the work plan's own axis, and the whole day of slack
 *  is what stops him swapping a man every hour over a projection that moved by a minute.
 *
 *  One man a re plan. He is moved through `addToJob`, which takes him off what he was on, so the
 *  job that is behind gains a pair of hands rather than losing the man it already had. Only a man
 *  the manager carries is moved, and never the owner: the owner's bench is his own business
 *  (CLAUDE.md T23 2.3). */
export function managerReplans(state: GameState): void {
  if (managerTier(state) !== 'master') return;
  if (state.clock.minute % MANAGER_REPLAN_MINUTES !== 0) return;
  const rows = workPlan(state).rows;
  const slackOf = (jobId: string): number | null => {
    const row = rows.find((entry) => entry.jobId === jobId);
    return row === undefined ? null : row.duePoint - row.to;
  };
  const behind = state.jobs.find((job) => {
    if (job.stage !== 'ready' && job.stage !== 'inProduction') return false;
    const slack = slackOf(job.id);
    return slack !== null && slack <= -MANAGER_BEHIND_DAYS;
  });
  if (behind === undefined) return;
  for (const worker of menCarried(state)) {
    if (worker.jobId === null || worker.jobId === behind.id) continue;
    if (!isWorkingToday(state, worker)) continue;
    const slack = slackOf(worker.jobId);
    if (slack === null || slack < MANAGER_AHEAD_DAYS) continue;
    if (addToJob(state, behind.id, worker.id)) return;
  }
}

/** True while this man is standing about because nobody has put him on anything: he is in today,
 *  he builds for a living, he holds no job and no chore, and there is no manager on duty to hand
 *  him one. This is the one reading of it: the mark over his head, the crew column of the Work
 *  Plan and the idle minute on his day meter all ask this and none of them works it out again
 *  (PIOTR, 20.09; CLAUDE.md T23 2.1).
 *
 *  A man already on a job is not waiting, whatever else is on the board: he stays on it to its
 *  end, and he carries it into tomorrow morning without a click, because nothing takes it off
 *  him. */
export function waitsForTheBoss(state: GameState, worker: Worker): boolean {
  if (!PRODUCING_ROLES.includes(worker.role)) return false;
  if (!isWorkingToday(state, worker)) return false;
  if (worker.jobId !== null || worker.taskId !== null) return false;
  // Not "is there a manager" but "is there a manager over HIM": a man past his grade's number is
  // a man without a manager, and he waits exactly as he would in a workshop with none
  // (CLAUDE.md T23 2.4).
  return !hasManager(state, worker);
}

/** A man's day meter, empty: the minutes he stood and the reasons they went to. One maker, read
 *  by the hire, by the morning and by a save being lifted, so a reason added to the list is added
 *  in one place (CLAUDE.md T23 2.1). */
export function emptyWorkerIdle(): Record<WorkerIdleReason, number> {
  const empty = {} as Record<WorkerIdleReason, number>;
  for (const reason of WORKER_IDLE_REASONS) empty[reason.id] = 0;
  return empty;
}

/** Books the minute just gone onto this man's day as one he stood through, with its reason. The
 *  owner's own is `spendOwnerIdleMinute` in owner.ts and this is its twin (CLAUDE.md T23 2.1). */
export function spendWorkerIdleMinute(worker: Worker, reason: WorkerIdleReason): void {
  worker.idleMinutes += 1;
  worker.idleByReason[reason] += 1;
}

// ---------------------------------------------------------------------------
// The week, man by man (PIOTR; CLAUDE.md T20 2.7). Our team says what this week was and what last
// week was: the hours, where they went, the pieces a contract took off him, the jobs he stood at
// and the one efficiency figure of the week. The meters are filled a minute at a time by the
// sampler in `src/engine/tasks.ts`, which is the one hook the day already runs over the crew
// every minute, and they roll over on the first minute of a new week.
// ---------------------------------------------------------------------------

/** The order the row prints them in. */
export const WEEK_CATEGORIES: ReadonlyArray<WeekCategory> = [
  'jobs',
  'contracts',
  'unloading',
  'cleaning',
  'desk',
  'site',
];

/** What his own counters say he has put in: the bench and contract minutes the production runner
 *  raises and the task minutes the task runner raises. The one reading of whether the minute just
 *  gone was worked at all: a man at an empty rack, or one standing at a saw another man is on,
 *  keeps his job and his task and raises neither (CLAUDE.md T20 2.7). */
export function effortSoFar(holder: Worker | OwnerState): { bench: number; task: number } {
  return { bench: holder.productionMinutes, task: holder.minutesWorked };
}

/** Who carries a week: a man on the books or the owner. Both declare the two fields and the bench
 *  counter a fresh week seeds itself off, so there is no cast (CLAUDE.md T20 2.7). */
export type WeekHolder = Worker | OwnerState;

function freshMeters(week: number, bench: number): WeekMeters {
  return {
    week,
    minutes: { jobs: 0, contracts: 0, unloading: 0, cleaning: 0, desk: 0, site: 0 },
    paidMinutes: 0,
    waitedFor: {},
    pieces: 0,
    jobs: [],
    day: 0,
    minute: -1,
    seenBench: bench,
    seenTask: 0,
  };
}

/** The meters of the week in hand, made and rolled over if the week has turned. The write side:
 *  only the sampler calls it. A new week starts from where his bench counter stands, so the first
 *  minute of it is not credited with every minute he has ever worked. */
export function weekMetersOf(holder: WeekHolder, week: number): WeekMeters {
  const held = holder.weekNow;
  if (held !== undefined && held.week === week) return held;
  if (held !== undefined) holder.weekBefore = held;
  holder.weekNow = freshMeters(week, holder.productionMinutes);
  return holder.weekNow;
}

/** This week's meters, or null while nothing has been counted into them. Read only: the page asks
 *  this and never the one above, because a render writes nothing. */
export function weekNowOf(holder: WeekHolder, week: number): WeekMeters | null {
  const held = holder.weekNow;
  return held !== undefined && held.week === week ? held : null;
}

/** Last week's meters, or null. The week before this one is either the pair that has been rolled
 *  aside or the one still in hand from a week nobody has played into yet. */
export function weekBeforeOf(holder: WeekHolder, week: number): WeekMeters | null {
  if (holder.weekNow !== undefined && holder.weekNow.week === week - 1) return holder.weekNow;
  const before = holder.weekBefore;
  return before !== undefined && before !== null && before.week === week - 1 ? before : null;
}

/** The minutes of the week, all six bands of them: the hours the row prints. */
export function weekWorkedMinutes(meters: WeekMeters): number {
  return WEEK_CATEGORIES.reduce((total, band) => total + meters.minutes[band], 0);
}

// ---------------------------------------------------------------------------
// Letting a man go (PIOTR, 18.09: "how do I fire people?"; CLAUDE.md T20 2.4). He works a week's
// notice out, he is paid for it, and the morning after his last day his jobs and his contracts
// are short of a man and the plan says so. It costs no reputation: a workshop that cannot carry
// somebody lets him go, and the trade thinks nothing of it.
// ---------------------------------------------------------------------------

/** Why this man cannot be let go, or that he can. The one refusal: the row asks it before it
 *  draws the control, so a button the engine would refuse is never drawn (CLAUDE.md T4 3.2). */
export function letGoCheck(state: GameState, workerId: string): { ok: boolean; reason: string } {
  const worker = workerById(state, workerId);
  if (!worker) return { ok: false, reason: 'No such person' };
  if (worker.leavesOnDay !== null) {
    return { ok: false, reason: `leaves on ${formatCalendarDay(worker.leavesOnDay)}` };
  }
  return { ok: true, reason: '' };
}

/** Gives him his notice. He stays on the books, on his job and on his contract, and is paid, to
 *  the end of the last day of it; `runStaffDayStart` is what walks him out of the gate the
 *  morning after (CLAUDE.md T20 2.4). */
export function letGo(state: GameState, workerId: string): boolean {
  if (!letGoCheck(state, workerId).ok) return false;
  const worker = workerById(state, workerId);
  if (!worker) return false;
  worker.leavesOnDay = state.clock.day + LET_GO_NOTICE_DAYS;
  return true;
}

/** The morning the notice is up: he is off the books, off his job and off his contract, and what
 *  he was holding goes back on the list for somebody else. The plan draws his jobs with nobody on
 *  them, which is the hole the player has to fill (CLAUDE.md T20 2.4). */
function walkOutTheGone(state: GameState): Worker[] {
  const gone = state.workers.filter(
    (worker) => worker.leavesOnDay !== null && worker.leavesOnDay < state.clock.day,
  );
  for (const worker of gone) {
    const job = worker.jobId === null ? null : findJob(state, worker.jobId);
    if (job) takeOffJob(state, job.id, worker.id);
    // The contracts are told here and not through `assignContract`, because contracts.ts reads
    // this module and the two cannot read each other (REPORT-T20.md, what was not done).
    for (const contract of state.contracts) {
      contract.assigned = contract.assigned.filter((id) => id !== worker.id);
    }
    if (worker.taskId !== null) {
      const task = state.tasks.find((entry) => entry.id === worker.taskId);
      if (task) task.doneBy = null;
      worker.taskId = null;
    }
    // `workerQuit` is the one kind the game has for a man going off the books. It was written for
    // the overtime quit of Turn 8, which went with the evenings in Turn 17, and nothing has raised
    // it since; a man let go leaves by the same gate (GameEventKind is in the frozen types.ts,
    // and REPORT-T20.md says so under what was not done).
    queueEvent(state, {
      kind: 'workerQuit',
      title: 'He has gone',
      body: `${worker.name} has worked his notice out and left. Anything he was on is nobody\u0027s now.`,
      data: { workerId: worker.id, name: worker.name },
    });
  }
  if (gone.length > 0) {
    const ids = new Set(gone.map((worker) => worker.id));
    state.workers = state.workers.filter((worker) => !ids.has(worker.id));
  }
  return gone;
}

/** Counts down an injured joiner's days off and hands everybody a fresh day. What a man did not
 *  finish yesterday he is still holding this morning (CLAUDE.md T2 3.8). The men whose notice ran
 *  out yesterday are walked out first: they are not handed a day (CLAUDE.md T20 2.4). */
export function runStaffDayStart(state: GameState): void {
  walkOutTheGone(state);
  for (const worker of state.workers) {
    if (worker.absentDaysRemaining > 0) worker.absentDaysRemaining -= 1;
    worker.minutesWorked = 0;
    worker.ordersToday = 0;
    worker.dayLog = [];
    // And a blank grey segment with it: the minutes he stood are today's and no other day's
    // (CLAUDE.md T21 2.8, T23 2.1).
    worker.idleMinutes = 0;
    worker.idleByReason = emptyWorkerIdle();
  }
}

// ---------------------------------------------------------------------------
// Getting hurt (CLAUDE.md 9.7, T13 3.9). One path for a man who is hurt, by day or by night: the
// day's roll in game.ts and the night's here both put him through it.
// ---------------------------------------------------------------------------

/** Puts this man off for the accident's days, takes him off his job, tells the player and, with
 *  no liability cover, brings the claim (CLAUDE.md 9.7, T13 3.15). */
export function hurtWorker(
  state: GameState,
  worker: Worker,
  options: { night?: boolean } = {},
): void {
  worker.absentDaysRemaining = ACCIDENT_DAYS_OFF;
  // One more against his name, for the line his card prints. Nothing in the state counted them
  // before tonight and the card is asked to say how many he has had (CLAUDE.md T23 2.13).
  worker.accidents += 1;
  // He comes off the job and nobody else does: one man cutting his hand does not stop a job four
  // men are standing at (CLAUDE.md T19 2.5). The job falls back to the list only if he was the
  // last on it.
  const job = worker.jobId ? findJob(state, worker.jobId) : null;
  if (job) takeOffJob(state, job.id, worker.id);
  const where = options.night === true ? 'on the night shift, with nobody to see it' : 'in all that mess';
  queueEvent(state, {
    kind: 'accident',
    title: options.night === true ? 'Accident on the night shift' : 'Accident in the hall',
    body: `${worker.name} has been hurt ${where}. He is off for ${ACCIDENT_DAYS_OFF} days.`,
    data: { workerId: worker.id, days: ACCIDENT_DAYS_OFF, night: options.night === true },
  });
  onAccident(state, worker.name);
}

/** The night's error chance: the day's accident roll, doubled, with the owner not there to see
 *  the hall (PIOTR: "the error chance is doubled"; CLAUDE.md T13 3.9). Rolled once a night over
 *  the men who worked it, in a hall that is dangerous. The man hurt, or null. */
export function rollNightAccident(state: GameState, crew: readonly Worker[]): Worker | null {
  if (crew.length === 0 || !accidentRisk(state)) return null;
  if (!chance(state, ACCIDENT_CHANCE_PER_DAY * NIGHT_ERROR_FACTOR)) return null;
  const worker = crew[int(state, 0, crew.length - 1)];
  if (!worker) return null;
  hurtWorker(state, worker, { night: true });
  return worker;
}

/** The same doubling on the machines the night ran: every one of them past its service or its
 *  endurance can give up at twice the day's chance (CLAUDE.md T13 3.9). Returns what broke, for
 *  the repair task and the event, which game.ts raises. Not called by `runNightShift` itself
 *  until the day end raises them (the note for phase C says where). */
export function rollNightBreakdowns(state: GameState, usedMachineIds: readonly string[]): Equipment[] {
  const broken: Equipment[] = [];
  for (const id of usedMachineIds) {
    const item = state.equipment.find((entry) => entry.id === id);
    if (!item) continue;
    if (!chance(state, overdueBreakdownChance(item, state.clock.day) * NIGHT_ERROR_FACTOR)) continue;
    const gone = breakMachine(state, id);
    if (gone) broken.push(gone);
  }
  return broken;
}

// ---------------------------------------------------------------------------
// The second shift (CLAUDE.md T13 3.9). "A small firm runs a second shift out of necessity, not
// luxury, because it cannot make the deadline" (PIOTR).
// ---------------------------------------------------------------------------

/** What the night costs on top of a man's month: his hourly wage, which is his month over the hours
 *  a month of him is, for the hours of the shift, at the night rate less the one his wage already
 *  pays. The monthly wage goes out on the last working day of the month and covers his hours
 *  whichever shift they are on; the night's premium is the quarter on top, booked the night it is
 *  worked (PIOTR: 1.25 of salary for those hours; CLAUDE.md T13 3.9, T21 2.10). */
export function nightPremiumFor(worker: Worker): number {
  const hourly = worker.monthlyWage / WORKER_HOURS_PER_MONTH;
  const premium = hourly * (SECOND_SHIFT_MINUTES / 60) * (NIGHT_RATE - 1);
  return Math.round(premium * 100) / 100;
}

/** What the night did, for the day end and for the events game.ts raises after it. */
export interface NightReport {
  /** True when the shift ran: it was on, a manager was on the books, and it was a working day. */
  ran: boolean;
  /** The men who were on it, by id. */
  crew: string[];
  /** Person minutes that went into jobs. */
  minutes: number;
  /** The premium booked to the ledger as `wagesNight`. */
  premium: number;
  /** Jobs the night finished: they stand at the gate in the morning. */
  finished: Job[];
  /** The bag store filled during the night. */
  bagsFull: boolean;
  /** A man was hurt on the shift. */
  hurt: Worker | null;
  /** Every machine somebody stood at tonight, for the breakdown roll. */
  usedMachineIds: string[];
}

function noNight(): NightReport {
  return {
    ran: false,
    crew: [],
    minutes: 0,
    premium: 0,
    finished: [],
    bagsFull: false,
    hurt: null,
    usedMachineIds: [],
  };
}

/** The second shift: the men on it work after the day, at the night rate, with the owner absent
 *  from the hall, only while a production manager is on the books and the switch is on
 *  (CLAUDE.md T13 3.9). Called by the day end once the owner has gone home. The night puts its
 *  minutes into the same jobs by the same arithmetic as the day (`workMinute`), on the jobs the
 *  work plan gives the men, and the premium goes on the ledger the night it is worked. Quality
 *  and the error chance are the night's own: every minute is written on the job as a night one,
 *  and the accident roll is doubled. */
export function runNightShift(state: GameState): NightReport {
  if (!secondShiftRuns(state) || !isWorkingDay(state.clock.day)) return noNight();
  const crew = nightCrew(state);
  if (crew.length === 0) return noNight();
  const report: NightReport = { ...noNight(), ran: true, crew: crew.map((worker) => worker.id) };
  const used = new Set<string>();
  for (let minute = 0; minute < SECOND_SHIFT_MINUTES; minute += 1) {
    autoAssignJobs(state, 'night');
    const working = hands(state, { owner: false, shift: 'night' });
    if (working.length === 0) break;
    const done = workMinute(state, working, { night: true });
    report.minutes += done.worked;
    report.finished.push(...done.finished);
    report.bagsFull = report.bagsFull || done.bagsFull;
    for (const id of done.usedMachineIds) used.add(id);
  }
  report.usedMachineIds = [...used];
  // The night men go home and nobody is at a place overnight: a plan with nobody in it, and the
  // morning's is worked out when the day opens (CLAUDE.md T25 2.3).
  planPlaces(state, 'night', []);
  // The premium is for the shift the man turned up for, not for the minutes the rack let him
  // work: he is paid to be there (CLAUDE.md T13 1, nothing is free).
  const premium = Math.round(crew.reduce((sum, worker) => sum + nightPremiumFor(worker), 0) * 100) / 100;
  if (premium > 0) {
    charge(state, 'wagesNight', 'Night shift premium', -premium, { unavoidable: true });
    report.premium = premium;
  }
  report.hurt = rollNightAccident(state, crew);
  return report;
}
