// Piotr's own hall on day 128 (22.09, the save he sent when everybody stood and nobody worked):
// the owner leading a job with three joiners on it, one industrial bench with three places, which
// the joiners had between them, and the owner, last in the bench queue, with none. The whole job
// stood on the first man's place (v46 fixed it), and the helper had nothing to do with the bags at
// 8.2 of 10 (v46: he starts at 80%).

import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { BAGS_HELPER_EMPTY_AT } from '../../src/engine/constants';
import { bagStore, bagsWantEmptying, benchOf, hasBenchFor, OWNER } from '../../src/engine/machines';
import { migrateState } from '../../src/engine/migrate';
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
    // The job has a bench, because three of its men have: until v46 it read the first man's alone.
    expect(hasBenchFor(state, job.id)).toBe(true);
  });

  it('works the three joiners and stands the owner alone with no bench, the saw taken', () => {
    let state = day128();
    const job = state.jobs.find((entry) => entry.stage === 'inProduction');
    if (!job) throw new Error('the job is wanted');
    const before = job.labourRemaining;
    state = runClock(state, 30);
    const after = state.jobs.find((entry) => entry.id === job.id);
    expect(after?.labourRemaining ?? before).toBeLessThan(before);
    expect(after?.blockedBy).toBe('');
    expect(state.equipment.find((item) => item.specId === 'tableSaw')?.takenBy).not.toBe(null);
    expect(state.owner.station).toBe('noBench');
    for (const worker of state.workers) {
      if (worker.role === 'joiner') expect(worker.station, worker.name).not.toBe('noBench');
    }
    expect(state.workers.filter((worker) => worker.role === 'joiner').every((worker) => worker.productionMinutes > 0)).toBe(true);
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
