// @vitest-environment jsdom
// v38 (PIOTR, 20 and 21.09): a joiner's home is the bench he has now, a man on a standing contract
// is not offered for a job, and the wage ladder makes the better man the cheaper unit of work.

import { describe, expect, it } from 'vitest';
import { JOINER_MONTHLY_WAGE, WORKER_RATES } from '../../src/engine/constants';
import { homeCellOf } from '../../src/engine/staff';
import { jobAssignControls } from '../../src/ui/jobCard';
import { contractMen } from '../../src/engine/contracts';
import { placeEquipment, sixJoinersOnSheetWork } from '../helpers';

describe('a joiner stands at the bench he has now', () => {
  it('is drawn at a bench bought after he was hired, and not where his hiring day put him', () => {
    const state = sixJoinersOnSheetWork({ saws: 1 });
    const man = state.workers[0];
    if (!man) throw new Error('a joiner is wanted');
    // Every bench of the kit goes and an industrial one stands on the far side of the hall.
    state.equipment = state.equipment.filter((item) => item.specId !== 'workbench');
    const bench = placeEquipment(state, 'workbench', { variantId: 'industrial', x: 16, y: 7 });
    expect(homeCellOf(state, man)).toEqual({ x: bench.anchorX, y: bench.anchorY });
    // With no bench at all the hiring day's anchor is still his place.
    state.equipment = state.equipment.filter((item) => item.specId !== 'workbench');
    expect(homeCellOf(state, man)).toEqual({ x: man.anchorX, y: man.anchorY });
  });
});

describe('the wage ladder', () => {
  it('costs less a unit of work a grade up', () => {
    const unit = (['novice', 'experienced', 'senior', 'master'] as const).map(
      (tier) => JOINER_MONTHLY_WAGE[tier] / WORKER_RATES[tier],
    );
    for (let at = 1; at < unit.length; at += 1) {
      expect(unit[at] ?? 0).toBeLessThan(unit[at - 1] ?? 0);
    }
  });
});

describe('a man on a contract is not offered for a job', () => {
  it('leaves him off the Assign list', () => {
    const state = sixJoinersOnSheetWork({ saws: 1 });
    const [onContract, free] = state.workers;
    if (!onContract || !free) throw new Error('two joiners are wanted');
    state.contracts.push({ status: 'active', assigned: [onContract.id] } as never);
    expect(contractMen(state)).toContain(onContract.id);
    const job = state.jobs[state.jobs.length - 1];
    if (!job) throw new Error('a job is wanted');
    const html = jobAssignControls(state, job, true);
    expect(html).toContain(`data-worker="${free.id}"`);
    expect(html).not.toContain(`data-worker="${onContract.id}"`);
  });
});
