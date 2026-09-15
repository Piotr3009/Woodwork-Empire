// Production in stages (CLAUDE.md T7 3.1). A job is not one bar of work any more: it is cut,
// machined, assembled and finished, each at its own station, and a machine speeds up only its own
// stage and only for the man standing at it.
//
// The whole of a job's place in its own work is one number, `labourRemaining`, exactly as it was:
// the stages are fixed shares of the labour, so where the job has got to says which stage it is
// at. Nothing here is a second copy of how far through a job is.

import {
  BY_HAND_DURATION_FACTOR,
  CNC_ASSEMBLY_FACTOR,
  CNC_STAGE,
  CNC_STAGE_FACTOR,
  CNC_STAGE_FACTOR_WITH_HEAD,
  OWNER_LABOUR_PER_MINUTE,
  PRODUCTION_STAGES,
  WORK_EPSILON,
} from './constants';
import { bestOutputFactor, freeMachines, has, heldMachine } from './machines';
import type { Finish, GameState, Job, MaterialKind, StageId, StageSpec } from './types';

/** What a stage needs to know about the job it belongs to. A plan can be drawn for an enquiry
 *  nobody has accepted yet, which is what the board tile and the deadline are worked out from. */
export interface StagedJob {
  labourValue: number;
  materialKind: MaterialKind;
  finish: Finish;
  byHand: boolean;
  /** The machining is done on the spindle moulder: a handleless kitchen's J profile, a sprayed
   *  kitchen's fronts (CLAUDE.md T13 3.13). */
  needsSpindle: boolean;
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
  if (id === CNC_STAGE.id) return CNC_STAGE.label;
  return PRODUCTION_STAGES.find((stage) => stage.id === id)?.label ?? id;
}

/** How this job is to be made this minute. The CNC is the one thing that changes the shape of a
 *  job's stages, so it is the one option there is (CLAUDE.md T7 3.4). */
export interface StageOptions {
  /** False when the CNC is not to be used: the hall has none, or it is taken and the job card
   *  allows the saw instead. Left out means "use it if the hall has one". */
  cnc?: boolean;
}

/** True when this job is made on the CNC: a sheet job, not one made by hand, in a hall with one
 *  the man can have (CLAUDE.md T7 3.4). Timber still goes on the saw and the timber tools. */
export function jobOnCnc(state: GameState, job: StagedJob, options: StageOptions = {}): boolean {
  if (job.byHand || job.materialKind !== 'sheet') return false;
  if (!has(state, 'cnc')) return false;
  return options.cnc ?? true;
}

/** What the CNC does to the minutes of its own stage: the tool changer head takes it further. */
export function cncFactor(state: GameState): number {
  return has(state, 'cncHead') ? CNC_STAGE_FACTOR_WITH_HEAD : CNC_STAGE_FACTOR;
}

/** How this man's job is made this minute: on the CNC when he can have one, on the saw and the
 *  edgebander when the CNC is taken and the job card allows it, and waiting for the CNC when it
 *  does not (CLAUDE.md T7 3.4). */
export function cncOptions(
  state: GameState,
  who: string,
  job: { sawFallback: boolean },
): StageOptions {
  if (!has(state, 'cnc')) return { cnc: false };
  if (heldMachine(state, who, 'cnc') !== null) return { cnc: true };
  if (freeMachines(state, 'cnc').length > 0) return { cnc: true };
  return { cnc: !job.sawFallback };
}

/** The family a stage is done on for a job of this material and finish, or null when it is done
 *  at the bench with nothing but hands (CLAUDE.md T7 3.1). */
export function familyForStage(job: StagedJob, stage: StageId): string | null {
  if (stage === 'cnc') return 'cnc';
  if (stage === 'cutting') return 'tableSaw';
  if (stage === 'machining') {
    if (job.needsSpindle) return 'spindleMoulder';
    return job.materialKind === 'sheet' ? 'edgebander' : 'solidWoodTools';
  }
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
  options: StageOptions = {},
): { speed: number; byHand: boolean } {
  // A job made entirely by hand uses no machine at any stage (CLAUDE.md 9.5).
  if (job.byHand) return { speed: 1 / BY_HAND_DURATION_FACTOR, byHand: true };
  if (stage === 'cnc') return { speed: cncFactor(state), byHand: false };
  const family = familyForStage(job, stage);
  if (family === null) return { speed: 1, byHand: false };
  // Parts come off a CNC cut and drilled, so the bench takes half the minutes (CLAUDE.md T7 3.4).
  const cnc = stage === 'assembly' && jobOnCnc(state, job, options) ? CNC_ASSEMBLY_FACTOR : 1;
  if (has(state, family)) return { speed: bestOutputFactor(state, family) * cnc, byHand: false };
  if (!BY_HAND_STAGES.includes(stage)) return { speed: cnc, byHand: false };
  return { speed: cnc / BY_HAND_DURATION_FACTOR, byHand: true };
}

/** The stages of a job, in order, with the labour each one carries. A CNC does the cutting and
 *  the machining of a sheet job as one (CLAUDE.md T7 3.4). */
export function stagesOf(state: GameState, job: StagedJob, options: StageOptions = {}): StageSpec[] {
  if (!jobOnCnc(state, job, options)) return PRODUCTION_STAGES;
  return [CNC_STAGE, ...PRODUCTION_STAGES.filter((stage) => stage.id === 'assembly' || stage.id === 'finishing')];
}

/** The plan for a job as the hall stands now. It is read every minute, so buying a machine speeds
 *  up work already on the books and losing one to the bailiff slows it down again. */
export function stagePlanFor(
  state: GameState,
  job: StagedJob,
  options: StageOptions = {},
): StagePlan[] {
  const plans: StagePlan[] = [];
  let from = 0;
  for (const stage of stagesOf(state, job, options)) {
    const to = from + stage.share * job.labourValue;
    const { speed, byHand } = stageSpeed(state, job, stage.id, options);
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
export function jobMinutesFor(
  state: GameState,
  job: StagedJob,
  rate: number,
  options: StageOptions = {},
): number {
  return stagePlanFor(state, job, options).reduce(
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
export function minutesLeftFor(
  state: GameState,
  job: Job,
  rate: number,
  options: StageOptions = {},
): number {
  const done = labourDone(job);
  let minutes = 0;
  for (const stage of stagePlanFor(state, job, options)) {
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
export function currentStage(
  state: GameState,
  job: Job,
  options: StageOptions = {},
): StagePlan | null {
  return stageAt(stagePlanFor(state, job, options), labourDone(job));
}

/** Labour per minute for a man of this rate working this stage at this speed. The one place a
 *  minute of somebody's time is turned into work in a job. */
export function labourPerMinute(rate: number, speed: number): number {
  return OWNER_LABOUR_PER_MINUTE * rate * speed;
}
