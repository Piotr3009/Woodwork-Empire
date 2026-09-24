// The CNC does the cutting and the machining of a sheet job as one stage, and halves the assembly
// after it. Timber still goes on the saw, and from v53 on the thicknesser, the timber tool set
// being gone from the game (CLAUDE.md T7 3.4; PIOTR, 24.09). A job on the CNC waits for nothing:
// the men its one place cannot take work the job at a bench, and a broken machine stops no job,
// its share going at the by hand pace (v53).

import { describe, expect, it } from 'vitest';
import {
  CNC_ASSEMBLY_FACTOR,
  CNC_STAGE_FACTOR,
  CNC_STAGE_FACTOR_WITH_HEAD,
  OWNER_LABOUR_PER_MINUTE,
  WORKER_RATES,
} from '../../src/engine/constants';
import { OWNER } from '../../src/engine/machines';
import {
  cncFactor,
  currentStage,
  jobMinutesFor,
  jobOnCnc,
  jobPace,
  stagePlanFor,
  stageSpeed,
} from '../../src/engine/stages';
import { stagedJob } from '../../src/engine/jobs';
import { machineStation } from '../../src/engine/stations';
import { menAtMachine } from '../../src/engine/machines';
import { bubbleFor } from '../../src/engine/bubbles';
import { tick } from '../../src/engine/index';
import type { GameState, Job } from '../../src/engine/index';
import {
  acceptNow,
  act,
  buyStartingKit,
  fillRack,
  firstJob,
  newGame,
  placeEnquiry,
  placeEquipment,
  twoMenOnSheetWork,
  withDryAir,
  withExtraction,
  withOnlyCuttingLeft,
} from '../helpers';

/** A job whose whole labour is this many minutes of the owner's own time. */
function jobOfMinutes(minutes: number, material: 'sheet' | 'solidWood' = 'sheet') {
  return stagedJob(minutes * OWNER_LABOUR_PER_MINUTE, material, false);
}

/** The day 1 kit with a budget CNC standing in the hall beside it: the class whose pace is 1.00, so
 *  what is asserted here is the CNC's own head and nothing of its class (CLAUDE.md T25 2.4). */
function withCnc(): GameState {
  const state = withDryAir(
    withExtraction(buyStartingKit(newGame({ difficulty: 'veryEasy' }), { sawVariant: 'budget' })),
  );
  placeEquipment(state, 'cnc', { variantId: 'budget', x: 2, y: 6 });
  state.enquiries = [];
  return fillRack(state, 80);
}

describe('what a CNC does to a sheet job', () => {
  it('makes the cutting and the machining one stage, and halves the assembly', () => {
    const state = withCnc();
    const job = jobOfMinutes(1000);
    const plan = stagePlanFor(state, job);
    expect(plan.map((stage) => stage.id)).toEqual(['cnc', 'assembly', 'finishing']);
    // The two shares together, at the CNC's own factor: a fifth off the whole job (PIOTR).
    const cnc = plan[0];
    expect(cnc?.share).toBeCloseTo(0.4, 10);
    expect(cnc?.speed).toBe(CNC_STAGE_FACTOR);
    expect((cnc?.to ?? 0) / OWNER_LABOUR_PER_MINUTE / CNC_STAGE_FACTOR).toBeCloseTo(200, 6);
    // Parts come off it cut and drilled, so the bench takes half the minutes.
    expect(plan[1]?.speed).toBe(CNC_ASSEMBLY_FACTOR);
    expect(jobMinutesFor(state, job, 1)).toBeCloseTo(200 + 450 / 2 + 150, 6);
  });

  it('is the twenty per cent of Turn 3 on the stage it replaces, and no flat cut anywhere', () => {
    const state = withCnc();
    const job = jobOfMinutes(1000);
    const without = { ...state, equipment: state.equipment.filter((i) => i.specId !== 'cnc') };
    // Without it: 400 minutes of cutting and machining. With it: 200.
    expect(jobMinutesFor(without, job, 1)).toBeCloseTo(1000, 6);
    expect(jobMinutesFor(state, job, 1)).toBeCloseTo(575, 6);
  });

  it('goes a little faster again with the tool changer head', () => {
    const state = withCnc();
    expect(cncFactor(state)).toBe(CNC_STAGE_FACTOR);
    placeEquipment(state, 'cncHead', { x: 18, y: 8 });
    expect(cncFactor(state)).toBe(CNC_STAGE_FACTOR_WITH_HEAD);
    expect(stageSpeed(state, jobOfMinutes(1000), 'cnc').speed).toBe(2.1);
  });

  it('leaves a timber job on the saw and the thicknesser', () => {
    const state = withCnc();
    const timber = jobOfMinutes(1000, 'solidWood');
    expect(jobOnCnc(state, timber)).toBe(false);
    const plan = stagePlanFor(state, timber);
    expect(plan.map((stage) => stage.id)).toEqual([
      'cutting',
      'machining',
      'assembly',
      'finishing',
    ]);
    expect(plan[0]?.family).toBe('tableSaw');
    // The timber tool set until v53; timber is machined on the thicknesser now (v53).
    expect(plan[1]?.family).toBe('thicknesser');
    // And its assembly is not halved: nothing came off a CNC.
    expect(plan[2]?.speed).toBe(1);
  });
});

