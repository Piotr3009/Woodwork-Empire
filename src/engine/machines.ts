// Machine queries. The bag, extractor and dust behaviour lands in T1-09; what is here is the
// ownership and power side that the economy needs.

import {
  CENTRAL_EXTRACTION_SPECS,
  DUST_BANDS,
  DUST_OUTPUT_M3_PER_HOUR,
  EXTRACTOR_BAGS,
  bagsToM3,
  BUILDING_ROLES,
  HEAVY_SPECS,
  LIGHT_CLASSES,
  LOW_AIR_FACTOR,
  EXTRACTOR_BROKEN_OUTPUT_FACTOR,
  BREAK_SKIP_FACTOR,
  BY_HAND_DURATION_FACTOR,
  GATE_CROWD_FACTOR,
  GATE_CROWD_LIMIT,
  GATE_OUTPUT_BONUS,
  GATE_PRICE,
  MACHINE_REPAIR_COST_FRACTION,
  OVERDUE_BREAKDOWN_CHANCE,
  SERVICE_COST_FRACTION,
  SERVICE_INTERVAL_DAYS,
  SERVICE_INTERVAL_MONTHS,
  MACHINE_HOURS_PER_MONTH,
  TIER_WORDS,
  MACHINE_PACE,
  MACHINE_CAPACITY,
  MACHINE_PLACES,
  PACED_FAMILIES,
  DUST_HIGH_THRESHOLD,
  DUST_MAX,
  DUST_PER_PRODUCTION_MINUTE,
  ENDURANCE_MINUTES_BY_CLASS,
  EQUIPMENT_SPECS,
  EXTRACTOR_REPAIR_COST,
  EXTRACTOR_BREAKDOWN_CHANCE,
  EXTRACTOR_BREAKDOWN_CHANCE_HIGH_DUST,
  EXTRACTOR_BROKEN_DUST_MULTIPLIER,
  HELPER_REQUIRED_FROM_JOINERS,
  MACHINE_SHORT_WORDS,
  NO_DUCTING_SPECS,
  DUST_PER_SAWDUST_PILE,
  NO_HELPER_DUST_MULTIPLIER,
  NO_HELPER_PRODUCTIVITY_FACTOR,
  PROPERTY_INSURANCE_RATE_YEARLY,
  PAST_LIFE_WEEK_HOURS,
  PRODUCING_ROLES,
  SALE_FRACTION,
  SERVICE_LIFE_EXTENSION,
  UNDER_EXTRACTION_DUST_MULTIPLIER,
  UNDER_EXTRACTION_OUTPUT_PENALTY,
  SALE_FRACTION_USED,
  TOOL_CABINET,
  TOOL_CABINET_SLOTS,
  USED_VARIANT,
  PRODUCTION_MANAGER_PACE,
  BAGS_HELPER_EMPTY_AT,
} from './constants';
import { weekOfDay, monthOfDay, nextWorkingDay } from './clock';
import { canAfford } from './economy';
// The manager's grade, off owner.ts, which is the module every layer can reach: staff.ts reads
// this module, so the manager cannot be asked for from there (CLAUDE.md T23 2.4).
import { managerTier, ownerEfficiency } from './owner';
import {
  airBlockFor,
  airCheck,
  airDemandOf,
  compressorFor,
  compressorIsLow,
  extractionCapacityOf,
  familyAirBlock,
  extractionCheck,
  extractionDemandOf,
  isConnectedToExtraction,
  underExtracted,
} from './media';
// The words of "Who made it today" are the words the rest of the game already has for a man, his
// stage and the job he was locked out of the machines on, so the block is read out of the same
// selectors the hall, the Work Plan and the board read. stages.ts and catalog.ts both read this
// module in turn; nothing here is called while a module is being evaluated, so the pair of rings
// is the one media.ts has always made with it (CLAUDE.md T24 2.1).
import { lockReasonFor, template } from './catalog';
import { jobHeldBy } from './jobs';
import { stageOfMan } from './production';
import { contractOfWorker, contractPiece, contractStageFamilyOf } from './contracts';
import { jobPace, stageDoing, stagePlanFor, tradeFactor } from './stages';
import { isWorkingToday, nightCrew } from './staff';
import type { StagePlan } from './stages';
import type { AirCheck } from './media';
import { andList, cubicMetres, trimmed } from './text';
import type {
  Equipment,
  EquipmentSpec,
  EquipmentVariant,
  GameState,
  Orientation,
  WorkerTier,
} from './types';

export function specOf(specId: string): EquipmentSpec {
  const spec = EQUIPMENT_SPECS.find((entry) => entry.id === specId);
  if (!spec) throw new Error(`unknown equipment: ${specId}`);
  return spec;
}

export function findSpec(specId: string): EquipmentSpec | null {
  return EQUIPMENT_SPECS.find((entry) => entry.id === specId) ?? null;
}

/** What a man calls this family of machine: the trade's own short word where
 *  `MACHINE_SHORT_WORDS` has one, and the catalogue's name lowercased where it has not (PIOTR's
 *  drawing, 19.09, "the saw"; CLAUDE.md T21 2.6, 2.7). The one reader of the table: `placeLine`
 *  in production.ts builds `no place at the saw` off it, and the mark over a man's head fills its
 *  `{machine}` slot from here, so the two can never say different words (CLAUDE.md T25 2.3). */
export function machineShortWord(specId: string): string {
  return MACHINE_SHORT_WORDS[specId] ?? (findSpec(specId)?.name ?? specId).toLowerCase();
}

/** True for the two orientations that lie across the picture as drawn: a quarter turn and three
 *  quarter turns swap the width and the depth, half a turn swaps nothing (CLAUDE.md T22 2.11). The
 *  one place the question is asked, so the footprint, the zone and the sprite canvas cannot
 *  disagree about it. */
export function swapsSides(orientation: Orientation): boolean {
  return orientation === 1 || orientation === 3;
}

/** What a class of a family stands on, in metres: the picture's own footprint. A class that says
 *  nothing takes the family's (CLAUDE.md T7 3.3). */
export function footprintOf(
  specId: string,
  variantId?: string,
  orientation: Orientation = 0,
): { width: number; depth: number; height: number } {
  const spec = findSpec(specId);
  if (!spec) return { width: 1, depth: 1, height: 1 };
  const variant = variantOf(spec, variantId ?? spec.variants[0]?.id ?? '');
  const width = variant.width ?? spec.width;
  const depth = variant.depth ?? spec.depth;
  const across = swapsSides(orientation);
  return {
    width: across ? depth : width,
    depth: across ? width : depth,
    height: variant.height ?? spec.height,
  };
}

/** The same question of something already standing in the hall, which knows how it is turned. */
export function itemFootprint(item: {
  specId: string;
  variantId: string;
  orientation?: Orientation;
}): { width: number; depth: number; height: number } {
  return footprintOf(item.specId, item.variantId, item.orientation ?? 0);
}

/** The floor a class reserves, in metres: the working room around it, which contains the
 *  footprint. Nothing may be built on it (CLAUDE.md T7 3.3). */
export function zoneOf(
  specId: string,
  variantId?: string,
  orientation: Orientation = 0,
): { width: number; depth: number } {
  const spec = findSpec(specId);
  if (!spec) return { width: 1, depth: 1 };
  const variant = variantOf(spec, variantId ?? spec.variants[0]?.id ?? '');
  const width = variant.zoneWidth ?? spec.zoneWidth;
  const depth = variant.zoneDepth ?? spec.zoneDepth;
  const across = swapsSides(orientation);
  return { width: across ? depth : width, depth: across ? width : depth };
}

/** The same question of something already standing in the hall. */
export function itemZone(item: {
  specId: string;
  variantId: string;
  orientation?: Orientation;
}): { width: number; depth: number } {
  return zoneOf(item.specId, item.variantId, item.orientation ?? 0);
}

/** Working days between the click and the lorry for this class (CLAUDE.md T8 3.2). Zero means it
 *  comes back with the owner from the trip, the way everything did in Turn 7. The one place the
 *  question is asked: the catalogue tile, the order itself and the shopping list all read it. */
export function deliveryDaysFor(specId: string, variantId?: string): number {
  const spec = findSpec(specId);
  if (!spec) return 0;
  const variant = variantOf(spec, variantId ?? spec.variants[0]?.id ?? '');
  return variant.deliveryDays ?? spec.deliveryDays;
}

/** Heavy kit: what two men cannot pick up. The one predicate for it, asked by the unloading at
 *  the gate and by the bill for moving the hall alike (CLAUDE.md T8 3.2, 3.4). */
export function isHeavy(specId: string, variantId?: string): boolean {
  if (!HEAVY_SPECS.includes(specId)) return false;
  // Nothing that is kept in a tool cabinet is heavy: a hand edgebander is lifted onto a bench.
  if (!standsInTheHall(specId, variantId)) return false;
  const light = LIGHT_CLASSES[specId] ?? [];
  return variantId === undefined || !light.includes(variantId);
}

/** What one class adds to the property premium a year, at the rate the cover is written at: the
 *  insurance line of its card (CLAUDE.md T13 3.1, 3.15). B1's `propertyPremiumYearly` reads the
 *  whole hall off the same constant; this is the one rate on one price, so the card and the
 *  Insurance tab cannot disagree about what a machine costs to cover. */
export function insuranceAddedYearly(price: number): number {
  return Math.round(price * PROPERTY_INSURANCE_RATE_YEARLY * 100) / 100;
}

/** What one class costs to insure a year: its own figure where it has one, the vans, whose better
 *  classes are the cheaper to cover [PIOTR, 24.09] (v54), and the property rate on its price
 *  otherwise. The card and the premium both read this. */
export function insuranceForClass(variant: { price: number; insuranceYearly?: number }): number {
  return variant.insuranceYearly ?? insuranceAddedYearly(variant.price);
}

/** The same question of something already bought, in the hall or still on its way. */
export function itemIsHeavy(item: { specId: string; variantId: string }): boolean {
  return isHeavy(item.specId, item.variantId);
}

/** Does this class hold cells of the floor at all? A hand edgebander does not: it is kept in a
 *  tool cabinet and used at the bench (CLAUDE.md T6 3.5, T7 3.6). The one place that is asked:
 *  the floor plan, the painting, the stations and the ducting all read it. */
export function standsInTheHall(specId: string, variantId?: string): boolean {
  const zone = zoneOf(specId, variantId);
  return zone.width > 0 && zone.depth > 0;
}

/** The same question of a machine that is already in the hall. */
export function itemStandsInTheHall(item: { specId: string; variantId: string }): boolean {
  return standsInTheHall(item.specId, item.variantId);
}

/** Sheets this one holds: its class, or the family's own figure. */
export function sheetCapacityOf(item: { specId: string; variantId: string }): number {
  const spec = findSpec(item.specId);
  if (!spec) return 0;
  return variantOf(spec, item.variantId).sheetCapacity ?? spec.sheetCapacity;
}

