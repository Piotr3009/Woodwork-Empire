// v67 (PIOTR, 03.10): the unit can be extended, and its canteen enlarged.
//
// "Make the new hall as an extension. How much do we pay for it, how much cash do we need, and do
// the rent and the rest go up the same?" The builder's price and the landlord's deposit are paid
// at the click, out of the money in the account, and the second 200 m2 are there the next working
// morning: forty metres by ten, sixteen joiners, twice the benches, twice the rent, the rates and
// the standing power. "Leave the canteen that is there, only make it bigger": it grows two metres
// along the rear wall, at no charge, once the extension is open and the floor beside it is clear,
// and holds sixteen lockers.
//
// v82 (PIOTR, 04.10): the second extension, at the foot of this file. "The extension for timber,
// the next 400 m2 for a million", and "do not forget to make everything bigger: thirty two
// workers, and all the costs times two, insurance, security, power".

import { describe, expect, it } from 'vitest';
import {
  CANTEEN_LOCKERS,
  CANTEEN_LOCKERS_WIDE,
  STATE_VERSION,
  UNIT_EXTENSION_PRICE,
  UNIT_SECOND_EXTENSION_PRICE,
  canteenGrowthBox,
  roomDoorCell,
  roomsOf,
} from '../../src/engine/constants';
import { MONTH_LINE_OF, dailyPower, standingPowerPerDay } from '../../src/engine/economy';
import { canBuy, countOf, machinePowerPerDay, movePending } from '../../src/engine/index';
import type { GameEvent, GameState } from '../../src/engine/index';
import { premiumYearlyFor } from '../../src/engine/insurance';
import {
  canPlaceSpec,
  canteenLockers,
  cellIsFloor,
  crewLimit,
  freeFloorM2,
  lockersInWords,
} from '../../src/engine/layout';
import { migrateState } from '../../src/engine/migrate';
import {
  canteenTerms,
  enlargeCanteenCheck,
  extendUnitCheck,
  extensionTerms,
} from '../../src/engine/premises';
import { securitySubscriptionMonthly, securitySubscriptionParts } from '../../src/engine/security';
import { canHire, canteenFullLine } from '../../src/engine/staff';
import { isFree } from '../../src/engine/walk';
import {
  act,
  buyNow,
  choose,
  newGame,
  nextDay,
  placeEquipment,
  runClock,
  testJoiner,
} from '../helpers';

/** A shop with the money for the extension and nothing else to its name. */
function shop(difficulty: 'veryEasy' | 'easy' = 'veryEasy'): GameState {
  const state = newGame({ difficulty });
  state.cash = 300000;
  state.reputation = 90;
  return state;
}

/** The same shop the morning after it paid for the extension. */
function extended(state: GameState = shop(), events: GameEvent[] = []): GameState {
  return nextDay(act(state, { type: 'EXTEND_UNIT' }), events);
}

function ledgerOf(state: GameState, category: string, day?: number): number {
  return state.ledger
    .filter((entry) => entry.category === category && (day === undefined || entry.day === day))
    .reduce((total, entry) => total + entry.amount, 0);
}

/** Runs a move of the hall that has been said yes to until it is done. */
function untilMoved(state: GameState): GameState {
  let next = state;
  for (let step = 0; step < 120; step += 1) {
    next = runClock(next, 10);
    if (next.activeEvent?.kind === 'goingHome') next = choose(next, 'home');
    if (next.activeEvent?.kind === 'dayEnd') next = choose(next, 'next');
    if (next.activeEvent?.kind === 'moveConfirm') next = choose(next, 'do');
    if (movePending(next) === null && next.movedItems.length === 0) break;
  }
  return next;
}

