// The unit itself, and the things that can be done to it (PIOTR, 03.10 and 04.10; v67, v82).
//
// Era 1 ends in a hall of 200 m2 that takes eight joiners, and from there a full shop has nowhere
// to grow. From v67 the owner can pay a builder for a second 200 m2 along the rear wall. It opens
// the next working morning and doubles everything the floor sets: the joiners the unit takes, the
// benches it holds, the rent, the rates and what it draws with nothing running. The canteen was
// built for eight and stays that until it is enlarged: no charge, it comes with the extension,
// but it grows two metres along the rear wall and the floor beside it has to be clear first.
//
// From v82 a unit that has had that extension can have a second: 400 m2 along the whole of its
// front, for a million, so the hall is forty metres by twenty and the timber shop has a floor to
// stand on (PIOTR, 04.10). It opens the next working morning as the first does and doubles what
// the floor sets, the joiners and the lockers of an enlarged canteen with it, thirty two of each;
// and on the 800 m2 unit the insurer and a flat security level charge twice what they did, so
// every cost of the unit is twice what it was.
//
// Everything a card says about any of them is worked out here, so the laptop prints figures and
// holds none of its own.

import {
  CANTEEN_LEVEL_WIDE_FROM,
  UNIT_DEPTH_CELLS,
  UNIT_EXTENSION_PRICE,
  UNIT_EXTENSION_PRICE_PER_M2,
  UNIT_LONG_EXTENSION_CELLS,
  UNIT_LONG_EXTENSION_GROWTH,
  UNIT_SECOND_EXTENSION_PRICE,
  UNIT_WIDE_EXTENSION_CELLS,
  UNIT_WIDTH_CELLS,
  YARD_ORDER,
  YARD_ORDER_LARGE_FIRST,
  canteenGrowthBox,
  canteenLevelSpec,
  officeLevelSpec,
  roomById,
  roomsOf,
  secondExtensionOf,
  unitDepositFor,
} from './constants';
import type { CanteenLevelSpec, OfficeLevelSpec } from './constants';
import { canAfford, pay, standingPowerPerDay } from './economy';
import { queueEvent } from './events';
import type { EventDraft } from './events';
import { monthlyPremiums } from './insurance';
import { canteenLockers, crewLimit, standingOn, yardBoxOf, yardPlaceAmong } from './layout';
import type { Box } from './layout';
import { findSpec, has } from './machines';
import { routePipe } from './pipes';
import { changeReputation, formatReputation } from './reputation';
import { securitySubscriptionMonthly } from './security';
import { andList, inASentence, inWords } from './text';
import type { Equipment, ExtensionStage, GameState, OnOrderItem, UnitExtension, UnitState } from './types';

export interface PremisesCheck {
  ok: boolean;
  reason: string;
}

const OK: PremisesCheck = { ok: true, reason: '' };

/** Everything an extension changes, as the card prints it: what it costs at the click, the unit
 *  as it will be, and each running cost as it is and as it will be. */
export interface ExtensionTerms {
  /** The builder's price. */
  price: number;
  /** The more the landlord holds on the bigger rent. */
  deposit: number;
  /** What has to be in the account at the click: the two together. */
  total: number;
  /** The floor it adds, and the unit with it. */
  addsM2: number;
  areaM2: number;
  widthCells: number;
  depthCells: number;
  /** The joiners and the benches the bigger unit takes. */
  joiners: number;
  benches: number;
  /** The lockers an enlarged canteen holds in the bigger unit (v82). */
  lockers: number;
  rentNow: number;
  rentThen: number;
  ratesNow: number;
  ratesThen: number;
  /** What the unit draws a day with nothing running. */
  powerNow: number;
  powerThen: number;
  /** What the security level held costs a month. A firm charges by the area, so its month goes up
   *  with every extension; a flat level is what it was after the first, twice it after the second
   *  (v82), and up by the area with every long one (CLAUDE.md T31 2.7). */
  securityNow: number;
  securityThen: number;
  /** What the 1st takes for the covers held. The first extension leaves it as it is, the second
   *  doubles it (v82), and every long one puts it up by the area (CLAUDE.md T31 2.7). */
  insuranceNow: number;
  insuranceThen: number;
}

/** Where a stage of the unit's extension stands. A long extension is never `open`: there is always
 *  another to be had (CLAUDE.md T31 2.7). */