/** How many men's hand tool sets this class of tool cabinet holds: one, one, two, four or eight up
 *  the ladder [PIOTR, 19.09]. Zero for everything that is not a cabinet, so the sum over a hall is
 *  the sum over its cabinets (CLAUDE.md T22 2.12). */
export function toolSlotsOf(item: { specId: string; variantId: string }): number {
  if (item.specId !== TOOL_CABINET) return 0;
  return TOOL_CABINET_SLOTS[item.variantId] ?? 0;
}

/** What the catalogue's card of a class of cabinet says it is for, in the words the rack's card
 *  uses for its sheets: `Holds 4 men's tools` (CLAUDE.md T22 2.12). Empty for everything else. */
export function toolSlotsLine(specId: string, variantId: string): string {
  const slots = toolSlotsOf({ specId, variantId });
  if (slots <= 0) return '';
  return `Holds ${slots} ${slots === 1 ? 'man\u0027s' : 'men\u0027s'} tools`;
}

/** What must be owned before a class can be bought. A class may say its own, which is how a floor
 *  edgebander wants extraction where a hand one wants a cabinet (CLAUDE.md T7 3.6). */
export function requiresFor(spec: EquipmentSpec, variant: EquipmentVariant): string[] {
  return variant.requires ?? spec.requires;
}

export function requiresOneOfFor(spec: EquipmentSpec, variant: EquipmentVariant): string[] {
  return variant.requiresOneOf ?? spec.requiresOneOf;
}

// ---------------------------------------------------------------------------
// A machine is places (PIOTR, 21.09; CLAUDE.md T25 2.1). It is not a thing one man takes: it is a
// number of places to work, by its class, and the hall's places decide how many men can work at
// once. Nobody queues and nobody holds anything; the day plan in production.ts gives the places
// out and this module counts them.
// ---------------------------------------------------------------------------

/** The owner, where a man is named by id. A worker is his own id. */
export const OWNER = 'owner';

/** True when the hall has nothing of this family standing on its floor: either it owns none at
 *  all, or everything it owns is kept in a cabinet and comes out to the bench in whoever's hands
 *  want it. Neither has places, and neither needs one (CLAUDE.md T7 3.6, T25 2.3). */
export function machineIsShared(state: GameState, specId: string): boolean {
  return floorMachines(state, specId).length === 0;
}

/** Machines of this family that stand on the floor: the ones that have places. A machine
 *  that is sold is not one of them: it stops working the minute the sale is made and stands there
 *  until the buyer's van comes (CLAUDE.md T8 3.5). */
export function floorMachines(state: GameState, specId: string): Equipment[] {
  return owned(state, specId).filter((item) => itemStandsInTheHall(item) && !isSold(item));
}

/** Sold, and standing until the van comes to the gate. */
export function isSold(item: Equipment): boolean {
  return item.soldOnDay !== null;
}

/** The CNCs that carry a tool changer head (v56). A head is bolted to a CNC's own frame and holds no
 *  floor, so the heads the hall owns go on its CNCs one a machine, in the order the CNCs were
 *  bought, and a head with no CNC left to go on stays in its crate. It is what the hall draws a CNC
 *  with and nothing else: the head's 5% is the CNC stage's, on whichever machine it sits
 *  (`cncFactor`). */
export function cncsWithToolChangers(state: GameState): Set<string> {
  const heads = owned(state, 'cncHead').filter((item) => !isSold(item)).length;
  return new Set(
    floorMachines(state, 'cnc')
      .slice(0, heads)
      .map((item) => item.id),
  );
}

/** What the buyer pays for it: half what it cost, and a third and a bit for one that was second
 *  hand when it was bought (PIOTR, CLAUDE.md T8 3.5). */
export function salePriceFor(item: Equipment): number {
  const fraction = item.variantId === USED_VARIANT ? SALE_FRACTION_USED : SALE_FRACTION;
  return Math.round(item.purchasePrice * fraction);
}

/** The families the Owned tab offers a sale on: what the game calls a machine or the extraction
 *  kit, standing on the hall floor, the bench, and from Turn 20 the storage as well, the rack and
 *  the tool cabinet, which a workshop buys and sells like any other thing that stands on its floor
 *  (PIOTR, 17.09 and 18.09; CLAUDE.md T8 3.5, T19 2.8, T20 2.10). The office furniture is a
 *  fitting and not plant. A bench somebody is working at is refused by the claim on it in
 *  `canSell`; a rack with sheets on it, or with somebody at it, is refused by
 *  `storageSaleBlock` in `stations.ts`. */
export function isSellableFamily(specId: string): boolean {
  const category = findSpec(specId)?.category;
  return (
    category === 'machine' ||
    category === 'extraction' ||
    category === 'bench' ||
    category === 'storage'
  );
}

/** The sheets that would have nowhere to go if this rack went: the hall's stock less what the
 *  rest of the racks could hold (CLAUDE.md T20 2.10). With one rack in the hall, which is the
 *  workshop Piotr plays, that is every sheet on it.
 *
 *  It is `rackCapacity` of `materials.ts` less this one rack, written here because `materials.ts`
 *  reads this module and not the other way about; it is the same sum over the same
 *  `sheetCapacityOf`. Bringing the two sums into one is still open (REPORT-T20.md, what was not
 *  done). */
export function sheetsStrandedBySale(state: GameState, item: Equipment): number {
  let room = 0;
  for (const other of state.equipment) {
    // A rack that is already sold is no room at all: it stands in the hall until the buyer's van
    // comes in the morning, and counting it would let the last two racks be sold one after the
    // other on the same day with the sheets still on them (CLAUDE.md T20 2.10).
    if (other.id === item.id || isSold(other) || !itemStandsInTheHall(other)) continue;
    room += sheetCapacityOf(other);
  }
  return Math.max(0, state.stock.sheets - room);
}

/** Tools of this family that live in a cabinet: two men can have one out at once. */
export function cabinetTools(state: GameState, specId: string): Equipment[] {
  return owned(state, specId).filter((item) => !itemStandsInTheHall(item) && !isSold(item));
}

/** How many men can work at this machine at once: its class's row of `MACHINE_PLACES`, and
 *  nought for anything that is not a floor family men work at. The one reader of the table
 *  (PIOTR, 21.09; CLAUDE.md T25 2.1). */
export function placesOf(item: { specId: string; variantId: string }): number {
  return MACHINE_PLACES[item.specId]?.[item.variantId] ?? 0;
}

/** True while at least one machine of this family can be worked at this minute: one of them is
 *  not sold, not broken and not away for its service, the air it wants is there, and it makes no
 *  dust while the hall's bags are full. A family with none running has no places and its share of
 *  a job goes at the by hand pace; nobody waits for it to run again (PIOTR, 24.09: "they never
 *  wait for the saw"; v53). */
export function familyRuns(state: GameState, family: string): boolean {
  if (bestMachineOf(state, family) === null) return false;
  if (dustOutputOf(family) > 0 && bagsFull(state)) return false;
  return familyAirBlock(state, family) === '';
}

/** The machines of this family that have places this minute, in the order they were bought, which
 *  is the order they are filled in: standing in the hall, not sold, not broken and not away for
 *  its service, in a family that runs. A broken machine has no places, which is what a breakdown
 *  costs beside its repair (CLAUDE.md T20 2.9.3, T25 2.1; v53). */
export function placedMachines(state: GameState, family: string): Equipment[] {
  if (!familyRuns(state, family)) return [];
  return floorMachines(state, family).filter(
    (item) => !item.broken && !machineIsOut(item, state.clock.day),
  );
}

/** Every place at this family in the hall: the places of each of its machines that has any,
 *  added up (CLAUDE.md T25 2.1). */
export function hallPlaces(state: GameState, family: string): number {
  return placedMachines(state, family).reduce((total, item) => total + placesOf(item), 0);
}

/** The machine the man at this place of the family works at, and which of its own places he
 *  is at: the machines in the order they were bought, each filled up to its places, so the
 *  second man at a two place saw is at its second place and the third is at the second saw
 *  [PIOTR: "with two saws let them go to the second one"]. Null past the hall's last place. The
 *  figure loop and the machine's card both read this (CLAUDE.md T25 2.5, 2.6). */
export function machineForPlace(
  state: GameState,
  family: string,
  index: number,
): { item: Equipment; place: number } | null {
  if (index < 0) return null;
  let left = index;
  for (const item of placedMachines(state, family)) {
    const places = placesOf(item);
    if (left < places) return { item, place: left };
    left -= places;
  }
  return null;
}

/** The men at their places this minute, in the day plan's order (the owner first, then the crew
 *  in the order they were hired), each with the machine his place is at and which of its places
 *  it is. Read off what the plan wrote on them: a working man's station names the family, and his
 *  rank among the working men of that family is the place `machineForPlace` gives him. The one
 *  answer to "who is at this machine" for the hall's sums, the figures and the cards alike
 *  (CLAUDE.md T25 2.5, 2.6). */
export function menAtPlaces(state: GameState): Array<{ who: string; item: Equipment; place: number }> {
  const found: Array<{ who: string; item: Equipment; place: number }> = [];
  const given = new Map<string, number>();
  const men: Array<{ who: string; man: { working: boolean; station: string } }> = [
    { who: OWNER, man: state.owner },
    ...state.workers.map((worker) => ({ who: worker.id, man: worker })),
  ];
  for (const { who, man } of men) {
    if (!man.working || !man.station.startsWith('machine:')) continue;
    const family = man.station.slice('machine:'.length);
    const index = given.get(family) ?? 0;
    given.set(family, index + 1);
    const at = machineForPlace(state, family, index);
    if (at !== null) found.push({ who, item: at.item, place: at.place });
  }
  return found;
}

/** Who is at this machine this minute, in the order of its places (CLAUDE.md T25 2.5). */
export function menAtMachine(state: GameState, item: { id: string }): string[] {
  return menAtPlaces(state)
    .filter((entry) => entry.item.id === item.id)
    .sort((a, b) => a.place - b.place)
    .map((entry) => entry.who);
}

/** A machine's places and who is in them this minute, read off the same day plan the figures on
 *  the floor are (CLAUDE.md T25 2.5): on its card and its hover line `Places: 2 of 2 in use, Pete
 *  and Eddie`, on the Owned tab's tile the short form `2 of 2 in use`, and `Free` on both while
 *  nobody is at it. Empty for a thing nobody works at, and for a machine that has no places this
 *  minute because it is broken, away for its service or sold: its card says which. */