describe('a save from before v67', () => {
  it('opens with the unit as it was built: not extended, the canteen of eight', () => {
    const old = JSON.parse(JSON.stringify(newGame())) as Record<string, unknown>;
    const unit = old.unit as Record<string, unknown>;
    delete unit.extension;
    delete unit.canteenWide;
    old.version = 34;
    const lifted = migrateState(old, 34);
    expect(lifted?.version).toBe(STATE_VERSION);
    expect(STATE_VERSION).toBe(41);
    expect(lifted?.unit.extension).toBe('none');
    expect(lifted?.unit.canteenWide).toBe(false);
    // And everything else of the unit is what it was.
    expect(lifted?.unit.widthCells).toBe(20);
    expect(lifted?.unit.rentMonthly).toBe(2400);
  });

  it('starts a new company the same way', () => {
    const state = newGame();
    expect(state.unit.extension).toBe('none');
    expect(state.unit.canteenWide).toBe(false);
    expect(canteenLockers(state)).toBe(CANTEEN_LOCKERS);
  });
});

describe('what the extension costs and what it changes [PIOTR accepted, 03.10]', () => {
  it('is the builder s price and one more month of rent in deposit, and doubles what the floor sets', () => {
    const terms = extensionTerms(shop());
    // 250,000 from Turn 27, where it was 120,000 [PIOTR, 04.10] (CLAUDE.md T27 2.4).
    expect(UNIT_EXTENSION_PRICE).toBe(250000);
    expect(terms.price).toBe(250000);
    expect(terms.deposit).toBe(2400);
    expect(terms.total).toBe(252400);
    expect(terms.addsM2).toBe(200);
    expect(terms.areaM2).toBe(400);
    expect(terms.widthCells).toBe(40);
    expect(terms.depthCells).toBe(10);
    expect(terms.joiners).toBe(16);
    // Very easy has six bench slots and the other two have four.
    expect(terms.benches).toBe(12);
    expect(extensionTerms(shop('easy')).benches).toBe(8);
    expect([terms.rentNow, terms.rentThen]).toEqual([2400, 4800]);
    expect([terms.ratesNow, terms.ratesThen]).toEqual([450, 900]);
    expect([terms.powerNow, terms.powerThen]).toEqual([4, 8]);
    // No security firm, so nothing of it on the card.
    expect([terms.securityNow, terms.securityThen]).toEqual([0, 0]);
  });

  it('says what a security firm s month becomes, because a firm charges by the area', () => {
    const state = shop();
    state.security.level = 5;
    const terms = extensionTerms(state);
    expect(terms.securityNow).toBeGreaterThan(0);
    expect(terms.securityThen).toBeCloseTo(terms.securityNow * 2, 2);
  });

  it('wants the whole of it in the account, and not a pound of it on the overdraft', () => {
    const state = shop();
    state.cash = 252399;
    expect(extendUnitCheck(state)).toEqual({ ok: false, reason: 'Not enough in the account' });
    // Refused: nothing is paid and nothing is built.
    const refused = act(state, { type: 'EXTEND_UNIT' });
    expect(refused.cash).toBe(252399);
    expect(refused.unit.extension).toBe('none');
    state.cash = 252400;
    expect(extendUnitCheck(state).ok).toBe(true);
  });
});

describe('the click', () => {
  it('pays the builder and the landlord at once, and leaves the hall as it is until the morning', () => {
    const before = shop();
    const paid = act(before, { type: 'EXTEND_UNIT' });
    expect(paid.cash).toBe(before.cash - 252400);
    expect(ledgerOf(paid, 'unitExtension')).toBe(-250000);
    // The deposit of day 1 and the one on the bigger rent.
    expect(ledgerOf(paid, 'unitDeposit')).toBe(-4800);
    expect(paid.unit.depositHeld).toBe(4800);
    expect(paid.unit.extension).toBe('building');
    expect(paid.unit.widthCells).toBe(20);
    expect(paid.unit.areaM2).toBe(200);
    expect(paid.unit.rentMonthly).toBe(2400);
    expect(crewLimit(paid)).toBe(8);
    // It is one line of the month, with everything else, and not rent.
    expect(MONTH_LINE_OF.unitExtension).toBe('other');
  });

  it('cannot be made twice', () => {
    const paid = act(shop(), { type: 'EXTEND_UNIT' });
    expect(extendUnitCheck(paid)).toEqual({ ok: false, reason: 'The builders are in' });
    const again = act(paid, { type: 'EXTEND_UNIT' });
    expect(again.cash).toBe(paid.cash);
    const open = nextDay(again);
    expect(extendUnitCheck(open)).toEqual({ ok: false, reason: 'Extended already' });
    expect(act(open, { type: 'EXTEND_UNIT' }).unit.widthCells).toBe(40);
  });
});

