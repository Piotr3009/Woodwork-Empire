// The bag lives on the extractor, and only there (PIOTR, 15.09; CLAUDE.md T12 2.3). Every machine
// gives dust in cubic metres an hour of use, the hall keeps it in one store the size of every bag
// on every fan standing in it, and nothing that makes dust runs while that store is full.

import { describe, expect, it } from 'vitest';
import {
  BAG_CHANGE_MINUTES,
  BAG_M3,
  BREAK_START_MINUTE,
  DUST_OUTPUT_M3_PER_HOUR,
  EXTRACTOR_BAGS,
} from '../../src/engine/constants';
import {
  bagStore,
  bagsFull,
  emptyBagsLabel,
  emptyBagsMinutes,
  tick,
} from '../../src/engine/index';
import type { Equipment, GameState } from '../../src/engine/index';
// The clock's own booking of a minute at a machine, off the module: the tests stand a man at a
// thicknesser, which no stage of any job does yet.
import { accumulateMachineMinute } from '../../src/engine/machines';
import {
  acceptNow,
  act,
  buyNow,
  buyStartingKit,
  choose,
  fillBags,
  fillRack,
  firstJob,
  hireNow,
  newGame,
  placeEnquiry,
  placeEquipment,
} from '../helpers';

/** The day 1 kit and a quiet board: one saw, and the used extractor, which holds one bag. */
function dayOneHall(): GameState {
  const state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
  state.enquiries = [];
  return state;
}

function machineOf(state: GameState, specId: string): Equipment {
  const item = state.equipment.find((entry) => entry.specId === specId);
  if (!item) throw new Error(`no ${specId} in the hall`);
  return item;
}

/** Somebody stands at each of these machines for so many minutes, booked a minute at a time the
 *  way the clock books them, so the rounding is the engine's own. The thicknesser has no stage of
 *  any job to be stood at yet, so the store is driven here rather than through a played day.
 *  Returns the minute the store filled, or zero when it never did. */
function standAt(state: GameState, machines: Equipment[], minutes: number): number {
  let filledAt = 0;
  for (let minute = 1; minute <= minutes; minute += 1) {
    const used = new Map(machines.map((item) => [item.id, 1]));
    if (accumulateMachineMinute(state, used) && filledAt === 0) filledAt = minute;
  }
  return filledAt;
}

/** The owner at the saw on a 4,000 job of sheet work, with the day 1 kit around him. */
function ownerCutting(): GameState {
  const state = fillRack(dayOneHall());
  const enquiry = placeEnquiry(state, { price: 4000, deadlineDays: 90 });
  const accepted = acceptNow(state, enquiry.id, false);
  firstJob(accepted).stage = 'ready';
  return act(accepted, { type: 'WORK_HERE', jobId: firstJob(accepted).id });
}

describe('the hall s one bag store', () => {
  it('is the bags of every fan standing in the hall, a cubic metre each', () => {
    const state = dayOneHall();
    expect(bagStore(state)).toEqual({
      exists: true,
      bags: 1,
      capacityM3: BAG_M3,
      fillM3: 0,
      full: false,
    });
    // A second fan adds its bags to the same store: a hall is one duct run (CLAUDE.md T12 2.3).
    placeEquipment(state, 'extractor', { variantId: 'pro', x: 19, y: 0, id: 'fan-2' });
    expect(bagStore(state).bags).toBe(1 + (EXTRACTOR_BAGS.pro ?? 0));
    expect(bagStore(state).capacityM3).toBe(5 * BAG_M3);
  });

  it('fills an eighth of a bag when one saw runs for eight hours', () => {
    const state = dayOneHall();
    const saw = machineOf(state, 'tableSaw');
    expect(standAt(state, [saw], 8 * 60)).toBe(0);
    expect(state.bagFillM3).toBeCloseTo((DUST_OUTPUT_M3_PER_HOUR.tableSaw ?? 0) * 8, 6);
    expect(state.bagFillM3).toBeCloseTo(BAG_M3 / 8, 1);
    expect(bagsFull(state)).toBe(false);
    // The day's figure is the same dust, and the wear is booked as it always was: eight hours,
    // give or take the minute's rounding.
    expect(state.dayStats.dustM3).toBeCloseTo(state.bagFillM3, 6);
    expect(saw.hoursUsed).toBeCloseTo(8, 2);
  });

  it('is filled by ten saws on a one bag fan in about eight hours', () => {
    const state = dayOneHall();
    const saws = [machineOf(state, 'tableSaw')];
    for (let extra = 1; extra < 10; extra += 1) {
      saws.push(placeEquipment(state, 'tableSaw', { x: 2 + extra, y: 1, id: `saw-${extra}` }));
    }
    const filledAt = standAt(state, saws, 8 * 60);
    expect(filledAt).toBeGreaterThan(6 * 60);
    expect(filledAt).toBeLessThanOrEqual(8 * 60);
    expect(bagsFull(state)).toBe(true);
    // To the brim and not past it: the store holds what it holds.
    expect(bagStore(state).fillM3).toBe(BAG_M3);
    // The dust the saws went on making after that is on the day and not in the store.
    expect(state.dayStats.dustM3).toBeGreaterThan(BAG_M3);
  });

  it('is full by dinner time with a thicknesser on a single bag', () => {
    const state = dayOneHall();
    const thicknesser = placeEquipment(state, 'thicknesser', { x: 10, y: 1, id: 'thicknesser' });
    const filledAt = standAt(state, [thicknesser], BREAK_START_MINUTE);
    expect(filledAt).toBeGreaterThan(0);
    expect(filledAt).toBeLessThanOrEqual(BREAK_START_MINUTE);
    expect(bagsFull(state)).toBe(true);
  });

  it('never fills with a central system in, and the dust is still counted', () => {
    const state = buyNow(dayOneHall(), 'dustSystem');
    const thicknesser = placeEquipment(state, 'thicknesser', { x: 10, y: 1, id: 'thicknesser' });
    expect(standAt(state, [thicknesser], 100 * 60)).toBe(0);
    expect(bagStore(state)).toMatchObject({ exists: false, fillM3: 0, full: false });
    expect(state.dayStats.dustM3).toBeCloseTo((DUST_OUTPUT_M3_PER_HOUR.thicknesser ?? 0) * 100, 1);
  });

  it('has no bag to fill in a hall with no fan at all, and the dust is still counted', () => {
    const state = newGame({ difficulty: 'veryEasy' });
    const saw = placeEquipment(state, 'tableSaw', { x: 2, y: 1, id: 'saw' });
    expect(standAt(state, [saw], 8 * 60)).toBe(0);
    expect(bagStore(state)).toMatchObject({ exists: false, bags: 0, fillM3: 0, full: false });
    expect(state.dayStats.dustM3).toBeCloseTo((DUST_OUTPUT_M3_PER_HOUR.tableSaw ?? 0) * 8, 6);
  });
});