export function placesLine(state: GameState, item: Equipment, form: 'card' | 'tile'): string {
  const places = placesOf(item);
  if (places <= 0) return '';
  if (!placedMachines(state, item.specId).some((entry) => entry.id === item.id)) return '';
  const men = menAtMachine(state, item);
  if (men.length === 0) return 'Free';
  const count = `${men.length} of ${places} in use`;
  if (form === 'tile') return count;
  const names = men.map((who) =>
    who === OWNER ? state.playerName : (state.workers.find((worker) => worker.id === who)?.name ?? who),
  );
  return `Places: ${count}, ${andList(names)}`;
}

/** The ids of every machine somebody is at this minute: what the extraction and the air are the
 *  sums of (CLAUDE.md T10 3.1, 3.2). */
export function machinesAtWork(state: GameState): Set<string> {
  return new Set(menAtPlaces(state).map((entry) => entry.item.id));
}

/** The whole day crew on the books: the owner and every man who produces and is in today, at work
 *  this minute or not. What a contract's line reckons with, because it says what the hall makes
 *  "at full crew" (CLAUDE.md T25 2.7), where the hall's own minute reckons with the men at work in
 *  it (`crewAtFamily`; v54, v55). */
export function fullCrew(state: GameState): number {
  const men = state.workers.filter(
    (worker) => PRODUCING_ROLES.includes(worker.role) && isWorkingToday(state, worker, 'day'),
  ).length;
  return men + 1;
}

/** How many men this one machine keeps busy: its class's figure in `MACHINE_CAPACITY`, or nought
 *  for a family with no capacity rule (v55). */
export function capacityOf(item: { specId: string; variantId: string }): number {
  return MACHINE_CAPACITY[item.specId]?.[item.variantId] ?? 0;
}

/** The men the hall's running machines of this family keep busy between them: two budget saws
 *  are four men (v55). */
export function hallCapacity(state: GameState, family: string): number {
  return placedMachines(state, family).reduce((total, item) => total + capacityOf(item), 0);
}

/** The men at work this minute whose work goes through a machine of this family: a man on a job
 *  with a stage of the family in its plan, and a man on a standing contract whose piece is done on
 *  it [PIOTR, 24.09: "only the men whose work goes through the machine"] (v55). A job cut on a
 *  CNC has no stage at the saw, so its men are the CNC's and not the saw's; a job that is not
 *  lacquered never counts against the booth. By day the men the plan has working, the owner among
 *  them; by night the second shift. */
export function crewAtFamily(state: GameState, family: string, shift: 'day' | 'night' = 'day'): number {
  const men: Array<{ id: string; working: boolean }> =
    shift === 'night'
      ? nightCrew(state).map((worker) => ({ id: worker.id, working: true }))
      : [{ id: OWNER, working: state.owner.working }, ...state.workers];
  let count = 0;
  for (const man of men) {
    if (!man.working) continue;
    const job = jobHeldBy(state, man.id);
    if (job !== null) {
      // A job made by hand wants no machine at all (CLAUDE.md 9.5).
      if (!job.byHand && stagePlanFor(state, job).some((stage) => stage.family === family)) count += 1;
      continue;
    }
    const contract = man.id === OWNER ? null : contractOfWorker(state, man.id);
    if (contract === null) continue;
    if (contractStageFamilyOf(state, contractPiece(contract), true) === family) count += 1;
  }
  return count;
}

/** One family the hall has too few machines of for the men whose work goes through it. */
export interface PlaceShortage {
  family: string;
  /** The men the hall's machines of the family keep busy between them. */
  capacity: number;
  /** The men whose work goes through the family this minute. */
  men: number;
  /** The men past the capacity. */
  over: number;
  /** What every minute of production in the hall is multiplied by for it: the men past the
   *  capacity work at the by hand pace and the rest at their own, averaged over the men. */
  factor: number;
}

/** Every family of `MACHINE_CAPACITY` whose machines keep fewer men busy than want them [PIOTR,
 *  24.09: "with three places at the saw and four men, too few saws for the men"]. Nobody waits for
 *  the saw: the men past its capacity work elsewhere, slower, at the by hand pace, and the hall's
 *  output falls by what they lose (v53). Only the men whose work goes through the family count
 *  (`crewAtFamily`; v55), or the count the caller gives, which is how a contract's line reckons
 *  the whole crew at its piece's family. A family the hall has no running machine of is not on it:
 *  its quarter of the work is by hand already, through the job's own pace. */
export function placeShortages(
  state: GameState,
  shift: 'day' | 'night' = 'day',
  count: (family: string) => number = (family) => crewAtFamily(state, family, shift),
): PlaceShortage[] {
  const found: PlaceShortage[] = [];
  for (const family of Object.keys(MACHINE_CAPACITY)) {
    const capacity = hallCapacity(state, family);
    if (capacity <= 0) continue;
    const men = count(family);
    if (men <= capacity) continue;
    const over = men - capacity;
    const factor = (capacity + over / BY_HAND_DURATION_FACTOR) / men;
    found.push({ family, capacity, men, over, factor });
  }
  return found;
}

/** The plural of what the trade calls a family: `saws`, `CNCs`, `booths`. */
export function machinesWord(family: string): string {
  return `${machineShortWord(family)}s`;
}

/** The line a machine's card and its hover carry while its family is short for the men whose work
 *  goes through it, and the words of the mark drawn over it in the hall: `Too few saws for the
 *  crew: 4 men, capacity 3, 1 works at 67%` (PIOTR, 24.09; v53, v55). Empty while the family
 *  keeps up. */
export function shortageLine(state: GameState, family: string): string {
  const short = placeShortages(state).find((entry) => entry.family === family);
  if (short === undefined) return '';
  const pace = Math.round(100 / BY_HAND_DURATION_FACTOR);
  const who = short.over === 1 ? '1 works' : `${short.over} work`;
  return (
    `Too few ${machinesWord(family)} for the crew: ${short.men} men, ` +
    `capacity ${short.capacity}, ${who} at ${pace}%`
  );
}

/** The class of machine this is, or the cheapest one in the family when the id is unknown. */
export function variantOf(spec: EquipmentSpec, variantId: string): EquipmentVariant {
  const found = spec.variants.find((entry) => entry.id === variantId);
  const first = spec.variants[0];
  if (found) return found;
  if (first) return first;
  throw new Error(`family with no variants: ${spec.id}`);
}

export function findVariant(specId: string, variantId: string): EquipmentVariant | null {
  const spec = findSpec(specId);
  return spec ? variantOf(spec, variantId) : null;
}

/** What a machine standing in the hall actually is. */
export function variantFor(item: Equipment): EquipmentVariant | null {
  const spec = findSpec(item.specId);
  return spec ? variantOf(spec, item.variantId) : null;
}

// ---------------------------------------------------------------------------
// The automatic blast gate (CLAUDE.md T13 3.11): a per machine purchase on the card of a machine
// standing in the hall, for a machine with an extraction demand. Two effects: a little more
// output on that machine, and the hall's extraction counts it only while it runs (media.ts).
// ---------------------------------------------------------------------------

/** True when this machine has an automatic gate on its drop. */
export function hasGate(state: GameState, item: { id: string }): boolean {
  return state.gates.includes(item.id);
}

/** The pace a class of this family works at, off the one table of 2.4: used 0.95 up to industrial
 *  1.12 for every family a man works at, and 1 for everything else (the extraction, the air, the
 *  storage), whose class is never a speed [PIOTR, 21.09] (CLAUDE.md T25 2.4). */
export function classPaceOf(item: { specId: string; variantId: string }): number {
  if (!PACED_FAMILIES.includes(item.specId)) return 1;
  return MACHINE_PACE[item.variantId] ?? 1;
}

/** What this machine does to the pace of its family: its class's pace, and the gate's bonus on
 *  top of it once one is fitted (PIOTR: +2%; CLAUDE.md T13 3.11, T25 2.4). The one place a
 *  machine's pace is read: the hall's pace, the projection and the board all come through here. */
export function paceOf(state: GameState, item: Equipment): number {
  const base = classPaceOf(item);
  if (!hasGate(state, item)) return base;
  return Math.round(base * (1 + GATE_OUTPUT_BONUS) * 10000) / 10000;
}

/** Why a gate cannot be fitted to this machine, or that it can: only a machine with an extraction
 *  demand takes one, once, for the price (CLAUDE.md T13 3.11). The card's button and the purchase
 *  itself read the same refusals. */
export function gateCheck(state: GameState, equipmentId: string): { ok: boolean; reason: string } {
  const item = state.equipment.find((entry) => entry.id === equipmentId);
  if (!item) return { ok: false, reason: 'No such machine' };
  if (hasGate(state, item)) return { ok: false, reason: 'Fitted already' };
  if (extractionDemandOf(item) <= 0) return { ok: false, reason: 'It wants no extraction' };
  if (!canAfford(state, GATE_PRICE)) return { ok: false, reason: 'Not enough cash' };
  return { ok: true, reason: '' };
}

/** Hours of use a machine of this family and class has in it. A family whose life Piotr wrote in
 *  running minutes, as the compressors' is, says so in its own table and the hours come off that;
 *  everything else is the family's base hours stretched by its class (CLAUDE.md T10 3.2). One
 *  answer either way, so nothing reads two. */
export function enduranceHoursFor(specId: string, variantId: string): number {
  const minutes = ENDURANCE_MINUTES_BY_CLASS[specId]?.[variantId];
  if (minutes !== undefined) return minutes / 60;
  const spec = findSpec(specId);
  if (!spec) return 0;
  return Math.round(spec.enduranceHours * variantOf(spec, variantId).enduranceFactor);
}

/** Worn out: it still runs, but it gives up as often as a machine that never sees a service. */
export function pastEndurance(item: Equipment): boolean {
  return item.enduranceHours > 0 && item.hoursUsed >= item.enduranceHours;
}

export function owned(state: GameState, specId: string): Equipment[] {
  return state.equipment.filter((item) => item.specId === specId);
}

export function has(state: GameState, specId: string): boolean {
  return state.equipment.some((item) => item.specId === specId);
}

export function hasAll(state: GameState, specIds: readonly string[]): boolean {
  return specIds.every((specId) => has(state, specId));
}

export function countOf(state: GameState, specId: string): number {
  return owned(state, specId).length;
}

/** The bench family. A man on a job holds one from the minute he starts it to the minute it is
 *  finished, whatever stage he is at, which is the Turn 4 rule that nobody is turned off a bench
 *  he is standing at (CLAUDE.md T4 3.4). */
export const BENCH = 'workbench';

/** The booth family. The finishing of a lacquered job is done at it, and it is the sprayer's own
 *  trade: he is at his full rate there and a joiner is slower (CLAUDE.md T19 2.6). */
export const SPRAY_BOOTH = 'sprayBooth';

/** The benches standing in the hall, in the order they were bought, which is the order the men
 *  fill them in. A broken one is no bench at all, the way a broken machine is no machine. */
