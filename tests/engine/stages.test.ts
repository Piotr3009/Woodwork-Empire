// Production in stages: the shares, the minutes each stage takes, and the machine that speeds up
// its own stage and nothing else (CLAUDE.md T7 3.1).

import { describe, expect, it } from 'vitest';
import {
  BY_HAND_DURATION_FACTOR,
  OWNER_LABOUR_PER_MINUTE,
  PRODUCTION_STAGES,
} from '../../src/engine/constants';
import {
  currentStage,
  familyForStage,
  jobMinutesFor,
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
  it('adds up to the whole job and comes in the order the workshop does them', () => {
    expect(PRODUCTION_STAGES.map((stage) => stage.id)).toEqual([
      'cutting',
      'machining',
      'assembly',
      'finishing',
    ]);
    const total = PRODUCTION_STAGES.reduce((sum, stage) => sum + stage.share, 0);
    expect(total).toBeCloseTo(1, 10);
    expect(PRODUCTION_STAGES.map((stage) => stage.share)).toEqual([0.25, 0.15, 0.45, 0.15]);
  });

  it('does each stage on its own family, and the machining on the material', () => {
    const sheet = jobOfMinutes(480);
    expect(familyForStage(sheet, 'cutting')).toBe('tableSaw');
    expect(familyForStage(sheet, 'machining')).toBe('edgebander');
    expect(familyForStage(sheet, 'assembly')).toBe('workbench');
    // Laminate is finished at the bench with nothing but hands; lacquer wants the booth.
    expect(familyForStage(sheet, 'finishing')).toBeNull();
    const timber = jobOfMinutes(480, { materialKind: 'solidWood' });
    expect(familyForStage(timber, 'cutting')).toBe('tableSaw');
    expect(familyForStage(timber, 'machining')).toBe('solidWoodTools');
    expect(familyForStage({ ...sheet, finish: 'lacquer' }, 'finishing')).toBe('sprayBooth');
  });

  it('splits the job into shares of its own labour, one after the other', () => {
    const state = hallWithSaw('budget');
    const job = jobOfMinutes(480);
    const plan = stagePlanFor(state, job);
    expect(plan.map((stage) => stage.id)).toEqual([
      'cutting',
      'machining',
      'assembly',
      'finishing',
    ]);
    expect(plan[0]?.from).toBe(0);
    expect(plan[3]?.to).toBeCloseTo(job.labourValue, 10);
    for (let index = 1; index < plan.length; index += 1) {
      expect(plan[index]?.from).toBeCloseTo(plan[index - 1]?.to ?? -1, 10);
    }
  });
});

describe('what a machine does to the minutes', () => {
  it('gives a 640 minute job a cutting stage of 123 minutes on an industrial saw', () => {
    const state = hallWithSaw('industrial');
    const job = jobOfMinutes(640);
    const cutting = stagePlanFor(state, job)[0];
    expect(cutting?.id).toBe('cutting');
    // 640 minutes, a quarter of them cutting, divided by the industrial saw's 1.30.
    const minutes = (cutting?.to ?? 0) / (OWNER_LABOUR_PER_MINUTE * (cutting?.speed ?? 1));
    expect(minutes).toBeCloseTo(123.08, 2);
    // Every other stage still runs at the speed of a standard machine tonight.
    expect(jobMinutesFor(state, job, 1)).toBeCloseTo(123.08 + 640 * 0.75, 1);
  });

  it('speeds up its own stage and no other', () => {
    const used = hallWithSaw('used');
    const job = jobOfMinutes(480);
    expect(stageSpeed(used, job, 'cutting').speed).toBeCloseTo(0.95, 10);
    expect(stageSpeed(used, job, 'machining').speed).toBeCloseTo(1, 10);
    expect(stageSpeed(used, job, 'assembly').speed).toBeCloseTo(1, 10);
    expect(jobMinutesFor(used, job, 1)).toBeCloseTo(480 * (0.25 / 0.95 + 0.75), 6);
  });

  it('halves the minutes for a man of half the speed, stage by stage', () => {
    const state = hallWithSaw('budget');
    const job = jobOfMinutes(480);
    expect(jobMinutesFor(state, job, 1)).toBeCloseTo(480, 6);
    expect(jobMinutesFor(state, job, 0.5)).toBeCloseTo(960, 6);
  });

  it('falls back to the bench at half again as long where the family is not in the hall', () => {
    const bare = newGame();
    const timber = jobOfMinutes(480, { materialKind: 'solidWood' });
    // No saw and no solid wood tools: cutting and machining are done by hand (T7 3.1).
    expect(stageSpeed(bare, timber, 'cutting')).toEqual({
      speed: 1 / BY_HAND_DURATION_FACTOR,
      byHand: true,
    });
    expect(stageSpeed(bare, timber, 'machining').byHand).toBe(true);
    // Assembly is not a by hand stage: a bench is a thing you must have, not a thing that is
    // quicker, and the hall says so for itself (CLAUDE.md T4 3.4).
    expect(stageSpeed(bare, timber, 'assembly')).toEqual({ speed: 1, byHand: false });
    expect(jobMinutesFor(bare, timber, 1)).toBeCloseTo(480 * (0.4 * 1.5 + 0.6), 6);
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
    expect(currentStage(state, job)?.id).toBe('machining');
    job.labourRemaining = job.labourValue * 0.5;
    expect(currentStage(state, job)?.id).toBe('assembly');
    job.labourRemaining = job.labourValue * 0.1;
    expect(currentStage(state, job)?.id).toBe('finishing');
  });

  it('counts what is left of the stage in hand and every stage after it', () => {
    const state = jobInHall();
    const job = firstJob(state);
    expect(minutesLeftFor(state, job, 1)).toBeCloseTo(240, 6);
    // Half the job done is half the minutes left, because every class in this hall is standard.
    job.labourRemaining = job.labourValue / 2;
    expect(minutesLeftFor(state, job, 1)).toBeCloseTo(120, 6);
  });

  it('writes down each run at a stage as the work goes into it', () => {
    let state = jobInHall();
    state = act(state, { type: 'WORK_HERE', jobId: null });
    state = act(state, { type: 'SET_SPEED', speed: 1 });
    state = tick(state, 70);
    const job = firstJob(state);
    // A 400 job is 240 minutes: 60 of cutting, then 36 of machining. A run closes on the minute
    // its stage is worked off (v37), the sixtieth of the cutting, which is minute 59 of the day.
    expect(job.stageRuns.map((run) => run.stage)).toEqual(['cutting', 'machining']);
    expect(job.stageRuns[0]?.startDay).toBe(1);
    expect(job.stageRuns[0]?.startMinute).toBe(0);
    expect(job.stageRuns[0]?.endMinute).toBe(59);
    expect(job.stageRuns[1]?.endDay).toBeNull();
  });
});
