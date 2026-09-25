// Piotr's own hall on day 128 (22.09, the save he sent when everybody stood and nobody worked):
// the owner leading a job with three joiners on it, one industrial bench with three places, which
// the joiners had between them, and the owner, last in the bench queue, with none. The whole job
// stood on the first man's place (v46 gave each man his own question, v47 asks it only at the bench
// stages), and the helper had nothing to do with the bags at 8.2 of 10 (v46: he starts at 80%).
// From v52 the four of them were at the job's current stage, the cutting, and the budget saw has
// one place: the owner cut and the three stood with no place at the saw. From v53 nobody waits for
// the saw (PIOTR, 24.09): the owner, first in the day plan's order, cuts, and the three work the
// same job at its other machines, one at the edgebander and two at the bench, while the Output
// sheet says what the one saw costs the hall: `Too few saws: 1 place, 4 men`.

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BAGS_HELPER_EMPTY_AT } from '../../src/engine/constants';
import {
  bagStore,
  bagsWantEmptying,
  benchOf,
  hallHasABench,
  hallPlaces,
  menAtMachine,
  OWNER,
  outputBreakdown,
} from '../../src/engine/machines';
import { migrateState } from '../../src/engine/migrate';
import { bubbleFor } from '../../src/engine/bubbles';
import { stagePlanFor } from '../../src/engine/stages';
import type { GameState } from '../../src/engine/index';
import { runClock } from '../helpers';

function day128(): GameState {
  const raw = JSON.parse(readFileSync('tests/fixtures/day128-v25.woodwork.json', 'utf8')) as {
    state: Record<string, unknown> & { version: number };
  };
  const state = migrateState(raw.state, raw.state.version);
  if (state === null) throw new Error('the day 128 save did not open');
  return state;
}

describe('the day 128 save (PIOTR, 22.09; v46)', () => {
  it('has the owner leading a job of four with no place at a bench, and the three joiners with one each', () => {
    const state = day128();
    const job = state.jobs.find((entry) => entry.stage === 'inProduction');
    if (!job) throw new Error('the job is wanted');
    expect(job.assignees[0]).toBe(OWNER);
    expect(job.assignees).toHaveLength(4);
    expect(benchOf(state, OWNER)).toBe(null);
    for (const who of job.assignees.slice(1)) expect(benchOf(state, who), who).not.toBe(null);
    // The hall has a bench, which is all the job asks; the men's own places are their own question.
    expect(hallHasABench(state)).toBe(true);
  });

  it('spreads the four men over the kitchen s four machines, one each, and nobody stands', () => {
    let state = day128();
    const job = state.jobs.find((entry) => entry.stage === 'inProduction');
    if (!job) throw new Error('the job is wanted');
    const before = job.labourRemaining;
    const minutesBefore = new Map(state.workers.map((worker) => [worker.id, worker.productionMinutes]));
    state = runClock(state, 30);
    const after = state.jobs.find((entry) => entry.id === job.id);
    expect(after?.blockedBy).toBe('');
    // The four men's half hour on the job, 70.75 of labour, all of it written on the cutting
    // where the bar stands. Until v53 it was the owner's half hour alone (PIOTR, 24.09; v53);
    // 63.56 on v54, with the old shares and a saw place for one man.
    expect(before - (after?.labourRemaining ?? before)).toBeCloseTo(70.754, 3);
    // The kitchen's round is its four machines, the saw, the edgebander, the spindle moulder and
    // the bench, and the four men go round them one each, moving on every half hour: at 9:53,
    // the second half hour of the day, the owner is at the edgebander and Pete at the saw's one
    // place (v55).
    const saw = state.equipment.find((item) => item.specId === 'tableSaw');
    if (!saw) throw new Error('the saw is wanted');
    expect(hallPlaces(state, 'tableSaw')).toBe(1);
    expect(state.clock.minute).toBe(53);
    expect(state.owner.station).toBe('machine:edgebander');
    // Nobody stands and nobody has a mark over his head; each of them worked the whole half hour.
    const joiners = state.workers.filter((entry) => entry.role === 'joiner');
    expect(joiners.map((worker) => `${worker.name} ${worker.station}`)).toEqual([
      'Eddie machine:workbench',
      'Pete machine:tableSaw',
      'Callum machine:spindleMoulder',
    ]);
    expect(menAtMachine(state, saw)).toEqual([joiners[1]?.id]);
    for (const worker of joiners) {
      expect(bubbleFor(state, worker.id), worker.name).toBeNull();
      expect(worker.productionMinutes - (minutesBefore.get(worker.id) ?? 0), worker.name).toBe(30);
    }
    // Four men whose work goes through the saw and a budget saw that keeps two busy (v55).
    const hall = outputBreakdown(state).lines.filter((line) => line.hall);
    expect(hall.map((line) => `${line.label} ${line.points}`)).toContain('Too few saws: capacity 2, 4 men -0.1667');
  });

  it('has the helper start on the bags at 80%, before they are full', () => {
    let state = day128();
    const store = bagStore(state);
    expect(store.fillM3).toBeGreaterThan(store.capacityM3 * BAGS_HELPER_EMPTY_AT);
    expect(store.full).toBe(false);
    expect(bagsWantEmptying(state)).toBe(true);
    state = runClock(state, 2);
    const chore = state.tasks.find((task) => task.kind === 'emptyBags' && !task.done);
    expect(chore?.doneBy).toBe(state.workers.find((worker) => worker.role === 'helper')?.id);
    expect(bagStore(state).full).toBe(false);
  });
});