export function benches(state: GameState): Equipment[] {
  return floorMachines(state, BENCH).filter((item) => !item.broken);
}

/** Places at the benches of the hall, the classes added up: what the hiring gate counts, the way
 *  it counts the slots of the tool cabinets and not the cabinets (CLAUDE.md T22 2.12, T23 2.17). */
export function benchPlaces(state: GameState): number {
  return benches(state).reduce((total, item) => total + placesOf(item), 0);
}

/** The men who have a place at a bench, in the order they get one: the crew in the order they
 *  were hired, and the owner after them. The crew come first because the hiring gate counts
 *  places against the men on the books and buys a place for every one of them, so a man the
 *  player has paid for a bench for is never the one standing at the canteen door; the owner takes
 *  what is left, which is the whole bench on the first morning and nothing at all in a hall whose
 *  benches are all spoken for. Only the trades that stand at a bench are on the list: a helper
 *  with a broom, an estimator at a desk and the production manager take no place at one
 *  (CLAUDE.md T4 3.4, T19 2.5, T23 2.17). */
function benchQueue(state: GameState): string[] {
  const crew = state.workers
    .filter((worker) => BUILDING_ROLES.includes(worker.role))
    .map((worker) => worker.id);
  return [...crew, OWNER];
}

/** The bench this man works at, or null while the hall has no place for him. It is the same
 *  answer every minute of his time on the books: the benches in the order they were bought, each
 *  holding its class's men, filled by `benchQueue` in order. Nobody is turned off a bench he is
 *  standing at, because nobody was ever standing at somebody else's (CLAUDE.md T23 2.17). */
export function benchOf(state: GameState, who: string): Equipment | null {
  return benchPlaceOf(state, who)?.item ?? null;
}

/** The bench this man works at and which of its places is his: the one answer `benchOf` reads,
 *  with the place kept, so three men whose home is one industrial bench stand at its three places
 *  and not on one cell (CLAUDE.md T23 2.17, T25 2.6). */
export function benchPlaceOf(state: GameState, who: string): { item: Equipment; place: number } | null {
  let place = benchQueue(state).indexOf(who);
  if (place < 0) return null;
  for (const bench of benches(state)) {
    const places = placesOf(bench);
    if (place < places) return { item: bench, place };
    place -= places;
  }
  return null;
}

/** How many places at a bench the hall's own men already have: the owner and every trade that
 *  stands at one (CLAUDE.md T23 2.17). */
export function benchMen(state: GameState): number {
  return benchQueue(state).length;
}

/** Places at the benches that nobody on the books has: what a hall has spare for the next man. */
export function freeBenches(state: GameState): number {
  return Math.max(0, benchPlaces(state) - benchMen(state));
}

/** The same sum with the benches on the lorry counted as well, which is what the hiring gate
 *  asks: a bench bought this morning is in by 08:00 tomorrow and the man starts then (T8 3.2). */
export function benchPlacesOwnedOrOnOrder(state: GameState): number {
  return (
    benchPlaces(state) +
    state.onOrder.reduce((total, item) => total + (item.specId === BENCH ? placesOf(item) : 0), 0)
  );
}

/** The bench the man who would take this place gets, counting from the owner. The hiring gate's
 *  own question, asked before the man is on the books: it is what `benchOf` will answer for him
 *  the morning he starts (CLAUDE.md T23 2.17). */
export function benchAtPlace(state: GameState, place: number): Equipment | null {
  let left = place;
  for (const bench of benches(state)) {
    const places = placesOf(bench);
    if (left < places) return bench;
    left -= places;
  }
  return null;
}

/** Without a bench in the hall there is no way to make anything (CLAUDE.md T4 3.4): the one
 *  question a job asks of the hall. Whether a man on it has a place at one is the day plan's, asked
 *  of him alone and only at the stages done at a bench, like any family's places
 *  (CLAUDE.md T25 2.3). */
export function hallHasABench(state: GameState): boolean {
  return benchPlaces(state) > 0;
}

/** What the machines in the hall draw in a day. A dearer class pulls more (CLAUDE.md T3 3.5). */
export function machinePowerPerDay(state: GameState): number {
  let total = 0;
  for (const item of poweredMachines(state)) {
    total += variantFor(item)?.powerPerDay ?? 0;
  }
  return total;
}

/** Machines that draw power: every machine plus the extraction kit. */
export function poweredMachines(state: GameState): Equipment[] {
  return state.equipment.filter((item) => {
    const spec = findSpec(item.specId);
    if (!spec) return false;
    return spec.category === 'machine' || spec.category === 'extraction';
  });
}


/** Which dust band the hall is in (CLAUDE.md 9.7). */
export function dustBand(dust: number): { max: number; factor: number; label: string } {
  for (const band of DUST_BANDS) {
    if (dust <= band.max) return band;
  }
  return DUST_BANDS[DUST_BANDS.length - 1] ?? { max: 100, factor: 1, label: 'clean' };
}

export function dustFactor(dust: number): number {
  return dustBand(dust).factor;
}

/** True when the hall has reached this band of dust or a worse one. The one reading of the table
 *  for everybody who asks it a question about how dirty the hall is (CLAUDE.md T17 2.3). */
export function dustAtLeast(dust: number, label: string): boolean {
  const order = DUST_BANDS.map((band) => band.label);
  return order.indexOf(dustBand(dust).label) >= order.indexOf(label);
}

/** How many piles of sawdust the hall is painting at this much dust. The renderer draws exactly
 *  this many (CLAUDE.md T20 2.8). */
export function sawdustPiles(dust: number): number {
  return Math.round(dust / DUST_PER_SAWDUST_PILE);
}

/** True while there is dirt on the floor to look at, which is from the first pile on. This is the
 *  question the helper is asked, and it is asked of the drawing and not of a band of its own: the
 *  bands say what the dust does to the work and to the men (CLAUDE.md 9.7) and they start past 40,
 *  eight times the dust the first pile is drawn at. Between the two the player saw dirt and the
 *  labourer stood beside it, which is PIOTR's complaint of 18.09 word for word (CLAUDE.md T20 2.8;
 *  the diagnosis is in REPORT-T20.md). */
export function hallLooksDirty(dust: number): boolean {
  return sawdustPiles(dust) > 0;
}

/** True once five joiners are on the books without a helper (CLAUDE.md 9.3). */
export function helperMissing(state: GameState): boolean {
  const joiners = state.workers.filter((worker) => worker.role === 'joiner').length;
  const helpers = state.workers.filter((worker) => worker.role === 'helper').length;
  return joiners >= HELPER_REQUIRED_FROM_JOINERS && helpers === 0;
}

/** Finished pieces waiting for transport. Counted here rather than imported from jobs.ts, which
 *  already imports this module. */
export function gateIsCrowded(state: GameState): boolean {
  const waiting = state.jobs.filter((job) => job.stage === 'awaitingTransport').length;
  return waiting > GATE_CROWD_LIMIT;
}

/** One line of the company output board: what it is and what it is worth (PIOTR, 13.09: "a column
 *  for the company's output, 0.7, and why"; CLAUDE.md T9 3.10). */
export interface OutputLine {
  label: string;
  /** Plus or minus, against the running total. */
  points: number;
  /** True when this is one of the things every minute of production in the hall is multiplied by,
   *  which is what makes the number. The rest act on the man or the machine they belong to and
   *  are on the board because Piotr asked to see them (REPORT-T9 deviations). */
  hall: boolean;
  /** Where a line that is not the hall's own acts. Empty for the hall's. */
  where: string;
}

export interface OutputBreakdown {
  /** Where every hall starts. */
  base: number;
  lines: OutputLine[];
  /** The totals of the two columns, over the lines that make the number. */
  plus: number;
  minus: number;
  /** base + plus + minus: what every minute of production in this hall is multiplied by. */
  total: number;
}

function roundPoints(value: number): number {
  return Math.round(value * 10000) / 10000;
}

/** A man's grade and his trade in the game's own words: "experienced joiner", "a helper". The one
 *  spelling, read by the Output sheet's own line for him and by the row that says what he made
 *  today, so the two cannot disagree about him (CLAUDE.md T20 2.5, T24 2.1). */
function tradeWords(worker: { tier: WorkerTier | null; role: string }): string {
  return `${worker.tier === null ? 'a' : TIER_WORDS[worker.tier]} ${worker.role}`;
}

/** The same man with his name in front of it, which is how the sheet's own line for him reads. */
function manWords(worker: { name: string; tier: WorkerTier | null; role: string }): string {
  return `${worker.name}, ${tradeWords(worker)}`;
}

/** What the hall is turning out and why, line by line. The one selector for it: the number the
 *  engine multiplies production by is this list's total, so the board and the bench cannot
 *  disagree about the state of the hall (CLAUDE.md T9 3.10). */
