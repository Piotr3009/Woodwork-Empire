// Machine queries. The bag, extractor and dust behaviour lands in T1-09; what is here is the
// ownership and power side that the economy needs.

import {
  DUST_BANDS,
  EQUIPMENT_SPECS,
  HELPER_REQUIRED_FROM_JOINERS,
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
