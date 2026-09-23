// @vitest-environment jsdom
// The hall's places decide who works (PIOTR, 21.09; CLAUDE.md T25 2.3). Every man on a job wants
// one place of the family his job's current stage wants, every man on a standing contract one of
// his piece's family, and the places are given out in the order the men were hired, the owner
// first. A man with no place does not work: he stands at his home cell with the red mark, says
// `no place at the saw`, his card says the same, and his minutes are idle with `noPlace`. The
// moment a place frees, the next man in order takes it and works from that minute.

import { describe, expect, it } from 'vitest';
import { dayPlan, hands, planPlaces, workMinute } from '../../src/engine/production';
import { OWNER, hallPlaces, menAtMachine } from '../../src/engine/machines';
import { STATION_BENCH, STATION_HOME, machineStation } from '../../src/engine/stations';
import { bubbleFor } from '../../src/engine/bubbles';
import { acceptContract, assignContract, drawContract } from '../../src/engine/contracts';
import { renderPerson } from '../../src/ui/personCard';
import { tick } from '../../src/engine/index';
import type { Equipment, GameState, WorkerIdleReason } from '../../src/engine/index';
import {
  act,
  placeEquipment,
  sixJoinersOnSheetWork,
  withOnlyCuttingLeft,
} from '../helpers';

/** The six joiner hall with only the first four men on jobs, every job at its cutting, and the
 *  hall's one saw of the class named: four men who all want the saw. */
function fourAtOneSaw(sawVariant: string): GameState {
  const state = sixJoinersOnSheetWork({ saws: 1, sawVariant });
  for (const worker of state.workers.slice(4)) {
    const job = state.jobs.find((entry) => entry.id === worker.jobId);
    if (job) job.assignees = job.assignees.filter((who) => who !== worker.id);
    worker.jobId = null;
  }
  state.jobs = state.jobs.filter((job) => job.assignees.length > 0);
  // Every job back at the start of its cutting, so all four want the saw this minute.
  for (const job of state.jobs) {
    job.stageLabour = {};
    job.labourRemaining = job.labourValue;
    job.sheetsUsed = 0;
  }
  return withOnlyCuttingLeft(state);
}

function saw(state: GameState): Equipment {
  const found = state.equipment.find((item) => item.specId === 'tableSaw');
  if (!found) throw new Error('a saw is wanted');
  return found;
}

function workingMen(state: GameState): string[] {
  return state.workers.filter((worker) => worker.working).map((worker) => worker.id);
}

describe('who has a place (CLAUDE.md T25 2.3)', () => {
  it('gives the places out in the order the men were hired', () => {
    const state = fourAtOneSaw('standard');
    const plan = planPlaces(state);
    expect(plan.map((entry) => entry.who)).toEqual(['staff-1', 'staff-2', 'staff-3', 'staff-4']);
    // A standard saw has two places: the first two men hired have them.
    expect(workingMen(state)).toEqual(['staff-1', 'staff-2']);
    for (const worker of state.workers.slice(2, 4)) {
      expect(worker.noPlaceFor, worker.id).toBe('tableSaw');
      expect(worker.station, worker.id).toBe(STATION_HOME);
    }
  });

  it('puts the owner first, whoever was hired before him', () => {
    const state = fourAtOneSaw('budget');
    const first = state.jobs[0];
    if (!first) throw new Error('a job is wanted');
    first.assignees = [...first.assignees, OWNER];
    const plan = planPlaces(state);
    expect(plan[0]?.who).toBe(OWNER);
    expect(state.owner.working).toBe(true);
    expect(menAtMachine(state, saw(state))).toEqual([OWNER]);
  });

  it('gives the same answer every minute while nothing it is made of changes', () => {
    let state = fourAtOneSaw('standard');
    planPlaces(state);
    const first = workingMen(state);
    for (let minute = 0; minute < 30; minute += 1) {
      state = tick(state, 1);
      expect(workingMen(state), `minute ${minute}`).toEqual(first);
    }
  });

  it('hands the place to the next man the minute a man is taken off his job', () => {
    let state = fourAtOneSaw('budget');
    state = tick(state, 1);
    expect(workingMen(state)).toEqual(['staff-1']);
    const job = state.jobs.find((entry) => entry.assignees.includes('staff-1'));
    if (!job) throw new Error('the first man s job is wanted');
    state = act(state, { type: 'REMOVE_FROM_JOB', jobId: job.id, workerId: 'staff-1' });
    // The click re plans the hall, and the next man works from the next minute.
    expect(workingMen(state)).toEqual(['staff-2']);
    const before = state.workers.find((worker) => worker.id === 'staff-2')?.productionMinutes ?? 0;
    state = tick(state, 1);
    expect(state.workers.find((worker) => worker.id === 'staff-2')?.productionMinutes).toBe(before + 1);
  });

  it('gives a second saw s places out the minute it stands in the hall', () => {
    let state = fourAtOneSaw('budget');
    state = tick(state, 1);
    expect(workingMen(state)).toEqual(['staff-1']);
    placeEquipment(state, 'tableSaw', { variantId: 'budget', x: 14, y: 1, id: 'kit-saw-second' });
    state = tick(state, 1);
    expect(workingMen(state)).toEqual(['staff-1', 'staff-2']);
    expect(hallPlaces(state, 'tableSaw')).toBe(2);
  });

  it('takes a broken saw s places away, and gives them back when it is repaired', () => {
    let state = fourAtOneSaw('standard');
    state = tick(state, 1);
    expect(workingMen(state)).toEqual(['staff-1', 'staff-2']);
    saw(state).broken = true;
    state = tick(state, 1);
    expect(workingMen(state)).toEqual([]);
    for (const worker of state.workers.slice(0, 4)) expect(worker.noPlaceFor, worker.id).toBe('tableSaw');
    saw(state).broken = false;
    state = tick(state, 1);
    expect(workingMen(state)).toEqual(['staff-1', 'staff-2']);
  });

  it('asks again when a job s current stage moves to another family', () => {
    const state = fourAtOneSaw('budget');
    planPlaces(state);
    expect(state.workers.find((worker) => worker.id === 'staff-2')?.noPlaceFor).toBe('tableSaw');
    // The second man's job past its cutting and its machining: its stage is the assembly now,
    // which wants a bench, and he has his own.
    const job = state.jobs.find((entry) => entry.assignees.includes('staff-2'));
    if (!job) throw new Error('the second man s job is wanted');
    job.stageLabour = {};
    job.labourRemaining = job.labourValue * 0.5;
    planPlaces(state);
    const man = state.workers.find((worker) => worker.id === 'staff-2');
    expect(man?.working).toBe(true);
    expect(man?.station).toBe(machineStation('workbench'));
  });

  it('wants no place for a family the hall does not own at all: he works it by hand at his bench', () => {
    const state = fourAtOneSaw('budget');
    state.equipment = state.equipment.filter((item) => item.specId !== 'tableSaw');
    const plan = planPlaces(state);
    for (const entry of plan) {
      expect(entry.family, entry.who).toBeNull();
      expect(entry.working, entry.who).toBe(true);
    }
    expect(state.workers.slice(0, 4).map((worker) => worker.station)).toEqual([
      STATION_BENCH,
      STATION_BENCH,
      STATION_BENCH,
      STATION_BENCH,
    ]);
  });

  it('gives a man on a standing contract a place of his piece s family, in the same order', () => {
    const state = fourAtOneSaw('standard');
    const contract = drawContract(state);
    contract.pieceId = 'cutSheetPack';
    state.contracts.push(contract);
    expect(acceptContract(state, contract.id).ok).toBe(true);
    // The fifth man on the contract, behind the four on the jobs in the hiring order.
    expect(assignContract(state, contract.id, 'staff-5', true).ok).toBe(true);
    const plan = dayPlan(state);
    const him = plan.find((entry) => entry.who === 'staff-5');
    expect(him?.contract?.id).toBe(contract.id);
    expect(him?.family).toBe('tableSaw');
    expect(him?.working).toBe(false);
    // The first man off his job, and the contract man is not first in line for his place: the
    // next man hired is (CLAUDE.md T25 2.3).
    const first = state.jobs.find((entry) => entry.assignees.includes('staff-1'));
    if (!first) throw new Error('a job is wanted');
    first.assignees = [];
    const worker = state.workers.find((entry) => entry.id === 'staff-1');
    if (worker) worker.jobId = null;
    planPlaces(state);
    expect(workingMen(state)).toEqual(['staff-2', 'staff-3']);
  });
});

