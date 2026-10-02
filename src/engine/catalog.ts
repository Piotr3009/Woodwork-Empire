// The product catalogue: what the workshop can be asked to make, and whether it has the tools.

import {
  LOW_REPUTATION_BAND,
  LOW_REPUTATION_PRICE_FACTOR,
  PRICE_ROUNDING,
  PRODUCT_TEMPLATES,
  SOLID_WOOD_EQUIPMENT,
} from './constants';
import { findSpec, has } from './machines';
import type { Finish, GameState, ProductTemplate } from './types';

export function findTemplate(templateId: string): ProductTemplate | null {
  return PRODUCT_TEMPLATES.find((entry) => entry.id === templateId) ?? null;
}

export function template(templateId: string): ProductTemplate {
  const found = findTemplate(templateId);
  if (!found) throw new Error(`unknown template: ${templateId}`);
  return found;
}

/** Templates a company of this reputation gets asked about at all. */
export function templatesForReputation(reputation: number): ProductTemplate[] {
  return PRODUCT_TEMPLATES.filter((entry) => entry.minReputation <= reputation);
}

/** Tools the workshop is short of for this template. Only kit standing in the hall counts: a
 *  machine on the lorry takes no work until it has landed [PIOTR, 30.09] (v60, reversing T8 3.2).
 *  A CNC stands in for the saw on sheet work: the cutting goes on the CNC whenever the hall has
 *  one (`jobOnCnc`), so a hall with a CNC and no saw is short of nothing for a sheet job
 *  (PIOTR, 02.10: "a CNC replaces several saws"; v62). The one reader: the board's lock and the
 *  catalogue's grey both ask here. */
export function missingEquipment(state: GameState, entry: ProductTemplate): string[] {
  return entry.requiredEquipment.filter((specId) => !has(state, specId) && !cncStandsIn(state, entry, specId));
}

/** True when a CNC in the hall does what this tool would have done for this template. */
function cncStandsIn(state: GameState, entry: ProductTemplate, specId: string): boolean {
  return specId === 'tableSaw' && entry.material === 'sheet' && has(state, 'cnc');
}

/** The greyed out reason on the board, or null when the job can be taken as it stands. */
export function lockReasonFor(state: GameState, entry: ProductTemplate): string | null {
  const missing = missingEquipment(state, entry);
  if (missing.length === 0) return null;
  if (entry.material === 'solidWood' && !SOLID_WOOD_EQUIPMENT.every((id) => has(state, id))) {
    // Timber needs the thicknesser and the spindle moulder; the lock names the ones missing
    // (PIOTR, 24.09; v54).
    const gone = SOLID_WOOD_EQUIPMENT.filter((id) => !has(state, id)).map(
      (id) => `a ${(findSpec(id)?.name ?? id).toLowerCase()}`,
    );
    return `Needs ${gone.join(' and ')}`;
  }
  const names = missing.map((specId) => findSpec(specId)?.name ?? specId);
  return `Needs ${names.join(', ').toLowerCase()}`;
}

/** Finishes the workshop can actually apply. Lacquer needs a spray booth, veneer is parked. */
export function availableFinishes(state: GameState, entry: ProductTemplate): Finish[] {
  return entry.allowedFinishes.filter((finish) => {
    if (finish === 'veneer') return false;
    if (finish === 'lacquer') return has(state, 'sprayBooth');
    return true;
  });
}

/** A company nobody wants to deal with is only offered barely profitable work (CLAUDE.md T2 3.4).
 *  [TUNE band and factor.] */
export function marketPriceFactor(reputation: number): number {
  return reputation < LOW_REPUTATION_BAND ? LOW_REPUTATION_PRICE_FACTOR : 1;
}

/** Price of a size variant, rounded to the nearest 10 (CLAUDE.md 8.8). */
export function priceFor(
  basePrice: number,
  sizeMultiplier: number,
  expressUplift: number,
  marketFactor: number,
): number {
  const raw = basePrice * sizeMultiplier * (1 + expressUplift) * marketFactor;
  return Math.round(raw / PRICE_ROUNDING) * PRICE_ROUNDING;
}
