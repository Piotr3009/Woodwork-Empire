// A machine's hours are the share of its capacity the workshop puts through it, not the minutes
// the hall happened to be busy (CLAUDE.md T6 3.6).

import { describe, expect, it } from 'vitest';
import {
  HOURS_PER_WORKING_DAY,
  MACHINE_CAPACITY_DEFAULT,
  MINUTES_PER_WORKING_DAY,
  SERVICE_INTERVAL_HOURS,
} from '../../src/engine/constants';
import { EQUIPMENT_SPECS } from '../../src/engine/constants';
import {
  accumulateMachineMinute,
  capacityOf,
  capacityShare,
  findSpec,
  machineHoursInDay,
  serviceIsDue,
} from '../../src/engine/machines';
import type { Equipment, GameState } from '../../src/engine/index';
import { buyStartingKit, newGame, placeEquipment } from '../helpers';

/** Runs `minutes` of production through the hall with this many men on the material. */
function work(state: GameState, minutes: number, users: number): void {
  for (let minute = 0; minute < minutes; minute += 1) {
    accumulateMachineMinute(state, new Map([['sheet', users]]));
  }
}

/** The same, with men on both materials at once, the way a hall with a joiner in it runs. */
function workBoth(state: GameState, minutes: number, sheet: number, solidWood: number): void {
  for (let minute = 0; minute < minutes; minute += 1) {
    accumulateMachineMinute(
      state,
      new Map([
        ['sheet', sheet],
        ['solidWood', solidWood],
      ]),
    );
  }
}

describe('what a family can serve', () => {
  it('gives the table saw three, the hand edgebander one, and everything else two', () => {
    expect(capacityOf('tableSaw')).toBe(3);
    expect(findSpec('tableSaw')?.capacity).toBe(3);
    // A hand tool serves the man holding it: no ratio applies to it (CLAUDE.md T6 3.5).
    expect(capacityOf('edgebander')).toBe(1);
    expect(capacityShare('edgebander', 1)).toBe(1);
    expect(capacityShare('edgebander', 3)).toBe(1);
    for (const spec of EQUIPMENT_SPECS) {
      if (spec.id === 'tableSaw' || spec.id === 'edgebander') continue;
      expect(spec.capacity, spec.id).toBe(MACHINE_CAPACITY_DEFAULT);
    }
  });

  it('leaves the hand edgebander counting whole minutes, bag and hours alike', () => {
    const state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    work(state, 60, 1);
    const bander = state.equipment.find((item) => item.specId === 'edgebander');
    expect(bander?.hoursUsed).toBeCloseTo(1, 4);
    expect(bander?.minutesUsed).toBeCloseTo(60, 4);
    // And the saw beside it, which serves three, gained a third of that.
    const saw = state.equipment.find((item) => item.specId === 'tableSaw');
    expect(saw?.hoursUsed).toBeCloseTo(1 / 3, 4);
  });

  it('is a share of the capacity, and never more than all of it', () => {
    expect(capacityShare('tableSaw', 0)).toBe(0);
    expect(capacityShare('tableSaw', 1)).toBeCloseTo(1 / 3, 10);
    expect(capacityShare('tableSaw', 3)).toBe(1);
    expect(capacityShare('tableSaw', 4)).toBe(1);
    expect(capacityShare('thicknesser', 1)).toBe(0.5);
  });

  it('turns a day of it into hours: eight at full capacity, pro rata below', () => {
    expect(HOURS_PER_WORKING_DAY).toBe(8);
    expect(machineHoursInDay('tableSaw', 3)).toBe(8);
    expect(machineHoursInDay('tableSaw', 1)).toBeCloseTo(8 / 3, 10);
    expect(machineHoursInDay('tableSaw', 2)).toBeCloseTo(16 / 3, 10);
  });
});

