// Machine queries. The bag, extractor and dust behaviour lands in T1-09; what is here is the
// ownership and power side that the economy needs.

import {
  DUST_BANDS,
  DUST_HIGH_THRESHOLD,
  DUST_MAX,
  DUST_PER_PRODUCTION_MINUTE,
  EQUIPMENT_SPECS,
  EXTRACTOR_BREAKDOWN_CHANCE,
  EXTRACTOR_BREAKDOWN_CHANCE_HIGH_DUST,
  EXTRACTOR_BROKEN_DUST_MULTIPLIER,
  HELPER_REQUIRED_FROM_JOINERS,
  NO_HELPER_DUST_MULTIPLIER,
  NO_HELPER_PRODUCTIVITY_FACTOR,
} from './constants';
import type { Equipment, EquipmentSpec, GameState, MaterialKind } from './types';

export function specOf(specId: string): EquipmentSpec {
  const spec = EQUIPMENT_SPECS.find((entry) => entry.id === specId);
  if (!spec) throw new Error(`unknown equipment: ${specId}`);
  return spec;
}

export function findSpec(specId: string): EquipmentSpec | null {
  return EQUIPMENT_SPECS.find((entry) => entry.id === specId) ?? null;
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

/** Machines that draw power: every machine plus the extraction kit. */
export function poweredMachines(state: GameState): Equipment[] {
  return state.equipment.filter((item) => {
    const spec = findSpec(item.specId);
    if (!spec) return false;
    return spec.category === 'machine' || spec.category === 'extraction';
  });
}

/** What the bailiff can take: machines and extraction kit, dearest first (CLAUDE.md 8.3). */
export function seizableMachines(state: GameState): Equipment[] {
  return poweredMachines(state)
    .slice()
    .sort((left, right) => right.purchasePrice - left.purchasePrice);
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

/** What the state of the hall does to every minute of production. */
export function hallProductivityFactor(state: GameState): number {
  let factor = dustFactor(state.dust);
  if (helperMissing(state)) factor *= NO_HELPER_PRODUCTIVITY_FACTOR;
  return factor;
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

/** A broken extractor stops every machine in the hall (CLAUDE.md 9.6). */
export function machinesStopped(state: GameState): boolean {
  return state.equipment.some((item) => item.specId === 'extractor' && item.broken);
}

// ---------------------------------------------------------------------------
// Bags, the extractor and dust (CLAUDE.md 9.6, 9.7)
// ---------------------------------------------------------------------------

/** With the central system there are no bags at all (CLAUDE.md 9.2). */
export function bagsExist(state: GameState): boolean {
  if (has(state, 'dustSystem')) return false;
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

/** Books one minute of use on every machine the job runs through. Returns the bags that just
 *  filled, so the caller can raise the event. */
export function accumulateBagMinutes(state: GameState, material: MaterialKind): Equipment[] {
  if (!bagsExist(state)) return [];
  const filled: Equipment[] = [];
  for (const item of bagMachinesFor(state, material)) {
    if (item.bagFull) continue;
    const spec = findSpec(item.specId);
    if (!spec) continue;
    item.minutesUsed += 1;
    if (item.minutesUsed >= spec.bagInterval) {
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
  if (machinesStopped(state)) gain *= EXTRACTOR_BROKEN_DUST_MULTIPLIER;
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
  if (has(state, 'dustSystem')) return 0;
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

export function repairExtractor(state: GameState): void {
  for (const item of state.equipment) {
    if (item.specId === 'extractor') item.broken = false;
  }
}

/** True when the hall is dangerous enough for somebody to get hurt (CLAUDE.md 9.7). */
export function accidentRisk(state: GameState): boolean {
  return dustBand(state.dust).label === 'dangerous';
}