describe('the next working morning', () => {
  it('has a hall of forty metres by ten, for sixteen joiners and twice the benches', () => {
    const events: GameEvent[] = [];
    const open = extended(shop(), events);
    expect(open.unit.extension).toBe('open');
    expect(open.unit.widthCells).toBe(40);
    expect(open.unit.depthCells).toBe(10);
    expect(open.unit.areaM2).toBe(400);
    expect(open.unit.rentMonthly).toBe(4800);
    expect(open.unit.ratesMonthly).toBe(900);
    expect(open.unit.benchSlots).toBe(12);
    expect(crewLimit(open)).toBe(16);
    // And says so once, the morning it opens.
    const said = events.filter((event) => event.kind === 'unitExtended');
    expect(said).toHaveLength(1);
    expect(said[0]?.body).toContain('40 by 10 m');
    expect(nextDay(open, events).unit.widthCells).toBe(40);
    expect(events.filter((event) => event.kind === 'unitExtended')).toHaveLength(1);
  });

  it('charges its first day on the bigger unit: the rent, the rates and the standing power', () => {
    const open = extended();
    const day = open.clock.day;
    expect(ledgerOf(open, 'rent', day)).toBeCloseTo(-4800 / 30, 6);
    expect(ledgerOf(open, 'rates', day)).toBeCloseTo(-900 / 30, 6);
    expect(standingPowerPerDay(open.unit)).toBe(8);
    expect(dailyPower(open)).toBe(8 + machinePowerPerDay(open));
    expect(ledgerOf(open, 'power', day)).toBeCloseTo(-dailyPower(open), 6);
    // The day before was the last at the old figures.
    expect(ledgerOf(open, 'rent', day - 1)).toBeCloseTo(-2400 / 30, 6);
  });

  it('has twenty metres more of floor to stand things on', () => {
    const before = shop();
    const open = extended(before);
    expect(freeFloorM2(open)).toBe(freeFloorM2(before) + 200);
    expect(cellIsFloor(before, { x: 30, y: 5 })).toBe(false);
    expect(cellIsFloor(open, { x: 30, y: 5 })).toBe(true);
    expect(canPlaceSpec(before, 'tableSaw', 30, 4, null).ok).toBe(false);
    expect(canPlaceSpec(open, 'tableSaw', 30, 4, null).ok).toBe(true);
    expect(isFree(open, { x: 39, y: 9 })).toBe(true);
    expect(isFree(open, { x: 40, y: 9 })).toBe(false);
  });

  it('takes the apron out with the kerb: what stood past the old end stands past the new one', () => {
    const state = shop();
    const van = placeEquipment(state, 'van', { x: state.unit.widthCells, y: 7, id: 'kit-van' });
    const saw = placeEquipment(state, 'tableSaw', { x: 12, y: 0, id: 'kit-saw' });
    expect(van.anchorX).toBe(20);
    const open = extended(state);
    expect(open.equipment.find((item) => item.id === 'kit-van')?.anchorX).toBe(40);
    // What stands in the hall stands where it stood.
    expect(open.equipment.find((item) => item.id === 'kit-saw')?.anchorX).toBe(saw.anchorX);
  });
});

