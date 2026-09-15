// Machine queries. The bag, extractor and dust behaviour lands in T1-09; what is here is the
// ownership and power side that the economy needs.

import {
  DUCTING_RECONNECT_COST,
  DUST_BANDS,
  HEAVY_SPECS,
  LIGHT_CLASSES,
  EXTRACTOR_BROKEN_OUTPUT_FACTOR,
  BREAK_SKIP_FACTOR,
  GATE_CROWD_FACTOR,
  GATE_CROWD_LIMIT,
  MACHINE_REPAIR_COST_FRACTION,
  OVERDUE_BREAKDOWN_CHANCE,
  SERVICE_COST_FRACTION,
  SERVICE_INTERVAL_HOURS,
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
  NO_DUCTING_SPECS,
  NO_HELPER_DUST_MULTIPLIER,
  NO_HELPER_PRODUCTIVITY_FACTOR,
  SALE_FRACTION,
  UNDER_EXTRACTION_DUST_MULTIPLIER,
  UNDER_EXTRACTION_OUTPUT_PENALTY,
  SALE_FRACTION_USED,
  USED_VARIANT,
} from './constants';
import { extractionCheck, underExtracted } from './media';
import type {
  Equipment,
  EquipmentSpec,
  EquipmentVariant,
  GameState,
  MaterialKind,
} from './types';

export function specOf(specId: string): EquipmentSpec {
  const spec = EQUIPMENT_SPECS.find((entry) => entry.id === specId);
  if (!spec) throw new Error(`unknown equipment: ${specId}`);
  return spec;
}

export function findSpec(specId: string): EquipmentSpec | null {
  return EQUIPMENT_SPECS.find((entry) => entry.id === specId) ?? null;
}

/** What a class of a family stands on, in metres: the picture's own footprint. A class that says
 *  nothing takes the family's (CLAUDE.md T7 3.3). */
export function footprintOf(
  specId: string,
  variantId?: string,
  rotated = false,
): { width: number; depth: number; height: number } {
  const spec = findSpec(specId);
  if (!spec) return { width: 1, depth: 1, height: 1 };
  const variant = variantOf(spec, variantId ?? spec.variants[0]?.id ?? '');
  const width = variant.width ?? spec.width;
  const depth = variant.depth ?? spec.depth;
  return {
    width: rotated ? depth : width,
    depth: rotated ? width : depth,
    height: variant.height ?? spec.height,
  };
}

/** The same question of something already standing in the hall, which knows how it is turned. */
export function itemFootprint(item: {
  specId: string;
  variantId: string;
  rotated?: boolean;
}): { width: number; depth: number; height: number } {
  return footprintOf(item.specId, item.variantId, item.rotated === true);
}

/** The floor a class reserves, in metres: the working room around it, which contains the
 *  footprint. Nothing may be built on it (CLAUDE.md T7 3.3). */
export function zoneOf(
  specId: string,
  variantId?: string,
  rotated = false,
): { width: number; depth: number } {
  const spec = findSpec(specId);
  if (!spec) return { width: 1, depth: 1 };
  const variant = variantOf(spec, variantId ?? spec.variants[0]?.id ?? '');
  const width = variant.zoneWidth ?? spec.zoneWidth;
  const depth = variant.zoneDepth ?? spec.zoneDepth;
  return { width: rotated ? depth : width, depth: rotated ? width : depth };
}

