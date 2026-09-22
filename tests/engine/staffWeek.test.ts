// The week, man by man (PIOTR; CLAUDE.md T20 2.7). A sample a minute of what everybody was at,
// into the six bands Our team prints: jobs, contracts, unloading, cleaning, desk and site. The
// bands are the minutes he actually put in, which is why they are pinned here to the engine's own
// count of them and never to the formula that reads them: a man standing at an empty rack is paid
// for the hour and works none of it, and the evening after five belongs to the owner alone.

import { describe, expect, it } from 'vitest';
import { weekOfDay } from '../../src/engine/clock';
import {
  WEEK_CATEGORIES,
  weekEfficiency,
  weekMetersOf,
  weekNowOf,
  weekWorkedMinutes,
} from '../../src/engine/staff';
import {
  BREAK_MINUTES,
  BREAK_START_MINUTE,
  DAY_END_MINUTE,
} from '../../src/engine/constants';
import { acceptContract, assignContract, drawContract } from '../../src/engine/contracts';
import { assignJob } from '../../src/engine/jobs';
import type { GameState, Worker } from '../../src/engine/index';
import {
  acceptNow,
  benchPlacesFor,
  buyStartingKit,
  choose,
  clearEvents,
  fillRack,
  firstJob,
  hireNow,
  newGame,
  placeEnquiry,
  placeEquipment,
  runClock,
} from '../helpers';

/** A hall with a rack, one experienced joiner on the books and a job ready for the bench. An
 *  empty rack is the same hall with nothing on it: the man is there and there is nothing to make.
 */
function readyHall(sheets = 60): GameState {
  let state = fillRack(buyStartingKit(newGame({ difficulty: 'veryEasy' })), sheets);
  state.enquiries = [];
  placeEquipment(state, 'locker', { x: 6, y: 9 });
  placeEquipment(state, 'handToolSet', { x: 12, y: 9 });
  placeEquipment(state, 'toolCabinet', { x: 10, y: 9 });
  // The gate counts the owner's own place at a bench beside the crew's from Turn 24, so the day
  // one hall needs a second place before it takes anybody on (CLAUDE.md T24 2.2).
  benchPlacesFor(state);
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

/** Runs the clock and answers whatever the hall asks on the way, a minute at a time, because a
 *  hall with nothing on the rack stops the run to say so. */
function runOn(state: GameState, minutes: number): GameState {
  let next = state;
  for (let i = 0; i < minutes; i += 1) next = clearEvents(runClock(next, 1));
  return next;
}

describe('a man s week', () => {
  it('counts the minutes he stood at the bench and not one more, and names the job', () => {
    const start = readyHall();
    const man = start.workers[0];
    if (!man) throw new Error('nobody on the books');
    assignJob(start, firstJob(start).id, man.id);
    // A minute to open his week, and then the hour this is about.
    const opened = clearEvents(runClock(start, 1));
    const first = opened.workers[0];
    const opening = metersOf(opened, first as Worker);
    if (!first || !opening) throw new Error('no week on him');
    const state = clearEvents(runClock(opened, 60));
    const after = state.workers[0];
    if (!after) throw new Error('nobody on the books');
    const meters = metersOf(state, after);
    if (!meters) throw new Error('no week on him');
    // The engine's own count of what he made in the hour, and nothing else, is what the jobs
    // band took: sixty minutes at the bench, sixty minutes in the band.
    expect(after.productionMinutes - first.productionMinutes).toBe(60);
    expect(meters.minutes.jobs - opening.minutes.jobs).toBe(60);
    // He was at a bench and nowhere else: the other five bands never opened.
    for (const band of WEEK_CATEGORIES) {
      if (band !== 'jobs') expect(meters.minutes[band]).toBe(0);
    }
    expect(meters.jobs).toEqual([firstJob(state).name]);
    // The hours are the bands, and the company paid for at least them.
    expect(weekWorkedMinutes(meters)).toBe(meters.minutes.jobs);
    expect(meters.paidMinutes).toBeGreaterThanOrEqual(weekWorkedMinutes(meters));
    // The figure is the minutes he made something in against the minutes he was paid for.
    expect(weekEfficiency(after.rate, meters)).toBeCloseTo(
      (after.rate * meters.minutes.jobs) / meters.paidMinutes,
      6,
    );
  });

  it('pays him for the hour he spends at an empty rack and counts none of it as worked', () => {
    const start = readyHall(0);
    const man = start.workers[0];
    if (!man) throw new Error('nobody on the books');
    assignJob(start, firstJob(start).id, man.id);
    const state = runOn(start, 60);
    const after = state.workers[0];
    if (!after) throw new Error('nobody on the books');
    const meters = metersOf(state, after);
    if (!meters) throw new Error('no week on him');
    // Nothing was made, so nothing is in the bands, and the wages ran all the same.
    expect(after.productionMinutes).toBe(0);
    expect(weekWorkedMinutes(meters)).toBe(0);
    expect(meters.paidMinutes).toBeGreaterThan(0);
    expect(weekEfficiency(after.rate, meters)).toBe(0);
  });

  it('leaves the dinner hour out of his week: the canteen is neither worked nor paid for', () => {
    // The sampler rode in on the top of `assignStaffTasks` while `game.ts` was frozen, which is
    // inside the guard that keeps the dinner hour off the delegation. It has a line of its own in
    // `settle` now and it kept the guard, so the hour in the canteen is still nobody's minute
    // (CLAUDE.md T6 3.4, T20 2.7).
    const start = readyHall();
    const man = start.workers[0];
    if (!man) throw new Error('nobody on the books');
    assignJob(start, firstJob(start).id, man.id);
    // Up to noon, then the hour of the break itself.
    const noon = clearEvents(runClock(start, BREAK_START_MINUTE + 1));
    const before = metersOf(noon, noon.workers[0] as Worker);
    if (!before) throw new Error('no week on him');
    const paid = before.paidMinutes;
    const worked = weekWorkedMinutes(before);
    const after = clearEvents(runClock(noon, BREAK_MINUTES - 2));
    expect(after.clock.minute).toBeLessThan(BREAK_START_MINUTE + BREAK_MINUTES);
    const meters = metersOf(after, after.workers[0] as Worker);
    if (!meters) throw new Error('no week on him');
    expect(meters.paidMinutes).toBe(paid);
    expect(weekWorkedMinutes(meters)).toBe(worked);
  });

  it('leaves the evening to the owner: nobody else is paid for it or counted through it', () => {
    const start = readyHall();
    const man = start.workers[0];
    if (!man) throw new Error('nobody on the books');
    assignJob(start, firstJob(start).id, man.id);
    // Five o'clock, and the owner stays on while the men go home (CLAUDE.md T17 2.12).
    const evening = runClock(start, DAY_END_MINUTE + 1);
    expect(evening.activeEvent?.kind).toBe('goingHome');
    const before = metersOf(evening, evening.workers[0] as Worker);
    if (!before) throw new Error('no week on him');
    const paid = before.paidMinutes;
    const worked = weekWorkedMinutes(before);
    const later = runOn(choose(evening, 'overtime'), 60);
    expect(later.clock.minute).toBeGreaterThan(DAY_END_MINUTE);
    const meters = metersOf(later, later.workers[0] as Worker);
    if (!meters) throw new Error('no week on him');
    expect(meters.paidMinutes).toBe(paid);
    expect(weekWorkedMinutes(meters)).toBe(worked);
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
