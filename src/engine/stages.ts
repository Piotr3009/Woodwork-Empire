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
  JOINER_SPRAY_RATE,
  OWNER_LABOUR_PER_MINUTE,
  PRODUCTION_STAGES,
  SPRAYER_BENCH_RATE,
  SPRAYER_SPRAY_RATE,
  WORK_EPSILON,
} from './constants';
import { OWNER, SPRAY_BOOTH, hallPace, has } from './machines';
import { stationMachine } from './stations';
import type {
  Finish,
  GameState,
  Job,
  MaterialKind,
  StageId,
  StageSpec,
  WorkerRole,
} from './types';

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

/** What a man says he is doing at this stage, in the trade's own word: "cutting Small kitchen",
 *  "assembling", "spraying" (PIOTR's drawing, 19.09, docs/mockups/t21/bubbles.html;
 *  CLAUDE.md T21 2.6). The bubble over his head is the only thing that reads it; the stage's own
 *  label ("Cutting", "Assembly") is what every list and every bar prints and that is untouched.
 *
 *  [TUNE: the words themselves.] `stageLabel` above is the stage as a thing and this is the stage
 *  as an act, which in English is not the same word: nobody stands at a bench "assembly". The
 *  finishing stage is the one that needs the job as well as the stage, because the drawing's
 *  "spraying" is true of a lacquered job and of no other: everything else is sanded and waxed or
 *  oiled by hand, which is the same division the hall's own sound already makes
 *  (`hallLoops`, lacquer to the booth and the rest to the sander). */
export function stageDoing(id: StageId, lacquer: boolean): string {
  if (id === 'cutting' || id === CNC_STAGE.id) return 'cutting';
  if (id === 'machining') return 'machining';
  if (id === 'assembly') return 'assembling';
  if (id === 'finishing') return lacquer ? 'spraying' : 'sanding';
  return stageLabel(id).toLowerCase();
}

/** How this job is to be made this minute. The CNC is the one thing that changes the shape of a
 *  job's stages, so it is the one option there is (CLAUDE.md T7 3.4). */