describe('the canteen of an extended unit', () => {
  /** An extended unit with a CNC and an extractor on the floor beside the canteen, as Piotr's is. */
  function withMachinesBeside(): GameState {
    const state = shop();
    placeEquipment(state, 'cnc', { variantId: 'pro', x: 5, y: 1, id: 'kit-cnc' });
    placeEquipment(state, 'extractor', { variantId: 'industrial', x: 5, y: 0, id: 'kit-fan' });
    return state;
  }

  it('is what it was built as until it is enlarged: eight square metres and eight lockers', () => {
    const terms = canteenTerms(shop());
    expect(terms.areaNow).toBe(8);
    expect(terms.lockersNow).toBe(8);
    expect(terms.areaThen).toBe(16);
    expect(terms.lockersThen).toBe(16);
    expect(terms.grows).toBe(2);
    expect(terms.clear).toEqual({ width: 2, depth: 4 });
    expect(canteenGrowthBox()).toEqual({ x: 5, y: 0, width: 2, depth: 4 });
    expect(CANTEEN_LOCKERS_WIDE).toBe(16);
  });

  it('comes with the extension and not before it', () => {
    const state = shop();
    expect(enlargeCanteenCheck(state)).toEqual({ ok: false, reason: 'Extend the unit first' });
    expect(act(state, { type: 'ENLARGE_CANTEEN' }).unit.canteenWide).toBe(false);
    const paid = act(state, { type: 'EXTEND_UNIT' });
    expect(enlargeCanteenCheck(paid)).toEqual({ ok: false, reason: 'The extension opens in the morning' });
    expect(enlargeCanteenCheck(nextDay(paid)).ok).toBe(true);
  });

  it('names what stands on the floor beside it, and is refused until it is moved', () => {
    const open = extended(withMachinesBeside());
    expect(enlargeCanteenCheck(open)).toEqual({
      ok: false,
      reason: 'Move the CNC and the extractor off the 2 × 4 m beside it',
    });
    expect(act(open, { type: 'ENLARGE_CANTEEN' }).unit.canteenWide).toBe(false);
  });

  it('waits for the move to be done, and is enlarged when the floor is clear', () => {
    let state = extended(withMachinesBeside());
    state = act(state, { type: 'MOVE_ITEM', itemId: 'kit-cnc', x: 22, y: 1 });
    state = act(state, { type: 'MOVE_ITEM', itemId: 'kit-fan', x: 28, y: 0 });
    // Dragged off it and not yet moved: he could still say no and have them back.
    expect(enlargeCanteenCheck(state)).toEqual({
      ok: false,
      reason: 'The kit is half shifted. Finish the move first',
    });
    state = untilMoved(choose(act(state, { type: 'END_SETUP', speed: 1 }), 'do'));
    expect(state.movedItems).toEqual([]);
    expect(enlargeCanteenCheck(state).ok).toBe(true);
    const cash = state.cash;
    const wide = act(state, { type: 'ENLARGE_CANTEEN' });
    expect(wide.unit.canteenWide).toBe(true);
    // No charge.
    expect(wide.cash).toBe(cash);
    expect(enlargeCanteenCheck(wide)).toEqual({ ok: false, reason: 'Enlarged already' });
    expect(canteenTerms(wide).areaNow).toBe(16);
    expect(canteenLockers(wide)).toBe(16);
  });
});

describe('the enlarged canteen on the floor', () => {
  function wide(): GameState {
    return act(extended(), { type: 'ENLARGE_CANTEEN' });
  }

  it('is four metres by four, and its door is where it was painted', () => {
    const state = wide();
    const canteen = roomsOf(state.unit).find((room) => room.id === 'canteen');
    expect(canteen).toMatchObject({ x: 3, y: 0, width: 4, depth: 4 });
    expect(roomsOf({ canteenWide: false }).find((room) => room.id === 'canteen')).toMatchObject({ width: 2 });
    expect(roomDoorCell('canteen')).toEqual({ x: 4, y: 4 });
  });

  it('is a room to everything that asks about the floor: nothing stands on it and nobody walks it', () => {
    const before = extended();
    const state = wide();
    for (const cell of [{ x: 5, y: 0 }, { x: 6, y: 3 }]) {
      expect(cellIsFloor(before, cell)).toBe(true);
      expect(isFree(before, cell)).toBe(true);
      expect(cellIsFloor(state, cell)).toBe(false);
      expect(isFree(state, cell)).toBe(false);
    }
    // The cell past it and the cell in front of it are floor still.
    expect(isFree(state, { x: 7, y: 0 })).toBe(true);
    expect(isFree(state, { x: 5, y: 4 })).toBe(true);
    expect(canPlaceSpec(before, 'toolCabinet', 5, 0, null).ok).toBe(true);
    expect(canPlaceSpec(state, 'toolCabinet', 5, 0, null)).toEqual({ ok: false, reason: 'On the canteen' });
    expect(freeFloorM2(state)).toBe(freeFloorM2(before) - 8);
  });
});

