// The machine modal: one tile per class of a family, with what each one does to the work
// (CLAUDE.md T3 3.5). The catalogue lists the family, this is where the money is spent.

import {
  canBuy,
  countOf,
  enduranceHoursFor,
  findSpec,
  footprintOf,
  zoneOf,
} from '../engine/index';
import { spriteUrl } from '../render/sprites';
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

/** Where the picture of this class goes: the file the art side delivered for this very class,
 *  through the loader, and a box while there is none (CLAUDE.md T3 3.6, T7 3.7). */
export function pictureSlot(spriteKey: string, tier: string): string {
  const url = spriteUrl(spriteKey, tier);
  const inside =
    url === null
      ? '<span class="tile-picture-box"></span>'
      : `<img src="${url}" alt="${escapeHtml(spriteKey)}" loading="lazy" />`;
  return (
    `<div class="tile-picture" data-sprite="${escapeHtml(spriteKey)}" ` +
    `data-tier="${escapeHtml(tier)}">${inside}</div>`
  );
}

/** What the class takes of the hall floor, in the words Piotr asked for (CLAUDE.md T7 3.7). */
export function floorLine(specId: string, variantId: string): string {
  const stands = footprintOf(specId, variantId);
  const zone = zoneOf(specId, variantId);
  if (zone.width <= 0 || zone.depth <= 0) return 'Kept in a tool cabinet';
  return (
    `Takes ${stands.width} by ${stands.depth} m on a ${zone.width} by ${zone.depth} m zone`
  );
}

/** The frame on a class the hall already has (CLAUDE.md T7 3.7). */
export function ownedBadge(state: GameState, specId: string, variantId: string): string {
  const count = state.equipment.filter(
    (item) => item.specId === specId && item.variantId === variantId,
  ).length;
  if (count === 0) return '';
  return `<span class="badge badge-owned">Owned${count > 1 ? ` \u00d7 ${count}` : ''}</span>`;
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
    floorLine(spec.id, variant.id),
  ]
    .map((line) => `<p class="tile-figures">${escapeHtml(line)}</p>`)
    .join('');
  const owned = ownedBadge(state, spec.id, variant.id);
  return (
    `<div class="tile${check.ok ? '' : ' is-locked'}${owned === '' ? '' : ' is-owned'}" ` +
    `data-variant="${variant.id}">` +
    `<h3 class="tile-name">${escapeHtml(variant.name)} ${owned}</h3>` +
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

/** The inside of a folder: one tile per class of the family, filtered by whatever is in the
 *  filter field (CLAUDE.md T7 3.7). */
export function renderMachine(state: GameState, specId: string, filter = ''): string {
  const spec = findSpec(specId);
  if (!spec) return '<p class="empty">Not in the catalogue.</p>';
  const owned = countOf(state, specId);
  const inTheHall =
    owned === 0 ? '' : owned === 1 ? ' One is in the hall already.' : ` ${owned} are in the hall already.`;
  const head =
    `<p class="hint">${escapeHtml(spec.effect)} ` +
    `${plural(spec.variants.length, 'class', 'classes')} to choose from.${inTheHall}</p>`;
  const recommended = recommendedVariant(state, spec);
  const needle = filter.trim().toLowerCase();
  const classes = spec.variants.filter(
    (variant) => needle === '' || variant.name.toLowerCase().includes(needle),
  );
  if (classes.length === 0) return `${head}<p class="empty">Nothing matches that.</p>`;
  const grid = classes.map((variant) => tile(state, spec, variant, recommended)).join('');
  return `${head}<div class="tile-grid">${grid}</div>`;
}
