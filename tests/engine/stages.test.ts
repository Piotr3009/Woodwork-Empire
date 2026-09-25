// Production in stages: the shares, the minutes each stage takes, and the machine that speeds up
// its own stage and nothing else (CLAUDE.md T7 3.1). From v55 one stage a machine, a quarter each,
// every job the same, and the booth's Finishing for lacquer alone [PIOTR, 24.09].

import { describe, expect, it } from 'vitest';
import {
  BY_HAND_DURATION_FACTOR,
  FINISHING_STAGE,
  MACHINE_STAGES,
  OWNER_LABOUR_PER_MINUTE,
  PRODUCTION_STAGES,
} from '../../src/engine/constants';
import {
  currentStage,
  familyForStage,
  jobMinutesFor,
  jobPace,
  minutesLeftFor,
  stagePlanFor,
  stageSpeed,
} from '../../src/engine/stages';
import type { StagedJob } from '../../src/engine/stages';
import { tick } from '../../src/engine/index';
import type { GameState } from '../../src/engine/index';
import {
  acceptNow,
  act,
  buyStartingKit,
  firstJob,
  fillRack,
  newGame,
  placeEnquiry,
  withExtraction,
} from '../helpers';

/** A job whose whole labour is this many minutes of the owner's own time, so the arithmetic of
 *  CLAUDE.md T7 3.1 can be read straight off the assertions. */
function jobOfMinutes(minutes: number, options: Partial<StagedJob> = {}): StagedJob {
  return {
    labourValue: minutes * OWNER_LABOUR_PER_MINUTE,
    materialKind: 'sheet',
    finish: 'laminate',
    byHand: false,
    needsSpindle: false,
    ...options,
  };
}

/** A very easy game with the day 1 kit and the named class of saw standing in the hall. */
function hallWithSaw(variantId: string): GameState {
  // With a fan big enough for whatever class of saw the test asks for: this file is about the
  // stages and not about the extraction sums (CLAUDE.md T10 3.1).
  const state = withExtraction(
    buyStartingKit(newGame({ difficulty: 'veryEasy' }), { sawVariant: variantId }),
  );
  state.enquiries = [];
  return fillRack(state);
}

describe('the stages a job is made in', () => {
  it('is one stage a machine, a quarter each, and the booth for lacquer (v55)', () => {
    expect(MACHINE_STAGES.map((stage) => stage.id)).toEqual(['cutting', 'edging', 'moulding', 'assembly']);
    expect(MACHINE_STAGES.map((stage) => stage.share)).toEqual([0.25, 0.25, 0.25, 0.25]);
    expect(FINISHING_STAGE).toEqual({ id: 'finishing', label: 'Finishing', share: 0.15 });
    expect(PRODUCTION_STAGES.map((stage) => stage.id)).toEqual([
      'cutting',
      'edging',
      'moulding',
      'assembly',
      'finishing',
    ]);
  });

  it('does each stage on its own family, the same for sheet and timber', () => {
    const sheet = jobOfMinutes(480);
    expect(familyForStage(sheet, 'cutting')).toBe('tableSaw');
    expect(familyForStage(sheet, 'edging')).toBe('edgebander');
    expect(familyForStage(sheet, 'moulding')).toBe('spindleMoulder');
    expect(familyForStage(sheet, 'assembly')).toBe('workbench');
    // Lacquer wants the booth; nothing else has a Finishing at all (v55).
    expect(familyForStage(sheet, 'finishing')).toBeNull();
    expect(familyForStage({ ...sheet, finish: 'lacquer' }, 'finishing')).toBe('sprayBooth');
    // Timber goes through the same four: the thicknesser has no stage until the timber branch
    // (PIOTR, 24.09; v55).
    const timber = jobOfMinutes(480, { materialKind: 'solidWood' });
    expect(familyForStage(timber, 'cutting')).toBe('tableSaw');
    expect(familyForStage(timber, 'moulding')).toBe('spindleMoulder');
  });

  it('splits the job into shares of its own labour, one after the other', () => {
    const state = hallWithSaw('budget');
    const job = jobOfMinutes(480);
    const plan = stagePlanFor(state, job);
    expect(plan.map((stage) => stage.id)).toEqual(['cutting', 'edging', 'moulding', 'assembly']);
    expect(plan.map((stage) => stage.share)).toEqual([0.25, 0.25, 0.25, 0.25]);
    expect(plan[0]?.from).toBe(0);
    expect(plan[3]?.to).toBeCloseTo(job.labourValue, 10);
    for (let index = 1; index < plan.length; index += 1) {
      expect(plan[index]?.from).toBeCloseTo(plan[index - 1]?.to ?? -1, 10);
    }
    // A lacquered job: the booth's 15% at the end and the four quarters share the 85%.
    const lacquer = stagePlanFor(state, jobOfMinutes(480, { finish: 'lacquer' }));
    expect(lacquer.map((stage) => stage.id)).toEqual(['cutting', 'edging', 'moulding', 'assembly', 'finishing']);
    expect(lacquer.map((stage) => stage.share)).toEqual([0.2125, 0.2125, 0.2125, 0.2125, 0.15]);
    expect(lacquer[4]?.to).toBeCloseTo(480 * OWNER_LABOUR_PER_MINUTE, 10);
  });
});