export function extensionStatus(unit: UnitState, stage: ExtensionStage): UnitExtension {
  if (stage === 'long') return unit.longExtension;
  if (stage === 'wide') return unit.wideExtension;
  return stage === 'first' ? unit.extension : secondExtensionOf(unit);
}

/** The metres a stage adds along the front, in depth: ten for the second, seven for each wide one
 *  (v82, v95). */
function addsInDepth(stage: ExtensionStage): number {
  if (stage === 'second') return UNIT_DEPTH_CELLS;
  return stage === 'wide' ? UNIT_WIDE_EXTENSION_CELLS : 0;
}

/** The metres a stage adds along the rear wall. */
function addsAlongTheWall(stage: ExtensionStage): number {
  if (stage === 'first') return UNIT_WIDTH_CELLS;
  return stage === 'long' ? UNIT_LONG_EXTENSION_CELLS : 0;
}

/** The floor of the unit the second extension made, 800 m2, whatever long extensions it has had
 *  since: what the second extension's card names it by (CLAUDE.md T31 2.7). */
export function secondExtensionAreaM2(unit: UnitState): number {
  return (
    (unit.widthCells - unit.longExtensions * UNIT_LONG_EXTENSION_CELLS) *
    (unit.depthCells - unit.wideExtensions * UNIT_WIDE_EXTENSION_CELLS)
  );
}

/** The unit as it is the morning a stage opens: twenty metres more of rear wall for the first,
 *  ten metres more of depth for the second, ten more of rear wall for each long one, seven more of
 *  depth for each wide one, and every figure the floor sets in the same proportion. */
function unitWith(unit: UnitState, stage: ExtensionStage): UnitState {
  const widthCells = unit.widthCells + addsAlongTheWall(stage);
  const depthCells = unit.depthCells + addsInDepth(stage);
  const areaM2 = widthCells * depthCells;
  const factor = areaM2 / unit.areaM2;
  const grown: UnitState = {
    ...unit,
    widthCells,
    depthCells,
    areaM2,
    rentMonthly: Math.round(unit.rentMonthly * factor),
    ratesMonthly: Math.round(unit.ratesMonthly * factor),
    benchSlots: Math.round(unit.benchSlots * factor),
  };
  if (stage === 'first') grown.extension = 'open';
  else if (stage === 'second') grown.secondExtension = 'open';
  else if (stage === 'wide') {
    grown.wideExtensions = unit.wideExtensions + 1;
    grown.wideExtension = 'none';
  } else {
    grown.longExtensions = unit.longExtensions + 1;
    grown.longExtension = 'none';
  }
  return grown;
}

/** The builder's price of a stage: a long or a wide one is its square metres at
 *  `UNIT_EXTENSION_PRICE_PER_M2`, up by the growth with every long and wide one already open,
 *  rounded to the pound: 600,000, 720,000, 864,000 and on for the long ones of a hall twenty
 *  metres deep (CLAUDE.md T31 2.7), and 840,000 for the first seven metres of a hall forty long
 *  (PIOTR, 12.10: "3 ok"; v95). */
function extensionPrice(unit: UnitState, stage: ExtensionStage): number {
  if (stage === 'first') return UNIT_EXTENSION_PRICE;
  if (stage === 'second') return UNIT_SECOND_EXTENSION_PRICE;
  const adds =
    stage === 'wide' ? unit.widthCells * UNIT_WIDE_EXTENSION_CELLS : UNIT_LONG_EXTENSION_CELLS * unit.depthCells;
  const before = unit.longExtensions + unit.wideExtensions;
  return Math.round(UNIT_EXTENSION_PRICE_PER_M2 * adds * UNIT_LONG_EXTENSION_GROWTH ** before);
}

/** The terms of an extension of the unit as it stands this minute: the unit as it will be, and
 *  every running cost asked of the function that charges it, of the same company in that unit, so
 *  a card cannot print a figure the month will not take. Read while the stage is not open; the
 *  card of an extended unit prints the unit itself. */
