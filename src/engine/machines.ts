// Machine queries. The bag, extractor and dust behaviour lands in T1-09; what is here is the
// ownership and power side that the economy needs.

import { EQUIPMENT_SPECS } from './constants';
import type { Equipment, EquipmentSpec, GameState } from './types';

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