describe('sixteen lockers', () => {
  /** A unit with that many joiners on its books, each with a locker, extended or not. */
  function crewOf(size: number, state: GameState): GameState {
    let next = state;
    for (let index = countOf(next, 'locker'); index < Math.min(size, canteenLockers(next)); index += 1) {
      next = buyNow(next, 'locker');
    }
    for (let index = 0; index < size; index += 1) {
      next.workers.push(testJoiner(`joiner-${index + 1}`, `Joiner ${index + 1}`));
    }
    return next;
  }

  it('takes a ninth locker once it is enlarged, and no seventeenth', () => {
    let state = extended();
    for (let index = 0; index < 8; index += 1) state = buyNow(state, 'locker');
    expect(canBuy(state, 'locker')).toEqual({ ok: false, reason: 'The canteen has eight lockers' });
    state = act(state, { type: 'ENLARGE_CANTEEN' });
    expect(canBuy(state, 'locker').ok).toBe(true);
    for (let index = 0; index < 8; index += 1) state = buyNow(state, 'locker');
    expect(countOf(state, 'locker')).toBe(16);
    expect(canBuy(state, 'locker')).toEqual({ ok: false, reason: 'The canteen has sixteen lockers' });
    // The second eight stand in the far column of the new half, inside the room.
    const lockers = state.equipment.filter((item) => item.specId === 'locker');
    expect(lockers.slice(0, 8).every((item) => item.anchorX === 3)).toBe(true);
    expect(lockers.slice(8).every((item) => item.anchorX === 6 && item.anchorY <= 3)).toBe(true);
  });

  it('refuses the ninth joiner of an extended unit for the canteen, and says where the bigger one is', () => {
    const eight = crewOf(8, extended());
    expect(crewLimit(eight)).toBe(16);
    const line = 'No locker for him: the canteen holds eight. Enlarge it on the laptop, under Premises';
    expect(canteenFullLine(eight)).toBe(line);
    expect(canHire(eight, 'joiner', 'novice')).toEqual({ ok: false, reason: line });
  });

  it('lets the canteen say nothing of the ninth once it is enlarged, and stops the seventeenth', () => {
    const eight = act(crewOf(8, extended()), { type: 'ENLARGE_CANTEEN' });
    expect(canHire(eight, 'joiner', 'novice').reason).not.toContain('No locker for him');
    const sixteen = crewOf(16, act(extended(), { type: 'ENLARGE_CANTEEN' }));
    // Sixteen joiners is the unit's own limit, and the unit says so first.
    expect(canHire(sixteen, 'joiner', 'novice').reason).toContain('the unit takes 16 joiners');
    expect(canteenFullLine(sixteen)).toBe('No locker for him: the canteen holds sixteen');
  });
});