export function extensionTerms(state: GameState, stage: ExtensionStage = 'first'): ExtensionTerms {
  const unit = state.unit;
  const grown = unitWith(unit, stage);
  const then: GameState = { ...state, unit: grown };
  const price = extensionPrice(unit, stage);
  const deposit = Math.max(0, unitDepositFor(grown.rentMonthly) - unit.depositHeld);
  return {
    price,
    deposit,
    total: price + deposit,
    addsM2: grown.areaM2 - unit.areaM2,
    areaM2: grown.areaM2,
    widthCells: grown.widthCells,
    depthCells: grown.depthCells,
    joiners: crewLimit(then),
    benches: grown.benchSlots,
    lockers: canteenLockers({ ...then, unit: { ...grown, canteenWide: true } }),
    rentNow: unit.rentMonthly,
    rentThen: grown.rentMonthly,
    ratesNow: unit.ratesMonthly,
    ratesThen: grown.ratesMonthly,
    powerNow: standingPowerPerDay(unit),
    powerThen: standingPowerPerDay(grown),
    securityNow: securitySubscriptionMonthly(state),
    securityThen: securitySubscriptionMonthly(then),
    insuranceNow: monthlyPremiums(state),
    insuranceThen: monthlyPremiums(then),
  };
}

/** Why the unit cannot be extended this minute, or that it can. Money is the only condition
 *  [PIOTR, 03.10], and it is the money in the account: the bank does not lend the price of a
 *  building on the overdraft. The second extension is built along the front of a unit that has
 *  had the first, so it waits for that one to be open (v82). */
export function extendUnitCheck(state: GameState, stage: ExtensionStage = 'first'): PremisesCheck {
  const status = extensionStatus(state.unit, stage);
  if (status === 'building') return { ok: false, reason: 'The builders are in' };
  if (status === 'open') return { ok: false, reason: 'Extended already' };
  if (stage === 'second' && state.unit.extension !== 'open') {
    return { ok: false, reason: 'Extend the unit first' };
  }
  // The hall grows longer, and wider, once it is twenty metres deep; the cards are not offered
  // before that (CLAUDE.md T31 2.7; v95) [TUNE: the words].
  if ((stage === 'long' || stage === 'wide') && secondExtensionOf(state.unit) !== 'open') {
    return { ok: false, reason: 'Extend the unit along the front first' };
  }
  // One builder at a time on the hall's growth: the longer and the wider hall are each priced and
  // measured on the hall as it stands, so the one waits for the morning the other opens (v95).
  if (
    (stage === 'long' && state.unit.wideExtension === 'building') ||
    (stage === 'wide' && state.unit.longExtension === 'building')
  ) {
    return { ok: false, reason: 'The builders are in' };
  }
  const terms = extensionTerms(state, stage);
  // The card prints the figure beside the button, so the reason is the short one.
  if (state.cash < terms.total) return { ok: false, reason: 'Not enough in the account' };
  return OK;
}

/** The click: the builder and the landlord are paid, and the builders are in. The hall is the one
 *  it was until the morning (`openExtension`). */
export function extendUnit(state: GameState, stage: ExtensionStage = 'first'): PremisesCheck {
  const check = extendUnitCheck(state, stage);
  if (!check.ok) return check;
  const terms = extensionTerms(state, stage);
  pay(state, 'unitExtension', `Extension of the unit, ${terms.addsM2} m²`, terms.price);
  if (terms.deposit > 0) {
    pay(state, 'unitDeposit', 'Unit deposit, the extension', terms.deposit);
    state.unit.depositHeld += terms.deposit;
  }
  if (stage === 'first') state.unit.extension = 'building';
  else if (stage === 'second') state.unit.secondExtension = 'building';
  else if (stage === 'wide') state.unit.wideExtension = 'building';
  else state.unit.longExtension = 'building';
  return OK;
}

/** Everything at or past the old kerb goes out with it: the apron is where the hall ends, so the
 *  van, the plant and anything else standing out there stands at the new end, and a pipe run to or
 *  from any of it is laid again at no charge. */
function moveTheApron(state: GameState, kerb: number, by: number): void {
  const moved = new Set<string>();
  for (const item of state.equipment) {
    if (item.anchorX < kerb) continue;
    item.anchorX += by;
    moved.add(item.id);
  }
  for (const held of state.onOrder) {
    if (held.anchorX >= kerb) held.anchorX += by;
  }
  for (const worker of state.workers) {
    if (worker.anchorX >= kerb) worker.anchorX += by;
  }
  layRunsAgain(state, moved);
}

