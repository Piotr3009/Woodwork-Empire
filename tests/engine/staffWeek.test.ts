// The week, man by man (PIOTR; CLAUDE.md T20 2.7). A sample a minute of what everybody was at,
// into the six bands Our team prints: jobs, contracts, unloading, cleaning, desk and site. The
// bands add up to the hours he worked, because they are the same minutes, and the efficiency
// figure is his rate times the minutes he spent making something over the minutes he was paid for.

import { describe, expect, it } from 'vitest';
import { weekOfDay } from '../../src/engine/clock';
import {
  WEEK_CATEGORIES,
  weekEfficiency,
  weekMetersOf,
  weekNowOf,
  weekWorkedMinutes,
} from '../../src/engine/staff';
import { acceptContract, assignContract, drawContract } from '../../src/engine/contracts';
import { assignJob } from '../../src/engine/jobs';
import type { GameState, Worker } from '../../src/engine/index';
import {
  acceptNow,
  buyStartingKit,
  clearEvents,
  fillRack,
  firstJob,
  hireNow,
  newGame,
  placeEnquiry,
  placeEquipment,
  runClock,
} from '../helpers';

/** A hall with a full rack, one experienced joiner on the books and a job ready for the bench. */
function readyHall(): GameState {
  let state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })), 60);
  state.enquiries = [];
  placeEquipment(state, 'locker', { x: 6, y: 9 });
  placeEquipment(state, 'canteenSeat', { x: 8, y: 9 });
  placeEquipment(state, 'handToolSet', { x: 12, y: 9 });
  placeEquipment(state, 'toolCabinet', { x: 10, y: 9 });
  state.reputation = 20;
  state = hireNow(state, 'joiner', 'experienced');
  const enquiry = placeEnquiry(state, { price: 6000, deadlineDays: 60 });
  state = acceptNow(state, enquiry.id);
  const man = state.workers[0];
  if (!man) throw new Error('nobody on the books');
  man.startDay = state.clock.day;
  const job = firstJob(state);
  job.stage = 'ready';
  return state;
}

function metersOf(state: GameState, worker: Worker) {
  return weekNowOf(worker, weekOfDay(state.clock.day));
}

describe('a man s week', () => {
  it('counts his minutes at the bench into the jobs band, and names the job', () => {
    const start = readyHall();
    const man = start.workers[0];
    if (!man) throw new Error('nobody on the books');
    assignJob(start, firstJob(start).id, man.id);
    const state = clearEvents(runClock(start, 60));
    const after = state.workers[0];
    if (!after) throw new Error('nobody on the books');
    const meters = metersOf(state, after);
    if (!meters) throw new Error('no week on him');
    expect(meters.minutes.jobs).toBeGreaterThan(0);
    expect(meters.jobs).toContain(firstJob(state).name);
    // The split is the hours: every band of it and nothing else.
    const summed = WEEK_CATEGORIES.reduce((total, band) => total + meters.minutes[band], 0);
    expect(summed).toBe(weekWorkedMinutes(meters));
    expect(weekWorkedMinutes(meters)).toBeLessThanOrEqual(meters.paidMinutes);
    // And the figure follows the minutes: his rate times what he made over what he was paid for.
    expect(weekEfficiency(after.rate, meters)).toBeCloseTo(
      (after.rate * (meters.minutes.jobs + meters.minutes.contracts)) / meters.paidMinutes,
      6,
    );
  });

  it('counts a man on a standing contract into the contracts band', () => {
    const start = readyHall();
    const man = start.workers[0];
    if (!man) throw new Error('nobody on the books');
    const contract = drawContract(start);
    start.contracts.push(contract);
    expect(acceptContract(start, contract.id).ok).toBe(true);
    expect(assignContract(start, contract.id, man.id, true).ok).toBe(true);
    const state = clearEvents(runClock(start, 60));
    const meters = metersOf(state, state.workers[0] as Worker);
    if (!meters) throw new Error('no week on him');
    expect(meters.minutes.contracts).toBeGreaterThan(0);
    expect(meters.minutes.jobs).toBe(0);
  });

  it('rolls the week over instead of adding this week to last', () => {
    const state = readyHall();
    const man = state.workers[0];
    if (!man) throw new Error('nobody on the books');
    const first = weekMetersOf(man, 1);
    first.minutes.jobs = 120;
    const second = weekMetersOf(man, 2);
    expect(second.minutes.jobs).toBe(0);
    expect(weekNowOf(man, 2)).toBe(second);
    expect(weekNowOf(man, 1)).toBeNull();
  });
});
