// A machine is a number of places, and its hours are the minutes men worked at them: an hour for
// every hour a man works at one of its places (PIOTR, 21.09: "keep the hours"; CLAUDE.md T7 2,
// T25 2.1 and section 6). Nothing is a share of a capacity.

import { describe, expect, it } from 'vitest';
import { MINUTES_PER_WORKING_DAY, SERVICE_INTERVAL_DAYS } from '../../src/engine/constants';
import { EQUIPMENT_SPECS } from '../../src/engine/constants';
import { OWNER, menAtMachine, serviceIsDue } from '../../src/engine/machines';
import { machineStation } from '../../src/engine/stations';
import type { Equipment, GameState } from '../../src/engine/index';
import { tick } from '../../src/engine/index';
import {
  acceptNow,
  act,
  buyStartingKit,
  fillRack,
  firstJob,
  newGame,
  nextDay,
  placeEnquiry,
  twoMenOnSheetWork,
} from '../helpers';

function machine(state: GameState, specId: string): Equipment {
  const item = state.equipment.find((entry) => entry.specId === specId);
  if (!item) throw new Error(`no ${specId} in the hall`);
  return item;
}

/** The day 1 kit, one big job, and the owner standing at it from the first minute. */
function oneManAtWork(sawVariant = 'budget'): GameState {
  let state = buyStartingKit(newGame({ difficulty: 'veryEasy' }), { sawVariant });
  state.enquiries = [];
  const enquiry = placeEnquiry(state, { price: 40000, deadlineDays: 90 });
  state = fillRack(acceptNow(state, enquiry.id, false), 80);
  firstJob(state).stage = 'ready';
  return act(state, { type: 'WORK_HERE', jobId: null });
}

describe('capacity is gone', () => {
  it('leaves no family saying how many men it serves', () => {
    for (const spec of EQUIPMENT_SPECS) {
      expect(Object.keys(spec), spec.id).not.toContain('capacity');
    }
  });
});

describe('the hours a machine gains', () => {
  it('are the minutes one man stood at it, and no other machine gains a thing', () => {
    const state = tick(oneManAtWork(), 60);
    // An hour of cutting is an hour on the saw, whole minutes, because he had it to himself.
    expect(machine(state, 'tableSaw').hoursUsed).toBeCloseTo(1, 4);
    expect(menAtMachine(state, machine(state, 'tableSaw'))).toEqual([OWNER]);
    // He is at the saw, so the edgebander in his cabinet and the compressor gained nothing.
    expect(machine(state, 'edgebander').hoursUsed).toBe(0);
    expect(machine(state, 'compressor').hoursUsed).toBe(0);
    // The fan is the one thing that does not wait to be stood at: it pulls the whole hour he is
    // at the saw, and from Turn 23 it books those hours and is serviced on them
    // (PIOTR, 20.09; CLAUDE.md T23 2.8).
    expect(machine(state, 'extractor').hoursUsed).toBeCloseTo(1, 4);
  });

  it('are the minutes the extraction ran, and nought on a fan in a hall standing still', () => {
    // Nobody at a machine with a demand is nothing in the duct: the fan is off and gains no hours
    // (CLAUDE.md T10 3.1, T23 2.8).
    const state = tick(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 60);
    expect(machine(state, 'extractor').hoursUsed).toBe(0);
  });

  it('stop the moment he moves on to the next stage', () => {
    const state = oneManAtWork();
    const job = firstJob(state);
    // Push him into the machining, which is done with the hand edgebander at his bench.
    job.labourRemaining = job.labourValue * 0.7;
    const worked = tick(state, 60);
    expect(machine(worked, 'tableSaw').hoursUsed).toBe(0);
    expect(menAtMachine(worked, machine(worked, 'tableSaw'))).toEqual([]);
    expect(machine(worked, 'edgebander').hoursUsed).toBeCloseTo(1, 4);
  });

  it('never run on overnight: nobody is at a place before the day starts', () => {
    const state = tick(oneManAtWork(), 60);
    expect(menAtMachine(state, machine(state, 'tableSaw'))).toEqual([OWNER]);
    const tomorrow = nextDay(state);
    expect(tomorrow.clock.day).toBe(2);
    // What it booked is the rest of his day at it and not a minute of the night.
    expect(machine(tomorrow, 'tableSaw').hoursUsed).toBeLessThanOrEqual((MINUTES_PER_WORKING_DAY + 60) / 60);
  });

  it('brings the service on by the calendar and by nothing else: six months from the purchase, run or not (v51)', () => {
    // Until v51 the service came on by the hours the machine ran (80 of them). Piotr, 22.09:
    // "every six months, for every machine, and that is all".
    const state = oneManAtWork();
    const saw = machine(state, 'tableSaw');
    expect(saw.servicedDay).toBe(state.clock.day);
    expect(serviceIsDue(saw, state.clock.day)).toBe(false);
    expect(serviceIsDue(saw, state.clock.day + SERVICE_INTERVAL_DAYS - 1)).toBe(false);
    expect(serviceIsDue(saw, state.clock.day + SERVICE_INTERVAL_DAYS)).toBe(true);
    // Hours on it move nothing.
    saw.hoursUsed = 10000;
    expect(serviceIsDue(saw, state.clock.day)).toBe(false);
  });
});