/** The yard behind the hall laid out again in its standing order [PIOTR, 18.10: "arrange those
 *  shelters somehow"] (v111): everything that stands there, landed or on its way, put one after
 *  another by the yard's own rule, from the far end of the hall towards the gate and row after row,
 *  the plant first and then the timber shelters, the glass shelters and the large timber shelters
 *  (`YARD_ORDER`), each kind in the order it was bought; where the wall is too short for that, the
 *  large shelters first after the plant (`YARD_ORDER_LARGE_FIRST`). Asked after what changes what
 *  stands there: a thing bought or ordered for it, sold and collected, or called off; and once when
 *  an older save opens. A longer wall moves nothing, as it never did (CLAUDE.md T31 2.7): the next
 *  change lays the yard out from its new far end. All or nothing: a yard neither order fits stays
 *  as it stands [TUNE]. A pipe run to plant that moved is laid again at no charge, as when the
 *  hall grows. */
export function tidyYard(state: GameState): void {
  const things: Array<Equipment | OnOrderItem> = [
    ...state.equipment.filter((item) => item.anchorY < 0),
    ...state.onOrder.filter((held) => held.anchorY < 0),
  ];
  const places = yardLaidOut(state, things, YARD_ORDER) ?? yardLaidOut(state, things, YARD_ORDER_LARGE_FIRST);
  if (places === null) return;
  const moved = new Set<string>();
  for (const { thing, x, y } of places) {
    if (thing.anchorX === x && thing.anchorY === y) continue;
    thing.anchorX = x;
    thing.anchorY = y;
    moved.add(thing.id);
  }
  if (moved.size === 0) return;
  // Nothing in the yard is dragged by the player, so no drag of one can be waiting; and the runs to
  // the plant that moved are laid again.
  if (Array.isArray(state.movedItems)) state.movedItems = state.movedItems.filter((entry) => !moved.has(entry.itemId));
  layRunsAgain(state, moved);
}

/** Where each thing of the yard stands laid out in this order of kinds, anything the order does not
 *  name first [TUNE], or null when the wall has no room for all of them so (v111). */
function yardLaidOut(
  state: GameState,
  things: ReadonlyArray<Equipment | OnOrderItem>,
  kinds: readonly string[],
): Array<{ thing: Equipment | OnOrderItem; x: number; y: number }> | null {
  const rank = (specId: string): number => Math.max(0, kinds.indexOf(specId));
  const order = things
    .map((thing, index) => ({ thing, index }))
    .sort((left, right) => rank(left.thing.specId) - rank(right.thing.specId) || left.index - right.index)
    .map((entry) => entry.thing);
  const taken: Box[] = [];
  const places: Array<{ thing: Equipment | OnOrderItem; x: number; y: number }> = [];
  for (const thing of order) {
    const at = yardPlaceAmong(state.unit.widthCells, taken, thing.specId, thing.variantId);
    if (at === null) return null;
    places.push({ thing, ...at });
    taken.push(yardBoxOf(thing, at.x, at.y));
  }
  return places;
}

/** Lays every pipe run to or from a thing that has been moved again, at no charge and under the
 *  ids the runs had: the hall growing moves the whole apron, and a save in which one plant stood
 *  on another has the second of them moved off it (v67, v72). */
export function layRunsAgain(state: GameState, moved: ReadonlySet<string>): void {
  const stale = state.pipes.filter((run) => moved.has(run.equipmentId) || moved.has(run.extractorId));
  if (stale.length === 0) return;
  state.pipes = state.pipes.filter((run) => !stale.includes(run));
  for (const run of stale) {
    const item = state.equipment.find((entry) => entry.id === run.equipmentId);
    const target = state.equipment.find((entry) => entry.id === run.extractorId);
    if (item === undefined || target === undefined) continue;
    state.pipes.push({ ...routePipe(state, item, target), id: run.id });
  }
}

/** What the card of the first morning says: the hall along the rear wall, and that the canteen
 *  is still the one it was. */
function firstOpened(terms: ExtensionTerms): EventDraft {
  return {
    kind: 'unitExtended',
    title: 'The extension is open',
    body:
      `The builders are out. The hall is ${terms.widthCells} by ${terms.depthCells} m now, ` +
      `${terms.areaM2} m², with room for ${terms.joiners} joiners and ${terms.benches} benches. ` +
      'The rent, the rates and the power are charged on the bigger unit from today. ' +
      'The canteen still holds what it held: enlarge it from the laptop, under Premises.',
    data: { areaM2: terms.areaM2, widthCells: terms.widthCells },
  };
}

