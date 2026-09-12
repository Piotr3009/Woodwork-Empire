// The machine modal: one tile per class of a family, with what each one does to the work
// (CLAUDE.md T3 3.5). The catalogue lists the family, this is where the money is spent.

import { canBuy, countOf, enduranceHoursFor, findSpec } from '../engine/index';
import type { EquipmentSpec, EquipmentVariant, GameState } from '../engine/index';
import {
  escapeHtml,
  lockedButton,
  money,
  plural,
  primaryButton,
  button,
} from './modal';

/** The families the player chooses a class for. Everything else is bought off the catalogue line
 *  itself: a locker has no classes and never will (CLAUDE.md T3 3.5). */
export function isMachineFamily(spec: EquipmentSpec): boolean {
  return spec.category === 'machine' || spec.category === 'extraction';
}

/** Above 1.0 is quicker than a standard machine, below it is slower. */
function outputLine(variant: EquipmentVariant): string {
  const per = Math.round((variant.outputFactor - 1) * 100);
  if (per === 0) return 'Output as a standard machine';
  return `Output ${per > 0 ? '+' : ''}${per}%`;
}

function bagLine(spec: EquipmentSpec, variant: EquipmentVariant): string {
  if (spec.bagInterval <= 0) return 'No bag to change';
  const interval = Math.round(spec.bagInterval * variant.bagIntervalFactor);
  return `Bag every ${interval.toLocaleString('en-GB')} min of use`;
}

function lifeLine(spec: EquipmentSpec, variant: EquipmentVariant): string {
  const hours = enduranceHoursFor(spec.id, variant.id);
  return `Life about ${hours.toLocaleString('en-GB')} hours`;
}

function powerLine(variant: EquipmentVariant): string {
  return `Power ${variant.powerPerDay} a day`;
}

/** Where the picture of this class goes. T3-08 puts the sprite in it when the file is there, and
 *  a box stands in until then (CLAUDE.md T3 3.6). */
export function pictureSlot(spriteKey: string, tier: string): string {
  return (
    `<div class="tile-picture" data-sprite="${escapeHtml(spriteKey)}" ` +
    `data-tier="${escapeHtml(tier)}"><span class="tile-picture-box"></span></div>`
  );
}

function tile(
  state: GameState,
  spec: EquipmentSpec,
  variant: EquipmentVariant,
  recommended: string,
): string {
  const check = canBuy(state, spec.id, variant.id);
  const buy = check.ok
    ? variant.id === recommended
      ? primaryButton('buyEquipment', 'Buy', `data-id="${spec.id}" data-variant="${variant.id}"`)
      : button('buyEquipment', 'Buy', `data-id="${spec.id}" data-variant="${variant.id}"`)
    : lockedButton('Buy', check.reason);
  const effects = [
    outputLine(variant),
    bagLine(spec, variant),
    lifeLine(spec, variant),
    powerLine(variant),
  ]
    .map((line) => `<p class="tile-figures">${escapeHtml(line)}</p>`)
    .join('');
  return (
    `<div class="tile${check.ok ? '' : ' is-locked'}" data-variant="${variant.id}">` +
    `<h3 class="tile-name">${escapeHtml(variant.name)}</h3>` +
    `<p class="tile-price">${money(variant.price)}</p>` +
    pictureSlot(spec.spriteKey, variant.id) +
    `<p class="tile-text">${escapeHtml(variant.description)}</p>` +
    effects +
    (check.ok ? '' : `<p class="lock">${escapeHtml(check.reason)}</p>`) +
    `<div class="tile-action">${buy}</div>` +
    '</div>'
  );
}

/** The class the modal puts its one accent button on: the dearest the player can actually pay
 *  for today is not the advice, the cheapest one he can is (CLAUDE.md T3 3.5). */
export function recommendedVariant(state: GameState, spec: EquipmentSpec): string {
  for (const variant of spec.variants) {
    if (canBuy(state, spec.id, variant.id).ok) return variant.id;
  }
  return '';
}

export function renderMachine(state: GameState, specId: string): string {
  const spec = findSpec(specId);
  if (!spec) return '<p class="empty">Not in the catalogue.</p>';
  const owned = countOf(state, specId);
  const inTheHall =
    owned === 0 ? '' : owned === 1 ? ' One is in the hall already.' : ` ${owned} are in the hall already.`;
  const head =
    `<p class="hint">${escapeHtml(spec.effect)} ` +
    `${plural(spec.variants.length, 'class', 'classes')} to choose from.${inTheHall}</p>`;
  const recommended = recommendedVariant(state, spec);
  const grid = spec.variants
    .map((variant) => tile(state, spec, variant, recommended))
    .join('');
  return `${head}<div class="tile-grid">${grid}</div>`;
}
