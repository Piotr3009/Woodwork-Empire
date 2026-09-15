// The machine modal: one tile per class of a family, with what each one does to the work
// (CLAUDE.md T3 3.5). The catalogue lists the family, this is where the money is spent.

import {
  airDemandOf,
  bagsOf,
  compressorAirOf,
  compressors,
  cubicMetres,
  dustOutputOf,
  extractionCapacityOf,
  extractionDemandOf,
  mediaFigure,
  metresBy,
  orderEquipmentCheck,
  countOf,
  deliveryDaysFor,
  enduranceHoursFor,
  findSpec,
  footprintOf,
  zoneOf,
} from '../engine/index';
import {
  CENTRAL_EXTRACTION_SPECS,
  CLASS_LADDER_FAMILIES,
  COMPRESSOR,
  COMPRESSOR_AIR,
  COMPRESSOR_WITH_DRYER,
  DUST_WASTE_MONTHLY,
  bagsToM3,
} from '../engine/constants';
import { spriteUrl } from '../render/sprites';
import type { EquipmentSpec, EquipmentVariant, GameState } from '../engine/index';
import {
  escapeHtml,
  lockedButton,
  money,
  plural,
  primaryButton,
  button,
  signClass,
} from './modal';

/** The families the player chooses a class for. Everything else is bought off the catalogue line
 *  itself: a locker has no classes and never will (CLAUDE.md T3 3.5). */
export function isMachineFamily(spec: EquipmentSpec): boolean {
  return CLASS_LADDER_FAMILIES.includes(spec.id);
}

/** One line of figures on a class card, and the colour its sign gives it when it has one. */
interface Figure {
  text: string;
  tone: string;
}

function figure(text: string, tone = ''): Figure {
  return { text, tone };
}

/** Above 1.0 is quicker than a standard machine, below it is slower: green, red or the body
 *  colour by the sign, through the one helper every signed line on a card goes through
 *  (CLAUDE.md T12 3.1). */
function outputLine(variant: EquipmentVariant): Figure {
  const per = Math.round((variant.outputFactor - 1) * 100);
  if (per === 0) return figure('Output as a standard machine');
  return figure(`Output ${per > 0 ? '+' : ''}${per}%`, signClass(per));
}

/** What a machine of this family makes, in the one unit dust is written in. It is the family's
 *  figure and so the same on every class, and that is the point: the material makes the dust and
 *  not the price of the machine (PIOTR, CLAUDE.md T12 2.1, 3.1). */
function dustLine(spec: EquipmentSpec): string {
  const dust = dustOutputOf(spec.id);
  return dust > 0 ? `Dust ${cubicMetres(dust, 3)}/h of use` : 'Dust none';
}

function lifeLine(spec: EquipmentSpec, variant: EquipmentVariant): string {
  const hours = enduranceHoursFor(spec.id, variant.id);
  return `Life about ${hours.toLocaleString('en-GB')} hours`;
}

function powerLine(variant: EquipmentVariant): string {
  return `Power ${variant.powerPerDay} a day`;
}

/** What this class asks of the air, and what the hall would give it. The catalogue says it before
 *  the money is spent, so nobody buys a bander his compressor will not start (PIOTR,
 *  CLAUDE.md T10 3.2). */
function airLine(state: GameState, spec: EquipmentSpec, variant: EquipmentVariant): string {
  if (spec.id === COMPRESSOR) {
    const gives = COMPRESSOR_AIR[variant.id];
    if (!gives) return '';
    return `Gives ${gives.bar} bar, ${gives.litres.toLocaleString('en-GB')} l/min` +
      `${variant.id === COMPRESSOR_WITH_DRYER ? ', dryer built in' : ''}` +
      // What the money is really for: the nailers at the benches as well as the machines
      // (PIOTR, 15.09; CLAUDE.md T11 3.8).
      '. Benches and edgebanders need air';
  }
  const wants = airDemandOf({ specId: spec.id, variantId: variant.id });
  if (wants === null) return '';
  const best = compressors(state).reduce(
    (bar, item) => Math.max(bar, compressorAirOf(item).bar),
    0,
  );
  const short = best > 0 && wants.bar > best ? `, compressor gives ${best}` : '';
  const none = best === 0 ? ', no compressor in the hall' : '';
  return `Needs ${wants.bar} bar, ${wants.litres} l/min${short}${none}`;
}

/** What this class pulls out of the air, or asks of the hall's fans, so the two sums read the
 *  same on the tile (CLAUDE.md T10 3.1, T12 3.1). */
function extractionLine(spec: EquipmentSpec, variant: EquipmentVariant): string {
  const pulls = extractionCapacityOf({ specId: spec.id, variantId: variant.id });
  if (pulls > 0) return `Pulls ${mediaFigure(pulls)} m\u00b3/h`;
  const wants = extractionDemandOf({ specId: spec.id, variantId: variant.id });
  return wants > 0 ? `Needs ${mediaFigure(wants)} m\u00b3/h of extraction` : '';
}