/** And the card of the second: the hall twice as deep, the costs the 1st takes for it, and the
 *  lockers the canteen holds now, or would hold enlarged (v82). A long extension's card says the
 *  same of the longer hall under its own title (CLAUDE.md T31 2.7) [TUNE: the title]. */
function secondOpened(state: GameState, terms: ExtensionTerms, stage: ExtensionStage): EventDraft {
  const canteen = state.unit.canteenWide
    ? `The canteen holds ${terms.lockers} lockers now.`
    : `Enlarged, the canteen holds ${terms.lockers} lockers: enlarge it from the laptop, under Premises.`;
  return {
    kind: 'unitExtended',
    title:
      stage === 'long'
        ? `The hall is ${inWords(UNIT_LONG_EXTENSION_CELLS)} metres longer`
        : stage === 'wide'
          ? `The hall is ${inWords(UNIT_WIDE_EXTENSION_CELLS)} metres wider`
          : 'The second extension is open',
    body:
      `The builders are out. The hall is ${terms.widthCells} by ${terms.depthCells} m now, ` +
      `${terms.areaM2.toLocaleString('en-GB')} m², with room for ${terms.joiners} joiners and ${terms.benches} benches. ` +
      'The rent, the rates and the power are charged on the bigger unit from today, and the ' +
      `insurer and the security charge for it from the 1st. ${canteen}`,
    data: { areaM2: terms.areaM2, widthCells: terms.widthCells, depthCells: terms.depthCells },
  };
}

/** One stage, the morning after its click. The first and every long one take the kerb at the
 *  hall's end out with them; the plant behind the rear wall stays where it stands, and the longer
 *  wall has room for more. The second and every wide one are along the front, where nothing stands
 *  and nothing has to move: the apron is past the end of the hall and grows with it (v95). */
function openStage(state: GameState, stage: ExtensionStage): void {
  const unit = state.unit;
  if (extensionStatus(unit, stage) !== 'building') return;
  const terms = extensionTerms(state, stage);
  if (stage === 'first' || stage === 'long') moveTheApron(state, unit.widthCells, terms.widthCells - unit.widthCells);
  Object.assign(unit, unitWith(unit, stage));
  queueEvent(state, stage === 'first' ? firstOpened(terms) : secondOpened(state, terms, stage));
}

/** The morning after the click: the new floor is there. Called at the day's open, before the day
 *  is charged, so the first day of the bigger unit is paid for at its own rent. */
export function openExtension(state: GameState): void {
  openStage(state, 'first');
  openStage(state, 'second');
  openStage(state, 'long');
  openStage(state, 'wide');
}

// ---------------------------------------------------------------------------
// The office's refits (PIOTR, 15.10; v98): six levels, each a picture of the whole room from the
// art side, bought one after the other on the Premises page once a desk and a laptop stand, paid at
// the click and open the next morning as an extension is, with a card and a few points of
// reputation for the better office.
// ---------------------------------------------------------------------------

/** The level the office is at, 0 for the day one room: read here, so a save from before v98 with
 *  no figure on its unit is the day one room. */
export function officeLevelOf(state: GameState): number {
  return typeof state.unit.officeLevel === 'number' ? state.unit.officeLevel : 0;
}

/** The refit on offer next: the level after the one the office is at, or null at the top. */
export function nextOfficeLevel(state: GameState): OfficeLevelSpec | null {
  return officeLevelSpec(officeLevelOf(state) + 1);
}

/** Whether the next refit can be bought, in the order its card's locked button reads: the top
 *  reached, one being done, the desk and the laptop, the cash (v98). */
export function refitOfficeCheck(state: GameState): PremisesCheck {
  const next = nextOfficeLevel(state);
  if (next === null) return { ok: false, reason: 'The office is at its best' };
  if (state.unit.officeRefit !== null && state.unit.officeRefit !== undefined) {
    return { ok: false, reason: 'The fitters are in' };
  }
  // A refit of an office with no desk in it is a refit of nothing: the first level's picture has
  // the desk and the laptop painted in, so both stand first (CLAUDE.md T7 3.8).
  if (!has(state, 'desk') || !has(state, 'laptop')) return { ok: false, reason: 'Buy a desk and a laptop first' };
  if (!canAfford(state, next.price)) return { ok: false, reason: 'Not enough cash' };
  return OK;
}

