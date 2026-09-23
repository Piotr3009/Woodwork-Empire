// Piotr's own hall on day 128 (22.09, the save he sent when everybody stood and nobody worked):
// the owner leading a job with three joiners on it, one industrial bench with three places, which
// the joiners had between them, and the owner, last in the bench queue, with none. The whole job
// stood on the first man's place (v46 gave each man his own question, v47 asks it only at the bench
// stages), and the helper had nothing to do with the bags at 8.2 of 10 (v46: he starts at 80%).
// From v52 the four of them are at the job's current stage, the cutting, and the budget saw has one
// place: the owner, first in the day plan's order, cuts, and the three say they have no place at
// the saw, which is the hall telling Piotr to buy a saw or take a man off (CLAUDE.md T25 2.3).

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

  it('has the owner cut at the saw s one place and the three joiners say they have no place at it', () => {
    let state = day128();
    const job = state.jobs.find((entry) => entry.stage === 'inProduction');
    if (!job) throw new Error('the job is wanted');
    const before = job.labourRemaining;
    const minutesBefore = new Map(state.workers.map((worker) => [worker.id, worker.productionMinutes]));
    state = runClock(state, 30);
    const after = state.jobs.find((entry) => entry.id === job.id);
    expect(after?.labourRemaining ?? before).toBeLessThan(before);
    expect(after?.blockedBy).toBe('');
    // The cutting wants the saw and the saw is a budget one, one place: the owner, first in the
    // day plan's order, has it (CLAUDE.md T25 2.3).
    const saw = state.equipment.find((item) => item.specId === 'tableSaw');
    if (!saw) throw new Error('the saw is wanted');
    expect(hallPlaces(state, 'tableSaw')).toBe(1);
    expect(menAtMachine(state, saw)).toEqual([OWNER]);
    expect(state.owner.station).toBe('machine:tableSaw');
    for (const worker of state.workers.filter((entry) => entry.role === 'joiner')) {
      expect(worker.station, worker.name).toBe('home');
      expect(bubbleFor(state, worker.id)?.text, worker.name).toBe('no place at the saw');
      expect(worker.productionMinutes, worker.name).toBe(minutesBefore.get(worker.id));
    }
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
  it('has the owner at a saw s place within a minute, and the kitchen moves', () => {
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
    expect(state.owner.station).toBe('machine:tableSaw');
    expect(bubbleFor(state, OWNER)).toBe(null);
    // The three at the bench carry on assembling the oak table, every one of them working.
    for (const worker of state.workers) {
      if (worker.role === 'joiner') expect(worker.productionMinutes, worker.name).toBeGreaterThan(0);
    }
  });

  it('gives the owner a place at the bench first, and the last man in says he has none', () => {
    // The same hall with the kitchen's cutting and machining done: the owner's stage is the
    // assembly, which wants a place at a bench. The industrial bench has three and the oak table's
    // three joiners were at them; the owner is first in the day plan's order, so he has one and
    // the last joiner hired says he has no place at the bench (CLAUDE.md T25 2.3). Until v52 it
    // was the owner who stood, with "no bench" over him.
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
    expect(worked.owner.station).toBe('machine:workbench');
    expect(bubbleFor(worked, OWNER)).toBe(null);
    const standing = worked.workers.filter((worker) => worker.noPlaceFor !== '');
    expect(standing).toHaveLength(1);
    const last = worked.workers.filter((worker) => worker.role === 'joiner').pop();
    expect(standing[0]?.id).toBe(last?.id);
    expect(bubbleFor(worked, standing[0]?.id ?? '')?.text).toBe('no place at the bench');
    expect(worked.jobs.find((job) => job.id === kitchen.id)?.blockedBy).toBe('');
  });
});
