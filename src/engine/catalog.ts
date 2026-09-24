// The product catalogue: what the workshop can be asked to make, and whether it has the tools.

import {
  LOW_REPUTATION_BAND,
  LOW_REPUTATION_PRICE_FACTOR,
  PRICE_ROUNDING,
  PRODUCT_TEMPLATES,
  SOLID_WOOD_EQUIPMENT,
} from './constants';
import { findSpec, has } from './machines';
import { hasOrOnOrder } from './orders';
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

/** Tools the workshop is short of for this template. Kit that is bought and on its way counts:
 *  the company is equipped, and the drawing and the material take days of their own
 *  (CLAUDE.md T8 3.2). */
export function missingEquipment(state: GameState, entry: ProductTemplate): string[] {
  return entry.requiredEquipment.filter((specId) => !hasOrOnOrder(state, specId));
}

/** The greyed out reason on the board, or null when the job can be taken as it stands. */
export function lockReasonFor(state: GameState, entry: ProductTemplate): string | null {
  const missing = missingEquipment(state, entry);
  if (missing.length === 0) return null;
  if (entry.material === 'solidWood' && !SOLID_WOOD_EQUIPMENT.every((id) => hasOrOnOrder(state, id))) {
    return 'Needs a thicknesser';
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