describe('the hours a saw that serves three actually gains', () => {
  function saw(state: GameState): Equipment {
    const item = state.equipment.find((entry) => entry.specId === 'tableSaw');
    if (!item) throw new Error('no saw');
    return item;
  }

  it('gives one man three days to put eight hours on it', () => {
    const state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    work(state, MINUTES_PER_WORKING_DAY * 3, 1);
    expect(saw(state).hoursUsed).toBeCloseTo(8, 2);
  });

  it('gives two men a day and a half for the same eight hours', () => {
    const state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    work(state, MINUTES_PER_WORKING_DAY * 1.5, 2);
    expect(saw(state).hoursUsed).toBeCloseTo(8, 2);
  });

  it('gives three men one day, which is the whole of what the saw can give', () => {
    const state = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    work(state, MINUTES_PER_WORKING_DAY, 3);
    expect(saw(state).hoursUsed).toBeCloseTo(8, 2);
    // And a fourth man puts nothing more on it: the saw is already flat out.
    const busier = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    work(busier, MINUTES_PER_WORKING_DAY, 4);
    expect(saw(busier).hoursUsed).toBeCloseTo(8, 2);
  });

  it('brings the service on by hours, so a busy saw is serviced three times as often', () => {
    const slow = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    const fast = buyStartingKit(newGame({ difficulty: 'veryEasy' }));
    const days = SERVICE_INTERVAL_HOURS / (HOURS_PER_WORKING_DAY / 3);
    work(slow, MINUTES_PER_WORKING_DAY * (days - 1), 1);
    expect(serviceIsDue(saw(slow))).toBe(false);
    work(slow, MINUTES_PER_WORKING_DAY, 1);
    expect(serviceIsDue(saw(slow))).toBe(true);
    work(fast, MINUTES_PER_WORKING_DAY * (days / 3), 3);
    expect(serviceIsDue(saw(fast))).toBe(true);
  });
});

describe('a machine nobody uses', () => {
  it('gains nothing, however long the hall runs', () => {
    const state = newGame({ difficulty: 'veryEasy' });
    placeEquipment(state, 'extractor');
    const thicknesser = placeEquipment(state, 'thicknesser', { x: 12, y: 1 });
    work(state, MINUTES_PER_WORKING_DAY * 5, 3);
    // Sheet work never touches the solid wood machine.
    expect(thicknesser.hoursUsed).toBe(0);
  });
});

describe('a machine that serves every material', () => {
  it('is booked once a minute, so a day can never give it more than eight hours', () => {
    const state = newGame({ difficulty: 'veryEasy' });
    placeEquipment(state, 'extractor');
    const compressor = placeEquipment(state, 'compressor', { x: 12, y: 1 });
    const thicknesser = placeEquipment(state, 'thicknesser', { x: 14, y: 1 });
    // Two men on sheet work and two on solid wood: the compressor serves all four, which is more
    // than its capacity, so it is flat out and a day of that is eight hours and not sixteen.
    workBoth(state, MINUTES_PER_WORKING_DAY, 2, 2);
    expect(compressor.hoursUsed).toBeCloseTo(HOURS_PER_WORKING_DAY, 2);
    expect(thicknesser.hoursUsed).toBeCloseTo(HOURS_PER_WORKING_DAY, 2);
  });

  it('counts the men on both materials together, not one material at a time', () => {
    const state = newGame({ difficulty: 'veryEasy' });
    placeEquipment(state, 'extractor');
    const compressor = placeEquipment(state, 'compressor', { x: 12, y: 1 });
    // One man on each material is two men on the compressor, which serves two: all of it.
    workBoth(state, MINUTES_PER_WORKING_DAY, 1, 1);
    expect(compressor.hoursUsed).toBeCloseTo(HOURS_PER_WORKING_DAY, 2);
    // And one man on his own is half of it, whichever material he is on.
    const quiet = newGame({ difficulty: 'veryEasy' });
    placeEquipment(quiet, 'extractor');
    const alone = placeEquipment(quiet, 'compressor', { x: 12, y: 1 });
    work(quiet, MINUTES_PER_WORKING_DAY, 1);
    expect(alone.hoursUsed).toBeCloseTo(HOURS_PER_WORKING_DAY / 2, 2);
  });
});
