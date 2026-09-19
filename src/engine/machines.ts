// Machine queries. The bag, extractor and dust behaviour lands in T1-09; what is here is the
// ownership and power side that the economy needs.

import {
  CENTRAL_EXTRACTION_SPECS,
  DUST_BANDS,
  DUST_OUTPUT_M3_PER_HOUR,
  EXTRACTOR_BAGS,
  bagsToM3,
  HEAVY_SPECS,
  LIGHT_CLASSES,
  LOW_AIR_FACTOR,
  EXTRACTOR_BROKEN_OUTPUT_FACTOR,
  BREAK_SKIP_FACTOR,
  GATE_CROWD_FACTOR,
  GATE_CROWD_LIMIT,
  GATE_OUTPUT_BONUS,
  GATE_PRICE,
  MACHINE_REPAIR_COST_FRACTION,
  OVERDUE_BREAKDOWN_CHANCE,
  SERVICE_COST_FRACTION,
  SERVICE_INTERVAL_HOURS,
  TIER_WORDS,
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
} from './constants';
import { weekOfDay, monthOfDay, nextWorkingDay } from './clock';
import { canAfford } from './economy';
import {
  airBlockFor,
  airCheck,
  airDemandOf,
  compressorFor,
  compressorIsLow,
  extractionCheck,
  extractionDemandOf,
  isConnectedToExtraction,
  underExtracted,
} from './media';
import type { AirCheck } from './media';
import { cubicMetres, trimmed } from './text';
import type {
  Equipment,
  EquipmentSpec,
  EquipmentVariant,
  GameState,
  MaterialKind,
  Orientation,
} from './types';

export function specOf(specId: string): EquipmentSpec {
  const spec = EQUIPMENT_SPECS.find((entry) => entry.id === specId);
  if (!spec) throw new Error(`unknown equipment: ${specId}`);
  return spec;
}

export function findSpec(specId: string): EquipmentSpec | null {
  return EQUIPMENT_SPECS.find((entry) => entry.id === specId) ?? null;
}

/** What a man calls this family of machine when he is standing about waiting for it: the trade's
 *  own short word where `MACHINE_SHORT_WORDS` has one, and the catalogue's name lowercased where it
 *  has not (PIOTR's drawing, 19.09, "waiting for the saw"; CLAUDE.md T21 2.6, 2.7).
 *
 *  The phrase it goes into is `waitingLine` in `src/engine/jobs.ts`, which builds the same word the
 *  same way; the bubble over a man's head fills its own `{machine}` slot from here, and
 *  `tests/render/bubbles.test.ts` holds the two equal. A note for the lead in
 *  docs/notes-t21-b3.md asks for `waitingLine` to read this one function, which this agent may not
 *  edit `jobs.ts` to do. */
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
// One person per machine (CLAUDE.md T7 3.1). A machine is free or it is taken by one man. He
// keeps it while he needs it and lets it go the moment he does not, and anybody who wants a
// machine of that family while it is taken stands and waits at it.
// ---------------------------------------------------------------------------

/** Who a machine is taken by, when it is the owner. A worker is his own id. */
export const OWNER = 'owner';

/** True when the hall has nothing of this family to queue for: either it owns none at all, or
 *  everything it owns is kept in a cabinet and comes out to the bench in whoever's hands want it
 *  (CLAUDE.md T7 3.6). */
export function machineIsShared(state: GameState, specId: string): boolean {
  return floorMachines(state, specId).length === 0;
}

/** Machines of this family that stand on the floor: the ones there can be a queue for. A machine
 *  that is sold is not one of them: it stops working the minute the sale is made and stands there
 *  until the buyer's van comes (CLAUDE.md T8 3.5). */
export function floorMachines(state: GameState, specId: string): Equipment[] {
  return owned(state, specId).filter((item) => itemStandsInTheHall(item) && !isSold(item));
}

