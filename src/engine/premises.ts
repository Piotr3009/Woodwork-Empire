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
  UNIT_DEPTH_CELLS,
  UNIT_EXTENSION_PRICE,
  UNIT_SECOND_EXTENSION_PRICE,
  UNIT_WIDTH_CELLS,
  canteenGrowthBox,
  roomById,
  roomsOf,
  secondExtensionOf,
  unitDepositFor,
} from './constants';
import { pay, standingPowerPerDay } from './economy';
import { queueEvent } from './events';
import type { EventDraft } from './events';
import { monthlyPremiums } from './insurance';
import { canteenLockers, crewLimit, standingOn } from './layout';
import { findSpec } from './machines';
import { routePipe } from './pipes';
import { securitySubscriptionMonthly } from './security';
import { andList, inASentence } from './text';
import type { ExtensionStage, GameState, UnitExtension, UnitState } from './types';

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
   *  with either extension; a flat level is what it was after the first and twice it after the
   *  second (v82). */
  securityNow: number;
  securityThen: number;
  /** What the 1st takes for the covers held. The first extension leaves it as it is and the
   *  second doubles it (v82). */
  insuranceNow: number;
  insuranceThen: number;
}

/** Where a stage of the unit's extension stands. */
export function extensionStatus(unit: UnitState, stage: ExtensionStage): UnitExtension {
  return stage === 'first' ? unit.extension : secondExtensionOf(unit);
}

/** The unit as it is the morning a stage opens: twenty metres more of rear wall for the first,
 *  ten metres more of depth for the second, and every figure the floor sets in the same
 *  proportion. */
function unitWith(unit: UnitState, stage: ExtensionStage): UnitState {
  const widthCells = unit.widthCells + (stage === 'first' ? UNIT_WIDTH_CELLS : 0);
  const depthCells = unit.depthCells + (stage === 'second' ? UNIT_DEPTH_CELLS : 0);
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
  else grown.secondExtension = 'open';
  return grown;
}

/** The terms of an extension of the unit as it stands this minute: the unit as it will be, and
 *  every running cost asked of the function that charges it, of the same company in that unit, so
 *  a card cannot print a figure the month will not take. Read while the stage is not open; the
 *  card of an extended unit prints the unit itself. */
export function extensionTerms(state: GameState, stage: ExtensionStage = 'first'): ExtensionTerms {
  const unit = state.unit;
  const grown = unitWith(unit, stage);
  const then: GameState = { ...state, unit: grown };
  const price = stage === 'first' ? UNIT_EXTENSION_PRICE : UNIT_SECOND_EXTENSION_PRICE;
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
  else state.unit.secondExtension = 'building';
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
 *  lockers the canteen holds now, or would hold enlarged (v82). */
function secondOpened(state: GameState, terms: ExtensionTerms): EventDraft {
  const canteen = state.unit.canteenWide
    ? `The canteen holds ${terms.lockers} lockers now.`
    : `Enlarged, the canteen holds ${terms.lockers} lockers: enlarge it from the laptop, under Premises.`;
  return {
    kind: 'unitExtended',
    title: 'The second extension is open',
    body:
      `The builders are out. The hall is ${terms.widthCells} by ${terms.depthCells} m now, ` +
      `${terms.areaM2} m², with room for ${terms.joiners} joiners and ${terms.benches} benches. ` +
      'The rent, the rates and the power are charged on the bigger unit from today, and the ' +
      `insurer and the security charge for it from the 1st. ${canteen}`,
    data: { areaM2: terms.areaM2, widthCells: terms.widthCells, depthCells: terms.depthCells },
  };
}

/** One stage, the morning after its click. The first takes the kerb at the hall's end out with
 *  it. The second is along the front, where nothing stands and nothing has to move: the apron is
 *  past the end of the hall and stays there. */
function openStage(state: GameState, stage: ExtensionStage): void {
  const unit = state.unit;
  if (extensionStatus(unit, stage) !== 'building') return;
  const terms = extensionTerms(state, stage);
  if (stage === 'first') moveTheApron(state, unit.widthCells, terms.widthCells - unit.widthCells);
  Object.assign(unit, unitWith(unit, stage));
  queueEvent(state, stage === 'first' ? firstOpened(terms) : secondOpened(state, terms));
}

/** The morning after the click: the new floor is there. Called at the day's open, before the day
 *  is charged, so the first day of the bigger unit is paid for at its own rent. */
export function openExtension(state: GameState): void {
  openStage(state, 'first');
  openStage(state, 'second');
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