describe('the second extension: 400 m2 along the front, for a million [PIOTR, 04.10] (v82)', () => {
  /** A shop that has had the first extension and has the money for the second. */
  function rich(): GameState {
    const state = extended();
    state.cash = 1200000;
    return state;
  }

  it('waits for the first, costs a million and a deposit, and doubles what the floor sets', () => {
    expect(extendUnitCheck(shop(), 'second')).toEqual({ ok: false, reason: 'Extend the unit first' });
    expect(act(shop(), { type: 'EXTEND_UNIT', stage: 'second' }).unit.secondExtension).toBeUndefined();
    const terms = extensionTerms(rich(), 'second');
    expect(UNIT_SECOND_EXTENSION_PRICE).toBe(1000000);
    expect([terms.price, terms.deposit, terms.total]).toEqual([1000000, 4800, 1004800]);
    expect([terms.addsM2, terms.areaM2, terms.widthCells, terms.depthCells]).toEqual([400, 800, 40, 20]);
    expect([terms.joiners, terms.benches, terms.lockers]).toEqual([32, 24, 32]);
    expect([terms.rentNow, terms.rentThen]).toEqual([4800, 9600]);
    expect([terms.ratesNow, terms.ratesThen]).toEqual([900, 1800]);
    expect([terms.powerNow, terms.powerThen]).toEqual([8, 16]);
    const short = rich();
    short.cash = 1004799;
    expect(extendUnitCheck(short, 'second')).toEqual({ ok: false, reason: 'Not enough in the account' });
  });

  it('is there the next morning: forty metres by twenty, thirty two joiners, and said once', () => {
    const events: GameEvent[] = [];
    const before = rich();
    const paid = act(before, { type: 'EXTEND_UNIT', stage: 'second' });
    expect(paid.cash).toBe(before.cash - 1004800);
    expect(paid.unit.secondExtension).toBe('building');
    expect(paid.unit.depthCells).toBe(10);
    expect(extendUnitCheck(paid, 'second')).toEqual({ ok: false, reason: 'The builders are in' });
    const open = nextDay(paid, events);
    expect(open.unit).toMatchObject({
      areaM2: 800,
      widthCells: 40,
      depthCells: 20,
      rentMonthly: 9600,
      ratesMonthly: 1800,
      benchSlots: 24,
      extension: 'open',
      secondExtension: 'open',
    });
    expect(crewLimit(open)).toBe(32);
    expect(standingPowerPerDay(open.unit)).toBe(16);
    expect(ledgerOf(open, 'rent', open.clock.day)).toBeCloseTo(-9600 / 30, 6);
    const said = events.filter((event) => event.kind === 'unitExtended');
    expect(said.map((event) => event.title)).toEqual(['The second extension is open']);
    expect(said[0]?.body).toContain('40 by 20 m');
    expect(extendUnitCheck(open, 'second')).toEqual({ ok: false, reason: 'Extended already' });
    // The new floor takes a machine and a man, and the hall ends where it ends.
    expect(canPlaceSpec(paid, 'tableSaw', 30, 14, null).ok).toBe(false);
    expect(canPlaceSpec(open, 'tableSaw', 30, 14, null).ok).toBe(true);
    expect(isFree(open, { x: 39, y: 19 })).toBe(true);
    expect(isFree(open, { x: 39, y: 20 })).toBe(false);
  });

  it('doubles the insurance and the dogs, which the area does not set, and gives the canteen thirty two', () => {
    const open = nextDay(act(rich(), { type: 'EXTEND_UNIT', stage: 'second' }));
    placeEquipment(open, 'tableSaw', { variantId: 'pro', x: 12, y: 0, id: 'kit-saw' });
    // The same company in the unit it had the day before.
    const flat: GameState = { ...open, unit: { ...open.unit, secondExtension: 'none' } };
    expect(premiumYearlyFor(flat, 'property')).toBeGreaterThan(0);
    expect(premiumYearlyFor(open, 'property')).toBe(2 * premiumYearlyFor(flat, 'property'));
    expect(premiumYearlyFor(open, 'liability')).toBe(2 * premiumYearlyFor(flat, 'liability'));
    // The dogs are a flat 150 a month and 300 here; a firm's month is the area's, four times 200.
    expect(securitySubscriptionMonthly(flat, 3)).toBe(150);
    expect(securitySubscriptionMonthly(open, 3)).toBe(300);
    expect(securitySubscriptionParts(open, 5).areaFactor).toBe(4);
    // Eight lockers until the canteen is enlarged, and thirty two then: one for every joiner.
    expect(canteenLockers(open)).toBe(8);
    expect(canteenTerms(open).lockersThen).toBe(32);
    const wide = act(open, { type: 'ENLARGE_CANTEEN' });
    expect(canteenLockers(wide)).toBe(32);
    expect(lockersInWords(wide)).toBe('thirty-two');
  });
});