describe('a man with no place (CLAUDE.md T25 2.3)', () => {
  it('stands at his home cell with the mark, says why on his card, and books his minute to noPlace', () => {
    const state = fourAtOneSaw('budget');
    const report = workMinute(state, hands(state));
    expect(report.lost.noPlace).toBe(3);
    const man = state.workers.find((worker) => worker.id === 'staff-2');
    expect(man?.station).toBe(STATION_HOME);
    expect(bubbleFor(state, 'staff-2')?.text).toBe('no place at the saw');
    const holder = document.createElement('div');
    holder.innerHTML = renderPerson(state, 'staff-2', 'card');
    const now = holder.querySelector('[data-now]');
    expect(now?.classList.contains('warn')).toBe(true);
    expect(now?.textContent).toContain('no place at the saw');
  });

  it('works one man s day at a used saw with four men on it, and three men s days of noPlace', () => {
    // The fixture's first minute is sampled before its men were put on their jobs, so the day is
    // counted from the second minute on.
    let state = tick(fourAtOneSaw('used'), 1);
    const before = state.workers.slice(0, 4).map((worker) => worker.productionMinutes);
    const idle: Record<string, number>[] = state.workers.slice(0, 4).map((worker) => ({ ...worker.idleByReason }));
    state = tick(state, 60 * 8);
    const worked = state.workers.slice(0, 4).map((worker, index) => worker.productionMinutes - (before[index] ?? 0));
    expect(worked[0]).toBeGreaterThan(0);
    expect(worked.slice(1)).toEqual([0, 0, 0]);
    state.workers.slice(1, 4).forEach((worker, index) => {
      const was = idle[index + 1] ?? {};
      const stood = (reason: WorkerIdleReason): number => (worker.idleByReason[reason] ?? 0) - (was[reason] ?? 0);
      expect(stood('noPlace'), worker.id).toBeGreaterThan(200);
      for (const reason of ['waitingForBoss', 'noMaterial', 'noCompressor', 'hallStopped'] as const) {
        expect(stood(reason), `${worker.id} ${reason}`).toBe(0);
      }
    });
  });

  it('works two of the same four at a standard saw', () => {
    let state = fourAtOneSaw('standard');
    const before = state.workers.slice(0, 4).map((worker) => worker.productionMinutes);
    state = tick(state, 60);
    const worked = state.workers.slice(0, 4).map((worker, index) => worker.productionMinutes - (before[index] ?? 0));
    expect(worked.filter((minutes) => minutes > 0)).toHaveLength(2);
  });
});