/** Sold, and waiting for the van at the gate. */
export function isSold(item: Equipment): boolean {
  return item.soldOnDay !== null;
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

/** Machines of this family nobody is standing at. */
export function freeMachines(state: GameState, specId: string): Equipment[] {
  // A machine away being serviced is no more use than a broken one (CLAUDE.md T20 2.9.3).
  return floorMachines(state, specId).filter(
    (item) => item.takenBy === null && !item.broken && !machineIsOut(item, state.clock.day),
  );
}

/** The machine of this family this man is standing at, or null. */
export function heldMachine(state: GameState, who: string, specId: string): Equipment | null {
  return owned(state, specId).find((item) => item.takenBy === who) ?? null;
}

/** Everything this man is standing at. */
export function heldMachines(state: GameState, who: string): Equipment[] {
  return state.equipment.filter((item) => item.takenBy === who);
}

/** Gives this man a machine of the family, or says there is none to be had. He keeps the one he
 *  is already at; otherwise he takes the best of the free ones, which is what a joiner would do
 *  and what the projection on his job card assumes he will get. */
export function claimMachine(state: GameState, who: string, specId: string): Equipment | null {
  const held = heldMachine(state, who, specId);
  if (held) return held;
  const free = freeMachines(state, specId);
  let best: Equipment | null = null;
  for (const item of free) {
    const factor = outputFactorOf(state, item);
    if (best === null || factor > outputFactorOf(state, best)) best = item;
  }
  if (best === null) return null;
  best.takenBy = who;
  return best;
}

/** He walks away from everything he is standing at, except the families named. */
export function releaseMachines(state: GameState, who: string, keep: readonly string[] = []): void {
  for (const item of state.equipment) {
    if (item.takenBy !== who) continue;
    if (keep.includes(item.specId)) continue;
    item.takenBy = null;
  }
}

/** Everybody who is not in this list walks away from whatever he was standing at. */
export function releaseMachinesExcept(state: GameState, working: readonly string[]): void {
  for (const item of state.equipment) {
    if (item.takenBy !== null && !working.includes(item.takenBy)) item.takenBy = null;
  }
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

/** What this machine does to the speed of its own stage: its class's factor, and the gate's
 *  bonus on top of it once one is fitted (PIOTR: +2%; CLAUDE.md T13 3.11). The one place a
 *  machine's output factor is read: the man on it, the projection, the board and the choice of
 *  the best free one all come through here. */
export function outputFactorOf(state: GameState, item: Equipment): number {
  const base = variantFor(item)?.outputFactor ?? 1;
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

/** Without a bench there is no way to start production, and two men cannot share one
 *  (CLAUDE.md T4 3.4). A job whose man is already at a bench keeps it. */
export function hasBenchFor(state: GameState, jobId: string | null): boolean {
  const job = jobId === null ? null : state.jobs.find((entry) => entry.id === jobId) ?? null;
  const who = job?.assignees[0] ?? null;
  if (who !== null && heldMachine(state, who, BENCH) !== null) return true;
  return freeMachines(state, BENCH).length > 0;
}

/** Benches nobody is standing at. */
export function freeBenches(state: GameState): number {
  return freeMachines(state, BENCH).length;
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

/** What the bailiff can take: machines, cheapest first (CLAUDE.md T2 3.4). The extraction kit is
 *  left where it is, because taking it would stop the hall dead instead of slowing it. */
export function seizableMachines(state: GameState): Equipment[] {
  return state.equipment
    .filter((item) => findSpec(item.specId)?.category === 'machine')
    .slice()
    .sort((left, right) => left.purchasePrice - right.purchasePrice);
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

/** What the hall is turning out and why, line by line. The one selector for it: the number the
 *  engine multiplies production by is this list's total, so the board and the bench cannot
 *  disagree about the state of the hall (CLAUDE.md T9 3.10). */
export function outputBreakdown(state: GameState): OutputBreakdown {
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
      label: `${worker.name}, ${worker.tier === null ? 'a' : TIER_WORDS[worker.tier]} ${worker.role}`,
      points: roundPoints(worker.rate - 1),
      hall: false,
      where: 'his own minutes',
    });
  }
  const families = new Set(
    state.equipment
      .filter((item) => !isSold(item) && findSpec(item.specId)?.category === 'machine')
      .map((item) => item.specId),
  );
  for (const specId of Array.from(families).sort()) {
    const factor = bestOutputFactor(state, specId);
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
export function hallProductivityFactor(state: GameState): number {
  return outputBreakdown(state).total;
}

/** What the classes of machine in the hall do to the speed of a job of this material: the best
 *  one of each family, multiplied together. Above 1 is quicker (CLAUDE.md T3 3.5). Two saws do
 *  not make the work twice as fast: only the better of them is used. */
export function machineOutputFactor(state: GameState, material: MaterialKind): number {
  const best = new Map<string, number>();
  for (const item of state.equipment) {
    const spec = findSpec(item.specId);
    if (!spec || spec.category !== 'machine' || isSold(item)) continue;
    if (spec.usedOn !== null && spec.usedOn !== material) continue;
    const factor = outputFactorOf(state, item);
    best.set(spec.id, Math.max(best.get(spec.id) ?? 0, factor));
  }
  let product = 1;
  for (const factor of best.values()) product *= factor;
  return product;
}

/** The best class of this family standing in the hall: what the projection of a job's minutes is
 *  worked out from before anybody knows which one of them he will actually get. 1 when the
 *  workshop owns none, so a caller that has not asked `has` first is never told a job is quicker
 *  than it is (CLAUDE.md T7 3.1). */
export function bestOutputFactor(state: GameState, specId: string): number {
  let best = 0;
  for (const item of owned(state, specId)) {
    if (isSold(item)) continue;
    const factor = outputFactorOf(state, item);
    if (factor > best) best = factor;
  }
  return best > 0 ? best : 1;
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

/** Machines with a bag or a blade, the ones that are serviced and can break down. */
export function serviceableMachines(state: GameState): Equipment[] {
  return state.equipment.filter((item) => findSpec(item.specId)?.category === 'machine');
}

/** Hours the machine has run since it was last serviced. */
export function hoursSinceService(item: Equipment): number {
  return Math.max(0, Math.round((item.hoursUsed - item.serviceHours) * 1000000) / 1000000);
}

/** Hours of use still to go before the next service is due. */
export function serviceDueIn(item: Equipment): number {
  return Math.max(0, Math.round((SERVICE_INTERVAL_HOURS - hoursSinceService(item)) * 100) / 100);
}

export function serviceIsDue(item: Equipment): boolean {
  return hoursSinceService(item) >= SERVICE_INTERVAL_HOURS;
}

export function machinesDueService(state: GameState): Equipment[] {
  return serviceableMachines(state).filter((item) => serviceIsDue(item));
}

/** A tenth of what the machine cost [PIOTR, 18.09; CLAUDE.md T20 2.9.2]. The fraction itself is
 *  `SERVICE_COST_FRACTION`, which is a tenth of what the machine cost [PIOTR, 18.09]. Everything
 *  here and every test reads the constant and never the figure. */
export function serviceCostFor(item: Equipment): number {
  return Math.round(item.purchasePrice * SERVICE_COST_FRACTION * 100) / 100;
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
  if (findSpec(item.specId)?.category !== 'machine') {
    return { ok: false, reason: 'It is repaired, never serviced' };
  }
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
export function overdueBreakdownChance(item: Equipment): number {
  if (item.broken) return 0;
  let chance = 0;
  if (serviceIsDue(item)) chance += OVERDUE_BREAKDOWN_CHANCE;
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
 *  hand tool two men have out of their cabinets at once. The dust is the family's figure an hour
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
    if (spec.category === 'machine') {
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

/** The service is called in: the clock on the next one starts again, the machine's life is
 *  extended by half of what the last extension was, and it stands there doing nothing until the
 *  next working day [PIOTR, 18.09; the first service is out for the day too, TUNE: his decision
 *  is open] (CLAUDE.md T20 2.9). A service is not a repair, so a machine that has already given
 *  up stays broken until somebody repairs it; `serviceCallCheck` is what refuses the call. */
export function serviceMachine(state: GameState, equipmentId: string): Equipment | null {
  const item = state.equipment.find((entry) => entry.id === equipmentId);
  if (!item) return null;
  item.serviceHours = item.hoursUsed;
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
    if (freshWeek) item.hoursThisWeek = 0;
    if (freshMonth) item.hoursThisMonth = 0;
  }
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
  for (const item of state.equipment) {
    if (isSold(item) || !itemStandsInTheHall(item)) continue;
    const spec = findSpec(item.specId);
    if (!spec || spec.category !== 'machine') continue;
    const effect = roundPoints(outputFactorOf(state, item) - 1);
    const ran = span === 'week' ? item.hoursThisWeek : item.hoursThisMonth;
    const saved = Math.round(ran * 60 * effect);
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
  };
}