/** The bags on a class of extractor and what they hold, a cubic metre each; the central systems
 *  have none and pay the waste man instead, off the same constant the books charge
 *  (CLAUDE.md T12 3.2). */
function bagsLine(spec: EquipmentSpec, variant: EquipmentVariant): string {
  if (CENTRAL_EXTRACTION_SPECS.includes(spec.id)) {
    return `No bags. Waste collection ${money(DUST_WASTE_MONTHLY)} a month`;
  }
  const bags = bagsOf({ specId: spec.id, variantId: variant.id });
  return bags > 0 ? `Bags ${bags}, holds ${cubicMetres(bagsToM3(bags))}` : '';
}

/** How long the player waits for this one after he has paid for it (CLAUDE.md T8 3.2). */
function deliveryLine(spec: EquipmentSpec, variant: EquipmentVariant): string {
  const days = deliveryDaysFor(spec.id, variant.id);
  if (days <= 0) return 'Down the wire, the moment you pay for it';
  return `Delivered in ${plural(days, 'working day', 'working days')}`;
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

/** What the class takes of the hall floor, in the words Piotr asked for: both figures with
 *  their unit, through the one formatter (CLAUDE.md T7 3.7, T12 3.1). */
export function floorLine(specId: string, variantId: string): string {
  const stands = footprintOf(specId, variantId);
  const zone = zoneOf(specId, variantId);
  if (zone.width <= 0 || zone.depth <= 0) return 'Kept in a tool cabinet';
  return `Takes ${metresBy(stands)}, works in ${metresBy(zone)}`;
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
  // The same question the order itself asks, against the hall as it will be once everything on
  // the road has landed (CLAUDE.md T7 3.10, T9 3.1).
  const check = orderEquipmentCheck(state, spec.id, variant.id);
  // One click is one machine: what is on the road is already in that hall, so a second one of a
  // family that is not stackable is refused there and the tile says when this one is due
  // (PIOTR, 13.09; CLAUDE.md T9 3.1).
  const onTheList = state.onOrder.find(
    (order) => order.specId === spec.id && order.variantId === variant.id && !order.arrived,
  );
  const ownedCount = state.equipment.filter(
    (item) => item.specId === spec.id && item.variantId === variant.id,
  ).length;
  const label = ownedCount > 0 ? 'Buy another' : 'Buy';
  const buy = onTheList
    ? `<span class="tile-waiting">On order, due day ${onTheList.dueDay}</span>`
    : check.ok
      ? variant.id === recommended
        ? primaryButton('buyEquipment', label, `data-id="${spec.id}" data-variant="${variant.id}"`)
        : button('buyEquipment', label, `data-id="${spec.id}" data-variant="${variant.id}"`)
      : lockedButton(label, check.reason);
  // The order Piotr set: what it does to the work, what it makes, what it needs of the air, how
  // long it lasts, what it draws, what it takes of the floor (CLAUDE.md T12 3.1). A fan has no
  // output of its own and makes nothing: its lines are what it pulls and what its bags hold
  // (T12 3.2). The compressed air and the lorry follow, as they did.
  const machine = spec.category === 'machine';
  const figures: Figure[] = [
    ...(machine ? [outputLine(variant), figure(dustLine(spec))] : []),
    figure(extractionLine(spec, variant)),
    figure(bagsLine(spec, variant)),
    figure(lifeLine(spec, variant)),
    figure(powerLine(variant)),
    figure(floorLine(spec.id, variant.id)),
    figure(airLine(state, spec, variant)),
    figure(deliveryLine(spec, variant)),
  ];
  const effects = figures
    .filter((line) => line.text !== '')
    .map(
      (line) =>
        `<p class="tile-figures${line.tone === '' ? '' : ` ${line.tone}`}">` +
        `${escapeHtml(line.text)}</p>`,
    )
    .join('');
  const owned = ownedBadge(state, spec.id, variant.id);
  return (
    `<div class="tile${check.ok || onTheList ? '' : ' is-locked'}${owned === '' ? '' : ' is-owned'}` +
    `${onTheList ? ' is-ordered' : ''}" ` +
    `data-variant="${variant.id}">` +
    `<h3 class="tile-name">${escapeHtml(variant.name)} ${owned}</h3>` +
    `<p class="tile-price">${money(variant.price)}</p>` +
    pictureSlot(spec.spriteKey, variant.id) +
    `<p class="tile-text">${escapeHtml(variant.description)}</p>` +
    effects +
    (check.ok || onTheList ? '' : `<p class="lock">${escapeHtml(check.reason)}</p>`) +
    `<div class="tile-action">${buy}</div>` +
    '</div>'
  );
}

/** The class the modal puts its one accent button on: the dearest the player can actually pay
 *  for today is not the advice, the cheapest one he can is (CLAUDE.md T3 3.5). */
export function recommendedVariant(state: GameState, spec: EquipmentSpec): string {
  for (const variant of spec.variants) {
    if (orderEquipmentCheck(state, spec.id, variant.id).ok) return variant.id;
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