describe('emptying the bags', () => {
  it('takes fifteen minutes a bag, so ten bags take ten times as long', () => {
    expect(emptyBagsMinutes(1)).toBe(BAG_CHANGE_MINUTES);
    expect(emptyBagsMinutes(10)).toBe(10 * BAG_CHANGE_MINUTES);
    expect(emptyBagsLabel(1)).toBe('Empty the bags (1 bag, 15 min)');
    expect(emptyBagsLabel(10)).toBe('Empty the bags (10 bags, 150 min)');
  });

  it('is one chore sized to the fan in the hall, and the owner is on it for the whole of it', () => {
    const state = dayOneHall();
    machineOf(state, 'extractor').variantId = 'industrial';
    expect(bagStore(state).bags).toBe(EXTRACTOR_BAGS.industrial);
    fillBags(state);
    const asked = act(state, { type: 'ASK_EMPTY_BAGS' });
    expect(asked.activeEvent?.kind).toBe('bagsFull');
    expect(asked.activeEvent?.body).toContain('hold 10 m³ and they are full');
    const task = asked.tasks.find((entry) => entry.kind === 'emptyBags');
    expect(task?.label).toBe('Empty the bags (10 bags, 150 min)');
    expect(task?.minutesTotal).toBe(10 * BAG_CHANGE_MINUTES);
    let next = choose(asked, 'owner');
    expect(next.owner.currentTaskId).toBe(task?.id ?? '');
    next = tick(next, 10 * BAG_CHANGE_MINUTES - 1);
    expect(bagsFull(next)).toBe(true);
    next = tick(next, 1);
    expect(next.bagFillM3).toBe(0);
    expect(bagsFull(next)).toBe(false);
    expect(next.tasks.find((entry) => entry.kind === 'emptyBags')?.done).toBe(true);
  });

  it('stops every machine that makes dust while the bags are full, and starts them again', () => {
    let state = fillBags(ownerCutting());
    const before = firstJob(state).labourRemaining;
    state = tick(state, 30);
    expect(firstJob(state).blockedBy).toBe('bags full');
    expect(firstJob(state).labourRemaining).toBe(before);
    expect(machineOf(state, 'tableSaw').takenBy).toBeNull();
    // Nothing asks on its own while they stand stopped; the extractor asks when it is clicked.
    expect(state.activeEvent).toBeNull();
    state = act(state, { type: 'ASK_EMPTY_BAGS' });
    expect(state.activeEvent?.title).toBe('Bags full in the workshop');
    state = choose(state, 'owner');
    state = tick(state, BAG_CHANGE_MINUTES);
    expect(state.bagFillM3).toBe(0);
    const running = tick(state, 30);
    expect(firstJob(running).blockedBy).toBe('');
    expect(firstJob(running).labourRemaining).toBeLessThan(before);
    expect(machineOf(running, 'tableSaw').takenBy).toBe('owner');
  });

  it('tells the workshop once, the minute the store fills, and not once a machine', () => {
    let state = ownerCutting();
    state.bagFillM3 = bagStore(state).capacityM3 - 0.0001;
    state = tick(state, 30);
    expect(state.activeEvent?.kind).toBe('bagsFull');
    expect(state.eventQueue.filter((event) => event.kind === 'bagsFull')).toHaveLength(0);
    expect(bagStore(state).fillM3).toBe(bagStore(state).capacityM3);
    expect(state.dayStats.dustM3).toBeGreaterThan(0);
    // Left stopped, the saw stays stopped and nobody is asked twice.
    state = choose(state, 'later');
    state = tick(state, 60);
    expect(state.activeEvent).toBeNull();
    expect(firstJob(state).blockedBy).toBe('bags full');
  });

  it('is the helper s the minute they fill, for nothing, and nobody stops', () => {
    let state = hireNow(ownerCutting(), 'helper', null);
    const helper = state.workers.find((worker) => worker.role === 'helper');
    if (helper === undefined) throw new Error('no helper on the books');
    helper.startDay = state.clock.day;
    state.bagFillM3 = bagStore(state).capacityM3 - 0.0001;
    const before = firstJob(state).labourRemaining;
    state = tick(state, 30);
    expect(state.activeEvent).toBeNull();
    const task = state.tasks.find((entry) => entry.kind === 'emptyBags');
    expect(task?.done).toBe(true);
    expect(task?.doneBy).toBe(helper.id);
    // Emptied and filling again from nothing, with the saw never off.
    expect(state.bagFillM3).toBeLessThan(0.01);
    expect(firstJob(state).blockedBy).toBe('');
    expect(firstJob(state).labourRemaining).toBeLessThan(before);
  });
});
