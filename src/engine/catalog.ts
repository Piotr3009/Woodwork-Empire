// The product catalogue: what the workshop can be asked to make, and whether it has the tools.

import { PRICE_ROUNDING, PRODUCT_TEMPLATES, SOLID_WOOD_EQUIPMENT } from './constants';
import { findSpec, has, hasAll } from './machines';
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

/** Tools the workshop is short of for this template. */
export function missingEquipment(state: GameState, entry: ProductTemplate): string[] {
  return entry.requiredEquipment.filter((specId) => !has(state, specId));
}

/** The greyed out reason on the board, or null when the job can be taken as it stands. */
export function lockReasonFor(state: GameState, entry: ProductTemplate): string | null {
  const missing = missingEquipment(state, entry);
  if (missing.length === 0) return null;
  if (entry.material === 'solidWood' && !hasAll(state, SOLID_WOOD_EQUIPMENT)) {
    return 'Needs solid wood tools';
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

/** Price of a size variant, rounded to the nearest 10 (CLAUDE.md 8.8). */
export function priceFor(basePrice: number, sizeMultiplier: number, expressUplift: number): number {
  const raw = basePrice * sizeMultiplier * (1 + expressUplift);
  return Math.round(raw / PRICE_ROUNDING) * PRICE_ROUNDING;
}
