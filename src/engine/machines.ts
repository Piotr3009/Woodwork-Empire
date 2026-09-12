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
  SERVICE_INTERVAL_DAYS,
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

/** The jobs standing at a bench this minute, oldest first by the minute they went to one, so a
 *  job that starts later never turns a man off the bench he is already at (CLAUDE.md T4 3.4). */
function jobsAtBenches(state: GameState): string[] {
  return state.jobs
    .filter((job) => job.stage === 'inProduction' && job.assignedTo !== null)
    .slice()
    .sort((left, right) => (left.benchSince ?? 0) - (right.benchSince ?? 0))
    .map((job) => job.id);
}

/** Without a bench there is no way to start production, and two men cannot share one
 *  (CLAUDE.md T4 3.4). A job already standing at a bench keeps it. */
export function hasBenchFor(state: GameState, jobId: string | null): boolean {
  const benches = countOf(state, 'workbench');
  const standing = jobsAtBenches(state);
  const index = jobId === null ? -1 : standing.indexOf(jobId);
  return index >= 0 ? index < benches : standing.length < benches;
}

/** Benches nobody is standing at. */
export function freeBenches(state: GameState): number {
  return Math.max(0, countOf(state, 'workbench') - jobsAtBenches(state).length);
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
export function needsDucting(specId: string): boolean {
  if (NO_DUCTING_SPECS.includes(specId)) return false;
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
    if (item && needsDucting(item.specId)) moved.push(item);
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

export function serviceDueOn(item: Equipment): number {
  return item.lastServiceDay + SERVICE_INTERVAL_DAYS;
}

export function serviceIsDue(state: GameState, item: Equipment): boolean {
  return state.clock.day >= serviceDueOn(item);
}

export function machinesDueService(state: GameState): Equipment[] {
  return serviceableMachines(state).filter((item) => serviceIsDue(state, item));
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

/** A machine that has gone past its service date can give up on any working day, and so can one
 *  that is past its endurance. The two stack (CLAUDE.md T3 3.5) [TUNE]. */
export function overdueBreakdownChance(state: GameState, item: Equipment): number {
  if (item.broken) return 0;
  let chance = 0;
  if (serviceIsDue(state, item)) chance += OVERDUE_BREAKDOWN_CHANCE;
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

/** Books one minute of use on every machine the job runs through: the hours that wear it out,
 *  and the minutes that fill its bag. Returns the bags that just filled, so the caller can raise
 *  the event (CLAUDE.md 9.6, T3 3.5). */
export function accumulateBagMinutes(state: GameState, material: MaterialKind): Equipment[] {
  for (const item of machinesUsedFor(state, material)) {
    item.hoursUsed = Math.round((item.hoursUsed + 1 / 60) * 10000) / 10000;
  }
  if (!bagsExist(state)) return [];
  const filled: Equipment[] = [];
  for (const item of bagMachinesFor(state, material)) {
    if (item.bagFull) continue;
    item.minutesUsed += 1;
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
  item.lastServiceDay = state.clock.day;
  return item;
}

export function brokenMachines(state: GameState): Equipment[] {
  return state.equipment.filter((item) => item.broken);
}

/** True when the hall is dangerous enough for somebody to get hurt (CLAUDE.md 9.7). */
export function accidentRisk(state: GameState): boolean {
  return dustBand(state.dust).label === 'dangerous';
}