describe('what a machine does to the minutes', () => {
  it('gives a 640 minute job a cutting stage of 143 minutes on an industrial saw', () => {
    const state = hallWithSaw('industrial');
    const job = jobOfMinutes(640);
    const cutting = stagePlanFor(state, job)[0];
    expect(cutting?.id).toBe('cutting');
    // 640 minutes, a quarter of them cutting, divided by the industrial class's pace, 1.12 from
    // v52 where it was 1.30 (CLAUDE.md T25 2.4).
    const minutes = (cutting?.to ?? 0) / (OWNER_LABOUR_PER_MINUTE * (cutting?.speed ?? 1));
    expect(minutes).toBeCloseTo(142.86, 2);
    // The edging on the day one hand bander at 1.00, the assembly at 1.00, and the moulding by
    // hand at half as long again, the hall having no spindle moulder (v55).
    expect(jobMinutesFor(state, job, 1)).toBeCloseTo(142.86 + 640 * (0.5 + 0.25 * 1.5), 1);
  });

  it('speeds up its own stage and no other', () => {
    const used = hallWithSaw('used');
    const job = jobOfMinutes(480);
    expect(stageSpeed(used, job, 'cutting').speed).toBeCloseTo(0.95, 10);
    expect(stageSpeed(used, job, 'edging').speed).toBeCloseTo(1, 10);
    expect(stageSpeed(used, job, 'moulding')).toEqual({ speed: 1 / BY_HAND_DURATION_FACTOR, byHand: true });
    expect(stageSpeed(used, job, 'assembly').speed).toBeCloseTo(1, 10);
    expect(jobMinutesFor(used, job, 1)).toBeCloseTo(480 * (0.25 / 0.95 + 0.25 + 0.25 * 1.5 + 0.25), 6);
  });

  it('halves the minutes for a man of half the speed, stage by stage', () => {
    const state = hallWithSaw('budget');
    const job = jobOfMinutes(480);
    // The moulding's quarter by hand on the day one hall: 480 at 1.00 would want a spindle moulder.
    expect(jobMinutesFor(state, job, 1)).toBeCloseTo(480 * (0.75 + 0.25 * 1.5), 6);
    expect(jobMinutesFor(state, job, 0.5)).toBeCloseTo(960 * (0.75 + 0.25 * 1.5), 6);
  });

  it('falls back to the bench at half again as long where the family is not in the hall', () => {
    const bare = newGame();
    const timber = jobOfMinutes(480, { materialKind: 'solidWood' });
    // No saw, no edgebander, no spindle moulder: the three machine quarters are done by hand
    // (T7 3.1; v53, v55).
    expect(stageSpeed(bare, timber, 'cutting')).toEqual({
      speed: 1 / BY_HAND_DURATION_FACTOR,
      byHand: true,
    });
    expect(stageSpeed(bare, timber, 'edging').byHand).toBe(true);
    expect(stageSpeed(bare, timber, 'moulding').byHand).toBe(true);
    // Assembly is not a by hand stage: a bench is a thing you must have, not a thing that is
    // quicker, and the hall says so for itself (CLAUDE.md T4 3.4).
    expect(stageSpeed(bare, timber, 'assembly')).toEqual({ speed: 1, byHand: false });
    expect(jobMinutesFor(bare, timber, 1)).toBeCloseTo(480 * (0.75 * 1.5 + 0.25), 6);
  });

  it('puts the by hand penalty on every stage of a job made by hand', () => {
    const state = hallWithSaw('industrial');
    const byHand = jobOfMinutes(480, { materialKind: 'solidWood', byHand: true });
    for (const stage of stagePlanFor(state, byHand)) {
      expect(stage.byHand, stage.id).toBe(true);
    }
    expect(jobMinutesFor(state, byHand, 1)).toBeCloseTo(480 * BY_HAND_DURATION_FACTOR, 6);
  });
});