export function outputBreakdown(state: GameState, shift: 'day' | 'night' = 'day'): OutputBreakdown {
  const lines: OutputLine[] = [];
  let running = 1;
  // Each line is worth what it takes off the running total, so the lines add up to the product
  // exactly: a second thing wrong with the hall costs less than the first one did.
  const hallLine = (label: string, factor: number): void => {
    const next = running * factor;
    lines.push({ label, points: next - running, hall: true, where: '' });
    running = next;
  };
  const band = dustBand(state.dust);
  hallLine(band.label === 'clean' ? 'Hall clean' : `Hall ${band.label}`, band.factor);
  if (helperMissing(state)) hallLine('Five joiners and no helper', NO_HELPER_PRODUCTIVITY_FACTOR);
  // Nowhere to put anything down with four finished pieces in the way (CLAUDE.md T2 3.7).
  if (gateIsCrowded(state)) hallLine('No room at the gate', GATE_CROWD_FACTOR);
  // The extraction is down: the hall crawls rather than stopping dead (CLAUDE.md T2 3.9).
  if (extractorBroken(state)) {
    hallLine('Extraction down', EXTRACTOR_BROKEN_OUTPUT_FACTOR);
  } else {
    hallLine('Extraction working', 1);
  }
  // The fans are there and they are too small for what is running: nothing stops, the hall just
  // turns out less of everything and fills with dust (PIOTR, CLAUDE.md T10 3.1).
  const extraction = extractionCheck(state);
  if (extraction.short) {
    hallLine(extraction.line, 1 - UNDER_EXTRACTION_OUTPUT_PENALTY);
  }
  // Too few places at a family for the crew: the men past them work elsewhere at the by hand
  // pace, and the sheet says what that costs the whole hall (PIOTR, 24.09: "it has to be shown
  // clearly what the penalty is and how many percent the saw slows the whole production"; v53).
  for (const short of placeShortages(state, shift)) {
    hallLine(`Too few ${machinesWord(short.family)}: capacity ${short.capacity}, ${short.men} men`, short.factor);
  }
  const total = running;
  let plus = 0;
  let minus = 0;
  for (const line of lines) {
    line.points = roundPoints(line.points);
    if (line.points > 0) plus += line.points;
    if (line.points < 0) minus += line.points;
  }
  // What the owner owes the day, what the crew are worth and what the machines are worth. None of
  // these is the hall's own factor: the owner's comes off his minutes, a man's rate comes off his
  // and a class of machine comes off the stage it does (CLAUDE.md T6 3.4, T7 3.1).
  const owner = state.owner;
  if (owner.overtimeDebt > 0) {
    lines.push({
      label: 'Overtime, carried into today',
      points: roundPoints(-owner.overtimeDebt),
      hall: false,
      where: 'your own minutes',
    });
  }
  if (owner.breakSkipped) {
    lines.push({
      label: 'Dinner worked through',
      points: roundPoints(BREAK_SKIP_FACTOR - 1),
      hall: false,
      where: 'your own minutes',
    });
  }
  // Everybody on the books who PRODUCES, and only them: this sheet is the men and the machines
  // that act where they are, and a rate at a desk is not a production rate, so an estimator, an
  // admin, a draftsman, a clerk and a salesman are off it whatever their rate is (PIOTR;
  // CLAUDE.md T20 2.3.3). The rule is the role and never the name, so two men called Dave cannot
  // take each other's line off the sheet. The guard used to read the rate: it stopped at 1 as
  // well, from the days when no tier reached the owner, and tonight the experienced man is his
  // equal and the two above him beat him. The experienced man reads 0.00, which is the truth
  // about him (CLAUDE.md T20 2.5).
  for (const worker of state.workers) {
    if (!PRODUCING_ROLES.includes(worker.role)) continue;
    lines.push({
      label: manWords(worker),
      points: roundPoints(worker.rate - 1),
      hall: false,
      where: 'his own minutes',
    });
  }
  // The manager over the men: his grade's pace multiplies the production minutes of the men he
  // carries, the way a tier's rate multiplies one man's, so he is a line of this sheet and not a
  // factor on the hall. Nothing is multiplied twice: the figure printed here is the same
  // `PRODUCTION_MANAGER_PACE` that `hands` puts on the minute (PIOTR, 20.09; CLAUDE.md T23 2.4).
  const tier = managerTier(state);
  if (tier !== null) {
    lines.push({
      label: 'Manager',
      points: roundPoints(PRODUCTION_MANAGER_PACE[tier] - 1),
      hall: false,
      where: 'the minutes of the men he carries',
    });
  }
  const families = new Set(
    state.equipment
      .filter((item) => !isSold(item) && findSpec(item.specId)?.category === 'machine')
      .map((item) => item.specId),
  );
  for (const specId of Array.from(families).sort()) {
    const factor = hallPace(state, specId);
    const spec = findSpec(specId);
    lines.push({
      label: `${spec?.name ?? specId}, best in the hall`,
      points: roundPoints(factor - 1),
      hall: false,
      where: 'the stage it does',
    });
  }
  return { base: 1, lines, plus: roundPoints(plus), minus: roundPoints(minus), total };
}

/** What the state of the hall does to every minute of production: the total of the lines the
 *  board shows, and nothing else (CLAUDE.md T9 3.10). */
export function hallProductivityFactor(state: GameState, shift: 'day' | 'night' = 'day'): number {
  return outputBreakdown(state, shift).total;
}

/** Books one production minute's multiplier for the workshop's average output (v40): the jobs
 *  and the contracts both call it, once a man minute, with the same four things the minute's
 *  labour was made of. `workMinutes` is counted where the labour lands, so the two halves of the
 *  average are booked on the same minute.
 *
 *  From v50 it is also booked against the man who worked it, `who` being a worker's id or `OWNER`,
 *  so the Output sheet can say who made today's number and the engine, not the sheet, keeps the
 *  figures (PIOTR, 22.09; CLAUDE.md T24 2.1). The day loop, the night loop and the contract minute
 *  all come through here and there is no second way of booking a minute. */
export function bookOutputMinute(state: GameState, who: string, multiplier: number): void {
  state.dayStats.outputWorth = Math.round((state.dayStats.outputWorth + multiplier) * 10000) / 10000;
  const booked = state.dayStats.byMan[who] ?? { minutes: 0, worth: 0 };
  booked.minutes += 1;
  booked.worth = Math.round((booked.worth + multiplier) * 10000) / 10000;
  state.dayStats.byMan[who] = booked;
}

/** The workshop's average output today: what a minute of production has been worth on average,
 *  the hall, every man, his manager, the owner's absence and the class of machine at his stage,
 *  weighted by the minutes worked. Before the first minute of the day it is the hall's own
 *  factor, which is what a minute of a man at 1.0 would get (PIOTR, 21.09: one Output number,
 *  not two; v40). */
export function workshopOutputToday(state: GameState): number {
  const minutes = state.dayStats.workMinutes;
  if (minutes <= 0) return hallProductivityFactor(state);
  return Math.round((state.dayStats.outputWorth / minutes) * 100) / 100;
}

// ---------------------------------------------------------------------------
// Who made today's number (PIOTR, 22.09; CLAUDE.md T24 2.1)
// ---------------------------------------------------------------------------

/** One row of "Who made it today": a man who has put a production minute in since this morning,
 *  or the hall itself. Every word of it is written here, because the sheet prints the block and
 *  computes nothing (CLAUDE.md T15 0, T24 2.1). */
export interface WorkshopBreakdownRow {
  /** A worker's id, `OWNER`, or `HALL_ROW` for the hall's own row. */
  who: string;
  /** `<Name>, <tier> <role>, <doing> <job>`, in the words the person card uses; `Hall`. */
  main: string;
  /** `<why>, <his minutes> min: <his rate> times <his stage's speed>`; the hall's state. */
  words: string;
  /** His minutes today; nought on the hall's row, which is a factor and not a man. */
  minutes: number;
  /** What a minute of his was worth on average today, or the hall's own factor. */
  figure: number;
}

/** The hall's own row carries this instead of a man's id. */
export const HALL_ROW = 'hall';

export interface WorkshopBreakdown {
  /** `dayStats.workMinutes`: what the head of the block counts. */
  minutes: number;
  /** The men, the owner first and then the crew in the order of `state.workers`. Empty before
   *  the first production minute of the day, when there is nothing to say and no block is drawn. */
  men: WorkshopBreakdownRow[];
  /** The hall's row, drawn under the men. Null when nobody has worked. */
  hall: WorkshopBreakdownRow | null;
  /** `workshopOutputToday`: the same figure as the line above the block. */
  total: number;
  /** The one sentence under the block. Empty when there is nothing to say. */
  note: string;
}

/** The state of the hall in the words the sheet's own lines have for it: `clean, extraction
 *  working`, `dusty`, and the two states no line of the breakdown carries, a fan away being
 *  serviced and a store nothing can run into (CLAUDE.md T24 2.1). */
function hallWordsToday(state: GameState): string {
  const words = outputBreakdown(state)
    .lines.filter((line) => line.hall)
    // "Hall clean" is the hall saying it is clean, and the row it goes on is already called Hall.
    .map((line) => line.label.replace(/^Hall /, '').toLowerCase());
  // A fan away for the day is not "extraction working", and `outputBreakdown` has no line for it
  // because the factor it costs is the shortfall the missing capacity already makes
  // (CLAUDE.md T20 2.9.3). It is said in the fan's own name.
  const away = machinesInService(state).find((item) => extractionCapacityOf(item) > 0);
  if (away !== undefined) {
    const said = `${(findSpec(away.specId)?.name ?? away.specId).toLowerCase()} on service`;
    const at = words.indexOf('extraction working');
    if (at >= 0) words[at] = said;
    else words.push(said);
  }
  if (bagsFull(state)) words.push('bags full');
  return words.join(', ');
}

/** Two places, the way every multiplier on a sheet is written. */
function twoPlaceText(value: number): string {
  return (Math.round(value * 100) / 100).toFixed(2);
}

/** Why his minute was worth what it was: the family his place is at and the class that sets the
 *  hall's pace for it (`saw, industrial`), whichever of its machines he is at, because the hall's
 *  best class is what set his speed; `at the bench` at a bench, and `by hand` when his stage falls
 *  back to a pair of hands. A row whose two figures did not multiply out to the one beside them
 *  would be the very thing it is for (PIOTR, 22.09; CLAUDE.md T24 2.1, T25 2.4). */
function whyWords(state: GameState, stage: StagePlan | null, machine: Equipment | null): string {
  if (machine !== null && machine.specId !== BENCH) {
    const best = bestMachineOf(state, machine.specId) ?? machine;
    return `${machineShortWord(machine.specId)}, ${best.variantId}`;
  }
  if (stage === null) return 'at the bench';
  return stage.byHand ? 'by hand' : 'at the bench';
}


/** One man's row. `rate` is his own rate, which for the owner is what his day has left him
 *  (`ownerEfficiency`) and for a man on the books is his grade's. */
function manRow(
  state: GameState,
  who: string,
  name: string,
  trade: string,
  rate: number,
  booked: { minutes: number; worth: number },
): WorkshopBreakdownRow {
  const job = jobHeldBy(state, who);
  const stage = job === null ? null : stageOfMan(state, who, job);
  const machine = job === null ? null : (menAtPlaces(state).find((entry) => entry.who === who)?.item ?? null);
  const doing =
    job === null || stage === null ? '' : `${stageDoing(stage.id, job.finish === 'lacquer')} ${job.name}`;
  const mine = who === OWNER ? `your ${twoPlaceText(rate)}` : twoPlaceText(rate);
  // The job's one pace, the figure `runProductionMinute` reads before the air factor (v53).
  const role = who === OWNER ? null : (state.workers.find((worker) => worker.id === who)?.role ?? null);
  const pace = job === null ? 1 : jobPace(state, job) * tradeFactor(role, machine?.specId ?? null);
  const figure = booked.minutes <= 0 ? 0 : Math.round((booked.worth / booked.minutes) * 100) / 100;
  // What the hall did to his minutes, off what they were really booked at: the saws too few for
  // the crew, the dust, the air. Without it the row said "0.97 times 1.05" beside 0.79, which does
  // not multiply out [PIOTR, 24.09: "something does not add up"] (v54).
  const hall = booked.minutes <= 0 || rate * pace <= 0 ? 1 : booked.worth / booked.minutes / (rate * pace);
  const hallWords = Math.abs(hall - 1) < 0.005 ? '' : ` times the hall's ${twoPlaceText(hall)}`;
  return {
    who,
    main: [name, trade, doing].filter((part) => part !== '').join(', '),
    words:
      `${whyWords(state, stage, machine)}, ${booked.minutes} min: ` +
      `${mine} times ${twoPlaceText(pace)}${hallWords}`,
    minutes: booked.minutes,
    figure,
  };
}