export interface StageOptions {
  /** False when the CNC is not to be used: the hall has none, or it has no place for the man and
   *  the job card allows the saw instead. Left out means "use it if the hall has one". */
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

/** The families a sheet job is cut and machined on when the CNC is not doing it: a man whose
 *  place is at one of these in a hall that has a CNC is a man the CNC had no place for. */
const OFF_CNC_FAMILIES = ['tableSaw', 'edgebander', 'spindleMoulder', 'solidWoodTools'];

/** How this man's job is made this minute: on the CNC, or on the saw and the edgebander when the
 *  day plan had no place for him at the CNC and the job card allows it (CLAUDE.md T7 3.4,
 *  T25 2.3). Read off what the plan wrote on him, his station while he works and the family he
 *  has no place at while he does not, so every reader asks the plan and none of them works it
 *  out again. */
export function cncOptions(
  state: GameState,
  who: string,
  job: { sawFallback: boolean },
): StageOptions {
  if (!has(state, 'cnc')) return { cnc: false };
  if (!job.sawFallback) return { cnc: true };
  const man = who === OWNER ? state.owner : state.workers.find((worker) => worker.id === who);
  if (man === undefined) return { cnc: true };
  const at = man.working ? stationMachine(man.station) : man.noPlaceFor;
  return { cnc: at === null || !OFF_CNC_FAMILIES.includes(at) };
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
  if (stage === 'finishing') return job.finish === 'lacquer' ? SPRAY_BOOTH : null;
  return null;
}

/** Only cutting and machining fall back to a pair of hands. A bench is not a speed: without one
 *  nothing is made at all, which the hall says for itself (CLAUDE.md T4 3.4). */
const BY_HAND_STAGES: StageId[] = ['cutting', 'machining', 'cnc'];

/** What the hall does to the minutes of one stage: the hall's pace for the family it is done on
 *  (CLAUDE.md T25 2.4), or the by hand penalty when the family is not in the hall at all. */
export function stageSpeed(
  state: GameState,
  job: StagedJob,
  stage: StageId,
  options: StageOptions = {},
): { speed: number; byHand: boolean } {
  // A job made entirely by hand uses no machine at any stage (CLAUDE.md 9.5).
  if (job.byHand) return { speed: 1 / BY_HAND_DURATION_FACTOR, byHand: true };
  // The CNC's own head times the hall's pace at it, like every family (CLAUDE.md T25 2.4).
  if (stage === 'cnc') return { speed: cncFactor(state) * hallPace(state, 'cnc'), byHand: false };
  const family = familyForStage(job, stage);
  if (family === null) return { speed: 1, byHand: false };
  // Parts come off a CNC cut and drilled, so the bench takes half the minutes (CLAUDE.md T7 3.4).
  const cnc = stage === 'assembly' && jobOnCnc(state, job, options) ? CNC_ASSEMBLY_FACTOR : 1;
  if (has(state, family)) return { speed: hallPace(state, family) * cnc, byHand: false };
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
 *  up work already on the books and selling one slows it down again. */
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

/** The labour a stage of this plan has had worked into it. Two sources: the stage's own bag, and
 *  the labour the job carries that no bag names, poured into the plan in order, cutting first,
 *  which is where the one cursor of Turns 1 to 23 would have stood it. The pour covers a save
 *  lifted from before the bags and a test that moves `labourRemaining` by hand, and costs a
 *  played job nothing, because every minute it works goes into a bag. A CNC does the cutting and
 *  the machining as one, so what went in on the saw and the edgebander counts for the CNC's stage
 *  and what went in on the CNC counts for the saw's and the edgebander's in their shares: a job
 *  half cut on the saw may finish on the CNC and the bag is one bag (CLAUDE.md T7 3.4; v37). */
export function stageDone(job: Job, plan: readonly StagePlan[], stage: StagePlan): number {
  const put = (id: StageId): number => job.stageLabour[id] ?? 0;
  const bagged = (entry: StagePlan): number => {
    if (entry.id === 'cnc') return put('cnc') + put('cutting') + put('machining');
    if (entry.id === 'cutting' || entry.id === 'machining') {
      const sheetShare = CNC_STAGE.share;
      return put(entry.id) + (sheetShare > 0 ? put('cnc') * (entry.share / sheetShare) : 0);
    }
    return put(entry.id);
  };
  let loose = labourDone(job);
  for (const id of ['cutting', 'machining', 'cnc', 'assembly', 'finishing', 'delivery'] as StageId[]) {
    loose -= put(id);
  }
  let done = 0;
  for (const entry of plan) {
    const own = bagged(entry);
    const room = Math.max(0, entry.to - entry.from - own);
    const poured = Math.max(0, Math.min(room, loose));
    loose -= poured;
    if (entry === stage) {
      done = own + poured;
      break;
    }
  }
  return done;
}

/** What a stage of this plan still wants, in labour. */
export function stageLeft(job: Job, plan: readonly StagePlan[], stage: StagePlan): number {
  return Math.max(0, stage.to - stage.from - stageDone(job, plan, stage));
}

/** What is left of the job for a man of this rate, stage by stage: a job half way through its
 *  cutting still has all of its assembly ahead of it at the bench's own speed. */
export function minutesLeftFor(
  state: GameState,
  job: Job,
  rate: number,
  options: StageOptions = {},
): number {
  let minutes = 0;
  const plan = stagePlanFor(state, job, options);
  for (const stage of plan) {
    minutes += stageMinutes(stageLeft(job, plan, stage), rate, stage.speed);
  }
  return minutes;
}

/** The stage the job is standing at: the first of its plan with work left in it, which is where
 *  every man on it works and what a card, a plan row and a warning say about it (CLAUDE.md
 *  T25 2.2). Null only for a job with no labour in it at all. */
export function currentStage(
  state: GameState,
  job: Job,
  options: StageOptions = {},
): StagePlan | null {
  const plan = stagePlanFor(state, job, options);
  for (const stage of plan) {
    if (stageLeft(job, plan, stage) > WORK_EPSILON) return stage;
  }
  return plan.length > 0 ? (plan[plan.length - 1] ?? null) : null;
}

/** Labour per minute for a man of this rate working this stage at this speed. The one place a
 *  minute of somebody's time is turned into work in a job. */
export function labourPerMinute(rate: number, speed: number): number {
  return OWNER_LABOUR_PER_MINUTE * rate * speed;
}

/** What this man's minute is worth at the stage he is standing at, against his own rate: the one
 *  place a trade changes what a stage is worth (PIOTR, 17.09; CLAUDE.md T19 2.6). A sprayer's
 *  trade is the booth. He is at his full rate there and a pair of hands anywhere else; a joiner,
 *  and the owner, may still lacquer, slower, so a workshop with no sprayer is slower at the booth
 *  and never stuck. `role` is null for the owner, who has no role of his own and is a joiner by
 *  trade. Every other man at every other stage is worth exactly his own rate, so nothing about
 *  Output or the rate changes outside the booth (CLAUDE.md T19 6). */
export function tradeFactor(role: WorkerRole | null, family: string | null): number {
  const spraying = family === SPRAY_BOOTH;
  if (role === 'sprayer') return spraying ? SPRAYER_SPRAY_RATE : SPRAYER_BENCH_RATE;
  return spraying ? JOINER_SPRAY_RATE : 1;
}
