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
 *  A saw is one of them whatever else the hall has: a joinery shop always has a saw, even the
 *  smallest one, and a CNC does not stand in for it [PIOTR, 03.10: "one has to be there, even a
 *  small one; the CNC will not cope"] (v68, reversing v62). What the CNC does take off the saw is
 *  the cutting of a sheet job (`jobOnCnc`), so with one in the hall the number of saws against the
 *  men counts for nothing. A saw that is broken or away for its service is still the shop's saw.
 *  The one reader: the board's lock and the catalogue's grey both ask here. */
export function missingEquipment(state: GameState, entry: ProductTemplate): string[] {
  // A window's or a door's cutter set is kit the enquiry needs exactly as a machine is
  // (CLAUDE.md T28 2.6).
  const wanted = entry.cutters === null ? entry.requiredEquipment : [...entry.requiredEquipment, entry.cutters];
  return wanted.filter((specId) => !has(state, specId));
}

/** The greyed out reason on the board, or null when the job can be taken as it stands. */
export function lockReasonFor(state: GameState, entry: ProductTemplate): string | null {
  const missing = missingEquipment(state, entry);
  if (missing.length === 0) return null;
  // The oak table's own rule; the timber department's windows and doors are held to their own list
  // and not to it (CLAUDE.md T28 2.6) [TUNE: chat].
  if (entry.material === 'solidWood' && entry.cutters === null && !SOLID_WOOD_EQUIPMENT.every((id) => has(state, id))) {
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