describe('where a job has got to', () => {
  function jobInHall(): GameState {
    const state = hallWithSaw('budget');
    const enquiry = placeEnquiry(state, { price: 400, name: 'Garage shelves' });
    const next = acceptNow(state, enquiry.id, false);
    firstJob(next).stage = 'ready';
    return next;
  }

  it('reads the stage off the labour the job has had worked into it', () => {
    const state = jobInHall();
    const job = firstJob(state);
    expect(currentStage(state, job)?.id).toBe('cutting');
    job.labourRemaining = job.labourValue * 0.7;
    expect(currentStage(state, job)?.id).toBe('edging');
    job.labourRemaining = job.labourValue * 0.4;
    expect(currentStage(state, job)?.id).toBe('moulding');
    job.labourRemaining = job.labourValue * 0.1;
    expect(currentStage(state, job)?.id).toBe('assembly');
  });

  it('counts what is left of the job at its one pace, whatever stage its bar stands at', () => {
    const state = jobInHall();
    const job = firstJob(state);
    // 240 minutes of work, the moulding's 60 by hand at 90: 270 (v55).
    expect(minutesLeftFor(state, job, 1)).toBeCloseTo(270, 6);
    // Half the job done is half the minutes left, at the job's one pace.
    job.labourRemaining = job.labourValue / 2;
    expect(minutesLeftFor(state, job, 1)).toBeCloseTo(135, 6);
  });

  it('takes a whole job in the minutes its stages add up to, and half of it in half of them', () => {
    // An industrial saw, whose 1.12 is on the cutting's quarter of the job and nowhere else. The
    // job's one pace folds it in (PIOTR, 24.09; v53), with the moulding's quarter by hand on a hall
    // with no spindle moulder (v55): 1 / (0.25 / 1.12 + 0.25 + 0.25 * 1.5 + 0.25).
    const state = hallWithSaw('industrial');
    const enquiry = placeEnquiry(state, { price: 400, name: 'Garage shelves' });
    const next = acceptNow(state, enquiry.id, false);
    const job = firstJob(next);
    const whole = 60 / 1.12 + 60 + 90 + 60;
    expect(jobPace(next, job)).toBeCloseTo(240 / whole, 10);
    // The whole of it at that pace is the minutes its stages add up to.
    expect(minutesLeftFor(next, job, 1)).toBeCloseTo(jobMinutesFor(next, job, 1), 6);
    expect(minutesLeftFor(next, job, 1)).toBeCloseTo(whole, 6);
    // Half of it done, the bar at the moulding: what is left is the labour left at the job's one
    // pace (v53).
    job.labourRemaining = job.labourValue / 2;
    expect(currentStage(next, job)?.id).toBe('moulding');
    expect(minutesLeftFor(next, job, 1)).toBeCloseTo(whole / 2, 6);
  });

  it('writes down each run at a stage as the work goes into it', () => {
    let state = jobInHall();
    state = act(state, { type: 'WORK_HERE', jobId: null });
    state = act(state, { type: 'SET_SPEED', speed: 1 });
    state = tick(state, 70);
    const job = firstJob(state);
    // A 400 job is 240 minutes of work: 60 of cutting, then 60 of edging, at the job's one pace,
    // 240 / 270 on this hall (the moulding by hand). A run closes on the minute its stage is
    // worked off (v37): the cutting's 60 of labour takes 67.5 minutes at that pace, so its run
    // ends on minute 67 of the day (v55).
    expect(job.stageRuns.map((run) => run.stage)).toEqual(['cutting', 'edging']);
    expect(job.stageRuns[0]?.startDay).toBe(1);
    expect(job.stageRuns[0]?.startMinute).toBe(0);
    expect(job.stageRuns[0]?.endMinute).toBe(67);
    expect(job.stageRuns[1]?.endDay).toBeNull();
  });
});
