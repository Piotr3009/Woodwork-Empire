// The unit itself, and the two things that can be done to it (PIOTR, 03.10; v67).
//
// Era 1 ends in a hall of 200 m2 that takes eight joiners, and from there a full shop has nowhere
// to grow. From v67 the owner can pay a builder for a second 200 m2 along the rear wall. It opens
// the next working morning and doubles everything the floor sets: the joiners the unit takes, the
// benches it holds, the rent, the rates and what it draws with nothing running. The canteen was
// built for eight and stays that until it is enlarged: no charge, it comes with the extension,
// but it grows two metres along the rear wall and the floor beside it has to be clear first.
//
// Everything a card says about either is worked out here, so the laptop prints figures and holds
// none of its own.

import {
  CANTEEN_LOCKERS,
  CANTEEN_LOCKERS_WIDE,
  M2_PER_PERSON,
  UNIT_EXTENSION_PRICE,
  UNIT_WIDTH_CELLS,
  canteenGrowthBox,
  roomById,
  roomsOf,
  unitDepositFor,
} from './constants';
import { pay, standingPowerPerDay } from './economy';
import { queueEvent } from './events';
import { standingOn } from './layout';
import { findSpec } from './machines';
import { routePipe } from './pipes';
import { securityLevel, securitySubscriptionMonthly } from './security';
import { andList } from './text';
import type { GameState } from './types';

export interface PremisesCheck {
  ok: boolean;
  reason: string;
}

const OK: PremisesCheck = { ok: true, reason: '' };

/** Everything the extension changes, as the card prints it: what it costs at the click, the unit
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
  rentNow: number;
  rentThen: number;
  ratesNow: number;
  ratesThen: number;
  /** What the unit draws a day with nothing running. */
  powerNow: number;
  powerThen: number;
  /** A security firm charges by the area, so its month goes up with it; nought and nought for a
   *  level that is not one of the firms. */
  securityNow: number;
  securityThen: number;
}

/** The terms of extending the unit as it stands this minute: twenty metres more of rear wall, the
 *  depth it has, and every figure the floor sets in the same proportion. Read while the unit is
 *  not extended; the card of an extended unit prints the unit itself. */
export function extensionTerms(state: GameState): ExtensionTerms {
  const unit = state.unit;
  const widthCells = unit.widthCells + UNIT_WIDTH_CELLS;
  const areaM2 = widthCells * unit.depthCells;
  const factor = areaM2 / unit.areaM2;
  const rentThen = Math.round(unit.rentMonthly * factor);
  const deposit = Math.max(0, unitDepositFor(rentThen) - unit.depositHeld);
  const scaled = securityLevel(state).scaled;
  const securityNow = scaled ? securitySubscriptionMonthly(state) : 0;
  return {
    price: UNIT_EXTENSION_PRICE,
    deposit,
    total: UNIT_EXTENSION_PRICE + deposit,
    addsM2: areaM2 - unit.areaM2,
    areaM2,
    widthCells,
    depthCells: unit.depthCells,
    joiners: Math.floor(areaM2 / M2_PER_PERSON),
    benches: Math.round(unit.benchSlots * factor),
    rentNow: unit.rentMonthly,
    rentThen,
    ratesNow: unit.ratesMonthly,
    ratesThen: Math.round(unit.ratesMonthly * factor),
    powerNow: standingPowerPerDay(unit),
    powerThen: standingPowerPerDay({ areaM2 }),
    securityNow,
    securityThen: Math.round(securityNow * factor * 100) / 100,
  };
}

/** Why the unit cannot be extended this minute, or that it can. Money is the only condition
 *  [PIOTR, 03.10], and it is the money in the account: the bank does not lend the price of a
 *  building on the overdraft. */
export function extendUnitCheck(state: GameState): PremisesCheck {
  if (state.unit.extension === 'building') return { ok: false, reason: 'The builders are in' };
  if (state.unit.extension === 'open') return { ok: false, reason: 'Extended already' };
  const terms = extensionTerms(state);
  // The card prints the figure beside the button, so the reason is the short one.
  if (state.cash < terms.total) return { ok: false, reason: 'Not enough in the account' };
  return OK;
}

/** The click: the builder and the landlord are paid, and the builders are in. The hall is the one
 *  it was until the morning (`openExtension`). */
export function extendUnit(state: GameState): PremisesCheck {
  const check = extendUnitCheck(state);
  if (!check.ok) return check;
  const terms = extensionTerms(state);
  pay(state, 'unitExtension', `Extension of the unit, ${terms.addsM2} m²`, terms.price);
  if (terms.deposit > 0) {
    pay(state, 'unitDeposit', 'Unit deposit, the extension', terms.deposit);
    state.unit.depositHeld += terms.deposit;
  }
  state.unit.extension = 'building';
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

/** The morning after the click: the second half of the hall is there. Called at the day's open,
 *  before the day is charged, so the first day of the bigger unit is paid for at its own rent. */
export function openExtension(state: GameState): void {
  const unit = state.unit;
  if (unit.extension !== 'building') return;
  const terms = extensionTerms(state);
  moveTheApron(state, unit.widthCells, terms.widthCells - unit.widthCells);
  unit.widthCells = terms.widthCells;
  unit.areaM2 = terms.areaM2;
  unit.rentMonthly = terms.rentThen;
  unit.ratesMonthly = terms.ratesThen;
  unit.benchSlots = terms.benches;
  unit.extension = 'open';
  queueEvent(state, {
    kind: 'unitExtended',
    title: 'The extension is open',
    body:
      `The builders are out. The hall is ${terms.widthCells} by ${terms.depthCells} m now, ` +
      `${terms.areaM2} m², with room for ${terms.joiners} joiners and ${terms.benches} benches. ` +
      'The rent, the rates and the power are charged on the bigger unit from today. ' +
      'The canteen still holds what it held: enlarge it from the laptop, under Premises.',
    data: { areaM2: terms.areaM2, widthCells: terms.widthCells },
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
  return {
    areaNow: now.width * now.depth,
    lockersNow: state.unit.canteenWide ? CANTEEN_LOCKERS_WIDE : CANTEEN_LOCKERS,
    areaThen: wide.width * wide.depth,
    lockersThen: CANTEEN_LOCKERS_WIDE,
    grows: wide.width - built.width,
    clear: { width: box.width, depth: box.depth },
  };
}

/** A catalogue name inside a sentence: `the extractor`, `the spray booth`, and `the CNC` as it is
 *  written, because a name that opens with capitals is one. */
function inASentence(name: string): string {
  return /^[A-Z]{2}/.test(name) ? name : name.charAt(0).toLowerCase() + name.slice(1);
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

/** The click: the canteen is four by four metres from this minute, and holds sixteen lockers.
 *  Nothing is paid and nothing has to be moved, because the check has seen the floor clear. */
export function enlargeCanteen(state: GameState): PremisesCheck {
  const check = enlargeCanteenCheck(state);
  if (!check.ok) return check;
  state.unit.canteenWide = true;
  return OK;
}