/** The one sentence under the block, and at most one: a job today's minutes went into by hand
 *  first, because that is the thing the player can put right with an order, and the hall under
 *  1.00 after it. A low number made of slow men says itself in the rows above and gets no
 *  sentence (CLAUDE.md T24 2.1). */
function breakdownNote(state: GameState, hall: number): string {
  for (const id of state.dayStats.jobsAdvanced) {
    const job = state.jobs.find((entry) => entry.id === id);
    if (!job || !job.byHand) continue;
    // The tools the enquiry was locked on, in the board's own words: "Needs a thicknesser".
    const locked = lockReasonFor(state, template(job.templateId)) ?? '';
    // "Needs a thicknesser and a spindle moulder" reads "no thicknesser and no spindle moulder".
    const tools = locked
      .replace(/^Needs /, '')
      .replace(/\ban? /g, '')
      .split(' and ')
      .join(' and no ')
      .toLowerCase();
    if (tools === '') continue;
    return (
      `${job.name} was taken by hand: no ${tools} in the hall, so every stage of it runs at ` +
      `${twoPlaceText(1 / BY_HAND_DURATION_FACTOR)}, the saw included.`
    );
  }
  if (hall < 1) {
    const reason = hallWordsToday(state);
    if (reason !== '') return `The hall ran at ${twoPlaceText(hall)} today: ${reason}.`;
  }
  return '';
}

/** Who made today's Output number and why: one row a man who has put a production minute in since
 *  this morning, the owner first and then the crew in the order of `state.workers`, the hall's own
 *  row under them, the total the line above the block already carries, and at most one sentence
 *  saying the one thing the rows cannot (PIOTR, 22.09: "the player has no way of knowing what to
 *  fix"; CLAUDE.md T24 2.1).
 *
 *  The minutes and the worth are the day's own, booked a minute at a time by `bookOutputMinute`;
 *  everything else is read off the hall as it stands this minute, which is where the man is and
 *  what he is standing at. */
export function workshopBreakdownToday(state: GameState): WorkshopBreakdown {
  const men: WorkshopBreakdownRow[] = [];
  const owner = state.dayStats.byMan[OWNER];
  if (owner !== undefined && owner.minutes > 0) {
    men.push(manRow(state, OWNER, state.playerName, '', ownerEfficiency(state), owner));
  }
  for (const worker of state.workers) {
    const booked = state.dayStats.byMan[worker.id];
    if (booked === undefined || booked.minutes <= 0) continue;
    men.push(manRow(state, worker.id, worker.name, tradeWords(worker), worker.rate, booked));
  }
  const hallFactor = hallProductivityFactor(state);
  return {
    minutes: state.dayStats.workMinutes,
    men,
    hall:
      men.length === 0
        ? null
        : {
            who: HALL_ROW,
            main: 'Hall',
            words: hallWordsToday(state),
            minutes: 0,
            figure: Math.round(hallFactor * 100) / 100,
          },
    total: workshopOutputToday(state),
    note: men.length === 0 ? '' : breakdownNote(state, hallFactor),
  };
}

/** The hall's pace at a stage of this family: the best class of it standing unbroken in the hall
 *  and not away for its service, whatever machine of it the man is at. A hall with an industrial
 *  saw and a used one cuts at 1.12, because the shop cuts on the good saw and the old one takes
 *  the overflow [PIOTR, 21.09] (CLAUDE.md T25 2.4). 1 when the hall has none it can work at, so a
 *  caller that has not asked `has` first is never told a job is quicker than it is. */
export function hallPace(state: GameState, family: string): number {
  const best = bestMachineOf(state, family);
  return best === null ? 1 : paceOf(state, best);
}

/** The extractor is on the floor. The hall carries on at a quarter speed (CLAUDE.md T2 3.9). */
export function extractorBroken(state: GameState): boolean {
  return state.equipment.some((item) => item.specId === 'extractor' && item.broken);
}

/** Extraction of some kind is in the hall. Without it no machine will run at all (PIOTR). */
export function hasExtraction(state: GameState): boolean {
  return has(state, 'extractor') || hasCentralExtraction(state);
}

/** Ducted extraction for the whole hall: the central system, or the flexi one that never needs
 *  reconnecting (CLAUDE.md T4 3.5). Everything the central system does, the flexi one does. */
export function hasCentralExtraction(state: GameState): boolean {
  return CENTRAL_EXTRACTION_SPECS.some((specId) => has(state, specId));
}

/** With the flexi system every machine stays connected wherever it is put. */
export function ductingIsFree(state: GameState): boolean {
  return has(state, 'flexiSystem');
}

/** True for a machine that is ducted into the extraction and has to be reconnected when it is
 *  moved. A bench, a rack, a locker or a seat is simply carried (CLAUDE.md T4 3.5). */
export function needsDucting(specId: string, variantId?: string): boolean {
  if (NO_DUCTING_SPECS.includes(specId)) return false;
  // Nothing that holds no cell of the floor is ducted: it never stood anywhere to be unplugged
  // from (CLAUDE.md T6 3.5).
  if (!standsInTheHall(specId, variantId)) return false;
  return findSpec(specId)?.category === 'machine';
}

/** The machines the player has moved that have to be reconnected, in the order he moved them.
 *  The one place that says which move is charged: the bill in setup mode and the ledger lines when
 *  the kit is down both read it (CLAUDE.md T4 3.5). */
export function ductedMoves(state: GameState): Equipment[] {
  if (ductingIsFree(state)) return [];
  const moved: Equipment[] = [];
  for (const entry of state.movedItems) {
    const item = state.equipment.find((kit) => kit.id === entry.itemId);
    if (item && needsDucting(item.specId, item.variantId)) moved.push(item);
  }
  return moved;
}

/** How many of the moves the player has made will want their pipe run again when the kit is
 *  down: the length is charged at the reconnection, by the metre (CLAUDE.md T13 3.19). */
export function ductingDue(state: GameState): { machines: number } {
  return { machines: ductedMoves(state).length };
}

/** True for the kit a service is called on and whose hours are booked against a life: the
 *  machines with a bag or a blade, and from Turn 23 the extractors beside them. A fan books its
 *  hours while the extraction runs and is serviced exactly as a machine is, on the same due
 *  point, with the same call in, the same working day out and the same extension of life
 *  [PIOTR, 20.09] (CLAUDE.md T20 2.9, T23 2.8).
 *
 *  The central and the flexi systems are on it from tonight: they book their hours while the
 *  extraction runs and come due, are called in on the same card button and go out for the same
 *  working day [PIOTR, 22.09; REPORT-T23 0.8] (CLAUDE.md T24 2.7). What they do not do is give
 *  up: their own catalogue line promises the player "no more bags and no breakdown", and
 *  `overdueBreakdownChance` keeps that promise. A plant that is serviced and never breaks down is
 *  what the two lines say together. */
export function isServiced(specId: string): boolean {
  if (specId === 'extractor' || CENTRAL_EXTRACTION_SPECS.includes(specId)) return true;
  return findSpec(specId)?.category === 'machine';
}

/** Machines with a bag or a blade, and the fans, the ones that are serviced and can break down. */
export function serviceableMachines(state: GameState): Equipment[] {
  return state.equipment.filter((item) => isServiced(item.specId));
}

/** Days on the calendar since the machine was bought or last serviced. The service runs on the
 *  calendar and not on the hours it ran (PIOTR, 22.09: "every six months, for every machine, and
 *  that is all"; v51). Until v51 it was 80 hours of the machine's own clock (CLAUDE.md T6 3.6). */
export function daysSinceService(item: Equipment, day: number): number {
  return Math.max(0, day - item.servicedDay);
}

/** The day the next service falls due: six months on from the last one, or from the purchase. */
export function serviceDueOn(item: Equipment): number {
  return item.servicedDay + SERVICE_INTERVAL_DAYS;
}

/** Days still to go before the next service is due. */
export function serviceDueIn(item: Equipment, day: number): number {
  return Math.max(0, serviceDueOn(item) - day);
}

export function serviceIsDue(item: Equipment, day: number): boolean {
  return daysSinceService(item, day) >= SERVICE_INTERVAL_DAYS;
}

export function machinesDueService(state: GameState): Equipment[] {
  return serviceableMachines(state).filter((item) => serviceIsDue(item, state.clock.day));
}

/** A tenth of what the machine cost [PIOTR, 18.09; CLAUDE.md T20 2.9.2]. The fraction itself is
 *  `SERVICE_COST_FRACTION`, which is a tenth of what the machine cost [PIOTR, 18.09]. Everything
 *  here and every test reads the constant and never the figure. */
export function serviceCostFor(item: Equipment): number {
  return Math.round(item.purchasePrice * SERVICE_COST_FRACTION * 100) / 100;
}

/** What a minute of a machine's running costs in service: a tenth of its price every six months
 *  (`SERVICE_COST_FRACTION` every `SERVICE_INTERVAL_MONTHS`), spread over the hours a one man
 *  shop puts on it in those months (`MACHINE_HOURS_PER_MONTH` a month, CLAUDE.md T6 3.6). A
 *  standard saw at 7,000 is 1.46 an hour, a used one at 1,800 is 0.38. The one figure a
 *  contract's card and its closing report call the machine's wear; the class's own price is read
 *  when the machine is not stood in the hall yet, and the price paid when it is (PIOTR, 21.09;
 *  v40). Until v51 the interval was 80 hours, so the wear was six times this. */
export function wearPerMinuteOf(price: number): number {
  return (price * SERVICE_COST_FRACTION) / (SERVICE_INTERVAL_MONTHS * MACHINE_HOURS_PER_MONTH * 60);
}

export function machineWearPerMinute(item: Equipment): number {
  return isServiced(item.specId) ? wearPerMinuteOf(item.purchasePrice) : 0;
}

/** One line of the efficiency plate for a family whose pace is not 1.00: `Saw, industrial` and
 *  `+12%`, so the player sees what his machines buy him [PIOTR, 21.09] (CLAUDE.md T25 2.4). */
export interface PaceLine {
  family: string;
  label: string;
  /** The hall's pace for the family less 1, as a whole signed percentage: 12 is +12%. */
  percent: number;
}

/** The families a man works at whose pace in this hall is above or below 1.00, in the order of
 *  `PACED_FAMILIES`, each named by its short word and the class that sets it. */
export function paceLines(state: GameState): PaceLine[] {
  const lines: PaceLine[] = [];
  for (const family of PACED_FAMILIES) {
    const best = bestMachineOf(state, family);
    if (best === null) continue;
    const percent = Math.round((paceOf(state, best) - 1) * 100);
    if (percent === 0) continue;
    const word = machineShortWord(family);
    lines.push({ family, label: `${word.charAt(0).toUpperCase()}${word.slice(1)}, ${best.variantId}`, percent });
  }
  return lines;
}

