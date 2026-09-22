// A machine is free or it is taken by one man, and its hours are the minutes somebody stood at
// it. Nothing is a share of a capacity any more (CLAUDE.md T7 2 and 3.1).

import { describe, expect, it } from 'vitest';
import { SERVICE_INTERVAL_DAYS } from '../../src/engine/constants';
import { EQUIPMENT_SPECS } from '../../src/engine/constants';
import { OWNER, serviceIsDue } from '../../src/engine/machines';
import { waitingStation } from '../../src/engine/stations';
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
    expect(machine(state, 'tableSaw').takenBy).toBe(OWNER);
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
    expect(machine(worked, 'tableSaw').takenBy).toBeNull();
    expect(machine(worked, 'edgebander').hoursUsed).toBeCloseTo(1, 4);
  });

  it('never run on overnight: the hall starts every day with every machine free', () => {
    const state = tick(oneManAtWork(), 60);
    expect(machine(state, 'tableSaw').takenBy).toBe(OWNER);
    const tomorrow = nextDay(state);
    expect(tomorrow.clock.day).toBe(2);
    for (const item of tomorrow.equipment) expect(item.takenBy, item.specId).toBeNull();
  });

  it('brings the service on by the calendar and by nothing else: six months from the purchase, run or not (v50)', () => {
    // Until v50 the service came on by the hours the machine ran (80 of them). Piotr, 22.09:
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

describe('one person per machine', () => {
  it('gives the saw to one man an hour, and sends the other to his own next stage (v37)', () => {
    const state = tick(twoMenOnSheetWork({ saws: 1 }), 60);
    const saw = machine(state, 'tableSaw');
    expect(saw.takenBy).toBe(OWNER);
    expect(saw.hoursUsed).toBeCloseTo(1, 4);
    const joiner = state.workers[0];
    if (!joiner) throw new Error('no joiner');
    // He does not stand at the saw: the bag of work sends him to the machining of his own job,
    // which the hall's edgebander or a pair of hands can do while the saw is busy (PIOTR, 20.09).
    expect(joiner.station).not.toBe(waitingStation('tableSaw'));
    const his = state.jobs.find((job) => job.assignees[0] === joiner.id);
    expect(his?.blockedBy).toBe('');
    expect(his?.labourRemaining).toBeLessThan(his?.labourValue ?? 0);
    expect(his?.stageLabour.machining ?? 0).toBeGreaterThan(0);
  });

  it('gives each man his own saw when there are two, and each gains its own hour', () => {
    const worked = tick(twoMenOnSheetWork({ saws: 2 }), 60);
    const saws = worked.equipment.filter((item) => item.specId === 'tableSaw');
    expect(saws.map((item) => item.takenBy).filter((who) => who !== null)).toHaveLength(2);
    for (const saw of saws) expect(saw.hoursUsed).toBeCloseTo(1, 4);
    const joiner = worked.workers[0];
    const working = worked.jobs.find((job) => job.assignees[0] === joiner?.id);
    expect(working?.blockedBy).toBe('');
    expect(working?.labourRemaining).toBeLessThan(working?.labourValue ?? 0);
  });

  it('lets two men use a hand tool at once, because it is never taken off anybody', () => {
    const state = twoMenOnSheetWork();
    for (const job of state.jobs) job.labourRemaining = job.labourValue * 0.7;
    const worked = tick(state, 60);
    // Both are machining at their benches, so the hand edgebander has two men's minutes on it.
    expect(machine(worked, 'edgebander').hoursUsed).toBeCloseTo(2, 4);
    expect(machine(worked, 'edgebander').takenBy).toBeNull();
  });
});

