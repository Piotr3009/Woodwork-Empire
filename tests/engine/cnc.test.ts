// The CNC does the cutting of a sheet job instead of the saw, twice as fast, and halves the
// assembly after it; the edging and the moulding stay on their own machines (CLAUDE.md T7 3.4;
// PIOTR, 24.09; v55). Timber still goes on the saw. A job on the CNC waits for nothing: the men its
// places cannot take work the job elsewhere, and a broken machine stops no job, its quarter going
// at the by hand pace (v53).

import { describe, expect, it } from 'vitest';
import {
  CNC_ASSEMBLY_FACTOR,
  CNC_STAGE_FACTOR,
  CNC_STAGE_FACTOR_WITH_HEAD,
  OWNER_LABOUR_PER_MINUTE,
  WORKER_RATES,
} from '../../src/engine/constants';
import { OWNER, cncsWithToolChangers, standsInTheHall } from '../../src/engine/machines';
import { canBuy } from '../../src/engine/game';
import { floorLine } from '../../src/ui/machine';
import { hallItems } from '../../src/engine/layout';
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
  it('does the cutting instead of the saw, and halves the assembly (v55)', () => {
    const state = withCnc();
    const job = jobOfMinutes(1000);
    const plan = stagePlanFor(state, job);
    expect(plan.map((stage) => stage.id)).toEqual(['cnc', 'edging', 'moulding', 'assembly']);
    // The cutting's quarter, at the CNC's own factor: 250 minutes of work in 125.
    const cnc = plan[0];
    expect(cnc?.share).toBeCloseTo(0.25, 10);
    expect(cnc?.speed).toBe(CNC_STAGE_FACTOR);
    expect((cnc?.to ?? 0) / OWNER_LABOUR_PER_MINUTE / CNC_STAGE_FACTOR).toBeCloseTo(125, 6);
    // Parts come off it cut and drilled, so the bench takes half the minutes.
    expect(plan[3]?.speed).toBe(CNC_ASSEMBLY_FACTOR);
    // The edging on the day one hand bander at 1.00, and the moulding by hand, the hall having no
    // spindle moulder: 125 + 250 + 375 + 125.
    expect(jobMinutesFor(state, job, 1)).toBeCloseTo(125 + 250 + 250 * 1.5 + 125, 6);
  });

  it('takes a quarter off the whole job, the cutting and the assembly halved and nothing else', () => {
    const state = withCnc();
    const job = jobOfMinutes(1000);
    const without = { ...state, equipment: state.equipment.filter((i) => i.specId !== 'cnc') };
    // Without it: 1,125 on this hall, the moulding's quarter by hand. With it: 875, a quarter off
    // the four quarters of work, which is what PIOTR read on 24.09 ("1,000 hours become 750").
    expect(jobMinutesFor(without, job, 1)).toBeCloseTo(1125, 6);
    expect(jobMinutesFor(state, job, 1)).toBeCloseTo(875, 6);
  });

  it('goes a little faster again with the tool changer head', () => {
    const state = withCnc();
    expect(cncFactor(state)).toBe(CNC_STAGE_FACTOR);
    placeEquipment(state, 'cncHead', { x: 18, y: 8 });
    expect(cncFactor(state)).toBe(CNC_STAGE_FACTOR_WITH_HEAD);
    expect(stageSpeed(state, jobOfMinutes(1000), 'cnc').speed).toBe(2.1);
  });

  it('bolts the head to the CNC: no floor of its own, and one head a CNC (v56)', () => {
    const state = withCnc();
    state.cash = 100000;
    const cnc = state.equipment.find((item) => item.specId === 'cnc');
    if (cnc === undefined) throw new Error('a CNC is wanted here');
    // It holds no cell and reserves no zone, so it is bought without a free patch of floor
    // (PIOTR, 25.09: the art side's heads are bolted to the CNC's frame).
    expect(standsInTheHall('cncHead')).toBe(false);
    expect(floorLine('cncHead', 'standard')).toBe('Bolted to a CNC, takes no floor');
    expect(canBuy(state, 'cncHead').ok).toBe(true);
    placeEquipment(state, 'cncHead', { x: 18, y: 8 });
    expect(hallItems(state).some((item) => item.specId === 'cncHead')).toBe(false);
    // The hall's CNC carries it, which is what the hall draws it with (tests/render/hall.test.ts).
    expect([...cncsWithToolChangers(state)]).toEqual([cnc.id]);
    // One CNC takes one head: a second has nothing to be bolted to, until a second CNC stands.
    expect(canBuy(state, 'cncHead')).toEqual({ ok: false, reason: 'Every CNC has a tool changer' });
    placeEquipment(state, 'cnc', { variantId: 'budget', x: 12, y: 6 });
    expect(canBuy(state, 'cncHead').ok).toBe(true);
  });

  it('leaves a timber job on the saw', () => {
    const state = withCnc();
    const timber = jobOfMinutes(1000, 'solidWood');
    expect(jobOnCnc(state, timber)).toBe(false);
    const plan = stagePlanFor(state, timber);
    // The same four stages as a sheet job (PIOTR, 24.09; v55).
    expect(plan.map((stage) => stage.id)).toEqual(['cutting', 'edging', 'moulding', 'assembly']);
    expect(plan[0]?.family).toBe('tableSaw');
    expect(plan[2]?.family).toBe('spindleMoulder');
    // And its assembly is not halved: nothing came off a CNC.
    expect(plan[3]?.speed).toBe(1);
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

  it('stands the two men at the CNC and the benches, whichever each drew, and both jobs move', () => {
    const start = twoOnOneCnc();
    const before = start.jobs.map((job) => job.labourRemaining);
    const state = tick(start, 60);
    const cnc = state.equipment.find((item) => item.specId === 'cnc');
    if (!cnc) throw new Error('a CNC is wanted');
    // Until v53 the joiner's job card let it go on the saw, and he had a place there. The switch is
    // gone: a sheet job in a hall whose CNC runs is made on the CNC and the saw is none of its
    // families (PIOTR, 24.09; v53). From v55 each man draws the CNC or a bench for the half hour,
    // by the shares of his job's stages, so the CNC's one place is whoever drew it first and the
    // other man is at a bench; neither waits (v55).
    expect(menAtMachine(state, cnc).length).toBeLessThanOrEqual(1);
    for (const man of [state.owner, ...state.workers]) {
      expect(man.working).toBe(true);
      expect([machineStation('cnc'), machineStation('workbench')]).toContain(man.station);
    }
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
    // cutting's quarter, the edging at 1.00, the moulding by hand and the halved assembly, 1.134
    // in all: 45.37 of labour (v55; 68.31 on v53, with the old shares).
    expect(done[0]).toBeCloseTo(60 * OWNER_LABOUR_PER_MINUTE * jobPace(state, first), 6);
    expect(jobPace(state, first)).toBeCloseTo(1 / (0.25 / 1.9 + 0.25 + 0.25 * 1.5 + 0.125), 10);
    expect(done[0]).toBeCloseTo(45.3731, 4);
    expect((done[1] ?? 0) / (done[0] ?? 1)).toBeCloseTo(WORKER_RATES.novice, 6);
  });

  it('holds no job for the CNC: the man its one place cannot take works his job on at a bench', () => {
    // Nothing of his job left but the CNC's own stage, and the CNC has one place. Until v53, with
    // the job card's switch off, he stood at his home cell with `no place at the CNC` and not a
    // minute went into his job. The switch is gone and nobody waits for a machine: he works it at
    // a bench, and his minutes go on the CNC's stage, where the bar stands (PIOTR, 24.09; v53).
    const state = withOnlyCuttingLeft(twoOnOneCnc());
    const before = state.jobs.map((job) => job.labourRemaining);
    const worked = tick(state, 60);
    const joiner = worked.workers[0];
    expect([machineStation('cnc'), machineStation('workbench')]).toContain(joiner?.station);
    expect(joiner?.working).toBe(true);
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
  it('lets the cutting go on while the edgebander is in pieces, and the edging by hand', () => {
    // With a fan big enough for the saw, so the minute is the job's pace and nothing of the
    // extraction, whichever machine the owner draws (v55).
    let state = withExtraction(buyStartingKit(newGame({ difficulty: 'veryEasy' }), { sawVariant: 'budget' }));
    state.enquiries = [];
    const enquiry = placeEnquiry(state, { price: 40000, deadlineDays: 90 });
    state = fillRack(acceptNow(state, enquiry.id, false), 80);
    firstJob(state).stage = 'ready';
    state = act(state, { type: 'WORK_HERE', jobId: null });
    // The day one hall has no spindle moulder, so the moulding's quarter is by hand (v55).
    expect(jobPace(state, firstJob(state))).toBeCloseTo(1 / (0.75 + 0.25 * 1.5), 10);
    const bander = state.equipment.find((item) => item.specId === 'edgebander');
    if (bander) bander.broken = true;
    // The job's one pace with the bander's quarter by hand too.
    expect(jobPace(state, firstJob(state))).toBeCloseTo(1 / (0.5 + 0.5 * 1.5), 10);
    const cutting = tick(state, 1);
    expect(firstJob(cutting).blockedBy).toBe('');
    // He is at the saw or at a bench, whichever he drew for the half hour (v55), and working.
    expect([machineStation('tableSaw'), machineStation('workbench')]).toContain(cutting.owner.station);
    expect(cutting.owner.working).toBe(true);
    // Push him on to the edging. Until v53 the broken bander stopped him with `edgebander is
    // broken` on the job; now nothing stops the job but the whole hall, and he works it on at that
    // pace (v53).
    const job = firstJob(state);
    job.labourRemaining = job.labourValue * 0.7;
    const before = job.labourRemaining;
    const edging = tick(state, 1);
    expect(firstJob(edging).blockedBy).toBe('');
    expect(edging.owner.working).toBe(true);
    expect(before - firstJob(edging).labourRemaining).toBeCloseTo(
      OWNER_LABOUR_PER_MINUTE / (0.5 + 0.5 * 1.5),
      6,
    );
  });
});
