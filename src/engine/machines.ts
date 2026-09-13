// Machine queries. The bag, extractor and dust behaviour lands in T1-09; what is here is the
// ownership and power side that the economy needs.

import {
  DUCTING_RECONNECT_COST,
  DUST_BANDS,
  EXTRACTOR_BROKEN_OUTPUT_FACTOR,
  GATE_CROWD_FACTOR,
  GATE_CROWD_LIMIT,
  MACHINE_REPAIR_COST_FRACTION,
  OVERDUE_BREAKDOWN_CHANCE,
  SERVICE_COST_FRACTION,
  SERVICE_INTERVAL_HOURS,
  DUST_HIGH_THRESHOLD,
  DUST_MAX,
  DUST_PER_PRODUCTION_MINUTE,
  EQUIPMENT_SPECS,
  EXTRACTOR_REPAIR_COST,
  EXTRACTOR_BREAKDOWN_CHANCE,
  EXTRACTOR_BREAKDOWN_CHANCE_HIGH_DUST,
  EXTRACTOR_BROKEN_DUST_MULTIPLIER,
  HELPER_REQUIRED_FROM_JOINERS,
  NO_DUCTING_SPECS,
  NO_HELPER_DUST_MULTIPLIER,
  NO_HELPER_PRODUCTIVITY_FACTOR,
} from './constants';
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
): { width: number; depth: number; height: number } {
  const spec = findSpec(specId);
  if (!spec) return { width: 1, depth: 1, height: 1 };
  const variant = variantOf(spec, variantId ?? spec.variants[0]?.id ?? '');
  return {
    width: variant.width ?? spec.width,
    depth: variant.depth ?? spec.depth,
    height: variant.height ?? spec.height,
  };
}

/** The floor a class reserves, in metres: the working room around it, which contains the
 *  footprint. Nothing may be built on it (CLAUDE.md T7 3.3). */