/** The click: the next level paid for on a line of its own, the fitters in until the morning. */
export function refitOffice(state: GameState): PremisesCheck {
  const check = refitOfficeCheck(state);
  if (!check.ok) return check;
  const next = nextOfficeLevel(state);
  if (next === null) return check;
  pay(state, 'unitExtension', `Office refit: ${next.name}`, next.price);
  state.unit.officeRefit = { level: next.level };
  return OK;
}

/** The morning after the click: the office is the new picture, the company a little better
 *  thought of, and a card says so (v98). */
export function openOfficeRefit(state: GameState): void {
  const refit = state.unit.officeRefit;
  if (refit === null || refit === undefined) return;
  const spec = officeLevelSpec(refit.level);
  state.unit.officeRefit = null;
  if (spec === null) return;
  state.unit.officeLevel = spec.level;
  const gained = changeReputation(state, spec.reputation, `Office refit: ${spec.name}`);
  const next = officeLevelSpec(spec.level + 1);
  queueEvent(state, {
    kind: 'officeRefitted',
    title: 'The office is refitted',
    body:
      `The fitters are out: ${spec.name.toLowerCase()}. ${spec.sentence} ` +
      `Clients and callers notice: reputation ${gained >= 0 ? '+' : ''}${formatReputation(gained)}. ` +
      (next === null
        ? 'There is no better office to be had.'
        : `The next refit, ${next.name.toLowerCase()}, is on the Premises page at ${next.price.toLocaleString('en-GB')}.`),
    data: { level: spec.level },
  });
}

// ---------------------------------------------------------------------------
// The canteen's refits [PIOTR, 18.10: "the canteens, with a purchase of course"; "dearer, twice"]
// (v106): six levels, each a picture of the whole room, bought one after the other on the Premises
// page as the office's are. Levels 1 and 2 are the room as it was built and 3 to 6 the enlarged
// one, so an enlarged canteen's next refit is level 3 and a small one stops at 2 until it is
// enlarged.
// ---------------------------------------------------------------------------

/** The level the canteen is at, 0 for the room with its layers: read here, so a save from before
 *  v106 with no figure on its unit is that room. */
export function canteenLevelOf(state: GameState): number {
  return typeof state.unit.canteenLevel === 'number' ? state.unit.canteenLevel : 0;
}

/** The refit on offer next: the level after the one the canteen is at, and in an enlarged canteen
 *  never one of the two pictures of the small room [TUNE: chat]; null at the top. */
export function nextCanteenLevel(state: GameState): CanteenLevelSpec | null {
  const after = canteenLevelOf(state) + 1;
  const firstWide = CANTEEN_LEVEL_WIDE_FROM;
  return canteenLevelSpec(state.unit.canteenWide ? Math.max(after, firstWide) : after);
}

/** The level whose picture the room shows: the canteen's own where its picture is of the room the
 *  canteen is, and 0 otherwise, which is the room's layers: a canteen enlarged after a refit of the
 *  small room shows the enlarged room until its next refit (v106). */
export function canteenPictureLevel(state: GameState): number {
  const spec = canteenLevelSpec(canteenLevelOf(state));
  if (spec === null) return 0;
  return spec.wide === state.unit.canteenWide ? spec.level : 0;
}

/** Whether the next refit can be bought, in the order its card's locked button reads: the top
 *  reached, one being done, the canteen to enlarge first, the cash (v106). */
export function refitCanteenCheck(state: GameState): PremisesCheck {
  const next = nextCanteenLevel(state);
  if (next === null) return { ok: false, reason: 'The canteen is at its best' };
  if (state.unit.canteenRefit !== null && state.unit.canteenRefit !== undefined) {
    return { ok: false, reason: 'The fitters are in' };
  }
  if (next.wide && !state.unit.canteenWide) return { ok: false, reason: 'Enlarge the canteen first' };
  if (!canAfford(state, next.price)) return { ok: false, reason: 'Not enough cash' };
  return OK;
}

/** The click: the next level paid for on a line of its own, the fitters in until the morning. */
export function refitCanteen(state: GameState): PremisesCheck {
  const check = refitCanteenCheck(state);
  if (!check.ok) return check;
  const next = nextCanteenLevel(state);
  if (next === null) return check;
  pay(state, 'unitExtension', `Canteen refit: ${next.name}`, next.price);
  state.unit.canteenRefit = { level: next.level };
  return OK;
}

/** The morning after the click: the canteen is the new picture, the company a little better
 *  thought of, and a card says so (v106). */
