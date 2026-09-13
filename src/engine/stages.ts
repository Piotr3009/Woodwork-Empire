// Production in stages (CLAUDE.md T7 3.1). A job is not one bar of work any more: it is cut,
// machined, assembled and finished, each at its own station, and a machine speeds up only its own
// stage and only for the man standing at it.
//
// The whole of a job's place in its own work is one number, `labourRemaining`, exactly as it was:
// the stages are fixed shares of the labour, so where the job has got to says which stage it is
// at. Nothing here is a second copy of how far through a job is.

import {
  BY_HAND_DURATION_FACTOR,
  OWNER_LABOUR_PER_MINUTE,
  PRODUCTION_STAGES,
  WORK_EPSILON,
} from './constants';
import { bestOutputFactor, has } from './machines';
import type { Finish, GameState, Job, MaterialKind, StageId, StageSpec } from './types';

/** What a stage needs to know about the job it belongs to. A plan can be drawn for an enquiry
 *  nobody has accepted yet, which is what the board tile and the deadline are worked out from. */
export interface StagedJob {
  labourValue: number;
  materialKind: MaterialKind;
  finish: Finish;
  byHand: boolean;
}

/** One stage of one job: the share of the labour it carries, where that share sits in the job,
 *  and what the hall does to the minutes it takes. */
export interface StagePlan {
  id: StageId;
  label: string;
  share: number;
  /** The labour value the stage runs from and to, so the job's own figure says where it is. */
  from: number;
  to: number;
  /** The machine family it is done on. Null is the bench with nothing but hands. */
  family: string | null;
  /** What a minute at this stage is worth. Above 1 is quicker than a standard machine. */
  speed: number;
  /** True when there is no machine of the family in the hall and the stage falls back to the
   *  bench at the Turn 1 penalty (CLAUDE.md T7 3.1). */
  byHand: boolean;
}

export function stageLabel(id: StageId): string {
  return PRODUCTION_STAGES.find((stage) => stage.id === id)?.label ?? id;
}

/** The family a stage is done on for a job of this material and finish, or null when it is done
 *  at the bench with nothing but hands (CLAUDE.md T7 3.1). */
export function familyForStage(job: StagedJob, stage: StageId): string | null {
  if (stage === 'cutting') return 'tableSaw';
  if (stage === 'machining') return job.materialKind === 'sheet' ? 'edgebander' : 'solidWoodTools';
  if (stage === 'assembly') return 'workbench';
  if (stage === 'finishing') return job.finish === 'lacquer' ? 'sprayBooth' : null;
  return null;
}

/** Only cutting and machining fall back to a pair of hands. A bench is not a speed: without one
 *  nothing is made at all, which the hall says for itself (CLAUDE.md T4 3.4). */
const BY_HAND_STAGES: StageId[] = ['cutting', 'machining', 'cnc'];

/** What the hall does to the minutes of one stage: the best class of the family it is done on,
 *  or the by hand penalty when the family is not in the hall at all. */
export function stageSpeed(
  state: GameState,
  job: StagedJob,
  stage: StageId,
): { speed: number; byHand: boolean } {
  // A job made entirely by hand uses no machine at any stage (CLAUDE.md 9.5).
  if (job.byHand) return { speed: 1 / BY_HAND_DURATION_FACTOR, byHand: true };
  const family = familyForStage(job, stage);
  if (family === null) return { speed: 1, byHand: false };
  if (has(state, family)) return { speed: bestOutputFactor(state, family), byHand: false };
  if (!BY_HAND_STAGES.includes(stage)) return { speed: 1, byHand: false };
  return { speed: 1 / BY_HAND_DURATION_FACTOR, byHand: true };
}

/** The stages of a job, in order, with the labour each one carries. */
export function stagesOf(state: GameState, job: StagedJob): StageSpec[] {
  void state;
  void job;
  return PRODUCTION_STAGES;
}

/** The plan for a job as the hall stands now. It is read every minute, so buying a machine speeds
 *  up work already on the books and losing one to the bailiff slows it down again. */
export function stagePlanFor(state: GameState, job: StagedJob): StagePlan[] {
  const plans: StagePlan[] = [];
  let from = 0;
  for (const stage of stagesOf(state, job)) {
    const to = from + stage.share * job.labourValue;
    const { speed, byHand } = stageSpeed(state, job, stage.id);
    plans.push({
      id: stage.id,
      label: stage.label,
      share: stage.share,
      from,
      to,
      family: familyForStage(job, stage.id),
      speed,
      byHand,
    });
    from = to;
  }
  return plans;
}

/** The minutes a man of this rate needs to work this much labour off at this speed. */
export function stageMinutes(labour: number, rate: number, speed: number): number {
  if (labour <= 0) return 0;
  if (rate <= 0 || speed <= 0) return Infinity;
  return labour / (OWNER_LABOUR_PER_MINUTE * rate * speed);
}

/** The whole job, start to finish, for a man of this rate with the machines the hall has now. */
export function jobMinutesFor(state: GameState, job: StagedJob, rate: number): number {
  return stagePlanFor(state, job).reduce(
    (total, stage) => total + stageMinutes(stage.to - stage.from, rate, stage.speed),
    0,
  );
}

/** Labour this job has already had worked into it. */
export function labourDone(job: Job): number {
  return Math.max(0, job.labourValue - job.labourRemaining);
}

/** What is left of the job for a man of this rate, stage by stage: a job half way through its
 *  cutting still has all of its assembly ahead of it at the bench's own speed. */
export function minutesLeftFor(state: GameState, job: Job, rate: number): number {
  const done = labourDone(job);
  let minutes = 0;
  for (const stage of stagePlanFor(state, job)) {
    const left = Math.max(0, stage.to - Math.max(stage.from, done));
    minutes += stageMinutes(left, rate, stage.speed);
  }
  return minutes;
}

/** The stage a job with this much labour worked into it is standing at. */
export function stageAt(plan: readonly StagePlan[], done: number): StagePlan | null {
  for (const stage of plan) {
    if (stage.to - done > WORK_EPSILON) return stage;
  }
  return plan.length > 0 ? (plan[plan.length - 1] ?? null) : null;
}

/** The stage the job is at now. Null only for a job with no labour in it at all. */
export function currentStage(state: GameState, job: Job): StagePlan | null {
  return stageAt(stagePlanFor(state, job), labourDone(job));
}

/** Labour per minute for a man of this rate working this stage at this speed. The one place a
 *  minute of somebody's time is turned into work in a job. */
export function labourPerMinute(rate: number, speed: number): number {
  return OWNER_LABOUR_PER_MINUTE * rate * speed;
}