describe('the CNC s places', () => {
  /** Two men, each on a sheet job, in a hall with one CNC. */
  function twoOnOneCnc(): GameState {
    // A CNC will not run on wet air at all, and this is about its one place (T10 3.3, T25 2.1).
    const state = withDryAir(twoMenOnSheetWork({ saws: 1 }));
    placeEquipment(state, 'cnc', { x: 2, y: 6, id: 'kit-cnc' });
    return state;
  }

  it('puts one man at its one place and the other at a bench, and both jobs move', () => {
    const start = twoOnOneCnc();
    const before = start.jobs.map((job) => job.labourRemaining);
    const state = tick(start, 60);
    const cnc = state.equipment.find((item) => item.specId === 'cnc');
    if (!cnc) throw new Error('a CNC is wanted');
    // The owner is first in the day plan's order and has the CNC's one place (CLAUDE.md T25 2.3).
    // Until v53 the joiner's job card let it go on the saw, and he had a place there. The switch is
    // gone: a sheet job in a hall whose CNC runs is made on the CNC, the saw is none of its
    // families, and the joiner works his job at a bench while the CNC's stage is the bar's
    // (PIOTR, 24.09; v53).
    expect(menAtMachine(state, cnc)).toEqual([OWNER]);
    expect(state.workers[0]?.station).toBe(machineStation('workbench'));
    for (const job of state.jobs) {
      expect(job.blockedBy, job.name).toBe('');
      expect(currentStage(state, job)?.id, job.name).toBe('cnc');
    }
    // Both put work in at the job's one pace, so the two hours stand as the two men's rates: the
    // owner's 1.00 against the novice's 0.6.
    const done = state.jobs.map((job, index) => (before[index] ?? 0) - job.labourRemaining);
    const first = state.jobs[0];
    if (!first) throw new Error('a job is wanted');
    // The owner's hour at the job's one pace: the used CNC's 2.00 times its class's 0.95 on the
    // job's 0.40, the halved assembly after it and the finishing at 1.00, 1.71 in all: 68.31 of
    // labour.
    expect(done[0]).toBeCloseTo(60 * OWNER_LABOUR_PER_MINUTE * jobPace(state, first), 6);
    expect(done[0]).toBeCloseTo(68.3146, 4);
    expect((done[1] ?? 0) / (done[0] ?? 1)).toBeCloseTo(WORKER_RATES.novice, 6);
  });

  it('holds no job for the CNC: the man its one place cannot take works his job on at a bench', () => {
    // Nothing of his job left but the CNC's own stage and the finishing, and the CNC's one place is
    // the owner's. Until v53, with the job card's switch off, he stood at his home cell with `no
    // place at the CNC` and not a minute went into his job. The switch is gone and nobody waits
    // for a machine: he works it at a bench, and his minutes go on the CNC's stage, where the bar
    // stands (PIOTR, 24.09; v53).
    const state = withOnlyCuttingLeft(twoOnOneCnc());
    const before = state.jobs.map((job) => job.labourRemaining);
    const worked = tick(state, 60);
    const joiner = worked.workers[0];
    expect(joiner?.station).toBe(machineStation('workbench'));
    expect(joiner?.noPlaceFor).toBe('');
    expect(bubbleFor(worked, joiner?.id ?? '')).toBeNull();
    const his = worked.jobs.find((job) => job.assignees[0] === joiner?.id);
    if (!his) throw new Error('the joiner s job is wanted');
    expect(his.labourRemaining).toBeLessThan(before[worked.jobs.indexOf(his)] ?? 0);
    expect(his.stageLabour.cnc ?? 0).toBeCloseTo((before[worked.jobs.indexOf(his)] ?? 0) - his.labourRemaining, 6);
    // And the man who has the CNC's place is at it.
    const owner = worked.jobs.find((job) => job.assignees[0] === OWNER);
    expect(owner?.labourRemaining).toBeLessThan(before[worked.jobs.indexOf(owner as Job)] ?? 0);
  });
});

describe('a broken machine stops no job (PIOTR, 24.09; v53)', () => {
  it('lets the cutting go on while the edgebander is in pieces, and the machining by hand', () => {
    let state = buyStartingKit(newGame({ difficulty: 'veryEasy' }), { sawVariant: 'budget' });
    state.enquiries = [];
    const enquiry = placeEnquiry(state, { price: 40000, deadlineDays: 90 });
    state = fillRack(acceptNow(state, enquiry.id, false), 80);
    firstJob(state).stage = 'ready';
    state = act(state, { type: 'WORK_HERE', jobId: null });
    expect(jobPace(state, firstJob(state))).toBeCloseTo(1, 10);
    const bander = state.equipment.find((item) => item.specId === 'edgebander');
    if (bander) bander.broken = true;
    // The job's one pace with the bander's share, 0.15 of the job, at the by hand pace of 1 / 1.5.
    expect(jobPace(state, firstJob(state))).toBeCloseTo(1 / (0.85 + 0.15 * 1.5), 10);
    const cutting = tick(state, 1);
    expect(firstJob(cutting).blockedBy).toBe('');
    expect(cutting.owner.station).toBe(machineStation('tableSaw'));
    // Push him on to the machining. Until v53 the broken bander stopped him with `edgebander is
    // broken` on the job; now nothing stops the job but the whole hall, and he works it at a bench
    // at that pace (v53).
    const job = firstJob(state);
    job.labourRemaining = job.labourValue * 0.7;
    const before = job.labourRemaining;
    const machining = tick(state, 1);
    expect(firstJob(machining).blockedBy).toBe('');
    expect(machining.owner.station).toBe(machineStation('workbench'));
    expect(before - firstJob(machining).labourRemaining).toBeCloseTo(
      OWNER_LABOUR_PER_MINUTE / (0.85 + 0.15 * 1.5),
      6,
    );
  });
});