export function openCanteenRefit(state: GameState): void {
  const refit = state.unit.canteenRefit;
  if (refit === null || refit === undefined) return;
  const spec = canteenLevelSpec(refit.level);
  state.unit.canteenRefit = null;
  if (spec === null) return;
  state.unit.canteenLevel = spec.level;
  const gained = changeReputation(state, spec.reputation, `Canteen refit: ${spec.name}`);
  const next = nextCanteenLevel(state);
  queueEvent(state, {
    kind: 'canteenRefitted',
    title: 'The canteen is refitted',
    body:
      `The fitters are out: ${spec.name.toLowerCase()}. ${spec.sentence} ` +
      `The men notice, and so does everybody they talk to: reputation ${gained >= 0 ? '+' : ''}${formatReputation(gained)}. ` +
      (next === null
        ? 'There is no better canteen to be had.'
        : `The next refit, ${next.name.toLowerCase()}, is on the Premises page at ${next.price.toLocaleString('en-GB')}` +
          `${next.wide && !state.unit.canteenWide ? ', once the canteen is enlarged.' : '.'}`),
    data: { level: spec.level },
  });
}

/** What the canteen is and what it becomes, for the card: its floor and its lockers, as built and
 *  enlarged, how far it grows, and the piece of floor it grows onto. */
export interface CanteenTerms {
  areaNow: number;
  lockersNow: number;
  areaThen: number;
  lockersThen: number;
  /** Metres more along the rear wall. */
  grows: number;
  /** The floor beside it that has to be clear, in metres. */
  clear: { width: number; depth: number };
}

export function canteenTerms(state: GameState): CanteenTerms {
  const built = roomById('canteen');
  const wide = roomsOf({ canteenWide: true }).find((room) => room.id === 'canteen') ?? built;
  const now = roomsOf(state.unit).find((room) => room.id === 'canteen') ?? built;
  const box = canteenGrowthBox();
  // The lockers are the unit's own figure: sixteen enlarged, thirty two in the 800 m2 unit (v82).
  const enlarged: GameState = { ...state, unit: { ...state.unit, canteenWide: true } };
  return {
    areaNow: now.width * now.depth,
    lockersNow: canteenLockers(state),
    areaThen: wide.width * wide.depth,
    lockersThen: canteenLockers(enlarged),
    grows: wide.width - built.width,
    clear: { width: box.width, depth: box.depth },
  };
}

/** What stands on the floor the canteen would grow onto, in the words the card asks for it to be
 *  moved in: `the CNC and the extractor`. Empty when the floor is clear. */
export function inTheWayOfTheCanteen(state: GameState): string {
  const names = standingOn(state, canteenGrowthBox()).map(
    (specId) => `the ${inASentence(findSpec(specId)?.name ?? specId)}`,
  );
  return andList(names);
}

/** Why the canteen cannot be enlarged this minute, or that it can: the extension it comes with
 *  has to be open, and the two by four metres beside it clear of everything, standing or on its
 *  way (PIOTR, 03.10: "so I have to move everything"). */
export function enlargeCanteenCheck(state: GameState): PremisesCheck {
  if (state.unit.canteenWide) return { ok: false, reason: 'Enlarged already' };
  if (state.unit.extension === 'none') return { ok: false, reason: 'Extend the unit first' };
  if (state.unit.extension === 'building') {
    return { ok: false, reason: 'The extension opens in the morning' };
  }
  // A machine that has been dragged off the floor beside the canteen is not off it until the move
  // is done: asked about and refused, it goes back exactly where it stood (CLAUDE.md T8 3.4). The
  // words are the ones the hall's own Set up button says while a move is on.
  if (state.movedItems.length > 0) {
    return { ok: false, reason: 'The kit is half shifted. Finish the move first' };
  }
  const inTheWay = inTheWayOfTheCanteen(state);
  if (inTheWay !== '') {
    const clear = canteenTerms(state).clear;
    return {
      ok: false,
      reason: `Move ${inTheWay} off the ${clear.width} × ${clear.depth} m beside it`,
    };
  }
  return OK;
}

/** The click: the canteen is four by four metres from this minute, and holds sixteen lockers,
 *  thirty two in the 800 m2 unit. Nothing is paid and nothing has to be moved, because the check
 *  has seen the floor clear. */
export function enlargeCanteen(state: GameState): PremisesCheck {
  const check = enlargeCanteenCheck(state);
  if (!check.ok) return check;
  state.unit.canteenWide = true;
  return OK;
}