/** The same question of something already standing in the hall. */
export function itemZone(item: {
  specId: string;
  variantId: string;
  rotated?: boolean;
}): { width: number; depth: number } {
  return zoneOf(item.specId, item.variantId, item.rotated === true);
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

/** The families the Owned tab offers a sale on: what the game calls a machine, standing on the
 *  hall floor (CLAUDE.md T8 3.5). A bench, a rack and a locker are fittings, not plant. */
export function isSellableFamily(specId: string): boolean {
  const category = findSpec(specId)?.category;
  return category === 'machine' || category === 'extraction';
}

/** Tools of this family that live in a cabinet: two men can have one out at once. */
export function cabinetTools(state: GameState, specId: string): Equipment[] {
  return owned(state, specId).filter((item) => !itemStandsInTheHall(item) && !isSold(item));
}

/** Machines of this family nobody is standing at. */
export function freeMachines(state: GameState, specId: string): Equipment[] {
  return floorMachines(state, specId).filter((item) => item.takenBy === null && !item.broken);
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
    const factor = variantFor(item)?.outputFactor ?? 1;
    if (best === null || factor > (variantFor(best)?.outputFactor ?? 1)) best = item;
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

/** Without a bench there is no way to start production, and two men cannot share one
 *  (CLAUDE.md T4 3.4). A job whose man is already at a bench keeps it. */
export function hasBenchFor(state: GameState, jobId: string | null): boolean {
  const job = jobId === null ? null : state.jobs.find((entry) => entry.id === jobId) ?? null;
  const who = job?.assignedTo ?? null;
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
  for (const worker of state.workers) {
    if (worker.rate <= 0 || worker.rate >= 1) continue;
    lines.push({
      label: `${worker.name}, ${worker.tier ?? 'a'} ${worker.role}`,
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
    const factor = variantOf(spec, item.variantId).outputFactor;
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
    const factor = variantFor(item)?.outputFactor ?? 1;
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
  return has(state, 'dustSystem') || has(state, 'flexiSystem');
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

/** What the moves the player has made will cost in ducting, and on how many machines. */
export function ductingDue(state: GameState): { machines: number; cost: number } {
  const machines = ductedMoves(state).length;
  return { machines, cost: machines * DUCTING_RECONNECT_COST };
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

/** 2% of what the machine cost [TUNE]. */
export function serviceCostFor(item: Equipment): number {
  return Math.round(item.purchasePrice * SERVICE_COST_FRACTION * 100) / 100;
}

/** The extractor keeps its Turn 1 parts bill, every other machine is 5% of its price [TUNE]. */
export function repairCostFor(item: Equipment): number {
  if (item.specId === 'extractor') return EXTRACTOR_REPAIR_COST;
  return Math.round(item.purchasePrice * MACHINE_REPAIR_COST_FRACTION * 100) / 100;
}

/** A machine that is past its service hours can give up on any working day, and so can one that
 *  is past its endurance. The two stack (CLAUDE.md T3 3.5) [TUNE]. */
export function overdueBreakdownChance(item: Equipment): number {
  if (item.broken) return 0;
  let chance = 0;
  if (serviceIsDue(item)) chance += OVERDUE_BREAKDOWN_CHANCE;
  if (pastEndurance(item)) chance += OVERDUE_BREAKDOWN_CHANCE;
  return chance;
}

/** What is stopping a stage that is done on this family: a machine that has given up, or one
 *  whose bag is full, when there is no other of the family to use instead. Null while the work
 *  can go on (CLAUDE.md 9.6, T7 3.1). The family, not the material: a broken saw stops the
 *  cutting of anything, and a broken edgebander stops nothing but the machining. */
export function familyStopped(
  state: GameState,
  specId: string,
): { item: Equipment; why: 'broken' | 'bag' } | null {
  const machines = owned(state, specId);
  if (machines.length === 0) return null;
  const bags = bagsExist(state);
  const usable = machines.filter((item) => !item.broken && !(bags && item.bagFull));
  if (usable.length > 0) return null;
  const broken = machines.find((item) => item.broken);
  if (broken) return { item: broken, why: 'broken' };
  const full = machines.find((item) => item.bagFull);
  return full ? { item: full, why: 'bag' } : null;
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
 *  out, and nothing else. A machine nobody is at gains nothing, which is what "hours are the
 *  minutes somebody stood at it" means (CLAUDE.md T7 2). The map is person minutes per machine:
 *  one for a machine one man is standing at, more for a hand tool two men have out of their
 *  cabinets at once. */
export function accumulateMachineMinute(
  state: GameState,
  minutesByItem: ReadonlyMap<string, number>,
): void {
  for (const item of state.equipment) {
    const minutes = minutesByItem.get(item.id) ?? 0;
    if (minutes <= 0) continue;
    const spec = findSpec(item.specId);
    if (!spec) continue;
    if (spec.category === 'machine') item.hoursUsed = round6(item.hoursUsed + minutes / 60);
  }
}

export function emptyBag(state: GameState, equipmentId: string): void {
  const item = state.equipment.find((entry) => entry.id === equipmentId);
  if (!item) return;
  item.bagFull = false;
  item.minutesUsed = 0;
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

/** The service is done: the clock on the next one starts again. A service is not a repair, so a
 *  machine that has already given up stays broken until somebody repairs it. */
export function serviceMachine(state: GameState, equipmentId: string): Equipment | null {
  const item = state.equipment.find((entry) => entry.id === equipmentId);
  if (!item) return null;
  item.serviceHours = item.hoursUsed;
  return item;
}

export function brokenMachines(state: GameState): Equipment[] {
  return state.equipment.filter((item) => item.broken);
}

/** True when the hall is dangerous enough for somebody to get hurt (CLAUDE.md 9.7). */
export function accidentRisk(state: GameState): boolean {
  return dustBand(state.dust).label === 'dangerous';
}