/** The best class of this family standing in the hall, unbroken and not away for its service, as
 *  a machine: the one that sets the hall's pace (2.4), and the one a piece's minutes and its wear
 *  are worked out on. The first bought wins a tie. Null when the hall has none it can work at. */
export function bestMachineOf(state: GameState, specId: string): Equipment | null {
  let best: Equipment | null = null;
  let pace = 0;
  for (const item of owned(state, specId)) {
    if (isSold(item) || item.broken || machineIsOut(item, state.clock.day)) continue;
    const own = paceOf(state, item);
    if (own > pace) {
      pace = own;
      best = item;
    }
  }
  return best;
}

/** The life the machine left the shop with, before any service was called on it. */
export function originalLifeOf(item: Equipment): number {
  return enduranceHoursFor(item.specId, item.variantId);
}

/** The hours of life a machine has after so many services: the original, and 50, then 25, then
 *  12.5 percent of the original again. Worked out from the original and the count every time,
 *  never added to what is there, so a lifted save and a machine serviced ten times both come out
 *  at the same figure (CLAUDE.md T20 2.9.1). */
export function lifeAfterServices(original: number, services: number): number {
  const extension = 1 - Math.pow(SERVICE_LIFE_EXTENSION, Math.max(0, services));
  return Math.round(original * (1 + extension));
}

/** True while the machine is away being serviced: nothing runs on it and its stage falls back the
 *  way a broken machine's does [PIOTR, 18.09: out for one working day from the call]
 *  (CLAUDE.md T20 2.9.3). */
export function machineIsOut(item: Equipment, day: number): boolean {
  return item.inServiceUntilDay !== null && day < item.inServiceUntilDay;
}

/** Everything standing in the hall that is away being serviced today. */
export function machinesInService(state: GameState): Equipment[] {
  return state.equipment.filter(
    (item) => itemStandsInTheHall(item) && !isSold(item) && machineIsOut(item, state.clock.day),
  );
}

/** Why a service cannot be called on this machine, or that it can. The one refusal: the button on
 *  the Machines page and the engine's own call read it, so a button the engine would refuse is
 *  never drawn (CLAUDE.md T4 3.2, T20 2.9). */
export function serviceCallCheck(
  state: GameState,
  equipmentId: string,
): { ok: boolean; reason: string } {
  const item = state.equipment.find((entry) => entry.id === equipmentId);
  if (!item) return { ok: false, reason: 'No such machine' };
  if (isSold(item)) return { ok: false, reason: 'Sold' };
  if (!isServiced(item.specId)) return { ok: false, reason: 'It is not serviced' };
  if (machineIsOut(item, state.clock.day)) return { ok: false, reason: 'In service' };
  if (item.broken) return { ok: false, reason: 'It is broken. Fix it first' };
  if (!canAfford(state, serviceCostFor(item))) return { ok: false, reason: 'Not enough cash' };
  return { ok: true, reason: '' };
}

/** Hours the machine has run past the life it has, extensions and all. */
export function hoursPastLife(item: Equipment): number {
  if (item.enduranceHours <= 0) return 0;
  return Math.max(0, round6(item.hoursUsed - item.enduranceHours));
}

/** How many weeks of its own clock the machine has run past the end of its life. */
export function weeksPastLife(item: Equipment): number {
  if (PAST_LIFE_WEEK_HOURS <= 0) return 0;
  // Rounded to six places before the floor: two whole weeks of a figure that is 80 over 4.33 is
  // 1.9999999 in binary, and a week of a machine's life is not lost to that.
  return Math.floor(round6(hoursPastLife(item) / PAST_LIFE_WEEK_HOURS));
}

/** The extractor keeps its Turn 1 parts bill, every other machine is 5% of its price [TUNE]. */
export function repairCostFor(item: Equipment): number {
  if (item.specId === 'extractor') return EXTRACTOR_REPAIR_COST;
  return Math.round(item.purchasePrice * MACHINE_REPAIR_COST_FRACTION * 100) / 100;
}

/** A machine that is past its service hours can give up on any working day, and so can one that
 *  is past its endurance. The two stack (CLAUDE.md T3 3.5) [TUNE].
 *
 *  A machine at the end of its life does not vanish: it goes on working and gives up oftener, the
 *  chance doubling for every week of its own clock it runs past the end [PIOTR, 18.09, the rule;
 *  TUNE, the doubling] (CLAUDE.md T20 2.9.4). The first week past it is the Turn 8 chance it has
 *  always been, so nothing about a machine that has just worn out has changed. */
export function overdueBreakdownChance(item: Equipment, day: number): number {
  if (item.broken) return 0;
  // The central and the flexi systems are serviced from v50 and still never break down: their own
  // catalogue line is "no more bags and no breakdown", and a line the player has already read is
  // not taken off him by a rule about servicing (CLAUDE.md T10 3.4, T24 2.7).
  if (CENTRAL_EXTRACTION_SPECS.includes(item.specId)) return 0;
  let chance = 0;
  if (serviceIsDue(item, day)) chance += OVERDUE_BREAKDOWN_CHANCE;
  if (pastEndurance(item)) {
    chance += OVERDUE_BREAKDOWN_CHANCE * Math.pow(2, weeksPastLife(item));
  }
  return Math.min(1, chance);
}

/** What is stopping a stage that is done on this family: a machine that has given up, when there
 *  is no other of the family to use instead. Null while the work can go on (CLAUDE.md 9.6,
 *  T7 3.1). The family, not the material: a broken saw stops the cutting of anything, and a
 *  broken edgebander stops nothing but the machining. */
export function familyStopped(
  state: GameState,
  specId: string,
): { item: Equipment; why: 'broken' | 'bags' | 'service' } | null {
  const machines = owned(state, specId);
  if (machines.length === 0) return null;
  const out = (item: Equipment): boolean => item.broken || machineIsOut(item, state.clock.day);
  // One away being serviced stops the stage the way a broken one does, and says which it is
  // (PIOTR, 18.09; CLAUDE.md T20 2.9.3).
  if (!machines.some((item) => !out(item))) {
    const broken = machines.find((item) => item.broken);
    if (broken) return { item: broken, why: 'broken' };
    const serviced = machines.find((item) => machineIsOut(item, state.clock.day));
    return serviced ? { item: serviced, why: 'service' } : null;
  }
  // The hall's bags are full: nothing that puts dust into them runs, whatever its class and
  // however many of the family stand in the hall, until they are emptied (CLAUDE.md T12 2.3).
  const first = machines[0];
  if (first && dustOutputOf(specId) > 0 && bagsFull(state)) return { item: first, why: 'bags' };
  return null;
}

// ---------------------------------------------------------------------------
// Bags, the extractor and dust (CLAUDE.md 9.6, 9.7)
// ---------------------------------------------------------------------------

/** With the central system there are no bags at all (CLAUDE.md 9.2). */
export function bagsExist(state: GameState): boolean {
  if (hasCentralExtraction(state)) return false;
  return has(state, 'extractor');
}

/** Six places, not four: a third of a minute rounded to four drifts by a whole hour over the
 *  fifteen hundred minutes it takes to wear a saw in. */
function round6(value: number): number {
  return Math.round(value * 1000000) / 1000000;
}

/** Books the minutes somebody actually stood at a machine this minute: the hours that wear it
 *  out and the cubic metres of dust it made, and nothing else. A machine nobody is at gains
 *  nothing, which is what "hours are the minutes somebody stood at it" means (CLAUDE.md T7 2).
 *  The map is person minutes per machine: one for a machine one man is standing at, more for a
 *  hand tool two men have out of their cabinets at once, and one for a fan the whole time the
 *  extraction is running. The dust is the family's figure an hour
 *  (CLAUDE.md T12 2.1): every machine's goes on the day's total, and into the hall's one bag
 *  store while the hall keeps its dust in bags. A central system takes it away and a hall with no
 *  fan has no bag to put it in, and the figure is still counted for the day (CLAUDE.md T12 2.3).
 *  Returns true the minute the store fills. */
export function accumulateMachineMinute(
  state: GameState,
  minutesByItem: ReadonlyMap<string, number>,
): boolean {
  let madeM3 = 0;
  for (const item of state.equipment) {
    const minutes = minutesByItem.get(item.id) ?? 0;
    if (minutes <= 0) continue;
    const spec = findSpec(item.specId);
    if (!spec) continue;
    if (isServiced(spec.id)) {
      item.hoursUsed = round6(item.hoursUsed + minutes / 60);
      // The machine's own week and month, for the Machines column and the month end: the life
      // clock cannot answer either of them (CLAUDE.md T17 2.24, 2.25).
      item.hoursThisWeek = round6(item.hoursThisWeek + minutes / 60);
      item.hoursThisMonth = round6(item.hoursThisMonth + minutes / 60);
    }
    madeM3 += (dustOutputOf(item.specId) / 60) * minutes;
  }
  if (madeM3 <= 0) return false;
  state.dayStats.dustM3 = round6(state.dayStats.dustM3 + madeM3);
  const store = bagStore(state);
  if (!store.exists || store.bags <= 0 || store.full) return false;
  // The store holds what it holds: a minute that would fill it past the brim fills it to the brim.
  state.bagFillM3 = round6(Math.min(store.capacityM3, store.fillM3 + madeM3));
  return bagsFull(state);
}

/** Cubic metres of sawdust an hour that somebody stands at a machine of this family, off
 *  Piotr's table. Zero for anything that is not on it (CLAUDE.md T12 2.1). */
export function dustOutputOf(specId: string): number {
  return DUST_OUTPUT_M3_PER_HOUR[specId] ?? 0;
}

/** The bags on this class of extractor, and none on anything else (CLAUDE.md T12 2.3). */
export function bagsOf(item: { specId: string; variantId: string }): number {
  if (item.specId !== 'extractor') return 0;
  return EXTRACTOR_BAGS[item.variantId] ?? 0;
}

/** The hall's one bag store (CLAUDE.md T12 2.3). */
export interface BagStore {
  /** True while the hall keeps its dust in bags at all: an extractor and no central system. */
  exists: boolean;
  /** Bags in the store: every extractor standing in the hall added up, because the hall is one
   *  duct run however many fans are on it. */
  bags: number;
  capacityM3: number;
  fillM3: number;
  /** True while the store is at its capacity: nothing that makes dust runs until it is emptied. */
  full: boolean;
}

/** How full is this hall's store: the one place that is read. The floor, the Owned tab, the
 *  chore and the full rule all come through here (CLAUDE.md T12 2.3). */
export function bagStore(state: GameState): BagStore {
  const exists = bagsExist(state);
  let bags = 0;
  for (const item of state.equipment) {
    if (isSold(item) || !itemStandsInTheHall(item)) continue;
    bags += bagsOf(item);
  }
  const capacityM3 = bagsToM3(bags);
  const fillM3 = state.bagFillM3;
  return { exists, bags, capacityM3, fillM3, full: exists && bags > 0 && fillM3 >= capacityM3 };
}