describe('the places at a machine', () => {
  it('has one place at a budget saw: the owner cuts, and the joiner works his job at a bench', () => {
    const state = tick(twoMenOnSheetWork({ saws: 1, sawVariant: 'budget' }), 60);
    const saw = machine(state, 'tableSaw');
    expect(menAtMachine(state, saw)).toEqual([OWNER]);
    expect(saw.hoursUsed).toBeCloseTo(1, 4);
    const joiner = state.workers[0];
    if (!joiner) throw new Error('no joiner');
    // Until v53 he stood at his home cell and said he had no place at the saw. Nobody waits for
    // the saw now: he takes a free place at a bench and works his job the whole hour, and the saw
    // books no hour of his (PIOTR, 24.09; v53).
    expect(joiner.station).toBe(machineStation('workbench'));
    expect(joiner.working).toBe(true);
    expect(joiner.noPlaceFor).toBe('');
    expect(joiner.productionMinutes).toBe(60);
    expect(joiner.idleByReason.noPlace).toBe(0);
    const his = state.jobs.find((job) => job.assignees[0] === joiner.id);
    // Nothing went into his job until v53; now his hour: a novice's 24.00 of labour an hour at the
    // job's pace of 1.00, times the hall's line for two men and one saw place, (1 + 1 / 1.5) / 2.
    expect((his?.labourValue ?? 0) - (his?.labourRemaining ?? 0)).toBeCloseTo(20, 6);
  });

  it('has two places at a standard saw, and books an hour for each man at them', () => {
    const state = tick(twoMenOnSheetWork({ saws: 1, sawVariant: 'standard' }), 60);
    const saw = machine(state, 'tableSaw');
    expect(menAtMachine(state, saw)).toEqual([OWNER, state.workers[0]?.id]);
    expect(saw.hoursUsed).toBeCloseTo(2, 4);
  });

  it('puts the second man at the second saw when the first has one place, each saw its own hour', () => {
    const worked = tick(twoMenOnSheetWork({ saws: 2, sawVariant: 'budget' }), 60);
    const saws = worked.equipment.filter((item) => item.specId === 'tableSaw');
    expect(saws.map((item) => menAtMachine(worked, item).length)).toEqual([1, 1]);
    for (const saw of saws) expect(saw.hoursUsed).toBeCloseTo(1, 4);
    const joiner = worked.workers[0];
    const working = worked.jobs.find((job) => job.assignees[0] === joiner?.id);
    expect(working?.blockedBy).toBe('');
    expect(working?.labourRemaining).toBeLessThan(working?.labourValue ?? 0);
  });

  it('lets two men use a hand tool at once, because a tool out of the cabinet needs no place', () => {
    const state = twoMenOnSheetWork();
    for (const job of state.jobs) job.labourRemaining = job.labourValue * 0.7;
    const worked = tick(state, 60);
    // Both are machining at their benches, so the hand edgebander has two men's minutes on it.
    expect(machine(worked, 'edgebander').hoursUsed).toBeCloseTo(2, 4);
    expect(menAtMachine(worked, machine(worked, 'edgebander'))).toEqual([]);
  });
});
