// A machine is free or it is taken by one man, and its hours are the minutes somebody stood at
// it. Nothing is a share of a capacity any more (CLAUDE.md T7 2 and 3.1).

import { describe, expect, it } from 'vitest';
import {
  HOURS_PER_WORKING_DAY,
  MINUTES_PER_WORKING_DAY,
  SERVICE_INTERVAL_HOURS,
} from '../../src/engine/constants';
import { EQUIPMENT_SPECS } from '../../src/engine/constants';
import { OWNER, serviceIsDue } from '../../src/engine/machines';
import { familyShareOfJob, machineHoursPerDay } from '../../src/engine/production';
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
  placeEquipment,
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

  it('brings the service on by hours and by nothing else', () => {
    let state = oneManAtWork();
    const saw = machine(state, 'tableSaw');
    saw.hoursUsed = SERVICE_INTERVAL_HOURS - 0.5;
    expect(serviceIsDue(machine(state, 'tableSaw'))).toBe(false);
    state = tick(state, 31);
    expect(serviceIsDue(machine(state, 'tableSaw'))).toBe(true);
  });
});

describe('one person per machine', () => {
  it('makes the second man wait at the saw, and the saw gains one hour an hour', () => {
    const state = tick(twoMenOnSheetWork({ saws: 1 }), 60);
    const saw = machine(state, 'tableSaw');
    expect(saw.takenBy).toBe(OWNER);
    expect(saw.hoursUsed).toBeCloseTo(1, 4);
    const joiner = state.workers[0];
    if (!joiner) throw new Error('no joiner');
    expect(joiner.station).toBe(waitingStation('tableSaw'));
    const waiting = state.jobs.find((job) => job.assignedTo === joiner.id);
    expect(waiting?.blockedBy).toBe('waiting for table saw');
    // He stood there for the hour and put nothing into his job.
    expect(waiting?.labourRemaining).toBe(waiting?.labourValue);
  });

  it('gives each man his own saw when there are two, and each gains its own hour', () => {
    const worked = tick(twoMenOnSheetWork({ saws: 2 }), 60);
    const saws = worked.equipment.filter((item) => item.specId === 'tableSaw');
    expect(saws.map((item) => item.takenBy).filter((who) => who !== null)).toHaveLength(2);
    for (const saw of saws) expect(saw.hoursUsed).toBeCloseTo(1, 4);
    const joiner = worked.workers[0];
    const working = worked.jobs.find((job) => job.assignedTo === joiner?.id);
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

describe('what the Owned tab projects', () => {
  it('counts only the share of the day the work at it takes, over the saws there are', () => {
    const state = tick(twoMenOnSheetWork({ saws: 1 }), 60);
    const saw = machine(state, 'tableSaw');
    const job = state.jobs.find((entry) => entry.assignedTo === OWNER);
    if (!job) throw new Error('no job under the owner');
    const share = familyShareOfJob(state, job, 'tableSaw');
    // A saw has a man for the cutting quarter and no longer, which is why two of them serve six
    // joiners (CLAUDE.md T7 3.1).
    expect(share).toBeGreaterThan(0.2);
    expect(share).toBeLessThan(0.3);
    // Two men want it, and there is one of it.
    expect(machineHoursPerDay(state, saw)).toBeCloseTo(2 * share * HOURS_PER_WORKING_DAY, 6);
    // A second saw halves what each of them gains.
    const two = { ...state, equipment: [...state.equipment] };
    placeEquipment(two, 'tableSaw', { variantId: 'standard', x: 10, y: 1, id: 'saw-2' });
    expect(machineHoursPerDay(two, saw)).toBeCloseTo(share * HOURS_PER_WORKING_DAY, 6);
    // Nothing in the hall has a stage on the compressor, so it never comes due.
    expect(machineHoursPerDay(state, machine(state, 'compressor'))).toBe(0);
  });

  it('gives a machine nobody stands at no hours at all', () => {
    const state = newGame({ difficulty: 'veryEasy' });
    placeEquipment(state, 'extractor');
    const thicknesser = placeEquipment(state, 'thicknesser', { x: 12, y: 1 });
    const worked = tick(state, MINUTES_PER_WORKING_DAY);
    void worked;
    expect(thicknesser.hoursUsed).toBe(0);
    expect(machineHoursPerDay(state, thicknesser)).toBe(0);
  });
});