export function zoneOf(specId: string, variantId?: string): { width: number; depth: number } {
  const spec = findSpec(specId);
  if (!spec) return { width: 1, depth: 1 };
  const variant = variantOf(spec, variantId ?? spec.variants[0]?.id ?? '');
  return {
    width: variant.zoneWidth ?? spec.zoneWidth,
    depth: variant.zoneDepth ?? spec.zoneDepth,
  };
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

/** Machines of this family that stand on the floor: the ones there can be a queue for. */
export function floorMachines(state: GameState, specId: string): Equipment[] {
  return owned(state, specId).filter((item) => itemStandsInTheHall(item));
}

/** Tools of this family that live in a cabinet: two men can have one out at once. */
export function cabinetTools(state: GameState, specId: string): Equipment[] {
  return owned(state, specId).filter((item) => !itemStandsInTheHall(item));
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

/** Minutes of use this one takes before its bag is full: the family's interval stretched or cut
 *  by its class (CLAUDE.md T3 3.5). */
export function bagIntervalFor(item: Equipment): number {
  const spec = findSpec(item.specId);
  if (!spec || spec.bagInterval <= 0) return 0;
  const variant = variantOf(spec, item.variantId);
  return Math.max(1, Math.round(spec.bagInterval * variant.bagIntervalFactor));
}

/** Hours of use a machine of this family and class has in it. */
export function enduranceHoursFor(specId: string, variantId: string): number {
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

/** What the state of the hall does to every minute of production. */
export function hallProductivityFactor(state: GameState): number {
  let factor = dustFactor(state.dust);
  if (helperMissing(state)) factor *= NO_HELPER_PRODUCTIVITY_FACTOR;
  // Nowhere to put anything down with four finished pieces in the way (CLAUDE.md T2 3.7).
  if (gateIsCrowded(state)) factor *= GATE_CROWD_FACTOR;
  // The extraction is down: the hall crawls rather than stopping dead (CLAUDE.md T2 3.9).
  if (extractorBroken(state)) factor *= EXTRACTOR_BROKEN_OUTPUT_FACTOR;
  return factor;
}

/** What the classes of machine in the hall do to the speed of a job of this material: the best
 *  one of each family, multiplied together. Above 1 is quicker (CLAUDE.md T3 3.5). Two saws do
 *  not make the work twice as fast: only the better of them is used. */
export function machineOutputFactor(state: GameState, material: MaterialKind): number {
  const best = new Map<string, number>();
  for (const item of state.equipment) {
    const spec = findSpec(item.specId);
    if (!spec || spec.category !== 'machine') continue;
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
    const factor = variantFor(item)?.outputFactor ?? 1;
    if (factor > best) best = factor;
  }
  return best > 0 ? best : 1;
}

/** Machines that cut the labour of a job, multiplied together (CLAUDE.md 8.6). */
export function machineLabourFactor(state: GameState, material: MaterialKind): number {
  let factor = 1;
  for (const item of state.equipment) {
    const spec = findSpec(item.specId);
    if (!spec || spec.labourFactor === 1) continue;
    if (spec.labourAppliesTo !== null && spec.labourAppliesTo !== material) continue;
    factor *= spec.labourFactor;
  }
  return factor;
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

/** A broken machine is out until it is repaired: nothing of its material gets made. */
export function brokenMachineFor(state: GameState, material: MaterialKind): Equipment | null {
  return (
    serviceableMachines(state).find((item) => {
      if (!item.broken) return false;
      const spec = findSpec(item.specId);
      if (!spec) return false;
      return spec.usedOn === null || spec.usedOn === material;
    }) ?? null
  );
}

// ---------------------------------------------------------------------------
// Bags, the extractor and dust (CLAUDE.md 9.6, 9.7)
// ---------------------------------------------------------------------------

/** With the central system there are no bags at all (CLAUDE.md 9.2). */
export function bagsExist(state: GameState): boolean {
  if (hasCentralExtraction(state)) return false;
  return has(state, 'extractor');
}

/** Machines with a bag that this material runs through. */
export function bagMachinesFor(state: GameState, material: MaterialKind): Equipment[] {
  return state.equipment.filter((item) => {
    const spec = findSpec(item.specId);
    if (!spec || spec.bagInterval <= 0) return false;
    return spec.usedOn === null || spec.usedOn === material;
  });
}

/** A full bag stops the machine, and nothing of that kind can be made (CLAUDE.md 9.6). Once the
 *  central system is in there are no bags, so nothing is stopped by one. */
export function bagBlocked(state: GameState, material: MaterialKind): boolean {
  if (!bagsExist(state)) return false;
  return bagMachinesFor(state, material).some((item) => item.bagFull);
}

/** Machines this material runs through, bag or no bag: what the hours of use are booked on. */
export function machinesUsedFor(state: GameState, material: MaterialKind): Equipment[] {
  return state.equipment.filter((item) => {
    const spec = findSpec(item.specId);
    if (!spec || spec.category !== 'machine') return false;
    return spec.usedOn === null || spec.usedOn === material;
  });
}

/** Six places, not four: a third of a minute rounded to four drifts by a whole hour over the
 *  fifteen hundred minutes it takes to wear a saw in. */
function round6(value: number): number {
  return Math.round(value * 1000000) / 1000000;
}

/** Books the minutes somebody actually stood at a machine this minute: the hours that wear it
 *  out and the minutes that fill its bag, and nothing else. A machine nobody is at gains nothing,
 *  which is what "hours are the minutes somebody stood at it" means (CLAUDE.md T7 2). The map is
 *  person minutes per machine: one for a machine one man is standing at, more for a hand tool
 *  two men have out of their cabinets at once. Returns the bags that just filled. */
export function accumulateMachineMinute(
  state: GameState,
  minutesByItem: ReadonlyMap<string, number>,
): Equipment[] {
  const bags = bagsExist(state);
  const filled: Equipment[] = [];
  for (const item of state.equipment) {
    const minutes = minutesByItem.get(item.id) ?? 0;
    if (minutes <= 0) continue;
    const spec = findSpec(item.specId);
    if (!spec) continue;
    if (spec.category === 'machine') item.hoursUsed = round6(item.hoursUsed + minutes / 60);
    if (!bags || spec.bagInterval <= 0 || item.bagFull) continue;
    item.minutesUsed = round6(item.minutesUsed + minutes);
    if (item.minutesUsed >= bagIntervalFor(item)) {
      item.bagFull = true;
      filled.push(item);
    }
  }
  return filled;
}

export function emptyBag(state: GameState, equipmentId: string): void {
  const item = state.equipment.find((entry) => entry.id === equipmentId);
  if (!item) return;
  item.bagFull = false;
  item.minutesUsed = 0;
}

/** Dust gained per minute of production, tripled by a broken extractor and doubled when the crew
 *  is too big for no helper (CLAUDE.md 9.6, 9.7). */
export function dustGainPerMinute(state: GameState): number {
  let gain = DUST_PER_PRODUCTION_MINUTE;
  if (extractorBroken(state)) gain *= EXTRACTOR_BROKEN_DUST_MULTIPLIER;
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