// Piotr's hall on day 149, 15:04 (22.09): two saws idle, three joiners assembling the oak table
// at the industrial bench's three places, and the owner alone on the kitchen with "waiting for
// the saw" over his head and "Cutting, no bench" on the Work Plan. He should have been cutting
// (PIOTR: "I should be cutting now, the saws are free, I can see them").
function day149(): GameState {
  const raw = JSON.parse(readFileSync('tests/fixtures/day149-v25.woodwork.json', 'utf8')) as {
    state: Record<string, unknown> & { version: number };
  };
  const state = migrateState(raw.state, raw.state.version);
  if (state === null) throw new Error('the day 149 save did not open');
  return state;
}

describe('the day 149 save (PIOTR, 22.09; v47)', () => {
  it('has the owner at one of the kitchen s machines within a minute, and the kitchen moves', () => {
    let state = day149();
    const kitchen = state.jobs.find((job) => job.name.startsWith('Small kitchen') && job.stage === 'inProduction');
    if (!kitchen) throw new Error('the kitchen is wanted');
    expect(kitchen.assignees).toEqual([OWNER]);
    expect(benchOf(state, OWNER)).toBe(null);
    // Two saws, a budget one of one place and a pro one of two: three places at the saw.
    expect(hallPlaces(state, 'tableSaw')).toBe(3);
    const before = kitchen.labourRemaining;
    state = runClock(state, 5);
    const after = state.jobs.find((job) => job.id === kitchen.id);
    expect(after?.labourRemaining ?? before).toBeLessThan(before);
    expect(after?.blockedBy).toBe('');
    // At 15:09 his turn round the kitchen's four machines is the spindle moulder (v55); until v55
    // the bar's saw put him at a saw.
    expect(state.owner.station).toBe('machine:spindleMoulder');
    expect(bubbleFor(state, OWNER)).toBe(null);
    // The three at the bench carry on assembling the oak table, every one of them working.
    for (const worker of state.workers) {
      if (worker.role === 'joiner') expect(worker.productionMinutes, worker.name).toBeGreaterThan(0);
    }
  });

  it('leaves the bench s three places to the oak table s men while the owner s turn is a machine', () => {
    // The same hall with the kitchen's cutting, edging and moulding done: its bar stands at the
    // assembly, and the owner goes round its machines all the same, the spindle moulder this half
    // hour (v55). The industrial bench has three places and the oak table's three joiners keep
    // them: nobody stands. Until v55 the bar sent the owner to the bench first, the last joiner
    // hired had every place taken and stood (v53); until v52 it was the owner who stood, with
    // "no bench" over him.
    const state = day149();
    const kitchen = state.jobs.find((job) => job.name.startsWith('Small kitchen') && job.stage === 'inProduction');
    if (!kitchen) throw new Error('the kitchen is wanted');
    const plan = stagePlanFor(state, kitchen);
    const done: Partial<Record<string, number>> = {};
    for (const stage of plan) if (stage.id !== 'assembly' && stage.id !== 'finishing') done[stage.id] = stage.to - stage.from;
    kitchen.stageLabour = done as typeof kitchen.stageLabour;
    kitchen.labourRemaining =
      kitchen.labourValue - Object.values(done).reduce<number>((sum, value) => sum + (value ?? 0), 0);
    const worked = runClock(state, 2);
    expect(worked.owner.station).toBe('machine:spindleMoulder');
    expect(bubbleFor(worked, OWNER)).toBe(null);
    expect(worked.workers.filter((worker) => worker.noPlaceFor !== '')).toHaveLength(0);
    for (const worker of worked.workers.filter((entry) => entry.role === 'joiner')) {
      expect(worker.station, worker.id).toBe('machine:workbench');
      expect(bubbleFor(worked, worker.id), worker.id).toBeNull();
    }
    expect(worked.jobs.find((job) => job.id === kitchen.id)?.blockedBy).toBe('');
  });
});