/** True while the hall's bags are full (CLAUDE.md T12 2.3). */
export function bagsFull(state: GameState): boolean {
  return bagStore(state).full;
}

/** True once the store is far enough up for a helper to start on it: `BAGS_HELPER_EMPTY_AT` of
 *  its capacity (PIOTR, 22.09; v46). Full counts too. */
export function bagsWantEmptying(state: GameState): boolean {
  const store = bagStore(state);
  if (!store.exists || store.bags <= 0) return false;
  return store.fillM3 >= store.capacityM3 * BAGS_HELPER_EMPTY_AT;
}

/** What the store reads on the floor, on the Owned tab and under the hall: "Bags 4.6 / 10 m3",
 *  with the unit once (CLAUDE.md T12 3.3). */
export function bagStoreLine(store: BagStore): string {
  return `Bags ${trimmed(store.fillM3, 1)} / ${cubicMetres(store.capacityM3)}`;
}

/** Emptied: the store is back to nothing (CLAUDE.md T12 2.3). */
export function emptyBags(state: GameState): void {
  state.bagFillM3 = 0;
}

/** Dust gained per minute of production, tripled by a broken extractor or by a hall whose
 *  machines are asking for more air than its fans will move, and doubled when the crew is too big
 *  for no helper (CLAUDE.md 9.6, 9.7, T10 3.1). */
export function dustGainPerMinute(state: GameState): number {
  let gain = DUST_PER_PRODUCTION_MINUTE;
  if (extractorBroken(state)) gain *= EXTRACTOR_BROKEN_DUST_MULTIPLIER;
  if (underExtracted(state)) gain *= UNDER_EXTRACTION_DUST_MULTIPLIER;
  if (helperMissing(state)) gain *= NO_HELPER_DUST_MULTIPLIER;
  return gain;
}

export function addDust(state: GameState, minutes: number): void {
  state.dust = Math.min(DUST_MAX, state.dust + dustGainPerMinute(state) * minutes);
}

export function clearDust(state: GameState): void {
  state.dust = 0;
}

/** Chance the extractor gives up today, higher when the hall is filthy [TUNE]. */
export function extractorBreakdownChance(state: GameState): number {
  if (hasCentralExtraction(state)) return 0;
  if (!has(state, 'extractor')) return 0;
  // Past the messy band, which is the same edge dustBand uses.
  return state.dust > DUST_HIGH_THRESHOLD
    ? EXTRACTOR_BREAKDOWN_CHANCE_HIGH_DUST
    : EXTRACTOR_BREAKDOWN_CHANCE;
}

export function breakExtractor(state: GameState): Equipment | null {
  const extractor = state.equipment.find((item) => item.specId === 'extractor');
  if (!extractor || extractor.broken) return null;
  extractor.broken = true;
  return extractor;
}

export function breakMachine(state: GameState, equipmentId: string): Equipment | null {
  const item = state.equipment.find((entry) => entry.id === equipmentId);
  if (!item || item.broken) return null;
  item.broken = true;
  return item;
}

/** One path for putting anything right again, the extractor included. */
export function repairMachine(state: GameState, equipmentId: string): Equipment | null {
  const item = state.equipment.find((entry) => entry.id === equipmentId);
  if (!item) return null;
  item.broken = false;
  return item;
}

/** The service is called in: the six months to the next one start again today, the machine's life is
 *  extended by half of what the last extension was, and it stands there doing nothing until the
 *  next working day [PIOTR, 18.09; the first service is out for the day too, TUNE: his decision
 *  is open] (CLAUDE.md T20 2.9). A service is not a repair, so a machine that has already given
 *  up stays broken until somebody repairs it; `serviceCallCheck` is what refuses the call. */
export function serviceMachine(state: GameState, equipmentId: string): Equipment | null {
  const item = state.equipment.find((entry) => entry.id === equipmentId);
  if (!item) return null;
  item.servicedDay = state.clock.day;
  item.serviceCount += 1;
  item.enduranceHours = lifeAfterServices(originalLifeOf(item), item.serviceCount);
  item.inServiceUntilDay = nextWorkingDay(state.clock.day);
  return item;
}

export function brokenMachines(state: GameState): Equipment[] {
  return state.equipment.filter((item) => item.broken);
}

/** True when the hall is dangerous enough for somebody to get hurt (CLAUDE.md 9.7). */
export function accidentRisk(state: GameState): boolean {
  return dustBand(state.dust).label === 'dangerous';
}

// ---------------------------------------------------------------------------
// What the machines saved (CLAUDE.md T17 2.24, 2.25): the Machines column of the Company board
// and the machines line of the month end. Informational: nothing here multiplies anything, the
// hours are the ones somebody actually stood at the machine, and the effect is the class's own
// factor with the gate on it, exactly as the minute of work reads it.
// ---------------------------------------------------------------------------

/** The machines' own week and month clocks. The week starts again on the first working day of a
 *  new week, the way the men's month meters start (staff.ts).
 *
 *  The month clock starts again a day later than that: on the SECOND working day of the month.
 *  The month end of the month that has just gone is raised and answered on the first working day
 *  of the new one and reads these hours, so the clock has to still hold the month it reports on
 *  that morning. The run it measures is therefore the morning after one month end to the morning
 *  of the next: every working day falls in exactly one report, and none in two
 *  (CLAUDE.md T17 2.24, 2.25). */
export function startMachineMeters(state: GameState): void {
  const days = state.days;
  const last = days[days.length - 1];
  const before = days[days.length - 2];
  const freshWeek = last === undefined || weekOfDay(last.day) !== weekOfDay(state.clock.day);
  const freshMonth =
    last !== undefined &&
    before !== undefined &&
    monthOfDay(last.day) === monthOfDay(state.clock.day) &&
    monthOfDay(before.day) !== monthOfDay(last.day);
  if (!freshWeek && !freshMonth) return;
  for (const item of state.equipment) {
    if (freshWeek) {
      // What last week's hours saved at the class the machine has this morning, written down
      // before the week clock starts again, so the Machines sheet can say last week beside
      // this week (PIOTR, 21.09; v40). The class is read now, not then: a gate fitted over the
      // weekend counts its week from Monday, which is one reading and not two.
      item.minutesSavedLastWeek = minutesSavedBy(state, item, item.hoursThisWeek);
      item.hoursThisWeek = 0;
    }
    if (freshMonth) item.hoursThisMonth = 0;
  }
}

/** The minutes this machine's class saved over so many hours at it: the effect of its class, the
 *  gate's two per cent in it, times the minutes it ran. The one arithmetic the week, the month
 *  and last week are all read through (CLAUDE.md T17 2.24; v40). */
export function minutesSavedBy(state: GameState, item: Equipment, hours: number): number {
  const spec = findSpec(item.specId);
  if (!spec || spec.category !== 'machine') return 0;
  const effect = roundPoints(hallPace(state, item.specId) - 1);
  return Math.round(hours * 60 * effect);
}

export interface MachineSaving {
  id: string;
  /** The class, the way the card names it: "Standard table saw". */
  name: string;
  /** What its class does to the stage it does, the gate's 2% in it: 0.05 is +5%. */
  effect: number;
  gate: boolean;
  /** Hours somebody stood at it in the span. */
  hours: number;
  /** Hours times the effect, in minutes: what those hours would have taken without it. */
  minutesSaved: number;
  /** What is wrong with it this minute, as a factor off 1, and what it is. Zero while nothing is.
   *  There is no per machine penalty in the engine: the air is per compressor and the extraction
   *  is one hall wide line, and each is shown on the row that draws it (CLAUDE.md T17 2.24). */
  minus: number;
  minusWhy: string;
}

export interface MachineSavings {
  rows: MachineSaving[];
  hours: number;
  minutesSaved: number;
  hoursSaved: number;
  /** What the same machines saved last week, in hours, off what each wrote down on the Monday
   *  (v40). Only the week span carries it; the month's is 0. */
  hoursSavedLastWeek: number;
}

/** What is wrong with this machine this minute: it cannot run on the air it is given, the
 *  compressor it draws on is short of litres, or it has no pipe to the extraction and the hall is
 *  short because of it. */
function machineMinus(
  state: GameState,
  item: Equipment,
  air: AirCheck,
): { minus: number; why: string } {
  const blocked = airBlockFor(state, item);
  if (blocked !== '') return { minus: -1, why: blocked };
  const compressor = airDemandOf(item) === null ? null : compressorFor(state, item);
  if (compressor !== null && compressorIsLow(air, compressor.id)) {
    return { minus: LOW_AIR_FACTOR - 1, why: 'short of air' };
  }
  if (extractionDemandOf(item) > 0 && !isConnectedToExtraction(state, item)) {
    return { minus: -UNDER_EXTRACTION_OUTPUT_PENALTY, why: 'no pipe to the extraction' };
  }
  return { minus: 0, why: '' };
}

/** One row per machine standing in the hall, with the hours it ran in the span and the minutes
 *  its class saved over those hours. `week` reads the machine's week clock and `month` its month
 *  one (CLAUDE.md T17 2.24, 2.25). */
export function machineSavings(state: GameState, span: 'week' | 'month'): MachineSavings {
  const air = airCheck(state);
  const rows: MachineSaving[] = [];
  let hours = 0;
  let minutesSaved = 0;
  let minutesSavedLastWeek = 0;
  for (const item of state.equipment) {
    if (isSold(item) || !itemStandsInTheHall(item)) continue;
    const spec = findSpec(item.specId);
    if (!spec || spec.category !== 'machine') continue;
    const effect = roundPoints(hallPace(state, item.specId) - 1);
    const ran = span === 'week' ? item.hoursThisWeek : item.hoursThisMonth;
    const saved = minutesSavedBy(state, item, ran);
    if (span === 'week') minutesSavedLastWeek += item.minutesSavedLastWeek;
    const wrong = machineMinus(state, item, air);
    rows.push({
      id: item.id,
      // The class, named the way the catalogue tile and the machine card name it.
      name: variantFor(item)?.name ?? spec.name,
      effect,
      gate: hasGate(state, item),
      hours: Math.round(ran * 10) / 10,
      minutesSaved: saved,
      minus: roundPoints(wrong.minus),
      minusWhy: wrong.why,
    });
    hours += ran;
    minutesSaved += saved;
  }
  rows.sort((left, right) => right.minutesSaved - left.minutesSaved || left.name.localeCompare(right.name));
  return {
    rows,
    hours: Math.round(hours * 10) / 10,
    minutesSaved,
    hoursSaved: Math.round((minutesSaved / 60) * 10) / 10,
    hoursSavedLastWeek: Math.round((minutesSavedLastWeek / 60) * 10) / 10,
  };
}
