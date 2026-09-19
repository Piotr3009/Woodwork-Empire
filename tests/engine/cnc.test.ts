// The CNC does the cutting and the machining of a sheet job as one stage, and halves the assembly
// after it. Timber still goes on the saw and the timber tools (CLAUDE.md T7 3.4).

import { describe, expect, it } from 'vitest';
import {
  CNC_ASSEMBLY_FACTOR,
  CNC_STAGE_FACTOR,
  CNC_STAGE_FACTOR_WITH_HEAD,
  OWNER_LABOUR_PER_MINUTE,
} from '../../src/engine/constants';
import { OWNER } from '../../src/engine/machines';
import {
  cncFactor,
  jobMinutesFor,
  jobOnCnc,
  stagePlanFor,
  stageSpeed,
} from '../../src/engine/stages';
import { stagedJob } from '../../src/engine/jobs';
import { waitingStation, machineStation } from '../../src/engine/stations';
import { tick } from '../../src/engine/index';
import type { GameState } from '../../src/engine/index';
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
} from '../helpers';

/** A job whose whole labour is this many minutes of the owner's own time. */
function jobOfMinutes(minutes: number, material: 'sheet' | 'solidWood' = 'sheet') {
  return stagedJob(minutes * OWNER_LABOUR_PER_MINUTE, material, false);
}

/** The day 1 kit with a CNC standing in the hall beside it. */
function withCnc(): GameState {
  const state = withDryAir(
    withExtraction(buyStartingKit(newGame({ difficulty: 'veryEasy' }), { sawVariant: 'budget' })),
  );
  placeEquipment(state, 'cnc', { x: 2, y: 6 });
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

  it('leaves a timber job on the saw and the timber tools', () => {
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
    expect(plan[1]?.family).toBe('solidWoodTools');
    // And its assembly is not halved: nothing came off a CNC.
    expect(plan[2]?.speed).toBe(1);
  });
});

describe('one man per CNC', () => {
  /** Two men, each on a sheet job, in a hall with one CNC. */
  function twoOnOneCnc(): GameState {
    // A CNC will not run on wet air at all, and this is about the queue at it (T10 3.3).
    const state = withDryAir(twoMenOnSheetWork({ saws: 1 }));
    placeEquipment(state, 'cnc', { x: 2, y: 6, id: 'kit-cnc' });
    return state;
  }

  it('puts one man on it and leaves the saw free for the other', () => {
    const state = tick(twoOnOneCnc(), 60);
    const cnc = state.equipment.find((item) => item.specId === 'cnc');
    const saw = state.equipment.find((item) => item.specId === 'tableSaw');
    expect(cnc?.takenBy).toBe(OWNER);
    // The second man falls back to the saw, which the CNC has left free (CLAUDE.md T7 3.4).
    expect(saw?.takenBy).toBe(state.workers[0]?.id);
    for (const job of state.jobs) expect(job.blockedBy, job.name).toBe('');
    // Both put work in, and the man on the CNC put in more than twice what the saw did.
    const done = state.jobs.map((job) => job.labourValue - job.labourRemaining);
    expect(done.every((value) => value > 0)).toBe(true);
  });

  it('stands the second man at the CNC when the job card will not have the saw', () => {
    const state = twoOnOneCnc();
    for (const job of state.jobs) job.sawFallback = false;
    const worked = tick(state, 60);
    const joiner = worked.workers[0];
    expect(joiner?.station).toBe(waitingStation('cnc'));
    const waiting = worked.jobs.find((job) => job.assignees[0] === joiner?.id);
    // "the CNC" and not "cnc": the trade's own short word, which is also what the drawing over his
    // head says (CLAUDE.md T21 2.6, 2.7).
    expect(waiting?.blockedBy).toBe('waiting for the CNC');
    expect(waiting?.labourRemaining).toBe(waiting?.labourValue);
    // And the man who has it is at it.
    const owner = worked.jobs.find((job) => job.assignees[0] === OWNER);
    expect(owner?.labourRemaining).toBeLessThan(owner?.labourValue ?? 0);
  });

  it('is set from the job card, one job at a time', () => {
    const state = twoOnOneCnc();
    const job = state.jobs[0];
    if (!job) throw new Error('no job');
    expect(job.sawFallback).toBe(true);
    const off = act(state, { type: 'SET_SAW_FALLBACK', jobId: job.id, on: false });
    expect(off.jobs[0]?.sawFallback).toBe(false);
    expect(off.jobs[1]?.sawFallback).toBe(true);
  });
});

describe('a broken machine stops its own stage and no other', () => {
  it('lets the cutting go on while the edgebander is in pieces', () => {
    let state = buyStartingKit(newGame({ difficulty: 'veryEasy' }), { sawVariant: 'budget' });
    state.enquiries = [];
    const enquiry = placeEnquiry(state, { price: 40000, deadlineDays: 90 });
    state = fillRack(acceptNow(state, enquiry.id, false), 80);
    firstJob(state).stage = 'ready';
    state = act(state, { type: 'WORK_HERE', jobId: null });
    const bander = state.equipment.find((item) => item.specId === 'edgebander');
    if (bander) bander.broken = true;
    const cutting = tick(state, 1);
    expect(firstJob(cutting).blockedBy).toBe('');
    expect(cutting.owner.station).toBe(machineStation('tableSaw'));
    // Push him on to the machining, and the broken bander is what stops him.
    const job = firstJob(state);
    job.labourRemaining = job.labourValue * 0.7;
    const machining = tick(state, 1);
    expect(firstJob(machining).blockedBy).toBe('edgebander is broken');
  });
});
